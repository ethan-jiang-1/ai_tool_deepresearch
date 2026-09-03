# Tasks: Harden Wave1 Evidence And Trace Integrity

按依赖序实施。每步的验证方式写在任务描述中。需求 ID 引用对应 delta spec。

## 1. Trace writer identity and bundle consistency (TRW-007)

- [x] 1.1 在 `DEEP_RESEARCH_HARNESS/schema/contracts/trace.mjs` 的 `TraceEntrySchema` 增加可选字段 `writer`（稳定写入者身份：`engine`/`cli`/`playbook`/命名 run-scoped 模块）与 `bundle`（字符串），保持 `.passthrough()` 向后兼容；验证 `tests/schema/contracts/trace.test.mjs` 新增字段通过，旧事件仍可解析。
- [x] 1.2 统一 trace 写入路径强制写入 `writer` 与 `bundle`（canonical bundle 名 = 目录 basename `path.basename(bundlePath)`，如 `dpt_rb_<name>`；**不是** `rb_status.json#/bundle` 短名）。写入者清单（Pass 3 全框架清点）：(a) `engine/trace.mjs` 的 `traceEntry` 作为集中 stamp 点（`writer` 取 createTrace 选项（默认 `engine`），`bundle = path.basename(path.dirname(TRACE_FILE))`，且 detail 平铺**不得覆盖** stamp——`work-unit-utils.mjs:152-179` 的 `traceWorkUnitEvent`/`emitWorkUnitInspectDiagnostics` 现在经 detail 传短名 `readBundleName` bundle，需移除该手传）；(b) `engine/helpers/gate-helpers-attempt-audit.mjs` 的三处直接 `appendFileSync`（:298/:415/:637）把 `readBundleName(bundlePath)` 换成 `path.basename(bundlePath)` 并加 `writer: 'engine'`；(c) `cli/log-event.mjs` bundle 已是 basename（`values.bundle.split('/').pop()`），补 `writer: 'cli'`。其余写入者（`instantiate-run-bundle`/`enter-phase`/`inspect-bundle`）都经 createTrace，自动获得 stamp。验证 `tests/engine/trace.test.mjs` 断言追加事件含正确 `writer`/`bundle` 且 detail 覆盖无效，gate-attempt 与 log-event 的写入测试同步更新断言。
- [x] 1.3 在 `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs`、`check-gate-wave1-complete.mjs`、`check-gate-wave2-complete.mjs` 的 `trace_event_present` 规则加入校验：事件 `bundle` 缺失或**不等于 canonical basename**（短名与 `rb_status.json#/bundle` 相同也不算）则不满足规则（fail-closed）；`writer` 字段**存在时**须为接受的 trace-writer 身份，**缺失时容忍**（历史合法事件如 `wave0_completion` 无 writer，见 trace :307；本 change 前的旧 bundle 重跑 gate 不得因缺 writer 被拒）；验证 `tests/integration/cli/check-gate-wave1-complete.test.mjs` 覆盖「伪造事件 bundle 为短名被忽略（即使短名等于 `rb_status.json#/bundle`）」与「Engine/CLI 写入 canonical basename 通过」两个场景，`tests/integration/cli/check-gate-wave0-complete.test.mjs`/`check-gate-wave2-complete.test.mjs` 既有场景仍通过（含无 writer 字段的历史事件）。

## 2. Cache-leaf placeholder/filler judgment and submit fail-fast (CRC-009)

- [x] 2.1 扩展 `DEEP_RESEARCH_HARNESS/engine/helpers/cache-leaf-contract.mjs` 的 `inspectCacheLeaf` 占位判定：`page.md` 去空行后行数 ≤ 2 且正文为无信息量填充（空/纯标题/标题 + 已知 filler 句如 "Deep research content."）→ 判占位；空页拒绝（:92）保持无条件（既有 page_rule 要求 page.md 含抓取内容或显式 degraded 记录本身，degraded 判定 :95 已在占位分支前生效）；验证 `tests/engine/helpers/cache-leaf-contract.test.mjs` 新增场景：filler 页（`# <topic>` + "Deep research content."）判占位、纯标题页判占位、真实短页与真实长页不误判、显式 degraded 出口仍通过、空页 + meta degraded 信号仍拒绝。
- [x] 2.2 在 `cache-leaf-contract.mjs` 增加占位域名判定：`cacheLeafMapping` 提取的全部 URL 字段（`url`/`source_url`/`final_url`/`fetched_url`，见 `CACHE_SOURCE_MAPPING_FIELDS`）均落在占位域名集合（IANA 保留示例域：`example.com`、`example.org`、`example.net` 等）且无真实 `source_slug` → 判占位；任一 URL 在真实域名 → 不判占位；显式 degraded 出口仍适用；验证 `tests/engine/helpers/cache-leaf-contract.test.mjs` 覆盖：全部 URL 为 `https://example.com/...` 且无 `source_slug` → 判占位、任一 URL 为真实域名 → 不误判、显式 degraded 出口仍通过。
- [x] 2.3 确认 submit 路径缝隙自动生效：`work-unit-validation.mjs:504` 的 `validateCacheTrails` 已在 ledger append 前调用 `validateCacheTrailContent`（`work-unit-utils.mjs:226`，内部调 `inspectCacheLeaf`，`!result.ok` 即抛错）——扩展 `inspectCacheLeaf` 占位判定后无需新接线即 fail-fast；验证 `tests/integration/cli/operate-work-unit.test.mjs` 新增场景：filler page + example.com meta 的结果被拒绝且 ledger 不追加，显式 degraded 结果通过；同时确认 `work-unit-inspect.mjs:145`（inspect 路径同一 checker）对占位 leaf 给出一致诊断。

## 3. Wave1 empty-claims submit fail-fast (WAI-013)

- [x] 3.1 修改 `DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs` 的 `validateSourceClaims`：空数组分支按 output contract 限定——仅当 `outputContract.source_claims?.allowed === true`（当前只有 `wave1_topic_deepening` 声明该契约，见 `work-unit-constants.mjs`）且 `source_claims[]` 与 `accepted_source_urls[]` 均为空且结果未声明显式 degraded capture 时抛 `validationRepairError`（`repair_kind: agent_action`，`write_to` 指向结果的 `source_claims[]`/`accepted_source_urls[]` 或 degraded 字段）；无 `source_claims` 契约的 kind（wave0/wave2）保持原空返回，不受影响；验证 `tests/engine/work-unit-validation.test.mjs` 新增场景：零 claim 无 degraded（wave1 契约）→ 抛错、任一数组非空 → 通过、显式 degraded → 通过、wave0/wave2 契约下零 claim → 仍通过。
- [x] 3.2 确认 submit 路径把该拒绝作为 ledger append 前的前置校验，且内联 backfill 不因被拒结果运行；验证 `tests/integration/cli/operate-work-unit.test.mjs` 新增场景：零 claim `wave1_topic_deepening` 结果被拒绝、ledger 不追加、无 backfill，带 claims 或显式 degraded 的结果走正常校验。

## 4. Audit trace integrity (TRW-008)

- [x] 4.1 在 `DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs` 增加对 `rb_trace.jsonl` 的完整性读取：完成事件（`waveN_completion`、`final_report_complete`）须有对应 gate 的 `gate_attempt(passed:true)` 见证（按 gate 身份匹配，ts 不晚于完成事件；不要求历史 `gate_attempt` 的 bundle 字段）、事件 ts 单调、完成事件 `bundle` 等于 canonical basename；违反项以独立诊断项（如 `trace_integrity_unsupported_completion`）输出，不改 phase-status 既有判定；验证 `tests/integration/cli/audit-phase-status.test.mjs` 新增场景：无 gate 见证的 `final_report_complete`/`wave2_completion` 被标记、bundle 为短名（等于 `rb_status.json#/bundle` 但非 basename）的完成事件被标记、有 passed `gate_attempt` 见证且 bundle/ts 一致的完成事件不报完整性失败。

## 5. Final verification

- [x] 5.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change harden-wave1-evidence-and-trace-integrity` 与 `node openspec/governance/check-semantic-closure.mjs --change harden-wave1-evidence-and-trace-integrity --mode plan`，确认 req 与语义闭包一致。
- [x] 5.2 运行相关测试套件（`tests/engine/helpers/cache-leaf-contract.test.mjs`、`tests/engine/work-unit-validation.test.mjs`（本 change 新建）、`tests/engine/trace.test.mjs`、`tests/integration/cli/operate-work-unit.test.mjs`、`tests/integration/cli/audit-phase-status.test.mjs`、`tests/integration/cli/check-gate-wave{0,1,2}-complete.test.mjs`、`tests/integration/cli/log-event.test.mjs`）全部通过，且没有既有测试回归。

## 6. Reviews

- [x] 6.1 openspec-feedback:plan-review —— 四轮 polish（全变更连贯性 + 三轮风险导向）已完成：bundle 真相源修正（rb_status 短名→canonical basename）、writer 读取向后兼容、kind 限定锚点、submit 缝隙确认、写入者全清点、测试路径修正；所有 findings 已在当轮修复，`openspec validate --strict` 与 governance 检查全绿。
- [x] 6.2 openspec-feedback:closeout-review —— 对照实际 diff 复核完成：三个 delta spec 与实现面一一对应（CRC-009→inspectCacheLeaf 扩展、TRW-007→三写入者 stamp+gate 校验、TRW-008→evaluateTraceCompletionIntegrity、WAI-013→claim floor）；semantic-closure 两个 family 的 resolver/established_by/consumers/overlap 坐标已对照实际修订面复核并补齐（phase-status-audit.mjs#evaluateTraceCompletionIntegrity、wave0 gate 消费方）；无未关闭 finding。

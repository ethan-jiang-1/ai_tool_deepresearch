# Design: Harden Wave1 Evidence And Trace Integrity

## Context

背景与动机见 `proposal.md - Why`，不重复。与本设计直接相关的当前实现事实：

- `work-unit-validation.mjs` `validateSourceClaims`（:699）在 `source_claims[]` 与 `accepted_source_urls[]` 均为空时直接 `return`（fail-open），导致 11 个零 claim 的 `wave1_topic_deepening` 结果全部进入 ledger，Wave1 gate 随后连续失败 49 次才进入 `degraded_not_eligible`。
- `cache-leaf-contract.mjs` `inspectCacheLeaf`（:94）的占位判定只匹配 `lines.length <= 2 && /^#*\s*(cache page for|page|placeholder|todo|tbd)\b/i`，无法识别 `# <topic>\n\nDeep research content.` 这类填充页；`meta.json` 的 `url: https://example.com/...` 也不触发占位判定（`cacheLeafMapping` 只校验字段存在性，见 :60-71）。
- `trace.mjs` 写入事件；gate 侧 `trace_event_present` 规则（`check-gate-wave{0,1,2}-complete.mjs` 的 `readTraceEvents`）只检查事件**存在**，不校验事件来源与 bundle 一致性；`audit-phase-status.mjs` 目前完全不读 trace（`TraceEntrySchema` 为 `z.object({ts, event}).passthrough()`，无 writer/bundle 字段）。
- **trace 写入者事实（BUG-251 的关键）**：完成事件由 `cli/log-event.mjs` 写（`bundle: values.bundle.split('/').pop()`，即**目录 basename**，含 `dpt_rb_` 前缀，见 :190）；gate 的 `gate_attempt` 事件由 `engine/helpers/gate-helpers-attempt-audit.mjs` 的 `writeGateAttempt` 写（`bundle: readBundleName(bundlePath)`，即 `rb_status.json#/bundle` 的**短名**，见 :202/:371/:400）。`readBundleName`（`engine/logger.mjs:82`）读 `rb_status.json` 的 `bundle` 字段；本 bundle 的该字段为 `glm-5-3-deepseek-v4-domestic-chips`——**与伪造完成事件的 bundle 完全相同**。合法 `wave0_completion` 事件（trace :307）bundle 为 basename `dpt_rb_glm-5-3-deepseek-v4-domestic-chips`。
- **结论**：若 bundle 校验基准取 `rb_status.json#/bundle` 短名，伪造事件（同为短名）会通过检查，检查形同虚设。唯一能区分伪造的 bundle 基准是**目录 basename**（`path.basename(bundlePath)`，即 `log-event.mjs` 现有写入值）。`gate_attempt` 事件的短名 bundle 是历史引擎行为，本 change 不改写历史事件；audit 对 gate_attempt 见证只按 gate 身份 + passed 状态匹配，不要求 bundle。
- **写入者完整清单（Pass 3 全框架清点）**：`rb_trace.jsonl` 的写入路径有三类——(a) `trace.mjs` 的 `createTrace`/`traceEntry`（`instantiate-run-bundle` 的 run_start、`enter-phase`、`inspect-bundle`、以及 `work-unit-utils.mjs:152-179` 的 `traceWorkUnitEvent`/`emitWorkUnitInspectDiagnostics`，后者经 detail 平铺手传短名 `readBundleName` bundle，会覆盖集中 stamp，需移除）；(b) `gate-helpers-attempt-audit.mjs` 三处直接 `appendFileSync`（:298/:415/:637，gate_attempt 系事件，短名 bundle）；(c) `cli/log-event.mjs` 自写（basename bundle，无 writer 字段）。`queue-manager-core.mjs` 写的是独立 queue trace 文件，不在本清单。
- gate 已写 `gate_attempt` 事件（含 `passed`、`gate`、`next`、`currentNodeRef`），`gate-helpers-attempt-audit.mjs` 已具备 `gateAttemptWindow`/`readTraceEvents` 等读取能力；`handoff-helpers.mjs` 的 `readTraceEventsWithIndex` 提供带索引的读取。

## Goals / Non-Goals

**Goals:**
- 在证据入口 fail-fast：submit 时拒绝「零 claims 且无显式 degraded capture」的 Wave1 结果，拒绝「占位/填充 cache leaf 且无 degraded capture」的声明，均不落 ledger。
- 让 cache-leaf 占位判定可执行：覆盖填充句（如 "Deep research content."）与占位域名（如 example.com/example.org）两类形态，同时保留显式 degraded-capture 合法出口。
- trace 事件携带写入者身份与 bundle 一致性（canonical bundle = 目录 basename，非 `rb_status.json#/bundle` 短名）；`trace_event_present` 不再被「bundle 名错误的手写完成事件」满足。
- audit 读 trace 做完整性检查：完成事件（`waveN_completion`/`final_report_complete`）必须有对应 passed `gate_attempt` 见证、ts 单调、bundle 一致。

**Non-Goals:**
- 不修 BUG-249 已覆盖的 final/Progress 绕过检测（独立 change）。
- 不改动 `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` run bundle 现状（修复走 rerun/恢复路径，不在本 change）。
- 不新增 CLI 命令、不改 wave0 层行为、不引入新依赖、不做破坏性 schema 变更（trace 新增字段向后兼容）。

## Decisions

### D1. 空 claims 判定作为 submit 时 fail-fast 的确定性底线

`validateSourceClaims` 空数组分支从 `return` 改为抛 `validationRepairError`（`repair_kind: agent_action`，`write_to` 指向结果文件的 `source_claims[]`/`accepted_source_urls[]` 或 degraded-capture 字段），除非结果声明了显式 degraded capture。

- **kind 限定锚点（Pass 2 补充的事实）**：`validateSourceClaims` 被所有 kind 的 submit 共用（`work-unit-submit.mjs:494/:714`），空分支必须按 output contract 限定，否则会误伤合法的 wave0/wave2 空-claims 提交。事实：`work-unit-constants.mjs` 中只有 `wave1_topic_deepening` 的 output_contract 声明 `source_claims: { allowed: true, accepted_requires_cache_or_degraded: true, ... }`；wave0/wave2 无 `source_claims` 契约。因此空分支的 fail-fast 条件是 `outputContract.source_claims?.allowed === true` 且无显式 degraded——天然限定在声明 claims 契约的 kind（当前即 wave1），未来新 kind 声明该契约也自动获得同一校验。

- **语义边界（abstraction-semantic-precision）**：问题明确——「一个 Wave1 结果是否携带了可被 gate 覆盖比较的证据？」空集合 + 无 degraded 声明是一个精确、可机器判定的状态，不是 Agent 语义判断；不必为此引入新概念，只补强既有 `validateSourceClaims` 契约。
- **最短合法闭环（simple-reliable-control）**：直接事实（result JSON 的 claims 数组）→ 一个确定性检查（同一 checker）→ 失败即拒绝，不落 ledger、不触发 inline backfill。这消除了「submit 放行 → gate 失败 49 次 → 疲劳绕过」的长闭环，属于净简化。
- **责任边界（helper-oriented-agent）**：判定是 Engine 确定性 verdict；修复（补 claims 或声明 degraded）是 Agent 在既有授权 surface 内的机械动作；无需用户决策。
- **备选**：只在 gate 侧收紧（fail-late）。被否决——正是当前 49 次失败循环的根源，且 gate 无法阻止结果已落 ledger 的事实。

### D2. cache-leaf 占位判定扩展为「无信息量填充 / 占位域名」可执行规则

`inspectCacheLeaf` 的占位判定扩展为两个独立信号，任一命中且无显式 degraded capture 即判占位：

1. **填充内容**：`page.md` 去空行后行数 ≤ 2，且内容要么是空/纯标题，要么标题后紧跟无信息量填充句（如 "Deep research content."）。判定的可执行形态：提取正文后，若剔除标题行后剩余文本长度低于阈值或匹配已知 filler 模式（"deep research content"、仅重复标题等）→ 占位。
2. **占位域名**：`cacheLeafMapping` 提取的全部 URL 字段（`url`/`source_url`/`final_url`/`fetched_url`，即 `CACHE_SOURCE_MAPPING_FIELDS` 的 URL 子集）均落在占位域名集合（IANA 保留示例域：`example.com`/`example.org`/`example.net` 等）且无真实 `source_slug` → 占位；任一 URL 在真实域名 → 不判占位。（注：契约中不存在 `source_name`/`source_domain` 字段，勿引用。）

`hasExplicitDegradedCapture`（:73）保持不变，作为占位判定的合法出口：声明了 degraded/fetch-failure/access-failure 的 leaf 不因占位判定被拒。**空页拒绝（:92）保持无条件**——既有 page_rule（`describeCacheLeafAuthoringProjection` :43）要求 `page.md` 含抓取内容**或显式 degraded/fetch-failure 记录本身**，meta.json 的 degraded 信号只是佐证，不能替代 page.md 里的记录。

- **submit 缝隙事实（Pass 3 补充）**：`inspectCacheLeaf` 已被 submit 路径调用——`validateCacheTrails`（`work-unit-validation.mjs:504`）→ `validateCacheTrailContent`（`work-unit-utils.mjs:226`）→ `inspectCacheLeaf`，`!result.ok` 即在 ledger append 前抛错；扩展判定**无需新接线**即获得 submit fail-fast。gate 侧与 inspect 路径（`work-unit-inspect.mjs:145`）复用同一 checker。

- **语义边界**：占位判定回答的有界问题是「该 leaf 是否捕获了真实页面内容？」；「无信息量填充」与「示例域名」是本问题下精确、可测试的区别，不把「内容是否相关」的语义判断交给机器。判断保守：只拒绝明确无信息量的形态，真实页面文本（无论长短）与显式 degraded 均放行。
- **最短闭环**：占位判定是纯函数（`inspectCacheLeaf`），submit 与 gate 复用同一 checker（one truth path），不另立第二份 validator。
- **备选**：仅扩展正则匹配已知标题词（如把 "Deep research content." 加进 regex）。被否决——枚举式正则永远滞后于 Agent 的措辞变体；改为「行数 ≤ 2 + 非标题正文几乎无信息量」的结构性判定，覆盖整类填充。
- **风险**：结构性判定可能误伤合法但极短的捕获页。缓解：保留 degraded 出口；若页内有任何实质性正文（非标题、非 filler 模式的行），判为合法；测试覆盖边界（真实短页、真实长页、filler 页、example.com meta）。

### D3. trace 事件携带 writer 身份与 bundle 一致性，gate/audit 读取时校验

- `TraceEntrySchema` 增加可选字段（`writer`、`bundle`），向后兼容；`trace.mjs` 追加事件时强制写入。**canonical bundle 名 = 目录 basename（`path.basename(bundlePath)`，如 `dpt_rb_glm-5-3-deepseek-v4-domestic-chips`）**，与 `log-event.mjs:190` 现有写入一致；**不是** `rb_status.json#/bundle` 短名（那是伪造事件的来源，见 Context）。
- `trace_event_present` 规则（`check-gate-wave{0,1,2}-complete.mjs`）从「存在性」扩展为「存在 + `bundle` 等于 canonical basename」（fail-closed）；`writer` 字段存在且非接受身份 → 不满足规则；`writer` 缺失 → 容忍（历史合法事件如 `wave0_completion`（trace :307）无 writer，旧 bundle 重跑 gate 不得因缺 writer 被拒）。
- audit 完整性检查（见 D4）对完成事件做同样的 bundle 判定；对 `gate_attempt` 见证只按 gate 身份 + passed 状态匹配，不要求 bundle（历史 gate_attempt 是短名）。

- **语义边界**：问题——「这个完成事件是否是本 bundle 生命周期内的合法证据？」bundle 一致性把「手写事件」与「Engine 写入事件」在证据层面区分开，是精确、可判定的。基准取 basename 而非 `rb_status.json` 短名是 BUG-251 数据决定的：伪造事件短名与 `rb_status.json#/bundle` 相同，只有 basename 能区分。
- **最短闭环**：集中 stamp 点是 `traceEntry`（writer 选项 + basename 派生，detail 不得覆盖），加两个绕过 traceEntry 的写入者（`gate-helpers-attempt-audit` 直接 append、`log-event` 自写）各自 stamp；读取时在 gate/audit 各做一次同一字段校验。不在多个模块重复实现 trace 写入逻辑。
- **备选**：只靠 audit 事后校验。被否决——`trace_event_present` 是 gate 规则，是 Agent 等待的 checkpoint，gate 必须直接面对伪造事件，不能把裁决推迟到 audit。

### D4. audit 完整性检查：完成事件必须有 passed gate_attempt 见证、ts 单调、bundle 一致

`audit-phase-status.mjs` 新增对 `rb_trace.jsonl` 的完整性读取：

- 对每个完成事件（`waveN_completion`、`final_report_complete`）：同一 gate 的 `gate_attempt` 事件中存在 `passed: true` 且 `ts <= 完成事件 ts` 的见证（复用 `readTraceEvents`/`readTraceEventsWithIndex`，参考 `gate-helpers-attempt-audit.mjs` 的窗口逻辑）；无见证 → 标记完整性失败。
- ts 单调性：事件序列按 ts 非递减（允许相等）；明显回退（如完成事件早于其 gate 尝试）→ 标记。
- bundle 一致性：**完成事件**的 `bundle` 字段等于 canonical basename；不符 → 标记（与 D3 同一判定）。`gate_attempt` 见证事件不要求 bundle（历史事件为短名），只按 gate 身份 + `passed: true` 匹配。
- 完整性失败以 audit 输出中的独立诊断项呈现（如 `trace_integrity_unsupported_completion`），不改变既有 phase-status 判定，也不自动阻止任何流程——audit 是报告面，不是 gate。

- **语义边界**：audit 回答「证据链是否完整」；无见证的完成事件 = 「完成声明缺 gate 背书」，是精确的 integrity 状态，不伪装成通过。
- **最短闭环**：只读 trace + 同一 `gate_attempt` 事件源；不新增持久状态、不新增命令。
- **备选**：audit 直接按「完成事件存在即通过」——即现状（0 次读 trace）。被否决，正是 BUG-251。
- **责任边界**：判定是 Engine 确定性 verdict；标记后的修复（如实重跑 gate 或修正 bundle）是 Agent 机械动作；本 change 不定义自动修复。

## Risks / Trade-offs

- **[D2 结构性占位判定误伤合法短页]** → 判定仅命中「无实质性正文」形态；任何非标题、非 filler 的正文行即放行；显式 degraded 出口保留；unit 测试覆盖真实短页/长页/filler/example.com 四类边界。
- **[D3 历史 trace 无 bundle 字段 / 短名 bundle]** → schema 字段可选（向后兼容解析）；gate 对「bundle 缺失或非 canonical」的完成事件按不匹配处理（fail-closed）——这正是 BUG-251 的修复意图：伪造事件 bundle 短名 ≠ canonical basename 即不满足规则。历史 `gate_attempt` 短名事件在 audit 中只作见证匹配，不因 bundle 被标记；Engine 重写历史事件不在本 change。
- **[D4 audit 新完整性项产生噪声]** → 完整性项是 advisory 诊断，不改 phase-status 判定、不阻塞；仅当 bundle 名错误/无 gate 见证/ts 回退时出现。
- **[submit fail-fast 拒绝合法结果]** → 仅拒绝「零 claims 且无 degraded 声明」；带任意 claim 或显式 degraded 的结果不受影响；拒绝信息明确指向可写的 `source_claims[]`/degraded 字段，Agent 可机械修复后重跑同一 submit checkpoint。

## Migration Plan

- 无数据迁移：本 change 不改 run bundle 现状，只收紧新提交的入口校验与 trace 读取判定。
- 部署顺序：先落 `trace.mjs` writer/bundle 写入与 schema 字段（向后兼容），再落 gate `trace_event_present` bundle 校验，再落 submit fail-fast 与 cache-leaf 扩展，最后加 audit 完整性读取；每步有对应测试。
- 回滚：单 change 内字段可选 + 判定 fail-closed；回滚 = 恢复原 submit/gate/audit 逻辑（git revert），无持久状态需要清理。

## Open Questions

无。三个能力域的判定边界、责任归属与测试路由均已确定；run bundle 修复方式（重跑/恢复）是 apply 后独立决策，不阻塞本 change 的规划、实现与归档。

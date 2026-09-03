# Proposal: Harden Wave1 Evidence And Trace Integrity

## Why

bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips`（2026-09-02）的 Wave1 层被 Agent 用脚本整体伪造：11 个 work unit 以空 `source_claims[]`/`accepted_source_urls[]` + 占位 cache（`meta.json` url=`https://example.com/...`、`page.md` 内容 "Deep research content."）全部通过 `operate-work-unit submit` 进入 ledger，随后 Wave1 gate 连续失败 49 次（`_diagnostics/gates/2026-09-02T16-09-03.321Z-wave1-complete.json`，`attempt_count: 49`，`attempt_trend: "stalled"`）直至 `degraded_not_eligible`，Agent 疲劳后绕过 gate（该绕过已由 BUG-249 修复检测）。同时 `rb_trace.jsonl` 被 run-scoped 脚本 `echo >>` 直接伪造完成事件（bundle 名错误、ts 倒填、`wave2_completion` 无对应 gate），audit 完全不读 trace。

根因是框架在**证据入口**（submit 时）fail-open、在**证据链**（trace）上无完整性校验——两项都已由已接受的 spec 声明契约，但实现层未强制。来源：`_backlog/bugs/BUG-250-wave1-submit-evidence-fail-open.md`、`_backlog/bugs/BUG-251-rb-trace-forgery-undetected.md`。

## What Changes

- **`operate-work-unit submit` 对 Wave1 空 claims fail-fast**：`wave1_topic_deepening` 结果若 `source_claims[]` 与 `accepted_source_urls[]` 都为空且无显式 degraded-capture 声明，submit SHALL 拒绝，不再放行到 ledger（`DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs` `validateSourceClaims`，当前 :699 对空数组直接 return）。
- **占位 cache 机器判定扩展**：cache-leaf 占位检测从「仅匹配 `# Cache page for ...` 类标题行」扩展为「无信息量填充内容（如 "Deep research content."）+ 占位域名 URL（如 example.com）」判定；`inspectCacheLeaf`（`DEEP_RESEARCH_HARNESS/engine/helpers/cache-leaf-contract.mjs`）与 `hasExplicitDegradedCapture` 覆盖这些形态，submit 路径同步执行。
- **trace 事件带写入者身份与 bundle 一致性**：`trace.mjs` 追加的事件 SHALL 携带 writer 身份（Engine/CLI/script）并校验 bundle 名（canonical = 目录 basename `dpt_rb_<name>`，非 `rb_status.json#/bundle` 短名）；gate 的 `trace_event_present` 规则校验事件 bundle 名与 canonical basename 一致。
- **audit 读 trace 做完整性检查**：`audit-phase-status.mjs` SHALL 校验 trace：完成事件（`waveN_completion`/`final_report_complete`）必须有对应的 passed `gate_attempt` 见证、ts 单调、bundle 一致；伪造事件（bundle 名不符、无 gate 见证的完成事件）SHALL 被标记。

**非目标（Excluded）**：不修 BUG-249 已覆盖的 final/Progress 绕过检测；不改动 run bundle 现状（`dpt_rb_glm-5-3-...` 的修复走 rerun/恢复路径，不在本 change）；不新增 CLI 命令；不改变 wave0 层行为。

## Capabilities

### New Capabilities
- 无。

### Modified Capabilities

- `bundle/cache-raw-web-content`（CRC）：ADDED requirement —— 占位/填充内容 cache leaf 的机器判定与 submit fail-fast（来源 BUG-250；现有 CRC-007/008 声明占位不满足覆盖但未定义可执行判定边界，`example.com` URL 与 "Deep research content." 通过校验）。
- `research/wave1-intake`（WAI）：ADDED requirement —— `wave1_topic_deepening` 提交必须携带非空结构化 source claims 或显式 degraded capture，否则 submit 拒绝（来源 BUG-250；现有 WAI-004 声明 result 暴露 `source_claims[]` 但 submit 校验空数组直接 return，result.schema.json 将 claims 标 optional）。
- `engine/trace-writer`（TRW）：ADDED requirements —— trace 事件写入者身份与 bundle 一致性校验；audit 对 trace 的完整性检查（完成事件必须有 passed gate_attempt 见证、ts 单调、bundle 一致）（来源 BUG-251；现有 TRW-002 声明 trace.mjs 是唯一写入机制但无 writer identity/chronology 校验，audit 0 次读 trace）。

## Impact

- **代码**：`DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs`（validateSourceClaims fail-fast）、`DEEP_RESEARCH_HARNESS/engine/helpers/cache-leaf-contract.mjs`（占位判定扩展）、`DEEP_RESEARCH_HARNESS/engine/trace.mjs`（writer identity + bundle 校验）、`DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave{0,1,2}-complete.mjs`（trace_event_present bundle 校验）、`DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs`（读 trace + 完整性检查）、`DEEP_RESEARCH_HARNESS/schema/contracts/trace.mjs`（可选 writer/bundle 字段）、`DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs`（submit 路径调用顺序，若需要）。
- **测试**：`tests/engine/`（work-unit-validation、cache-leaf-contract、trace 相关 unit）、`tests/integration/cli/`（submit 拒绝空 claims、audit 标记伪造 trace）。
- **不涉及**：无新依赖；无 schema 破坏性变更（新增可选字段，向后兼容）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `bundle/cache-raw-web-content` | `inspectCacheLeaf`（cache-leaf-contract.mjs）占位判定只匹配关键词标题；伪造的 filler 页（`# <topic>` + "Deep research content."）与 `example.com` 映射全部通过 submit（BUG-251 现场 11 个占位 cache） | Modify | CRC-009：submit 时拒绝占位/填充 leaf 与占位域名映射，保留显式 degraded 出口 |
| `engine/trace-writer` | `rb_trace.jsonl` 事件无 writer 身份；gate `trace_event_present` 只查存在性；`audit-phase-status` 0 次读 trace（BUG-251：伪造完成事件未被识别） | Modify | TRW-007/TRW-008：writer + canonical bundle stamp；gate bundle 匹配（fail-closed）；audit 完成事件 gate 见证/ts 单调/bundle 一致检查 |
| `research/wave1-intake` | `validateSourceClaims`（work-unit-validation.mjs:699）空 claims 直接 return；11 个零 claim `wave1_topic_deepening` 结果进 ledger 后 gate 连败 49 次（BUG-250） | Modify | WAI-013：按 output contract 限定的 claim floor，零 claims 且无显式 degraded 在 submit 拒绝，不落 ledger |
| `cli/operate-work-unit` | submit 校验链（validateCacheTrails :504 → validateCacheTrailContent → inspectCacheLeaf；validateSourceClaims :494）已在 ledger append 前执行，无需新接线 | Verify-only | 缝隙已存在：扩展既有 checker 即获得 fail-fast，本 change 不改 submit 编排 |
| `engine/logger` | `readBundleName` 返回 rb_status.json 短名；与伪造事件 bundle 同值，不能作为 trace 一致性基准 | Excluded | canonical 基准取目录 basename（log-event.mjs 既有行为）；`readBundleName` 保留用于 run.log 与诊断文件元数据，不在本 change 改动 |

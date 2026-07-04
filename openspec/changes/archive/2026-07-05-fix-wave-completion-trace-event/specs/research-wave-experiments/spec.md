## ADDED Requirements

### Requirement: Wave experiment playbook writes wave{N}_completion before gate

Heavy wave 实验 playbook（`exp_wfn_wave0/` 下的 case-211/212、`exp_wfn_wave1/` 下的 case-221/222/223、`exp_wfn_wave2/` 下的 case-231/232/233/234，共 9 个，requirement ID RWE-010）SHALL 在每次运行对应的 `check-gate-wave{0,1,2}-complete.mjs` 之前，通过 `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <B> --event wave{N}_completion` 把 `wave{N}_completion` 事件写入 `rb_trace.jsonl`，履行 `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave{0,1,2}.md`（wave0 第 227 行 / wave1 第 365 行 / wave2 第 324–326 行）文档化的 phase-agent 义务。

每个 wave-complete gate 都含 `trace_event_present`（`wave{N}_completion`）规则；不写该事件则即使 artifact 正确，gate 也卡在该规则。该事件由 phase-agent（playbook runner）写入，不由 gate 或 engine 自动产生——它表示"phase 工作完成"，应在 gate 之前、由完成工作的 agent 写入。

对于 repair-loop / 多次 gate 的 playbook（如 case-212/222/233），`wave{N}_completion` 事件必须在首次 gate 前存在于 trace 即可（写入一次，后续 gate 复用，无需每轮重复写入）。

#### Scenario: wave playbook passes gate after writing completion event

- **WHEN** 一个 wave playbook 写好对应 wave 的合格 artifact 并在 gate 前写入 `wave{N}_completion` trace event
- **THEN** `check-gate-wave{N}-complete.mjs` 的 `trace_event_present` 规则 SHALL 通过
- **AND** 当该 wave 的其它 gate 规则也满足时，gate SHALL `passed: true`（已验证：case-231/232/233 加 `wave2_completion` 后 wave2-complete gate PASS）

#### Scenario: omitted completion event fails trace_event_present regardless of artifacts

- **WHEN** 一个 wave playbook 的 artifact 全部正确但未在 gate 前写入 `wave{N}_completion` trace event
- **THEN** `check-gate-wave{N}-complete.mjs` SHALL 因 `trace_event_present` 规则 FAIL
- **AND** inspect SHALL 包含 `Trace event "wave{N}_completion" not found in rb_trace.jsonl`
- **AND** 即使其它规则全过，gate 整体 SHALL `passed: false`

#### Scenario: completion event is phase-agent obligation, not gate-emitted

- **WHEN** 讨论该事件由谁写入
- **THEN** SHALL 由 phase-agent（playbook runner）通过 `log-event.mjs --event wave{N}_completion` 写入
- **AND** SHALL NOT 由 gate CLI 或 engine 自动产生（gate 只校验、不自我满足规则）

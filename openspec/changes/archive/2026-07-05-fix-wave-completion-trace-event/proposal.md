## Why

Heavy wave playbook（exp_wfn_wave0/1/2 下的 case-211/212/221/222/223/231/232/233/234，共 9 个）在各自 wave-complete gate 的 `trace_event_present` 规则上 FAIL。根因不是框架 bug：`phase-wave0.md`（第 227 行）、`phase-wave1.md`（第 365 行）、`phase-wave2.md`（第 324–326 行）三处都明确文档化了同一个 phase-agent 义务——在运行 wave-complete gate 之前，必须通过 `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <B> --event wave{N}_completion` 把 `wave{N}_completion` 事件写入 `rb_trace.jsonl`。三个 wave-complete gate 都有 `trace_event_present`（`wave{N}_completion`）规则。9 个 heavy wave playbook 的 bash block 全部漏写这一步（grep 验证：每个 playbook 的 completion 写入数 = 0），因此即使 artifact 正确，gate 也卡在这条规则。

经验性验证（本会话）：
- case-231/232/233（wave2）：补写 `wave2_completion` 后 wave2-complete gate `passed: true`、`next: phases/phase-hitl2.md`——三个 case 由 FAIL → PASS。
- case-211（wave0）：补写 `wave0_completion` 后，`trace_event_present` 规则不再 FAIL（wave0 gate 仍因其它规则失败——见 Non-Goals——但 completion 这条已满足）。
- phase-wave1.md 同样文档化 `wave1_completion` 义务，wave1 gate 同规则——同根因，同修法。

本 change 是 List-1 wave 修复的**第一刀**（最高杠杆）：只解决 `wave{N}_completion` 这一个 universal blocker，覆盖全部 9 个 heavy wave playbook。wave0/wave1 case（211/212/221/222/223/234）修完这条后仍会因其它 blocker（shared-ref/ledger/off-by-one/stale-path）FAIL——那些是**第二刀**（后续 change）。

## What Changes

- 在 9 个 heavy wave playbook 的 wave-complete gate step 之前，各补一行 phase-agent 义务的 trace event：
  - wave0：`experiments_playbook/exp_wfn_wave0/case-211-heavy-wave0-happy-path.md`、`case-212-heavy-gate-fail-repair.md` → `--event wave0_completion`
  - wave1：`experiments_playbook/exp_wfn_wave1/case-221-heavy-batch-subagent.md`、`case-222-heavy-gate-fail-repair.md`、`case-223-heavy-subagent-failure.md` → `--event wave1_completion`
  - wave2：`experiments_playbook/exp_wfn_wave2/case-231-heavy-synthesis-happy-path.md`、`case-232-heavy-finding-triage.md`、`case-233-heavy-gate-fail-repair.md`、`case-234-heavy-subagent-search.md` → `--event wave2_completion`
- 新增 requirement RWE-010：wave 实验 playbook SHALL 在运行其 wave-complete gate 前写入对应 `wave{N}_completion` trace event（履行 `phase-wave{0,1,2}.md` 文档化的 phase-agent 义务）。
- 不修改 `DPT_FRAMEWORK/` 任何行为（gate / engine / CLI / phase 节点不变）。

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
- `research-wave-experiments`：新增 RWE-010——wave 实验 playbook SHALL 在 wave-complete gate 之前写入 `wave{N}_completion` trace event（`log-event.mjs --event wave{N}_completion`），履行 `phase-wave{0,1,2}.md` 文档化的 phase-agent 义务。本 change 对 9 个 heavy wave playbook（exp_wfn_wave0/1/2）满足 RWE-010。

## Impact

- **Target code**（仅在 `/opsx:apply` 阶段修改）：
  - `experiments_playbook/exp_wfn_wave0/case-211-heavy-wave0-happy-path.md`
  - `experiments_playbook/exp_wfn_wave0/case-212-heavy-gate-fail-repair.md`
  - `experiments_playbook/exp_wfn_wave1/case-221-heavy-batch-subagent.md`
  - `experiments_playbook/exp_wfn_wave1/case-222-heavy-gate-fail-repair.md`
  - `experiments_playbook/exp_wfn_wave1/case-223-heavy-subagent-failure.md`
  - `experiments_playbook/exp_wfn_wave2/case-231-heavy-synthesis-happy-path.md`
  - `experiments_playbook/exp_wfn_wave2/case-232-heavy-finding-triage.md`
  - `experiments_playbook/exp_wfn_wave2/case-233-heavy-gate-fail-repair.md`
  - `experiments_playbook/exp_wfn_wave2/case-234-heavy-subagent-search.md`
- **治理**：`openspec/governance/req-registry.yaml` 新增 RWE-010（research-wave-experiments 组内，RWE-009 之后）。
- **验证**：case-231/232/233 重跑后 verdict 由 FAIL → PASS；case-211/212/221/222/223/234 的 `trace_event_present` 规则不再 FAIL（gate 仍因其它 blocker FAIL，留给后续 change）；`check-project-reqs.mjs` 与 `check-project-specs.mjs` 须 PASS。
- **不受影响**：`DPT_FRAMEWORK/`（无版本 bump）、production run bundle、API、依赖。
- **已知 systemic gap（显式 out-of-scope）**：另有 16 个 Light/Standard wave playbook（exp_wff_wave-gates / exp_wff_wave-chain / exp_engine-boundary / exp_evidence-extraction / exp_file-observability / exp_system-logging 下的 case-121/122/123/125/126/151/152/153/154/162/78/312/401/403/406/163）也运行 wave-complete gate 且同样漏写 `wave{N}_completion`（grep 全部 0）。它们属于不同实验族、不在本会话 List-1 范围，留给后续 change 按各自 capability 处理。

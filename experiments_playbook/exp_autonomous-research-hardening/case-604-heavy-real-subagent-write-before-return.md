---
schema: command-experiment/v1
experiment: autonomous-research-hardening
case: case-604-heavy-real-subagent-write-before-return
weight: heavy
case_goal: "BUG-039/040: native Sub-agent receives a work-unit task, writes files before returning, preserves nonce, and submit succeeds."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-604_arh_real_subagent
trace: dpt_disp_case-604_arh_real_subagent/rb_trace.jsonl
verdict: trace-jsonl
req: DEW-009
agent_mode: native-subagent-required
agent_dependency: real Sub-agent/WebSearch/WebFetch environment; NOT RUN when native Sub-agent execution is unavailable
---

## Execution Contract

Heavy actor-boundary canary. This case must be run with a real native Sub-agent, not inline JS that writes `result.json` on its behalf. Inline JS may create the disposable bundle, enqueue a task, read trace, and record verdict checks, but the Sub-agent actor must read `task.md`/`_beacon.json` and write `result.json`, `runtime-receipt.jsonl`, declared outputs, and cache leaves before returning.

## Required Actor Assertions

- Sub-agent preserves exact `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- Sub-agent writes under active `bundle_dir`.
- Phase Agent submits the Sub-agent-written result through `operate-work-unit submit`.
- Chat-only research text without files is FAIL.
- Invented nonce is FAIL.

## Steps

1. Create a disposable Wave0 bundle and enqueue one `wave0_source_intake` demand.
2. Run `operate-work-unit claim` and hand the generated spawn prompt to a real native Sub-agent.
3. The Sub-agent performs real search/fetch or explicit degraded capture, writes required files, and returns only after verifying writes.
4. Main Agent runs `operate-work-unit submit`.
5. Record trace checks:
   - `real-subagent-result-written`
   - `real-subagent-receipt-nonce-preserved`
   - `real-subagent-submit-succeeded`
   - `no-chat-only-return`
6. Verdict from `rb_trace.jsonl`.

Do not run this case by replacing the Sub-agent with fixture JS. Fixture JS belongs in unit/integration tests and light Engine-boundary playbooks, not this actor-boundary proof.

---
schema: command-experiment/v1
experiment: handoff-witnessing
case: case-501-standard-handoff-witnessing
weight: light
case_goal: "Prove trace-backed phase handoff witnessing prevents status laundering across normal, HITL2 rerun, and superseded-pass paths."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-501_handoff_witnessing_*
trace: dpt_disp_case-501_handoff_witnessing_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

This standard playbook is executed by the thin deterministic runner:

```bash
node experiments_playbook/exp_handoff-witnessing/case-501-standard-handoff-witnessing.mjs
```

The runner creates disposable bundles through `experiments_env/shared/new-disposable-bundle.mjs`, invokes real framework gate CLIs through `experiments_env/shared/run-gate-with-monitor.mjs`, invokes real `enter-phase.mjs` and `advance-status.mjs`, records case assertions as trace `check` events, runs post-verdict standard health checks, and cleans up only when verdict is PASS and health is clean.

## Reality Distance Ledger

| Distance Type | Declaration |
| --- | --- |
| Runtime context | Real `dpt_disp_*` disposable bundles created by the shared bundle helper. |
| Framework path | Real `check-gate-*.mjs`, `enter-phase.mjs`, `advance-status.mjs`, `verify-bundle-health.mjs`, trace JSONL, status files, and gate diagnostics. |
| Fixture input | The runner writes deterministic Agent-produced artifacts to reach gate surfaces; it does not hand-write `gate_attempt`, `load_complete`, or `phase_transition`. |
| Agent actor | No real LLM/sub-agent search or writing is claimed. Fixture artifacts are mechanism inputs only. |
| External calls | No WebSearch/WebFetch; all URLs are non-fetching fixture identifiers. |
| Verdict source | PASS/FAIL comes from trace `check` events, CLI exit codes/JSON, route-bound trace metadata, and bundle files. Console prose is non-authoritative. |

## Expected Proof

- Wave0 fails twice through real gate attempts, exposing Engine-derived attempt count, delta diagnostics, and cascade-masked diagnostics.
- Status sync without `enter-phase` fails closed.
- Old-style next-gate sync, such as `advance-status --to wave1_complete` after Wave0, fails closed and advises source-gate sync.
- `enter-phase --node <check.next>` writes route-bound `load_complete` metadata tied to the authorizing gate attempt index.
- Entry witness alone does not prove target work completion; the target gate still fails normal content rules until artifacts exist.
- Wave1, Wave2, HITL2 proceed, readiness, and terminal final status windows follow real `check.next`.
- HITL2 rerun uses the real `check-gate-hitl2-recorded.mjs` output and trace to target `phases/phase-rerun.md`.
- Rerun-ready then witnesses `phases/phase-seed-topics.md`, and seed-topics accepts `rerun_ready -> seed_topics_ready` as a legal alternate predecessor.
- A newer failed source gate attempt supersedes an older pass for both `enter-phase` and `advance-status`.

## Health Interpretation

This case intentionally records failing gate attempts as part of the proof. The post-run standard health check is expected to report `ISSUES` for `_observability/gates` when those expected boundary failures are present. That health status does not change the trace-jsonl verdict, but it does preserve the disposable bundles for audit.

## PASS Criteria

- Runner exits 0.
- Runner prints `VERDICT: PASS`.
- `_temp/exp_verdicts.jsonl` records `case-501-standard-handoff-witnessing` with `verdict: "PASS"`.
- No check event has `passed !== expected`.


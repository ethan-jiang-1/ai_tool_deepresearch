---
schema: command-experiment/v1
experiment: reentry-debuggability
case: case-317-light-post-final-recovery
weight: light
case_goal: "验证 legal Final 经 audited C5 event-last recovery、existing entry/status/C3/rerun owners进入正常 descendant pipeline，且无addendum或generic override。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: tests/.test-bundles/dpt_disp_case-317_post-final-recovery_*
trace: tests/.test-bundles/dpt_disp_case-317_post-final-recovery_*/rb_trace.jsonl
verdict: filesystem
production_distance: >
  Prior readiness→Final lineage uses a controlled valid fixture; every C5/C3/rerun operation after that boundary uses production CLIs and real disposable bundle bytes.
---

# Case 317: Audited Post-Final Recovery To Canonical Rerun

## Execution Contract

Use one real disposable `dpt_disp_*` bundle and production CLIs. The fixture begins at a byte-valid legal terminal Final lineage. From that boundary onward, no trace/status/topic success authority is hand-written.

## Reality Distance Ledger

- Real: post-final inspect/apply/replay, prepared/event transaction, `enter-phase`, `advance-status`, topic-state apply, rerun-ready gate, normal seed-topics handoff, reentry, trace and filesystem assertions.
- Controlled fixture: prior readiness→Final gate/load and minimal report bytes.
- Not claimed: cryptographic human identity, hostile same-principal defense, live research quality, generic maintenance/state-seed.

## Expected Runtime Path

```text
legal Final fixture
→ operate-post-final-recovery inspect
→ retained post_final_rerun request
→ apply / exact event-last commit
→ enter-phase phase-rerun
→ advance-status --to hitl2_recorded
→ check-reentry --at hitl2_recorded
→ operate-topic-state apply add_topic
→ Agent-owned exact rerun_count increment
→ check-gate-rerun-ready
→ enter-phase <check.next>
→ advance-status --to rerun_ready
→ repeat C5 apply = unchanged/current owner
```

## Step 1 — Create Disposable Legal-Final Fixture

Create a unique `dpt_disp_case-317_post-final-recovery_<hex>` bundle containing matching logical identity, empty canonical topic registry, quiescent queue, one final report, and a legal readiness→Final gate/load trace.

## Step 2 — Inspect And Retain Request

Run production `operate-post-final-recovery.mjs inspect`, copy exact request bindings, add explicit reason/scope, and retain the JSON input.

## Step 3 — Commit And Consume Exceptional Handoff

Run production apply, then `enter-phase phase-rerun`, `advance-status --to hitl2_recorded`, and `check-reentry --at hitl2_recorded`. Verify no synthetic HITL2 gate attempt exists.

## Step 4 — Reuse Canonical Topic Owner

Run production `operate-topic-state.mjs apply` with one `add_topic` action. Verify registry+seed canonical footprint and no addendum namespace.

## Step 5 — Continue Normal Rerun Chain

Increment only the existing rerun count, pass production rerun-ready gate, consume `check.next` with `enter-phase`, and synchronize `advance-status --to rerun_ready`.

## Step 6 — Trace-Derived Verdict And Cleanup

PASS requires prior Final lineage, one recovery event, exact exceptional load/transition bindings, canonical topic materialization, normal rerun-ready gate/load/transition, repeat apply stability, no hand-written/addendum authority, and PASS-only cleanup.

Optional automation smoke:

```bash
node experiments_env/shared/run-post-final-recovery-case.mjs --case case-317 --target-dir tests/.test-bundles --cleanup-pass
```

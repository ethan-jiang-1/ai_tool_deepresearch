---
schema: command-experiment/v1
experiment: wfn-wave0
case: case-214-light-timeout-progress-lease
weight: light
case_goal: "验证 timeout-preflight / progress-aware lease 防止 delegated work-unit 被 wall-clock timeout 误杀，并保留 no-progress REDO 与 forced-timeout audit。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-214_w0_timeout_progress_lease
trace: dpt_disp_case-214_w0_timeout_progress_lease/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-011
---

## Execution Contract

Fixture-backed Engine case, no Agent actor, no external calls. Fixture result, receipt, output, and cache files may be staged only after `operate-work-unit claim`; every timeout, preflight, submit, and retry fact must pass through production `operate-work-unit` CLI/API boundaries. Fixture facts prove Engine timeout policy only; they do not prove real Sub-agent search/fetch quality.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Production `operate-queue enqueue`, `operate-work-unit claim/timeout-preflight/timeout/submit`, work-unit index, queue, ledger, and trace |
| Fixture input | Controlled candidate result, progress receipt, output, and cache surfaces after claim |
| Agent actor | None; fixture-backed Engine evidence only |
| External calls | None |
| Verdict source | Trace JSONL `check` events plus CLI JSON and bundle authority files |
| Does not prove | Agent search, source selection, repair judgment, or semantic research quality |

# case-214-light-timeout-progress-lease

## Expected Runtime Path

1. Create a disposable Wave0 bundle through shared setup.
2. Enqueue and claim separate work units for each timeout-preflight condition.
3. For a no-progress expired claim, prove timeout-preflight permits timeout and normal timeout requeues retry.
4. For a recent-progress claim, prove timeout-preflight and default timeout refuse terminalization without authority side effects.
5. For candidate result cases, prove dry-submit pass routes to `submit`, repairable failure routes to same-`work_id` repair, wrong identity routes to inspect/block, and external candidate mtime does not extend the idle lease.
6. Force timeout a progress-positive claim and prove durable forced-timeout diagnostics plus normal `submit` after timeout still rejects.
7. Record all runtime facts as trace `check` events; clean up only on PASS.

## Step 1: [MAIN/SHELL] Run Controlled Checkpoints

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-214 --cleanup-pass
```

Expected: command exits `0`, prints `verdict: "PASS"`, and removes the disposable bundle. The runner writes trace `check` rows for no-progress timeout eligibility, retry requeue, progress refusal no-side-effect, submit/repair/inspect advice, external-candidate mtime non-extension, force audit, and normal submit-after-timeout fail-closed behavior.

## Step 2: [MAIN] Result Interpretation

PASS means progress-aware timeout preflight protects progress-positive delegated attempts, keeps no-progress REDO valid, routes candidate results through submit/repair/inspect advice, records explicit forced-timeout audit fields, and preserves normal submit fail-closed behavior after timeout. FAIL means the preserved bundle contains the exact CLI JSON, work-unit index, queue state, trace rows, and candidate files needed for repair.

## Step 3: [MAIN/SHELL] Cleanup

PASS cleanup is performed by `--cleanup-pass`. If the command fails, preserve the disposable bundle for diagnosis and do not manually patch trace, receipt, ledger, or result files to force a PASS.

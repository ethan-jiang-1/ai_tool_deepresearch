---
schema: command-experiment/v1
experiment: engine-boundary
case: case-406-heavy-real-subagent-boundary
weight: heavy
case_goal: "验证真实 dpt-source-intake Sub-agent/WebSearch/WebFetch 路径通过 work-unit submit 产生 ledger/cache/gate proof；无真实 Agent result 时只记录 NOT RUN。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-406_eb_real_work_unit
trace: dpt_disp_case-406_eb_real_work_unit/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Heavy case. PASS requires a real `dpt-source-intake` actor and real WebSearch/WebFetch or an approved fetch degradation chain. Fixture output, hand-written ledger rows, and hand-written fake search cache cannot produce PASS.

Without a real actor result, the runner must record `NOT_RUN` and exit `2`. `NOT_RUN` is explicit evidence of deferred real-Agent execution; it is not PASS.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Agent actor | Required for PASS |
| External calls | Required for PASS |
| Ledger generation | Real `operate-work-unit submit` |
| Gate input | Submitted work-unit ledger rows |
| No-real-agent rule | Record NOT RUN, preserve bundle, do not mark PASS |

# case-406-heavy-real-subagent-boundary

## Expected Runtime Path

1. Create a disposable bundle through shared setup.
2. Enqueue and claim a real Wave0 source-intake work unit.
3. If no real Agent result is provided, write an explicit NOT_RUN report and preserve the bundle.
4. If a real Agent result is provided, submit it through `operate-work-unit submit`.
5. Run the Wave0 gate and read gate JSON as structured feedback.
6. Record real-submit, gate, and work-unit trace checks in root `rb_trace.jsonl`.
7. Print PASS/FAIL/NOT_RUN and clean up only on PASS.

## Step 1: [MAIN/SHELL] Prove No Fixture PASS

Run without a real result to verify the heavy case cannot pass on fixture or missing actor evidence.

```bash
set +e
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-406
sts=$?
set -e
test "$sts" -eq 2
```

Expected: command prints `verdict: "NOT_RUN"`, writes `case-406-not-run.json`, and exits `2`.

## Step 2: [MAIN->AGENT] Produce Real Actor Result

A real project Agent must execute the generated work-unit task using the task, manifest, beacon, result schema, and receipt nonce from the claimed work-unit envelope. The Agent may use WebSearch/WebFetch or an approved fetch degradation chain. Do not hand-write a fake result, fake receipt, fake cache, or fake ledger row.

Expected runtime fact: the real actor produces a result JSON whose `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, output files, cache trails, and runtime receipt match the claimed work unit.

## Step 3: [MAIN/SHELL] Submit Real Result

After a real project Agent has completed the generated work-unit task and produced a valid result JSON:

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-406 --real-result <result.json> --cleanup-pass
```

Expected for a real successful run: command exits `0` and prints `verdict: "PASS"`. A diagnostic run without `--cleanup-pass` also writes `case-406-verdict.json`.

## Step 4: [MAIN] Read Machine Feedback

Read the runner JSON and, on FAIL or NOT_RUN, inspect the preserved bundle. Gate JSON and trace checks are the authority; the real Agent's narrative summary is not a verdict source by itself.

Expected real-path coverage:

- Work-unit claim creates a real task, manifest, beacon, result schema, and runtime receipt path.
- Real Agent output can pass only through `operate-work-unit submit`.
- Gate pass, when achieved, comes from submitted work-unit ledger coverage and cross-checks.

## Step 5: [MAIN/SHELL] Verdict Checks

For PASS, the runner must record trace `check` rows for `real-submit`, `wave0-gate`, and `work-unit-trace`. Without a real result, the case records `NOT_RUN` and exits `2`; this is a preserved deferred-evidence state, not a failure of the fixture-backed boundary cases.

## Step 6: [MAIN] Result Interpretation

PASS means a real sub-agent actor completed the same work-unit submit and gate path used by fixture-backed Engine cases. NOT_RUN means the real Agent behavior remains unproven and must not be counted as production behavior coverage. FAIL means the preserved bundle contains the gate, submit, or trace feedback needed for repair.

## Step 7: [MAIN/SHELL] Cleanup

Normal real-result execution uses `--cleanup-pass`: PASS removes the disposable bundle, while FAIL and NOT_RUN preserve it for diagnosis or later real-Agent continuation.

## Optional Automation Smoke

The no-result and real-result commands above are already step-sized controller checkpoints: Step 1 proves no fixture PASS, Step 2 requires real Agent work, Step 3 submits that real result. A suite runner may aggregate their reports, but it must not convert NOT_RUN into PASS or replace Step 2 with fixture output.

---
schema: command-experiment/v2
experiment: engine-boundary
case: case-406-heavy-real-subagent-boundary
case_goal: "验证独立 dpt-source-intake Sub-agent 按真实 work-unit envelope 写 result/receipt/output 后，经 submit 产生 ledger、trace 和 Wave0 gate proof；native Sub-agent 不可用时诚实 NOT_RUN。"
verdict_mode: all
required_checks: [real-subagent-task-bound, real-subagent-result-written, real-subagent-receipt-nonce-preserved, real-subagent-output-written, real-subagent-submit-succeeded, wave0-gate-pass, work-unit-submit-traced]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_task, subject_result, subject_receipt, subject_output]
proof_subject: agent_behavior
subject_execution: real_subagent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
not_run_if: "The native dpt-source-intake Sub-agent tool or required local tool capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

# Case 406 - Real Sub-agent Work-Unit Boundary

## Execution Contract

PASS requires an independent native `dpt-source-intake` Sub-agent. The Playbook Agent may prepare the work-unit envelope, invoke the Subject Sub-agent, read its returned feedback, submit its exact durable result, and record deterministic checks. It must not perform the bounded Subject task itself, write or repair Subject result/receipt/output/cache bytes on the Subject's behalf, or turn fixture/parent output into Agent-behavior evidence.

This is a no-network native-actor canary: `external_calls: none` is deliberate. Setup is fixture-backed, but the actor boundary is real. If the native Sub-agent surface or its required local capabilities are unavailable, finalize NOT_RUN with the prepared bundle and stop. Do not manufacture the seven required checks.

## Step 1 - Prepare and register one claimed work unit

```bash
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node experiments_env/shared/run-fixture-backed-case.mjs \
  --case case-406 \
  --prepare-only \
  --target-dir {{CASE_RUN_ROOT_SH}} \
  --context {{RUN_CONTEXT_SH}} \
  --bundle-role verdict > "$STATE/case406-prepared.json"
```

Read `$STATE/case406-prepared.json`. Its `prepared` object contains the exact absolute `task_path`, `beacon_path`, `result_schema_path`, `runtime_receipt_path`, `result_path`, and `spawn_prompt` for one claimed work ID.

## Step 2 - Run the independent native Subject Sub-agent

Use the native Task/Sub-agent tool to start exactly one `dpt-source-intake` Subject Sub-agent. Give it the exact `spawn_prompt` and absolute paths from the prepared object. Require it to read the generated task, immutable beacon, and result schema; perform only that bounded work; and write the assigned result, runtime receipt, declared output, and cache bytes before returning. Preserve the returned Task result as diagnostic evidence, but do not substitute parent-authored bytes for any missing assigned file.

After the Task returns, verify that `result_path`, `runtime_receipt_path`, and at least one result-declared output file exist. If the native Task tool cannot launch the named Sub-agent, or it returns without those assigned files and cannot repair its own work, record the unavailable boundary:

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
printf '%s\n' 'native dpt-source-intake Sub-agent or required local actor capability unavailable' > "$B/case-406-subject-unavailable.txt"
```

NOT_RUN is deferred evidence, not PASS or fixture failure. Do not continue to Step 3 after finalizing it.

## Step 3 - Submit the Subject-owned result and run the gate

Only after Step 2 has produced the assigned durable files. Skip Steps 3 and 4 when the unavailable marker exists:

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.prepared.result_path)' "$STATE/case406-prepared.json")
node experiments_env/shared/run-fixture-backed-case.mjs \
  --case case-406 \
  --bundle "$B" \
  --real-result "$RESULT" > "$STATE/case406-submitted.json"
```

## Step 4 - Record exact case-owned checks

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const [bundle] = process.argv.slice(2);
const verdict = JSON.parse(readFileSync(join(bundle, 'case-406-verdict.json')));
const required = [
  'real-subagent-task-bound', 'real-subagent-result-written',
  'real-subagent-receipt-nonce-preserved', 'real-subagent-output-written',
  'real-subagent-submit-succeeded', 'wave0-gate-pass', 'work-unit-submit-traced',
];
const byLabel = new Map(verdict.checks.map((row) => [row.label, row]));
for (const gate of required) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({
  ts: new Date().toISOString(), event: 'check', source: 'playbook', gate,
  passed: byLabel.get(gate)?.passed === true, expected: true,
})}\n`);
if (required.some((gate) => byLabel.get(gate)?.passed !== true)) process.exit(1);
JS
```

## Step 5 - Native completion with exact Subject evidence

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
EXTRA_ARGS=()
if [ -f "$B/case-406-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "native dpt-source-intake Sub-agent or required local actor capability unavailable")
else
  TASK=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.task)' "$STATE/case406-submitted.json")
  RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.result)' "$STATE/case406-submitted.json")
  RECEIPT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.receipt)' "$STATE/case406-submitted.json")
  OUTPUT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.output)' "$STATE/case406-submitted.json")
  EXTRA_ARGS+=(--evidence "subject_task=$TASK" --evidence "subject_result=$RESULT" --evidence "subject_receipt=$RECEIPT" --evidence "subject_output=$OUTPUT")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject-evidence export, audit, preservation, and optional clean-PASS cleanup of the complete case run root.

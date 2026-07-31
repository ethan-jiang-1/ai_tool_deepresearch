---
schema: command-experiment/v2
experiment: autonomous-research-hardening
case: case-604-heavy-real-subagent-write-before-return
case_goal: "BUG-039/040: 独立 native Sub-agent 接收真实 work-unit task，使用 search/fetch 写完 result/receipt/output/cache 后才返回，保留 nonce 并通过 submit。"
verdict_mode: all
required_checks: [real-subagent-result-written, real-subagent-receipt-nonce-preserved, real-subagent-submit-succeeded, no-chat-only-return]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_task, subject_result, subject_receipt, subject_output]
proof_subject: agent_behavior
subject_execution: real_subagent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: DEW-009
not_run_if: "The native dpt-source-intake Sub-agent or real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

# Case 604 - Real Sub-agent Writes Before Return

## Execution Contract

PASS requires an independent native `dpt-source-intake` Subject Sub-agent and real search/fetch. The Playbook Agent prepares and submits the work-unit but must not perform the Subject task, convert its own output into a result, or write/repair Subject result, receipt, output, or cache bytes. Chat-only research text is not evidence.

## Step 1 - Prepare the claimed work unit

```bash
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node experiments_env/shared/run-fixture-backed-case.mjs \
  --case case-604 --prepare-only \
  --target-dir {{CASE_RUN_ROOT_SH}} \
  --context {{RUN_CONTEXT_SH}} --bundle-role verdict > "$STATE/case604-prepared.json"
```

Read the prepared JSON and use its exact `spawn_prompt`, `task_path`, `beacon_path`, `result_schema_path`, `runtime_receipt_path`, and `result_path`.

## Step 2 - Run the native Subject Sub-agent

Invoke exactly one native Task/Sub-agent with role `dpt-source-intake`. Require it to read the exact generated task/beacon/schema, use real search/fetch, preserve every assigned identity and nonce, and write the assigned result, runtime receipt, declared output, and cache leaves before returning. Do not persist a parent-authored substitute if it returns chat text without those files.

If the native actor or search/fetch capability is unavailable, record it and skip Steps 3 and 4:

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
printf '%s\n' 'native dpt-source-intake Sub-agent or real search/fetch capability unavailable' > "$B/case-604-subject-unavailable.txt"
```

## Step 3 - Submit only the Subject-owned result

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.prepared.result_path)' "$STATE/case604-prepared.json")
node experiments_env/shared/run-fixture-backed-case.mjs --case case-604 --bundle "$B" --real-result "$RESULT" > "$STATE/case604-submitted.json"
```

The actor checkpoint stops after the Subject-owned result/receipt/output/cache facts and Engine submit are recorded. This helper does not run a Wave0 Gate or assert Phase readiness; those remain the responsibility of a Phase-ready Wave0 playbook.

## Step 4 - Record the four exact actor checks

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const [bundle] = process.argv.slice(2);
const verdict = JSON.parse(readFileSync(join(bundle, 'case-604-verdict.json')));
const required = ['real-subagent-result-written', 'real-subagent-receipt-nonce-preserved', 'real-subagent-submit-succeeded', 'no-chat-only-return'];
const byLabel = new Map(verdict.checks.map((row) => [row.label, row]));
for (const gate of required) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed: byLabel.get(gate)?.passed === true, expected: true })}\n`);
if (required.some((gate) => byLabel.get(gate)?.passed !== true)) process.exit(1);
JS
```

## Step 5 - Native completion with exact Subject bytes

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
EXTRA_ARGS=()
if [ -f "$B/case-604-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "native dpt-source-intake Sub-agent or real search/fetch capability unavailable")
else
  TASK=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.task)' "$STATE/case604-submitted.json")
  RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.result)' "$STATE/case604-submitted.json")
  RECEIPT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.receipt)' "$STATE/case604-submitted.json")
  OUTPUT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.output)' "$STATE/case604-submitted.json")
  EXTRA_ARGS+=(--evidence "subject_task=$TASK" --evidence "subject_result=$RESULT" --evidence "subject_receipt=$RECEIPT" --evidence "subject_output=$OUTPUT")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable evidence export, audit, preservation, and optional clean-PASS cleanup.

---
schema: command-experiment/v2
experiment: autonomous-research-hardening
case: case-605-heavy-bundle-containment-real-subagent
case_goal: "BUG-037: 独立 real Sub-agent 的 work-unit 写入只落在 current run bundle_dir，submit 后 inspect-bundle 与 repo-root active-leak 检查保持 clean。"
verdict_mode: all
required_checks: [real-subagent-submit-succeeded, inspect-bundle-no-active-leak, repo-root-no-runtime-leak]
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
req: BUI-002
not_run_if: "The native dpt-source-intake Sub-agent or real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

# Case 605 - Real Sub-agent Bundle Containment

## Execution Contract

PASS requires an independent native `dpt-source-intake` Subject Sub-agent. It must write every assigned result, receipt, output, and cache byte under the exact current run bundle root. The Playbook Agent may prepare, invoke, submit, and inspect, but it must not write Subject evidence or move leaked bytes into place after the fact. Deterministic leak-classifier tests cannot replace this producer execution.

## Step 1 - Prepare the claimed work unit

```bash
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node experiments_env/shared/run-fixture-backed-case.mjs \
  --case case-605 --prepare-only \
  --target-dir {{CASE_RUN_ROOT_SH}} \
  --context {{RUN_CONTEXT_SH}} --bundle-role verdict > "$STATE/case605-prepared.json"
```

## Step 2 - Run the native Subject Sub-agent

Read the prepared JSON and invoke exactly one native Task/Sub-agent with role `dpt-source-intake` using its exact `spawn_prompt` and absolute task/beacon/schema paths. Require real search/fetch and Subject-owned writes to the assigned bundle-contained result/receipt/output/cache paths before return. Do not convert parent or chat-only output into durable Subject files.

If the native actor or search/fetch capability is unavailable, record it and skip Steps 3 and 4:

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
printf '%s\n' 'native dpt-source-intake Sub-agent or real search/fetch capability unavailable' > "$B/case-605-subject-unavailable.txt"
```

## Step 3 - Submit and inspect without repairing containment

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.prepared.result_path)' "$STATE/case605-prepared.json")
node experiments_env/shared/run-fixture-backed-case.mjs --case case-605 --bundle "$B" --real-result "$RESULT" > "$STATE/case605-submitted.json"
```

The helper runs production submit and `inspect-bundle` from repo command cwd. The containment checkpoint stops after submit plus inspection; it does not run a Wave0 Gate or assert Phase readiness. It records containment facts but does not relocate or delete any leak.

## Step 4 - Record the exact containment checks

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const [bundle] = process.argv.slice(2);
const verdict = JSON.parse(readFileSync(join(bundle, 'case-605-verdict.json')));
const required = ['real-subagent-submit-succeeded', 'inspect-bundle-no-active-leak', 'repo-root-no-runtime-leak'];
const byLabel = new Map(verdict.checks.map((row) => [row.label, row]));
for (const gate of required) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed: byLabel.get(gate)?.passed === true, expected: true })}\n`);
if (required.some((gate) => byLabel.get(gate)?.passed !== true)) process.exit(1);
JS
```

## Step 5 - Native completion with exact Subject bytes

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
EXTRA_ARGS=()
if [ -f "$B/case-605-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "native dpt-source-intake Sub-agent or real search/fetch capability unavailable")
else
  TASK=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.task)' "$STATE/case605-submitted.json")
  RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.result)' "$STATE/case605-submitted.json")
  RECEIPT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.receipt)' "$STATE/case605-submitted.json")
  OUTPUT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.evidence.output)' "$STATE/case605-submitted.json")
  EXTRA_ARGS+=(--evidence "subject_task=$TASK" --evidence "subject_result=$RESULT" --evidence "subject_receipt=$RECEIPT" --evidence "subject_output=$OUTPUT")
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable evidence export, audit, preservation, and optional clean-PASS cleanup.

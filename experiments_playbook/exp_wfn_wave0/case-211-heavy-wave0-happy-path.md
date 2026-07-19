---
schema: command-experiment/v2
experiment: wfn-wave0
case: case-211-heavy-wave0-happy-path
case_goal: "验证真实 Wave0 source-intake Agent 结果只能通过 work-unit submit → ledger → Wave0 gate 形成 PASS；无真实结果时记录 NOT_RUN。"
verdict_mode: all
required_checks: [real-submit, wave0-gate, work-unit-inspect]
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
req: RWE-001
not_run_if: "The native dpt-source-intake Sub-agent or required real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

## Execution Contract

Heavy real-Agent case. PASS requires a real `dpt-source-intake` actor to execute the generated work-unit task and produce a real result JSON, runtime receipt, declared output files, and cache trails. Fixture output, hand-written ledger rows, and hand-written fake search cache cannot produce PASS.

Without a real Agent result, this case records `NOT_RUN` and exits `2`. `NOT_RUN` is explicit deferred evidence, not PASS.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real `operate-queue enqueue`, `operate-work-unit claim`, `operate-work-unit submit`, `operate-work-unit inspect`, and Wave0 gate CLI |
| Fixture input | None for PASS |
| Agent actor | Required for PASS |
| External calls | Required for PASS: real WebSearch/WebFetch or approved fetch degradation chain |
| Ledger generation | Real `operate-work-unit submit` |
| Verdict source | Trace JSONL checks, submit JSON, inspect JSON, gate JSON |
| No-real-agent rule | Record NOT_RUN, preserve bundle, do not mark PASS |

# case-211-heavy-wave0-happy-path

## Expected Runtime Path

1. Create a disposable Wave0 bundle and scaffold one real source-intake topic.
2. Enqueue one Wave0 delegated queue demand.
3. Claim one work unit through `operate-work-unit claim` and read the generated task/prompt refs.
4. A real Agent executes the work-unit task using WebSearch/WebFetch and writes its own result/receipt/output/cache evidence.
5. Submit the real result through `operate-work-unit submit`.
6. Run Wave0 gate and `operate-work-unit inspect`.
7. Record trace checks and produce PASS only from submitted ledger/gate/inspect evidence.
8. If no real result exists, record `NOT_RUN` and preserve the bundle.

## Step 1: [MAIN/SHELL] Create Runtime Context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w0_real_agent_work_unit --case case-211 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { writeWave0Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

writeWave0Scaffold(process.argv[2], {
  planBasename: 'w0_real_agent_work_unit',
  topics: [{ id: 't1', slug: 'agentic-coding-tools', title: 'Agentic coding tools' }],
  referenceRows: ['| 00-shared-agentic-coding-tools.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |']
});
JS
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
echo "BUNDLE=$B"
```

Expected: validate/inspect pass and no delegated work is complete.

## Step 2: [MAIN/SHELL] Enqueue And Claim Work Unit

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const task = queueItemForWorkUnit({
  queue_item_id: 'wave0-source-agentic-coding-tools',
  topic_slug: 'agentic-coding-tools',
  title: 'Real Wave0 source intake'
});
const enqueue = enqueueWorkUnitTask(bundle, task, { fileName: 'case211-real-task.json' });
console.log(JSON.stringify(enqueue, null, 2));
JS

CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-source-intake --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_JSON" > "$B/case-211-claim.json"
WORK_ID=$(printf '%s\n' "$CLAIM_JSON" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.claimed_work_ids[0]);')
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(`claimed_count=${j.claimed_count}`);
console.log(`work_id=${j.claimed_work_ids[0]}`);
console.log(`prompt_ref=${j.claimed?.[0]?.prompt_ref || j.prompt_refs?.[0] || "see work-unit envelope"}`);
process.exit(j.claimed_count === 1 ? 0 : 1);
'
```

Expected: one `wave0_source_intake` work unit is claimed. The controller must read the claim JSON and generated work-unit envelope before dispatching the Agent.

## Step 3: [MAIN->AGENT] Produce Real Agent Result

A real project Agent must execute the generated work-unit task from `_work_units/wave0/$WORK_ID/task.md`, obey its manifest, beacon, result schema, receipt nonce, output declaration, and cache policy.

Expected real runtime evidence:

- A result JSON matching the claimed `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- A runtime receipt event with the same `receipt_nonce`.
- Declared `output_files[]` including at least the Wave0 reference and per-topic `source.yaml`.
- Declared `cache_trails[]` with cache metadata that maps to the reference `source_url`.
- No hand-written ledger row.

After the native Sub-agent returns, write `case-211-subagent-evidence.json` as a path-only index containing exact absolute `task`, `result`, `receipt`, and one Subject-written declared `output`. The paths must come from the claim prompt refs and returned result. If the actor cannot run or produce its assigned files, write `case-211-subject-unavailable.txt` with a non-empty reason and skip directly to Step 8; do not create substitute output.

## Step 4: [MAIN/SHELL] No-Result Checkpoint

If no real result exists, use the unavailable marker described above. Native completion will publish `NOT_RUN`; no fixture runner or parent output is allowed.

## Step 5: [MAIN/SHELL] Submit Real Result And Gate

Run only after Step 3 has produced a real Agent result file.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REAL_RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.result)' "$B/case-211-subagent-evidence.json")
WORK_ID=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.claimed_work_ids[0])' "$B/case-211-claim.json")
SUBMIT_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$REAL_RESULT")
printf '%s\n' "$SUBMIT_JSON" > "$B/case-211-submit.json"

set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-211-gate.json"
GATE_STATUS=$?
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect "$B" > "$B/case-211-inspect.json"
INSPECT_STATUS=$?
set -e
printf '%s\n' "$GATE_STATUS" > "$B/case-211-gate.status"
printf '%s\n' "$INSPECT_STATUS" > "$B/case-211-inspect.status"
```

Expected: submit `ok: true`, gate `check.passed: true`, and inspect `passed: true`.

## Step 6: [MAIN/SHELL] Record Verdict Checks

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" "$WORK_ID" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const submit = JSON.parse(readFileSync(`${bundle}/case-211-submit.json`, 'utf8'));
const gate = JSON.parse(readFileSync(`${bundle}/case-211-gate.json`, 'utf8'));
const inspect = JSON.parse(readFileSync(`${bundle}/case-211-inspect.json`, 'utf8'));
const evidence = JSON.parse(readFileSync(`${bundle}/case-211-subagent-evidence.json`, 'utf8'));
const result = JSON.parse(readFileSync(evidence.result, 'utf8'));
const receipts = readFileSync(evidence.receipt, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const subjectBound = existsSync(evidence.task) && existsSync(evidence.output)
  && result.work_id === workId
  && receipts.some((row) => row.work_id === workId)
  && (result.output_files || []).some((row) => resolve(bundle, row.path) === resolve(evidence.output));

recordPlaybookCheck(bundle, { gate: 'real-submit', passed: submit.ok === true && subjectBound, detail: workId });
recordPlaybookCheck(bundle, { gate: 'wave0-gate', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'work-unit-inspect', passed: inspect.passed === true, detail: JSON.stringify(inspect.inspect || []) });

console.log('Recorded native checks; Supervisor finalizer is authoritative.');
JS
```

Expected: PASS only with real Agent result submitted through the work-unit boundary.

## Step 7: [MAIN] Result Interpretation

PASS means a real Wave0 source-intake actor completed the same claim/submit/ledger/gate path used by production. NOT_RUN means real Agent behavior remains unproven. FAIL means the preserved bundle contains the submit, inspect, gate, and trace feedback needed for repair.

## Step 8: [MAIN/SHELL] Native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-211-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "native dpt-source-intake Sub-agent or required real search/fetch capability unavailable")
else
  TASK=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.task)' "$B/case-211-subagent-evidence.json")
  RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.result)' "$B/case-211-subagent-evidence.json")
  RECEIPT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.receipt)' "$B/case-211-subagent-evidence.json")
  OUTPUT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.output)' "$B/case-211-subagent-evidence.json")
  EXTRA_ARGS+=(--evidence "subject_task=$TASK" --evidence "subject_result=$RESULT" --evidence "subject_receipt=$RECEIPT" --evidence "subject_output=$OUTPUT")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject-evidence export, audit, preservation, and optional clean-PASS cleanup.

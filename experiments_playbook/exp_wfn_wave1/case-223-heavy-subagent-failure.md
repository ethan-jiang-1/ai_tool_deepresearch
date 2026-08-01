---
schema: command-experiment/v2
experiment: wfn-wave1
case: case-223-heavy-subagent-failure
case_goal: "Verify a real Wave1 evidence-extractor can honestly return degraded/partial evidence through work-unit submit, and the Wave1 gate correctly fails on incomplete submissions."
verdict_mode: last
required_checks: [real-failure-submit, wave1-gate, work-unit-inspect, work-unit-submitted-trace]
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
req: RWE-001, RWE-003, RWE-007, WAI-006
not_run_if: "The native dpt-evidence-extractor Sub-agent or required real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

## Execution Contract

Heavy real-Agent canary. This case cannot PASS from fixture data. A real `dpt-evidence-extractor` Sub-agent must execute the claimed task, attempt bounded external search/fetch, preserve work-unit identity and receipt authority, and return honest partial/access-limitation evidence when content is inaccessible. The Playbook Agent may prepare setup and evaluate deterministic facts but may not substitute its own output for the Subject actor.

# case-223-heavy-subagent-failure

## Step 1: [MAIN/SHELL] Create And Claim

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w1_real_failure_work_unit --case case-223 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit, writeWave1Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave1Scaffold(bundle, {
  planBasename: 'w1_real_failure_work_unit',
  topics: [{ id: 'th', slug: 'hard-target', title: 'Hard Target' }]
});
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave1',
  queue_item_id: 'wave1-deepen-hard-target',
  topic_slug: 'hard-target',
  title: 'Real Wave1 hard-target degradation proof'
}), { fileName: 'case223-hard-target.json' });
JS
CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-evidence-extractor --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_JSON" > "$B/case-223-claim.json"
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(JSON.stringify({ work_id: j.claimed_work_ids?.[0], prompt_refs: j.prompt_refs }, null, 2));
process.exit(j.claimed_count === 1 ? 0 : 1);
'
```

## Step 2: [MAIN->SUBAGENT] Run The Real Evidence Extractor

Hand the generated `_work_units/wave1/<work_id>/task.md` to a real `dpt-evidence-extractor` Sub-agent. It must attempt bounded search/fetch against the assigned hard target and must not invent inaccessible content. It must write the declared result, runtime receipt, and output files inside the bundle.

After return, write `case-223-subagent-evidence.json` as a path-only index with exact absolute paths for:

- `task`: the claimed task Markdown;
- `result`: the Subject-written result JSON;
- `receipt`: the matching runtime receipt JSONL; and
- `output`: one Subject-written output declared by the result.

If the native Sub-agent or real external capability is unavailable, write `case-223-subject-unavailable.txt` and continue directly to native completion. Fixture data, Playbook-Agent-authored output, or a parent summary cannot substitute.

## Step 3: [MAIN/SHELL] Submit And Evaluate Real Subject Evidence

Skip this step when `case-223-subject-unavailable.txt` exists.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
WORK_ID=$(node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(j.claimed_work_ids[0])' "$B/case-223-claim.json")
REAL_RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(x.result)' "$B/case-223-subagent-evidence.json")
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$REAL_RESULT" > "$B/case-223-submit.json"
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave1_completion', source: 'case-223-real-subagent' });
JS
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect "$B" > "$B/case-223-inspect.json"
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-223-gate.json"
node --input-type=module - "$B" "$WORK_ID" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readTrace, recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const submit = JSON.parse(readFileSync(`${bundle}/case-223-submit.json`, 'utf8'));
const inspect = JSON.parse(readFileSync(`${bundle}/case-223-inspect.json`, 'utf8'));
const gate = JSON.parse(readFileSync(`${bundle}/case-223-gate.json`, 'utf8'));
const evidence = JSON.parse(readFileSync(`${bundle}/case-223-subagent-evidence.json`, 'utf8'));
const result = JSON.parse(readFileSync(evidence.result, 'utf8'));
const receipts = readFileSync(evidence.receipt, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const trace = readTrace(bundle);
const subjectBound = existsSync(evidence.task) && existsSync(evidence.output)
  && result.work_id === workId
  && receipts.some((row) => row.work_id === workId)
  && (result.output_files || []).some((row) => resolve(bundle, row.path) === resolve(evidence.output));
recordPlaybookCheck(bundle, { gate: 'real-failure-submit', passed: submit.ok === true && subjectBound, detail: workId });
recordPlaybookCheck(bundle, { gate: 'work-unit-inspect', passed: inspect.passed === true, detail: JSON.stringify(inspect.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave1-gate', passed: gate.check?.passed === false, detail: JSON.stringify(gate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'work-unit-submitted-trace', passed: trace.some((event) => event.event === 'work_unit_submitted' && event.work_id === workId), detail: workId });
JS
```

## Step 4: [MAIN/SHELL] Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-223-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "native dpt-evidence-extractor Sub-agent or required real search/fetch capability unavailable")
else
  TASK=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.task)' "$B/case-223-subagent-evidence.json")
  RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.result)' "$B/case-223-subagent-evidence.json")
  RECEIPT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.receipt)' "$B/case-223-subagent-evidence.json")
  OUTPUT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.output)' "$B/case-223-subagent-evidence.json")
  EXTRA_ARGS+=(--evidence "subject_task=$TASK" --evidence "subject_result=$RESULT" --evidence "subject_receipt=$RECEIPT" --evidence "subject_output=$OUTPUT")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject-evidence export, audit, preservation, and optional clean-PASS cleanup.

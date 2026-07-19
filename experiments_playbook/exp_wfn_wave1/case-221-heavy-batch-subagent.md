---
schema: command-experiment/v2
experiment: wfn-wave1
case: case-221-heavy-batch-subagent
case_goal: "Verify real Wave1 batch topic-deepening through work-unit claim, real dpt-evidence-extractor actors, submit-by-work-id, ledger coverage, backfill, and Wave1 gate pass."
verdict_mode: all
required_checks: [real-wave1-batch-submit, wave1-gate, work-unit-inspect]
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
req: RWE-001, RWE-003, WAI-006
not_run_if: "Either native dpt-evidence-extractor Sub-agent or required real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

## Execution Contract

Heavy real-Agent canary. This case cannot PASS from fixture data. The Main Agent may use fixture scaffolding for bundle/topic setup, but each Wave1 delegated result must be produced by a real `dpt-evidence-extractor` actor from the claimed work-unit task and accepted only through `operate-work-unit submit`.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle with witnessed Wave0-to-Wave1 handoff |
| Framework path | Real `operate-queue enqueue`, `operate-work-unit claim/submit`, submitted ledger, `operate-work-unit inspect`, and Wave1 gate CLI |
| Fixture input | Bundle/topic scaffolding only |
| Agent actor | Required: two real `dpt-evidence-extractor` actors |
| External calls | Required when actor task uses WebSearch/WebFetch or approved fetch chain |
| Verdict source | Trace checks, real submit JSON, work-unit ledger/index, Wave1 gate JSON |
| Does not prove | Nothing if reported `NOT_RUN`; a fixture-backed PASS is forbidden |

# case-221-heavy-batch-subagent

## Expected Runtime Path

1. Create a Wave1-ready disposable bundle with two topics.
2. Enqueue two `wave1_topic_deepening` queue demands.
3. Claim both through one `operate-work-unit claim --count 2`.
4. Spawn two real `dpt-evidence-extractor` actors using the generated work-unit task prompts.
5. Each actor writes result/receipt/output/cache according to its work-unit contract.
6. Main Agent submits each result by `work_id`, in any return order.
7. Main Agent reads submit JSON, work-unit inspect JSON, and Wave1 gate JSON before recording trace checks.
8. If no real actor surface is available, record `NOT_RUN` and stop.

## Step 1: [MAIN/SHELL] Create Runtime Context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w1_real_batch_work_unit --case case-221 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { writeWave1Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

writeWave1Scaffold(process.argv[2], {
  planBasename: 'w1_real_batch_work_unit',
  topics: [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' }
  ]
});
JS
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
echo "BUNDLE=$B"
```

## Step 2: [MAIN/SHELL] Enqueue And Claim Batch

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
for (const topic of [
  { slug: 'topic-a', title: 'Topic A' },
  { slug: 'topic-b', title: 'Topic B' }
]) {
  enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: `wave1-deepen-${topic.slug}`,
    topic_slug: topic.slug,
    title: `Real Wave1 deepening for ${topic.title}`
  }), { fileName: `case221-${topic.slug}.json` });
}
JS

CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave1 --count 2 --actor-outcome available --actor-source native_probe --actor-role-key dpt-evidence-extractor --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_JSON" > "$B/case-221-claim.json"
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(JSON.stringify({ claimed_count: j.claimed_count, work_ids: j.claimed_work_ids, prompt_refs: j.prompt_refs }, null, 2));
process.exit(j.claimed_count === 2 ? 0 : 1);
'
```

Expected: two work-unit prompts are generated under `_work_units/wave1/{work_id}/task.md`.

## Step 3: [MAIN->SUBAGENT] Run Real Actors

For each `work_id` in `case-221-claim.json`, hand the generated task prompt to a real `dpt-evidence-extractor` actor. The actor must read its beacon, preserve `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`, perform bounded topic deepening, and produce the declared result JSON plus runtime receipt.

After both actors return, write `case-221-subagent-evidence.json` as a path-only index with an exact absolute `result_dir` plus representative first-actor `task`, `result`, `receipt`, and Subject-written declared `output` paths. If either actor is unavailable or omits assigned files, write `case-221-subject-unavailable.txt` and skip directly to native completion. Missing actors are `NOT_RUN`; fixture or parent output cannot substitute.

## Step 4: [MAIN/SHELL] Submit Real Results

After real actors return, place their result JSON files in a directory named by `REAL_RESULT_DIR`, with filenames:

```text
<work_id>.result.json
```

Then submit them:

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REAL_RESULT_DIR=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.result_dir)' "$B/case-221-subagent-evidence.json")
node --input-type=module - "$B" "$REAL_RESULT_DIR" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { submitWorkUnitViaCli } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, resultDir] = process.argv.slice(2);
const claim = JSON.parse(readFileSync(`${bundle}/case-221-claim.json`, 'utf8'));
const submits = [];
for (const workId of claim.claimed_work_ids) {
  const resultPath = path.join(resultDir, `${workId}.result.json`);
  submits.push({ work_id: workId, submit: submitWorkUnitViaCli(bundle, { work_id: workId, resultPath }) });
}
writeFileSync(`${bundle}/case-221-submit.json`, `${JSON.stringify(submits, null, 2)}\n`);
console.log(JSON.stringify(submits, null, 2));
process.exit(submits.every((entry) => entry.submit.ok === true) ? 0 : 1);
JS
```

## Step 5: [MAIN/SHELL] Gate And Trace Verdict

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave1_completion', source: 'case-221-real-agent' });
JS
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect "$B" > "$B/case-221-inspect.json"
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-221-gate.json"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const submit = JSON.parse(readFileSync(`${bundle}/case-221-submit.json`, 'utf8'));
const inspect = JSON.parse(readFileSync(`${bundle}/case-221-inspect.json`, 'utf8'));
const gate = JSON.parse(readFileSync(`${bundle}/case-221-gate.json`, 'utf8'));
const evidence = JSON.parse(readFileSync(`${bundle}/case-221-subagent-evidence.json`, 'utf8'));
const result = JSON.parse(readFileSync(evidence.result, 'utf8'));
const receipts = readFileSync(evidence.receipt, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const claimed = new Set(submit.map((entry) => entry.work_id));
const subjectBound = existsSync(evidence.task) && existsSync(evidence.output)
  && claimed.has(result.work_id)
  && receipts.some((row) => row.work_id === result.work_id)
  && (result.output_files || []).some((row) => resolve(bundle, row.path) === resolve(evidence.output));
recordPlaybookCheck(bundle, { gate: 'real-wave1-batch-submit', passed: submit.every((entry) => entry.submit.ok === true) && subjectBound, detail: JSON.stringify(submit.map((entry) => entry.work_id)) });
recordPlaybookCheck(bundle, { gate: 'work-unit-inspect', passed: inspect.passed === true, detail: JSON.stringify(inspect.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave1-gate', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
console.log('Recorded native checks; Supervisor finalizer is authoritative.');
JS
```

## Step 6: [MAIN/SHELL] Native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-221-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "native dpt-evidence-extractor Sub-agent or required real search/fetch capability unavailable")
else
  TASK=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.task)' "$B/case-221-subagent-evidence.json")
  RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.result)' "$B/case-221-subagent-evidence.json")
  RECEIPT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.receipt)' "$B/case-221-subagent-evidence.json")
  OUTPUT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.output)' "$B/case-221-subagent-evidence.json")
  EXTRA_ARGS+=(--evidence "subject_task=$TASK" --evidence "subject_result=$RESULT" --evidence "subject_receipt=$RECEIPT" --evidence "subject_output=$OUTPUT")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject-evidence export, audit, preservation, and optional clean-PASS cleanup.

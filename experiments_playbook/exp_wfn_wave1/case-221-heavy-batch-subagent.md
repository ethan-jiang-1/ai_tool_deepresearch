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
req: RWE-001, RWE-003, WAI-006, DEW-021
not_run_if: "Either native dpt-evidence-extractor Sub-agent or required real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

## Execution Contract

Heavy real-Agent canary. This case cannot PASS from fixture data. The Main Agent may use fixture scaffolding for bundle/topic setup, but each Wave1 delegated result must be produced by a real `dpt-evidence-extractor` actor from the claimed work-unit task and accepted only through `operate-work-unit submit`.

For DEW-021, retained `subject_task` evidence proves only that the real actor was supplied the generated claimed task whose first authoring section is `## Completion Contract` before its first returned work is evaluated through the native chain. It does not prove the actor privately read that section, reasoned from it, produced any parent-authored bytes, caused a particular result, received BUG-120 Phase-Agent reference guidance, or achieved research quality.

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
4. Supply each real `dpt-evidence-extractor` actor its generated claimed work-unit task, whose first authoring section is `## Completion Contract`.
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

For each `work_id` in `case-221-claim.json`, supply only its generated task prompt to a real `dpt-evidence-extractor` actor. Retain the exact claimed `task.md` path before recording that actor's first returned work; the supplied task must have `## Completion Contract` as its first `##` section. The actor's native work may then produce the declared result JSON, runtime receipt, outputs, and cache facts.

After both actors return, write `case-221-subagent-evidence.json` as a path-only index with an exact absolute `result_dir`, two actor entries keyed by `work_id`, and one representative first-actor `task`, `result`, `receipt`, and Subject-written declared `output` path. The `task` field is the exact supplied claimed task path, not a reconstructed prompt or a claim about private reading. If either actor is unavailable or omits assigned files, write `case-221-subject-unavailable.txt` and skip directly to native completion. Missing actors are `NOT_RUN`; fixture or parent output cannot substitute. The Playbook and Phase Agent must not edit actor-owned output, receipt, cache or source facts after either return.

## Step 4: [MAIN/SHELL] Predictive Dry-Submit Then Formal Submit

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
import { createHash } from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';

const [bundle, resultDir] = process.argv.slice(2);
const claim = JSON.parse(readFileSync(`${bundle}/case-221-claim.json`, 'utf8'));
const evidence = JSON.parse(readFileSync(`${bundle}/case-221-subagent-evidence.json`, 'utf8'));
const index = loadWorkUnitIndex(bundle);
const actors = [];
const hashFile = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const runWorkUnitCli = (command, workId, resultPath) => {
  const result = spawnSync(process.execPath, [
    'DPT_FRAMEWORK/cli/operate-work-unit.mjs', command, bundle,
    '--work-id', workId, '--result', resultPath,
  ], { encoding: 'utf8' });
  return {
    exit_code: result.status,
    output: result.stdout.trim() ? JSON.parse(result.stdout) : null,
    stderr: result.stderr.trim(),
  };
};

for (const [indexInBatch, workId] of claim.claimed_work_ids.entries()) {
  const resultPath = path.join(resultDir, `${workId}.result.json`);
  const record = index.work_units[workId];
  const manifest = JSON.parse(readFileSync(path.join(bundle, record.paths.manifest_ref), 'utf8'));
  const receiptPath = indexInBatch === 0 ? evidence.receipt : (evidence.actors || []).find((entry) => entry.work_id === workId)?.receipt;
  const targetRefs = manifest.output_contract.required_outputs || [];
  const targetPaths = targetRefs.map((target) => path.join(bundle, target.path));
  const workDone = receiptPath && readFileSync(receiptPath, 'utf8').split(/\r?\n/).filter(Boolean)
    .map(JSON.parse).some((row) => row.event === 'work_done' && row.work_id === workId);
  const preHashes = indexInBatch === 0 && workDone && targetPaths.length === 2
    ? targetPaths.map((target) => ({ ref: path.relative(bundle, target), sha256: hashFile(target) }))
    : [];
  const dry = runWorkUnitCli('dry-submit', workId, resultPath);
  actors.push({ work_id: workId, result_path: resultPath, target_refs: targetRefs, work_done: workDone, pre_hashes: preHashes, dry_submit: dry });
}

const dryPass = actors.length === 2 && actors.every((entry) => entry.dry_submit.exit_code === 0 && entry.dry_submit.output?.ok === true);
const submits = dryPass
  ? actors.map((entry) => ({ work_id: entry.work_id, submit: runWorkUnitCli('submit', entry.work_id, entry.result_path) }))
  : [];
const representative = actors[0];
if (representative && dryPass) {
  representative.post_hashes = representative.target_refs.map((target) => {
    const targetPath = path.join(bundle, target.path);
    return { ref: target.path, sha256: hashFile(targetPath) };
  });
}
const firstReturn = { actors, dry_submit_all_pass: dryPass, submits };
writeFileSync(`${bundle}/case-221-first-return.json`, `${JSON.stringify(firstReturn, null, 2)}\n`);
writeFileSync(`${bundle}/case-221-submit.json`, `${JSON.stringify(submits, null, 2)}\n`);
console.log(JSON.stringify(firstReturn, null, 2));
JS
```

## Step 5: [MAIN/SHELL] Gate And Trace Verdict

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
const firstReturn = JSON.parse(readFileSync(`${bundle}/case-221-first-return.json`, 'utf8'));
if (firstReturn.submits.length === 2 && firstReturn.submits.every((entry) => entry.submit.output?.ok === true)) {
  appendTrace(bundle, { event: 'wave1_completion', source: 'case-221-real-agent' });
}
JS
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect "$B" > "$B/case-221-inspect.json"
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-221-gate.json"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';

const bundle = process.argv[2];
const submit = JSON.parse(readFileSync(`${bundle}/case-221-submit.json`, 'utf8'));
const inspect = JSON.parse(readFileSync(`${bundle}/case-221-inspect.json`, 'utf8'));
const gate = JSON.parse(readFileSync(`${bundle}/case-221-gate.json`, 'utf8'));
const evidence = JSON.parse(readFileSync(`${bundle}/case-221-subagent-evidence.json`, 'utf8'));
const firstReturn = JSON.parse(readFileSync(`${bundle}/case-221-first-return.json`, 'utf8'));
const result = JSON.parse(readFileSync(evidence.result, 'utf8'));
const receipts = readFileSync(evidence.receipt, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const taskText = readFileSync(evidence.task, 'utf8');
const index = loadWorkUnitIndex(bundle);
const taskRecord = index.work_units[result.work_id];
const completionContractFirst = taskText.indexOf('## Completion Contract') === taskText.indexOf('##');
const taskBoundToClaim = taskRecord && resolve(bundle, taskRecord.paths.task_ref) === resolve(evidence.task);
const claimed = new Set(submit.map((entry) => entry.work_id));
const representative = firstReturn.actors[0];
const pairedTargets = representative?.target_refs || [];
const hashesMatch = pairedTargets.length === 2
  && representative.work_done === true
  && representative.pre_hashes?.length === 2
  && representative.post_hashes?.length === 2
  && representative.pre_hashes.every((entry, index) => entry.ref === representative.post_hashes[index]?.ref && entry.sha256 === representative.post_hashes[index]?.sha256);
const subjectBound = existsSync(evidence.task) && existsSync(evidence.output)
  && completionContractFirst
  && taskBoundToClaim
  && claimed.has(result.work_id)
  && receipts.some((row) => row.work_id === result.work_id)
  && (result.output_files || []).some((row) => resolve(bundle, row.path) === resolve(evidence.output));
const passed = firstReturn.dry_submit_all_pass === true
  && firstReturn.actors.length === 2
  && firstReturn.actors.every((entry) => entry.dry_submit.output?.ok === true)
  && submit.length === 2
  && submit.every((entry) => entry.submit.output?.ok === true)
  && hashesMatch
  && subjectBound;
recordPlaybookCheck(bundle, {
  gate: 'real-wave1-batch-submit',
  passed,
  detail: JSON.stringify({
    work_ids: firstReturn.actors.map((entry) => entry.work_id),
    representative: representative && {
      work_id: representative.work_id,
      supplied_task_completion_contract_first: completionContractFirst,
      supplied_task_bound_to_claim: taskBoundToClaim,
      target_refs: pairedTargets.map((target) => target.path),
      pre_hashes: representative.pre_hashes,
      dry_submit: { exit_code: representative.dry_submit.exit_code, ok: representative.dry_submit.output?.ok === true },
      formal_submit: {
        exit_code: submit.find((entry) => entry.work_id === representative.work_id)?.submit?.exit_code,
        ok: submit.find((entry) => entry.work_id === representative.work_id)?.submit?.output?.ok === true,
      },
      post_hashes: representative.post_hashes,
    },
  }),
});
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

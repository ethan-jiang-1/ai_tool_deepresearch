---
schema: command-experiment/v2
experiment: wfn-wave1
case: case-221-extreme-slow-batch-subagent
case_goal: "Verify seven real Wave1 topic-deepening work units through one batch claim, nonce-bound lifecycle evidence, normal submit-by-work-id, ledger coverage, and work-unit inspection."
verdict_mode: all
required_checks: [real-wave1-batch-submit, work-unit-inspect]
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
not_run_if: "Any of seven required native dpt-evidence-extractor actors or required real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

> **QUARANTINED - EXTREME SLOW.** Do not run this playbook through Autorun or Interactive. Refactor it, move it back to a normal `light`, `standard`, or `heavy` runnable path, and explicitly re-register it before reactivation; otherwise remove it.

## Execution Contract

Heavy real-Agent canary. This case cannot PASS from fixture data. The Main Agent may use fixture scaffolding only for bundle/topic setup, but each of seven Wave1 delegated results must be produced by a real `dpt-evidence-extractor` actor from its claimed work-unit task and accepted only through normal `operate-work-unit submit`.

The canary stops at its seven-work-unit submit and inspection checkpoint. It does not establish Phase-owned Wave1 semantic projections, invoke a Wave1 Gate, or report Wave1 readiness; a Phase-ready Wave1 playbook owns those claims.

For DEW-021, retained `subject_task` evidence proves only that the real actor was supplied the generated claimed task whose first authoring section is `## Completion Contract` before its first returned work is evaluated through the native chain. It does not prove the actor privately read that section, reasoned from it, produced any parent-authored bytes, caused a particular result, received BUG-120 Phase-Agent reference guidance, or achieved research quality.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle with fixture-established Wave1 work-unit setup |
| Framework path | Real `operate-queue enqueue`, `operate-work-unit claim/submit`, submitted ledger, and `operate-work-unit inspect` |
| Fixture input | Bundle/topic scaffolding only |
| Agent actor | Required: seven real `dpt-evidence-extractor` actors, each given a distinct Engine-claimed work-unit prompt |
| External calls | Required when actor task uses WebSearch/WebFetch or approved fetch chain |
| Verdict source | Trace checks, real submit JSON, work-unit ledger/index, and work-unit inspect JSON |
| Does not prove | Wave1 Phase readiness, a Wave1 Gate pass, research quality, or anything if reported `NOT_RUN`; a fixture-backed PASS is forbidden |

# case-221-extreme-slow-batch-subagent

## Expected Runtime Path

1. Create a disposable bundle with seven independent Wave1 work-unit topics.
2. Enqueue seven `wave1_topic_deepening` queue demands.
3. Claim all seven through one `operate-work-unit claim --count 7`.
4. Supply each real `dpt-evidence-extractor` actor its distinct generated claimed work-unit task, whose first authoring section is `## Completion Contract`.
5. Each actor writes result/receipt/output/cache according to its work-unit contract and records nonce-bound `work_started` and `work_done` lifecycle events.
6. Main Agent dry-submits and then normally submits each result by `work_id`, in any return order.
7. Main Agent reads submitted-ledger and work-unit inspect facts, verifies a non-empty lifecycle overlap interval, then records trace checks.
8. Actor-checkpoint PASS does not establish Wave1 Phase readiness or a Gate pass.
9. If any required real actor surface is unavailable, record `NOT_RUN` and stop.

## Step 1: [MAIN/SHELL] Create Runtime Context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w1_real_batch_work_unit --case case-221 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { writeWave1Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

writeWave1Scaffold(process.argv[2], {
  planBasename: 'w1_real_batch_work_unit',
  topics: [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
    { id: 't3', slug: 'topic-c', title: 'Topic C' },
    { id: 't4', slug: 'topic-d', title: 'Topic D' },
    { id: 't5', slug: 'topic-e', title: 'Topic E' },
    { id: 't6', slug: 'topic-f', title: 'Topic F' },
    { id: 't7', slug: 'topic-g', title: 'Topic G' }
  ]
});
JS
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$B"
echo "BUNDLE=$B"
```

## Step 2: [MAIN/SHELL] Enqueue And Claim Batch

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
for (const topic of [
  { slug: 'topic-a', title: 'Topic A' },
  { slug: 'topic-b', title: 'Topic B' },
  { slug: 'topic-c', title: 'Topic C' },
  { slug: 'topic-d', title: 'Topic D' },
  { slug: 'topic-e', title: 'Topic E' },
  { slug: 'topic-f', title: 'Topic F' },
  { slug: 'topic-g', title: 'Topic G' }
]) {
  enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: `wave1-deepen-${topic.slug}`,
    topic_slug: topic.slug,
    title: `Real Wave1 deepening for ${topic.title}`
  }), { fileName: `case221-${topic.slug}.json` });
}
JS

CLAIM_JSON=$(node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim "$B" --phase wave1 --count 7 --actor-outcome available --actor-source native_probe --actor-role-key dpt-evidence-extractor --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_JSON" > "$B/case-221-claim.json"
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(JSON.stringify({ claimed_count: j.claimed_count, work_ids: j.claimed_work_ids, prompt_refs: j.prompt_refs }, null, 2));
process.exit(j.claimed_count === 7 ? 0 : 1);
'
```

Expected: seven distinct work-unit prompts are generated under `_work_units/wave1/{work_id}/task.md`.

## Step 3: [MAIN->SUBAGENT] Run Real Actors

For each `work_id` in `case-221-claim.json`, supply only its distinct generated task prompt to a real `dpt-evidence-extractor` actor. Retain the exact claimed `task.md` path before recording that actor's first returned work; the supplied task must have `## Completion Contract` as its first `##` section. Each actor's native work must produce its declared result JSON, runtime receipt, outputs, cache facts, and nonce-bound `work_started` plus `work_done` lifecycle events.

After all seven actors return, write `case-221-subagent-evidence.json` as a path-only index with exactly seven actor entries keyed by `work_id`. Each entry contains exact absolute `task`, `result`, `receipt`, and one Subject-written declared `output` path. The `task` field is the exact supplied claimed task path, not a reconstructed prompt or a claim about private reading. If any actor is unavailable or omits assigned files, write `case-221-subject-unavailable.txt` and skip directly to native completion. Missing actors are `NOT_RUN`; fixture or parent output cannot substitute. The Playbook and Phase Agent must not edit actor-owned output, receipt, cache, or source facts after any return.

## Step 4: [MAIN/SHELL] Predictive Dry-Submit Then Formal Submit

After all seven real actors return, dry-submit and then normally submit each exact actor-owned result path from `case-221-subagent-evidence.json`:

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadWorkUnitIndex } from './DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';

const bundle = process.argv[2];
const claim = JSON.parse(readFileSync(`${bundle}/case-221-claim.json`, 'utf8'));
const evidence = JSON.parse(readFileSync(`${bundle}/case-221-subagent-evidence.json`, 'utf8'));
const index = loadWorkUnitIndex(bundle);
const evidenceActors = evidence.actors || [];
const evidenceByWorkId = new Map(evidenceActors.map((entry) => [entry.work_id, entry]));
const actors = [];
const runWorkUnitCli = (command, workId, resultPath) => {
  const result = spawnSync(process.execPath, [
    'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs', command, bundle,
    '--work-id', workId, '--result', resultPath,
  ], { encoding: 'utf8' });
  return {
    exit_code: result.status,
    output: result.stdout.trim() ? JSON.parse(result.stdout) : null,
    stderr: result.stderr.trim(),
  };
};

for (const workId of claim.claimed_work_ids) {
  const actorEvidence = evidenceByWorkId.get(workId);
  const resultPath = actorEvidence?.result;
  const record = index.work_units[workId];
  const receiptRows = actorEvidence?.receipt && existsSync(actorEvidence.receipt)
    ? readFileSync(actorEvidence.receipt, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)
    : [];
  const lifecycleRows = receiptRows.filter((row) => row.work_id === workId && row.receipt_nonce === record?.receipt_nonce);
  const workStarted = lifecycleRows.find((row) => row.event === 'work_started');
  const workDone = lifecycleRows.find((row) => row.event === 'work_done');
  const taskBound = actorEvidence?.task && record
    && resolve(bundle, record.paths.task_ref) === resolve(actorEvidence.task);
  const nonceBound = Boolean(record && workStarted && workDone
    && workStarted.receipt_nonce === record.receipt_nonce
    && workDone.receipt_nonce === record.receipt_nonce
    && Number.isFinite(Date.parse(workStarted.ts))
    && Number.isFinite(Date.parse(workDone.ts)));
  const dry = resultPath ? runWorkUnitCli('dry-submit', workId, resultPath) : { exit_code: null, output: null, stderr: 'missing actor result path' };
  actors.push({
    work_id: workId,
    task: actorEvidence?.task,
    result_path: resultPath,
    receipt_path: actorEvidence?.receipt,
    output_path: actorEvidence?.output,
    receipt_nonce: record?.receipt_nonce,
    task_bound_to_claim: taskBound === true,
    lifecycle_nonce_bound: nonceBound,
    lifecycle: { work_started_at: workStarted?.ts, work_done_at: workDone?.ts },
    dry_submit: dry,
  });
}

const distinctClaimedWorkIds = new Set(claim.claimed_work_ids || []);
const dryPass = claim.claimed_count === 7
  && distinctClaimedWorkIds.size === 7
  && evidenceActors.length === 7
  && new Set(evidenceActors.map((entry) => entry.work_id)).size === 7
  && actors.length === 7
  && actors.every((entry) => entry.task_bound_to_claim === true
    && entry.lifecycle_nonce_bound === true
    && entry.dry_submit.exit_code === 0
    && entry.dry_submit.output?.ok === true);
const submits = dryPass
  ? actors.map((entry) => ({ work_id: entry.work_id, submit: runWorkUnitCli('submit', entry.work_id, entry.result_path) }))
  : [];
const firstReturn = { actors, dry_submit_all_pass: dryPass, submits };
writeFileSync(`${bundle}/case-221-first-return.json`, `${JSON.stringify(firstReturn, null, 2)}\n`);
writeFileSync(`${bundle}/case-221-submit.json`, `${JSON.stringify(submits, null, 2)}\n`);
console.log(JSON.stringify(firstReturn, null, 2));
JS
```

## Step 5: [MAIN/SHELL] Submit And Trace Verdict

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect "$B" > "$B/case-221-inspect.json"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readWorkUnitLedgerRows, recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { loadWorkUnitIndex } from './DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';

const bundle = process.argv[2];
const claim = JSON.parse(readFileSync(`${bundle}/case-221-claim.json`, 'utf8'));
const submit = JSON.parse(readFileSync(`${bundle}/case-221-submit.json`, 'utf8'));
const inspect = JSON.parse(readFileSync(`${bundle}/case-221-inspect.json`, 'utf8'));
const evidence = JSON.parse(readFileSync(`${bundle}/case-221-subagent-evidence.json`, 'utf8'));
const firstReturn = JSON.parse(readFileSync(`${bundle}/case-221-first-return.json`, 'utf8'));
const index = loadWorkUnitIndex(bundle);
const claimedWorkIds = claim.claimed_work_ids || [];
const distinctClaimedWorkIds = new Set(claimedWorkIds);
const submittedWorkIds = new Set(submit.map((entry) => entry.work_id));
const ledgerWorkIds = new Set(readWorkUnitLedgerRows(bundle).map((row) => row.work_id));
const evidenceByWorkId = new Map((evidence.actors || []).map((entry) => [entry.work_id, entry]));
const actorFacts = firstReturn.actors.map((actor) => {
  const actorEvidence = evidenceByWorkId.get(actor.work_id);
  const record = index.work_units[actor.work_id];
  const taskText = actorEvidence?.task && existsSync(actorEvidence.task) ? readFileSync(actorEvidence.task, 'utf8') : '';
  const result = actorEvidence?.result && existsSync(actorEvidence.result) ? JSON.parse(readFileSync(actorEvidence.result, 'utf8')) : null;
  const receipts = actorEvidence?.receipt && existsSync(actorEvidence.receipt)
    ? readFileSync(actorEvidence.receipt, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)
    : [];
  const lifecycle = receipts.filter((row) => row.work_id === actor.work_id && row.receipt_nonce === record?.receipt_nonce);
  const workStarted = lifecycle.find((row) => row.event === 'work_started');
  const workDone = lifecycle.find((row) => row.event === 'work_done');
  const completionContractFirst = taskText.indexOf('## Completion Contract') === taskText.indexOf('##');
  const taskBoundToClaim = record && actorEvidence?.task
    && resolve(bundle, record.paths.task_ref) === resolve(actorEvidence.task);
  const outputBound = actorEvidence?.output && existsSync(actorEvidence.output)
    && (result?.output_files || []).some((row) => resolve(bundle, row.path) === resolve(actorEvidence.output));
  return {
    work_id: actor.work_id,
    receipt_nonce: record?.receipt_nonce,
    completion_contract_first: completionContractFirst,
    task_bound_to_claim: taskBoundToClaim === true,
    result_bound_to_claim: result?.work_id === actor.work_id,
    output_bound_to_result: outputBound === true,
    nonce_bound_lifecycle: Boolean(workStarted && workDone
      && Number.isFinite(Date.parse(workStarted.ts))
      && Number.isFinite(Date.parse(workDone.ts))),
    work_started_at: workStarted?.ts,
    work_done_at: workDone?.ts,
  };
});
const allActorEvidenceBound = actorFacts.length === 7 && actorFacts.every((actor) => actor.completion_contract_first
  && actor.task_bound_to_claim
  && actor.result_bound_to_claim
  && actor.output_bound_to_result
  && actor.nonce_bound_lifecycle);
const latestStart = Math.max(...actorFacts.map((actor) => Date.parse(actor.work_started_at)));
const earliestDone = Math.min(...actorFacts.map((actor) => Date.parse(actor.work_done_at)));
const lifecycleOverlap = Number.isFinite(latestStart) && Number.isFinite(earliestDone) && latestStart < earliestDone;
const passed = firstReturn.dry_submit_all_pass === true
  && claim.claimed_count === 7
  && distinctClaimedWorkIds.size === 7
  && evidenceByWorkId.size === 7
  && firstReturn.actors.length === 7
  && firstReturn.actors.every((entry) => entry.dry_submit.output?.ok === true)
  && submit.length === 7
  && submit.every((entry) => entry.submit.output?.ok === true)
  && claimedWorkIds.every((workId) => submittedWorkIds.has(workId) && ledgerWorkIds.has(workId))
  && allActorEvidenceBound
  && lifecycleOverlap;
recordPlaybookCheck(bundle, {
  gate: 'real-wave1-batch-submit',
  passed,
  detail: JSON.stringify({
    claimed_work_ids: claimedWorkIds,
    submitted_work_ids: [...submittedWorkIds],
    ledger_work_ids: [...ledgerWorkIds],
    actor_lifecycle: actorFacts,
    lifecycle_overlap: {
      start_at: Number.isFinite(latestStart) ? new Date(latestStart).toISOString() : null,
      end_at: Number.isFinite(earliestDone) ? new Date(earliestDone).toISOString() : null,
      non_empty: lifecycleOverlap,
    },
  }),
});
recordPlaybookCheck(bundle, { gate: 'work-unit-inspect', passed: inspect.passed === true, detail: JSON.stringify(inspect.inspect || []) });
console.log('Recorded native checks; Supervisor finalizer is authoritative.');
JS
```

These checks prove only the seven-work-unit submit and inspection checkpoint. They do not establish semantic Wave1 projections or Gate readiness.

## Step 6: [MAIN/SHELL] Native completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-221-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "one or more required native dpt-evidence-extractor actors or real search/fetch capability unavailable")
else
  TASK=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.actors[0].task)' "$B/case-221-subagent-evidence.json")
  RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.actors[0].result)' "$B/case-221-subagent-evidence.json")
  RECEIPT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.actors[0].receipt)' "$B/case-221-subagent-evidence.json")
  OUTPUT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.actors[0].output)' "$B/case-221-subagent-evidence.json")
  EXTRA_ARGS+=(--evidence "subject_task=$TASK" --evidence "subject_result=$RESULT" --evidence "subject_receipt=$RECEIPT" --evidence "subject_output=$OUTPUT")
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject-evidence export, audit, preservation, and optional clean-PASS cleanup.

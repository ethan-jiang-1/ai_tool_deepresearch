---
schema: command-experiment/v2
experiment: wfn-wave1
case: case-224-light-happy-and-fail
case_goal: "Verify Wave1 depth contracts through work-unit claim/submit: out-of-order submit, depth-review pass, shallow/cache-thin failures, invalid-submit rejection, and non-work-unit artifact gate rejection."
verdict_mode: all
required_checks: [wave1-gate-pass, wave1-invalid-submit-rejects, wave1-ledger-rows, wave1-multi-claim, wave1-orphan-output-rejects, wave1-out-of-order-submit]
bundle_roles: [happy-verdict, orphan-output, shallow-depth-review, cache-thin]
verdict_role: happy-verdict
health_roles: [happy-verdict]
health_profile: heavy
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: RWE-001, RWE-002, WAI-006
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

Fixture-backed Engine case, no Agent actor, no external calls. Fixture content may be written only after `operate-work-unit claim`; delegated success authority must come from `operate-work-unit submit`, the submitted ledger rows, Wave1 gate JSON, and trace `check` events.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundles from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real `operate-queue enqueue`, `operate-work-unit claim/submit`, and Wave1 gate CLI |
| Fixture input | Controlled Wave1 references, evidence summaries, question lists, seed backfill, receipt, and cache files after claim |
| Agent actor | None; fixture-backed Engine evidence only |
| External calls | None |
| Verdict source | Trace JSONL checks, submit JSON, gate JSON, work-unit ledger/index state |
| Does not prove | Agent search, evidence judgment, or deepening quality |

# case-224-light-happy-and-fail

## Expected Runtime Path

1. Create a Wave1-ready disposable bundle with two topics and witnessed Wave0-to-Wave1 handoff.
2. Enqueue two Wave1 topic-deepening demands.
3. Claim both through one `operate-work-unit claim --count 2`.
4. Submit fixture outputs in reverse claim order, proving out-of-order submit binds by `work_id`.
5. Run Wave1 gate and confirm pass from submitted ledger coverage plus seed backfill.
6. Claim a fresh work unit and prove missing receipt rejects without ledger append.
7. In a separate bundle, write Wave1-looking artifacts without submit and confirm Wave1 gate rejects them.
8. Run separate shallow-depth-review and cache-thin negative bundles.
9. Aggregate stable facts into the happy verdict trace and publish native completion once.

## Step 1: [MAIN/SHELL] Create Runtime Context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w1_happy_and_fail --case case-224 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role happy-verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { writeWave1Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

writeWave1Scaffold(process.argv[2], {
  planBasename: 'w1_happy_and_fail',
  topics: [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' }
  ]
});
JS
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$B"
echo "BUNDLE=$B"
```

Expected: validate passes and `rb_trace.jsonl` contains a witnessed handoff into `phases/phase-wave1.md`.

## Step 2: [MAIN/SHELL] Enqueue And Claim Two Work Units

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role happy-verdict)
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
    title: `Wave1 deepening for ${topic.title}`
  }), { fileName: `case224-${topic.slug}.json` });
}
JS

CLAIM_JSON=$(node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim "$B" --phase wave1 --count 2 --actor-outcome available --actor-source native_probe --actor-role-key dpt-evidence-extractor --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_JSON" > "$B/case-224-claim.json"
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(`claimed_count=${j.claimed_count}`);
console.log(`claimed_work_ids=${j.claimed_work_ids.join(",")}`);
process.exit(j.claimed_count === 2 ? 0 : 1);
'
```

Expected: `claimed_count=2` and the work IDs are Wave1 `wave1_topic_deepening` attempts.

## Step 3: [MAIN/SHELL] Submit In Reverse Order And Backfill

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role happy-verdict)
node --input-type=module - "$B" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import {
  referenceContent,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit,
  writeWave1TopicArtifacts
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const claim = JSON.parse(readFileSync(`${bundle}/case-224-claim.json`, 'utf8'));
const topicsByClaim = [
  { id: 't1', slug: 'topic-a', title: 'Topic A', facts: [
    'Topic A evidence tracks audit escalation and model-release review thresholds.',
    'Red-team findings are routed by severity before release approval.',
    'Mitigation status is stored separately from policy exception handling.',
    'Residual uncertainty concerns transfer across product domains.',
    'Wave2 should compare safety controls against governance friction.'
  ] },
  { id: 't2', slug: 'topic-b', title: 'Topic B', facts: [
    'Topic B evidence tracks procurement obligations and reporting cadence.',
    'Regional compliance variation changes which evidence trails matter.',
    'Vendor records can fragment the review path for governance claims.',
    'Residual uncertainty concerns whether reporting creates useful signals.',
    'Wave2 should compare governance friction against safety escalation.'
  ] }
];
const submissions = [];
for (const workId of [...claim.claimed_work_ids].reverse()) {
  const index = claim.claimed_work_ids.indexOf(workId);
  const topic = topicsByClaim[index];
  const sourceUrl = `https://research-source.test/${topic.slug}/deepening/article`;
  writeWave1TopicArtifacts(bundle, { id: topic.id, topic_slug: topic.slug, title: topic.title, source_url: sourceUrl });
  const fixture = writeFixtureResultForWorkUnit(bundle, {
    work_id: workId,
    output_path: `reference/01-${topic.slug}-deepening.md`,
    source_url: sourceUrl,
    source_slug: `${topic.slug}-deepening`,
    output_content: referenceContent({
      source_url: sourceUrl,
      topic_slug: topic.slug,
      title: `${topic.title} Deepening Reference`,
      key_facts: topic.facts,
      core_content: `Controlled ${topic.title} Wave1 content uses distinct terms and facts so content-dedup checks prove the fixture is not a template clone.`
    }),
    extra_output_files: [
      { path: `artifacts/wave1/${topic.slug}/evidence-summary.md`, role: 'evidence_summary' },
      { path: `artifacts/wave1/${topic.slug}/question-list.md`, role: 'question_list' }
    ],
    cache_trails: [`_cache/wave1/primary/${topic.slug}/${topic.slug}-deepening`]
  });
  const submit = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
  submissions.push({ work_id: workId, topic_slug: topic.slug, submit });
}
writeFileSync(`${bundle}/case-224-submit.json`, `${JSON.stringify(submissions, null, 2)}\n`);
console.log(JSON.stringify(submissions, null, 2));
process.exit(submissions.every((entry) => entry.submit.ok === true) ? 0 : 1);
JS
```

Expected: both submits succeed, and the first submitted work ID is the second claimed ID.

## Step 4: [MAIN/SHELL] Gate Pass From Submitted Coverage

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role happy-verdict)
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave1_completion', source: 'case-224-visible-path' });
JS
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-224-gate-happy.json"
node - "$B" <<'JS'
const fs = require('fs');
const gate = JSON.parse(fs.readFileSync(`${process.argv[2]}/case-224-gate-happy.json`, 'utf8'));
console.log(JSON.stringify({ passed: gate.check?.passed, inspect: gate.inspect || [] }, null, 2));
process.exit(gate.check?.passed === true ? 0 : 1);
JS
```

Expected: Wave1 gate passes from submitted work-unit rows covering both topics.

## Step 5: [MAIN/SHELL] Invalid Submit And Three Negative Bundles

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role happy-verdict)
node --input-type=module - "$B" <<'JS'
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  readWorkUnitLedgerRows,
  referenceContent,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave1',
  queue_item_id: 'case224-invalid-submit',
  topic_slug: 'topic-a',
  title: 'Wave1 invalid submit proof'
}), { fileName: 'case224-invalid-submit.json' });
const claim = JSON.parse(spawnSync(process.execPath, ['DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave1'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/case224-invalid-submit.md',
  source_url: 'https://research-source.test/topic-a/invalid',
  source_slug: 'invalid-submit',
  output_content: referenceContent({ source_url: 'https://research-source.test/topic-a/invalid', topic_slug: 'topic-a', title: 'Invalid Submit Probe' }),
  cache_trails: ['_cache/wave1/primary/topic-a/invalid-submit']
});
rmSync(path.join(bundle, fixture.record.paths.runtime_receipt_ref), { force: true });
const submit = spawnSync(process.execPath, ['DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs', 'submit', bundle, '--work-id', workId, '--result', fixture.resultPath], { encoding: 'utf8' });
const rejectedRows = readWorkUnitLedgerRows(bundle).filter((row) => row.work_id === workId);
const outcome = { status: submit.status, submit: submit.stdout.trim() ? JSON.parse(submit.stdout) : null, rejectedRows: rejectedRows.length };
writeFileSync(`${bundle}/case-224-invalid-submit.json`, `${JSON.stringify(outcome, null, 2)}\n`);
console.log(JSON.stringify(outcome, null, 2));
process.exit(outcome.status === 1 && outcome.submit?.last_submit_rejection?.reason_code === 'missing_receipt' && outcome.rejectedRows === 0 ? 0 : 1);
JS

BO=$(node experiments_env/shared/new-disposable-bundle.mjs w1_orphan_output --case case-224 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role orphan-output --path "$BO"
node --input-type=module - "$BO" <<'JS'
import { appendTrace, writeWave1Scaffold, writeWave1TopicArtifacts } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
writeWave1Scaffold(bundle, {
  planBasename: 'w1_orphan_output',
  topics: [{ id: 'to', slug: 'topic-orphan', title: 'Topic Orphan' }]
});
writeWave1TopicArtifacts(bundle, {
  id: 'to',
  topic_slug: 'topic-orphan',
  title: 'Topic Orphan',
  source_url: 'https://research-source.test/topic-orphan/direct'
});
appendTrace(bundle, { event: 'wave1_completion', source: 'case-224-orphan' });
JS
set +e
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs --bundle "$BO" --current-node phases/phase-wave1.md > "$BO/case-224-gate-orphan.json"
ORPHAN_STATUS=$?
set -e
node - "$BO" "$ORPHAN_STATUS" <<'JS'
const fs = require('fs');
const [bundle, status] = process.argv.slice(2);
const gate = JSON.parse(fs.readFileSync(`${bundle}/case-224-gate-orphan.json`, 'utf8'));
console.log(JSON.stringify({ status: Number(status), passed: gate.check?.passed, inspect: gate.inspect || [] }, null, 2));
process.exit(Number(status) === 1 && gate.check?.passed === false && JSON.stringify(gate.inspect || []).includes('submitted work-unit coverage') ? 0 : 1);
JS

BS=$(node experiments_env/shared/new-disposable-bundle.mjs w1_shallow_depth_review --case case-224 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role shallow-depth-review --path "$BS"
node --input-type=module - "$BS" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import {
  claimWorkUnitsViaCli,
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit,
  writeWave1Scaffold,
  writeWave1TopicArtifacts
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave1Scaffold(bundle, { planBasename: 'w1_shallow_depth_review', topics: [{ id: 'ts', slug: 'topic-shallow', title: 'Topic Shallow' }] });
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ phase: 'wave1', queue_item_id: 'wave1-deepen-topic-shallow', topic_slug: 'topic-shallow', title: 'Shallow Wave1 fixture' }), { fileName: 'case224-shallow.json' });
const claim = claimWorkUnitsViaCli(bundle, { phase: 'wave1' });
const workId = claim.claimed_work_ids[0];
writeWave1TopicArtifacts(bundle, { id: 'ts', topic_slug: 'topic-shallow', title: 'Topic Shallow', source_url: 'https://research-source.test/topic-shallow/reused-wave0' });
const fixture = writeFixtureResultForWorkUnit(bundle, { work_id: workId, output_path: 'reference/01-topic-shallow.md', source_url: 'https://research-source.test/topic-shallow/reused-wave0', source_slug: 'topic-shallow', extra_output_files: [{ path: 'artifacts/wave1/topic-shallow/evidence-summary.md', role: 'evidence_summary' }, { path: 'artifacts/wave1/topic-shallow/question-list.md', role: 'question_list' }], cache_trails: ['_cache/wave1/primary/topic-shallow/reused-wave0'] });
const submit = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
const reviewPath = `${bundle}/artifacts/wave1/topic-shallow/depth-review.yaml`;
const review = JSON.parse(readFileSync(reviewPath, 'utf8'));
review.wave0_source_urls = ['https://research-source.test/topic-shallow/reused-wave0'];
review.source_claims[0].is_new_vs_wave0 = false;
review.new_source_urls = [];
review.new_source_floor.observed = 0;
review.decision = 'supplement_required';
review.supplementary_queue_item_ids = ['wave1-deepen-topic-shallow-v2'];
writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
writeFileSync(`${bundle}/case-224-shallow-submit.json`, `${JSON.stringify(submit, null, 2)}\n`);
JS
node --input-type=module - "$BS" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave1_completion', source: 'case-224-shallow' });
JS
set +e
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs --bundle "$BS" --current-node phases/phase-wave1.md > "$BS/case-224-gate-shallow.json"
SHALLOW_STATUS=$?
set -e

BC=$(node experiments_env/shared/new-disposable-bundle.mjs w1_cache_thin --case case-224 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role cache-thin --path "$BC"
node --input-type=module - "$BC" <<'JS'
import { writeFileSync } from 'node:fs';
import {
  claimWorkUnitsViaCli,
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit,
  writeWave1Scaffold,
  writeWave1TopicArtifacts
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave1Scaffold(bundle, { planBasename: 'w1_cache_thin', topics: [{ id: 'tc', slug: 'topic-cache', title: 'Topic Cache' }] });
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ phase: 'wave1', queue_item_id: 'wave1-deepen-topic-cache', topic_slug: 'topic-cache', title: 'Cache-thin Wave1 fixture' }), { fileName: 'case224-cache-thin.json' });
const claim = claimWorkUnitsViaCli(bundle, { phase: 'wave1' });
const workId = claim.claimed_work_ids[0];
writeWave1TopicArtifacts(bundle, { id: 'tc', topic_slug: 'topic-cache', title: 'Topic Cache', source_url: 'https://research-source.test/topic-cache/article' });
const fixture = writeFixtureResultForWorkUnit(bundle, { work_id: workId, output_path: 'reference/01-topic-cache.md', source_url: 'https://research-source.test/topic-cache/article', source_slug: 'topic-cache', extra_output_files: [{ path: 'artifacts/wave1/topic-cache/evidence-summary.md', role: 'evidence_summary' }, { path: 'artifacts/wave1/topic-cache/question-list.md', role: 'question_list' }], cache_trails: ['_cache/wave1/primary/topic-cache/article'] });
const submit = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
writeFileSync(`${bundle}/${fixture.cache_trails[0]}/page.md`, '# Page\n');
writeFileSync(`${bundle}/case-224-cache-submit.json`, `${JSON.stringify(submit, null, 2)}\n`);
JS
node --input-type=module - "$BC" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave1_completion', source: 'case-224-cache-thin' });
JS
set +e
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs --bundle "$BC" --current-node phases/phase-wave1.md > "$BC/case-224-gate-cache-thin.json"
CACHE_STATUS=$?
set -e
printf '%s\n' "$SHALLOW_STATUS" > "$BS/case-224-gate-status.txt"
printf '%s\n' "$CACHE_STATUS" > "$BC/case-224-gate-status.txt"
```

Expected: invalid submit is non-terminal and appends no ledger row; orphan, shallow-depth-review, and cache-thin bundles each fail for their intended boundary.

## Step 6: [MAIN/SHELL] Record Trace Checks

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role happy-verdict)
BO=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role orphan-output)
BS=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role shallow-depth-review)
BC=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role cache-thin)
node --input-type=module - "$B" "$BO" "$BS" "$BC" <<'JS'
import { readFileSync } from 'node:fs';
import { readWorkUnitLedgerRows, recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, orphanBundle, shallowBundle, cacheBundle] = process.argv.slice(2);
const claim = JSON.parse(readFileSync(`${bundle}/case-224-claim.json`, 'utf8'));
const submits = JSON.parse(readFileSync(`${bundle}/case-224-submit.json`, 'utf8'));
const gate = JSON.parse(readFileSync(`${bundle}/case-224-gate-happy.json`, 'utf8'));
const invalid = JSON.parse(readFileSync(`${bundle}/case-224-invalid-submit.json`, 'utf8'));
const orphanGate = JSON.parse(readFileSync(`${orphanBundle}/case-224-gate-orphan.json`, 'utf8'));
const shallowGate = JSON.parse(readFileSync(`${shallowBundle}/case-224-gate-shallow.json`, 'utf8'));
const cacheGate = JSON.parse(readFileSync(`${cacheBundle}/case-224-gate-cache-thin.json`, 'utf8'));
const shallowStatus = Number(readFileSync(`${shallowBundle}/case-224-gate-status.txt`, 'utf8'));
const cacheStatus = Number(readFileSync(`${cacheBundle}/case-224-gate-status.txt`, 'utf8'));
const ledgerRows = readWorkUnitLedgerRows(bundle);

recordPlaybookCheck(bundle, { gate: 'wave1-multi-claim', passed: claim.claimed_count === 2, detail: JSON.stringify(claim.claimed_work_ids) });
recordPlaybookCheck(bundle, { gate: 'wave1-out-of-order-submit', passed: submits.every((entry) => entry.submit.ok === true) && submits[0].work_id === claim.claimed_work_ids[1], detail: JSON.stringify(submits.map((entry) => entry.work_id)) });
recordPlaybookCheck(bundle, { gate: 'wave1-ledger-rows', passed: ledgerRows.length === 2, detail: `${ledgerRows.length} row(s)` });
recordPlaybookCheck(bundle, { gate: 'wave1-gate-pass', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave1-invalid-submit-rejects', passed: invalid.status === 1 && invalid.submit?.last_submit_rejection?.reason_code === 'missing_receipt' && invalid.rejectedRows === 0, detail: JSON.stringify(invalid.submit?.last_submit_rejection || {}) });
recordPlaybookCheck(bundle, { gate: 'wave1-orphan-output-rejects', passed: orphanGate.check?.passed === false && JSON.stringify(orphanGate.inspect || []).includes('submitted work-unit coverage'), detail: JSON.stringify(orphanGate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave1-shallow-depth-review-rejects', passed: shallowStatus === 1 && shallowGate.check?.passed === false && /source_novelty_floor|supplement_required/i.test(JSON.stringify(shallowGate.inspect || [])), detail: JSON.stringify(shallowGate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave1-cache-thin-rejects', passed: cacheStatus === 1 && cacheGate.check?.passed === false && /source_claim_cache_mapping|placeholder-only|cache_coverage/i.test(JSON.stringify(cacheGate.inspect || [])), detail: JSON.stringify(cacheGate.inspect || []) });
console.log('Recorded native facts; finalizer owns completion.');
JS
```

## Step 7: [MAIN/SHELL] Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role happy-verdict)
BO=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role orphan-output)
BS=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role shallow-depth-review)
BC=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role cache-thin)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} \
  --bundle "happy-verdict=$B" --bundle "orphan-output=$BO" \
  --bundle "shallow-depth-review=$BS" --bundle "cache-thin=$BC"
```

Stop after native completion. Only `happy-verdict` is a Heavy health target; the three negative bundles remain declared non-health auxiliaries. The Autorun Supervisor owns health, audit, preservation, and optional clean-PASS cleanup.

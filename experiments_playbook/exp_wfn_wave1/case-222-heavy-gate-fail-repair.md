---
schema: command-experiment/v1
experiment: wfn-wave1
case: case-222-heavy-gate-fail-repair
weight: heavy
case_goal: "Verify Wave1 gate failure creates repair/refill work-unit demand: first gate fails for missing topic coverage, repair opens b001, submit repairs the topic, and the next gate passes."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-222_w1_gate_refill_repair
trace: dpt_disp_case-222_w1_gate_refill_repair/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001, RWE-003, RWE-006, WAI-006
---

## Execution Contract

Fixture-backed Engine repair case. The repair content is controlled fixture data, so this case proves the deterministic repair/refill and gate path, not Agent search quality. The production boundary must still be real: queue demand is claimed as a work unit, repair opens a new batch with `batch_reason`, submit appends ledger coverage, and Wave1 gate verdict comes from gate JSON/trace.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable Wave1 bundle |
| Framework path | Real `operate-work-unit open-batch`, claim, submit, ledger, and Wave1 gate CLI |
| Fixture input | Controlled Topic A/Topic B Wave1 artifacts after claim |
| Agent actor | None in the automation smoke; a heavier manual run may replace fixture repair with real actor repair |
| External calls | None in fixture smoke |
| Verdict source | Gate JSON, work-unit index/ledger, trace `check` events |
| Does not prove | Real Agent repair judgment |

# case-222-heavy-gate-fail-repair

## Expected Runtime Path

1. Create a Wave1 bundle with `topic-a` and `topic-b`.
2. Claim/submit only `topic-a`.
3. Run Wave1 gate; it must fail because `topic-b` lacks submitted coverage.
4. Open a Wave1 repair/refill batch with `batch_reason`.
5. Enqueue/claim/submit `topic-b` repair in batch `b001`.
6. Append `wave1_completion` and rerun Wave1 gate; it must pass.
7. Record trace checks and preserve the bundle on failure.

## Step 1: [MAIN/SHELL] Create Bundle And Submit Partial Coverage

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w1_gate_refill_repair --case case-222 --force)
node --input-type=module - "$B" <<'JS'
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  writeWave1Scaffold,
  writeWave1TopicArtifacts,
  writeFixtureResultForWorkUnit,
  submitWorkUnitViaCli,
  referenceContent
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave1Scaffold(bundle, {
  planBasename: 'w1_gate_refill_repair',
  topics: [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' }
  ]
});
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave1',
  queue_item_id: 'wave1-deepen-topic-a',
  topic_slug: 'topic-a',
  title: 'Wave1 deepening for Topic A'
}), { fileName: 'case222-topic-a.json' });
const claim = JSON.parse((await import('node:child_process')).spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave1'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
writeWave1TopicArtifacts(bundle, { id: 't1', topic_slug: 'topic-a', title: 'Topic A', source_url: 'https://research-source.test/topic-a/repair/a' });
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/01-topic-a-deepening.md',
  source_url: 'https://research-source.test/topic-a/repair/a',
  source_slug: 'topic-a-repair',
  output_content: referenceContent({ source_url: 'https://research-source.test/topic-a/repair/a', topic_slug: 'topic-a', title: 'Topic A Repair Reference' }),
  extra_output_files: [
    { path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary' },
    { path: 'artifacts/wave1/topic-a/question-list.md', role: 'question_list' }
  ],
  cache_trails: ['_cache/wave1/primary/topic-a/topic-a-repair']
});
const submit = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
console.log(JSON.stringify({ claim, submit }, null, 2));
process.exit(submit.ok === true ? 0 : 1);
JS
echo "BUNDLE=$B"
```

## Step 2: [MAIN/SHELL] First Gate Must Fail

```bash
set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-222-gate-before-repair.json"
GATE_STATUS=$?
set -e
node - "$B" "$GATE_STATUS" <<'JS'
const fs = require('fs');
const [bundle, status] = process.argv.slice(2);
const gate = JSON.parse(fs.readFileSync(`${bundle}/case-222-gate-before-repair.json`, 'utf8'));
console.log(JSON.stringify({ status: Number(status), passed: gate.check?.passed, inspect: gate.inspect || [] }, null, 2));
process.exit(Number(status) === 1 && gate.check?.passed === false && JSON.stringify(gate.inspect || []).includes('topic-b') ? 0 : 1);
JS
```

Expected: gate fails with missing `topic-b` coverage.

## Step 3: [MAIN/SHELL] Open Repair Batch And Submit Repair

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch "$B" --phase wave1 --reason gate_failure_refill > "$B/case-222-open-batch.json"
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  writeWave1TopicArtifacts,
  writeFixtureResultForWorkUnit,
  submitWorkUnitViaCli,
  referenceContent
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave1',
  queue_item_id: 'wave1-deepen-topic-b',
  topic_slug: 'topic-b',
  title: 'Repair Wave1 deepening for Topic B'
}), { fileName: 'case222-topic-b-repair.json' });
const claim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave1'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
writeWave1TopicArtifacts(bundle, { id: 't2', topic_slug: 'topic-b', title: 'Topic B', source_url: 'https://research-source.test/topic-b/repair/b' });
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/01-topic-b-deepening.md',
  source_url: 'https://research-source.test/topic-b/repair/b',
  source_slug: 'topic-b-repair',
  output_content: referenceContent({ source_url: 'https://research-source.test/topic-b/repair/b', topic_slug: 'topic-b', title: 'Topic B Repair Reference', key_facts: [
    'Topic B repair evidence is distinct from Topic A and covers governance operations.',
    'The repair source discusses reporting cadence and vendor evidence trails.',
    'Regional compliance variation appears as an implementation difficulty.',
    'Repair backfill replaces all stale Wave1 placeholders.',
    'Wave2 can compare Topic B governance friction with Topic A safety escalation.'
  ] }),
  extra_output_files: [
    { path: 'artifacts/wave1/topic-b/evidence-summary.md', role: 'evidence_summary' },
    { path: 'artifacts/wave1/topic-b/question-list.md', role: 'question_list' }
  ],
  cache_trails: ['_cache/wave1/primary/topic-b/topic-b-repair']
});
const submit = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
const record = loadWorkUnitIndex(bundle).work_units[workId];
const opened = JSON.parse(readFileSync(`${bundle}/case-222-open-batch.json`, 'utf8'));
console.log(JSON.stringify({ opened, claim, submit, record }, null, 2));
process.exit(opened.batch_id === 'b001' && record.batch_id === 'b001' && submit.ok === true ? 0 : 1);
JS
```

## Step 4: [MAIN/SHELL] Rerun Gate And Record Verdict

```bash
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave1_completion', source: 'case-222-repair' });
JS
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-222-gate-after-repair.json"
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordPlaybookCheck, readTrace, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';

const bundle = process.argv[2];
const before = JSON.parse(readFileSync(`${bundle}/case-222-gate-before-repair.json`, 'utf8'));
const after = JSON.parse(readFileSync(`${bundle}/case-222-gate-after-repair.json`, 'utf8'));
const opened = JSON.parse(readFileSync(`${bundle}/case-222-open-batch.json`, 'utf8'));
const index = loadWorkUnitIndex(bundle);
const repairRows = Object.values(index.work_units).filter((row) => row.batch_id === 'b001');
const gateAttempts = readTrace(bundle).filter((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete');
recordPlaybookCheck(bundle, { gate: 'wave1-initial-gate-fails', passed: before.check?.passed === false && JSON.stringify(before.inspect || []).includes('topic-b'), detail: JSON.stringify(before.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave1-repair-batch', passed: opened.batch_id === 'b001' && repairRows.length >= 1, detail: JSON.stringify({ opened, repairRows: repairRows.map((row) => row.work_id) }) });
recordPlaybookCheck(bundle, { gate: 'wave1-repaired-gate-passes', passed: after.check?.passed === true, detail: JSON.stringify(after.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave1-gate-fail-then-pass', passed: gateAttempts.some((event) => event.passed === false) && gateAttempts.some((event) => event.passed === true), detail: `${gateAttempts.length} gate_attempt event(s)` });
const verdict = writeTraceVerdict(bundle, 'case-222');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-222 --target-dir tests/.test-bundles --cleanup-pass
```

The optional runner mirrors the visible checkpoint sequence.

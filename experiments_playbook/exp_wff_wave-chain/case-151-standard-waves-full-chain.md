---
schema: command-experiment/v1
experiment: wff-wave-chain
case: case-151-standard-waves-full-chain
weight: light
case_goal: "Prove seed-topics -> Wave0 -> Wave1 depth review -> Wave2 scan/eligibility gates pass sequentially only after delegated phases are drained through work-unit claim/submit."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-151_waves_full_chain_*
trace: dpt_disp_case-151_waves_full_chain_*/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001, RWE-004, RWE-005, AGQ-014
---

## Execution Contract

Fixture-backed Engine case. Markdown is the controller: the Agent reads each CLI JSON checkpoint before taking the next action. Delegated Wave0 and Wave1 outputs must pass only through `operate-work-unit claim` and `operate-work-unit submit`; gates may be run as pass attempts only after a drain probe reports `phase_drained: true`. Wave2 uses pure synthesis/backfill main-Agent queue work and therefore needs no Wave2 work-unit ledger row.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real setup/seed/Wave0/Wave1/Wave2 gate CLIs, real lifecycle `enter-phase`/`advance-status`, real `operate-work-unit` claim/submit, and real non-delegated queue completion for Wave2 synthesis/backfill |
| Fixture input | Controlled source/deepening/synthesis files written at the point an Agent or sub-agent would produce them |
| Agent actor | Fixture-backed; proves Engine and playbook boundary, not research quality |
| External calls | None |
| Verdict source | Gate JSON, work-unit ledger/index state, drain JSON, and trace `check` events |
| Does not prove | Real WebSearch/WebFetch, semantic evidence quality, or synthesis quality |

# case-151-standard-waves-full-chain

## Expected Runtime Path

1. Create a bundle and run `setup-ready`.
2. Enter seed-topics through the lifecycle CLI, materialize seed topic Markdown, then run `seed-topics-ready`.
3. Enter Wave0, enqueue and submit one `wave0_source_intake` work unit, probe drain, then run Wave0 gate.
4. Enter Wave1, enqueue and submit one `wave1_topic_deepening` work unit, probe drain, then run Wave1 gate.
5. Enter Wave2, complete pure synthesis/backfill as non-delegated queue work, probe Wave2 drain, then run Wave2 gate.
6. Record trace checks and clean up only when the verdict is PASS.

## Step 1: [MAIN/SHELL] Create Runtime Context And Pass Setup Gate

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs waves_full_chain --case case-151 --force)
echo "BUNDLE=$B"

node --input-type=module - "$B" <<'JS'
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { writeMinimalPlan, writeMinimalStatus } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const planBasename = 'waves_full_chain';
writeMinimalStatus(bundle, { current_gate: 'setup_ready', next_gate: 'seed_topics_ready', state: 'in_progress' });
writeMinimalPlan(bundle, {
  planBasename,
  topics: [{ id: 't1', slug: 'topic-a', title: 'Topic A' }]
});
writeFileSync(path.join(bundle, 'rb_profile.yaml'), `plan_basename: ${planBasename}
research_profile: debug
root_must_answer_set: []
research_style_params:
  user_visible: false
  wave0_per_topic_source_floor: 1
  wave0_shared_ref_total: 1
  wave1_per_topic_ref_floor: 1
  topic_unique_ratio: 0
  counterexample_search: false
  cross_verification: false
  p0p1_independent_backing: 1
  quality_min_tier: tier_4
  quality_min_substance: none
  wave2_cross_topic_depth: 0
  wave2_emergent_search_rounds: 0
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/case-151-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1:
    status: recorded
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`);
mkdirSync(path.join(bundle, 'reference'), { recursive: true });
writeFileSync(path.join(bundle, 'reference/README.md'), '# Reference Evidence\n');
JS

node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle "$B" --current-node phases/phase-setup.md > "$B/case-151-gate-setup.json"
node - "$B/case-151-gate-setup.json" <<'JS'
const fs = require('fs');
const gate = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify({ passed: gate.check?.passed, next: gate.check?.next, inspect: gate.inspect || [] }, null, 2));
process.exit(gate.check?.passed === true && gate.check?.next === 'phases/phase-seed-topics.md' ? 0 : 1);
JS
```

## Step 2: [MAIN/SHELL] Enter Seed Phase, Materialize Seed Topic, And Pass Seed Gate

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-seed-topics.md > "$B/case-151-enter-seed.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to setup_ready > "$B/case-151-advance-setup.json"

cat > "$B/seed_topics/topic-a.md" <<'EOF'
---
id: t1
slug: topic-a
title: Topic A
---

# Topic A

## Key Dimensions
- Controlled foundation dimension.

## Known Premises
- Fixture-backed seed topic for workflow-chain boundary proof.

## Open Questions
- Which evidence should the next wave deepen?
EOF

node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle "$B" --current-node phases/phase-seed-topics.md > "$B/case-151-gate-seed.json"
node - "$B/case-151-gate-seed.json" <<'JS'
const fs = require('fs');
const gate = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify({ passed: gate.check?.passed, next: gate.check?.next, inspect: gate.inspect || [] }, null, 2));
process.exit(gate.check?.passed === true && gate.check?.next === 'phases/phase-wave0.md' ? 0 : 1);
JS
```

## Step 3: [MAIN/SHELL] Enter Wave0 And Submit Work Unit

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-wave0.md > "$B/case-151-enter-wave0.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to seed_topics_ready > "$B/case-151-advance-seed.json"

node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave0',
  queue_item_id: 'wave0-source-topic-a',
  topic_slug: 'topic-a',
  title: 'Wave0 source intake for Topic A'
}), { fileName: 'case151-wave0-topic-a.json' });
JS

CLAIM_W0=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-source-intake --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_W0" > "$B/case-151-wave0-claim.json"
WORK_W0=$(printf '%s\n' "$CLAIM_W0" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.claimed_work_ids[0]);')

RESULT_W0=$(node --input-type=module - "$B" "$WORK_W0" <<'JS'
import { referenceContent, sourceYamlExtra, writeFixtureResultForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const sourceUrl = 'https://research-source.test/topic-a/full-chain/wave0';
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/00-shared-topic-a.md',
  source_url: sourceUrl,
  source_slug: 'topic-a-wave0',
  output_content: referenceContent({ source_url: sourceUrl, topic_slug: 'topic-a', title: 'Topic A Wave0 Source' }),
  extra_output_files: [sourceYamlExtra('topic-a', sourceUrl, 'Topic A Wave0 Source')]
});
console.log(fixture.resultPath);
JS
)
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_W0" --result "$RESULT_W0" > "$B/case-151-wave0-submit.json"

cat > "$B/reference/_INDEX.md" <<'EOF'
| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 00-shared-topic-a.md | secondary | practitioner | Tier 2 | topic-a | wave0_foundation | accepted | 2026-07-06 |
| 01-topic-a-deepening.md | secondary | practitioner | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-06 |
EOF

node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave0_completion', source: 'case-151-after-drain' });
JS
```

## Step 4: [MAIN/SHELL] Verify Wave0 Drain, Then Run Wave0 Gate

```bash
set +e
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-source-intake --actor-reason probe_succeeded --execution-actor delegated_subagent > "$B/case-151-wave0-drain.json"
DRAIN_W0_STATUS=$?
set -e
node - "$B/case-151-wave0-drain.json" "$DRAIN_W0_STATUS" <<'JS'
const fs = require('fs');
const [file, status] = process.argv.slice(2);
const drain = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(JSON.stringify({ status: Number(status), phase_drained: drain.phase_drained, in_flight_count: drain.in_flight_count, unclaimed_delegated_count: drain.unclaimed_delegated_count }, null, 2));
process.exit(Number(status) === 1 && drain.phase_drained === true ? 0 : 1);
JS

node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-151-gate-wave0.json"
```

## Step 5: [MAIN/SHELL] Enter Wave1, Submit Work Unit, Drain, And Gate

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-wave1.md > "$B/case-151-enter-wave1.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to wave0_complete > "$B/case-151-advance-wave0.json"

node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave1',
  queue_item_id: 'wave1-deepen-topic-a',
  topic_slug: 'topic-a',
  title: 'Wave1 deepening for Topic A'
}), { fileName: 'case151-wave1-topic-a.json' });
JS

CLAIM_W1=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave1 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-evidence-extractor --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_W1" > "$B/case-151-wave1-claim.json"
WORK_W1=$(printf '%s\n' "$CLAIM_W1" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.claimed_work_ids[0]);')

RESULT_W1=$(node --input-type=module - "$B" "$WORK_W1" <<'JS'
import { referenceContent, writeFixtureResultForWorkUnit, writeWave1TopicArtifacts } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const sourceUrl = 'https://research-source.test/topic-a/full-chain/wave1';
writeWave1TopicArtifacts(bundle, { id: 't1', topic_slug: 'topic-a', title: 'Topic A', source_url: sourceUrl });
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/01-topic-a-deepening.md',
  source_url: sourceUrl,
  source_slug: 'topic-a-wave1',
  output_content: referenceContent({ source_url: sourceUrl, topic_slug: 'topic-a', title: 'Topic A Wave1 Deepening' }),
  extra_output_files: [
    { path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary' },
    { path: 'artifacts/wave1/topic-a/question-list.md', role: 'question_list' }
  ],
  cache_trails: ['_cache/wave1/primary/topic-a/topic-a-wave1']
});
console.log(fixture.resultPath);
JS
)
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_W1" --result "$RESULT_W1" > "$B/case-151-wave1-submit.json"
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave1_completion', source: 'case-151-after-drain' });
JS

set +e
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave1 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-evidence-extractor --actor-reason probe_succeeded --execution-actor delegated_subagent > "$B/case-151-wave1-drain.json"
DRAIN_W1_STATUS=$?
set -e
node - "$B/case-151-wave1-drain.json" "$DRAIN_W1_STATUS" <<'JS'
const fs = require('fs');
const [file, status] = process.argv.slice(2);
const drain = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(JSON.stringify({ status: Number(status), phase_drained: drain.phase_drained, in_flight_count: drain.in_flight_count, unclaimed_delegated_count: drain.unclaimed_delegated_count }, null, 2));
process.exit(Number(status) === 1 && drain.phase_drained === true ? 0 : 1);
JS

node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-151-gate-wave1.json"
```

## Step 6: [MAIN/SHELL] Enter Wave2, Complete Pure Synthesis, Drain, And Gate

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-wave2.md > "$B/case-151-enter-wave2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to wave1_complete > "$B/case-151-advance-wave1.json"

node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const bundle = process.argv[2];
const node = process.execPath;
function run(args) {
  const result = spawnSync(node, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stdout || result.stderr);
  return result.stdout;
}
function task(queue_item_id, receipt, writes_to) {
  return {
    queue_item_id,
    title: queue_item_id,
    targets: { controller: 'main-agent' },
    producer_rule: queue_item_id === 'wave2-synthesis' ? 'cross_topic_synthesis' : 'seed_topic_backfill_wave2',
    priority_class: 'P4_progressive_artifact_or_seed_backfill',
    required_receipts: [receipt],
    done_condition: 'main Agent writes file and completes queue item',
    verification: { engine: [], agent: [] },
    writes_to,
    status_sync: [],
    completion_receipt: receipt,
    failure_route: 'queue repair work',
    payload: { phase: 'wave2' },
    lineage: {}
  };
}
mkdirSync(path.join(bundle, '_tmp'), { recursive: true });
const tasks = [
  task('wave2-synthesis', 'file:artifacts/wave2/synthesis.md', ['artifacts/wave2/synthesis.md', 'artifacts/wave2/cross-topic-ledger.md', 'artifacts/wave2/finding-index.yaml']),
  task('wave2-backfill-topic-a', 'file:seed_topics/topic-a.md', ['seed_topics/topic-a.md'])
];
for (const t of tasks) {
  const p = path.join(bundle, '_tmp', `${t.queue_item_id}.json`);
  writeFileSync(p, `${JSON.stringify(t, null, 2)}\n`);
  run(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'enqueue', bundle, '--task', p]);
}
run(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'claim', bundle, '--actor', 'main-agent']);
mkdirSync(path.join(bundle, 'artifacts/wave2'), { recursive: true });
writeFileSync(path.join(bundle, 'artifacts/wave2/synthesis.md'), '# Cross-Topic Synthesis\n\nW2F-001 uses [Topic A evidence](../wave1/topic-a/evidence-summary.md). No delegated Wave2 targeted evidence is needed.\n');
writeFileSync(path.join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), '# Cross-Topic Ledger\n\n## Cross-Topic Scan Matrix\n\n| pair_id | topics | checked_dimensions | finding_ids | notes |\n| --- | --- | --- | --- | --- |\n| P01 | topic-a | shared_pattern | W2F-001 | Pure synthesis |\n\n## Wave1 Legacy Questions\n\n- topic-a controlled question.\n\n## Cross-Topic Resolutions\n\n- Existing evidence is enough.\n\n## Emergent Cross-Topic Questions\n\n- None.\n\n## Exploration Decisions\n\n| W2F-001 | use_existing_evidence | no delegated row needed |\n\n## HITL2 Handoff\n\n- None.\n');
writeFileSync(path.join(bundle, 'artifacts/wave2/finding-index.yaml'), 'version: "0.1"\nsource_layer: wave2_cross_topic\nledger: artifacts/wave2/cross-topic-ledger.md\nsynthesis: artifacts/wave2/synthesis.md\nscan:\n  topics: [topic-a]\n  topic_count: 1\n  pair_count_expected: 0\n  pair_count_checked: 0\nfindings:\n  - id: W2F-001\n    type: cross_topic_resolution\n    priority: p2\n    status: resolved\n    decision: use_existing_evidence\n    affected_topics: [topic-a]\n    origin_refs: [artifacts/wave1/topic-a/question-list.md]\n    trigger_refs: [artifacts/wave1/topic-a/evidence-summary.md]\n    search_required: false\n    subagent_receipt_refs: []\n    appears_in_synthesis: true\n    hitl2_handoff: false\n    confidence: medium\n    independent_backing_refs: [artifacts/wave1/topic-a/evidence-summary.md]\n    gap_status: no_gap\nsynthesis_eligibility:\n  pure_synthesis_eligible: true\n  scan_matrix_present: true\n  scan_topic_pair_coverage: []\n  unresolved_search_required_count: 0\n  targeted_search_required_count: 0\n  targeted_search_submitted_count: 0\n  explicit_deferral_count: 0\n  profile_params_read: [p0p1_independent_backing]\n  ineligibility_reasons: []\n');
writeFileSync(path.join(bundle, 'seed_topics/topic-a.md'), '# Topic A\n\n## Wave2 Judgment\nExisting Wave1 evidence resolves W2F-001.\n\n## Pending Questions\n- [resolved] Controlled full-chain question.\n');
writeFileSync(path.join(bundle, 'case-151-wave2-synthesis-result.json'), JSON.stringify({ queue_item_id: 'wave2-synthesis', receipt: 'file:artifacts/wave2/synthesis.md', summary: 'pure synthesis complete' }, null, 2));
run(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'complete', bundle, '--result', path.join(bundle, 'case-151-wave2-synthesis-result.json')]);
run(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'claim', bundle, '--actor', 'main-agent']);
writeFileSync(path.join(bundle, 'case-151-wave2-backfill-result.json'), JSON.stringify({ queue_item_id: 'wave2-backfill-topic-a', receipt: 'file:seed_topics/topic-a.md', summary: 'backfill complete' }, null, 2));
run(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'complete', bundle, '--result', path.join(bundle, 'case-151-wave2-backfill-result.json')]);
appendTrace(bundle, { event: 'wave2_completion', source: 'case-151-pure-synthesis' });
JS

set +e
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave2 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-topic-scout --actor-reason probe_succeeded --execution-actor delegated_subagent > "$B/case-151-wave2-drain.json"
DRAIN_W2_STATUS=$?
set -e
node - "$B/case-151-wave2-drain.json" "$DRAIN_W2_STATUS" <<'JS'
const fs = require('fs');
const [file, status] = process.argv.slice(2);
const drain = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(JSON.stringify({ status: Number(status), phase_drained: drain.phase_drained, in_flight_count: drain.in_flight_count, unclaimed_delegated_count: drain.unclaimed_delegated_count }, null, 2));
process.exit(Number(status) === 1 && drain.phase_drained === true ? 0 : 1);
JS

node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md > "$B/case-151-gate-wave2.json"
```

## Step 7: [MAIN/SHELL] Record Verdict From Runtime Evidence

```bash
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { readTrace, readWorkUnitLedgerRows, recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const setup = JSON.parse(readFileSync(`${bundle}/case-151-gate-setup.json`, 'utf8'));
const seed = JSON.parse(readFileSync(`${bundle}/case-151-gate-seed.json`, 'utf8'));
const w0Drain = JSON.parse(readFileSync(`${bundle}/case-151-wave0-drain.json`, 'utf8'));
const w0Gate = JSON.parse(readFileSync(`${bundle}/case-151-gate-wave0.json`, 'utf8'));
const w1Drain = JSON.parse(readFileSync(`${bundle}/case-151-wave1-drain.json`, 'utf8'));
const w1Gate = JSON.parse(readFileSync(`${bundle}/case-151-gate-wave1.json`, 'utf8'));
const w2Drain = JSON.parse(readFileSync(`${bundle}/case-151-wave2-drain.json`, 'utf8'));
const w2Gate = JSON.parse(readFileSync(`${bundle}/case-151-gate-wave2.json`, 'utf8'));
const rows = readWorkUnitLedgerRows(bundle);
const attempts = readTrace(bundle).filter((event) => event.event === 'gate_attempt');

recordPlaybookCheck(bundle, { gate: 'setup-gate-pass', passed: setup.check?.passed === true, detail: JSON.stringify(setup.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'seed-gate-pass', passed: seed.check?.passed === true, detail: JSON.stringify(seed.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave0-drained-before-gate', passed: w0Drain.phase_drained === true, detail: JSON.stringify(w0Drain) });
recordPlaybookCheck(bundle, { gate: 'wave0-gate-pass', passed: w0Gate.check?.passed === true, detail: JSON.stringify(w0Gate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave1-drained-before-gate', passed: w1Drain.phase_drained === true, detail: JSON.stringify(w1Drain) });
recordPlaybookCheck(bundle, { gate: 'wave1-gate-pass', passed: w1Gate.check?.passed === true, detail: JSON.stringify(w1Gate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave2-pure-no-ledger-required', passed: rows.filter((row) => row.wave === 2).length === 0, detail: `${rows.length} total row(s)` });
recordPlaybookCheck(bundle, { gate: 'wave2-drained-before-gate', passed: w2Drain.phase_drained === true, detail: JSON.stringify(w2Drain) });
recordPlaybookCheck(bundle, { gate: 'wave2-gate-pass', passed: w2Gate.check?.passed === true, detail: JSON.stringify(w2Gate.inspect || []) });
recordPlaybookCheck(bundle, {
  gate: 'ordered-gate-attempts',
  passed: ['setup-ready', 'seed-topics-ready', 'wave0-complete', 'wave1-complete', 'wave2-complete'].every((gate) => attempts.some((event) => event.gate === gate && event.passed === true)),
  detail: attempts.map((event) => `${event.gate}:${event.passed}`).join(', ')
});
const verdict = writeTraceVerdict(bundle, 'case-151');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Step 8: [MAIN] Result Interpretation

PASS means the chain advanced through real lifecycle handoffs and every wave gate was run only after the relevant phase drain proof. Wave0/Wave1 delegated evidence was accepted through submitted work-unit ledger coverage. Wave2 pure synthesis had no Wave2 delegated row and still passed because no targeted evidence output was present.

## Step 9: [MAIN/SHELL] Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B/case-151-verdict.json"
rm -rf "$B"
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-151 --target-dir tests/.test-bundles --cleanup-pass
```

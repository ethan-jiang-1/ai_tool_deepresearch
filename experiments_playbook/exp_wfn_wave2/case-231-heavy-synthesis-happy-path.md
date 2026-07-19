---
schema: command-experiment/v2
experiment: wfn-wave2
case: case-231-heavy-synthesis-happy-path
case_goal: "Verify Wave2 pure synthesis can pass the Wave2 gate without any delegated Wave2 work-unit row."
verdict_mode: all
required_checks: [wave2-artifact-triplet, wave2-backfill-complete, wave2-no-delegated-row-required, wave2-pure-gate-pass]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: RWE-001, RWE-004, WTS-001, WTS-005
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

Fixture-backed Engine contract. It proves that a real Wave2-ready bundle accepts the non-delegated synthesis/backfill queue path, artifact triplet, `wave2_completion`, and Wave2 gate without a delegated Wave2 ledger row. It does not prove semantic synthesis quality or Subject Agent behavior.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable Wave2 bundle with witnessed Wave1-to-Wave2 handoff |
| Framework path | Real `operate-queue` for non-delegated synthesis/backfill and real Wave2 gate CLI |
| Fixture input | Controlled Wave2 artifacts written after the real queue claim |
| Agent actor | None; fixture-backed Engine evidence only |
| External calls | None |
| Verdict source | Gate JSON, queue completion output, work-unit ledger absence, trace `check` events |
| Does not prove | Agent synthesis quality |

# case-231-heavy-synthesis-happy-path

## Expected Runtime Path

1. Create a Wave2-ready disposable bundle with two post-Wave1 topics.
2. Enqueue one non-delegated synthesis item and one non-delegated backfill item per topic.
3. The controlled fixture writer writes `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml` after the real queue claim.
4. Complete synthesis/backfill through the non-delegated queue completion CLI.
5. Append `wave2_completion`.
6. Run Wave2 gate and verify it passes with zero submitted Wave2 work-unit rows.
7. Record the four required checks and publish native completion once.

## Step 1: [MAIN/SHELL] Create Wave2 Runtime Context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w2_pure_synthesis --case case-231 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { writeWave2Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

writeWave2Scaffold(process.argv[2], {
  planBasename: 'w2_pure_synthesis',
  staleWave2Backfill: true,
  topics: [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' }
  ]
});
JS
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
echo "BUNDLE=$B"
```

Expected: validation passes and trace contains a route-bound handoff into `phases/phase-wave2.md`.

## Step 2: [MAIN/SHELL] Enqueue Non-Delegated Wave2 Work

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const common = {
  targets: { controller: 'main-agent' },
  required_receipts: ['none'],
  done_condition: 'non-delegated queue completion succeeds',
  verification: { engine: ['receipt_check'], agent: [] },
  status_sync: [],
  failure_route: 'queue repair work'
};

enqueueWorkUnitTask(bundle, {
  ...common,
  queue_item_id: 'wave2-synthesis',
  title: 'Wave2 pure cross-topic synthesis',
  producer_rule: 'cross_topic_synthesis',
  priority_class: 'P2_close_open_loop',
  action: 'Read existing Wave0/Wave1 evidence and write the Wave2 three-artifact group. Do not perform new external search in this task.',
  writes_to: ['artifacts/wave2/synthesis.md', 'artifacts/wave2/cross-topic-ledger.md', 'artifacts/wave2/finding-index.yaml'],
  completion_receipt: 'file:artifacts/wave2/synthesis.md',
  payload: { phase: 'wave2' }
}, { fileName: 'case231-wave2-synthesis.json' });

for (const topic of [
  { slug: 'topic-a', title: 'Topic A' },
  { slug: 'topic-b', title: 'Topic B' }
]) {
  enqueueWorkUnitTask(bundle, {
    ...common,
    queue_item_id: `wave2-backfill-${topic.slug}`,
    title: `Wave2 seed backfill for ${topic.title}`,
    producer_rule: 'seed_topic_backfill_wave2',
    priority_class: 'P4_progressive_artifact_or_seed_backfill',
    action: 'Backfill seed topic tokens from cross-topic-ledger.md and finding-index.yaml.',
    writes_to: [`seed_topics/${topic.slug}.md`],
    completion_receipt: `file:seed_topics/${topic.slug}.md`,
    lineage: { topic_slug: topic.slug, phase: 'wave2' },
    payload: { topic_slug: topic.slug, phase: 'wave2' }
  }, { fileName: `case231-backfill-${topic.slug}.json` });
}
JS
```

Expected: queue has three non-delegated items and no Wave2 delegated in-flight attempt.

## Step 3: [MAIN/SHELL] Write Controlled Pure Synthesis Artifacts

Use the controlled artifact writer only after the real synthesis queue item is claimed:

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/cli/operate-queue.mjs claim "$B" --actor main-agent > "$B/case-231-synthesis-claim.json"
node --input-type=module - "$B" <<'JS'
import { writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const bundle = process.argv[2];
mkdirSync(path.join(bundle, 'artifacts/wave2'), { recursive: true });
writeFileSync(path.join(bundle, 'artifacts/wave2/synthesis.md'), `# Cross-Topic Synthesis

W2F-001 compares [Topic A evidence](../wave1/topic-a/evidence-summary.md) with [Topic B questions](../wave1/topic-b/question-list.md).

This synthesis uses existing Wave0/Wave1 evidence only. No Wave2 targeted evidence work unit is required.
`);
writeFileSync(path.join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), `# Cross-Topic Ledger

## Cross-Topic Scan Matrix

| pair_id | topics | checked_dimensions | finding_ids | notes |
| --- | --- | --- | --- | --- |
| P01 | topic-a + topic-b | shared_pattern, resolution_opportunity | W2F-001 | Controlled pure synthesis |

## Wave1 Legacy Questions

- topic-a and topic-b compared.

## Cross-Topic Resolutions

- W2F-001 uses existing evidence.

## Emergent Cross-Topic Questions

- None requiring new search.

## Exploration Decisions

| W2F-001 | use_existing_evidence | no delegated row needed |

## HITL2 Handoff

- None.
`);
writeFileSync(path.join(bundle, 'artifacts/wave2/finding-index.yaml'), `version: "0.1"
source_layer: wave2_cross_topic
ledger: artifacts/wave2/cross-topic-ledger.md
synthesis: artifacts/wave2/synthesis.md
scan:
  topics: [topic-a, topic-b]
  topic_count: 2
  pair_count_expected: 1
  pair_count_checked: 1
findings:
  - id: W2F-001
    type: cross_topic_resolution
    status: resolved
    decision: use_existing_evidence
    affected_topics: [topic-a, topic-b]
    origin_refs: [artifacts/wave1/topic-a/question-list.md]
    trigger_refs: [artifacts/wave1/topic-b/evidence-summary.md]
    search_required: false
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false
`);
for (const topic of ['topic-a', 'topic-b']) {
  writeFileSync(path.join(bundle, 'seed_topics', `${topic}.md`), `# ${topic}

## Wave2 Judgment
Cross-topic judgment from W2F-001.

## Pending Questions
- [resolved] No targeted search required.
`);
}
JS
printf '{"queue_item_id":"wave2-synthesis","receipt":"file:artifacts/wave2/synthesis.md","summary":"pure synthesis artifacts written"}\n' > "$B/case-231-synthesis-result.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs complete "$B" --result "$B/case-231-synthesis-result.json"
```

Expected: synthesis completion succeeds without `operate-work-unit`.

## Step 4: [MAIN/SHELL] Complete Backfill Queue Items

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
for slug in topic-a topic-b; do
  node DPT_FRAMEWORK/cli/operate-queue.mjs claim "$B" --actor main-agent > "$B/case-231-backfill-$slug-claim.json"
  printf '{"queue_item_id":"wave2-backfill-%s","receipt":"file:seed_topics/%s.md","summary":"backfill complete"}\n' "$slug" "$slug" > "$B/case-231-backfill-$slug-result.json"
  node DPT_FRAMEWORK/cli/operate-queue.mjs complete "$B" --result "$B/case-231-backfill-$slug-result.json"
done
```

Expected: every backfill item completes through non-delegated queue completion.

## Step 5: [MAIN/SHELL] Gate And Trace Verdict

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave2_completion', source: 'case-231-visible-path' });
JS
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md > "$B/case-231-gate.json"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { readWorkUnitLedgerRows, recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const gate = JSON.parse(readFileSync(`${bundle}/case-231-gate.json`, 'utf8'));
const wave2Rows = readWorkUnitLedgerRows(bundle).filter((row) => row.wave === 2);
const artifactTriplet = ['synthesis.md', 'cross-topic-ledger.md', 'finding-index.yaml'].every((name) => existsSync(`${bundle}/artifacts/wave2/${name}`));
const backfillComplete = ['topic-a', 'topic-b'].every((slug) => {
  const content = readFileSync(`${bundle}/seed_topics/${slug}.md`, 'utf8');
  return content.includes('## Wave2 Judgment') && !content.includes('__BACKFILL_');
});
recordPlaybookCheck(bundle, { gate: 'wave2-artifact-triplet', passed: artifactTriplet, detail: 'synthesis, ledger, finding index' });
recordPlaybookCheck(bundle, { gate: 'wave2-backfill-complete', passed: backfillComplete, detail: 'topic-a, topic-b' });
recordPlaybookCheck(bundle, { gate: 'wave2-pure-gate-pass', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave2-no-delegated-row-required', passed: wave2Rows.length === 0, detail: `${wave2Rows.length} Wave2 row(s)` });
console.log('Recorded native facts; finalizer owns completion.');
JS
```

Expected: gate passes and the submitted Wave2 work-unit row count is `0`.

## Step 6: [MAIN/SHELL] Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, audit, preservation, and optional clean-PASS cleanup.

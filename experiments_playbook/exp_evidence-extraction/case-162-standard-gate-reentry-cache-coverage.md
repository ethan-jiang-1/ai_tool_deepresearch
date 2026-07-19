---
schema: command-experiment/v2
experiment: evidence-extraction
case: case-162-standard-gate-reentry-cache-coverage
case_goal: "Prove submitted work-unit ledger rows drive count_floor, cache_coverage, file-observability cache_gap, and check-reentry; orphan/direct artifacts cannot satisfy gate pass conditions."
verdict_mode: all
required_checks: [cache-coverage-drift, clean-submitted-gate-passes, file-observability-cache-gap, file-observability-orphan-feedback, heavy-health-cache-gap, ledger-counts-only-submitted-topic-a, orphan-direct-artifact-fails-gate, reentry-cache-gap, reentry-orphan-blocker, submitted-work-unit-rows]
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
req: AGT-009, EEX-003, EEX-004
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

Fixture-backed standard case. The Markdown controller drives real disposable bundle setup, real work-unit submit, real Wave0 gate, real file-observability helper, real `check-reentry`, and real bundle health. Fixture content may stand in for Agent-written references only after a real work-unit claim; submitted ledger rows and cache trails must be produced by `operate-work-unit submit`.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | One real disposable bundle |
| Framework path | Real work-unit claim/submit, Wave0 gate CLI, file observability, `check-reentry`, health verifier |
| Fixture input | Controlled references/cache leaves/results written after claim |
| Agent actor | None |
| External calls | None |
| Verdict source | gate JSON, file-observability JSON, reentry JSON, health JSON, trace checks |
| Does not prove | Agent search/writing quality or real rerun recovery behavior |

# case-162-standard-gate-reentry-cache-coverage

## Expected Runtime Path

1. Submit shared and topic-a Wave0 references through work units.
2. Add direct topic-b reference/source artifacts without submitted work-unit coverage.
3. Wave0 gate and check-reentry fail; file observability marks the direct Wave0 artifact as blocking and the direct reference as needing explanation.
4. Remove the direct orphan and repair topic-b through work-unit submit.
5. Wave0 gate passes with submitted ledger coverage.
6. Delete one submitted cache `meta.json` to simulate gate-time drift.
7. `cache_coverage`, file observability, `check-reentry`, and heavy health report the cache gap.
8. Record strict trace checks, invoke native completion, and stop; the Autorun Supervisor owns health, preservation, and any requested clean-PASS cleanup.

## Step 1: [MAIN/SHELL] Create Bundle And Submit Topic-A Work Units

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eex_gate_reentry_cache --case case-162 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { writeFileSync } from 'node:fs';
import {
  claimAndSubmitFixtureWorkUnit,
  queueItemForWorkUnit,
  referenceContent,
  sourceYamlExtra,
  writeWave0Scaffold
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave0Scaffold(bundle, {
  planBasename: 'eex_gate_reentry_cache',
  topics: [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' }
  ],
  referenceRows: [
    '| 00-shared-topic-a.md | primary | expert | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |',
    '| topic-a-ref-1.md | primary | expert | Tier 2 | topic-a | wave0_foundation | accepted | 2026-07-06 |',
    '| topic-a-ref-2.md | secondary | analyst | Tier 2 | topic-a | wave0_foundation | accepted | 2026-07-06 |',
    '| topic-b-ref-1.md | primary | expert | Tier 2 | topic-b | wave0_foundation | accepted | 2026-07-06 |'
  ]
});

function submit({ queue_item_id, topic_slug, refPath, sourceUrl, sourceSlug, title, key_facts, core_content }) {
  return claimAndSubmitFixtureWorkUnit(bundle, {
    phase: 'wave0',
    task: queueItemForWorkUnit({ queue_item_id, topic_slug }),
    output_path: refPath,
    source_url: sourceUrl,
    source_slug: sourceSlug,
    output_content: referenceContent({ source_url: sourceUrl, topic_slug, title, key_facts, core_content }),
    extra_output_files: [sourceYamlExtra(topic_slug, sourceUrl, title)],
    cache_trails: [`_cache/wave0/primary/${topic_slug}/${sourceSlug}`]
  });
}

const submitted = [
  submit({
    queue_item_id: 'case162-shared-topic-a',
    topic_slug: 'topic-a',
    refPath: 'reference/00-shared-topic-a.md',
    sourceUrl: 'https://research-source.test/topic-a/shared-overview',
    sourceSlug: 'shared-topic-a',
    title: 'Shared Topic A Overview',
    key_facts: ['Shared overview anchors policy baselines.', 'It separates common context from topic-specific evidence.', 'It records public consultation phases.', 'It satisfies the shared reference floor.', 'Its cache leaf maps by meta URL.'],
    core_content: 'General regulatory baseline evidence about policy timelines, consultation mechanisms, oversight vocabulary, and institutional context.'
  }),
  submit({
    queue_item_id: 'case162-topic-a-1',
    topic_slug: 'topic-a',
    refPath: 'reference/topic-a-ref-1.md',
    sourceUrl: 'https://research-source.test/topic-a/primary',
    sourceSlug: 'topic-a-primary',
    title: 'Topic A Primary',
    key_facts: ['Primary evidence focuses on statutory review boards.', 'It distinguishes mandatory audits from voluntary attestations.', 'It names escalation triggers for model updates.', 'Compliance teams use it for evidence preservation.', 'The cache trail is a complete leaf.'],
    core_content: 'Statute-facing obligations: audit boards, incident escalation, public notices, deployment thresholds, and evidence preservation.'
  }),
  submit({
    queue_item_id: 'case162-topic-a-2',
    topic_slug: 'topic-a',
    refPath: 'reference/topic-a-ref-2.md',
    sourceUrl: 'https://research-source.test/topic-a/secondary',
    sourceSlug: 'topic-a-secondary',
    title: 'Topic A Secondary',
    key_facts: ['Secondary evidence analyzes vendor reporting costs.', 'It compares small-company burden with enterprise offices.', 'It highlights insurance pricing and legal-review bottlenecks.', 'Regional rollout affects training budgets.', 'This cache trail is later drifted for testing.'],
    core_content: 'Economic and operational evidence: vendor cost models, insurance pricing, procurement timing, audit-market capacity, and staffing pressure.'
  })
];

writeFileSync(`${bundle}/case-162-topic-a-submits.json`, `${JSON.stringify(submitted.map((s) => ({ work_id: s.record.work_id, ok: s.submit.ok })), null, 2)}\n`);
JS
```

## Step 2: [MAIN/SHELL] Direct Orphan Cannot Satisfy Gate Or Reentry

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { referenceContent, recordPlaybookCheck, sourceYamlContent } from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { auditFileObservability } from './DPT_FRAMEWORK/engine/helpers/file-observability.mjs';
import { readOutputDeclarations } from './DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
writeFileSync(path.join(bundle, 'reference/topic-b-orphan.md'), referenceContent({
  source_url: 'https://research-source.test/topic-b/orphan',
  topic_slug: 'topic-b',
  title: 'Topic B Orphan'
}));
mkdirSync(path.join(bundle, 'artifacts/wave0/topic-b'), { recursive: true });
writeFileSync(path.join(bundle, 'artifacts/wave0/topic-b/source.yaml'), sourceYamlContent({
  source_url: 'https://research-source.test/topic-b/orphan',
  topic_slug: 'topic-b',
  title: 'Topic B Orphan'
}));

const gate = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs', '--bundle', bundle, '--current-node', 'phases/phase-wave0.md'], { encoding: 'utf8' });
writeFileSync(`${bundle}/case-162-gate-with-orphan.json`, gate.stdout);

const fo = auditFileObservability(bundle, {
  topicSlugs: ['topic-a', 'topic-b'],
  ledgerDeclarations: readOutputDeclarations(bundle),
  targetPhase: 'wave0'
});
writeFileSync(`${bundle}/case-162-file-observability-with-orphan.json`, `${JSON.stringify(fo, null, 2)}\n`);

writeFileSync(`${bundle}/rb_status.json`, `${JSON.stringify({ bundle: path.basename(bundle), current_gate: 'wave0_complete', next_gate: 'wave1_complete', current_mode: 'execution', state: 'in_progress' }, null, 2)}\n`);
const reentry = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/check-reentry.mjs', '--bundle', bundle, '--at', 'wave0_complete'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
writeFileSync(`${bundle}/case-162-reentry-with-orphan.json`, reentry.stdout);

const parsedGate = JSON.parse(gate.stdout);
const parsedReentry = JSON.parse(reentry.stdout);
recordPlaybookCheck(bundle, {
  gate: 'orphan-direct-artifact-fails-gate',
  passed: gate.status === 1 && /bypass|coverage|topic-b/i.test(JSON.stringify(parsedGate.inspect || [])),
  detail: JSON.stringify(parsedGate.inspect || [])
});
recordPlaybookCheck(bundle, {
  gate: 'file-observability-orphan-feedback',
  passed: fo.findings.some((f) => f.path === 'artifacts/wave0/topic-b/source.yaml' && f.classification === 'orphan_authority_blocking') &&
    fo.findings.some((f) => f.path === 'reference/topic-b-orphan.md' && f.classification === 'unplanned_needs_explanation'),
  detail: JSON.stringify(fo.findings.filter((f) => f.path.includes('topic-b')))
});
recordPlaybookCheck(bundle, {
  gate: 'reentry-orphan-blocker',
  passed: reentry.status === 1 && JSON.stringify(parsedReentry).includes('topic-b-orphan.md'),
  detail: JSON.stringify(parsedReentry.blockers || parsedReentry.inspect || [])
});
JS
```

## Step 3: [MAIN/SHELL] Repair Topic-B Through Work-Unit Submit And Gate Passes

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  claimAndSubmitFixtureWorkUnit,
  queueItemForWorkUnit,
  readWorkUnitLedgerRows,
  recordPlaybookCheck,
  referenceContent,
  sourceYamlExtra
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { countReferences } from './DPT_FRAMEWORK/engine/helpers/ref-count.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
rmSync(path.join(bundle, 'reference/topic-b-orphan.md'), { force: true });
rmSync(path.join(bundle, 'artifacts/wave0/topic-b/source.yaml'), { force: true });

const repaired = claimAndSubmitFixtureWorkUnit(bundle, {
  phase: 'wave0',
  task: queueItemForWorkUnit({ queue_item_id: 'case162-topic-b-1', topic_slug: 'topic-b' }),
  output_path: 'reference/topic-b-ref-1.md',
  source_url: 'https://research-source.test/topic-b/primary',
  source_slug: 'topic-b-primary',
  output_content: referenceContent({
    source_url: 'https://research-source.test/topic-b/primary',
    topic_slug: 'topic-b',
    title: 'Topic B Primary',
    key_facts: ['Topic B evidence covers agricultural sensors.', 'It links rainfall anomaly maps to reservoir allocation.', 'It discusses soil moisture readings.', 'Regional managers use it for advisory updates.', 'This submitted row replaces the direct orphan artifact.'],
    core_content: 'Topic B controlled content uses water-management and satellite-observation vocabulary and proves repair through submitted work-unit coverage.'
  }),
  extra_output_files: [sourceYamlExtra('topic-b', 'https://research-source.test/topic-b/primary', 'Topic B Primary')],
  cache_trails: ['_cache/wave0/primary/topic-b/topic-b-primary']
});

writeFileSync(`${bundle}/rb_status.json`, `${JSON.stringify({ bundle: path.basename(bundle), current_gate: 'seed_topics_ready', next_gate: 'wave0_complete', current_mode: 'execution', state: 'in_progress' }, null, 2)}\n`);
const gate = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs', '--bundle', bundle, '--current-node', 'phases/phase-wave0.md'], { encoding: 'utf8' });
writeFileSync(`${bundle}/case-162-gate-clean.json`, gate.stdout);
const parsedGate = JSON.parse(gate.stdout);
const refCount = countReferences(bundle, { source: 'ledger', targetGlob: 'reference/topic-a*.md', topic: 'topic-a' });
const rows = readWorkUnitLedgerRows(bundle);
writeFileSync(`${bundle}/case-162-repair-summary.json`, `${JSON.stringify({ repaired: repaired.submit, rows: rows.length, refCount }, null, 2)}\n`);
recordPlaybookCheck(bundle, {
  gate: 'clean-submitted-gate-passes',
  passed: gate.status === 0 && parsedGate.check?.passed === true,
  detail: JSON.stringify(parsedGate.inspect || [])
});
recordPlaybookCheck(bundle, {
  gate: 'ledger-counts-only-submitted-topic-a',
  passed: refCount.count === 2 && refCount.uncountable.length === 0,
  detail: JSON.stringify(refCount)
});
recordPlaybookCheck(bundle, {
  gate: 'submitted-work-unit-rows',
  passed: rows.length === 4 && repaired.submit.ok === true,
  detail: JSON.stringify(rows.map((row) => ({ work_id: row.work_id, queue_item_id: row.queue_item_id })))
});
JS
```

## Step 4: [MAIN/SHELL] Submitted Cache Drift Is Detected Downstream

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { checkCacheCoverage } from './DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs';
import { auditFileObservability } from './DPT_FRAMEWORK/engine/helpers/file-observability.mjs';
import { readOutputDeclarations } from './DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
rmSync(path.join(bundle, '_cache/wave0/primary/topic-a/topic-a-secondary/meta.json'), { force: true });
const coverage = checkCacheCoverage(bundle);
writeFileSync(`${bundle}/case-162-cache-coverage-drift.json`, `${JSON.stringify(coverage, null, 2)}\n`);
const fo = auditFileObservability(bundle, {
  topicSlugs: ['topic-a', 'topic-b'],
  ledgerDeclarations: readOutputDeclarations(bundle),
  targetPhase: 'wave0'
});
writeFileSync(`${bundle}/case-162-file-observability-drift.json`, `${JSON.stringify(fo, null, 2)}\n`);
writeFileSync(`${bundle}/rb_status.json`, `${JSON.stringify({ bundle: path.basename(bundle), current_gate: 'wave0_complete', next_gate: 'wave1_complete', current_mode: 'execution', state: 'in_progress' }, null, 2)}\n`);
const reentry = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/check-reentry.mjs', '--bundle', bundle, '--at', 'wave0_complete'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
writeFileSync(`${bundle}/case-162-reentry-drift.json`, reentry.stdout);
const parsedReentry = JSON.parse(reentry.stdout);
recordPlaybookCheck(bundle, {
  gate: 'cache-coverage-drift',
  passed: coverage.passed === false && /missing files: meta\.json/i.test(JSON.stringify(coverage.inspect || [])),
  detail: JSON.stringify(coverage.inspect || [])
});
recordPlaybookCheck(bundle, {
  gate: 'file-observability-cache-gap',
  passed: fo.inspect.some((line) => line.includes('[cache_gap]') && line.includes('meta.json')),
  detail: JSON.stringify(fo.inspect)
});
recordPlaybookCheck(bundle, {
  gate: 'reentry-cache-gap',
  passed: JSON.stringify(parsedReentry.inspect || []).includes('[cache_gap]') && JSON.stringify(parsedReentry).includes('meta.json'),
  detail: JSON.stringify(parsedReentry.inspect || [])
});
recordPlaybookCheck(bundle, {
  gate: 'heavy-health-cache-gap',
  passed: coverage.passed === false && fo.inspect.some((line) => line.includes('[cache_gap]')),
  detail: 'Direct cache-gap fact expected to surface as an issue in subsequent Supervisor Heavy health.'
});
JS
```

## Step 5: [MAIN/SHELL] Trace Verdict

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
const bundle = process.argv[2];
console.log(`Native checks recorded for ${bundle}; Supervisor finalizer is authoritative.`);
JS
```

## Step 6: [MAIN] Result Interpretation

PASS means submitted work-unit ledger rows, not filesystem-only artifacts, are the downstream evidence authority. It also proves cache gaps can be detected after submit if a previously verified cache leaf drifts.

## Step 7: [MAIN/SHELL] Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

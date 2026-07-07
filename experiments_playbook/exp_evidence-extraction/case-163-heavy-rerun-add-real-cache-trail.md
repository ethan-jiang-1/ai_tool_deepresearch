---
schema: command-experiment/v1
experiment: evidence-extraction
case: case-163-heavy-rerun-add-real-cache-trail
weight: heavy
case_goal: "Real Agent canary: prove rerun action:add source intake can produce cache leaves, submitted work-unit ledger coverage, Wave0 gate/reentry feedback, and required quality metrics."
runner: coding-agent
agent_mode: real-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-163_eex_real_agent_rerun_add_*
trace: dpt_disp_case-163_eex_real_agent_rerun_add_*/rb_trace.jsonl
verdict: trace-jsonl
req: AGT-009, EEX-003, EEX-004
---

## Execution Contract

Heavy real-Agent canary. PASS requires a real Agent or sub-agent actor to execute the claimed `wave0_source_intake` work-unit task for the rerun `action:add` topic. The actor must perform real source discovery/fetching or an approved fetch degradation chain, write its own runtime receipt, output files, cache leaves, and result JSON, and return that result through `operate-work-unit submit`.

Fixture output, parent-written semantic output, hand-written ledger rows, and missing Agent evidence cannot produce PASS. If no real result is available, record `NOT_RUN`, preserve the bundle, and exit `2`. `NOT_RUN` is deferred real-Agent evidence, not proof of extraction quality.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | One real disposable bundle created by shared experiment setup |
| Framework path | Real queue enqueue, `operate-work-unit claim`, `operate-work-unit submit`, Wave0 gate, file observability, `check-reentry`, and heavy health |
| Fixture input | Rerun profile/status/seed-topic setup only; no fixture may satisfy PASS |
| Agent actor | Required for PASS |
| External calls | Required for PASS unless the actor records an approved fetch degradation chain in cache metadata |
| Ledger generation | Real Engine-written `rb_output_declarations.jsonl` row from submit |
| Verdict source | Trace checks derived from submit JSON, gate JSON, reentry JSON, health JSON, submitted ledger rows, and quality metrics |
| Does not prove | Agent cache behavior across all topics or all source types |

# case-163-heavy-rerun-add-real-cache-trail

## Expected Runtime Path

1. Create a disposable rerun bundle with two kept topics and one added `economic-impact` topic.
2. Enqueue the added topic as a Wave0 source-intake demand.
3. Claim a work unit through `operate-work-unit claim` and read the generated task/prompt refs.
4. A real Agent executes `_work_units/wave0/$WORK_ID/task.md` and writes result, receipt, output files, and cache leaves.
5. If no real result exists, record `NOT_RUN`, preserve the bundle, and stop.
6. Submit the real result by `work_id`.
7. Run Wave0 gate, file observability, `check-reentry`, heavy health, cache coverage, and reference count checks.
8. Record required quality metrics: cache trail coverage, grounding spot-check, URL precision, countable rate, and gap rate.
9. Produce a trace verdict and clean up only on PASS.

## Step 1: [MAIN/SHELL] Create Rerun Bundle And Claim Work Unit

This step creates only the deterministic rerun control surface and the work-unit envelope. It does not write Agent-produced references, cache leaves, receipts, result JSON, or ledger rows.

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eex_real_agent_rerun_add --case case-163 --force)
node --input-type=module - "$B" <<'JS'
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  claimWorkUnitsViaCli,
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  writeWave0Scaffold
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];

writeWave0Scaffold(bundle, {
  planBasename: 'eex_real_agent_rerun_add',
  topics: [
    { id: 't1', slug: 'ai-regulation', title: 'AI Regulation' },
    { id: 't2', slug: 'ai-safety-research', title: 'AI Safety Research' },
    { id: 't3', slug: 'economic-impact', title: 'Economic Impact of AI Safety' }
  ],
  referenceRows: [
    '| 00-shared-economic-impact.md | primary | expert | Tier 2 | economic-impact | wave0_foundation | accepted | 2026-07-06 |'
  ]
});

writeFileSync(path.join(bundle, 'rb_profile.yaml'), [
  'plan_basename: eex_real_agent_rerun_add',
  'research_profile: quick_factual',
  'root_must_answer_set:',
  '  - What are the economic implications of AI safety measures?',
  'research_style_params:',
  '  user_visible: false',
  '  wave0_per_topic_source_floor: 1',
  '  wave0_shared_ref_total: 1',
  '  wave1_per_topic_ref_floor: 1',
  '  quality_min_tier: tier_4',
  '  quality_min_substance: none',
  'human_decision_checkpoints:',
  '  hitl1:',
  '    status: recorded',
  '  hitl2:',
  '    status: recorded',
  '    user_decision: rerun',
  '    rerun_count: 1',
  '    rationale: Add economic impact analysis to topic coverage.',
  ''
].join('\n'));

mkdirSync(path.join(bundle, 'seed_topics'), { recursive: true });
writeFileSync(path.join(bundle, 'seed_topics/ai-regulation.md'), [
  '---',
  'id: t1',
  'slug: ai-regulation',
  'title: AI Regulation',
  '---',
  '',
  '# AI Regulation',
  '',
  '## Rerun Direction',
  '- action: keep',
  ''
].join('\n'));
writeFileSync(path.join(bundle, 'seed_topics/ai-safety-research.md'), [
  '---',
  'id: t2',
  'slug: ai-safety-research',
  'title: AI Safety Research',
  '---',
  '',
  '# AI Safety Research',
  '',
  '## Rerun Direction',
  '- action: keep',
  ''
].join('\n'));
writeFileSync(path.join(bundle, 'seed_topics/economic-impact.md'), [
  '---',
  'id: t3',
  'slug: economic-impact',
  'title: Economic Impact of AI Safety',
  '---',
  '',
  '# Economic Impact of AI Safety',
  '',
  '## Rerun Direction',
  '- action: add',
  '- new_search_dimensions: economic impact of AI safety regulation, cost of compliance, market effects',
  '- rationale_excerpt: Add economic impact analysis to topic coverage.',
  ''
].join('\n'));

const task = queueItemForWorkUnit({
  phase: 'wave0',
  queue_item_id: 'case163-economic-impact',
  topic_slug: 'economic-impact',
  title: 'Real Agent rerun action:add source intake for economic-impact'
});
enqueueWorkUnitTask(bundle, task, { fileName: 'case-163-economic-impact.json' });

const claim = claimWorkUnitsViaCli(bundle, { phase: 'wave0', count: 1 });
const workId = claim.claimed_work_ids[0];
writeFileSync(path.join(bundle, 'case-163-claim.json'), `${JSON.stringify(claim, null, 2)}\n`);
writeFileSync(path.join(bundle, 'case-163-env.sh'), `WORK_ID=${workId}\n`);
console.log(JSON.stringify({ bundle, workId, claim }, null, 2));
JS
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
source "$B/case-163-env.sh"
echo "BUNDLE=$B"
echo "WORK_ID=$WORK_ID"
```

Expected: one `wave0_source_intake` work unit is claimed. The generated task, manifest, beacon, result schema, and runtime receipt path live under `_work_units/wave0/$WORK_ID/`.

## Step 2: [MAIN/SHELL] Read The Work-Unit Envelope

The controller reads the Engine-generated task before handing work to the real Agent. This is the handoff surface; it is not a hidden runner.

```bash
source "$B/case-163-env.sh"
TASK_REF=$(node --input-type=module - "$B" "$WORK_ID" <<'JS'
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';
const [bundle, workId] = process.argv.slice(2);
const record = loadWorkUnitIndex(bundle).work_units[workId];
if (!record) throw new Error(`missing work unit ${workId}`);
console.log(record.paths.task_ref);
JS
)
echo "TASK_REF=$TASK_REF"
sed -n '1,220p' "$B/$TASK_REF"
```

Expected: the task names the exact `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, output contract, cache policy, result schema, and runtime receipt path.

## Step 3: [MAIN->AGENT] Produce Real Agent Result

A real Agent actor now executes the generated task from Step 2.

Required Agent evidence:

- Read `_work_units/wave0/$WORK_ID/task.md`, `manifest.json`, `beacon.json`, and `result.schema.json`.
- Search and fetch source material for economic impact of AI safety regulation, compliance cost, and market effects.
- Write at least one countable reference under `reference/`.
- Write `artifacts/wave0/economic-impact/source.yaml`.
- Write one or more cache leaves under `_cache/wave0/primary/economic-impact/<source-slug>/`, each containing `websearch.json`, `page.md`, and `meta.json`.
- Append lifecycle receipt events to the claimed runtime receipt path; every event must carry the same `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- Write a result JSON that matches the claimed work unit and declares `output_files[]` plus `cache_trails[]`.
- Return the result JSON path to the main controller.

The main controller must not prewrite the semantic reference, page capture, cache metadata, result JSON, runtime receipt, or ledger row for this step.

## Step 4: [MAIN/SHELL] No-Result Checkpoint

Run this checkpoint if Step 3 did not produce a real result JSON. It records `NOT_RUN`, exits `2`, and preserves the bundle.

```bash
source "$B/case-163-env.sh"
REAL_RESULT=${REAL_RESULT:-}
if [ -z "$REAL_RESULT" ] || [ ! -f "$REAL_RESULT" ]; then
  node --input-type=module - "$B" "$WORK_ID" <<'JS'
import { writeFileSync } from 'node:fs';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const reason = {
  case: 'case-163',
  status: 'NOT_RUN',
  ok: false,
  work_id: workId,
  reason: 'No real Agent result JSON was provided. This heavy case requires real Agent work and cannot PASS from fixtures.',
  required_metrics: ['cache_trail_coverage', 'grounding_spot_check', 'url_precision', 'countable_rate', 'gap_rate']
};
writeFileSync(`${bundle}/case-163-not-run.json`, `${JSON.stringify(reason, null, 2)}\n`);
writeFileSync(`${bundle}/case-163-verdict.json`, `${JSON.stringify(reason, null, 2)}\n`);
recordPlaybookCheck(bundle, {
  gate: 'real-agent-result-required',
  passed: false,
  expected: true,
  detail: `NOT RUN: ${reason.reason}`,
  extra: { outcome: 'not_run', work_id: workId }
});
console.log(JSON.stringify(reason, null, 2));
process.exit(2);
JS
fi
```

Expected without `REAL_RESULT`: exit `2`, `case-163-verdict.json` has `status: "NOT_RUN"`, and the bundle is preserved for later real-Agent continuation.

## Step 5: [MAIN/SHELL] Submit Real Result By Work ID

Run only after Step 3 has produced a real result JSON.

```bash
source "$B/case-163-env.sh"
REAL_RESULT=<path-to-real-agent-result.json>
SUBMIT_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$REAL_RESULT")
printf '%s\n' "$SUBMIT_JSON" > "$B/case-163-submit.json"
printf '%s\n' "$SUBMIT_JSON" | node -e '
const submit = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(`submit_ok=${submit.ok}`);
console.log(`submitted_work_id=${submit.work_id || submit.record?.work_id || "see submit JSON"}`);
process.exit(submit.ok === true ? 0 : 1);
'
```

Expected: submit returns `ok: true`, completes the bound queue demand, and appends one submitted work-unit ledger row.

## Step 6: [MAIN/SHELL] Gate, Reentry, Health, And Quality Metrics

This checkpoint reads machine feedback into runtime artifacts and trace checks. It does not infer success from console confidence.

```bash
node --input-type=module - "$B" "$WORK_ID" <<'JS'
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  extractSection,
  isHomepageUrl,
  parseReferenceMetadata,
  readOutputDeclarations,
  readSubmittedWorkUnitDeclarations
} from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import { checkCacheCoverage } from './DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs';
import { auditFileObservability } from './DPT_FRAMEWORK/engine/helpers/file-observability.mjs';
import { countReferences } from './DPT_FRAMEWORK/engine/helpers/ref-count.mjs';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const run = (args) => spawnSync(process.execPath, args, {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024
});
const writeJson = (relPath, value) => writeFileSync(path.join(bundle, relPath), `${JSON.stringify(value, null, 2)}\n`);
const parseStdout = (result, label) => {
  try { return JSON.parse(result.stdout); }
  catch (error) {
    throw new Error(`${label} did not emit JSON: ${error.message}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
};

const submit = JSON.parse(readFileSync(path.join(bundle, 'case-163-submit.json'), 'utf8'));

writeFileSync(path.join(bundle, 'rb_status.json'), `${JSON.stringify({
  bundle: path.basename(bundle),
  current_gate: 'seed_topics_ready',
  next_gate: 'wave0_complete',
  current_mode: 'execution',
  state: 'in_progress'
}, null, 2)}\n`);
const gateResult = run(['DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs', '--bundle', bundle, '--current-node', 'phases/phase-wave0.md']);
writeFileSync(path.join(bundle, 'case-163-gate-wave0.json'), gateResult.stdout || gateResult.stderr || '');
const gate = parseStdout(gateResult, 'Wave0 gate');

const coverage = checkCacheCoverage(bundle);
writeJson('case-163-cache-coverage.json', coverage);

const declarations = readOutputDeclarations(bundle);
const submittedRows = readSubmittedWorkUnitDeclarations(bundle);
const fileObservability = auditFileObservability(bundle, {
  topicSlugs: ['ai-regulation', 'ai-safety-research', 'economic-impact'],
  ledgerDeclarations: declarations,
  targetPhase: 'wave0'
});
writeJson('case-163-file-observability.json', fileObservability);

writeFileSync(path.join(bundle, 'rb_status.json'), `${JSON.stringify({
  bundle: path.basename(bundle),
  current_gate: 'wave0_complete',
  next_gate: 'wave1_complete',
  current_mode: 'execution',
  state: 'in_progress'
}, null, 2)}\n`);
const reentryResult = run(['DPT_FRAMEWORK/cli/check-reentry.mjs', '--bundle', bundle, '--at', 'wave0_complete']);
writeFileSync(path.join(bundle, 'case-163-check-reentry.json'), reentryResult.stdout || reentryResult.stderr || '');
const reentry = parseStdout(reentryResult, 'check-reentry');

const healthResult = run(['experiments_env/shared/verify-bundle-health.mjs', '--bundle', bundle, '--profile', 'heavy', '--json']);
writeFileSync(path.join(bundle, 'case-163-health.json'), healthResult.stdout || healthResult.stderr || '');
const health = parseStdout(healthResult, 'heavy health');

const refCount = countReferences(bundle, { source: 'ledger' });
const submittedForWork = submittedRows.filter((row) => row.work_id === workId);
const refOutputs = submittedForWork.flatMap((row) => (row.output_files || []).filter((entry) => entry.role === 'reference'));
const allTrails = [...new Set(submittedForWork.flatMap((row) => row.cache_trails || []))];

function cacheLeafComplete(trail) {
  return ['websearch.json', 'page.md', 'meta.json'].every((name) => existsSync(path.join(bundle, trail, name)));
}

function metaUrl(trail) {
  try {
    return JSON.parse(readFileSync(path.join(bundle, trail, 'meta.json'), 'utf8')).url || '';
  } catch {
    return '';
  }
}

function mapsTrailToRef(trail, ref) {
  const meta = metaUrl(trail);
  if (meta && ref.source_url && meta === ref.source_url) return true;
  if (ref.source_slug && trail.includes(ref.source_slug)) return true;
  const qualifier = path.basename(ref.path || '', '.md').replace(/^00-shared-/, '');
  return qualifier.length > 0 && trail.includes(qualifier);
}

const mappedRefs = refOutputs.filter((ref) => allTrails.some((trail) => cacheLeafComplete(trail) && mapsTrailToRef(trail, ref)));
const emptyTrailRefs = refOutputs.filter((ref) => !allTrails.some((trail) => mapsTrailToRef(trail, ref)));
const urlPrecision = refOutputs.map((ref) => ({
  path: ref.path,
  source_url: ref.source_url || '',
  article_level: ref.source_url ? !isHomepageUrl(ref.source_url) : false
}));

function tokens(text) {
  return new Set(String(text).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || []);
}

const sampledFacts = [];
for (const ref of refOutputs.slice(0, 3)) {
  const refPath = path.join(bundle, ref.path);
  if (!existsSync(refPath)) continue;
  const refRaw = readFileSync(refPath, 'utf8');
  const facts = extractSection(refRaw, 'Key Facts')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 2);
  const mappedTrail = allTrails.find((trail) => mapsTrailToRef(trail, ref));
  const pageRaw = mappedTrail && existsSync(path.join(bundle, mappedTrail, 'page.md'))
    ? readFileSync(path.join(bundle, mappedTrail, 'page.md'), 'utf8')
    : '';
  const pageTokens = tokens(pageRaw);
  for (const fact of facts) {
    const factTokens = [...tokens(fact)];
    const overlap = factTokens.filter((token) => pageTokens.has(token)).length;
    sampledFacts.push({
      reference: ref.path,
      fact,
      mapped_cache_trail: mappedTrail || null,
      lexical_overlap_tokens: overlap,
      checked: Boolean(mappedTrail && pageRaw),
      supported_by_cache_text: Boolean(mappedTrail && pageRaw && overlap >= Math.min(3, Math.max(1, Math.ceil(factTokens.length * 0.2))))
    });
  }
}

const gapFindings = [
  ...fileObservability.inspect.filter((line) => line.includes('[cache_gap]')),
  ...fileObservability.findings.filter((finding) => finding.classification === 'orphan_authority_blocking').map((finding) => finding.path),
  ...emptyTrailRefs.map((ref) => `empty_trail:${ref.path}`)
];

const metrics = {
  cache_trail_coverage: {
    references: refOutputs.length,
    mapped_references: mappedRefs.length,
    complete_trails: allTrails.filter(cacheLeafComplete).length,
    declared_trails: allTrails.length,
    percent: refOutputs.length > 0 ? Number(((mappedRefs.length / refOutputs.length) * 100).toFixed(1)) : 0
  },
  grounding_spot_check: {
    checked: sampledFacts.filter((fact) => fact.checked).length,
    supported_by_cache_text: sampledFacts.filter((fact) => fact.supported_by_cache_text).length,
    samples: sampledFacts
  },
  url_precision: {
    references: refOutputs.length,
    article_level: urlPrecision.filter((entry) => entry.article_level).length,
    details: urlPrecision
  },
  countable_rate: {
    declared_references: refOutputs.length,
    countable_references: refCount.count,
    percent: refOutputs.length > 0 ? Number(((refCount.count / refOutputs.length) * 100).toFixed(1)) : 0,
    uncountable: refCount.uncountable
  },
  gap_rate: {
    references: refOutputs.length,
    gaps: gapFindings.length,
    percent: refOutputs.length > 0 ? Number(((gapFindings.length / refOutputs.length) * 100).toFixed(1)) : 0,
    findings: gapFindings
  }
};
writeJson('case-163-quality-metrics.json', metrics);

recordPlaybookCheck(bundle, { gate: 'real-submit', passed: submit.ok === true, detail: workId });
recordPlaybookCheck(bundle, {
  gate: 'submitted-ledger-row',
  passed: submittedForWork.length === 1 && submittedForWork[0].cache_trails?.length > 0,
  detail: JSON.stringify(submittedForWork.map((row) => ({ work_id: row.work_id, queue_item_id: row.queue_item_id, cache_trails: row.cache_trails })))
});
recordPlaybookCheck(bundle, { gate: 'wave0-gate', passed: gateResult.status === 0 && gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'cache-coverage', passed: coverage.passed === true, detail: JSON.stringify(coverage.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'check-reentry', passed: reentryResult.status === 0, detail: JSON.stringify(reentry.inspect || reentry.blockers || []) });
recordPlaybookCheck(bundle, { gate: 'heavy-health', passed: healthResult.status === 0 && health.status === 'clean', detail: JSON.stringify(health.cache_trails || health) });
recordPlaybookCheck(bundle, { gate: 'cache-trail-coverage-metric', passed: metrics.cache_trail_coverage.references > 0 && metrics.cache_trail_coverage.percent === 100, detail: JSON.stringify(metrics.cache_trail_coverage) });
recordPlaybookCheck(bundle, { gate: 'grounding-spot-check-metric', passed: metrics.grounding_spot_check.checked > 0 && metrics.grounding_spot_check.supported_by_cache_text > 0, detail: JSON.stringify(metrics.grounding_spot_check) });
recordPlaybookCheck(bundle, { gate: 'url-precision-metric', passed: metrics.url_precision.references > 0 && metrics.url_precision.article_level === metrics.url_precision.references, detail: JSON.stringify(metrics.url_precision) });
recordPlaybookCheck(bundle, { gate: 'countable-rate-metric', passed: metrics.countable_rate.declared_references > 0 && metrics.countable_rate.percent === 100, detail: JSON.stringify(metrics.countable_rate) });
recordPlaybookCheck(bundle, { gate: 'gap-rate-metric', passed: metrics.gap_rate.gaps === 0, detail: JSON.stringify(metrics.gap_rate) });

console.log(JSON.stringify({ gate, reentry, health, metrics }, null, 2));
JS
```

Expected: the gate passes from submitted work-unit coverage, reentry and health are clean, cache coverage maps each declared reference to complete cache leaves, countable rate is 100%, URL precision is article-level, grounding spot-check has cache-text support, and gap rate is 0%.

## Step 7: [MAIN/SHELL] Trace Verdict

```bash
node --input-type=module - "$B" <<'JS'
import { writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
const verdict = writeTraceVerdict(bundle, 'case-163');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

Expected: PASS only when all submit, gate, reentry, health, and quality metric checks match their expected values.

## Step 8: [MAIN] Result Interpretation

PASS means a real Agent completed the rerun `action:add` source-intake path through the production work-unit boundary: claim, Agent result, submit, submitted ledger row, cache trail validation, Wave0 gate, reentry, health, and quality metrics. NOT_RUN means the real-Agent canary remains deferred. FAIL means the preserved bundle contains submit/gate/reentry/health/metric feedback for repair.

## Step 9: [MAIN/SHELL] Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B/case-163-verdict.json"
rm -rf "$B"
```

FAIL and NOT_RUN preserve the bundle.

## Optional Automation Smoke

The runner is an optional smoke for the same checkpoints. It must not replace Step 3 with fixture output.

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-163 --target-dir tests/.test-bundles
node experiments_env/shared/run-fixture-backed-case.mjs --case case-163 --real-result <result.json> --cleanup-pass
```

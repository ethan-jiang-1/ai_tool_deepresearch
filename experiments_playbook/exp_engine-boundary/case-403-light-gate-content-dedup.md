---
schema: command-experiment/v1
experiment: engine-boundary
case: case-403-light-gate-content-dedup
weight: light
case_goal: "验证 content_dedup gate 只从 submitted work-unit ledger 读取 delegated coverage：missing ledger/orphan fail，clean pass，URL duplicate/Jaccard/homepage fail。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-403_eb_dedup_work_unit
trace: dpt_disp_case-403_eb_dedup_work_unit/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Fixture-backed, no Agent actor, no external calls. Positive and negative delegated coverage must be created through real `operate-work-unit submit`; the missing-ledger case intentionally omits submit and must fail closed.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real `operate-work-unit submit` and Wave0 gate CLI |
| Fixture input | Controlled reference/source/cache files for gate-content scenarios |
| Agent actor | None; fixture-backed only |
| External calls | None |
| Gate input | `rb_output_declarations.jsonl` submitted work-unit rows |
| Orphan handling | Files without submitted work-unit coverage are diagnostics only |
| Verdict source | Gate JSON, trace JSONL `check` events, and runner report |
| Does not prove | Agent source selection or content-quality judgment |

# case-403-light-gate-content-dedup

## Expected Runtime Path

1. Create a disposable bundle through shared setup.
2. Reset per-scenario runtime state explicitly before each gate scenario.
3. For positive delegated coverage, submit fixture outputs through `operate-work-unit submit`.
4. For missing-ledger/orphan coverage, intentionally omit the submit boundary.
5. Run the Wave0 gate and parse its JSON as the primary feedback artifact.
6. Convert each gate result into trace `check` events with the correct expected outcome.
7. Print PASS/FAIL and clean up only on PASS.

## Step 1: [MAIN/SHELL] Create Runtime Context

Create a disposable bundle and Wave0 scaffold. Each gate scenario must explicitly reset its own runtime state before staging files.

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_dedup_work_unit --case case-403 --force)
echo "BUNDLE=$B"
```

Expected: the bundle path is printed.

## Step 2: [MAIN/SHELL] Reset Scenario State

Before each gate checkpoint, reset the queue, work-unit index, ledger, reference, artifact, and cache state. This makes each gate result depend on the current scenario, not stale files from an earlier scenario.

```bash
reset_case403() {
  SCENARIO="$1"
  node --input-type=module - "$B" "$SCENARIO" <<'JS'
import { rmSync } from 'node:fs';
import path from 'node:path';
import { writeWave0Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, scenario] = process.argv.slice(2);
for (const relPath of ['rb_queue.json', 'rb_output_declarations.jsonl', '_work_units', 'reference', 'artifacts', '_cache']) {
  rmSync(path.join(bundle, relPath), { recursive: true, force: true });
}
writeWave0Scaffold(bundle, {
  planBasename: `eb_dedup_${scenario}`,
  referenceRows: [
    '| 00-shared-a.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |',
    '| 00-shared-b.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |'
  ]
});
JS
}
```

Expected: reset itself does not submit work-unit coverage. The next step must create coverage through `operate-work-unit submit`, or intentionally leave it missing for the boundary case.

## Step 3: [MAIN/SHELL] Stage Coverage And Run Gate Feedback

Run each scenario separately. The controller captures the full Wave0 gate JSON into the bundle, reads `check.passed` plus `inspect[]`, and only then proceeds.

```bash
stage_case403() {
  SCENARIO="$1"
  node --input-type=module - "$B" "$SCENARIO" <<'JS'
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  claimWorkUnitsViaCli,
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  referenceContent,
  sourceYamlExtra,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, scenario] = process.argv.slice(2);
if (scenario === 'missing-ledger') {
  console.log(JSON.stringify({ scenario, staged: 'no submitted work-unit coverage' }, null, 2));
  process.exit(0);
}

const refsByScenario = {
  clean: [
    { path: 'reference/00-shared-a.md', url: 'https://research-source.test/clean/a', title: 'Clean A' }
  ],
  'url-duplicate': [
    { path: 'reference/00-shared-a.md', url: 'https://research-source.test/duplicate/article', title: 'Duplicate A' },
    { path: 'reference/00-shared-b.md', url: 'https://research-source.test/duplicate/article/', title: 'Duplicate B' }
  ],
  'jaccard-clone': [
    { path: 'reference/00-shared-a.md', url: 'https://research-source.test/clone/a', title: 'Clone A' },
    { path: 'reference/00-shared-b.md', url: 'https://research-source.test/clone/b', title: 'Clone B' }
  ],
  homepage: [
    { path: 'reference/00-shared-a.md', url: 'https://research-source.test/', title: 'Homepage' }
  ]
};

const refs = refsByScenario[scenario];
if (!refs) throw new Error(`Unknown scenario: ${scenario}`);

let cloneContent;
if (scenario === 'jaccard-clone') {
  cloneContent = referenceContent({
    source_url: 'https://research-source.test/clone/a',
    topic_slug: 'topic-a',
    title: 'Clone A'
  });
  refs[0].content = cloneContent;
  refs[1].content = cloneContent
    .replace('https://research-source.test/clone/a', 'https://research-source.test/clone/b')
    .replace('Clone A', 'Clone B');
}

enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  queue_item_id: `case403-${scenario}`,
  topic_slug: 'topic-a',
  title: `Gate content-dedup scenario: ${scenario}`
}), { fileName: `${scenario}.json` });
const claim = claimWorkUnitsViaCli(bundle, { phase: 'wave0' });
const workId = claim.claimed_work_ids[0];
if (!workId) throw new Error(`No work unit claimed for ${scenario}`);

const [first, ...rest] = refs;
const cacheTrails = refs.map((ref, index) => `_cache/wave0/primary/case403-${scenario}/${scenario}-${index + 1}`);
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: first.path,
  source_url: first.url,
  source_slug: `${scenario}-1`,
  output_content: first.content || referenceContent({
    source_url: first.url,
    topic_slug: 'topic-a',
    title: first.title
  }),
  extra_output_files: rest.map((ref, index) => ({
    path: ref.path,
    role: 'reference',
    source_url: ref.url,
    source_slug: `${scenario}-${index + 2}`,
    content: ref.content || referenceContent({
      source_url: ref.url,
      topic_slug: 'topic-a',
      title: ref.title
    })
  })).concat([sourceYamlExtra('topic-a', first.url, first.title || `${scenario} source`)]),
  cache_trails: cacheTrails
});
for (const [index, ref] of refs.entries()) {
  writeFileSync(path.join(bundle, cacheTrails[index], 'meta.json'), `${JSON.stringify({ url: ref.url })}\n`);
}
const submit = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
console.log(JSON.stringify({ scenario, work_id: workId, submit_ok: submit.ok }, null, 2));
JS
}

run_case403_gate() {
  SCENARIO="$1"
  EXPECTED_PASSED="$2"
  EXPECTED_TEXT="$3"

  reset_case403 "$SCENARIO"
  stage_case403 "$SCENARIO" > "$B/case-403-${SCENARIO}-stage.json"

  set +e
  node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-403-${SCENARIO}-gate.json"
  GATE_STATUS=$?
  set -e
  printf '%s\n' "$GATE_STATUS" > "$B/case-403-${SCENARIO}-gate.status"

  node - "$B" "$SCENARIO" "$EXPECTED_PASSED" "$EXPECTED_TEXT" <<'JS'
const fs = require('fs');
const [bundle, scenario, expectedPassedText, expectedText] = process.argv.slice(2);
const expectedPassed = expectedPassedText === 'true';
const status = Number(fs.readFileSync(`${bundle}/case-403-${scenario}-gate.status`, 'utf8'));
const gate = JSON.parse(fs.readFileSync(`${bundle}/case-403-${scenario}-gate.json`, 'utf8'));
const inspectText = JSON.stringify(gate.inspect || []);
const matched = gate.check?.passed === expectedPassed && (!expectedText || inspectText.includes(expectedText));
console.log(JSON.stringify({
  scenario,
  status,
  gate_passed: gate.check?.passed,
  expected_passed: expectedPassed,
  expected_text: expectedText,
  inspect: gate.inspect || []
}, null, 2));
process.exit(matched ? 0 : 1);
JS
}

run_case403_gate missing-ledger false "No submitted work-unit ledger rows"
run_case403_gate clean true ""
run_case403_gate url-duplicate false "URL duplicate"
run_case403_gate jaccard-clone false "Jaccard clone"
run_case403_gate homepage false "Homepage URL"
```

Expected: boundary rejections come from the gate JSON itself; expected failing scenarios are not represented by hardcoded trace success.

## Step 4: [MAIN/SHELL] Record Verdict Checks

Record trace `check` rows for `missing-ledger-fails`, `clean-pass`, `url-duplicate-fails`, `jaccard-clone-fails`, and `homepage-fails`. Boundary-fail scenarios count as PASS only when the gate actually rejects the runtime state for the expected reason.

```bash
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const scenarios = [
  ['missing-ledger', false, 'No submitted work-unit ledger rows', 'missing-ledger-fails'],
  ['clean', true, '', 'clean-pass'],
  ['url-duplicate', false, 'URL duplicate', 'url-duplicate-fails'],
  ['jaccard-clone', false, 'Jaccard clone', 'jaccard-clone-fails'],
  ['homepage', false, 'Homepage URL', 'homepage-fails'],
];

for (const [scenario, expectedPassed, expectedText, gateName] of scenarios) {
  const status = Number(readFileSync(`${bundle}/case-403-${scenario}-gate.status`, 'utf8'));
  const gate = JSON.parse(readFileSync(`${bundle}/case-403-${scenario}-gate.json`, 'utf8'));
  const inspectText = JSON.stringify(gate.inspect || []);
  const matched = gate.check?.passed === expectedPassed && (!expectedText || inspectText.includes(expectedText));
  recordPlaybookCheck(bundle, {
    gate: gateName,
    passed: matched,
    detail: `status=${status}, gate_passed=${gate.check?.passed}, inspect=${inspectText}`
  });
}

const verdict = writeTraceVerdict(bundle, 'case-403');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

Expected gate coverage:

- Missing submitted ledger fails closed.
- Clean submitted work-unit reference passes `wave0-complete`.
- Duplicate normalized URL fails.
- High-overlap Jaccard clone fails.
- Homepage/shallow URL fails.

## Step 5: [MAIN] Result Interpretation

PASS means Wave0 delegated coverage and content-dedup decisions are driven by submitted work-unit ledger rows and gate JSON, not by directory presence or Agent claims. FAIL means the Agent should repair the provenance/gate boundary and rerun the case from clean state.

## Step 6: [MAIN/SHELL] Cleanup

PASS removes the disposable bundle. FAIL preserves it for diagnosis.

## Optional Automation Smoke

This smoke command runs the same checkpoints for automation, but it is not the normative MD-controller execution surface:

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-403 --cleanup-pass
```

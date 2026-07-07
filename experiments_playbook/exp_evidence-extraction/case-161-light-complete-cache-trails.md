---
schema: command-experiment/v1
experiment: evidence-extraction
case: case-161-light-complete-cache-trails
weight: light
case_goal: "Prove work-unit submit cache trail validation: valid cache leaves are ledger-written; incomplete, unsafe, and parent cache paths reject without ledger append."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-161_eex_submit_cache_trails_*
trace: dpt_disp_case-161_eex_submit_cache_trails_*/rb_trace.jsonl
verdict: trace-jsonl
req: AGT-009, EEX-003, EEX-004
---

## Execution Contract

Fixture-backed Engine path. No Agent actor and no external calls. Fixture files may stand in for sub-agent output only after a real `operate-work-unit claim`; every accepted or rejected completion must pass through `operate-work-unit submit`. The verdict comes from saved submit JSON, submitted ledger rows, cache coverage checks, and trace `check` events.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | One real disposable bundle |
| Framework path | Real `operate-work-unit claim/submit`, Engine-written `rb_output_declarations.jsonl`, real `cache_coverage` helper |
| Fixture input | Controlled reference/cache/result files written after claim |
| Agent actor | None |
| External calls | None |
| Verdict source | submit JSON, ledger rows, cache coverage output, trace checks |
| Does not prove | Agent search quality, fetched page quality, or real recovery behavior |

# case-161-light-complete-cache-trails

## Expected Runtime Path

1. Create a disposable bundle.
2. Enqueue and claim a Wave0 source-intake work unit.
3. Write one valid reference plus complete `_cache/` leaf and submit it.
4. Verify the submitted ledger row contains the verified cache trail.
5. Claim three more work units and prove incomplete, escaped, and parent cache paths reject non-terminally with no extra ledger rows.
6. Verify `cache_coverage` passes for the valid submitted row.
7. Record trace-backed verdict and clean up only on PASS.

## Step 1: [MAIN/SHELL] Create Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eex_submit_cache_trails --case case-161 --force)
echo "$B"
```

## Step 2: [MAIN/SHELL] Valid Work-Unit Submit Writes Cache Trail To Ledger

```bash
node --input-type=module - "$B" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import {
  claimAndSubmitFixtureWorkUnit,
  queueItemForWorkUnit,
  readWorkUnitLedgerRows,
  recordPlaybookCheck,
  referenceContent,
  sourceYamlExtra,
  writeWave0Scaffold
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { checkCacheCoverage } from './DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs';

const bundle = process.argv[2];
writeWave0Scaffold(bundle, {
  planBasename: 'eex_submit_cache_trails',
  topics: [{ id: 't1', slug: 'topic-a', title: 'Topic A' }],
  referenceRows: ['| 00-shared-valid-cache.md | primary | expert | Tier 2 | topic-a | wave0_foundation | accepted | 2026-07-06 |']
});

const submitted = claimAndSubmitFixtureWorkUnit(bundle, {
  phase: 'wave0',
  task: queueItemForWorkUnit({ queue_item_id: 'case161-valid-cache', topic_slug: 'topic-a' }),
  output_path: 'reference/00-shared-valid-cache.md',
  source_url: 'https://research-source.test/topic-a/valid-cache',
  source_slug: 'valid-cache',
  output_content: referenceContent({ source_url: 'https://research-source.test/topic-a/valid-cache', topic_slug: 'topic-a', title: 'Valid Cache Trail' }),
  extra_output_files: [sourceYamlExtra('topic-a', 'https://research-source.test/topic-a/valid-cache', 'Valid Cache Trail')],
  cache_trails: ['_cache/wave0/primary/topic-a/valid-cache']
});

const rows = readWorkUnitLedgerRows(bundle);
const coverage = checkCacheCoverage(bundle);
writeFileSync(`${bundle}/case-161-valid-submit.json`, `${JSON.stringify({ submitted: submitted.submit, rows, coverage }, null, 2)}\n`);
recordPlaybookCheck(bundle, {
  gate: 'valid-cache-submit-ledger',
  passed: submitted.submit.ok === true && rows.length === 1 && rows[0].cache_trails.includes('_cache/wave0/primary/topic-a/valid-cache'),
  detail: JSON.stringify({ work_id: submitted.record.work_id, cache_trails: rows[0]?.cache_trails || [] })
});
recordPlaybookCheck(bundle, {
  gate: 'cache-coverage-valid-row',
  passed: coverage.passed === true,
  detail: JSON.stringify(coverage.inspect || [])
});
JS
```

## Step 3: [MAIN/SHELL] Invalid Cache Trails Reject Without Ledger Append

```bash
node --input-type=module - "$B" <<'JS'
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  enqueueWorkUnitTask,
  claimWorkUnitsViaCli,
  queueItemForWorkUnit,
  readWorkUnitLedgerRows,
  recordPlaybookCheck,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];

function rejected(label, mutate) {
  enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: `case161-${label}`, topic_slug: 'topic-a' }), { fileName: `${label}.json` });
  const claim = claimWorkUnitsViaCli(bundle, { phase: 'wave0' });
  const workId = claim.claimed_work_ids[0];
  const fixture = writeFixtureResultForWorkUnit(bundle, { work_id: workId, source_slug: label });
  mutate(fixture);
  const submit = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'submit', bundle, '--work-id', workId, '--result', fixture.resultPath], { encoding: 'utf8' });
  const parsed = JSON.parse(submit.stdout);
  return { label, status: submit.status, parsed };
}

const results = [
  rejected('incomplete-cache-leaf', ({ cache_trails }) => rmSync(path.join(bundle, cache_trails[0], 'page.md'), { force: true })),
  rejected('unsafe-cache-escape', ({ resultPath }) => {
    const result = JSON.parse(readFileSync(resultPath, 'utf8'));
    result.cache_trails = ['../outside-cache'];
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  }),
  rejected('unsafe-cache-parent', ({ resultPath, cache_trails }) => {
    const result = JSON.parse(readFileSync(resultPath, 'utf8'));
    result.cache_trails = [path.dirname(cache_trails[0])];
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  })
];
const rows = readWorkUnitLedgerRows(bundle);
writeFileSync(`${bundle}/case-161-invalid-submits.json`, `${JSON.stringify({ results, rows: rows.length }, null, 2)}\n`);
for (const result of results) {
  recordPlaybookCheck(bundle, {
    gate: `reject-${result.label}`,
    passed: result.status === 1 && result.parsed.last_submit_rejection?.reason_code === 'missing_cache',
    detail: JSON.stringify(result.parsed.last_submit_rejection || result.parsed)
  });
}
recordPlaybookCheck(bundle, {
  gate: 'invalid-cache-no-extra-ledger',
  passed: rows.length === 1,
  detail: `${rows.length} submitted ledger row(s)`
});
JS
```

## Step 4: [MAIN/SHELL] Trace Verdict

```bash
node --input-type=module - "$B" <<'JS'
import { writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
const verdict = writeTraceVerdict(bundle, 'case-161');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Step 5: [MAIN] Result Interpretation

PASS means work-unit submit is the cache-trail authority: complete cache leaves are ledger-written, while incomplete/unsafe/non-leaf cache paths reject before ledger append. It proves Engine validation only.

## Step 6: [MAIN/SHELL] Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B/case-161-verdict.json"
rm -rf "$B"
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-161 --target-dir tests/.test-bundles --cleanup-pass
```

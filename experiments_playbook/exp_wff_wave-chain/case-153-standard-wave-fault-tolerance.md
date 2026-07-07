---
schema: command-experiment/v1
experiment: wff-wave-chain
case: case-153-standard-wave-fault-tolerance
weight: light
case_goal: "Prove work-unit fault tolerance across invalid submit, fail, timeout, abandon, duplicate submit, stale binding, late submit rejection, and mixed provenance gate rejection."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-153_wft_*
trace: dpt_disp_case-153_wft_*/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001, RWE-007, RWE-008, RWE-009, RWE-010
---

## Execution Contract

Fixture-backed Engine fault-tolerance case. Each scenario uses a real disposable bundle and real framework CLIs. Fixture files may stand in for sub-agent output after claim, but every transition under test must go through `operate-work-unit` or the relevant wave gate. Failures are expected evidence; do not repair them inside the same scenario unless the scenario explicitly checks retry/idempotency.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Multiple real disposable bundles, one per fault family |
| Framework path | Real `operate-work-unit claim/submit/fail/timeout/abandon`, real Wave1 gate for mixed provenance |
| Fixture input | Controlled output/result/cache files written after claim |
| Agent actor | None; this proves Engine boundary behavior |
| External calls | None |
| Verdict source | CLI JSON, work-unit ledger/index state, gate JSON, trace checks |
| Does not prove | Real sub-agent recovery quality or semantic research quality |

# case-153-standard-wave-fault-tolerance

## Expected Runtime Path

1. Invalid submit bundle: missing receipt and invalid result reject non-terminally and append no ledger rows.
2. Fail/late-submit bundle: explicit fail closes the attempt; late submit rejects and logs `work_unit_late_submit_rejected`.
3. Timeout bundle: timeout requeues the same demand; retry claim allocates a new same-batch `work_id`.
4. Abandon bundle: abandon closes idempotently without retry; mismatched terminal repeat rejects.
5. Duplicate bundle: same-content duplicate submit is idempotent; changed duplicate content rejects with one ledger row preserved.
6. Stale binding bundle: stale manifest/snapshot submit rejects non-terminally with no ledger append.
7. Mixed provenance bundle: submitted Wave1 topic plus direct Wave1 artifact cannot pass the Wave1 gate.
8. Record one trace-backed verdict and clean up all bundles only on PASS.

## Step 1: [MAIN/SHELL] Invalid Submit Rejections

```bash
B_INVALID=$(node experiments_env/shared/new-disposable-bundle.mjs wft_invalid_submit --case case-153 --force)
node --input-type=module - "$B_INVALID" <<'JS'
import { rmSync, readFileSync, writeFileSync } from 'node:fs';
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];

async function one(label, mutate) {
  enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: `case153-${label}`, topic_slug: 'topic-a' }), { fileName: `${label}.json` });
  const claim = JSON.parse((await import('node:child_process')).spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
  const workId = claim.claimed_work_ids[0];
  const fixture = writeFixtureResultForWorkUnit(bundle, { work_id: workId, source_slug: label });
  mutate(fixture);
  const submit = (await import('node:child_process')).spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'submit', bundle, '--work-id', workId, '--result', fixture.resultPath], { encoding: 'utf8' });
  writeFileSync(`${bundle}/case-153-${label}-submit.json`, submit.stdout);
}

await one('missing-receipt', ({ record }) => rmSync(`${bundle}/${record.paths.runtime_receipt_ref}`, { force: true }));
await one('invalid-result', ({ resultPath }) => {
  const result = JSON.parse(readFileSync(resultPath, 'utf8'));
  delete result.kind;
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
});
JS
node - "$B_INVALID" <<'JS'
const fs = require('fs');
const bundle = process.argv[2];
const missing = JSON.parse(fs.readFileSync(`${bundle}/case-153-missing-receipt-submit.json`, 'utf8'));
const invalid = JSON.parse(fs.readFileSync(`${bundle}/case-153-invalid-result-submit.json`, 'utf8'));
const ledgerExists = fs.existsSync(`${bundle}/rb_output_declarations.jsonl`);
console.log(JSON.stringify({ missing: missing.last_submit_rejection?.reason_code, invalid: invalid.last_submit_rejection?.reason_code, ledgerExists }, null, 2));
process.exit(missing.last_submit_rejection?.reason_code === 'missing_receipt' && invalid.last_submit_rejection?.reason_code === 'invalid_result' && !ledgerExists ? 0 : 1);
JS
```

## Step 2: [MAIN/SHELL] Fail Closes Attempt And Late Submit Rejects

```bash
B_FAIL=$(node experiments_env/shared/new-disposable-bundle.mjs wft_fail_late --case case-153 --force)
node --input-type=module - "$B_FAIL" <<'JS'
import { writeFileSync, readFileSync } from 'node:fs';
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: 'case153-fail-late', topic_slug: 'topic-a' }), { fileName: 'fail-late.json' });
const claim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
const fixture = writeFixtureResultForWorkUnit(bundle, { work_id: workId, source_slug: 'fail-late' });
const failed = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'fail', bundle, '--work-id', workId, '--reason', 'sub-agent-error'], { encoding: 'utf8' });
const late = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'submit', bundle, '--work-id', workId, '--result', fixture.resultPath], { encoding: 'utf8' });
writeFileSync(`${bundle}/case-153-fail.json`, failed.stdout);
writeFileSync(`${bundle}/case-153-late-submit.json`, late.stdout);
const trace = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8');
console.log(JSON.stringify({ failed: JSON.parse(failed.stdout).status, lateStatus: JSON.parse(late.stdout).status, lateLogged: trace.includes('work_unit_late_submit_rejected') }, null, 2));
process.exit(JSON.parse(failed.stdout).status === 'failed' && JSON.parse(late.stdout).status === 'failed' && trace.includes('work_unit_late_submit_rejected') ? 0 : 1);
JS
```

## Step 3: [MAIN/SHELL] Timeout Retry Allocates New Same-Batch Work ID

```bash
B_TIMEOUT=$(node experiments_env/shared/new-disposable-bundle.mjs wft_timeout_retry --case case-153 --force)
node --input-type=module - "$B_TIMEOUT" <<'JS'
import { writeFileSync } from 'node:fs';
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: 'case153-timeout-retry', topic_slug: 'topic-a' }), { fileName: 'timeout-retry.json' });
const firstClaim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const firstWorkId = firstClaim.claimed_work_ids[0];
const timedOut = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'timeout', bundle, '--work-id', firstWorkId, '--reason', 'deadline-expired'], { encoding: 'utf8' }).stdout);
const retryClaim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const retryWorkId = retryClaim.claimed_work_ids[0];
const retryRecord = loadWorkUnitIndex(bundle).work_units[retryWorkId];
writeFileSync(`${bundle}/case-153-timeout-retry.json`, `${JSON.stringify({ firstWorkId, retryWorkId, timedOut, retryRecord }, null, 2)}\n`);
console.log(JSON.stringify({ firstWorkId, retryWorkId, timedOut, retryRecord }, null, 2));
process.exit(timedOut.retry_requeued === true && retryWorkId !== firstWorkId && retryRecord.attempt_index === 2 && retryRecord.batch_id === 'b000' ? 0 : 1);
JS
```

## Step 4: [MAIN/SHELL] Abandon Is Idempotent And Mismatched Terminal Repeat Rejects

```bash
B_ABANDON=$(node experiments_env/shared/new-disposable-bundle.mjs wft_abandon --case case-153 --force)
node --input-type=module - "$B_ABANDON" <<'JS'
import { writeFileSync } from 'node:fs';
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: 'case153-abandon', topic_slug: 'topic-a' }), { fileName: 'abandon.json' });
const claim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
const abandoned = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'abandon', bundle, '--work-id', workId, '--reason', 'operator-cancelled'], { encoding: 'utf8' }).stdout);
const duplicate = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'abandon', bundle, '--work-id', workId, '--reason', 'operator-cancelled'], { encoding: 'utf8' }).stdout);
const mismatch = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'fail', bundle, '--work-id', workId, '--reason', 'operator-cancelled'], { encoding: 'utf8' }).stdout);
writeFileSync(`${bundle}/case-153-abandon.json`, `${JSON.stringify({ abandoned, duplicate, mismatch }, null, 2)}\n`);
console.log(JSON.stringify({ abandoned, duplicate, mismatch }, null, 2));
process.exit(abandoned.status === 'abandoned' && duplicate.duplicate === true && mismatch.ok === false ? 0 : 1);
JS
```

## Step 5: [MAIN/SHELL] Duplicate Submit Idempotency And Content Mismatch

```bash
B_DUP=$(node experiments_env/shared/new-disposable-bundle.mjs wft_duplicate_submit --case case-153 --force)
node --input-type=module - "$B_DUP" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  readWorkUnitLedgerRows,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: 'case153-duplicate', topic_slug: 'topic-a' }), { fileName: 'duplicate.json' });
const claim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
const fixture = writeFixtureResultForWorkUnit(bundle, { work_id: workId, source_slug: 'duplicate' });
const first = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
const duplicate = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
const changed = JSON.parse(readFileSync(fixture.resultPath, 'utf8'));
changed.summary = 'changed duplicate content';
writeFileSync(fixture.resultPath, `${JSON.stringify(changed, null, 2)}\n`);
const mismatch = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'submit', bundle, '--work-id', workId, '--result', fixture.resultPath], { encoding: 'utf8' }).stdout);
const rows = readWorkUnitLedgerRows(bundle);
writeFileSync(`${bundle}/case-153-duplicate-submit.json`, `${JSON.stringify({ first, duplicate, mismatch, rows: rows.length }, null, 2)}\n`);
console.log(JSON.stringify({ first, duplicate, mismatch, rows: rows.length }, null, 2));
process.exit(first.ok === true && duplicate.duplicate === true && mismatch.reason_code === 'duplicate_content_mismatch' && rows.length === 1 ? 0 : 1);
JS
```

## Step 6: [MAIN/SHELL] Stale Binding Rejects Non-Terminally

```bash
B_STALE=$(node experiments_env/shared/new-disposable-bundle.mjs wft_stale_binding --case case-153 --force)
node --input-type=module - "$B_STALE" <<'JS'
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: 'case153-stale', topic_slug: 'topic-a' }), { fileName: 'stale.json' });
const claim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
const fixture = writeFixtureResultForWorkUnit(bundle, { work_id: workId, source_slug: 'stale' });
const manifestPath = path.join(bundle, fixture.record.paths.manifest_ref);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.queue_item.title = 'Changed after claim';
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const submit = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'submit', bundle, '--work-id', workId, '--result', fixture.resultPath], { encoding: 'utf8' }).stdout);
const index = loadWorkUnitIndex(bundle);
writeFileSync(`${bundle}/case-153-stale-binding.json`, `${JSON.stringify({ reason: submit.last_submit_rejection?.reason_code, status: index.work_units[workId].status, ledgerExists: existsSync(`${bundle}/rb_output_declarations.jsonl`) }, null, 2)}\n`);
console.log(JSON.stringify({ reason: submit.last_submit_rejection?.reason_code, status: index.work_units[workId].status, ledgerExists: existsSync(`${bundle}/rb_output_declarations.jsonl`) }, null, 2));
process.exit(submit.last_submit_rejection?.reason_code === 'stale_snapshot' && index.work_units[workId].status === 'claimed' && !existsSync(`${bundle}/rb_output_declarations.jsonl`) ? 0 : 1);
JS
```

## Step 7: [MAIN/SHELL] Mixed Provenance Cannot Pass Gate

```bash
B_MIXED=$(node experiments_env/shared/new-disposable-bundle.mjs wft_mixed_provenance --case case-153 --force)
node --input-type=module - "$B_MIXED" <<'JS'
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  appendTrace,
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  referenceContent,
  writeWave1Scaffold,
  writeWave1TopicArtifacts,
  writeFixtureResultForWorkUnit,
  submitWorkUnitViaCli
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
writeWave1Scaffold(bundle, {
  planBasename: 'wft_mixed_provenance',
  topics: [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 'to', slug: 'topic-orphan', title: 'Topic Orphan' }
  ]
});
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ phase: 'wave1', queue_item_id: 'wave1-deepen-topic-a', topic_slug: 'topic-a' }), { fileName: 'topic-a.json' });
const claim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave1'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
writeWave1TopicArtifacts(bundle, { id: 't1', topic_slug: 'topic-a', title: 'Topic A', source_url: 'https://research-source.test/topic-a/submitted' });
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/01-topic-a-deepening.md',
  source_url: 'https://research-source.test/topic-a/submitted',
  source_slug: 'topic-a-submitted',
  output_content: referenceContent({ source_url: 'https://research-source.test/topic-a/submitted', topic_slug: 'topic-a', title: 'Submitted Topic A' }),
  extra_output_files: [
    { path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary' },
    { path: 'artifacts/wave1/topic-a/question-list.md', role: 'question_list' }
  ],
  cache_trails: ['_cache/wave1/primary/topic-a/topic-a-submitted']
});
submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
writeWave1TopicArtifacts(bundle, { id: 'to', topic_slug: 'topic-orphan', title: 'Topic Orphan', source_url: 'https://research-source.test/topic-orphan/direct' });
mkdirSync(path.join(bundle, 'reference'), { recursive: true });
writeFileSync(path.join(bundle, 'reference/01-topic-orphan-direct.md'), referenceContent({
  source_url: 'https://research-source.test/topic-orphan/direct',
  topic_slug: 'topic-orphan',
  title: 'Direct Topic Orphan Reference'
}));
appendTrace(bundle, { event: 'wave1_completion', source: 'case-153-mixed-provenance' });
JS
set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle "$B_MIXED" --current-node phases/phase-wave1.md > "$B_MIXED/case-153-gate-mixed-provenance.json"
MIXED_GATE_STATUS=$?
set -e
node - "$B_MIXED/case-153-gate-mixed-provenance.json" "$MIXED_GATE_STATUS" <<'JS'
const fs = require('fs');
const [file, status] = process.argv.slice(2);
const gate = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(JSON.stringify({ status: Number(status), passed: gate.check?.passed, inspect: gate.inspect || [] }, null, 2));
process.exit(Number(status) === 1 && gate.check?.passed === false && /coverage|bypass|topic-orphan/i.test(JSON.stringify(gate.inspect || [])) ? 0 : 1);
JS
```

## Step 8: [MAIN/SHELL] Record Aggregated Verdict

```bash
node --input-type=module - "$B_INVALID" "$B_FAIL" "$B_TIMEOUT" "$B_ABANDON" "$B_DUP" "$B_STALE" "$B_MIXED" <<'JS'
import { readFileSync } from 'node:fs';
import { recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [invalid, fail, timeout, abandon, dup, stale, mixed] = process.argv.slice(2);
const missing = JSON.parse(readFileSync(`${invalid}/case-153-missing-receipt-submit.json`, 'utf8'));
const invalidResult = JSON.parse(readFileSync(`${invalid}/case-153-invalid-result-submit.json`, 'utf8'));
const failed = JSON.parse(readFileSync(`${fail}/case-153-fail.json`, 'utf8'));
const late = JSON.parse(readFileSync(`${fail}/case-153-late-submit.json`, 'utf8'));
const failTrace = readFileSync(`${fail}/rb_trace.jsonl`, 'utf8');
const timeoutResult = JSON.parse(readFileSync(`${timeout}/case-153-timeout-retry.json`, 'utf8'));
const abandonResult = JSON.parse(readFileSync(`${abandon}/case-153-abandon.json`, 'utf8'));
const duplicateResult = JSON.parse(readFileSync(`${dup}/case-153-duplicate-submit.json`, 'utf8'));
const staleResult = JSON.parse(readFileSync(`${stale}/case-153-stale-binding.json`, 'utf8'));
const mixedGate = JSON.parse(readFileSync(`${mixed}/case-153-gate-mixed-provenance.json`, 'utf8'));

recordPlaybookCheck(invalid, { gate: 'invalid-submit-rejected', passed: missing.last_submit_rejection?.reason_code === 'missing_receipt' && invalidResult.last_submit_rejection?.reason_code === 'invalid_result', detail: JSON.stringify({ missing: missing.last_submit_rejection, invalid: invalidResult.last_submit_rejection }) });
recordPlaybookCheck(invalid, { gate: 'fail-late-submit-rejected', passed: failed.status === 'failed' && late.status === 'failed' && failTrace.includes('work_unit_late_submit_rejected'), detail: JSON.stringify({ failed, late }) });
recordPlaybookCheck(invalid, { gate: 'timeout-retry-verified', passed: timeoutResult.timedOut?.retry_requeued === true && timeoutResult.retryWorkId !== timeoutResult.firstWorkId && timeoutResult.retryRecord?.attempt_index === 2 && timeoutResult.retryRecord?.batch_id === 'b000', detail: JSON.stringify(timeoutResult) });
recordPlaybookCheck(invalid, { gate: 'abandon-idempotent-verified', passed: abandonResult.abandoned?.status === 'abandoned' && abandonResult.duplicate?.duplicate === true && abandonResult.mismatch?.ok === false, detail: JSON.stringify(abandonResult) });
recordPlaybookCheck(invalid, { gate: 'duplicate-submit-verified', passed: duplicateResult.first?.ok === true && duplicateResult.duplicate?.duplicate === true && duplicateResult.mismatch?.reason_code === 'duplicate_content_mismatch' && duplicateResult.rows === 1, detail: JSON.stringify(duplicateResult) });
recordPlaybookCheck(invalid, { gate: 'stale-binding-verified', passed: staleResult.reason === 'stale_snapshot' && staleResult.status === 'claimed' && staleResult.ledgerExists === false, detail: JSON.stringify(staleResult) });
recordPlaybookCheck(invalid, { gate: 'mixed-provenance-no-pass', passed: mixedGate.check?.passed === false, detail: JSON.stringify(mixedGate.inspect || []) });
const verdict = writeTraceVerdict(invalid, 'case-153');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Step 9: [MAIN] Result Interpretation

PASS means every work-unit fault family is fail-closed or idempotent as designed, and mixed direct/submitted delegated provenance cannot pass a wave gate. The playbook proves Engine boundaries only; it does not prove that a real sub-agent can recover from these faults without additional Agent work.

## Step 10: [MAIN/SHELL] Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B_INVALID/case-153-verdict.json"
rm -rf "$B_INVALID" "$B_FAIL" "$B_TIMEOUT" "$B_ABANDON" "$B_DUP" "$B_STALE" "$B_MIXED"
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-153 --target-dir tests/.test-bundles --cleanup-pass
```

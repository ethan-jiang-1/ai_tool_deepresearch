---
schema: command-experiment/v2
experiment: wff-wave-chain
case: case-153-standard-wave-fault-tolerance
case_goal: "Prove work-unit fault tolerance across invalid submit, fail, timeout, audited late-submit recovery, retry cleanup, replacement rejection, abandon, duplicate submit, stale binding, and mixed provenance gate rejection."
verdict_mode: all
required_checks: [abandon-idempotent-verified, audited-late-submit-covered, claimed-retry-superseded-by-late-submit, duplicate-submit-verified, fail-late-submit-rejected, invalid-submit-rejected, mixed-provenance-no-pass, stale-binding-verified, submitted-replacement-blocks-late-submit, timeout-retry-verified]
bundle_roles: [invalid-submit-verdict, fail-late-submit, audited-late-submit, claimed-retry-cleanup, replacement-blocks-late, timeout-retry, abandon, duplicate-submit, stale-binding, mixed-provenance]
verdict_role: invalid-submit-verdict
health_roles: [invalid-submit-verdict]
health_profile: standard
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: RWE-001, RWE-007, RWE-008, RWE-009, RWE-010, RWE-012
---

<!-- @impl EXA-005, EXA-006, PLR-003 -->

## Execution Contract

Fixture-backed Engine fault-tolerance case. Each scenario uses a real disposable bundle and real framework CLIs. Fixture files may stand in for sub-agent output after claim, but every transition under test must go through `operate-work-unit` or the relevant wave gate. Failures are expected evidence; do not repair them inside the same scenario unless the scenario explicitly checks retry/idempotency.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Multiple real disposable bundles, one per fault family |
| Framework path | Real `operate-work-unit claim/submit/late-submit/fail/timeout/abandon`, real Wave0 gate for audited late-submit coverage, real Wave1 gate for mixed provenance |
| Fixture input | Controlled output/result/cache files written after claim |
| Agent actor | None; this proves Engine boundary behavior |
| External calls | None |
| Verdict source | CLI JSON, work-unit ledger/index state, gate JSON, trace checks |
| Does not prove | Real sub-agent recovery quality or semantic research quality |

# case-153-standard-wave-fault-tolerance

## Expected Runtime Path

1. Invalid submit bundle: missing receipt and invalid result reject non-terminally and append no ledger rows.
2. Fail/normal-late-submit bundle: explicit fail closes the attempt; normal `submit` after terminal fail rejects and logs `work_unit_late_submit_rejected`.
3. Audited late-submit bundle: timed-out target first rejects normal `submit`, then explicit `late-submit` accepts, removes queued retry demand, writes an audited row, and passes Wave0 gate coverage from that row.
4. Claimed retry cleanup bundle: accepted `late-submit` abandons an unsubmitted claimed retry with `superseded_by_late_accept`.
5. Replacement submitted bundle: a submitted retry/replacement blocks `late-submit` for the original timed-out target.
6. Timeout bundle: timeout requeues the same demand; retry claim allocates a new same-batch `work_id`.
7. Abandon bundle: abandon closes idempotently without retry; mismatched terminal repeat rejects.
8. Duplicate bundle: same-content duplicate submit is idempotent; changed duplicate content rejects with one ledger row preserved.
9. Stale binding bundle: stale manifest/snapshot submit rejects non-terminally with no ledger append.
10. Mixed provenance bundle: submitted Wave1 topic plus direct Wave1 artifact cannot pass the Wave1 gate.
11. Aggregate the stable facts into the healthy verdict bundle and publish one native completion. The Supervisor owns health and cleanup.

## Step 1: [MAIN/SHELL] Invalid Submit Rejections

```bash
B_INVALID=$(node experiments_env/shared/new-disposable-bundle.mjs wft_invalid_submit --case case-153 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role invalid-submit-verdict --path "$B_INVALID"
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
B_FAIL=$(node experiments_env/shared/new-disposable-bundle.mjs wft_fail_late --case case-153 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role fail-late-submit --path "$B_FAIL"
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

## Step 3: [MAIN/SHELL] Audited Late Submit Accepts Timed-Out Target

```bash
B_AUDITED=$(node experiments_env/shared/new-disposable-bundle.mjs wft_audited_late_submit --case case-153 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role audited-late-submit --path "$B_AUDITED"
node --input-type=module - "$B_AUDITED" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  enqueueWorkUnitTask,
  expireClaimedWorkUnit,
  queueItemForWorkUnit,
  readWorkUnitLedgerRows,
  sourceYamlExtra,
  writeFixtureResultForWorkUnit,
  writeWave0Scaffold
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave0Scaffold(bundle, { planBasename: 'wft_audited_late_submit' });
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: 'case153-audited-late', topic_slug: 'topic-a' }), { fileName: 'audited-late.json' });
const claim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
expireClaimedWorkUnit(bundle, workId);
const timedOut = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'timeout', bundle, '--work-id', workId, '--reason', 'deadline-expired-before-result-arrived'], { encoding: 'utf8' }).stdout);
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/00-shared-topic-a.md',
  source_url: 'https://research-source.test/topic-a/audited-late',
  source_slug: 'audited-late',
  extra_output_files: [
    sourceYamlExtra('topic-a', 'https://research-source.test/topic-a/audited-late', 'Audited Late Topic A Source')
  ]
});
const normal = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'submit', bundle, '--work-id', workId, '--result', fixture.resultPath], { encoding: 'utf8' });
const late = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'late-submit', bundle, '--work-id', workId, '--result', fixture.resultPath, '--reason', 'late result arrived after timeout before retry submitted'], { encoding: 'utf8' });
const gate = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs', '--bundle', bundle, '--current-node', 'phases/phase-wave0.md'], { encoding: 'utf8' });
writeFileSync(`${bundle}/case-153-gate-audited-late.json`, gate.stdout);
const rows = readWorkUnitLedgerRows(bundle);
const queue = JSON.parse(readFileSync(`${bundle}/rb_queue.json`, 'utf8'));
const out = { timedOut, normal: JSON.parse(normal.stdout), late: JSON.parse(late.stdout), rows, queue, gate: JSON.parse(gate.stdout) };
writeFileSync(`${bundle}/case-153-audited-late.json`, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ normalStatus: normal.status, lateStatus: late.status, row: rows[0], gateStatus: gate.status, gatePassed: out.gate.check?.passed }, null, 2));
process.exit(timedOut.retry_requeued === true && normal.status === 1 && late.status === 0 && out.late.late_accept === true && rows.length === 1 && rows[0].late_accept === true && rows[0].terminal_status_before_accept === 'timed_out' && gate.status === 0 && out.gate.check?.passed === true && !(queue.active_window || []).some((item) => item.queue_item_id === fixture.record.queue_item_id) ? 0 : 1);
JS
```

## Step 4: [MAIN/SHELL] Late Submit Abandons Claimed Retry

```bash
B_CLAIMED_RETRY=$(node experiments_env/shared/new-disposable-bundle.mjs wft_claimed_retry_cleanup --case case-153 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role claimed-retry-cleanup --path "$B_CLAIMED_RETRY"
node --input-type=module - "$B_CLAIMED_RETRY" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  enqueueWorkUnitTask,
  expireClaimedWorkUnit,
  queueItemForWorkUnit,
  readWorkUnitLedgerRows,
  sourceYamlExtra,
  writeFixtureResultForWorkUnit,
  writeWave0Scaffold
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';

const bundle = process.argv[2];
writeWave0Scaffold(bundle, { planBasename: 'wft_claimed_retry_cleanup' });
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: 'case153-claimed-retry-cleanup', topic_slug: 'topic-a' }), { fileName: 'claimed-retry-cleanup.json' });
const firstClaim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const targetWorkId = firstClaim.claimed_work_ids[0];
expireClaimedWorkUnit(bundle, targetWorkId);
const timedOut = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'timeout', bundle, '--work-id', targetWorkId, '--reason', 'deadline-expired-before-claimed-retry'], { encoding: 'utf8' }).stdout);
const retryClaim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const retryWorkId = retryClaim.claimed_work_ids[0];
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: targetWorkId,
  output_path: 'reference/00-shared-topic-a.md',
  source_url: 'https://research-source.test/topic-a/claimed-retry-cleanup',
  source_slug: 'claimed-retry-cleanup',
  extra_output_files: [
    sourceYamlExtra('topic-a', 'https://research-source.test/topic-a/claimed-retry-cleanup', 'Claimed Retry Cleanup Topic A Source')
  ]
});
const late = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'late-submit', bundle, '--work-id', targetWorkId, '--result', fixture.resultPath, '--reason', 'late result supersedes unsubmitted claimed retry'], { encoding: 'utf8' }).stdout);
const index = loadWorkUnitIndex(bundle);
const queue = JSON.parse(readFileSync(`${bundle}/rb_queue.json`, 'utf8'));
const rows = readWorkUnitLedgerRows(bundle);
const out = { timedOut, retryWorkId, late, retryRecord: index.work_units[retryWorkId], queue, rows };
writeFileSync(`${bundle}/case-153-claimed-retry-cleanup.json`, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ late, retryRecord: index.work_units[retryWorkId], rows: rows.length }, null, 2));
process.exit(timedOut.retry_requeued === true && late.late_accept === true && late.superseded_retry_work_ids.includes(retryWorkId) && index.work_units[retryWorkId].status === 'abandoned' && index.work_units[retryWorkId].terminal_reason === 'superseded_by_late_accept' && !queue.delegated_in_flight?.[fixture.record.queue_item_id] && rows.length === 1 && rows[0].work_id === targetWorkId ? 0 : 1);
JS
```

## Step 5: [MAIN/SHELL] Submitted Replacement Blocks Late Submit

```bash
B_REPLACEMENT=$(node experiments_env/shared/new-disposable-bundle.mjs wft_replacement_blocks_late --case case-153 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role replacement-blocks-late --path "$B_REPLACEMENT"
node --input-type=module - "$B_REPLACEMENT" <<'JS'
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  enqueueWorkUnitTask,
  expireClaimedWorkUnit,
  queueItemForWorkUnit,
  readWorkUnitLedgerRows,
  sourceYamlExtra,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit,
  writeWave0Scaffold
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave0Scaffold(bundle, { planBasename: 'wft_replacement_blocks_late' });
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: 'case153-replacement-blocks-late', topic_slug: 'topic-a' }), { fileName: 'replacement-blocks-late.json' });
const firstClaim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const targetWorkId = firstClaim.claimed_work_ids[0];
expireClaimedWorkUnit(bundle, targetWorkId);
const timedOut = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'timeout', bundle, '--work-id', targetWorkId, '--reason', 'deadline-expired-before-replacement'], { encoding: 'utf8' }).stdout);
const retryClaim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave0'], { encoding: 'utf8' }).stdout);
const replacementWorkId = retryClaim.claimed_work_ids[0];
const replacementFixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: replacementWorkId,
  output_path: 'reference/00-shared-topic-a.md',
  source_url: 'https://research-source.test/topic-a/replacement',
  source_slug: 'replacement',
  extra_output_files: [
    sourceYamlExtra('topic-a', 'https://research-source.test/topic-a/replacement', 'Submitted Replacement Topic A Source')
  ]
});
const replacementSubmit = submitWorkUnitViaCli(bundle, { work_id: replacementWorkId, resultPath: replacementFixture.resultPath });
const lateTargetFixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: targetWorkId,
  output_path: 'reference/case153-late-target-after-replacement.md',
  source_url: 'https://research-source.test/topic-a/late-target-after-replacement',
  source_slug: 'late-target-after-replacement'
});
const late = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'late-submit', bundle, '--work-id', targetWorkId, '--result', lateTargetFixture.resultPath, '--reason', 'late result arrived after replacement submitted'], { encoding: 'utf8' });
const rows = readWorkUnitLedgerRows(bundle);
const out = { timedOut, replacementWorkId, replacementSubmit, late: JSON.parse(late.stdout), rows };
writeFileSync(`${bundle}/case-153-replacement-blocks-late.json`, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ replacementSubmit, late: JSON.parse(late.stdout), rows: rows.map((row) => row.work_id) }, null, 2));
process.exit(timedOut.retry_requeued === true && replacementSubmit.ok === true && late.status === 1 && JSON.parse(late.stdout).reason_code === 'submitted_replacement_conflict' && rows.length === 1 && rows[0].work_id === replacementWorkId ? 0 : 1);
JS
```

## Step 6: [MAIN/SHELL] Timeout Retry Allocates New Same-Batch Work ID

```bash
B_TIMEOUT=$(node experiments_env/shared/new-disposable-bundle.mjs wft_timeout_retry --case case-153 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role timeout-retry --path "$B_TIMEOUT"
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

## Step 7: [MAIN/SHELL] Abandon Is Idempotent And Mismatched Terminal Repeat Rejects

```bash
B_ABANDON=$(node experiments_env/shared/new-disposable-bundle.mjs wft_abandon --case case-153 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role abandon --path "$B_ABANDON"
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

## Step 8: [MAIN/SHELL] Duplicate Submit Idempotency And Content Mismatch

```bash
B_DUP=$(node experiments_env/shared/new-disposable-bundle.mjs wft_duplicate_submit --case case-153 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role duplicate-submit --path "$B_DUP"
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

## Step 9: [MAIN/SHELL] Stale Binding Rejects Non-Terminally

```bash
B_STALE=$(node experiments_env/shared/new-disposable-bundle.mjs wft_stale_binding --case case-153 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role stale-binding --path "$B_STALE"
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

## Step 10: [MAIN/SHELL] Mixed Provenance Cannot Pass Gate

```bash
B_MIXED=$(node experiments_env/shared/new-disposable-bundle.mjs wft_mixed_provenance --case case-153 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role mixed-provenance --path "$B_MIXED"
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

## Step 11: [MAIN/SHELL] Record Aggregated Verdict

```bash
B_INVALID=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role invalid-submit-verdict)
B_FAIL=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role fail-late-submit)
B_AUDITED=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role audited-late-submit)
B_CLAIMED_RETRY=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role claimed-retry-cleanup)
B_REPLACEMENT=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role replacement-blocks-late)
B_TIMEOUT=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role timeout-retry)
B_ABANDON=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role abandon)
B_DUP=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role duplicate-submit)
B_STALE=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role stale-binding)
B_MIXED=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role mixed-provenance)
node --input-type=module - "$B_INVALID" "$B_FAIL" "$B_AUDITED" "$B_CLAIMED_RETRY" "$B_REPLACEMENT" "$B_TIMEOUT" "$B_ABANDON" "$B_DUP" "$B_STALE" "$B_MIXED" <<'JS'
import { readFileSync } from 'node:fs';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [invalid, fail, audited, claimedRetry, replacement, timeout, abandon, dup, stale, mixed] = process.argv.slice(2);
const missing = JSON.parse(readFileSync(`${invalid}/case-153-missing-receipt-submit.json`, 'utf8'));
const invalidResult = JSON.parse(readFileSync(`${invalid}/case-153-invalid-result-submit.json`, 'utf8'));
const failed = JSON.parse(readFileSync(`${fail}/case-153-fail.json`, 'utf8'));
const late = JSON.parse(readFileSync(`${fail}/case-153-late-submit.json`, 'utf8'));
const failTrace = readFileSync(`${fail}/rb_trace.jsonl`, 'utf8');
const auditedLate = JSON.parse(readFileSync(`${audited}/case-153-audited-late.json`, 'utf8'));
const claimedRetryLate = JSON.parse(readFileSync(`${claimedRetry}/case-153-claimed-retry-cleanup.json`, 'utf8'));
const replacementBlocked = JSON.parse(readFileSync(`${replacement}/case-153-replacement-blocks-late.json`, 'utf8'));
const timeoutResult = JSON.parse(readFileSync(`${timeout}/case-153-timeout-retry.json`, 'utf8'));
const abandonResult = JSON.parse(readFileSync(`${abandon}/case-153-abandon.json`, 'utf8'));
const duplicateResult = JSON.parse(readFileSync(`${dup}/case-153-duplicate-submit.json`, 'utf8'));
const staleResult = JSON.parse(readFileSync(`${stale}/case-153-stale-binding.json`, 'utf8'));
const mixedGate = JSON.parse(readFileSync(`${mixed}/case-153-gate-mixed-provenance.json`, 'utf8'));

recordPlaybookCheck(invalid, { gate: 'invalid-submit-rejected', passed: missing.last_submit_rejection?.reason_code === 'missing_receipt' && invalidResult.last_submit_rejection?.reason_code === 'invalid_result', detail: JSON.stringify({ missing: missing.last_submit_rejection, invalid: invalidResult.last_submit_rejection }) });
recordPlaybookCheck(invalid, { gate: 'fail-late-submit-rejected', passed: failed.status === 'failed' && late.status === 'failed' && failTrace.includes('work_unit_late_submit_rejected'), detail: JSON.stringify({ failed, late }) });
recordPlaybookCheck(invalid, { gate: 'audited-late-submit-covered', passed: auditedLate.normal.status === 'timed_out' && auditedLate.late.late_accept === true && auditedLate.rows.length === 1 && auditedLate.rows[0].late_accept === true && auditedLate.gate.check?.passed === true, detail: JSON.stringify({ late: auditedLate.late, row: auditedLate.rows[0], gate: auditedLate.gate.check }) });
recordPlaybookCheck(invalid, { gate: 'claimed-retry-superseded-by-late-submit', passed: claimedRetryLate.late.late_accept === true && claimedRetryLate.retryRecord?.status === 'abandoned' && claimedRetryLate.retryRecord?.terminal_reason === 'superseded_by_late_accept' && claimedRetryLate.rows.length === 1, detail: JSON.stringify({ late: claimedRetryLate.late, retryRecord: claimedRetryLate.retryRecord }) });
recordPlaybookCheck(invalid, { gate: 'submitted-replacement-blocks-late-submit', passed: replacementBlocked.replacementSubmit?.ok === true && replacementBlocked.late?.reason_code === 'submitted_replacement_conflict' && replacementBlocked.rows.length === 1 && replacementBlocked.rows[0].work_id === replacementBlocked.replacementWorkId, detail: JSON.stringify({ replacementWorkId: replacementBlocked.replacementWorkId, late: replacementBlocked.late }) });
recordPlaybookCheck(invalid, { gate: 'timeout-retry-verified', passed: timeoutResult.timedOut?.retry_requeued === true && timeoutResult.retryWorkId !== timeoutResult.firstWorkId && timeoutResult.retryRecord?.attempt_index === 2 && timeoutResult.retryRecord?.batch_id === 'b000', detail: JSON.stringify(timeoutResult) });
recordPlaybookCheck(invalid, { gate: 'abandon-idempotent-verified', passed: abandonResult.abandoned?.status === 'abandoned' && abandonResult.duplicate?.duplicate === true && abandonResult.mismatch?.ok === false, detail: JSON.stringify(abandonResult) });
recordPlaybookCheck(invalid, { gate: 'duplicate-submit-verified', passed: duplicateResult.first?.ok === true && duplicateResult.duplicate?.duplicate === true && duplicateResult.mismatch?.reason_code === 'duplicate_content_mismatch' && duplicateResult.rows === 1, detail: JSON.stringify(duplicateResult) });
recordPlaybookCheck(invalid, { gate: 'stale-binding-verified', passed: staleResult.reason === 'stale_snapshot' && staleResult.status === 'claimed' && staleResult.ledgerExists === false, detail: JSON.stringify(staleResult) });
recordPlaybookCheck(invalid, { gate: 'mixed-provenance-no-pass', passed: mixedGate.check?.passed === false, detail: JSON.stringify(mixedGate.inspect || []) });
console.log(JSON.stringify({ status: 'checks-recorded', verdict_bundle: invalid }, null, 2));
JS
```

## Step 12: [MAIN/SHELL] Native Completion

```bash
B_INVALID=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role invalid-submit-verdict)
B_FAIL=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role fail-late-submit)
B_AUDITED=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role audited-late-submit)
B_CLAIMED_RETRY=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role claimed-retry-cleanup)
B_REPLACEMENT=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role replacement-blocks-late)
B_TIMEOUT=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role timeout-retry)
B_ABANDON=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role abandon)
B_DUP=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role duplicate-submit)
B_STALE=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role stale-binding)
B_MIXED=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role mixed-provenance)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs \
  --context {{RUN_CONTEXT_SH}} \
  --bundle "invalid-submit-verdict=$B_INVALID" \
  --bundle "fail-late-submit=$B_FAIL" \
  --bundle "audited-late-submit=$B_AUDITED" \
  --bundle "claimed-retry-cleanup=$B_CLAIMED_RETRY" \
  --bundle "replacement-blocks-late=$B_REPLACEMENT" \
  --bundle "timeout-retry=$B_TIMEOUT" \
  --bundle "abandon=$B_ABANDON" \
  --bundle "duplicate-submit=$B_DUP" \
  --bundle "stale-binding=$B_STALE" \
  --bundle "mixed-provenance=$B_MIXED"
```

## Step 13: [MAIN] Result Interpretation

PASS means every work-unit fault family is fail-closed or idempotent as designed, and mixed direct/submitted delegated provenance cannot pass a wave gate. The playbook proves Engine boundaries only; it does not prove that a real sub-agent can recover from these faults without additional Agent work.

The Supervisor health-checks only the `invalid-submit-verdict` bundle, retains all ten role-bound trace prefixes in durable audit/evidence when cleanup is requested, and owns cleanup of the complete case run root.

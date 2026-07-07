---
schema: command-experiment/v1
experiment: engine-boundary
case: case-402-light-complete-reject
weight: light
case_goal: "验证 invalid work-unit submit fail-closed：缺 receipt、缺 output、缺 cache、nonce mismatch、wrong work_id 均不写 ledger。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-402_eb_reject_work_unit
trace: dpt_disp_case-402_eb_reject_work_unit/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Fixture-backed, no Agent actor, no external calls. Each negative scenario must allocate a real work unit and call real `operate-work-unit submit`; failure is valid only when the CLI rejects the submit without queue completion or ledger append.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real `operate-queue enqueue`, `operate-work-unit claim`, and `operate-work-unit submit` |
| Fixture input | Mutated fixture result/receipt/output/cache files after claim |
| Agent actor | None; fixture-backed only |
| External calls | None |
| Rejection source | `operate-work-unit submit` JSON/exit code |
| Ledger rule | Rejected submits must leave `rb_output_declarations.jsonl` empty |
| Verdict source | Trace JSONL `check` events and runner report |
| Does not prove | Agent repair quality or semantic research quality |

# case-402-light-complete-reject

## Expected Runtime Path

1. Create a disposable bundle through shared setup.
2. For each negative submit scenario, enqueue and claim a fresh delegated work unit.
3. Stage one controlled defect in the claimed work-unit output surface.
4. Call `operate-work-unit submit` and read its JSON/exit result.
5. Confirm the attempt remains non-terminal and no submitted ledger row is appended.
6. Record each rejection and the empty-ledger invariant as trace `check` events.
7. Print PASS/FAIL and clean up only on PASS.

## Step 1: [MAIN/SHELL] Create Runtime Context

Create a disposable bundle and Wave0 scaffold exactly as in `case-401`, then keep the bundle open while each negative scenario runs independently.

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_reject_work_unit --case case-402 --force)
node --input-type=module - "$B" <<'JS'
import { writeWave0Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';
writeWave0Scaffold(process.argv[2], { planBasename: 'eb_reject_work_unit' });
JS
echo "BUNDLE=$B"
```

Expected: the bundle path is printed. No delegated work has completed yet.

## Step 2: [MAIN/SHELL] Run Rejection Checkpoints One At A Time

Run each boundary scenario as its own claim -> fixture defect -> submit -> JSON feedback checkpoint. The loop below is visible controller flow: after each submit, read the Engine JSON and stop if the rejection reason is not the expected one.

```bash
for LABEL in missing-receipt missing-output missing-cache nonce-mismatch wrong-work-id; do
  case "$LABEL" in
    missing-receipt) EXPECTED_CODE=missing_receipt ;;
    missing-output) EXPECTED_CODE=missing_output ;;
    missing-cache) EXPECTED_CODE=missing_cache ;;
    nonce-mismatch) EXPECTED_CODE=nonce_mismatch ;;
    wrong-work-id) EXPECTED_CODE=wrong_work_id ;;
  esac

  STAGE_JSON=$(node --input-type=module - "$B" "$LABEL" <<'JS'
import { rmSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  claimWorkUnitsViaCli,
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, label] = process.argv.slice(2);
const task = queueItemForWorkUnit({
  queue_item_id: `case402-${label}`,
  topic_slug: 'topic-a',
  title: `Invalid submit boundary: ${label}`
});
enqueueWorkUnitTask(bundle, task, { fileName: `${label}.json` });

const claim = claimWorkUnitsViaCli(bundle, { phase: 'wave0' });
const workId = claim.claimed_work_ids[0];
if (!workId) throw new Error(`No work unit claimed for ${label}`);

const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  source_url: `https://research-source.test/${label}/article`,
  source_slug: label
});

if (label === 'missing-receipt') {
  rmSync(path.join(bundle, fixture.record.paths.runtime_receipt_ref), { force: true });
} else if (label === 'missing-output') {
  rmSync(path.join(bundle, fixture.outputPath), { force: true });
} else if (label === 'missing-cache') {
  rmSync(path.join(bundle, fixture.cache_trails[0], 'meta.json'), { force: true });
} else if (label === 'nonce-mismatch') {
  const result = JSON.parse(readFileSync(fixture.resultPath, 'utf8'));
  result.receipt_nonce = 'nonce-mismatch-0000';
  writeFileSync(fixture.resultPath, `${JSON.stringify(result, null, 2)}\n`);
} else if (label === 'wrong-work-id') {
  const result = JSON.parse(readFileSync(fixture.resultPath, 'utf8'));
  result.work_id = 'wu-w0-b000-src-i9999';
  writeFileSync(fixture.resultPath, `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify({
  label,
  work_id: workId,
  result_path: fixture.resultPath,
  claim
}, null, 2));
JS
  )
  printf '%s\n' "$STAGE_JSON" > "$B/case-402-${LABEL}-stage.json"
  WORK_ID=$(printf '%s\n' "$STAGE_JSON" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.work_id);')
  RESULT_PATH=$(printf '%s\n' "$STAGE_JSON" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.result_path);')

  set +e
  SUBMIT_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$RESULT_PATH")
  SUBMIT_STATUS=$?
  set -e
  printf '%s\n' "$SUBMIT_JSON" > "$B/case-402-${LABEL}-submit.json"
  printf '%s\n' "$SUBMIT_STATUS" > "$B/case-402-${LABEL}-submit.status"

  node - "$B" "$LABEL" "$EXPECTED_CODE" <<'JS'
const fs = require('fs');
const [bundle, label, expectedCode] = process.argv.slice(2);
const status = Number(fs.readFileSync(`${bundle}/case-402-${label}-submit.status`, 'utf8'));
const submit = JSON.parse(fs.readFileSync(`${bundle}/case-402-${label}-submit.json`, 'utf8'));
const reason = submit.last_submit_rejection?.reason_code;
console.log(JSON.stringify({ label, status, reason, expectedCode }, null, 2));
process.exit(status === 1 && reason === expectedCode ? 0 : 1);
JS
done
```

Expected: every submit exits `1` with the listed `last_submit_rejection.reason_code`. Rejected attempts remain non-terminal; do not call `fail`, `timeout`, `abandon`, or queue completion for them.

## Step 3: [MAIN/SHELL] Record Verdict Checks

After all five checkpoints, read the submit JSON files and the submitted ledger. Record trace `check` rows for each expected rejection and one `no-ledger-on-reject` check, then derive the verdict from trace.

```bash
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import {
  readWorkUnitLedgerRows,
  recordPlaybookCheck,
  writeTraceVerdict
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const expected = new Map([
  ['missing-receipt', 'missing_receipt'],
  ['missing-output', 'missing_output'],
  ['missing-cache', 'missing_cache'],
  ['nonce-mismatch', 'nonce_mismatch'],
  ['wrong-work-id', 'wrong_work_id'],
]);

for (const [label, expectedCode] of expected) {
  const status = Number(readFileSync(`${bundle}/case-402-${label}-submit.status`, 'utf8'));
  const submit = JSON.parse(readFileSync(`${bundle}/case-402-${label}-submit.json`, 'utf8'));
  const reason = submit.last_submit_rejection?.reason_code;
  recordPlaybookCheck(bundle, {
    gate: `reject-${label}`,
    passed: status === 1 && reason === expectedCode,
    detail: `status=${status}, reason=${reason}, expected=${expectedCode}`
  });
}

const rows = readWorkUnitLedgerRows(bundle);
recordPlaybookCheck(bundle, {
  gate: 'no-ledger-on-reject',
  passed: rows.length === 0,
  detail: `${rows.length} submitted row(s)`
});

const verdict = writeTraceVerdict(bundle, 'case-402');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

Expected rejection coverage:

- Missing runtime receipt -> `missing_receipt`.
- Missing declared output file -> `missing_output`.
- Incomplete cache trail -> `missing_cache`.
- Receipt nonce mismatch -> `nonce_mismatch`.
- Wrong result `work_id` -> `wrong_work_id`.
- No rejected scenario appends a submitted work-unit ledger row.

## Step 4: [MAIN] Result Interpretation

PASS means invalid work-unit submits fail closed at the production submit boundary and cannot launder delegated success through a ledger row. FAIL means the Agent must treat the preserved bundle as a contract failure and repair the submit validation or ledger mutation boundary.

## Step 5: [MAIN/SHELL] Cleanup

PASS removes the disposable bundle. FAIL preserves it for diagnosis.

## Optional Automation Smoke

This smoke command runs the same checkpoints for automation, but it is not the normative MD-controller execution surface:

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-402 --cleanup-pass
```

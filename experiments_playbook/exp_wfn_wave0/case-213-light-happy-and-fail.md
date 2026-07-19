---
schema: command-experiment/v2
experiment: wfn-wave0
case: case-213-light-happy-and-fail
case_goal: "验证 Wave0 多 work-unit source intake、invalid/missing receipt、timeout retry、orphan output rejection，以及 gate pass 均由 submitted ledger coverage 决定。"
verdict_mode: all
required_checks: [invalid-result-rejected, missing-receipt-rejected, multi-claim-count, multi-gate-pass, multi-ledger-rows, multi-submit, orphan-output-gate-rejects, rejected-work-units-no-ledger, timeout-retry-new-work-id]
bundle_roles: [multi-work-unit-verdict, orphan-output]
verdict_role: multi-work-unit-verdict
health_roles: [multi-work-unit-verdict]
health_profile: heavy
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: RWE-001
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

Fixture-backed Engine case, no Agent actor, no external calls. Fixture outputs may be written only after work-unit claim and must pass through `operate-work-unit submit`. Invalid submits must be rejected by the production submit boundary and must not append ledger rows. Orphan/direct outputs must be tested in a separate disposable bundle so a prior successful Wave0 handoff cannot mask the provenance failure.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundles from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real `operate-queue enqueue`, `operate-work-unit claim/submit/timeout`, and Wave0 gate CLI |
| Fixture input | Controlled reference/source/cache files after claim |
| Agent actor | None; fixture-backed Engine evidence only |
| External calls | None |
| Happy path | Three Wave0 work units claimed together and submitted independently |
| Negative paths | Missing receipt, invalid result, timeout retry, and orphan output gate rejection |
| Verdict source | Trace JSONL checks, submit JSON, gate JSON, work-unit index/ledger state |
| Does not prove | Agent search, source selection, or semantic research quality |

# case-213-light-happy-and-fail

## Expected Runtime Path

1. Create a disposable Wave0 bundle with three topics.
2. Enqueue three source-intake queue demands.
3. Claim all three through one `operate-work-unit claim --count 3`.
4. Submit fixture-backed outputs through `operate-work-unit submit`.
5. Run Wave0 gate and confirm pass from three submitted ledger rows.
6. Run invalid submit checkpoints: missing receipt and invalid result.
7. Run no-progress expired timeout retry checkpoint and confirm retry uses a new same-batch `work_id`.
8. In a separate disposable bundle, stage orphan output without submit and confirm Wave0 gate rejects it.
9. Record all runtime facts as trace checks, invoke native completion, and stop; the Autorun Supervisor owns health, preservation, and any requested clean-PASS cleanup.

## Step 1: [MAIN/SHELL] Create Runtime Context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w0_multi_work_unit --case case-213 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role multi-work-unit-verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { writeWave0Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const topics = [
  { id: 't1', slug: 'topic-a', title: 'Topic A' },
  { id: 't2', slug: 'topic-b', title: 'Topic B' },
  { id: 't3', slug: 'topic-c', title: 'Topic C' }
];
writeWave0Scaffold(process.argv[2], {
  planBasename: 'w0_multi_work_unit',
  topics,
  referenceRows: topics.map((topic) => `| 00-shared-${topic.slug}.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |`)
});
JS
echo "BUNDLE=$B"
```

Expected: bundle has topic registry for `topic-a`, `topic-b`, and `topic-c`.

## Step 2: [MAIN/SHELL] Enqueue And Claim Three Work Units

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role multi-work-unit-verdict)
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const topics = [
  { slug: 'topic-a', title: 'Topic A' },
  { slug: 'topic-b', title: 'Topic B' },
  { slug: 'topic-c', title: 'Topic C' }
];
for (const topic of topics) {
  enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
    queue_item_id: `wave0-source-${topic.slug}`,
    topic_slug: topic.slug,
    title: `Wave0 source intake for ${topic.title}`
  }), { fileName: `case213-${topic.slug}.json` });
}
JS

CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 3 --actor-outcome available --actor-source native_probe --actor-role-key dpt-source-intake --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_JSON" > "$B/case-213-multi-claim.json"
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(`claimed_count=${j.claimed_count}`);
console.log(`claimed_work_ids=${j.claimed_work_ids.join(",")}`);
process.exit(j.claimed_count === 3 ? 0 : 1);
'
```

Expected: one Engine transaction claims three contiguous delegated queue-front items.

## Step 3: [MAIN/SHELL] Submit Three Fixture Results

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role multi-work-unit-verdict)
node --input-type=module - "$B" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import {
  referenceContent,
  sourceYamlExtra,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const claim = JSON.parse(readFileSync(`${bundle}/case-213-multi-claim.json`, 'utf8'));
const topics = ['topic-a', 'topic-b', 'topic-c'];
const submissions = [];
for (const [index, workId] of claim.claimed_work_ids.entries()) {
  const topicSlug = topics[index];
  const sourceUrl = `https://research-source.test/${topicSlug}/multi/${index + 1}`;
  const fixture = writeFixtureResultForWorkUnit(bundle, {
    work_id: workId,
    output_path: `reference/00-shared-${topicSlug}.md`,
    source_url: sourceUrl,
    source_slug: topicSlug,
    output_content: referenceContent({ source_url: sourceUrl, topic_slug: topicSlug, title: `${topicSlug} Fixture Source` }),
    extra_output_files: [sourceYamlExtra(topicSlug, sourceUrl, `${topicSlug} Fixture Source`)]
  });
  const submit = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
  submissions.push({ work_id: workId, topic_slug: topicSlug, submit });
}
writeFileSync(`${bundle}/case-213-multi-submit.json`, `${JSON.stringify(submissions, null, 2)}\n`);
console.log(JSON.stringify(submissions, null, 2));
process.exit(submissions.every((entry) => entry.submit.ok === true) ? 0 : 1);
JS
```

Expected: all three submits return `ok: true` and append exactly three submitted ledger rows.

## Step 4: [MAIN/SHELL] Gate Pass From Ledger Coverage

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role multi-work-unit-verdict)
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-213-gate-multi-happy.json"
node - "$B" <<'JS'
const fs = require('fs');
const bundle = process.argv[2];
const gate = JSON.parse(fs.readFileSync(`${bundle}/case-213-gate-multi-happy.json`, 'utf8'));
console.log(JSON.stringify({ passed: gate.check?.passed, inspect: gate.inspect || [] }, null, 2));
process.exit(gate.check?.passed === true ? 0 : 1);
JS
```

Expected: gate passes from submitted work-unit ledger coverage, not filesystem-only artifacts.

## Step 5: [MAIN/SHELL] Invalid Submit Checkpoints

Run two fresh claimed work units and prove submit rejects without ledger rows.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role multi-work-unit-verdict)
node --input-type=module - "$B" <<'JS'
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  claimWorkUnitsViaCli,
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
const repo = process.cwd();
const scenarios = [
  {
    label: 'missing-receipt',
    topicSlug: 'topic-a',
    mutate(fixture) {
      rmSync(path.join(bundle, fixture.record.paths.runtime_receipt_ref), { force: true });
    }
  },
  {
    label: 'invalid-result',
    topicSlug: 'topic-b',
    mutate(fixture) {
      const result = JSON.parse(readFileSync(fixture.resultPath, 'utf8'));
      delete result.kind;
      writeFileSync(fixture.resultPath, `${JSON.stringify(result, null, 2)}\n`);
    }
  }
];

const outcomes = [];
for (const scenario of scenarios) {
  enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
    queue_item_id: `case213-${scenario.label}`,
    topic_slug: scenario.topicSlug,
    title: `Invalid submit scenario ${scenario.label}`
  }), { fileName: `case213-${scenario.label}.json` });
  const claim = claimWorkUnitsViaCli(bundle, { phase: 'wave0' });
  const workId = claim.claimed_work_ids[0];
  const fixture = writeFixtureResultForWorkUnit(bundle, { work_id: workId, source_url: `https://research-source.test/${scenario.label}/article`, source_slug: scenario.label });
  scenario.mutate(fixture);
  const submit = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'submit', bundle, '--work-id', workId, '--result', fixture.resultPath], {
    cwd: repo,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  outcomes.push({
    label: scenario.label,
    work_id: workId,
    status: submit.status,
    submit: submit.stdout.trim() ? JSON.parse(submit.stdout) : null,
    stderr: submit.stderr
  });
}
writeFileSync(`${bundle}/case-213-invalid-submit.json`, `${JSON.stringify(outcomes, null, 2)}\n`);
console.log(JSON.stringify(outcomes, null, 2));
process.exit(outcomes.every((entry) => entry.status === 1) ? 0 : 1);
JS
```

Expected: missing receipt returns `reason_code: "missing_receipt"`, invalid result returns `reason_code: "invalid_result"`, and neither appends a ledger row.

## Step 6: [MAIN/SHELL] No-Progress Timeout Retry Checkpoint

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role multi-work-unit-verdict)
node --input-type=module - "$B" <<'JS'
import { writeFileSync } from 'node:fs';
import {
  claimWorkUnitsViaCli,
  closeWorkUnitViaCli,
  enqueueWorkUnitTask,
  expireClaimedWorkUnit,
  queueItemForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  queue_item_id: 'case213-timeout-retry',
  topic_slug: 'topic-c',
  title: 'Wave0 timeout retry proof'
}), { fileName: 'case213-timeout-retry.json' });

const firstClaim = claimWorkUnitsViaCli(bundle, { phase: 'wave0' });
const firstWorkId = firstClaim.claimed_work_ids[0];
expireClaimedWorkUnit(bundle, firstWorkId);
const timedOut = closeWorkUnitViaCli(bundle, { command: 'timeout', work_id: firstWorkId, reason: 'playbook-timeout-retry' });
const retryClaim = claimWorkUnitsViaCli(bundle, { phase: 'wave0' });
const retryWorkId = retryClaim.claimed_work_ids[0];
const retryRecord = loadWorkUnitIndex(bundle).work_units[retryWorkId];
const outcome = { firstWorkId, retryWorkId, timedOut, retryRecord };
writeFileSync(`${bundle}/case-213-timeout-retry.json`, `${JSON.stringify(outcome, null, 2)}\n`);
console.log(JSON.stringify(outcome, null, 2));
process.exit(timedOut.ok === true && retryWorkId !== firstWorkId && retryRecord?.attempt_index === 2 && retryRecord?.batch_id === 'b000' ? 0 : 1);
JS
```

Expected: after explicitly aging the no-progress claim past its idle lease, timeout closes the first attempt without ledger coverage and retry claim creates a new same-batch `work_id`.

## Step 7: [MAIN/SHELL] Orphan Output Gate Rejection In Fresh Bundle

Use a separate bundle so the earlier successful Wave0 gate handoff does not mask the orphan-output provenance check.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role multi-work-unit-verdict)
OB=$(node experiments_env/shared/new-disposable-bundle.mjs w0_orphan_output --case case-213 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role orphan-output --path "$OB"
node --input-type=module - "$OB" <<'JS'
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sourceYamlContent, writeWave0Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave0Scaffold(bundle, {
  planBasename: 'w0_orphan_output',
  topics: [{ id: 't4', slug: 'topic-orphan', title: 'Topic Orphan' }],
  referenceRows: ['| 00-shared-topic-orphan.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |']
});
mkdirSync(path.join(bundle, 'artifacts/wave0/topic-orphan'), { recursive: true });
writeFileSync(path.join(bundle, 'artifacts/wave0/topic-orphan/source.yaml'), sourceYamlContent({
  source_url: 'https://research-source.test/topic-orphan/direct',
  topic_slug: 'topic-orphan',
  title: 'Orphan Direct Source'
}));
JS
set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$OB" --current-node phases/phase-wave0.md > "$B/case-213-gate-orphan-output.json"
ORPHAN_GATE_STATUS=$?
set -e
printf '%s\n' "$ORPHAN_GATE_STATUS" > "$B/case-213-gate-orphan-output.status"
```

Expected: orphan bundle gate rejects because direct source output lacks submitted work-unit coverage.

## Step 8: [MAIN/SHELL] Record Verdict Checks

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role multi-work-unit-verdict)
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';
import { readWorkUnitLedgerRows, recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const claim = JSON.parse(readFileSync(`${bundle}/case-213-multi-claim.json`, 'utf8'));
const submissions = JSON.parse(readFileSync(`${bundle}/case-213-multi-submit.json`, 'utf8'));
const rowsAfterHappy = readWorkUnitLedgerRows(bundle).filter((row) => claim.claimed_work_ids.includes(row.work_id));
const happyGate = JSON.parse(readFileSync(`${bundle}/case-213-gate-multi-happy.json`, 'utf8'));
const invalid = JSON.parse(readFileSync(`${bundle}/case-213-invalid-submit.json`, 'utf8'));
const rejectedWorkIds = invalid.map((entry) => entry.work_id);
const rejectedRows = readWorkUnitLedgerRows(bundle).filter((row) => rejectedWorkIds.includes(row.work_id));
const retry = JSON.parse(readFileSync(`${bundle}/case-213-timeout-retry.json`, 'utf8'));
const orphanStatus = Number(readFileSync(`${bundle}/case-213-gate-orphan-output.status`, 'utf8'));
const orphanGate = JSON.parse(readFileSync(`${bundle}/case-213-gate-orphan-output.json`, 'utf8'));
const index = loadWorkUnitIndex(bundle);

recordPlaybookCheck(bundle, { gate: 'multi-claim-count', passed: claim.claimed_count === 3 && claim.claimed_work_ids.length === 3, detail: JSON.stringify(claim.claimed_work_ids) });
recordPlaybookCheck(bundle, { gate: 'multi-submit', passed: submissions.every((entry) => entry.submit.ok === true), detail: submissions.map((entry) => entry.work_id).join(', ') });
recordPlaybookCheck(bundle, { gate: 'multi-ledger-rows', passed: rowsAfterHappy.length === 3, detail: `${rowsAfterHappy.length} row(s)` });
recordPlaybookCheck(bundle, { gate: 'multi-gate-pass', passed: happyGate.check?.passed === true, detail: JSON.stringify(happyGate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'missing-receipt-rejected', passed: invalid.find((entry) => entry.label === 'missing-receipt')?.submit?.last_submit_rejection?.reason_code === 'missing_receipt', detail: JSON.stringify(invalid.find((entry) => entry.label === 'missing-receipt')?.submit?.last_submit_rejection || {}) });
recordPlaybookCheck(bundle, { gate: 'invalid-result-rejected', passed: invalid.find((entry) => entry.label === 'invalid-result')?.submit?.last_submit_rejection?.reason_code === 'invalid_result', detail: JSON.stringify(invalid.find((entry) => entry.label === 'invalid-result')?.submit?.last_submit_rejection || {}) });
recordPlaybookCheck(bundle, { gate: 'rejected-work-units-no-ledger', passed: rejectedRows.length === 0, detail: `${rejectedRows.length} rejected row(s)` });
recordPlaybookCheck(bundle, { gate: 'timeout-retry-new-work-id', passed: retry.timedOut.ok === true && retry.retryWorkId !== retry.firstWorkId && index.work_units[retry.retryWorkId]?.attempt_index === 2 && index.work_units[retry.retryWorkId]?.batch_id === 'b000', detail: `${retry.firstWorkId} -> ${retry.retryWorkId}` });
recordPlaybookCheck(bundle, { gate: 'orphan-output-gate-rejects', passed: orphanStatus === 1 && orphanGate.check?.passed === false && /coverage|bypass|topic-orphan/i.test(JSON.stringify(orphanGate.inspect || [])), detail: JSON.stringify(orphanGate.inspect || []) });

console.log('Recorded native checks; Supervisor finalizer is authoritative.');
JS
```

Expected: final verdict PASS.

## Step 9: [MAIN] Result Interpretation

PASS means Wave0 work-unit coverage supports multi-claim/multi-submit gate pass, invalid submit fail-closed behavior, timeout retry with a new work ID, and orphan output rejection. FAIL means the Agent must inspect the preserved bundle(s) and repair the exact submit/gate/queue boundary reported by JSON feedback.

## Step 10: [MAIN/SHELL] Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role multi-work-unit-verdict)
OB=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role orphan-output)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "multi-work-unit-verdict=$B" --bundle "orphan-output=$OB"
```

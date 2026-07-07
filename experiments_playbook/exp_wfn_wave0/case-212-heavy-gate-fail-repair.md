---
schema: command-experiment/v1
experiment: wfn-wave0
case: case-212-heavy-gate-fail-repair
weight: heavy
case_goal: "验证 Wave0 gate fail 后由 Engine 打开 repair/refill batch，新的 work unit 用 b001 提交后 gate pass。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-212_w0_gate_refill_repair
trace: dpt_disp_case-212_w0_gate_refill_repair/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001
---

## Execution Contract

Fixture-backed Engine case, no Agent actor, no external calls. The fixtures stand in only for source-intake output after a real work unit has been claimed. Completion authority must come from `operate-work-unit submit`; gate repair authority must come from gate JSON plus `operate-work-unit open-batch`.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real `operate-queue enqueue`, `operate-work-unit claim/submit/open-batch`, and Wave0 gate CLI |
| Fixture input | Controlled reference/source/cache files after claim |
| Agent actor | None; fixture-backed Engine evidence only |
| External calls | None |
| Gate feedback | Full Wave0 gate JSON is captured before repair |
| Repair path | `open-batch --reason gate_failure_refill`, then new b001 work-unit claim/submit |
| Verdict source | Trace JSONL checks, gate JSON, work-unit index/ledger state |
| Does not prove | Agent search quality or repair judgment quality |

# case-212-heavy-gate-fail-repair

## Expected Runtime Path

1. Create a disposable Wave0 bundle with topics `topic-a` and `topic-b`.
2. Submit fixture-backed work-unit coverage for `topic-a` only.
3. Run Wave0 gate and read JSON failure for missing `topic-b`.
4. Open repair/refill batch `b001` with `gate_failure_refill`.
5. Enqueue and claim `topic-b` repair work unit from the new batch.
6. Submit fixture-backed repair result through `operate-work-unit submit`.
7. Rerun Wave0 gate and read JSON pass.
8. Record fail/pass/repair checks into trace and clean up only on PASS.

## Step 1: [MAIN/SHELL] Create Runtime Context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w0_gate_refill_repair --case case-212 --force)
node --input-type=module - "$B" <<'JS'
import { writeWave0Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

writeWave0Scaffold(process.argv[2], {
  planBasename: 'w0_gate_refill_repair',
  topics: [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' }
  ],
  referenceRows: ['| 00-shared-topic-a.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |']
});
JS
echo "BUNDLE=$B"
```

Expected: the bundle contains two Wave0 topics but no submitted work-unit coverage yet.

## Step 2: [MAIN/SHELL] Submit Topic A Only

```bash
node --input-type=module - "$B" <<'JS'
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  referenceContent,
  sourceYamlExtra,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const task = queueItemForWorkUnit({
  queue_item_id: 'wave0-source-topic-a',
  topic_slug: 'topic-a',
  title: 'Wave0 source intake for Topic A'
});
enqueueWorkUnitTask(bundle, task, { fileName: 'case212-topic-a.json' });
JS

CLAIM_A=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1)
printf '%s\n' "$CLAIM_A" > "$B/case-212-topic-a-claim.json"
WORK_A=$(printf '%s\n' "$CLAIM_A" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.claimed_work_ids[0]);')
RESULT_A=$(node --input-type=module - "$B" "$WORK_A" <<'JS'
import {
  referenceContent,
  sourceYamlExtra,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const sourceUrl = 'https://research-source.test/topic-a/refill/a';
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/00-shared-topic-a.md',
  source_url: sourceUrl,
  source_slug: 'topic-a',
  output_content: referenceContent({ source_url: sourceUrl, topic_slug: 'topic-a', title: 'Topic A Fixture Source' }),
  extra_output_files: [sourceYamlExtra('topic-a', sourceUrl, 'Topic A Fixture Source')]
});
console.log(fixture.resultPath);
JS
)
SUBMIT_A=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_A" --result "$RESULT_A")
printf '%s\n' "$SUBMIT_A" > "$B/case-212-topic-a-submit.json"
```

Expected: topic-a submit returns `ok: true`, but topic-b remains uncovered.

## Step 3: [MAIN/SHELL] Run Gate And Read Failure

```bash
set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-212-gate-before-repair.json"
GATE_BEFORE_STATUS=$?
set -e
printf '%s\n' "$GATE_BEFORE_STATUS" > "$B/case-212-gate-before-repair.status"

node - "$B" <<'JS'
const fs = require('fs');
const bundle = process.argv[2];
const status = Number(fs.readFileSync(`${bundle}/case-212-gate-before-repair.status`, 'utf8'));
const gate = JSON.parse(fs.readFileSync(`${bundle}/case-212-gate-before-repair.json`, 'utf8'));
console.log(JSON.stringify({ status, passed: gate.check?.passed, inspect: gate.inspect || [] }, null, 2));
process.exit(status === 1 && gate.check?.passed === false && JSON.stringify(gate.inspect || []).includes('topic-b') ? 0 : 1);
JS
```

Expected: gate rejects and `inspect[]` points at missing/uncounted `topic-b` coverage.

## Step 4: [MAIN/SHELL] Open Repair Batch And Claim Topic B

```bash
OPENED=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch "$B" --phase wave0 --reason gate_failure_refill)
printf '%s\n' "$OPENED" > "$B/case-212-open-batch.json"

node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const task = queueItemForWorkUnit({
  queue_item_id: 'wave0-source-topic-b',
  topic_slug: 'topic-b',
  title: 'Repair Wave0 source intake for Topic B'
});
enqueueWorkUnitTask(bundle, task, { fileName: 'case212-topic-b-repair.json' });
JS

CLAIM_B=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1)
printf '%s\n' "$CLAIM_B" > "$B/case-212-topic-b-claim.json"
WORK_B=$(printf '%s\n' "$CLAIM_B" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.claimed_work_ids[0]);')
printf '%s\n' "$WORK_B" | grep -- '-b001-'
```

Expected: `open-batch` reports `batch_id: "b001"` and the repair claim work ID contains `-b001-`.

## Step 5: [MAIN/SHELL] Submit Repair Result

```bash
RESULT_B=$(node --input-type=module - "$B" "$WORK_B" <<'JS'
import {
  referenceContent,
  sourceYamlExtra,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const sourceUrl = 'https://research-source.test/topic-b/refill/b';
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/00-shared-topic-b.md',
  source_url: sourceUrl,
  source_slug: 'topic-b',
  output_content: referenceContent({ source_url: sourceUrl, topic_slug: 'topic-b', title: 'Topic B Repair Fixture Source' }),
  extra_output_files: [sourceYamlExtra('topic-b', sourceUrl, 'Topic B Repair Fixture Source')]
});
console.log(fixture.resultPath);
JS
)
SUBMIT_B=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_B" --result "$RESULT_B")
printf '%s\n' "$SUBMIT_B" > "$B/case-212-topic-b-submit.json"
```

Expected: repair submit returns `ok: true`.

## Step 6: [MAIN/SHELL] Rerun Gate And Record Verdict

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-212-gate-after-repair.json"

node --input-type=module - "$B" "$WORK_B" <<'JS'
import { readFileSync } from 'node:fs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';
import { readTrace, recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, repairWorkId] = process.argv.slice(2);
const failGate = JSON.parse(readFileSync(`${bundle}/case-212-gate-before-repair.json`, 'utf8'));
const opened = JSON.parse(readFileSync(`${bundle}/case-212-open-batch.json`, 'utf8'));
const claim = JSON.parse(readFileSync(`${bundle}/case-212-topic-b-claim.json`, 'utf8'));
const repairSubmit = JSON.parse(readFileSync(`${bundle}/case-212-topic-b-submit.json`, 'utf8'));
const passGate = JSON.parse(readFileSync(`${bundle}/case-212-gate-after-repair.json`, 'utf8'));
const repairRecord = loadWorkUnitIndex(bundle).work_units[repairWorkId];
const gateAttempts = readTrace(bundle).filter((event) => event.event === 'gate_attempt' && event.gate === 'wave0-complete');

recordPlaybookCheck(bundle, { gate: 'initial-gate-fails', passed: failGate.check?.passed === false && JSON.stringify(failGate.inspect || []).includes('topic-b'), detail: JSON.stringify(failGate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'repair-batch-opened', passed: opened.ok === true && opened.batch_id === 'b001' && opened.batch_reason === 'gate_failure_refill', detail: `${opened.batch_id}:${opened.batch_reason}` });
recordPlaybookCheck(bundle, { gate: 'repair-claim-uses-refill-batch', passed: claim.claimed_count === 1 && repairWorkId.includes('-b001-') && repairRecord?.attempt_index === 1, detail: repairWorkId });
recordPlaybookCheck(bundle, { gate: 'repair-submit', passed: repairSubmit.ok === true, detail: repairWorkId });
recordPlaybookCheck(bundle, { gate: 'repaired-gate-passes', passed: passGate.check?.passed === true, detail: JSON.stringify(passGate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'gate-attempts-fail-then-pass', passed: gateAttempts.some((event) => event.passed === false) && gateAttempts.some((event) => event.passed === true), detail: `${gateAttempts.length} gate_attempt event(s)` });

const verdict = writeTraceVerdict(bundle, 'case-212');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

Expected: final verdict PASS.

## Step 7: [MAIN] Result Interpretation

PASS means Wave0 gate feedback can drive a repair/refill batch: the first gate rejects missing coverage, the Engine opens `b001`, the repair work unit submits ledger coverage, and the second gate passes. FAIL means the preserved bundle contains the gate/open-batch/submit trace needed for repair.

## Step 8: [MAIN/SHELL] Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B/case-212-verdict.json"
rm -rf "$B"
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-212 --cleanup-pass
```

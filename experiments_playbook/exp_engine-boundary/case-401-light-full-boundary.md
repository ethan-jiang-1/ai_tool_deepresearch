---
schema: command-experiment/v1
experiment: engine-boundary
case: case-401-light-full-boundary
weight: light
case_goal: "验证 hardened Agent↔Engine 边界正向全链路：work-unit claim/submit → ledger → validate-bundle → wave0 gate → trace verdict。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-401_eb_full_work_unit
trace: dpt_disp_case-401_eb_full_work_unit/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Fixture-backed, no Agent actor, no external calls. The fixture may write controlled output, receipt, and cache files, but delegated state transition authority must come from real Engine CLIs:

```text
operate-queue enqueue -> operate-work-unit claim -> fixture output -> operate-work-unit submit -> ledger -> validate-bundle -> wave0 gate
```

Verdict sources are the runner verdict JSON, `rb_trace.jsonl`, `rb_output_declarations.jsonl`, `operate-work-unit inspect`, `validate-bundle`, and gate JSON. Filesystem output alone is not a verdict source.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real `operate-queue`, `operate-work-unit`, `validate-bundle`, and Wave0 gate CLIs |
| Fixture input | Controlled output, runtime receipt, and cache files after claim; Engine-layer evidence only |
| Agent actor | None; fixture-backed only |
| External calls | None |
| Ledger generation | Real `operate-work-unit submit` |
| Gate input | Submitted work-unit ledger rows plus cross-check surfaces |
| Verdict source | Trace JSONL `check` events, gate JSON, inspect JSON, and runner report |
| Does not prove | Agent search, evidence judgment, or research writing quality |

# case-401-light-full-boundary

## Expected Runtime Path

1. Create a disposable `dpt_disp_*` bundle through shared experiment infrastructure.
2. Validate and inspect the bundle before mechanism execution.
3. Enqueue one delegated Wave0 source-intake demand.
4. Claim a work unit through `operate-work-unit claim`.
5. Stage fixture output, receipt, and cache in the claimed work-unit envelope.
6. Submit through `operate-work-unit submit`; the Engine appends the submitted ledger row.
7. Run `validate-bundle`, `operate-work-unit inspect`, and the Wave0 gate.
8. Record verdict-affecting runtime facts as trace `check` events.
9. Print PASS/FAIL and clean up only on PASS.

## Step 1: [MAIN/SHELL] Create Runtime Context

Create a disposable bundle, then add only the minimal Wave0 scaffold required for the gate. This setup is deterministic experiment scaffolding; it does not complete delegated work.

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_full_work_unit --case case-401 --force)
node --input-type=module - "$B" <<'JS'
import { writeWave0Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';
writeWave0Scaffold(process.argv[2], { planBasename: 'eb_full_work_unit' });
JS
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
echo "BUNDLE=$B"
```

Expected: validate/inspect pass and the shell prints the bundle path.

## Step 2: [MAIN/SHELL] Enqueue And Claim

Enqueue one delegated Wave0 source-intake demand, then claim it through the production work-unit CLI. The controller must read the claim JSON before continuing.

```bash
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
const task = queueItemForWorkUnit({
  queue_item_id: 'wave0-source-topic-a',
  topic_slug: 'topic-a',
  title: 'Wave0 source intake for Topic A'
});
const result = enqueueWorkUnitTask(bundle, task, { fileName: 'case401-topic-a.json' });
console.log(JSON.stringify(result, null, 2));
JS

CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1)
printf '%s\n' "$CLAIM_JSON" > "$B/case-401-claim.json"
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(`claimed_count=${j.claimed_count}`);
console.log(`claimed_work_ids=${j.claimed_work_ids.join(",")}`);
process.exit(j.claimed_count === 1 ? 0 : 1);
'
WORK_ID=$(printf '%s\n' "$CLAIM_JSON" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.claimed_work_ids[0]);')
```

Expected: `claimed_count=1`. If no work unit is claimed, stop here and inspect queue state instead of fabricating output.

## Step 3: [MAIN/SHELL] Stage Fixture Result And Submit

This is the only fixture-backed part: the fixture writes output, runtime receipt, result JSON, and cache files for the claimed `work_id`. Completion authority still comes from `operate-work-unit submit`.

```bash
RESULT_PATH=$(node --input-type=module - "$B" "$WORK_ID" <<'JS'
import {
  referenceContent,
  sourceYamlExtra,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const sourceUrl = 'https://research-source.test/topic-a/article';
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

SUBMIT_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$RESULT_PATH")
printf '%s\n' "$SUBMIT_JSON" > "$B/case-401-submit.json"
printf '%s\n' "$SUBMIT_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(`submit_ok=${j.ok}`);
console.log(`status=${j.status}`);
process.exit(j.ok === true ? 0 : 1);
'
```

Expected: `submit_ok=true` and `status=submitted`. If submit rejects, read `last_submit_rejection` and repair the same claimed work unit instead of moving to the gate.

## Step 4: [MAIN/SHELL] Read Engine Feedback And Gate

Run each deterministic checkpoint separately and keep its JSON/stdout available to the controller.

```bash
set +e
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B" > "$B/case-401-validate.txt" 2>&1
VALIDATE_STATUS=$?
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-401-gate.json"
GATE_STATUS=$?
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect "$B" > "$B/case-401-inspect.json"
INSPECT_STATUS=$?
set -e

node - "$B" "$VALIDATE_STATUS" "$GATE_STATUS" "$INSPECT_STATUS" <<'JS'
const fs = require('fs');
const [bundle, validateStatus, gateStatus, inspectStatus] = process.argv.slice(2);
const gate = JSON.parse(fs.readFileSync(`${bundle}/case-401-gate.json`, 'utf8'));
const inspect = JSON.parse(fs.readFileSync(`${bundle}/case-401-inspect.json`, 'utf8'));
console.log(JSON.stringify({
  validate_status: Number(validateStatus),
  gate_status: Number(gateStatus),
  gate_passed: gate.check?.passed,
  gate_next: gate.check?.next,
  work_unit_inspect_status: Number(inspectStatus),
  work_unit_inspect_passed: inspect.passed
}, null, 2));
process.exit(Number(validateStatus) === 0 && gate.check?.passed === true && inspect.passed === true ? 0 : 1);
JS
```

Expected: validate exits `0`, gate JSON has `check.passed: true`, and work-unit inspect reports `passed: true`.

## Step 5: [MAIN/SHELL] Record Trace Checks

Convert the runtime facts the controller just read into trace `check` events, then derive the verdict from trace.

```bash
node --input-type=module - "$B" "$WORK_ID" <<'JS'
import { readFileSync } from 'node:fs';
import { readWorkUnitLedgerRows, recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const submit = JSON.parse(readFileSync(`${bundle}/case-401-submit.json`, 'utf8'));
const gate = JSON.parse(readFileSync(`${bundle}/case-401-gate.json`, 'utf8'));
const inspect = JSON.parse(readFileSync(`${bundle}/case-401-inspect.json`, 'utf8'));
const ledgerRows = readWorkUnitLedgerRows(bundle);

recordPlaybookCheck(bundle, { gate: 'work-unit-submit', passed: submit.ok === true, detail: workId });
recordPlaybookCheck(bundle, { gate: 'ledger-row', passed: ledgerRows.length === 1 && ledgerRows[0].work_id === workId, detail: `${ledgerRows.length} submitted row(s)` });
recordPlaybookCheck(bundle, { gate: 'wave0-gate', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'work-unit-inspect', passed: inspect.passed === true, detail: JSON.stringify(inspect.inspect || []) });

const verdict = writeTraceVerdict(bundle, 'case-401');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

Expected: verdict JSON says `PASS` and `case-401-verdict.json` is written inside the bundle.

## Step 6: [MAIN] Result Interpretation

Expected runtime facts:

- Work-unit submit succeeds and appends exactly one Engine-written ledger row.
- `validate-bundle` passes against the disposable bundle.
- `wave0-complete` passes from submitted work-unit coverage, not direct filesystem presence.
- `operate-work-unit inspect` passes after submit.

PASS means the fixture entered the production delegated path at the earliest executable boundary and downstream authority came from submitted work-unit coverage. FAIL means the Agent must treat the CLI/gate/trace feedback as actionable diagnostic context and repair the failing boundary before rerunning.

## Step 7: [MAIN/SHELL] Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B/case-401-verdict.json"
rm -rf "$B"
```

FAIL preserves the disposable bundle for diagnosis.

## Optional Automation Smoke

The case-local runner may be used after the visible MD-controller path above has been validated. It is a smoke/aggregation convenience, not the normative playbook execution surface:

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-401 --cleanup-pass
```

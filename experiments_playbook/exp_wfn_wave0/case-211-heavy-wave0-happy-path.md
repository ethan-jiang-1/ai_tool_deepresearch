---
schema: command-experiment/v1
experiment: wfn-wave0
case: case-211-heavy-wave0-happy-path
weight: heavy
case_goal: "验证真实 Wave0 source-intake Agent 结果只能通过 work-unit submit → ledger → Wave0 gate 形成 PASS；无真实结果时记录 NOT_RUN。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-211_w0_real_agent_work_unit
trace: dpt_disp_case-211_w0_real_agent_work_unit/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001
---

## Execution Contract

Heavy real-Agent case. PASS requires a real `dpt-source-intake` actor to execute the generated work-unit task and produce a real result JSON, runtime receipt, declared output files, and cache trails. Fixture output, hand-written ledger rows, and hand-written fake search cache cannot produce PASS.

Without a real Agent result, this case records `NOT_RUN` and exits `2`. `NOT_RUN` is explicit deferred evidence, not PASS.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real `operate-queue enqueue`, `operate-work-unit claim`, `operate-work-unit submit`, `operate-work-unit inspect`, and Wave0 gate CLI |
| Fixture input | None for PASS |
| Agent actor | Required for PASS |
| External calls | Required for PASS: real WebSearch/WebFetch or approved fetch degradation chain |
| Ledger generation | Real `operate-work-unit submit` |
| Verdict source | Trace JSONL checks, submit JSON, inspect JSON, gate JSON |
| No-real-agent rule | Record NOT_RUN, preserve bundle, do not mark PASS |

# case-211-heavy-wave0-happy-path

## Expected Runtime Path

1. Create a disposable Wave0 bundle and scaffold one real source-intake topic.
2. Enqueue one Wave0 delegated queue demand.
3. Claim one work unit through `operate-work-unit claim` and read the generated task/prompt refs.
4. A real Agent executes the work-unit task using WebSearch/WebFetch and writes its own result/receipt/output/cache evidence.
5. Submit the real result through `operate-work-unit submit`.
6. Run Wave0 gate and `operate-work-unit inspect`.
7. Record trace checks and produce PASS only from submitted ledger/gate/inspect evidence.
8. If no real result exists, record `NOT_RUN` and preserve the bundle.

## Step 1: [MAIN/SHELL] Create Runtime Context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w0_real_agent_work_unit --case case-211 --force)
node --input-type=module - "$B" <<'JS'
import { writeWave0Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

writeWave0Scaffold(process.argv[2], {
  planBasename: 'w0_real_agent_work_unit',
  topics: [{ id: 't1', slug: 'agentic-coding-tools', title: 'Agentic coding tools' }],
  referenceRows: ['| 00-shared-agentic-coding-tools.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |']
});
JS
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
echo "BUNDLE=$B"
```

Expected: validate/inspect pass and no delegated work is complete.

## Step 2: [MAIN/SHELL] Enqueue And Claim Work Unit

```bash
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const task = queueItemForWorkUnit({
  queue_item_id: 'wave0-source-agentic-coding-tools',
  topic_slug: 'agentic-coding-tools',
  title: 'Real Wave0 source intake'
});
const enqueue = enqueueWorkUnitTask(bundle, task, { fileName: 'case211-real-task.json' });
console.log(JSON.stringify(enqueue, null, 2));
JS

CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-source-intake --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_JSON" > "$B/case-211-claim.json"
WORK_ID=$(printf '%s\n' "$CLAIM_JSON" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.claimed_work_ids[0]);')
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(`claimed_count=${j.claimed_count}`);
console.log(`work_id=${j.claimed_work_ids[0]}`);
console.log(`prompt_ref=${j.claimed?.[0]?.prompt_ref || j.prompt_refs?.[0] || "see work-unit envelope"}`);
process.exit(j.claimed_count === 1 ? 0 : 1);
'
```

Expected: one `wave0_source_intake` work unit is claimed. The controller must read the claim JSON and generated work-unit envelope before dispatching the Agent.

## Step 3: [MAIN->AGENT] Produce Real Agent Result

A real project Agent must execute the generated work-unit task from `_work_units/wave0/$WORK_ID/task.md`, obey its manifest, beacon, result schema, receipt nonce, output declaration, and cache policy.

Expected real runtime evidence:

- A result JSON matching the claimed `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- A runtime receipt event with the same `receipt_nonce`.
- Declared `output_files[]` including at least the Wave0 reference and per-topic `source.yaml`.
- Declared `cache_trails[]` with cache metadata that maps to the reference `source_url`.
- No hand-written ledger row.

## Step 4: [MAIN/SHELL] No-Result Checkpoint

If no real result exists yet, record `NOT_RUN` and stop. This proves the heavy case cannot pass on missing Agent evidence.

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-211 --target-dir tests/.test-bundles
```

Expected without `--real-result`: exit `2`, report `verdict: "NOT_RUN"`, and preserve the bundle.

## Step 5: [MAIN/SHELL] Submit Real Result And Gate

Run only after Step 3 has produced a real Agent result file.

```bash
REAL_RESULT=<result.json>
SUBMIT_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$REAL_RESULT")
printf '%s\n' "$SUBMIT_JSON" > "$B/case-211-submit.json"

set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-211-gate.json"
GATE_STATUS=$?
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect "$B" > "$B/case-211-inspect.json"
INSPECT_STATUS=$?
set -e
printf '%s\n' "$GATE_STATUS" > "$B/case-211-gate.status"
printf '%s\n' "$INSPECT_STATUS" > "$B/case-211-inspect.status"
```

Expected: submit `ok: true`, gate `check.passed: true`, and inspect `passed: true`.

## Step 6: [MAIN/SHELL] Record Verdict Checks

```bash
node --input-type=module - "$B" "$WORK_ID" <<'JS'
import { readFileSync } from 'node:fs';
import { recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const submit = JSON.parse(readFileSync(`${bundle}/case-211-submit.json`, 'utf8'));
const gate = JSON.parse(readFileSync(`${bundle}/case-211-gate.json`, 'utf8'));
const inspect = JSON.parse(readFileSync(`${bundle}/case-211-inspect.json`, 'utf8'));

recordPlaybookCheck(bundle, { gate: 'real-submit', passed: submit.ok === true, detail: workId });
recordPlaybookCheck(bundle, { gate: 'wave0-gate', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'work-unit-inspect', passed: inspect.passed === true, detail: JSON.stringify(inspect.inspect || []) });

const verdict = writeTraceVerdict(bundle, 'case-211');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

Expected: PASS only with real Agent result submitted through the work-unit boundary.

## Step 7: [MAIN] Result Interpretation

PASS means a real Wave0 source-intake actor completed the same claim/submit/ledger/gate path used by production. NOT_RUN means real Agent behavior remains unproven. FAIL means the preserved bundle contains the submit, inspect, gate, and trace feedback needed for repair.

## Step 8: [MAIN/SHELL] Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B/case-211-verdict.json"
rm -rf "$B"
```

FAIL and NOT_RUN preserve the bundle.

## Optional Automation Smoke

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-211
node experiments_env/shared/run-fixture-backed-case.mjs --case case-211 --real-result <result.json> --cleanup-pass
```

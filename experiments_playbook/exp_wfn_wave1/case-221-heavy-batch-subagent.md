---
schema: command-experiment/v1
experiment: wfn-wave1
case: case-221-heavy-batch-subagent
weight: heavy
case_goal: "Verify real Wave1 batch topic-deepening through work-unit claim, real dpt-evidence-extractor actors, submit-by-work-id, ledger coverage, backfill, and Wave1 gate pass."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-221_w1_real_batch_work_unit
trace: dpt_disp_case-221_w1_real_batch_work_unit/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001, RWE-003, WAI-006
---

## Execution Contract

Heavy real-Agent canary. This case cannot PASS from fixture data. The Main Agent may use fixture scaffolding for bundle/topic setup, but each Wave1 delegated result must be produced by a real `dpt-evidence-extractor` actor from the claimed work-unit task and accepted only through `operate-work-unit submit`.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle with witnessed Wave0-to-Wave1 handoff |
| Framework path | Real `operate-queue enqueue`, `operate-work-unit claim/submit`, submitted ledger, `operate-work-unit inspect`, and Wave1 gate CLI |
| Fixture input | Bundle/topic scaffolding only |
| Agent actor | Required: two real `dpt-evidence-extractor` actors |
| External calls | Required when actor task uses WebSearch/WebFetch or approved fetch chain |
| Verdict source | Trace checks, real submit JSON, work-unit ledger/index, Wave1 gate JSON |
| Does not prove | Nothing if reported `NOT_RUN`; a fixture-backed PASS is forbidden |

# case-221-heavy-batch-subagent

## Expected Runtime Path

1. Create a Wave1-ready disposable bundle with two topics.
2. Enqueue two `wave1_topic_deepening` queue demands.
3. Claim both through one `operate-work-unit claim --count 2`.
4. Spawn two real `dpt-evidence-extractor` actors using the generated work-unit task prompts.
5. Each actor writes result/receipt/output/cache according to its work-unit contract.
6. Main Agent submits each result by `work_id`, in any return order.
7. Main Agent reads submit JSON, work-unit inspect JSON, and Wave1 gate JSON before recording trace checks.
8. If no real actor surface is available, record `NOT_RUN` and stop.

## Step 1: [MAIN/SHELL] Create Runtime Context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w1_real_batch_work_unit --case case-221 --force)
node --input-type=module - "$B" <<'JS'
import { writeWave1Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

writeWave1Scaffold(process.argv[2], {
  planBasename: 'w1_real_batch_work_unit',
  topics: [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' }
  ]
});
JS
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
echo "BUNDLE=$B"
```

## Step 2: [MAIN/SHELL] Enqueue And Claim Batch

```bash
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
for (const topic of [
  { slug: 'topic-a', title: 'Topic A' },
  { slug: 'topic-b', title: 'Topic B' }
]) {
  enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: `wave1-deepen-${topic.slug}`,
    topic_slug: topic.slug,
    title: `Real Wave1 deepening for ${topic.title}`
  }), { fileName: `case221-${topic.slug}.json` });
}
JS

CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave1 --count 2 --actor-outcome available --actor-source native_probe --actor-role-key dpt-evidence-extractor --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_JSON" > "$B/case-221-claim.json"
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(JSON.stringify({ claimed_count: j.claimed_count, work_ids: j.claimed_work_ids, prompt_refs: j.prompt_refs }, null, 2));
process.exit(j.claimed_count === 2 ? 0 : 1);
'
```

Expected: two work-unit prompts are generated under `_work_units/wave1/{work_id}/task.md`.

## Step 3: [MAIN->SUBAGENT] Run Real Actors

For each `work_id` in `case-221-claim.json`, hand the generated task prompt to a real `dpt-evidence-extractor` actor. The actor must read its beacon, preserve `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`, perform bounded topic deepening, and produce the declared result JSON plus runtime receipt.

If this surface is unavailable, stop and record `NOT_RUN`:

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-221 --target-dir tests/.test-bundles
```

Expected without real results: exit `2`, verdict `NOT_RUN`.

## Step 4: [MAIN/SHELL] Submit Real Results

After real actors return, place their result JSON files in a directory named by `REAL_RESULT_DIR`, with filenames:

```text
<work_id>.result.json
```

Then submit them:

```bash
REAL_RESULT_DIR=/path/to/real-wave1-results
node --input-type=module - "$B" "$REAL_RESULT_DIR" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { submitWorkUnitViaCli } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, resultDir] = process.argv.slice(2);
const claim = JSON.parse(readFileSync(`${bundle}/case-221-claim.json`, 'utf8'));
const submits = [];
for (const workId of claim.claimed_work_ids) {
  const resultPath = path.join(resultDir, `${workId}.result.json`);
  submits.push({ work_id: workId, submit: submitWorkUnitViaCli(bundle, { work_id: workId, resultPath }) });
}
writeFileSync(`${bundle}/case-221-submit.json`, `${JSON.stringify(submits, null, 2)}\n`);
console.log(JSON.stringify(submits, null, 2));
process.exit(submits.every((entry) => entry.submit.ok === true) ? 0 : 1);
JS
```

## Step 5: [MAIN/SHELL] Gate And Trace Verdict

```bash
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave1_completion', source: 'case-221-real-agent' });
JS
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect "$B" > "$B/case-221-inspect.json"
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-221-gate.json"
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const submit = JSON.parse(readFileSync(`${bundle}/case-221-submit.json`, 'utf8'));
const inspect = JSON.parse(readFileSync(`${bundle}/case-221-inspect.json`, 'utf8'));
const gate = JSON.parse(readFileSync(`${bundle}/case-221-gate.json`, 'utf8'));
recordPlaybookCheck(bundle, { gate: 'real-wave1-batch-submit', passed: submit.every((entry) => entry.submit.ok === true), detail: JSON.stringify(submit.map((entry) => entry.work_id)) });
recordPlaybookCheck(bundle, { gate: 'work-unit-inspect', passed: inspect.passed === true, detail: JSON.stringify(inspect.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave1-gate', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
const verdict = writeTraceVerdict(bundle, 'case-221');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-221 --target-dir tests/.test-bundles
```

Without `--real-result`, expected exit is `2` with verdict `NOT_RUN`.

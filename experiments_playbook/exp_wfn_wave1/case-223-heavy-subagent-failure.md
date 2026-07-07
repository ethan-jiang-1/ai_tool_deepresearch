---
schema: command-experiment/v1
experiment: wfn-wave1
case: case-223-heavy-subagent-failure
weight: heavy
case_goal: "Verify a real Wave1 evidence-extractor can honestly return degraded/partial evidence through work-unit submit without fabricating inaccessible content."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-223_w1_real_failure_work_unit
trace: dpt_disp_case-223_w1_real_failure_work_unit/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001, RWE-003, RWE-007, WAI-006
---

## Execution Contract

Heavy real-Agent canary. This case cannot PASS from fixture data. Its proof target is not "the web fetch succeeded"; it is that a real `dpt-evidence-extractor` actor follows the work-unit contract when access is blocked: it records attempted source access, writes honest partial evidence or access-limitation output, preserves receipt nonce, submits by `work_id`, and does not fabricate unavailable page content.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable Wave1 bundle with one hard-target topic |
| Framework path | Real work-unit claim, real actor result, submit, submitted ledger coverage, inspect, and Wave1 gate |
| Fixture input | Bundle/topic setup only |
| Agent actor | Required: real `dpt-evidence-extractor` |
| External calls | Required or explicitly attempted by the actor according to the task contract |
| Verdict source | Actor result, runtime receipt, submit JSON, inspect JSON, Wave1 gate JSON, trace checks |
| Does not prove | Anything if reported `NOT_RUN` |

# case-223-heavy-subagent-failure

## Expected Runtime Path

1. Create a Wave1 bundle with `hard-target`.
2. Enqueue and claim one `wave1_topic_deepening` work unit.
3. Run a real `dpt-evidence-extractor` actor from the generated task.
4. Actor attempts fetch/search chain, records limitations honestly, and writes a valid work-unit result.
5. Main Agent submits by `work_id`, runs inspect and Wave1 gate, then records verdict checks.
6. If no real actor result is available, record `NOT_RUN` and stop.

## Step 1: [MAIN/SHELL] Create And Claim

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w1_real_failure_work_unit --case case-223 --force)
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit, writeWave1Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave1Scaffold(bundle, {
  planBasename: 'w1_real_failure_work_unit',
  topics: [{ id: 'th', slug: 'hard-target', title: 'Hard Target' }]
});
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave1',
  queue_item_id: 'wave1-deepen-hard-target',
  topic_slug: 'hard-target',
  title: 'Real Wave1 hard-target degradation proof'
}), { fileName: 'case223-hard-target.json' });
JS
CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave1)
printf '%s\n' "$CLAIM_JSON" > "$B/case-223-claim.json"
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(JSON.stringify({ work_id: j.claimed_work_ids?.[0], prompt_refs: j.prompt_refs }, null, 2));
process.exit(j.claimed_count === 1 ? 0 : 1);
'
```

Expected: one work unit is claimed and its generated `task.md` tells the actor to preserve `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

## Step 2: [MAIN->SUBAGENT] Run Real Actor

Hand the generated work-unit task to a real `dpt-evidence-extractor`. The actor should search/fetch bounded evidence. If access is blocked, it should record the attempted path and write honest partial output rather than invented content.

Minimum accepted real result:

- `result.json` conforms to the generated work-unit result schema.
- `runtime-receipt.jsonl` includes lifecycle evidence with matching `work_id` and `receipt_nonce`.
- `artifacts/wave1/hard-target/evidence-summary.md` includes source URL attempts and access-limitation language.
- `artifacts/wave1/hard-target/question-list.md` contains the four required Wave1 sections.
- `seed_topics/hard-target.md` has Wave1 backfill tokens replaced with limitation-aware text.
- `reference/*hard-target*.md` is countable, article/search-attempt specific, and declared by the submitted result.

If no real result is available, run the NOT_RUN smoke:

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-223 --target-dir tests/.test-bundles
```

Expected without real result: exit `2`, verdict `NOT_RUN`.

## Step 3: [MAIN/SHELL] Submit Real Result

```bash
WORK_ID=$(node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(j.claimed_work_ids[0]);' "$B/case-223-claim.json")
REAL_RESULT=/path/to/real-hard-target.result.json
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$REAL_RESULT" > "$B/case-223-submit.json"
node - "$B" <<'JS'
const fs = require('fs');
const submit = JSON.parse(fs.readFileSync(`${process.argv[2]}/case-223-submit.json`, 'utf8'));
console.log(JSON.stringify({ ok: submit.ok, status: submit.status, work_id: submit.work_id }, null, 2));
process.exit(submit.ok === true ? 0 : 1);
JS
```

If submit rejects, read `last_submit_rejection` and repair the same claimed work unit. Do not allocate a replacement unless the attempt is explicitly failed, timed out, or abandoned.

## Step 4: [MAIN/SHELL] Inspect, Gate, And Record Verdict

```bash
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave1_completion', source: 'case-223-real-agent' });
JS
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect "$B" > "$B/case-223-inspect.json"
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-223-gate.json"
node --input-type=module - "$B" "$WORK_ID" <<'JS'
import { readFileSync } from 'node:fs';
import { recordPlaybookCheck, readTrace, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const submit = JSON.parse(readFileSync(`${bundle}/case-223-submit.json`, 'utf8'));
const inspect = JSON.parse(readFileSync(`${bundle}/case-223-inspect.json`, 'utf8'));
const gate = JSON.parse(readFileSync(`${bundle}/case-223-gate.json`, 'utf8'));
const trace = readTrace(bundle);
recordPlaybookCheck(bundle, { gate: 'real-failure-submit', passed: submit.ok === true, detail: workId });
recordPlaybookCheck(bundle, { gate: 'work-unit-inspect', passed: inspect.passed === true, detail: JSON.stringify(inspect.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave1-gate', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'work-unit-submitted-trace', passed: trace.some((event) => event.event === 'work_unit_submitted' && event.work_id === workId), detail: workId });
const verdict = writeTraceVerdict(bundle, 'case-223');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-223 --target-dir tests/.test-bundles
```

Without `--real-result`, expected exit is `2` with verdict `NOT_RUN`. A fixture-backed PASS is invalid for this case.

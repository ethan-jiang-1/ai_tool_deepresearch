---
schema: command-experiment/v1
experiment: engine-boundary
case: case-405-light-trace-single-sink
weight: light
case_goal: "验证 framework/playbook trace 写入路径只写 bundle 根 rb_trace.jsonl，并覆盖 trace API、queue CLI、work-unit claim/submit。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-405_eb_trace_work_unit
trace: dpt_disp_case-405_eb_trace_work_unit/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Fixture-backed, no Agent actor, no external calls. The case must trigger current trace API, non-delegated queue CLI, and work-unit claim/submit trace paths, then scan the disposable bundle for non-canonical trace JSONL sinks.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real trace API, `operate-queue`, and `operate-work-unit` trace writers |
| Fixture input | Controlled queue and work-unit fixture data to trigger trace events |
| Agent actor | None |
| External calls | None |
| Trace authority | Bundle root `rb_trace.jsonl` |
| Removed sinks | Any non-root trace JSONL sink is a failure |
| Verdict source | Trace JSONL `check` events, filesystem scan result, and runner report |
| Does not prove | Agent logging discipline or external runtime logging completeness |

# case-405-light-trace-single-sink

## Expected Runtime Path

1. Create a disposable bundle through shared setup.
2. Write one trace event through the current framework trace API.
3. Trigger non-delegated queue CLI trace events.
4. Trigger work-unit claim and submit trace events.
5. Walk the disposable bundle and fail if any non-root trace JSONL sink exists.
6. Record API/queue/work-unit/single-sink checks in root `rb_trace.jsonl`.
7. Print PASS/FAIL and clean up only on PASS.

## Step 1: [MAIN/SHELL] Create Runtime Context

Create a disposable bundle. This case then triggers trace writes from three separate production boundaries.

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_trace_work_unit --case case-405 --force)
node --input-type=module - "$B" <<'JS'
import { writeMinimalPlan, writeMinimalStatus } from './experiments_env/shared/work-unit-playbook-utils.mjs';
writeMinimalStatus(process.argv[2]);
writeMinimalPlan(process.argv[2]);
JS
echo "BUNDLE=$B"
```

Expected: the bundle path is printed.

## Step 2: [MAIN/SHELL] Trigger Framework Trace API

Write one trace event through the current framework trace API, then read root `rb_trace.jsonl` before moving on.

```bash
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';

const bundle = process.argv[2];
const trace = createTrace(`${bundle}/rb_trace.jsonl`, { consoleEcho: false });
trace.traceEntry('check', {
  source: 'case-405-api',
  gate: 'trace-api',
  passed: true,
  expected: true,
  detail: 'createTrace writes rb_trace.jsonl'
});
JS
node - "$B" <<'JS'
const fs = require('fs');
const bundle = process.argv[2];
const events = fs.readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
const found = events.some((event) => event.source === 'case-405-api' && event.gate === 'trace-api');
console.log(JSON.stringify({ trace_api_event_found: found }, null, 2));
process.exit(found ? 0 : 1);
JS
```

Expected: root trace contains the API event. No other trace sink is expected at this point.

## Step 3: [MAIN/SHELL] Trigger Queue CLI Trace

Complete a non-delegated queue item through `operate-queue`, then read root trace for the emitted `queue_completed` event.

```bash
node - "$B" <<'JS'
const fs = require('fs');
const path = require('path');
const bundle = process.argv[2];
const task = {
  queue_item_id: 'case405-queue',
  title: 'Trace sink queue task',
  targets: { controller: 'main-agent' },
  action: 'Trigger queue trace events.',
  producer_rule: 'case405_trace_queue',
  lineage: {},
  priority_class: 'P5_new_reference_intake',
  required_receipts: ['none'],
  done_condition: 'operate-queue complete succeeds',
  verification: { engine: [], agent: [] },
  writes_to: [],
  status_sync: [],
  completion_receipt: 'none',
  failure_route: 'queue repair work',
  payload: {}
};
fs.writeFileSync(path.join(bundle, 'case405-queue.json'), `${JSON.stringify(task, null, 2)}\n`);
fs.writeFileSync(path.join(bundle, 'case405-queue-result.json'), `${JSON.stringify({
  queue_item_id: 'case405-queue',
  receipt: 'none',
  summary: 'queue trace sink checkpoint'
}, null, 2)}\n`);
JS
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue "$B" --task "$B/case405-queue.json" > "$B/case-405-queue-enqueue.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim "$B" --actor main-agent > "$B/case-405-queue-claim.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs complete "$B" --result "$B/case405-queue-result.json" > "$B/case-405-queue-complete.json"
node - "$B" <<'JS'
const fs = require('fs');
const bundle = process.argv[2];
const events = fs.readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
const found = events.some((event) => event.event === 'queue_completed' && event.queue_item_id === 'case405-queue');
console.log(JSON.stringify({ queue_completed_event_found: found }, null, 2));
process.exit(found ? 0 : 1);
JS
```

Expected: queue CLI emits its trace event into root `rb_trace.jsonl`.

## Step 4: [MAIN/SHELL] Trigger Work-Unit Claim And Submit Trace

Claim and submit one fixture-backed work unit through real `operate-work-unit` CLIs, then read root trace for claim and submit events.

```bash
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
const task = queueItemForWorkUnit({
  queue_item_id: 'wave0-source-topic-a',
  topic_slug: 'topic-a',
  title: 'Trace sink work-unit task'
});
const result = enqueueWorkUnitTask(bundle, task, { fileName: 'case405-work-unit.json' });
console.log(JSON.stringify(result, null, 2));
JS
CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1)
printf '%s\n' "$CLAIM_JSON" > "$B/case-405-work-unit-claim.json"
WORK_ID=$(printf '%s\n' "$CLAIM_JSON" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.claimed_work_ids[0]);')
RESULT_PATH=$(node --input-type=module - "$B" "$WORK_ID" <<'JS'
import {
  referenceContent,
  sourceYamlExtra,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const sourceUrl = 'https://research-source.test/trace/article';
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/00-shared-trace.md',
  source_url: sourceUrl,
  source_slug: 'trace',
  output_content: referenceContent({ source_url: sourceUrl, topic_slug: 'topic-a', title: 'Trace Fixture Source' }),
  extra_output_files: [sourceYamlExtra('topic-a', sourceUrl, 'Trace Fixture Source')]
});
console.log(fixture.resultPath);
JS
)
SUBMIT_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$RESULT_PATH")
printf '%s\n' "$SUBMIT_JSON" > "$B/case-405-work-unit-submit.json"

node - "$B" "$WORK_ID" <<'JS'
const fs = require('fs');
const [bundle, workId] = process.argv.slice(2);
const events = fs.readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
const claimFound = events.some((event) => event.event === 'work_unit_claimed' && event.work_id === workId);
const submitFound = events.some((event) => event.event === 'work_unit_submitted' && event.work_id === workId);
console.log(JSON.stringify({ work_id: workId, claimFound, submitFound }, null, 2));
process.exit(claimFound && submitFound ? 0 : 1);
JS
```

Expected: work-unit claim and submit trace events are in root `rb_trace.jsonl`.

## Step 5: [MAIN/SHELL] Scan For Non-Root Trace Sinks And Record Verdict Checks

Record trace `check` rows for `trace-api`, `queue-trace`, `work-unit-claim-trace`, `work-unit-submit-trace`, and `single-sink`. The `single-sink` check must come from a filesystem walk, not from an assumed path list.

```bash
node --input-type=module - "$B" "$WORK_ID" <<'JS'
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  readTrace,
  recordPlaybookCheck,
  writeTraceVerdict
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const events = readTrace(bundle);
const badTraceFiles = walkFiles(bundle)
  .map((file) => path.relative(bundle, file))
  .filter((rel) => rel !== 'rb_trace.jsonl')
  .filter((rel) => /(^|\/)(trace|_trace)(?:[_.-].*)?\.jsonl$/i.test(rel) || /_trace_agq_cli|_trace_subagent|rbrb_trace/i.test(rel));

recordPlaybookCheck(bundle, {
  gate: 'trace-api',
  passed: events.some((event) => event.source === 'case-405-api'),
  detail: 'trace API event in rb_trace.jsonl'
});
recordPlaybookCheck(bundle, {
  gate: 'queue-trace',
  passed: events.some((event) => event.event === 'queue_completed' && event.queue_item_id === 'case405-queue'),
  detail: 'queue_completed event in rb_trace.jsonl'
});
recordPlaybookCheck(bundle, {
  gate: 'work-unit-claim-trace',
  passed: events.some((event) => event.event === 'work_unit_claimed' && event.work_id === workId),
  detail: workId
});
recordPlaybookCheck(bundle, {
  gate: 'work-unit-submit-trace',
  passed: events.some((event) => event.event === 'work_unit_submitted' && event.work_id === workId),
  detail: workId
});
recordPlaybookCheck(bundle, {
  gate: 'single-sink',
  passed: badTraceFiles.length === 0,
  detail: JSON.stringify(badTraceFiles)
});

const verdict = writeTraceVerdict(bundle, 'case-405');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

Expected trace coverage:

- `createTrace()` writes to root `rb_trace.jsonl`.
- `operate-queue complete` emits queue trace in the same sink.
- `operate-work-unit claim` and `submit` emit work-unit trace in the same sink.
- No old or side-channel trace JSONL file exists inside the disposable bundle.

## Step 6: [MAIN] Result Interpretation

PASS means framework and controlled playbook trace writers converge on root `rb_trace.jsonl` for this boundary. FAIL means trace authority has split and the Agent must repair the writer path before relying on experiment verdicts.

## Step 7: [MAIN/SHELL] Cleanup

PASS removes the disposable bundle. FAIL preserves it for diagnosis.

## Optional Automation Smoke

This smoke command runs the same checkpoints for automation, but it is not the normative MD-controller execution surface:

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-405 --cleanup-pass
```

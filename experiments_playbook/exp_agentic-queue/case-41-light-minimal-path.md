---
schema: command-experiment/v2
experiment: agentic-queue
case: case-41-light-minimal-path
case_goal: Validate the queue v2 enqueue, front claim, receipt-backed completion, promotion, and projection path.
verdict_mode: all
required_checks: [claim_front_only, completion_feedback, enqueue_ordered_window, promote_projection]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: AGQ-006, AGQ-019
---

<!-- @impl AGQ-006, AGQ-019, EXA-005, EXA-006, PLR-003 -->

# case-41-light-minimal-path

This deterministic fixture-backed Agent-flow case exercises the real queue manager against one fresh contained disposable bundle. It proves ordered queue mechanics only; it does not prove Agent queue judgment or delegated work-unit behavior.

## Step 1: Create and register the verdict bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs agq_simple --case case-41 --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

## Step 2: Enqueue three ordered queue demands

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';
import { createQueue, enqueue, saveQueue, makeItem } from './DPT_FRAMEWORK/engine/queue-manager.mjs';

const bundle = process.argv[2];
const trace = createTrace(join(bundle, 'rb_trace.jsonl'), { consoleEcho: false });
trace.traceInit('case-41', { source: 'playbook' });
writeFileSync(join(bundle, 'done-1.json'), '{"ok":true}\n');
let queue = createQueue('agq-simple');
queue = enqueue(queue, makeItem({ queue_item_id: 'queue-simple-1', title: 'Task 1', completion_receipt: 'json:done-1.json' }));
queue = enqueue(queue, makeItem({ queue_item_id: 'queue-simple-2', title: 'Task 2' }));
queue = enqueue(queue, makeItem({ queue_item_id: 'queue-simple-3', title: 'Task 3' }));
saveQueue(bundle, queue);
trace.traceEntry('check', {
  source: 'playbook', gate: 'enqueue_ordered_window', expected: true,
  passed: queue.active_window.length === 3
    && queue.active_window[0].queue_item_id === 'queue-simple-1'
    && queue.active_window[1].queue_item_id === 'queue-simple-2'
    && queue.active_window[2].queue_item_id === 'queue-simple-3'
    && queue.refill_pool.length === 0,
});
JS
```

## Step 3: Claim only the queue front

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { join } from 'node:path';
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';
import { loadQueue, claim, saveQueue } from './DPT_FRAMEWORK/engine/queue-manager.mjs';

const bundle = process.argv[2];
const trace = createTrace(join(bundle, 'rb_trace.jsonl'), { consoleEcho: false });
const result = claim(loadQueue(bundle), { actor: 'main-agent' });
saveQueue(bundle, result.queue);
trace.traceEntry('check', {
  source: 'playbook', gate: 'claim_front_only', expected: true,
  passed: result.item.queue_item_id === 'queue-simple-1'
    && result.queue.active_window[0].status === 'running'
    && result.queue.active_window[1].queue_item_id === 'queue-simple-2'
    && result.queue.active_window[1].status === 'queued',
});
JS
```

## Step 4: Complete with the real receipt contract

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { join } from 'node:path';
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';
import { loadQueue, complete, saveQueue } from './DPT_FRAMEWORK/engine/queue-manager.mjs';

const bundle = process.argv[2];
const trace = createTrace(join(bundle, 'rb_trace.jsonl'), { consoleEcho: false });
const completed = complete(loadQueue(bundle), { queue_item_id: 'queue-simple-1', receipt: 'json:done-1.json' }, bundle);
saveQueue(bundle, completed.queue);
trace.traceEntry('check', { source: 'playbook', gate: 'completion_feedback', passed: completed.feedback.passed === true, expected: true });
JS
```

## Step 5: Verify promotion and the current projection

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';
import { loadQueue } from './DPT_FRAMEWORK/engine/queue-manager.mjs';

const bundle = process.argv[2];
const trace = createTrace(join(bundle, 'rb_trace.jsonl'), { consoleEcho: false });
const queue = loadQueue(bundle);
const projectionPath = join(bundle, '_cache/agentic-queue/current-task.md');
const projection = existsSync(projectionPath) ? readFileSync(projectionPath, 'utf8') : '';
const retired = ['slot_1_current', 'slot_2_next', 'slot_5_tail', 'current_slot', 'named_slots'];
trace.traceEntry('check', {
  source: 'playbook', gate: 'promote_projection', expected: true,
  passed: queue.active_window[0].queue_item_id === 'queue-simple-2'
    && projection.includes('queue-simple-2')
    && Object.keys(queue).every((key) => !retired.includes(key)),
});
JS
```

## Step 6: Publish native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after finalization. The Supervisor validates the completion, runs Light health, writes durable audit, and applies any explicit cleanup policy.

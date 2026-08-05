---
schema: command-experiment/v2
experiment: agentic-queue
case: case-43-standard-failure-repair
case_goal: "验证 queue v2 invalid task、missing receipt、unsafe-current guard、failure repair 和 empty queue blocker。"
verdict_mode: all
required_checks: [empty_queue_blocker, failure_creates_repair, invalid_task_rejected, missing_receipt_blocks, unsafe_current_explicit, unsafe_current_guard]
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

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中逐步执行。实验结果必须来自实际 Queue Manager API 调用和 bundle-root trace `check` events；禁止 mock 返回、伪造 trace，或把旧 named slot state 当作 current queue proof。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| Runtime context | disposable bundle，`new-disposable-bundle.mjs` 创建 |
| Framework path | `queue-manager.mjs` API：schema, receipt, preempt, fail, claim |
| Fixture input | task cards 在 playbook 内构造，使用 queue v2 `queue_item_id` |
| Agent actor | 无，fixture-backed Engine case |
| External calls | 无 |
| Verdict source | bundle-root `rb_trace.jsonl` `check` events |
| 不证明 | Agent repair 策略、delegated work-unit submit |

# case-43-standard-failure-repair

验证 Queue Manager 在错误路径中 fail closed，不依赖 chat 解释继续前进，并保持 queue v2 ordered `active_window` / `refill_pool` shape。

## Expected Runtime Path

1. 创建 disposable bundle
2. Invalid task：schema 拒绝 queue demand `work_id`
3. Missing receipt：缺文件阻止 complete，front item 保持不变
4. Unsafe-current guard：无显式标志则拒绝替换 running front
5. Unsafe-current explicit：显式标志允许替换 front，旧 front 进入 pool
6. Failure repair：fail 产生 repair work 并插入 active window front
7. Empty queue：claim 返回 blocker
8. 从 trace 裁决
9. PASS 后清理

## Step 1: 创建 disposable runtime context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs agq_repair --case case-43 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$B"
node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs "$B"
```

-> 预期：bundle 创建成功，control files 有效。

## Step 2.1: Invalid Task

验证 queue demand item 不能使用 `work_id` 作为身份；`queue_item_id` 才是 current queue demand identity。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { QueueItemSchema, makeItem } from './DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

const __dirname = process.argv[2];
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });
trace.traceInit('agq-playbook/repair', { source: 'agq-playbook/repair' });

let makeItemRejected = false;
try {
  makeItem({ work_id: 'legacy-demand-id' });
} catch {
  makeItemRejected = true;
}
const valid = makeItem({ queue_item_id: 'queue-valid' });
const parsed = QueueItemSchema.safeParse({ ...valid, work_id: 'legacy-demand-id' });

trace.traceEntry('check', {
  source: 'playbook',
  gate: 'invalid_task_rejected',
  expected: true,
  passed: makeItemRejected && parsed.success === false,
});
JS
```

-> 预期：old demand identity 被拒绝。

## Step 2.2: Missing Receipt

入队 `queue-repair-1` 和 `queue-repair-2`。尝试 complete 缺失 file receipt，应阻止 promotion。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { createQueue, enqueue, complete, saveQueue, makeItem } from './DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

const __dirname = process.argv[2];
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

let queue = createQueue('agq-repair');
queue = enqueue(queue, makeItem({
  queue_item_id: 'queue-repair-1',
  title: 'Missing receipt task',
  completion_receipt: 'file:missing.txt',
}));
queue = enqueue(queue, makeItem({ queue_item_id: 'queue-repair-2', title: 'Next task' }));
saveQueue(__dirname, queue);

const blocked = complete(queue, { queue_item_id: 'queue-repair-1' }, __dirname);
trace.traceEntry('check', {
  source: 'playbook',
  gate: 'missing_receipt_blocks',
  expected: true,
  passed: blocked.feedback.passed === false
    && blocked.queue.active_window[0].queue_item_id === 'queue-repair-1',
});
JS
```

-> 预期：receipt 失败，`active_window[0]` 不变。

## Step 2.3: Unsafe-Current Guard

加载 queue，尝试替换 current 但不带 `unsafeCurrent=true`，应抛出异常。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { loadQueue, preempt, makeItem } from './DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

const __dirname = process.argv[2];
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
let guardWorked = false;
try {
  preempt(queue, makeItem({ queue_item_id: 'queue-repair-urgent' }), { reason: 'known_bad_current', replaceCurrent: true });
} catch {
  guardWorked = true;
}
trace.traceEntry('check', {
  source: 'playbook',
  gate: 'unsafe_current_guard',
  expected: true,
  passed: guardWorked,
});
JS
```

-> 预期：guard 拦截未授权 front replacement。

## Step 2.4: Unsafe-Current Explicit

显式 `unsafeCurrent=true` + `replaceCurrent=true`，允许 urgent 替换 front；旧 front 进入 pool。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { loadQueue, preempt, saveQueue, makeItem } from './DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

const __dirname = process.argv[2];
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
const unsafe = preempt(queue, makeItem({ queue_item_id: 'queue-repair-urgent' }), {
  reason: 'known_bad_current',
  replaceCurrent: true,
  unsafeCurrent: true,
});
saveQueue(__dirname, unsafe);

trace.traceEntry('check', {
  source: 'playbook',
  gate: 'unsafe_current_explicit',
  expected: true,
  passed: unsafe.active_window[0].queue_item_id === 'queue-repair-urgent'
    && unsafe.refill_pool.some((item) => item.queue_item_id === 'queue-repair-1'
      && item.lineage?.preempted_from === 'active_window_front'),
});
JS
```

-> 预期：urgent 在 ordered window front，旧 front 在 pool。

## Step 2.5: Failure Repair

创建新 queue，fail front item 后 repair work 应进入 active window front，原 next item 后移。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { createQueue, enqueue, fail, saveQueue, makeItem } from './DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

const __dirname = process.argv[2];
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

let repairQueue = createQueue('agq-repair-failure');
repairQueue = enqueue(repairQueue, makeItem({ queue_item_id: 'queue-repair-fail' }));
repairQueue = enqueue(repairQueue, makeItem({ queue_item_id: 'queue-repair-after-fail' }));
repairQueue = fail(repairQueue, { queue_item_id: 'queue-repair-fail', reason: 'deterministic receipt failed' }, __dirname);
saveQueue(__dirname, repairQueue);

trace.traceEntry('check', {
  source: 'playbook',
  gate: 'failure_creates_repair',
  expected: true,
  passed: repairQueue.active_window[0].queue_item_id.startsWith('repair-queue-repair-fail-')
    && repairQueue.active_window[1].queue_item_id === 'queue-repair-after-fail',
});
JS
```

-> 预期：repair work 插到 front，原 next item 后移。

## Step 2.6: Empty Queue

对空 queue 调用 claim，应返回 blocker 状态。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { createQueue, claim } from './DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

const __dirname = process.argv[2];
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

const emptyClaim = claim(createQueue('agq-repair-empty'), { actor: 'main-agent' });
trace.traceEntry('check', {
  source: 'playbook',
  gate: 'empty_queue_blocker',
  expected: true,
  passed: emptyClaim.item === null
    && emptyClaim.queue.queue_health === 'blocked'
    && emptyClaim.queue.stop_authorization_state === 'empty_queue_after_refill',
});
JS
```

-> 预期：empty queue authorizes the empty-queue blocker state only.

## Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 4: 结果解读

PASS 证明 queue v2 错误路径都由 Engine fail closed，并且所有 current proof 都使用 `queue_item_id` 与 ordered arrays。

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.

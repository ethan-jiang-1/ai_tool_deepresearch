---
schema: command-experiment/v2
experiment: system-logging
case: case-75-light-engine-hot-path
case_goal: "验证 queue-manager 的 enqueue/claim/complete/fail 写 attempt/done/reject/empty 事件到 _logs/run.log，且 fine-grained event name 与 broad detail.kind 映射正确。"
verdict_mode: all
required_checks: [event-queue_load_attempt, event-queue_load_done, event-queue_enqueue_attempt, event-queue_enqueue_done, event-queue_claim_attempt, event-queue_claim_done, event-queue_complete_attempt, event-queue_complete_done, event-queue_fail_attempt, event-queue_fail_done, event-queue_save_attempt, event-queue_save_done, map-queue_enqueue_done, map-queue_claim_done, map-queue_complete_done, map-queue_fail_done]
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
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。实验结果必须来自实际文件写入和 CLI 调用；禁止 mock 返回或手写假 result。

# case-75-light-engine-hot-path

验证 `queue-manager.mjs` 的 accident-grade 事件确实写入 `_logs/run.log`，且命名符合 LOG-006 规范（fine-grained event name + broad detail.kind）。

## Expected Runtime Path

1. 创建 disposable bundle + 写 `rb_status.json` `[MAIN/SHELL]`
2. 调用 queue 函数触发日志 `[MAIN/SHELL]`
3. 验证 run.log 含预期事件 `[MAIN/SHELL]`
4. 验证 fine-event → broad-kind 映射 `[MAIN/SHELL]`
5. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 bundle 并运行 queue 操作

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs queue-log --case case-75 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
echo "B=$B"
```

---

## Step 2: 运行 queue 操作链

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const {
  loadQueue, saveQueue, enqueue, claim, complete, fail, makeItem,
} = await import('./DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs');

const dir = process.argv[2]; // $B (bundle root), process.argv[1] is the script path

// loadQueue initializes the run-scoped logger
let q = loadQueue(dir);

// enqueue
q = enqueue(q, makeItem({ queue_item_id: 'task-1', title: 'Test Task' }));

// claim
const claimed = claim(q, { actor: 'main-agent' });
q = claimed.queue;

// complete (simple, no receipt required)
complete(q, { queue_item_id: 'task-1' }, dir);
// complete returns new state; reload before next operation
q = loadQueue(dir);
q = enqueue(q, makeItem({ queue_item_id: 'task-2', title: 'Fail Task' }));
q = claim(q, { actor: 'main-agent' }).queue;
fail(q, { queue_item_id: 'task-2', reason: 'test failure' }, dir);

// save
saveQueue(dir, q);

const logPath = join(dir, '_logs', 'run.log');
const content = readFileSync(logPath, 'utf-8');

// Required LOG-006 events for the happy path
const required = [
  'queue_load_attempt', 'queue_load_done',
  'queue_enqueue_attempt', 'queue_enqueue_done',
  'queue_claim_attempt', 'queue_claim_done',
  'queue_complete_attempt', 'queue_complete_done',
  'queue_fail_attempt', 'queue_fail_done',
  'queue_save_attempt', 'queue_save_done',
];

const checks = [];
for (const evt of required) {
  const found = content.includes(evt);
  checks.push({
    event: 'check', source: 'playbook', gate: `event-${evt}`,
    passed: found, expected: true,
    detail: found ? `${evt} found` : `${evt} MISSING`,
  });
}

// Fine-event → broad-kind mappings
const mappings = [
  { fine: 'queue_enqueue_done', broad: '"kind":"queue_enqueue"' },
  { fine: 'queue_claim_done', broad: '"kind":"queue_claim"' },
  { fine: 'queue_complete_done', broad: '"kind":"queue_complete"' },
  { fine: 'queue_fail_done', broad: '"kind":"queue_fail"' },
];

for (const m of mappings) {
  // Find a line containing the fine event and verify it also has the broad kind
  const lines = content.split('\n');
  const fineLine = lines.find(l => l.includes(m.fine));
  const hasBroad = fineLine && fineLine.includes(m.broad);
  checks.push({
    event: 'check', source: 'playbook', gate: `map-${m.fine}`,
    passed: hasBroad, expected: true,
    detail: hasBroad ? `${m.fine} → ${m.broad}` : `mapping FAILED for ${m.fine}`,
  });
}

const tracePath = join(dir, 'rb_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify({ ts: new Date().toISOString(), source: 'playbook', ...c }) + '\n', { flag: 'a' });
}

const failed = checks.filter(c => !c.passed);
console.log(JSON.stringify({ checks: checks.length, failed: failed.length, logLines: content.trim().split('\n').length }));
if (failed.length > 0) {
  console.log('FAILED:', failed.map(c => c.gate).join(', '));
  process.exit(1);
}
JS
```

→ 预期：12 个事件全部存在，4 个 fine→broad 映射正确。

---

## Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.

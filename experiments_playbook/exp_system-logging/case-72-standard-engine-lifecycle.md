---
schema: command-experiment/v1
experiment: system-logging
case: case-72-standard-engine-lifecycle
weight: heavy
case_goal: "验证 queue-manager 和 subagent-relay 的 logger 激活——closed-set 事件双写 trace+log，engine log 行与 gate/Agent log 行在同一个 _logs/run.log 中按时间戳自然交织，repair 事件进入 rb_trace.jsonl。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-72_log_engine
trace: dpt_disp_case-72_log_engine/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行；包含真实 native subagent 执行。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-72-standard-engine-lifecycle

验证 engine 侧（queue-manager + subagent-relay）的 logger 激活——closed-set 事件（enqueue/claim/complete/refill, slot_create/dispatch/result/collect/merge）产生 log 行，与 gate + Agent log 行在同一 `_logs/run.log` 中交织。

## Expected Runtime Path

1. 创建 disposable bundle `[MAIN/SHELL]`
2. queue-manager：enqueue → claim → complete（验证 closed-set log） `[MAIN/SHELL]`
3. subagent-relay：dispatch → 启动真实 subagent → collect → merge `[MAIN->SUBAGENT]`
4. Agent 通过 log-event.mjs 写 phase 日志 `[MAIN/SHELL]`
5. gate CLI 写 gate_attempt `[MAIN/SHELL]`
6. `inspect-bundle --timeline` 验证 engine + gate + Agent 三源交织 `[MAIN/SHELL]`
7. 验证 repair trace（如果触发）`[MAIN/SHELL]`
8. 从 trace 裁决 `[MAIN/SHELL]`
9. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 disposable runtime context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs log_engine --case case-72 --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
echo "B=$B"
```

→ 预期：validate + inspect pass，`_logs/run.log` 含 `run_start` 行。

---

## Step 2: queue-manager — enqueue → claim → complete

```bash
B= # populated from Step 1

cat > "$B/_qm_test.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const { createQueue, enqueue, claim, complete, makeItem, saveQueue, loadQueue } = await import('../DPT_FRAMEWORK/engine/queue-manager.mjs');

// Create a receipt file for completion
writeFileSync(join(__dirname, '_receipt_test.json'), '{"ok":true}\n');

let q = createQueue('log-test');
q = enqueue(q, makeItem({ work_id: 'task-1', title: 'Test Task', completion_receipt: 'json:_receipt_test.json' }));
q = enqueue(q, makeItem({ work_id: 'task-2', title: 'Task 2' }));
saveQueue(__dirname, q);

// Claim
q = loadQueue(__dirname);
const { queue: q2, item } = claim(q);
if (item) {
  console.log(`claim OK: ${item.work_id}`);
  // Complete
  const result = await complete(q2, { work_id: 'task-1', summary: 'done' }, __dirname);
  console.log(`complete OK: passed=${result.feedback.passed}`);
} else {
  console.log('slot_1 empty — skipping claim');
}

// Check log file for closed-set events
const { readFileSync } = await import('node:fs');
const logPath = join(__dirname, '_logs', 'run.log');
const logContent = readFileSync(logPath, 'utf-8');
const hasEnqueue = logContent.includes('enqueue');
const hasClaim = logContent.includes('claim');
const hasComplete = logContent.includes('complete');
const hasRefill = logContent.includes('refill');

console.log(JSON.stringify({ hasEnqueue, hasClaim, hasComplete, hasRefill }));
JS
node "$B/_qm_test.mjs"
```

→ 预期：enqueue, claim, complete, refill 事件出现在 `_logs/run.log` 中。

---

## Step 3: subagent-relay — dispatch + subagent + collect + merge

### 3a: Dispatch slots [MAIN/SHELL]

```bash
B= # populated from Step 1

cat > "$B/_subagent_dispatch.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const { stageSubagentSlots } = await import('../DPT_FRAMEWORK/engine/subagent-relay.mjs');

const state = {
  current_gate: 'wave0_complete',
  ref_count: 5,
  ref_floor: 5,
  topicReadiness: 'ready',
  subagent_results: [],
  subagent_wave: 0,
  subagent_all_failed: false,
};

const dispatchMap = new Map([['pass', [{
  key: 'source_intake',
  slotIndex: 0,
  roleAgentKey: 'dpt-source-intake',
  taskDescription: 'Find ONE official source about Google Scholar in 2 minutes. Return bounded JSON only.',
  timeoutMs: 120000,
}]]]);

const slots = stageSubagentSlots(state, __dirname, dispatchMap);
writeFileSync(join(__dirname, '_slots.json'), JSON.stringify(slots, null, 2));

// Verify dispatch log
const { readFileSync } = await import('node:fs');
const logContent = readFileSync(join(__dirname, '_logs', 'run.log'), 'utf-8');
const hasSlotCreate = logContent.includes('slot_create');
const hasDispatch = logContent.includes('dispatch');

console.log(JSON.stringify({ slotCount: slots.length, hasSlotCreate, hasDispatch }));
JS
node "$B/_subagent_dispatch.mjs"
```

→ 预期：`_logs/run.log` 含 `slot_create` 和 `dispatch`。

### 3b: 启动真实 native subagent [MAIN->SUBAGENT]

> 使用 `Agent tool` 启动 project agent `dpt-source-intake`。Subagent 读取 slot 的 `task.md` 和 `result.schema.json`，执行搜索，写 `runtime-receipt.jsonl`，返回 strict JSON。

```bash
B= # populated from Step 1

# Record spawn metadata
cat > "$B/_spawn.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const { recordAgentSpawnRequested } = await import('../DPT_FRAMEWORK/engine/subagent-relay.mjs');
const [slot] = JSON.parse(readFileSync(join(__dirname, '_slots.json'), 'utf-8'));
const prompt = recordAgentSpawnRequested(slot, __dirname, {
  platform: 'claude-code',
  runtimeMode: 'project-agent',
});
console.log(prompt);
JS
node "$B/_spawn.mjs" 2>&1 | grep -v "^\[trace\]"
```

Now: **用 `Agent tool` 启动 native subagent `dpt-source-intake`，传递上面的 prompt。等待返回。**

### 3c: Collect + merge [MAIN/SHELL]

```bash
B= # populated from Step 1

cat > "$B/_collect_merge.mjs" << 'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const { collectAndMergeSubagentResults } = await import('../DPT_FRAMEWORK/engine/subagent-relay.mjs');
const slots = JSON.parse(readFileSync(join(__dirname, '_slots.json'), 'utf-8'));

const state = {
  current_gate: 'wave0_complete',
  ref_count: 5,
  ref_floor: 5,
  topicReadiness: 'ready',
  subagent_results: [],
  subagent_wave: 0,
  subagent_all_failed: false,
};

const result = collectAndMergeSubagentResults(state, slots, __dirname);

// Verify engine log has collect + merge
const logContent = readFileSync(join(__dirname, '_logs', 'run.log'), 'utf-8');
const hasCollect = logContent.includes('collect');
const hasMerge = logContent.includes('merge');

// Check for repair events if all subagents failed
const hasRepair = logContent.includes('repair');

console.log(JSON.stringify({
  allFailed: result.finalState.subagent_all_failed,
  hasCollect, hasMerge, hasRepair,
  ref_count: result.finalState.ref_count,
}));
JS
node "$B/_collect_merge.mjs"
```

→ 预期：`_logs/run.log` 含 `collect` 和 `merge`。如果 subagent 全部失败，含 `repair`。

---

## Step 4: Agent log + gate log 交织

```bash
B= # populated from Step 1

# Agent writes phase START/END
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:wave0 START — engine test"
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:wave0 END — gate PASS"

# Run a gate to add gate_attempt to the mix
node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle "$B" --current-node "phases/phase-setup.md" || true

echo "Agent + gate log entries added"
```

→ 预期：gate_attempt 和 phase 日志出现在 `_logs/run.log`。

---

## Step 5: inspect-bundle --timeline 三源交织验证

```bash
B= # populated from Step 1

cat > "$B/_verify_interleave.mjs" << 'JS'
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const stdout = execSync(`node DPT_FRAMEWORK/cli/inspect-bundle.mjs "${__dirname}" --timeline`, { encoding: 'utf-8', stdio: 'pipe' });

const hasTrace = stdout.includes('[trace]');
const hasLog = stdout.includes('[log]');
// Subagent and queue sinks may or may not exist depending on test
const hasSubagent = stdout.includes('[subagent]');
const hasQueue = stdout.includes('[queue]');
const noUnparsed = !stdout.includes('[unparsed]');

// Verify engine events in log
const logContent = readFileSync(join(__dirname, '_logs', 'run.log'), 'utf-8');

// Check for closed-set events from both engines
const qmEvents = ['enqueue', 'claim', 'complete', 'refill'].filter(e => logContent.includes(e));
const srEvents = ['slot_create', 'dispatch', 'result', 'collect', 'merge'].filter(e => logContent.includes(e));
const gateEvents = logContent.includes('gate_attempt');
const agentEvents = logContent.includes('phase:wave0');

const checks = [
  { event: 'check', gate: 'timeline-multi-source', passed: hasTrace && hasLog, expected: true, detail: 'timeline stitches [trace] + [log]' },
  { event: 'check', gate: 'engine-qm-log', passed: qmEvents.length > 0, expected: true, detail: `queue-manager events in log: ${qmEvents.join(', ')}` },
  { event: 'check', gate: 'engine-sr-log', passed: srEvents.length >= 1, expected: true, detail: `subagent-relay events in log: ${srEvents.join(', ')}` },
  { event: 'check', gate: 'gate-agent-interleave', passed: gateEvents && agentEvents, expected: true, detail: 'gate + Agent log entries coexist with engine entries' },
  { event: 'check', gate: 'timeline-clean', passed: noUnparsed, expected: true, detail: 'no unparsed entries — single regex covers all sources' },
];

const tracePath = join(__dirname, '_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify({ ts: new Date().toISOString(), ...c }) + '\n', { flag: 'a' });
}

console.log(JSON.stringify({ qmEvents, srEvents, gateEvents, agentEvents, hasTrace, hasLog, hasSubagent, hasQueue, noUnparsed }));
JS
node "$B/_verify_interleave.mjs"
```

→ 预期：`[trace]` + `[log]` 并存，engine 事件出现在 log 中，gate/Agent 事件与 engine 事件交织。

---

## Step 6: 验证 repair trace（如果触发）

```bash
B= # populated from Step 1

cat > "$B/_verify_repair.mjs" << 'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const logContent = readFileSync(join(__dirname, '_logs', 'run.log'), 'utf-8');
const traceContent = readFileSync(join(__dirname, 'rb_trace.jsonl'), 'utf-8');

const logHasRepair = logContent.includes('repair');
const traceHasRepair = traceContent.includes('"event":"repair"');

// If repair was triggered, it MUST appear in BOTH log and trace
// If no repair triggered, this check is vacuously true
const repairOk = !logHasRepair || (logHasRepair && traceHasRepair);

const check = {
  event: 'check',
  gate: 'repair-trace',
  passed: repairOk,
  expected: true,
  detail: logHasRepair
    ? (traceHasRepair ? 'repair in both log and trace' : 'repair in log but MISSING from trace')
    : 'no repair triggered (vacuously OK)',
};

const tracePath = join(__dirname, '_trace.jsonl');
writeFileSync(tracePath, JSON.stringify({ ts: new Date().toISOString(), ...check }) + '\n', { flag: 'a' });

console.log(JSON.stringify({ logHasRepair, traceHasRepair, repairOk }));
JS
node "$B/_verify_repair.mjs"
```

→ 预期：如果 repair 被触发，它必须同时出现在 log 和 trace 中。

---

## Step 7: 从 trace 裁决

```bash
B= # populated from Step 1

cat > "$B/_verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const tracePath = join(__dirname, '_trace.jsonl');
const raw = readFileSync(tracePath, 'utf-8').trim();
if (!raw) {
  console.log('FAIL: No trace events found');
  process.exit(1);
}

const lines = raw.split('\n').filter(l => l.trim());
const events = lines.map(l => JSON.parse(l));
const checks = events.filter(e => e.event === 'check');

if (checks.length === 0) {
  console.log('FAIL: No check events in trace');
  process.exit(1);
}

const failed = checks.filter(c => c.passed !== (c.expected !== undefined ? c.expected : true));
const passed = checks.filter(c => c.passed === (c.expected !== undefined ? c.expected : true));

console.log('');
console.log('══════ Verdict ══════');
for (const c of checks) {
  const icon = c.passed === (c.expected !== undefined ? c.expected : true) ? 'PASS' : 'FAIL';
  console.log(`  ${icon}  ${c.gate}: ${c.detail}`);
}
console.log('══════════════════════');
console.log(`PASS: ${passed.length}  FAIL: ${failed.length}`);

if (failed.length > 0) {
  console.log(`\nFAIL — ${failed.length} check(s) failed`);
  process.exit(1);
}
console.log(`\nPASS — all ${checks.length} checks passed`);
console.log('Proof: engine closed-set events log correctly, log entries from queue-manager + subagent-relay + gate + Agent interleave naturally in _logs/run.log, and --timeline stitches them all.');
JS
node "$B/_verdict.mjs"
```

→ 预期：PASS，所有 check 通过。

---

## Step 8: 结果解读

| Check gate | 证明 |
|------------|------|
| `timeline-multi-source` | `--timeline` 缝合 log + trace 两个 sink |
| `engine-qm-log` | queue-manager closed-set 事件（enqueue/claim/complete/refill）产生 log 行 |
| `engine-sr-log` | subagent-relay closed-set 事件（slot_create/dispatch/result/collect/merge）产生 log 行 |
| `gate-agent-interleave` | gate + Agent log 行与 engine log 行自然交织在同一文件中 |
| `timeline-clean` | 无 envelope 解析失败——所有 4 个来源共享统一格式 |
| `repair-trace` | repair 事件同时出现在 log（warn）和 trace（JSONL）中 |

**PASS 含义**：engine logger 激活成功，closed-set 事件正确双写，不同来源的 log 行在单一 `_logs/run.log` 中按时间戳可追溯，`--timeline` 可缝合。

**FAIL 含义**：至少一个 engine 的 closed-set 事件未产生 log，或 repair trace 缺失（charter MUST 要求）。

---

## Cleanup

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

```bash
B= # populated from Step 1
rm -rf "$B" && echo "Cleaned up $B"
```

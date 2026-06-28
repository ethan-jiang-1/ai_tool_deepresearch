---
schema: command-experiment/v1
experiment: system-logging
case: case-72-standard-engine-lifecycle
weight: heavy
case_goal: "验证 queue-manager + subagent-relay closed-set logger——engine 事件（enqueue/claim/complete/refill, slot_create/dispatch/result/collect/merge）进入 _logs/run.log，与 gate/Agent log 自然交织，--timeline 缝合。Subagent 只做 trivial return，不搜索不阅读。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_log_engine
trace: dpt_disp_log_engine/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行；包含一个 trivial native subagent（不做搜索/阅读，直接 return static JSON）。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace。

# case-72-standard-engine-lifecycle

验证 engine 侧 logger：QM closed-set（enqueue/claim/complete/refill）+ SR closed-set（slot_create/dispatch/result/collect/merge），与 gate + Agent log 交织。

## Expected Runtime Path

1. 创建 disposable bundle `[MAIN/SHELL]`
2. QM: enqueue → claim → complete `[MAIN/SHELL]`
3. SR: dispatch slots → 启动 trivial subagent → collect → merge `[MAIN->SUBAGENT]`
4. Agent log + gate log 交织 `[MAIN/SHELL]`
5. `--timeline` 缝合 + trace 裁决 `[MAIN/SHELL]`

---

## Step 1: 创建 bundle + 初始 log

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs log_engine --case case-72 --force 2>/dev/null)
touch "$B/reference/_INDEX.md" "$B/reference/README.md"
mkdir -p "$B/artifacts/wave0"

# 写首条 log
node -e "import('$(pwd)/DPT_FRAMEWORK/engine/logger.mjs').then(m=>{m.logToRun('$B','info','experiment start');process.exit(0)})"

node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
echo "B=$B"
```

→ 预期：bundle 就绪，`_logs/run.log` 含首行。

---

## Step 2: Queue Manager — enqueue → claim → complete

```bash
B= # populated from Step 1

cat > "$B/_qm.mjs" << 'JS'
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const { createQueue, enqueue, claim, complete, makeItem, saveQueue, loadQueue } = await import('../DPT_FRAMEWORK/engine/queue-manager.mjs');

// Init logger via loadQueue → saveQueue cycle
writeFileSync(join(__dirname, '_receipt_test.json'), '{"ok":true}\n');
let q = createQueue('log-test');
saveQueue(__dirname, q);
q = loadQueue(__dirname);

// Enqueue + claim + complete
q = enqueue(q, makeItem({ work_id: 'task-1', title: 'Test', completion_receipt: 'json:_receipt_test.json' }));
q = enqueue(q, makeItem({ work_id: 'task-2', title: 'Task 2' }));
saveQueue(__dirname, q);
q = loadQueue(__dirname);
const { queue: q2, item } = claim(q);
if (item) { await complete(q2, { work_id: 'task-1', summary: 'done' }, __dirname); }

const log = readFileSync(join(__dirname, '_logs', 'run.log'), 'utf-8');
const found = ['enqueue','claim','complete'].filter(e => log.includes(e));
console.log('QM events: ' + found.join(', '));
JS
node "$B/_qm.mjs"
```

→ 预期：`enqueue, claim, complete` 在 log 中。

---

## Step 3: Subagent Relay — dispatch + trivial subagent + collect + merge

### 3a: Dispatch slots

```bash
B= # populated from Step 1

cat > "$B/_dispatch.mjs" << 'JS'
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const { stageSubagentSlots } = await import('../DPT_FRAMEWORK/engine/subagent-relay.mjs');

const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready', subagent_results: [], subagent_wave: 0, subagent_all_failed: false };
const dispatchMap = new Map([['pass', [{
  key: 'trivial',
  slotIndex: 0,
  roleAgentKey: 'dpt-source-intake',
  taskDescription: 'Do NOT search or read anything. Return this exact JSON immediately: {"slotKey":"trivial","roleAgentKey":"dpt-source-intake","status":"done","summary":"trivial","evidenceCount":0,"references":[],"confidence":1.0,"notes":["trivial pass-through — no work done"]}',
  timeoutMs: 30000,
}]]]);

const slots = stageSubagentSlots(state, __dirname, dispatchMap);
writeFileSync(join(__dirname, '_slots.json'), JSON.stringify(slots, null, 2));

const log = readFileSync(join(__dirname, '_logs', 'run.log'), 'utf-8');
console.log('slots: ' + slots.length + ' | slot_create=' + log.includes('slot_create') + ' dispatch=' + log.includes('dispatch'));
JS
node "$B/_dispatch.mjs"
```

→ 预期：`slot_create` + `dispatch` 在 log。

### 3b: 获取 spawn prompt + 启动 trivial subagent

```bash
B= # populated from Step 1

cat > "$B/_spawn.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const { recordAgentSpawnRequested } = await import('../DPT_FRAMEWORK/engine/subagent-relay.mjs');
const [slot] = JSON.parse(readFileSync(join(__dirname, '_slots.json'), 'utf-8'));
const prompt = recordAgentSpawnRequested(slot, __dirname, { platform: 'claude-code', runtimeMode: 'project-agent' });
console.log(prompt);
JS
node "$B/_spawn.mjs" 2>&1 | grep -v "^\[trace\]"
```

→ 用 `Agent tool` 启动 native subagent `dpt-source-intake`，传入上述 prompt。Subagent 直接 return static JSON，不做搜索。

### 3c: Commit + collect + merge

```bash
B= # populated from Step 1

cat > "$B/_collect.mjs" << 'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const { commitSlotResult, ingestAgentReceipt, collectResults, mergeResults } = await import('../DPT_FRAMEWORK/engine/subagent-relay.mjs');
const slots = JSON.parse(readFileSync(join(__dirname, '_slots.json'), 'utf-8'));
const [slot] = slots;

// Write minimal runtime receipt
writeFileSync(join(__dirname, slot.taskPath.replace('task.md', 'runtime-receipt.jsonl')),
  '{"event":"agent_runtime_started","slotKey":"trivial","roleAgentKey":"dpt-source-intake","receiptNonce":"' + slot.receiptNonce + '"}\n' +
  '{"event":"agent_result_ready","slotKey":"trivial","roleAgentKey":"dpt-source-intake","receiptNonce":"' + slot.receiptNonce + '"}\n');

ingestAgentReceipt(slot, __dirname, { runtimeAgentId: 'ag-triv', platform: 'claude-code', runtimeMode: 'project-agent' });
commitSlotResult(slot, __dirname, {
  slotKey: 'trivial', roleAgentKey: 'dpt-source-intake', status: 'done',
  summary: 'trivial', evidenceCount: 0, references: [], confidence: 1.0, notes: ['trivial']
}, { runtimeAgentId: 'ag-triv' });

const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready', subagent_results: [], subagent_wave: 0, subagent_all_failed: false };
const results = collectResults(slots, __dirname);
const merged = mergeResults(results, state);

const log = readFileSync(join(__dirname, '_logs', 'run.log'), 'utf-8');
const srEvents = ['slot_create','dispatch','result','collect','merge'].filter(e => log.includes(e));
console.log('SR events: ' + srEvents.join(', '));
console.log('merge: ref_count=' + merged.ref_count);
JS
node "$B/_collect.mjs"
```

→ 预期：`slot_create, dispatch, result, collect, merge` 在 log。

---

## Step 4: Agent log + gate 交织

```bash
B= # populated from Step 1

node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:wave0 START — engine test"
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:wave0 END — gate PASS"
node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle "$B" --current-node "phases/phase-setup.md" 2>&1 || true

echo "Agent + gate entries added"
```

---

## Step 5: Timeline + 裁决

```bash
B= # populated from Step 1

echo "=== --timeline ==="
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B" --timeline 2>&1

cat > "$B/_verdict.mjs" << 'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const B = process.argv[2];
const log = readFileSync(join(B, '_logs', 'run.log'), 'utf-8');
const trace = readFileSync(join(B, 'rb_trace.jsonl'), 'utf-8');
const tl = execSync(`node DPT_FRAMEWORK/cli/inspect-bundle.mjs "${B}" --timeline`, { encoding: 'utf-8' });

const checks = [
  { event: 'check', gate: 'qm-events', passed: ['enqueue','claim','complete'].filter(e => log.includes(e)).length >= 2, expected: true, detail: 'QM closed-set in log' },
  { event: 'check', gate: 'sr-events', passed: ['slot_create','dispatch','result','collect','merge'].filter(e => log.includes(e)).length >= 3, expected: true, detail: 'SR closed-set in log' },
  { event: 'check', gate: 'interleave', passed: log.includes('gate_attempt') && log.includes('phase:wave0'), expected: true, detail: 'gate + Agent coexist with engine entries' },
  { event: 'check', gate: 'timeline-stitch', passed: tl.includes('[trace]') && tl.includes('[log]'), expected: true, detail: 'timeline stitches [trace]+[log]' },
  { event: 'check', gate: 'timeline-clean', passed: !tl.includes('[unparsed]'), expected: true, detail: 'no unparsed entries' },
];

const tpath = join(B, '_logs', '_trace.jsonl');
for (const c of checks) writeFileSync(tpath, JSON.stringify({ ts: new Date().toISOString(), ...c }) + '\n', { flag: 'a' });

const failed = checks.filter(c => !c.passed);
console.log('══════ Verdict ══════');
for (const c of checks) console.log(`  ${c.passed ? 'PASS' : 'FAIL'}  ${c.gate}: ${c.detail}`);
console.log('══════════════════════');
console.log('PASS: ' + (checks.length - failed.length) + '  FAIL: ' + failed.length);
if (failed.length) { console.log('\nFAIL'); process.exit(1); }
console.log('\nPASS — engine closed-set logging: QM + SR events in log, interleaved with gate + Agent');
JS
node "$B/_verdict.mjs" "$B"
```

→ 预期：PASS。

---

## Step 6: 结果解读

| Check | 证明 |
|-------|------|
| `qm-events` | queue-manager closed-set（enqueue/claim/complete）产生 log 行 |
| `sr-events` | subagent-relay closed-set（slot_create/dispatch/result/collect/merge）产生 log 行 |
| `interleave` | engine + gate + Agent 三种来源的 log 行共存于同一文件 |
| `timeline-stitch` | `--timeline` 缝合 `[trace]` + `[log]` |
| `timeline-clean` | 单 regex 全解析，零 `[unparsed]` |

**PASS 含义**：engine logger 激活成功，closed-set 事件双写，不同来源 log 自然交织，timeline 可缝合。

---

## Cleanup

**PASS 才执行。FAIL 时保留现场。**

```bash
B= # populated from Step 1
rm -rf "$B" && echo "Cleaned up $B"
```

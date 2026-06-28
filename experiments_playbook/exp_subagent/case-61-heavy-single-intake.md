---
schema: command-experiment/v1
experiment: subagent
case: case-61-heavy-single-intake
weight: heavy
case_goal: "验证一个真实 native subagent 通过 Parent Relay 完成 dispatch、spawn、collect、merge 和 audit。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-61_gs_simple
trace: dpt_disp_case-61_gs_simple/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Runtime context** | disposable bundle，`new-disposable-bundle.mjs` 创建 |
| **Framework path** | `subagent-relay.mjs`（`stageSubagentSlots`, `commitSlotResult`, `collectAndMergeSubagentResults`） |
| **Agent actor** | **有** — 真实 Sub-agent (`dpt-source-intake`) 执行 WebSearch/WebFetch |
| **External calls** | 有 — WebSearch + WebFetch |
| **Verdict source** | trace events（`agent_runtime_started`, `agent_result_ready`, `result_schema_validated`） |
| **不证明** | delegated complete() 边界、ledger 生成 — 仅证明 Sub-agent relay slot 生命周期 |

# case-61-heavy-single-intake

验证一个真实 LLM subagent 通过 Parent Relay 的最小完整生命周期。

## Task Size [MAIN]

**选择 `research_question` 和任务规模；只把展开后的具体任务写入 slot task。**

- 默认 `fast`，除非用户明确要求更深入。
- **normal** 信号："认真做", "完整跑", "fully", "thorough", "deep", "慢慢来", "真实能力"。
- **fast** 信号："跑一下", "试试", "quick", "test"，或没有强信号。
- 不确定时用 `fast`；用户可以重新跑 `normal`。

## Expected Runtime Path

1. Engine dispatch 一个 slot：`source_intake`，role `dpt-source-intake`。`[MAIN/SHELL]`
2. Parent 记录 native-agent request metadata。`[MAIN/SHELL]`
3. Parent 通过 `Agent tool` 启动并等待一个 native LLM subagent。`[MAIN->SUBAGENT]`
4. Subagent 读取含具体任务的 `task.md` 和 `result.schema.json`，写自己的 `runtime-receipt.jsonl`，再返回 `strict JSON`。`[SUBAGENT]`
5. Parent 导入 receipt，校验 JSON，写 durable slot files。`[MAIN/SHELL]`
6. Engine collect、merge、audit runtime-agent trace events。`[MAIN/SHELL]`

## Phase 1: Prepare Bundle And Dispatch [MAIN/SHELL]

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs gs_simple --case case-61 --force)

# 质量检查
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"

cat > "$B/dispatch.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { stageSubagentSlots } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const researchQuestion = 'What is Google Scholar, and what kind of scholarly literature does it help users search?';
// MAIN: choose task size here. Subagent sees only the expanded taskDescription.
const taskSize = 'fast';
const taskPolicy = {
  fast: {
    taskDescription: `research_question="${researchQuestion}". Find ONE official or primary candidate source quickly. Brief search only. Target 2 minutes. Return bounded JSON only.`,
    timeoutMs: 120000,
  }, normal: {
    taskDescription: `research_question="${researchQuestion}". Find TWO official or primary candidate sources. Do a more careful search. Target 10 minutes. Return bounded JSON only.`,
    timeoutMs: 600000,
  },
};

const __dirname = esmDirname(import.meta.url);
const policy = taskPolicy[taskSize];
if (!policy) throw new Error(`Unknown taskSize: ${taskSize}`);

const dispatchMap = new Map([['pass', [{
  key: 'source_intake',
  slotIndex: 0,
  roleAgentKey: 'dpt-source-intake',
  taskDescription: policy.taskDescription,
  timeoutMs: policy.timeoutMs
}]]]);

const slots = stageSubagentSlots(
  { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' },
  __dirname,
  dispatchMap
);
writeFileSync(__dirname + '/_slots.json', JSON.stringify(slots, null, 2));
console.log(`Dispatch OK: ${slots.length} slot -> ${slots[0].roleAgentKey} (taskSize=${taskSize})`);
console.log(`Slot task: ${__dirname}/${slots[0].taskPath}`);
JS
node "$B/dispatch.mjs" 2>&1 | grep -v "^\[trace\]"
```

## Phase 2: Native Subagent Run

### 2a: 记录 request metadata [MAIN/SHELL]

```bash
cat > "$B/native-agent-request.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { recordAgentSpawnRequested } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const [slot] = JSON.parse(readFileSync(__dirname + '/_slots.json', 'utf-8'));
const platform = 'claude-code';
const runtimeMode = 'project-agent';
const prompt = recordAgentSpawnRequested(slot, __dirname, { platform, runtimeMode, parentRuntimeAgentId: undefined });
console.log(prompt);
JS
node "$B/native-agent-request.mjs" 2>&1 | grep -v "^\[trace\]"
```

### 2b: 启动并等待 native subagent [MAIN->SUBAGENT]

> 只在这里调用 `Agent tool` 并等待；禁止用 shell script / OS subprocess 模拟 subagent。

用 `Agent tool` 启动 project agent `dpt-source-intake`，使用 2a 打印的 prompt；等待返回后记录 `agentId` 和 `strict JSON`。

Subagent must:
- Read `dpt_disp_case-61_gs_simple/_subagents/wave_01/slot_00/task.md` and follow the concrete task there
- Read `dpt_disp_case-61_gs_simple/_subagents/wave_01/slot_00/result.schema.json`
- Write `dpt_disp_case-61_gs_simple/_subagents/wave_01/slot_00/runtime-receipt.jsonl` from inside the subagent context:
  - first JSONL line before task work: `{"event":"agent_runtime_started","slotKey":"source_intake","roleAgentKey":"dpt-source-intake","receiptNonce":"<NONCE_FROM_2A>"}`
  - second JSONL line immediately before returning: `{"event":"agent_result_ready","slotKey":"source_intake","roleAgentKey":"dpt-source-intake","receiptNonce":"<NONCE_FROM_2A>"}`
- Return `strict JSON` matching the schema; no markdown fences, no prose outside JSON.

### 2c: 导入 subagent runtime receipt [MAIN/SHELL]

把 `<AGENT_ID>` 替换成 2b 的实际 `agentId`。

```bash
cat > "$B/import-receipt.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { ingestAgentReceipt } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const [slot] = JSON.parse(readFileSync(__dirname + '/_slots.json', 'utf-8'));
const imported = ingestAgentReceipt(slot, __dirname, { platform: 'claude-code', runtimeMode: 'project-agent', runtimeAgentId: 'test-runtime-agent' });
console.log('receipt imported: ' + imported.agent.runtimeAgentId);
JS
DPT_RUNTIME_AGENT_ID="<AGENT_ID>" node "$B/import-receipt.mjs"
```

### 2d: 写 subagent result [MAIN]

从 2b 的 subagent 输出中提取 `strict JSON`，写入 `dpt_disp_case-61_gs_simple/relay-source-intake.json`。

### 2e: 校验 result 并写 durable files [MAIN/SHELL]

```bash
cat > "$B/parent-relay.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { commitSlotResult } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const [slot] = JSON.parse(readFileSync(__dirname + '/_slots.json', 'utf-8'));
const result = JSON.parse(readFileSync(__dirname + '/relay-source-intake.json', 'utf-8'));
const relay = commitSlotResult(slot, __dirname, result, { platform: 'claude-code', runtimeMode: 'project-agent', parentRuntimeAgentId: undefined });
console.log('Relay ' + (relay.ok ? 'OK' : 'FAILED') + ': ' + slot.key);
if (!relay.ok) console.log(relay.result.notes.join('; '));
JS
node "$B/parent-relay.mjs" 2>&1 | grep -v "^\[trace\]"
```

## Phase 3: Collect, Merge, Audit [MAIN/SHELL]

```bash
cat > "$B/collect.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { collectAndMergeSubagentResults, forkRouter } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const slots = JSON.parse(readFileSync(__dirname + '/_slots.json', 'utf-8'));
const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' };
const merged = collectAndMergeSubagentResults(state, slots, __dirname);
console.log(`ref_count=${merged.finalState.ref_count} all_failed=${merged.finalState.subagent_all_failed} branch=${forkRouter(merged.finalState).branch}`);
JS
node "$B/collect.mjs" 2>&1 | grep -v "^\[trace\]"

cat > "$B/audit.mjs" << 'JS'
import { readFileSync } from 'node:fs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);
const events = readFileSync(__dirname + '/rb_trace.jsonl', 'utf-8').trim().split('\n').map(JSON.parse);
const required = ['agent_spawn_requested', 'agent_runtime_started', 'agent_result_ready', 'agent_result_received', 'result_schema_validated', 'collect_result', 'merge_complete'];
// Write check events for verdict (command-experiments guideline Principle 6)
const { appendFileSync } = await import('node:fs');
for (const name of required) {
  const found = events.some(e => e.event === name);
  appendFileSync(__dirname + '/rb_trace.jsonl', JSON.stringify({
    ts: new Date().toISOString(), event: 'check', source: 'case-61',
    gate: 'subagent-lifecycle', passed: found, expected: true,
    detail: found ? 'lifecycle event ' + name + ' present' : 'lifecycle event ' + name + ' missing',
  }) + '\n');
}
// Re-read to include new check events
const events2 = readFileSync(__dirname + '/rb_trace.jsonl', 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events2.filter(e => e.event === 'check');
const pass = checks.length > 0 && checks.every(c => c.passed === true);
console.log(pass ? '\x1b[32mCASE-61 PASS\x1b[0m' : '\x1b[31mCASE-61 FAIL\x1b[0m');
if (!pass) console.log('failed checks:', checks.filter(c => !c.passed).map(c => c.detail).join(', '));
if (!pass) process.exit(1);
JS
node "$B/audit.mjs"
```


## Step 4: 结果解读

> 验证单个 sub-agent 完整生命周期：
>   dispatch → spawn → 搜索 → receipt → collect → merge → audit。
>   trace 含 agent_spawn_requested, runtime_started, result_ready, result_received, schema_validated, collect_result, merge_complete。


## Step HH: Post-Execution Health

Heavy profile — gate diagnostics, timeline consistency, ledger, receipts, cache trails, dedup evidence.

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile heavy
```

> 健康检查不改变 verdict。health status 由 runner report 记录。

## Step 5: Cleanup [MAIN/SHELL]

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_case-61_gs_*
echo "cleaned: gs_simple"
```
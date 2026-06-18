---
schema: command-experiment/v1
experiment: subagent
case: simple
case_goal: "验证一个真实 native subagent 通过 Parent Relay 完成 dispatch、spawn、collect、merge 和 audit。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gs_simple
trace: dpt_disp_gs_simple/_trace_subagent.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-subagent-simple

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
B=$(node experiments/shared/new-disposable-bundle.mjs gs_simple --force)

# 质量检查
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"

cat > "$B/dispatch.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { stageSubagentSlots } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';


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
  'dpt_disp_gs_simple',
  dispatchMap
);
writeFileSync('dpt_disp_gs_simple/_slots.json', JSON.stringify(slots, null, 2));
console.log(`Dispatch OK: ${slots.length} slot -> ${slots[0].roleAgentKey} (taskSize=${taskSize})`);
console.log(`Slot task: dpt_disp_gs_simple/${slots[0].taskPath}`);
JS
node "$B/dispatch.mjs" 2>&1 | grep -v "^\[trace\]"
```

## Phase 2: Native Subagent Run

### 2a: 记录 request metadata [MAIN/SHELL]

```bash
cat > "$B/native-agent-request.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { recordAgentSpawnRequested } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

const [slot] = JSON.parse(readFileSync('dpt_disp_gs_simple/_slots.json', 'utf-8'));
const platform = process.env.DPT_AGENT_PLATFORM || 'claude-code';
const runtimeMode = process.env.DPT_AGENT_RUNTIME_MODE || 'project-agent';
const prompt = recordAgentSpawnRequested(slot, 'dpt_disp_gs_simple', { platform, runtimeMode, parentRuntimeAgentId: process.env.DPT_PARENT_RUNTIME_AGENT_ID });
console.log(prompt);
JS
node "$B/native-agent-request.mjs" 2>&1 | grep -v "^\[trace\]"
```

### 2b: 启动并等待 native subagent [MAIN->SUBAGENT]

> 只在这里调用 `Agent tool` 并等待；禁止用 shell script / OS subprocess 模拟 subagent。

用 `Agent tool` 启动 project agent `dpt-source-intake`，使用 2a 打印的 prompt；等待返回后记录 `agentId` 和 `strict JSON`。

Subagent must:
- Read `dpt_disp_gs_simple/_subagents/wave_01/slot_00/task.md` and follow the concrete task there
- Read `dpt_disp_gs_simple/_subagents/wave_01/slot_00/result.schema.json`
- Write `dpt_disp_gs_simple/_subagents/wave_01/slot_00/runtime-receipt.jsonl` from inside the subagent context:
  - first JSONL line before task work: `{"event":"agent_runtime_started","slotKey":"source_intake","roleAgentKey":"dpt-source-intake","receiptNonce":"<NONCE_FROM_2A>"}`
  - second JSONL line immediately before returning: `{"event":"agent_result_ready","slotKey":"source_intake","roleAgentKey":"dpt-source-intake","receiptNonce":"<NONCE_FROM_2A>"}`
- Return `strict JSON` matching the schema; no markdown fences, no prose outside JSON.

### 2c: 导入 subagent runtime receipt [MAIN/SHELL]

把 `<AGENT_ID>` 替换成 2b 的实际 `agentId`。

```bash
cat > "$B/import-receipt.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { ingestAgentReceipt } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

const [slot] = JSON.parse(readFileSync('dpt_disp_gs_simple/_slots.json', 'utf-8'));
const imported = ingestAgentReceipt(slot, 'dpt_disp_gs_simple', { platform: 'claude-code', runtimeMode: 'project-agent', runtimeAgentId: process.env.DPT_RUNTIME_AGENT_ID });
console.log('receipt imported: ' + imported.agent.runtimeAgentId);
JS
DPT_RUNTIME_AGENT_ID="<AGENT_ID>" node "$B/import-receipt.mjs"
```

### 2d: 写 subagent result [MAIN]

从 2b 的 subagent 输出中提取 `strict JSON`，写入 `dpt_disp_gs_simple/relay-source-intake.json`。

### 2e: 校验 result 并写 durable files [MAIN/SHELL]

```bash
cat > "$B/parent-relay.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { commitSlotResult } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

const [slot] = JSON.parse(readFileSync('dpt_disp_gs_simple/_slots.json', 'utf-8'));
const result = JSON.parse(readFileSync('dpt_disp_gs_simple/relay-source-intake.json', 'utf-8'));
const relay = commitSlotResult(slot, 'dpt_disp_gs_simple', result, { platform: 'claude-code', runtimeMode: 'project-agent', parentRuntimeAgentId: process.env.DPT_PARENT_RUNTIME_AGENT_ID });
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

const slots = JSON.parse(readFileSync('dpt_disp_gs_simple/_slots.json', 'utf-8'));
const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' };
const merged = collectAndMergeSubagentResults(state, slots, 'dpt_disp_gs_simple');
console.log(`ref_count=${merged.finalState.ref_count} all_failed=${merged.finalState.subagent_all_failed} branch=${forkRouter(merged.finalState).branch}`);
JS
node "$B/collect.mjs" 2>&1 | grep -v "^\[trace\]"

cat > "$B/audit.mjs" << 'JS'
import { readFileSync } from 'node:fs';
const events = readFileSync('dpt_disp_gs_simple/_trace_subagent.jsonl', 'utf-8').trim().split('\n').map(JSON.parse);
const required = ['agent_spawn_requested', 'agent_runtime_started', 'agent_result_ready', 'agent_result_received', 'result_schema_validated', 'collect_result', 'merge_complete'];
const pass = required.every(name => events.some(e => e.event === name));
console.log(pass ? 'SIMPLE PASS' : 'SIMPLE FAIL');
if (!pass) console.log('missing:', required.filter(name => !events.some(e => e.event === name)).join(', '));
if (!pass) process.exit(1);
JS
node "$B/audit.mjs"
```

## Cleanup [MAIN/SHELL]

```bash
rm -rf dpt_disp_gs_simple
echo "cleaned: gs_simple"
```

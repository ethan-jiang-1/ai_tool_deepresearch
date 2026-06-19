---
schema: command-experiment/v1
experiment: subagent
case: medium
weight: heavy
case_goal: "验证两个真实 native subagent 的并行 spawn request 语义和 collect 前 trace 证据。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gs_medium
trace: dpt_disp_gs_medium/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-subagent-medium

验证两个真实 LLM subagent 通过 Parent Relay 的并行派发与收集路径。

## Task Size [MAIN]

**选择 `research_question` 和任务规模；只把展开后的具体任务写入 slot task。**

- Default to `fast` unless the user explicitly asks for depth.
- Signals for **normal**: "认真做", "完整跑", "fully", "thorough", "deep", "慢慢来", "真实能力".
- Signals for **fast**: "跑一下", "试试", "quick", "test", or no strong signal either way.
- When in doubt, use fast — the user can always re-run with normal.

## Phase 1: Prepare Bundle And Dispatch [MAIN/SHELL]

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs gs_medium --force)

# 质量检查
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"

cat > "$B/dispatch.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { stageSubagentSlots } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';


const researchQuestion = 'What is Google Scholar, and what kind of scholarly literature does it help users search?';
const canonicalSource = 'https://scholar.google.com/intl/en/scholar/help.html';
// MAIN: choose task size here. Subagents see only expanded taskDescription.
const taskSize = 'fast';
const taskPolicy = {
  fast: {
    timeoutMs: 120000,
    intake: `research_question="${researchQuestion}". Find ONE official or primary candidate source quickly. Brief search only. Return bounded JSON only.`,
    diagnostic: `research_question="${researchQuestion}". Assess source="${canonicalSource}" for materiality, trust tier, marketing risk, and cross-verification need. Brief assessment only. Return bounded JSON only.`,
  },
  normal: {
    timeoutMs: 600000,
    intake: `research_question="${researchQuestion}". Find TWO official or primary candidate sources. Do a more careful search. Return bounded JSON only.`,
    diagnostic: `research_question="${researchQuestion}". Assess source="${canonicalSource}" for materiality, trust tier, marketing risk, and cross-verification need. More careful assessment. Return bounded JSON only.`,
  },
};
const policy = taskPolicy[taskSize];
if (!policy) throw new Error(`Unknown taskSize: ${taskSize}`);

const dispatchMap = new Map([['pass', [
  {
    key: 'source_intake',
    slotIndex: 0,
    roleAgentKey: 'dpt-source-intake',
    taskDescription: policy.intake,
    timeoutMs: policy.timeoutMs
  },
  {
    key: 'source_diagnostic',
    slotIndex: 1,
    roleAgentKey: 'dpt-source-diagnostic',
    taskDescription: policy.diagnostic,
    timeoutMs: policy.timeoutMs
  }
]]]);

const slots = stageSubagentSlots(
  { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' },
  'dpt_disp_gs_medium',
  dispatchMap
);
writeFileSync('dpt_disp_gs_medium/_slots.json', JSON.stringify(slots, null, 2));
console.log(`Dispatch OK: ${slots.length} slots (taskSize=${taskSize})`);
for (const slot of slots) console.log(`Slot task: dpt_disp_gs_medium/${slot.taskPath}`);
JS
node "$B/dispatch.mjs" 2>&1 | grep -v "^\[trace\]"
```

## Phase 2: Native Subagent Spawns

Runtime proof comes from each subagent's slot-local `runtime-receipt.jsonl`;
result traces are written AFTER each subagent returns.
If the runtime exposes the parent agent id, set `DPT_PARENT_RUNTIME_AGENT_ID`;
parent trace events then include `actor: "parent"` and `parentRuntimeAgentId`,
while imported subagent receipt events include `actor: "subagent"` and the
subagent `runtimeAgentId`.

### 2a: Record request metadata [MAIN/SHELL]

This writes `agent_spawn_requested` for both slots and prints the spawn prompts.

```bash
cat > "$B/native-agent-request.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { recordAgentSpawnRequested } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

const slots = JSON.parse(readFileSync('dpt_disp_gs_medium/_slots.json', 'utf-8'));
const platform = process.env.DPT_AGENT_PLATFORM || 'claude-code';
const runtimeMode = process.env.DPT_AGENT_RUNTIME_MODE || 'project-agent';
for (const slot of slots) {
  const prompt = recordAgentSpawnRequested(slot, 'dpt_disp_gs_medium', { platform, runtimeMode, parentRuntimeAgentId: process.env.DPT_PARENT_RUNTIME_AGENT_ID });
  console.log('--- SPAWN PROMPT for ' + slot.key + ' ---');
  console.log(prompt);
}
JS
node "$B/native-agent-request.mjs" 2>&1 | grep -v "^\[trace\]"
```

### 2b: Start native subagents [MAIN->SUBAGENT]

Use the `Agent tool` for both subagents (may be in parallel — concurrency cap is 3).

- **Slot 0** (`source_intake`): project agent `dpt-source-intake`
  - Read `dpt_disp_gs_medium/_subagents/wave_01/slot_00/task.md`
  - Read `dpt_disp_gs_medium/_subagents/wave_01/slot_00/result.schema.json`
  - Write `dpt_disp_gs_medium/_subagents/wave_01/slot_00/runtime-receipt.jsonl`
  - Follow the concrete task in its `task.md`.
  - Return strict JSON.

- **Slot 1** (`source_diagnostic`): project agent `dpt-source-diagnostic`
  - Read `dpt_disp_gs_medium/_subagents/wave_01/slot_01/task.md`
  - Read `dpt_disp_gs_medium/_subagents/wave_01/slot_01/result.schema.json`
  - Write `dpt_disp_gs_medium/_subagents/wave_01/slot_01/runtime-receipt.jsonl`
  - Follow the concrete task in its `task.md`.
  - Return strict JSON.

**Record each subagent's `agentId`.** You will need them in step 2c.

### 2c: Import subagent runtime receipts [MAIN/SHELL]

Replace `<AGENT_ID_0>` and `<AGENT_ID_1>` with the actual agentIds from step 2b.
This validates subagent-written receipts and imports `agent_runtime_started`
plus `agent_result_ready` into the central trace.

```bash
cat > "$B/import-receipts.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { ingestAgentReceipt } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';
const slots = JSON.parse(readFileSync('dpt_disp_gs_medium/_slots.json', 'utf-8'));
for (const [i, slot] of slots.entries()) {
  const agentId = process.env['DPT_RUNTIME_AGENT_ID_' + i];
  const imported = ingestAgentReceipt(slot, 'dpt_disp_gs_medium', { platform: 'claude-code', runtimeMode: 'project-agent', runtimeAgentId: agentId });
  console.log('receipt imported slot ' + i + ': ' + imported.agent.runtimeAgentId);
}
JS
DPT_RUNTIME_AGENT_ID_0="<AGENT_ID_0>" DPT_RUNTIME_AGENT_ID_1="<AGENT_ID_1>" node "$B/import-receipts.mjs"
```

### 2d: Write subagent results [MAIN]

Extract strict JSON from each subagent output in 2b and write to the relay files:

- Slot 0 → `dpt_disp_gs_medium/relay-source-intake.json`
- Slot 1 → `dpt_disp_gs_medium/relay-source-diagnostic.json`

Each file must contain a JSON object matching the slot's `result.schema.json`.

### 2e: Validate results and write durable files [MAIN/SHELL]

```bash
cat > "$B/parent-relay.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { commitSlotResult } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

const slots = JSON.parse(readFileSync('dpt_disp_gs_medium/_slots.json', 'utf-8'));
const files = ['relay-source-intake.json', 'relay-source-diagnostic.json'];
for (const [i, slot] of slots.entries()) {
  const result = JSON.parse(readFileSync('dpt_disp_gs_medium/' + files[i], 'utf-8'));
  const relay = commitSlotResult(slot, 'dpt_disp_gs_medium', result, { platform: 'claude-code', runtimeMode: 'project-agent', parentRuntimeAgentId: process.env.DPT_PARENT_RUNTIME_AGENT_ID });
  console.log('Relay ' + (relay.ok ? 'OK' : 'FAILED') + ': ' + slot.key);
  if (!relay.ok) console.log(relay.result.notes.join('; '));
}
JS
node "$B/parent-relay.mjs" 2>&1 | grep -v "^\[trace\]"
```

## Phase 3: Collect, Merge, Audit [MAIN/SHELL]

```bash
cat > "$B/collect.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { collectAndMergeSubagentResults } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';
const slots = JSON.parse(readFileSync('dpt_disp_gs_medium/_slots.json', 'utf-8'));
const merged = collectAndMergeSubagentResults({ current_gate:'wave0_complete', ref_count:5, ref_floor:5, topicReadiness:'ready' }, slots, 'dpt_disp_gs_medium');
console.log(`done=${merged.results.filter(r=>r.status==='done').length} failed=${merged.results.filter(r=>r.status==='failed').length} all_failed=${merged.finalState.subagent_all_failed}`);
JS
node "$B/collect.mjs" 2>&1 | grep -v "^\[trace\]"

cat > "$B/audit.mjs" << 'JS'
import { readFileSync } from 'node:fs';
const events = readFileSync('dpt_disp_gs_medium/_trace.jsonl', 'utf-8').trim().split('\n').map(JSON.parse);
const count = name => events.filter(e => e.event === name).length;
const pass = count('agent_spawn_requested') === 2 && count('agent_runtime_started') === 2 && count('agent_result_ready') === 2 && count('agent_result_received') === 2 && count('result_schema_validated') === 2 && count('collect_result') === 2 && count('merge_complete') === 1;
console.log(pass ? '\x1b[32mMEDIUM PASS\x1b[0m' : '\x1b[31mMEDIUM FAIL\x1b[0m');
if (!pass) process.exit(1);
JS
node "$B/audit.mjs"
```

## Cleanup [MAIN/SHELL]

```bash
rm -rf dpt_disp_gs_*
echo "cleaned: gs_medium"
```

---
schema: command-experiment/v1
experiment: subagent
case: identity
weight: heavy
case_goal: "验证同一 subagent 模板在三个不同任务中产生不同 agentId、搜索路径和来源证据。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gs_identity
trace: dpt_disp_gs_identity/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-subagent-identity

验证三个使用同一 `dpt-source-intake` 模板的真实 subagent 仍具备独立运行身份。

## Task Size [MAIN]

**选择任务规模；只把展开后的公司任务写入每个 slot task。**

- Default to `fast` unless the user explicitly asks for depth.
- Signals for **normal**: "认真做", "完整跑", "fully", "thorough", "deep", "慢慢来", "真实能力".
- Signals for **fast**: "跑一下", "试试", "quick", "test", or no strong signal either way.
- When in doubt, use fast — the user can always re-run with normal.

## Expected Runtime Path

1. Engine dispatches 3 slots, all `dpt-source-intake`, different companies.
2. Parent spawns 3 native subagents concurrently (same template, different tasks).
3. Each subagent searches its assigned company, returns strict JSON.
4. Parent captures unique `agentId` from each subagent spawn.
5. Trace proves: 3 different agentIds, 3 different source URLs.
6. Engine collects, merges, audit confirms identity uniqueness.

## Phase 1: Prepare Bundle And Dispatch [MAIN/SHELL]

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs gs_identity --force)

# 质量检查
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"

cat > "$B/dispatch.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { stageSubagentSlots } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';


// MAIN: choose task size here. Subagents see only expanded taskDescription.
const taskSize = 'fast';
const taskPolicy = {
  fast: {
    suffix: 'Find ONE recent official or primary source quickly. Brief search only. Report your search journey in notes.',
    timeoutMs: 120000,
  },
  normal: {
    suffix: 'Find TWO primary sources from 2025-2026. Thorough search. Report your own search journey in notes: what you searched, how many results you examined, anything unique about your path.',
    timeoutMs: 600000,
  },
};
const policy = taskPolicy[taskSize];
if (!policy) throw new Error(`Unknown taskSize: ${taskSize}`);

// All three slots use the SAME agent type: dpt-source-intake
// Only the company differs — each gets a different company.
const dispatchMap = new Map([['pass', [
  {
    key: 'apple_research',
    slotIndex: 0,
    roleAgentKey: 'dpt-source-intake',
    taskDescription: 'Search for official news about Apple Inc. ' + policy.suffix,
    timeoutMs: policy.timeoutMs
  },
  {
    key: 'toyota_research',
    slotIndex: 1,
    roleAgentKey: 'dpt-source-intake',
    taskDescription: 'Search for official news about Toyota Motor Corporation. ' + policy.suffix,
    timeoutMs: policy.timeoutMs
  },
  {
    key: 'nestle_research',
    slotIndex: 2,
    roleAgentKey: 'dpt-source-intake',
    taskDescription: 'Search for official news about Nestlé S.A. ' + policy.suffix,
    timeoutMs: policy.timeoutMs
  }
]]]);

const slots = stageSubagentSlots(
  { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' },
  'dpt_disp_gs_identity',
  dispatchMap
);
writeFileSync('dpt_disp_gs_identity/_slots.json', JSON.stringify(slots, null, 2));
console.log('Dispatch OK: ' + slots.length + ' slots, all ' + slots[0].roleAgentKey + ' (taskSize=' + taskSize + ')');
for (const slot of slots) console.log('Slot task: dpt_disp_gs_identity/' + slot.taskPath);
JS
node "$B/dispatch.mjs" 2>&1 | grep -v "^\[trace\]"
```

## Phase 2: Native Subagent Spawns

All three subagents use the SAME project agent `dpt-source-intake`.
The ONLY difference is the company they search.
Runtime proof comes from each subagent's slot-local `runtime-receipt.jsonl`.
If the runtime exposes the parent agent id, set `DPT_PARENT_RUNTIME_AGENT_ID`;
parent trace events then include `actor: "parent"` and `parentRuntimeAgentId`,
while imported subagent receipt events include `actor: "subagent"` and the
subagent `runtimeAgentId`.

### 2a: Record request metadata [MAIN/SHELL]

```bash
cat > "$B/native-agent-request.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { recordAgentSpawnRequested } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

const slots = JSON.parse(readFileSync('dpt_disp_gs_identity/_slots.json', 'utf-8'));
const platform = process.env.DPT_AGENT_PLATFORM || 'claude-code';
const runtimeMode = process.env.DPT_AGENT_RUNTIME_MODE || 'project-agent';
for (const slot of slots) {
  const prompt = recordAgentSpawnRequested(slot, 'dpt_disp_gs_identity', { platform, runtimeMode, parentRuntimeAgentId: process.env.DPT_PARENT_RUNTIME_AGENT_ID });
  console.log('--- SPAWN PROMPT for ' + slot.key + ' ---');
  console.log(prompt);
}
JS
node "$B/native-agent-request.mjs" 2>&1 | grep -v "^\[trace\]"
```

### 2b: Start native subagents [MAIN->SUBAGENT]

Use the `Agent tool` for ALL THREE subagents concurrently. All use `dpt-source-intake`.

- **Slot 0** (`apple_research`): search Apple Inc — products, financials, strategy
- **Slot 1** (`toyota_research`): search Toyota Motor Corp — vehicles, EV strategy, sales
- **Slot 2** (`nestle_research`): search Nestlé S.A. — products, sustainability, market

Each subagent must:
- Read its own `task.md` and `result.schema.json` from its slot directory
- Write its own slot-local `runtime-receipt.jsonl`
- Follow the concrete company task in its `task.md`
- Return strict JSON matching the schema
- Report its own search journey in the `notes` field

**CRITICAL: Record each subagent's `agentId` from the Agent tool response.**
You will need all three for step 2c, where each real agentId is bound to that
subagent's receipt. This is the identity proof.

### 2c: Import subagent runtime receipts [MAIN/SHELL]

Replace `<AGENT_ID_0>`, `<AGENT_ID_1>`, `<AGENT_ID_2>` with the actual agentIds from 2b.
This validates subagent-written receipts and imports `agent_runtime_started`
plus `agent_result_ready` into the central trace.

```bash
cat > "$B/import-receipts.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { ingestAgentReceipt } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';
const slots = JSON.parse(readFileSync('dpt_disp_gs_identity/_slots.json', 'utf-8'));
for (const [i, slot] of slots.entries()) {
  const agentId = process.env['DPT_RUNTIME_AGENT_ID_' + i];
  const imported = ingestAgentReceipt(slot, 'dpt_disp_gs_identity', { platform: 'claude-code', runtimeMode: 'project-agent', runtimeAgentId: agentId });
  console.log('receipt imported slot ' + i + ' (' + slot.key + '): ' + imported.agent.runtimeAgentId);
}
JS
DPT_RUNTIME_AGENT_ID_0="<AGENT_ID_0>" DPT_RUNTIME_AGENT_ID_1="<AGENT_ID_1>" DPT_RUNTIME_AGENT_ID_2="<AGENT_ID_2>" node "$B/import-receipts.mjs"
```

### 2d: Write subagent results [MAIN]

Extract strict JSON from each subagent output and write to the relay files:

- Slot 0 → `dpt_disp_gs_identity/relay-apple-research.json`
- Slot 1 → `dpt_disp_gs_identity/relay-toyota-research.json`
- Slot 2 → `dpt_disp_gs_identity/relay-nestle-research.json`

### 2e: Validate results and write durable files [MAIN/SHELL]

```bash
cat > "$B/parent-relay.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { commitSlotResult } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

const slots = JSON.parse(readFileSync('dpt_disp_gs_identity/_slots.json', 'utf-8'));
const files = ['relay-apple-research.json', 'relay-toyota-research.json', 'relay-nestle-research.json'];
for (const [i, slot] of slots.entries()) {
  const result = JSON.parse(readFileSync('dpt_disp_gs_identity/' + files[i], 'utf-8'));
  const relay = commitSlotResult(slot, 'dpt_disp_gs_identity', result, { platform: 'claude-code', runtimeMode: 'project-agent', parentRuntimeAgentId: process.env.DPT_PARENT_RUNTIME_AGENT_ID });
  console.log('Relay ' + (relay.ok ? 'OK' : 'FAILED') + ': ' + slot.key + ' status=' + relay.result.status);
  if (!relay.ok) console.log(relay.result.notes.join('; '));
}
JS
node "$B/parent-relay.mjs" 2>&1 | grep -v "^\[trace\]"
```

## Phase 3: Collect, Merge, Identity Audit [MAIN/SHELL]

```bash
cat > "$B/collect.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { collectAndMergeSubagentResults } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';
const slots = JSON.parse(readFileSync('dpt_disp_gs_identity/_slots.json', 'utf-8'));
const merged = collectAndMergeSubagentResults({ current_gate:'wave0_complete', ref_count:5, ref_floor:5, topicReadiness:'ready' }, slots, 'dpt_disp_gs_identity');
console.log('done=' + merged.results.filter(r=>r.status==='done').length + ' failed=' + merged.results.filter(r=>r.status==='failed').length + ' all_failed=' + merged.finalState.subagent_all_failed);
JS
node "$B/collect.mjs" 2>&1 | grep -v "^\[trace\]"

cat > "$B/audit.mjs" << 'JS'
import { readFileSync } from 'node:fs';
const events = readFileSync('dpt_disp_gs_identity/_trace.jsonl', 'utf-8').trim().split('\n').map(JSON.parse);
const count = name => events.filter(e => e.event === name).length;

// Basic counts
const basic = count('agent_spawn_requested') === 3 && count('agent_runtime_started') === 3 && count('agent_result_ready') === 3 && count('agent_result_received') === 3 && count('result_schema_validated') === 3 && count('collect_result') === 3 && count('merge_complete') === 1;
console.log('Basic trace counts: ' + (basic ? 'PASS' : 'FAIL'));

// IDENTITY UNIQUENESS checks
const spawnedEvents = events.filter(e => e.event === 'agent_runtime_started');
const agentIds = spawnedEvents.map(e => e.runtimeAgentId).filter(Boolean);
const uniqueIds = new Set(agentIds);

console.log('');
console.log('=== IDENTITY REPORT ===');
console.log('Agent IDs found in trace:');
agentIds.forEach((id, i) => console.log('  [' + i + '] ' + id));
console.log('Unique agent IDs: ' + uniqueIds.size + ' / ' + agentIds.length);

const allUnique = uniqueIds.size === 3 && agentIds.length === 3;
const allDifferent = allUnique && agentIds[0] !== agentIds[1] && agentIds[1] !== agentIds[2] && agentIds[0] !== agentIds[2];

console.log('All 3 unique: ' + (allUnique ? 'YES ✅' : 'NO — duplicates found! ❌'));
console.log('All pairwise different: ' + (allDifferent ? 'YES ✅' : 'NO ❌'));

// Check results have different companies
const resultEvents = events.filter(e => e.event === 'collect_result');
const slotKeys = resultEvents.map(e => e.slotKey);
const uniqueKeys = new Set(slotKeys);
console.log('Unique slot keys: ' + uniqueKeys.size + ' / ' + resultEvents.length + ' ' + [...uniqueKeys].join(', '));

// Final verdict
const pass = basic && allUnique && allDifferent && uniqueKeys.size === 3;
console.log('');
console.log(pass ? '\x1b[32mIDENTITY PASS\x1b[0m' : '\x1b[31mIDENTITY FAIL\x1b[0m');
if (!pass) {
  if (!basic) console.log('FAIL: trace event counts wrong');
  if (!allUnique) console.log('FAIL: duplicate agent IDs');
  if (uniqueKeys.size < 3) console.log('FAIL: duplicate slot keys');
  process.exit(1);
}
JS
node "$B/audit.mjs"
```

## Cleanup [MAIN/SHELL]

```bash
rm -rf dpt_disp_gs_*
echo "cleaned: gs_identity"
```

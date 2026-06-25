---
schema: command-experiment/v1
experiment: subagent
case: case-64-heavy-triple-failure
weight: heavy
case_goal: "验证三个真实 native subagent、多个角色和 partial failure tolerance 的 Parent Relay 路径。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-64_gs_complex
trace: dpt_disp_case-64_gs_complex/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-64-heavy-triple-failure

验证三个真实 LLM subagent、多角色 dispatch 和 partial failure tolerance。

## Task Size [MAIN]

**选择 `research_question` 和任务规模；只把展开后的具体任务写入 slot task。**

- Default to `fast` unless the user explicitly asks for depth.
- Signals for **normal**: "认真做", "完整跑", "fully", "thorough", "deep", "慢慢来", "真实能力".
- Signals for **fast**: "跑一下", "试试", "quick", "test", or no strong signal either way.
- When in doubt, use fast — the user can always re-run with normal.


## Expected Runtime Path

1. Engine dispatch 3 slots: source_intake, claim_verifier, evidence_extractor [MAIN/SHELL]
2. Parent 记录 3 个 spawn request [MAIN/SHELL]
3. Parent 启动 3 个 native sub-agents [MAIN→SUBAGENT]
4. claim_verifier 返回 status:failed (claim 不成立) [SUBAGENT]
5. Parent 导入 receipts → commit → collect → merge [MAIN/SHELL]
6. 验证: doneCount=2, failedCount=1, allFailed=false

## Phase 1: Prepare Bundle And Dispatch [MAIN/SHELL]

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs gs_complex --case case-64 --force)

# 质量检查
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"

cat > "$B/dispatch.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { stageSubagentSlots } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const researchQuestion = 'What is Google Scholar, and what kind of scholarly literature does it help users search?';
const canonicalSource = 'https://scholar.google.com/intl/en/scholar/help.html';
const criticalClaim = 'Google Scholar helps users broadly search scholarly literature across disciplines and sources.';
// MAIN: choose task size here. Subagents see only expanded taskDescription.
const taskSize = 'fast';
const taskPolicy = {
  fast: {
    timeoutMs: 120000,
    intake: `research_question="${researchQuestion}". Find ONE official or primary candidate source quickly. Brief search only. Return bounded JSON only.`,
    verifier: `claim="${criticalClaim}". Use source="${canonicalSource}" if useful. Quick support/uncertainty check. Return status failed only if support is insufficient. Return bounded JSON only.`,
    extractor: `source="${canonicalSource}". Extract ONE reusable evidence particle relevant to research_question="${researchQuestion}". Brief extraction only. Return bounded JSON only.`,
  },
  normal: {
    timeoutMs: 600000,
    intake: `research_question="${researchQuestion}". Find TWO official or primary candidate sources. Do a more careful search. Return bounded JSON only.`,
    verifier: `claim="${criticalClaim}". Verify against official or primary evidence. Return status failed only if support is insufficient, contradictory, or inconclusive. Return bounded JSON only.`,
    extractor: `source="${canonicalSource}". Extract reusable evidence particles relevant to research_question="${researchQuestion}". More careful extraction. Return bounded JSON only.`,
  },
};

const __dirname = esmDirname(import.meta.url);
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
    key: 'claim_verifier',
    slotIndex: 1,
    roleAgentKey: 'dpt-claim-verifier',
    taskDescription: policy.verifier,
    timeoutMs: policy.timeoutMs
  },
  {
    key: 'evidence_extractor',
    slotIndex: 2,
    roleAgentKey: 'dpt-evidence-extractor',
    taskDescription: policy.extractor,
    timeoutMs: policy.timeoutMs
  }
]]]);

const slots = stageSubagentSlots(
  { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' },
  'dpt_disp_case-64_gs_complex',
  dispatchMap
);
writeFileSync(__dirname + '/_slots.json', JSON.stringify(slots, null, 2));
console.log(`Dispatch OK: ${slots.length} slots (taskSize=${taskSize})`);
for (const slot of slots) console.log(`Slot task: dpt_disp_case-64_gs_complex/${slot.taskPath}`);
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
The claim_verifier slot may genuinely return `status: "failed"` if evidence is insufficient —
this tests partial failure tolerance (audit expects doneCount=2, failedCount=1).

### 2a: Record request metadata [MAIN/SHELL]

```bash
cat > "$B/native-agent-request.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { recordAgentSpawnRequested } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const slots = JSON.parse(readFileSync(__dirname + '/_slots.json', 'utf-8'));
const platform = 'claude-code';
const runtimeMode = 'project-agent';
for (const slot of slots) {
  const prompt = recordAgentSpawnRequested(slot, __dirname, { platform, runtimeMode, parentRuntimeAgentId: undefined });
  console.log('--- SPAWN PROMPT for ' + slot.key + ' ---');
  console.log(prompt);
}
JS
node "$B/native-agent-request.mjs" 2>&1 | grep -v "^\[trace\]"
```

### 2b: Start native subagents [MAIN->SUBAGENT]

Use the `Agent tool` for all three subagents (may be in parallel — concurrency cap is 3).

- **Slot 0** (`source_intake`): project agent `dpt-source-intake`
  - Read its own `task.md` and `result.schema.json`.
  - Write its slot-local `runtime-receipt.jsonl`.
  - Follow the concrete task in its `task.md`. Return strict JSON.

- **Slot 1** (`claim_verifier`): project agent `dpt-claim-verifier`
  - Read its own `task.md` and `result.schema.json`.
  - Write its slot-local `runtime-receipt.jsonl`.
  - Verify the concrete claim in its `task.md`. This slot SHOULD return `status: "failed"` if supporting evidence is insufficient, contradictory, or inconclusive.
  - Do NOT fake a failure — genuinely search and only report "done" if the evidence clearly supports.

- **Slot 2** (`evidence_extractor`): project agent `dpt-evidence-extractor`
  - Read its own `task.md` and `result.schema.json`.
  - Write its slot-local `runtime-receipt.jsonl`.
  - Follow the concrete extraction task in its `task.md`. Return strict JSON.

**Record each subagent's `agentId`.** You will need them in step 2c.

### 2c: Import subagent runtime receipts [MAIN/SHELL]

Replace `<AGENT_ID_0>`, `<AGENT_ID_1>`, `<AGENT_ID_2>` with the actual agentIds from step 2b.
This validates subagent-written receipts and imports `agent_runtime_started`
plus `agent_result_ready` into the central trace.

```bash
cat > "$B/import-receipts.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { ingestAgentReceipt } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);
const slots = JSON.parse(readFileSync(__dirname + '/_slots.json', 'utf-8'));
for (const [i, slot] of slots.entries()) {
  const agentId = 'test-agent-' + i;
  const imported = ingestAgentReceipt(slot, __dirname, { platform: 'claude-code', runtimeMode: 'project-agent', runtimeAgentId: agentId });
  console.log('receipt imported slot ' + i + ': ' + imported.agent.runtimeAgentId);
}
JS
DPT_RUNTIME_AGENT_ID_0="<AGENT_ID_0>" DPT_RUNTIME_AGENT_ID_1="<AGENT_ID_1>" DPT_RUNTIME_AGENT_ID_2="<AGENT_ID_2>" node "$B/import-receipts.mjs"
```

### 2d: Write subagent results [MAIN]

Extract strict JSON from each subagent output and write to the relay files:

- Slot 0 → `dpt_disp_case-64_gs_complex/relay-source-intake.json`
- Slot 1 → `dpt_disp_case-64_gs_complex/relay-claim-verifier.json`
- Slot 2 → `dpt_disp_case-64_gs_complex/relay-evidence-extractor.json`

If a subagent genuinely found no evidence or returned invalid output, write a valid
`status: "failed"` JSON (evidenceCount=0, references=[], confidence=0).

### 2e: Validate results and write durable files [MAIN/SHELL]

```bash
cat > "$B/parent-relay.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { commitSlotResult } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const slots = JSON.parse(readFileSync(__dirname + '/_slots.json', 'utf-8'));
const files = ['relay-source-intake.json', 'relay-claim-verifier.json', 'relay-evidence-extractor.json'];
for (const [i, slot] of slots.entries()) {
  const result = JSON.parse(readFileSync(__dirname + '/'' + files[i], 'utf-8'));
  const relay = commitSlotResult(slot, __dirname, result, { platform: 'claude-code', runtimeMode: 'project-agent', parentRuntimeAgentId: undefined });
  console.log('Relay ' + (relay.ok ? 'OK' : 'FAILED') + ': ' + slot.key + ' status=' + relay.result.status);
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

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);
const slots = JSON.parse(readFileSync(__dirname + '/_slots.json', 'utf-8'));
const merged = collectAndMergeSubagentResults({ current_gate:'wave0_complete', ref_count:5, ref_floor:5, topicReadiness:'ready' }, slots, __dirname);
console.log(`done=${merged.results.filter(r=>r.status==='done').length} failed=${merged.results.filter(r=>r.status==='failed').length} all_failed=${merged.finalState.subagent_all_failed}`);
JS
node "$B/collect.mjs" 2>&1 | grep -v "^\[trace\]"

cat > "$B/audit.mjs" << 'JS'
import { readFileSync } from 'node:fs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);
const events = readFileSync(__dirname + '/_trace.jsonl', 'utf-8').trim().split('\n').map(JSON.parse);
const count = name => events.filter(e => e.event === name).length;
const collects = events.filter(e => e.event === 'collect_result');
const merge = events.find(e => e.event === 'merge_complete');
const pass = count('agent_spawn_requested') === 3 && count('agent_runtime_started') === 3 && count('agent_result_ready') === 3 && count('agent_result_received') === 3 && count('result_schema_validated') === 3 && collects.length === 3 && merge && merge.doneCount === 2 && merge.failedCount === 1 && merge.allFailed === false;
console.log(pass ? '\x1b[32mCOMPLEX PASS\x1b[0m' : '\x1b[31mCOMPLEX FAIL\x1b[0m');
if (!pass) process.exit(1);
JS
node "$B/audit.mjs"
```


## Step 4: 结果解读

> 验证 3 个 sub-agent partial failure：
>   source_intake: done + claim_verifier: failed + evidence_extractor: done
>   → doneCount=2, failedCount=1, allFailed=false。
>   relay 正确容忍 partial failure。

## Step 5: Cleanup [MAIN/SHELL]

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_case-64_gs_*
echo "cleaned: gs_complex"
```
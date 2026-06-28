---
schema: command-experiment/v1
experiment: engine-boundary
case: case-406-heavy-real-subagent-boundary
weight: heavy
case_goal: "验证真实 Sub-agent/WebSearch/WebFetch 路径产生 output declaration、cache trail、committed result、delegated complete、Engine ledger，并使 content_dedup gate pass；若当前 runner 无法调用真实 Agent tool，则记录 NOT RUN，不能标 PASS。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-406_eb_real
trace: dpt_disp_case-406_eb_real/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Heavy case。必须使用真实 `dpt-source-intake` Sub-agent 和真实 WebSearch/WebFetch 或等价抓取链；fixture、手写 ledger、手写 runtime receipt、手写 fake search cache 均不能算 PASS。

如果当前 runner 没有可调用的 real Agent tool / project subagent surface，执行 Step 4 记录 NOT RUN：写明 unavailable surface、风险和后续复跑条件。NOT RUN 是显式记录，不是 PASS。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Agent actor** | 必须有真实 `dpt-source-intake` Sub-agent |
| **外部调用** | 必须有真实 WebSearch/WebFetch 或抓取链 |
| **ledger 生成** | 只能由 delegated `operate-queue complete` 追加 |
| **gate 输入面** | `rb_output_declarations.jsonl` |
| **not-run 规则** | 无 real-agent surface 时记录 NOT RUN，不得输出 PASS |

# case-406-heavy-real-subagent-boundary

真实 Agent↔Engine 边界：Sub-agent 产出 declaration/cache → Parent `commitSlotResult()` → delegated `complete()` → Engine ledger → `content_dedup` gate pass。

---

## Step 1: 创建 Bundle + Queue + Relay Slot

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_real --case case-406 --force)
echo "Bundle: $B"

cat > "$B/rb_status.json" << 'JSON'
{"current_gate":"wave0_complete","next_gate":"wave1_complete","current_mode":"execution","state":"in_progress"}
JSON

cat > "$B/rb_plan.md" << 'MD'
---
{
  "plan_basename": "eb_real",
  "derived_topic_count": 1,
  "topic_registry": [{ "id": "t1", "slug": "agentic-coding-tools", "title": "Agentic coding tools" }]
}
---
# Plan
MD

cat > "$B/rb_profile.yaml" << 'YAML'
research_style_params:
  wave0_shared_ref_total: 1
  wave0_per_topic_source_floor: 1
YAML

mkdir -p "$B/reference" "$B/artifacts/wave0/agentic-coding-tools"
cat > "$B/reference/README.md" << 'MD'
# Reference Evidence
MD
cat > "$B/reference/_INDEX.md" << 'MD'
| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
MD

cat > "$B/task.json" << 'JSON'
{"work_id":"case406-real-source-intake","title":"Real Sub-agent source intake","targets":{"controller":"main-agent","delegates":{"to":"sub-agent","role_key":"dpt-source-intake","timeout_ms":600000}},"action":"Use real WebSearch/WebFetch or the approved fetch degradation chain to collect at least one real source about agentic coding tools. Write reference/00-shared-agentic-coding-tools.md, artifacts/wave0/agentic-coding-tools/source.yaml, and cache leaf directories under _cache/wave0/primary/agentic-coding-tools/sNN_<source-slug> containing websearch.json, page.md, and meta.json. Return strict JSON with output_files[] and cache_trails[] declaring the real files and cache leaves.","producer_rule":"case406_real_source_intake","lineage":{"topic_slug":"agentic-coding-tools","phase":"wave0"},"priority_class":"P5_new_reference_intake","required_receipts":["none"],"done_condition":"Real source files and cache trails exist.","verification":{"engine":[],"agent":["real WebSearch/WebFetch or approved fetch chain used","no placeholder URL"]},"writes_to":["reference/00-shared-agentic-coding-tools.md","artifacts/wave0/agentic-coding-tools/source.yaml"],"status_sync":[],"completion_receipt":"none","failure_route":"record not-run or queue repair","payload":{"topic_slug":"agentic-coding-tools"}}
JSON

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue "$B" --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim "$B" --actor main-agent > "$B/claim.json"

cat > "$B/prepare-slot.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const B = process.argv[2];
const REPO = process.cwd();
const relay = await import(pathToFileURL(path.join(REPO, 'DPT_FRAMEWORK/engine/subagent-relay.mjs')));
const slot = relay.createSlot({
  key: 'case406-real-source-intake',
  slotIndex: 0,
  roleAgentKey: 'dpt-source-intake',
  taskDescription: JSON.parse(await import('node:fs').then(fs => fs.readFileSync(path.join(B, 'task.json'), 'utf-8'))).action,
  timeoutMs: 600000,
}, 1);
const prompt = relay.recordAgentSpawnRequested(slot, B, { platform: 'codex', runtimeMode: 'project-agent' });
writeFileSync(path.join(B, '_slot.json'), JSON.stringify(slot, null, 2));
writeFileSync(path.join(B, 'agent-prompt.md'), prompt);
console.log(path.join(B, 'agent-prompt.md'));
JS
node "$B/prepare-slot.mjs" "$B"
```

→ 预期：`agent-prompt.md` 和 `_slot.json` 存在；trace 有 `agent_spawn_requested`。

---

## Step 2: 启动真实 Sub-agent

使用 runner 提供的真实 Agent tool 启动 project agent `dpt-source-intake`，prompt 使用 Step 1 生成的 `$B/agent-prompt.md`。

Sub-agent 必须：

- 读取 `$B/_subagents/wave_01/slot_00/task.md` 与 `result.schema.json`。
- 在 Sub-agent 上下文开始和结束时写 slot-local `runtime-receipt.jsonl`。
- 执行真实 WebSearch/WebFetch 或 approved fetch degradation chain。
- 写真实 `reference/00-shared-agentic-coding-tools.md`、`artifacts/wave0/agentic-coding-tools/source.yaml`、以及 `_cache/.../sNN_*/websearch.json|page.md|meta.json`。
- 返回 strict JSON；runner 将其保存为 `$B/real-subagent-result.json`。

如果 runner 当前无法调用真实 Agent tool，跳过 Step 3，执行 Step 4 记录 NOT RUN。

---

## Step 3: Commit → Delegated Complete → Gate / NOT RUN

```bash
cat > "$B/complete-real-path.mjs" << 'JS'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const B = process.argv[2];
const REPO = process.cwd();
const relay = await import(pathToFileURL(path.join(REPO, 'DPT_FRAMEWORK/engine/subagent-relay.mjs')));
const slot = JSON.parse(readFileSync(path.join(B, '_slot.json'), 'utf-8'));
const resultPath = path.join(B, 'real-subagent-result.json');
const tracePath = path.join(B, 'rb_trace.jsonl');

function record(passed, detail, extra = {}) {
  appendFileSync(tracePath, JSON.stringify({
    ts: new Date().toISOString(),
    event: 'check',
    source: 'case-406',
    gate: 'real-subagent-boundary',
    passed,
    expected: true,
    detail,
    ...extra,
  }) + '\n');
}

if (!existsSync(resultPath)) {
  const reason = {
    case: 'case-406-heavy-real-subagent-boundary',
    status: 'NOT_RUN',
    unavailable_surface: 'No real-subagent-result.json was produced by a callable real project Agent tool in this run. This heavy case requires runner-mediated dpt-source-intake spawn with WebSearch/WebFetch.',
    reality_distance_risk: 'Without the real Sub-agent/WebSearch/WebFetch actor, fixture execution would only re-prove case-401/403 and would not cover the Agent boundary.',
    rerun_condition: 'Run in a Codex/Claude Code environment that can spawn project agent dpt-source-intake, then save its strict JSON as real-subagent-result.json and rerun this step.',
    recorded_at: new Date().toISOString(),
  };
  writeFileSync(path.join(B, 'case-406-not-run.json'), JSON.stringify(reason, null, 2));
  record(false, reason.unavailable_surface, { status: 'NOT_RUN' });
  console.log(JSON.stringify(reason, null, 2));
  process.exit(2);
}

const agentId = process.env.CASE406_AGENT_ID || 'real-agent-id-not-recorded';
relay.ingestAgentReceipt(slot, B, { platform: 'codex', runtimeMode: 'project-agent', runtimeAgentId: agentId });
const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
const committed = relay.commitSlotResult(slot, B, result, { platform: 'codex', runtimeMode: 'project-agent', runtimeAgentId: agentId });
record(committed.ok === true, 'commitSlotResult accepted real Sub-agent output');
if (!committed.ok) throw new Error(committed.result.notes?.join('; ') || 'commitSlotResult failed');

writeFileSync(path.join(B, 'complete-result.json'), JSON.stringify({
  work_id: 'case406-real-source-intake',
  receipt: 'none',
  summary: 'real source intake complete',
  writes: ['reference/00-shared-agentic-coding-tools.md', 'artifacts/wave0/agentic-coding-tools/source.yaml'],
  slot_result_ref: slot.resultPath,
}, null, 2));
execFileSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-queue.mjs', 'complete', B, '--result', path.join(B, 'complete-result.json')], { cwd: REPO, stdio: 'pipe' });
record(existsSync(path.join(B, 'rb_output_declarations.jsonl')), 'delegated complete appended Engine ledger');

const gateRaw = execFileSync(process.execPath, ['DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs', '--bundle', B, '--current-node', 'phases/phase-wave0.md'], { cwd: REPO, encoding: 'utf-8', stdio: 'pipe' });
writeFileSync(path.join(B, 'gate-wave0.json'), gateRaw);
const gate = JSON.parse(gateRaw);
record(gate.check?.passed === true, 'wave0 gate passed from Engine ledger input', { inspect: gate.inspect ?? [] });

console.log('case-406 real path completed');
JS

set +e
node "$B/complete-real-path.mjs" "$B"
status=$?
set -e
if [ "$status" -eq 2 ]; then
  echo "CASE-406 NOT RUN; bundle preserved: $B"
elif [ "$status" -ne 0 ]; then
  exit "$status"
fi
```

→ 预期：真实 Sub-agent result 存在时输出 `case-406 real path completed`；否则记录 `case-406-not-run.json` 并以 NOT RUN 退出。

---

## Step 4: NOT RUN 记录说明

Step 3 自动处理无真实 Agent tool 的情况。若生成 `case-406-not-run.json`，runner 必须把该 case 记录为 NOT RUN；不得继续 Step 5 报 PASS。

---

## Step 5: 从 Trace 裁决

只在 Step 3 真实路径完成后执行。

```bash
cat > "$B/verdict.mjs" << 'JS'
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
if (existsSync(path.join(B, 'case-406-not-run.json'))) {
  const reason = JSON.parse(readFileSync(path.join(B, 'case-406-not-run.json'), 'utf-8'));
  console.log('\x1b[33mCASE-406 NOT RUN\x1b[0m');
  console.log(reason.unavailable_surface);
  process.exit(2);
}
const events = readFileSync(path.join(B, 'rb_trace.jsonl'), 'utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);
const checks = events.filter((e) => e.event === 'check' && e.source === 'case-406');
const failed = checks.filter((c) => c.passed !== true);
const requiredEvents = ['agent_spawn_requested', 'agent_runtime_started', 'agent_result_ready', 'agent_result_received', 'result_schema_validated', 'ledger_appended'];
const missing = requiredEvents.filter((name) => !events.some((e) => e.event === name));
const ok = checks.length >= 3 && failed.length === 0 && missing.length === 0;
writeFileSync(path.join(B, 'case-406-verdict.json'), JSON.stringify({ ok, checks: checks.length, failed: failed.length, missing }, null, 2));
console.log(`checks: ${checks.length}, failed: ${failed.length}, missing: ${missing.join(',') || 'none'}`);
console.log(ok ? '\x1b[32mCASE-406 PASS\x1b[0m' : '\x1b[31mCASE-406 FAIL\x1b[0m');
if (!ok) process.exit(1);
JS
set +e
node "$B/verdict.mjs" "$B"
status=$?
set -e
if [ "$status" -eq 2 ]; then
  echo "CASE-406 NOT RUN recorded; bundle preserved: $B"
elif [ "$status" -ne 0 ]; then
  exit "$status"
fi
```

---

## Step 6: PASS-only 清理

```bash
if [ -f "$B/case-406-not-run.json" ]; then
  echo "NOT RUN preserved for inspection: $B"
elif node -e "const fs=require('fs'); const p=process.argv[1] + '/case-406-verdict.json'; process.exit(JSON.parse(fs.readFileSync(p, 'utf8')).ok ? 0 : 1)" "$B"; then
  rm -rf "$B"
  echo "✓ Cleaned up after PASS."
else
  echo "FAIL/NOT RUN preserved for inspection: $B"
  exit 1
fi
```

---
schema: command-experiment/v1
experiment: subagent
case: case-65-heavy-drive-relay-provenance-sound
weight: heavy
case_goal: "验证 drive-relay-slot 金路径 + 真 native sub-agent：beacon/log-event lifecycle + engine S0–S5 全绿 + runProvenanceForensics silent（plan §10 tier-1）。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-65_relay_sound
trace: dpt_disp_case-65_relay_sound/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行；**必须** spawn 一个真实 native sub-agent（`dpt-source-intake`）。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；禁止 mock、禁止 parent shell 代写 sub-agent 的 receipt/lifecycle/search 结果、禁止手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

## Reality Distance Ledger

| Distance Type | Declaration |
|---------------|-------------|
| Runtime context | 真实 disposable bundle + `_subagents/wave_01/slot_00/`（SDC-001） |
| Framework path | `drive-relay-slot` + `log-event.mjs` + `runProvenanceForensics()` |
| Agent actor | **有** — 1 个真实 native sub-agent（WebSearch/WebFetch） |
| External calls | **有** — 最小 WebSearch |
| Production path | 与 phase MD SNC-003 一致：driver 驱动，非 `stageSubagentSlots` 脚本直调 |
| Verdict source | `rb_trace.jsonl` 的 `check` 事件 + forensics 返回值 |
| Log 验收 | **`_logs/run.log`**（必读）；`rb_trace.jsonl`（engine trace + checks） |
| 不证明 | queue delegated-complete / ledger — 与 case-61 相同边界 |

# case-65-heavy-drive-relay-provenance-sound

验证 subagent-execution-logging change 的 **tier-1 金路径**：relay 端到端真跑通，bundle 上留下可判决的 S0–S5 痕迹。

## Task Size [MAIN]

- 默认 `fast`（与 case-61 相同 Google Scholar 小题）
- **normal** 信号："认真做", "完整跑", "thorough", "deep"

## Expected Runtime Path

1. 创建 bundle → validate + inspect → `drive-relay-slot stage` `[MAIN/SHELL]`
2. Spawn 真 native sub-agent（读 spawn prompt + beacon + task.md）`[MAIN→SUBAGENT]`
3. Sub-agent：beacon → log-event lifecycle → WebSearch → runtime-receipt → strict JSON `[SUBAGENT]`
4. `drive-relay-slot commit` + `merge` `[MAIN/SHELL]`
5. **Agent 读 `_logs/run.log`**，确认 lifecycle + commit 信号 `[MAIN]`
6. S0–S5 + forensics checks 写入 `rb_trace.jsonl` `[MAIN/SHELL]`
7. 从 `rb_trace.jsonl` 裁决 PASS/FAIL `[MAIN/SHELL]`
8. 结果解读 + 清理（PASS 才清理）`[MAIN/SHELL]`

---

## Step 1: 创建 bundle + driver stage

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs relay_sound --case case-65 --force)
echo "B=$B"

node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"

node DPT_FRAMEWORK/cli/drive-relay-slot.mjs stage "$B" --wave 1 \
  --slot-index 0 --role dpt-source-intake --key source_intake \
  --task 'research_question="What is Google Scholar?". Find ONE official or primary help/about page. Brief search only. Return bounded JSON matching result.schema.json.' \
  --platform claude-code | tee "$B/_stage.json"
```

→ 预期：`ok: true`；`_subagents/wave_01/slot_00/_beacon.json` 含 UUID `receipt_nonce`；`dispatch.json` 同 nonce。

---

## Step 2: Spawn native sub-agent [MAIN→SUBAGENT]

> **Agent 给自己的指令**：用 Agent/Task 工具 spawn **一个** native sub-agent（role: `dpt-source-intake` 或 generalPurpose with role prompt）。把 `$B/_stage.json` 里的 `spawnPrompt` 全文作为 task。
>
> **禁止** parent shell 代写 `runtime-receipt.jsonl`、`log-event.mjs` lifecycle、WebSearch 结果或 strict JSON — 这些必须由 sub-agent 在隔离 context 内完成。

Sub-agent **必须**：

1. 读 `$B/_subagents/wave_01/slot_00/_beacon.json` — 取 `bundle_dir`, `log_cli`, `receipt_nonce`, `slot_key`
2. 经 `log_cli` 发射至少：`search_start`, `search_done`, `work_done`（detail 含 `receipt_nonce`）
3. 写 `$B/_subagents/wave_01/slot_00/runtime-receipt.jsonl` 两行（`agent_runtime_started` / `agent_result_ready`，nonce 来自 beacon）
4. 做 **一次** WebSearch，返回 **strict JSON**（无 markdown fence）匹配 `result.schema.json`

Parent 把 sub-agent 返回的 JSON 写入 `$B/relay-source-intake.json`，并记录 runtime agent id 到 `$B/_runtime_agent_id.txt`。

---

## Step 3: drive-relay-slot commit + merge [MAIN/SHELL]

```bash
B= # populated from Step 1
AGENT_ID=$(cat "$B/_runtime_agent_id.txt")
RESULT=$(cat "$B/relay-source-intake.json")

node DPT_FRAMEWORK/cli/drive-relay-slot.mjs commit "$B" --wave 1 \
  --slot source_intake \
  --runtime-agent-id "$AGENT_ID" \
  --platform claude-code \
  --runtime-mode project-agent \
  --result "$RESULT"

node DPT_FRAMEWORK/cli/drive-relay-slot.mjs merge "$B" --wave 1
```

→ 预期：`commit` 返回 `ok: true`；slot `_status.json` 为 `done`；trace 含 `agent_result_received` + `result_schema_validated`（带 `receiptNonce`）。

---

## Step 4: Agent 读 run.log [MAIN]

```bash
B= # populated from Step 1
NONCE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$B/_subagents/wave_01/slot_00/_beacon.json','utf8')).receipt_nonce)")
echo "beacon nonce=$NONCE"
echo "=== _logs/run.log ==="
cat "$B/_logs/run.log"
```

**Agent 目视确认**（读完整 log 后再跑 Step 5 机械 check）：

| 预期在 log 里 | 含义 |
|---------------|------|
| `search_start` / `search_done` / `work_done` + beacon `receipt_nonce` | sub-agent 经 beacon→`log-event.mjs` 写 **3 条** lifecycle（S5） |
| `] INFO relay_commit_done` + `source_intake` | production commit 真跑（非 diagnostic 文本） |
| `relay_receipt_ingest_done` | receipt  ingest 路径 |
| `relay_merge_done` / `merge` | merge 真跑 |
| **可有** `WARN agent_timestamp_span_suspicious` | RPG-009 advisory；单独不否 tier-1 |
| **不应有** `WARN relay_commit_missing` | tier-1 不应报 commit 缺失 |

---

## Step 5: S0–S5 + tier-1 checks → rb_trace.jsonl [MAIN/SHELL]

```bash
B= # populated from Step 1

cat > "$B/_verify_tier1.mjs" << 'JS'
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runProvenanceForensics } from '../DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs';
import { recordCheck } from '../experiments_env/shared/wff-playbook-utils.mjs';
import {
  filterLifecycleLines,
  lifecycleKindsInOrder,
  lifecycleNonceIsolated,
  runLogHasRelayCommitDone,
  runLogHasRelayCommitMissing,
  splitRunLogLines,
} from '../experiments_env/shared/run-log-lifecycle-utils.mjs';

const dir = process.argv[2];
const tracePath = join(dir, 'rb_trace.jsonl');
const waveDir = 'wave_01';
const slotKey = 'source_intake';
const slotRel = `_subagents/${waveDir}/slot_00`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(gate, passed, detail) {
  recordCheck(tracePath, { gate, passed, detail });
}

const beacon = JSON.parse(readFileSync(join(dir, slotRel, '_beacon.json'), 'utf-8'));
const dispatch = JSON.parse(readFileSync(join(dir, '_subagents', waveDir, 'dispatch.json'), 'utf-8'));
const nonce = beacon.receipt_nonce;
const dispatchEntry = dispatch.slots.find((s) => s.key === slotKey);

record('S1-dispatch-exists', !!dispatchEntry, 'dispatch.json present');
record('S2-nonce-uuid', UUID_RE.test(nonce), `nonce UUID-shaped: ${nonce?.slice(0, 8)}…`);
record('S2-nonce-in-dispatch', dispatchEntry?.receipt_nonce === nonce, 'beacon nonce matches dispatch.json');

const traceLines = readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);
const replacement = traceLines.some((e) => e.event === 'slot_create' && e.replacement);
const chainEvents = ['slot_create', 'agent_runtime_started', 'agent_result_ready', 'agent_result_received', 'result_schema_validated'];
for (const ev of chainEvents) {
  const hit = traceLines.find((e) => e.event === ev && (e.key === slotKey || JSON.stringify(e).includes(slotKey)));
  record(`S0-${ev}`, !!hit, hit ? 'present' : 'MISSING');
  if (hit?.receiptNonce) {
    record(`S0-${ev}-nonce`, hit.receiptNonce === nonce, 'receiptNonce matches beacon');
  }
}
const dispatchCreate = traceLines.find((e) => e.event === 'dispatch_create');
record('S0-dispatch_create', !!dispatchCreate || replacement,
  replacement ? 'replacement stage (dispatch.json updated, no dispatch_create trace)' : (dispatchCreate ? 'present' : 'MISSING'));

const status = JSON.parse(readFileSync(join(dir, slotRel, '_status.json'), 'utf-8'));
record('S3-status-done', status.status === 'done', `status=${status.status}`);

const runLog = existsSync(join(dir, '_logs', 'run.log')) ? readFileSync(join(dir, '_logs', 'run.log'), 'utf-8') : '';
const runLines = splitRunLogLines(runLog);
const lifecycle = filterLifecycleLines(runLines, { slotKey });
record('S5-lifecycle-count', lifecycle.length === 3, `${lifecycle.length}/3 lifecycle lines for ${slotKey}`);
record('S5-lifecycle-nonce', lifecycle.length === 3 && lifecycleNonceIsolated(runLines, slotKey, nonce),
  'run.log lifecycle carries beacon nonce only on lifecycle lines');
record('S5-lifecycle-order', lifecycleKindsInOrder(runLines, slotKey),
  'search_start → search_done → work_done');

const receiptPath = join(dir, slotRel, 'runtime-receipt.jsonl');
const receiptText = existsSync(receiptPath) ? readFileSync(receiptPath, 'utf-8') : '';
record('S5-runtime-receipt', receiptText.includes('agent_runtime_started') && receiptText.includes('agent_result_ready') && receiptText.includes(nonce),
  'sub-agent runtime-receipt.jsonl with beacon nonce');

record('log-relay-commit-done', runLogHasRelayCommitDone(runLog) && runLog.includes(slotKey),
  'run.log has production relay_commit_done line');
record('log-no-rpg008', !runLogHasRelayCommitMissing(runLog, slotKey),
  'tier-1: no relay_commit_missing WARN in run.log');

const agent = JSON.parse(readFileSync(join(dir, slotRel, '_agent.json'), 'utf-8'));
const spanMs = Date.parse(agent.completedAt) - Date.parse(agent.spawnedAt);
const findings = runProvenanceForensics(dir, 'wave1', 'wave1-complete');
const blocking = findings.filter((f) => f.code !== 'agent_timestamp_span_suspicious');
record('forensics-no-blocking', blocking.length === 0,
  blocking.length ? `blocking codes=[${blocking.map((f) => f.code).join(',')}]` : 'no RPG-007/008/011/012');
record('S4-agent-span-advisory', spanMs >= 1000 || findings.some((f) => f.code === 'agent_timestamp_span_suspicious'),
  `spawnedAt→completedAt ${spanMs}ms (RPG-009 alone does not invalidate tier-1)`);
record('provenance-tier-1', blocking.length === 0 && status.status === 'done',
  'plan §10 tier-1: relay ran end-to-end — BUG-019 fallback premise false');
console.log('Recorded tier-1 checks to rb_trace.jsonl');
JS
node "$B/_verify_tier1.mjs" "$B"
```

→ 预期：checks 写入 `$B/rb_trace.jsonl`（不以此步 stdout 裁决）。

---

## Step 6: 从 trace 裁决 [MAIN/SHELL]

```bash
B= # populated from Step 1
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
```

→ 预期：`PASS`（trace 中全部 `check` 事件 `passed === expected`）

---

## Step HH: Post-Execution Health

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile heavy
```

---

## Result Interpretation

| Signal / Check | 证明 |
|----------------|------|
| S0 六事件链 + nonce | engine trace 链真跑（SUD-007） |
| S1/S2 dispatch + UUID | staging 懒手糊筛查通过 |
| S3 status=done + commit trace | commit 真跑 |
| S5 lifecycle in run.log | sub-agent 经 beacon 写 log；`S5-lifecycle-count` 须正好 3 条 |
| `S4-agent-span-advisory` | RPG-009 可 advisory 出现；单独不足否 tier-1 |
| `forensics-no-blocking` | RPG-007/008/011/012 无诊断 |
| `provenance-tier-1` | plan §10 / provenance-forensics-guide tier-1 |

**PASS 含义**：relay 黑箱透明 — 目录在 `_subagents/wave_01/slot_00/`，log 经 beacon→`log-event.mjs`，判决可复现。

---

## Cleanup [MAIN/SHELL]

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

```bash
B= # populated from Step 1
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B'))"
```

---
schema: command-experiment/v1
experiment: system-logging
case: case-76-light-spawn-prompt-logging
weight: light
case_goal: "验证 production spawn prompt（beacon 模式 SUD-006）：经 drive-relay-slot stage 与 engine recordAgentSpawnRequested 两条路径均含 Diagnostic logging 六事件 + _beacon.json 指针，不把 nonce/bundle 作为唯一内联通道。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-76_spawn_log
trace: dpt_disp_case-76_spawn_log/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。实验结果必须来自 production engine/CLI 调用（`drive-relay-slot stage`、`stageSubagentSlots`、`recordAgentSpawnRequested`）和 bundle 文件写入；**不 spawn sub-agent**（本 case 只验 prompt 字符串 + beacon 文件）。禁止 mock 返回、禁止手写 spawn prompt、禁止用 console output 代替 trace 裁决。

## Reality Distance Ledger

| Distance Type | Declaration |
|---------------|-------------|
| Runtime context | 真实 disposable bundle（`new-disposable-bundle.mjs`） |
| Framework path | **主**：`drive-relay-slot stage` → `spawnPrompt`；**辅**：`stageSubagentSlots` + `recordAgentSpawnRequested`（engine 直调，与 unit test 同路径） |
| Agent actor | **无** — 只验 prompt/beacon 契约，不验 sub-agent 搜索或写 log |
| External calls | 无 |
| Verdict source | `rb_trace.jsonl` 的 `check` 事件 |
| Log 验收 | **`_logs/run.log`**（必读）：应有 driver/engine staging 行；**不应有** sub-agent lifecycle（`search_start` 等） |

# case-76-light-spawn-prompt-logging

验证 spawn prompt 把 sub-agent 导向 beacon + `log-event.mjs` lifecycle 契约（change 核心：让 dead code 变成可执行的 Agent 指令）。

## Expected Runtime Path

1. 创建 bundle → validate + inspect `[MAIN/SHELL]`
2. `drive-relay-slot stage` → 断言 `spawnPrompt` + `_beacon.json` `[MAIN/SHELL]`
3. engine 直调路径 → 断言第二条 prompt（回归 engine API） `[MAIN/SHELL]`
4. **Agent 读 `_logs/run.log`** — staging 有、lifecycle 无 `[MAIN]`
5. checks 写入 `rb_trace.jsonl` → verdict `[MAIN/SHELL]`
6. 清理（PASS 才清理）`[MAIN/SHELL]`

---

## Step 1: 创建 bundle [MAIN/SHELL]

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs spawn-log --case case-76 --force)
echo "B=$B"

node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

---

## Step 2: production driver + engine prompt checks [MAIN/SHELL]

```bash
B= # populated from Step 1

node DPT_FRAMEWORK/cli/drive-relay-slot.mjs stage "$B" --wave 1 \
  --slot-index 0 --role dpt-source-intake --key source_intake \
  --task "Spawn-prompt logging contract probe." \
  --platform claude-code > "$B/_stage_driver.json"

cat > "$B/_check_prompts.mjs" << 'JS'
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { recordCheck } from '../experiments_env/shared/wff-playbook-utils.mjs';
import { filterLifecycleLines, splitRunLogLines } from '../experiments_env/shared/run-log-lifecycle-utils.mjs';
import { stageSubagentSlots, recordAgentSpawnRequested } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';

const dir = process.argv[2];
const tracePath = join(dir, 'rb_trace.jsonl');
const runLog = existsSync(join(dir, '_logs', 'run.log')) ? readFileSync(join(dir, '_logs', 'run.log'), 'utf-8') : '';
const runLines = splitRunLogLines(runLog);
const requiredEvents = ['search_start', 'search_done', 'fetch_done', 'file_written', 'error', 'work_done'];

recordCheck(tracePath, { gate: 'log-has-staging', passed: runLog.includes('slot_create') && runLog.includes('relay_spawn_requested'), detail: 'run.log has driver/engine staging lines' });
recordCheck(tracePath, { gate: 'log-no-subagent-lifecycle', passed: filterLifecycleLines(runLines).length === 0, detail: `${filterLifecycleLines(runLines).length} lifecycle lines (expect 0 — case did not spawn)` });

function auditPrompt(gatePrefix, prompt, slot, beaconPath) {
  recordCheck(tracePath, { gate: `${gatePrefix}-diagnostic-section`, passed: prompt.includes('Diagnostic logging'), detail: 'Diagnostic logging section' });
  recordCheck(tracePath, { gate: `${gatePrefix}-log-event-cli`, passed: prompt.includes('log-event.mjs') || prompt.includes('log_cli'), detail: 'log CLI referenced' });
  recordCheck(tracePath, { gate: `${gatePrefix}-beacon-pointer`, passed: prompt.includes('_beacon.json') && prompt.includes('receipt_nonce'), detail: 'beacon-first coordinates' });
  for (const evt of requiredEvents) {
    recordCheck(tracePath, { gate: `${gatePrefix}-event-${evt}`, passed: prompt.includes(evt), detail: evt });
  }
  recordCheck(tracePath, { gate: `${gatePrefix}-detail-json`, passed: prompt.includes('--detail'), detail: '--detail examples' });
  recordCheck(tracePath, { gate: `${gatePrefix}-forbidden-content`, passed: prompt.includes('Do NOT log'), detail: 'forbidden content warning' });
  if (slot?.receiptNonce) {
    recordCheck(tracePath, { gate: `${gatePrefix}-no-inlined-sole-nonce`, passed: !prompt.includes(`Runtime receipt nonce: ${slot.receiptNonce}`), detail: 'nonce not sole inline channel' });
  }
  if (beaconPath) {
    recordCheck(tracePath, { gate: `${gatePrefix}-beacon-on-disk`, passed: existsSync(beaconPath), detail: beaconPath });
    if (existsSync(beaconPath)) {
      const beacon = JSON.parse(readFileSync(beaconPath, 'utf-8'));
      recordCheck(tracePath, { gate: `${gatePrefix}-beacon-fields`, passed: !!(beacon.bundle_dir && beacon.log_cli && beacon.receipt_nonce && beacon.slot_key), detail: 'beacon has bundle_dir/log_cli/receipt_nonce/slot_key' });
    }
  }
}

const stage = JSON.parse(readFileSync(join(dir, '_stage_driver.json'), 'utf-8'));
recordCheck(tracePath, { gate: 'driver-stage-ok', passed: stage.ok === true, detail: `mode=${stage.mode}` });
auditPrompt('driver', stage.spawnPrompt, stage.slot, join(dir, '_subagents/wave_01/slot_00/_beacon.json'));

const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' };
const slots = stageSubagentSlots(state, dir);
recordCheck(tracePath, { gate: 'engine-slots-created', passed: slots.length > 0, detail: `${slots.length} slots` });
if (slots.length > 0) {
  const slot = slots[0];
  const prompt = recordAgentSpawnRequested(slot, dir, { platform: 'claude-code' });
  const beaconPath = join(dir, '_subagents', `wave_0${slot.waveIndex}`, `slot_0${slot.slotIndex}`, '_beacon.json');
  auditPrompt('engine', prompt, slot, beaconPath);
}
console.log('Recorded spawn-prompt + run.log checks to rb_trace.jsonl');
JS
node "$B/_check_prompts.mjs" "$B"
```

---

## Step 3: Agent 读 run.log [MAIN]

```bash
B= # populated from Step 1
echo "=== _logs/run.log ==="
cat "$B/_logs/run.log"
```

**Agent 目视确认**：

| 预期 | 含义 |
|------|------|
| `slot_create` / `relay_spawn_requested` | driver + engine staging 写过 log |
| lifecycle 计数 = 0 | 本 case 未 spawn sub-agent — 若 `filterLifecycleLines` > 0 则越界 |

（Step 2 的 `log-has-staging` / `log-no-subagent-lifecycle` checks 应与上表一致。）

---

## Step 4: 从 trace 裁决 [MAIN/SHELL]

```bash
B= # populated from Step 1
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
```

→ 预期：`PASS`

---

## Step 5: 结果解读 [MAIN/SHELL]

| Check 前缀 | 证明 |
|------------|------|
| `driver-*` | **production** `drive-relay-slot stage` 产出的 spawn prompt + `_beacon.json` 符合 SUD-006 + lifecycle 契约 |
| `engine-*` | engine 直调路径与 driver 共用同一 `buildSpawnPrompt` 内核（防 driver 与 engine 漂移） |
| `*-beacon-on-disk` | staging 真写 beacon，不是 prompt 空话 |

**PASS 含义**：sub-agent 若被 spawn，收到的指令足以找到 bundle、nonce、log CLI 并写 lifecycle — change 的「logging 活过来」前置条件成立。

**不证明**：sub-agent 真执行、run.log 并发、relay commit、forensics tier（见 case-77/65/79）。

---

## Cleanup [MAIN/SHELL]

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

```bash
B= # populated from Step 1
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B'))"
```

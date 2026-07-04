---
schema: command-experiment/v1
experiment: system-logging
case: case-77-standard-subagent-logging
weight: light
case_goal: "验证 3 个真实 sub-agent 经 beacon→log-event.mjs 并发写入 _logs/run.log：事件带 receipt_nonce、slot 可区分、无丢失；staging 走 drive-relay-slot（与 SNC-003 同路径）。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-77_sub_log
trace: dpt_disp_case-77_sub_log/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行。**必须** spawn 3 个真实 native sub-agent。每个 sub-agent **必须**先读 slot `_beacon.json`，再经 beacon 的 `log_cli`/`bundle_dir`/`receipt_nonce` 调 `log-event.mjs` 写 lifecycle（禁止 task 内联 bundle 路径替代 beacon）。staging **必须**经 `drive-relay-slot stage`（3 slot replacement）。禁止 mock、禁止 parent shell 代写 run.log、禁止手写 run.log 行格式。

## Reality Distance Ledger

| Distance Type | Declaration |
|---------------|-------------|
| Runtime context | 真实 disposable bundle + 3 relay slot（`_subagents/wave_01/slot_0{0,1,2}/`，SDC-001） |
| Framework path | `drive-relay-slot stage` + sub-agent `log-event.mjs`（production logging 路径） |
| Agent actor | **有** — 3 个真实 native sub-agent，各写 3 条 lifecycle |
| External calls | 无（只做 log-event，不做 WebSearch） |
| Verdict source | `_logs/run.log` 内容 + `rb_trace.jsonl` 的 `check` 事件 |
| Log 验收 | **`_logs/run.log`**（必读）：9 条 lifecycle + 3 个 `receipt_nonce` |
| 不证明 | `drive-relay-slot commit/merge`、forensics tier、relay trace 全链（见 case-65） |

# case-77-standard-subagent-logging

验证 **并发 run.log 写入** + **beacon 坐标**（change 的 logging 下沉契约在 multi-slot 下仍成立）。

## Expected Runtime Path

1. 创建 bundle → validate + inspect → 3× `drive-relay-slot stage` `[MAIN/SHELL]`
2. 并行 spawn 3 native sub-agent（各读 spawnPrompt/task + `_beacon.json`）`[MAIN→SUBAGENT]`
3. 每个 sub-agent：`search_start` → `search_done` → `work_done`（detail 含 `receipt_nonce`）`[SUBAGENT]`
4. **Agent 读 `_logs/run.log`**，确认 9 事件 + 3 nonce `[MAIN]`
5. 机械 checks 写入 `rb_trace.jsonl` → verdict `[MAIN/SHELL]`
6. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 bundle + driver stage 3 slots [MAIN/SHELL]

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs sub_log --case case-77 --force)
echo "B=$B"

node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"

node DPT_FRAMEWORK/cli/drive-relay-slot.mjs stage "$B" --wave 1 --slot-index 0 --role dpt-source-intake --key logger_a --task "Read _beacon.json. Emit search_start, search_done, work_done via log_cli with receipt_nonce. Return strict JSON." --platform claude-code | tee "$B/_stage_a.json"
node DPT_FRAMEWORK/cli/drive-relay-slot.mjs stage "$B" --wave 1 --slot-index 1 --role dpt-source-intake --key logger_b --task "Read _beacon.json. Emit search_start, search_done, work_done via log_cli with receipt_nonce. Return strict JSON." --platform claude-code | tee "$B/_stage_b.json"
node DPT_FRAMEWORK/cli/drive-relay-slot.mjs stage "$B" --wave 1 --slot-index 2 --role dpt-source-intake --key logger_c --task "Read _beacon.json. Emit search_start, search_done, work_done via log_cli with receipt_nonce. Return strict JSON." --platform claude-code | tee "$B/_stage_c.json"
```

→ 预期：3 个 slot 各有 `_beacon.json`（UUID `receipt_nonce` 互不相同）。

---

## Step 2: 并行 spawn 3 sub-agent [MAIN→SUBAGENT]

> **Agent 给自己的指令**：spawn **3** 个 native sub-agent（可并行）。每个 task = 对应 `_stage_{a,b,c}.json` 的 `spawnPrompt` 全文。
>
> **禁止** parent shell 代调 `log-event.mjs` 或写 run.log。

每个 sub-agent **必须**：

1. 读本 slot `_beacon.json`
2. 经 `log_cli` + `bundle_dir` 写 3 条 lifecycle（detail **必须**含 beacon 的 `receipt_nonce` + 正确 `slotKey`/`roleAgentKey`）
3. 返回 minimal strict JSON（`status: done`，匹配 slot `result.schema.json`）

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
| 每个 `logger_a/b/c` 各 3 行（`search_start`→`search_done`→`work_done`） | 并发写入无丢 |
| 每行 detail 含对应 slot 的 beacon `receipt_nonce` | 非 inline bundle 路径 |
| 3 个 nonce **互不相同** | 各 slot beacon 独立 |

---

## Step 4: 机械验证 run.log → rb_trace.jsonl [MAIN/SHELL]

```bash
B= # populated from Step 1

cat > "$B/_verify.mjs" << 'JS'
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { recordCheck } from '../experiments_env/shared/wff-playbook-utils.mjs';
import {
  filterLifecycleLines,
  lifecycleKindsInOrder,
  lifecycleNonceIsolated,
  splitRunLogLines,
} from '../experiments_env/shared/run-log-lifecycle-utils.mjs';

const dir = process.argv[2];
const tracePath = join(dir, 'rb_trace.jsonl');
const logPath = join(dir, '_logs', 'run.log');
const content = existsSync(logPath) ? readFileSync(logPath, 'utf-8') : '';
const lines = splitRunLogLines(content);

const slots = [
  { key: 'logger_a', dir: join(dir, '_subagents/wave_01/slot_00') },
  { key: 'logger_b', dir: join(dir, '_subagents/wave_01/slot_01') },
  { key: 'logger_c', dir: join(dir, '_subagents/wave_01/slot_02') },
];
const events = ['search_start', 'search_done', 'work_done'];

recordCheck(tracePath, { gate: 'log-has-content', passed: lines.length >= 10, detail: `${lines.length} lines (expect >=10)` });
recordCheck(tracePath, {
  gate: 'staging-three-slots',
  passed: slots.every(({ key }) => content.includes('slot_create') && content.includes(`"slotKey":"${key}"`) && content.includes('relay_spawn_requested')),
  detail: 'driver staged 3 slots (slotKey in staging lines is expected — do not count as lifecycle)',
});

const nonces = [];
for (const { key, dir: slotDir } of slots) {
  const beaconPath = join(slotDir, '_beacon.json');
  recordCheck(tracePath, { gate: `beacon-${key}`, passed: existsSync(beaconPath), detail: beaconPath });
  const nonce = existsSync(beaconPath) ? JSON.parse(readFileSync(beaconPath, 'utf-8')).receipt_nonce : '';
  if (nonce) nonces.push(nonce);

  recordCheck(tracePath, { gate: `nonce-in-log-${key}`, passed: !!nonce && content.includes(nonce), detail: nonce ? `${nonce.slice(0, 8)}…` : 'missing beacon' });
  recordCheck(tracePath, {
    gate: `nonce-isolated-${key}`,
    passed: !!nonce && lifecycleNonceIsolated(lines, key, nonce),
    detail: 'lifecycle lines carry only this slot beacon nonce',
  });
  recordCheck(tracePath, {
    gate: `lifecycle-count-${key}`,
    passed: filterLifecycleLines(lines, { slotKey: key }).length === 3,
    detail: `${filterLifecycleLines(lines, { slotKey: key }).length}/3 lifecycle lines`,
  });
  recordCheck(tracePath, {
    gate: `order-${key}`,
    passed: lifecycleKindsInOrder(lines, key, events),
    detail: lifecycleKindsInOrder(lines, key, events) ? 'ordered' : 'OUT OF ORDER',
  });

  for (const evt of events) {
    const parsed = filterLifecycleLines(lines, { slotKey: key, kind: evt });
    const found = parsed.length === 1 && parsed[0].msg === evt;
    recordCheck(tracePath, { gate: `event-${key}-${evt}`, passed: found, detail: found ? 'ok' : 'MISSING or duplicate' });
  }

  const receiptPath = join(slotDir, 'runtime-receipt.jsonl');
  const receiptOk = existsSync(receiptPath) && readFileSync(receiptPath, 'utf-8').includes('agent_runtime_started') && readFileSync(receiptPath, 'utf-8').includes('agent_result_ready');
  recordCheck(tracePath, { gate: `runtime-receipt-${key}`, passed: receiptOk, detail: receiptPath });
}

recordCheck(tracePath, {
  gate: 'nonces-distinct',
  passed: nonces.length === 3 && new Set(nonces).size === 3,
  detail: `${new Set(nonces).size}/3 unique beacon nonces`,
});

const subLines = filterLifecycleLines(lines);
recordCheck(tracePath, { gate: 'all-9-events', passed: subLines.length === 9, detail: `${subLines.length}/9 lifecycle lines (exclude relay_spawn_*)` });

console.log('Recorded run.log checks to rb_trace.jsonl');
JS
node "$B/_verify.mjs" "$B"
```

→ 预期：9/9 事件 + 3 个 nonce 均出现在 run.log。

---

## Step 5: 从 trace 裁决 [MAIN/SHELL]

```bash
B= # populated from Step 1
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
```

→ 预期：`PASS`

---

## Step 6: 结果解读 [MAIN/SHELL]

| Check | 证明 |
|-------|------|
| `staging-three-slots` | driver staging 行含 slotKey — **不得**当作 lifecycle 计数 |
| `beacon-*` / `nonce-in-log-*` / `nonce-isolated-*` | sub-agent 经 beacon 写 log，nonce 不串 slot |
| `lifecycle-count-*` / `event-*` / `all-9-events` | 3 slot × 3 lifecycle，无丢无重复 |
| `nonces-distinct` | 3 个 beacon UUID 互不相同 |
| `runtime-receipt-*` | sub-agent 写了 runtime receipt（非 parent 代写） |
| `order-*` | 单 slot 内 lifecycle 顺序正确 |

**Verifier 陷阱**：`relay_spawn_*` 行的 JSON detail 也含 `slotKey` — 计数 lifecycle 必须用 `filterLifecycleLines()`（见 `experiments_env/shared/run-log-lifecycle-utils.mjs`），不能 grep slotKey。

**PASS 含义**：multi-slot 并发下 `log-event.mjs` + beacon nonce 契约成立。

**与 case-65 分工**：77 = logging 并发切片；65 = driver 全链 + forensics tier-1。

---

## Cleanup [MAIN/SHELL]

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

```bash
B= # populated from Step 1
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B'))"
```

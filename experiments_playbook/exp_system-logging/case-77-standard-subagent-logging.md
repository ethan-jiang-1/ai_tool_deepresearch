---
schema: command-experiment/v1
experiment: system-logging
case: case-77-standard-subagent-logging
weight: standard
case_goal: "验证 3 个真实 sub-agent 通过 log-event.mjs CLI 并发写入 _logs/run.log，所有事件不丢、不交错、可 grep。"
runner: coding-agent
agent_mode: native-subagent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-77_sub_log
trace: dpt_disp_case-77_sub_log/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行。必须启动 3 个真实 native subagent，每个 subagent 通过 `log-event.mjs` CLI 写入父 bundle 的 `_logs/run.log`。实验结果必须来自实际文件写入；禁止 mock 返回或手写假 result。

# case-77-standard-subagent-logging

验证多 subagent 并发写 `_logs/run.log` 时：所有 `search_start`/`search_done`/`work_done` 事件完整出现在 log 中，按时间序排列，无丢失无交错，且各 slot 身份（`slotKey`/`roleAgentKey`）可区分。

## Expected Runtime Path

1. 创建 bundle + 准备 3 个 relay slot `[MAIN/SHELL]`
2. Phase Agent 并行 spawn 3 个 native sub-agent `[MAIN→SUBAGENT]`
3. 每个 sub-agent 执行 3 次 `log-event.mjs`（search_start → search_done → work_done） `[SUBAGENT]`
4. 验证 `_logs/run.log` 含 9 个（3 slot × 3 events）事件 `[MAIN/SHELL]`
5. 验证事件身份正确、无交错 `[MAIN/SHELL]`
6. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 bundle + 准备 slots

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs sub_log --case case-77 --force)
echo "B=$B"
```

```bash
B= # populated above

cat > /tmp/prepare-case77.mjs << 'JSCRIPT'
import { stageSubagentSlots } from '../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[1];
const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' };

const dispatchMap = new Map([['pass', [
  { key: 'logger_a', slotIndex: 0, roleAgentKey: 'dpt-log-test', taskDescription: 'Write 3 log events — slot A', timeoutMs: 60000 },
  { key: 'logger_b', slotIndex: 1, roleAgentKey: 'dpt-log-test', taskDescription: 'Write 3 log events — slot B', timeoutMs: 60000 },
  { key: 'logger_c', slotIndex: 2, roleAgentKey: 'dpt-log-test', taskDescription: 'Write 3 log events — slot C', timeoutMs: 60000 },
]]]);

const slots = stageSubagentSlots(state, dir, dispatchMap);
console.log('slots staged:', slots.length);

for (const s of slots) {
  const taskContent = `# Write Diagnostic Log Events

Run these 3 commands in order, then return the JSON:

1.  node DPT_FRAMEWORK/cli/log-event.mjs --bundle ${dir} --level info --msg "search_start" --detail '{"kind":"search_start","slotKey":"${s.key}","roleAgentKey":"${s.roleAgentKey}"}'
2.  node DPT_FRAMEWORK/cli/log-event.mjs --bundle ${dir} --level info --msg "search_done" --detail '{"kind":"search_done","slotKey":"${s.key}","roleAgentKey":"${s.roleAgentKey}","result_count":3}'
3.  node DPT_FRAMEWORK/cli/log-event.mjs --bundle ${dir} --level info --msg "work_done" --detail '{"kind":"work_done","slotKey":"${s.key}","roleAgentKey":"${s.roleAgentKey}","summary":"slot ${s.key} complete"}'

Return only this JSON (no markdown, no code fences):
{"slotKey":"${s.key}","roleAgentKey":"${s.roleAgentKey}","status":"done","summary":"wrote 3 log events from ${s.key}","evidenceCount":0,"references":[],"confidence":1,"notes":[],"output_files":[],"cache_trails":[]}
`;
  writeFileSync(join(dir, s.taskPath), taskContent);
  writeFileSync(join(dir, s.schemaPath), JSON.stringify({ type: 'object', additionalProperties: true }));
  console.log('  prepared:', s.key);
}
JSCRIPT
node /tmp/prepare-case77.mjs "$B"
```

→ 预期：3 个 slot 文件就绪。

---

## Step 2: 并行 spawn 3 个 sub-agent [MAIN→SUBAGENT]

Phase Agent 读取每个 slot 的 `task.md`，并行 spawn 3 个 native sub-agent。每个 sub-agent 的 task 完全由其 `task.md` 描述——只做 3 次 `log-event.mjs` 调用然后返回 JSON。

Sub-agent 的 task 内容在 Step 1 中已写入 `_subagents/wave_01/slot_0*/task.md`。Phase Agent 需为每个 slot 创建 sub-agent，task 就是该文件的全部内容。

> **Agent 给自己的指令**：读到此处时，用 Agent 工具 spawn 3 个 native sub-agent。从 `_subagents/wave_01/slot_00/task.md`、`slot_01/task.md`、`slot_02/task.md` 读取各自的 task，每个 sub-agent 独立执行。

---

## Step 3: 验证 run.log [MAIN/SHELL]

```bash
B= # populated from Step 1

cat > /tmp/verify-case77.mjs << 'JSCRIPT'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[1];
const logPath = join(dir, '_logs', 'run.log');
const content = readFileSync(logPath, 'utf-8');
const lines = content.trim().split('\n');

const checks = [];

// Check total log lines (expect: run_start + heartbeat + 9 subagent events = 11+)
checks.push({
  event: 'check', gate: 'log-has-content',
  passed: lines.length >= 11, expected: true,
  detail: `${lines.length} total log lines (expected >= 11)`,
});

// Check each slot's 3 events
const slots = ['logger_a', 'logger_b', 'logger_c'];
const events = ['search_start', 'search_done', 'work_done'];

for (const slot of slots) {
  for (const evt of events) {
    const found = content.includes(evt) && content.includes(`"slotKey":"${slot}"`);
    checks.push({
      event: 'check', gate: `event-${slot}-${evt}`,
      passed: found, expected: true,
      detail: found ? `${slot}/${evt} found` : `${slot}/${evt} MISSING`,
    });
  }
}

// All 9 subagent events present?
const totalSubagentLines = lines.filter(l =>
  slots.some(s => l.includes(`"slotKey":"${s}"`))
).length;
checks.push({
  event: 'check', gate: 'all-9-events',
  passed: totalSubagentLines === 9, expected: true,
  detail: `${totalSubagentLines}/9 sub-agent log lines found`,
});

// Check no interleaving: each slot's 3 events should appear in order within that slot
for (const slot of slots) {
  const slotLines = lines.filter(l => l.includes(`"slotKey":"${slot}"`));
  const texts = slotLines.join(' ');
  const inOrder = texts.includes('search_start') &&
                  texts.indexOf('search_start') < texts.indexOf('search_done') &&
                  texts.indexOf('search_done') < texts.indexOf('work_done');
  checks.push({
    event: 'check', gate: `order-${slot}`,
    passed: inOrder, expected: true,
    detail: inOrder ? `${slot} events in order` : `${slot} events OUT OF ORDER`,
  });
}

const tracePath = join(dir, '_logs', '_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify({ ts: new Date().toISOString(), ...c }) + '\n', { flag: 'a' });
}

const failed = checks.filter(c => !c.passed);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failed.length, failed: failed.length }));
if (failed.length > 0) {
  console.log('FAILED:', failed.map(c => `${c.gate}: ${c.detail}`).join('\n'));
  process.exit(1);
}
console.log('ALL PASS');
JSCRIPT
node /tmp/verify-case77.mjs "$B"
```

→ 预期：9/9 事件存在，每个 slot 内事件有序。

---

## Step 4: 查看 run.log 全貌

```bash
B= # populated from Step 1
cat "$B/_logs/run.log"
```

---

## Result Interpretation

| Check | 证明 |
|-------|------|
| `log-has-content` | run.log 有足够行数 |
| `event-<slot>-search_start` / `search_done` / `work_done` | 每个 slot 的 3 种事件全部写入 |
| `all-9-events` | 恰好 9 条 sub-agent 日志行，无丢无重复 |
| `order-<slot>` | 同一 slot 的事件按 search_start → search_done → work_done 顺序，未交错 |

**PASS 含义**：3 个并发 sub-agent 通过 `log-event.mjs` 成功写入同一份 `_logs/run.log`，所有事件完整可检索，各 slot 身份可区分。

**FAIL 含义**：至少一个事件缺失、乱序、或 slot 身份不可识别——说明并发写入机制有问题，或 sub-agent 未正确执行 log-event.mjs。

---

## Cleanup

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

```bash
B= # populated from Step 1
rm -rf "$B" && echo "Cleaned up $B"
```

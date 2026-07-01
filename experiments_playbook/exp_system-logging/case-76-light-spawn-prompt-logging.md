---
schema: command-experiment/v1
experiment: system-logging
case: case-76-light-spawn-prompt-logging
weight: light
case_goal: "验证 buildSpawnPrompt() 包含 'Diagnostic logging' 段，列出 6 种事件（search_start/search_done/fetch_done/file_written/error/work_done）及 copyable log-event.mjs 命令示例。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-76_spawn_log
trace: dpt_disp_case-76_spawn_log/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。实验结果必须来自实际文件写入和 CLI 调用；禁止 mock 返回或手写假 result。

# case-76-light-spawn-prompt-logging

验证 `recordAgentSpawnRequested()` → `buildSpawnPrompt()` 返回的 prompt 字符串包含完整的 Diagnostic logging 段，sub-agent 可据此用 `log-event.mjs` 写诊断日志。

## Expected Runtime Path

1. 创建 disposable bundle + 通过 `stageSubagentSlots` 得到 slot `[MAIN/SHELL]`
2. 调用 `recordAgentSpawnRequested` 生成 spawn prompt `[MAIN/SHELL]`
3. 验证 prompt 含 Diagnostic logging 段 + 6 种事件 + 禁止内容声明 `[MAIN/SHELL]`
4. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 bundle 并拿到 slot

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs spawn-log --case case-76 --force)
echo "B=$B"
```

---

## Step 2: 生成 spawn prompt 并验证

```bash
B= # populated from Step 1

cat > "$B/_verify_spawn.mjs" << 'JS'
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const {
  stageSubagentSlots, recordAgentSpawnRequested,
} = await import('../DPT_FRAMEWORK/engine/subagent-relay.mjs');

const dir = process.argv[1];

const state = {
  current_gate: 'wave0_complete',
  ref_count: 5,
  ref_floor: 5, // pass branch — dispatchMap has slot configs
  topicReadiness: 'ready',
};

const slots = stageSubagentSlots(state, dir);

const checks = [];
checks.push({
  event: 'check', gate: 'slots-created',
  passed: slots.length > 0,
  expected: true,
  detail: `${slots.length} slots staged`,
});

if (slots.length > 0) {
  // Write receipt so recordAgentSpawnRequested can validate the slot
  const slot = slots[0];
  const receiptDir = join(dir, '_subagents', `wave_${slot.waveIndex}`, `slot_0${slot.slotIndex}`);
  const { mkdirSync } = await import('node:fs');
  mkdirSync(receiptDir, { recursive: true });

  const prompt = recordAgentSpawnRequested(slot, dir, { platform: 'codex' });

  // Verify the prompt has the diagnostic logging section
  const hasSection = prompt.includes('Diagnostic logging');
  const hasLogEventCli = prompt.includes('log-event.mjs');

  const requiredEvents = ['search_start', 'search_done', 'fetch_done', 'file_written', 'error', 'work_done'];
  const eventChecks = requiredEvents.map(evt => ({
    event: 'check', gate: `spawn-event-${evt}`,
    passed: prompt.includes(evt),
    expected: true,
    detail: prompt.includes(evt) ? `${evt} mentioned` : `${evt} MISSING`,
  }));
  checks.push(...eventChecks);

  // Must include level instruction
  checks.push({
    event: 'check', gate: 'spawn-level-instruction',
    passed: prompt.includes('--level <info|warn|error>'),
    expected: true,
    detail: '--level instruction present',
  });

  // Must include slotKey and roleAgentKey in examples
  checks.push({
    event: 'check', gate: 'spawn-has-slotKey',
    passed: prompt.includes('slotKey'),
    expected: true,
    detail: 'slotKey field mentioned',
  });
  checks.push({
    event: 'check', gate: 'spawn-has-roleAgentKey',
    passed: prompt.includes('roleAgentKey'),
    expected: true,
    detail: 'roleAgentKey field mentioned',
  });

  // Must include forbidden content warning
  checks.push({
    event: 'check', gate: 'spawn-forbidden-content',
    passed: prompt.includes('Do NOT log'),
    expected: true,
    detail: '"Do NOT log" warning present',
  });

  // Must use absolute path for log-event.mjs
  checks.push({
    event: 'check', gate: 'spawn-absolute-path',
    passed: prompt.includes('node ') && prompt.includes('DPT_FRAMEWORK/cli/log-event.mjs'),
    expected: true,
    detail: 'absolute log-event.mjs path used',
  });

  // All 6 events must have copyable command examples with --detail JSON
  checks.push({
    event: 'check', gate: 'spawn-has-detail-json',
    passed: prompt.includes('--detail'),
    expected: true,
    detail: '--detail flag used in examples',
  });
}

const tracePath = join(dir, '_logs', '_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify({ ts: new Date().toISOString(), ...c }) + '\n', { flag: 'a' });
}

const failed = checks.filter(c => !c.passed);
console.log(JSON.stringify({ checks: checks.length, failed: failed.length }));
if (failed.length > 0) {
  console.log('FAILED:', failed.map(c => c.gate).join(', '));
  process.exit(1);
}
JS
node "$B/_verify_spawn.mjs" "$B"
```

→ 预期：prompt 含 `## Diagnostic logging`，6 种事件全列出，`--detail` JSON 含 `slotKey`/`roleAgentKey`，`Do NOT log` 警告存在。

---

## Cleanup

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

```bash
B= # populated from Step 1
rm -rf "$B" && echo "Cleaned up $B"
```

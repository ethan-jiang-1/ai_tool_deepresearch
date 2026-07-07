---
schema: command-experiment/v1
experiment: system-logging
case: case-74-light-heartbeat-metadata
weight: light
case_goal: "验证 createRunLogger() 的 logger_ready heartbeat 携带 node/platform/framework_root 而非 pid，且为 run.log 首行（或紧随 run_start）。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-74_hb_meta
trace: dpt_disp_case-74_hb_meta/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。实验结果必须来自实际文件写入和 CLI 调用；禁止 mock 返回或手写假 result。

# case-74-light-heartbeat-metadata

验证 `createRunLogger()` 写的 `logger_ready` 行携带运行时环境元信息（node 版本、platform、framework 路径），而非无诊断价值的 pid。

## Expected Runtime Path

1. 创建 disposable bundle `[MAIN/SHELL]`
2. 触发 `createRunLogger()` 调用 `[MAIN/SHELL]`
3. 验证 `_logs/run.log` 含 `logger_ready` 且字段正确 `[MAIN/SHELL]`
4. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 disposable bundle 并触发 logger 初始化

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs heartbeat --case case-74 --force)
mkdir -p "$B/_logs"
echo "B=$B"
```

---

## Step 2: 触发 createRunLogger() 并验证 heartbeat

```bash
B= # populated from Step 1

cat > "$B/_verify_heartbeat.mjs" << 'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Import and call createRunLogger — this writes the heartbeat
const { createRunLogger } = await import('../DPT_FRAMEWORK/engine/logger.mjs');
const log = createRunLogger(process.argv[2]);
log.info('test_event');

const logPath = join(process.argv[2], '_logs', 'run.log');
const content = readFileSync(logPath, 'utf-8');
const lines = content.trim().split('\n');

// Find the heartbeat line
const hbLine = lines.find(l => l.includes('logger_ready'));
const checks = [];

checks.push({
  event: 'check', gate: 'heartbeat-exists',
  passed: Boolean(hbLine),
  expected: true,
  detail: hbLine ? 'logger_ready found' : 'logger_ready MISSING',
});

if (hbLine) {
  // Parse the JSON detail part
  const jsonMatch = hbLine.match(/\{.*\}$/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  checks.push({
    event: 'check', gate: 'heartbeat-has-node',
    passed: typeof parsed.node === 'string' && parsed.node.startsWith('v'),
    expected: true,
    detail: `node=${parsed.node}`,
  });

  checks.push({
    event: 'check', gate: 'heartbeat-has-platform',
    passed: typeof parsed.platform === 'string',
    expected: true,
    detail: `platform=${parsed.platform}`,
  });

  checks.push({
    event: 'check', gate: 'heartbeat-has-framework-root',
    passed: typeof parsed.framework_root === 'string' && parsed.framework_root.includes('DPT_FRAMEWORK'),
    expected: true,
    detail: `framework_root=${parsed.framework_root}`,
  });

  checks.push({
    event: 'check', gate: 'heartbeat-no-pid',
    passed: parsed.pid === undefined,
    expected: true,
    detail: 'pid field absent (replaced by runtime metadata)',
  });

  // Verify heartbeat is before test_event (first or right after run_start)
  const hbIndex = lines.indexOf(hbLine);
  const testIndex = lines.findIndex(l => l.includes('test_event'));
  checks.push({
    event: 'check', gate: 'heartbeat-before-events',
    passed: hbIndex >= 0 && (testIndex < 0 || hbIndex < testIndex),
    expected: true,
    detail: `heartbeat at line ${hbIndex + 1}, test_event at line ${testIndex >= 0 ? testIndex + 1 : 'N/A'}`,
  });
}

// Write check events
const tracePath = join(process.argv[2], '_logs', '_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify({ ts: new Date().toISOString(), ...c }) + '\n', { flag: 'a' });
}

const failed = checks.filter(c => !c.passed);
console.log(JSON.stringify({ checks: checks.length, failed: failed.length }));
if (failed.length > 0) process.exit(1);
JS
node "$B/_verify_heartbeat.mjs" "$B"
```

→ 预期：`logger_ready` 存在，含 `node`/`platform`/`framework_root`，无 `pid`。

---

## Cleanup

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

```bash
B= # populated from Step 1
rm -rf "$B" && echo "Cleaned up $B"
```

---
schema: command-experiment/v2
experiment: system-logging
case: case-74-light-heartbeat-metadata
case_goal: "验证 createRunLogger() 的 logger_ready heartbeat 携带 node/platform/framework_root 而非 pid，且为 run.log 首行（或紧随 run_start）。"
verdict_mode: all
required_checks: [heartbeat-before-events, heartbeat-exists, heartbeat-has-framework-root, heartbeat-has-node, heartbeat-has-platform, heartbeat-no-pid]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

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
B=$(node experiments_env/shared/new-disposable-bundle.mjs heartbeat --case case-74 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
mkdir -p "$B/_logs"
echo "B=$B"
```

---

## Step 2: 触发 createRunLogger() 并验证 heartbeat

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Import and call createRunLogger — this writes the heartbeat
const { createRunLogger } = await import('./DPT_FRAMEWORK/engine/logger.mjs');
const log = createRunLogger(process.argv[2]);
log.info('test_event');

const logPath = join(process.argv[2], '_logs', 'run.log');
const content = readFileSync(logPath, 'utf-8');
const lines = content.trim().split('\n');

// Find the heartbeat line
const hbLine = lines.find(l => l.includes('logger_ready'));
const checks = [];

checks.push({
  event: 'check', source: 'playbook', gate: 'heartbeat-exists',
  passed: Boolean(hbLine),
  expected: true,
  detail: hbLine ? 'logger_ready found' : 'logger_ready MISSING',
});

if (hbLine) {
  // Parse the JSON detail part
  const jsonMatch = hbLine.match(/\{.*\}$/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  checks.push({
    event: 'check', source: 'playbook', gate: 'heartbeat-has-node',
    passed: typeof parsed.node === 'string' && parsed.node.startsWith('v'),
    expected: true,
    detail: `node=${parsed.node}`,
  });

  checks.push({
    event: 'check', source: 'playbook', gate: 'heartbeat-has-platform',
    passed: typeof parsed.platform === 'string',
    expected: true,
    detail: `platform=${parsed.platform}`,
  });

  checks.push({
    event: 'check', source: 'playbook', gate: 'heartbeat-has-framework-root',
    passed: typeof parsed.framework_root === 'string' && parsed.framework_root.includes('DPT_FRAMEWORK'),
    expected: true,
    detail: `framework_root=${parsed.framework_root}`,
  });

  checks.push({
    event: 'check', source: 'playbook', gate: 'heartbeat-no-pid',
    passed: parsed.pid === undefined,
    expected: true,
    detail: 'pid field absent (replaced by runtime metadata)',
  });

  // Verify heartbeat is before test_event (first or right after run_start)
  const hbIndex = lines.indexOf(hbLine);
  const testIndex = lines.findIndex(l => l.includes('test_event'));
  checks.push({
    event: 'check', source: 'playbook', gate: 'heartbeat-before-events',
    passed: hbIndex >= 0 && (testIndex < 0 || hbIndex < testIndex),
    expected: true,
    detail: `heartbeat at line ${hbIndex + 1}, test_event at line ${testIndex >= 0 ? testIndex + 1 : 'N/A'}`,
  });
}

// Write check events
const tracePath = join(process.argv[2], 'rb_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify({ ts: new Date().toISOString(), source: 'playbook', ...c }) + '\n', { flag: 'a' });
}

const failed = checks.filter(c => !c.passed);
console.log(JSON.stringify({ checks: checks.length, failed: failed.length }));
if (failed.length > 0) process.exit(1);
JS
```

→ 预期：`logger_ready` 存在，含 `node`/`platform`/`framework_root`，无 `pid`。

---

## Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.

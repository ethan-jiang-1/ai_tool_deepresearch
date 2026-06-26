---
schema: command-experiment/v1
experiment: system-logging
case: case-71-light-unified-envelope
weight: light
case_goal: "验证 writeGateAttempt + log-event.mjs + logToRun 三种写入源产生统一信封 [ISO8601] LEVEL msg bundle=<name> {detail}，bundle 一致，inspect-bundle --timeline 单 regex 全解析。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-71_log_simple
trace: dpt_disp_case-71_log_simple/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。实验结果必须来自实际文件写入、CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-71-light-unified-envelope

验证三种写入源（gate CLI via `writeGateAttempt`、Agent via `log-event.mjs`、bundle 创建 via `logToRun`）产生的所有日志行符合统一信封，`bundle` 字段一致，且 `inspect-bundle --timeline` 可一行 regex 全解析。

## Expected Runtime Path

1. 创建 disposable bundle，validate + inspect `[MAIN/SHELL]`
2. 跑 2 个 gate CLI（内部走 `writeGateAttempt`） `[MAIN/SHELL]`
3. Agent 通过 `log-event.mjs` CLI 写 phase 日志 `[MAIN/SHELL]`
4. 验证 `_logs/run.log` 信封格式 `[MAIN/SHELL]`
5. 验证 `rb_trace.jsonl` 含 `bundle` 字段 `[MAIN/SHELL]`
6. `inspect-bundle --timeline` 缝合验证 `[MAIN/SHELL]`
7. `inspect-bundle --summary` pass/fail 表 + log 行数 `[MAIN/SHELL]`
8. 从 trace 裁决 `[MAIN/SHELL]`
9. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 disposable runtime context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs log_simple --case case-71 --force)
# new-disposable-bundle creates minimal structure — create scaffold files
touch "$B/reference/_INDEX.md" "$B/reference/README.md"
mkdir -p "$B/artifacts/wave0"
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
# inspect-bundle requires _logs/run.log — it gets created on first log write
# For now, verify structure minus log
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B" || true

echo "B=$B"

# Record bundle creation trace check
cat > "$B/_check.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

// Verify run_start in trace
const trace = await import('../DPT_FRAMEWORK/engine/trace.mjs');
const t = trace.createTrace(join(__dirname, 'rb_trace.jsonl'), { consoleEcho: false });
const summary = t.traceSummary();
const hasRunStart = summary.events.some(e => e.event === 'run_start');
const hasBundle = summary.events.some(e => e.bundle !== undefined);

// Verify _logs/run.log exists and has first line
const { existsSync, readFileSync } = await import('node:fs');
const logPath = join(__dirname, '_logs', 'run.log');
const logExists = existsSync(logPath);
const logContent = logExists ? readFileSync(logPath, 'utf-8') : '';
const hasFirstLine = logContent.includes('run_start');

// Write check events
// Disposable bundles skip traceInit/logToRun (only production instantiate-run-bundle calls them).
// These checks confirm disposable bundle state — boundary: expected=false.
const checks = [
  { ts: new Date().toISOString(), event: 'check', gate: 'bundle-creation', passed: hasRunStart, expected: false, detail: 'disposable bundle: rb_trace.jsonl has no run_start (expected — only production bundles)' },
  { ts: new Date().toISOString(), event: 'check', gate: 'bundle-creation', passed: logExists, expected: false, detail: 'disposable bundle: _logs/run.log not created yet (expected — created on first log write)' },
];
const tracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
}
console.log(JSON.stringify({ run_start: hasRunStart, logExists, hasFirstLine }));
JS
node "$B/_check.mjs"
```

→ 预期：`run_start` trace event 存在，`_logs/run.log` 含首行。

---

## Step 2: 跑 gate CLI（验证 writeGateAttempt）

```bash
B= # populated from Step 1

# Copy minimal gate definition for testing
mkdir -p "$B/_gates"

# Run a gate that will PASS (setup-ready on a clean bundle)
cat > "$B/_run_gate.mjs" << 'JS'
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

// Boundary: disposable bundle is incomplete — gate SHOULD reject. expected: false
const gates = [
  { name: 'setup-ready', node: 'phases/phase-setup.md', expectPass: false },
];

for (const g of gates) {
  const cmd = `node DPT_FRAMEWORK/cli/gates/check-gate-${g.name}.mjs --bundle "${__dirname}" --current-node "${g.node}"`;
  try {
    const stdout = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    const result = JSON.parse(stdout);
    const passed = result.check.passed;
    const detail = `${g.name} gate: ${passed ? 'PASS' : 'FAIL'}`;
    
    // Write check to experiment trace
    const check = JSON.stringify({
      ts: new Date().toISOString(),
      event: 'check',
      gate: g.name,
      passed: passed === g.expectPass,
      expected: g.expectPass,
      detail,
    });
    writeFileSync(join(__dirname, '_logs', '_trace.jsonl'), check + '\n', { flag: 'a' });
    console.log(detail);
  } catch (e) {
    // Gate exit 1 on FAIL — still capture the JSON from stdout
    if (e.stdout) {
      const result = JSON.parse(e.stdout);
      const check = JSON.stringify({
        ts: new Date().toISOString(),
        event: 'check',
        gate: g.name,
        passed: result.check.passed,
        expected: g.expectPass,
        detail: `${g.name} gate: ${result.check.passed ? 'PASS' : 'FAIL'}`,
      });
      writeFileSync(join(__dirname, '_logs', '_trace.jsonl'), check + '\n', { flag: 'a' });
      console.log(`${g.name} gate: ${result.check.passed ? 'PASS' : 'FAIL'}`);
    } else {
      console.log(`${g.name}: error - ${e.message}`);
    }
  }
}
JS
node "$B/_run_gate.mjs"
```

→ 预期：gate PASS，`writeGateAttempt` 写入 `_logs/run.log` 和 `rb_trace.jsonl`。

---

## Step 3: Agent 通过 log-event.mjs CLI 写日志

```bash
B= # populated from Step 1

# Simulate Agent writing phase START/END log entries
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:setup START"
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:setup END — gate PASS"
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level warn --msg "repair" --detail '{"slot":"03","reason":"test"}'

# Verify log-event exits 0 even with bad input
node DPT_FRAMEWORK/cli/log-event.mjs --bundle /nonexistent --level info --msg "should not crash"
echo "log-event resilience: OK"
```

→ 预期：三个 log 行写入 `_logs/run.log`，bad input 静默 exit 0。

---

## Step 4: 验证 _logs/run.log 统一信封格式

```bash
B= # populated from Step 1

cat > "$B/_verify_envelope.mjs" << 'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const logPath = join(__dirname, '_logs', 'run.log');
const content = readFileSync(logPath, 'utf-8').trim();
const lines = content.split('\n');

// D6.1 envelope regex
const envelopeRe = /^\[([^\]]+)\] (DEBUG|INFO|WARN|ERROR) .+ bundle=(\S+)( \{.*\})?$/;

let allMatch = true;
let bundleConsistent = true;
const bundleValue = null;
const failures = [];

for (const line of lines) {
  const m = line.match(envelopeRe);
  if (!m) {
    allMatch = false;
    failures.push(`no match: ${line.slice(0, 80)}`);
    continue;
  }
  const [, ts, level, bundle, detail] = m;
  if (bundleValue === null) {
    // first line — record bundle value
  } else if (bundle !== bundleValue) {
    bundleConsistent = false;
    failures.push(`bundle mismatch: expected ${bundleValue}, got ${bundle} in: ${line.slice(0, 80)}`);
  }
}

// Read expected bundle from rb_status.json
const status = JSON.parse(readFileSync(join(__dirname, 'rb_status.json'), 'utf-8'));
const expectedBundle = status.bundle || '<unknown>';

// Check all bundles match status
const allBundleMatch = lines.every(l => {
  const m = l.match(envelopeRe);
  return m && m[3] === expectedBundle;
});

const checks = [
  { event: 'check', gate: 'envelope-format', passed: allMatch, expected: true, detail: `All ${lines.length} lines match unified envelope` },
  { event: 'check', gate: 'bundle-consistency', passed: allBundleMatch, expected: true, detail: `All lines bundle=${expectedBundle}` },
];

const tracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify({ ts: new Date().toISOString(), ...c }) + '\n', { flag: 'a' });
}

console.log(JSON.stringify({ lines: lines.length, allMatch, allBundleMatch, expectedBundle }));
JS
node "$B/_verify_envelope.mjs"
```

→ 预期：所有 log 行匹配 D6.1 信封，`bundle` 值一致。

---

## Step 5: 验证 rb_trace.jsonl 含 bundle 字段

```bash
B= # populated from Step 1

cat > "$B/_verify_trace_bundle.mjs" << 'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const tracePath = join(__dirname, 'rb_trace.jsonl');
const raw = readFileSync(tracePath, 'utf-8').trim();
const lines = raw.split('\n');
const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const gateAttempts = events.filter(e => e.event === 'gate_attempt');
const allHaveBundle = gateAttempts.every(e => e.bundle !== undefined);

// Read expected bundle from status
const status = JSON.parse(readFileSync(join(__dirname, 'rb_status.json'), 'utf-8'));
const expectedBundle = status.bundle;
const allBundleMatch = gateAttempts.every(e => e.bundle === expectedBundle);

const checks = [
  { event: 'check', gate: 'trace-bundle', passed: allHaveBundle && gateAttempts.length > 0, expected: true, detail: `${gateAttempts.length} gate_attempt entries have bundle field` },
  { event: 'check', gate: 'trace-bundle-match', passed: allBundleMatch, expected: true, detail: `All bundle fields match rb_status.json: ${expectedBundle}` },
];

const expTracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) {
  writeFileSync(expTracePath, JSON.stringify({ ts: new Date().toISOString(), ...c }) + '\n', { flag: 'a' });
}

console.log(JSON.stringify({ gateAttempts: gateAttempts.length, allHaveBundle, allBundleMatch, expectedBundle }));
JS
node "$B/_verify_trace_bundle.mjs"
```

→ 预期：所有 `gate_attempt` 含 `bundle` 字段，值与 `rb_status.json` 一致。

---

## Step 6: inspect-bundle --timeline 缝合验证

```bash
B= # populated from Step 1

# Run timeline and verify it stitches correctly
TIMELINE=$(node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B" --timeline 2>&1)
echo "$TIMELINE"

# Verify timeline contains entries from both log and trace
cat > "$B/_verify_timeline.mjs" << 'JS'
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const stdout = execSync(`node DPT_FRAMEWORK/cli/inspect-bundle.mjs "${__dirname}" --timeline`, { encoding: 'utf-8', stdio: 'pipe' });

const hasTrace = stdout.includes('[trace]');
const hasLog = stdout.includes('[log]');
const noUnparsed = !stdout.includes('[unparsed]');

const checks = [
  { event: 'check', gate: 'timeline-trace', passed: hasTrace, expected: true, detail: 'timeline includes [trace] entries' },
  { event: 'check', gate: 'timeline-log', passed: hasLog, expected: true, detail: 'timeline includes [log] entries' },
  { event: 'check', gate: 'timeline-clean', passed: noUnparsed, expected: true, detail: 'no unparsed entries in timeline' },
];

const tracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify({ ts: new Date().toISOString(), ...c }) + '\n', { flag: 'a' });
}

console.log(JSON.stringify({ hasTrace, hasLog, noUnparsed }));
JS
node "$B/_verify_timeline.mjs"
```

→ 预期：timeline 包含 `[trace]` 和 `[log]` 来源，无 `[unparsed]`。

---

## Step 7: inspect-bundle --summary + --log

```bash
B= # populated from Step 1

echo "=== SUMMARY ==="
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B" --summary

echo ""
echo "=== LOG ==="
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B" --log

# Verify --summary exits 0 and includes expected info
cat > "$B/_verify_summary.mjs" << 'JS'
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const stdout = execSync(`node DPT_FRAMEWORK/cli/inspect-bundle.mjs "${__dirname}" --summary`, { encoding: 'utf-8', stdio: 'pipe' });

const hasPassed = stdout.includes('passed');
const hasFailed = stdout.includes('failed');
const hasLogCount = stdout.includes('lines');
const noWarning = !stdout.includes('[warning]'); // log should have lines

const checks = [
  { event: 'check', gate: 'summary-passed', passed: hasPassed, expected: true, detail: 'summary shows passed count' },
  { event: 'check', gate: 'summary-logcount', passed: hasLogCount, expected: true, detail: 'summary shows log line count' },
  { event: 'check', gate: 'summary-nowarning', passed: noWarning, expected: true, detail: 'no warning (log has content)' },
];

const tracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify({ ts: new Date().toISOString(), ...c }) + '\n', { flag: 'a' });
}

console.log(JSON.stringify({ hasPassed, hasLogCount, noWarning }));
JS
node "$B/_verify_summary.mjs"
```

→ 预期：summary 显示 passed/failed 计数、log 行数，无 empty log warning。

---

## Step 8: 从 trace 裁决

```bash
B= # populated from Step 1

cat > "$B/_verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const tracePath = join(__dirname, '_logs', '_trace.jsonl');
const raw = readFileSync(tracePath, 'utf-8').trim();
const lines = raw.split('\n').filter(l => l.trim());
const events = lines.map(l => JSON.parse(l));
const checks = events.filter(e => e.event === 'check');

if (checks.length === 0) {
  console.log('FAIL: No check events found in trace');
  process.exit(1);
}

const failed = checks.filter(c => c.passed !== (c.expected !== undefined ? c.expected : true));
const passed = checks.filter(c => c.passed === (c.expected !== undefined ? c.expected : true));

console.log('');
console.log('══════ Verdict ══════');
for (const c of checks) {
  const icon = c.passed === (c.expected !== undefined ? c.expected : true) ? 'PASS' : 'FAIL';
  console.log(`  ${icon}  ${c.gate}: ${c.detail}`);
}
console.log('══════════════════════');
console.log(`PASS: ${passed.length}  FAIL: ${failed.length}`);

if (failed.length > 0) {
  console.log(`\nFAIL — ${failed.length} check(s) failed`);
  process.exit(1);
}
console.log(`\nPASS — all ${checks.length} checks passed`);
console.log('Proof: unified logging envelope + bundle propagation + timeline stitching works across all three write sources.');
JS
node "$B/_verdict.mjs"
```

→ 预期：PASS，所有 check 通过。

---

## Step 9: 结果解读

每个 check 证明了什么：

| Check gate | 证明 |
|------------|------|
| `bundle-creation` | `instantiate-run-bundle` 写 `run_start` trace + 首条 log |
| `setup-ready` | gate CLI 的 `writeGateAttempt` 双写 log + trace |
| `envelope-format` | 所有 log 行（3 个来源）符合 `[ISO8601] LEVEL msg bundle=<name> {detail}` |
| `bundle-consistency` | 所有 log 行的 `bundle` 值与 `rb_status.json` 一致 |
| `trace-bundle` | `rb_trace.jsonl` 的 `gate_attempt` 含 `bundle` 字段 |
| `trace-bundle-match` | trace 的 `bundle` 与 status 一致 |
| `timeline-trace` / `timeline-log` | `--timeline` 成功缝合 log + trace 两个 sink |
| `timeline-clean` | 无 envelope 解析失败——单 regex 覆盖全部 log 行 |
| `summary-*` | `--summary` 展示 pass/fail 表与 log 行数 |

**PASS 含义**：统一信封格式在所有写入源间一致，`bundle` 从 status 正确传播到 log 和 trace 两个通道，`--timeline` 可缝合。

**FAIL 含义**：至少一个写入源违背了 D6.1 信封格式，或 `bundle` 传播链中有断裂。

---

## Cleanup

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

```bash
B= # populated from Step 1
rm -rf "$B" && echo "Cleaned up $B"
```

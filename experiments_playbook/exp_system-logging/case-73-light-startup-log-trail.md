---
schema: command-experiment/v1
experiment: system-logging
case: case-73-light-startup-log-trail
weight: light
case_goal: "验证 production instantiate-run-bundle → gate chain（instantiation-complete, setup-ready, seed-topics-ready）→ Agent phase log 的完整启动链路日志。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_rb_log_startup
trace: dpt_rb_log_startup/_logs/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 production `dpt_rb_*` bundle 中执行；不启动 subagent。实验结果必须来自实际文件写入、CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-73-light-startup-log-trail

验证从 `instantiate-run-bundle` 创建到 HITL1 前三个 gate（instantiation-complete, setup-ready, seed-topics-ready）加 Agent phase log 的完整启动链路：`run_start` → gate_attempt × 3 → phase START/END。

## Expected Runtime Path

1. `instantiate-run-bundle` 创建 production bundle `[MAIN/SHELL]`
2. 写 minimal `rb_plan.md` `[MAIN/SHELL]`
3. 跑 instantiation-complete gate `[MAIN/SHELL]`
4. 跑 setup-ready gate `[MAIN/SHELL]`
5. 跑 seed-topics-ready gate `[MAIN/SHELL]`
6. Agent 通过 `log-event.mjs` 写 phase 日志 `[MAIN/SHELL]`
7. `inspect-bundle --log` + `--timeline` 验证 `[MAIN/SHELL]`
8. 从 trace 裁决 `[MAIN/SHELL]`

---

## Step 1: 创建 production bundle

```bash
B=$(node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs log_startup 2>&1 | tail -1)
echo "B=$B"

# 写 minimal plan
cat > "$B/rb_plan.md" << 'EOF'
---
plan_basename: log_startup
research_question: "system-logging experiment — startup log trail"
status: draft
created: 2026-06-26
---

# Research Plan

## Goal

Verify startup log trail from instantiation to pre-HITL1.

## Progress
- [ ] instantiation-complete
- [ ] setup-ready
- [ ] seed-topics-ready
EOF

# 验证 bundle 创建后的 log + trace
echo "=== _logs/run.log after bundle creation ==="
cat "$B/_logs/run.log"
```

→ 预期：`_logs/run.log` 含 `run_start`，`rb_trace.jsonl` 含 `run_start`。

---

## Step 2: 跑 instantiation-complete gate

```bash
B= # populated from Step 1

node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs \
  --bundle "$B" --current-node "phases/phase-instantiation.md" 2>&1 || true

echo "gate instantiation-complete: done"
```

→ 预期：gate 输出 JSON，log 含 `gate_attempt` + `instantiation-complete`。

---

## Step 3: 跑 setup-ready gate

```bash
B= # populated from Step 1

node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs \
  --bundle "$B" --current-node "phases/phase-setup.md" 2>&1 || true

echo "gate setup-ready: done"
```

→ 预期：gate FAIL（bundle 不完整），log 含 WARN `gate_attempt`。Boundary：expected=false。

---

## Step 4: 跑 seed-topics-ready gate

```bash
B= # populated from Step 1

node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs \
  --bundle "$B" --current-node "phases/phase-seed-topics.md" 2>&1 || true

echo "gate seed-topics-ready: done"
```

→ 预期：gate FAIL（seed_topics/ 为空），log 含 WARN `gate_attempt`。Boundary：expected=false。

---

## Step 5: Agent 写 phase 日志

```bash
B= # populated from Step 1

# 模拟 Phase Agent 按照 phase node ## Log 段写日志
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:instantiation START"
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:instantiation END — gate PASS"
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:setup START"
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:setup END — gate FAIL"
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:seed-topics START"
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --level info --msg "phase:seed-topics END — gate FAIL"

echo "Agent phase logs: done"
```

→ 预期：6 条 phase 日志写入 `_logs/run.log`。

---

## Step 6: 验证 log + timeline

```bash
B= # populated from Step 1

echo "=== _logs/run.log ==="
cat "$B/_logs/run.log"

echo ""
echo "=== --timeline ==="
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B" --timeline 2>&1

echo ""
echo "=== --summary ==="
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B" --summary 2>&1
```

→ 预期：timeline 缝合 `[trace]` + `[log]`，按 ts 排序。Summary 显示 pass/fail 表 + log 行数。

---

## Step 7: 验证 + 裁决

```bash
B= # populated from Step 1

cat > "$B/_verdict.mjs" << 'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const log = readFileSync(join(process.argv[2], '_logs', 'run.log'), 'utf-8');
const trace = readFileSync(join(process.argv[2], 'rb_trace.jsonl'), 'utf-8');
const status = JSON.parse(readFileSync(join(process.argv[2], 'rb_status.json'), 'utf-8'));

const logLines = log.trim().split('\n').filter(Boolean);
const traceEvents = trace.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

// Envelope check
const envelopeRe = /^\[([^\]]+)\] (DEBUG|INFO|WARN|ERROR) .+ bundle=(\S+)( \{.*\})?$/;
const allEnvelope = logLines.every(l => envelopeRe.test(l));
const expectedBundle = status.bundle;
const allBundleMatch = logLines.every(l => {
  const m = l.match(envelopeRe);
  return m && m[3] === expectedBundle;
});

// Event presence
const hasRunStart = log.includes('run_start');
const hasGateAttempt = traceEvents.filter(e => e.event === 'gate_attempt');
const gateCount = hasGateAttempt.length;
const allGateHaveBundle = hasGateAttempt.every(e => e.bundle === expectedBundle);
const hasInstantiation = log.includes('instantiation-complete');
const hasSetup = log.includes('setup-ready');
const hasSeedTopics = log.includes('seed-topics-ready');
const hasPhaseLog = log.includes('phase:instantiation START') && log.includes('phase:setup START') && log.includes('phase:seed-topics START');

// Timeline
const { execSync } = await import('node:child_process');
const tl = execSync(`node DPT_FRAMEWORK/cli/inspect-bundle.mjs "${process.argv[2]}" --timeline`, { encoding: 'utf-8' });
const hasTraceInTl = tl.includes('[trace]');
const hasLogInTl = tl.includes('[log]');
const noUnparsed = !tl.includes('[unparsed]');

const checks = [
  { event: 'check', gate: 'run-start-log', passed: hasRunStart, expected: true, detail: 'run_start in log' },
  { event: 'check', gate: 'run-start-trace', passed: traceEvents.some(e => e.event === 'run_start'), expected: true, detail: 'run_start in trace' },
  { event: 'check', gate: 'envelope-format', passed: allEnvelope, expected: true, detail: `All ${logLines.length} log lines match D6.1 envelope` },
  { event: 'check', gate: 'bundle-consistent', passed: allBundleMatch, expected: true, detail: `All lines bundle=${expectedBundle}` },
  { event: 'check', gate: 'gate-count', passed: gateCount >= 3, expected: true, detail: `${gateCount} gate_attempt events (≥3)` },
  { event: 'check', gate: 'gate-trace-bundle', passed: allGateHaveBundle, expected: true, detail: 'All gate_attempt entries have bundle field' },
  { event: 'check', gate: 'gate-log-coverage', passed: hasInstantiation && hasSetup && hasSeedTopics, expected: true, detail: 'All 3 gates appear in log' },
  { event: 'check', gate: 'agent-phase-log', passed: hasPhaseLog, expected: true, detail: 'Agent phase START/END for all 3 phases' },
  { event: 'check', gate: 'timeline-stitch', passed: hasTraceInTl && hasLogInTl, expected: true, detail: 'timeline stitches [trace] + [log]' },
  { event: 'check', gate: 'timeline-clean', passed: noUnparsed, expected: true, detail: 'no unparsed entries' },
];

// Write checks
const tpath = join(process.argv[2], '_logs', '_trace.jsonl');
for (const c of checks) {
  writeFileSync(tpath, JSON.stringify({ ts: new Date().toISOString(), ...c }) + '\n', { flag: 'a' });
}

// Verdict
const failed = checks.filter(c => c.passed !== (c.expected !== undefined ? c.expected : true));
const passed = checks.filter(c => c.passed === (c.expected !== undefined ? c.expected : true));

console.log('══════ Verdict ══════');
for (const c of checks) console.log(`  ${c.passed === (c.expected !== undefined ? c.expected : true) ? 'PASS' : 'FAIL'}  ${c.gate}: ${c.detail}`);
console.log('══════════════════════');
console.log(`PASS: ${passed.length}  FAIL: ${failed.length}`);
if (failed.length > 0) { console.log('\nFAIL'); process.exit(1); }
console.log('\nPASS — startup log trail complete: run_start → 3 gates → Agent phase log');
JS
node "$B/_verdict.mjs" "$B"
```

→ 预期：PASS，所有 check 通过。

---

## Step 8: 结果解读

| Check | 证明 |
|-------|------|
| `run-start-log` / `run-start-trace` | `instantiate-run-bundle` 触发 `traceInit` + `logToRun` |
| `envelope-format` | 所有来源（`logToRun`, `writeGateAttempt`, `log-event.mjs`）产统一信封 |
| `bundle-consistent` | `bundle` 从 `rb_status.json` 传播到所有 log 行 |
| `gate-count` / `gate-trace-bundle` | 3 个 gate 均写入 `rb_trace.jsonl` 且含 `bundle` |
| `gate-log-coverage` | 3 个 gate 均写入 `_logs/run.log` |
| `agent-phase-log` | Agent 通过 `log-event.mjs` 写 phase START/END |
| `timeline-stitch` | `--timeline` 缝合 `[trace]` + `[log]` 按 ts 排序 |
| `timeline-clean` | 单 regex 全解析，零 `[unparsed]` |

**PASS 含义**：从 `instantiate-run-bundle` 到 HITL1 前的完整启动链路，log + trace 双通道完整、格式统一、可缝合。

---

## Cleanup

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

```bash
B= # populated from Step 1
rm -rf "$B" && echo "Cleaned up $B"
```

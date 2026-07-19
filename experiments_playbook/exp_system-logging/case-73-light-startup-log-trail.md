---
schema: command-experiment/v2
experiment: system-logging
case: case-73-light-startup-log-trail
case_goal: "验证 production instantiate-run-bundle → gate chain（instantiation-complete, setup-ready, seed-topics-ready）→ Agent phase log 的完整启动链路日志。"
verdict_mode: all
required_checks: [agent-phase-log, bundle-consistent, envelope-format, gate-count, gate-log-coverage, gate-trace-bundle, run-start-log, run-start-trace, timeline-clean, timeline-stitch]
bundle_roles: [verdict, production-subject]
verdict_role: verdict
health_roles: [verdict, production-subject]
health_profile: standard
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

The Playbook Agent creates one disposable verdict bundle and invokes the real production instantiator for one contained production-shaped subject bundle. Required case checks live only in the disposable verdict trace. Both bundles are case-owned experiment state under one run root; this proves the instantiator/logging contract, not a separately selected live production run.

# case-73-light-startup-log-trail

验证从 `instantiate-run-bundle` 创建到 HITL1 前三个 gate（instantiation-complete, setup-ready, seed-topics-ready）加 Agent phase log 的完整启动链路：`run_start` → gate_attempt × 3 → phase START/END。

## Expected Runtime Path

1. 创建 disposable verdict bundle，并用 `instantiate-run-bundle` 创建 contained production-shaped subject bundle `[MAIN/SHELL]`
2. 写 minimal `rb_plan.md` `[MAIN/SHELL]`
3. 跑 instantiation-complete gate `[MAIN/SHELL]`
4. 跑 setup-ready gate `[MAIN/SHELL]`
5. 跑 seed-topics-ready gate `[MAIN/SHELL]`
6. Agent 通过 `log-event.mjs` 写 phase 日志 `[MAIN/SHELL]`
7. `inspect-bundle --log` + `--timeline` 验证 `[MAIN/SHELL]`
8. 从 trace 裁决 `[MAIN/SHELL]`

---

## Step 1: 创建 verdict 与 production-shaped subject bundles

```bash
V=$(node experiments_env/shared/new-disposable-bundle.mjs log_startup_verdict --case case-73 --target-dir {{CASE_RUN_ROOT_SH}} --force)
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$V"
B=$(node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs log_startup --target-dir {{CASE_RUN_ROOT_SH}} 2>&1 | tail -1)
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role production-subject --path "$B"
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
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role production-subject)

node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate instantiation-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs \
  --bundle "$B" --current-node "phases/phase-instantiation.md" 2>&1 || true

echo "gate instantiation-complete: done"
```

→ 预期：gate 输出 JSON，log 含 `gate_attempt` + `instantiation-complete`。

---

## Step 3: 跑 setup-ready gate

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role production-subject)

node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate setup-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs \
  --bundle "$B" --current-node "phases/phase-setup.md" 2>&1 || true

echo "gate setup-ready: done"
```

→ 预期：gate FAIL（bundle 不完整），log 含 WARN `gate_attempt`。Boundary：expected=false。

---

## Step 4: 跑 seed-topics-ready gate

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role production-subject)

node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate seed-topics-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs \
  --bundle "$B" --current-node "phases/phase-seed-topics.md" 2>&1 || true

echo "gate seed-topics-ready: done"
```

→ 预期：gate FAIL（seed_topics/ 为空），log 含 WARN `gate_attempt`。Boundary：expected=false。

---

## Step 5: Agent 写 phase 日志

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role production-subject)

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
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role production-subject)

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

## Step 7: 验证并记录 verdict checks

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role production-subject)
V=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" "$V" <<'JS'
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
const tpath = join(process.argv[3], 'rb_trace.jsonl');
for (const c of checks) {
  writeFileSync(tpath, JSON.stringify({ ts: new Date().toISOString(), source: 'playbook', ...c }) + '\n', { flag: 'a' });
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

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role production-subject)
V=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$V" --bundle "production-subject=$B"
```

Stop after native completion. The Supervisor runs Standard health on both declared bundles and owns durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.

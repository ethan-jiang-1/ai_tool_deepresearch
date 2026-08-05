---
schema: command-experiment/v2
experiment: reentry-debuggability
case: case-307-light-clean-reentry
case_goal: "验证 clean reentry: check-reentry --at wave1_complete 在有效 disposable bundle 上返回 exit 0、stable JSON contract、normalized_target 正确。"
verdict_mode: all
required_checks: [check-passed, exit-code, json-contract, no-blockers, normalized-gate-key, normalized-phase-key, normalized-target-kind, target-node-ref, target-phase-key, target-phase-name, target-underscore, target-unknown-exit]
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

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。实验结果必须来自实际 CLI 调用和文件检查；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-307-light-clean-reentry

验证 `check-reentry --at wave1_complete` 在干净的 wave1 完成状态下返回 exit 0、`check.passed: true`、正确的 `normalized_target`。

## Expected Runtime Path

1. 创建 disposable bundle，写入 wave1 完成所需的最小文件 `[MAIN/SHELL]`
2. 跑 `check-reentry --bundle <B> --at wave1_complete` `[MAIN/SHELL]`
3. 验证 JSON contract 字段完整 `[MAIN/SHELL]`
4. 验证 `normalized_target` 正确 `[MAIN/SHELL]`
5. 从 trace 裁决 `[MAIN/SHELL]`
6. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 disposable runtime context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs reentry_clean --case case-307 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"

# 写 rb_status.json — wave1 完成状态
cat > "$B/rb_status.json" << 'JSON'
{"bundle":"reentry_clean","current_mode":"execution","state":"in_progress","current_gate":"wave1_complete","next_gate":"wave2_complete"}
JSON

# 写 rb_plan.md — 含 topic_registry
cat > "$B/rb_plan.md" << 'MD'
---
topic_registry:
  - id: T01
    slug: topic-a
    title: Topic A
  - id: T02
    slug: topic-b
    title: Topic B
---
# Plan
MD

# 写 rb_queue.json — queue.v2 空队列
cat > "$B/rb_queue.json" << 'JSON'
{
  "schema_version": "queue.v2",
  "bundle_name": null,
  "queue_health": "ready",
  "stop_authorization_state": "unauthorized_continue_required",
  "active_window": [],
  "refill_pool": [],
  "delegated_in_flight": {},
  "terminal_history": []
}
JSON

# 写 rb_profile.yaml
echo "research_style: quick_factual" > "$B/rb_profile.yaml"

# 写空 trace/log
touch "$B/rb_trace.jsonl"
mkdir -p "$B/_logs"
touch "$B/_logs/run.log"

# 创建 wave1 所需 artifact
mkdir -p "$B/seed_topics" "$B/reference" "$B/artifacts/wave0/topic-a" "$B/artifacts/wave0/topic-b" "$B/artifacts/wave1/topic-a" "$B/artifacts/wave1/topic-b"
echo "# Topic A" > "$B/seed_topics/topic-a.md"
echo "# Topic B" > "$B/seed_topics/topic-b.md"
echo "[]" > "$B/artifacts/wave0/topic-a/source.yaml"
echo "[]" > "$B/artifacts/wave0/topic-b/source.yaml"
echo "# Evidence Summary A" > "$B/artifacts/wave1/topic-a/evidence-summary.md"
echo "# Question List A" > "$B/artifacts/wave1/topic-a/question-list.md"
echo "# Evidence Summary B" > "$B/artifacts/wave1/topic-b/evidence-summary.md"
echo "# Question List B" > "$B/artifacts/wave1/topic-b/question-list.md"

# 验证 bundle 结构
node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs "$B" || true

echo "B=$B"
```

→ 预期：bundle 创建成功，inspect-bundle 输出目录结构。

---

## Step 2: 跑 check-reentry CLI

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
RESULT=$(node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle "$B" --at wave1_complete)
EXIT=$?

echo "Exit code: $EXIT"
echo "$RESULT" | head -30

# 写入 trace 供裁决
node --input-type=module - "$B" "$RESULT" "$EXIT" <<'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const __dirname = process.argv[2];
const result = JSON.parse(process.argv[3]);
const exitCode = parseInt(process.argv[4]);

const checks = [];

// Check 1: exit code 0
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'exit-code', passed: exitCode === 0, expected: true,
  detail: `Exit code: ${exitCode} (expected 0)`
});

// Check 2: check.passed === true
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'check-passed', passed: result.check?.passed === true, expected: true,
  detail: `check.passed: ${result.check?.passed}`
});

// Check 3: normalized_target correct
const target = result.normalized_target;
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'normalized-target-kind', passed: target?.kind === 'gate', expected: true,
  detail: `target.kind: ${target?.kind}`
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'normalized-gate-key', passed: target?.gate_key === 'wave1-complete', expected: true,
  detail: `gate_key: ${target?.gate_key}`
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'normalized-phase-key', passed: target?.phase_key === 'wave1', expected: true,
  detail: `phase_key: ${target?.phase_key}`
});

// Check 4: no blockers
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'no-blockers', passed: (result.blockers || []).length === 0, expected: true,
  detail: `blockers: ${(result.blockers || []).length}`
});

// Check 5: JSON contract fields present
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'json-contract', passed: result.schema_version === '1.1.0' &&
    'check' in result && 'blockers' in result && 'warnings' in result &&
    'drift' in result && 'findings' in result && 'inspect' in result && 'advice' in result &&
    Array.isArray(result.recovery?.canonical_topic_findings) && Array.isArray(result.recovery?.root_findings),
  expected: true,
  detail: 'All required JSON contract fields present'
});

const tracePath = join(__dirname, 'rb_trace.jsonl');
for (const c of checks) {
  writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
}
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));
JS
```

→ 预期：exit 0，`check.passed: true`，`normalized_target.kind: "gate"`，`gate_key: "wave1-complete"`，0 blockers。

---

## Step 3: 验证 target normalization 多种形式

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
# 测试三种 target 写法
for TARGET in "wave1_complete" "phase-wave1" "wave1"; do
  RESULT=$(node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle "$B" --at "$TARGET")
  EXIT=$?
  echo "--- $TARGET (exit=$EXIT) ---"
  echo "$RESULT" | grep -E '"input"|"kind"|"phase_key"'
done

# 测试 unknown target
RESULT=$(node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle "$B" --at "nonexistent" 2>&1)
EXIT=$?
echo "--- nonexistent (exit=$EXIT) ---"

node --input-type=module - "$B" <<'JS'
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];

const checks = [];

// Test underscore form
const r1 = JSON.parse(execSync(`node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle "${__dirname}" --at wave1_complete`, { encoding: 'utf-8' }));
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'target-underscore', passed: r1.normalized_target?.status_gate === 'wave1_complete',
  expected: true, detail: 'wave1_complete → normalized correctly'
});

// Test phase-name form
const r2 = JSON.parse(execSync(`node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle "${__dirname}" --at phase-wave1`, { encoding: 'utf-8' }));
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'target-phase-name', passed: r2.normalized_target?.phase_key === 'wave1',
  expected: true, detail: 'phase-wave1 → normalized correctly'
});

// Test phase key form
const r3 = JSON.parse(execSync(`node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle "${__dirname}" --at wave1`, { encoding: 'utf-8' }));
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'target-phase-key', passed: r3.normalized_target?.phase_key === 'wave1',
  expected: true, detail: 'wave1 → normalized correctly'
});

// Test node ref form
const r4 = JSON.parse(execSync(`node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle "${__dirname}" --at phases/phase-wave1.md`, { encoding: 'utf-8' }));
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'target-node-ref', passed: r4.normalized_target?.node_ref === 'phases/phase-wave1.md',
  expected: true, detail: 'phases/phase-wave1.md → normalized correctly'
});

// Test unknown target → exit 2
try {
  execSync(`node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle "${__dirname}" --at nonexistent-gate`, { encoding: 'utf-8' });
  checks.push({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate: 'target-unknown-exit', passed: false, expected: true, detail: 'Should exit 2' });
} catch (e) {
  checks.push({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate: 'target-unknown-exit', passed: e.status === 2, expected: true, detail: `Exit ${e.status} for unknown target` });
}

const tracePath = join(__dirname, 'rb_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));
JS
```

→ 预期：所有 target 形式正确归一化，unknown target → exit 2 + config_error。

---

## Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.

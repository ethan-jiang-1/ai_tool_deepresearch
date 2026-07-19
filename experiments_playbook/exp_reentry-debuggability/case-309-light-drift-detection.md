---
schema: command-experiment/v2
experiment: reentry-debuggability
case: case-309-light-drift-detection
case_goal: "验证 checkpoint drift 检测: 先写 checkpoint，再修改 rb_status.json，check-reentry 检测到 control file drift 并分类为 blocker。"
verdict_mode: all
required_checks: [drift-status-blocker, drift-status-found, drift-trace-info, has-blockers, wave1-complete]
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

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。

# case-309-light-drift-detection

验证 checkpoint drift：写入 checkpoint → 修改 control file → `check-reentry` 检测到 `rb_status.json` hash 变化并报告 `severity: blocker`。

## Expected Runtime Path

1. 创建 disposable bundle，跑一次 gate 产生 checkpoint `[MAIN/SHELL]`
2. 修改 `rb_status.json` `[MAIN/SHELL]`
3. 跑 `check-reentry --at wave1_complete` `[MAIN/SHELL]`
4. 验证 drift 条目含 `severity: blocker` `[MAIN/SHELL]`
5. 从 trace 裁决 `[MAIN/SHELL]`
6. 清理 `[MAIN/SHELL]`

---

## Step 1: 构建带 checkpoint 的 bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs drift --case case-309 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"

# 写 wave1 完成状态
cat > "$B/rb_status.json" << 'JSON'
{"bundle":"drift","current_mode":"execution","state":"in_progress","current_gate":"wave1_complete","next_gate":"wave2_complete"}
JSON

cat > "$B/rb_plan.md" << 'MD'
---
topic_registry:
  - id: T01
    slug: topic-a
    title: Topic A
---
# Plan
MD

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

echo "research_style: quick_factual" > "$B/rb_profile.yaml"
touch "$B/rb_trace.jsonl"
mkdir -p "$B/_logs" && touch "$B/_logs/run.log"
mkdir -p "$B/seed_topics" "$B/reference" "$B/artifacts/wave1/topic-a"
echo "# Topic A" > "$B/seed_topics/topic-a.md"
echo "# Evidence A" > "$B/artifacts/wave1/topic-a/evidence-summary.md"
echo "# Questions A" > "$B/artifacts/wave1/topic-a/question-list.md"

# 直接用 writeCheckpointManifest 写一个 checkpoint
node --input-type=module - "$B" <<'JS'
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeCheckpointManifest, buildGateResult } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

const result = buildGateResult({
  passed: true,
  gate: 'wave1-complete',
  currentNodeRef: 'phases/phase-wave1.md',
  routing: { kind: 'next', next: 'phases/phase-wave2.md' },
  inspect: [],
  advice: [],
});

writeCheckpointManifest(process.argv[2], result);
appendFileSync(join(process.argv[2], 'rb_trace.jsonl'), `${JSON.stringify({
  ts: new Date().toISOString(), event: 'check', source: 'playbook', gate: 'wave1-complete',
  passed: result.check?.passed === true, expected: true,
})}\n`);
console.log('Checkpoint written');
JS

echo "B=$B"
ls "$B/_checkpoints/"
```

→ 预期：`_checkpoints/` 含一个 checkpoint JSON。

---

## Step 2: 修改 control file 并检测 drift

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
# 修改 rb_status.json — change current_gate
cat > "$B/rb_status.json" << 'JSON'
{"bundle":"drift","current_mode":"execution","state":"blocked","current_gate":"wave2_complete","next_gate":"hitl2_recorded"}
JSON

# 也追加一行 trace（cursor drift 应该是 info）
echo '{"ts":"2026-06-01T00:00:00.000Z","event":"test","detail":"post-checkpoint"}' >> "$B/rb_trace.jsonl"

RESULT=$(node DPT_FRAMEWORK/cli/check-reentry.mjs --bundle "$B" --at wave1_complete 2>&1)
EXIT=$?

echo "Exit: $EXIT"
echo "$RESULT" | grep -E '"drift"|"severity"|"path"' | head -10

node --input-type=module - "$B" "$RESULT" <<'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];
const result = JSON.parse(process.argv[3]);

const checks = [];

const drift = result.drift || [];
console.log('Drift entries:', drift.length);

// Check: rb_status.json drift is blocker
const statusDrift = drift.find(d => d.path === 'rb_status.json');
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'drift-status-found', passed: !!statusDrift, expected: true,
  detail: `rb_status.json drift found: ${!!statusDrift}`
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'drift-status-blocker', passed: statusDrift?.severity === 'blocker', expected: true,
  detail: `rb_status.json drift severity: ${statusDrift?.severity}`
});

// Check: trace cursor drift is info
const traceDrift = drift.find(d => d.path === 'trace_lines');
if (traceDrift) {
  checks.push({
    ts: new Date().toISOString(), event: 'check',
    source: 'playbook',
    gate: 'drift-trace-info', passed: traceDrift.severity === 'info', expected: true,
    detail: `trace_lines drift severity: ${traceDrift.severity}`
  });
}

// Check: blockers exist due to drift + status mismatch
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'has-blockers', passed: (result.blockers || []).length > 0, expected: true,
  detail: `blockers: ${(result.blockers || []).length}`
});

const tracePath = join(__dirname, 'rb_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));
JS
```

→ 预期：drift 条目 `rb_status.json` severity=blocker，`trace_lines` severity=info。

---

## Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.

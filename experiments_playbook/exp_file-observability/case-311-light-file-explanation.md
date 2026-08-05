---
schema: command-experiment/v2
experiment: file-observability
case: case-311-light-file-explanation
case_goal: "验证 file explanation: Agent 通过 log-event.mjs --explain-file 记录解释后，文件分类为 explained_non_authoritative 而非 orphan，但仍不参与 gate pass。"
verdict_mode: all
required_checks: [after-explain-explained, before-explain-orphan, explained-non-authoritative, explanation-phase, explanation-status, reject-declared-authoritative, trace-has-explanation]
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

# case-311-light-file-explanation

验证 `log-event.mjs --explain-file` 写入 trace 后，`auditFileObservability` 将文件分类为 `explained_non_authoritative`（非 orphan），且文件仍是 non-authoritative。

## Expected Runtime Path

1. 创建 disposable bundle，含未声明的 reference 文件 `[MAIN/SHELL]`
2. 先验证未解释时分类为 orphan `[MAIN/SHELL]`
3. 通过 `log-event.mjs --explain-file` 记录解释 `[MAIN/SHELL]`
4. 验证解释后分类变为 `explained_non_authoritative` `[MAIN/SHELL]`
5. 验证 trace 含 `file_explanation` 事件 `[MAIN/SHELL]`
6. 从 trace 裁决 `[MAIN/SHELL]`
7. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs explain --case case-311 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"

cat > "$B/rb_status.json" << 'JSON'
{"bundle":"explain","current_mode":"execution","state":"in_progress","current_gate":"wave1_complete","next_gate":"wave2_complete"}
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
mkdir -p "$B/seed_topics" "$B/reference"
echo "# Topic A" > "$B/seed_topics/topic-a.md"

# 未声明的文件
mkdir -p "$B/reference"
echo "# Extra file — Agent knows about it but it was not produced through work-unit submit" > "$B/reference/topic-a-extra.md"

echo "B=$B"
```

---

## Step 2: 验证未解释 → orphan

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { auditFileObservability } from './DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];

const result = auditFileObservability(__dirname, {
  topicSlugs: ['topic-a'],
  ledgerDeclarations: [],
  targetPhase: 'wave1',
});

const f = result.findings.find(x => x.path === 'reference/topic-a-extra.md');
const checks = [];
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'before-explain-orphan',
  passed: f?.classification === 'orphan_authority_blocking',
  expected: true,
  detail: `Before explanation: ${f?.classification}`
});

const tracePath = join(__dirname, 'rb_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify({ classification: f?.classification, severity: f?.severity }));
JS
```

→ 预期：分类为 `orphan_authority_blocking`。

---

## Step 3: 记录解释并验证分类变化

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
# Agent 通过 log-event.mjs 记录解释
node DEEP_RESEARCH_HARNESS/cli/log-event.mjs \
  --bundle "$B" \
  --explain-file "reference/topic-a-extra.md" \
  --status "explained_non_authoritative" \
  --reason "Agent created this file during manual inspection — it was not produced through work-unit submit" \
  --phase "wave1" \
  --topic-slug "topic-a"

echo "Explanation recorded"

# 验证 trace 含 file_explanation
node --input-type=module - "$B" <<'JS'
import { auditFileObservability } from './DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];

const checks = [];

// Check 1: trace contains file_explanation event
const tracePath = join(__dirname, 'rb_trace.jsonl');
const trace = readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean);
const explanations = trace.filter(l => {
  try { return JSON.parse(l).kind === 'file_explanation'; } catch { return false; }
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'trace-has-explanation', passed: explanations.length >= 1, expected: true,
  detail: `file_explanation events in trace: ${explanations.length}`
});

// Check 2: latest explanation has correct fields
const last = JSON.parse(explanations[explanations.length - 1]);
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'explanation-status', passed: last.authority_status === 'explained_non_authoritative',
  expected: true,
  detail: `authority_status: ${last.authority_status}`
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'explanation-phase', passed: last.phase === 'wave1',
  expected: true,
  detail: `phase: ${last.phase}`
});

// Check 3: file now classified as explained_non_authoritative
const result = auditFileObservability(__dirname, {
  topicSlugs: ['topic-a'],
  ledgerDeclarations: [],
  targetPhase: 'wave1',
});
const f = result.findings.find(x => x.path === 'reference/topic-a-extra.md');
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'after-explain-explained', passed: f?.classification === 'explained_non_authoritative',
  expected: true,
  detail: `After explanation: ${f?.classification}`
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'explained-non-authoritative', passed: f?.authority_status === 'explained_non_authoritative',
  expected: true,
  detail: `authority_status stays non-authoritative: ${f?.authority_status}`
});

const expTracePath = join(__dirname, 'rb_trace.jsonl');
for (const c of checks) writeFileSync(expTracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));
JS
```

→ 预期：trace 含 `file_explanation`，分类变为 `explained_non_authoritative`，authority 保持 non-authoritative。

---

## Step 4: 验证拒绝无效 status

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
# declared_authoritative 不允许 Agent 写入（应静默拒绝）
node DEEP_RESEARCH_HARNESS/cli/log-event.mjs \
  --bundle "$B" \
  --explain-file "reference/bad.md" \
  --status "declared_authoritative" \
  --reason "Should be rejected"

node --input-type=module - "$B" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];

const tracePath = join(__dirname, 'rb_trace.jsonl');
const trace = readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean);
const hasBadExplanation = trace.some(l => {
  try { const e = JSON.parse(l); return e.kind === 'file_explanation' && e.authority_status === 'declared_authoritative'; }
  catch { return false; }
});

const checks = [{
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'reject-declared-authoritative', passed: !hasBadExplanation, expected: true,
  detail: `declared_authoritative rejected: ${!hasBadExplanation}`
}];

const expTracePath = join(__dirname, 'rb_trace.jsonl');
for (const c of checks) writeFileSync(expTracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify({ rejected: !hasBadExplanation }));
JS
```

→ 预期：`declared_authoritative` 被静默拒绝，trace 中无此事件。

---

## Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.

---
schema: command-experiment/v2
experiment: file-observability
case: case-312-light-wave2-action-add
case_goal: "验证 Wave2 action:add gate 规则: delta-only synthesis 失败，完整 pair-scan coverage 清除 rerun_add failure。"
verdict_mode: all
required_checks: [delta-message, delta-synthesis-fails, full-coverage-less-issues]
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

# case-312-light-wave2-action-add

验证 `check-gate-wave2-complete` 的 `rerun_add_full_synthesis` 规则：action:add 场景下，delta-only synthesis 必须失败，完整 pair-scan coverage 才能清除 rerun_add failure。

## Expected Runtime Path

1. 创建 disposable bundle，seed topic 含 `action: add`，wave2 artifact 使用 Delta Synthesis `[MAIN/SHELL]`
2. 跑 wave2 gate → FAIL (delta-only) `[MAIN/SHELL]`
3. 改为 full synthesis + current finding-index pair-scan contract → rerun_add 规则通过 `[MAIN/SHELL]`
4. 从 trace 裁决 `[MAIN/SHELL]`
5. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 action:add 场景

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wave2_add --case case-312 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"

cat > "$B/rb_status.json" << 'JSON'
{"bundle":"wave2_add","current_mode":"execution","state":"in_progress","current_gate":"wave1_complete","next_gate":"wave2_complete","current_node":"phases/phase-wave2.md"}
JSON

cat > "$B/rb_plan.md" << 'MD'
---
topic_registry:
  - id: T01
    slug: topic-a
    title: Topic A
  - id: T02
    slug: topic-b
    title: Topic B (added in rerun)
---
# Plan
MD

cat > "$B/rb_profile.yaml" << 'YAML'
research_style: quick_factual
research_style_params:
  p0p1_independent_backing: 2
YAML

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

cat > "$B/rb_trace.jsonl" << 'JSONL'
{"ts":"2026-01-01T00:00:00.000Z","event":"gate_attempt","gate":"wave1-complete","phase":"wave1","passed":true,"currentNodeRef":"phases/phase-wave1.md","next":"phases/phase-wave2.md"}
{"ts":"2026-01-01T00:00:01.000Z","event":"load_complete","entry":"phases/phase-wave2.md","handoff_source_gate":"wave1-complete","handoff_source_node":"phases/phase-wave1.md","handoff_target_node":"phases/phase-wave2.md","handoff_source_attempt_index":0}
{"ts":"2026-01-01T00:00:02.000Z","event":"wave2_completion"}
JSONL
mkdir -p "$B/_logs" && touch "$B/_logs/run.log"
mkdir -p "$B/seed_topics" "$B/reference" "$B/artifacts/wave2"

# seed topic topic-a（无 action:add）
cat > "$B/seed_topics/topic-a.md" << 'MD'
# Topic A
## 本轮重跑方向
无变更
MD

# seed topic topic-b（含 action: add）
cat > "$B/seed_topics/topic-b.md" << 'MD'
# Topic B — new topic added in rerun
## 本轮重跑方向
action: add
reason: 需要补充 B 领域的 cross-topic 分析
MD

echo "B=$B"
```

---

## Step 2: Delta Synthesis → FAIL

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
# 写 Delta Synthesis（action:add 场景不允许）
cat > "$B/artifacts/wave2/synthesis.md" << 'MD'
# Cross-Topic Synthesis

## Delta Synthesis (Rerun 1)
This is a delta-only synthesis for rerun — should fail for action:add.
MD

# 写 ledger（含 topic-b 但没有 pair-scan matrix）
cat > "$B/artifacts/wave2/cross-topic-ledger.md" << 'MD'
# Cross-Topic Ledger

## Cross-Topic Scan Matrix
| pair_id | topics | checked_dimensions | finding_ids | notes |
| P01 | topic-a + topic-b | shared_pattern, contradiction, resolution_opportunity, emergent_question | W2F-001 | Full rerun add scan |

## Wave1 Legacy Questions
W2F-001 covers topic-a and topic-b.

## Cross-Topic Resolutions
(none)

## Emergent Cross-Topic Questions
(none)

## Exploration Decisions
(none)

## HITL2 Handoff
(none)
MD

echo "findings: []" > "$B/artifacts/wave2/finding-index.yaml"

# 跑 wave2 gate
RESULT1=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md 2>&1)
EXIT1=$?
echo "Delta Synthesis result (exit=$EXIT1):"
echo "$RESULT1" | grep -E '"passed"|"rerun_add"|"Delta"' | head -5

node --input-type=module - "$B" <<'JS'
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];

const checks = [];
function runWave2Gate() {
  const result = spawnSync('node', [
    'DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs',
    '--bundle', __dirname,
    '--current-node', 'phases/phase-wave2.md',
  ], { encoding: 'utf-8', cwd: process.cwd() });
  if (!result.stdout.trim()) {
    throw new Error(`gate produced no stdout; stderr=${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

// Test 1: Delta Synthesis should fail
const r1 = runWave2Gate();
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'delta-synthesis-fails', passed: r1.check?.passed === false, expected: true,
  detail: `Delta synthesis gate: ${r1.check?.passed}`
});

const hasDeltaFail = (r1.inspect || []).some(i => /Delta/.test(i));
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'delta-message', passed: hasDeltaFail, expected: true,
  detail: `Delta Synthesis rejection message: ${hasDeltaFail}`
});

// Test 2: Write the current full pair-scan finding-index contract.
writeFileSync(join(__dirname, 'artifacts/wave2/finding-index.yaml'),
  `version: "0.1"\nsource_layer: wave2_cross_topic\nledger: artifacts/wave2/cross-topic-ledger.md\nsynthesis: artifacts/wave2/synthesis.md\nscan:\n  topics:\n    - topic-a\n    - topic-b\n  topic_count: 2\n  pair_count_expected: 1\n  pair_count_checked: 1\nfindings:\n  - id: W2F-001\n    type: cross_topic_resolution\n    priority: p1\n    status: resolved\n    decision: use_existing_evidence\n    affected_topics: [topic-a, topic-b]\n    origin_refs: [artifacts/wave1/topic-a/question-list.md]\n    trigger_refs: [artifacts/wave1/topic-b/evidence-summary.md]\n    search_required: false\n    subagent_receipt_refs: []\n    appears_in_synthesis: true\n    hitl2_handoff: false\n    confidence: high\n    independent_backing_refs: [artifacts/wave1/topic-a/evidence-summary.md, artifacts/wave1/topic-b/evidence-summary.md]\n    consumer_reference_omission_reason: "limitation: controlled fixture has no consumer projection"\n    gap_status: no_gap\nsynthesis_eligibility:\n  pure_synthesis_eligible: true\n  scan_matrix_present: true\n  scan_topic_pair_coverage:\n    - pair: [topic-a, topic-b]\n      refs: [artifacts/wave2/cross-topic-ledger.md]\n  unresolved_search_required_count: 0\n  targeted_search_required_count: 0\n  targeted_search_submitted_count: 0\n  explicit_deferral_count: 0\n  profile_params_read: [p0p1_independent_backing]\n  ineligibility_reasons: []\n`);
writeFileSync(join(__dirname, 'artifacts/wave2/synthesis.md'), [
  '# Cross-Topic Synthesis',
  '',
  '## Full Cross-Topic Synthesis (Rerun 1)',
  '',
  'W2F-001: Full scan integrates [Topic A](../wave1/topic-a/evidence-summary.md) and [Topic B](../wave1/topic-b/evidence-summary.md).',
  '',
].join('\n'));

// Also need wave1 evidence artifacts for link resolution
mkdirSync(join(__dirname, 'artifacts/wave1/topic-a'), { recursive: true });
mkdirSync(join(__dirname, 'artifacts/wave1/topic-b'), { recursive: true });
writeFileSync(join(__dirname, 'artifacts/wave1/topic-a/evidence-summary.md'), '# Evidence A\n');
writeFileSync(join(__dirname, 'artifacts/wave1/topic-a/question-list.md'), '# Questions A\n');
writeFileSync(join(__dirname, 'artifacts/wave1/topic-b/evidence-summary.md'), '# Evidence B\n');
writeFileSync(join(__dirname, 'artifacts/wave1/topic-b/question-list.md'), '# Questions B\n');

const r2 = runWave2Gate();
const rerunRelated = (r2.inspect || []).filter(i => /rerun|action:add|Delta Synthesis/i.test(i));
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'full-coverage-less-issues', passed: rerunRelated.length === 0, expected: true,
  detail: `Rerun-related issues after full coverage fix: ${rerunRelated.length}`
});

const tracePath = join(__dirname, 'rb_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));
JS
```

→ 预期：Delta Synthesis → FAIL；修复 Delta header + 补全 scan/index coverage → rerun_add 规则不再报错。

---

## Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.

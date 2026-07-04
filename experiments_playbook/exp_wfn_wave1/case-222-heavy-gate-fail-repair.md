---
schema: command-experiment/v1
experiment: wfn-wave1
case: case-222-heavy-gate-fail-repair
weight: heavy
case_goal: "验证 wave1 gate 检测缺失 evidence-summary → inspect 指出缺失 topic → repair → gate pass → trace 含 2 条 gate_attempt（1 fail + 1 pass）"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-222_agql_w1_fail_
trace: dpt_disp_case-222_agql_w1_fail_*/rb_trace.jsonl
verdict: trace-jsonl
req: WAI-006
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。Scenario A（gate fail）使用部分 fixture 数据制造缺失 gap；Scenario B（repair）在同一 bundle 上继续，验证连续 trace。所有产出来自实际 CLI 调用和 gate 输出。禁止 mock 返回、手写假 trace。

# case-222-heavy-gate-fail-repair

两个连续场景：gate fail（某 topic 缺 evidence-summary）→ inspect 定位 → repair → re-gate pass。

## Expected Runtime Path

1. Scenario A: 创建 bundle + 制造 gap (缺 evidence-summary + stale tokens) → gate fail [MAIN/SHELL]
2. Scenario B: Queue-driven repair → sub-agent 写入 evidence-summary → backfill → rerun gate → pass [MAIN→SUBAGENT]
3. Trace 验证: 2 条 gate_attempt (1 fail + 1 pass) + Cleanup

## Scenario A: Gate Fail — 检测缺失 evidence-summary

### Step A1: 创建 bundle + 制造 gap

```bash
REPO_ROOT=$(pwd)
B2=$(node experiments_env/shared/new-disposable-bundle.mjs agql_w1_fail --case case-222 --force)
echo "Bundle: $B2"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B2

# 2 topics: topic-x（有 evidence-summary）, topic-y（故意缺 evidence-summary）
cat > $B2/rb_plan.md << 'PLANEOF'
---
{
  "plan_basename": "agql_w1_fail",
  "derived_topic_count": 2,
  "topic_registry": [
    { "id": "tx", "slug": "topic-x", "title": "Topic X" },
    { "id": "ty", "slug": "topic-y", "title": "Topic Y" }
  ]
}
---
# Research Plan: Wave1 Gate Fail + Repair
PLANEOF

cat > $B2/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave1_complete",
  "next_gate": "wave2_complete"
}
EOF

cat > $B2/rb_profile.yaml << 'PROFEOF'
root_must_answer_set: ["验证 wave1 gate fail 检测 + repair 闭环"]
research_profile: quick_factual
human_decision_checkpoints:
  hitl1: { status: recorded }
  hitl2: { status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started }
PROFEOF

mkdir -p $B2/artifacts/wave1/topic-x $B2/artifacts/wave1/topic-y
mkdir -p $B2/artifacts/wave0/topic-x $B2/artifacts/wave0/topic-y
mkdir -p $B2/seed_topics

# topic-x: complete — has reference + evidence-summary
cat > $B2/artifacts/wave0/topic-x/source.yaml << 'REFEOF'
- url: "https://example.com/topic-x-ref"
  title: "Topic X Reference"
  retrieved_date: "2026-06-23"
  topic_tag: "topic-x"
REFEOF

cat > $B2/artifacts/wave1/topic-x/evidence-summary.md << 'EOF'
# Evidence Summary: Topic X

## Source URLs
- [Topic X Reference](https://example.com/topic-x-ref) — retrieved 2026-06-23

## Key Findings
1. **机制理解**: Topic X 的关键发现来自真实搜索。

## Open Questions
1. [部分解答] Topic X 的后续研究方向？
EOF

cat > $B2/artifacts/wave1/topic-x/question-list.md << 'QLISTEOF'
# Topic X Question List

## Topic Investigation Targets
| target_id | question | origin | status | backing_refs | next_action |
| tx-q1 | Topic X 后续研究方向 | must_answer | [部分解答] | evidence-summary | deepen |

## Question Reconciliation
- tx-q1: [部分解答] — 已有初步发现，需进一步验证

## Emergent Question Protocol
- new_concept: not_triggered
- contradiction: not_triggered
- missing_information_gap: not_triggered
- noise_pattern: not_triggered

## Exploration / Exploitation Decision
- decision: continue
- unresolved_questions: [tx-q1]
QLISTEOF

cat > $B2/seed_topics/topic-x.md << 'SEEDEOF'
---
id: "tx"
slug: "topic-x"
title: "Topic X"
---

## 本轮新增机制理解
1. Topic X mechanism finding from evidence-summary.

## 本轮新增趋势与难点
- Trend observed during deepening.

## 待验证问题
1. [部分解答] Next research steps?
SEEDEOF

# topic-y: gap — source.yaml exists but NO evidence-summary
cat > $B2/artifacts/wave0/topic-y/source.yaml << 'REFEOF'
- url: "https://example.com/topic-y-ref"
  title: "Topic Y Reference"
  retrieved_date: "2026-06-23"
  topic_tag: "topic-y"
REFEOF

# No evidence-summary for topic-y — this is the intentional gap

cat > $B2/seed_topics/topic-y.md << 'SEEDEOF'
---
id: "ty"
slug: "topic-y"
title: "Topic Y"
---

## 本轮新增机制理解
__BACKFILL_WAVE1_MECHANISMS__

## 本轮新增趋势与难点
__BACKFILL_WAVE1_TRENDS__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
SEEDEOF

cat > $B2/reference/_INDEX.md << 'EOF'
# Reference Index
- topic-x: 1 reference
- topic-y: 1 reference
EOF

echo "=== Files (gap: topic-y/evidence-summary.md missing) ==="
find $B2/artifacts -type f | sort
# 预期: 只有 topic-x/evidence-summary.md
```

### Step A2: Gate — 预期 fail

```bash

# ── Machinery: per-topic reference files, ledger, subagent slots ──
# Per-topic reference files (gate: per_topic_ref_md_count_floor >= 1)
cat > "$B2/reference/topic-x-foundation.md" << 'REFEOF'
# Topic X — Foundation Reference
## Metadata
- source_url: "https://example.com/topic-x-ref"
- topic_tag: "topic-x"
- source_layer: "wave1"
- trust_tier: "primary"
- retrieved_date: "2026-06-23"
- acceptance_status: "accepted"
- related_topic: "topic-x"
- ref_file: "topic-x-foundation.md"
## Key Facts
1. Topic X mechanism finding from evidence-summary
2. Evidence extracted via dpt-evidence-extractor sub-agent
3. Source validation passes schema check
4. Question status tracked in question-list.md
5. Backfill tokens replaced in seed_topics/topic-x.md
REFEOF

cat > "$B2/reference/topic-y-foundation.md" << 'REFEOF'
# Topic Y — Foundation Reference
## Metadata
- source_url: "https://example.com/topic-y-ref"
- topic_tag: "topic-y"
- source_layer: "wave1"
- trust_tier: "primary"
- retrieved_date: "2026-06-23"
- acceptance_status: "accepted"
- related_topic: "topic-y"
- ref_file: "topic-y-foundation.md"
## Key Facts
1. Topic Y intentionally gapped — evidence-summary missing in Scenario A
2. Source intake completed in wave0
3. Deepening pending via repair task
4. Backfill tokens remain stale until repair
5. Question list will be written after repair completes
REFEOF

# Output declaration ledger (gate: wave1_ledger_exists + wave1_output_coverage)
mkdir -p "$B2/_subagents/wave_01/slot_00" "$B2/_subagents/wave_01/slot_01"
TS=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
cat > "$B2/rb_output_declarations.jsonl" << LEDGEREOF
{"declared_at":"$TS","work_id":"wave1-deepen-topic-x","producer_rule":"topic_deepening","slot_result_ref":"_subagents/wave_01/slot_00/result.json","runtime_receipt_ref":"_subagents/wave_01/slot_00/runtime-receipt.jsonl","output_files":[{"path":"artifacts/wave1/topic-x/evidence-summary.md","role":"evidence_summary"},{"path":"artifacts/wave1/topic-x/question-list.md","role":"question_list"},{"path":"reference/topic-x-foundation.md","role":"reference","source_url":"https://example.com/topic-x-ref"}],"cache_trails":[],"creation_reason":"Delegated: Deepen topic: Topic X"}
LEDGEREOF

# Subagent slot artifacts (gate: wave1_subagent_slots) — slot_00 for topic-x
printf '{"status":"done","updated":"%s"}\n' "$TS" > "$B2/_subagents/wave_01/slot_00/_status.json"
printf '{"slotKey":"evidence_extractor","roleAgentKey":"dpt-evidence-extractor","status":"done","summary":"Topic X deepening complete","evidenceCount":1,"references":[],"confidence":0.8,"notes":[],"output_files":[{"path":"artifacts/wave1/topic-x/evidence-summary.md","role":"evidence_summary"},{"path":"artifacts/wave1/topic-x/question-list.md","role":"question_list"},{"path":"reference/topic-x-foundation.md","role":"reference","source_url":"https://example.com/topic-x-ref"}]}\n' > "$B2/_subagents/wave_01/slot_00/result.json"
printf '{"event":"agent_runtime_started","slotKey":"evidence_extractor","roleAgentKey":"dpt-evidence-extractor","receiptNonce":"nonce-222-slot_00","ts":"%s"}\n{"event":"agent_result_ready","slotKey":"evidence_extractor","roleAgentKey":"dpt-evidence-extractor","receiptNonce":"nonce-222-slot_00","ts":"%s"}\n' "$TS" "$TS" > "$B2/_subagents/wave_01/slot_00/runtime-receipt.jsonl"

echo "=== Machinery ready (topic-y intentionally missing from ledger — will be added in repair) ==="

# Phase-agent obligation (phase-wave1.md): write wave1_completion before the wave1-complete gate
node DPT_FRAMEWORK/cli/log-event.mjs --bundle $B2 --event wave1_completion
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave1-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B2 --current-node phases/phase-wave1.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log(d.check.passed)")

echo "=== Gate passed? $PASSED (expected: false) ==="
test "$PASSED" = "false" && echo "SCENARIO A PASS: gate correctly failed" || echo "SCENARIO A FAIL"

# Inspect must identify topic-y and stale backfill tokens
echo "=== Inspect ==="
echo "$GATE_OUTPUT" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
d.inspect?.forEach(i => console.log('  -', i));
"
```

预期：
- `check.passed: false`
- inspect 包含：
  - `Missing file: artifacts/wave1/topic-y/evidence-summary.md`
  - `Stale backfill token __BACKFILL_WAVE1_MECHANISMS__ found in seed_topics/topic-y.md`

---

## Scenario B: Repair — 补做 deepening 后 gate pass

### Step B1: 为缺失 topic 执行 deepening（真实 sub-agent 搜索）

```bash
# Enqueue repair task for topic-y
cat > /tmp/wfq-wave1-topic-y.json << 'TASKEOF'
{
  "work_id": "wave1-deepen-topic-y",
  "title": "Deepen topic: Topic Y (repair)",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-evidence-extractor", "timeout_ms": 600000 } },
  "action": "对 Topic Y 做 deepening。从 seed_topics/topic-y.md 的 search_guardrails 派生搜索关键词。使用 WebSearch + WebFetch 获取深度证据。写入 artifacts/wave1/topic-y/evidence-summary.md（含 source URL、key findings、open questions）。",
  "producer_rule": "topic_deepening",
  "lineage": {"topic_slug": "topic-y", "phase": "wave1", "trigger": "repair"},
  "priority_class": "P1_state_or_gate_repair",
  "required_receipts": ["file:artifacts/wave1/topic-y/evidence-summary.md"],
  "done_condition": "evidence-summary.md 存在，含至少 1 条 source URL 和 key findings",
  "verification": {"engine": ["receipt_check"], "agent": ["url_accessible", "key_findings_non_empty"]},
  "writes_to": ["artifacts/wave1/topic-y/evidence-summary.md"],
  "status_sync": ["wave1_deepening"],
  "completion_receipt": "file:artifacts/wave1/topic-y/evidence-summary.md",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "topic-y", "topic_title": "Topic Y"}
}
TASKEOF

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B2 --task /tmp/wfq-wave1-topic-y.json

# Claim
CLAIM=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B2 --actor main-agent)
echo "$CLAIM" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('repair claim:', d.item.work_id);
console.log('delegates_required:', d.advice?.delegates_required);
"
# 预期: delegates_required=true, role_key=dpt-evidence-extractor
```

Agent 启动 `dpt-evidence-extractor` sub-agent 为 topic-y 做 deepening：
- WebSearch + WebFetch（或降级链）获取真实来源
- 写入 `artifacts/wave1/topic-y/evidence-summary.md`

```bash
# Verify repair output
echo "=== evidence-summary: topic-y ===" && cat $B2/artifacts/wave1/topic-y/evidence-summary.md

# Also write question-list.md for topic-y (gate requires 4-section question-list)
cat > $B2/artifacts/wave1/topic-y/question-list.md << 'QLISTEOF'
# Topic Y Question List

## Topic Investigation Targets
| target_id | question | origin | status | backing_refs | next_action |
| ty-q1 | Topic Y deepening question | must_answer | [仍开放] | evidence-summary | deepen |

## Question Reconciliation
- ty-q1: [仍开放] — 新生成的 deepening 问题

## Emergent Question Protocol
- new_concept: not_triggered
- contradiction: not_triggered
- missing_information_gap: not_triggered
- noise_pattern: not_triggered

## Exploration / Exploitation Decision
- decision: continue
- unresolved_questions: [ty-q1]
QLISTEOF

echo "=== question-list topic-y ===" && head -3 $B2/artifacts/wave1/topic-y/question-list.md

# Complete
cat > /tmp/wfq-result-topic-y.json << 'EOF'
{
  "work_id": "wave1-deepen-topic-y",
  "status": "done",
  "receipt": "file:artifacts/wave1/topic-y/evidence-summary.md",
  "summary": "repair deepening complete for topic-y",
  "writes": ["artifacts/wave1/topic-y/evidence-summary.md", "artifacts/wave1/topic-y/question-list.md"]
}
EOF
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B2 --result /tmp/wfq-result-topic-y.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('repair complete:', d.feedback.passed)"

# Backfill seed topic topic-y（替换 3 个 __BACKFILL_WAVE1_*__ token）
sed -i '' 's/__BACKFILL_WAVE1_MECHANISMS__/1. Topic Y mechanism from repair deepening（来源：evidence-summary Key Findings）./' $B2/seed_topics/topic-y.md
sed -i '' 's/__BACKFILL_WAVE1_TRENDS__/- Trend observed during repair deepening./' $B2/seed_topics/topic-y.md
sed -i '' 's/__BACKFILL_PENDING_QUESTIONS__/[仍开放] ty-q1: Topic Y deepening question/' $B2/seed_topics/topic-y.md

echo "=== Backfill topic-y ==="
grep -q '__BACKFILL_WAVE1_MECHANISMS__' $B2/seed_topics/topic-y.md && echo "AFTER FAIL: token not replaced" || echo "AFTER: token replaced"

# Append topic-y to output declaration ledger (previously orphaned — now covered)
TS2=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
mkdir -p "$B2/_subagents/wave_01/slot_01"
printf '{"status":"done","updated":"%s"}\n' "$TS2" > "$B2/_subagents/wave_01/slot_01/_status.json"
printf '{"slotKey":"evidence_extractor","roleAgentKey":"dpt-evidence-extractor","status":"done","summary":"Topic Y repair deepening complete","evidenceCount":1,"references":[],"confidence":0.7,"notes":[],"output_files":[{"path":"artifacts/wave1/topic-y/evidence-summary.md","role":"evidence_summary"},{"path":"artifacts/wave1/topic-y/question-list.md","role":"question_list"},{"path":"reference/topic-y-foundation.md","role":"reference","source_url":"https://example.com/topic-y-ref"}]}\n' > "$B2/_subagents/wave_01/slot_01/result.json"
printf '{"event":"agent_runtime_started","slotKey":"evidence_extractor","roleAgentKey":"dpt-evidence-extractor","receiptNonce":"nonce-222-slot_01","ts":"%s"}\n{"event":"agent_result_ready","slotKey":"evidence_extractor","roleAgentKey":"dpt-evidence-extractor","receiptNonce":"nonce-222-slot_01","ts":"%s"}\n' "$TS2" "$TS2" > "$B2/_subagents/wave_01/slot_01/runtime-receipt.jsonl"
# Append ledger line for topic-y
printf '{"declared_at":"%s","work_id":"wave1-deepen-topic-y","producer_rule":"topic_deepening","slot_result_ref":"_subagents/wave_01/slot_01/result.json","runtime_receipt_ref":"_subagents/wave_01/slot_01/runtime-receipt.jsonl","output_files":[{"path":"artifacts/wave1/topic-y/evidence-summary.md","role":"evidence_summary"},{"path":"artifacts/wave1/topic-y/question-list.md","role":"question_list"},{"path":"reference/topic-y-foundation.md","role":"reference","source_url":"https://example.com/topic-y-ref"}],"cache_trails":[],"creation_reason":"Delegated: Deepen topic: Topic Y (repair)"}\n' "$TS2" >> "$B2/rb_output_declarations.jsonl"
```

### Step B2: Rerun gate — 预期 pass

```bash
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave1-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B2 --current-node phases/phase-wave1.md)
echo "$GATE_OUTPUT" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('check.passed:', d.check.passed);
console.log('check.next:', d.check.next);
"
PASSED=$(echo "$GATE_OUTPUT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log(d.check.passed)")

echo "=== Gate passed? $PASSED (expected: true) ==="
test "$PASSED" = "true" && echo "SCENARIO B PASS: repair closed the loop" || echo "SCENARIO B FAIL"
```

预期：`check.passed: true`，`check.next: phases/phase-wave2.md`。

### Step B3: Trace 验证 — 2 条 gate_attempt

```bash
echo "=== Trace gate_attempt events ==="
grep 'gate_attempt' $B2/rb_trace.jsonl | while read line; do
  echo "$line" | node -e "process.stdin.on('data',d=>{try{const j=JSON.parse(d);console.log('  passed:',j.passed,'| inspect_count:',j.inspect_count,'| next:',j.next)}catch{console.log(d.toString().trim())}})"
done

GATE_ATTEMPTS=$(grep -c 'gate_attempt' $B2/rb_trace.jsonl)
echo "Gate attempts: $GATE_ATTEMPTS (expected: 2)"
test "$GATE_ATTEMPTS" = "2" && echo "TRACE PASS: 2 gate_attempt events (1 fail + 1 pass)" || echo "TRACE FAIL"
```

预期：第一条 `passed: false`（inspect_count > 0），第二条 `passed: true`（inspect_count: 0, next: phases/phase-wave2.md）。

---

## Final Verdict

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B2/rb_trace.jsonl','last')})"
```

预期：PASS（2 checks: 1 expected-false + 1 expected-true，都匹配）。


## 结果解读

> 验证 wave1 gate 双 defect 检测：
>   Scenario A: topic-y 缺 evidence-summary + stale tokens → gate fail (inspect 列出两项)
>   Scenario B: queue-driven repair → sub-agent 写 evidence-summary → backfill → gate pass
>   trace 含 2 条 gate_attempt (1 fail + 1 pass) → PASS。

## Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B2')})"
```
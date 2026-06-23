---
schema: command-experiment/v1
experiment: agentic-queue-loop
case: wave1-gate-fail-repair
weight: heavy
case_goal: "验证 wave1 gate 检测缺失 evidence-summary → inspect 指出缺失 topic → repair → gate pass → trace 含 2 条 gate_attempt（1 fail + 1 pass）"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_agql_w1_fail_
trace: dpt_disp_agql_w1_fail_*/_trace.jsonl
verdict: trace-jsonl
req: WAI-006
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。Scenario A（gate fail）使用部分 fixture 数据制造缺失 gap；Scenario B（repair）在同一 bundle 上继续，验证连续 trace。所有产出来自实际 CLI 调用和 gate 输出。禁止 mock 返回、手写假 trace。

# test-medium-wave1-gate-fail-repair

两个连续场景：gate fail（某 topic 缺 evidence-summary）→ inspect 定位 → repair → re-gate pass。

## Scenario A: Gate Fail — 检测缺失 evidence-summary

### Step A1: 创建 bundle + 制造 gap

```bash
REPO_ROOT=$(pwd)
B2=$(node experiments/shared/new-disposable-bundle.mjs agql_w1_fail --force)
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
mkdir -p $B2/reference/topic-x $B2/reference/topic-y
mkdir -p $B2/seed_topics

# topic-x: complete — has reference + evidence-summary
cat > $B2/reference/topic-x/source.yaml << 'REFEOF'
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
cat > $B2/reference/topic-y/source.yaml << 'REFEOF'
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

cat > $B2/reference/index.md << 'EOF'
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
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave1_completion"}' >> $B2/rb_trace.jsonl

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B2 --current-node phases/phase-wave1.md || true)
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

# Complete
cat > /tmp/wfq-result-topic-y.json << 'EOF'
{
  "work_id": "wave1-deepen-topic-y",
  "status": "done",
  "receipt": "file:artifacts/wave1/topic-y/evidence-summary.md",
  "summary": "repair deepening complete for topic-y",
  "writes": ["artifacts/wave1/topic-y/evidence-summary.md"]
}
EOF
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B2 --result /tmp/wfq-result-topic-y.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('repair complete:', d.feedback.passed)"

# Backfill seed topic topic-y（替换 3 个 __BACKFILL_WAVE1_*__ token）
echo "=== Backfill topic-y ==="
grep -q '__BACKFILL_WAVE1_MECHANISMS__' $B2/seed_topics/topic-y.md && echo "BEFORE: stale tokens present" || echo "BEFORE: clean"
# Agent 替换 token
grep -q '__BACKFILL_WAVE1_MECHANISMS__' $B2/seed_topics/topic-y.md && echo "AFTER FAIL: token not replaced" || echo "AFTER: token replaced"
```

### Step B2: Rerun gate — 预期 pass

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B2 --current-node phases/phase-wave1.md)
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
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B2/_trace.jsonl','last')})"
```

预期：PASS（2 checks: 1 expected-false + 1 expected-true，都匹配）。

## Cleanup

```bash
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B2')})"
```

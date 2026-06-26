---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-302-light-rerun-node-happy-path
weight: light
case_goal: "Rerun node mechanism: Prove that a pre-seeded rerun bundle passes the rerun-ready gate and chain routes correctly to seed-topics."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-302_rerun_happy_*
trace: dpt_disp_case-302_rerun_happy_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。

# case-302-light-rerun-node-happy-path

## Expected Runtime Path

1. 创建 bundle + pre-seed rerun 状态（user_decision: rerun, rerun_count: 0, rationale 非空, seed_topics + reference 目录）
2. Run hitl2-recorded gate → pass
3. Chain query `rerun` → `phases/phase-rerun.md`
4. Set status to rerun-ready, run check-gate-rerun-ready.mjs → pass + chain → seed-topics
5. 从 `_logs/_trace.jsonl` 裁决
6. Cleanup

## Case Goal

证明 rerun node 的 happy path：hitl2 gate pass → chain `rerun` → rerun node → rerun-ready gate pass → chain → seed-topics。

## Step 1: 创建 bundle + pre-seed rerun 状态

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs rerun_happy --case case-302 --force)
mkdir -p $B/artifacts/hitl2 $B/seed_topics $B/reference
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief
## Key Findings
Research produced evidence across 3 topics. Scope adjustment needed.
## Recommended Actions
Rerun with adjusted scope — add economic impact analysis.
EOF
cat > $B/rb_profile.yaml << 'EOF'
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
    research_profile: quick_factual
    root_must_answer_set: ["Test question?"]
  hitl2:
    status: recorded
    user_decision: rerun
    rationale: "Add economic impact analysis to topic coverage."
    rerun_count: 0
    recorded_at: "2026-06-20T10:00:00Z"
EOF
cat > $B/seed_topics/01_test-topic.md << 'EOF'
---
id: "topic-01"
slug: "01_test-topic"
title: "Test Topic"
must_answer: ["What is the regulatory framework?"]
hypothesis: "The current framework is incomplete."
search_guardrails: {required_terms: ["AI regulation"]}
---
# Test Topic
## 主题定位
Test topic for rerun verification.
## must_answer
1. What is the regulatory framework?
EOF
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"hitl2_recorded\"}" >> $B/rb_trace.jsonl
echo "=== Bundle ready ==="
```

## Step 2: Run hitl2-recorded gate → pass

```bash
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "hitl2_recorded", "next_gate": "readiness_passed" }
EOF
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "hitl2-recorded | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'hitl2-recorded',passed:$PASSED,detail:'hitl2 gate — rerun decision'})})"
```

## Step 3: Chain query rerun → phase-rerun.md

```bash
RR=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','rerun');console.log(JSON.stringify(r));})" 2>/dev/null)
RK=$(echo "$RR" | node experiments_env/shared/extract-field.mjs kind)
RN=$(echo "$RR" | node experiments_env/shared/extract-field.mjs next)
echo "chain rerun → kind=$RK next=$RN"
OK=false; [ "$RK" = "next" ] && [ "$RN" = "phases/phase-rerun.md" ] && OK=true
[ "$OK" = "true" ] && echo "OK" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'chain-rerun-to-rerun-node',passed:$OK,detail:'rerun → phase-rerun.md'})})" $OK
```

## Step 4: Run rerun-ready gate → pass

```bash
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "rerun_ready", "next_gate": "seed_topics_ready" }
EOF
GO=$(node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle $B --current-node phases/phase-rerun.md)
PASSED=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.next)
echo "rerun-ready | passed=$PASSED next=$NEXT"
OK=false; [ "$PASSED" = "true" ] && [ "$NEXT" = "phases/phase-seed-topics.md" ] && OK=true
[ "$OK" = "true" ] && echo "OK: gate pass → seed-topics" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'rerun-ready',passed:$OK,detail:'gate pass → seed-topics'})})" $OK
```

## Step 5: Verdict from `_logs/_trace.jsonl`

```bash
echo "=== Verdict ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/_logs/_trace.jsonl'))"
```

## Step 6: 结果解读

> 验证 rerun node 的 happy path 完整链路：
>   hitl2 gate pass → chain `rerun` → phase-rerun.md → rerun-ready gate pass → chain → seed-topics

## Step 7: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf $B
echo "Cleaned: $B"
```

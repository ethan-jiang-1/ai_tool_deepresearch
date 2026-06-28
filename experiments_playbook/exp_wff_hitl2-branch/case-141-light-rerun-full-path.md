---
schema: command-experiment/v1
experiment: wff-hitl2-branch
case: case-141-light-rerun-full-path
weight: light
case_goal: "HITL2 decision=rerun → Agent routes via chain → phase-rerun node → rerun-ready gate pass → chain → seed-topics. Trace evidence proves bundle passed through both hitl2 and rerun-ready nodes."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-141_rerunfp_*
trace: dpt_disp_case-141_rerunfp_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-141-light-rerun-full-path

## Expected Runtime Path

1. 创建 bundle + pre-seed HITL2 rerun 状态（user_decision: rerun, rerun_count: 0, seed_topics + reference）
2. hitl2 gate pass → Agent 读 decision → 用 `rerun` outcome 查 chain → `phase-rerun.md`
3. Agent 切 status 到 `rerun_ready` → 跑 rerun-ready gate → pass → chain → seed-topics
4. 证据：`rb_trace.jsonl` 中有 `gate_attempt(hitl2-recorded, passed)` 和 `gate_attempt(rerun-ready, passed)`
5. 从 trace 裁决，Cleanup

---

## Case Goal

证明 HITL2 decision=rerun 时，bundle 实打实走完 rerun 全路径：hitl2 → rerun → seed-topics。trace 证据证明经过了两个 node。

---

## Step 1: 创建 bundle + pre-seed HITL2 rerun 状态

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs rerunfp --case case-141 --force)
echo "Bundle: $B"

mkdir -p $B/artifacts/hitl2 $B/seed_topics $B/reference
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief
## Key Findings
Research produced evidence across 3 topics. Scope adjustment needed.
## Recommended Actions
Rerun with refined scope — add economic impact analysis.
EOF
cat > $B/seed_topics/01_test.md << 'EOF'
---
id: "topic-01"
slug: "01_test"
title: "Test Topic"
---
# Test Topic
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

# Pre-seed prior gate traces so hitl2 gate works
for g in instantiation-complete hitl1-recorded setup-ready seed-topics-ready wave0-complete wave1-complete wave2-complete; do
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"gate_attempt\",\"gate\":\"$g\",\"passed\":true}" >> $B/rb_trace.jsonl
done
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"hitl2_recorded\"}" >> $B/rb_trace.jsonl
echo "=== Bundle ready, user_decision: rerun ==="
```

## Step 2: hitl2 gate pass → Agent 捕获 decision → 查 chain

```bash
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "hitl2_recorded", "next_gate": "readiness_passed" }
EOF

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "hitl2-recorded | passed=$PASSED gate_next=$NEXT"

# Agent reads decision from profile
USER_DECISION=$(node -e "const fs=require('fs');const y=require('yaml');const p=y.parse(fs.readFileSync('$B/rb_profile.yaml','utf-8'));console.log(p.human_decision_checkpoints.hitl2.user_decision);")
echo "Agent reads user_decision: $USER_DECISION"

# Agent queries chain with 'rerun' outcome
RR=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','rerun');console.log(JSON.stringify(r));})" 2>/dev/null)
RK=$(echo "$RR" | node experiments_env/shared/extract-field.mjs kind)
RN=$(echo "$RR" | node experiments_env/shared/extract-field.mjs next)
echo "chain rerun → kind=$RK next=$RN"

OK=false; [ "$PASSED" = "true" ] && [ "$USER_DECISION" = "rerun" ] && [ "$RK" = "next" ] && [ "$RN" = "phases/phase-rerun.md" ] && OK=true
[ "$OK" = "true" ] && echo "OK: Agent correctly identified rerun decision, chain routes to phase-rerun.md" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'hitl2-capture-rerun',passed:$OK,detail:'Agent captured rerun + chain → phase-rerun.md'})})" $OK
```

## Step 3: Agent enters rerun node → rerun-ready gate → seed-topics

```bash
echo "=== Agent enters phase-rerun node ==="
# Agent updates status to rerun_ready
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "rerun_ready", "next_gate": "seed_topics_ready" }
EOF

# Agent runs rerun-ready gate
GO=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate rerun-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle $B --current-node phases/phase-rerun.md)
PASSED=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.next)
echo "rerun-ready | passed=$PASSED next=$NEXT"

OK=false; [ "$PASSED" = "true" ] && [ "$NEXT" = "phases/phase-seed-topics.md" ] && OK=true
[ "$OK" = "true" ] && echo "OK: rerun-ready gate pass → seed-topics ready" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'rerun-ready-gate',passed:$OK,detail:'rerun-ready pass → seed-topics'})})" $OK
```

## Step 4: Evidence — rb_trace.jsonl proves both nodes visited

```bash
echo "=== rb_trace.jsonl — gate_attempt evidence ==="
node -e "
const fs=require('fs');
const lines=fs.readFileSync('$B/rb_trace.jsonl','utf-8').trim().split('\n').filter(l=>l);
const events=lines.map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(e=>e&&e.event==='gate_attempt');
const names=events.map(e=>e.gate+':'+(e.passed?'PASS':'FAIL'));
console.log('All gate_attempt events:', names.join(', '));

const hitl2=events.find(e=>e.gate==='hitl2-recorded');
const rerun=events.find(e=>e.gate==='rerun-ready');

console.log('hitl2-recorded:', hitl2?hitl2.passed?'PASS':'FAIL':'MISSING');
console.log('rerun-ready:', rerun?rerun.passed?'PASS':'FAIL':'MISSING');

const bothPassed=hitl2&&hitl2.passed&&rerun&&rerun.passed;
console.log(bothPassed?'BOTH_NODES_VISITED':'NODES_MISSING');
process.exit(bothPassed?0:1);
"
EVIDENCE_OK=$?
echo "both nodes visited: $([ $EVIDENCE_OK -eq 0 ] && echo yes || echo no)"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'both-nodes-visited',passed:$([ $EVIDENCE_OK -eq 0 ] && echo true || echo false),detail:'hitl2 + rerun-ready both PASS in rb_trace.jsonl'})})"
```

## Step 5: Verdict from `rb_trace.jsonl`

```bash
echo "=== Verdict ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/rb_trace.jsonl'))"
```

## Step 6: 结果解读

> 验证 HITL2→rerun 全路径：
>   hitl2 gate pass → Agent 捕获 user_decision=rerun → chain `rerun` → phase-rerun.md
>   → status 切到 rerun_ready → rerun-ready gate pass → chain → seed-topics
>   `rb_trace.jsonl` 有 `gate_attempt(hitl2-recorded, PASS)` 和 `gate_attempt(rerun-ready, PASS)`
>   证明 bundle 真实经过了 hitl2 和 rerun 两个 node


## Step HH: Post-Execution Health

Standard profile — gate diagnostics, timeline consistency.

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile light
```

> 健康检查不改变 verdict。health status 由 runner report 记录。

## Step 7: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf $B
echo "Cleaned: $B"
```

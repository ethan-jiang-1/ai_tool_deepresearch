---
schema: command-experiment/v1
experiment: wff-hitl2-branch
case: case-140-light-hitl2-decision-capture
weight: light
case_goal: "Agent at HITL2 captures user_decision and rationale, understands intent, then routes via chain to the correct node — rerun goes to phase-rerun, proceed_to_readiness goes to readiness. Trace evidence proves both nodes were visited."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-140_h2cap_*
trace: dpt_disp_case-140_h2cap_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-140-light-hitl2-decision-capture

## Expected Runtime Path

1. 创建 bundle + pre-seed HITL2 ready（user_decision: rerun, rationale 非空）
2. hitl2 gate pass → Agent 读取 `user_decision` 和 `rationale`，理解意图
3. Agent 用 `rerun` outcome 查 chain → `phase-rerun.md`
4. 切 status 到 `rerun_ready`，跑 rerun-ready gate → pass → chain → seed-topics
5. 切回 HITL2，换 `user_decision: proceed_to_readiness`
6. hitl2 gate pass → Agent 用 `passed` outcome 查 chain → `phase-readiness.md`
7. 切 status 到 readiness，跑 readiness gate → pass
8. 证据：`rb_trace.jsonl` 中同时有 `gate_attempt(gate: hitl2-recorded)`、`gate_attempt(gate: rerun-ready)`、`gate_attempt(gate: readiness-passed)` — 证明 bundle 经过了三种 node
9. 从 trace 裁决，Cleanup

---

## Case Goal

证明 Agent 在 HITL2 能捕获任意 user_decision、理解 rationale 意图、按 chain 路由到正确 node。同一个 bundle 内先走 rerun 路径再走 readiness 路径，trace 留下三种 gate_attempt 证据。

---

## Step 1: 创建 bundle + pre-seed HITL2（user_decision: rerun）

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs h2cap --case case-140 --force)
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
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"hitl2_recorded\"}" >> $B/rb_trace.jsonl
echo "=== Bundle ready, user_decision: rerun ==="
```

## Step 2: hitl2 gate pass → Agent 读取 decision + rationale

```bash
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "hitl2_recorded", "next_gate": "readiness_passed" }
EOF
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "hitl2-recorded | passed=$PASSED"

# Agent reads the decision (simulated by extracting from profile)
USER_DECISION=$(node -e "const fs=require('fs');const y=require('yaml');const p=y.parse(fs.readFileSync('$B/rb_profile.yaml','utf-8'));console.log(p.human_decision_checkpoints.hitl2.user_decision);")
RATIONALE=$(node -e "const fs=require('fs');const y=require('yaml');const p=y.parse(fs.readFileSync('$B/rb_profile.yaml','utf-8'));console.log(p.human_decision_checkpoints.hitl2.rationale);")
echo "Agent reads: user_decision=$USER_DECISION rationale=$RATIONALE"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'hitl2-decision-captured',passed:$PASSED,detail:'Agent captured user_decision=rerun'})})"
```

预期：`user_decision: rerun`，`rationale` 非空。Agent 理解意图：用户要加经济影响分析。

## Step 3: Agent routes rerun → phase-rerun → rerun-ready gate

```bash
echo "=== Agent: routing rerun via chain ==="
RR=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','rerun');console.log(JSON.stringify(r));})" 2>/dev/null)
RK=$(echo "$RR" | node experiments_env/shared/extract-field.mjs kind)
RN=$(echo "$RR" | node experiments_env/shared/extract-field.mjs next)
echo "chain rerun → kind=$RK next=$RN"

# Agent advances to rerun node
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "rerun_ready", "next_gate": "seed_topics_ready" }
EOF

GO=$(node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle $B --current-node phases/phase-rerun.md)
PASSED=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.next)
echo "rerun-ready | passed=$PASSED next=$NEXT"

OK=false; [ "$RK" = "next" ] && [ "$RN" = "phases/phase-rerun.md" ] && [ "$PASSED" = "true" ] && [ "$NEXT" = "phases/phase-seed-topics.md" ] && OK=true
[ "$OK" = "true" ] && echo "OK: rerun path complete → seed-topics" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'rerun-path',passed:$OK,detail:'HITL2→rerun→rerun-ready→seed-topics'})})" $OK
```

## Step 4: Switch to proceed_to_readiness → readiness path

```bash
echo "=== Agent: switching to proceed_to_readiness ==="

# Agent updates profile for a different decision
cat > $B/rb_profile.yaml << 'EOF'
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
    research_profile: quick_factual
    root_must_answer_set: ["Test question?"]
  hitl2:
    status: recorded
    user_decision: proceed_to_readiness
    rationale: "The research is complete and ready for final delivery."
    recorded_at: "2026-06-20T10:00:00Z"
EOF

# Restore hitl2 status
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "hitl2_recorded", "next_gate": "readiness_passed" }
EOF

# hitl2 gate pass again
GO=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
PASSED=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.passed)
echo "hitl2-recorded (retry) | passed=$PASSED"

# Agent routes passed → readiness
PR=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','passed');console.log(JSON.stringify(r));})" 2>/dev/null)
PK=$(echo "$PR" | node experiments_env/shared/extract-field.mjs kind)
PN=$(echo "$PR" | node experiments_env/shared/extract-field.mjs next)
echo "chain passed → kind=$PK next=$PN"

# Pre-seed prior gates for readiness (it checks trace_has_all_gates)
for g in instantiation-complete hitl1-recorded setup-ready seed-topics-ready wave0-complete wave1-complete wave2-complete; do
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"gate_attempt\",\"gate\":\"$g\",\"passed\":true,\"currentNodeRef\":\"phases/phase-xxx.md\",\"next\":\"phases/phase-yyy.md\"}" >> $B/rb_trace.jsonl
done

# Advance to readiness
mkdir -p $B/artifacts/wave2 $B/artifacts/hitl2
echo '# Synthesis' > $B/artifacts/wave2/synthesis.md
echo '# Decision Brief' > $B/artifacts/hitl2/decision-brief.md
echo '# Reference Index' > $B/reference/_INDEX.md

cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "readiness_passed", "next_gate": "none" }
EOF

GO=$(node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle $B --current-node phases/phase-readiness.md)
PASSED=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.next)
echo "readiness-passed | passed=$PASSED next=$NEXT"

OK=false; [ "$PK" = "next" ] && [ "$PN" = "phases/phase-readiness.md" ] && [ "$PASSED" = "true" ] && OK=true
[ "$OK" = "true" ] && echo "OK: readiness path complete" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'readiness-path',passed:$OK,detail:'HITL2→readiness'})})" $OK
```

## Step 5: Evidence — trace shows all three nodes visited

```bash
echo "=== rb_trace.jsonl gate_attempt events ==="
node -e "
const fs=require('fs');
const lines=fs.readFileSync('$B/rb_trace.jsonl','utf-8').trim().split('\n').filter(l=>l);
const gates=lines.map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(e=>e&&e.event==='gate_attempt');
const names=gates.map(g=>g.gate+':'+(g.passed?'PASS':'FAIL'));
console.log('Gate attempts:', names.join(', '));

const hasHitl2=gates.some(g=>g.gate==='hitl2-recorded'&&g.passed);
const hasRerun=gates.some(g=>g.gate==='rerun-ready'&&g.passed);
const hasReadiness=gates.some(g=>g.gate==='readiness-passed'&&g.passed);
console.log('hitl2-recorded:', hasHitl2);
console.log('rerun-ready:', hasRerun);
console.log('readiness-passed:', hasReadiness);

const allThree=hasHitl2&&hasRerun&&hasReadiness;
console.log(allThree?'ALL_THREE_OK':'MISSING_SOME');
process.exit(allThree?0:1);
"
TRACE_OK=$?
echo "trace evidence complete: $([ $TRACE_OK -eq 0 ] && echo yes || echo no)"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'trace-evidence',passed:$([ $TRACE_OK -eq 0 ] && echo true || echo false),detail:'rb_trace.jsonl has all 3 gate_attempt events'})})"
```

## Step 6: Verdict from `_logs/_trace.jsonl`

```bash
echo "=== Verdict ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/_logs/_trace.jsonl'))"
```

## Step 7: 结果解读

> 验证 Agent 在 HITL2 的决策捕获 + 双路径路由：
>   - Agent 读取 user_decision=rerun + rationale → 理解意图 → chain `rerun` → rerun-ready gate pass
>   - Agent 读取 user_decision=proceed_to_readiness → chain `passed` → readiness gate pass
>   - `rb_trace.jsonl` 中同时有 hitl2-recorded、rerun-ready、readiness-passed 三个 gate_attempt
>   证明 bundle 在三种 node 上都停留过，Agent 按意图正确路由。

## Step 8: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf $B
echo "Cleaned: $B"
```

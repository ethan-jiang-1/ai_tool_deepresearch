---
schema: command-experiment/v1
experiment: wff-hitl2-branch
case: case-142-light-readiness-full-path
weight: light
case_goal: "HITL2 decision=proceed_to_readiness → Agent routes via chain → readiness node → readiness gate pass. Trace evidence proves bundle passed through both hitl2 and readiness nodes."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-142_readfp_*
trace: dpt_disp_case-142_readfp_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-142-light-readiness-full-path

## Expected Runtime Path

1. 创建 bundle + pre-seed HITL2 状态（user_decision: proceed_to_readiness）
2. hitl2 gate pass → Agent 读 decision → 用 `passed` outcome 查 chain → `phase-readiness.md`
3. Agent 切 status → pre-seed prior gates → 跑 readiness gate → pass
4. 证据：`rb_trace.jsonl` 中有 `gate_attempt(hitl2-recorded, passed)` 和 `gate_attempt(readiness-passed, passed)`
5. 从 trace 裁决，Cleanup

---

## Case Goal

证明 HITL2 decision=proceed_to_readiness 时，bundle 实打实走完正常交付路径：hitl2 → readiness。trace 证据证明经过了两个 node。

---

## Step 1: 创建 bundle + pre-seed HITL2 normal 状态

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs readfp --case case-142 --force)
echo "Bundle: $B"

mkdir -p $B/artifacts/hitl2 $B/seed_topics $B/reference $B/artifacts/wave2
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief
## Key Findings
Research produced strong evidence across 3 topics. All open questions addressed.
## Recommended Actions
Proceed to final delivery.
EOF
echo '# Synthesis' > $B/artifacts/wave2/synthesis.md
echo '# Reference Index' > $B/reference/_INDEX.md
cat > $B/seed_topics/01_test.md << 'EOF'
---
id: "topic-01"
slug: "01_test"
title: "Test Topic"
---
# Test Topic
EOF

cat > $B/rb_profile.yaml << 'EOF'
# Synthetic deterministic fixture only; not proof of real Agent research capability.
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/case-142-fixture"
  fetch_outcome: success
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

# Pre-seed prior gate traces for hitl2 and readiness
for g in instantiation-complete hitl1-recorded setup-ready seed-topics-ready wave0-complete wave1-complete wave2-complete; do
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"gate_attempt\",\"gate\":\"$g\",\"passed\":true}" >> $B/rb_trace.jsonl
done
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"hitl2_recorded\"}" >> $B/rb_trace.jsonl
echo "=== Bundle ready, user_decision: proceed_to_readiness ==="
```

## Step 2: hitl2 gate pass → Agent 捕获 decision → 查 chain

```bash
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "hitl2_recorded", "next_gate": "readiness_passed" }
EOF

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
GATE_NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "hitl2-recorded | passed=$PASSED gate_next=$GATE_NEXT"

# Agent reads decision from profile
USER_DECISION=$(node -e "const fs=require('fs');const y=require('yaml');const p=y.parse(fs.readFileSync('$B/rb_profile.yaml','utf-8'));console.log(p.human_decision_checkpoints.hitl2.user_decision);")
echo "Agent reads user_decision: $USER_DECISION"

# Agent queries chain with 'passed' outcome
PR=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','passed');console.log(JSON.stringify(r));})" 2>/dev/null)
PK=$(echo "$PR" | node experiments_env/shared/extract-field.mjs kind)
PN=$(echo "$PR" | node experiments_env/shared/extract-field.mjs next)
echo "chain passed → kind=$PK next=$PN"

OK=false; [ "$PASSED" = "true" ] && [ "$USER_DECISION" = "proceed_to_readiness" ] && [ "$PK" = "next" ] && [ "$PN" = "phases/phase-readiness.md" ] && OK=true
[ "$OK" = "true" ] && echo "OK: Agent correctly identified proceed_to_readiness, chain → readiness" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'hitl2-capture-readiness',passed:$OK,detail:'Agent captured proceed_to_readiness + chain → readiness'})})" $OK
```

## Step 3: Agent enters readiness node → readiness gate pass

```bash
echo "=== Agent enters phase-readiness node ==="
# Agent advances status to readiness
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "readiness_passed", "next_gate": "none" }
EOF

# Agent runs readiness gate
GO=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate readiness-passed -- node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle $B --current-node phases/phase-readiness.md)
PASSED=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.next)
echo "readiness-passed | passed=$PASSED next=$NEXT"

OK=false; [ "$PASSED" = "true" ] && OK=true
[ "$OK" = "true" ] && echo "OK: readiness gate pass — delivery chain complete" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'readiness-gate',passed:$OK,detail:'readiness gate pass'})})" $OK
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
const readiness=events.find(e=>e.gate==='readiness-passed');

console.log('hitl2-recorded:', hitl2?hitl2.passed?'PASS':'FAIL':'MISSING');
console.log('readiness-passed:', readiness?readiness.passed?'PASS':'FAIL':'MISSING');

const bothPassed=hitl2&&hitl2.passed&&readiness&&readiness.passed;
console.log(bothPassed?'BOTH_NODES_VISITED':'NODES_MISSING');
process.exit(bothPassed?0:1);
"
EVIDENCE_OK=$?
echo "both nodes visited: $([ $EVIDENCE_OK -eq 0 ] && echo yes || echo no)"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'both-nodes-visited',passed:$([ $EVIDENCE_OK -eq 0 ] && echo true || echo false),detail:'hitl2 + readiness both PASS in rb_trace.jsonl'})})"
```

## Step 5: Verdict from `rb_trace.jsonl`

```bash
echo "=== Verdict ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/rb_trace.jsonl'))"
```

## Step 6: 结果解读

> 验证 HITL2→readiness 全路径：
>   hitl2 gate pass → Agent 捕获 user_decision=proceed_to_readiness → chain `passed` → phase-readiness.md
>   → status 切到 readiness → readiness gate pass
>   `rb_trace.jsonl` 有 `gate_attempt(hitl2-recorded, PASS)` 和 `gate_attempt(readiness-passed, PASS)`
>   证明 bundle 真实经过了 hitl2 和 readiness 两个 node


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

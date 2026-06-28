---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-303-light-normal-path-unchanged
weight: light
case_goal: "Rerun node regression: prove normal path proceed_to_readiness → passed → readiness is unchanged after chain dual-exit."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-303_normal_*
trace: dpt_disp_case-303_normal_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。

# case-303-light-normal-path-unchanged

回归：`proceed_to_readiness` → chain `passed` → readiness 不变。

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs normal_path --case case-303 --force)
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "hitl2_recorded", "next_gate": "readiness_passed" }
EOF
mkdir -p $B/artifacts/hitl2
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief
## Key Findings Research produced strong evidence.
## Recommended Actions Proceed to final delivery.
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
    user_decision: proceed_to_readiness
    rationale: "The research is complete."
    recorded_at: "2026-06-20T10:00:00Z"
EOF
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"hitl2_recorded\"}" >> $B/rb_trace.jsonl
```

## Step 2: hitl2 gate + chain query

```bash
GO=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
PASSED=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.next)
echo "hitl2 passed=$PASSED next=$NEXT"
OK=false; [ "$PASSED" = "true" ] && [ "$NEXT" = "phases/phase-readiness.md" ] && OK=true
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'hitl2-normal-path',passed:$OK,detail:'normal path → readiness'})})" $OK

PR=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','passed');console.log(JSON.stringify(r));})" 2>/dev/null)
PK=$(echo "$PR" | node experiments_env/shared/extract-field.mjs kind)
PN=$(echo "$PR" | node experiments_env/shared/extract-field.mjs next)
echo "chain passed → kind=$PK next=$PN"
OK=false; [ "$PK" = "next" ] && [ "$PN" = "phases/phase-readiness.md" ] && OK=true
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'chain-passed-unchanged',passed:$OK,detail:'passed → readiness'})})" $OK
```

## Step 3: Verdict

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/rb_trace.jsonl'))"
rm -rf $B
```

## 结果解读

> 回归验证：正常交付路径 `proceed_to_readiness` → `passed` → readiness 不受 chain dual-exit 变更影响。

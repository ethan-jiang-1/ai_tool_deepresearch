---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-301-light-chain-dual-exit
weight: light
case_goal: "Rerun node mechanism: Prove that HITL2 chain encodes both deterministic exits — passed → readiness AND rerun → phase-rerun. Indeterminate outcomes correctly return invalid_input."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-301_dualexit_*
trace: dpt_disp_case-301_dualexit_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-301-light-chain-dual-exit

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed HITL2 状态（user_decision: rerun）
2. Run hitl2-recorded gate → pass
3. Use `resolveNodeTransitionDetailed` to verify `rerun` outcome returns `next: phases/phase-rerun.md`
4. Verify `passed` outcome still returns `next: phases/phase-readiness.md`
5. Verify indeterminate outcomes return `invalid_input`
6. Inspect chain file — confirm both `passed` and `rerun` keys exist
7. 从 `_trace.jsonl` 裁决
8. Cleanup

---

## Case Goal

证明 rerun node 的 chain 路由：HITL2 有两条确定性出口 — `passed → readiness`、`rerun → phase-rerun`。不确定 outcome 不进 chain。

---

## Step 1: 创建 bundle + pre-seed HITL2 状态

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs dualexit --case case-301 --force)
echo "Bundle: $B"

cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "hitl2_recorded", "next_gate": "readiness_passed" }
EOF
mkdir -p $B/artifacts/hitl2
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief
## Key Findings
Research produced evidence across 3 topics. Several open questions remain.
## Recommended Actions
Rerun the lifecycle with adjusted scope.
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
    recorded_at: "2026-06-20T10:00:00Z"
EOF
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"hitl2_recorded\"}" >> $B/rb_trace.jsonl
echo "=== Bundle ready ==="
```

## Step 2: Run hitl2-recorded gate → pass

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "hitl2 | passed=$PASSED next=$NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl2-recorded',passed:$PASSED,detail:'rerun — gate passes'})})"
```

预期：`check.passed: true`。

## Step 3: Verify chain dual-exit — rerun outcome routes to phase-rerun

```bash
RERUN_RESULT=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','rerun');console.log(JSON.stringify(r));})" 2>/dev/null)
RERUN_KIND=$(echo "$RERUN_RESULT" | node experiments_env/shared/extract-field.mjs kind)
RERUN_NEXT=$(echo "$RERUN_RESULT" | node experiments_env/shared/extract-field.mjs next)
echo "rerun → kind=$RERUN_KIND next=$RERUN_NEXT"
OK=false; [ "$RERUN_KIND" = "next" ] && [ "$RERUN_NEXT" = "phases/phase-rerun.md" ] && OK=true
[ "$OK" = "true" ] && echo "OK: rerun routes to phase-rerun.md" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'chain-rerun',passed:$OK,detail:'rerun → phase-rerun.md'})})" $OK
```

## Step 4: Verify passed outcome still returns readiness

```bash
PASSED_RESULT=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','passed');console.log(JSON.stringify(r));})" 2>/dev/null)
PASSED_KIND=$(echo "$PASSED_RESULT" | node experiments_env/shared/extract-field.mjs kind)
PASSED_NEXT=$(echo "$PASSED_RESULT" | node experiments_env/shared/extract-field.mjs next)
echo "passed → kind=$PASSED_KIND next=$PASSED_NEXT"
OK=false; [ "$PASSED_KIND" = "next" ] && [ "$PASSED_NEXT" = "phases/phase-readiness.md" ] && OK=true
[ "$OK" = "true" ] && echo "OK: passed still routes to readiness" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'chain-passed',passed:$OK,detail:'passed → readiness'})})" $OK
```

## Step 5: Verify indeterminate outcomes return invalid_input

```bash
echo "=== Indeterminate outcomes ==="
INDET_OK=true
for outcome in request_view_revision repair stop_blocked; do
  RESULT=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','$outcome');console.log(JSON.stringify(r));})" 2>/dev/null)
  KIND=$(echo "$RESULT" | node experiments_env/shared/extract-field.mjs kind)
  echo "  $outcome → kind=$KIND"
  [ "$KIND" != "invalid_input" ] && INDET_OK=false
done
$INDET_OK && echo "OK: all indeterminate → invalid_input" || echo "FAIL"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'chain-indeterminate',passed:$INDET_OK,detail:'indeterminate → invalid_input'})})"
```

## Step 6: Inspect chain file

```bash
echo "=== Chain File Inspection ==="
node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/transition-chain.mjs').then(m=>{const c=m.loadChain('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json');const e=c['phases/phase-hitl2.md'];const k=Object.keys(e);console.log('Keys:',k.join(', '));console.log(k.includes('passed')&&k.includes('rerun')?'OK: chain has passed + rerun':'FAIL')})"
```

## Step 7: Verdict from `_trace.jsonl`

```bash
echo "=== Verdict ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/_trace.jsonl'))"
```

## Step 8: 结果解读

> 验证 rerun node 的 chain 路由：
>   `passed` → `phase-readiness.md`（正常交付）
>   `rerun` → `phase-rerun.md`（增量重跑，新增确定性出口）
>   `request_view_revision`/`repair`/`stop_blocked` → `invalid_input`（不确定 branch 不进 chain）

## Step 9: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf $B
echo "Cleaned: $B"
```

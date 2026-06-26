---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-305-light-indeterminate-no-transition
weight: light
case_goal: "Rerun node boundary: indeterminate outcomes (request_view_revision/repair/stop_blocked) correctly return invalid_input."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-305_indet_*
trace: dpt_disp_case-305_indet_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。

# case-305-light-indeterminate-no-transition

边界：不确定 outcome → invalid_input。

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs indet --case case-305 --force)
OK=true
for o in request_view_revision repair stop_blocked; do
  R=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','$o');console.log(JSON.stringify(r));})" 2>/dev/null)
  K=$(echo "$R" | node experiments_env/shared/extract-field.mjs kind)
  echo "$o → kind=$K"
  [ "$K" != "invalid_input" ] && OK=false
done
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'chain-indeterminate-all',passed:$OK,detail:'indeterminate → invalid_input'})})"

echo "Chain keys:"
node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/transition-chain.mjs').then(m=>{const c=m.loadChain('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json');console.log(Object.keys(c['phases/phase-hitl2.md']).join(', '))})"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/_logs/_trace.jsonl'))"
rm -rf $B
```

## 结果解读

> 验证不确定 outcome 不进 chain：`request_view_revision`/`repair`/`stop_blocked` → `invalid_input`。Chain 只有 `passed` 和 `rerun` 两个确定性出口。

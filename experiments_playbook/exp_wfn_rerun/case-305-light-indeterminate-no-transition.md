---
schema: command-experiment/v2
experiment: wfn-rerun
case: case-305-light-indeterminate-no-transition
case_goal: "Rerun node boundary: indeterminate outcomes (request_view_revision/repair/stop_blocked) correctly return invalid_input."
verdict_mode: all
required_checks: [chain-indeterminate-all]
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

由 coding agent 在真实 disposable experiment bundle 中执行。

# case-305-light-indeterminate-no-transition

边界：不确定 outcome → invalid_input。

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs indet --case case-305 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
OK=true
for o in request_view_revision repair stop_blocked; do
  R=$(node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/ask-next.mjs').then(async m=>{const r=m.resolveNodeTransitionDetailed('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json','phases/phase-hitl2.md','$o');console.log(JSON.stringify(r));})" 2>/dev/null)
  K=$(echo "$R" | node experiments_env/shared/extract-field.mjs kind)
  echo "$o → kind=$K"
  [ "$K" != "invalid_input" ] && OK=false
done
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'chain-indeterminate-all',passed:$OK,detail:'indeterminate → invalid_input'})})"

echo "Chain keys:"
node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/transition-chain.mjs').then(m=>{const c=m.loadChain('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json');console.log(Object.keys(c['phases/phase-hitl2.md']).join(', '))})"

node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## 结果解读

> 验证不确定 outcome 不进 chain：`request_view_revision`/`repair`/`stop_blocked` → `invalid_input`。Chain 只有 `passed` 和 `rerun` 两个确定性出口。

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.

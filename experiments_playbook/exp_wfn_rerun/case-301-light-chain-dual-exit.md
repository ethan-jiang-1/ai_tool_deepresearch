---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-301-light-chain-dual-exit
weight: light
case_goal: "Mechanism-only proof that the transition chain has exactly the deterministic HITL2 passed and rerun exits, while context-dependent outcomes have no chain edge."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-301_chain_*
trace: dpt_disp_case-301_chain_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

这是 lower-level deterministic chain case，不执行 HITL2 gate，也不声称 delivery E2E。它直接消费 production `resolveNodeTransitionDetailed()`，保持 G24 mechanism proof 轻量。

# case-301-light-chain-dual-exit

## Step 1: Query current chain truth and record checks

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs chain --case case-301 --force)
node --input-type=module - "$B" <<'JS'
import { resolveNodeTransitionDetailed } from './DPT_FRAMEWORK/engine/ask-next.mjs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle=process.argv[2];
const path='./DPT_FRAMEWORK/workflows/transitions.chain.json';
const passed=resolveNodeTransitionDetailed(path,'phases/phase-hitl2.md','passed');
const rerun=resolveNodeTransitionDetailed(path,'phases/phase-hitl2.md','rerun');
const failed=resolveNodeTransitionDetailed(path,'phases/phase-hitl2.md','failed');
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-301-passed-exit',passed:passed.kind==='next'&&passed.next==='phases/phase-readiness.md',detail:JSON.stringify(passed)});
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-301-rerun-exit',passed:rerun.kind==='next'&&rerun.next==='phases/phase-rerun.md',detail:JSON.stringify(rerun)});
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-301-context-no-transition',passed:failed.kind==='no_transition'&&failed.next===null,detail:JSON.stringify(failed)});
JS
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile light
```

## Step 2: 结果解读

> PASS 只证明 chain truth：`passed -> readiness`、`rerun -> phase-rerun`，未定义的 deterministic failure outcome 为 `no_transition`。它不证明 HITL2 gate、Agent decision capture 或 rerun node 内容工作。

## Cleanup

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-301'}))"
```

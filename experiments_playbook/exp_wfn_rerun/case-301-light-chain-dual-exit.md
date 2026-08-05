---
schema: command-experiment/v2
experiment: wfn-rerun
case: case-301-light-chain-dual-exit
case_goal: "Mechanism-only proof that the transition chain has exactly the deterministic HITL2 passed and rerun exits, while context-dependent outcomes have no chain edge."
verdict_mode: all
required_checks: [case-301-context-no-transition, case-301-passed-exit, case-301-rerun-exit]
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

这是 lower-level deterministic chain case，不执行 HITL2 gate，也不声称 delivery E2E。它直接消费 production `resolveNodeTransitionDetailed()`，保持 G24 mechanism proof 轻量。

# case-301-light-chain-dual-exit

## Step 1: Query current chain truth and record checks

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs chain --case case-301 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { resolveNodeTransitionDetailed } from './DEEP_RESEARCH_HARNESS/engine/ask-next.mjs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle=process.argv[2];
const path='./DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json';
const passed=resolveNodeTransitionDetailed(path,'phases/phase-hitl2.md','passed');
const rerun=resolveNodeTransitionDetailed(path,'phases/phase-hitl2.md','rerun');
const failed=resolveNodeTransitionDetailed(path,'phases/phase-hitl2.md','failed');
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-301-passed-exit',passed:passed.kind==='next'&&passed.next==='phases/phase-readiness.md',detail:JSON.stringify(passed)});
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-301-rerun-exit',passed:rerun.kind==='next'&&rerun.next==='phases/phase-rerun.md',detail:JSON.stringify(rerun)});
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-301-context-no-transition',passed:failed.kind==='no_transition'&&failed.next===null,detail:JSON.stringify(failed)});
JS
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 2: 结果解读

> PASS 只证明 chain truth：`passed -> readiness`、`rerun -> phase-rerun`，未定义的 deterministic failure outcome 为 `no_transition`。它不证明 HITL2 gate、Agent decision capture 或 rerun node 内容工作。

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.

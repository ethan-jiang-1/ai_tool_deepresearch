---
schema: command-experiment/v2
experiment: wfn-rerun
case: case-303-light-normal-path-unchanged
case_goal: "Regression proof that a real proceed_to_readiness HITL2 result still authorizes readiness and source-gate status sync."
verdict_mode: all
required_checks: [case-303-normal-path, wave2-complete]
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

本 case 只证明 dual-exit chain 未改变 normal HITL2 branch；readiness 内容 gate 由 G13 拥有。

# case-303-light-normal-path-unchanged

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs normal --case case-303 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
mkdir -p "$B/artifacts/hitl2"
printf '# Decision Brief\nProceed.\n' > "$B/artifacts/hitl2/decision-brief.md"
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: normal
research_profile: quick_factual
root_must_answer_set: ["Does proceed still reach readiness?"]
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-07-10T00:01:00.000Z"
  hitl2:
    status: recorded
    answerability_class: ready_substantive
    user_decision: proceed_to_readiness
    final_report_view: profile_default
    rerun_count: 0
    rationale: "Proceed."
YAML
node --input-type=module - "$B" <<'JS'
import { writeGateAttempt } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle=process.argv[2];
writeGateAttempt(bundle,{check:{gate:'wave2-complete',passed:true,currentNodeRef:'phases/phase-wave2.md',next:'phases/phase-hitl2.md'},routing:{kind:'next',next:'phases/phase-hitl2.md'},inspect:[],advice:[]});
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'wave2-complete',passed:true,expected:true,detail:'declared direct-predecessor fixture'});
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-303-enter-hitl2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-303-advance-wave2.json"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$N" > "$B/case-303-enter-readiness.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-303-advance-hitl2.json"
node --input-type=module - "$B" "$P" "$N" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const [bundle,passed,next]=process.argv.slice(2);
const status=JSON.parse(readFileSync(`${bundle}/rb_status.json`,'utf8'));
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-303-normal-path',passed:passed==='true'&&next==='phases/phase-readiness.md'&&status.current_gate==='hitl2_recorded'&&status.next_gate==='readiness_passed'&&status.current_node==='phases/phase-readiness.md',detail:'real proceed output and witnessed readiness status window'});
JS
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## 结果解读

> PASS 只证明 normal branch 没有被 rerun alternate edge 改写。

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.

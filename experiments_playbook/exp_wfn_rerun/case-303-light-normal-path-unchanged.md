---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-303-light-normal-path-unchanged
weight: light
case_goal: "Regression proof that a real proceed_to_readiness HITL2 result still authorizes readiness and source-gate status sync."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-303_normal_*
trace: dpt_disp_case-303_normal_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

本 case 只证明 dual-exit chain 未改变 normal HITL2 branch；readiness 内容 gate 由 G13 拥有。

# case-303-light-normal-path-unchanged

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs normal --case case-303 --force)
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
const bundle=process.argv[2];
writeGateAttempt(bundle,{check:{gate:'wave2-complete',passed:true,currentNodeRef:'phases/phase-wave2.md',next:'phases/phase-hitl2.md'},routing:{kind:'next',next:'phases/phase-hitl2.md'},inspect:[],advice:[]});
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
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile light
```

## 结果解读

> PASS 只证明 normal branch 没有被 rerun alternate edge 改写。

## Cleanup

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-303'}))"
```

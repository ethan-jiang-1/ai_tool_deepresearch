---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-304-light-gate-fail-max-count
weight: light
case_goal: "Boundary proof that a legally entered rerun node fails closed when rerun_count reaches 3."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-304_maxcount_*
trace: dpt_disp_case-304_maxcount_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

HITL2 rerun handoff is produced by the real HITL2 gate before the tested rerun-ready failure. The case does not hand-edit status into rerun-ready.

# case-304-light-gate-fail-max-count

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs maxcount --case case-304 --force)
mkdir -p "$B/artifacts/hitl2"
printf '# Decision Brief\nRerun.\n' > "$B/artifacts/hitl2/decision-brief.md"
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: maxcount
research_profile: quick_factual
root_must_answer_set: ["Does max rerun count fail closed?"]
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-07-10T00:01:00.000Z"
  hitl2:
    status: recorded
    answerability_class: ready_substantive
    user_decision: rerun
    final_report_view: profile_default
    rerun_count: 3
    rationale: "Fourth attempt must be blocked."
YAML
node --input-type=module - "$B" <<'JS'
import { writeGateAttempt } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
const bundle=process.argv[2];
writeGateAttempt(bundle,{check:{gate:'wave2-complete',passed:true,currentNodeRef:'phases/phase-wave2.md',next:'phases/phase-hitl2.md'},routing:{kind:'next',next:'phases/phase-hitl2.md'},inspect:[],advice:[]});
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-304-enter-hitl2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-304-advance-wave2.json"
H2=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md)
N=$(printf '%s\n' "$H2" | node experiments_env/shared/extract-field.mjs check.next)
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$N" > "$B/case-304-enter-rerun.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-304-advance-hitl2.json"
set +e
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate rerun-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle "$B" --current-node phases/phase-rerun.md 2>/dev/null)
STATUS=$?
set -e
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
K=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs routing.kind)
HAS=$(printf '%s\n' "$OUT" | grep -c 'rerun_count' || true)
OK=false; [ "$STATUS" -ne 0 ] && [ "$P" = "false" ] && [ "$K" = "no_transition" ] && [ "$HAS" -gt 0 ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-304-max-count',passed:$OK,detail:'legal rerun entry then rerun_count=3 fail closed'}))"
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
```

## 结果解读

> PASS 证明 max-count failure 来自真实 rerun-ready gate，且前置 rerun entry/status 是 real HITL2 output 的 witness，不是手写 status。

## Post-Execution Health

```bash
set +e
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile light --json > "$B/case-304-health.json"
HEALTH_EXIT=$?
set -e
node --input-type=module - "$B/case-304-health.json" "$HEALTH_EXIT" <<'JS'
import { readFileSync } from 'node:fs';
const [path,exitCode]=process.argv.slice(2);
const report=JSON.parse(readFileSync(path,'utf8'));
const expectedOnly=report.issues.length>0&&report.issues.every((issue)=>issue.section==='gate_attempts');
if(!(Number(exitCode)===0||expectedOnly)) process.exit(1);
JS
```

## Cleanup

> Safe cleanup exception：verdict PASS 且 health issues 仅来自 intentional max-count gate failure 时可清理。

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-304'}))"
```

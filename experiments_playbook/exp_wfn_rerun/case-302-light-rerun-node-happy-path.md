---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-302-light-rerun-node-happy-path
weight: light
case_goal: "Mechanism proof that real HITL2 rerun output authorizes phase-rerun and real rerun-ready output authorizes seed-topics."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-302_rerun_node_*
trace: dpt_disp_case-302_rerun_node_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Wave2 pass is a declared direct-predecessor fixture. Both tested gates are real; both deterministic targets must be consumed through `enter-phase` and source-gate `advance-status`.

# case-302-light-rerun-node-happy-path

## Step 1: Execute rerun mechanism path

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs rerun_node --case case-302 --force)
mkdir -p "$B/artifacts/hitl2"
printf '# Decision Brief\nRerun.\n' > "$B/artifacts/hitl2/decision-brief.md"
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: rerun_node
research_profile: quick_factual
root_must_answer_set: ["Does rerun reach seed-topics through witnessed gates?"]
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-07-10T00:01:00.000Z"
  hitl2:
    status: recorded
    answerability_class: ready_substantive
    user_decision: rerun
    final_report_view: profile_default
    rerun_count: 0
    rationale: "Add economic impact analysis."
YAML
node --input-type=module - "$B" <<'JS'
import { writeGateAttempt } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
const bundle=process.argv[2];
writeGateAttempt(bundle,{check:{gate:'wave2-complete',passed:true,currentNodeRef:'phases/phase-wave2.md',next:'phases/phase-hitl2.md'},routing:{kind:'next',next:'phases/phase-hitl2.md'},inspect:[],advice:[]});
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-302-enter-hitl2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-302-advance-wave2.json"
H2=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md)
H2_NEXT=$(printf '%s\n' "$H2" | node experiments_env/shared/extract-field.mjs check.next)
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$H2_NEXT" > "$B/case-302-enter-rerun.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-302-advance-hitl2.json"
RR=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate rerun-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle "$B" --current-node phases/phase-rerun.md)
RR_P=$(printf '%s\n' "$RR" | node experiments_env/shared/extract-field.mjs check.passed)
RR_NEXT=$(printf '%s\n' "$RR" | node experiments_env/shared/extract-field.mjs check.next)
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$RR_NEXT" > "$B/case-302-enter-seed-topics.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to rerun_ready > "$B/case-302-advance-rerun.json"
node --input-type=module - "$B" "$H2_NEXT" "$RR_P" "$RR_NEXT" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const [bundle,h2Next,rrPassed,rrNext]=process.argv.slice(2);
const status=JSON.parse(readFileSync(`${bundle}/rb_status.json`,'utf8'));
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-302-rerun-mechanism',passed:h2Next==='phases/phase-rerun.md'&&rrPassed==='true'&&rrNext==='phases/phase-seed-topics.md'&&status.current_gate==='rerun_ready'&&status.current_node==='phases/phase-seed-topics.md',detail:'real rerun gates and witnessed status path'});
JS
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile light
```

## Step 2: 结果解读

> PASS 证明 rerun mechanism 的两个 real gate 与两次 witnessed handoff；不重复证明 full delivery tail。

## Cleanup

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-302'}))"
```

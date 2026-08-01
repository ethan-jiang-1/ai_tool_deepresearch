---
schema: command-experiment/v2
experiment: wfn-rerun
case: case-302-light-rerun-node-happy-path
case_goal: "Mechanism proof that real HITL2 rerun output authorizes phase-rerun and real rerun-ready output authorizes seed-topics."
verdict_mode: last
required_checks: [case-302-rerun-mechanism, wave2-complete]
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

Wave2 pass is a declared direct-predecessor fixture. Both tested gates are real; both deterministic targets must be consumed through `enter-phase` and source-gate `advance-status`.

# case-302-light-rerun-node-happy-path

## Step 1: Execute rerun mechanism path

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs rerun_node --case case-302 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
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
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle=process.argv[2];
writeGateAttempt(bundle,{check:{gate:'wave2-complete',passed:true,currentNodeRef:'phases/phase-wave2.md',next:'phases/phase-hitl2.md'},routing:{kind:'next',next:'phases/phase-hitl2.md'},inspect:[],advice:[]});
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'wave2-complete',passed:true,expected:true,detail:'declared direct-predecessor fixture'});
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
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 2: 结果解读

> PASS 证明 rerun mechanism 的两个 real gate 与两次 witnessed handoff；不重复证明 full delivery tail。

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.

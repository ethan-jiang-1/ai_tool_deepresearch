---
schema: command-experiment/v2
experiment: wff-validation
case: case-51-standard-happy-path
case_goal: "Prove canonical late-lifecycle handoffs consume real gate output, route-bound entry, source-gate status sync, Final terminal semantics, rerun alternate routing, and passing no-transition decisions."
verdict_mode: all
required_checks: [case-51-context-no-transition, case-51-final-terminal, case-51-proceed-witnesses, case-51-rerun-alternate, wave2-complete]
bundle_roles: [proceed-verdict, rerun, context]
verdict_role: proceed-verdict
health_roles: [proceed-verdict, rerun, context]
health_profile: standard
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, PLR-003 -->

## Execution Contract

本 case 是 AGT-010 canonical standard consumer。它使用三个互相隔离的 disposable bundles 覆盖 HITL2 的互斥 decision branches；被测 gate 必须来自真实 CLI，deterministic target 必须通过 `enter-phase`，status 只通过 source-gate `advance-status` 同步。主 bundle trace 聚合三个 bundle 的 case-specific checks。

# case-51-standard-happy-path

## Step 1: Proceed path → readiness → terminal Final

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_val_proceed --case case-51 --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role proceed-verdict --path "$B"
mkdir -p "$B/artifacts/hitl2" "$B/artifacts/wave2" "$B/seed_topics"
printf '# Topic A\n' > "$B/seed_topics/topic-a.md"
printf '# Reference Index\n' > "$B/reference/_INDEX.md"
printf '# Synthesis\nReady.\n' > "$B/artifacts/wave2/synthesis.md"
printf '# Decision Brief\nProceed.\n' > "$B/artifacts/hitl2/decision-brief.md"
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: wff_val_proceed
research_profile: quick_factual
root_must_answer_set: ["Does the canonical handoff path remain witnessed?"]
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/case-51-proceed"
  fetch_outcome: success
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
const bundle = process.argv[2];
const fixtures = [
  ['instantiation-complete','phases/phase-instantiation.md','phases/phase-hitl1.md'],
  ['hitl1-recorded','phases/phase-hitl1.md','phases/phase-setup.md'],
  ['setup-ready','phases/phase-setup.md','phases/phase-seed-topics.md'],
  ['seed-topics-ready','phases/phase-seed-topics.md','phases/phase-wave0.md'],
  ['wave0-complete','phases/phase-wave0.md','phases/phase-wave1.md'],
  ['wave1-complete','phases/phase-wave1.md','phases/phase-wave2.md'],
  ['wave2-complete','phases/phase-wave2.md','phases/phase-hitl2.md'],
];
for (const [gate,currentNodeRef,next] of fixtures) writeGateAttempt(bundle,{check:{gate,passed:true,currentNodeRef,next},routing:{kind:'next',next,detail:'declared direct-predecessor fixture'},inspect:[],advice:[]});
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-51-enter-hitl2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-51-advance-wave2.json"

H2=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md)
H2_NEXT=$(printf '%s\n' "$H2" | node experiments_env/shared/extract-field.mjs check.next)
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$H2_NEXT" > "$B/case-51-enter-readiness.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-51-advance-hitl2.json"

RD=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md)
RD_NEXT=$(printf '%s\n' "$RD" | node experiments_env/shared/extract-field.mjs check.next)
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$RD_NEXT" > "$B/case-51-enter-final.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to readiness_passed > "$B/case-51-advance-readiness.json"

node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle = process.argv[2];
const events = readFileSync(`${bundle}/rb_trace.jsonl`,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const status = JSON.parse(readFileSync(`${bundle}/rb_status.json`,'utf8'));
const manifest = JSON.parse(readFileSync('./DPT_FRAMEWORK/workflows/manifest.json','utf8'));
const chain = JSON.parse(readFileSync('./DPT_FRAMEWORK/workflows/transitions.chain.json','utf8'));
const witnessed = ['phases/phase-readiness.md','phases/phase-final.md'].every((entry)=>events.some((event)=>event.event==='load_complete'&&event.entry===entry&&Number.isInteger(event.handoff_source_attempt_index)));
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-51-proceed-witnesses',passed:witnessed&&status.current_node==='phases/phase-final.md'&&status.current_gate==='readiness_passed'&&status.next_gate==='none',detail:'proceed and readiness targets are route-bound and source-synchronized'});
const final = manifest.phases.find((phase)=>phase.node==='phases/phase-final.md');
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-51-final-terminal',passed:final?.gate===null&&!chain['phases/phase-final.md'],detail:'Final has no gate and no outgoing transition authority'});
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'wave2-complete',passed:events.some((event)=>event.event==='gate_attempt'&&event.gate==='wave2-complete'&&event.passed===true),detail:'real predecessor evidence reaches HITL2'});
JS
```

## Step 2: Rerun branch uses real alternate handoff

```bash
R=$(node experiments_env/shared/new-disposable-bundle.mjs wff_val_rerun --case case-51 --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role rerun --path "$R"
mkdir -p "$R/artifacts/hitl2"
printf '# Decision Brief\nRerun.\n' > "$R/artifacts/hitl2/decision-brief.md"
cat > "$R/rb_profile.yaml" <<'YAML'
plan_basename: wff_val_rerun
research_profile: quick_factual
root_must_answer_set: ["Does rerun preserve its alternate predecessor?"]
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
    rationale: "Refine scope."
YAML
node --input-type=module - "$R" <<'JS'
import { writeGateAttempt } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
const bundle=process.argv[2];
writeGateAttempt(bundle,{check:{gate:'wave2-complete',passed:true,currentNodeRef:'phases/phase-wave2.md',next:'phases/phase-hitl2.md'},routing:{kind:'next',next:'phases/phase-hitl2.md'},inspect:[],advice:[]});
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$R" --node phases/phase-hitl2.md > "$R/case-51-enter-hitl2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$R" --to wave2_complete > "$R/case-51-advance-wave2.json"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$R" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$R" --current-node phases/phase-hitl2.md)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$R" --node "$N" > "$R/case-51-enter-rerun.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$R" --to hitl2_recorded > "$R/case-51-advance-hitl2.json"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$R" --gate rerun-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle "$R" --current-node phases/phase-rerun.md)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N2=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
OK=false; [ "$N" = "phases/phase-rerun.md" ] && [ "$P" = "true" ] && [ "$N2" = "phases/phase-seed-topics.md" ] && OK=true
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role proceed-verdict)
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-51-rerun-alternate',passed:$OK,detail:'real HITL2 rerun and rerun-ready outputs preserve alternate path'}))"
```

## Step 3: Context-dependent repair passes without invented route

```bash
C=$(node experiments_env/shared/new-disposable-bundle.mjs wff_val_context --case case-51 --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role context --path "$C"
mkdir -p "$C/artifacts/hitl2"
printf '# Decision Brief\nRepair current run.\n' > "$C/artifacts/hitl2/decision-brief.md"
cat > "$C/rb_profile.yaml" <<'YAML'
plan_basename: wff_val_context
research_profile: quick_factual
root_must_answer_set: ["Does repair avoid a default handoff?"]
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-07-10T00:01:00.000Z"
  hitl2:
    status: recorded
    answerability_class: blocked_repair_required
    user_decision: repair
    final_report_view: profile_default
    rerun_count: 0
    rationale: "Repair the current synthesis."
YAML
node --input-type=module - "$C" <<'JS'
import { writeGateAttempt } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
const bundle=process.argv[2];
writeGateAttempt(bundle,{check:{gate:'wave2-complete',passed:true,currentNodeRef:'phases/phase-wave2.md',next:'phases/phase-hitl2.md'},routing:{kind:'next',next:'phases/phase-hitl2.md'},inspect:[],advice:[]});
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$C" --node phases/phase-hitl2.md > "$C/case-51-enter-hitl2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$C" --to wave2_complete > "$C/case-51-advance-wave2.json"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$C" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$C" --current-node phases/phase-hitl2.md)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
K=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs routing.kind)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
OK=false; [ "$P" = "true" ] && [ "$K" = "no_transition" ] && [ "$N" = "null" ] && OK=true
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role proceed-verdict)
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-51-context-no-transition',passed:$OK,detail:'passing repair decision keeps check.next null'}))"
```

## Step 4: Native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role proceed-verdict)
R=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role rerun)
C=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role context)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "proceed-verdict=$B" --bundle "rerun=$R" --bundle "context=$C"
```

## Step 5: 结果解读

> PASS 证明 canonical consumer 不再把所有 gate success 等同于非空 `check.next`：proceed/rerun 使用真实 deterministic targets；repair 是 passing `no_transition`；Final 以 `gate:null` + no outgoing edge 表达 terminal lifecycle。The Supervisor health-checks all three declared bundles and owns cleanup.

---
schema: command-experiment/v2
experiment: wff-validation
case: case-52-standard-fail-repair
case_goal: "Prove a real gate fail is repaired at the same checkpoint, unwitnessed status sync fails closed, and witnessed source-gate sync restores legal progress."
verdict_mode: all
required_checks: [case-52-hitl2-after-repair, case-52-hitl2-before-repair, case-52-readiness-after-repair, case-52-readiness-before-repair, case-52-real-fail-repair-rerun, case-52-unwitnessed-status-rejected]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: standard
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

本 case 记录真实 fail → repair → rerun gate attempts。它还在 gate pass 后故意先调用 source-gate `advance-status` 而不执行 `enter-phase`，证明 missing witness fail closed；随后执行 accepted handoff，再次同步 status 并继续 readiness same-check repair。

# case-52-standard-fail-repair

## Step 1: 创建合法 HITL2 entry，但缺少 decision brief

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_val_repair --case case-52 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
mkdir -p "$B/artifacts/hitl2" "$B/artifacts/wave2" "$B/seed_topics"
printf '# Topic A\n' > "$B/seed_topics/topic-a.md"
printf '# Reference Index\n' > "$B/reference/_INDEX.md"
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: wff_val_repair
research_profile: quick_factual
root_must_answer_set: ["Does witnessed repair resume legally?"]
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
    rationale: "Repair direct defects."
YAML
node --input-type=module - "$B" <<'JS'
import { writeGateAttempt } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
const bundle=process.argv[2];
const fixtures=[
  ['instantiation-complete','phases/phase-instantiation.md','phases/phase-hitl1.md'],
  ['hitl1-recorded','phases/phase-hitl1.md','phases/phase-setup.md'],
  ['setup-ready','phases/phase-setup.md','phases/phase-seed-topics.md'],
  ['seed-topics-ready','phases/phase-seed-topics.md','phases/phase-wave0.md'],
  ['wave0-complete','phases/phase-wave0.md','phases/phase-wave1.md'],
  ['wave1-complete','phases/phase-wave1.md','phases/phase-wave2.md'],
  ['wave2-complete','phases/phase-wave2.md','phases/phase-hitl2.md'],
];
for(const [gate,currentNodeRef,next] of fixtures) writeGateAttempt(bundle,{check:{gate,passed:true,currentNodeRef,next},routing:{kind:'next',next},inspect:[],advice:[]});
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-52-enter-hitl2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-52-advance-wave2.json"
```

## Step 2: HITL2 fail → repair → rerun same gate

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md 2>/dev/null || true)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-52-hitl2-before-repair',passed:$P,expected:false,detail:'missing brief fails real HITL2 gate'}))"
printf '# Decision Brief\nRepaired.\n' > "$B/artifacts/hitl2/decision-brief.md"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
OK=false; [ "$P" = "true" ] && [ "$N" = "phases/phase-readiness.md" ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-52-hitl2-after-repair',passed:$OK,detail:'same HITL2 gate passes after repair'}))"
```

## Step 3: Unwitnessed status sync fails, then accepted handoff succeeds

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
BAD=$(node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded 2>&1)
BAD_STATUS=$?
set -e
BAD_OK=false; [ "$BAD_STATUS" -ne 0 ] && printf '%s' "$BAD" | grep -q 'enter-phase' && BAD_OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-52-unwitnessed-status-rejected',passed:$BAD_OK,detail:'source-gate status sync requires route-bound entry'}))"

node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$N" > "$B/case-52-enter-readiness.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-52-advance-hitl2.json"
```

## Step 4: Readiness fail → repair → rerun same gate

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
rm -f "$B/artifacts/wave2/synthesis.md"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md 2>/dev/null || true)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-52-readiness-before-repair',passed:$P,expected:false,detail:'missing synthesis fails real readiness gate'}))"
printf '# Synthesis\nRepaired.\n' > "$B/artifacts/wave2/synthesis.md"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
OK=false; [ "$P" = "true" ] && [ "$N" = "phases/phase-final.md" ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-52-readiness-after-repair',passed:$OK,detail:'same readiness gate passes after repair'}))"

node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle=process.argv[2];
const events=readFileSync(`${bundle}/rb_trace.jsonl`,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const pair=(gate)=>{const values=events.filter((event)=>event.event==='gate_attempt'&&event.gate===gate).map((event)=>event.passed);return values.includes(false)&&values.includes(true);};
recordCheck(`${bundle}/rb_trace.jsonl`,{gate:'case-52-real-fail-repair-rerun',passed:pair('hitl2-recorded')&&pair('readiness-passed'),detail:'real CLI-authored fail/pass attempt pairs exist'});
JS
```

## Step 5: Native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 6: 结果解读

> PASS 证明 failed gate 不产生 route；repair 后重跑同一 gate 才产生 target。source-gate status sync 在缺少 `enter-phase` witness 时 fail closed，补齐 witness 后恢复合法推进。

Stop after native completion. The Autorun Supervisor owns Standard health and preserves PASS+ISSUES; v1 has no prose-derived cleanup exception.

---
schema: command-experiment/v2
experiment: wff-delivery
case: case-132-standard-hitl2-decision
case_goal: "Prove the current HITL2 Gate admits one complete current-round composition handoff with a normalized receipt, rejects direct composition defects, and preserves non-delivery decisions without a receipt."
verdict_mode: all
required_checks: [case-132-empty-brief, case-132-invalid-rejected, case-132-missing-brief, case-132-sentinel-rejected, case-132-missing-handoff, case-132-partial-handoff, case-132-unknown-handoff, case-132-not-started-view, case-132-custom-unresolved, case-132-stale-round, case-132-nondelivery-no-receipt, case-132-valid-proceed, wave2-complete]
bundle_roles: [verdict, rerun-probe]
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

被测结果只来自真实 `check-gate-hitl2-recorded.mjs`。Wave2 pass 是声明的 direct-predecessor fixture；合法 entry 由真实 `enter-phase` 与 `advance-status` 建立。fixture 只写 Agent/human-owned profile input，不手写被测 HITL2 Gate result 或 receipt。负例先执行，最终 happy path 最后执行，避免已经产生的 HITL2 deterministic handoff 反向污染 same-entry 边界测试。

# case-132-standard-hitl2-decision

## Step 1: 创建合法 HITL2 entry fixture

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs h2_dec --case case-132 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
mkdir -p "$B/artifacts/hitl2"

cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: h2_dec
research_profile: quick_factual
root_must_answer_set:
  - "Does HITL2 reject invalid recorded decisions?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  sample_observations:
    - { sample_id: gov_cn, source_group: china, outcome: content, retrieval_surface: native }
    - { sample_id: gitee, source_group: china, outcome: failed }
    - { sample_id: xinhuanet, source_group: china, outcome: failed }
    - { sample_id: cnki_catalog, source_group: china, outcome: failed }
    - { sample_id: wikipedia, source_group: overseas, outcome: failed }
    - { sample_id: github, source_group: overseas, outcome: failed }
    - { sample_id: iana, source_group: overseas, outcome: failed }
    - { sample_id: arxiv, source_group: overseas, outcome: failed }
    - { sample_id: rfc_editor, source_group: overseas, outcome: failed }
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
    composition_handoff:
      contract_version: 1
      for_rerun_count: 0
      reader:
        description: "Operators reviewing the fixture Gate result."
        familiarity: working
      intended_use: "Confirm the delivery handoff contract."
      primary_focus: "Current-round deterministic admission."
      content_priorities:
        foreground: ["Admission result"]
        compress: ["Fixture setup"]
      delivery:
        language: en-US
        length: standard
        evidence_exposure: balanced
        appendix: as_needed
YAML

node --input-type=module - "$B" <<'JS'
import { writeGateAttempt } from './DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
const bundle = process.argv[2];
writeGateAttempt(bundle, {
  check: { gate: 'wave2-complete', passed: true, currentNodeRef: 'phases/phase-wave2.md', next: 'phases/phase-hitl2.md' },
  routing: { kind: 'next', next: 'phases/phase-hitl2.md', detail: 'declared direct-predecessor fixture' },
  inspect: [], advice: [],
});
JS
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle = process.argv[2];
const events = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'wave2-complete',
  passed: events.some((event) => event.event === 'gate_attempt' && event.gate === 'wave2-complete' && event.passed === true && event.next === 'phases/phase-hitl2.md'),
  detail: 'production writer recorded the declared direct-predecessor fixture before HITL2 admission tests',
});
JS
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-132-enter-hitl2.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-132-advance-wave2.json"
```

## Step 2: Direct negative cases

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
run_hitl2() {
  node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md 2>/dev/null || true
}
set_decision() {
  node --input-type=module - "$B" "$1" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
const [bundle, decision] = process.argv.slice(2);
const profile = parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8'));
profile.human_decision_checkpoints.hitl2.user_decision = decision;
writeFileSync(`${bundle}/rb_profile.yaml`, stringify(profile));
JS
}

set_projection_variant() {
  node --input-type=module - "$B" "$1" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
const [bundle, variant] = process.argv.slice(2);
const profile = parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8'));
const hitl2 = profile.human_decision_checkpoints.hitl2;
const handoff = {
  contract_version: 1,
  for_rerun_count: 0,
  reader: { description: 'Operators reviewing the fixture Gate result.', familiarity: 'working' },
  intended_use: 'Confirm the delivery handoff contract.',
  primary_focus: 'Current-round deterministic admission.',
  content_priorities: { foreground: ['Admission result'], compress: ['Fixture setup'] },
  delivery: { language: 'en-US', length: 'standard', evidence_exposure: 'balanced', appendix: 'as_needed' },
};
hitl2.status = 'recorded';
hitl2.user_decision = 'proceed_to_readiness';
hitl2.final_report_view = 'profile_default';
hitl2.rerun_count = 0;
delete hitl2.custom_slug;
if (variant === 'missing') delete hitl2.composition_handoff;
else {
  if (variant === 'partial') delete handoff.delivery.appendix;
  if (variant === 'unknown') handoff.delivery.unexpected = 'fixture defect';
  if (variant === 'stale') handoff.for_rerun_count = 1;
  if (variant === 'not-started') hitl2.final_report_view = 'not_started';
  if (variant === 'custom-unresolved') {
    hitl2.final_report_view = 'custom';
    hitl2.custom_slug = 'fixture-custom';
  }
  hitl2.composition_handoff = handoff;
}
writeFileSync(`${bundle}/rb_profile.yaml`, stringify(profile));
JS
}

record_composition_failure() {
  local gate="$1"
  local label="$2"
  OUT=$(run_hitl2)
  P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
  I=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs inspect)
  OK=false; [ "$P" = "false" ] && printf '%s' "$I" | grep -Eqi 'composition|handoff|rerun|custom|not_started' && OK=true
  node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'$gate',passed:$OK,detail:'$label is rejected by the real HITL2 Gate at its direct profile boundary'}))"
}

rm -f "$B/artifacts/hitl2/decision-brief.md"
OUT=$(run_hitl2)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
I=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs inspect.0)
OK=false; [ "$P" = "false" ] && printf '%s' "$I" | grep -q 'decision-brief' && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-132-missing-brief',passed:$OK,detail:'missing brief fails directly'}))"

: > "$B/artifacts/hitl2/decision-brief.md"
OUT=$(run_hitl2)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
I=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs inspect.0)
OK=false; [ "$P" = "false" ] && printf '%s' "$I" | grep -q 'empty' && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-132-empty-brief',passed:$OK,detail:'empty brief fails directly'}))"

printf '# Decision Brief\nValid body.\n' > "$B/artifacts/hitl2/decision-brief.md"
set_decision not_started
OUT=$(run_hitl2)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
I=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs inspect.0)
OK=false; [ "$P" = "false" ] && printf '%s' "$I" | grep -q 'accepted set' && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-132-sentinel-rejected',passed:$OK,detail:'not_started is schema sentinel, not a recorded gate action'}))"

set_decision random_choice
OUT=$(run_hitl2)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
I=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs inspect.0)
OK=false; [ "$P" = "false" ] && printf '%s' "$I" | grep -q 'accepted set' && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-132-invalid-rejected',passed:$OK,detail:'unsupported decision fails enum rule'}))"

set_projection_variant missing
record_composition_failure case-132-missing-handoff 'missing handoff'
set_projection_variant partial
record_composition_failure case-132-partial-handoff 'partial handoff'
set_projection_variant unknown
record_composition_failure case-132-unknown-handoff 'unknown handoff field'
set_projection_variant not-started
record_composition_failure case-132-not-started-view 'not_started delivery view'
set_projection_variant custom-unresolved
record_composition_failure case-132-custom-unresolved 'unresolved custom view'
set_projection_variant stale
record_composition_failure case-132-stale-round 'stale rerun-bound handoff'

NONDELIVERY_PASSES=0
for decision in request_view_revision repair stop_blocked; do
  node --input-type=module - "$B" "$decision" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
const [bundle, decision] = process.argv.slice(2);
const profile = parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8'));
const hitl2 = profile.human_decision_checkpoints.hitl2;
hitl2.status = 'recorded';
hitl2.user_decision = decision;
hitl2.final_report_view = 'profile_default';
hitl2.rerun_count = 0;
delete hitl2.custom_slug;
delete hitl2.composition_handoff;
writeFileSync(`${bundle}/rb_profile.yaml`, stringify(profile));
JS
  OUT=$(run_hitl2)
  P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
  [ "$P" = "true" ] && NONDELIVERY_PASSES=$((NONDELIVERY_PASSES + 1))
done
R=$(node experiments_env/shared/new-disposable-bundle.mjs h2_rerun --case case-132 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role rerun-probe --path "$R"
cp "$B/rb_profile.yaml" "$R/rb_profile.yaml"
cp "$B/rb_status.json" "$R/rb_status.json"
cp "$B/rb_trace.jsonl" "$R/rb_trace.jsonl"
mkdir -p "$R/artifacts/hitl2"
cp "$B/artifacts/hitl2/decision-brief.md" "$R/artifacts/hitl2/decision-brief.md"
node --input-type=module - "$R" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
const bundle = process.argv[2];
const profile = parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8'));
profile.human_decision_checkpoints.hitl2.user_decision = 'rerun';
writeFileSync(`${bundle}/rb_profile.yaml`, stringify(profile));
JS
RERUN_OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$R" --gate hitl2-recorded -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$R" --current-node phases/phase-hitl2.md)
RERUN_PASSED=$(printf '%s\n' "$RERUN_OUT" | node experiments_env/shared/extract-field.mjs check.passed)
node --input-type=module - "$B" "$R" "$NONDELIVERY_PASSES" "$RERUN_PASSED" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const [bundle, rerunBundle, passCount, rerunPassed] = process.argv.slice(2);
const attempts = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse)
  .filter((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded' && event.passed === true)
  .slice(-3);
const rerunAttempt = readFileSync(`${rerunBundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse)
  .filter((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded' && event.passed === true)
  .at(-1);
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-132-nondelivery-no-receipt',
  passed: passCount === '3' && rerunPassed === 'true' && attempts.length === 3
    && attempts.every((event) => event.composition_handoff_receipt === undefined)
    && rerunAttempt?.next === 'phases/phase-rerun.md'
    && rerunAttempt.composition_handoff_receipt === undefined,
  detail: 'three non-routing decisions and the isolated rerun decision pass without a composition receipt',
});
JS
```

## Step 3: Happy path without phase-authored diagnostic event

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set_projection_variant valid
OUT=$(run_hitl2)
printf '%s\n' "$OUT" > "$B/case-132-hitl2-pass.json"
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)

node --input-type=module - "$B" "$P" "$N" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const [bundle, passed, next] = process.argv.slice(2);
const events = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const phaseDiagnosticAbsent = !events.some((event) => event.event === 'hitl2_recorded');
const gateAttempt = events.filter((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded' && event.passed === true && event.next === 'phases/phase-readiness.md').at(-1);
const receipt = gateAttempt?.composition_handoff_receipt;
const normalizedReceipt = receipt?.schema_version === 'composition-handoff-receipt/v1'
  && receipt.final_report_view === 'profile_default'
  && receipt.custom_slug === null
  && receipt.composition_handoff?.for_rerun_count === 0
  && receipt.composition_handoff?.delivery?.language === 'en-US'
  && /^[a-f0-9]{64}$/.test(receipt?.projection_sha256 || '')
  && /^[a-f0-9]{64}$/.test(receipt?.profile_context_sha256 || '');
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-132-valid-proceed',
  passed: passed === 'true' && next === 'phases/phase-readiness.md' && phaseDiagnosticAbsent && normalizedReceipt,
  detail: 'valid current-round proceed emits one normalized CLI-authored composition receipt',
});
JS
```

## Step 4: Trace verdict

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
R=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role rerun-probe)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" --bundle "rerun-probe=$R"
```

## Step 5: 结果解读

> PASS 证明 brief 缺失/空、非法 decision、缺失/partial/unknown/stale/custom-unresolved handoff 与 `not_started` view 都直接 fail；四个既有 non-delivery decisions 不受 handoff 阻塞且不写 receipt；有效 `proceed_to_readiness` 返回 readiness handoff 并由 CLI 写一份 normalized receipt。没有 Phase Agent 的 `hitl2_recorded` diagnostic event 不会阻塞 Gate。

Stop after native completion. The Autorun Supervisor owns Standard health and preserves PASS+ISSUES; v1 has no prose-derived cleanup exception.

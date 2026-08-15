---
schema: command-experiment/v2
experiment: wff-delivery
case: case-135-standard-readiness-precheck
case_goal: "Prove Readiness matches the selected composition witness, restores projection-only drift, refuses unsafe v1/context and receipt failures, and supports one bounded legacy migration."
verdict_mode: all
required_checks: [case-135-complete-input, case-135-corrupt-jsonl, case-135-invalid-yaml, case-135-missing-artifact, case-135-missing-prior-gate, case-135-projection-restore, case-135-v1-context-refusal, case-135-receipt-failures, case-135-legacy-migration]
bundle_roles: [readiness-verdict, missing-prior-gate, corrupt-trace, invalid-witness, legacy-migration]
verdict_role: readiness-verdict
health_roles: [readiness-verdict]
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

> **QUARANTINED - EXTREME SLOW.** Retained native FAIL batches
> `b72332ea-b28c-4251-a8ea-86c76b95197d` and
> `70796213-e365-4c31-aaf5-34e6ed536db9` each exceeded the 120-second active
> suite limit; the latter ran for `364791 ms` at `$2.242261`. Do not run this
> playbook through Autorun or Interactive. Its receipt and lineage findings
> remain diagnostic history only, not Change-completion, human-acceptance, or
> report-quality evidence. A later Change must shorten and explicitly
> re-register it before any reactivation.

## Execution Contract

被测 readiness/operation verdict 全部来自真实 CLI。主 bundle 在一个合法 readiness entry 中依次验证可修复 direct defects、projection restore 和 v1 context refusal；corrupt trace、invalid receipt 与 legacy predecessor 使用独立 auxiliary bundle，因为这些输入不能安全复用为主 bundle 的后续 authority。fixture 只提供 profile/artifact/legacy predecessor facts，不手写被测 Readiness pass、receipt 或 operation verdict；receipt-less legacy predecessor 明确是历史 trace fixture，不是当前 v1 Gate 通过。主 bundle trace 聚合 auxiliary CLI 的退出码与诊断，且不把 fixture 当作 human acceptance 或 Final quality evidence。

# case-135-standard-readiness-precheck

## Step 1: 创建主 bundle 并建立合法 readiness entry

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs ready --case case-135 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role readiness-verdict --path "$B"
mkdir -p "$B/artifacts/hitl2" "$B/artifacts/wave2" "$B/seed_topics"
printf '# Topic A\n' > "$B/seed_topics/topic-a.md"
printf '# Reference Index\n' > "$B/reference/_INDEX.md"
printf '# Synthesis\nReady.\n' > "$B/artifacts/wave2/synthesis.md"
printf '# Decision Brief\nProceed.\n' > "$B/artifacts/hitl2/decision-brief.md"

cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: ready
research_profile: quick_factual
root_must_answer_set:
  - "Does readiness fail at the direct prerequisite?"
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
        description: "Operators verifying Readiness consistency."
        familiarity: working
      intended_use: "Inspect a deterministic delivery precheck."
      primary_focus: "Accepted composition witness continuity."
      content_priorities:
        foreground: ["Witness match", "Repair boundary"]
        compress: ["Fixture setup detail"]
      delivery:
        language: en-US
        length: standard
        evidence_exposure: balanced
        appendix: as_needed
YAML

node --input-type=module - "$B" <<'JS'
import { writeGateAttempt } from './DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import { selectWave1CarriedTargetReceipt } from './DEEP_RESEARCH_HARNESS/engine/helpers/wave-carried-target-receipts.mjs';
const bundle = process.argv[2];
const carriedTargetSelection = selectWave1CarriedTargetReceipt(bundle);
if (!carriedTargetSelection.ok) throw new Error(`Cannot create Wave1 fixture receipt: ${carriedTargetSelection.findings.map((finding) => finding.detail).join('; ')}`);
const fixtures = [
  ['instantiation-complete', 'phases/phase-instantiation.md', 'phases/phase-hitl1.md'],
  ['hitl1-recorded', 'phases/phase-hitl1.md', 'phases/phase-setup.md'],
  ['setup-ready', 'phases/phase-setup.md', 'phases/phase-seed-topics.md'],
  ['seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md'],
  ['wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md'],
  ['wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md'],
  ['wave2-complete', 'phases/phase-wave2.md', 'phases/phase-hitl2.md'],
];
for (const [gate, currentNodeRef, next] of fixtures) {
  const result = { check: { gate, passed: true, currentNodeRef, next }, routing: { kind: 'next', next, detail: 'declared direct-predecessor fixture' }, inspect: [], advice: [] };
  if (gate === 'wave1-complete') {
    writeGateAttempt(bundle, result, { carriedTargetReceipt: carriedTargetSelection.receipt, strictTrace: true });
  } else {
    writeGateAttempt(bundle, result);
  }
}
JS
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-135-enter-hitl2.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-135-advance-wave2.json"
HITL2=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md)
HITL2_NEXT=$(printf '%s\n' "$HITL2" | node experiments_env/shared/extract-field.mjs check.next)
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node "$HITL2_NEXT" > "$B/case-135-enter-readiness.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-135-advance-hitl2.json"
```

## Step 2: 主 bundle direct negative cases 与最终 pass

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role readiness-verdict)
run_ready() {
  node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md 2>/dev/null || true
}

rm "$B/artifacts/wave2/synthesis.md"
OUT=$(run_ready)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
I=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs inspect.0)
OK=false; [ "$P" = "false" ] && printf '%s' "$I" | grep -q 'synthesis' && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-135-missing-artifact',passed:$OK,detail:'missing synthesis fails directly'}))"
printf '# Synthesis\nRepaired.\n' > "$B/artifacts/wave2/synthesis.md"

Q=$(node experiments_env/shared/new-disposable-bundle.mjs ready_missing_prior --case case-135 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role missing-prior-gate --path "$Q"
cp -R "$B/." "$Q/"
node --input-type=module - "$Q" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
const bundle = process.argv[2];
const lines = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').split(/\r?\n/).filter(Boolean);
const mutated = lines.map((line) => {
  const event = JSON.parse(line);
  if (event.event === 'gate_attempt' && event.gate === 'instantiation-complete') event.passed = false;
  return JSON.stringify(event);
});
writeFileSync(`${bundle}/rb_trace.jsonl`, `${mutated.join('\n')}\n`);
JS
set +e
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$Q" --gate readiness-passed -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle "$Q" --current-node phases/phase-readiness.md 2>/dev/null)
Q_STATUS=$?
set -e
ALL=$(printf '%s\n' "$OUT" | grep -c 'instantiation-complete' || true)
OK=false; [ "$Q_STATUS" -ne 0 ] && [ "$ALL" -gt 0 ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-135-missing-prior-gate',passed:$OK,detail:'auxiliary readiness probe names missing instantiation-complete'}))"

cp "$B/rb_profile.yaml" "$B/rb_profile.yaml.good"
printf 'human_decision_checkpoints: [\n' > "$B/rb_profile.yaml"
OUT=$(run_ready)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
Y=$(printf '%s\n' "$OUT" | grep -ci 'YAML parse error' || true)
OK=false; [ "$P" = "false" ] && [ "$Y" -gt 0 ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-135-invalid-yaml',passed:$OK,detail:'unparseable profile fails directly'}))"
mv "$B/rb_profile.yaml.good" "$B/rb_profile.yaml"

cp "$B/rb_profile.yaml" "$B/rb_profile.yaml.before-projection-drift"
node --input-type=module - "$B" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
const bundle = process.argv[2];
const profile = parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8'));
profile.human_decision_checkpoints.hitl2.final_report_view = 'evidence_map';
writeFileSync(`${bundle}/rb_profile.yaml`, stringify(profile));
JS
OUT=$(run_ready)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
D=$(printf '%s\n' "$OUT" | grep -ci 'composition_projection_drift' || true)
RESTORE=$(node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs restore --bundle "$B" --current-node phases/phase-readiness.md)
RESTORE_VERDICT=$(printf '%s\n' "$RESTORE" | node experiments_env/shared/extract-field.mjs verdict)
RETRY=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md)
RETRY_P=$(printf '%s\n' "$RETRY" | node experiments_env/shared/extract-field.mjs check.passed)
node --input-type=module - "$B" "$P" "$D" "$RESTORE_VERDICT" "$RETRY_P" <<'JS'
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const [bundle, initialPassed, driftCount, restoreVerdict, retryPassed] = process.argv.slice(2);
const profile = parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8'));
const events = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const restore = events.filter((event) => event.event === 'composition_handoff_restore').at(-1);
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-135-projection-restore',
  passed: initialPassed === 'false' && Number(driftCount) > 0 && restoreVerdict === 'restored'
    && retryPassed === 'true' && profile.human_decision_checkpoints.hitl2.final_report_view === 'profile_default'
    && /^[a-f0-9]{64}$/.test(restore?.projection_sha256 || ''),
  detail: 'real Readiness reports projection-only drift; restore writes the accepted projection and the same Gate then passes',
});
JS

cp "$B/rb_profile.yaml" "$B/rb_profile.yaml.before-v1-context-drift"
node --input-type=module - "$B" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
const bundle = process.argv[2];
const profile = parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8'));
profile.root_must_answer_set.push('Fixture-only unrelated context drift.');
writeFileSync(`${bundle}/rb_profile.yaml`, stringify(profile));
JS
OUT=$(run_ready)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
C=$(printf '%s\n' "$OUT" | grep -ci 'profile_context_drift' || true)
node --input-type=module - "$B" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
const bundle = process.argv[2];
const files = ['rb_profile.yaml', 'rb_status.json', 'rb_trace.jsonl', 'artifacts/hitl2/decision-brief.md', 'artifacts/wave2/synthesis.md'];
writeFileSync(`${bundle}/case-135-v1-refusal-before.json`, JSON.stringify(Object.fromEntries(files.map((file) => [file, readFileSync(`${bundle}/${file}`, 'utf8')]))));
JS
set +e
REFUSAL=$(node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs restore --bundle "$B" --current-node phases/phase-readiness.md)
REFUSAL_STATUS=$?
set -e
node --input-type=module - "$B" "$P" "$C" "$REFUSAL_STATUS" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const [bundle, passed, contextCount, status] = process.argv.slice(2);
const before = JSON.parse(readFileSync(`${bundle}/case-135-v1-refusal-before.json`, 'utf8'));
const unchanged = Object.entries(before).every(([file, bytes]) => readFileSync(`${bundle}/${file}`, 'utf8') === bytes);
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-135-v1-context-refusal',
  passed: passed === 'false' && Number(contextCount) > 0 && status !== '0' && unchanged,
  detail: 'v1 unrelated profile-context drift refuses restore without mutating current authority bytes',
});
JS
mv "$B/rb_profile.yaml.before-v1-context-drift" "$B/rb_profile.yaml"

OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
OK=false; [ "$P" = "true" ] && [ "$N" = "phases/phase-final.md" ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-135-complete-input',passed:$OK,detail:'complete readiness input passes to final'}))"
```

## Step 3: Auxiliary corrupt JSONL probe

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role readiness-verdict)
P=$(node experiments_env/shared/new-disposable-bundle.mjs ready_corrupt --case case-135 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role corrupt-trace --path "$P"
cp "$B/rb_profile.yaml" "$P/rb_profile.yaml"
mkdir -p "$P/artifacts/hitl2" "$P/artifacts/wave2" "$P/seed_topics"
printf '# Topic A\n' > "$P/seed_topics/topic-a.md"
printf '# Reference Index\n' > "$P/reference/_INDEX.md"
printf '# Synthesis\nReady.\n' > "$P/artifacts/wave2/synthesis.md"
printf '# Decision Brief\nProceed.\n' > "$P/artifacts/hitl2/decision-brief.md"
printf 'not-json\n' >> "$P/rb_trace.jsonl"
set +e
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$P" --gate readiness-passed -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle "$P" --current-node phases/phase-readiness.md 2>/dev/null)
STATUS=$?
set -e
HAS=$(printf '%s\n' "$OUT" | grep -ci 'not valid JSON\|unparseable' || true)
OK=false; [ "$STATUS" -ne 0 ] && [ "$HAS" -gt 0 ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-135-corrupt-jsonl',passed:$OK,detail:'auxiliary real readiness CLI rejects corrupt trace JSONL'}))"
```

## Step 4: Auxiliary receipt-failure matrix

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role readiness-verdict)
W=$(node experiments_env/shared/new-disposable-bundle.mjs ready_bad_witness --case case-135 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role invalid-witness --path "$W"
cp -R "$B/." "$W/"
cp "$W/rb_trace.jsonl" "$W/rb_trace.jsonl.good"
RECEIPT_FAILURES=0
for variant in missing malformed unsupported fingerprint; do
  cp "$W/rb_trace.jsonl.good" "$W/rb_trace.jsonl"
  node --input-type=module - "$W" "$variant" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
const [bundle, variant] = process.argv.slice(2);
const events = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const hitl2 = events.findLast((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded' && event.passed === true && event.next === 'phases/phase-readiness.md');
if (variant === 'missing') delete hitl2.composition_handoff_receipt;
if (variant === 'malformed') hitl2.composition_handoff_receipt = { schema_version: 'composition-handoff-receipt/v1' };
if (variant === 'unsupported') hitl2.composition_handoff_receipt.schema_version = 'composition-handoff-receipt/v9';
if (variant === 'fingerprint') hitl2.composition_handoff_receipt.projection_sha256 = '0'.repeat(64);
writeFileSync(`${bundle}/rb_trace.jsonl`, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
JS
  set +e
  OUT=$(node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle "$W" --current-node phases/phase-readiness.md)
  STATUS=$?
  set -e
  HAS=$(printf '%s\n' "$OUT" | grep -Eci 'composition|witness|receipt' || true)
  [ "$STATUS" -ne 0 ] && [ "$HAS" -gt 0 ] && RECEIPT_FAILURES=$((RECEIPT_FAILURES + 1))
done
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-135-receipt-failures',passed:$RECEIPT_FAILURES === 4,detail:'missing, malformed, unsupported, and fingerprint-inconsistent selected receipts each fail through the real Readiness CLI'}))"
```

## Step 5: Eligible pre-v1 migration establishes a new baseline

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role readiness-verdict)
L=$(node experiments_env/shared/new-disposable-bundle.mjs ready_legacy --case case-135 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role legacy-migration --path "$L"
mkdir -p "$L/artifacts" "$L/reference" "$L/seed_topics"
cp -R "$B/artifacts/." "$L/artifacts/"
cp -R "$B/seed_topics/." "$L/seed_topics/"
cp "$B/reference/_INDEX.md" "$L/reference/_INDEX.md"
cp "$B/rb_profile.yaml" "$L/rb_profile.yaml"
node --input-type=module - "$L" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { writeGateAttempt } from './DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import { selectWave1CarriedTargetReceipt } from './DEEP_RESEARCH_HARNESS/engine/helpers/wave-carried-target-receipts.mjs';
const bundle = process.argv[2];
const profile = parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8'));
const hitl2 = profile.human_decision_checkpoints.hitl2;
hitl2.status = 'recorded';
hitl2.user_decision = 'proceed_to_readiness';
hitl2.final_report_view = 'profile_default';
hitl2.rerun_count = 0;
delete hitl2.custom_slug;
delete hitl2.composition_handoff;
writeFileSync(`${bundle}/rb_profile.yaml`, stringify(profile));
const carriedTargetSelection = selectWave1CarriedTargetReceipt(bundle);
if (!carriedTargetSelection.ok) throw new Error(`Cannot create Wave1 legacy fixture receipt: ${carriedTargetSelection.findings.map((finding) => finding.detail).join('; ')}`);
const fixtures = [
  ['instantiation-complete', 'phases/phase-instantiation.md', 'phases/phase-hitl1.md'],
  ['hitl1-recorded', 'phases/phase-hitl1.md', 'phases/phase-setup.md'],
  ['setup-ready', 'phases/phase-setup.md', 'phases/phase-seed-topics.md'],
  ['seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md'],
  ['wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md'],
  ['wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md'],
  ['wave2-complete', 'phases/phase-wave2.md', 'phases/phase-hitl2.md'],
];
for (const [gate, currentNodeRef, next] of fixtures) {
  const result = { check: { gate, passed: true, currentNodeRef, next }, routing: { kind: 'next', next, detail: 'declared legacy predecessor fixture' }, inspect: [], advice: [] };
  if (gate === 'wave1-complete') {
    writeGateAttempt(bundle, result, { carriedTargetReceipt: carriedTargetSelection.receipt, strictTrace: true });
  } else {
    writeGateAttempt(bundle, result);
  }
}
JS
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$L" --node phases/phase-hitl2.md > "$L/case-135-legacy-enter-hitl2.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$L" --to wave2_complete > "$L/case-135-legacy-advance-wave2.json"
node --input-type=module - "$L" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
const bundle = process.argv[2];
createTrace(`${bundle}/rb_trace.jsonl`, { consoleEcho: false }).traceEntry('gate_attempt', {
  kind: 'gate_attempt',
  gate: 'hitl2-recorded',
  phase: 'hitl2',
  passed: true,
  currentNodeRef: 'phases/phase-hitl2.md',
  next: 'phases/phase-readiness.md',
  inspect_count: 0,
  advice_count: 0,
  fixture: 'historical_pre_v1_receiptless_predecessor',
});
JS
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$L" --node phases/phase-readiness.md > "$L/case-135-legacy-enter-readiness.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$L" --to hitl2_recorded > "$L/case-135-legacy-advance-hitl2.json"

cat > "$L/case-135-migration-input.yaml" <<'YAML'
final_report_view: profile_default
custom_slug: null
composition_handoff:
  contract_version: 1
  for_rerun_count: 0
  reader:
    description: "Operators verifying legacy migration."
    familiarity: working
  intended_use: "Inspect the post-migration Readiness baseline."
  primary_focus: "One explicit receipt-less predecessor migration."
  content_priorities:
    foreground: ["Migration baseline"]
    compress: ["Legacy setup detail"]
  delivery:
    language: en-US
    length: standard
    evidence_exposure: balanced
    appendix: as_needed
YAML
MIGRATION=$(node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs migrate-legacy --bundle "$L" --current-node phases/phase-readiness.md --input "$L/case-135-migration-input.yaml")
MIGRATION_VERDICT=$(printf '%s\n' "$MIGRATION" | node experiments_env/shared/extract-field.mjs verdict)
LEGACY_READY=$(node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle "$L" --current-node phases/phase-readiness.md)
LEGACY_READY_P=$(printf '%s\n' "$LEGACY_READY" | node experiments_env/shared/extract-field.mjs check.passed)
node --input-type=module - "$L" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
const bundle = process.argv[2];
const profile = parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8'));
profile.root_must_answer_set.push('Fixture-only post-migration context drift.');
writeFileSync(`${bundle}/rb_profile.yaml`, stringify(profile));
JS
set +e
POST_MIGRATION_DRIFT=$(node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle "$L" --current-node phases/phase-readiness.md)
POST_MIGRATION_STATUS=$?
set -e
POST_MIGRATION_CONTEXT=$(printf '%s\n' "$POST_MIGRATION_DRIFT" | grep -ci 'profile_context_drift' || true)
node --input-type=module - "$B" "$L" "$MIGRATION_VERDICT" "$LEGACY_READY_P" "$POST_MIGRATION_STATUS" "$POST_MIGRATION_CONTEXT" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const [verdictBundle, legacyBundle, migrationVerdict, readinessPassed, driftStatus, contextCount] = process.argv.slice(2);
const events = readFileSync(`${legacyBundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const migration = events.find((event) => event.event === 'composition_handoff_migration');
recordCheck(`${verdictBundle}/rb_trace.jsonl`, {
  gate: 'case-135-legacy-migration',
  passed: migrationVerdict === 'migrated' && readinessPassed === 'true' && driftStatus !== '0' && Number(contextCount) > 0
    && migration?.historical_context_equality === 'unproven'
    && /^[a-f0-9]{64}$/.test(migration?.composition_handoff_receipt?.profile_context_sha256 || ''),
  detail: 'one receipt-less predecessor migration establishes a post-commit context baseline; later unrelated drift fails Readiness',
});
JS
```

## Step 6: Native completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role readiness-verdict)
Q=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role missing-prior-gate)
P=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role corrupt-trace)
W=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role invalid-witness)
L=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role legacy-migration)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "readiness-verdict=$B" --bundle "missing-prior-gate=$Q" --bundle "corrupt-trace=$P" --bundle "invalid-witness=$W" --bundle "legacy-migration=$L"
```

## Step 7: 结果解读

> PASS 证明 Readiness 使用 selected HITL2 witness：matching profile 可进入 Final，projection-only drift 只能通过 exact restore 后重跑同一 Gate，v1 unrelated context drift 不允许 restore 且拒绝 operation 不改写 authority；missing/malformed/unsupported/fingerprint-inconsistent receipt 都直接 fail；一个 receipt-less legacy predecessor 只在 migration commit 后建立 context baseline，之后的 unrelated drift 仍 fail。The Supervisor health-checks only `readiness-verdict`; auxiliary bundles retain their real CLI evidence and不证明 human acceptance、legacy predecessor-era equality 或 Final quality。

---
schema: command-experiment/v1
experiment: wff-delivery
case: case-132-standard-hitl2-decision
weight: light
case_goal: "Prove the current HITL2 decision gate accepts five recorded actions only, fails direct defects, and does not require a phase-authored hitl2_recorded event."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-132_h2_dec_*
trace: dpt_disp_case-132_h2_dec_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

被测结果只来自真实 `check-gate-hitl2-recorded.mjs`。Wave2 pass 是声明的 direct-predecessor fixture；合法 entry 由真实 `enter-phase` 与 `advance-status` 建立。负例先执行，最终 happy path 最后执行，避免已经产生的 HITL2 deterministic handoff 反向污染 same-entry 边界测试。

# case-132-standard-hitl2-decision

## Step 1: 创建合法 HITL2 entry fixture

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs h2_dec --case case-132 --force)
mkdir -p "$B/artifacts/hitl2"

cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: h2_dec
research_profile: quick_factual
root_must_answer_set:
  - "Does HITL2 reject invalid recorded decisions?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/case-132-fixture"
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
writeGateAttempt(bundle, {
  check: { gate: 'wave2-complete', passed: true, currentNodeRef: 'phases/phase-wave2.md', next: 'phases/phase-hitl2.md' },
  routing: { kind: 'next', next: 'phases/phase-hitl2.md', detail: 'declared direct-predecessor fixture' },
  inspect: [], advice: [],
});
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-132-enter-hitl2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-132-advance-wave2.json"
```

## Step 2: Direct negative cases

```bash
run_hitl2() {
  node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md 2>/dev/null || true
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
```

## Step 3: Happy path without phase-authored diagnostic event

```bash
set_decision proceed_to_readiness
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
const gateAttempt = events.some((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded' && event.passed === true && event.next === 'phases/phase-readiness.md');
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-132-valid-proceed',
  passed: passed === 'true' && next === 'phases/phase-readiness.md' && phaseDiagnosticAbsent && gateAttempt,
  detail: 'valid proceed passes; phase diagnostic event absent; CLI gate_attempt present',
});
JS
```

## Step 4: Trace verdict

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
```

## Step 5: 结果解读

> PASS 证明 brief 缺失/空、`not_started`、非法 decision 都直接 fail；有效 `proceed_to_readiness` 返回 readiness handoff。没有 Phase Agent 的 `hitl2_recorded` diagnostic event 不会阻塞 gate，但 CLI 仍写 authoritative `gate_attempt`。

## Step HH: Post-Execution Health

```bash
set +e
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile standard --json > "$B/case-132-health.json"
HEALTH_EXIT=$?
set -e
node --input-type=module - "$B/case-132-health.json" "$HEALTH_EXIT" <<'JS'
import { readFileSync } from 'node:fs';
const [path, exitCode] = process.argv.slice(2);
const report = JSON.parse(readFileSync(path, 'utf8'));
const expectedOnly = report.issues.length > 0 && report.issues.every((issue) => issue.section === 'gate_attempts');
if (!(Number(exitCode) === 0 || expectedOnly)) process.exit(1);
console.log(expectedOnly ? 'HEALTH ISSUES: expected HITL2 negative-case artifacts only' : 'HEALTH CLEAN');
JS
```

## Cleanup

> Safe cleanup exception：当 verdict PASS 且 health issues 仅来自本 case 有意制造的 failed HITL2 wrapper artifacts 时可清理；任何非预期 schema/trace/timeline issue 均保留 bundle。

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-132'}))"
```

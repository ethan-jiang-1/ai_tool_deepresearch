---
schema: command-experiment/v1
experiment: wff-delivery
case: case-135-standard-readiness-precheck
weight: light
case_goal: "Prove readiness passes complete legal input and directly rejects missing artifacts, missing prior gate evidence, invalid YAML, and corrupt JSONL."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-135_ready_*
trace: dpt_disp_case-135_ready_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

被测 readiness verdict 全部来自真实 CLI。主 bundle 在一个合法 readiness entry 中依次验证可修复 direct defects，最后 pass；corrupt-JSONL 使用独立 auxiliary bundle，因为损坏 verdict trace 本身后不能再安全追加 case check。主 bundle trace 聚合该真实 auxiliary CLI 的退出码与诊断。

# case-135-standard-readiness-precheck

## Step 1: 创建主 bundle 并建立合法 readiness entry

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs ready --case case-135 --force)
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
  result_url: "https://example.com/case-135-fixture"
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
  ['instantiation-complete', 'phases/phase-instantiation.md', 'phases/phase-hitl1.md'],
  ['hitl1-recorded', 'phases/phase-hitl1.md', 'phases/phase-setup.md'],
  ['setup-ready', 'phases/phase-setup.md', 'phases/phase-seed-topics.md'],
  ['seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md'],
  ['wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md'],
  ['wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md'],
  ['wave2-complete', 'phases/phase-wave2.md', 'phases/phase-hitl2.md'],
];
for (const [gate, currentNodeRef, next] of fixtures) {
  writeGateAttempt(bundle, { check: { gate, passed: true, currentNodeRef, next }, routing: { kind: 'next', next, detail: 'declared direct-predecessor fixture' }, inspect: [], advice: [] });
}
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-135-enter-hitl2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-135-advance-wave2.json"
HITL2=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md)
HITL2_NEXT=$(printf '%s\n' "$HITL2" | node experiments_env/shared/extract-field.mjs check.next)
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$HITL2_NEXT" > "$B/case-135-enter-readiness.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-135-advance-hitl2.json"
```

## Step 2: 主 bundle direct negative cases 与最终 pass

```bash
run_ready() {
  node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md 2>/dev/null || true
}

rm "$B/artifacts/wave2/synthesis.md"
OUT=$(run_ready)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
I=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs inspect.0)
OK=false; [ "$P" = "false" ] && printf '%s' "$I" | grep -q 'synthesis' && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-135-missing-artifact',passed:$OK,detail:'missing synthesis fails directly'}))"
printf '# Synthesis\nRepaired.\n' > "$B/artifacts/wave2/synthesis.md"

Q=$(node experiments_env/shared/new-disposable-bundle.mjs ready_missing_prior --case case-135 --force)
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
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$Q" --gate readiness-passed -- node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle "$Q" --current-node phases/phase-readiness.md 2>/dev/null)
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

OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
OK=false; [ "$P" = "true" ] && [ "$N" = "phases/phase-final.md" ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-135-complete-input',passed:$OK,detail:'complete readiness input passes to final'}))"
```

## Step 3: Auxiliary corrupt JSONL probe

```bash
P=$(node experiments_env/shared/new-disposable-bundle.mjs ready_corrupt --case case-135 --force)
cp "$B/rb_profile.yaml" "$P/rb_profile.yaml"
mkdir -p "$P/artifacts/hitl2" "$P/artifacts/wave2" "$P/seed_topics"
printf '# Topic A\n' > "$P/seed_topics/topic-a.md"
printf '# Reference Index\n' > "$P/reference/_INDEX.md"
printf '# Synthesis\nReady.\n' > "$P/artifacts/wave2/synthesis.md"
printf '# Decision Brief\nProceed.\n' > "$P/artifacts/hitl2/decision-brief.md"
printf 'not-json\n' >> "$P/rb_trace.jsonl"
set +e
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$P" --gate readiness-passed -- node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle "$P" --current-node phases/phase-readiness.md 2>/dev/null)
STATUS=$?
set -e
HAS=$(printf '%s\n' "$OUT" | grep -ci 'not valid JSON\|unparseable' || true)
OK=false; [ "$STATUS" -ne 0 ] && [ "$HAS" -gt 0 ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-135-corrupt-jsonl',passed:$OK,detail:'auxiliary real readiness CLI rejects corrupt trace JSONL'}))"
```

## Step 4: Trace verdict

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
```

## Step 5: 结果解读

> PASS 证明 readiness 使用 manifest-derived prior gate evidence，并对 missing artifact、missing prior pass、invalid YAML、corrupt JSONL 给出直接失败；完整 legal entry 返回 `phases/phase-final.md`。

## Step HH: Post-Execution Health

```bash
set +e
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile standard --json > "$B/case-135-health.json"
HEALTH_EXIT=$?
set -e
node --input-type=module - "$B/case-135-health.json" "$HEALTH_EXIT" <<'JS'
import { readFileSync } from 'node:fs';
const [path, exitCode] = process.argv.slice(2);
const report = JSON.parse(readFileSync(path, 'utf8'));
const expectedOnly = report.issues.length > 0 && report.issues.every((issue) => issue.section === 'gate_attempts');
if (!(Number(exitCode) === 0 || expectedOnly)) process.exit(1);
console.log(expectedOnly ? 'HEALTH ISSUES: expected readiness negative-case artifacts only' : 'HEALTH CLEAN');
JS
```

> Auxiliary `$P` 故意损坏 JSONL，不参与 health-clean 声明；它只证明 fail-closed diagnostic。主 bundle health 决定 cleanup。

## Cleanup

> Safe cleanup exception：主 verdict PASS 且 health issues 仅来自本 case 有意制造的 failed readiness artifacts 时，可清理主 bundle 与故意损坏的 auxiliary probe；其他 issue 保留现场。

```bash
rm -rf "$P" "$Q"
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-135'}))"
```

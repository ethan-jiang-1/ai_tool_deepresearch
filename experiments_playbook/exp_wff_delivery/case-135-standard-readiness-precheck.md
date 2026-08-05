---
schema: command-experiment/v2
experiment: wff-delivery
case: case-135-standard-readiness-precheck
case_goal: "Prove readiness passes complete legal input and directly rejects missing artifacts, missing prior gate evidence, invalid YAML, and corrupt JSONL."
verdict_mode: all
required_checks: [case-135-complete-input, case-135-corrupt-jsonl, case-135-invalid-yaml, case-135-missing-artifact, case-135-missing-prior-gate]
bundle_roles: [readiness-verdict, missing-prior-gate, corrupt-trace]
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

## Execution Contract

被测 readiness verdict 全部来自真实 CLI。主 bundle 在一个合法 readiness entry 中依次验证可修复 direct defects，最后 pass；corrupt-JSONL 使用独立 auxiliary bundle，因为损坏 verdict trace 本身后不能再安全追加 case check。主 bundle trace 聚合该真实 auxiliary CLI 的退出码与诊断。

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
import { writeGateAttempt } from './DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
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

## Step 4: Native completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role readiness-verdict)
Q=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role missing-prior-gate)
P=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role corrupt-trace)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "readiness-verdict=$B" --bundle "missing-prior-gate=$Q" --bundle "corrupt-trace=$P"
```

## Step 5: 结果解读

> PASS 证明 readiness 使用 manifest-derived prior gate evidence，并对 missing artifact、missing prior pass、invalid YAML、corrupt JSONL 给出直接失败；完整 legal entry 返回 `phases/phase-final.md`。The Supervisor health-checks only `readiness-verdict`; the malformed `corrupt-trace` auxiliary remains raw-byte bound and is never silently discarded.

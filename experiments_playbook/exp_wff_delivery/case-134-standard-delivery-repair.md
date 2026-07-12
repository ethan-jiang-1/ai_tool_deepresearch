---
schema: command-experiment/v1
experiment: wff-delivery
case: case-134-standard-delivery-repair
weight: light
case_goal: "Prove HITL2 and readiness repair return to the same real gate, preserving the legal predecessor window until each gate passes."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-134_dlv_repair_*
trace: dpt_disp_case-134_dlv_repair_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

每个 repair 只修 direct failing fact，然后重跑同一真实 gate。负例的 case-specific `check` 使用 `expected:false` 记录实际 gate false；最终 verdict 同时要求 fail 与 pass attempt 都来自 CLI-authored trace。

# case-134-standard-delivery-repair

## Step 1: 创建 fixture 并建立合法 HITL2 入口

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs dlv_repair --case case-134 --force)
mkdir -p "$B/artifacts/hitl2" "$B/artifacts/wave2" "$B/seed_topics"
printf '# Topic A\n' > "$B/seed_topics/topic-a.md"
printf '# Reference Index\n' > "$B/reference/_INDEX.md"

cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: dlv_repair
research_profile: quick_factual
root_must_answer_set:
  - "Does repair return to the same delivery checkpoint?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/case-134-fixture"
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
    rationale: "Repair the direct delivery defect, then continue."
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
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-134-enter-hitl2.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-134-advance-wave2.json"
```

## Step 2: HITL2 fail → repair brief → rerun same gate → pass

```bash
rm -f "$B/artifacts/hitl2/decision-brief.md"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md 2>/dev/null || true)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
I=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs inspect.0)
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-134-hitl2-before-repair',passed:$P,expected:false,detail:'missing decision brief rejected by real HITL2 gate'}))"

printf '# Decision Brief\nRepaired current delivery brief.\n' > "$B/artifacts/hitl2/decision-brief.md"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
OK=false; [ "$P" = "true" ] && [ "$N" = "phases/phase-readiness.md" ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-134-hitl2-after-repair',passed:$OK,detail:'same HITL2 gate passes after brief repair'}))"

node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$N" > "$B/case-134-enter-readiness.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-134-advance-hitl2.json"
```

## Step 3: readiness fail → repair synthesis → rerun same gate → pass

```bash
rm -f "$B/artifacts/wave2/synthesis.md"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md 2>/dev/null || true)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
I=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs inspect.0)
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-134-readiness-before-repair',passed:$P,expected:false,detail:'missing synthesis rejected by real readiness gate'}))"

printf '# Synthesis\nRepaired delivery synthesis.\n' > "$B/artifacts/wave2/synthesis.md"
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md)
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
OK=false; [ "$P" = "true" ] && [ "$N" = "phases/phase-final.md" ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-134-readiness-after-repair',passed:$OK,detail:'same readiness gate passes after synthesis repair'}))"

node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle = process.argv[2];
const events = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const attempts = (gate) => events.filter((event) => event.event === 'gate_attempt' && event.gate === gate).map((event) => event.passed);
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-134-real-attempt-pairs',
  passed: attempts('hitl2-recorded').includes(false) && attempts('hitl2-recorded').includes(true) && attempts('readiness-passed').includes(false) && attempts('readiness-passed').includes(true),
  detail: 'CLI-authored fail/pass attempts exist for both same-check repair loops',
});
JS
```

## Step 4: Trace verdict

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
```

## Step 5: 结果解读

> PASS 证明两次修复都回到原 gate：HITL2 只补 decision brief，readiness 只补 synthesis；合法 predecessor window 在 failed attempt 后仍保留，真实 fail/pass `gate_attempt` 成对存在。

## Step HH: Post-Execution Health

```bash
set +e
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile standard --json > "$B/case-134-health.json"
HEALTH_EXIT=$?
set -e
node --input-type=module - "$B/case-134-health.json" "$HEALTH_EXIT" <<'JS'
import { readFileSync } from 'node:fs';
const [path, exitCode] = process.argv.slice(2);
const report = JSON.parse(readFileSync(path, 'utf8'));
const expectedOnly = report.issues.length > 0 && report.issues.every((issue) => issue.section === 'gate_attempts');
if (!(Number(exitCode) === 0 || expectedOnly)) process.exit(1);
console.log(expectedOnly ? 'HEALTH ISSUES: expected fail-before-repair artifacts only' : 'HEALTH CLEAN');
JS
```

> intentional failed attempts 可能产生 expected negative-case health issue；上面的检查只接受 `gate_attempts` section，其他 health issue 仍阻止 cleanup。

## Cleanup

> Safe cleanup exception：当 verdict PASS 且 health issues 仅对应本 case 有意制造的两次 failed gate artifacts 时可清理；其他 issue 保留现场。

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-134'}))"
```

---
schema: command-experiment/v2
experiment: wff-delivery
case: case-131-standard-delivery-full-chain
case_goal: "Prove the delivery tail with real HITL2/readiness gate output, route-bound entry, source-gate status sync, and terminal Final semantics."
verdict_mode: all
required_checks: [case-131-final-terminal, case-131-hitl2-route, case-131-readiness-route]
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

由 coding agent 在真实 disposable bundle 中逐 step 执行。Wave2 及更早 gate pass 是明确声明的 direct-predecessor fixture，并通过 production gate writer 写入；被测 HITL2/readiness gate 必须来自真实 CLI，后续 handoff 必须经过 `enter-phase` 与 source-gate `advance-status`。

# case-131-standard-delivery-full-chain

## Reality Distance Ledger

| 维度 | 声明 |
|---|---|
| Runtime context | `new-disposable-bundle.mjs` 创建的真实 bundle |
| Fixture boundary | readiness 所需的 Wave2 及更早 passed gate facts；不证明这些前序 gate 的内容工作 |
| Production boundary | real HITL2/readiness gate CLI、`enter-phase`、`advance-status`、trace/log writer |
| Verdict source | `rb_trace.jsonl` 中 case-specific `check` events |

## Step 1: 创建 delivery fixture 并建立合法 HITL2 入口

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs dlv_chain --case case-131 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"

cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: dlv_chain
research_profile: quick_factual
root_must_answer_set:
  - "Does the delivery tail preserve deterministic handoffs?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/case-131-fixture"
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
    rationale: "Proceed through readiness to final delivery."
YAML

mkdir -p "$B/artifacts/hitl2" "$B/artifacts/wave2" "$B/seed_topics"
printf '# Topic A\n' > "$B/seed_topics/topic-a.md"
printf '# Reference Index\n' > "$B/reference/_INDEX.md"
printf '# Synthesis\nDelivery evidence is ready.\n' > "$B/artifacts/wave2/synthesis.md"
printf '# Decision Brief\nProceed to readiness.\n' > "$B/artifacts/hitl2/decision-brief.md"

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
  writeGateAttempt(bundle, {
    check: { gate, passed: true, currentNodeRef, next },
    routing: { kind: 'next', next, detail: 'declared direct-predecessor fixture' },
    inspect: [], advice: [],
  });
}
JS

node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-131-enter-hitl2.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-131-advance-wave2.json"
echo "BUNDLE=$B"
```

## Step 2: 运行真实 HITL2 gate 并进入 readiness

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
HITL2_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md)
printf '%s\n' "$HITL2_OUTPUT" > "$B/case-131-hitl2.json"
HITL2_PASSED=$(printf '%s\n' "$HITL2_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
HITL2_NEXT=$(printf '%s\n' "$HITL2_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
HITL2_OK=false
[ "$HITL2_PASSED" = "true" ] && [ "$HITL2_NEXT" = "phases/phase-readiness.md" ] && HITL2_OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-131-hitl2-route',passed:$HITL2_OK,detail:'real HITL2 output selects readiness'}))"

node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node "$HITL2_NEXT" > "$B/case-131-enter-readiness.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-131-advance-hitl2.json"
```

## Step 3: 运行真实 readiness gate 并进入 terminal Final

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
READY_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate readiness-passed -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs --bundle "$B" --current-node phases/phase-readiness.md)
printf '%s\n' "$READY_OUTPUT" > "$B/case-131-readiness.json"
READY_PASSED=$(printf '%s\n' "$READY_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
READY_NEXT=$(printf '%s\n' "$READY_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
READY_OK=false
[ "$READY_PASSED" = "true" ] && [ "$READY_NEXT" = "phases/phase-final.md" ] && READY_OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-131-readiness-route',passed:$READY_OK,detail:'real readiness output selects final'}))"

node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node "$READY_NEXT" > "$B/case-131-enter-final.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to readiness_passed > "$B/case-131-advance-readiness.json"

node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle = process.argv[2];
const manifest = JSON.parse(readFileSync('./DEEP_RESEARCH_HARNESS/workflows/manifest.json', 'utf8'));
const chain = JSON.parse(readFileSync('./DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json', 'utf8'));
const status = JSON.parse(readFileSync(`${bundle}/rb_status.json`, 'utf8'));
const final = manifest.phases.find((phase) => phase.node === 'phases/phase-final.md');
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-131-final-terminal',
  passed: final?.gate === null && !chain['phases/phase-final.md'] && status.current_gate === 'readiness_passed' && status.next_gate === 'none' && status.current_node === 'phases/phase-final.md',
  detail: 'Final has gate:null, no outgoing chain edge, and witnessed terminal status',
});
JS
```

## Step 4: Trace verdict

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 5: 结果解读

> PASS 证明真实 HITL2 与 readiness 输出分别授权 readiness 与 Final；两次 target entry 都由 route-bound `load_complete` 见证，status 由 source-gate `advance-status` 同步。Final 的 `gate:null` 与无 outgoing transition 证明 terminal semantics。

Stop after native completion. The Autorun Supervisor owns Standard health, audit, preservation, and optional clean-PASS cleanup.

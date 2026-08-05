---
schema: command-experiment/v2
experiment: wff-delivery
case: case-133-standard-hitl2-rerun
case_goal: "Prove real HITL2 rerun output selects phase-rerun and the accepted handoff/status path reaches rerun-ready then seed-topics."
verdict_mode: last
required_checks: [case-133-hitl2-rerun-route, case-133-rerun-ready-route, case-133-witnessed-rerun-chain, wave2-complete]
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

被测 HITL2 与 rerun-ready verdict 必须来自真实 gate CLI。Playbook 不允许把 `rerun` 改写成 readiness，也不允许从 instantiation 重启；它必须消费 `check.next: phases/phase-rerun.md`，再通过 route-bound `enter-phase` 与 source-gate `advance-status` 推进。

# case-133-standard-hitl2-rerun

## Step 1: 创建 fixture 并建立合法 HITL2 入口

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs h2_rerun --case case-133 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
mkdir -p "$B/artifacts/hitl2"
printf '# Decision Brief\nRerun with refined scope.\n' > "$B/artifacts/hitl2/decision-brief.md"

cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: h2_rerun
research_profile: quick_factual
root_must_answer_set:
  - "Does rerun use its deterministic branch?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/case-133-fixture"
  fetch_outcome: success
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
    rationale: "Add a focused economic-impact topic before delivery."
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
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node phases/phase-hitl2.md > "$B/case-133-enter-hitl2.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to wave2_complete > "$B/case-133-advance-wave2.json"
```

## Step 2: 真实 HITL2 rerun gate 与 rerun entry

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl2-recorded -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md)
printf '%s\n' "$OUT" > "$B/case-133-hitl2.json"
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
K=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs routing.kind)
OK=false
[ "$P" = "true" ] && [ "$N" = "phases/phase-rerun.md" ] && [ "$K" = "next" ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-133-hitl2-rerun-route',passed:$OK,detail:'real HITL2 output selects phase-rerun'}))"

node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node "$N" > "$B/case-133-enter-rerun.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-133-advance-hitl2.json"
```

## Step 3: 真实 rerun-ready gate 与 seed-topics handoff

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
OUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate rerun-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-rerun-ready.mjs --bundle "$B" --current-node phases/phase-rerun.md)
printf '%s\n' "$OUT" > "$B/case-133-rerun-ready.json"
P=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.passed)
N=$(printf '%s\n' "$OUT" | node experiments_env/shared/extract-field.mjs check.next)
OK=false
[ "$P" = "true" ] && [ "$N" = "phases/phase-seed-topics.md" ] && OK=true
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'case-133-rerun-ready-route',passed:$OK,detail:'rerun-ready selects seed-topics'}))"

node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node "$N" > "$B/case-133-enter-seed-topics.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to rerun_ready > "$B/case-133-advance-rerun.json"

node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle = process.argv[2];
const status = JSON.parse(readFileSync(`${bundle}/rb_status.json`, 'utf8'));
const events = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const hitl2Witness = events.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-rerun.md' && event.handoff_source_gate === 'hitl2-recorded');
const rerunWitness = events.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-seed-topics.md' && event.handoff_source_gate === 'rerun-ready');
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-133-witnessed-rerun-chain',
  passed: hitl2Witness && rerunWitness && status.current_gate === 'rerun_ready' && status.next_gate === 'seed_topics_ready' && status.current_node === 'phases/phase-seed-topics.md',
  detail: 'both deterministic rerun handoffs are witnessed and status-synchronized',
});
JS
```

## Step 4: Trace verdict

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 5: 结果解读

> PASS 证明 `rerun` 由真实 HITL2 gate 直接路由到 `phase-rerun`，不是 Agent override 或 instantiation restart；rerun-ready 随后真实路由到 seed-topics，两条 entry/status witness 均存在。

Stop after native completion. The Autorun Supervisor owns Standard health, audit, preservation, and optional clean-PASS cleanup.

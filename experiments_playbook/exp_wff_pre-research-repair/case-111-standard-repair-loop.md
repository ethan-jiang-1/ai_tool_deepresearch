---
schema: command-experiment/v2
experiment: wff-pre-research-repair
case: case-111-standard-repair-loop
case_goal: Prove the visible HITL1 gate fail, feedback-driven profile repair, and same-gate pass loop.
verdict_mode: last
required_checks: [hitl1-recorded, real-attempt-pair]
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

<!-- @impl EXA-005, EXA-006, PLR-003 -->

# case-111-standard-repair-loop

This case keeps the PDCA loop visible in Markdown: run the real gate against the default incomplete profile, read its inspect/advice, make the smallest fixture-backed repair, rerun the same gate, and finalize with native `last` semantics.

## Step 1: Create and register the verdict bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_repair --case case-111 --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
```

## Step 2: Run HITL1 gate against the default profile and consume feedback

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl1-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle "$B" --current-node phases/phase-hitl1.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node --input-type=module - "$B" "$PASSED" <<'JS'
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
recordCheck(`${process.argv[2]}/rb_trace.jsonl`, { gate: 'hitl1-recorded', passed: process.argv[3] === 'true', expected: false, detail: 'default profile must fail before repair' });
JS
```

Read the returned `inspect` and `advice`. Confirm that the direct blockers are the unselected profile, empty must-answer set, unrecorded HITL1 decision, and unprobed research access.

## Step 3: Apply the smallest declared fixture repair

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: wff_repair
research_profile: quick_factual
root_must_answer_set:
  - What are the key risks in AI development?
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/deterministic-hitl1-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T12:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
YAML
```

This setup-only observation proves gate repair mechanics; it does not claim real external research access.

## Step 4: Rerun the same gate and record the real attempt pair

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl1-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle "$B" --current-node phases/phase-hitl1.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node --input-type=module - "$B" "$PASSED" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle = process.argv[2];
recordCheck(`${bundle}/rb_trace.jsonl`, { gate: 'hitl1-recorded', passed: process.argv[3] === 'true', expected: true, detail: 'same gate after the declared repair' });
const events = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const attempts = events.filter((event) => event.event === 'gate_attempt' && event.gate === 'hitl1-recorded');
recordCheck(`${bundle}/rb_trace.jsonl`, { gate: 'real-attempt-pair', passed: attempts.some((event) => event.passed === false) && attempts.some((event) => event.passed === true), expected: true, detail: `${attempts.length} real gate attempts` });
JS
```

## Step 5: Publish native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

The finalizer applies `last` per gate: the repaired `hitl1-recorded` row is considered, while `real-attempt-pair` proves that the fail/pass history was genuine. Stop before health or cleanup.

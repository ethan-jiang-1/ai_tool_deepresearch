---
schema: command-experiment/v2
experiment: wff-pre-research-repair
case: case-112-standard-fault-tolerance
case_goal: Prove malformed-state and missing-bundle gate failures remain structured, while a multi-rule failure is repaired and passes the same gate.
verdict_mode: last
required_checks: [setup-ready, bad-json-fails-cleanly, multi-rule-fail-repair-pair, missing-bundle-fails-cleanly]
bundle_roles: [bad-json, repair-verdict]
verdict_role: repair-verdict
health_roles: [repair-verdict]
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

# case-112-standard-fault-tolerance

The `bad-json` auxiliary retains the malformed-state site but is not a health target. Stable fault facts are aggregated as strict checks in the healthy `repair-verdict` trace, which owns native outcome.

## Step 1: Create and register both bundles

```bash
BAD=$(node experiments_env/shared/new-disposable-bundle.mjs wff_fault_bad_json --case case-112 --target-dir {{CASE_RUN_ROOT_SH}})
VERDICT=$(node experiments_env/shared/new-disposable-bundle.mjs wff_fault_repair --case case-112 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role bad-json --path "$BAD"
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role repair-verdict --path "$VERDICT"
```

## Step 2: Malformed JSON returns structured failure without becoming verdict authority

```bash
BAD=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role bad-json)
VERDICT=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role repair-verdict)
echo 'this is not valid json {{{' > "$BAD/rb_status.json"
OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$BAD" --gate setup-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle "$BAD" --current-node phases/phase-setup.md || true)
echo "$OUTPUT"
node --input-type=module - "$VERDICT" "$OUTPUT" <<'JS'
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const parsed = JSON.parse(process.argv[3]);
recordCheck(`${process.argv[2]}/rb_trace.jsonl`, {
  gate: 'bad-json-fails-cleanly', passed: parsed.check?.passed === false && Array.isArray(parsed.inspect) && parsed.inspect.length > 0,
  expected: true, detail: JSON.stringify(parsed.inspect),
});
JS
```

## Step 3: Produce the multi-rule failure in the verdict bundle

```bash
VERDICT=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role repair-verdict)
rm "$VERDICT/rb_plan.md"
rm -rf "$VERDICT/final"
OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$VERDICT" --gate setup-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle "$VERDICT" --current-node phases/phase-setup.md || true)
echo "$OUTPUT"
PASSED=$(echo "$OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node --input-type=module - "$VERDICT" "$PASSED" <<'JS'
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
recordCheck(`${process.argv[2]}/rb_trace.jsonl`, { gate: 'setup-ready', passed: process.argv[3] === 'true', expected: false, detail: 'missing rb_plan.md and final directory' });
JS
```

Read the inspect/advice and repair only the named missing surfaces:

```bash
VERDICT=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role repair-verdict)
cat > "$VERDICT/rb_plan.md" <<'PLAN'
---
{"plan_basename":"wff_fault_repair","derived_topic_count":0,"topic_registry":[]}
---
# Deep Research Plan: wff_fault_repair
PLAN
mkdir -p "$VERDICT/final"
cat > "$VERDICT/rb_profile.yaml" <<'PROFILE'
plan_basename: wff_fault_repair
research_profile: quick_factual
root_must_answer_set: ["Test question"]
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/case-112-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1: {status: recorded, recorded_at: "2026-06-21T12:00:00.000Z"}
  hitl2: {status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started}
PROFILE
cat > "$VERDICT/rb_status.json" <<'STATUS'
{"current_mode":"execution","state":"in_progress","current_gate":"setup_ready","next_gate":"seed_topics_ready","current_node":"phases/phase-setup.md"}
STATUS
```

## Step 4: Rerun the same gate and bind the repair pair

```bash
VERDICT=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role repair-verdict)
OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$VERDICT" --gate setup-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle "$VERDICT" --current-node phases/phase-setup.md || true)
echo "$OUTPUT"
PASSED=$(echo "$OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node --input-type=module - "$VERDICT" "$PASSED" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle = process.argv[2];
recordCheck(`${bundle}/rb_trace.jsonl`, { gate: 'setup-ready', passed: process.argv[3] === 'true', expected: true, detail: 'same gate after repair' });
const events = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const attempts = events.filter((event) => event.event === 'gate_attempt' && event.gate === 'setup-ready');
recordCheck(`${bundle}/rb_trace.jsonl`, { gate: 'multi-rule-fail-repair-pair', passed: attempts.some((event) => event.passed === false) && attempts.some((event) => event.passed === true), expected: true, detail: `${attempts.length} setup-ready attempts` });
JS
```

## Step 5: Missing bundle failure stays structured

```bash
VERDICT=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role repair-verdict)
MISSING=$(node -e "const p=require('node:path'); console.log(p.join(process.argv[1],'dpt_disp_missing_bundle'))" {{CASE_RUN_ROOT_SH}})
OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$VERDICT" --gate instantiation-complete -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-instantiation-complete.mjs --bundle "$MISSING" --current-node phases/phase-instantiation.md || true)
echo "$OUTPUT"
node --input-type=module - "$VERDICT" "$OUTPUT" <<'JS'
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const parsed = JSON.parse(process.argv[3]);
recordCheck(`${process.argv[2]}/rb_trace.jsonl`, { gate: 'missing-bundle-fails-cleanly', passed: parsed.check?.passed === false && Array.isArray(parsed.inspect) && parsed.inspect.length > 0, expected: true, detail: JSON.stringify(parsed.inspect) });
JS
```

## Step 6: Publish native completion

```bash
BAD=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role bad-json)
VERDICT=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role repair-verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "bad-json=$BAD" --bundle "repair-verdict=$VERDICT"
```

Stop after native completion. The Supervisor health-checks only `repair-verdict`; both bundles remain declared and auditable.

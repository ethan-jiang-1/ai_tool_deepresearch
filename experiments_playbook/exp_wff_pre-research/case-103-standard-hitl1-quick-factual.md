---
schema: command-experiment/v2
experiment: wff-pre-research
case: case-103-standard-hitl1-quick-factual
case_goal: "Prove the HITL1 gate accepts a complete quick_factual profile and routes to Setup."
verdict_mode: all
required_checks: [profile-quick-factual, hitl1-recorded]
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

# Case 103 - Quick-Factual HITL1

## Execution Contract

This deterministic fixture case proves profile and Gate mechanics only. Its synthetic `research_access` observation is not real search/fetch or Subject Agent evidence.

## Step 1 - Create and register the bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_qf --case case-103 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
```

## Step 2 - Write the fixed profile and run the real Gate

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: wff_qf
research_profile: quick_factual
root_must_answer_set:
  - "What are the key differences in AI regulation between the EU, US, and China?"
  - "Which regulatory approach has the strongest enforcement mechanism?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/deterministic-hitl1-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1: { status: recorded, recorded_at: "2026-06-21T15:00:00.000Z" }
  hitl2: { status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started }
YAML
GATE=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl1-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle "$B" --current-node phases/phase-hitl1.md)
printf '%s\n' "$GATE" > "$B/case-103-gate.json"
```

## Step 3 - Record strict checks and finalize

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs'; import { join } from 'node:path'; import { parse as parseYaml } from 'yaml';
const [bundle] = process.argv.slice(2); const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'))); const gate = JSON.parse(readFileSync(join(bundle, 'case-103-gate.json')));
const checks = [['profile-quick-factual', profile.research_profile === 'quick_factual' && profile.root_must_answer_set.length === 2], ['hitl1-recorded', gate.check?.passed === true && gate.check?.next === 'phases/phase-setup.md']];
for (const [id, passed] of checks) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts:new Date().toISOString(), event:'check', source:'playbook', gate:id, passed, expected:true })}\n`); if (checks.some(([,passed]) => !passed)) process.exit(1);
JS
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Standard health, audit, preservation, and optional clean-PASS cleanup.

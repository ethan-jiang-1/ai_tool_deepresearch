---
schema: command-experiment/v2
experiment: autonomous-research-hardening
case: case-603-standard-surfacing-intent-abort
case_goal: "BUG-043: non-terminal stop:no would-have-surfaced moment records surfacing_intent and aborts user-facing surfacing."
verdict_mode: all
required_checks: [surfacing-intent-diagnostic-only, surfacing-intent-event-shape, surfacing-intent-log-visible]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: SWE-005
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

Standard silent-execution observability playbook. This does not claim deterministic interception of all chat output. It proves the accepted trace/log path and checks that the event is diagnostic-only, not authorization.

# case-603-standard-surfacing-intent-abort

## Step 1: Create Bundle And Log Intent

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs arh_surfacing --case case-603 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --surfacing-intent --node phases/phase-wave1.md --intent-type progress_report --reason "would report repeated gate failures to the user"
echo "BUNDLE=$B"
```

## Step 2: Validate Trace Shape

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const bundle = process.argv[2];
const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
const log = readFileSync(join(bundle, '_logs/run.log'), 'utf8');
const event = trace.find((entry) => entry.event === 'surfacing_intent');
recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'surfacing-intent-event-shape',
  passed: event?.node === 'phases/phase-wave1.md' && event.intent_type === 'progress_report' && event.action === 'abort_user_facing_surfacing',
  detail: JSON.stringify(event || {})
});
recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'surfacing-intent-diagnostic-only',
  passed: event?.authority_status === 'diagnostic_only' && !('handoff_authorized' in event) && !('hitl_authorized' in event),
  detail: JSON.stringify(event || {})
});
recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'surfacing-intent-log-visible',
  passed: /surfacing_intent/.test(log) && /diagnostic_only/.test(log),
  detail: 'run.log contains diagnostic event'
});
JS
```

## Step 3: Verdict

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.

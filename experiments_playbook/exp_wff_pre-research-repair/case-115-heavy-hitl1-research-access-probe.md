---
schema: command-experiment/v2
experiment: wff-pre-research-repair
case: case-115-heavy-hitl1-research-access-probe
case_goal: "An independent real Subject Agent performs one bounded dynamic HITL1 search/fetch probe, records research_access, and reaches the honest available-pass or unavailable-fail-closed Gate branch."
verdict_mode: all
required_checks: [hitl1-research-access-probe, probe-evidence-boundary]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: SCO-002, PRP-002, PRP-005, PRG-002
not_run_if: "The independent authenticated Subject Agent runtime is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003 -->

# Case 115 - Independent HITL1 Research-Access Probe

## Execution Contract

The Playbook Agent prepares fixed HITL1 choices at a legal HITL1 entry. Only the independent Subject Agent may perform the actual search/fetch probe, write `rb_profile.yaml#/research_access`, run the HITL1 Gate, and consume an available-branch handoff. The Playbook Agent must not run the probe itself or fabricate an available/unavailable observation.

Both honest Subject branches satisfy the actor claim: available means one dynamic search, one fetch of the first usable HTTP(S) result, profile `available`, Gate pass and Setup handoff; unavailable means the attempted tool is missing/blocked/fails or returns no usable URL, profile `unavailable`, Gate fail and no Setup handoff. Probe bytes must not enter research evidence surfaces.

## Step 1 - Prepare and register legal HITL1 setup

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs research_access --case case-115 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: research_access
research_profile: quick_factual
root_must_answer_set:
  - "Can the current Subject Agent perform real search and fetch before silent waves?"
research_access:
  status: unprobed
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-07-10T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
YAML
node DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle "$B" --style quick_factual
GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle "$B" --current-node phases/phase-instantiation.md)
NEXT=$(printf '%s' "$GATE" | node experiments_env/shared/extract-field.mjs check.next)
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" > "$B/case-115-enter-hitl1.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to instantiation_complete > "$B/case-115-status.json"
```

## Step 2 - Run the independent Subject Agent

The shared adapter injects only the current production closure, exact bundle path, and the bounded probe request. It retains the exact prompt, raw event stream, and actual result events. If the authenticated Subject runtime cannot start or complete, finalize NOT_RUN and stop:

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 115 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent authenticated Subject Agent runtime unavailable' > "$B/case-115-subject-unavailable.txt"
fi
```

## Step 3 - Observe the Subject-owned branch and evidence boundary

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
if [ ! -f "$B/case-115-subject-unavailable.txt" ]; then
node --input-type=module - "$B" <<'JS'
import { existsSync, readdirSync, readFileSync, statSync, appendFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
const [bundle] = process.argv.slice(2);
const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml')));
const events = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const access = profile.research_access;
const attempt = events.filter((e) => e.event === 'gate_attempt' && e.gate === 'hitl1-recorded').at(-1);
const setupLoad = events.some((e) => e.event === 'load_complete' && e.entry === 'phases/phase-setup.md' && e.handoff_source_gate === 'hitl1-recorded');
const available = access?.status === 'available' && access.fetch_outcome === 'success' && /^https?:\/\//.test(access.result_url || '') && attempt?.passed === true && setupLoad;
const unavailable = access?.status === 'unavailable' && access.reason && access.fetch_outcome !== 'success' && attempt?.passed === false && !setupLoad;
const walk = (path) => !existsSync(path) ? [] : statSync(path).isFile() ? [path] : readdirSync(path).flatMap((name) => walk(join(path, name)));
const surfaces = ['reference', '_cache', 'artifacts', '_work_units', 'rb_output_declarations.jsonl'];
const leaks = surfaces.flatMap((surface) => walk(join(bundle, surface))).filter((file) => access?.result_url && readFileSync(file, 'utf8').includes(access.result_url)).map((file) => relative(bundle, file));
for (const [gate, passed] of [['hitl1-research-access-probe', Boolean(available || unavailable)], ['probe-evidence-boundary', leaks.length === 0]]) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed, expected: true })}\n`);
if (!(available || unavailable) || leaks.length) process.exit(1);
JS
fi
```

## Step 4 - Native completion with Subject evidence

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-115-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent authenticated Subject Agent runtime unavailable")
else
  EXTRA_ARGS+=(--evidence "subject_prompt=$B/case-115-subject-prompt.json" --evidence "subject_transcript=$B/case-115-subject-transcript.jsonl" --evidence "subject_result=$B/case-115-subject-result.json")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Light health, durable Subject evidence export, audit, preservation, and optional clean-PASS cleanup.

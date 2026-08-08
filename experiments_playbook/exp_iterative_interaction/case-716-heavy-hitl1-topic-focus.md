---
schema: command-experiment/v2
experiment: iterative-interaction
case: case-716-heavy-hitl1-topic-focus
case_goal: "A real Subject Agent proposes a reviewable no-cap Topic map for a broad request, captures a corrected natural-language focus in the existing literal controls snapshot, and takes only the existing HITL1 handoff."
verdict_mode: all
required_checks: [case-716-broad-reviewable-topic-map, case-716-labelled-focus-snapshot, case-716-existing-handoff]
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
req: HIU-002, URC-001, PRP-012, PRP-014
not_run_if: "The independent authenticated Subject Agent runtime or required real search/fetch tools are unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008 -->

# Case 716 - HITL1 Topic Focus

## Execution Contract

The setup helper ends at the legal HITL1 boundary with no recommendation, accepted decision, topic registry, seed, focus snapshot, probe, or HITL1 Gate result. The Playbook Agent may create that setup, preserve the raw Subject stream byte-for-byte, and run deterministic observation/finalization. Only the independent real Subject Agent may formulate the Topic map, accept the user's focus correction, write existing HITL1 owners, invoke the bounded probe/Gate, and consume the existing handoff.

The two user turns are owned by the case and remain exactly the turns supplied by the shared subject adapter. The first is a broad research request; the second accepts the recommendation while naming one additional focus. The adapter sends the second turn only after the first successful Subject result. It must not inject a Topic count, structured focus field, expected snapshot label, command, verdict, Gate, or route hint.

## Reality Distance Ledger

| Dimension | Declaration |
| --- | --- |
| `test_class` | `agent_flow_e2e` |
| Fixture distance | `setup_only`; no Subject-owned recommendation or decision is prewritten |
| Subject execution | one independent authenticated real Agent session |
| Runtime | fresh real disposable bundle |
| External calls | real bounded search/fetch probe when available; honest unavailable branch otherwise |
| Verdict judge | deterministic transcript, profile, host-file, seed-count, and trace predicates |
| Native verdict | bundle-root `rb_trace.jsonl` checks |
| No substitute | unavailable Subject runtime or tools is an honest NOT RUN (`NOT_RUN`), never fixture PASS |
| Does not prove | general natural-language quality, future focus coverage, or Wave evidence sufficiency |

## Step 1: [PLAYBOOK AGENT] Prepare Legal HITL1 Boundary

```bash
B=$(node experiments_env/shared/prepare-iterative-interaction-case.mjs 716 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
const bundle = process.argv[2];
const setup = JSON.parse(readFileSync(join(bundle, 'case-716-setup.json'), 'utf8'));
const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8');
const ok = setup.fixture === 'setup_only'
  && setup.legal_boundary.current_node === 'phases/phase-hitl1.md'
  && profile.research_access.status === 'unprobed'
  && profile.human_decision_checkpoints.hitl1.status === 'not_started'
  && readdirSync(join(bundle, 'seed_topics')).filter((name) => name.endsWith('.md')).length === 0
  && !trace.includes('hitl1-recorded');
if (!ok) process.exit(1);
JS
```

## Step 2: [SUBJECT AGENT] Recommendation And Focus Correction

Run one independently authenticated real Agent session. The subject system instruction is limited to:

```text
You are the independent subject Agent for case 716. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts. Respond to the user's current turn, then follow that production surface for subsequent turns in this same session.
```

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 716 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent Subject Agent or required real tools unavailable' > "$B/case-716-subject-unavailable.txt"
fi
```

The adapter retains the exact injected prompt, raw transcript, and actual Subject result bytes. It uses a 180-second hard timeout. If the Subject runtime or required real tools are unavailable, it records that condition and this case reaches finalization as `NOT_RUN`; the Playbook Agent must not synthesize a topic map, focus snapshot, decision, probe, Gate, or handoff.

## Step 3: [OBSERVER] Hash And Derive Native Verdict

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-716-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent Subject Agent or required real tools unavailable")
else
  node experiments_env/shared/observe-iterative-interaction-case.mjs 716 hash --bundle "$B" --transcript "$B/case-716-transcript.jsonl"
  node experiments_env/shared/observe-iterative-interaction-case.mjs 716 verdict --bundle "$B" --transcript "$B/case-716-transcript.jsonl"
  EXTRA_ARGS+=(--evidence "subject_prompt=$B/case-716-subject-prompt.json" --evidence "subject_transcript=$B/case-716-transcript.jsonl" --evidence "subject_result=$B/case-716-subject-result.json")
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

PASS requires one real Subject conversation whose pre-correction recommendation has more than five accepted canonical Topics and a reviewable grouping cue, followed by the user's exact focus correction; the existing supplied-controls snapshot retains both labelled narrative parts and the user wording, profile has no copied focus field, and the existing HITL1 probe/Gate branch consumes only its legal handoff. It does not claim that the resulting research semantically satisfies the focus.

## Step 4: [PLAYBOOK AGENT] Stop

Stop after native completion. The Autorun Supervisor owns health, evidence export, audit, preservation, and any cleanup.

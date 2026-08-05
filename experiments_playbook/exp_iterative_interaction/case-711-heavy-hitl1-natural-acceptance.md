---
schema: command-experiment/v2
experiment: iterative-interaction
case: case-711-heavy-hitl1-natural-acceptance
case_goal: "A real subject Agent generates the production HITL1 recommendation, consumes exact natural-language acceptance, owns the existing writes and bounded probe, and reaches the honest Gate branch."
verdict_mode: all
required_checks: [case-711-transcript-contract, case-711-no-second-confirmation, case-711-subject-owned-existing-writes, case-711-real-probe-and-gate-branch]
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
req: VER-001, VER-003, HIU-001, HIU-002, PRP-002
not_run_if: "The independent real Subject Agent, its authenticated Agent runtime, or required real search/fetch tools are unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003 -->

## Execution Contract

The setup helper ends after the real instantiation Gate/load at legal HITL1. `research_access.status` is `unprobed`; no recommendation, accepted HITL1 decision, profile/topic selection, `hitl1-recorded` attempt, or `hitl1-recorded` pass exists.

The Playbook Agent may create the setup, deliver the fixed utterance, preserve the Subject Agent event stream byte-for-byte, hash it, and observe direct facts. Only the independent Subject Agent may generate the recommendation, write existing HITL1 owners, run the bounded probe, run the HITL1 Gate, and consume a passing handoff. The adapter also retains the exact injected Subject prompt and actual Claude result events inside the bundle for durable evidence export.

## Reality Distance Ledger

| Dimension | Declaration |
| --- | --- |
| `test_class` | `agent_flow_e2e` |
| Fixture distance | `setup_only`; stops before recommendation or HITL1 decision |
| Subject execution | one independent real Agent conversation |
| Runtime | fresh real disposable bundle |
| External calls | real search and first-usable-URL fetch when available; honest unavailable branch otherwise |
| Verdict judge | deterministic transcript/profile/filesystem/trace predicates |
| Native verdict | bundle-root `rb_trace.jsonl` checks |
| No substitute | missing independent subject execution is `NOT RUN`, never scripted PASS |
| Does not prove | research quality; case 115 remains the focused probe canary |

# case-711-heavy-hitl1-natural-acceptance

## Step 1: [PLAYBOOK AGENT] Prepare Legal HITL1 Boundary

```bash
B=$(node experiments_env/shared/prepare-iterative-interaction-case.mjs 711 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
const bundle=process.argv[2];
const setup=JSON.parse(readFileSync(join(bundle,'case-711-setup.json'),'utf8'));
const profile=parseYaml(readFileSync(join(bundle,'rb_profile.yaml'),'utf8'));
const trace=readFileSync(join(bundle,'rb_trace.jsonl'),'utf8');
const ok=setup.fixture==='setup_only'
  && setup.legal_boundary.current_node==='phases/phase-hitl1.md'
  && profile.research_access.status==='unprobed'
  && profile.research_profile==='not_selected'
  && profile.human_decision_checkpoints.hitl1.status==='not_started'
  && readdirSync(join(bundle,'seed_topics')).filter((name)=>name.endsWith('.md')).length===0
  && !trace.includes('"gate":"hitl1-recorded"');
if(!ok) process.exit(1);
JS
```

## Step 2: [SUBJECT AGENT] Generate Recommendation

Run one independently authenticated real Agent session. The subject system instruction is limited to:

```text
You are the independent subject Agent for case 711. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts. Respond to the user's current turn, then follow that production surface for subsequent turns in this same session.
```

The first user turn is:

```text
请根据当前研究请求给出一个简洁的研究建议，只保留验证本次交互所需的最小范围。
```

Run the shared subject adapter. It uses the fixed Codex-only settings file, writes the Playbook-Agent-owned user marker, preserves the raw Claude stream byte-for-byte, retains the exact injected Subject prompt and actual result events, and waits for the first successful `result` before sending the acceptance turn.

If the adapter cannot start or complete the independent authenticated Subject Agent session, this block records the unavailable state. The Playbook Agent skips the observer work and reaches the one finalizer boundary.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 711 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent Subject Agent or required real tools unavailable' > "$B/case-711-subject-unavailable.txt"
fi
```

The adapter supplies the current phase's read-only production required closure plus its declared interaction brief; it does not add expected control answers. It uses a 180-second hard timeout and stops after the current phase's immediate handoff rather than executing the newly loaded phase. The first subject turn must stop after its recommendation.

## Step 3: [SUBJECT AGENT] Deliver Exact Acceptance In The Same Session

The adapter appends this exact Playbook-Agent-owned user event and resumes the same Subject session:

```json
{"role":"user","event":"message","content":"按这个开始"}
```

The adapter appends the exact event and resumes the same live stream-json session only after the first turn completes. The resumed Agent receives only the exact user text `按这个开始`. Do not add expected enums, commands, next actions, mutation rules, or verdict hints to the subject prompt. Preserve the resumed raw Agent event stream byte-for-byte in the same transcript.

If the independent Subject session or its real tool events were unavailable, Step 2 already produced native NOT_RUN and the case has stopped. Do not create profile/topic/probe/Gate output from the Playbook Agent.

## Step 4: [OBSERVER] Hash And Derive Native Verdict

Immediately after the complete subject stream is saved:

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-711-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent Subject Agent or required real tools unavailable")
else
  node experiments_env/shared/observe-iterative-interaction-case.mjs 711 hash --bundle "$B" --transcript "$B/case-711-transcript.jsonl"
  node experiments_env/shared/observe-iterative-interaction-case.mjs 711 verdict --bundle "$B" --transcript "$B/case-711-transcript.jsonl"
  EXTRA_ARGS+=(--evidence "subject_prompt=$B/case-711-subject-prompt.json" --evidence "subject_transcript=$B/case-711-transcript.jsonl" --evidence "subject_result=$B/case-711-subject-result.json")
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

PASS requires the recommendation before the exact user event, no second confirmation afterward, subject-owned existing-owner writes, and one honest real probe/Gate branch. Available must include real search, successful fetch of the first usable URL, Gate pass and Setup entry. Honest unavailable must include the direct unavailable observation, Gate failure and no Setup entry.

The light health profile is intentional because this case stops at HITL1/Setup and does not claim Wave work-unit, ledger, cache-trail, or submitted-reference coverage. The filename's `heavy` cost continues to describe the real external Subject/probe expense without changing health scope.

## Step 5: [PLAYBOOK AGENT] Stop

Stop after native completion. The Autorun Supervisor validates the completion, runs Light health, exports the three exact Subject evidence roles before any requested clean-PASS deletion, and preserves FAIL or NOT_RUN roots.

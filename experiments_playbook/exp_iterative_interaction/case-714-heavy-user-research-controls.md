---
schema: command-experiment/v2
experiment: iterative-interaction
case: case-714-heavy-user-research-controls
case_goal: "A real Subject Agent captures one natural-language HITL1 research-control brief, preserves its strict exclusion through the durable host-file snapshot, and follows the existing HITL1 handoff without inventing a control or source path."
verdict_mode: all
required_checks: [case-714-natural-control-capture, case-714-durable-snapshot, case-714-no-fabricated-path, case-714-existing-handoff]
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
req: URC-001, URC-002, URC-003
not_run_if: "The independent authenticated Subject Agent runtime or required real search/fetch tools are unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008 -->

# Case 714 - Natural-Language User Research Controls

## Execution Contract

Prepare a fresh production bundle at the legal HITL1 boundary. Only the independent Subject Agent may receive the user turn, write existing HITL1 owners, write the bounded `rb_plan.md## Constraints > User Research Controls` snapshot, run the bounded probe/Gate, and consume a legal handoff. The Playbook Agent may prepare the boundary, retain exact prompt/transcript/result bytes, and run deterministic observation/finalization; it must not write a profile decision, snapshot, path, trace, receipt, or Gate result.

The fixed user turn is:

```text
按建议开始。本轮只使用一手来源；不要把媒体转述当作证据。报告最后单列无法用一手来源验证的结论。
```

The Subject prompt is limited to the current production lifecycle surface and the current user turn. It must not contain the expected snapshot label, a file path, command sequence, expected verdict, or a preconstructed control field.

## Evidence And Verdict

PASS requires deterministic inspection of the real bundle and raw Subject transcript to show all of the following:

- the Subject response precedes the durable supplied-controls snapshot;
- the snapshot uses the exact production label and literal fence, contains the user's strict first-party exclusion, and has no external source path;
- no copied control appears in profile, queue, manifest, result, receipt, or fabricated trace authority;
- the existing HITL1 probe/Gate takes an honest available or unavailable branch, and any legal handoff is consumed through the existing route.

If the independent Agent or real tools are unavailable, finalize `NOT_RUN` with the unavailable reason. Do not create a scripted snapshot or fixture PASS.

## Step 1: [PLAYBOOK AGENT] Prepare Legal HITL1 Boundary

```bash
B=$(node experiments_env/shared/prepare-iterative-interaction-case.mjs 714 --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
const bundle=process.argv[2];
const setup=JSON.parse(readFileSync(join(bundle,'case-714-setup.json'),'utf8'));
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

## Step 2: [SUBJECT AGENT] Generate Recommendation And Capture Research Controls

Run one independently authenticated real Agent session. The subject system instruction is limited to:

```text
You are the independent subject Agent for case 714. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts. Respond to the user's current turn, then follow that production surface for subsequent turns in this same session.
```

The first user turn requests a recommendation; the second supplies the exact research controls. The shared adapter sends the second event only after the first successful Subject result. It preserves the raw stream byte-for-byte and retains the exact injected prompt plus actual result events. It uses a 180-second hard timeout.

If the adapter cannot start or complete the independent authenticated Subject Agent session, this block records the unavailable state. The Playbook Agent skips the observer work and reaches the one finalizer boundary.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 714 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent Subject Agent or required real tools unavailable' > "$B/case-714-subject-unavailable.txt"
fi
```

The adapter supplies the current phase's read-only production required closure plus its declared interaction brief; it does not add expected control answers. The first subject turn must stop after its recommendation. The second turn delivers the fixed controls text from the Execution Contract and must stop after capturing the controls snapshot and consuming the Gate handoff.

## Step 3: [OBSERVER] Hash And Derive Native Verdict

Immediately after the complete subject stream is saved:

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-714-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent Subject Agent or required real tools unavailable")
else
  node experiments_env/shared/observe-iterative-interaction-case.mjs 714 hash --bundle "$B" --transcript "$B/case-714-transcript.jsonl"
  node experiments_env/shared/observe-iterative-interaction-case.mjs 714 verdict --bundle "$B" --transcript "$B/case-714-transcript.jsonl"
  EXTRA_ARGS+=(--evidence "subject_prompt=$B/case-714-subject-prompt.json" --evidence "subject_transcript=$B/case-714-transcript.jsonl" --evidence "subject_result=$B/case-714-subject-result.json")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

PASS requires the recommendation before the controls user event, the exact production host-file snapshot with the strict first-party exclusion and no external source path, no fabricated control in profile/queue/manifest/result/receipt/trace, and one honest real probe/Gate branch.

The light health profile is intentional because this case stops at HITL1/Setup and does not claim Wave work-unit, ledger, cache-trail, or submitted-reference coverage. The filename's `heavy` cost continues to describe the real external Subject/probe expense without changing health scope.

## Step 4: [PLAYBOOK AGENT] Stop

Stop after native completion. The Autorun Supervisor validates the completion, runs Light health, exports the three exact Subject evidence roles before any requested clean-PASS deletion, and preserves FAIL or NOT_RUN roots.

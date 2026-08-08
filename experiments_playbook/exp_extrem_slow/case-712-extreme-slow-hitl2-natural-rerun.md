---
schema: command-experiment/v2
experiment: iterative-interaction
case: case-712-extreme-slow-hitl2-natural-rerun
case_goal: "A real Subject Agent generates the production HITL2 review and one recommendation, maps one natural-language follow-up into the existing rerun path, and consumes the real Gate handoff."
verdict_mode: all
required_checks: [case-712-review-and-one-recommendation, case-712-natural-language-mapping, case-712-user-facing-contract]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: VER-001, VER-003, HIU-003, CDP-001
not_run_if: "The independent authenticated Subject Agent runtime is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003 -->

> **QUARANTINED - EXTREME SLOW.** The retained native completion for the
> previously active case was `FAIL` after `446042 ms` at `$2.190943`. Do not
> run this playbook through Autorun or Interactive. Refactor it, move it back
> to a normal `light`, `standard`, or `heavy` runnable path, and explicitly
> re-register it before reactivation; otherwise remove it.

# Case 712 - Natural-Language HITL2 Rerun

## Execution Contract

The setup-only predecessor uses production Gates, route-bound loads, status synchronization, work-unit submit, and a disclosed fixture research baseline. It stops at legal HITL2 before `decision-brief.md`, recommendation, decision, `hitl2-recorded` attempt, or handoff exists.

Only the independent Subject Agent may generate the review/recommendation, receive the fixed natural-language request, write the existing HITL2 decision/rationale owner, run the real Gate, and consume its handoff. The Playbook Agent may prepare the boundary, run the shared Subject adapter, retain exact prompt/transcript/result bytes, and invoke deterministic observation/finalization. It must not produce the Subject-owned decision or substitute fixture output.

The independent real Subject Agent is required evidence. If its runtime is unavailable, the case records an honest NOT RUN (`NOT_RUN`) through the single native finalizer boundary; it never becomes fixture PASS. The native verdict uses strict playbook-owned checks in bundle-root `rb_trace.jsonl`.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | One fresh real disposable bundle at the legal HITL2 boundary |
| Fixture distance | `setup_only`; no Subject decision, Gate pass, or rerun handoff is prewritten |
| Subject execution | One independent real Subject Agent conversation with two fixed user events |
| External calls | No external call is needed for this HITL2 conversation boundary |
| Verdict source | Strict playbook-owned bundle-root `rb_trace.jsonl` checks plus native completion |
| Does not prove | General research quality or a fixture substitute for Subject judgment |

## Step 1 - Prepare and register the legal HITL2 boundary

```bash
B=$(node experiments_env/shared/prepare-iterative-interaction-case.mjs 712 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
const bundle = process.argv[2];
const setup = JSON.parse(readFileSync(join(bundle, 'case-712-setup.json')));
const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml')));
const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8');
const ok = setup.fixture === 'setup_only'
  && setup.legal_boundary.current_node === 'phases/phase-hitl2.md'
  && profile.human_decision_checkpoints.hitl2.status === 'not_started'
  && !existsSync(join(bundle, 'artifacts/hitl2/decision-brief.md'))
  && !trace.includes('"gate":"hitl2-recorded"');
if (!ok) process.exit(1);
JS
```

## Step 2 - Run the independent Subject Agent conversation

The Subject system instruction is limited to:

```text
You are the independent subject Agent for case 712. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts. Respond to the user's current turn, then follow that production surface for subsequent turns in this same session.
```

Its two exact user turns are:

```text
{"role":"user","event":"message","content":"请简要审阅当前研究，只告诉我一个最值得做的下一步。"}
```

```text
{"role":"user","event":"message","content":"资本约束这部分还不够，再补一下；这次请特别比较租赁、购买与推迟决策在现金流压力下的差异。"}
```

The shared adapter sends the second event only after the first successful Subject result. It preserves the raw stream byte-for-byte and retains the exact injected prompt plus actual result events. It uses a 180-second hard timeout and does not add expected enums, commands, no-confirmation rules, next actions, or verdict hints. No third user response is allowed after the fixed follow-up.

If the adapter cannot start or complete the independent authenticated session, record the unavailable state and continue only to the one finalizer boundary:

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 712 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent authenticated Subject Agent runtime unavailable' > "$B/case-712-subject-unavailable.txt"
fi
```

## Step 3 - Observe direct facts and finalize native outcome

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-712-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent authenticated Subject Agent runtime unavailable")
else
  node experiments_env/shared/observe-iterative-interaction-case.mjs 712 hash --bundle "$B" --transcript "$B/case-712-transcript.jsonl"
  node experiments_env/shared/observe-iterative-interaction-case.mjs 712 verdict --bundle "$B" --transcript "$B/case-712-transcript.jsonl"
  EXTRA_ARGS+=(--evidence "subject_prompt=$B/case-712-subject-prompt.json" --evidence "subject_transcript=$B/case-712-transcript.jsonl" --evidence "subject_result=$B/case-712-subject-result.json")
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

PASS requires exactly one review and one available recommendation before the fixed user event, natural-language mapping to the existing rerun decision/rationale, a real `hitl2-recorded` pass and route-bound rerun load, no second user response, and no canonical enum in user-facing assistant blocks.

Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject evidence export, audit, preservation, and optional clean-PASS cleanup.

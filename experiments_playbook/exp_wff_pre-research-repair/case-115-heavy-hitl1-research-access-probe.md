---
schema: command-experiment/v2
experiment: wff-pre-research-repair
case: case-115-heavy-hitl1-research-access-probe
case_goal: "An independent real Subject Agent performs the bounded native-first, same-URL HITL1 fetch sequence, records one research_access observation, and reaches the honest available-pass or unavailable-fail-closed Gate branch."
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
req: SCO-002, PRP-002, PRP-005, PRG-002, REA-002, REA-003
not_run_if: "The independent authenticated Subject Agent runtime or required stable-ID public tool-use/result facts are unavailable to the deterministic observer."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003 -->

# Case 115 - Independent HITL1 Research-Access Probe

## Execution Contract

The Playbook Agent prepares fixed HITL1 choices at a legal HITL1 entry. Only the independent Subject Agent may perform the actual search/fetch probe, write `rb_profile.yaml#/research_access`, run the HITL1 Gate, and consume an available-branch handoff. The Playbook Agent must not run the probe itself or fabricate an available/unavailable observation.

Both honest Subject branches satisfy the general actor claim. The Subject performs one neutral search and processes at most the first three syntactically eligible actual HTTP(S) results in returned order. For each candidate it tries native `WebFetch` first and, only when native returns no real page content and existing host permission independently allows it, at most one exact standalone same-URL `curl` fallback from the production surface. The first real content ends the entire sequence. A permission or no-legal-path boundary stops at the current candidate; no later candidate or fallback tier is allowed. The Subject writes one final profile observation: `eligible_candidate_count` and `final_candidate_ordinal` identify the bounded final candidate, while the no-candidate branch records count zero with `not_attempted` and no URL. Available means the successful surface is recorded in profile `available`, the same Gate passes and Setup handoff is consumed. Unavailable means the bounded sequence cannot legally return real content, profile `unavailable`, the same Gate fails and no Setup handoff occurs. Probe URL and bytes must not enter research evidence surfaces.

For this Change, the Subject is launched through the selected generic
`claude-deepseek.mjs` / `deepseek_anthropic_compatible` adapter with no caller-supplied
permission-bypass option. The runner injects the selected adapter contract and retains
that invocation declaration in the existing durable Subject prompt; the focused
deterministic runner-argv test proves the recorded generic mode cannot contain a
bypass option. A run that changes that permission mode is not evidence for this
adapter's available-path claim.

The optional fallback witness is separate from that general claim and applies only when the retained public Subject events expose the complete native-failure-to-curl branch. A first-candidate success is sufficient for the general claim; candidate-two/three behavior is never inferred when its public branch is absent. This case observes the configured Claude Subject runtime; it does not prove Codex behavior, and the deterministic observer does not fetch, re-judge arbitrary page bytes for semantic identity, or author profile/Gate success. Missing or contradictory provider-scoped public tool facts are `NOT_RUN`.

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

## Step 3 - Hash and observe the Subject-owned branch

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
if [ ! -f "$B/case-115-subject-unavailable.txt" ]; then
  set +e
  node experiments_env/shared/observe-iterative-interaction-case.mjs 115 hash --bundle "$B" --transcript "$B/case-115-subject-transcript.jsonl"
  OBSERVER_STATUS=$?
  if [ "$OBSERVER_STATUS" -eq 0 ]; then
    node experiments_env/shared/observe-iterative-interaction-case.mjs 115 verdict --bundle "$B" --transcript "$B/case-115-subject-transcript.jsonl"
    OBSERVER_STATUS=$?
  fi
  set -e
  if [ "$OBSERVER_STATUS" -eq 3 ]; then
    test -f "$B/case-115-NOT-RUN.json"
  elif [ "$OBSERVER_STATUS" -ne 0 ]; then
    exit "$OBSERVER_STATUS"
  fi
fi
```

## Step 4 - Native completion with Subject evidence

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-115-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent authenticated Subject Agent runtime unavailable")
elif [ -f "$B/case-115-NOT-RUN.json" ]; then
  NOT_RUN_REASON=$(node experiments_env/shared/extract-field.mjs reason < "$B/case-115-NOT-RUN.json")
  test -n "$NOT_RUN_REASON"
  EXTRA_ARGS+=(--not-run-reason "$NOT_RUN_REASON")
else
  EXTRA_ARGS+=(--evidence "subject_prompt=$B/case-115-subject-prompt.json" --evidence "subject_transcript=$B/case-115-subject-transcript.jsonl" --evidence "subject_result=$B/case-115-subject-result.json")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Light health, durable Subject evidence export, audit, preservation, and optional clean-PASS cleanup.

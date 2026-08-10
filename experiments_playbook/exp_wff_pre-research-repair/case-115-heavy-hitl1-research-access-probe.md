---
schema: command-experiment/v2
experiment: wff-pre-research-repair
case: case-115-heavy-hitl1-research-access-probe
case_goal: "An independent isolated probe agent performs the bounded native-first, same-URL search/fetch sequence and returns one honest compact research_access observation."
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
not_run_if: "The independent authenticated isolated probe runtime, its final compact return, or required stable-ID public tool-use/result facts are unavailable to the deterministic observer."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003 -->

# Case 115 - Isolated HITL1 Capability Probe

## Execution Contract

This is an agent-flow canary for the isolated probe actor alone. The Playbook
Agent creates a disposable experiment root and invokes the selected generic
non-bypass Subject launcher. The runner owns prompt/transcript/result retention
at that root, but does not disclose its path to the Subject. The Subject receives
only the selected adapter contract and
`shared/shared-hitl1-capability-probe.md`; it receives no production phase,
bundle path, profile/state facts, or filesystem obligation.

The Subject makes one literal neutral `WebSearch`, considers at most the first
three eligible returned HTTP(S) URLs in order, uses native `WebFetch` first,
and uses the exact same-URL standalone `curl` fallback only under the guide's
existing permission condition. It returns exactly one compact YAML object rooted
at `research_access`. The object is an existing honest `available` or
`unavailable` observation only. It includes no page bytes, candidate list, raw
tool output, transcript, analysis, receipt, or verdict.

The deterministic observer reads retained public `WebSearch`, `WebFetch`, and
optional exact `curl` events plus that final return. It verifies the fixed query,
candidate order, native-first/same-URL sequence, compact return shape, and the
truthfulness of the returned status. It proves neither a Phase profile write nor
a HITL1 Gate execution. Those Phase relay mechanics are covered only by the
deterministic Markdown integration test.

The selected invocation is `claude-deepseek.mjs` /
`deepseek_anthropic_compatible` generic mode with no caller-supplied
permission-bypass option. Missing, malformed, or contradictory public evidence
is `NOT_RUN`; an honest observed unavailable return remains a valid broad canary
outcome, but cannot prove an available-path claim.

## Step 1 - Prepare runner-owned evidence storage

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs research_access --case case-115 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
```

The bundle is an experiment storage root only. Do not prepare a production HITL1
profile, run a production Gate, or pre-write a probe observation for this case.

## Step 2 - Run the independent isolated probe Subject

The runner retains the exact prompt, public event stream, and final Subject
result at the experiment root. It injects no bundle path or mutation instruction
into the Subject prompt. If the authenticated Subject runtime cannot start or
complete, retain the boundary and finalize `NOT_RUN`:

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 115 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent authenticated isolated probe Subject runtime unavailable' > "$B/case-115-subject-unavailable.txt"
fi
```

## Step 3 - Hash and observe the isolated return

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
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

## Step 4 - Native completion with isolated-actor evidence

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-115-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent authenticated isolated probe Subject runtime unavailable")
elif [ -f "$B/case-115-NOT-RUN.json" ]; then
  NOT_RUN_REASON=$(node experiments_env/shared/extract-field.mjs reason < "$B/case-115-NOT-RUN.json")
  test -n "$NOT_RUN_REASON"
  EXTRA_ARGS+=(--not-run-reason "$NOT_RUN_REASON")
else
  EXTRA_ARGS+=(--evidence "subject_prompt=$B/case-115-subject-prompt.json" --evidence "subject_transcript=$B/case-115-subject-transcript.jsonl" --evidence "subject_result=$B/case-115-subject-result.json")
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Light health, durable
Subject evidence export, audit, preservation, and optional clean-PASS cleanup.

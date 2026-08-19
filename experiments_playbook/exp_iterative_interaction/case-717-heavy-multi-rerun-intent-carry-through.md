---
schema: command-experiment/v2
experiment: iterative-interaction
case: case-717-heavy-multi-rerun-intent-carry-through
case_goal: "Two fresh real Subject contexts carry an accepted HITL1 baseline through a normal HITL2 rerun and an evidence-expanding post-Final C5 rerun, preserving immutable revision history while only the newest cumulative intent drives current downstream work."
verdict_mode: all
required_checks: [case-717-two-immutable-revisions, case-717-newest-cumulative-intent, case-717-current-intent-downstream, case-717-independent-context-evidence, case-717-production-routes]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [round1_subject_prompt, round1_subject_transcript, round1_subject_result, round1_observation, round2_subject_prompt, round2_subject_transcript, round2_subject_result]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: PHS-009, URC-004, PRP-016, STM-009, DEW-026, RWP-022, WAI-012, WTS-013, CDP-007, POF-004, REI-007, VER-004
not_run_if: "The independent authenticated Subject Agent runtime or required real actor/search/fetch tools are unavailable before a Subject result is retained."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PHS-009, URC-004, REI-007, VER-004 -->

# Case 717 - Multi-Rerun Intent Carry-Through

## Execution Contract

Use one real disposable bundle for the entire case. Setup may create only the
legal HITL2 boundary, the already accepted HITL1 controls baseline, and bounded
predecessor evidence. It writes no rerun revision, interpretation, current
task brief, focus coverage, synthesis decision, or Final report.

Launch exactly two fresh independently authenticated Subject contexts, once
each, with no retry:

1. Context 1 receives an ordinary HITL2 research amendment and completes one
   normal rerun through the next Final report.
2. Context 2 starts without context 1 chat, reads the same bundle at Final,
   receives one evidence-expanding C5 request that replaces one amendment and
   withdraws another, and completes the second rerun through the next Final.

Each runner enforces a 12-minute timeout, so the two Subject launches have a
declared aggregate hard cap of 24 minutes. A launch that cannot start and
retains no Subject result is dependency unavailability and may finalize
`NOT_RUN`. Once a Subject result exists, a non-zero launch, timeout, malformed
workflow, or semantic failure remains `ERROR`; the Playbook Agent must stop and
must not relaunch, replace, or repair the attempt.

The deterministic observer may hash transcripts, snapshot the round-1 revision
bytes, and read final facts. It may not author or repair any verdict-bearing
research semantics. Native completion is the only outcome authority.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | One real disposable bundle shared across two fresh Subject contexts |
| Fixture distance | `setup_only`; baseline and bounded predecessor evidence exist, but all accepted revisions and downstream current-intent decisions are Subject-authored |
| Subject execution | Two independently authenticated real Agent sessions, each launched exactly once |
| External calls | Real actor/search/fetch tools where the production Wave path requires them |
| Durable evidence | Raw prompt, byte-for-byte transcript, result, and the read-only round-1 revision snapshot |
| Verdict source | Five strict checks in bundle-root `rb_trace.jsonl` plus native completion |
| Does not prove | Generic interpretation quality, generic research quality, or genuine user satisfaction |

## Step 1 - Prepare And Register The Legal Boundary

```bash
B=$(node experiments_env/shared/prepare-iterative-interaction-case.mjs 717 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
```

## Step 2 - Run Context 1 Once And Snapshot Revision 1

The exact user turn is retained by the shared runner. This is one normal HITL2
rerun, not a fixture mutation. The Subject owns every interpretation, revision,
Topic/direction, task, coverage, synthesis, HITL2, composition, and Final
decision it makes.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 717-round1 --bundle "$B"
ROUND1_STATUS=$?
set -e
if [ "$ROUND1_STATUS" -ne 0 ]; then
  if [ ! -f "$B/case-717-round1-subject-result.json" ]; then
    printf '%s\n' 'round-1 authenticated Subject runtime or required tools unavailable before result retention' > "$B/case-717-subject-unavailable.txt"
  else
    exit "$ROUND1_STATUS"
  fi
else
  node experiments_env/shared/observe-iterative-interaction-case.mjs 717 hash --bundle "$B" --transcript "$B/case-717-round1-subject-transcript.jsonl"
  node experiments_env/shared/observe-iterative-interaction-case.mjs 717 snapshot-round1 --bundle "$B"
fi
```

## Step 3 - Run Fresh Context 2 Once

Context 2 is a fresh authenticated session. Its injected production surface
must be the same bundle's current Final node; no prior chat is supplied. The
fixed user request explicitly asks for new evidence, replaces the cash-flow
comparison amendment with staged investment thresholds, and withdraws the
regional-comparison amendment. The Subject decides how to carry that accepted
meaning through the existing C5 and rerun owners.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
if [ ! -f "$B/case-717-subject-unavailable.txt" ]; then
  set +e
  node experiments_env/shared/run-iterative-interaction-subject.mjs 717-round2 --bundle "$B"
  ROUND2_STATUS=$?
  set -e
  if [ "$ROUND2_STATUS" -ne 0 ]; then
    if [ ! -f "$B/case-717-round2-subject-result.json" ]; then
      printf '%s\n' 'round-2 authenticated Subject runtime or required tools unavailable before result retention' > "$B/case-717-subject-unavailable.txt"
    else
      exit "$ROUND2_STATUS"
    fi
  fi
fi
```

## Step 4 - Observe And Finalize Exactly Once

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
if [ -f "$B/case-717-subject-unavailable.txt" ]; then
  node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" --not-run-reason "$(cat "$B/case-717-subject-unavailable.txt")"
else
  node experiments_env/shared/observe-iterative-interaction-case.mjs 717 hash --bundle "$B" --transcript "$B/case-717-round2-subject-transcript.jsonl"
  node experiments_env/shared/observe-iterative-interaction-case.mjs 717 verdict --bundle "$B"
  node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" \
    --evidence "round1_subject_prompt=$B/case-717-round1-subject-prompt.json" \
    --evidence "round1_subject_transcript=$B/case-717-round1-subject-transcript.jsonl" \
    --evidence "round1_subject_result=$B/case-717-round1-subject-result.json" \
    --evidence "round1_observation=$B/case-717-round1-observation.json" \
    --evidence "round2_subject_prompt=$B/case-717-round2-subject-prompt.json" \
    --evidence "round2_subject_transcript=$B/case-717-round2-subject-transcript.jsonl" \
    --evidence "round2_subject_result=$B/case-717-round2-subject-result.json"
fi
```

PASS requires two complete newest-first revisions, byte-identical retained
revision 1, replacement/withdrawal only in revision 2's cumulative current
set, distinct Subject session identities, normal HITL2 plus C5 production
routes, and current-round direction/task/coverage/synthesis/Final evidence that
uses revision 2 without reactivating the withdrawn amendment.

Stop after native completion. The Autorun Supervisor owns Heavy health, durable
evidence export, audit, preservation, and any authorized clean-PASS cleanup.
PASS does not prove generic interpretation quality, research quality, or
genuine user satisfaction.

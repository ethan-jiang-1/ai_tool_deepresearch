---
title: "Gate - Wave 2 Start"
role: "start-boundary gate specification"
scope: "boundary receipt after wave1_complete and before Wave 2 synthesis work"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/QUEUE_CONTRACT.md"
  - "specs/gates/wave1-complete.md"
  - "specs/METHODOLOGY.md"
writes: []
---

# Gate - Wave 2 Start

`wave2_start` is a start-boundary gate, not a `current_gate` enum value. It is enforced by `hook_wave1_closeout_to_wave2_start`, a Queue-visible work unit with producer_rule=`boundary_hook`, and the Critical Checkpoint Receipt `Wave 1 closeout -> Wave 2 start`.

## Pass Surface

Before Wave 2 synthesis, conclusion-matrix, or conflict/tension work can begin:

- `STATUS_PATH -> Wave 1 Source Floor Audit.overall_result=pass`.
- `STATUS_PATH -> Wave 1 Source Floor Audit.wave2_entry_allowed=yes`.
- every active topic either meets configured Wave 1 floors or carries a structured stop/scarcity exception with queue consequence.
- topic seed backfill is current or explicitly queue-deferred.
- each active topic's `evidence-summary.md` and `question-list.md` exist under the canonical per-topic artifact directory and are fresh for the gate audit.
- Topic Investigation Targets and Topic Target Coverage preserve Wave 1 topic answers and Wave 2 synthesis routes.
- question reconciliation and the Emergent Question Protocol are complete for the latest accepted evidence.
- the distinct Wave 1 transition TRACE checkpoint exists with exact `gate_transition` field value `wave1_complete` and `STATUS_PATH -> Trace Pointer.last_trace_entry` names it.
- `QUEUE_PATH` contains or starts a concrete non-chat Wave 2 synthesis/action.

## Fail Rules

Fail if Wave 2 work starts without a passing Wave 1 audit, without `wave2_entry_allowed=yes`, with missing/stale topic artifacts, with unresolved topic target coverage, with incomplete question reconciliation, without the distinct TRACE checkpoint whose `gate_transition` value is `wave1_complete`, or through a recap/user-review/continue prompt instead of a concrete Queue action.

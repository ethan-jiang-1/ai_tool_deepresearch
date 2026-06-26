---
title: "Gate - Wave 1 Start"
role: "start-boundary gate specification"
scope: "boundary receipt after wave0_complete and before Wave 1 topic evidence work"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/QUEUE_CONTRACT.md"
  - "specs/gates/wave0-complete.md"
  - "specs/METHODOLOGY.md"
writes: []
---

# Gate - Wave 1 Start

`wave1_start` is a start-boundary gate, not a `current_gate` enum value. It is enforced by `hook_wave0_closeout_to_wave1_start`, a Queue-visible work unit with producer_rule=`boundary_hook`, and the Critical Checkpoint Receipt `Wave 0 closeout -> Wave 1 start`.

## Pass Surface

Before Wave 1 topic source intake, topic deepening, topic reference landing, or topic artifact production can begin:

- `STATUS_PATH -> Wave 0 Foundation Gate Audit.overall_result=pass`.
- `STATUS_PATH -> Wave 0 Foundation Gate Audit.wave1_entry_allowed=yes`.
- `derived_topic_count > 0`.
- every confirmed topic has a passing topic-start row with usable source entry points and core terms.
- setup/intake gaps are resolved to `seed_topic_intake_ready=yes`; unresolved `gap_queue_backed` intake remains a Wave 1 blocker.
- accepted shared references are inventoried and use `00-shared-*` provenance.
- `REFERENCE_DIR/_INDEX.md` and navigation support local retrieval of shared foundation evidence.
- `ARTIFACT_DIR/README.md` and `ARTIFACT_DIR/wave1_topics/` scaffold exist before topic evidence work starts.
- the distinct Wave 0 transition TRACE checkpoint exists with exact `gate_transition` field value `wave0_complete` and `STATUS_PATH -> Trace Pointer.last_trace_entry` names it.
- `QUEUE_PATH` contains or starts a concrete non-chat Wave 1 continuation action.

At Wave 1 start, per-topic `evidence-summary.md` and `question-list.md` files are not produced just to avoid an empty scaffold. They become mandatory for a topic after its first topic-unique accepted reference lands and seed backfill is active. From that point, producer_rule=`topic_ref_count_changed` must create or refresh the two files before the same topic's next source-intake or deepening action unless a concrete queue-visible deferral exists.

## Fail Rules

Fail if Wave 1 topic work starts without a passing Wave 0 audit, without `wave1_entry_allowed=yes`, with unresolved topic-start/intake gaps, without shared-reference inventory/navigation, without the artifact scaffold, without the distinct TRACE checkpoint whose `gate_transition` value is `wave0_complete`, or through a recap/user-review/continue prompt instead of a concrete Queue action.

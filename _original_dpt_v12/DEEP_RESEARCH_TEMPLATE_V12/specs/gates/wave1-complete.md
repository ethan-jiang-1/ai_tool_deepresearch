---
title: "Gate - Wave 1 Complete"
role: "gate specification"
scope: "topic evidence floor gate before Wave 2"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/METHODOLOGY.md"
writes: []
---

# Gate - Wave 1 Complete

Wave 1 gives each topic enough evidence breadth and depth to support later synthesis. It prevents the run from treating a few shared references or long notes as topic coverage.

## Gate Items

The `Wave 1 Source Floor Audit` in `STATUS_PATH` must include one row per topic and check:

- accepted topic-relevant references against `wave1_doc_floor_per_topic`.
- every topic's `evidence-summary.md` and `question-list.md` exist under `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/` and are synchronized to the accepted topic reference count at gate audit.
- every confirmed `answer_phase=wave1_topic` topic target is accounted for under the selected `research_profile`: answered with local evidence, explicitly downgraded, classified as unknown/limitation where permitted, blocked, or queued with a concrete consequence.
- every confirmed `answer_phase=wave2_synthesis` topic target is preserved as `synthesis_pending` or queue-backed with a concrete Wave 2 route; Wave 1 does not need to answer it, but it must not disappear into ordinary exploration questions.
- topic-unique reference count against at least half of `wave1_doc_floor_per_topic`, unless a scarcity exception records reason, confidence effect, and queue consequence.
- primary, secondary, recent, and limitation/dispute/failure-mode source counts against configured floors.
- topic seed backfill is current or explicitly deferred with a concrete queue candidate.
- every passed topic has resolved seed intake: `intake_status=ready`, `intake_gap=none`, `queue_consequence=not_applicable`, and any original-topic context repair completed on both the seed file and `PLAN_PATH -> Seed Topic Intake Matrix`.
- counted topic-specific references resolve under `REFERENCE_DIR`, preserve reusable Authoritative Copy body, and use provenance-preserving `<topic-id>-*.md` filenames unless they are explicitly reused `00-shared-*` foundation refs accepted for that topic.
- topic evidence summary and question list exist under `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/`, contain substantive body, cite local reference paths where evidence-backed, include Topic Target Coverage and the full four-section question-list exploration ledger respectively, and have `produced_at_ref_count` synchronized to `accepted_topic_ref_count` at gate audit, unless the topic has a justified stop exception with queue consequence.
- question reconciliation was performed after latest evidence backfill and before new `[涌现]` questions were appended.
- counterexample, limitation, dispute, or failure-mode search was attempted and locally recorded.
- any stop or scarcity exception is justified in a structured `Scarcity / Stop Exception Records` row, not only in prose.
- `TRACE_PATH` has a distinct Wave 1 transition checkpoint with exact `gate_transition` field value `wave1_complete` when the gate closes, and `STATUS_PATH -> Trace Pointer.last_trace_entry` names that checkpoint.

Each counted topic row must be backed by accepted reference inventory fields defined in `specs/CONSTANTS.md` and evidence quality rules in `specs/METHODOLOGY.md`.

## Pass Rules

Pass only when every topic row is `pass`, or when a topic has a justified `complete / early_saturation / suspend / archive / redirect` decision with required status, structured exception, queue consequence, and branch records where applicable. `complete` is valid only when the topic meets all active floors, artifact/backfill requirements, and profile-specific topic target handling.

Wave 1 passage is not a user-visible stop point. A valid closeout keeps `stop_authorization_state=unauthorized_continue_required`, keeps `safe_to_interrupt=no`, sets `unauthorized_stop_next_action` to the next concrete Wave 2 synthesis/tool/file/check/refill/promotion action, promotes or starts that non-chat Wave 2 continuation action, and records the distinct Wave 1 transition checkpoint whose `gate_transition` value is `wave1_complete` in `TRACE_PATH`. Asking whether to continue, asking whether to adjust direction, or reporting only that Wave 1 evidence collection is complete is invalid while Wave 2 queue work is executable.

## Fail Rules

Fail if any topic is below floor without a structured stop exception, any passed topic still has per-topic `intake_status=gap / assumption`, non-`none` `intake_gap`, non-`not_applicable` `queue_consequence`, unresolved run-level `seed_topic_intake_ready=gap_queue_backed`, or unresolved original-topic context repair, any confirmed `answer_phase=wave1_topic` topic target is unaccounted for under the selected profile, any confirmed `answer_phase=wave2_synthesis` target lacks a Wave 2 route, accepted counts include unaccepted shared references or artifacts, counted topic references are pathless, summary-only, or named with opaque `ref-NNN` sequencing, seed backfill is missing without queue-backed deferral, question reconciliation is stale, inventory rows are inconsistent with counts, required artifact evidence is missing or thin, topic artifacts cite only short ids instead of local paths where local evidence is claimed, counted webpage evidence fails diagnostics, the Wave 1 transition lacks a distinct trace checkpoint/pointer update with `gate_transition` value `wave1_complete`, Wave 2 starts before the Wave 1 audit passes, or the closeout authorizes a user-visible recap/review/continue prompt instead of starting Wave 2 continuation work.

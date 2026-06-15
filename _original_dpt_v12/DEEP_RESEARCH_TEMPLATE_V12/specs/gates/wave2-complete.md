---
title: "Gate - Wave 2 Complete"
role: "gate specification"
scope: "Wave 2 synthesis gate before Readiness"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/METHODOLOGY.md"
writes: []
---

# Gate - Wave 2 Complete

Wave 2 turns topic evidence into synthesis judgment. Multi-topic runs compare topics; single-topic runs still produce locally backed synthesis rows instead of skipping Wave 2. The gate verifies that the research can support the final deliverable with clear claims, confidence, local backing references, and unresolved-conflict handling.

## Gate Items

The `Wave 2 Synthesis Gate Audit` in `STATUS_PATH` must check:

- synthesis artifact exists at `ARTIFACT_DIR/wave2/cross-topic-synthesis.md`.
- `derived_topic_count > 0`; Wave 2 cannot pass with zero confirmed topics, `0 / 0` topic coverage, or an empty topic-row set.
- synthesis artifact contains substantive Wave 2 synthesis body, not only a status summary or copied matrix. In a single-topic run, the body may be within-topic synthesis only when the matrix contains locally backed rows with `compared_with=not_applicable_single_topic`.
- synthesis artifact cites local reference paths under `REFERENCE_DIR`; short readable ids such as `ref-060` are not backing refs unless paired with the actual local path.
- every confirmed `answer_phase=wave2_synthesis` entry from `PROFILE_PATH -> Root Must-Answer Set` and linked topic targets is covered by a synthesis conclusion row, or the run records that no synthesis-phase entries exist.
- every topic is represented.
- every topic has at least two cross-topic checked conclusions, or an explicit not-applicable reason. In a single-topic run, the only valid not-applicable reason is `not_applicable_single_topic`, and it must be paired with single-topic synthesis conclusions rather than an empty matrix.
- high-leverage judgments are identified.
- every high-leverage judgment has `claim_type`, `confidence`, and at least one local `backing_ref`.
- every P0/P1 high-leverage judgment has at least two independent backing references unless a concrete scarcity exception and low-confidence label are recorded.
- unresolved conflicts are zero, or each has branch disposition and queue follow-up.
- Wave 1 mechanism, trend, difficulty, and limitation implications survive into synthesis.
- a cross-topic conclusion matrix exists in `STATUS_PATH`, has one concrete row per counted high-leverage or cross-topic conclusion, records `must_answer_ids` for rows that answer synthesis-phase entries, and every row's `backing_refs` resolves to local reference files.
- in a single-topic run, the matrix has at least one concrete high-leverage single-topic synthesis conclusion with `compared_with=not_applicable_single_topic`, confidence, local backing refs, independence/scarcity treatment, and conflict status.
- `TRACE_PATH` has a distinct Wave 2 transition checkpoint with exact `gate_transition` field value `wave2_complete` when the gate closes, and `STATUS_PATH -> Trace Pointer.last_trace_entry` names that checkpoint.

## Pass Rules

Pass only when `derived_topic_count > 0`, every global item and every topic row is `pass`, except explicitly not-applicable cross-topic conclusion rows may pass when the reason is concrete. For `derived_topic_count=1`, not-applicable means "cross-topic comparison is unavailable", not "Wave 2 is skipped"; the synthesis artifact and matrix must still contain single-topic conclusions with local backing paths. `wave2_complete` is invalid if the synthesis artifact exists but the matrix is empty, if matrix rows do not cover `answer_phase=wave2_synthesis` must-answer entries, if the matrix exists but the artifact is thin, if topic coverage is `0 / 0`, or if either surface uses only short reference ids rather than local backing paths.

Wave 2 passage is not a routine progress stop point. A valid closeout keeps `stop_authorization_state=unauthorized_continue_required` until the HITL2 decision path is actually ready, keeps `safe_to_interrupt=no`, sets `unauthorized_stop_next_action` to preparing or recording the HITL2 Wave 2 readiness decision path, writes `ARTIFACT_DIR/wave2/human-decision-brief.md` when required, and syncs `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision` plus STATUS projections. The only user-visible stop after Wave 2 is the explicit HITL2 interruption/resume state: the brief exists, HITL2 fields are `pending_user`, queue is blocked for that decision, `stop_authorization_state=decision_blocker`, and `safe_to_interrupt=yes`. A generic summary asking whether to continue or adjust direction is not HITL2.

## Fail Rules

Fail if synthesis is only topic-note summarization, `derived_topic_count=0`, topic coverage is `0 / 0`, the synthesis artifact is missing/thin/pathless, synthesis-phase must-answer entries are uncovered, high-leverage judgments lack local backing references, P0/P1 judgments rest on a single weak source without scarcity exception and confidence downgrade, the cross-topic matrix is missing, empty, or pathless, a single-topic run uses not-applicable to avoid producing a locally backed synthesis conclusion, unresolved conflicts have no disposition or follow-up, a topic disappears from synthesis, the Wave 2 transition lacks a distinct trace checkpoint/pointer update with `gate_transition` value `wave2_complete`, Readiness starts before the Wave 2 audit passes, or the closeout produces a routine recap/review/continue prompt instead of entering the HITL2 recorded-state path.

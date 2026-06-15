---
title: "Gate - Readiness Passed"
role: "gate specification"
scope: "final readiness closeout gate"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/METHODOLOGY.md"
writes: []
---

# Gate - Readiness Passed

Readiness confirms that the generated research run is complete enough for the final deliverable and for the next agent to continue from local files alone.

## Gate Items

The `Readiness Check` in `STATUS_PATH` must check:

- 30-second local evidence retrieval works and records the tested route from README/status to profile, plan, queue, trace, reference index, key references, topic seeds, and artifacts.
- the retrieval test records `route_paths_checked` as concrete run-local markdown paths that resolve inside the run bundle, including the five root control files and `REFERENCE_DIR/_INDEX.md` when present.
- each topic has mechanism, trend, difficulty, and limitation coverage or an explicit justified exception.
- Wave 2 synthesis artifact exists, is substantive, cites local reference paths, covers confirmed `answer_phase=wave2_synthesis` must-answer entries, and is backed by a populated `Cross-Topic Conclusion Matrix`; single-topic runs still need locally backed synthesis rows with `compared_with=not_applicable_single_topic`.
- the HITL2 Wave 2 human decision checkpoint is recorded in `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision` and mirrored in `STATUS_PATH -> Human Decision Checkpoints`, `STATUS_PATH -> Wave 2`, and `STATUS_PATH -> Wave 2 Human Decision Brief` after synthesis assessment: `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision.hitl2_checkpoint_status=recorded`; `STATUS_PATH -> Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=recorded`; `PROFILE_PATH -> Human Decision Checkpoints` contains a `HITL2_wave2_readiness_decision` row with `status=recorded`; `answerability_class` is `ready_substantive` or `ready_insufficient_judgment`; `human_checkpoint_status=recorded`; `user_decision=proceed_to_readiness`; `final_report_view` is recorded for final output; custom label/slug are present when `final_report_view=custom`; and `final_output_dir` follows the deterministic mapping.
- topology is stable or deltas are formalized.
- suspended, archived, redirected, and failed exploration branches are explicit using canonical branch dispositions.
- handoff continuity is sufficient from profile, plan, status, queue, trace, references, and artifacts.
- `TRACE_PATH` contains distinct non-correction transition checkpoints whose `gate_transition` field values are `wave0_complete`, `wave1_complete`, `wave2_complete`, and `readiness_passed`; `STATUS_PATH -> Trace Pointer.last_trace_entry` points to the latest trace entry.
- Anti-Stall Budget is present, within budget, and has a recorded must-answer claim denominator.
- runtime qualification has returned `PASS`; the verifier remains read-only and the execution agent performs closeout writeback.
- no post-readiness research stage is required.

Readiness closeout is two-phase. `readiness_preflight` may run runtime qualification when every Readiness item except `Runtime Qualification Result` is already `pass`. `readiness_closeout_writeback` happens only after runtime qualification returns `PASS`; the execution agent records the result, sets Readiness `overall_status=pass`, sets `Readiness Check.closeout_phase=closed`, sets `STATUS.state=completed`, advances `current_gate=readiness_passed`, sets `next_gate=none`, and closes the Active Queue while preserving the `## Active Queue` anchor with `queue_health=closed` and `closure_reason=readiness_passed`.

## Pass Rules

Pass only when all readiness items pass, the HITL2 checkpoint is recorded with no repair-required blocker, the PROFILE/STATUS recorded-state fields and PROFILE checkpoint row are recorded, the 30-second retrieval route and checked paths are recorded and locally resolvable, `Runtime Qualification Result.result=pass`, `STATUS.state=completed`, `STATUS.next_gate=none`, `Readiness Check.closeout_phase=closed`, the four distinct transition checkpoints remain present in TRACE, `Trace Pointer.last_trace_entry` points to the latest trace checkpoint, and the queue is closed with the post-readiness shape.

## Fail Rules

Fail if evidence retrieval depends on chat memory, 30-second retrieval is asserted without recorded route paths, readiness waives a failed earlier audit, Wave 2 synthesis is missing/thin/pathless, the HITL2 checkpoint is missing/pending, any STATUS HITL2 projection drifts from PROFILE, `final_output_dir` does not match the selected view, `answerability_class=blocked_repair_required`, the user chose `request_view_revision`, `repair_and_rerun`, or `stop_blocked`, trace is dormant, the status pointer is stale, any earlier Wave 0/1/2 transition checkpoint is absent or only represented by a correction/missed-checkpoint note, Anti-Stall Budget is missing or over budget, runtime qualification is missing or failed, any readiness item is `partial` or `fail`, a new completion stage is introduced after readiness, new sources or claims are discovered post-readiness, or a substantive topology delta is treated as maintenance instead of reopening the affected earlier gate.

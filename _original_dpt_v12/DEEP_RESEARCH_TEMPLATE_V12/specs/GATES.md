---
title: "Gate Specification Index"
role: "shared gate index and principle authority"
scope: "gate list, gate principles, and pointers to per-gate specifications"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/RESEARCH_PROFILES.md"
  - "specs/gates/instantiation-complete.md"
  - "specs/gates/setup-ready.md"
  - "specs/gates/wave0-start.md"
  - "specs/gates/wave0-complete.md"
  - "specs/gates/wave1-start.md"
  - "specs/gates/wave1-complete.md"
  - "specs/gates/wave2-start.md"
  - "specs/gates/wave2-complete.md"
  - "specs/gates/readiness-passed.md"
writes: []
---

# Gate Specification Index

This file is the gate map and principle layer. Detailed gate definitions live in `specs/gates/`; profile presets live in `specs/RESEARCH_PROFILES.md`.

## Normative Spec Set

- `specs/CONSTANTS.md`
- `specs/CHARTER.md`
- `specs/GATES.md`
- `specs/RESEARCH_PROFILES.md`
- `specs/METHODOLOGY.md`
- `specs/gates/*.md`

Run-bundle creation must generate `RUN_DIR/_framework/`, `RUN_DIR/seed_topics/`, and five mutable control files that satisfy these gates. Qualification judges the generated run bundle and its control files against these gates without using creator playbooks, flows, or output skeletons as runtime evidence.

## Gate Registry

The `current_gate` enum is defined in `specs/CONSTANTS.md`. The structural mapping is:

| gate_id | spec | checker | CLI gate |
| --- | --- | --- | --- |
| `instantiation_complete` | `specs/gates/instantiation-complete.md` | `cli_tools/check_framework/checks/gates/check_gate_instantiation_complete.mjs` | `check-gate-instantiation-complete` |
| `setup_ready` | `specs/gates/setup-ready.md` | `cli_tools/check_framework/checks/gates/check_gate_setup_ready.mjs` | `check-gate-setup-ready` |
| `wave0_complete` | `specs/gates/wave0-complete.md` | `cli_tools/check_framework/checks/gates/check_gate_wave0_complete.mjs` | `check-gate-wave0-complete` |
| `wave1_complete` | `specs/gates/wave1-complete.md` | `cli_tools/check_framework/checks/gates/check_gate_wave1_complete.mjs` | `check-gate-wave1-complete` |
| `wave2_complete` | `specs/gates/wave2-complete.md` | `cli_tools/check_framework/checks/gates/check_gate_wave2_complete.mjs` | `check-gate-wave2-complete` |
| `readiness_passed` | `specs/gates/readiness-passed.md` | `cli_tools/check_framework/checks/gates/check_gate_readiness_passed.mjs` | `check-gate-readiness-passed` |

The CLI registry in `cli_tools/check_framework/contracts/gates.mjs` is the machine-checkable projection of this table.

## Start Boundary Gate Registry

Start boundary gates are not `current_gate` enum values. They are hook-enforced gate specs: a Queue-visible work unit with producer_rule=`boundary_hook` must verify the matching Critical Checkpoint Receipt before work crosses the lifecycle edge.

| start boundary | spec | enforcing hook | receipt authority | diagnostic route |
| --- | --- | --- | --- | --- |
| `wave0_start` | `specs/gates/wave0-start.md` | `hook_setup_to_wave0_start` | `specs/QUEUE_CONTRACT.md -> Critical Checkpoint Receipts -> setup_ready -> Wave 0 start` | `check-gate-setup-ready`; `check-queue-receipts` |
| `wave1_start` | `specs/gates/wave1-start.md` | `hook_wave0_closeout_to_wave1_start` | `specs/QUEUE_CONTRACT.md -> Critical Checkpoint Receipts -> Wave 0 closeout -> Wave 1 start` | `check-gate-wave0-complete`; `check-queue-receipts` |
| `wave2_start` | `specs/gates/wave2-start.md` | `hook_wave1_closeout_to_wave2_start` | `specs/QUEUE_CONTRACT.md -> Critical Checkpoint Receipts -> Wave 1 closeout -> Wave 2 start` | `check-gate-wave1-complete`; `check-queue-receipts` |

## Gate Principles

- A gate passes only through an explicit audit surface in `STATUS_PATH` plus the local evidence files that audit cites. Audit text without the referenced reference/topic/artifact files is not a pass surface.
- A later wave cannot start until the prior wave's audit has `overall_result=pass` and the matching entry flag is `yes`.
- Start boundary gates are enforced by hooks and Queue receipts, not by adding extra `current_gate` enum values. A prior audit pass is necessary but not sufficient: the boundary hook must verify receipts, write/sync required state, and leave concrete non-chat continuation work.
- A Wave 0 or later gate transition must also leave a distinct diagnostic checkpoint in `TRACE_PATH` with the exact single `gate_transition` field value for that boundary (`wave0_complete`, `wave1_complete`, `wave2_complete`, or `readiness_passed`) and update `STATUS_PATH -> Trace Pointer.last_trace_entry` to that checkpoint. Trace is not routine progress, but gate transitions are diagnostic state changes and must not be silently skipped or bulk-backfilled at the end. A later `correction` / `gate_correction` entry can diagnose missing checkpoints, but it cannot count as the missing transition checkpoint.
- A gate cannot pass from prose confidence, loose readable summaries, artifact count, chat memory, or oversized/multi-source reference files. One reference file normally represents one source; a multi-source reference file cannot be counted as multiple sources.
- Wave 0, Wave 1, Wave 2, and Readiness gates are mandatory hard audits. No instance-level option may weaken, disable, skip, or replace them.
- Wave 0, Wave 1, and Wave 2 gate passage does not authorize user-visible stopping. After each wave gate passes, the execution agent must keep `stop_authorization_state=unauthorized_continue_required`, keep `safe_to_interrupt=no`, write the required trace checkpoint, sync the active queue, and start the next non-chat continuation action unless a concrete decision blocker is recorded.
- Research profiles may set configured floor values during instantiation, but they do not create separate gate logic. Gate audits always compare against the configured values recorded in `PROFILE_PATH` and mirrored in `PLAN_PATH.Instance Config`.
- `setup_ready` is a non-research transition gate. It passes only when the execution workspace exists and status/queue are synced; it does not count as a Wave 0/1/2/Readiness evidence gate and cannot satisfy any source floor.
- If later evidence invalidates a passed gate, use Gate Reopen: restore `current_gate` to the last still-valid prior gate, refill the affected wave queue, and record the reopen reason in status and trace.
- If runtime topology formalization adds or redirects a topic that affects a passed gate, treat that as gate invalidation. Reopen only the affected gate path, refill same-wave repair work, and keep existing topic ids stable.
- Accepted local references are the evidence unit for source floors.
- Counted evidence requires an accepted reference inventory with local paths, acceptance status, source type, trust level, source family, source tier, evidence role, source date scope, supported claims, seed-backfill status, webpage diagnostic fields, cross-verification status, and content retention decision. Numeric totals are summaries, not proof.
- Counted inventory rows use canonical machine values from `specs/CONSTANTS.md`.
- Counted reference filenames preserve provenance: Wave 0 shared foundation uses `00-shared-*.md`; Wave 1 topic evidence uses `<topic-id>-*.md`. Opaque global `ref-NNN-*` filenames are not valid for newly counted V12 references because they hide whether the evidence belongs to shared foundation or topic deepening.
- Counted webpage evidence must pass the Webpage Material Diagnostic Gate in `specs/METHODOLOGY.md`.
- Excluded or reviewed-but-uncounted sources must remain visible when they affected a gate decision.
- Topic artifacts are derived synthesis, not decoration. A topic artifact can support a gate only when it has substantive body, cites local reference paths where evidence-backed, and its `produced_at_ref_count` is synchronized with `accepted_topic_ref_count` at the gate audit. `question-list.md` owns the four-section Wave 1 exploration ledger, including Topic Investigation Targets and exploration questions; `evidence-summary.md` owns Topic Target Coverage.
- Wave 2 is a synthesis wave, not a status flag. `wave2_complete` requires a real `ARTIFACT_DIR/wave2/cross-topic-synthesis.md`, coverage of confirmed `answer_phase=wave2_synthesis` must-answer entries, populated `Cross-Topic Conclusion Matrix`, local backing-reference paths for every counted judgment, conflict/tension reconciliation, and trace checkpoint. Single-topic runs may mark comparison as `not_applicable_single_topic` only on concrete locally backed synthesis rows. Short ids such as `ref-060` without local paths are not backing refs.
- Readiness is not the same update as Wave 2. It requires a separate retrieval/handoff check from local files after Wave 2 artifacts and matrix rows exist, plus a recorded HITL2 human decision checkpoint with answerability and final report view or repair/rerun consequence. A user-facing HITL2 stop is valid only after the Wave 2 human-decision brief exists and PROFILE/STATUS/QUEUE are synced to the HITL2 `pending_user` decision state.
- Failed audits keep or restore the run to the last valid gate and refill same-wave queue work.
- If status already claimed a gate passed before the audit passed, correct status and append a diagnostic trace entry.
- "Continue?", "continue or adjust direction?", "await user review", or a progress recap after a wave gate is a gate failure in the user-visible stop contract when executable queue work exists.

## Research Profiles

Profile presets, floor formulas, applicability boundaries, and critical-claim posture live in `specs/RESEARCH_PROFILES.md`.

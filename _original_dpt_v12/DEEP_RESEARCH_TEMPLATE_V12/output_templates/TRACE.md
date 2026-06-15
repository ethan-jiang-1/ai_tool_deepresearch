---
title: "Output Skeleton - TRACE"
role: "copyable output skeleton"
scope: "template source for TRACE_PATH only"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/METHODOLOGY.md"
writes:
  - "<TRACE_PATH>"
---

# Output Skeleton - TRACE

Copy only the content between `BEGIN TRACE OUTPUT` and `END TRACE OUTPUT` into `TRACE_PATH`.

Replace every instantiation placeholder before delivery. Runtime metavariables may remain only inside explicit schema/template/pattern guidance. Do not copy this file's frontmatter.

<!-- BEGIN TRACE OUTPUT -->
# <PLAN_NAME> Diagnostic Trace

> profile: `<PROFILE_PATH>`
> plan: `<PLAN_PATH>`
> status: `<STATUS_PATH>`
> This file records only diagnostic turning points. It does not replace Worklog, Status, or Queue.

## File Role Snapshot

- role: `append-only diagnostic history`
- not_authority_for: `routine progress, active queue, gate passage, evidence body`
- routine_navigation: `use <PROFILE_PATH> for user intent/profile decisions, <STATUS_PATH> for run state, and <QUEUE_PATH> for active actions`
- static_note: `this snapshot must not be updated as live progress`

## Pre-Work Framework Boundary

- framework_snapshot: `<RUN_DIR>/_framework`
- framework_readonly_rule: `pre-work framework snapshot is read-only after instantiation; read it for policy, commands, and read-only diagnostics only; do not edit, regenerate, normalize, or write run state inside _framework`
- framework_repair_rule: `missing same-version snapshot paths may be repaired only through <RUN_DIR>/_framework/command_playbooks/repair-framework-snapshot.md; never hand-edit _framework and never copy _framework/output_templates over root control files`

## Write Rules

- write only for direction change, hypothesis reversal, confound, structural decision, topology formalization, premature gate correction, reusable execution lesson, or correction of a prior diagnosis
- required checkpoint: Wave 0, Wave 1, Wave 2, and Readiness transitions always write one trace entry in the same closeout that changes the gate state
- transition coverage: each reached transition needs its own distinct trace entry whose `gate_transition` field value is exactly `wave0_complete`, `wave1_complete`, `wave2_complete`, or `readiness_passed`; one entry must not cover multiple gate transitions
- correction boundary: `gate_correction` or `correction` entries may diagnose missed checkpoints, but they do not satisfy required transition coverage and must not be used as retroactive proof that earlier Wave 0/1/2 checkpoints happened
- checkpoint sync: after a required checkpoint is appended, immediately update `<STATUS_PATH> -> Trace Pointer.last_trace_entry` to the newest trace label
- checkpoint timing: do not bulk-backfill trace entries later to simulate continuity; if a checkpoint was missed, write a correction trace that says it was missed and repair the status pointer
- post-gate continuation: Wave 0, Wave 1, and Wave 2 transition checkpoints must record the next non-chat continuation action or the concrete blocker. A checkpoint that only says the wave passed is incomplete.
- stop authorization: transition checkpoints must leave `stop_authorization_state=unauthorized_continue_required` unless the run is fully at `final_delivery`, a concrete `decision_blocker`, or documented `empty_queue_after_refill`
- do not write routine progress, quota progress, or ordinary reference capture
- append-only
- if a prior diagnosis is wrong, append a correction trace instead of editing history

## Required Transition Coverage

- `wave0_complete`: one distinct transition checkpoint in the Wave 0 closeout; must cite Wave 0 audit evidence and concrete Wave 1 continuation
- `wave1_complete`: one distinct transition checkpoint in the Wave 1 closeout; must cite Wave 1 audit evidence, artifact/backfill state, and concrete Wave 2 continuation
- `wave2_complete`: one distinct transition checkpoint in the Wave 2 closeout; must cite Wave 2 synthesis evidence and concrete HITL2/readiness preparation
- `readiness_passed`: one distinct closeout checkpoint in the Readiness closeout; must cite local retrieval/handoff evidence and final-delivery closure state
- coverage_rule: `at any later gate, all earlier transition checkpoints must still exist as separate entries; a final readiness correction cannot replace missing Wave 0, Wave 1, or Wave 2 entries`

## Trace Entries

- none_recorded_yet: `yes`

When first trace entry appears, delete `none_recorded_yet` and use this block per entry:

### Trace `{NN}`: `<one-line slug>`

- timestamp: `{YYYY-MM-DD HH:MM}`
- context: `<which wave / which topic / what was being attempted>`
- action: `<what was done - concrete and specific>`
- outcome: `<what happened - do not sugarcoat>`
- diagnosis: `<why it happened - causal reasoning, not just correlation>`
- decision: `<what to do next based on this diagnosis>`
- gate_transition: `<exactly one of not_applicable / wave0_complete / wave1_complete / wave2_complete / readiness_passed / gate_reopened / gate_correction; transition coverage requires exact single values, not arrows, ranges, or multi-gate summaries>`
- evidence_bundle: `<not_applicable or local audit/artifact/reference paths that justified this transition>`
- queue_consequence: `<next wave refill / same-wave repair / readiness closeout / gate reopen repair / not_applicable>`
- continuation_action_started: `<not_applicable or concrete non-chat tool/file/search/check/refill/promotion action started after this transition>`
- stop_authorization_state_after_entry: `<unauthorized_continue_required / final_delivery / decision_blocker / empty_queue_after_refill>`
- unauthorized_stop_next_action_after_entry: `<not_applicable or concrete next action when stop_authorization_state_after_entry=unauthorized_continue_required>`
- status_pointer_sync: `<updated STATUS Trace Pointer.last_trace_entry to this trace label / correction_needed>`
- topology_delta_decision: `<not_applicable / pending / merge_existing / formalize_new_topic / suspend / archive / redirect>`
- topology_candidate: `<not_applicable or candidate slug / description>`
- trigger_refs: `<not_applicable or local reference paths / evidence route that triggered the topology decision>`
- affected_gates: `<not_applicable / setup_ready / wave0_complete / wave1_complete / wave2_complete / readiness_passed>`
- new_topic_id: `<not_applicable or appended stable topic id>`
- why_not_emergent_question: `<not_applicable or why this required topology formalization instead of staying as a normal [涌现] question>`
- tags: `<confound | direction_change | hypothesis_reversed | topology_formalization | premature_gate_correction | cross_run_transfer | strategy_shift | correction | ...>`
<!-- END TRACE OUTPUT -->

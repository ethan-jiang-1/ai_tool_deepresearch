# Changelog — DPT_FRAMEWORK

## v0.4

- **breaking (delegated work-unit pipeline):** delegated sub-agent execution now uses one production path: queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate. `operate-work-unit claim/submit/fail/timeout/abandon/inspect` replaces the prior delegated completion path, while `operate-queue complete` remains for non-delegated queue work only.
- **breaking (queue/work identity):** queue demand identity is `queue_item_id`; `work_id` is reserved for Engine-allocated delegated attempts. Queue state now uses queue v2 `active_window`, `refill_pool`, `delegated_in_flight`, and `terminal_history`.
- **provenance/gates:** submitted work-unit ledger rows are the delegated coverage authority. Gates use `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`; `_work_units/` state, output files, receipts, and cache trails are cross-check surfaces.
- **experiments/tests:** controlled E2E and regression tests were rewritten around work-unit claim/submit, invalid-submit rejection, terminal attempts, timeout retry, duplicate submit, stale binding, mixed-provenance rejection, cache trail validation, and submitted-ledger evidence extraction.
- **fix (phase handoff witnessing, CPT-003/CPT-004/GSK-007):** gate pass handoff now requires `enter-phase --node <check.next>` to write a route-bound `load_complete` witness before source-gate `advance-status` can certify status. Covered lifecycle gates use shared handoff/status-window preflight instead of trusting own-gate `current_gate` before pass.
- **fix (HITL2/rerun branching):** HITL2 proceed and rerun decisions now emit their selected deterministic target into `gate_attempt.next`; rerun-ready runs under the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` status window until rerun itself passes.
- **diagnostics (GSK-008/SWE-003):** gate attempts now expose Engine-derived attempt diagnostics and pass-side autonomous continuation advice; silent execution guidance explains why continuing to `phase-final` is the helpful behavior.
- **experiments/tests (AGT-010):** added standard disposable-bundle handoff witnessing E2E coverage for unwitnessed status rejection, old-style next-gate laundering, route-bound entry metadata, HITL2 rerun, rerun→seed-topics, superseded passes, and entry-witness-vs-work-completion boundaries.

## v0.3

- **historical fix (prior delegated path):** v0.3 corrected a wave-indexing bug in the earlier delegated transport. That transport is no longer a current production path; current delegated work uses the v0.4 work-unit lifecycle above.

## v0.2

- (prior release — see git history)

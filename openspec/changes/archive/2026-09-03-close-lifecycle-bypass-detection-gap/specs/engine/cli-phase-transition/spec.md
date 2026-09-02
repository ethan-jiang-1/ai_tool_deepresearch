> req: CPT-006, CPT-009

## MODIFIED Requirements

### Requirement: Phase status drift audit SHALL detect impossible current_gate/next_gate windows and manual bypass suspicion

The phase transition tooling SHALL provide an audit that compares `rb_status.json` with deterministic route evidence from `rb_trace.jsonl`, `manifest.json`, and `transitions.chain.json`, and additionally with two presence/presentation surfaces: canonical `rb_plan.md## Progress` checkbox states and canonical `final/` primary-series file presence evaluated against legal Final-entry and post-final admission evidence. Normal lifecycle windows SHALL remain authorized by the latest passed source gate, route-bound `load_complete`, and `phase_transition` evidence.

An accepted prepared post-final workspace SHALL short-circuit partial profile symptoms as `post_final_recovery_pending` with only the exact recover action, even when the event already exists and only cleanup remains. After event-last commit and workspace cleanup, the accepted `post_final_reentry` exception SHALL be evaluated through the same pure event parser used by handoff validation. Before a completed rerun entry, event-backed terminal status/current Final node SHALL be classified as `post_final_reentry_pending_load`; this includes a bound `load_complete` followed by failed `current_node` update. After route-bound rerun `load_complete` and successful current-node update but before status sync, event+load with the still-terminal gate window SHALL be classified as `post_final_reentry_pending_status_sync`. If status equals the derived rerun window but the exact bound `phase_transition` is missing, the same outcome SHALL expose only idempotent `advance-status --to hitl2_recorded`. After existing `advance-status` writes the derived rerun window and exact bound `phase_transition`, the exceptional handoff SHALL pass. Any mismatch, unsupported event, missing binding or caller-edited lookalike SHALL remain drift/manual-bypass evidence.

The audit SHALL be diagnostic and fail-closed. It SHALL NOT mutate `rb_status.json`, `rb_plan.md`, canonical `final/` files, trace, or invent a degradation route, or treat manual edits as valid handoff evidence.

The audit SHALL expose a closed diagnostic outcome vocabulary so downstream advice and tests do not infer ad-hoc meanings. At minimum, outcomes SHALL include `passed`, `post_final_recovery_pending`, `post_final_reentry_pending_load`, `post_final_reentry_pending_status_sync`, `status_drift`, `manual_bypass_suspected`, `missing_witness`, `failed_gate_downstream_status`, `bootstrap_exception`, `premature_final_present`, and `plan_progress_tamper_suspected`. Exceptional outcomes SHALL name the exact accepted workspace/event contract; none SHALL be a generic escape hatch. The `premature_final_present` outcome SHALL reuse the accepted safe primary-series classification and legal admission/legacy-compatibility conclusions rather than reconstructing them; the `plan_progress_tamper_suspected` outcome SHALL compare canonical checked Progress lines only against passed-gate trace witnesses.

#### Scenario: Status claims later phase without trace authorization

- **WHEN** `rb_status.json` claims `current_gate: "hitl2_recorded"` or `next_gate: "readiness_passed"`
- **AND** trace lacks the required normal handoff or accepted post-final recovery event/load evidence
- **THEN** the audit SHALL report phase status drift
- **AND** diagnostics SHALL name the missing predecessor/recovery witness

#### Scenario: Manual status edit suspicion is reported

- **WHEN** `rb_status.json` changes to a status window that cannot be derived from the latest passed deterministic handoff/transition or accepted post-final recovery event stage
- **THEN** the audit SHALL report manual bypass suspicion
- **AND** it SHALL advise returning to the latest authorized owner/action rather than continuing from the edited status

#### Scenario: Failed gate cannot authorize next phase status

- **WHEN** the latest `gate_attempt` for a source phase failed with `next: null`
- **AND** no accepted post-final recovery event applies
- **AND** `rb_status.json` indicates a downstream phase window
- **THEN** the audit SHALL fail with an impossible status window diagnostic
- **AND** it SHALL NOT write a corrective status file

#### Scenario: Legal witnessed handoff passes audit

- **WHEN** trace contains a passed source gate with non-null `next`, a later route-bound `load_complete` for that target, and a matching `phase_transition`
- **AND** `rb_status.json` reflects the corresponding source-gate status window
- **THEN** the audit SHALL pass without drift diagnostics

#### Scenario: Post-final event pending load is explicit

- **WHEN** a valid event-last ReopenResearchPass commit exists under unchanged terminal Final status but `enter-phase` has not yet written its route-bound load
- **THEN** the audit SHALL report `post_final_reentry_pending_load`
- **AND** its only next action SHALL be the exact rerun `enter-phase` command

#### Scenario: Partial rerun entry retries the loader owner

- **WHEN** a valid event has a bound rerun `load_complete` but `current_node` still names terminal Final because entry state update failed
- **THEN** the audit SHALL report `post_final_reentry_pending_load`
- **AND** its only next action SHALL remain the exact rerun `enter-phase` retry

#### Scenario: Prepared post-final workspace masks partial profile drift

- **WHEN** an accepted post-final workspace exists after profile commit and before event append
- **THEN** the audit SHALL report `post_final_recovery_pending`
- **AND** its only next action SHALL be the exact recover command
- **AND** it SHALL NOT emit a competing manual-bypass repair

#### Scenario: Route-bound post-final handoff awaits status sync

- **WHEN** a valid post-final recovery event has a route-bound rerun load, current node is rerun, and gate fields still show terminal Final
- **THEN** the audit SHALL report `post_final_reentry_pending_status_sync`
- **AND** its only next action SHALL be `advance-status --to hitl2_recorded`

#### Scenario: Correct status without bound transition remains pending sync

- **WHEN** event/load/current-node and the derived rerun status window are correct but the exact event/load-bound `phase_transition` is absent
- **THEN** the audit SHALL report `post_final_reentry_pending_status_sync`
- **AND** its only next action SHALL be idempotent `advance-status --to hitl2_recorded`

#### Scenario: Route-bound and synchronized post-final handoff passes audit

- **WHEN** a valid post-final recovery event has a route-bound rerun load and matching exceptional `phase_transition`
- **AND** status/current-node match the derived rerun window
- **THEN** the audit SHALL pass without requiring a synthetic gate attempt
- **AND** SHALL preserve recovery event context in diagnostics

#### Scenario: Bootstrap exception is explicit and narrow

- **WHEN** the audit accepts a bootstrap compatibility status window
- **THEN** the result SHALL use outcome `bootstrap_exception`
- **AND** diagnostics SHALL name the exact exception rather than treating arbitrary missing witnesses as acceptable

#### Scenario: Premature canonical Final file is reported

- **WHEN** a file matching canonical primary-series names exists under `final/`
- **AND** that file is not covered by any accepted Final admission/lineage evidence chain: no legal Final-entry admission for the current lineage, no admitted delivery evidence of a prior legal lineage, no accepted post-final recovery/entry stage, and no explicit legacy compatibility
- **THEN** the audit SHALL report `premature_final_present` naming the file
- **AND** diagnostics SHALL state the single legal remediation: relocation out of canonical primary-series naming

#### Scenario: Hand-checked Progress box without witness is reported

- **WHEN** a canonical `- [x] <gate>` line exists in `rb_plan.md## Progress`
- **AND** trace lacks that gate's passed `gate_attempt` with its route-bound consumption witness
- **THEN** the audit SHALL report `plan_progress_tamper_suspected` naming the gate line
- **AND** it SHALL NOT treat the checked line as completion, coverage, or handoff evidence

#### Scenario: Legal post-final rerun intermediate stages are not misreported as premature

- **WHEN** accepted post-final recovery/entry stages hold their exact `post_final_*` classifications
- **AND** canonical Final files from the prior legal lineage exist
- **THEN** the audit SHALL NOT report `premature_final_present` for those files
- **AND** the outcome SHALL remain the exact accepted `post_final_*` stage

#### Scenario: Legally admitted Final files are not premature

- **WHEN** canonical Final files are covered by legal Final-entry admission evidence, admitted delivery evidence of a prior legal lineage (including during an active rerun), or explicit legacy compatibility
- **THEN** the audit SHALL NOT report `premature_final_present`

## ADDED Requirements

### Requirement: Route-bound entry output SHALL surface a bounded lifecycle-integrity summary

`enter-phase` output SHALL include a bounded lifecycle-integrity summary whenever the same projection evaluated by the phase status audit yields any non-`passed` outcome for the current bundle. The summary SHALL reuse the audit's closed outcome vocabulary, SHALL name the offending surface (status window, trace witness gap, plan Progress line, or `final/` file), SHALL follow the existing inspect/diagnostic output conventions, and SHALL point to the audit command for the complete verdict. On an all-`passed` projection the summary MAY be omitted. The summary SHALL add no routing, interaction, or state authority beyond existing outputs, SHALL NOT duplicate the full audit report, and SHALL NOT change the entry verdict for a legal target: entry legality continues to be decided solely by the accepted handoff evidence.

#### Scenario: Entry with drift surfaces the summary

- **WHEN** `enter-phase` loads a legal next node while the integrity projection reports `premature_final_present` or `plan_progress_tamper_suspected`
- **THEN** the enter-phase output SHALL include the integrity summary naming those outcomes and the offending surfaces
- **AND** it SHALL point to the audit command for the complete verdict
- **AND** the loaded node and entry witnesses SHALL remain unchanged

#### Scenario: Clean entry adds no noise

- **WHEN** the integrity projection is fully `passed`
- **THEN** `enter-phase` MAY omit the summary
- **AND** the existing entry output contract remains otherwise unchanged

#### Scenario: Summary is diagnostic only

- **WHEN** the integrity summary is emitted
- **THEN** it SHALL NOT mutate status, trace, plan, or `final/` files
- **AND** it SHALL NOT block or redirect a legally authorized entry

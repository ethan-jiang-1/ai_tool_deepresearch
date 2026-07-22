## ADDED Requirements

> req: RRD-001, RRD-011, RRD-012

### Requirement: Setup-ready route binds final host-file checkpoint bytes

For a setup-ready candidate that otherwise passes its deterministic rules, the existing shared gate-attempt helper SHALL establish one ordered commit boundary: durable non-routing content-evaluation diagnostic first; bounded Progress write next; one durable route-pending checkpoint over the actual resulting `rb_plan.md` bytes next; and the routable passed `gate_attempt` trace last. Before these writes it SHALL generate one `gate_attempt_id`; the checkpoint and route trace SHALL both record that same identifier. The pending checkpoint SHALL use `trigger: setup_route_pending`, include `content_evaluation_ref`, `route_state: pending`, and the final plan hash, and SHALL NOT claim an existing `gate_attempt` or passed `gate_result_ref`; only the later route trace establishes a passed handoff. Thus a failed trace append leaves the one checkpoint as truthful pending evidence rather than a false passed attempt. The route trace SHALL record the same final plan hash used by the route-binding check. This is a staged mode of the existing shared helper, not a second trace writer, checkpoint writer, or Gate finalizer.

The setup-ready route trace SHALL additionally contain non-empty `gate_attempt_id`, `checkpoint_ref`, and `plan_sha256` fields. `checkpoint_ref` SHALL be a normalized bundle-relative `_checkpoints/<filename>.json` path, directly naming one file in `_checkpoints/`; it SHALL not contain `..`, an additional directory segment, or a symlink, and SHALL resolve to an existing regular `.json` file. The referenced pending checkpoint SHALL contain the same `gate_attempt_id`; `trigger: setup_route_pending`; `route_state: pending`; no `gate_result_ref`; `content_evaluation_ref` with exactly the route facts `gate`, `passed`, `currentNodeRef`, and `candidate_next`; and `hashes["rb_plan.md"].sha256`. Its content-evaluation facts SHALL equal the trace's `gate`, `passed`, `currentNodeRef`, and `next`, and its plan hash SHALL equal the trace's `plan_sha256`.

If Progress write fails, the old full plan SHALL remain unchanged, no checked Progress claim SHALL be emitted, and the checkpoint/route may describe only bytes that actually exist. If the required checkpoint cannot be durably written, or its later bound route trace cannot be durably appended, the Engine SHALL NOT append a routable setup-ready passed trace or report a consumable `check.next`. The one staged helper invocation SHALL return its structured persistence outcome; the CLI SHALL emit the standard failed Gate envelope with `check.passed: false` and `check.next: null`, preserving a structured authority-integrity persistence finding that distinguishes the already-passed content rules from the missing legal handoff evidence and directs the Agent to repair the direct persistence problem and rerun the same Gate. It SHALL NOT re-invoke ordinary gate-attempt audit for that outcome or create a second checkpoint.

`enter-phase` SHALL reject a setup-ready handoff whose `checkpoint_ref` is absent, unsafe, nested, unreadable, non-regular, a symlink, or outside `_checkpoints/`; whose pending checkpoint lacks the stated trigger/state/field shape; whose checkpoint path, `gate_attempt_id`, content-evaluation facts, or plan hash disagrees with the route trace; or whose bound plan hash no longer agrees with the current plan bytes. It SHALL not treat a later append-only failure trace as a retraction of a prior passed route. This requirement adds neither a second checkpoint authority nor a drift exemption.

#### Scenario: final Progress bytes match the only consumable handoff
- **WHEN** setup-ready passes and its Progress mutation commits
- **THEN** the routed attempt references a durable checkpoint whose `rb_plan.md` hash equals the actual final plan bytes
- **AND** its `checkpoint_ref`, `gate_attempt_id`, and `content_evaluation_ref` bind the same setup-ready route facts in both directions
- **AND** `enter-phase` can consume that route only while the binding remains valid

#### Scenario: missing checkpoint blocks handoff consumption
- **WHEN** setup-ready diagnostics exist but the required checkpoint cannot be written or is absent
- **THEN** no setup-ready passed route is consumable
- **AND** the CLI emits `check.passed: false` and `check.next: null` with the checkpoint persistence fact as its direct blocker
- **AND** `enter-phase` rejects the attempted downstream entry with the checkpoint as the direct missing fact

#### Scenario: route append failure leaves truthful pending evidence
- **WHEN** setup-ready content rules pass and its route-pending checkpoint is durable but the later bound trace append fails
- **THEN** the checkpoint remains marked `route_state: pending` with its actual plan hash and content evaluation
- **AND** no passed `gate_attempt` route exists
- **AND** the CLI emits the standard failed envelope rather than a fabricated or retractable passed handoff

## MODIFIED Requirements

### Requirement: Phase boundary SHALL record a reentry checkpoint manifest

After each ordinary gate attempt, the Engine SHALL write a lightweight checkpoint manifest under `_checkpoints/<iso>-<gate>.json`. For setup-ready only, RRD-011's staged route mode writes one route-pending checkpoint before its routable passed trace; that manifest is not a passed `gate_attempt` or handoff authority until the later bound trace exists.

Every ordinary checkpoint manifest SHALL include:
- `schema_version`
- `created_at`
- `bundle`
- `trigger`: `gate_attempt`
- `gate_result_ref`: enough fields to identify the triggering gate result (`gate`, `passed`, `currentNodeRef`, `next`)
- `status_snapshot`: current `rb_status.json` gate fields at checkpoint write time
- `normalized_target` when available
- topic registry summary
- queue summary
- artifact inventory for `seed_topics/`, `reference/`, `artifacts/`, and `final/`
- `cursors`: line counts for `rb_output_declarations.jsonl`, `rb_trace.jsonl`, and `_logs/run.log`
- `hashes`: size, mtime, and sha256 for control files and phase-owned artifacts

An RRD-011 setup-ready pending checkpoint SHALL instead use `trigger: setup_route_pending`, omit `gate_result_ref`, and include `gate_attempt_id`, `content_evaluation_ref` (`gate`, `passed`, `currentNodeRef`, `candidate_next`), `route_state: pending`, and its actual final `rb_plan.md` hash. The later routable trace SHALL bind that same identifier, checkpoint reference, and hash. The manifest SHALL NOT copy artifact contents.

An ordinary checkpoint SHALL represent runtime state at its gate-attempt audit time. A setup-ready pending checkpoint SHALL truthfully represent content evaluation and route-pending state, not a later route/status transition. It SHALL NOT pretend to describe a later `advance-status` transition unless that transition has already occurred and is visible in bundle files.

When multiple checkpoint manifests exist, reentry tooling SHALL select the latest non-pending checkpoint whose `gate_result_ref.gate` or `normalized_target.status_gate` matches the requested target. Any route-pending setup-ready checkpoint remains inspectable diagnostic evidence but SHALL NOT qualify as a passed handoff checkpoint or global fallback baseline, even when a later bound route trace exists. If no matching non-pending checkpoint exists, tooling MAY fall back to the latest non-pending checkpoint for global drift context, but SHALL report the absence of a target-matching checkpoint as inspect/advice.

#### Scenario: ordinary gate attempt records checkpoint
- **WHEN** an ordinary gate CLI writes a `gate_attempt`
- **THEN** `_checkpoints/` SHALL contain a new manifest for that gate
- **AND** the manifest SHALL include status, queue summary, artifact inventory, ledger/trace/log cursors, schema version, trigger, gate result reference, and hashes

#### Scenario: setup route-pending checkpoint becomes bound handoff evidence
- **WHEN** setup-ready content evaluation passes and the staged route mode writes its checkpoint before its route trace
- **THEN** the checkpoint SHALL identify `trigger: setup_route_pending`, `route_state: pending`, its `gate_attempt_id`, `content_evaluation_ref`, and actual plan hash
- **AND** only a later matching route trace makes that checkpoint usable for the setup handoff

#### Scenario: reentry selects latest matching checkpoint
- **WHEN** `_checkpoints/` contains multiple checkpoint manifests
- **AND** `check-reentry --at wave1_complete` is executed
- **THEN** reentry tooling SHALL select the newest checkpoint matching `wave1_complete` / `wave1-complete`
- **AND** it SHALL report when only a global fallback checkpoint was available

## ADDED Requirements

### Requirement: Route-pending checkpoint is not a reentry baseline

`check-reentry` SHALL exclude any checkpoint with `route_state: pending` from both target-matching checkpoint selection and global checkpoint fallback. It MAY expose such a checkpoint as diagnostic evidence, including its `gate_attempt_id`, content-evaluation status, and plan hash, and MAY separately report a matching bound `gate_attempt` trace as the setup-ready handoff fact; it SHALL still report that no passed checkpoint baseline exists. A later route trace never changes the pending checkpoint's baseline eligibility.

The reentry checker SHALL NOT let pending evidence suppress, reclassify, or explain drift, status, or handoff facts. This adds no second reentry path: a passed route trace remains the only setup-ready handoff authority.

#### Scenario: only pending setup checkpoint is not selected
- **WHEN** `_checkpoints/` contains a route-pending setup-ready checkpoint but no bound setup-ready passed trace
- **THEN** `check-reentry --at setup_ready` reports the missing passed checkpoint baseline, whether or not a matching route trace is present
- **AND** it may list the pending checkpoint only as diagnostic evidence
- **AND** it SHALL not return that checkpoint as the selected baseline or treat setup handoff as complete

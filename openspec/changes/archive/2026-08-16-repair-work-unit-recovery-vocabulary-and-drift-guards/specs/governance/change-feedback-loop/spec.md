## MODIFIED Requirements

### Requirement: Governed archive finalization SHALL establish one mechanical closeout verdict

The repository SHALL provide one deterministic finalization interface for a
selected active feedback-lifecycle change. It SHALL resolve authoritative
change and planning paths from OpenSpec, verify required artifacts, verify
exactly one completed plan-review marker and one completed closeout-review
marker with no other incomplete task, run strict OpenSpec validation, and then
run requirement-traceability, main-spec, capability-taxonomy,
capability-discovery, verification-routing asset, semantic-closure asset,
content-drift, guidance-pointer-target, surface-inventory, phase-node-structure,
and spec-requirement-id checks in that order.

Only after those direct facts pass, and only after the Agent has completed any required semantic delta/main sync
and re-comparison, the finalizer SHALL invoke the native OpenSpec archive transition in its no-spec-write mode.
It SHALL verify the native result against the resolved active/archive locations before reporting success. On the
first unmet direct prerequisite it SHALL return a structured root with the observed fact, owning surface, one
legal repair coordinate when an accepted operation exists, and the same finalizer rerun coordinate. It SHALL
not implement its own spec merge, archive naming, directory move, rollback, test runner, semantic review
verdict, or persistent lifecycle state.

The finalizer SHALL pass the exact selected active change to the
requirement-traceability archive check. It SHALL not use a no-scope invocation,
infer that another active change is ready, or turn another change's valid
plan-stage reservation into a selected-change archive failure.

#### Scenario: incomplete feedback task blocks before native archive

- **WHEN** a selected change has an incomplete task or an incomplete/missing required review marker
- **THEN** finalization SHALL fail before invoking native archive
- **AND** it SHALL identify the direct task fact and the finalizer rerun coordinate

#### Scenario: ordered governance failure short-circuits finalization

- **WHEN** strict validation, requirement traceability, main-spec structure,
  taxonomy, discovery record, verification-routing assets, semantic-closure
  assets, content drift, guidance pointer targets, surface inventory, phase
  node structure, or spec requirement IDs fail
- **THEN** finalization SHALL report the earliest failing direct check before native archive
- **AND** it SHALL not perform a directory move, write main specs, or infer test success

#### Scenario: Pending reservation blocks selected finalization

- **WHEN** the selected change's reservation has not yet become a live prefix,
  live requirement-ID entries, and canonical main-spec declarations
- **THEN** finalization SHALL return its requirement-traceability root before
  main-spec, taxonomy, discovery, verification-routing, semantic-closure, or
  native archive
- **AND** it SHALL preserve the selected change in the requirement-check rerun
  coordinate

#### Scenario: semantic closure assets fail after verification routing

- **WHEN** verification-routing asset validation passes but the selected
  semantic-closure asset check finds a missing resolver, consumer, catalog, or
  verification coordinate
- **THEN** finalization SHALL report the semantic-closure root before native
  archive
- **AND** it SHALL not re-run or reinterpret verification-routing as a semantic
  verdict

#### Scenario: successful finalization delegates the canonical move

- **WHEN** all mechanical prerequisites pass after required semantic sync and re-comparison
- **THEN** finalization SHALL invoke native OpenSpec archive in no-spec-write mode
- **AND** it SHALL report success only when the native result and resolved archive location agree

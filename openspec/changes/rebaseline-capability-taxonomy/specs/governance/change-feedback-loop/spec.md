> req: CHF-003

## MODIFIED Requirements

### Requirement: Governed archive finalization SHALL establish one mechanical closeout verdict

The repository SHALL provide one deterministic finalization interface for a
selected active feedback-lifecycle change. It SHALL resolve authoritative
change and planning paths from OpenSpec, verify required artifacts, verify
exactly one completed plan-review marker and one completed closeout-review
marker with no other incomplete task, run strict OpenSpec validation, and then
run requirement-traceability, main-spec, capability-taxonomy,
capability-discovery, and verification-routing asset checks in that order.

Only after those direct facts pass, and only after the Agent has completed any
required semantic delta/main sync and re-comparison, the finalizer SHALL invoke
the native OpenSpec archive transition in its no-spec-write mode. It SHALL
verify the native result against the resolved active/archive locations before
reporting success. On the first unmet direct prerequisite it SHALL return a
structured root with the observed fact, owning surface, one legal repair
coordinate when an accepted operation exists, and the same finalizer rerun
coordinate. It SHALL not implement its own spec merge, archive naming,
directory move, rollback, test runner, semantic review verdict, or persistent
lifecycle state.

#### Scenario: Incomplete feedback task blocks before native archive

- **WHEN** a selected change has an incomplete task or an incomplete or missing
  required review marker
- **THEN** finalization fails before invoking native archive
- **AND** it identifies the direct task fact and the finalizer rerun coordinate

#### Scenario: Taxonomy failure short-circuits finalization

- **WHEN** strict validation, requirement traceability, main-spec structure,
  taxonomy, discovery record, or verification-routing assets fail
- **THEN** finalization reports the earliest failing direct check before native
  archive
- **AND** it does not perform a directory move, write main specs, or infer test
  success

#### Scenario: Successful finalization delegates the canonical move

- **WHEN** all mechanical prerequisites pass after required semantic sync and
  re-comparison
- **THEN** finalization invokes native OpenSpec archive in no-spec-write mode
- **AND** it reports success only when the native result and resolved archive
  location agree

> req: RWG-022

## ADDED Requirements

### Requirement: Wave0 shared-reference convergence SHALL evaluate submitted backing before a floor verdict

Wave0 inspect and formal Gate SHALL consume one shared, side-effect-free convergence result before reporting a `shared_ref_count_floor` deficit. The evaluator SHALL combine the existing current canonical topic/layout facts, profile floor, submitted Wave0 source contributions, authenticated source/cache/work-unit facts, legacy delegated reference coverage, Phase-owned projection coverage, reference/index navigation facts, and existing numeric count result without creating a second ledger, source catalog, parser, controller, or persistent status.

For each relevant source identity, the convergence result SHALL distinguish: valid legacy delegated coverage; valid Phase-owned projection coverage; a materializable submitted source contribution; invalid, ambiguous, superseded, or unsubmitted backing; genuinely missing acquisition coverage; and a true remaining shared-reference floor deficit. Its materialization outcome SHALL include only bounded exact backing and target coordinates needed for the Phase Agent to author one legal consumer projection and rerun the same inspect. Gate execution SHALL remain read-only and SHALL not select source relevance, author a reference, mutate an index, or convert a candidate into authority.

When a materializable candidate exists, inspect and Gate SHALL expose that candidate before a dependent floor result from the same convergence branch. An independent malformed reference, provenance, queue, receipt, cache, or navigation root SHALL remain independently visible. A true floor deficit may be reported only after materializable coverage cannot satisfy the applicable floor and relevant direct authority prerequisites have been evaluated.

#### Scenario: materializable submitted backing precedes a Wave0 floor deficit

- **WHEN** Wave0 has an authenticated submitted source identity without a countable shared reference and its exact backing can materialize a legal Phase-owned projection
- **THEN** inspect and Gate SHALL return the same materialization-first root with exact source identity and rerun checkpoint
- **AND** they SHALL not report that candidate's remaining shared-reference floor deficit until the projection path is rerun

#### Scenario: true deficit remains after convergence

- **WHEN** every relevant submitted source identity is either already covered, explicitly unavailable through the existing direct authority, or not materializable
- **AND** countable valid references remain below the applicable shared-reference floor
- **THEN** inspect and Gate SHALL report one true remaining floor deficit with the existing repair boundary
- **AND** they SHALL not invent a delegated rich-reference output route for a new Wave0 attempt

#### Scenario: independent invalid backing is not hidden by a candidate

- **WHEN** one submitted Wave0 source identity is materializable and a separate shared reference has malformed or unsubmitted backing
- **THEN** the materialization result SHALL suppress only its own later convergence floor outcome
- **AND** the separate invalid-backing root SHALL remain a primary blocking diagnostic

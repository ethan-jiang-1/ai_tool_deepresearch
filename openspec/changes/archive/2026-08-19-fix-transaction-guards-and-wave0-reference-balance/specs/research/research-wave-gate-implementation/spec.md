## MODIFIED Requirements

### Requirement: Wave0 shared-reference convergence SHALL evaluate submitted backing before a floor verdict

Wave0 inspect and formal Gate SHALL consume one shared, side-effect-free convergence result before reporting a `shared_ref_count_floor` deficit. The evaluator SHALL combine the existing current canonical topic/layout facts, profile floor, ledger-ordered retained Wave0 source-contribution prefixes through the current rerun, authenticated source/cache/work-unit facts, legacy delegated reference coverage, Phase-owned projection coverage, reference/index navigation facts, and existing numeric count result without creating a second ledger, source catalog, parser, controller, or persistent status. Generic current-round work eligibility remains separate demand coverage and SHALL NOT reassign a retained prefix identity.

For each relevant source identity, the convergence result SHALL distinguish: valid legacy delegated coverage; valid Phase-owned projection coverage; a materializable submitted source contribution; invalid, ambiguous, superseded, or unsubmitted backing; genuinely missing acquisition coverage; and a true remaining shared-reference floor deficit. Its materialization outcome SHALL include only bounded exact backing and target coordinates needed for the Phase Agent to author one legal consumer projection and rerun the same inspect. Gate execution SHALL remain read-only and SHALL not select source relevance, author a reference, mutate an index, or convert a candidate into authority.

When a materializable candidate exists, the evaluator SHALL select it by cross-topic balance: the exposed candidate SHALL come from the Topic with the fewest already-projected Phase-owned source identities among Topics that still have an unprojected materializable candidate, breaking ties by lexicographic `topic_slug`, and SHALL take that Topic's lowest retained unprojected source ordinal. The selection SHALL NOT use global lexicographic candidate order across Topics and SHALL NOT rank sources by research relevance. Deferral-eligible identities remain excluded before the balance count. Inspect and Gate SHALL expose that one balanced candidate before a dependent floor result from the same convergence branch. An independent malformed reference, provenance, queue, receipt, cache, or navigation root SHALL remain independently visible. A true floor deficit may be reported only after materializable coverage cannot satisfy the applicable floor and relevant direct authority prerequisites have been evaluated. The wave Gate's native completion SHALL bind this convergence-derived floor verdict through the accepted root-trace prefix without a second trace sink.

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

#### Scenario: later rerun append keeps prior backing and exposes only its new identity

- **WHEN** one accepted prior contribution owns a retained source prefix and a current rerun accepts a strictly longer source array at the same canonical target
- **THEN** inspect and Gate SHALL retain the prior contribution's identities and expose the later work unit only for its appended interval
- **AND** they SHALL not invalidate a correctly backed prior Phase-owned reference solely because that work unit is not current-round demand coverage

#### Scenario: materialization selection is cross-topic balanced

- **WHEN** multiple Topics have unprojected materializable submitted candidates and the shared-reference floor is not yet satisfied
- **THEN** the exposed candidate SHALL come from the Topic with the fewest already-projected Phase-owned identities, ties broken by lexicographic `topic_slug`
- **AND** within that Topic it SHALL be the lowest retained unprojected source ordinal
- **AND** repeated materialize-and-rerun cycles SHALL NOT advance one Topic to a second projected identity while another Topic with an unprojected materializable candidate still has zero

#### Scenario: balance selection does not rank source relevance

- **WHEN** two Topics have equal projected counts and both have unprojected candidates
- **THEN** the evaluator SHALL break the tie only by the deterministic `topic_slug` order
- **AND** it SHALL NOT prefer a Topic or source because its content looks more relevant, richer, or higher-tier

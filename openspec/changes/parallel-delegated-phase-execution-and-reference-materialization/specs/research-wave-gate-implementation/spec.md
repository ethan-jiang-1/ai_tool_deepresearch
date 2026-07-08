> req: RWG-017

## ADDED Requirements

### Requirement: Wave gates SHALL implement Phase-owned reference projection and delegated evidence split

Wave gate definitions and CLIs SHALL distinguish Phase-owned reference projections from delegated fetched evidence. Wave1 gates SHALL continue to require topic reference files for consumer navigation and SHALL validate their format, index entries, parseable source URLs, and submitted backing. They SHALL NOT require the topic reference file itself to be a delegated output when it is Phase-owned and backed by submitted Wave1 source claims, accepted source URL surfaces, verified cache trails, or explicit degraded-capture records.

Wave2 gates SHALL allow pure-synthesis `reference/00-cross-*.md` files when they are existing-backed projections with concrete Wave0/Wave1 submitted evidence and Wave2 `W2F-xxx` ledger/index refs. Wave2 gates SHALL still require submitted `wave2_targeted_evidence` coverage for any `00-cross` reference or finding that claims newly fetched external evidence.

Delegated bypass diagnostics SHALL be precise: unbacked fetched-source references remain blocking, but legitimate Phase-owned projections SHALL NOT be reported as bypass solely because the Phase Agent wrote them.

When classification is ambiguous, Wave gates SHALL prefer blocking backing diagnostics over permissive inference. A legal file name, valid reference format, or `_INDEX.md` row SHALL NOT be enough for pass if the gate cannot bind the reference to submitted/prior accepted backing or to submitted targeted-evidence coverage.

For existing-backed Wave2 `00-cross` references, Wave2 gates SHALL verify that the reference does not satisfy `source_url` with a synthetic or newly discovered public URL. The `source_url` SHALL bind to prior accepted backing unless the reference is backed by submitted targeted evidence.

#### Scenario: Wave1 gate accepts backed Phase-owned topic reference

- **WHEN** a Wave1 topic reference file exists, passes reference format checks, appears in `_INDEX.md`, and its source URL binds to submitted Wave1 source claims, accepted source URL surfaces, verified cache trails, or explicit degraded-capture records
- **THEN** the Wave1 gate SHALL treat the reference projection as backed without requiring that reference path in delegated `output_files[]`
- **AND** delegated evidence coverage SHALL still require submitted evidence-summary/question-list/source/cache backing

#### Scenario: Wave1 gate rejects unbacked topic reference

- **WHEN** a Wave1 topic reference file exists but its source URL cannot be tied to submitted Wave1 source claims, accepted source URL surfaces, verified cache trails, or explicit degraded-capture backing
- **THEN** the Wave1 gate SHALL fail or diagnose reference backing drift
- **AND** advice SHALL direct supplementary `wave1_topic_deepening` or reference repair

#### Scenario: Wave2 gate accepts existing-backed pure-synthesis cross reference

- **WHEN** Wave2 pure synthesis writes `reference/00-cross-*.md`
- **AND** the reference cites `W2F-xxx` plus concrete submitted Wave0/Wave1 backing refs
- **THEN** the Wave2 gate SHALL NOT require a Wave2 targeted-evidence row solely because the cross reference exists

#### Scenario: Wave2 gate rejects new evidence without targeted coverage

- **WHEN** a Wave2 `00-cross` reference claims a newly fetched external source or a finding records targeted search as submitted
- **AND** no submitted `wave2_targeted_evidence` row backs that source/finding
- **THEN** the Wave2 gate SHALL fail delegated provenance
- **AND** delegated bypass diagnostics SHALL name the missing targeted work-unit coverage

#### Scenario: Wave2 gate rejects synthetic cross-reference source URL

- **WHEN** an existing-backed `reference/00-cross-*.md` uses a `source_url` that is not a prior accepted backing source URL
- **AND** no submitted `wave2_targeted_evidence` row backs that URL
- **THEN** the Wave2 gate SHALL fail reference backing validation
- **AND** diagnostics SHALL direct repair to a prior accepted source URL, body backing refs, targeted evidence, or a limitation

#### Scenario: reference index remains required for consumer navigation

- **WHEN** Wave1 or Wave2 materializes reference files
- **THEN** `reference/_INDEX.md` SHALL include matching rows with the correct source layer
- **AND** missing index rows SHALL be reported as reference navigation drift, not as delegated work-unit evidence by themselves

#### Scenario: gate refuses ambiguous reference authority

- **WHEN** a reference has valid format and appears in `_INDEX.md`
- **AND** the gate cannot determine whether it is a backed Phase-owned projection or a submitted fetched-source evidence surface from bundle files
- **THEN** the gate SHALL fail or emit blocking diagnostics
- **AND** advice SHALL name the missing submitted backing, missing targeted evidence row, or missing prior-wave refs needed for repair

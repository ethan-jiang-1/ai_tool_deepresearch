# Final Delivery Backing Specification

> req: FDB-001, FDB-002

## Purpose

Make each Final Markdown delivery expose a small, reader-visible declaration
that connects its selected key findings to evidence with authenticated submitted
backing, without turning prose quality into an Engine verdict.

## Requirements

### Requirement: Final Markdown reports SHALL expose a bounded Evidence Map

A Final Markdown report persisted to a safe bundle-relative Markdown target
under `final/` SHALL contain one designated `Evidence Map` section. That
section is the complete set of Final key-finding declarations for the report:
its table SHALL contain at least one body row, and each map row SHALL provide a
non-empty finding identifier, a non-empty declared key finding, and one or more
standard Markdown links in a submitted-backing cell. A finding MAY use more
than one map row when every row for that identifier declares the same key
finding.

The designated section SHALL be the only report section parsed for this
capability. Heading level, heading case, cell padding, and table column order
SHALL be tolerant when the three named columns can be identified unambiguously;
the report SHALL fail when the section is absent, the table is absent, empty,
or ambiguous, a required cell is empty, a repeated identifier declares a
different finding, or a backing cell contains no parseable Markdown link.

The Evidence Map is a reader-facing declaration, not a new ledger, lifecycle
state, Gate, trace event, or report-wide citation scanner. The Agent SHALL
select which conclusions are Final key findings and whether the linked material
substantively supports them; the Engine SHALL not infer additional declarations
from report prose or make a semantic-quality verdict.

#### Scenario: A report with no Evidence Map is rejected

- **WHEN** a Final Markdown staging report has no designated `Evidence Map`
  section
- **THEN** the Final-backing check SHALL reject it before Final persistence
- **AND** its feedback SHALL identify the missing section and direct the Agent
  to repair the retained staging report and rerun the same Final-report
  persistence operation

#### Scenario: A malformed declaration row is rejected

- **WHEN** an Evidence Map table has a missing finding identifier or declared
  finding, a missing backing cell, no parseable Markdown link, ambiguous named
  columns, or conflicting text for a repeated identifier
- **THEN** the Final-backing check SHALL reject the report as a structural
  declaration failure
- **AND** it SHALL identify the smallest affected map row rather than scan or
  diagnose unrelated report prose

#### Scenario: An empty map is rejected

- **WHEN** an Evidence Map table has its header but no declaration body row
- **THEN** the Final-backing check SHALL reject the report before persistence
- **AND** it SHALL not treat an empty heading or table shell as evidence
  traceability

#### Scenario: Multiple backing rows describe one finding

- **WHEN** two Evidence Map rows use the same finding identifier and the same
  non-empty declared key finding
- **AND** each row names at least one valid submitted backing link
- **THEN** the Final-backing check SHALL accept both rows as backing for one
  declared finding

### Requirement: Declared Final backing SHALL resolve to submitted evidence

For every Markdown link declared in a Final Evidence Map, the Engine SHALL
resolve its file path relative to the intended Final report target. The resolved
path SHALL remain a safe bundle-relative non-symlink regular file and SHALL
exist before the report is committed. The Engine SHALL accept only either:

- an exact `output_files` declaration on an Engine-accepted submitted work-unit
  row whose role is `source_yaml` or `evidence_summary`; or
- a `reference/` artifact that the existing reference-authority classifier
  accepts as submitted evidence or a Phase-owned projection with submitted
  backing.

The Engine SHALL reject unsafe, absolute, missing, unsubmitted, failed,
filesystem-only, cache-only, Final-output, finding-index-only, synthesis-only,
or otherwise unclassified paths. A `reference/` path SHALL not become evidence
authority merely by existing on disk; its existing submitted-backing
classification remains decisive.

The check proves the declared link's structural path and submitted provenance
only. It SHALL not determine whether a source's contents actually support the
declared key finding, whether the finding is complete, or whether the report is
well written.

#### Scenario: Direct submitted evidence backs a declared finding

- **WHEN** an Evidence Map link resolves to an existing path declared with role
  `source_yaml` or `evidence_summary` by an Engine-accepted submitted work-unit
  row
- **THEN** the Final-backing check SHALL accept that link as direct submitted
  backing

#### Scenario: A submitted-backed reference projection backs a declared finding

- **WHEN** an Evidence Map link resolves to an existing `reference/` artifact
- **AND** the existing reference-authority classifier accepts that artifact
  through submitted or Phase-owned submitted backing
- **THEN** the Final-backing check SHALL accept that link without creating a
  second reference-authority rule

#### Scenario: Unsubmitted artifact is not Final backing

- **WHEN** an Evidence Map link resolves to an existing file written by a
  failed, unsubmitted, or otherwise unauthenticated attempt
- **THEN** the Final-backing check SHALL reject the link
- **AND** it SHALL not treat disk presence, a cache trail, a Final file, a
  synthesis index, or nearby report prose as substitute evidence authority

#### Scenario: A symlink does not become Final backing

- **WHEN** an Evidence Map link resolves to a symlink, including one whose
  destination is otherwise a submitted output or submitted-backed reference
- **THEN** the Final-backing check SHALL reject the link before persistence
- **AND** it SHALL not treat the symlink destination as a substitute for the
  required safe regular-file identity

#### Scenario: Structural backing does not become a semantic verdict

- **WHEN** an Evidence Map row has a structurally valid link to submitted
  backing but its declared finding is not substantively supported by that
  material
- **THEN** the deterministic Final-backing check MAY pass the row's structural
  provenance contract
- **AND** semantic adequacy SHALL remain an Agent or human review concern

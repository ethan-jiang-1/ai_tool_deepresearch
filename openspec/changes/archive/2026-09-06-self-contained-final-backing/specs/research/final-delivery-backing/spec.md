> req: FDB-002

## MODIFIED Requirements

### Requirement: Declared Final backing SHALL resolve to submitted evidence

For every Markdown link declared in a Final Evidence Map, the Engine SHALL
resolve its file path relative to the intended Final report target. The resolved
path SHALL remain a safe bundle-relative non-symlink regular file and SHALL
exist before the report is committed. The Engine SHALL accept any of:

- an exact `output_files` declaration on an Engine-accepted submitted work-unit
  row whose role is `source_yaml` or `evidence_summary`;
- a `reference/` artifact that the existing reference-authority classifier
  accepts as submitted evidence or a Phase-owned projection with submitted
  backing; or
- a **self-contained materialized detail file** inside the same version's
  bound auxiliary directory: a link resolving to
  `final/final_v<N>/<file>.md` or
  `final/final_<feature>_v<N>/<file>.md` (the version-bound auxiliary
  directory matching the report's own version) SHALL be accepted when that
  file exists as a safe regular file. Such a detail file is part of the same
  self-contained delivery unit (primary report + version auxiliary
  directory) and its own Evidence Map was admitted when it was persisted; it
  SHALL NOT be required to trace to a submitted work-unit declaration or a
  `reference/` projection.

The Engine SHALL reject unsafe, absolute, missing, unsubmitted, failed,
filesystem-only, cache-only, Final-output, finding-index-only, synthesis-only,
or otherwise unclassified paths. A `reference/` path SHALL not become evidence
authority merely by existing on disk; its existing submitted-backing
classification remains decisive. A self-contained detail file SHALL only be
accepted as backing when it lies inside the version-bound auxiliary directory
matching the report's own version; a file in another version's directory, in a
supplementary directory, or elsewhere under `final/` is NOT accepted by this
rule (it may still be accepted through the direct or reference paths above).

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

#### Scenario: A same-version self-contained detail file backs a declared finding

- **WHEN** an Evidence Map link resolves to an existing safe regular file inside
  the version-bound auxiliary directory matching the report's own version
  (e.g. `final/final_v4/07-evidence-details.md` referenced from
  `final/final_v4.md`)
- **THEN** the Final-backing check SHALL accept that link as self-contained
  materialized detail
- **AND** it SHALL NOT require the detail file to trace to a submitted
  work-unit declaration or reference projection

#### Scenario: A detail file in another version directory is not self-contained backing

- **WHEN** an Evidence Map link resolves to a file inside an auxiliary
  directory whose version differs from the report's own version
- **THEN** the Final-backing check SHALL NOT accept it through the
  self-contained rule
- **AND** it SHALL fall back to the direct/reference rules (and reject if
  neither applies)

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

> req: ARP-004, ARP-005

## MODIFIED Requirements

### Requirement: Final publication SHALL emit strict results and protect the reserved primary namespace

`publish-final-report` SHALL retain the existing behavior of allocating global
`latest + 1` for every legal evidence-expanding delivery, and SHALL add one
distinct presentation-revision path for polish-only changes. A presentation
revision SHALL be chosen only by the Final Agent's bounded semantic judgment
(presentation-only vs evidence-expanding, same origin as the existing post-final
routing decision): the Evidence Map backing set and the submitted fact set SHALL
remain unchanged and only structure, length, wording, emphasis, or presentation
of existing verified evidence SHALL differ. A presentation revision SHALL
compare-and-swap update the bytes of the current latest primary revision file
(`final/final_v<N>.md` or the labelled equivalent) at its existing canonical
target, using the current file digest as the expected prior condition, and SHALL
NOT allocate a new global version, create a new primary revision file, or change
`latest` or `next_version`. The presentation revision SHALL be permitted only on
the current `latest` primary revision; any earlier (non-latest) primary revision
bytes SHALL remain immutable and SHALL NOT be the target of a presentation
revision. It SHALL record one REVISIONS.md row (time, summary, prior digest,
new digest) in the version's bound auxiliary directory. A presentation
revision SHALL NOT be used for any new source, new Topic, new research
conclusion, or research-profile change; those SHALL use the existing audited
post-final rerun path and a new global version.

`retire-final-version` SHALL be a human-controlled correction operation on the
same persistence surface. It SHALL accept the selected bundle, one `--version`
and optional `--feature`, and SHALL retire **only the current latest primary
revision** (retiring an intermediate or non-latest version SHALL be rejected,
preserving the contiguous `1..latest` primary sequence invariant): it SHALL
move the selected primary revision file to the existing `final/attic/` area
(retaining the original filename or a uniform retired suffix), SHALL write a
retired marker (retired_at, retired_by=user, original version/feature, reason),
and SHALL recompute `latest` as the previous revision. It SHALL NOT delete or
rewrite the moved bytes (immutability of history is preserved; retirement only
changes membership of the current authoritative series; the archived bytes stay
in final/attic/ and do not participate in the current primary series), and SHALL
be invocable only by an explicit user request — the Agent SHALL NOT auto-retire
any version. After retirement the primary sequence remains contiguous: the
next legal evidence-expanding publication allocates the current latest + 1
version, which may numerically equal the retired version number while the
retired bytes remain archived in final/attic/.

The Engine SHALL derive the canonical primary inventory and classify it before
any publication or retirement, applying the existing safe-target and immutable
rules. Non-primary nested or non-reserved Final artifacts MAY remain
supplementary and SHALL not enter version allocation.

#### Scenario: Single legacy report becomes read-only v0

- **WHEN** a selected historical bundle has no final/final.md, exactly one safe root-level report such as final/report.md, and no canonical revision
- **THEN** inventory SHALL classify that report as legacy v0
- **AND** the first publication SHALL append final/final_v1.md without renaming or rewriting the legacy file

#### Scenario: Ambiguous legacy inventory fails closed

- **WHEN** no modern base exists and multiple root-level non-reserved Markdown candidates exist
- **THEN** publication SHALL block with the ambiguous candidates and no allocated target
- **AND** it SHALL not choose by mtime, lexical order, size, or content

#### Scenario: Invalid canonical inventory fails closed

- **WHEN** the primary namespace contains a duplicate number, a missing prior revision, an orphan revision, unsafe entry, case-fold collision, or unparseable reserved name
- **THEN** publication SHALL return one direct inventory blocker before workspace creation
- **AND** it SHALL not repair, renumber, delete, or overwrite history

#### Scenario: Invalid backing has no persistence side effect

- **WHEN** a proposed primary report has absent, malformed, unsafe, missing, or unsubmitted Evidence Map backing
- **THEN** publication SHALL return structured backing rejection with the nearest repair fact and same operation to rerun
- **AND** it SHALL create no target or accepted publication workspace and SHALL retain staging

#### Scenario: Generic persist cannot bypass Final backing admission

- **WHEN** generic persist or caller-targeted persist-final-report receives a direct-root target in the reserved final/final*.md namespace
- **THEN** it SHALL reject before workspace preparation or mutation
- **AND** it SHALL direct the Agent to publish-final-report without accepting a caller version

#### Scenario: An unsafe Final-looking target remains invalid configuration

- **WHEN** any persistence operation receives an unsafe or malformed target that resembles Markdown under final/
- **THEN** it SHALL return the existing configuration failure class with exit code 2 before workspace preparation
- **AND** it SHALL not report normal backing rejection, primary allocation, or a generic-persist redirect

#### Scenario: Crash recovery cannot bypass Final backing admission

- **WHEN** publication crashes after a prepared payload is durable but before no-clobber target creation, or after target creation but before workspace cleanup
- **THEN** sweep SHALL revalidate backing and recover or clean exactly that allocated publication
- **AND** it SHALL not allocate another version, overwrite a conflicting target, or bypass inventory lineage

#### Scenario: Polish-only change stays in the current version

- **WHEN** the Final Agent judges a staging report presentation-only (Evidence Map backing set and submitted facts unchanged; only wording/structure/emphasis differ)
- **THEN** `publish-final-report` SHALL publish a revision presentation file (e.g. `report-r<M>.md`) inside the version's bound auxiliary directory
- **AND** SHALL NOT allocate a new global version, create a new primary revision file, or rewrite the immutable primary bytes of `final_v<N>.md`
- **AND** SHALL append one REVISIONS.md row in the version's bound auxiliary directory

#### Scenario: Evidence-expanding change allocates a new version

- **WHEN** a staging report adds a new source, Topic, research conclusion, or research-profile change
- **THEN** the audited post-final rerun path SHALL be used
- **AND** the resulting legal Final delivery SHALL allocate global `latest + 1` as today

#### Scenario: Human retires the latest spuriously created version

- **WHEN** an explicit user request retires the current latest version N via `retire-final-version --version N`
- **THEN** the Engine SHALL move `final/final_v<N>.md` (or the labelled equivalent) to `final/attic/`, write the retired marker, and recompute `latest` as the previous revision
- **AND** SHALL NOT delete or rewrite the moved bytes
- **AND** the next legal evidence-expanding publication SHALL allocate latest + 1 (which may numerically equal N while the retired bytes stay archived in final/attic/)

#### Scenario: Retiring a non-latest version is rejected

- **WHEN** an explicit user request attempts to retire an intermediate or non-latest version
- **THEN** the Engine SHALL reject before any target mutation, preserving the contiguous primary sequence
- **AND** it SHALL return a structured error naming the latest version as the only retireable target

#### Scenario: Agent cannot auto-retire

- **WHEN** an Agent attempts to retire a version without an explicit user request
- **THEN** the operation SHALL reject the request before any target mutation
- **AND** SHALL return a structured error naming the human-owned boundary

### Requirement: Final auxiliary directories SHALL bind to their primary version

A recognized auxiliary directory (`final_v<N>` or `final_<feature>_v<N>`) SHALL
classify as `auxiliary` with the same version/feature as its bound revision, SHALL
remain non-primary, and SHALL NOT enter the primary version series, change
`latest`/`next_version`, participate in the witness digest, or be allocated a
version — as today. In addition, each primary revision SHALL carry a bound
auxiliary directory containing a self-contained evidence-details file (e.g.
`07-evidence-details.md`) that materializes, for every declared key finding: the
conclusion summary, key numbers, caliber labels, and clickable external source
URLs. Every external URL in the evidence-details file SHALL resolve to the
submitted-reference frontmatter `source_url` set (no fabricated links). The
primary report's Evidence Map SHALL direct readers to the bound auxiliary
directory's evidence-details file; readers SHALL be able to verify every
conclusion from the public delivery (primary MD + bound auxiliary directory)
without accessing internal `artifacts/` or `reference/` paths. The Evidence Map
backing column SHALL retain its existing submitted-backing semantics for audit.

#### Scenario: Auxiliary directory binds its unlabelled revision

- **WHEN** final/ contains final/final_v2.md and a real directory final/final_v2/
- **THEN** the inventory SHALL classify the directory as auxiliary with version 2 and feature null
- **AND** the series SHALL remain valid with final_v2.md as its only primary revision for that version

#### Scenario: Labelled auxiliary directory binds its labelled revision

- **WHEN** final/ contains final/final_technical_deep_dive_v2.md and a real directory final/final_technical_deep_dive_v2/
- **THEN** the inventory SHALL classify the directory as auxiliary with version 2 and feature technical_deep_dive
- **AND** the series SHALL remain valid with that labelled revision as the only primary entry for version 2

#### Scenario: Auxiliary directory does not enter primary allocation

- **WHEN** a valid series has base final/final.md, revisions through final_v2.md, and directories final/final_v1/ and final/final_v2/
- **THEN** latest SHALL be the final_v2 primary revision and next_version SHALL be 3
- **AND** neither auxiliary directory SHALL appear in primary_entries or change the primary-series witness digest

#### Scenario: Orphan auxiliary directory blocks

- **WHEN** final/ contains a real directory final/final_v3/ but no final/final_v3.md
- **THEN** the series SHALL return valid: false with one orphan_auxiliary_directory blocker naming final_v3
- **AND** it SHALL NOT repair, renumber, rename, or delete the directory or any history

#### Scenario: Version grammar without an exact name match is an orphan

- **WHEN** final/ contains the labelled revision final/final_technical_deep_dive_v2.md and a real directory final/final_v2/ but no final/final_v2.md
- **THEN** final/final_v2/ SHALL NOT bind the labelled revision
- **AND** the series SHALL block with one orphan_auxiliary_directory blocker naming final_v2

#### Scenario: Version-decoupled directory stays supplementary

- **WHEN** final/ contains a real directory final/chips/ or final/topics/
- **THEN** the inventory SHALL classify the directory as supplementary with no version and no feature
- **AND** the series SHALL NOT block on that directory

#### Scenario: Evidence details are self-contained in the version directory

- **WHEN** a primary revision is published with a bound auxiliary directory
- **THEN** the directory SHALL contain an evidence-details file materializing every key finding's conclusion, numbers, caliber labels, and external source URLs
- **AND** every external URL SHALL be traceable to a submitted reference frontmatter `source_url` (fabricated links SHALL be rejected before persistence)

#### Scenario: Orphan auxiliary directory still blocks

- **WHEN** `final/` contains a real directory matching the auxiliary grammar but no matching primary revision file
- **THEN** the series SHALL return `valid: false` with one `orphan_auxiliary_directory` blocker naming that directory
- **AND** it SHALL NOT repair, renumber, rename, or delete the directory or any history

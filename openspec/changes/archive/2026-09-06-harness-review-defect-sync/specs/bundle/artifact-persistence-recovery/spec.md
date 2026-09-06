# artifact-persistence-recovery Specification (delta)

> req: ARP-001, ARP-002, ARP-003, ARP-004, ARP-005

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
same persistence surface. It SHALL accept the selected bundle, one `--version`,
an optional `--feature`, and one non-empty `--user-confirmation` carrying the
user's verbatim retirement request. Every pre-check — latest-only selection,
target collision, auxiliary-directory collision, and auxiliary-directory
safety — SHALL complete before the first filesystem mutation, so a `blocked`
verdict SHALL always imply zero mutation of the bundle. Only after all
pre-checks pass SHALL it retire **only the current latest primary revision**
(retiring an intermediate or non-latest version SHALL be rejected,
preserving the contiguous `1..latest` primary sequence invariant): it SHALL
move the selected primary revision file to the existing `final/attic/` area
(retaining the original filename or a uniform retired suffix), SHALL write a
retired marker (retired_at, retired_by=user, original version/feature, reason),
and SHALL recompute `latest` as the previous revision. It SHALL NOT delete or
rewrite the moved bytes (immutability of history is preserved; retirement only
changes membership of the current authoritative series), SHALL NOT reuse the
retired version number (the sequence never reuses a number), and SHALL be
invocable only by an explicit user request — the CLI SHALL reject a missing or
empty `--user-confirmation` as an invocation/configuration error before the
Engine is invoked, the Engine SHALL validate the retire request schema at
entry, and the Agent SHALL NOT auto-retire any version.

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

- **WHEN** an explicit user request retires the current latest version N via `retire-final-version --version N --user-confirmation "<verbatim user request>"`
- **THEN** the Engine SHALL move `final/final_v<N>.md` (or the labelled equivalent) to `final/attic/`, write the retired marker, and recompute `latest` as the previous revision
- **AND** SHALL NOT delete or rewrite the moved bytes
- **AND** SHALL NOT reuse version number N in any later allocation

#### Scenario: Retiring a non-latest version is rejected

- **WHEN** an explicit user request attempts to retire an intermediate or non-latest version
- **THEN** the Engine SHALL reject before any target mutation, preserving the contiguous primary sequence
- **AND** it SHALL return a structured error naming the latest version as the only retireable target

#### Scenario: Agent cannot auto-retire

- **WHEN** an Agent attempts to retire a version without `--user-confirmation` (missing, empty, or not carrying a user request)
- **THEN** the CLI SHALL reject the invocation as an invocation/configuration error before the Engine is invoked
- **AND** the bundle SHALL remain byte-identical

#### Scenario: Blocked retirement implies zero mutation

- **WHEN** a retire request passes the confirmation guard but a pre-check fails (for example an auxiliary-directory collision in `final/attic/`)
- **THEN** the Engine SHALL return a `blocked` verdict naming the collision
- **AND** no bundle path — primary revision, auxiliary directory, or `final/attic/` — SHALL have been created, moved, or rewritten by that invocation

> req: CDP-008

## ADDED Requirements

### Requirement: Final guidance SHALL bind auxiliary detail archives to their version and maintain the series index

`phase-final.md` SHALL direct the Phase Agent to treat one delivered Final
version as exactly one primary report plus one same-named auxiliary detail
archive directory:

- version N's primary report is `final/final_v<N>.md` (or
  `final/final_<feature>_v<N>.md`); and
- its auxiliary detail archive is the directory `final/final_v<N>/` (or
  `final/final_<feature>_v<N>/`), whose name is the primary report filename with
  its `.md` suffix removed.

A version's auxiliary detail files SHALL live only under that version's own
directory. A primary report's ordinary-prose cross-references to auxiliary
detail SHALL target only its own auxiliary directory; they SHALL NOT use
another version's directory as its detail archive. These prose
cross-references are not Evidence Map backing, which SHALL continue to resolve
only to submitted evidence.

Committed history SHALL remain read-only: older versions' primary reports and
their auxiliary directories SHALL stay byte-identical, and new detail for a
new version SHALL be written only into that new version's files and directory.
A version-decoupled directory name such as `chips/` or `supplement/` SHALL NOT
be created for a version's archive.

The Agent SHALL maintain `final/README.md` as the bundle's single document
authority for the naming and independence convention and the version release
record. On every new committed version the Agent SHALL update `final/README.md`
through the non-primary `persist-final-report` path. `final/README.md` and every
auxiliary detail Markdown SHALL each carry its own bounded Evidence Map and
SHALL NOT become canonical primary delivery or version authority by existing.

#### Scenario: One version pairs a primary report with a same-named archive

- **WHEN** Final composes version N
- **THEN** guidance SHALL require the primary report `final/final_v<N>.md` and the archive directory `final/final_v<N>/`
- **AND** the archive directory name SHALL equal the primary report filename without `.md`

#### Scenario: Auxiliary detail stays inside its version directory

- **WHEN** Final writes auxiliary detail for version N
- **THEN** it SHALL be placed under `final/final_v<N>/`
- **AND** it SHALL NOT be placed under another version's directory or a version-decoupled directory

#### Scenario: Primary report cross-references only its own archive

- **WHEN** a primary report links to auxiliary detail in prose
- **THEN** the link SHALL target its own `final/final_v<N>/`
- **AND** it SHALL NOT target another version's archive directory
- **AND** Evidence Map backing links SHALL continue to resolve only to submitted evidence, not Final output

#### Scenario: History stays read-only across versions

- **WHEN** version M with M < N is committed and version N is later composed
- **THEN** `final/final_v<M>.md` and `final/final_v<M>/` SHALL remain byte-identical
- **AND** new detail for version N SHALL be written only under `final/final_v<N>/`

#### Scenario: Series index is maintained through the non-primary path

- **WHEN** a new committed version exists
- **THEN** the Agent SHALL update `final/README.md` through non-primary `persist-final-report`
- **AND** `final/README.md` SHALL describe the naming and independence convention and the version release record
- **AND** it SHALL carry its own bounded Evidence Map and SHALL NOT count as primary delivery

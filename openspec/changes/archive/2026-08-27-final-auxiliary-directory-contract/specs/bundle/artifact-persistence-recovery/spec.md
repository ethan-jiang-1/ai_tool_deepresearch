> req: ARP-005

## ADDED Requirements

### Requirement: Final auxiliary directories SHALL bind to their primary version

The Engine's canonical Final inventory classification SHALL recognize, for each
safe real directory directly under `final/`, a version-bound auxiliary directory
when the directory name equals a canonical revision filename with its `.md`
suffix removed:

- `final_v<N>` binds the unlabelled revision `final_v<N>.md`; and
- `final_<feature>_v<N>` binds the labelled revision
  `final_<feature>_v<N>.md`, with the same safe lowercase snake-case feature and
  the same positive decimal `N`.

A recognized auxiliary directory SHALL classify as `auxiliary` with the same
`version` and `feature` as its bound revision, and SHALL remain non-primary: it
SHALL NOT enter the primary version series, change `latest` or `next_version`,
participate in the primary-series witness digest, or be allocated a version.

A directory whose name matches the auxiliary grammar but has no matching primary
revision file with the identical name plus `.md` SHALL block the series with one
direct `orphan_auxiliary_directory` blocker naming that directory. A directory
whose name does not match the auxiliary grammar SHALL remain `supplementary`
with no version and SHALL NOT block. The classification SHALL read only direct
inventory entry names and kinds; it SHALL NOT read mtime, directory order,
report prose, chat, or lifecycle intent.

#### Scenario: Auxiliary directory binds its unlabelled revision

- **WHEN** `final/` contains `final/final_v2.md` and a real directory `final/final_v2/`
- **THEN** the inventory SHALL classify the directory as `auxiliary` with `version` 2 and `feature` null
- **AND** the series SHALL remain valid with `final_v2.md` as its only primary revision for that version

#### Scenario: Labelled auxiliary directory binds its labelled revision

- **WHEN** `final/` contains `final/final_technical_deep_dive_v2.md` and a real directory `final/final_technical_deep_dive_v2/`
- **THEN** the inventory SHALL classify the directory as `auxiliary` with `version` 2 and `feature` `technical_deep_dive`
- **AND** the series SHALL remain valid with that labelled revision as the only primary entry for version 2

#### Scenario: Auxiliary directory does not enter primary allocation

- **WHEN** a valid series has base `final/final.md`, revisions through `final_v2.md`, and directories `final/final_v1/` and `final/final_v2/`
- **THEN** `latest` SHALL be the `final_v2` primary revision and `next_version` SHALL be 3
- **AND** neither auxiliary directory SHALL appear in `primary_entries` or change the primary-series witness digest

#### Scenario: Orphan auxiliary directory blocks

- **WHEN** `final/` contains a real directory `final/final_v3/` but no `final/final_v3.md`
- **THEN** the series SHALL return `valid: false` with one `orphan_auxiliary_directory` blocker naming `final_v3`
- **AND** it SHALL NOT repair, renumber, rename, or delete the directory or any history

#### Scenario: Version grammar without an exact name match is an orphan

- **WHEN** `final/` contains the labelled revision `final/final_technical_deep_dive_v2.md` and a real directory `final/final_v2/` but no `final/final_v2.md`
- **THEN** `final/final_v2/` SHALL NOT bind the labelled revision
- **AND** the series SHALL block with one `orphan_auxiliary_directory` blocker naming `final_v2`

#### Scenario: Version-decoupled directory stays supplementary

- **WHEN** `final/` contains a real directory `final/chips/` or `final/topics/`
- **THEN** the inventory SHALL classify the directory as `supplementary` with no version and no feature
- **AND** the series SHALL NOT block on that directory

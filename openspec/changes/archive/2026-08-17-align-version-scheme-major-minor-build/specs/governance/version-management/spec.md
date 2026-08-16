## MODIFIED Requirements

### Requirement: CHANGELOG is concise non-authoritative human history

The project SHALL retain a `CHANGELOG.md` file at the repository root as a
concise, human-readable history surface for Deep Research Harness changes. Its
entries MAY summarize notable change history, but SHALL NOT be a current
Harness version, package release, Git release, runtime compatibility, or
execution Source of Record.

Version headings SHALL use the two-dot `MAJOR.MINOR.BUILD` scheme (for
example `0.2.0`, `0.2.1`, `0.3.0`). This change establishes `0.2.0` as the
reset point at which the two-dot scheme takes over from the retired single-dot
`v0.x` headings; the current version at any later time is whatever the
changelog's latest heading says, and this spec SHALL NOT carry a live
current-version value that would need synchronized edits on future bumps.

The project SHALL provide an executable version-bump tool
(`openspec/governance/bump-version.mjs`) that reads the current
`MAJOR.MINOR.BUILD` version from the latest version heading of the root
changelog and:

- SHALL require exactly one explicit bump segment flag: `--build`, `--minor`,
  or `--major`; running with no segment flag SHALL exit non-zero and name the
  required flag instead of bumping anything;
- with `--build` increments only the `BUILD` segment (for example `0.2.0` →
  `0.2.1`);
- with `--minor` increments the `MINOR` segment and resets `BUILD` to `0`
  (for example `0.2.9` → `0.3.0`);
- with `--major` increments the `MAJOR` segment and resets `MINOR` and
  `BUILD` to `0` (for example `0.2.0` → `1.0.0`);
- SHALL reject a combination of bump flags and SHALL reject a changelog whose
  latest heading is not a valid `MAJOR.MINOR.BUILD` version;
- SHALL support a `--dry-run` mode that reports the target version without
  writing the changelog;
- SHALL insert the new version heading immediately after the changelog title
  and before the previous latest entry, so existing entries remain readable
  below the new heading and a bump never drops them;

A version bump (including a `BUILD` bump) SHALL be performed only when a
large, meaningful change has been made; trivial or per-item changes SHALL NOT
bump the version number. An automatic process (Agent or tooling) SHALL only
ever pass the tool's `--build` flag, and only when a human has authorized that
BUILD bump; it SHALL NOT pass `--minor` or `--major`. A `MINOR` or `MAJOR`
increment SHALL be made only through the tool's explicit `--minor` /
`--major` flags, which represent explicit human decision.

The retired single-dot `v0.x` entries SHALL NOT be required to remain in the
CHANGELOG file; their historical inspectability is provided by git history.
A current Agent, Engine, CLI, bundle writer, Gate, or entry document SHALL NOT
derive a behavior choice, release identity, or compatibility decision from an
entry. Detailed behavior and review history remain owned by accepted specs,
governed OpenSpec change artifacts, executable contracts, and Git history as
applicable.

`DEEP_RESEARCH_HARNESS/CHANGELOG.md` SHALL NOT be retained as a separate
history or version authority.

#### Scenario: Root changelog is the version source

> **@deprecated name** - Retained as the historical scenario anchor. The
> current contract makes the root changelog human history, not a version source.

- **WHEN** a developer opens repo-root `CHANGELOG.md`
- **THEN** the file provides concise human-readable historical context
- **AND** its headings do not establish the current Harness version or a
  runtime compatibility choice
- **AND** current behavior is determined by its applicable accepted or
  executable contract rather than by the changelog entry

#### Scenario: Stale Harness-local changelog is removed

- **WHEN** a developer or Agent looks for Harness history
- **THEN** no separate `DEEP_RESEARCH_HARNESS/CHANGELOG.md` authority exists
- **AND** a local copy is not required for entry, bundle creation, or runtime
  execution

#### Scenario: Changelog entry is concise

- **WHEN** a maintainer adds an optional root changelog entry
- **THEN** it consists only of concise human-readable history
- **AND** it does not enumerate implementation detail as a replacement for the
  governed OpenSpec change record
- **AND** it does not create a version, release, runtime, or compatibility
  authority

#### Scenario: Changelog is project root

- **WHEN** a developer looks for optional Harness history
- **THEN** `CHANGELOG.md` remains at the repository root
- **AND** no Harness-local copy is required as an entry or runtime authority

#### Scenario: Version heading uses two-dot MAJOR.MINOR.BUILD

- **WHEN** a maintainer records a notable change in the root changelog
- **THEN** the version heading uses the two-dot `MAJOR.MINOR.BUILD` scheme
  (for example `0.2.0`, `0.2.1`, `0.3.0`)
- **AND** `0.2.0` is the reset point at which the scheme takes over from the
  retired single-dot `v0.x` headings
- **AND** the heading does not establish a runtime compatibility selector

#### Scenario: Tool requires an explicit segment flag

- **WHEN** a maintainer runs `node openspec/governance/bump-version.mjs` with
  no segment flag
- **THEN** the tool exits non-zero without writing the changelog
- **AND** it names the required flag (`--build` / `--minor` / `--major`)

#### Scenario: Explicit build bump increments BUILD

- **WHEN** a maintainer runs
  `node openspec/governance/bump-version.mjs --build` against the root changelog
- **THEN** the tool reads the latest `MAJOR.MINOR.BUILD` heading
- **AND** writes a new heading whose `BUILD` is incremented by one and whose
  `MAJOR` and `MINOR` are unchanged (for example `0.2.0` → `0.2.1`)
- **AND** existing changelog entries remain after the new heading

#### Scenario: Explicit minor bump resets build

- **WHEN** a maintainer runs
  `node openspec/governance/bump-version.mjs --minor`
- **THEN** the tool writes a new heading whose `MINOR` is incremented by one
  and whose `BUILD` is `0` (for example `0.2.9` → `0.3.0`)
- **AND** the `MAJOR` segment is unchanged

#### Scenario: Explicit major bump resets minor and build

- **WHEN** a maintainer runs
  `node openspec/governance/bump-version.mjs --major`
- **THEN** the tool writes a new heading whose `MAJOR` is incremented by one
  and whose `MINOR` and `BUILD` are both `0` (for example `0.2.0` → `1.0.0`)

#### Scenario: Conflicting bump flags are rejected

- **WHEN** a maintainer runs the bump tool with more than one of
  `--minor` / `--major` (or with an unknown flag)
- **THEN** the tool exits non-zero without writing the changelog
- **AND** it names the invalid flag combination

#### Scenario: Invalid latest version is rejected

- **WHEN** the root changelog's latest version heading is not a valid
  `MAJOR.MINOR.BUILD` version
- **THEN** the bump tool exits non-zero without writing the changelog
- **AND** it reports the unparseable heading

#### Scenario: Dry run reports without writing

- **WHEN** a maintainer runs
  `node openspec/governance/bump-version.mjs --dry-run --build`
- **THEN** the tool reports the target version it would write (`0.2.1`)
- **AND** the changelog file is unchanged

#### Scenario: Automatic bump is limited to human-authorized BUILD

- **WHEN** an automatic process (Agent or tooling) bumps the version
- **THEN** it SHALL only pass the tool's `--build` flag, and only when a human
  has authorized that BUILD bump
- **AND** it SHALL NOT pass `--minor` or `--major`
- **AND** a `MINOR` or `MAJOR` increment is made only through the tool's
  explicit `--minor` / `--major` flags, which represent explicit human decision

#### Scenario: Trivial changes do not bump the version

- **WHEN** a small, trivial, or per-item change is made
- **THEN** the version number (including `BUILD`) is not bumped
- **AND** a version bump happens only after a large, meaningful change

#### Scenario: Retired v0.x entries are inspectable via git history

- **WHEN** a developer looks for the pre-`0.2.0` single-dot `v0.x` changelog
  history
- **THEN** the entries are not required to remain in the current CHANGELOG
  file
- **AND** their historical inspectability is provided by git history
- **AND** no behavior, release, or compatibility decision is derived from them

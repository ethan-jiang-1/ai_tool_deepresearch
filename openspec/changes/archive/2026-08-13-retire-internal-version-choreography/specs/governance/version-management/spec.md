> req: VEM-001, VEM-002, VEM-003, VEM-004

## RENAMED Requirements

- FROM: `### Requirement: CHANGELOG is concise and human-readable`
- TO: `### Requirement: CHANGELOG is concise non-authoritative human history`

- FROM: `### Requirement: Every behavior change updates CHANGELOG`
- TO: `### Requirement: Behavior changes do not require changelog updates`

- FROM: `### Requirement: RUN.md banner matches CHANGELOG`
- TO: `### Requirement: RUN.md does not project a changelog version`

- FROM: `### Requirement: Version number decided at proposal time`
- TO: `### Requirement: Proposals do not require an internal release number`

## MODIFIED Requirements

### Requirement: CHANGELOG is concise non-authoritative human history

The project SHALL retain a `CHANGELOG.md` file at the repository root as a
concise, human-readable history surface for Deep Research Harness changes. Its
entries MAY summarize notable change history, but SHALL NOT be a current
Harness version, package release, Git release, runtime compatibility, or
execution Source of Record.

Existing historical entries, including internal `v0.x` headings, SHALL remain
inspectable as history. A current Agent, Engine, CLI, bundle writer, Gate, or
entry document SHALL NOT derive a behavior choice, release identity, or
compatibility decision from an entry. Detailed behavior and review history
remain owned by accepted specs, governed OpenSpec change artifacts, executable
contracts, and Git history as applicable.

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

### Requirement: Behavior changes do not require changelog updates

An OpenSpec change that modifies `DEEP_RESEARCH_HARNESS/` behavior SHALL NOT
be required to update `CHANGELOG.md`. A change MAY add a concise human-facing
history entry when it improves maintenance readability, but the absence of such
an entry SHALL NOT make a proposal, task list, Apply, verification, or archive
incomplete.

The project OpenSpec guidance in `openspec/config.yaml` SHALL NOT require
future behavior changes to create a changelog task or to use a changelog entry
as implementation input.

#### Scenario: Behavior change includes changelog task

> **@deprecated name** - Retained as the historical scenario anchor. The
> current contract makes a changelog task optional rather than mandatory.

- **WHEN** an approved OpenSpec change modifies Harness behavior without adding
  a root changelog entry
- **THEN** its proposal and tasks remain valid without an internal release
  number
- **AND** Apply and archive checks do not fail merely because no changelog task
  or entry exists

#### Scenario: Non-behavior change skips changelog

- **WHEN** a change is behavior-changing or non-behavior-changing
- **THEN** it may omit a root changelog entry without failing lifecycle checks
- **AND** a maintainer may elect to add concise optional history
- **AND** that election does not require an internal version target

#### Scenario: Maintainer adds optional history

- **WHEN** a maintainer elects to add a root changelog entry
- **THEN** the entry is concise human-readable history
- **AND** it does not require an internal `v0.x` number
- **AND** it does not create a synchronized `RUN.md` or bundle-version value

### Requirement: RUN.md does not project a changelog version

`DEEP_RESEARCH_HARNESS/RUN.md` SHALL NOT display an internal Harness version
banner or derive any entry instruction from the latest `CHANGELOG.md` heading.
The entry document SHALL remain a current operational route; it SHALL not be a
release projection or a compatibility selector.

#### Scenario: Version consistency after changelog update

> **@deprecated name** - Retained as the historical scenario anchor. The
> current contract removes the changelog-to-entry version relationship.

- **WHEN** an Agent reads `DEEP_RESEARCH_HARNESS/RUN.md` for a selected new
  research request
- **THEN** the document contains no `DEEP_RESEARCH_HARNESS v<major>.<minor>`
  banner
- **AND** its next operational instruction is not derived from a changelog
  heading
- **AND** changing or omitting an optional changelog entry does not require an
  entry-document synchronization edit

### Requirement: Proposals do not require an internal release number

A proposal that modifies `DEEP_RESEARCH_HARNESS/` behavior SHALL NOT be
required to declare an internal `v0.x` target version. Its Apply tasks SHALL
NOT be required to use an internal target version to update `CHANGELOG.md` or
the `RUN.md` entry surface.

Concrete behavior, scope, risk, verification, and historical review evidence
for a change SHALL remain in its governed OpenSpec artifacts and accepted
contracts. This requirement does not establish a package-versioning or Git
release process.

#### Scenario: Proposal declares version

> **@deprecated name** - Retained as the historical scenario anchor. The
> current contract prohibits treating an internal release number as a proposal
> requirement.

- **WHEN** an OpenSpec proposal changes Harness behavior
- **THEN** it states the behavioral scope, direct owners, risks, and
  verification without declaring an internal `v0.x` target
- **AND** `openspec/config.yaml` does not require a target version or matching
  changelog/banner tasks
- **AND** the proposal does not thereby create a package release or Git tag

#### Scenario: This change uses v0.7

> **@deprecated name** - Retained as the historical scenario anchor. The
> current contract neither requires nor assigns an internal `v0.x` target.

- **WHEN** an OpenSpec proposal changes Harness behavior
- **THEN** its accepted scope and verification determine implementation work
- **AND** no internal `v0.x` value is selected or synchronized into a changelog
  entry or `RUN.md`

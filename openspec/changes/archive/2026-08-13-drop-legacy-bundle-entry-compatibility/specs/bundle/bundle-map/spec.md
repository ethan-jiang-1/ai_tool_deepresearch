> req: BUM-003, BUM-004, BUM-005

## MODIFIED Requirements

### Requirement: BUNDLE_MAP.md replaces START_FROM_HERE.md for new bundles

New bundle instantiation SHALL generate `BUNDLE_MAP.md` and SHALL NOT generate
`START_FROM_HERE.md` as the primary bundle root map.

Framework docs, phase docs, instantiation gates, inspect output, reentry
advice, file-observability expectations, and regression tests SHALL use
`BUNDLE_MAP.md` as the current primary name for new bundles. A current
operational bundle entry exists only when `BUNDLE_MAP.md` and
`BUNDLE_ENTRY.md` both exist at the same bundle root; the map remains passive
navigation and cannot become a map-only entry.

#### Scenario: Instantiation writes new map name

- **WHEN** `instantiate-run-bundle.mjs` creates a new bundle
- **THEN** the generated bundle SHALL contain both `BUNDLE_ENTRY.md` and
  `BUNDLE_MAP.md`
- **AND** the command's success output SHALL name `BUNDLE_MAP.md` rather than
  `START_FROM_HERE.md`

#### Scenario: Current docs use new map name

- **WHEN** static regression scans current framework docs and tests after this
  change
- **THEN** current operational guidance SHALL require the
  `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` pair
- **AND** it SHALL NOT describe `START_FROM_HERE.md` as a current bundle root
  file or `BUNDLE_MAP.md` alone as an operational entry

### Requirement: Legacy START_FROM_HERE.md is diagnostic compatibility only

`START_FROM_HERE.md` is not a current Harness operational compatibility path.
A directory that lacks either `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md`, including
one containing `START_FROM_HERE.md`, SHALL fail current inspection,
continuation, and reentry admission at the same unsupported-current-entry
contract boundary. The Harness SHALL NOT provide migration, auto-upgrade,
compatibility, or a human-only inspect command for such a directory.

When both current files exist, an additional `START_FROM_HERE.md` is
non-authoritative historical debris only. It neither invalidates the current
pair nor forms another entry, map, Gate, queue, handoff, or state authority.
Direct human reading of historical Markdown remains outside the Harness
operational contract.

#### Scenario: Legacy bundle remains inspectable

> **@deprecated scenario name** — Retained solely as the established Scenario
> anchor. The current behavior rejects the former legacy inspection route.

- **WHEN** an existing directory contains `START_FROM_HERE.md` but lacks
  `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md`
- **THEN** deterministic operational tooling SHALL report the
  unsupported-current-entry-contract boundary
- **AND** it SHALL not return deprecation advice that preserves an inspect,
  continue, or reentry success path

#### Scenario: Both map files exist

- **WHEN** a bundle contains `BUNDLE_ENTRY.md`, `BUNDLE_MAP.md`, and
  `START_FROM_HERE.md`
- **THEN** tooling SHALL admit the bundle through the current pair
- **AND** it SHALL treat `START_FROM_HERE.md` as non-authoritative historical
  debris rather than a second entry or map authority

### Requirement: BUNDLE_ENTRY.md serves as the minimal bundle entry point

For a newly instantiated production or disposable runtime bundle, the Harness
SHALL create a `BUNDLE_ENTRY.md` at the bundle root. This file SHALL contain
only the bundle name as a top-level heading, a creator-rendered relative path
to the canonical `DEEP_RESEARCH_HARNESS/` root used at creation, and a
delegation statement directing the reader to bring the file (or its containing
directory) to an Agent, first read `BUNDLE_MAP.md` for the full directory
layout, then read `DEEP_RESEARCH_HARNESS/COMMANDS.md` for available operations.

`BUNDLE_ENTRY.md` SHALL NOT contain lifecycle state, phase/gate values, CLI
commands, route selectors, mutable fields, or copies of Harness documentation.
It is a static creation-time artifact whose sole purpose is to eliminate the
"where do I start" friction for a reader opening a bundle directory.

`BUNDLE_MAP.md` SHALL remain as a passive directory map for deep inspection and
debugging. It SHALL NOT be extended with a continuation invitation section.

A directory is a current operational bundle only when the same root contains
both `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md`. `RUN_BUNDLE.md`,
`START_FROM_HERE.md`, or `BUNDLE_MAP.md` alone SHALL NOT select a current
entry, authorize reconstruction, or require mutation. Extra legacy files next
to a complete current pair are non-authoritative historical debris.

`inspect-bundle.mjs`, reentry, instantiation, and root-file observability SHALL
consume one shared current-entry conclusion. A fresh bundle using the pair
SHALL NOT receive a stale missing-`RUN_BUNDLE.md` warning.

#### Scenario: New bundle has an immediately visible entry point

- **WHEN** a production or disposable creator creates a bundle
- **THEN** its root SHALL contain `BUNDLE_ENTRY.md` with the bundle name, a
  canonical-Harness relative path, and a delegation statement pointing to
  `BUNDLE_MAP.md` (layout) and `COMMANDS.md` (operations)
- **AND** its root SHALL contain `BUNDLE_MAP.md`
- **AND** it SHALL NOT emit `RUN_BUNDLE.md` as a canonical new-bundle file

#### Scenario: Deterministic readers recognize the entry-card succession

- **WHEN** a deterministic inspector, reentry checker, instantiation Gate, or
  root-file audit reads a bundle containing both current files
- **THEN** it SHALL recognize the pair as the expected current entry contract
- **AND** it SHALL not report a missing-`RUN_BUNDLE.md` or unexpected-entry
  diagnostic
- **AND** an extra historical `RUN_BUNDLE.md` SHALL not create another success
  path

#### Scenario: BUNDLE_ENTRY.md does not duplicate authority

- **WHEN** an Agent reads `BUNDLE_ENTRY.md`
- **THEN** it SHALL resolve the Harness path and read `COMMANDS.md` for
  available operations
- **AND** it SHALL obtain current phase, gate, queue, evidence, and decision
  facts from bundle control files, trace, and Engine feedback
- **AND** it SHALL NOT infer those facts from `BUNDLE_ENTRY.md` content

#### Scenario: Legacy bundle entries remain readable

> **@deprecated scenario name** — Retained solely as the established Scenario
> anchor. The current behavior rejects the former legacy entry route.

- **WHEN** an explicitly supplied historical directory lacks
  `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md`
- **THEN** the Harness SHALL reject it as an unsupported current-entry contract
- **AND** it SHALL NOT require a bulk rewrite, manifest migration, or new card
  schema marker

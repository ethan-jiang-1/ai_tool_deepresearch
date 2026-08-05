> req: BUM-005

## RENAMED Requirements

- FROM: `### Requirement: RUN_BUNDLE.md serves as the minimal bundle entry point`
- TO: `### Requirement: BUNDLE_ENTRY.md serves as the minimal bundle entry point`

## MODIFIED Requirements

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

Existing bundles SHALL remain readable without mutation. Their entry resolution
order SHALL be `BUNDLE_ENTRY.md`, legacy `RUN_BUNDLE.md`, then legacy map-only
`BUNDLE_MAP.md`. Absence of all three files is an honest entry failure and
SHALL NOT authorize bundle discovery or reconstruction.

`inspect-bundle.mjs` and root-file observability SHALL recognize
`BUNDLE_ENTRY.md` as an expected static entry. They SHALL recognize a legacy
`RUN_BUNDLE.md` as bounded non-authoritative compatibility rather than an
unexpected runtime artifact. A fresh bundle using `BUNDLE_ENTRY.md` SHALL NOT
receive a stale missing-`RUN_BUNDLE.md` continuation warning.

#### Scenario: New bundle has an immediately visible entry point

- **WHEN** a production or disposable creator creates a bundle
- **THEN** its root SHALL contain `BUNDLE_ENTRY.md` with the bundle name, a
  canonical-Harness relative path, and a delegation statement pointing to
  `BUNDLE_MAP.md` (layout) and `COMMANDS.md` (operations)
- **AND** it SHALL NOT emit `RUN_BUNDLE.md` as a canonical new-bundle file

#### Scenario: Deterministic readers recognize the entry-card succession

- **WHEN** a deterministic inspector or root-file audit reads a new bundle
  containing `BUNDLE_ENTRY.md` and no `RUN_BUNDLE.md`
- **THEN** it SHALL recognize the new card as the expected entry and SHALL NOT
  report a missing-`RUN_BUNDLE.md` or unexpected-entry diagnostic
- **AND** a historical `RUN_BUNDLE.md` SHALL remain a non-blocking legacy
  entry artifact

#### Scenario: BUNDLE_ENTRY.md does not duplicate authority

- **WHEN** an Agent reads `BUNDLE_ENTRY.md`
- **THEN** it SHALL resolve the Harness path and read `COMMANDS.md` for
  available operations
- **AND** it SHALL obtain current phase, gate, queue, evidence, and decision
  facts from bundle control files, trace, and Engine feedback
- **AND** it SHALL NOT infer those facts from `BUNDLE_ENTRY.md` content

#### Scenario: Legacy bundle entries remain readable

- **WHEN** an explicitly supplied historical bundle lacks `BUNDLE_ENTRY.md`
- **THEN** the Agent SHALL read legacy `RUN_BUNDLE.md` when it exists, otherwise
  fall back to `BUNDLE_MAP.md`
- **AND** the Harness SHALL NOT require a bulk rewrite, manifest migration, or
  new card schema marker

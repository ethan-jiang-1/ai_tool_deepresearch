> req: BUM-005

## MODIFIED Requirements

### Requirement: RUN_BUNDLE.md serves as the minimal bundle entry point

For a newly instantiated production or disposable runtime bundle, the framework
SHALL create a `RUN_BUNDLE.md` at the bundle root. This file SHALL contain only:

- the bundle name as a top-level heading;
- a creator-rendered relative path to the framework root used at creation; and
- a delegation statement directing the reader to bring the file (or its
  containing directory) to an Agent, and instructing the Agent to first read
  `BUNDLE_MAP.md` (in the same directory) for the full directory layout, then
  read `DPT_FRAMEWORK/COMMANDS.md` for available operations.

`RUN_BUNDLE.md` SHALL NOT contain lifecycle state, phase/gate values, CLI
commands, route selectors, mutable fields, or copies of framework documentation.
It is a static creation-time artifact whose sole purpose is to eliminate the
"where do I start" friction for a user opening a bundle directory.

`BUNDLE_MAP.md` SHALL remain as a passive directory map for deep inspection and
debugging. It SHALL NOT be extended with a continuation invitation section.

#### Scenario: New bundle has an immediately visible entry point

- **WHEN** a production or disposable creator creates a bundle
- **THEN** its root SHALL contain `RUN_BUNDLE.md` with the bundle name, a
  framework relative path, and a delegation statement pointing to
  `BUNDLE_MAP.md` (layout) and `COMMANDS.md` (operations)
- **AND** the file SHALL be immediately discoverable as the only `RUN_*` file
  at the bundle root

#### Scenario: RUN_BUNDLE.md does not duplicate authority

- **WHEN** an Agent reads `RUN_BUNDLE.md`
- **THEN** it SHALL resolve the framework path and read `COMMANDS.md` for
  available operations
- **AND** it SHALL obtain current phase, gate, queue, evidence and decision
  facts from bundle control files, trace and Engine feedback
- **AND** it SHALL NOT infer those facts from `RUN_BUNDLE.md` content

#### Scenario: Old bundle without RUN_BUNDLE.md remains usable

- **WHEN** a historical bundle lacks `RUN_BUNDLE.md`
- **THEN** the Agent SHALL fallback to reading `BUNDLE_MAP.md` for framework
  coordinates and navigation
- **AND** the framework SHALL NOT require a bulk rewrite, manifest migration
  or schema marker

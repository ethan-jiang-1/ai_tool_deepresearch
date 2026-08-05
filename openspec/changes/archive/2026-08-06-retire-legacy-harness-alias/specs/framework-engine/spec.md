> req: FRE-001

## MODIFIED Requirements

### Requirement: Engine code canonical location

Production work-unit Engine code SHALL live under
`DEEP_RESEARCH_HARNESS/engine/` and production CLI entrypoints SHALL live under
`DEEP_RESEARCH_HARNESS/cli/`. Runtime bundle state SHALL live under the current
run bundle root in `rb_queue.json`, `rb_output_declarations.jsonl`, and
`_work_units/`; `DEEP_RESEARCH_HARNESS/` SHALL remain reusable Harness assets,
not run state.

`DEEP_RESEARCH_HARNESS/` SHALL be the sole filesystem location for production
Engine and CLI assets. The repository SHALL not retain a filesystem alias,
alternate import location, or current guidance that resolves another source
coordinate to those assets. New source imports and current guidance SHALL use
the canonical Harness root.

Test-owned dependencies below `tests/fixtures/` MAY expose only the fixture
files required by the accepted `test-fixtures` contract. They SHALL NOT be
treated as a production Engine/CLI location, a production import coordinate, or
an Agent/operator command entry.

Harness import and location guidance SHALL describe deterministic queue, gate,
loader, and work-unit mechanisms. It SHALL NOT describe retired relay/slot
engine modules as production mechanisms outside explicit negative, deprecated,
checker self-reference, or minimized release-history contexts.

#### Scenario: Work-unit state is written to the current run bundle

- **WHEN** `operate-work-unit claim` runs against a bundle
- **THEN** work-unit envelope files SHALL be written under the current run
  bundle root's `_work_units/`
- **AND** no run-specific state SHALL be written under
  `DEEP_RESEARCH_HARNESS/`

#### Scenario: Engine source location is singular

- **WHEN** an Agent, CLI import, or production command locates Engine assets
- **THEN** it SHALL locate them below `DEEP_RESEARCH_HARNESS/engine/` or
  `DEEP_RESEARCH_HARNESS/cli/` as applicable
- **AND** the repository SHALL not resolve a second source path to the same
  Engine assets

#### Scenario: Harness guidance avoids retired engine authority

- **WHEN** a current Harness doc describes delegated production engine modules
- **THEN** it SHALL identify work-unit helpers and CLIs
- **AND** it SHALL NOT name a retired relay engine as production authority

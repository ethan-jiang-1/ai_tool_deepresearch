> req: FRE-001

## MODIFIED Requirements

### Requirement: Engine code canonical location

Production work-unit Engine code SHALL live under
`DEEP_RESEARCH_HARNESS/engine/` and production CLI entrypoints SHALL live under
`DEEP_RESEARCH_HARNESS/cli/`. Runtime bundle state SHALL live under the current
run bundle root in `rb_queue.json`, `rb_output_declarations.jsonl`, and
`_work_units/`; `DEEP_RESEARCH_HARNESS/` SHALL remain reusable Harness assets,
not run state.

`DPT_FRAMEWORK/` SHALL be one compatibility path resolving to the same assets.
It SHALL not be a second Engine source tree or canonical import/location
coordinate. New source imports and current guidance SHALL use the canonical
Harness root.

Harness import and location guidance SHALL describe deterministic queue, gate,
loader, and work-unit mechanisms. It SHALL NOT describe retired relay/slot
engine modules as production mechanisms outside explicit negative, deprecated,
checker self-reference, or minimized release-history contexts.

#### Scenario: Work-unit state is written to the current run bundle

- **WHEN** `operate-work-unit claim` runs against a bundle
- **THEN** work-unit envelope files SHALL be written under the current run
  bundle root's `_work_units/`
- **AND** no run-specific state SHALL be written under the canonical Harness or
  its legacy alias

#### Scenario: Harness guidance avoids retired engine authority

- **WHEN** a current Harness doc describes delegated production engine modules
- **THEN** it SHALL identify work-unit helpers and CLIs
- **AND** it SHALL NOT name a retired relay engine as production authority

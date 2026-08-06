> req: WDC-001

## RENAMED Requirements

- FROM: `### Requirement: Read-only framework assets boundary`
- TO: `### Requirement: Read-only Harness assets boundary`

## MODIFIED Requirements

### Requirement: Read-only Harness assets boundary

`DEEP_RESEARCH_HARNESS/` SHALL be the sole read-only reusable Harness assets
directory. Runtime user input, gate attempts, pass/fail results, repair
attempts, waiting/block facts, trace events, artifacts, and final output MUST
be written only under the current run bundle root and MUST NOT be written to
the canonical Harness tree.

The repository SHALL not retain a root-level filesystem alias or another
supported production/reusable source coordinate that resolves to the same
Harness assets. Test-owned dependencies below `tests/fixtures/` are not
reusable Harness source roots or supported command coordinates. A historical
bundle may retain a creation-time navigation coordinate, but that coordinate
SHALL not create a supported source path, runtime authority, or migration
obligation.

#### Scenario: Gate result written to correct location

- **WHEN** a gate CLI returns pass/fail/inspect/advice
- **THEN** the gate result is recorded in the current run bundle root's
  `rb_trace.jsonl` and/or `rb_status.json`
- **AND** it MUST NOT be written to
  `DEEP_RESEARCH_HARNESS/schema/gate_definitions/`

#### Scenario: Multiple bundles share one Harness

- **WHEN** two or more `dpt_rb_*` or `dpt_disp_*` runtime bundles exist
- **THEN** current supported bundles reference the canonical
  `DEEP_RESEARCH_HARNESS/` root
- **AND** all bundles use one shared Harness asset tree and independently hold
  runtime state without contamination

#### Scenario: Historical source coordinate is unavailable without migration

- **WHEN** an explicitly supplied existing bundle names a Harness coordinate
  that no longer reaches the canonical Harness root
- **THEN** the existing continuation procedure SHALL report the selected
  Harness context as unavailable and stop before executing bundle-provided
  commands
- **AND** it SHALL not rewrite the bundle, scan for another bundle, create an
  alternate source path, or infer a replacement coordinate

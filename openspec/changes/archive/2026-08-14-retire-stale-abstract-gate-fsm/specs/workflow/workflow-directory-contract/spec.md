## MODIFIED Requirements

### Requirement: Gate artifacts location and shape

Gate-definition JSON files SHALL reside under
`DEEP_RESEARCH_HARNESS/schema/gate_definitions/`, named
`gate-<gate-name-kebab>.definition.json`. A Gate definition SHALL be a
read-only deterministic rule source belonging to the Harness and MUST NOT be
copied into each `dpt_rb_*` bundle.

Gate CLIs SHALL reside under `DEEP_RESEARCH_HARNESS/cli/gates/`, named
`check-gate-<gate-name-kebab>.mjs`. Each Gate SHALL have one external CLI
wrapper. The CLI SHALL explicitly receive a current run bundle root through
`--bundle` or an equivalent flag and SHALL NOT assume cwd is the target bundle.

Gate engines SHALL reside under `DEEP_RESEARCH_HARNESS/engine/gates/` when a
per-Gate engine module exists. Shared helpers SHALL reside under
`DEEP_RESEARCH_HARNESS/engine/helpers/`.

The current Gate transition-table contract SHALL be represented by
`DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json`; the existing
`resolveNodeTransitionDetailed()` router SHALL provide the detailed transition
query path. Gate-definition JSON files remain read-only rule sources under the
canonical Harness schema directory and are loaded by the Gate-helper/per-Gate
CLI pipeline; no `gate-definition.mjs` executable contract is part of the
current accepted runtime surface.

#### Scenario: Gate definition is Harness asset not bundle copy

- **WHEN** a `dpt_rb_*` bundle is instantiated
- **THEN** Gate-definition JSON MUST NOT be copied into the bundle
- **AND** a Gate CLI reads the definition from the canonical Harness and uses
  `--bundle` to identify the checked current run bundle root

#### Scenario: One Gate per CLI

- **WHEN** an Agent needs to run a Gate
- **THEN** it MUST invoke that Gate's independent `check-gate-<name>.mjs`
- **AND** it MUST NOT distinguish Gates with subcommands on one universal entry

#### Scenario: Gate CLI requires bundle path

- **WHEN** a Gate CLI is called without a `--bundle` argument
- **THEN** it SHALL fail
- **AND** it MUST NOT assume a default bundle or scan directories

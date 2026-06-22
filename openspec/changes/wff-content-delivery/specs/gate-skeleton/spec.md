## MODIFIED Requirements

### Requirement: Gate CLI skeleton shape

The gate CLI SHALL accept `--bundle <path>` (active bundle directory) and `--current-node <path>` (phase node file path, relative to workflow root). The CLI SHALL accept an optional `--transitions <path>` flag (defaults to `DPT_FRAMEWORK/workflows/transitions.chain.json`).

The CLI SHALL:
1. Parse CLI args and resolve `--bundle` to an absolute path
2. Load the gate definition JSON for this gate
3. Validate that the current node's `gate` frontmatter matches this gate's name
4. Iterate rules from the definition and execute deterministic checks against the bundle
5. Call `resolveNodeTransitionDetailed()` with the transition table path to determine the next node on pass
6. Output JSON to stdout with shape `{ check, routing, inspect, advice }`
7. Exit 0 on gate pass, exit 1 on gate fail, exit 2 on routing contract errors

`check.next` SHALL mirror `routing.next` when `routing.kind === 'next'`, and SHALL be `null` for all other routing kinds (`terminal`, `no_transition`, `invalid_input`, `config_error`). Supported check types include: `file_exists`, `yaml_parse`, `jsonl_parse`, `field_non_empty`, `field_value`, `trace_event_present`, `trace_has_events`, `status_value`, `dir_non_empty`, `count_min`, `placeholder`.

All 9 gate CLIs use the shared `gate-helpers.mjs` module (`parseGateCliArgs`, `validateNodeGateBinding`, `resolveRouting`, `buildGateResult`, `emitGateResult`).

#### Scenario: All nine CLIs accept required flags

- **WHEN** any of the 9 `check-gate-<name>.mjs` CLIs is invoked
- **THEN** it SHALL accept `--bundle` and `--current-node` as required flags
- **AND** it SHALL accept `--transitions` as an optional flag
- **AND** it SHALL reject unknown flags with exit code 2

#### Scenario: Missing required args exits with routing error

- **WHEN** a gate CLI is invoked without `--bundle`
- **THEN** it SHALL exit with code 2 and output a routing error message

#### Scenario: Gate CLI outputs valid JSON

- **WHEN** a gate CLI completes (pass or fail)
- **THEN** its stdout SHALL be valid JSON with `check`, `routing`, `inspect`, and `advice` keys
- **AND** `check.result` SHALL be `"pass"` or `"fail"` as a string

#### Scenario: Exit code maps to gate result

- **WHEN** all checks pass
- **THEN** exit code SHALL be 0
- **WHEN** any check fails
- **THEN** exit code SHALL be 1
- **WHEN** routing contract is violated (missing args, binding mismatch, transition not found)
- **THEN** exit code SHALL be 2

### Requirement: One gate per CLI

Each of the 9 non-terminal gates SHALL have exactly one CLI file at `DPT_FRAMEWORK/cli/gates/check-gate-<name>.mjs`:
1. `check-gate-instantiation-complete.mjs`
2. `check-gate-hitl1-recorded.mjs`
3. `check-gate-setup-ready.mjs`
4. `check-gate-seed-topics-ready.mjs`
5. `check-gate-wave0-complete.mjs`
6. `check-gate-wave1-complete.mjs`
7. `check-gate-wave2-complete.mjs`
8. `check-gate-hitl2-recorded.mjs`
9. `check-gate-readiness-passed.mjs`

Agent SHALL invoke the specific gate CLI for the phase being evaluated, not a generic gate runner with a `--gate` argument.

#### Scenario: Exact CLIs exist

- **WHEN** listing `DPT_FRAMEWORK/cli/gates/`
- **THEN** exactly 9 `check-gate-*.mjs` files SHALL exist
- **AND** each SHALL correspond to a non-terminal gate defined in the lifecycle

### Requirement: Gate CLI evaluates rules from definition

Each gate CLI SHALL load its corresponding gate definition JSON, iterate its `rules` array, and execute deterministic checks against the active bundle. It SHALL NOT hardcode `passed: true`.

All 9 gate CLIs SHALL reuse the shared `gate-helpers.mjs` helpers.

The following check types SHALL be supported across the 9 gate CLIs:
- `file_exists`: verify a file or directory exists at the given bundle-relative path
- `yaml_parse`: verify a YAML file is parseable; optionally check field values
- `jsonl_parse`: verify every line of a JSONL file is valid JSON
- `field_non_empty`: verify a field in parsed YAML is non-empty
- `field_value`: verify a field matches expected value(s)
- `trace_event_present`: verify a specific event type exists in trace
- `trace_has_events`: verify count of matching events meets threshold
- `status_value`: verify a field in `rb_status.json` matches expected value
- `dir_non_empty`: verify a directory exists and contains at least one file
- `count_min`: verify a minimum count condition
- `placeholder`: always passes (for skeleton-only gates)

#### Scenario: All nine gate CLIs evaluate rules from definition

- **WHEN** any of the 9 gate CLIs is invoked with valid args
- **THEN** it SHALL load its corresponding gate definition JSON
- **AND** it SHALL iterate rules and execute deterministic checks
- **AND** no CLI SHALL return `passed: true` without evaluating rules

#### Scenario: Wave0 CLI evaluates real rules

- **WHEN** `check-gate-wave0-complete.mjs` is invoked with a bundle that has missing reference index
- **THEN** it SHALL return fail with inspect referencing the missing index
- **AND** it SHALL NOT return hardcoded pass

#### Scenario: HITL2 CLI evaluates real rules

- **WHEN** `check-gate-hitl2-recorded.mjs` is invoked with a bundle that has no decision brief
- **THEN** it SHALL return fail with inspect referencing the missing decision brief
- **AND** it SHALL NOT return hardcoded pass

#### Scenario: Readiness CLI evaluates real rules

- **WHEN** `check-gate-readiness-passed.mjs` is invoked with a bundle that has fewer than 8 passed gates in trace
- **THEN** it SHALL return fail with inspect showing actual vs expected count
- **AND** it SHALL NOT return hardcoded pass

#### Scenario: Router queried for next node on pass

- **WHEN** a gate CLI completes with pass
- **THEN** it SHALL call `resolveNodeTransitionDetailed()` with the transitions table path
- **AND** the routing result SHALL be included in the output JSON

#### Scenario: Next is null when transition not found

- **WHEN** `resolveNodeTransitionDetailed()` returns `kind: "no_transition"`
- **THEN** the gate CLI SHALL set `routing.next` to null
- **AND** `check.next` SHALL be null

#### Scenario: Terminal node routing preserved

- **WHEN** `resolveNodeTransitionDetailed()` returns `kind: "terminal"`
- **THEN** the gate CLI SHALL propagate `routing.kind: "terminal"` and `routing.next: null`
- **AND** `check.next` SHALL be null

#### Scenario: Node-gate binding mismatch rejected

- **WHEN** the current node's `gate` frontmatter does not match the gate CLI's expected gate name
- **THEN** the CLI SHALL exit with code 2
- **AND** the error message SHALL indicate the mismatch

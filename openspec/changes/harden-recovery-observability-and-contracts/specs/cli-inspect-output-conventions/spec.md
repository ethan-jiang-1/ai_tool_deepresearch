> req: IOC-001

## MODIFIED Requirements

### Requirement: inspect-wave0-output.mjs structural checks

`inspect-wave0-output.mjs` SHALL evaluate Wave0 gate-consumable artifact and provenance contracts through the same pure evaluator result used by `wave0-complete`. It SHALL also continue to inspect the existing Wave0-only structure conventions:

1. `reference/` has no non-hidden subdirectory;
2. non-index/readme Markdown files use `00-shared-<slug>.md` naming;
3. each `00-shared-*.md` exposes the required bullet metadata keys after an optional H1 title and before its first H2 semantic section;
4. each `00-shared-*.md` exposes the five standard semantic sections;
5. `reference/_INDEX.md` exists and inspect can diagnose the expected eight columns and data-row shape;
6. `reference/README.md` exists and inspect can diagnose empty content; and
7. `artifacts/wave0/<topic>/source.yaml` exists for every `topic_registry` topic and satisfies the accepted ReferenceMetadata array contract.

The shared blocking evaluator SHALL cover the current formal Wave0 artifact/provenance rules: `reference/`、`_INDEX.md`、`README.md` existence, shared-reference count floor, placeholder `source_url`, per-topic source YAML existence/schema/count, cache coverage, submitted ledger/output/submission presence, and delegated-bypass provenance. A formal condition SHALL use the same rule id and direct checker result in inspect and gate modes.

Wave0 flat-directory, filename, non-formal metadata/section, `_INDEX.md` presentation, and README non-empty conventions SHALL remain visible but SHALL be advisory unless an accepted formal rule directly consumes that shape. Missing formal artifacts remain blocking. Existing evidence-bearing return-map navigation checks SHALL preserve their accepted current-command classification and SHALL NOT be mislabeled as formal gate rules.

Inspect SHALL return `{ check, inspect, advice }` JSON without routing. It SHALL preserve exit code `0` for pass, `1` for known contract failure, and `2` for invocation/configuration error. It SHALL NOT execute node binding, lifecycle handoff preflight, routing, degraded handoff, gate-attempt counting, trace/log/checkpoint writes, status mutation, or completion-only `trace_event_*` checks.

#### Scenario: Flat directory check passes

- **WHEN** `reference/` contains only Markdown files and no non-hidden subdirectory
- **THEN** the flat-directory convention SHALL pass without advisory

#### Scenario: Flat directory check reports subdirectory

- **WHEN** `reference/` contains a subdirectory such as `reference/01_topic/`
- **THEN** inspect SHALL report `reference/: contains subdirectory '01_topic/' — directory must be flat`
- **AND** advice SHALL direct the Agent to flatten the files and remove the empty subdirectory
- **AND** this inspect-only maintenance convention SHALL NOT independently fail the shared gate-contract result

#### Scenario: Naming check reports unexpected file

- **WHEN** `reference/` contains `notes.md` rather than a `00-shared-<slug>.md` name
- **THEN** inspect SHALL report the unexpected filename and nearest rename/move repair
- **AND** filename preference alone SHALL be advisory when no formal rule consumes it

#### Scenario: H1 title does not hide metadata

- **WHEN** `reference/00-shared-ai-landscape.md` starts with an H1 title followed by all required bullet metadata before the first H2 semantic section
- **THEN** inspect SHALL recognize the metadata keys
- **AND** it SHALL not report them missing merely because the H1 title exists

#### Scenario: Metadata check reports missing key

- **WHEN** `reference/00-shared-ai-landscape.md` lacks metadata key `trust_level`
- **THEN** inspect SHALL name the file and missing key
- **AND** the finding SHALL be advisory when that key is not part of a formal Wave0 pass/fail rule

#### Scenario: Section check reports missing header

- **WHEN** `reference/00-shared-ai-landscape.md` lacks the `Risks And Limitations` semantic section
- **THEN** inspect SHALL name the file and missing section
- **AND** equivalent harmless heading presentation SHALL be accepted or advisory rather than a shared blocker

#### Scenario: _INDEX.md header validation

- **WHEN** `reference/_INDEX.md` exists but its table header lacks `source_layer`
- **THEN** inspect SHALL report the missing expected column
- **AND** the formal existence rule SHALL remain distinct from this inspect-only presentation diagnostic

#### Scenario: README.md missing or empty

- **WHEN** `reference/README.md` is missing
- **THEN** inspect SHALL fail the shared formal existence rule
- **WHEN** the file exists but is empty
- **THEN** inspect SHALL report the non-empty convention as advisory unless the formal rule is intentionally changed by a future spec

#### Scenario: Wave0 inspect reuses gate contract without side effects

- **WHEN** Wave0 inspect evaluates a bundle with a shared artifact/provenance failure
- **THEN** the blocking finding SHALL use the same rule id and direct checker result as `wave0-complete`
- **AND** a recursive before/after bundle snapshot SHALL show no file creation, deletion, or content change

#### Scenario: Wave0 inspect preserves command output contract

- **WHEN** `inspect-wave0-output.mjs --bundle <bundle>` completes
- **THEN** stdout SHALL contain `{ check, inspect, advice }` without routing
- **AND** the command SHALL use exit code `0`, `1`, or `2` according to the documented non-gate convention

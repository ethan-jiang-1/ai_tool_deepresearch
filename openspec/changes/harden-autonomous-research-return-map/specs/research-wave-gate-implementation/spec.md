## ADDED Requirements

> req: RWG-016

### Requirement: Wave gates SHALL return repair-targeted diagnostics for YAML shape, ledger-only counting, cache coverage, and hash drift

Wave gate diagnostics SHALL identify the deterministic surface that failed and the next repair target. Diagnostics SHALL be specific enough for an Agent to repair the current phase without bypassing status or weakening gate authority.

At minimum, wave gates SHALL distinguish YAML parse errors, top-level YAML object-vs-array errors, missing source fields, ledger-only reference counting gaps, cache trail mapping gaps, delegated bypass suspicion, and submitted work-unit hash drift.

#### Scenario: YAML object wrapper receives shape-specific diagnostic

- **WHEN** a `source.yaml` file parses as an object with keys such as `wave`, `topic`, or `sources`
- **THEN** the wave gate SHALL fail the source schema rule
- **AND** inspect/advice SHALL state that `source.yaml` must be a top-level YAML array
- **AND** diagnostics SHOULD name the object keys that were found

#### Scenario: Missing source fields receive entry-specific diagnostic

- **WHEN** a `source.yaml` list entry omits `url`, `title`, `retrieved_date`, or `topic_tag`
- **THEN** the wave gate SHALL fail the source schema rule
- **AND** diagnostics SHALL name the entry and missing field path

#### Scenario: Ledger-only reference counting gap is explicit

- **WHEN** `reference/00-shared-*.md` files exist but no submitted work-unit ledger row declares them
- **THEN** the wave gate SHALL fail the relevant count or provenance rule
- **AND** diagnostics SHALL state that filesystem-only files do not count as delegated coverage
- **AND** advice SHALL direct the Agent to produce or repair them through work-unit submit

#### Scenario: Cache coverage diagnostics name mapping rule

- **WHEN** a ledger-declared reference output has no valid cache trail mapping
- **THEN** diagnostics SHALL name the reference path and source URL when available
- **AND** advice SHALL state the expected `_cache/` leaf mapping mechanism through `meta.json.url` or source slug plus required leaf files

#### Scenario: Hash drift blocks pass with work-unit context

- **WHEN** a submitted work-unit row fails index, manifest, result, receipt, beacon, output, cache, or hash cross-check
- **THEN** the wave gate SHALL fail before pass
- **AND** diagnostics SHALL name the `work_id`, failed binding surface, and repair path

#### Scenario: Gate friction does not advise phase bypass

- **WHEN** a wave gate has failed repeatedly
- **THEN** advice MAY include fatigue and strategy-change guidance
- **AND** advice SHALL NOT instruct the Agent to hand-edit `rb_status.json`, skip required phases, or surface to the user during `stop: no`

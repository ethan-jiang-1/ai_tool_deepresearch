## REMOVED Requirements

> req: RWG-015

### Requirement: content_dedup rule SHALL be added to wave0 and wave1 gate definitions

**Reason**: `content_dedup` and its duplicate URL, homepage/shallow URL, Jaccard, and self-reference heuristics are retired historical gate patches. They create noisy feedback for the Markdown Controller and do not belong in phase-boundary gate quality loops.

**Migration**: `gate-wave0-complete.definition.json` and `gate-wave1-complete.definition.json` SHALL remove the `content_dedup` rule. Gate CLIs (`check-gate-wave0-complete.mjs`, `check-gate-wave1-complete.mjs`) SHALL stop dispatching `content_dedup` as a blocking check or diagnostic/advice-only output. The deterministic concerns that used to motivate this patch SHALL be enforced by their proper checks instead:

- declaration-ledger coverage and filesystem-only reference rejection;
- work-unit submission, provenance, nonce, and hash binding;
- cache trail coverage and cache content capture checks; and
- source/reference schema diagnostics.

The retired `content_dedup` patch SHALL NOT be replaced by another broad content-similarity or homepage heuristic inside the phase-boundary gate.

#### Scenario: Wave0 does not evaluate content_dedup

- **WHEN** Wave0's structural, status, queue, work-unit, provenance, cache, source-schema, and required artifact checks pass
- **THEN** Wave0 SHALL NOT evaluate `content_dedup`
- **AND** Wave0 SHALL NOT fail or emit advice because of homepage, Jaccard, URL duplicate, or self-reference heuristic output

#### Scenario: Wave1 does not evaluate content_dedup

- **WHEN** Wave1's required gate checks pass
- **THEN** Wave1 SHALL NOT evaluate `content_dedup`
- **AND** Wave1 SHALL rely on work-unit provenance, cache, source/reference schema, and artifact checks for deterministic authority

#### Scenario: Gate definition validation rejects active content_dedup

- **WHEN** active Wave0 or Wave1 gate definitions include a `content_dedup` rule
- **THEN** regression coverage or validation SHALL fail
- **AND** the diagnostic SHALL require removing the historical patch rather than moving it to diagnostic-only handling

## MODIFIED Requirements

> req: RWG-016

### Requirement: Wave gates SHALL return repair-targeted diagnostics for YAML shape, ledger-only counting, cache coverage, and hash drift

Wave gate diagnostics SHALL identify the deterministic surface that failed and the next repair target. Diagnostics SHALL be specific enough for an Agent to repair the current phase without bypassing status or weakening gate authority.

At minimum, wave gates SHALL distinguish YAML parse errors, top-level YAML object-vs-array errors, missing source fields, ledger-only reference counting gaps, cache trail mapping gaps, delegated bypass suspicion, submitted work-unit hash drift, and degraded-pass eligibility.

Diagnostics SHALL classify known cascade symptoms under their root cause when the Engine can determine the dependency. The gate SHALL preserve full detail in diagnostic artifacts, but primary advice SHALL remain root-cause-first and SHALL NOT instruct manual edits to authority files.

#### Scenario: YAML object wrapper receives shape-specific diagnostic

- **WHEN** a `source.yaml` file parses as an object with keys such as `wave`, `topic`, or `sources`
- **THEN** the wave gate SHALL fail the source schema rule
- **AND** inspect/advice SHALL state that `source.yaml` must be a top-level YAML array
- **AND** diagnostics SHALL name the object keys that were found

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
- **AND** advice SHALL not tell the Agent to hand-edit ledger or hash-bound result files

#### Scenario: Gate friction does not advise phase bypass

- **WHEN** a wave gate has failed repeatedly
- **THEN** advice MAY include fatigue, degraded-eligibility, and strategy-change guidance
- **AND** advice SHALL NOT instruct the Agent to hand-edit `rb_status.json`, skip required phases, write final artifacts, or surface to the user during `stop: no`

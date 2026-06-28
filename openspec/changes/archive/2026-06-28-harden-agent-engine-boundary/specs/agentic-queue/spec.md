# Agentic Queue (delta)

> req: AGQ-017, AGQ-018

## MODIFIED Requirements

### Requirement: TargetSpec schema defines two-tier execution model

The Queue Manager SHALL continue to define `targets.controller` as enum `main-agent | engine`. Delegated Sub-agent work SHALL be expressed with `targets.delegates.to: "sub-agent"` while keeping `targets.controller: "main-agent"`.

`targets.controller: "sub-agent"` SHALL NOT be introduced by this change. The queue schema SHALL reject it unless a future accepted spec explicitly changes TargetSpec.

#### Scenario: Delegated Sub-agent task keeps main-agent controller

- **WHEN** a task requires external search/fetch via Sub-agent
- **THEN** its targets SHALL be `controller: "main-agent"` plus `delegates.to: "sub-agent"`
- **AND** queue schema validation SHALL pass

#### Scenario: sub-agent controller remains invalid

- **WHEN** a task uses `targets.controller: "sub-agent"`
- **THEN** queue schema validation SHALL fail

### Requirement: Claim advice reports delegates config for relay dispatch

When `claim()` returns a task card with `targets.delegates`, the returned advice SHALL indicate that the Phase Agent must dispatch Sub-agent work via Relay using the declared `role_key` and `timeout_ms`.

`claim()` SHALL NOT treat a `--actor` string as proof that the Sub-agent executed the work. Actor strings MAY be logged for audit/advice, but delegated task enforcement SHALL occur at `complete()` using relay provenance.

#### Scenario: Claim advice signals relay dispatch needed

- **WHEN** `claim()` returns a task with `targets.delegates.to: "sub-agent"`
- **THEN** the advice SHALL contain `delegates_required: true`
- **AND** the advice SHALL include the delegate `role_key` and `timeout_ms`

## ADDED Requirements

### Requirement: delegated complete() SHALL validate relay provenance

For a task whose `targets.delegates.to` is `"sub-agent"`, `complete()` SHALL require evidence that the task result came through Relay. The evidence SHALL include:

- a committed slot result reference
- a valid SlotResult containing `output_files[]` and `cache_trails[]`
- a runtime receipt reference from the same slot
- receipt events proving at least `agent_runtime_started` and `agent_result_ready`

Runtime receipt validation SHALL be a pure validation step that checks the existing slot receipt file and nonce binding. `complete()` SHALL NOT depend on `ingestAgentReceipt()` side effects that require a runtimeAgentId or rewrite agent metadata.

If any required provenance is missing or invalid, `complete()` SHALL reject and SHALL NOT mark the queue item done.

#### Scenario: Missing slot result rejects delegated completion

- **WHEN** a delegated task calls `complete()` without a committed slot result reference
- **THEN** `complete()` SHALL reject
- **AND** feedback SHALL state that delegated completion requires relay slot result provenance

#### Scenario: Missing runtime receipt rejects delegated completion

- **WHEN** a delegated task has a slot result but no valid runtime receipt
- **THEN** `complete()` SHALL reject
- **AND** feedback SHALL identify the missing or invalid runtime receipt

#### Scenario: Valid relay provenance allows further completion checks

- **WHEN** a delegated task provides a committed slot result and matching runtime receipt
- **AND** both pass schema/event validation
- **THEN** `complete()` SHALL proceed to declaration, file, and cache checks

### Requirement: delegated complete() SHALL validate declared output files

For delegated tasks, `complete()` SHALL validate `output_files[]` from the committed SlotResult. It SHALL verify each declared `path` is bundle-relative, does not escape the bundle, and exists on disk. Standard completion receipt/writes checks SHALL be consistent with the declared output files.

If `output_files[]` is missing, invalid, or declares missing files, `complete()` SHALL reject.

#### Scenario: Declared output file exists

- **WHEN** a delegated SlotResult declares `output_files: [{ path: "reference/source.md", role: "reference", source_url: "https://example.com/article" }]`
- **AND** `reference/source.md` exists in the bundle
- **THEN** output file validation SHALL pass for that entry

#### Scenario: Missing declared file rejects completion

- **WHEN** a delegated SlotResult declares `output_files: [{ path: "reference/missing.md", role: "reference", source_url: "https://example.com/article" }]`
- **AND** that file does not exist
- **THEN** `complete()` SHALL reject
- **AND** feedback SHALL identify the missing declared output file

### Requirement: delegated complete() SHALL validate leaf cache trails

For delegated tasks, `complete()` SHALL validate `cache_trails[]` from the committed SlotResult. Each path SHALL be a bundle-relative `_cache/` leaf source directory. Each leaf SHALL directly contain:

- `websearch.json`
- `page.md`
- `meta.json`

`complete()` SHALL NOT interpret a parent directory as valid merely because it contains `sNN_*` children.

#### Scenario: Complete cache leaf passes completion

- **WHEN** delegated SlotResult declares `cache_trails: ["_cache/wave0/primary/01_test/s01_source/"]`
- **AND** that directory directly contains `websearch.json`, `page.md`, and `meta.json`
- **THEN** cache trail validation SHALL pass

#### Scenario: Missing cache leaf rejects completion

- **WHEN** delegated SlotResult declares `cache_trails: ["_cache/wave0/primary/01_test/s01_source/"]`
- **AND** that directory does not exist
- **THEN** `complete()` SHALL reject
- **AND** feedback SHALL state `cache trail missing: directory not found`

#### Scenario: Missing meta.json rejects completion

- **WHEN** delegated SlotResult declares a cache leaf that contains `websearch.json` and `page.md` but not `meta.json`
- **THEN** `complete()` SHALL reject
- **AND** feedback SHALL identify the missing `meta.json`

### Requirement: non-delegated complete() SHALL skip relay-specific checks

If a task has no `targets.delegates`, `complete()` SHALL NOT require relay slot result provenance or `cache_trails[]`. It SHALL retain the standard receipt behavior for direct Phase Agent or engine tasks.

#### Scenario: Non-delegated task skips relay provenance

- **WHEN** a `seed_topic_materialize` task with `targets.controller: "main-agent"` and no delegates calls `complete()`
- **THEN** relay slot result and runtime receipt checks SHALL be skipped
- **AND** standard completion receipt checks SHALL still run

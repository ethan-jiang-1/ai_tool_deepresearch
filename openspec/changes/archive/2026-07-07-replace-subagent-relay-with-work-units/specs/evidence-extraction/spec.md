> req: EEX-003, EEX-004

## MODIFIED Requirements

### Requirement: ref_count 改为 Engine 计算

Work-unit result processing SHALL use Engine-verifiable declared references to compute `ref_count` and MUST NOT accumulate an Agent-provided `evidenceCount` field. Production `ref_count` SHALL be derived from submitted work-unit result declarations after schema validation and/or the Engine-written ledger, not from untrusted Agent numeric claims.

Gate `count_floor` rules SHALL use `countReferences()` to obtain actual reference counts and MUST NOT rely only on filesystem globbing.

Gate checks that need authoritative Agent-produced content inputs, including `content_dedup`, SHALL continue to consume `rb_output_declarations.jsonl` rather than switching to directory scans. `count_floor` using Engine count does not change ledger as the Source of Record for declared outputs; it only changes how declared references are filtered for countability.

#### Scenario: work-unit submit path uses Engine-computed ref_count

- **WHEN** Wave0 source intake submits a work-unit result and ledger row declaring 8 reference files but only 6 are `isCountable()`
- **THEN** the Engine-computed `ref_count` SHALL be `6`

#### Scenario: Agent evidenceCount is ignored even when larger

- **WHEN** a sub-agent result declares `evidenceCount: 99`
- **AND** submitted declarations contain only 3 countable references
- **THEN** Engine-derived `ref_count` SHALL be `3`
- **AND** the Agent numeric claim SHALL NOT affect branch routing

### Requirement: cache_trails 文件系统验证

Engine SHALL validate every path in a submitted work-unit result `cache_trails` array:

1. Path is inside the bundle and does not escape.
2. Path is under `_cache/`.
3. Path is a leaf source directory rather than a parent collection directory.
4. Directory exists.
5. Directory contains `websearch.json`, `page.md`, and `meta.json`.

Validated paths SHALL be written to `OutputDeclarationLedgerRecord.cache_trails` as `z.array(z.string())` path strings. Unsafe or non-leaf paths SHALL fail submit closed. Missing or incomplete leaf contents SHALL NOT be written to the ledger, and Engine SHALL emit warning diagnostics to trace/log during the staged enforcement period.

Gate `cache_coverage` rules SHALL dynamically check at gate time whether ledger cache trail paths still exist and remain complete. For each role=`reference` output file, `cache_coverage` SHALL also verify that at least one declared cache leaf plausibly maps to that reference by matching `meta.json.url` to the reference `source_url` and/or matching the cache leaf slug to `output_files[].source_slug` or reference filename qualifier. A declaration-level non-empty `cache_trails` array alone SHALL NOT prove per-reference provenance.

#### Scenario: valid cache trail written to ledger

- **WHEN** a work-unit result `cache_trails` entry names `_cache/wave1/primary/topic-a/s01_source/`
- **AND** the leaf directory passes cache trail validation
- **THEN** submit SHALL write that path string to `OutputDeclarationLedgerRecord.cache_trails`

#### Scenario: unsafe cache trail rejects submit

- **WHEN** a work-unit result declares a cache trail outside the bundle
- **THEN** submit SHALL fail closed
- **AND** no ledger row SHALL be appended

# agentic-queue Delta Spec

> req: AGQ-018

## MODIFIED Requirements

### Requirement: delegated complete() SHALL validate leaf cache trails

For delegated tasks, `complete()` SHALL validate `cache_trails[]` from the committed SlotResult. Each path SHALL be a bundle-relative `_cache/` leaf source directory. Structurally unsafe paths SHALL remain hard failures:

- absolute paths
- paths that escape the bundle
- paths outside `_cache/`
- parent cache directories that are not leaf source directories

During the evidence-extraction Phase 1 transition, a candidate leaf that is missing or does not directly contain all of `websearch.json`, `page.md`, and `meta.json` SHALL be filtered from ledger `cache_trails` and reported as a warning rather than rejecting delegated `complete()` by itself. The warning does not make the candidate trail authoritative. Downstream `cache_coverage` and file observability SHALL surface the provenance gap according to their enforcement policy.

`complete()` SHALL still reject delegated completion when required relay provenance, runtime receipt, schema validation, or declared output file validation fails.

#### Scenario: Complete cache leaf passes completion
- **WHEN** delegated SlotResult declares `cache_trails: ["_cache/wave0/primary/01_test/s01_source/"]`
- **AND** that directory directly contains `websearch.json`, `page.md`, and `meta.json`
- **THEN** cache trail validation SHALL pass
- **AND** the verified path SHALL be eligible for ledger `cache_trails`

#### Scenario: Missing cache leaf is filtered during Phase 1
- **WHEN** delegated SlotResult declares `cache_trails: ["_cache/wave0/primary/01_test/s01_source/"]`
- **AND** that directory does not exist
- **THEN** delegated `complete()` SHALL emit a warning such as `cache trail missing: directory not found`
- **AND** the missing trail SHALL NOT be written to ledger `cache_trails`
- **AND** delegated `complete()` MAY continue if all other delegated provenance, receipt, schema, and declared output checks pass

#### Scenario: Missing meta.json is filtered during Phase 1
- **WHEN** delegated SlotResult declares a cache leaf that contains `websearch.json` and `page.md` but not `meta.json`
- **THEN** delegated `complete()` SHALL emit a warning identifying the missing `meta.json`
- **AND** the incomplete trail SHALL NOT be written to ledger `cache_trails`
- **AND** downstream `cache_coverage` / file observability SHALL report the provenance gap

#### Scenario: Unsafe cache trail still rejects completion
- **WHEN** delegated SlotResult declares `cache_trails: ["../outside/"]`
- **THEN** delegated `complete()` SHALL reject
- **AND** no ledger record SHALL be appended for that delegated completion

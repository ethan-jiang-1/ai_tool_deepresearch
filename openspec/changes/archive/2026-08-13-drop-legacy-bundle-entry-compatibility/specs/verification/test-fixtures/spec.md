> req: TEF-001

## MODIFIED Requirements

### Requirement: Fixtures are versioned alongside tests

Fixture files SHALL be committed to git. They SHALL be regenerated (re-copied) when `DEEP_RESEARCH_HARNESS/schema/` changes.

The fixture `tests/fixtures/DEEP_RESEARCH_HARNESS/cli` SHALL be a tracked source link that resolves to the canonical Harness CLI directory, rather than an independently copied inspector implementation. Therefore its resolved `inspect-bundle.mjs` SHALL follow the canonical current-entry contract: it accepts only a root containing both `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md`, rejects every incomplete or legacy-only root with `unsupported_current_entry_contract` and exit `1` before any default, summary, timeline, or log data, and treats extra legacy files beside the pair as non-authoritative historical debris. The fixture SHALL not retain a compatibility adapter, migration hint, version router, or independent legacy-entry behavior.

#### Scenario: Fixture regeneration

- **WHEN** a new enum value is added to `DEEP_RESEARCH_HARNESS/schema/enums.mjs`
- **THEN** `tests/fixtures/DEEP_RESEARCH_HARNESS/schema/enums.mjs` is regenerated before tests run

#### Scenario: Fixture inspector follows entry-card succession

- **WHEN** the canonical inspector changes its current-entry contract
- **THEN** `tests/fixtures/DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs` SHALL resolve to the same canonical `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` implementation
- **AND** only `RUN_BUNDLE.md`, only `START_FROM_HERE.md`, or a map-only root SHALL not remain fixture-supported inspection paths

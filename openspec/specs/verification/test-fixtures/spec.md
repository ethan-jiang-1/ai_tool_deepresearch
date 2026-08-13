# test-fixtures Specification
> req: TEF-001

## Purpose
最小化 DEEP_RESEARCH_HARNESS/ 测试夹具 (schema/rb_templates/cli), 供集成测试在不依赖真实框架目录的情况下运行 validate-bundle.mjs/inspect-bundle.mjs。
## Requirements
### Requirement: Fixtures provide a complete mini Deep Research Harness/

The `tests/fixtures/DEEP_RESEARCH_HARNESS/` SHALL contain schema files (`.mjs`),
`rb_templates`, and CLI scripts sufficient to run `validate-bundle.mjs` and
`inspect-bundle.mjs`. Schemas SHALL be symlinked or copied from
`DEEP_RESEARCH_HARNESS/schema/` without compilation. The fixture SHALL not add
an independently authored legacy Harness tree.

#### Scenario: Fixtures include all required control file schemas

- **WHEN** a test script imports from
  `tests/fixtures/DEEP_RESEARCH_HARNESS/schema/index.mjs`
- **THEN** it provides CONTROL_FILE_SCHEMAS for `rb_status.json`,
  `rb_queue.json`, `rb_profile.yaml`, `rb_plan.md`, and `rb_trace.jsonl`

#### Scenario: Fixtures include working validate-bundle.mjs

- **WHEN** `node tests/fixtures/DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs
  <bundleDir>` is called with a valid bundle
- **THEN** exit code is 0

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

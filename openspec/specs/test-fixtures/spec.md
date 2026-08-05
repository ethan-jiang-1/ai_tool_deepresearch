# test-fixtures Specification
> req: TEF-001

## Purpose
最小化 DEEP_RESEARCH_HARNESS/ 测试夹具 (schema/rb_templates/cli), 供集成测试在不依赖真实框架目录的情况下运行 validate-bundle.mjs/inspect-bundle.mjs。
## Requirements
### Requirement: Fixtures provide a complete mini DEEP_RESEARCH_HARNESS/
The `tests/fixtures/DEEP_RESEARCH_HARNESS/` SHALL contain schema files (.mjs), rb_templates, and cli scripts sufficient to run `validate-bundle.mjs` and `inspect-bundle.mjs`. Schemas SHALL be symlinked or copied from DEEP_RESEARCH_HARNESS/schema/ (no compilation).

#### Scenario: Fixtures include all required control file schemas
- **WHEN** a test script imports from `tests/fixtures/DEEP_RESEARCH_HARNESS/schema/index.mjs`
- **THEN** it provides CONTROL_FILE_SCHEMAS for rb_status.json, rb_queue.json, rb_profile.yaml, rb_plan.md, rb_trace.jsonl

#### Scenario: Fixtures include working validate-bundle.mjs
- **WHEN** `node tests/fixtures/DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs <bundleDir>` is called with a valid bundle
- **THEN** exit code is 0

### Requirement: Fixtures are versioned alongside tests
Fixture files SHALL be committed to git. They SHALL be regenerated (re-copied) when DEEP_RESEARCH_HARNESS/schema/ changes.

#### Scenario: Fixture regeneration
- **WHEN** a new enum value is added to DEEP_RESEARCH_HARNESS/schema/enums.mjs
- **THEN** tests/fixtures/DEEP_RESEARCH_HARNESS/schema/enums.mjs is regenerated (re-copied) before tests run

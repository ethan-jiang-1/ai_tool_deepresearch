# Test Fixtures

最小 DPT_FRAMEWORK/ 测试框架，可被所有集成测试复用。

## ADDED Requirements

### Requirement: Fixtures provide a complete mini DPT_FRAMEWORK/
The `tests/fixtures/DPT_FRAMEWORK/` SHALL contain schema files (.mjs), rb_templates, and cli scripts sufficient to run `check.mjs` and `inspect.mjs`. Schemas SHALL be symlinked or copied from DPT_FRAMEWORK/schema/ (no compilation).

#### Scenario: Fixtures include all required control file schemas
- **WHEN** a test script imports from `tests/fixtures/DPT_FRAMEWORK/schema/index.mjs`
- **THEN** it provides CONTROL_FILE_SCHEMAS for rb_status.json, rb_queue.json, rb_profile.yaml, rb_plan.md, rb_trace.jsonl

#### Scenario: Fixtures include working check.mjs
- **WHEN** `node tests/fixtures/DPT_FRAMEWORK/cli/check.mjs <bundleDir>` is called with a valid bundle
- **THEN** exit code is 0

### Requirement: Fixtures are versioned alongside tests
Fixture files SHALL be committed to git. They SHALL be regenerated (re-copied) when DPT_FRAMEWORK/schema/ changes.

#### Scenario: Fixture regeneration
- **WHEN** a new enum value is added to DPT_FRAMEWORK/schema/enums.mjs
- **THEN** tests/fixtures/DPT_FRAMEWORK/schema/enums.mjs is regenerated (re-copied) before tests run

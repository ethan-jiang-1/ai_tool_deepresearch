# integration-tests Specification
> req: INT-001

## Purpose
validate-bundle.mjs / inspect-bundle.mjs 的集成测试: 真实文件 I/O、临时目录隔离、有效/无效 bundle 双向断言。
## Requirements
### Requirement: validate-bundle.mjs integration test covers valid and invalid bundles
The integration test SHALL create a valid bundle in a temp directory, run `node validate-bundle.mjs`, and assert exit code 0. It SHALL also create an invalid bundle and assert exit code 1.

#### Scenario: Valid bundle passes Validate
- **WHEN** a temp dir contains a valid dpt_rb_test/ with all 6 control files
- **THEN** `node DPT_FRAMEWORK/cli/validate-bundle.mjs dpt_rb_test/` exits with code 0

#### Scenario: Invalid enum fails Validate
- **WHEN** rb_status.json contains `current_gate: "invalid_value"`
- **THEN** `node DPT_FRAMEWORK/cli/validate-bundle.mjs dpt_rb_test/` exits with code 1 and stderr contains the file name

### Requirement: inspect-bundle.mjs integration test covers complete and incomplete directories
The integration test SHALL create a complete bundle directory and assert exit 0, then remove a required directory and assert exit 1.

#### Scenario: Complete bundle passes Inspect bundle
- **WHEN** a temp dir contains a valid dpt_rb_test/ with all directories
- **THEN** `node DPT_FRAMEWORK/cli/inspect-bundle.mjs dpt_rb_test/` exits with code 0

#### Scenario: Missing directory fails Inspect bundle
- **WHEN** `final/` is deleted from the bundle
- **THEN** `node DPT_FRAMEWORK/cli/inspect-bundle.mjs dpt_rb_test/` exits with code 1 and output contains "missing: final/"

### Requirement: Each test case uses an isolated temp directory
Every integration test case SHALL create its own temp directory via `fs.mkdtemp()` and clean it up after the test completes.

#### Scenario: No cross-test pollution
- **WHEN** test A creates files in its temp dir and test B runs
- **THEN** test B sees a clean empty temp dir

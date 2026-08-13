# integration-tests Specification
> req: INT-001

## Purpose
validate-bundle.mjs / inspect-bundle.mjs 的集成测试: 真实文件 I/O、临时目录隔离、有效/无效 bundle 双向断言。
## Requirements
### Requirement: validate-bundle.mjs integration test covers valid and invalid bundles
The integration test SHALL create a valid bundle in a temp directory, run `node validate-bundle.mjs`, and assert exit code 0. It SHALL also create an invalid bundle and assert exit code 1.

#### Scenario: Valid bundle passes Validate
- **WHEN** a temp dir contains a valid dpt_rb_test/ with all 6 control files
- **THEN** `node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs dpt_rb_test/` exits with code 0

#### Scenario: Invalid enum fails Validate
- **WHEN** rb_status.json contains `current_gate: "invalid_value"`
- **THEN** `node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs dpt_rb_test/` exits with code 1 and stderr contains the file name

### Requirement: inspect-bundle.mjs integration test covers complete and incomplete directories

The integration test SHALL create a complete current-pair bundle directory and assert exit `0`, then remove a required directory and assert exit `1`. It SHALL also exercise the inspector's public current-entry rejection boundary for every incomplete or legacy-only root shape: only `RUN_BUNDLE.md`, only `START_FROM_HERE.md`, only `BUNDLE_MAP.md`, missing `BUNDLE_ENTRY.md`, and missing `BUNDLE_MAP.md`.

The rejection assertions SHALL cover default inspection and each `--summary`, `--timeline`, and `--log` view. Each rejected invocation SHALL exit `1`, identify `unsupported_current_entry_contract`, and emit no historical summary, timeline, log, or structural data from the selected directory. A pair plus extra legacy files SHALL remain a passing current bundle, but the output SHALL not present the extras as a compatibility success path.

#### Scenario: Complete bundle passes Inspect bundle

- **WHEN** a temp dir contains a valid `dpt_rb_test/` with `BUNDLE_ENTRY.md`, `BUNDLE_MAP.md`, and all required directories
- **THEN** `node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs dpt_rb_test/` exits with code `0`

#### Scenario: Missing directory fails Inspect bundle

- **WHEN** `final/` is deleted from a current-pair bundle
- **THEN** `node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs dpt_rb_test/` exits with code `1` and output contains `missing: final/`

#### Scenario: Legacy-only and incomplete entries fail every inspector mode

- **WHEN** each legacy-only or incomplete current-entry shape is inspected with default, `--summary`, `--timeline`, and `--log`
- **THEN** every invocation exits with code `1` and names `unsupported_current_entry_contract`
- **AND** no invocation emits historical log, timeline, summary, or structural data

#### Scenario: Legacy debris beside the pair does not fail Inspect bundle

- **WHEN** a complete current-pair temp bundle also contains `RUN_BUNDLE.md` or `START_FROM_HERE.md`
- **THEN** inspection exits with code `0`
- **AND** output does not describe the extra file as an entry, map, or compatibility success path

### Requirement: Each test case uses an isolated temp directory
Every integration test case SHALL create its own temp directory via `fs.mkdtemp()` and clean it up after the test completes.

#### Scenario: No cross-test pollution
- **WHEN** test A creates files in its temp dir and test B runs
- **THEN** test B sees a clean empty temp dir

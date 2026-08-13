> req: INT-001

## MODIFIED Requirements

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

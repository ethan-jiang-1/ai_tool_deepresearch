> req: CMI-003

## MODIFIED Requirements

### Requirement: JS helper inspect-bundle.mjs validates directory structure

The `DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs` script SHALL check all
required files and directories and the current operational entry contract. The
agent SHALL call it via
`node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs <bundleDir>`.

Before default structural output or any `--summary`, `--timeline`, or `--log`
output, inspect SHALL evaluate the selected root through the shared current
entry predicate. The predicate passes only when both `BUNDLE_ENTRY.md` and
`BUNDLE_MAP.md` exist at that root. On failure, inspect SHALL emit a scoped
`unsupported_current_entry_contract` rejection, exit `1`, and emit no
historical log, timeline, summary, or other inspect data from that directory.
This is a normal known-bundle validation failure, not a migration opportunity.

`RUN_BUNDLE.md`, `START_FROM_HERE.md`, or `BUNDLE_MAP.md` without
`BUNDLE_ENTRY.md` SHALL not satisfy inspect. An extra legacy file beside a
complete pair is non-authoritative historical debris and SHALL not cause
rejection or create a second success path.

#### Scenario: inspect-bundle.mjs catches missing directory

- **WHEN** a current-pair bundle lacks `final/`
- **THEN** exit code is `1` and output lists `missing: final/`
- **AND** the current-entry preflight SHALL not mask that later structural root

#### Scenario: inspect-bundle.mjs accepts current map

- **WHEN** a bundle contains `BUNDLE_ENTRY.md`, `BUNDLE_MAP.md`, and all other
  required surfaces
- **THEN** inspect exits `0`
- **AND** output does not require `RUN_BUNDLE.md` or `START_FROM_HERE.md`

#### Scenario: inspect-bundle.mjs reports legacy map

> **@deprecated scenario name** — Retained solely as the established Scenario
> anchor. The current behavior rejects the former legacy-map success path.

- **WHEN** a bundle lacks either `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md`,
  including only `RUN_BUNDLE.md`, only `START_FROM_HERE.md`, or only
  `BUNDLE_MAP.md`
- **THEN** inspect exits `1` with
  `unsupported_current_entry_contract`
- **AND** it SHALL not emit a compatibility warning, migration advice, log
  content, timeline entries, or summary data from the directory

#### Scenario: inspect-bundle.mjs reports both map names

- **WHEN** a bundle contains the current pair and one or both of
  `RUN_BUNDLE.md` and `START_FROM_HERE.md`
- **THEN** inspect exits `0`
- **AND** those files SHALL not be described as an entry, map, or
  compatibility-success path

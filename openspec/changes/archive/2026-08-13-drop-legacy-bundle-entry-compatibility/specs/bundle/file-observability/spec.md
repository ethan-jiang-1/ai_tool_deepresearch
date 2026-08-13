> req: FIO-005

## MODIFIED Requirements

### Requirement: Root bundle map files SHALL follow canonical map policy

File observability SHALL consume the shared current-entry predicate for the
bundle root. The predicate passes only when `BUNDLE_ENTRY.md` and
`BUNDLE_MAP.md` both exist at the same root. For a passing root, file
observability SHALL classify both pair members as expected static control
surfaces and SHALL not require `RUN_BUNDLE.md` or `START_FROM_HERE.md`.

For a root missing either current member, file observability SHALL expose the
same unsupported-current-entry-contract conclusion as a deterministic blocking
root. It SHALL not classify `RUN_BUNDLE.md`, `START_FROM_HERE.md`, or a
map-only root as compatibility, expected control, or a repairable migration
path. Extra legacy files beside a passing pair are non-authoritative historical
debris only.

This classification SHALL NOT affect gate pass authority for research
artifacts, submitted work-unit ledger coverage, or queue state. It answers only
whether the selected root can enter current Harness operations.

#### Scenario: Current bundle map is expected

- **WHEN** file observability audits a bundle containing both current root
  files
- **THEN** it SHALL classify `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md` as expected
  static root surfaces
- **AND** it SHALL not require a legacy root file

#### Scenario: Legacy map is diagnostic compatibility

> **@deprecated scenario name** — Retained solely as the established Scenario
> anchor. The current behavior rejects the former legacy-map diagnostic route.

- **WHEN** file observability audits a bundle missing `BUNDLE_ENTRY.md` or
  `BUNDLE_MAP.md`
- **THEN** it SHALL return a blocking
  `unsupported_current_entry_contract` conclusion
- **AND** it SHALL not describe any legacy root file as expected or
  compatibility-success behavior

#### Scenario: Both map names do not create two authorities

- **WHEN** file observability audits a bundle containing the current pair and
  `RUN_BUNDLE.md` or `START_FROM_HERE.md`
- **THEN** the pair SHALL remain the only expected operational entry conclusion
- **AND** each legacy file SHALL be non-authoritative historical debris

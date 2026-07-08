> req: FIO-005

## ADDED Requirements

### Requirement: Root bundle map files SHALL follow canonical map policy

File observability SHALL classify `BUNDLE_MAP.md` as the expected current root bundle map file for active bundles. It SHALL NOT require `START_FROM_HERE.md` for new-bundle root-control-file expectations.

If `START_FROM_HERE.md` appears without `BUNDLE_MAP.md`, file observability SHALL report it as legacy deprecated compatibility. If both files appear, file observability SHALL prefer `BUNDLE_MAP.md` and report `START_FROM_HERE.md` as deprecated compatibility debris or a non-authoritative legacy file.

This classification SHALL NOT affect gate pass authority for research artifacts, submitted work-unit ledger coverage, or queue state. It is a file-observability diagnostic about root map naming only.

#### Scenario: Current bundle map is expected
- **WHEN** file observability audits a bundle containing `BUNDLE_MAP.md`
- **THEN** it SHALL classify `BUNDLE_MAP.md` as an expected root map file
- **AND** it SHALL NOT require `START_FROM_HERE.md`

#### Scenario: Legacy map is diagnostic compatibility
- **WHEN** file observability audits a bundle containing `START_FROM_HERE.md` but no `BUNDLE_MAP.md`
- **THEN** it SHALL report a legacy compatibility diagnostic
- **AND** it SHALL NOT treat the legacy file as submitted evidence, gate authority, or current primary map

#### Scenario: Both map names do not create two authorities
- **WHEN** file observability audits a bundle containing both `BUNDLE_MAP.md` and `START_FROM_HERE.md`
- **THEN** `BUNDLE_MAP.md` SHALL be the current expected map
- **AND** `START_FROM_HERE.md` SHALL be reported as deprecated compatibility or cleanup advice

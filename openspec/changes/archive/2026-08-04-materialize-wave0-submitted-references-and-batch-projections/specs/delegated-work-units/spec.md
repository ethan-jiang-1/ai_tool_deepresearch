> req: DEW-025

## ADDED Requirements

### Requirement: Current Wave0 work-unit contracts SHALL expose submitted source contributions without a competing rich-reference route

For a newly claimed `wave0_source_intake` work unit, the Engine-owned assignment contract SHALL describe exactly the assigned `source_yaml` output and its existing required cache/receipt facts. Its generated `task.md`, spawn projection, result-schema guidance, and accepted current-version output declarations SHALL describe that result as a submitted Wave0 source contribution after formal submit. They SHALL NOT advertise, require, or accept a rich `reference/00-shared-*.md` output as a second delegated completion or shared-reference-floor route.

Formal submit remains the only transaction that creates a submitted ledger row. A claimed, dry-submitted, filesystem-only, or chat-returned source artifact SHALL NOT unlock a Phase-owned reference projection. Queue payload, actor prose, and a reference filename SHALL NOT enlarge the current assignment contract.

This requirement is forward-looking. A successfully submitted legacy Wave0 work unit whose immutable bound assignment/result legitimately declared a rich reference output SHALL remain readable and eligible under its recorded contract. A marked `work-unit.assignment.v1` envelope SHALL use its recorded version-selected interpretation; a markerless historical envelope SHALL retain its existing legacy compatibility path and SHALL NOT be inferred to be v1 or v2 from a path, filename, or current default. The Engine SHALL NOT rewrite its manifest, result, ledger row, or output path merely to conform it to the current source-contribution contract.

#### Scenario: new Wave0 attempt has one source contribution contract

- **WHEN** the Engine claims a new `wave0_source_intake` work unit
- **THEN** its required output contract SHALL contain the exact assigned `source_yaml` tuple and existing cache/receipt obligations
- **AND** its actor-facing task and result guidance SHALL not present a `reference` output as an assigned completion or floor-repair route

#### Scenario: current submit does not promote an extra reference output

- **WHEN** a current Wave0 candidate declares a `reference/00-shared-*.md` output that was not assigned by its bound contract
- **THEN** submit validation SHALL reject or ignore that declaration according to the existing strict output-contract boundary
- **AND** the file SHALL not become delegated evidence authority or shared-reference coverage

#### Scenario: legacy submitted reference remains compatible

- **WHEN** an already submitted historical Wave0 row records a valid declared rich-reference output under its immutable legacy assignment
- **THEN** provenance and count readers SHALL continue to recognize that row through its recorded submit authority
- **AND** current claims SHALL not be retroactively changed or required to reproduce that output

#### Scenario: markerless historical attempts are not reclassified by current defaults

- **WHEN** a historical Wave0 envelope lacks an assignment-contract marker but remains valid through the existing legacy compatibility path
- **THEN** its reader SHALL preserve that legacy interpretation without reconstructing it through current v2 defaults
- **AND** a path, filename, or reference role SHALL NOT be used to infer a missing v1 or v2 marker

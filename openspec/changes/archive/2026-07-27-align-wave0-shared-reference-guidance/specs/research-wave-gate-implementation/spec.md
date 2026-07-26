> req: RWG-004

## MODIFIED Requirements

### Requirement: Gate CLI evaluates wave0 rules from definition

The Wave0 gate CLI SHALL evaluate work-unit provenance rule types from the gate definition and SHALL use work-unit helper diagnostics for ledger/index/manifest/result/receipt/beacon/hash mismatches.

For an unmet definition-owned `shared_ref_count_floor`, the structured repair coordinates and compatible feedback text SHALL identify the existing `wave0_source_intake` delegated output/submit path for a real `reference/00-shared-<slug>.md` with `source_url`. They SHALL NOT direct the Phase Agent to create an unsubmitted file directly under `reference/`. The CLI remains a read-only verdict producer; the submitted output ledger remains the count authority.

#### Scenario: Wave0 CLI rejects stale index

- **WHEN** Wave0 gate finds a ledger row whose work-unit index entry is not `submitted`
- **THEN** the CLI SHALL fail the work-unit provenance check

#### Scenario: Shared-reference floor feedback names legal producer

- **WHEN** Wave0 has fewer submitted `reference/00-shared-*.md` outputs than the profile-derived floor
- **THEN** the gate CLI SHALL return the definition-owned failure with non-empty repair coordinates naming the existing delegated `wave0_source_intake` submit path
- **AND** its feedback SHALL NOT name direct Phase creation under `reference/` as the repair

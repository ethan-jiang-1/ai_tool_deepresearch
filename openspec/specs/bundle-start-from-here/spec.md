# bundle-start-from-here Specification
> req: BUS-001, BUS-002, BUS-003

## Purpose
Deprecated legacy compatibility spec for historical `START_FROM_HERE.md` bundles. New bundles use the `bundle-map` capability and `BUNDLE_MAP.md`.
## Requirements
### Requirement: START_FROM_HERE.md legacy boot-entry behavior is deprecated

`START_FROM_HERE.md` SHALL NOT be required, generated, or taught as the first file an Agent reads for new bundles. Historical bundles that still contain it MAY be read by diagnostic tooling as deprecated compatibility only. Current bundle-root map behavior lives in `BUNDLE_MAP.md` under the `bundle-map` capability.

The old boot-entry behavior is retained here only to preserve the retired BUS requirement history:

- `reference/` — flat evidence directory (`00-shared-*.md` / `00-cross-*.md` / `0N-*.md`, `_INDEX.md` as canonical inventory), no subdirectories
- `artifacts/` — phase output organized by wave (`wave0/` thin YAML, `wave1/` topic synthesis, `wave2/` cross-topic synthesis)
- `seed_topics/` — seed topic files
- `final/` — final report

#### Scenario: New bundle does not use legacy boot entry
- **WHEN** a new bundle is instantiated
- **THEN** `START_FROM_HERE.md` SHALL NOT be required as the current first-read surface
- **AND** current guidance SHALL use `BUNDLE_MAP.md`

#### Scenario: Legacy bundle remains readable
- **WHEN** diagnostic tooling sees `START_FROM_HERE.md` without `BUNDLE_MAP.md`
- **THEN** it MAY keep the old bundle readable with deprecation advice
- **AND** it SHALL NOT treat the legacy file as current gate, queue, handoff, or state authority

#### Scenario: Legacy data directory map is superseded
- **WHEN** current docs describe bundle-root navigation
- **THEN** they SHALL use `BUNDLE_MAP.md` and current bundle-map requirements
- **AND** they SHALL NOT describe `START_FROM_HERE.md` as current positive guidance

#### Scenario: Boot entry no longer references nested reference directories
- **WHEN** an agent reads `START_FROM_HERE.md`
- **THEN** it SHALL NOT see references to `reference/<topic>/` subdirectories or `reference/00_shared/source.yaml`

### Requirement: Legacy boot-entry stop authorization behavior is retired

Detailed stop authorization belongs in lifecycle phase/shared Markdown and accepted Agent command guidance, not in a passive bundle map or deprecated legacy file.

#### Scenario: Current docs do not source stop authority from legacy boot entry
- **WHEN** an Agent needs stop authorization guidance
- **THEN** current docs SHALL route it to lifecycle phase/shared Markdown, command guidance, status, trace, and Engine checks
- **AND** they SHALL NOT rely on `START_FROM_HERE.md` as current stop authority

### Requirement: Legacy current_node resume guidance is superseded

Current resume guidance SHALL live in `BUNDLE_MAP.md`, Agent-facing command docs, reentry diagnostics, and runtime status/trace surfaces. Legacy `START_FROM_HERE.md` MAY be mentioned only as deprecated fallback for old bundles.

#### Scenario: Current resume guidance names bundle map

- **WHEN** current docs explain resume or reentry
- **THEN** they SHALL name `BUNDLE_MAP.md`, `rb_status.json.current_node`, trace, and reentry diagnostics
- **AND** they SHALL name `START_FROM_HERE.md` only as deprecated legacy fallback where compatibility is intentionally discussed

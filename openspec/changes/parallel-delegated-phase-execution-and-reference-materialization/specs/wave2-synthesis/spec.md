> req: WTS-010

## ADDED Requirements

### Requirement: Wave2 SHALL materialize existing-backed cross references without weakening targeted evidence provenance

Wave2 pure synthesis SHALL materialize `reference/00-cross-*.md` files for accepted consumer-facing cross-topic findings when those findings have concrete existing backing from submitted Wave0/Wave1 evidence, backed references, cache trails, evidence summaries, question lists, or work-unit ledger rows. These existing-backed cross references are Phase-owned consumer projections. They SHALL cite `W2F-xxx` finding ids and bundle-relative backing refs to `cross-topic-ledger.md`, `finding-index.yaml`, and the submitted prior-wave evidence surfaces that support the finding. A prior reference file MAY be one backing ref only when that prior reference itself binds to submitted/prior accepted evidence; reference-to-reference chains without underlying submitted backing SHALL NOT be sufficient.

Wave2 MAY omit a `00-cross` reference only for findings explicitly marked as process-only, internal, deferred, not sufficiently source-backed, or intentionally not consumer-facing. Such omission SHALL be visible in Wave2 artifacts or diagnostics, not hidden by silence.

When Wave2 requires new public evidence, it SHALL enqueue and drain `wave2_targeted_evidence` work units. A `reference/00-cross-*.md` that claims newly fetched evidence, targeted search, or source discovery beyond existing submitted backing SHALL require submitted Wave2 work-unit coverage and cache trails before it can count as resolved evidence.

Wave2 SHALL NOT use synthesis prose alone as backing for `00-cross` references. If concrete prior-wave backing is absent and targeted search is not performed or fails, the finding SHALL be deferred, routed to internal data/HITL2, or recorded as a limitation rather than materialized as an accepted cross reference.

#### Scenario: pure synthesis writes existing-backed cross reference

- **WHEN** Wave2 identifies finding `W2F-001` from already submitted Wave0/Wave1 evidence
- **AND** the finding has concrete backing refs in `finding-index.yaml` or `cross-topic-ledger.md`
- **AND** the finding is accepted and consumer-facing
- **THEN** the Phase Agent SHALL write `reference/00-cross-w2f-001-<slug>.md`
- **AND** the reference SHALL cite the finding id and prior-wave backing refs

#### Scenario: non-consumer finding omission is explicit

- **WHEN** Wave2 does not materialize a `00-cross` reference for a backed `W2F-xxx` finding
- **THEN** Wave2 artifacts or diagnostics SHALL record that the finding is process-only, internal, deferred, not sufficiently source-backed, or intentionally not consumer-facing
- **AND** the omission SHALL NOT be treated as silent successful materialization

#### Scenario: new external evidence still requires targeted work unit

- **WHEN** a Wave2 finding requires new public search or fetched evidence
- **THEN** the Phase Agent SHALL enqueue `wave2_targeted_evidence`
- **AND** any `reference/00-cross-*.md` claiming that new fetched evidence SHALL bind to submitted Wave2 work-unit rows and cache trails

#### Scenario: synthesis prose alone cannot back cross reference

- **WHEN** `synthesis.md` makes a cross-topic statement but `finding-index.yaml` and `cross-topic-ledger.md` do not identify concrete existing source backing
- **THEN** the Phase Agent SHALL NOT materialize an accepted `reference/00-cross-*.md` from that prose alone
- **AND** it SHALL repair the ledger/index backing, run targeted evidence, or defer the finding

#### Scenario: reference chain alone cannot back cross reference

- **WHEN** a proposed `reference/00-cross-*.md` cites another reference file
- **AND** that prior reference cannot itself be bound to submitted/prior accepted source backing
- **THEN** the cross reference SHALL NOT count as existing-backed
- **AND** the Phase Agent SHALL repair backing refs, run targeted evidence, or record a limitation

#### Scenario: cross references update consumer navigation

- **WHEN** Wave2 materializes one or more `reference/00-cross-*.md` files
- **THEN** `reference/_INDEX.md` SHALL include corresponding `source_layer: wave2_cross` entries
- **AND** Wave2 seed-topic backfill SHALL preserve `W2F-xxx` ids and refs to the cross reference plus ledger/index backing

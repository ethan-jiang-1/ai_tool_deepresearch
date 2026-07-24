## ADDED Requirements

> req: RWG-021

### Requirement: Wave adapters SHALL project minimal independent roots and shared fail-closed degradation policy

Each Wave0, Wave1, and Wave2 formal/inspect adapter SHALL invoke the same pure evaluator once for its core primary-root projection. An evaluator prerequisite guard SHALL record only explicitly downstream skipped rule IDs in `masked_rule_ids`; it SHALL NOT manufacture a blocking finding for each skipped child. If an evaluator emits a dependent finding, it SHALL set that finding's `masked_by_rule_id`, and the standard projector SHALL omit it from `hints[]`. Independent roots SHALL remain distinct primary findings and mask context SHALL remain durable diagnostic context. The formal adapters SHALL use the shared Wave-only parsed eligibility helper, not local allowlists or `id` heuristics. Only definition-owned `required_floor` roots with an exact eligible parsed `rule_id` may be candidates; queue, receipt, provenance, binding, required structure, trace, lifecycle, checker-owned, and other authority roots SHALL remain ineligible. Format-specific additions SHALL not rebuild masking or eligibility. Current Wave0/Wave1 eligible quality policy remains unchanged; active Wave2 definitions remain ineligible.

#### Scenario: prerequisite does not become a repair wall

- **WHEN** one missing parent artifact causes multiple dependent content checks to be unavailable
- **THEN** the adapter SHALL emit the parent as one primary root and retain only dependent rule IDs as masked detail
- **AND** an unrelated queue, provenance, or structure root SHALL remain independently visible

#### Scenario: inactive Wave2 fixture proves adapter capability only

- **WHEN** a schema-valid inactive Wave2 definition fixture declares an eligible quality rule
- **THEN** the production schema and shared Wave formal-helper path SHALL exercise the same metadata path used by Wave0/Wave1
- **AND** the fixture SHALL not enter active inventory, change production Wave2 policy, or make an authority-root failure eligible

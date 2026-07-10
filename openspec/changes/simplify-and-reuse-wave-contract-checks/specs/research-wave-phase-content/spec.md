> req: RWP-016

## MODIFIED Requirements

### Requirement: Wave phase docs SHALL teach canonical gate-consumable refs and roles

Wave phase docs SHALL teach the same direct artifact shapes that gate helpers consume. Agent-facing examples SHALL NOT encode spelling or role drift that causes deterministic failure, and SHALL NOT reproduce large validator implementations in prose.

For deterministic gate-consumed surfaces, phase docs SHALL name the canonical path, role, ref spelling, structured fields, and return-map navigation layer needed to produce the artifact. They SHALL direct the Phase Agent to run the corresponding side-effect-free wave inspect after phase-owned artifacts are materialized and before writing completion evidence or invoking the formal gate.

Wave1 phase docs SHALL state that:

- `artifacts/wave1/{topic}/evidence-summary.md` maps to ledger role `evidence_summary`;
- `artifacts/wave1/{topic}/question-list.md` maps to ledger role `question_list`;
- `other` is reserved for extra non-blocking outputs;
- `reviewed_work_unit_refs[]` uses `_work_units/wave1/<work_id>`;
- depth-review derives novelty from Wave0 URLs and submitted source claims;
- the Agent SHALL repair the smallest inspect root cause and rerun the same inspect before formal gate.

Wave0/Wave1/Wave2 and seed-topic docs SHALL continue to use concrete `reference/*.md` files as primary consumer navigation for evidence-bearing return maps. Internal refs remain secondary provenance unless an explicit limitation or non-consumer-facing status is recorded.

Wave2 phase docs SHALL expose the complete current finding-index structured field set and enums through one canonical Agent-facing surface, SHALL keep existing-backed and newly fetched `00-cross` authority distinct, and SHALL direct the Phase Agent to use Wave2 inspect for exact deterministic feedback rather than reading Engine helper source.

#### Scenario: Wave1 docs bind required paths to roles

- **WHEN** the Phase Agent reads Wave1 delegated output guidance
- **THEN** it SHALL see the canonical evidence-summary and question-list roles
- **AND** it SHALL see the side-effect-free inspect command before formal gate

#### Scenario: Phase Agent repairs from one inspect root cause

- **WHEN** wave inspect reports a required structured field or provenance binding failure
- **THEN** phase guidance SHALL direct the Agent to repair that named surface and rerun the same inspect
- **AND** it SHALL NOT require reading gate/helper source or constructing a second local validator

#### Scenario: Wave2 docs expose current finding contract

- **WHEN** the Phase Agent reads Wave2 finding-index guidance
- **THEN** the complete current required field set and canonical enum values SHALL be visible through the canonical guidance surface
- **AND** contradictory field-count wording SHALL NOT remain

#### Scenario: Return-map docs prioritize reference navigation

- **WHEN** the Phase Agent reads seed-topic or wave backfill guidance
- **THEN** evidence-bearing return-map examples SHALL include concrete `reference/*.md` refs when materialized
- **AND** internal surfaces SHALL be described as secondary provenance

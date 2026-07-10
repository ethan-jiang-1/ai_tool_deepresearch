> req: RWP-016

## MODIFIED Requirements

### Requirement: Wave phase docs SHALL teach canonical gate-consumable refs and roles

Wave phase docs SHALL teach the same direct artifact shapes that gate/inspect helpers consume. Agent-facing examples SHALL NOT encode harmless-looking spelling, field, enum, path, or role drift that causes deterministic failure, and SHALL NOT reproduce large validator implementations in prose.

For deterministic gate-consumed surfaces, phase docs SHALL be self-sufficient producer instructions: they SHALL name the canonical path, role, ref spelling, required structured fields/enums, and return-map navigation layer needed to produce the artifact. They SHALL NOT require the Phase Agent or Sub-agent to inspect Engine helper source to discover the required output shape.

Wave phase docs SHALL direct the Phase Agent to run the corresponding side-effect-free Wave inspect after phase-owned artifacts are materialized and before writing completion evidence or invoking the formal gate. On failure, guidance SHALL direct the Agent to repair the smallest named root cause and rerun the same inspect; it SHALL NOT instruct construction of a second local validator.

Wave1 phase docs SHALL state that:

- `artifacts/wave1/{topic}/evidence-summary.md` is the required evidence summary output and maps to ledger role `evidence_summary`;
- `artifacts/wave1/{topic}/question-list.md` is the required question list output and maps to ledger role `question_list`;
- `other` is reserved for extra non-blocking outputs;
- `reviewed_work_unit_refs[]` uses canonical `_work_units/wave1/<work_id>` without a trailing slash;
- depth-review novelty compares submitted source claims against Wave0 source URLs and binds accepted claims to submitted cache/degraded/source authority; and
- inspect failure is repaired at the named canonical surface before formal gate.

Wave0/Wave1/Wave2 and seed-topic docs SHALL state that evidence-bearing return-map `refs` use concrete existing `reference/*.md` files as the primary consumer navigation layer when materialized. Internal refs under `artifacts/`, `_cache/`, and `_work_units/` are secondary provenance and cannot replace concrete reference navigation unless the entry explicitly records a deterministic limitation or non-consumer-facing status.

Wave2 phase docs SHALL expose the complete current finding-index required field set and canonical enum values through one canonical Agent-facing surface. They SHALL state that:

- newly fetched `reference/00-cross-*.md` evidence requires submitted `wave2_targeted_evidence` backing;
- existing-backed `reference/00-cross-*.md` projections are Phase-owned only when prior accepted evidence plus `W2F-xxx`, `finding-index.yaml`, `cross-topic-ledger.md`, and concrete prior backing refs make the projection auditable;
- `source_layer: wave2_cross` and `reference/_INDEX.md` rows are navigation/index metadata, not evidence authority by themselves; and
- exact deterministic finding/ledger feedback comes from Wave2 inspect rather than Engine helper source.

#### Scenario: Wave1 docs bind required paths to roles

- **WHEN** the Phase Agent reads Wave1 delegated output guidance
- **THEN** it SHALL see that `evidence-summary.md` maps to `evidence_summary`
- **AND** `question-list.md` maps to `question_list`
- **AND** `other` is not the role for those required outputs

#### Scenario: Depth-review example uses canonical ref spelling

- **WHEN** the Phase Agent reads the Wave1 depth-review example
- **THEN** `reviewed_work_unit_refs[]` SHALL show `_work_units/wave1/<work_id>` without a trailing slash

#### Scenario: Return-map docs prioritize reference navigation

- **WHEN** the Phase Agent reads seed-topic or Wave backfill guidance
- **THEN** evidence-bearing return-map examples SHALL include concrete `reference/*.md` refs when reference files are materialized
- **AND** `artifacts/`, `_cache/`, and `_work_units/` refs SHALL be described as secondary provenance

#### Scenario: Wave2 docs preserve cross-reference authority split

- **WHEN** the Phase Agent reads Wave2 reference projection guidance
- **THEN** it SHALL see that newly fetched `00-cross` evidence needs submitted `wave2_targeted_evidence`
- **AND** existing-backed `00-cross` projections need prior accepted backing plus W2F/finding-index/cross-topic-ledger refs
- **AND** `source_layer: wave2_cross` SHALL NOT be described as sufficient evidence authority

#### Scenario: Phase docs expose deterministic repair shape

- **WHEN** a stop:no Phase Agent reads the active Wave guidance
- **THEN** required gate-consumed roles, refs, paths, fields, enums, and return-map navigation expectations SHALL be visible in phase docs or generated task instructions
- **AND** the Agent SHALL NOT need Engine helper source to know the deterministic producer shape

#### Scenario: Phase Agent runs inspect before completion evidence

- **WHEN** phase-owned Wave artifacts have been materialized
- **THEN** guidance SHALL place the corresponding inspect command before completion evidence and formal gate invocation
- **AND** it SHALL describe inspect as side-effect-free and non-routing

#### Scenario: Phase Agent repairs from one inspect root cause

- **WHEN** Wave inspect reports a required structured field or provenance binding failure
- **THEN** phase guidance SHALL direct the Agent to repair that named surface and rerun the same inspect
- **AND** it SHALL NOT require a second validator or manual authority bypass

#### Scenario: Wave2 docs expose current finding contract

- **WHEN** the Phase Agent reads Wave2 finding-index guidance
- **THEN** the complete current required field set and canonical enum values SHALL be visible through the canonical guidance surface
- **AND** contradictory field-count or enum wording SHALL NOT remain

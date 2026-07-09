> req: RWP-016

## ADDED Requirements

### Requirement: Wave phase docs SHALL teach canonical gate-consumable refs and roles

Wave phase docs SHALL teach the same artifact shapes that gate helpers consume. Agent-facing examples SHALL NOT encode harmless-looking spelling or role drift that causes gate failure.

For deterministic gate-consumed surfaces, phase docs SHALL be self-sufficient producer instructions: they SHALL name the canonical path, role, ref spelling, and return-map navigation layer that the gate/inspect helpers consume. They SHALL NOT require the Phase Agent or Sub-agent to inspect Engine helper source to discover the required output shape.

Wave1 phase docs SHALL state that:

- `artifacts/wave1/{topic}/evidence-summary.md` is the required evidence summary output and maps to ledger role `evidence_summary`;
- `artifacts/wave1/{topic}/question-list.md` is the required question list output and maps to ledger role `question_list`;
- `other` is reserved for extra non-blocking outputs;
- `reviewed_work_unit_refs[]` SHALL use `_work_units/wave1/<work_id>` without a trailing slash.

Wave0/Wave1/Wave2 and seed-topic docs SHALL state that evidence-bearing return-map `refs` use `reference/*.md` as the primary consumer navigation layer. Internal refs under `artifacts/`, `_cache/`, and `_work_units/` are secondary provenance and cannot replace concrete reference navigation unless the entry explicitly records a deterministic limitation or non-consumer-facing status.

Wave2 phase docs SHALL state that:

- newly fetched `reference/00-cross-*.md` evidence requires submitted `wave2_targeted_evidence` backing;
- existing-backed `reference/00-cross-*.md` projections are Phase-owned only when prior accepted evidence plus `W2F-xxx`, `finding-index.yaml`, `cross-topic-ledger.md`, and concrete prior backing refs make the projection auditable;
- `source_layer: wave2_cross` and `reference/_INDEX.md` rows are navigation/index metadata, not evidence authority by themselves.

#### Scenario: Wave1 docs bind required paths to roles

- **WHEN** the Phase Agent reads Wave1 delegated output guidance
- **THEN** it SHALL see that `evidence-summary.md` maps to `evidence_summary`
- **AND** `question-list.md` maps to `question_list`
- **AND** `other` is not the role for those required outputs

#### Scenario: Depth-review example uses canonical ref spelling

- **WHEN** the Phase Agent reads the Wave1 depth-review example
- **THEN** `reviewed_work_unit_refs[]` SHALL show `_work_units/wave1/<work_id>` without a trailing slash

#### Scenario: Return-map docs prioritize reference navigation

- **WHEN** the Phase Agent reads seed-topic or wave backfill guidance
- **THEN** evidence-bearing return-map examples SHALL include concrete `reference/*.md` refs when reference files are materialized
- **AND** `artifacts/`, `_cache/`, and `_work_units/` refs SHALL be described as secondary provenance

#### Scenario: Wave2 docs preserve cross-reference authority split

- **WHEN** the Phase Agent reads Wave2 reference projection guidance
- **THEN** it SHALL see that newly fetched `00-cross` evidence needs submitted `wave2_targeted_evidence`
- **AND** existing-backed `00-cross` projections need prior accepted backing plus W2F/finding-index/cross-topic-ledger refs
- **AND** `source_layer: wave2_cross` SHALL NOT be described as sufficient evidence authority

#### Scenario: Phase docs expose deterministic repair shape

- **WHEN** a stop:no Phase Agent reads the active wave guidance
- **THEN** the required gate-consumed roles, refs, paths, and return-map navigation expectations SHALL be visible in the phase docs or generated task instructions
- **AND** the Agent SHALL NOT need Engine helper source to know the deterministic producer shape

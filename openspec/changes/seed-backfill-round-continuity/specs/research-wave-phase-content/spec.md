# Research Wave Phase Content (delta)

> req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-007, RWP-008, RWP-009, RWP-010, RWP-011, RWP-012, RWP-013, RWP-014, RWP-015, RWP-016, RWP-017, RWP-018, RWP-019
> delta: RWP-020, RWP-021, RWP-022

## ADDED Requirements

### Requirement: Wave1 SHALL classify topics before queue fill

Phase-wave1 §3.0 SHALL instruct the Agent to classify each current canonical Topic from direct bundle authority before filling queue demand, using the same pattern as wave0 §3.0 Classify Direct Facts. Classification is evaluated in priority order:

1. `supplement intent -> normal supplementary deepening` through the same `wave1_topic_deepening` producer path. Supplement intent is signaled by `## 本轮重跑方向` section with `action: supplement` and `new_search_dimensions`. This takes priority over reuse — a topic with valid historical coverage that also has supplement intent SHALL still receive supplementary deepening demand.
2. `existing Topic + valid submitted Wave1 deepening -> reuse` that submitted historical deepening coverage. This applies only when there is no supplement intent.
3. `new Topic + no submitted Wave1 deepening -> normal deepening pipeline`
4. orphan `evidence-summary.md` or `depth-review.yaml` without submitted backing -> not coverage

Phase-wave1 §3.1 SHALL exclude reuse-classified topics from queue fill: "Do not enqueue duplicate work for an existing Topic whose valid submitted Wave1 deepening is being reused." Topics classified as supplement SHALL be enqueued as supplementary `wave1_topic_deepening` demand informed by `new_search_dimensions`.

This classification SHALL be the same for first-run and rerun-added Topics. It SHALL create no rerun Gate exception, mode, controller, submit path, or provenance namespace.

#### Scenario: Existing topic with valid submitted deepening is skipped

- **WHEN** a topic has valid submitted `wave1_topic_deepening` ledger rows and no supplement intent
- **THEN** wave1 queue fill SHALL NOT enqueue a new deepening item for that topic
- **AND** the Phase Agent SHALL proceed with reference materialization and depth review from existing submitted backing

#### Scenario: New topic enters normal wave1 pipeline

- **WHEN** a topic has no submitted Wave1 deepening coverage (new or previously un-deepened)
- **THEN** wave1 queue fill SHALL enqueue one standard `wave1_topic_deepening` queue item
- **AND** the topic SHALL follow the normal claim/submit/depth-review/materialize path

#### Scenario: Supplement intent creates normal supplementary demand

- **WHEN** a topic's `## 本轮重跑方向` section specifies `action: supplement` with `new_search_dimensions`
- **THEN** wave1 queue fill SHALL enqueue supplementary `wave1_topic_deepening` demand informed by those dimensions
- **AND** the supplementary unit MAY cite prior submitted outputs via `buildSourceRefLineage`

### Requirement: Wave2 SHALL classify topics before queue fill

Phase-wave2 §3.0 SHALL instruct the Agent to classify each current canonical Topic and finding from direct bundle authority before filling queue demand. Classification is evaluated in priority order:

1. `emergent finding needing targeted evidence -> normal targeted evidence demand` through the `wave2_targeted_evidence` producer path. Emergent findings take priority over reuse — a topic with valid historical cross-topic coverage that also has new emergent findings SHALL still receive targeted evidence demand.
2. `existing Topic + valid submitted cross-topic coverage -> reuse` that submitted historical cross-topic and targeted-evidence coverage. This applies only when there are no new emergent findings.
3. `new Topic needing cross-topic integration -> normal Topic pipeline` through the finding triage loop
4. orphan `finding-index.yaml` or `cross-topic-ledger.md` entry without submitted backing -> not coverage

Phase-wave2 §3.1 SHALL exclude reuse-classified topics from queue fill for backfill and targeted-evidence demand.

#### Scenario: Existing topic with valid cross-topic coverage is skipped

- **WHEN** a topic has valid submitted cross-topic and targeted-evidence coverage and no new emergent findings
- **THEN** wave2 SHALL reuse that coverage without creating duplicate backfill or targeted-evidence demand

#### Scenario: Emergent finding routes to targeted evidence

- **WHEN** a new cross-topic finding requires external evidence not covered by existing submitted backing
- **THEN** wave2 SHALL enqueue `wave2_targeted_evidence` demand for that finding

### Requirement: Wave phases SHALL provide missing-token fallback

Phase-wave0 §3.3, phase-wave1 §3.3, and phase-wave2 §3.2.3 SHALL each include a fallback path for when the expected `__BACKFILL_*__` token is not found in the seed topic file:

1. Check whether this Topic was classified as `reuse` (existing valid submitted coverage) — if so, skip backfill (no new evidence to add)
2. Otherwise: the token should have been re-injected by phase-rerun. Record a diagnostic trace event and append the backfill entry after the last content in the target wave section

#### Scenario: Reuse-classified topic skips backfill on missing token

- **WHEN** a topic is classified as reuse (existing valid submitted coverage)
- **AND** the `__BACKFILL_*__` token is not found (consumed in prior round, no re-injection needed because no new work)
- **THEN** the Phase Agent SHALL skip backfill for that topic
- **AND** it SHALL NOT record an error or block the phase

#### Scenario: Non-reuse topic with missing token uses fallback path

- **WHEN** a topic is NOT classified as reuse and needs new backfill
- **AND** the expected `__BACKFILL_*__` token is not found (phase-rerun re-injection may have been missed)
- **THEN** the Phase Agent SHALL record a diagnostic trace event
- **AND** it SHALL append the backfill entry after the last content in the target wave section

# Rerun Topic Integration (delta)

> req: RTI-001, RTI-002, RTI-003, RTI-005, RTI-006
> delta: RTI-007

## ADDED Requirements

### Requirement: Phase-rerun SHALL refresh backfill targets for existing topics

Phase-rerun Stage 3 SHALL include a step 1d (Refresh Backfill Targets) after recomputing research_style_params and before incrementing `rerun_count`. For each affected existing topic (not `add_topic`), the Agent SHALL:

1. Read the seed topic file
2. For each of the five wave backfill sections, detect whether the corresponding `__BACKFILL_*__` token exists
3. If the token exists: skip (prior round incomplete, token still valid)
4. If the token is absent: insert a fresh copy at the section bottom (after last content line, before next `## ` header)
5. Skip new topics (`add_topic`) — they have fresh skeletons from `renderNewSeedBody()`
6. Use staged write (tmp → verify → atomic rename)

This step SHALL be idempotent: re-running it SHALL NOT create duplicate tokens.

#### Scenario: Refresh backfill targets runs after topic changes

- **WHEN** phase-rerun has applied topic changes (add/update/mutate) and recomputed research_style_params
- **THEN** it SHALL run the Refresh Backfill Targets step before incrementing rerun_count
- **AND** each existing topic with consumed tokens SHALL receive fresh `__BACKFILL_*__` tokens

#### Scenario: Refresh backfill targets is skipped for add_topic

- **WHEN** a topic was created via `add_topic` in the current rerun
- **THEN** Refresh Backfill Targets SHALL skip that topic
- **AND** its fresh skeleton tokens from topic-state apply SHALL remain unchanged

#### Scenario: Idempotent re-execution

- **WHEN** Refresh Backfill Targets has already run once
- **AND** phase-rerun is re-executed (e.g., after a gate repair)
- **THEN** no duplicate `__BACKFILL_*__` tokens SHALL be created
- **AND** each section SHALL contain at most one copy of its designated token

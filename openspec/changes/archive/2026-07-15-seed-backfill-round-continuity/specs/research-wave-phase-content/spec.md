# Research Wave Phase Content (delta)

> req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-007, RWP-008, RWP-009, RWP-010, RWP-011, RWP-012, RWP-013, RWP-014, RWP-015, RWP-016, RWP-017, RWP-018, RWP-019
> delta: RWP-020

## MODIFIED Requirements

### Requirement: Rerun action:add SHALL include full cache trail

Phase-wave0 §3.3、Phase-wave1 §3.3、and Phase-wave2 §3.2.3 SHALL instruct the Agent to update seed projection sections from current-round submitted authority. When a `__BACKFILL_*__` token is present (first materialization), the Agent SHALL replace it with return-map entries. When no token is present (rerun), the Agent SHALL:

1. Read current-round submitted rows via `operate-work-unit inspect --eligible-rows` for the topic/wave. Eligible rows are those whose work unit index record `rerun_count` matches the current `rb_profile.yaml` value, validated through ledger/index/manifest/queue-snapshot/canonical-topic binding by the Engine.
2. Read submitted outputs at the returned `result_path` locations. Derive return-map entries (evidence_meaning, relationship, refs, status, next_hop) by reading the outputs — NOT by mechanically extracting fields from ledger rows.
3. Assign each new entry an `entry_id` in the format `<work_id>/<n>` where `n` is a 1-based index unique within the work unit. Check whether this `entry_id` already appears in the section; if not, append the entry at section bottom.
4. For entries that should not appear in the projection (intermediate outputs, process-only, not consumer-facing), write an explicit no-projection disposition entry with `relationship: defers`, `status: deferred`, and `next_hop` containing a limitation reason.

Wave1 and Wave2 SHALL add a §3.0 "Classify Direct Facts" section implementing the existing RWP-014 classification. Classification SHALL use the shared direction resolver (`resolveRerunDirection`) to determine whether the `## 本轮重跑方向` section's intent is current. Only `matching` or `future` states SHALL activate supplement intent. `stale`/`legacy_unbound`/`invalid` SHALL be treated as no supplement intent.

#### Scenario: Projection updated from current-round rows only

- **WHEN** a topic has submitted Wave1 rows from round 1 (index.rerun_count=1) and round 2 (index.rerun_count=2)
- **AND** profile `rerun_count` is 2
- **AND** the seed projection has no `__BACKFILL_*__` token
- **THEN** `operate-work-unit inspect --eligible-rows` SHALL return only the round-2 rows
- **AND** the Agent SHALL append entries for those rows with new entry_ids

#### Scenario: Entry with no-projection disposition satisfies check

- **WHEN** a submitted row produced process-only output not suitable for consumer projection
- **THEN** the Agent SHALL write an entry with `relationship: defers`, `status: deferred`, `next_hop: "limitation: process-only output, not consumer-facing"`
- **AND** this entry SHALL satisfy the authority reference check (explicit disposition)

#### Scenario: Wave1 classification uses direction resolver

- **WHEN** a topic has direction with `rerun_count: 2` and `action: supplement`
- **AND** profile `rerun_count` is 2
- **THEN** `resolveRerunDirection` returns `matching`
- **AND** wave1 §3.0 SHALL classify the topic as supplement

#### Scenario: Stale direction does not trigger classification

- **WHEN** a topic has direction with `rerun_count: 1` and `action: supplement`
- **AND** profile `rerun_count` is 2
- **THEN** `resolveRerunDirection` returns `stale`
- **AND** wave1 §3.0 SHALL treat the topic as having no supplement intent (reuse if valid coverage exists)

## ADDED Requirements

### Requirement: Work unit index record SHALL carry Engine-owned rerun_count

`operate-work-unit claim` SHALL read the current `rerun_count` from `rb_profile.yaml` and write it into the work unit index record's `rerun_count` field at claim time. The field SHALL be a non-negative integer or absent (legacy records). This field SHALL be Engine-owned — the Agent SHALL NOT write or modify it.

`operate-work-unit inspect` SHALL accept an `--eligible-rows` flag. When present, it SHALL return all submitted rows for the bundle whose index `rerun_count` matches the current profile `rerun_count`, validated through ledger/index/manifest/queue-snapshot/canonical-topic binding. Each returned row SHALL include `work_id`, `result_path`, `rerun_count`, and resolved topic binding. Legacy rows without `rerun_count` in the index record SHALL be treated as `legacy_unbound` and excluded from eligible rows (they are not current-round authority).

#### Scenario: Claim stamps current rerun_count into index

- **WHEN** profile `rerun_count` is 2 and `operate-work-unit claim` creates a new work unit
- **THEN** the index record SHALL have `rerun_count: 2`
- **AND** the Agent SHALL NOT be able to modify this field

#### Scenario: Eligible rows filtered by round

- **WHEN** a bundle has submitted rows with index.rerun_count values 1, 2, and one legacy row without the field
- **AND** profile `rerun_count` is 2
- **THEN** `operate-work-unit inspect --eligible-rows` SHALL return only the row with `rerun_count: 2`
- **AND** legacy rows and round-1 rows SHALL be excluded

### Requirement: Wave2 finding SHALL carry created_in_rerun_count

`finding-index.yaml`'s per-finding contract SHALL include an optional `created_in_rerun_count` field (non-negative integer). The Phase Agent SHALL write this field when creating new findings in Wave2 synthesis, reading the current value from `rb_profile.yaml`. Existing findings without this field SHALL be treated as `legacy_unbound` — they SHALL always be included in projection and authority verification regardless of round.

#### Scenario: New finding carries round marker

- **WHEN** Wave2 synthesis creates finding W2F-015 in round 2
- **THEN** the finding SHALL have `created_in_rerun_count: 2`

#### Scenario: Legacy finding without round marker is preserved

- **WHEN** a pre-v0.29 finding has no `created_in_rerun_count` field
- **AND** Wave2 authority verification runs in round 2
- **THEN** the finding SHALL be treated as legacy_unbound and included in verification
- **AND** no blocking finding SHALL be produced solely due to the missing field

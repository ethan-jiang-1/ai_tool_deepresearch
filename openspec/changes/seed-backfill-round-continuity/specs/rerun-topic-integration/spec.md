# Rerun Topic Integration (delta)

> req: RTI-001, RTI-002, RTI-003, RTI-005, RTI-006
> delta: RTI-007

## ADDED Requirements

### Requirement: Rerun direction SHALL bind to target round count with crash-safe recovery

Phase-rerun Stage 3 SHALL compute `target_rerun_count = profile.rerun_count + 1` and write `rerun_count: <target>` into `## 本轮重跑方向` before incrementing the profile count. After writing the direction, the profile `rerun_count` SHALL be incremented to `target`. Downstream phases SHALL compare the direction's `rerun_count` with the profile's current `rerun_count` — only equal values SHALL activate direction actions.

Stage 1 SHALL check whether a direction section already exists with `rerun_count == target_rerun_count` (i.e., `profile.rerun_count + 1`). If so, the direction was already written for this round — skip to the increment-and-gate step (crash recovery). If the section does not exist or its `rerun_count != target`, proceed to Stage 3.

A shared direction resolver function `resolveRerunDirection(content, profileRerunCount)` SHALL return one of five deterministic states:

| State | Condition | Meaning |
|---|---|---|
| `matching` | direction.rerun_count == profile | Current-round direction |
| `stale` | direction.rerun_count < profile | Previous-round residue |
| `future` | direction.rerun_count > profile | Crash window — direction written, profile not yet incremented |
| `legacy_unbound` | No `rerun_count` field | Pre-v0.29 bundle |
| `invalid` | Field present but unparseable | Corrupt |

This resolver SHALL be used by Wave phase classification and `checkRerunAddFullSynthesis`. No consumer SHALL implement its own direction state logic.

#### Scenario: Direction written with target before profile increment

- **WHEN** current profile `rerun_count` is 1
- **THEN** phase-rerun SHALL compute `target_rerun_count = 2`
- **AND** SHALL write `rerun_count: 2` into direction section
- **AND** SHALL then increment profile to 2

#### Scenario: Crash after direction write, before profile increment

- **WHEN** direction has `rerun_count: 2` and profile has `rerun_count: 1` (crash window)
- **AND** phase-rerun re-executes
- **THEN** Stage 1 SHALL compute target = 1 + 1 = 2
- **AND** SHALL find direction with `rerun_count: 2 == 2` (matches target)
- **AND** SHALL skip to increment step (profile 1 → 2) and gate

#### Scenario: New rerun request is not mistaken for crash recovery

- **WHEN** round 2 completed (profile=2, direction.rerun_count=2)
- **AND** user triggers round 3 rerun
- **THEN** Stage 1 SHALL compute target = 2 + 1 = 3
- **AND** direction has `rerun_count: 2 != 3` (does not match target)
- **AND** SHALL proceed to Stage 3 to write new direction with `rerun_count: 3`

#### Scenario: Direction resolver returns stale for old action

- **WHEN** `checkRerunAddFullSynthesis` reads a seed with direction `rerun_count: 1`
- **AND** profile `rerun_count` is 2
- **THEN** `resolveRerunDirection` SHALL return `stale`
- **AND** the evaluator SHALL NOT apply `action: add` from this direction

#### Scenario: Legacy direction without rerun_count is not blocked

- **WHEN** a seed topic has direction section without `rerun_count` field
- **THEN** `resolveRerunDirection` SHALL return `legacy_unbound`
- **AND** consumers SHALL apply existing pre-v0.29 behavior

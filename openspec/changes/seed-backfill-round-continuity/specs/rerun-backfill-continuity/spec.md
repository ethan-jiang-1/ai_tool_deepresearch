# Rerun Backfill Continuity

> req: RBC-001, RBC-002, RBC-003

## Purpose

确保多轮 rerun 场景中种子 Topic 文件的回填占位 token（`__BACKFILL_*__`）具备跨轮连续性。Phase-rerun 在每轮 rerun 结束时检测已消费的 token 并在对应 wave section 底部重新注入，使下一轮 wave0/wave1/wave2 有结构性回填目标。

## Requirements

### Requirement: Phase-rerun SHALL re-inject consumed backfill tokens for existing topics

After writing `## 本轮重跑方向` and before incrementing `rerun_count`, the phase-rerun Agent SHALL, for each affected existing topic (not `add_topic`), read the seed file and for each of the five wave backfill sections check whether the corresponding `__BACKFILL_*__` token is present. If a token is absent (consumed in a prior round), the Agent SHALL insert a fresh copy of that token at the bottom of the section, after the last content line and before the next `## ` header.

The five wave-section-to-token mappings are:

| Section Header (new name) | Section Header (old name) | Token |
|---|---|---|
| `## Wave0 证据` | `## 本轮新增证据` | `__BACKFILL_WAVE0_EVIDENCE__` |
| `## Wave1 机制` | `## 本轮新增机制理解` | `__BACKFILL_WAVE1_MECHANISMS__` |
| `## Wave1 趋势与缺口` | `## 本轮新增趋势与难点` | `__BACKFILL_WAVE1_TRENDS__` |
| `## Wave2 发现` | `## 当前判断` | `__BACKFILL_WAVE2_JUDGMENT__` |
| `## 待解决问题` | `## 待验证问题` | `__BACKFILL_PENDING_QUESTIONS__` |

Detection SHALL be by token name (not section header): grep the entire seed file for each `__BACKFILL_*__` string; if found anywhere, that section is skipped. When inserting a re-injected token (token was not found), the Agent SHALL locate the target section by its current header name. For seed files still using old-format headers, the Agent SHALL recognize the old header as the same section and insert the token at its bottom. The old-to-new header mapping is provided above for this purpose.

#### Scenario: Consumed tokens are re-injected after round 1

- **WHEN** a round-1 complete seed file has all five `__BACKFILL_*__` tokens replaced with return-map entries
- **AND** phase-rerun runs for a round-2 supplement rerun
- **THEN** each of the five wave sections SHALL receive a fresh `__BACKFILL_*__` token at its bottom
- **AND** the original round-1 return-map content SHALL be preserved above the re-injected token

#### Scenario: Unconsumed tokens are not duplicated

- **WHEN** a seed file still has an unconsumed `__BACKFILL_WAVE1_MECHANISMS__` token (prior round incomplete)
- **AND** phase-rerun runs token re-injection
- **THEN** that section SHALL be skipped (no duplicate token inserted)
- **AND** other sections with consumed tokens SHALL still receive fresh tokens

#### Scenario: Token re-injection uses staged write

- **WHEN** the Agent writes re-injected tokens to a seed file
- **THEN** it SHALL use a staged write (write temp file → verify → atomic rename)
- **AND** the original file SHALL not be left in a partially-written state on crash

### Requirement: Token re-injection SHALL be idempotent

Re-running the token re-injection stage multiple times SHALL NOT create duplicate tokens. The detection logic ("if token exists → skip") guarantees that each section contains at most one copy of its designated `__BACKFILL_*__` token.

#### Scenario: Re-running re-injection produces no duplicates

- **WHEN** token re-injection has already run once (fresh tokens present)
- **AND** phase-rerun is re-executed
- **THEN** each wave section SHALL still contain exactly one copy of its designated token
- **AND** no duplicate `__BACKFILL_*__` lines SHALL appear

### Requirement: New topics SHALL be skipped during token re-injection

Topics created via `add_topic` in the current rerun SHALL be skipped during token re-injection. These topics receive fresh skeletons with all five `__BACKFILL_*__` tokens from `renderNewSeedBody()` during topic-state apply, and re-injection would be redundant.

#### Scenario: add_topic seeds are not touched

- **WHEN** phase-rerun adds a new topic via `add_topic`
- **AND** token re-injection runs
- **THEN** the new topic's seed file SHALL be skipped
- **AND** its fresh `__BACKFILL_*__` tokens from `renderNewSeedBody()` SHALL remain unchanged

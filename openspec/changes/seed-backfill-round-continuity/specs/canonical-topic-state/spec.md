# Canonical Topic State (delta)

> req: CTS-001, CTS-002, CTS-003, CTS-004, CTS-005, CTS-006, CTS-007
> delta: CTS-008

## ADDED Requirements

### Requirement: New seed body SHALL use wave-fixed backfill section headers

`renderNewSeedBody()` SHALL produce backfill section headers that name the target wave rather than the current round:

| Former header | New header |
|---|---|
| `## 本轮新增证据` | `## Wave0 证据` |
| `## 本轮新增机制理解` | `## Wave1 机制` |
| `## 本轮新增趋势与难点` | `## Wave1 趋势与缺口` |
| `## 当前判断` | `## Wave2 发现` |
| `## 待验证问题` | `## 待解决问题` |

The five `__BACKFILL_*__` token names SHALL remain unchanged. Each token SHALL appear in its corresponding renamed section. The guidance line (`> return-map entry: ...`) and the research-round append zone delimiter (`## ═══ 研究轮次追加区 ═══`) SHALL remain unchanged.

#### Scenario: New seed renders with wave-fixed headers

- **WHEN** topic-state apply creates a new seed for an `add_topic`
- **THEN** the backfill section headers SHALL use wave-fixed names (`## Wave0 证据`, `## Wave1 机制`, etc.)
- **AND** the five `__BACKFILL_*__` tokens SHALL appear under their corresponding renamed sections

#### Scenario: Existing seed body is not rewritten

- **WHEN** topic-state apply updates an existing topic (update_intent or mutate_layout)
- **THEN** the existing seed body SHALL be preserved byte-for-byte (per existing CTS-003 contract)
- **AND** section headers SHALL NOT be rewritten to the new format by topic-state apply

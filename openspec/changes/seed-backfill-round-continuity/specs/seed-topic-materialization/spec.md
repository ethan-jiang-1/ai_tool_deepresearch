# Seed Topic Materialization (delta)

> req: STM-001, STM-002, STM-003, STM-004, STM-005, STM-006, STM-007, STM-008
> delta: STM-009

## ADDED Requirements

### Requirement: Seed template SHALL use wave-fixed backfill section headers

The seed topic template in `phase-seed-topics.md` §3.1 (Seed Topic 文件结构) and its corresponding backfill responsibility table SHALL use wave-fixed section headers:

| Former header | New header |
|---|---|
| `## 本轮新增证据` | `## Wave0 证据` |
| `## 本轮新增机制理解` | `## Wave1 机制` |
| `## 本轮新增趋势与难点` | `## Wave1 趋势与缺口` |
| `## 当前判断` | `## Wave2 发现` |
| `## 待验证问题` | `## 待解决问题` |

The backfill responsibility table SHALL be updated to reference the new header names in its target column. The five `__BACKFILL_*__` token names, the guidance line, and the research-round append zone delimiter SHALL remain unchanged.

#### Scenario: Template renders with wave-fixed headers

- **WHEN** the Phase Agent reads the seed topic file structure in phase-seed-topics.md §3.1
- **THEN** the backfill section headers in the template SHALL use wave-fixed names
- **AND** the backfill responsibility table SHALL reference the new header names

#### Scenario: Gate checks continue to work

- **WHEN** a seed topic file uses wave-fixed section headers
- **AND** wave1-complete or wave2-complete gate runs `pattern_match` for `__BACKFILL_*__` tokens
- **THEN** the gate SHALL produce the same verdict as with the old header format
- **AND** header name changes SHALL NOT affect gate rule evaluation

> req: RWG-002

## MODIFIED Requirements

### Requirement: Wave1 complete gate rule set

`gate-wave1-complete.definition.json` SHALL 定义当前 contract 下的 Wave1 rules。

`per_topic_ref_md_count_floor` rule（`check: count_floor`，`threshold: 1`）的 target glob SHALL 为 `reference/*{topic}*.md`——`{topic}` 展开为 topic.slug（含 `NN_` 前缀），glob `*{topic}*` 匹配任何包含该 slug 的 `.md` 文件名（含 `{slug}-<qualifier>.md` 和裸 `{slug}.md` 两种形态）。

**变更说明**: target glob 从 `reference/*{topic}-*.md` 改为 `reference/*{topic}*.md`（去掉强制 `-`）。旧 glob `*{topic}-*` 要求 slug 后紧跟 `-`，与 `0N-<slug>.md` 约定（slug 在末尾）互斥；也与新约定 `{slug}-<qualifier>.md`（`NN_` 已含在 slug 中）不一致——`-` 不是 slug 的一部分，不应强制作为分隔符。新 glob 更健壮：接受含 qualifier 和不含 qualifier 两种形态。

Gate 的其他 rule（`file_exists`、`dir_exists`、`pattern_match`、`trace_event_present`、`status_value`）不受此变更影响。

#### Scenario: Reference glob matches topic-slug-prefixed files with qualifier

- **WHEN** topic slug = `01_meal-timing-blood-glucose-insulin`
- **AND** reference 文件命名为 `01_meal-timing-blood-glucose-insulin-sutton-etrf.md`
- **THEN** gate glob `reference/*01_meal-timing-blood-glucose-insulin*.md` SHALL match 该文件
- **AND** `count_floor` rule SHALL count ≥ 1 for this topic → pass

#### Scenario: Reference glob matches bare slug file without qualifier

- **WHEN** topic slug = `01_meal-timing-blood-glucose-insulin`
- **AND** reference 文件命名为 `01_meal-timing-blood-glucose-insulin.md`（无 qualifier，无 trailing `-`）
- **THEN** gate glob `reference/*01_meal-timing-blood-glucose-insulin*.md` SHALL still match 该文件
- **AND** `count_floor` rule SHALL count ≥ 1 → pass

#### Scenario: Reference glob does not match files from a different topic

- **WHEN** topic slug = `01_meal-timing-blood-glucose-insulin`
- **AND** reference 文件命名为 `02_front-vs-back-calorie-loading-weight-jakubowicz-2013.md`（不同 topic 的 slug）
- **THEN** gate glob SHALL NOT match 该文件
- **AND** `count_floor` rule SHALL count 0 for the `01_meal-...` topic on this file

#### Scenario: Below reference count floor fails

- **WHEN** 任一 topic 的 `reference/*{topic}*.md` 匹配文件数 < 1
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 列出缺失 reference 的 topic

> req: STM-006

## ADDED Requirements

### Requirement: Topic slug SHALL include zero-padded numeric prefix

`topic_registry` 中每个 entry 的 `slug` 字段 MUST 使用 `NN_descriptive-name` 格式，其中 `NN` 为零填充的 1-based 序号（`01`、`02`、... `0N`），按该 entry 在 `topic_registry` 数组中的位置确定。`descriptive-name` SHALL 为 kebab-case 描述性短名。

本 requirement 不强制 `id` 字段的格式——`id` SHOULD 与 `NN` 一致（如 `"01"`）以保持一致性，但 gate 不校验 `id` 格式。`NN` 的 source of truth SHALL 为 `topic_registry` 数组顺序，NOT `id` 字段。

Gate 的 `per_file_slug_stem_consistency` rule（byte-for-byte `file_stem == frontmatter_slug`）和 `slug_consistency` rule（bidirectional `disk_slug_set == registry_slug_set`）均 SHALL 自然兼容此前缀约定——因为前缀是 slug 本身的一部分，不需 gate 改动。

#### Scenario: Topic registry entries have NN-prefixed slugs

- **WHEN** `topic_registry` 包含 3 个 topic
- **THEN** 第 1 个 entry 的 `slug` SHALL 以 `01_` 开头
- **AND** 第 2 个 entry 的 `slug` SHALL 以 `02_` 开头
- **AND** 第 3 个 entry 的 `slug` SHALL 以 `03_` 开头

#### Scenario: ls seed_topics shows files in numeric order

- **WHEN** `seed_topics/` 下有 5 个物化文件，slug 分别为 `01_meal-timing-...`、`02_front-vs-back-...`、`03_late-eating-...`、`04_early-vs-late-...`、`05_timing-causation-...`
- **THEN** `ls seed_topics/` SHALL 按 `01_`, `02_`, `03_`, `04_`, `05_` 字母序（即 registry 数组顺序）排列
- **AND** 用户 SHALL 无需打开 frontmatter 即可从文件名看出 topic 顺序

#### Scenario: Gate triple consistency passes with NN_ prefix slug

- **WHEN** registry slug = `"01_meal-timing-blood-glucose-insulin"`
- **AND** seed topic 文件名为 `01_meal-timing-blood-glucose-insulin.md`
- **AND** frontmatter `slug: 01_meal-timing-blood-glucose-insulin`
- **THEN** `per_file_slug_stem_consistency` rule SHALL pass（`file_stem` == `frontmatter_slug` == `"01_meal-timing-blood-glucose-insulin"`）
- **AND** `slug_consistency` rule SHALL pass（disk slug set == registry slug set）

#### Scenario: Downstream paths inherit NN_ prefix from slug

- **WHEN** topic slug = `"01_meal-timing-..."`
- **THEN** `artifacts/wave0/01_meal-timing-.../source.yaml` SHALL be the artifact path
- **AND** `artifacts/wave1/01_meal-timing-.../evidence-summary.md` SHALL be the artifact path
- **AND** `seed_topics/01_meal-timing-....md` SHALL be the seed topic file
- **AND** all paths SHALL be constructed from `{topic.slug}` without additional prefix decoration

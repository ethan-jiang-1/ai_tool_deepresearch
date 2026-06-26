## Why

`seed_topics/` 下的文件用纯 slug 命名（如 `meal-timing-blood-glucose-insulin.md`），无数字前缀。`ls` 按字母序排列，与 topic 真实顺序 (t1→t5) 完全错位——人眼看不出"第几个 topic 是谁"。根因是 `phase-seed-topics.md` §3.1（"不含编号前缀"）与 §4（"slug 已含编号前缀"）自相矛盾，且该矛盾向下游传导：Wave1 reference 命名约定 `0N-<slug>.md` 与 gate glob `reference/*{topic}-*.md` 互斥（gate 要求 slug 后紧跟 `-`，约定把 slug 放末尾），导致按文档命名会被 gate 打回。两个 bug 同源：**topic slug 缺少 `NN_` 编号前缀作为下游编号体系的锚点**。

## What Changes

- **确立 topic slug 的 `NN_` 前缀约定**：`topic_registry[].slug` 必须使用 `NN_descriptive-name` 格式（如 `01_meal-timing-blood-glucose-insulin`），`NN` 为零填充 1-based 数组序号。`id` 字段 SHOULD 与 NN 一致（如 `"01"`）但不强制。
- **消除 phase-seed-topics.md 内部矛盾**：§1、§3.1 与 §4 统一为"slug 含 `NN_` 前缀"。gate 三重一致（`file_stem == frontmatter_slug == registry_slug`）天然通过，无需改 gate 代码或定义。
- **修复 Wave1 reference 命名与 gate glob 冲突**：gate glob 从 `reference/*{topic}-*.md` 改为 `reference/*{topic}*.md`（去掉强制 `-`）；reference 命名约定从 `0N-<slug>.md` 改为 `{slug}-<qualifier>.md`（slug 已自带 `NN_`，不需额外 `0N-` 前缀）。
- **对齐实验 playbook**：case-124、case-202 的 registry slug 和硬编码文件名同步更新；case-201 的描述文本更新。

## Capabilities

### New Capabilities
<!-- 本次不引入新 capability；所有变更都在已有 spec 的 requirement 层面修改 -->
（无）

### Modified Capabilities
- `seed-topic-materialization`: slug 格式要求——slug 必须包含零填充 `NN_` 编号前缀，取自 topic_registry 数组 1-based 位置；id 字段 SHOULD 与 NN 一致
- `reference-flat-format`: Wave1 topic 专属 reference 命名——从 `0N-<slug>.md` 改为 `{slug}-<qualifier>.md`（slug 已含 NN_）；不影响 Wave0 `00-shared-` 和 Wave2 `00-cross-` 固定前缀
- `research-wave-gate-implementation`: wave1-complete gate 的 `per_topic_ref_md_count_floor` 规则——target glob 从 `reference/*{topic}-*.md` 改为 `reference/*{topic}*.md`

## Impact

- 受影响的文档：`phase-seed-topics.md` (§1, §3.1)、`phase-hitl1.md` (§3a)、`phase-wave1.md` (§4)、`shared-schemas.md` (Seed Topics + Reference Layer)、`shared-reference-template.md`、`START_FROM_HERE.md.tmpl` (line 30)、`reference/README.md.tmpl` (line 10)
- 受影响的 gate 定义：`gate-wave1-complete.definition.json` (line 3 description 字段 stale `0N-*.md` 文本, line 26 target glob, line 28 failure_message)
- 受影响的 CLI：`inspect-wave1-output.mjs`（`numericId()` → `startsWith(topic.slug)` 直接匹配，适配新命名约定）
- 受影响的 spec：`seed-topic-materialization` (STM-006)、`reference-flat-format` (REF-001, REF-005)、`research-wave-gate-implementation` (RWG-002)
- 受影响的实验 playbook：case-124、case-201、case-202
- **不改**：gate CLI（`check-gate-*.mjs`）——gate byte-for-byte 三重一致天然兼容前缀 slug；schema contracts（PlanSchema 无 slug 格式约束）；engine 代码

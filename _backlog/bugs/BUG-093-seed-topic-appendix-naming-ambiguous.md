# BUG-093 — seed topic 研究轮次追加区定义分散、section 命名不携带 wave 标识

**报告日期**: 2026-07-18
**发现环境**: `dpt_rb_ai-era-bpm-process-disruption` 全部 13 个 seed topic
**严重度**: MEDIUM（gate 不检查 appendix 格式，但 wave2 synthesis 和人类可读性严重依赖）

## 问题 1：定义分散在 8+ 个位置，没有单一权威模板

seed topic 的"研究轮次追加区"结构定义散落在以下位置，没有任何一个文件完整描述"一个 seed topic 应该长什么样"：

| 层面 | 位置 | 定义什么 |
|------|------|---------|
| **引擎代码** | `canonical-topic-state.mjs` `renderNewSeedBody()` (line 105) | 唯一真正的 byte-level 源——section 名硬编码在字符串里 |
| Phase 文档 | `phase-seed-topics.md` §3.1 (line 92-200) | 模板 prose——section 名、frontmatter 字段、回填规则注释表 |
| Phase 文档 | `phase-wave0.md` (line 179) | Wave0 回填指令——grep `__BACKFILL_WAVE0_EVIDENCE__` 并替换 |
| Phase 文档 | `phase-wave1.md` (line 216/222) | Wave1 回填指令——grep `__BACKFILL_*__` 并替换 |
| Phase 文档 | `phase-wave2.md` (line 230) | Wave2 回填指令 |
| Schema | `shared-schemas.md` (line 79-115) | `__BACKFILL_*__` token 表 + return-map entry 字段定义 |
| Schema | `return-map.mjs` (line 27-31) | `WAVE_TOKEN_MAP`——wave→token 的程序化映射 |
| Gate | `gate-seed-topics-ready.definition.json` | 4 条 gate 规则——不检查 appendix，只检查 slug/文件数/title |
| Phase 文档 | `phase-rerun.md` (line 88-100) | `## 本轮重跑方向` section 格式 |

**后果**：任何人（Agent 或人类）想知道"一个 seed topic 的研究轮次追加区到底有哪些 section、每个 section 放什么内容、用什么格式"，必须在至少 4 个文件之间跳转。没有任何一个 `seed_topic_template.md` 或 `seed_topic_schema.md` 可以作为单一参考。

## 问题 2：section 名不携带 wave 标识——注释里有，但生成的文件里没有

`phase-seed-topics.md` 的**注释表格**（line 166-171）建立了映射：

```
| Wave0 | source/reference return-map entries | ## 本轮新增证据 |
| Wave1 | mechanism/trend return-map entries   | ## 本轮新增机制理解 + ## 本轮新增趋势与难点 |
| Wave2 | W2F finding entries                   | ## 当前判断 |
```

但 section 名字本身是 `## 本轮新增证据`——"本轮"不说明是哪个 wave。在有 rerun 的场景下（一个 topic 可能有多个 round 的 wheel），"本轮"完全失去语义锚定。

`__BACKFILL_WAVE0_EVIDENCE__` token 带了 wave 标识——但 **token 在回填后被替换掉了**，最终文件里只剩 `## 本轮新增证据` 六个字。读者看不到 token，只能看到模糊的 section 名。

## 问题 3：`__BACKFILL_*__` token 机制在所有 13 个 topic 中都没被使用

框架规定（`phase-seed-topics.md` line 175）：Agent 用 grep 定位 `__BACKFILL_*__` token，然后替换为 return-map entry。但全部 13 个 seed topic 中**没有一个使用了这个 token 机制**——Agent 直接往 section 下写内容。

可能原因：
- Agent 根本没读到这个规定（定义太分散）
- 新 topic 由 `canonical-topic-state.mjs` `renderNewSeedBody()` 生成时会写入 token，但人工/Agent 创建时没人知道要写 token
- token 机制在文档中埋得太深（在 phase-seed-topics.md 的 prose 中，而不是在显眼的 template block 中）

## 问题 4：Agent 被迫自行补救——造成风格不一致

Topic 08（Maersk）和 09（BPM-improvement）的 Agent 自己加了括号注解：
- `## 本轮新增证据（wave0：source intake 已完成 ✅）`
- `## 本轮新增机制理解（wave1：deepening 已完成 ✅）`

Topics 01-07 没有加，Topics 10-13 也没有（我用的是记叙段落而非结构化 evidence entry，直到 BUG-092 修复后才对齐）。同一 bundle 内 section 命名风格不一致。

## 建议修复

1. **单一模板文件**：创建 `DPT_FRAMEWORK/schema/seed_topic_template.md`（或 `rb_templates/seed_topic.md.tmpl`），包含完整的 section 结构、每个 section 的用途说明、required fields。任何 Agent 或人类只需读这一个文件就能理解 seed topic 的完整格式。

2. **section 名显式化**：将 "本轮"改为带 wave 标识的名字。两个方案：
   - 方案 A（改名）：`## 本轮新增证据` → `## Wave0 新增证据`
   - 方案 B（加后缀）：`## 本轮新增证据` → `## 本轮新增证据（Wave0）`
   - 方案 B 兼容性更好（gate 不检查 section 名），方案 A 更干净

3. **引擎代码同步**：修改 `canonical-topic-state.mjs` `renderNewSeedBody()` 中的硬编码 section 名

4. **Gate 或者不 Gate**：当前 gate 不检查 appendix 格式。要么让 gate 检查（强制 format compliance），要么明确文档化"gate 不检查但 wave2 synthesis 质量取决于此"（保持现状但让警告更显眼）

5. **迁移已有 bundle**：对旧 seed topic 的 section 名做批量 rename（只改名，不动内容）

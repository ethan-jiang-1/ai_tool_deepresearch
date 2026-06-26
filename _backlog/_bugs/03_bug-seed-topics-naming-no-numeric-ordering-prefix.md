---
> 状态: 待修复（设计/UX + 文档自相矛盾）
> 严重度: 🟡 Medium（不阻塞 gate，但严重损害可导航性/可调试性；文档自相矛盾会让实现者猜错）
> 分类: 命名规范不一致 / 文档漂移（与 bug #1、#2 同根：doc 说一套、gate/实现做另一套）
> 发现于: 2026-06-26，同一次 research run（bundle: dpt_rb_meal-timing-chrononutrition），seed-topics 物化后用户审 `seed_topics/` 时
> 报告人: 用户发现，Claude Code 挖掘确认
> 关联: `_backlog/_bugs/bug-rb-status-next-gate-stale-after-seed-topics-insertion.md`（#1）、`bug-no-cli-to-emit-phase-trace-or-advance-status.md`（#2）—— 同一"doc 与 gate 漂移"家族
---

# Bug #3：seed_topics 文件无数字前缀，`ls` 看不出 topic 顺序；phase 文档自相矛盾

## TL;DR

`seed_topics/` 下的文件用**纯 slug** 命名（`meal-timing-...md`），**没有 `01_`/`02_`/`t1_` 这类数字前缀**；topic 顺序只藏在 frontmatter 的 `id` 字段（t1–t5）里。后果：`ls seed_topics/` 是**字母序**，和 t1→t5 的真实顺序完全对不上，人眼看不出"第几个 topic 是谁"。更要命的是 **`phase-seed-topics.md` 自己打架**：§3.1 + gate 明令"不含编号前缀、`filename_stem == slug` 逐字节一致"，§4 却写"slug **已含编号前缀**"。实现者照 §4 就会被 gate 打回。

---

## 1. 现场：实际文件 vs 真实顺序

`dpt_rb_meal-timing-chrononutrition/seed_topics/`（`ls` 字母序）：

| 文件名（字母序） | frontmatter `id`（真实顺序） |
|---|---|
| `early-vs-late-tre-window.md` | **t4** |
| `front-vs-back-calorie-loading-weight.md` | **t2** |
| `late-eating-sleep-circadian.md` | **t3** |
| `meal-timing-blood-glucose-insulin.md` | **t1** |
| `timing-causation-vs-confounders.md` | **t5** |

字母序与 t1→t5 **完全错位**（t1 排到最后但 id 最小，t4 排最前）。`id`（t1..t5）是唯一的顺序信号，但它**只在 frontmatter 里**——`ls`/文件管理器/grep 都看不到。`rb_plan.md` 的 Topic Registry 表 `#` 列虽有 t1–t5，但物化进目录后这个信息"掉了"。

## 2. 文档自相矛盾（核心）

`DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md` 内部对"slug/文件名是否带编号前缀"给出**互斥**说法：

| 出处 | line | 说法 | 立场 |
|---|---|---|---|
| §1 Stage Goal | 18 | "`id` 字段承载数字编号（如 `t1`、`01`），`slug` 为描述性短名…id 用于编号和排序，slug 用于人读和跨 wave 引用" | id 带号、slug 不带（但 id 示例 `t1`/`01` 本身就不统一） |
| §3.1 灌料注意 | 41 | "文件名直接使用 `{topic.slug}.md`（`slug` 为描述性短名，**不含编号前缀**——编号由 `id` 字段承载）。不需二次拼接 index。" | ❌ **不带前缀** |
| §3.1 文件结构 | 77 | "文件名格式：`{slug}.md`…编号由 `id` 字段承载（如 `t1`），**不编入 slug**。gate 校验 `filename_stem == registry_slug == frontmatter_slug`（三重一致）" | ❌ **不带前缀** |
| **§4 Expected Artifacts** | **247** | "存在一个 `{slug}.md` 文件（**slug 已含编号前缀**）" | ✅ **带前缀** ← 与 §3.1/gate 直接冲突 |

§4（line 247）"slug 已含编号前缀" 与 §3.1（line 41/77）"不含编号前缀/不编入 slug" **逐字冲突**。

## 3. gate 实际怎么校验（实现真相 = Design A：不带前缀）

`DPT_FRAMEWORK/schema/gate_definitions/gate-seed-topics-ready.definition.json`：

- line 13 `slug_consistency`（mode `slug_consistency`）：`seed_topics/*.md` 的 slug 集合必须与 `rb_plan.md` topic_registry slug 集合**逐元素相等**（line 21 failure："no missing, no extra"）。
- line 30 `per_file_slug_stem_consistency`：`file_stem`（line 35）与 `frontmatter_slug`（line 36）必须 **byte-for-byte equal**（line 39）。

→ 若按 §4 给文件加 `01_`/`t1_` 前缀：`file_stem`（`01_meal-timing-...`）≠ `frontmatter_slug`（`meal-timing-...`）→ **gate 必 fail**。所以 gate 强制 Design A（无前缀）。本次 run 我的 5 个文件走 Design A，gate 已 pass——**实现是对的，§4 是错的/陈旧的**。

## 4. 影响范围

- **可导航性/可调试性差**：`ls seed_topics/`、文件管理器、`grep -r` 都看不出 topic 顺序；调试/审阅时要挨个打开 frontmatter 看 `id`。用户本次正是在这里被绊住。
- **`id` 字段"半残"**：它是唯一顺序载体，却几乎不暴露——registry 表 `#` 列有，物化目录后没有。等于设计了一个排序字段却不让它在最常被浏览的地方可见。
- **文档误导实现者**：照 §4（"slug 已含编号前缀"）命名会被 gate 打回；照 §3.1 命名则目录无序。两边都对不上"既有顺序又能过 gate"。
- **跨 wave 路径一致性**：`seed_topics/{slug}.md`、`artifacts/wave0/{slug}/source.yaml` 等都用 slug 作 key——若改 Design B（带前缀），这些路径全部带前缀；这是 Design B 的代价，但当前无人权衡过，因为 §4 的"已含前缀"从没被真正实现。

## 5. 根因（同 bug #1/#2 家族）

又是一处"设计意图（§4 设想了带前缀的 slug）"与"实现（gate + §3.1 禁止前缀）"的漂移。`id` 字段（t1/01）的示例本身就不统一（§1 给 `t1` 又给 `01`），暗示这部分规范从未定稿。与 #1（next_gate 旧链）、#2（无 status/trace 写入 CLI）同属"lifecycle 规范在不同工件间未对齐"。

## 6. 建议修复（供 fixer；需做一个设计决定）

先二选一定调，再统一所有工件：

### 方案 A（推荐，低风险）：保留 Design A（纯 slug），但补上"看得见的顺序"
- **修文档**：把 §4 line 247 "（slug 已含编号前缀）" 改成 "（slug 不含编号前缀，顺序由 frontmatter `id` 承载）"，与 §3.1/§1 对齐。同时把 §1 的 id 示例统一（要么都 `t1` 要么都 `01`，别混）。
- **补顺序可见性**（解用户真痛点）：二选一——
  - (a) gate 输出 / inspect 把 topic 按 `id` 排序展示；或
  - (b) 在 `seed_topics/` 维护一个 `00-INDEX.md`（或复用 `reference/_INDEX.md` 模式）按 id 列出 `id | slug | title`，作为目录的"有序目录页"；或
  - (c) 约定 `id` 用零填充数字（`01`..`05`）而非 `t1`，并在 START_FROM_HERE / 投影里展示。
- **不改文件名**，跨 wave 路径不变，零迁移成本。

### 方案 B（用户直觉：带 `01_` 前缀）：改 Design B，动 gate + 全链路径
- 文件名 = `{NN}_{slug}.md`（如 `01_meal-timing-blood-glucose-insulin.md`），`ls` 自带顺序。
- **改 gate**：`per_file_slug_stem_consistency` 不能再 byte-for-byte 比 `file_stem`==`slug`；需 normalize（去前缀后比）或改成比 `id`。`slug_consistency` 也要适配。
- **全链路径带前缀**：`seed_topics/{NN_slug}.md`、`artifacts/wave0/{NN_slug}/source.yaml`、wave0 task card 模板、rerun 回填逻辑…全部跟着改。
- **迁移**：现有 bundle（含本 run 的 5 文件 + registry slug）需重命名。成本高、易再漂移。
- 仅当项目认定"目录视觉顺序" > "稳定 slug 引用" 时才值得。

### 推荐：方案 A + 顺序可见性 (b) `00-INDEX.md`
最小改动消解文档矛盾，且用一个小 index 文件解决"ls 看不出顺序"的真实痛点，不触碰 gate 与跨 wave 路径。

## 7. 待 fixer 决策的开放问题

1. `id` 字段规范到底是 `t1` 还是 `01`？§1 两个示例并存，需统一。
2. 选 Design A 还是 B？（影响是否动 gate 与全链路径）
3. 若选 A，顺序可见性用哪种（gate 排序展示 / `00-INDEX.md` / id 零填充）？
4. 与 bug #1/#2 是否合并为一个"lifecycle 规范对齐"OpenSpec change？

## 附录：本次 run 的现场上下文

- bundle: `dpt_rb_meal-timing-chrononutrition`；5 个 seed topic 已按 **Design A**（纯 slug，frontmatter `id: t1..t5`）物化并通过 `seed-topics-ready` gate。
- 用户审 `seed_topics/` 时发现文件无 `01_`/`02_` 前缀、字母序与 t1–t5 错位，判定为 bug，要求就地挖掘并上报。
- 挖掘结论：实现（Design A）与 gate 一致且正确；§4 文档错误描述了"slug 已含编号前缀"（应为 Design B），是文档漂移；真实 UX 痛点是顺序不可见。详见 §1–§3。
- 若项目最终采纳 Design B，本 bundle 的 5 文件 + `rb_plan.md` registry 的 slug 需重命名迁移；若采纳 Design A，仅需修 §4 + 补顺序可见性，本 bundle 无需改动。

## Context

当前 `seed_topics/` 文件用纯 slug 命名（如 `meal-timing-blood-glucose-insulin.md`），无数字前缀。`ls` 按字母序排列，与 topic 真实顺序完全错位。根因是 `phase-seed-topics.md` §3.1（"不含编号前缀"）与 §4（"slug 已含编号前缀"）自相矛盾。下游连锁反应：Wave1 reference 命名约定 `0N-<slug>.md` 与 gate glob `reference/*{topic}-*.md` 互斥——gate 要求 slug 后紧跟 `-`，约定把 slug 放在末尾。

两个 bug 同源：topic slug 缺少 `NN_` 编号前缀作为下游编号体系的锚点。从 seed_topics → wave0 artifacts → wave1 references → wave2 synthesis，所有路径都靠 topic.slug 做 key——slug 带不带编号直接决定整个管道的可导航性。

## Goals / Non-Goals

**Goals:**
- 确立 `NN_` 前缀进 topic slug 的约定，使 `ls seed_topics/` 自然按数字序排列
- 消除 `phase-seed-topics.md` §3.1 与 §4 的矛盾
- 修复 Wave1 reference gate glob（`*{topic}-*` → `*{topic}*`），使 gate 接受 `{slug}-<qualifier>.md` 命名
- 统一 reference 命名约定（`0N-<slug>.md` → `{slug}-<qualifier>.md`，slug 已自带 NN_）
- 同步实验 playbook 中的 slug 示例

**Non-Goals:**
- 不改 gate 代码（byte-for-byte 三重一致天然兼容）
- 不改 schema contracts（PlanSchema 对 slug 格式无约束）
- 不改 `INDEX.md` 命名（维持 `_INDEX.md`，不加 `00-` 前缀）
- 不迁移已有 run bundle（已完成 run 不受影响；新 bundle 自动按新约定创建）

## Decisions

### Decision 1: `NN_` 前缀进 slug，而非作为独立的文件名装饰层

**选择**: `slug = "01_meal-timing-blood-glucose-insulin"`（前缀是 slug 的一部分）

**替代方案**: slug 纯描述性（`meal-timing-...`），文件名单独拼接 `01_` 前缀。gate 需去前缀后再比较。

**理由**: 前缀进 slug 后，`file_stem == frontmatter_slug == registry_slug` 全部 byte-for-byte 一致，gate 零改动。下游所有路径（`artifacts/wave0/{slug}/`、`seed_topics/{slug}.md`、`reference/*{slug}*`）自动继承编号。`inspect-wave1-output.mjs` 已支持从 slug 提取前缀（`/^(\d+)_/`）。case-201 实验已验证此模式可行。

**代价**: slug 不再是纯"人读短名"，而是 "编号+短名"。跨 wave 路径含前缀（如 `artifacts/wave0/01_meal-timing-.../`），但这反而是优点——路径自带排序。如果 topic 增删导致重排，slug 会变——但这是任何编号方案都有的固有代价。

**防漂移**: bug #3 报告警告 Design B "成本高、易再漂移"。本设计通过将编号直接编码进 slug 本身（而非作为独立的文件名装饰层）来消除漂移风险——gate byte-for-byte 三重一致是唯一 enforcement point，没有额外的"去前缀后再比较"逻辑层可以不同步。只要 gate 不松，约定就不会漂移。

### Decision 2: `NN` 取自 topic_registry 数组 1-based 位置

**选择**: 第一个 topic 得 `01`，第二个得 `02`，以此类推。零填充保证 `ls` 排序正确（`01`, `02`, ... `10`, `11`）。

**替代方案**: 从 `id` 字段提取数字。但 `id` 格式不统一（`t1` vs `01` vs `t-claude-code`），且 gate 不校验 `id`。

**理由**: 数组位置是唯一确定、无需额外解析的来源。HITL1 在写入 topic_registry 时就知道位置。

### Decision 3: Wave1 gate glob `*{topic}-*` → `*{topic}*`（去掉强制 `-`）

**选择**: `per_topic_ref_md_count_floor` 的 target 从 `reference/*{topic}-*.md` 改为 `reference/*{topic}*.md`

**替代方案**: 改文档约定为 `{slug}-<qualifier>.md` 且要求 qualifier 非空（保证 slug 后总有 `-`）。但这样 gate 仍然脆弱——Agent 可能创建不带 qualifier 的文件。

**理由**: 去掉强制 `-` 更健壮——接受 `{slug}.md`、`{slug}-qualifier.md`、`{slug}_qualifier.md` 等各种形态。`*` 已足够防止误匹配（其他 topic 的 slug 不会恰好是当前 slug 的子串，因为有 `NN_` 前缀区分）。

### Decision 4: Reference 命名从 `0N-<slug>.md` 变为 `{slug}-<qualifier>.md`

**选择**: Wave1 topic 专属 reference 命名为 `{slug}-<qualifier>.md`，其中 slug 已含 `NN_` 前缀，qualifier 为 source 短标识。

**理由**: slug 自带 `NN_` 后，额外 `0N-` 前缀是冗余的（`01-01_meal-timing-...` 显然多余）。`{slug}-<qualifier>.md` 简洁且自然按 topic 聚拢（`ls reference/` 下 `01_*` 全在一起）。

**不影响**: Wave0 `00-shared-<slug>.md`（共享标记，非 topic 编号）和 Wave2 `00-cross-<slug>.md`（同上）保持不变。

**分隔符有意区分**: seed topic 文件用 `_`（underscore，如 `01_meal-timing-....md`），reference 文件用 `-`（hyphen，如 `00-shared-...`、`01_meal-timing-...-author.md`）。这不是疏忽——两者是不同的命名空间：seed topic slug 把 `NN_` 作为 slug 本身的一部分编入，reference 前缀是文件命名约定而非 slug 的一部分。`START_FROM_HERE.md.tmpl` 是唯一同时展示两种分隔符的文档，应在 `shared-schemas.md` 里也明确标注这个区别。

**下游适配**: `inspect-wave1-output.mjs` 当前使用 `numericId()` 提取数字前缀后用 `startsWith(numId+'-')` 匹配 reference 文件。新命名 `{slug}-<qualifier>.md`（slug 以 `NN_` 开头）下该逻辑失效——`startsWith("01-")` 不匹配 `01_meal-timing-...`。修复：删掉 `numericId()`，直接用 `startsWith(topic.slug)` 匹配——slug 本身就是文件名的前缀。

## Risks / Trade-offs

- **[slug 含前缀后跨 wave 路径变化]**：`artifacts/wave0/01_meal-timing-.../` 取代 `artifacts/wave0/meal-timing-.../`。→ 所有已存在的 `{topic.slug}` 路径自动适配（Agent 和 gate 都用 slug 做变量），无破坏性。
- **[topic 重排导致 slug 变化]**：如果在 rerun 中增删 topic，slug 序号可能改变，已有 reference/artifact 路径断裂。→ 这是已有设计约束（rerun 本身就有 topic 变更处理逻辑），不是本 change 引入的新问题。
- **[gate glob `*{topic}*` 比 `*{topic}-*` 更宽松]**：理论上 `*01_meal*` 可能匹配到 `01_meal-fake.md`。→ 实际上 `NN_` 前缀提供足够的特异性，`01_meal-timing-blood-glucose-insulin` 不可能误匹配到其他 topic 的文件。
- **[子串碰撞风险 — 理论存在，实际极低]**：若两个 topic slug 中一个恰好是另一个的字面前缀（如 `01_meal` vs `01_meal-timing`），gate glob `[^/]*` 贪婪匹配会使短 slug 的 `count_floor` 将长 slug 的文件也计入。→ 不做代码防护（不值得为理论场景加复杂度），但在 convention 层面要求 topic slug 的描述部分足够长且互不为前缀。`inspect-wave1-output.mjs` 改用 `startsWith(topic.slug)` 后已消除此类碰撞——完整 slug 匹配天然区分 `01_meal` 和 `01_meal-timing`。

## Migration Plan

1. 更新所有 phase 文档中的约定描述（Phase 1 & 2）。**注意：`phase-seed-topics.md` L41/L77 不是单词替换——旧文本结构"编号由 id 字段承载…不编入 slug"改成"编入 slug"后会产生自相矛盾的句子，必须重写整个从句。**
2. 更新 gate 定义 JSON 的 glob（1 行改）
3. 更新实验 playbook 的硬编码 slug 示例（Phase 3）
4. 跑 case-124 + case-201 实验验证 gate pass
5. 更新 bug 文件状态（Phase 4）

**回滚**: 所有改动是文档 + 1 行 gate glob。回滚即 revert commit，无数据迁移。

## Open Questions

- `id` 字段格式：本 change 统一 id 示例为 `"01"`/`"02"`（零填充数字字符串），与 slug 的 `NN_` 前缀一致。gate 不校验 id 格式——这是 convention 层面的统一，靠 phase 文档中的示例和说明来引导，不给 gate 增加新 rule。若未来需要强制校验 id 格式，可在后续 change 中单独处理。

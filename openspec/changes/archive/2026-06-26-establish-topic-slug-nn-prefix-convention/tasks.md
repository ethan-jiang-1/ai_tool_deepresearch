## 1. Bug #3 核心 — seed topic slug 加 `NN_` 前缀（文档修复）

- [x] 1.1 `phase-seed-topics.md` §1 (line 18): **重写 slug 定性**——"`slug` 为描述性短名"→"`slug` 为 `NN_` 编号前缀 + 描述性短名的结构化标识符"；改述"两者分工"句（id 排序 + slug 人读/文件系统排序/跨 wave 引用）；id 示例统一为 `"01"`（删 `t1`）；slug 示例 `official-stance`/`ai-safety` → `01_official-stance`/`02_ai-safety` @impl STM-006
- [x] 1.2 `phase-seed-topics.md` §3.1 注意 (line 41): **重写括号从句**——当前"（`slug` 为描述性短名，不含编号前缀——编号由 `id` 字段承载）"中，"不含前缀"与"编号由 id 承载"形成因果关系，改为"含 `NN_` 前缀"后破折号变成冗余并列。重写为："（`slug` 含 `NN_` 编号前缀，如 `01_meal-timing-...`——`NN` 取自 topic_registry 数组 1-based 位置）。不需二次拼接 index。" @impl STM-006
- [x] 1.3 `phase-seed-topics.md` §3.1 文件结构 (line 77): **重写编号承载句**——当前"编号由 `id` 字段承载（如 `t1`），不编入 slug"改一个词后变成"编号由 `id` 字段承载…编入 slug"自相矛盾。重写为："`NN` 取自该 topic 在 `topic_registry` 数组中的 1-based 位置（两位零填充）。`id` 字段 SHOULD 与 `NN` 一致（如 `"01"`）。gate 校验 `filename_stem == registry_slug == frontmatter_slug`（三重一致）。"slug 示例 `official-stance` → `01_official-stance` @impl STM-006
- [x] 1.4 `phase-hitl1.md` §3a (line 37 之后): 加 slug 命名约定 + **YAML 示例**——"每个 topic 的 `slug` 格式为 `NN_<descriptive-name>`，`NN` 为该 topic 在 `topic_registry` 数组中的 1-based 位置（两位零填充），**不是** `id` 字段的值。`id` SHOULD 与 NN 一致（如 `"01"`），gate 不校验 id 格式——这是 convention 层面的统一。" 附带一个 YAML 片段示例（3 个 topic，展示 `01_`/`02_`/`03_` 前缀与数组位置的对应关系） @impl STM-006
- [x] 1.5 `shared-schemas.md` Seed Topics 节 (line 75): 文件名 = `{slug}.md`，明确 slug 含 `NN_` 前缀（该文档目前对 seed topic 命名完全沉默）。同时在该文档中标注 `_`（seed topic）vs `-`（reference）的分隔符区别是有意设计 @impl STM-006

## 2. Bug #4 核心 — Wave1 ref 命名 vs gate glob 冲突 + inspect 适配

- [x] 2.1 `gate-wave1-complete.definition.json` (line 26): `per_topic_ref_md_count_floor` target glob `reference/*{topic}-*.md` → `reference/*{topic}*.md`（去掉强制 `-`，新 regex 是旧 regex 的严格超集——不会产生 false negative；裸 slug 文件也能通过 count_floor，不再强制 qualifier）；同步更新 failure_message；顺手更新 description 字段 (line 3) 的 stale `0N-*.md` 文本 @impl REF-001, RWG-002
- [x] 2.2 `shared-schemas.md` Reference Layer 节 (line 66): Wave1 命名 `0N-<slug>.md` → `{topic_slug}-<qualifier>.md`，说明 slug 已自带 `NN_` 不需额外前缀；Wave0 `00-shared-` 和 Wave2 `00-cross-` 是固定标记不动 @impl REF-001, REF-005
- [x] 2.3 `START_FROM_HERE.md.tmpl` line 30: `0N-<slug>.md` → `{slug}-<qualifier>.md`。line 28 已正确（`01_<slug>.md`）不动——注意该文件用 `_` 分隔 seed topic NN、用 `-` 分隔 reference 0N，这是有意设计 @impl REF-005
- [x] 2.4 `reference/README.md.tmpl` line 10: `0N-<slug>.md` → `{slug}-<qualifier>.md`，说明 `N` 已含在 topic slug 的 `NN_` 中 @impl REF-005
- [x] 2.5 `shared-reference-template.md`: 全文搜索 `0N-`，显式确认无残留引用。该文件的 `0N-<slug>.md` 中 N=序号、`<slug>`=内容描述符（非 topic slug），是独立命名空间，预期不需改 @impl REF-005
- [x] 2.6 `inspect-wave1-output.mjs`（**唯一代码改动，18 行删 + 5 行改**）: 删 `numericId()` 函数（L45-56，12 行）；删 `numId = numericId(topic)` + null-check + continue（L73-77，5 行）；L80 注释 `0N-*` → `{topic.slug}*`；L83 `startsWith(\`${numId}-\`)` → `startsWith(topic.slug)`；L85-86 error message 示例从 `${numId}-<slug>` → `${topic.slug}-<qualifier>`；L3 `// @impl IOC-002` 加注记 @impl REF-001
- [x] 2.7 `phase-wave1.md`: 全文搜索 `0N-` 和 reference 命名引用，确认 §4 Expected Artifacts 是否需要更新 @impl REF-005
- [x] 2.8 `gate-wave2-complete.definition.json`: 显式验证无 `reference/*{topic}*` 同形 glob、无 `count_floor` rule（确认 wave2 gate 不受影响），记录结论

## 3. 实验 playbook 对齐

- [x] 3.1 `case-201`（**数据已正确，4 处文本需要追上数据**）: L6 case_goal "slug 描述性，id 承载编号" → "slug 含 NN_ 前缀"；L22 描述同上；L40 "gate 不强制前缀" → 改述（三重一致传递性强制前缀，因为 registry slug 含 NN_）；L51 N1 "不含编号前缀——编号由 id 承载" + 示例 `claude-code` → "slug 含 NN_ 前缀" + 示例 `01_claude-code-cli-tool`。registry slug `01_`/`02_`/`03_` 已含前缀，不动 @impl STM-006
- [x] 3.2 `case-124`（**~15-20 行，全部 slug/filename/id 值**）: registry slug `topic-a/b/c` → `01_topic-a`/`02_topic-b`/`03_topic-c`；id `t1/t2/t3` → `01/02/03`；所有 `seed_topics/topic-*.md` → `seed_topics/0N_topic-*.md`；所有 frontmatter `slug: topic-*` → `slug: 0N_topic-*`。注意 L233 `extra-topic.md` 是故意不合规的测试文件，**不动** @impl STM-006
- [x] 3.3 `case-202`（**4 行，其中 L39 最关键**）: **L39 注释 "slug 描述性（无 0N_ 前缀），id 承载编号" → "slug 含 NN_ 前缀（如 01_topic-a），id 承载编号"**（这是整个 playbook 里唯一显式声明旧约定的地方）；L46 `slug: topic-a` → `slug: 01_topic-a`；L103 `seed_topics/topic-a.md` → `seed_topics/01_topic-a.md`；L106 frontmatter slug 同步 @impl STM-006

## 4. Bug 文件与 registry 收尾

- [x] 4.1 bug #3: 状态 `待修复` → `已修复`，加 Resolution 块记录设计决策（Design B, Option A：前缀进 slug；gate byte-for-byte 三重一致天然兼容）
- [x] 4.2 bug #4: 状态 `待修复` → `已修复`，加 Resolution 块，标注与 bug #3 合并修复（gate glob `*{topic}*` + inspect `startsWith(topic.slug)`）
- [x] 4.3 `req-registry.yaml`: 确认 STM-006 已登记；更新 stale 描述——RWP-010 (`reference/0N-*.md`)、RWG-012 (`reference/0N-*.md`)、IOC-002 (`0N-*.md per topic`) 仍引用旧命名，改为新约定

## 5. 治理检查

- [x] 5.1 运行 `node openspec/governance/check-project-reqs.mjs`，确认 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired） — 变更相关 req ID 无问题；PHS 系列 orphan/duplicate 为既有问题，不在本变更范围内
- [x] 5.2 运行 `node openspec/governance/check-project-specs.mjs`，确认 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader） — 1 个既有 violation（plan-hostfile-sections 缺 > req: header），不在本变更范围内

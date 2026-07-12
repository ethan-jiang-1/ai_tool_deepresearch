# Seed Topic Materialization

> req: STM-001, STM-002, STM-003, STM-004, STM-005, STM-006, STM-007, STM-008

## Purpose

定义在 setup 与 wave0 之间插入的 **seed topic 物化阶段**（`phase-seed-topics.md` + `seed-topics-ready` gate）。此阶段强制 Phase Agent 把 `rb_plan.md` frontmatter 中的 `topic_registry` 物化为 `seed_topics/` 目录下的独立文件，并用 deterministic 规则检查结构合法性与数量 floor。

**存在的理由**：`wff-pre-research` 的 HITL1 只把 seed topics 写进 `rb_plan.md` 的 `topic_registry` frontmatter，从不物化到 `seed_topics/` 目录。`setup-ready` gate 只检查 `seed_topics/` 目录存在（空目录也 pass），导致 Phase Agent 可带着空 `seed_topics/` 进入 Wave0 研究。虽然 `wff-research-waves` 的 `wave0-complete` gate 已设计"topic_registry 为空时 fail"的防线，但该防线位置过晚（在 Wave0），且只检查 registry 非空，不检查物化一致性或数量 floor。本阶段把这道防线前移并加固为独立确定性 gate。

Gate 只做 deterministic 结构/数量/一致性检查；seed topic 的语义质量（topic 是否"好"、是否与研究问题对齐）由人类在 HITL1（`stop: yes`）审查，本阶段不新增 stop 点。
## Requirements
### Requirement: Seed topic materialization phase node

`phase-seed-topics.md` SHALL 提供完整的 9-section body，位于 setup 与 wave0 之间。§3 Allowed Actions SHALL 采用 queue-driven 三阶段模式（灌料 → 执行循环 → 收尾+gate）。

Phase SHALL 声明 `phase: seed-topics`、`gate: seed-topics-ready`、`stop: "no"`。

Allowed Actions SHALL 覆盖三阶段：

**§3.1 灌料 (Filling)** — 首次进入，如果 queue 为空：
- 读取 `rb_plan.md` frontmatter 的 `topic_registry`
- 为每个 topic 创建 task card JSON（含 work_id, title, `targets: { controller: "main-agent" }`, producer_rule: seed_topic_materialize, priority_class: P3_current_gate_gap, required_receipts, done_condition 等完整 QueueItemSchema 字段；`main-agent` 是当前 queue schema wire value）
- 使用 `operate-queue enqueue <bundle> --task <task.json>` 逐个灌入
- 灌料完毕后跑 `operate-queue check <bundle>` 确认 active_window 已填充

**§3.2 Queue-driven 执行循环**：
- `operate-queue claim <bundle> --actor main-agent` → 获取 task card → item 为 null 则跳到 §3.3（`main-agent` 是当前 CLI actor wire value）
- 执行：Phase Agent 从 task.payload.topic_slug 定位 topic_registry 条目 + rb_profile.yaml → 按 Seed Topic 文件结构创建 `seed_topics/<slug>.md`
- `operate-queue complete <bundle> --result <result.json>` → receipt check → promote/repair
- 读投影 → 回到 claim

**§3.3 收尾与 gate**：
- 跑 `check-gate-seed-topics-ready.mjs` → pass/fail 按 §6/§7 处理

**Seed Topic 文件内容：**

每个 `seed_topics/<slug>.md` SHALL 分两段结构：

**初始化区（seed-topics phase 写入）：**
- **YAML frontmatter**（YAML 1.2 格式，gate 使用 `parseYaml()` 解析。JSON 是 YAML 1.2 的子集，JSON 格式的 frontmatter 亦可接受，但推荐使用多行 YAML 以提高可读性）：`id`, `slug`, `title`（三个均非空，slug 与文件名 stem 一致）+ `must_answer`（该 topic 需要回答的具体问题列表）、`hypothesis`（初始假设或 known gap）、`in_scope`、`out_of_scope`、`search_guardrails`（required_terms + forbidden_broadening）、`evidence_route`（preferred_sources + noise_to_avoid）
- 正文 sections：主题定位（一段叙述该 topic 的研究价值）、must_answer（编号的 investigatable 问题列表）、初始假设缺口或张力（已知/缺口/张力三段）、why now（时间窗口和触发事件）、研究边界与不深挖范围（在范围内/不深挖两条列表）、证据锚点与优先来源（具体来源名 + 可信度标注）、为什么对最终交付物重要、下游位置（可选）

**轮次追加区（预埋占位，seed-topics 不填充）：**
- 用显式 `═══ 研究轮次追加区 ═══` 标题分隔
- 含回填责任表（wave0→新增证据 / wave1→机制理解+趋势难点 / wave2→当前判断 / 每轮→更新待验证问题状态）
- 以下 sections 预埋为空占位：历史摘要、本轮新增证据、本轮新增机制理解、本轮新增趋势与难点、当前判断、待验证问题
- seed-topics-ready gate SHALL NOT 检查轮次追加区内容（留空是合法状态）

若上游（topic_registry / rb_profile.yaml）未提供足够信息填充初始化区字段，SHALL 标注为显式 gap（如 `hypothesis: "pending — HITL1 未提供足够约束"`），不得编造。

**Enforcement boundary（强制执行边界）：** 当前 `seed-topics-ready` gate（STM-002）只检查文件存在、title 非空、slug 一致性、trace event、status——不校验 must_answer/hypothesis/search_guardrails/evidence_route 字段的存在性或内容。原因是 gap annotation 机制允许这些字段标为 "pending"（合法），gate 无法区分"未填"和"标 gap"。因此这些字段的验证分层如下：

| 字段组 | 验证者 | 方式 |
|--------|--------|------|
| id, slug, title, 文件名一致性 | gate（STM-002） | deterministic: dir_non_empty, field_non_empty, cross_field(slug_consistency) |
| must_answer, hypothesis, search_guardrails, evidence_route | experiment playbook（seed-topics queue-loop playbook §5a.4） | Agent actor 执行 playbook step 时检查文件内容 |
| 字段语义质量（是否足够驱动定向搜索） | HITL1（stop: yes） | 人类审查 topic_registry 和 seed topic 产出 |

这不是 gate 的缺陷——gap annotation 是 seed-topics 的核心机制（缺失信息标注比编造更有价值），而 gate 的定位是结构+数量+一致性检查。此不对称是**有意设计**，但必须在 spec 中显式声明。

#### Scenario: Phase Agent executes seed-topics via queue-driven loop

- **WHEN** Phase Agent 加载 `phase-seed-topics.md`
- **THEN** §3 body SHALL 引导 Phase Agent 进入 queue-driven 三阶段：灌料 → 执行循环 → 收尾+gate
- **AND** body SHALL NOT 使用自由文本 "Allowed Actions" 模式

#### Scenario: Seed topic file is a search-relevant decision document

- **WHEN** Phase Agent 物化一个 seed topic
- **THEN** 产出文件 SHALL 包含 frontmatter 的 must_answer, hypothesis, search_guardrails, evidence_route 字段
- **AND** 正文 SHALL 包含原始语境约束 block
- **AND** 文件 SHALL NOT 是仅有 id/slug/title + 笼统三段式正文的"chapter label"

#### Scenario: Seed topic 含轮次追加区预埋

- **WHEN** seed-topics phase 完成
- **THEN** 每个 seed_topics/{slug}.md SHALL 含 `═══ 研究轮次追加区 ═══` 分隔块
- **AND** 分隔块 SHALL 含回填责任表（wave0→新增证据 / wave1→机制理解+趋势难点 / wave2→当前判断 / 每轮→更新待验证问题）
- **AND** 各 section SHALL 有占位注释标注 `*(waveN 回填)*` 或等效指示
- **AND** seed-topics-ready gate SHALL NOT 因轮次追加区为空而 fail

#### Scenario: Missing upstream info recorded as gap

- **WHEN** topic_registry 或 rb_profile.yaml 未提供足够的 hypothesis 或 search_guardrails 信息
- **THEN** Phase Agent SHALL 标注为显式 gap（如 `hypothesis: "pending — ..."`）
- **AND** Phase Agent SHALL NOT 编造信息以通过 gate
- **AND** gate SHALL still pass（gap 本身是有效信息——告诉 wave0 该 topic 搜索范围较宽）

### Requirement: Seed topics ready gate rule set

`DPT_FRAMEWORK/schema/gate_definitions/gate-seed-topics-ready.definition.json` SHALL 定义当前 contract 下的 deterministic rules。

规则 SHALL 覆盖（全部 deterministic，无语义判断）：
- `seed_topics/` 目录非空（至少 1 个 `.md` 文件）
- 每个 `seed_topics/<slug>.md` 的 frontmatter `title` 非空（`field_non_empty` check type）；frontmatter `slug` 与文件名 stem 一致由 `cross_field(slug_consistency)` 的 per-file 校验覆盖
- `seed_topics/` 下文件 slug 集合 = `rb_plan.md#/topic_registry` 的 slug 集合（双向一致，无多余、无缺失）
- trace 中有 `seed_topics_completion` event（`trace_event_present` check type）
- `rb_status.json#/current_gate == seed_topics_ready`
- `rb_status.json#/next_gate == wave0_complete`

Topic 集合的 source of truth SHALL 为 `rb_plan.md` frontmatter 的 `topic_registry`（与 `wave0-complete` gate D5 一致）。Gate SHALL 枚举 registry 的 slug，SHALL NOT 扫描磁盘推断 topic 集合。`topic_registry` 为空时 gate SHALL return `passed: false`。

#### Scenario: All seed topics rules pass

- **WHEN** registry 含 3 个 topic，`seed_topics/` 下有 3 个对应 `.md` 文件，slug 双向一致，frontmatter 合法，trace 有 `seed_topics_completion`
- **THEN** gate SHALL return `passed: true`，`check.next` 指向 `phases/phase-wave0.md`

#### Scenario: Slug mismatch fails

- **WHEN** `seed_topics/` 下文件 slug 集合与 registry slug 集合不一致（多余、缺失或拼写不同）
- **THEN** gate SHALL return `passed: false`，`inspect` SHALL 列出不一致的 slug

#### Scenario: Count below registry fails

- **WHEN** `seed_topics/*.md` 文件数 < registry topic 数
- **THEN** gate SHALL return `passed: false`，`inspect` 指向缺失的 topic 物化文件

#### Scenario: Malformed frontmatter fails

- **WHEN** 某 `seed_topics/<slug>.md` 缺少 `slug` 或 `title`，或 slug 与文件名不一致
- **THEN** gate SHALL return `passed: false`

### Requirement: Seed topics gate CLI implementation

`DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs` SHALL 使用 `gate-helpers.mjs` standard pipeline（`parseGateCliArgs` → `loadGateDefinition` → `validateNodeGateBinding` → iterate rules → `resolveRouting` → `buildGateResult` → `emitGateResult`），延续 `wff-pre-research` / `wff-research-waves` 的 gate CLI 模式。

CLI SHALL 支持 `trace_event_present`（由 `wff-research-waves` 引入的 `readTraceEvents` helper）。

CLI SHALL 实现 slug 一致性检查（`cross_field` 新增 `mode: "slug_consistency"`）：读取 `seed_topics/` 下所有 `.md` 的 frontmatter slug + 文件名 stem 组成磁盘 slug 集合，与 `rb_plan.md#/topic_registry` 的 slug 集合比较，双向一致才 pass。此 mode 与 `basename_consistency` 和 `markdown_link_resolution` 并列，由 gate definition JSON 的 `mode` 字段区分。

CLI SHALL 延续 double trace 约定：gate attempt 写入 `rb_trace.jsonl`。

#### Scenario: Empty seed_topics directory detected

- **WHEN** `seed_topics/` 存在但为空目录
- **THEN** `dir_non_empty` rule SHALL fail，gate SHALL return `passed: false`，`inspect` 指向空目录

#### Scenario: Slug consistency bi-directional

- **WHEN** registry 有 slug A/B/C 但磁盘只有 A/B
- **THEN** cross_field(slug_consistency) SHALL fail，inspect 报告缺失 C
- **WHEN** 磁盘有 A/B/C/D 但 registry 只有 A/B/C
- **THEN** cross_field(slug_consistency) SHALL fail，inspect 报告多余 D

### Requirement: Workflow registration of seed-topics phase

Workflow registration surface SHALL 同步插入 seed-topics 阶段，保持 transition 一致性：
- `DPT_FRAMEWORK/workflows/manifest.json`：phases 数组在 setup 与 wave0 之间插入 `{ "key": "seed-topics", "node": "phases/phase-seed-topics.md", "gate": "seed-topics-ready" }`
- `DPT_FRAMEWORK/workflows/transitions.chain.json`：`phase-setup.md` 的 `passed` 改指向 `phase-seed-topics.md`；新增 `phase-seed-topics.md` → `passed` → `phase-wave0.md`
- `DPT_FRAMEWORK/schema/enums.mjs` 的 `CurrentGate`：新增 `seed_topics_ready`（位于 `setup_ready` 与 `wave0_complete` 之间）

`rb_status.json` 模板（`rb_templates/`）的 `current_gate`/`next_gate` 初始值 SHALL 直接反映新阶段：`current_gate` SHALL 为 `setup_ready`，`next_gate` SHALL 为 `seed_topics_ready`。

#### Scenario: Transition chain routes through seed-topics

- **WHEN** setup gate pass 后查询 next node
- **THEN** routing SHALL 返回 `phases/phase-seed-topics.md`，而非直接 `phases/phase-wave0.md`
- **AND** seed-topics gate pass 后 routing SHALL 返回 `phases/phase-wave0.md`

### Requirement: Seed topics boundary enforcement playbook

`experiments_playbook/exp_workflow-foundation/test-simple-seed-topics-boundary.md` SHALL 提供 light playbook，验证 seed-topics gate 的物化路径和 boundary enforcement。

该 playbook SHALL：
- Pre-seed post-setup bundle（含 topic_registry）
- 物化全部 seed_topics → 验证 gate pass
- 清空 seed_topics → 验证 gate fail（`dir_non_empty` rule，inspect 指向空目录）
- 物化部分 topic（slug 缺失）→ 验证 gate fail（`cross_field(slug_consistency)` 报缺失）
- 多余文件 → 验证 gate fail（`cross_field(slug_consistency)` 报多余）
- Body 显式列出 slug 一致性 DO/DON'T

#### Scenario: Seed topics pass and fail both trace-backed

- **WHEN** registry 含 N 个 topic，`seed_topics/` 下有 N 个对应 `.md` 文件，slug 双向一致
- **THEN** seed-topics gate SHALL pass
- **AND WHEN** `seed_topics/` 为空时 gate SHALL fail with inspect
- **AND WHEN** slug 不一致时 gate SHALL fail with inspect
- **AND** verdict SHALL 基于 trace 中 4 条 `check` event（1 pass + 3 fail）

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

### Requirement: Seed topics SHALL be UID-bound canonical projections

Every canonical registry entry SHALL have exactly one `seed_topics/<slug>.md` projection carrying matching topic UID, id, slug, title, must-answer set, scope role and dependency UIDs. Migrate-legacy/add/update apply and any required explicit recover SHALL finish registry and touched seed replacements before topic-scoped queue/content work. Seed presence or filename SHALL NOT create topic identity independently.

HITL1 topic-state apply SHALL create the initial UID-bound seed skeleton after user approval. The seed phase SHALL verify and enrich that projection; it SHALL NOT remain the first durable writer of approved topic intent.

For canonical plans, seed readiness SHALL validate exact UID/slug/intent binding. Existing legacy bundles MAY continue the accepted slug-only seed compatibility path until sanctioned rerun migration; that path SHALL NOT synthesize UIDs, create canonical topics or authorize add/update mutation. Its retirement condition SHALL be C5-backed migration/reentry coverage plus migrated supported legacy fixtures, not an unbounded second authority path.

#### Scenario: Add commits seed before work eligibility
- **WHEN** topic-state apply adds a topic
- **THEN** canonical registry and matching complete UID-bound seed SHALL commit before the topic is eligible for work

#### Scenario: Orphan seed does not become authority
- **WHEN** a seed has no matching canonical UID
- **THEN** inspect/gate SHALL report an orphan projection and SHALL NOT infer a new topic

#### Scenario: Legacy seed compatibility does not become canonical authority
- **WHEN** a resumed legacy bundle follows its existing slug-only seed path before sanctioned rerun migration
- **THEN** existing compatibility behavior MAY continue
- **AND** no UID, topic addition or intent mutation SHALL be inferred from seed filename or prose

### Requirement: Seed projection SHALL follow committed current topic layout

After successful layout mutation, every remaining canonical topic SHALL have exactly one UID-bound `seed_topics/<current-slug>.md` projection with current id/slug/title and unchanged semantic intent unless the explicit layout target changed title. Previous seed filenames SHALL not remain as aliases. Safe remove MAY delete only the seed of a topic already proven to have no durable history or dependency.

A generated new current seed path SHALL be created only when absent or when it is the same UID's existing current seed path being replaced. An unexplained existing target SHALL block rather than be adopted or overwritten.

#### Scenario: Renumber replaces and rebinds seed
- **WHEN** a topic keeps its UID but receives a new ordinal slug
- **THEN** recovery SHALL leave one seed at the current path with matching current metadata
- **AND** no old-path seed alias SHALL remain

#### Scenario: Seed replacement crash exposes exact recovery
- **WHEN** the process stops after the new current seed is written but before registry replacement or old-seed cleanup
- **THEN** topic-state inspect SHALL report the accepted workspace and exact recover command
- **AND** seed/gate checks SHALL short-circuit downstream mismatch noise

#### Scenario: Orphan target seed is not overwritten
- **WHEN** the target current seed filename already exists without binding to the same UID's current projection
- **THEN** layout apply SHALL reject before prepared publication and preserve that file

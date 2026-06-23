> req: STM-001

## MODIFIED Requirements

### Requirement: Seed topic materialization phase node

`phase-seed-topics.md` SHALL 提供完整的 9-section body，位于 setup 与 wave0 之间。§3 Allowed Actions SHALL 采用 queue-driven 三阶段模式（灌料 → 执行循环 → 收尾+gate）。

Phase SHALL 声明 `phase: seed-topics`、`gate: seed-topics-ready`、`stop: "no"`。

Allowed Actions SHALL 覆盖三阶段：

**§3.1 灌料 (Filling)** — 首次进入，如果 queue 为空：
- 读取 `rb_plan.md` frontmatter 的 `topic_registry`
- 为每个 topic 创建 task card JSON（含 work_id, title, target: main-agent, producer_rule: seed_topic_materialize, priority_class: P3_current_gate_gap, required_receipts, done_condition 等完整 QueueItemSchema 字段）
- 使用 `operate-queue enqueue <bundle> --task <task.json>` 逐个灌入
- 灌料完毕后跑 `operate-queue check <bundle>` 确认 active_window 已填充

**§3.2 Queue-driven 执行循环**：
- `operate-queue claim <bundle> --actor main-agent` → 获取 task card → item 为 null 则跳到 §3.3
- 执行：main-agent 从 task.payload.topic_key 定位 topic_registry 条目 + rb_profile.yaml → 按 Seed Topic 文件结构创建 `seed_topics/<slug>.md`
- `operate-queue complete <bundle> --result <result.json>` → receipt check → promote/repair
- 读投影 → 回到 claim

**§3.3 收尾与 gate**：
- 跑 `check-gate-seed-topics-ready.mjs` → pass/fail 按 §6/§7 处理

**Seed Topic 文件内容（对齐 V12 decompose-seed-topics 标准）：**

每个 `seed_topics/<slug>.md` SHALL 包含：
- Frontmatter: `id`, `slug`, `title`（三个均非空，slug 与文件名 stem 一致）+ `must_answer`（该 topic 需要回答的具体问题列表）、`hypothesis`（初始假设或 known gap）、`in_scope`、`out_of_scope`、`search_guardrails`（required_terms + forbidden_broadening）、`evidence_route`（preferred_sources + noise_to_avoid）
- 正文：研究骨架（关键维度/已知前提/open questions）+ 原始语境约束 block（source_anchor / in_scope / out_of_scope / search_guardrails / evidence_route 的正文展开）

若上游（topic_registry / rb_profile.yaml）未提供足够信息填充 must_answer、hypothesis、search_guardrails 或 evidence_route，SHALL 标注为显式 gap（如 `hypothesis: "pending — HITL1 未提供足够约束"`），不得编造。

**Enforcement boundary（强制执行边界）：** 当前 `seed-topics-ready` gate（STM-002）只检查文件存在、title 非空、slug 一致性、trace event、status——不校验 must_answer/hypothesis/search_guardrails/evidence_route 字段的存在性或内容。原因是 gap annotation 机制允许这些字段标为 "pending"（合法），gate 无法区分"未填"和"标 gap"。因此这些 V12 对齐字段的验证分层如下：

| 字段组 | 验证者 | 方式 |
|--------|--------|------|
| id, slug, title, 文件名一致性 | gate（STM-002） | deterministic: file_exists, field_non_empty, cross_field(slug_consistency) |
| must_answer, hypothesis, search_guardrails, evidence_route | experiment playbook（AGQ-010 §5a.4） | Agent 执行 playbook step 时检查文件内容 |
| 字段语义质量（是否足够驱动定向搜索） | HITL1（stop: yes） | 人类审查 topic_registry 和 seed topic 产出 |

这不是 gate 的缺陷——gap annotation 是 seed-topics 的核心机制（缺失信息标注比编造更有价值），而 gate 的定位是结构+数量+一致性检查。此不对称是**有意设计**，但必须在 spec 中显式声明。

#### Scenario: Agent executes seed-topics via queue-driven loop

- **WHEN** Agent 加载 `phase-seed-topics.md`
- **THEN** §3 body SHALL 引导 Agent 进入 queue-driven 三阶段：灌料 → 执行循环 → 收尾+gate
- **AND** body SHALL NOT 使用自由文本 "Allowed Actions" 模式

#### Scenario: Seed topic file is a search-relevant decision document

- **WHEN** Agent 物化一个 seed topic
- **THEN** 产出文件 SHALL 包含 frontmatter 的 must_answer, hypothesis, search_guardrails, evidence_route 字段
- **AND** 正文 SHALL 包含原始语境约束 block
- **AND** 文件 SHALL NOT 是仅有 id/slug/title + 笼统三段式正文的"chapter label"

#### Scenario: Missing upstream info recorded as gap

- **WHEN** topic_registry 或 rb_profile.yaml 未提供足够的 hypothesis 或 search_guardrails 信息
- **THEN** Agent SHALL 标注为显式 gap（如 `hypothesis: "pending — ..."`）
- **AND** Agent SHALL NOT 编造信息以通过 gate
- **AND** gate SHALL still pass（gap 本身是有效信息——告诉 wave0 该 topic 搜索范围较宽）

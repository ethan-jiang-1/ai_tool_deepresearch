> req: STM-001, STM-002, STM-003, STM-004, STM-005

## Purpose

定义在 setup 与 wave0 之间插入的 **seed topic 物化阶段**（`phase-seed-topics.md` + `seed-topics-ready` gate）。此阶段强制 Agent 把 `rb_plan.md` frontmatter 中的 `topic_registry` 物化为 `seed_topics/` 目录下的独立文件，并用 deterministic 规则检查结构合法性与数量 floor。

**存在的理由**：`wff-pre-research` 的 HITL1 只把 seed topics 写进 `rb_plan.md` 的 `topic_registry` frontmatter，从不物化到 `seed_topics/` 目录。`setup-ready` gate 只检查 `seed_topics/` 目录存在（空目录也 pass），导致 Agent 可带着空 `seed_topics/` 进入 Wave0 研究。虽然 `wff-research-waves` 的 `wave0-complete` gate 已设计"topic_registry 为空时 fail"的防线，但该防线位置过晚（在 Wave0），且只检查 registry 非空，不检查物化一致性或数量 floor。本阶段把这道防线前移并加固为独立确定性 gate。

Gate 只做 deterministic 结构/数量/一致性检查；seed topic 的语义质量（topic 是否"好"、是否与研究问题对齐）由人类在 HITL1（`stop: yes`）审查，本阶段不新增 stop 点。

## Requirements

### Requirement: Seed topic materialization phase node

`DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md` SHALL 提供完整 9-section phase body，位于 setup 与 wave0 之间。

Phase SHALL 声明 `phase: seed-topics`、`gate: seed-topics-ready`、`stop: "no"`。

Allowed Actions SHALL 覆盖：
- 读取 `rb_plan.md` frontmatter 的 `topic_registry`（source of truth for topic 集合）
- 为 registry 中每个 topic 在 `seed_topics/` 下创建 `<slug>.md` 文件
- 每个 `seed_topics/<slug>.md` 包含 frontmatter（`id`、`slug`、`title`）和正文（该 topic 的研究骨架：关键维度、已知前提、open questions）
- 更新 `rb_status.json` 与 `rb_trace.jsonl`
- 记录 `seed_topics_completion` trace event

Phase body 的 Anti-Cheating Rules SHALL 显式禁止：
- 物化空目录就声称完成
- 创建与 `topic_registry` slug 不一致的文件
- 编造 `must_answer_refs` 引用

#### Scenario: Agent materializes all registry topics

- **WHEN** `rb_plan.md` 的 `topic_registry` 含 N 个 topic，Agent 在 `seed_topics/` 下创建 N 个对应 `.md` 文件
- **THEN** `seed-topics-ready` gate SHALL pass（结构 + 数量 + slug 一致性均满足）

#### Scenario: Empty registry cannot pass materialization

- **WHEN** `topic_registry` 为空数组或不存在
- **THEN** phase SHALL 报告无法物化，gate SHALL fail，`inspect` 指向空 registry

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

`rb_status.json` 模板（`rb_templates/`）的 `current_gate`/`next_gate` 初始值 SHALL 反映新阶段，或由 setup gate pass 后更新为 `seed_topics_ready` / `wave0_complete`。

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

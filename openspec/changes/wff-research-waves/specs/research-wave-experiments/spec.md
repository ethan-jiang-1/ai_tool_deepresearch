> req: RWE-001, RWE-002, RWE-003, RWE-004, RWE-005, RWE-006, RWE-007, RWE-008, RWE-009

## Purpose

定义 workflow-foundation research wave experiments 的 runner-facing acceptance surface。实验必须展示 wave0/1/2 的完整闭环、全链路串联、Wave1 boundary enforcement、repair loop、fault tolerance 和 cross-topic synthesis 的可审查性，同时保持 deterministic verdict 只来自真实 trace JSONL。

**Requirement 与 playbook 映射**：RWE-001~007 各对应一个 playbook 文件（7 个 wave playbook）。RWE-008 和 RWE-009 是横切约束（不产生独立 playbook）：RWE-008 要求所有 Wave1 相关 playbook 在 body 中显式说明 foundation placeholder boundary；RWE-009 要求 wave2 synthesis playbook 的 thin driver 独立验证 cross-artifact reference。seed-topics boundary playbook（test-simple-seed-topics-boundary.md）由 STM-005 定义，不属于 RWE capability。

## ADDED Requirements

### Requirement: Wave0 happy-path + fail playbook

`experiments_playbook/exp_workflow-foundation/test-simple-wave0-happy-path.md` SHALL 提供 light playbook，验证 Wave0 的 foundation reference collection 路径（包含 pass 和 fail 两个分支）。

该 playbook SHALL：
- 通过 `experiments/shared/new-disposable-bundle.mjs` 创建 disposable bundle
- 前置运行 validate-bundle 和 inspect-bundle
- 写入 fixed seed topics 到 `rb_plan.md` 的 topic registry
- 通过薄 driver 写 schema-valid reference metadata 到 `reference/<topic>/source.yaml`，更新 `reference/index.md`
- 运行 `check-gate-wave0-complete.mjs` → 验证 pass
- 再故意移除一个 topic 的 metadata → 验证 gate fail（inspect 指向缺失 topic）
- 再清空 `rb_plan.md` 的 `topic_registry` → 验证 gate fail（inspect 指向空 registry），证明 topic 集合 source of truth = registry 而非磁盘扫描
- 再写入数量达标但 schema 不合格的 reference metadata（如缺少必填字段 `url`）→ 验证 `count_floor` pass 但 `schema_valid` fail，gate 整体 fail——证明 count_floor ⊕ schema_valid 的 AND 交互（design D2）
- 再写入 registry 有 3 个 topic 但故意漏写 1 个 topic 的 reference 目录 → 验证 `{topic}` 占位符展开后精确指出缺失的 topic（design D5 per-topic rule 展开机制）
- 从 `_trace.jsonl` 给出最终 verdict

#### Scenario: Wave0 pass and fail both trace-backed

- **WHEN** reference metadata 满足 contract
- **THEN** `wave0-complete` gate SHALL pass
- **AND WHEN** 某个 topic 无 metadata 时 gate SHALL fail with inspect
- **AND WHEN** topic_registry 为空时 gate SHALL fail with inspect 指向空 registry（不 crash，不 silent pass）
- **AND WHEN** reference 数量达标但 schema 不合格时 gate SHALL fail（count_floor pass, schema_valid fail）
- **AND WHEN** `{topic}` 展开后某 topic 缺 reference 时 gate SHALL fail（inspect 精确指向缺失 topic）
- **AND** verdict SHALL 基于 trace 中五条 `check` event（1 pass + 4 fail）

### Requirement: Wave1 happy-path + boundary enforcement playbook

`experiments_playbook/exp_workflow-foundation/test-simple-wave1-boundary.md` SHALL 提供 light playbook，验证 Wave1 的 placeholder skeleton 路径和 boundary enforcement。

该 playbook SHALL：
- 前置完成 Wave0（使用 pre-seeded reference）
- 写入 topic-scoped skeleton artifact 并标记 `capability: foundation-placeholder`
- 运行 `check-gate-wave1-complete.mjs` → 验证 pass
- 再写 unmarked skeleton（缺 marker）→ 验证 gate fail（inspect 指向缺失 marker）
- 再写含 false completion claim 的 skeleton → 验证 gate fail
- 展示 human review checklist：marker 是否清楚、skeleton 是否避免了 false completion claim
- 显式列出 foundation 阶段 DO 和 DON'T

#### Scenario: Wave1 skeleton passes gate when properly marked

- **WHEN** skeleton artifact 包含 `capability: foundation-placeholder` marker 且无 false completion claim
- **THEN** `wave1-complete` gate SHALL pass
- **AND** verdict SHALL PASS

#### Scenario: Wave1 skeleton fails gate when unmarked or false-claimed

- **WHEN** skeleton artifact 缺失 marker
- **THEN** `wave1-complete` gate SHALL return `passed: false`
- **AND WHEN** skeleton 包含 "full subagent coverage completed"
- **THEN** gate SHALL return `passed: false`

### Requirement: Wave2 happy-path + artifact reference verification playbook

`experiments_playbook/exp_workflow-foundation/test-simple-wave2-synthesis.md` SHALL 提供 light playbook，验证 Wave2 的 cross-topic synthesis 路径和引用链检查。

该 playbook SHALL：
- 前置完成 Wave0 和 Wave1（pre-seeded）
- 写入 synthesis artifact，用 Markdown links 引用具体 Wave0/Wave1 artifacts
- 运行 `check-gate-wave2-complete.mjs` → 验证 pass
- 再写无 Markdown link 的 synthesis → 验证 gate fail
- 再写有 links 但目标全部不存在的 synthesis → 验证 gate fail
- 展示 synthesis 内容和引用链
- 展示 human review checklist：引用是否准确、synthesis 是否从 artifacts 派生

#### Scenario: Wave2 synthesis passes gate with valid references

- **WHEN** synthesis 引用的所有 Markdown link 目标存在且非空
- **THEN** `wave2-complete` gate SHALL pass

#### Scenario: Wave2 synthesis fails when all references invalid

- **WHEN** synthesis 无 Markdown links 或所有 link 目标不存在
- **THEN** `wave2-complete` gate SHALL return `passed: false`

### Requirement: Full-chain waves sequential playbook

`experiments_playbook/exp_workflow-foundation/test-simple-waves-full-chain.md` SHALL 提供 light playbook，验证 seed-topics → wave0 → wave1 → wave2 四个 gate 可以顺序 pass，证明从 setup 到 wave2 的完整 artifact 依赖链。

该 playbook SHALL：
- 使用 pre-seeded post-setup bundle（已验证 instantiation + HITL1 + setup）
- 物化 seed_topics（运行 `seed-topics-ready` gate → pass → 记录 trace）
- 写入 Wave0 reference metadata
- 运行 `wave0-complete` gate → pass → 记录 trace
- 用 Wave0 产出写入 Wave1 skeleton artifacts
- 运行 `wave1-complete` gate → pass → 记录 trace
- 用 Wave0 + Wave1 产出写入 Wave2 synthesis
- 运行 `wave2-complete` gate → pass → 记录 trace
- 从 `_trace.jsonl` 给出最终 verdict（4 条 `check` event，全部 pass：seed-topics + wave0 + wave1 + wave2）

#### Scenario: Four phases chain sequentially

- **WHEN** seed-topics → wave0 → wave1 → wave2 顺序执行
- **THEN** trace SHALL 记录 4 条 `check` event
- **AND** 全部 check SHALL 返回 `passed: true`
- **AND** verdict SHALL PASS

### Requirement: Wave repair-loop playbook

`experiments_playbook/exp_workflow-foundation/test-medium-wave-repair-loop.md` SHALL 提供 light repair-loop playbook，验证 wave gate fail → inspect/advice → repair → rerun → pass 的闭环。

该 playbook SHALL 演示：
- 选择 Wave2 gate（引用链检查最容易演示 fail→repair→pass 闭环）
- 初始 synthesis 不包含任何有效 Markdown links → gate fail
- 读取 `inspect` / `advice`
- repair：在 synthesis 中追加合法的 artifact references
- 展示 repair 前后 surface diff（至少展示引用链变化）
- rerun same gate → pass
- 若需要，Wave0 和 Wave1 的 repair 路径通过集成测试覆盖（不单独建 playbook）

#### Scenario: Wave repair loop is trace-backed

- **WHEN** repair loop playbook 执行
- **THEN** trace SHALL 同时记录 failed 和 passed 的 `check` events
- **AND** final verdict SHALL 仅基于 trace

### Requirement: Wave fault-tolerance playbook

`experiments_playbook/exp_workflow-foundation/test-medium-wave-fault-tolerance.md` SHALL 提供 light fault-tolerance playbook，验证畸形数据和边界条件下的 gate 行为。

该 playbook SHALL 至少覆盖：
- **Malformed YAML**：`reference/<topic>/source.yaml` 中存在无法 parse 的 YAML → `schema_valid` rule fail，inspect 给出 parse error detail
- **Missing artifact reference target**：synthesis 引用不存在的文件路径 → `cross_field` rule 记录 individual fail，但若其他引用有效仍 pass
- **Status drift**：`rb_status.json` 中 `current_gate` 或 `next_gate` 与预期值不一致 → `status_value` rule fail，inspect 指出 expected vs actual

#### Scenario: Fault-tolerance playbook proves gate graceful degradation

- **WHEN** bundle 包含畸形或漂移的 data
- **THEN** gate SHALL return `passed: false` with actionable inspect/advice（不是 crash 或 silent pass）
- **AND** trace SHALL 记录 fail event
- **AND** playbook SHALL 不修正错误（只证明 gate 检测到错误）

### Requirement: Wave review-surface playbook

`experiments_playbook/exp_workflow-foundation/test-complex-wave-review-surface.md` SHALL 提供 light playbook，将 Wave2 synthesis 内容、引用链和 review checklist 暴露为 Markdown 审阅面，供人类判断 synthesis 质量和引用准确度。

该 playbook SHALL：
- Pre-seed 完整的 Wave0 + Wave1 artifacts
- 写入一份 fixed synthesis（内容固定，不依赖 live AI generation）
- 运行 `wave2-complete` gate → pass
- 在 Markdown body 中显式展示 Wave0 reference metadata（url/title/retrieved_date/topic_tag 摊开成表，对应 charter 的 no-make-believe 原则）、synthesis 全文、引用链表格、review checklist
- Human review checklist 至少包含：
  - Wave0 reference 的 url/title 是否真实？（不是编造的 fake source）
  - synthesis 是否从 Wave0/Wave1 artifacts 中派生？（不是凭空总结）
  - 引用链中的每个 reference 是否准确？（指向的文件内容与 synthesis 一致）
  - placeholder marker 是否清楚区分了 foundation 和 future capability？
- 不要求 live AI generation，保持 light 和 repeatable
- 最终 verdict 只从 trace 来

#### Scenario: Human can review synthesis quality from playbook body

- **WHEN** human runner 打开该 playbook
- **THEN** 可以直接看到 synthesis 全文、引用链、review checklist
- **AND** 不依赖阅读 inline JS 才能理解 synthesis 内容

### Requirement: Wave1 placeholder not mistaken for full subagent research (RWE-008, 横切约束)

**本 requirement 是横切约束，不产生独立 playbook。** 它约束所有 Wave1 相关 playbook（RWE-002 test-simple-wave1-boundary.md 及其他含 Wave1 步骤的 playbook）的 Markdown body 必须显式说明 foundation placeholder boundary，确保 human reviewer 能区分 foundation skeleton 和 future full subagent research。

#### Scenario: Reviewer can distinguish foundation from full research

- **WHEN** human runner 打开任一 Wave1 playbook
- **THEN** body SHALL 显式列出 foundation 阶段 DO 和 DON'T
- **AND** SHALL 标注 `subagent: true` 在 foundation 只是 future marker

### Requirement: Cross-artifact reference verification in wave2 synthesis (RWE-009, 横切约束)

**本 requirement 是横切约束，不产生独立 playbook。** `test-simple-wave2-synthesis.md` SHALL 展示 synthesis artifact 通过 Markdown links 引用 Wave0 和 Wave1 artifacts 的具体方式。本 requirement 约束该 playbook 的 thin driver SHALL 解析 synthesis 中的 artifact references，验证每个引用目标的存在性，并将结果写入 `_trace.jsonl` 中的 `cross_field_check` event（独立于 gate CLI 的 check）。

#### Scenario: Cross-artifact references are independently verifiable

- **WHEN** playbook driver 解析 synthesis 中的 Markdown links
- **THEN** driver SHALL 在 `_trace.jsonl` 中追加 `cross_field_check` event
- **AND** gate CLI 的 `cross_field` rule 与 driver 的 `cross_field_check` event SHALL 一致（两者都基于同一 bundle 状态）

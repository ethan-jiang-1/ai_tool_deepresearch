> req: PRE-001, PRE-002, PRE-003, PRE-004, PRE-005, PRE-006, PRE-007

## Purpose

定义 workflow-foundation pre-research experiments 的 runner-facing acceptance surface。实验必须成为 HITL1 问题面、repair loop 和人工 review 的主界面，同时保持 deterministic verdict 只来自真实 trace JSONL。

## ADDED Requirements

### Requirement: Workflow-foundation happy-path pre-research playbook

`experiments_playbook/exp_workflow-foundation/test-simple-pre-research-happy-path.md` SHALL 提供 fixed-answer 的 light playbook。

该 playbook SHALL：
- 通过 `experiments/shared/new-disposable-bundle.mjs` 创建真实 `dpt_disp_*` bundle
- 在 mechanism execution 前运行 `DPT_FRAMEWORK/cli/validate-bundle.mjs` 和 `DPT_FRAMEWORK/cli/inspect-bundle.mjs`
- 依次验证 `instantiation -> HITL1 -> setup`
- 在 Markdown 中显式展示 fixed HITL1 payload 和写入后的 profile surface
- 通过薄 driver 调用真实 gate CLI，并基于 CLI JSON result 向 `_trace.jsonl` 记录 `check` events
- 从 `_trace.jsonl` 给出最终 verdict
- cleanup disposable bundle

#### Scenario: Happy path playbook passes all three pre-research gates

- **WHEN** fixed HITL1 payload 满足当前 contract
- **THEN** playbook SHALL 记录至少 3 个 `check` events
- **AND** verdict SHALL PASS

### Requirement: Workflow-foundation repair-loop playbook

`experiments_playbook/exp_workflow-foundation/test-medium-pre-research-repair-loop.md` SHALL 提供 light repair-loop playbook。

该 playbook SHALL 演示：
- gate fail
- 读取 `inspect` / `advice`
- repair active bundle
- 展示 repair 前后关键 surface diff（至少包括 profile 或 status 的变化点）
- rerun same gate
- 最终 pass

#### Scenario: Repair loop is trace-backed

- **WHEN** medium playbook 执行
- **THEN** trace SHALL 同时记录 failed 和 passed 的 `check` events
- **AND** final verdict SHALL 仅基于 trace

### Requirement: Workflow-foundation review-surface playbook

`experiments_playbook/exp_workflow-foundation/test-complex-pre-research-review-surface.md` SHALL 暴露 HITL1 问题面和 review points，让人类能判断 AI 的理解是否贴近预期。

该 playbook SHALL：
- 展示 phase-hitl1 / shared-profile 的关键问题面
- 展示 fixed AI interpretation sample 及其准备写入的 HITL1 payload
- 展示 human review checklist，使人能判断 AI 的问题理解和字段落点是否贴近预期
- 让 review surface 成为可审查 artifact，而不是藏在 JS controller
- 仍保持 light、repeatable、trace-backed

#### Scenario: Review surface remains visible in Markdown

- **WHEN** human runner 打开该 playbook
- **THEN** 可以直接看到 HITL1 问题面和 review points
- **AND** 最终 verdict 仍来自 `_trace.jsonl`
- **AND** review artifact SHALL 不依赖阅读 inline JS 才能理解

### Requirement: Complex review-surface stays light by using fixed interpretation sample

`test-complex-pre-research-review-surface.md` SHALL 使用固定 AI interpretation sample 或等价静态审查样例，以保持 light 和 repeatable。它 SHALL NOT 把“现场生成 AI interpretation”作为默认通过条件。

#### Scenario: Complex playbook does not require live AI generation

- **WHEN** runner 执行 complex review-surface playbook
- **THEN** playbook SHALL 能在没有实时 Agent interpretation 生成的前提下完成 light 验证
- **AND** 它验证的是 review surface contract，不是 live AI variability

### Requirement: Workflow-foundation manual HITL review playbook

`experiments_playbook/exp_workflow-foundation/test-heavy-hitl1-manual-review.md` SHALL 提供 human-in-the-loop manual acceptance path。

该 playbook SHALL：
- 在 HITL1 步骤显式停下
- 要求人类按 payload checklist 把回答写入 active bundle surface
- 之后运行真实 `hitl1-recorded` 和 `setup-ready` gates
- 标记为 `weight: heavy`
- 默认不计入 light 回归

payload checklist SHALL 至少包含：
- `research_profile`
- `root_must_answer_set`
- `human_decision_checkpoints.hitl1.status: recorded`
- `human_decision_checkpoints.hitl1.recorded_at`
- 人类确认 `plan_basename` 未被误改

#### Scenario: Manual HITL playbook is executable but not default light

- **WHEN** runner 读取 `experiments_playbook/RUN.md`
- **THEN** manual HITL playbook SHALL 出现在 heavy 清单而非 light 清单
- **AND** playbook SHALL 提供完整执行与 cleanup 说明

### Requirement: Heavy means human-interactive/manual for HITL review

在此 change 的 manual HITL playbook 语境中，`weight: heavy` SHALL 表示需要人工介入、人工判断或人工写入 payload，而不是要求 native subagent runtime。

#### Scenario: Heavy manual path is not subagent-dependent

- **WHEN** reviewer 查看 manual HITL playbook frontmatter 和 RUN 清单
- **THEN** 文档 SHALL 说明 heavy 的原因是 human-interactive/manual
- **AND** SHALL NOT 暗示该 playbook 依赖 real subagent spawn

### Requirement: Experiment review surface remains Markdown-first

所有 workflow-foundation pre-research playbook SHALL 把以下内容放在 Markdown 主体中，而不是藏入 inline JS：
- 当前 case 证明什么
- HITL1 问题面或 fixed/manual payload
- 人类需要检查的 review points
- gate fail 后应读取哪类 `inspect` / `advice`

thin driver MAY 负责 deterministic execution，但 SHALL NOT 取代 Markdown 成为主要 review surface。

#### Scenario: Human can review experiment intent without reading JS

- **WHEN** reviewer 只阅读 playbook Markdown 正文
- **THEN** reviewer SHALL 能理解 case goal、payload、review points、verdict basis
- **AND** 不需要先解析 JS driver 才知道实验在证明什么

### Requirement: Topic rewrite playbook

`experiments_playbook/exp_workflow-foundation/test-light-hitl1-topic-rewrite.md` SHALL 提供 light playbook，验证 HITL1 的 topic rewrite 链路。

该 playbook SHALL：
- 使用一句话作为原始输入（如 "帮我研究一下 AI 安全"）
- 通过 `experiments/shared/new-disposable-bundle.mjs` 创建 disposable bundle
- 将 Agent 展开的 structured original topic 写入 `rb_plan.md` 正文
- 从 original topic 推导 seed topics → 写入 `rb_plan.md` frontmatter 的 `topic_registry`
- 展示原始输入 vs original topic vs seed topics 的对比
- 提供 human review checklist：original topic 是否合理覆盖输入意图？seed topics 推导是否靠谱？
- 运行 `hitl1-recorded` gate（structural 校验，不判断 rewrite 质量）
- 从 `_trace.jsonl` 给出最终 verdict
- cleanup disposable bundle

#### Scenario: Topic rewrite produces verifiable artifacts

- **WHEN** playbook 执行 topic rewrite
- **THEN** `rb_plan.md` 正文包含 structured original topic（至少：背景、范围、维度）
- **AND** frontmatter `topic_registry` 非空
- **AND** `hitl1-recorded` gate SHALL pass
- **AND** human review checklist 可直接在 Markdown 中审查

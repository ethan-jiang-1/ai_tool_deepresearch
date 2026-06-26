# Pre-Research Phase Content

> req: PRP-001, PRP-002, PRP-003, PRP-004, PRP-005, PRP-006, PRP-007, PRP-008, PRP-009, PRP-010

## Purpose

定义 instantiation、HITL1、setup 三个 phase node 的完整 body 内容要求。每个 phase node body 必须满足当前 workflow-node contract 的 9 个 section，同时严格贴合当前 accepted CLI / schema / bundle contract：instantiation 通过真实 CLI 建 bundle；HITL1 的 runtime truth 写进 `rb_profile.yaml`；setup 只做 structural consistency，不膨胀成 readiness。

## Requirements

### Requirement: Phase instantiation body completeness

`phase-instantiation.md` SHALL 包含完整的 9-section body，引导 Agent 创建真实 runtime bundle。

Section 内容要求：
- **Stage Goal**: 创建 bundle 和 canonical scaffold，不替代后续 HITL / setup / wave
- **Required Inputs**: 用户原始 research question（用于命名）和 `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`
- **Allowed Actions**:
  - 生成合适的 bundle 名
  - 调用 `node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>`
  - 读取 CLI 返回的 bundle 路径
  - reload 新建 bundle 的 control files 和目录结构
- **Expected Artifacts**: 新建 bundle 目录、`START_FROM_HERE.md`、5 个 `rb_*` control files、canonical scaffold dirs
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle <path> --current-node phases/phase-instantiation.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，修复缺失或漂移的 instantiation surface，rerun same gate（默认最多 3 次）
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止跳过 CLI 直接手搓"看起来像 bundle"的结果；禁止声称 evidence coverage / synthesis

#### Scenario: Agent executes instantiation phase

- **WHEN** Agent 加载 `phase-instantiation.md`
- **THEN** body SHALL 引导 Agent 调用 `instantiate-run-bundle.mjs`
- **AND** body SHALL NOT 指示 Agent 在这个阶段提 HITL 问题或做 research work

### Requirement: Phase HITL1 body completeness and stop semantics

`phase-hitl1.md` SHALL 包含完整的 9-section body，并保留 `stop: yes`。

Section 内容要求：
- **Stage Goal**: 收集用户对 pre-research 的明确输入，并写入 `rb_profile.yaml`
- **Required Inputs**: 已实例化 bundle、`shared-profile.md`
- **Allowed Actions**:
  - 读取用户原始 research question / brief
  - 判断用户输入详细程度：一句话还是详细 brief？
  - **一句话场景 → topic rewrite**：Agent 将模糊输入展开为 structured original topic（背景、范围、关键维度、已知前提、不确定项），写入 `rb_plan.md` 正文
  - 从 original topic 推导初始 seed topics → 写入 `rb_plan.md` frontmatter 的 `topic_registry`
  - 将 original topic + seed topics + 建议的 `research_profile` 一起展示给用户审查
  - 向用户展示结构化 HITL1 问题面
  - 基于用户回答选择 `research_profile` enum
  - 写入 `root_must_answer_set`
  - 写入 `human_decision_checkpoints.hitl1.status`
  - 写入 `human_decision_checkpoints.hitl1.recorded_at`
- **Expected Artifacts**: `rb_profile.yaml` 中上述字段已写入
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle <path> --current-node phases/phase-hitl1.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，补充缺失字段或修正默认值后 rerun
- **Stop Behavior**: `stop: yes`，Agent MUST 等待用户输入
- **Anti-Cheating Rules**: 禁止把回答留在 chat memory；禁止伪造用户答案；禁止跳过 HITL1 直接进入 setup

HITL1 body SHALL 展示问题维度，但 MUST 写到当前 accepted profile surface，而不是新造字段。

#### Scenario: HITL1 writes to bundle not status tree

- **WHEN** 用户回答 HITL1 问题后
- **THEN** Agent MUST 将结果写入 `rb_profile.yaml`
- **AND** body SHALL NOT 指示 Agent 写入不存在的 `rb_status.json#/phases/hitl1/*`

### Requirement: Phase setup body completeness and stop semantics

`phase-setup.md` SHALL 包含完整的 9-section body，并保留 `stop: no`。

Section 内容要求：
- **Stage Goal**: 验证 bundle 在进入 wave0 前的 structural consistency
- **Required Inputs**: active bundle、`shared-profile.md`、`shared-schemas.md`
- **Allowed Actions**:
  - 检查 control files 是否存在且可解析
  - 检查 scaffold dirs 是否存在
  - 检查 HITL1 marker 是否已写入 profile
  - 检查 `rb_status.json` 仍然是 `current_gate: setup_ready` / `next_gate: seed_topics_ready`
  - 按 accepted normalization 规则检查 bundle dir basename、`rb_plan.md` frontmatter `plan_basename`、`rb_profile.yaml` `plan_basename` 一致
- **Expected Artifacts**: 一致的 pre-wave0 bundle surface
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle <path> --current-node phases/phase-setup.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，修复后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止把 setup pass 当 readiness pass；禁止手动改状态冒充 ready

#### Scenario: Setup does not become readiness

- **WHEN** `phase-setup.md` 描述检查范围
- **THEN** body SHALL 明确声明 `setup_ready != readiness_passed`
- **AND** body SHALL 限定在结构一致性，不做研究质量判断

#### Scenario: Setup body explains disposable bundle normalization

- **WHEN** `phase-setup.md` 描述 basename consistency
- **THEN** body SHALL 说明 production 使用 `dpt_rb_<name>`，disposable experiment 使用 `dpt_disp_<name>_<hex>`
- **AND** body SHALL 指示 Agent 比较归一化后的 bundle basename 与 plan/profile `plan_basename`

### Requirement: Setup body distinguishes production and disposable naming contracts

`phase-setup.md` SHALL 明确说明当前 accepted name grammar：
- production run logical name 使用 lowercase kebab-case，匹配 `[a-z0-9][a-z0-9-]*`
- disposable experiment logical name 使用 lowercase case slug，匹配 `[a-z0-9][a-z0-9_-]*`

该说明 SHALL 只解释当前 contract，不引入新的命名接口。

#### Scenario: Setup body documents name grammar

- **WHEN** Agent 读取 `phase-setup.md` 的 basename consistency 部分
- **THEN** body SHALL 说明 production 与 disposable 的 `<name>` 允许字符集不同
- **AND** body SHALL NOT 暗示大写、空格或任意 Unicode 是可接受命名

### Requirement: HITL1 body exposes a concrete payload checklist

`phase-hitl1.md` SHALL 把 HITL1 的最小写入 contract 作为可见 checklist 暴露给人类和 Agent。

checklist SHALL 至少包含：
- `research_profile`
- `root_must_answer_set`
- `human_decision_checkpoints.hitl1.status`
- `human_decision_checkpoints.hitl1.recorded_at`

该 checklist SHALL 服务于对齐和 review；它不是新的 schema surface。

#### Scenario: Human can audit the intended HITL1 write surface

- **WHEN** human reviewer 读取 `phase-hitl1.md`
- **THEN** reviewer SHALL 直接看到 Agent 预期写入的最小字段集合
- **AND** review 不需要从散落 prose 中自行拼装字段 contract

### Requirement: Instantiation scope boundary enforcement

`phase-instantiation.md` SHALL 显式声明 instantiation 的允许和禁止边界。

允许：
- 定名并调用实例化 CLI
- 检查 CLI 返回的 bundle surface
- 在 gate fail 时修复缺失的 instantiation surface

禁止：
- 问 HITL 问题
- 搜索 / 阅读 / 产出 evidence
- 做 synthesis judgment
- 在 bundle 名冲突时自动追加 `-2` / `-3`

#### Scenario: Name collision remains fail-stop

- **WHEN** 目标 production bundle 名已存在
- **THEN** body SHALL 指示 Agent 报错停止并请求新名称
- **AND** body SHALL NOT 指示 Agent 自动改名覆盖

### Requirement: Invalid bundle name remains fail-stop

如果目标 bundle basename 不满足当前 accepted naming pattern，`phase-instantiation.md` SHALL 指示 Agent 停止并重新选择合法名称，然后重新走 approved instantiation path。

Agent SHALL NOT：
- rename 已创建目录来规避命名错误
- 修改 `rb_plan.md` / `rb_profile.yaml` 的 `plan_basename` 来追认非法目录名
- 把非法命名 bundle 当作可 repair 的现成 runtime surface

#### Scenario: Invalid name requires fresh instantiation

- **WHEN** Agent 发现当前 bundle basename 不满足 accepted pattern
- **THEN** body SHALL 指示 Agent stop 并重新 instantiate 正确命名的 bundle
- **AND** body SHALL NOT 指示 Agent 通过目录 rename 或跨文件补丁修复

### Requirement: HITL1 stop semantics enforcement

`phase-hitl1.md` 的 `stop: yes` SHALL 被正确实现。用户回答后，Agent 仍必须运行 `hitl1-recorded` gate；`stop: yes` 只意味着等待用户，不意味着豁免 deterministic check。

#### Scenario: Stop yes blocks auto-advance

- **WHEN** 用户尚未回答 HITL1
- **THEN** Agent MUST NOT 进入 `phase-setup`

### Requirement: Setup stop semantics enforcement

`phase-setup.md` 的 `stop: no` SHALL 被正确实现。gate pass 后 Agent SHALL 自动推进；若连续 3 次修复无进展，则记录 escalation，不能冒充 `setup_ready` 已通过。

#### Scenario: Setup escalates on persistent failure

- **WHEN** setup gate 连续失败且没有进展
- **THEN** body SHALL 指示 Agent 记录 escalation
- **AND** Agent MUST NOT 修改 control files 伪造通过

### Requirement: Anti-cheating rules in phase bodies

每个 phase node body 的 Anti-Cheating Rules section SHALL 包含该 phase 特有禁令，并 reference `shared-anti-cheating-rules.md`。

#### Scenario: Each phase has phase-specific anti-cheating rules

- **WHEN** Agent 读取任一 pre-research phase 的 Anti-Cheating Rules section
- **THEN** section SHALL 至少列出 2 条 phase-specific 禁令
- **AND** 每条禁令 SHALL 指向正确替代动作

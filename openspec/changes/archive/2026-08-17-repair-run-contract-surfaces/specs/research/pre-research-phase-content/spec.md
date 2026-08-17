> req: PRP-003

## MODIFIED Requirements

### Requirement: Phase setup body completeness and stop semantics

`phase-setup.md` SHALL 包含完整的 9-section body，并保留 `stop: no`。

Section 内容要求：
- **Stage Goal**: 验证 bundle 在进入 wave0 前的 structural consistency
- **Required Inputs**: current run bundle、`shared-profile.md`、`shared-schemas.md`
- **Allowed Actions**:
  - 检查 control files 是否存在且可解析
  - 检查 scaffold dirs 是否存在
  - 检查 HITL1 marker 是否已写入 profile
  - 检查 `rb_status.json` 处于 gate 前窗口 `current_gate: hitl1_recorded` / `next_gate: setup_ready`（HITL1 完成后、进入 setup 时的合法 bootstrap 窗口）；该窗口是 setup gate 的**前置状态**，不是漂移
  - 在运行 setup gate 前，通过 bootstrap 兼容窗口（`hitl1_to_setup`）执行 `advance-status --to setup_ready`，使状态变为 `current_gate: setup_ready` / `next_gate: seed_topics_ready`（这正是 setup gate 的 `status_current_gate` / `status_next_gate` 期望值）；文档不得把 gate 后状态当作 gate 前检查，也不得把 bootstrap advance 描述为「gate pass 之后才执行」
  - 按 accepted normalization 规则检查 bundle dir basename、`rb_plan.md` frontmatter `plan_basename`、`rb_profile.yaml` `plan_basename` 一致
- **Expected Artifacts**: 一致的 pre-wave0 bundle surface
- **Gate Command**: `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle <path> --current-node phases/phase-setup.md`
- **On Gate Pass**: 读取 `check.next`（应为 `phases/phase-seed-topics.md`）
- **On Gate Fail**: 读取 `inspect` / `advice`，修复后 rerun；status drift 类 hint 的 repair 命令（`advance-status --to setup_ready`）在 bootstrap 窗口内是合法 engine_operation
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止把 setup pass 当 readiness pass；禁止手动改状态冒充 ready

#### Scenario: Setup does not become readiness

- **WHEN** `phase-setup.md` 描述检查范围
- **THEN** body SHALL 明确声明 `setup_ready != readiness_passed`
- **AND** body SHALL 限定在结构一致性，不做研究质量判断

#### Scenario: Setup body explains the bootstrap status window before the gate

- **WHEN** `phase-setup.md` 描述 `rb_status.json` 的检查
- **THEN** body SHALL 说明 gate 前合法窗口是 `current_gate: hitl1_recorded` / `next_gate: setup_ready`
- **AND** body SHALL 指示在运行 setup gate 前执行 `advance-status --to setup_ready`（bootstrap `hitl1_to_setup` 兼容窗口）以到达 gate 期望的 `setup_ready` / `seed_topics_ready`
- **AND** body SHALL NOT 把 `setup_ready` / `seed_topics_ready` 描述为「无需任何前置同步即应存在」的 gate 前状态

#### Scenario: Setup body explains disposable bundle normalization

- **WHEN** `phase-setup.md` 描述 basename consistency
- **THEN** body SHALL 说明 production 使用 `dpt_rb_<name>`，disposable experiment 使用 `dpt_disp_<name>_<hex>`
- **AND** body SHALL 指示 Agent 比较归一化后的 bundle basename 与 plan/profile `plan_basename`

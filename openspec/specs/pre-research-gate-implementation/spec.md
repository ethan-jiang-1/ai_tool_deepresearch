# Pre-Research Gate Implementation

> req: PRG-001, PRG-002, PRG-003, PRG-004, PRG-005, PRG-006, PRG-007, PRG-008

## Purpose

定义 `instantiation-complete`、`hitl1-recorded`、`setup-ready` 三个 gate 的真实 deterministic rule set 和 CLI 实现要求。所有规则都必须基于当前 accepted executable surface：现有 bundle files、现有 profile/status schema、现有 transition / gate helper contract。Gate 不做研究质量判断。

## Requirements

### Requirement: Instantiation complete gate rule set

`gate-instantiation-complete.definition.json` SHALL 定义当前 contract 下的 instantiation rules。

规则 SHALL 覆盖：
- bundle dir 存在
- bundle 目录名合法，且可用于 production run (`dpt_rb_*`) 或 disposable experiment (`dpt_disp_*`)
- `START_FROM_HERE.md`
- `rb_plan.md`
- `rb_profile.yaml`
- `rb_status.json`
- `rb_queue.json`
- `rb_trace.jsonl`
- `seed_topics/`
- `reference/`
- `artifacts/`
- `_cache/`
- `final/`
- `rb_status.json#/current_mode == execution`
- `rb_status.json#/current_gate == setup_ready`
- `rb_status.json#/next_gate == wave0_complete`

命名 contract SHALL 明确：
- production logical name `<name>` 匹配 `[a-z0-9][a-z0-9-]*`
- disposable logical name `<name>` 匹配 `[a-z0-9][a-z0-9_-]*`
- bundle basename 中出现空格、大写或不满足相应模式时 SHALL fail

#### Scenario: All instantiation rules pass

- **WHEN** 合法的 bundle surface 已完整创建
- **THEN** `check-gate-instantiation-complete.mjs` SHALL return `passed: true`

#### Scenario: Missing control file fails

- **WHEN** bundle 缺少 `rb_profile.yaml`
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` / `advice` SHALL 指向缺失文件

#### Scenario: Invalid bundle name fails

- **WHEN** bundle basename 含空格或不匹配 accepted naming pattern
- **THEN** gate SHALL return `passed: false`

#### Scenario: Disposable experiment name still passes instantiation contract

- **WHEN** bundle basename 为 `dpt_disp_<name>_<hex>`
- **THEN** instantiation gate SHALL 将其视为合法 disposable bundle naming
- **AND** SHALL NOT 因随机 hex suffix 误判为非法

#### Scenario: Status drift fails

- **WHEN** `rb_status.json` 中 `current_gate` 或 `next_gate` 偏离 instantiation 后的 accepted 值
- **THEN** gate SHALL return `passed: false`

### Requirement: HITL1 recorded gate rule set

`gate-hitl1-recorded.definition.json` SHALL 定义基于 `rb_profile.yaml` 的 HITL1 rules。

规则 SHALL 覆盖：
- `rb_profile.yaml` 存在
- `rb_profile.yaml` 可解析并通过 `ProfileSchema`
- `rb_profile.yaml#/research_profile` 不等于 `not_selected`
- `rb_profile.yaml#/root_must_answer_set` 非空
- `rb_profile.yaml#/human_decision_checkpoints/hitl1/status == recorded`
- `rb_profile.yaml#/human_decision_checkpoints/hitl1/recorded_at` 非空

#### Scenario: All HITL1 rules pass

- **WHEN** profile 文件存在、可解析、字段填写完整
- **THEN** `check-gate-hitl1-recorded.mjs` SHALL return `passed: true`

#### Scenario: Default research profile fails

- **WHEN** `research_profile` 仍为 `not_selected`
- **THEN** gate SHALL return `passed: false`

#### Scenario: Empty must-answer set fails

- **WHEN** `root_must_answer_set` 为空数组
- **THEN** gate SHALL return `passed: false`

#### Scenario: Missing recorded_at fails

- **WHEN** `human_decision_checkpoints.hitl1.recorded_at` 缺失或为空
- **THEN** gate SHALL return `passed: false`

### Requirement: Setup ready gate rule set

`gate-setup-ready.definition.json` SHALL 定义 setup structural consistency rules。

规则 SHALL 覆盖：
- `rb_plan.md`
- `rb_profile.yaml`
- `rb_status.json`
- `rb_queue.json`
- `rb_trace.jsonl`
- `seed_topics/`
- `reference/`
- `artifacts/`
- `_cache/`
- `final/`
- `rb_plan.md` 可解析并通过 `PlanSchema`
- `rb_profile.yaml` 可解析并通过 `ProfileSchema`
- `rb_status.json` 可解析并通过 `StatusSchema`
- `rb_queue.json` 可解析并通过 `QueueSchema`
- `rb_profile.yaml#/human_decision_checkpoints/hitl1/status == recorded`
- `rb_status.json#/current_gate == setup_ready`
- `rb_status.json#/next_gate == wave0_complete`
- bundle dir basename、`rb_plan.md#/plan_basename`、`rb_profile.yaml#/plan_basename` 归一化后保持一致

Gate SHALL NOT 判断研究质量、evidence coverage 或 synthesis adequacy。

归一化规则 SHALL 明确且唯一：
- `dpt_rb_<name>` -> `<name>`
- `dpt_disp_<name>_<hex>` -> `<name>`，其中 `<hex>` 必须为单个 `[0-9a-f]`
- 任何不匹配上述模式的 bundle basename 均视为 invalid bundle name
- 归一化后的 bundle basename 与两个 `plan_basename` 比较时 SHALL 使用 byte-for-byte equality；不得做大小写折叠、空白 trim 或二次 slug 化

#### Scenario: All setup rules pass

- **WHEN** bundle surface 完整、可解析、HITL1 已记录、basename 一致
- **THEN** `check-gate-setup-ready.mjs` SHALL return `passed: true`

#### Scenario: Missing scaffold directory fails

- **WHEN** `final/` 或其他 required scaffold 缺失
- **THEN** gate SHALL return `passed: false`

#### Scenario: Basename mismatch fails

- **WHEN** bundle dir basename、plan basename、profile basename 不一致
- **THEN** gate SHALL return `passed: false`

#### Scenario: Disposable basename normalization passes

- **WHEN** bundle 目录名为 `dpt_disp_wff_setup_a` 且 `rb_plan.md#/plan_basename == "wff_setup"` 且 `rb_profile.yaml#/plan_basename == "wff_setup"`
- **THEN** gate SHALL return `passed: true`

#### Scenario: Unparseable status fails

- **WHEN** `rb_status.json` 存在但 parse / schema validation 失败
- **THEN** gate SHALL return `passed: false`

### Requirement: Gate CLI evaluates instantiation rules from definition

`check-gate-instantiation-complete.mjs` SHALL 加载 `gate-instantiation-complete.definition.json`，遍历 rules 并执行真实 deterministic checks。

实现 SHALL 支持：
- `file_exists`
- `dir_exists`
- `pattern_match`
- `status_value`

实现 SHALL 复用 `gate-helpers.mjs` 的：
- `parseGateCliArgs`
- `loadGateDefinition`
- `validateNodeGateBinding`
- `resolveRouting`
- `buildGateResult`
- `emitGateResult`

#### Scenario: CLI evaluates complete instantiation rule set

- **WHEN** definition 中的任一 rule fail
- **THEN** CLI SHALL return `passed: false`
- **AND** SHALL NOT hardcode pass

### Requirement: Gate CLI evaluates HITL1 rules from definition

`check-gate-hitl1-recorded.mjs` SHALL 从 placeholder pass 升级为 definition-driven rule evaluation。

实现 SHALL 支持：
- `file_exists`
- `schema_valid`
- `field_non_empty`
- `field_value`

#### Scenario: HITL1 CLI no longer hardcoded pass

- **WHEN** `rb_profile.yaml` 缺字段、默认值未改或 HITL1 marker 未写入
- **THEN** CLI SHALL return `passed: false` with inspect/advice

### Requirement: Gate CLI evaluates setup rules from definition

`check-gate-setup-ready.mjs` SHALL 从 placeholder pass 升级为 definition-driven rule evaluation。

实现 SHALL 支持：
- `file_exists`
- `schema_valid`
- `dir_exists`
- `field_value`
- `status_value`
- `cross_field`

`cross_field` SHALL 用于 basename consistency，不得退化为 topic / research quality 检查。

#### Scenario: Setup CLI detects cross-file inconsistency

- **WHEN** plan / profile / bundle basename 不一致
- **THEN** CLI SHALL return `passed: false`
- **AND** `inspect` SHALL 指向 basename inconsistency

### Requirement: Gate CLIs return JSON feedback while experiments own trace verdict writing

pre-research gate CLIs SHALL 继续通过 stdout 返回标准 JSON gate result（`check / routing / inspect / advice`），并以 exit code 表达 pass/fail/config error。它们 SHALL 把真实 gate attempt 追加到 active bundle 的 `rb_trace.jsonl`，但 SHALL NOT 直接承担 experiment verdict trace 写入责任。

受 `guidelines/command-experiments.md` 约束的 playbook thin driver SHALL：
- 调用真实 gate CLI
- 解析 CLI JSON result
- 通过 `DPT_FRAMEWORK/engine/trace.mjs` 向 bundle 根 `_trace.jsonl` 追加 `event: "check"` trace entry
- 用 trace 中的 `check` events 形成最终 verdict

#### Scenario: CLI feedback and trace verdict stay separate

- **WHEN** experiment 执行某个 pre-research gate
- **THEN** gate CLI stdout SHALL 提供 machine-readable JSON result
- **AND** active bundle `rb_trace.jsonl` SHALL 记录对应 runtime audit entry
- **AND** `_trace.jsonl` 中对应的 `check` event SHALL 由 playbook driver 基于该真实 result 追加
- **AND** CLI SHALL NOT 通过 hand-written trace side effect 冒充 verdict authority

### Requirement: Runtime audit trace and experiment verdict trace remain distinct

`rb_trace.jsonl` SHALL remain the runtime audit surface；`_trace.jsonl` SHALL remain the command experiment verdict surface。两者都必须来自真实执行，但 authority 不同：
- `rb_trace.jsonl` 记录真实 gate attempt / runtime audit
- `_trace.jsonl` 记录 experiment verdict 所需的 `check` events

#### Scenario: Production gate writes runtime audit trace without experiment wrapper

- **WHEN** 用户在 production run bundle 上直接调用 pre-research gate CLI
- **THEN** `rb_trace.jsonl` SHALL 获得新的 runtime audit entry
- **AND** system SHALL NOT 要求存在 `_trace.jsonl` 才能留下 gate audit trail

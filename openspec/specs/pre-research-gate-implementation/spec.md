# Pre-Research Gate Implementation

> req: PRG-001, PRG-002, PRG-003, PRG-004, PRG-005, PRG-006, PRG-007, PRG-008, PRG-009

## Purpose

定义 `instantiation-complete`、`hitl1-recorded`、`setup-ready` 三个 gate 的真实 deterministic rule set 和 CLI 实现要求。所有规则都必须基于当前 accepted executable surface：现有 bundle files、现有 profile/status schema、现有 transition / gate helper contract。Gate 不做研究质量判断。
## Requirements
### Requirement: Instantiation complete gate rule set

`gate-instantiation-complete.definition.json` SHALL 定义当前 contract 下的 instantiation rules。

规则 SHALL 覆盖：
- bundle dir 存在
- bundle 目录名合法，且可用于 production run (`dpt_rb_*`) 或 disposable experiment (`dpt_disp_*`)
- `BUNDLE_MAP.md`
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
- `rb_status.json#/next_gate == seed_topics_ready`

The instantiation gate SHALL require `BUNDLE_MAP.md` for newly instantiated bundles and SHALL NOT require `START_FROM_HERE.md` as part of the current new-bundle gate contract.

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

#### Scenario: Missing bundle map fails

- **WHEN** a newly instantiated bundle lacks `BUNDLE_MAP.md`
- **THEN** gate SHALL return `passed: false`
- **AND** inspect/advice SHALL identify the missing bundle map

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

`gate-hitl1-recorded.definition.json` SHALL define HITL1 rules based on `rb_profile.yaml`.

Rules SHALL cover:

- `rb_profile.yaml` exists and passes `ProfileSchema`;
- `research_profile` is not `not_selected`;
- `root_must_answer_set` is non-empty;
- `human_decision_checkpoints.hitl1.status == recorded`;
- `human_decision_checkpoints.hitl1.recorded_at` is non-empty;
- `research_access.status == available` through the existing `field_value` check type.

The gate SHALL rely on `ProfileSchema` as the single validator for available-branch timestamp, HTTP(S) URL, and fetch-success consistency. It SHALL NOT add a dedicated research-access check type, duplicate cross-field validator, inspect command, degraded pass, or alternate Setup route.

Missing `research_access`, `unprobed`, and `unavailable` SHALL fail with deterministic advice that directs the Phase Agent to inspect the recorded reason when present, repair or switch the environment, and rerun the same HITL1 probe and gate. The gate SHALL NOT authorize Setup or any silent wave while research access is not available.

#### Scenario: All HITL1 rules pass with available access

- **WHEN** profile fields are complete and `research_access.status` is `available` with a schema-valid direct observation
- **THEN** `check-gate-hitl1-recorded.mjs` SHALL return `passed: true`

#### Scenario: Unprobed access fails through existing field-value routing

- **WHEN** `research_access` is missing or has `status: unprobed`
- **THEN** the gate SHALL return `passed: false`
- **AND** advice SHALL direct the Phase Agent to run the real HITL1 search/fetch probe

#### Scenario: Unavailable access stays at HITL1

- **WHEN** `research_access.status` is `unavailable` with a schema-valid reason
- **THEN** the gate SHALL return `passed: false`
- **AND** advice SHALL point to the recorded reason and the same-probe repair path
- **AND** routing SHALL NOT authorize Setup or any silent wave

#### Scenario: Fake available observation fails schema

- **WHEN** status is `available` but probe timestamp is invalid, result URL is not HTTP(S), or fetch outcome is not success
- **THEN** ProfileSchema/gate validation SHALL fail closed

#### Scenario: Gate audit uses the existing checker route

- **WHEN** the active gate-rule audit inventories `research_access_available`
- **THEN** it SHALL classify the rule as blocking and route it through the existing HITL1 `field_value` implementation
- **AND** no new checker implementation route SHALL be required

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
- `rb_status.json#/next_gate == seed_topics_ready`
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

### Requirement: HITL1 recorded gate status rules

`gate-hitl1-recorded.definition.json` SHALL include `status_current_gate` and `status_next_gate` rules, consistent with every other gate definition in the system.

The `status_current_gate` rule SHALL check `rb_status.json#/current_gate` equals `"hitl1_recorded"`.
The `status_next_gate` rule SHALL check `rb_status.json#/next_gate` equals `"setup_ready"`.

#### Scenario: HITL1 gate passes with correct status values

- **WHEN** `rb_status.json` has `current_gate: "hitl1_recorded"` and `next_gate: "setup_ready"`
- **AND** all other HITL1 rules pass (profile recorded, must_answer_set non-empty)
- **THEN** `check-gate-hitl1-recorded.mjs` SHALL return `passed: true`

#### Scenario: HITL1 gate fails on drifted next_gate

- **WHEN** `rb_status.json` has `next_gate: "wave0_complete"` (old chain value, before advance-status was called)
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL indicate `next_gate` mismatch with expected value `"setup_ready"`

### Requirement: Gate CLIs return JSON feedback while playbooks record verdict checks in the root trace

Pre-research gate CLIs SHALL continue to return standard machine-readable `check / routing / inspect / advice` JSON on stdout, use exit codes for pass/fail/config error, and append the real gate attempt to the active bundle's `rb_trace.jsonl`. They SHALL NOT manufacture the command-experiment verdict check.

A command-experiment Playbook Agent/thin driver SHALL invoke the real gate CLI, parse its JSON result, and use the accepted trace writer/helper to append a strict `event: check`, `source: playbook` row with stable case-owned gate ID and explicit boolean `passed`/`expected` to the same bundle-root `rb_trace.jsonl`. Native completion SHALL apply the V2 required-check and verdict-mode policy. No `_trace.jsonl`, console summary or hand-written alternate sink SHALL become verdict authority.

#### Scenario: CLI feedback and playbook verdict ownership stay distinct in one trace

- **WHEN** a command experiment invokes a pre-research gate
- **THEN** gate stdout SHALL provide machine-readable JSON and `rb_trace.jsonl` SHALL receive the real gate-attempt audit row
- **AND** the Playbook Agent/thin driver SHALL derive its separate strict verdict-check row from that real result in the same root trace
- **AND** native completion SHALL bind the root-trace prefix without treating gate side effects or console prose as required case checks

#### Scenario: CLI feedback and trace verdict stay separate

- **WHEN** a command experiment invokes a pre-research gate
- **THEN** gate stdout provides machine-readable JSON and `rb_trace.jsonl` receives the corresponding runtime audit row
- **AND** the Playbook Agent/thin driver writes the strict verdict `check` from that real result in the same root trace
- **AND** gate CLI side effects and console prose do not become verdict authority

### Requirement: Runtime audit events and experiment verdict checks share one trace without sharing authority

Bundle-root `rb_trace.jsonl` SHALL be the sole trace sink. Gate-owned `gate_attempt` rows remain runtime audit facts; strict playbook-owned `check` rows remain command-experiment verdict inputs. Event ownership and schema, not a second file, SHALL keep these authorities distinct.

#### Scenario: Production gate writes audit without an experiment wrapper

- **WHEN** an Agent invokes a pre-research gate directly on a production run bundle
- **THEN** `rb_trace.jsonl` SHALL receive the gate-attempt audit row
- **AND** no experiment verdict check, `_trace.jsonl`, finalizer or native completion SHALL be required merely to retain that production audit fact

#### Scenario: Production gate writes runtime audit trace without experiment wrapper

- **WHEN** an Agent invokes a pre-research gate directly on a production run bundle
- **THEN** `rb_trace.jsonl` receives the real gate-attempt audit row
- **AND** retaining that audit fact does not require an experiment verdict `check`, finalizer, or native completion

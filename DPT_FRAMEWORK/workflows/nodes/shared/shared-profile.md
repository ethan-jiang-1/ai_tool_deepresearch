---
node_type: shared
id: shared-profile
shared_scope: profile
authority: guidance-only
requires: []
suggested_context:
  - shared-schemas
---

# Shared: Profile (`rb_profile.yaml`)

## Purpose

说明 `rb_profile.yaml` 的当前字段、类型、填写时机、示例值和 Source of Record。此 node 是 Agent-readable guidance，不替代 schema 或 active bundle state。

## Field Reference

### `plan_basename`

- **类型**：`string`
- **填写时机**：bundle instantiation 时由 `instantiate-run-bundle.mjs` 写入，与 `rb_plan.md` frontmatter 的 `plan_basename` 一致
- **含义**：当前 run / experiment 的 canonical logical name
- **disposable bundle 注意**：目录名可能是 `dpt_disp_<plan_basename>_<hex>`，但 `plan_basename` 本身不包含 `dpt_disp_` 前缀或随机 hex suffix。例如目录 `dpt_disp_wff_setup_a3f2` 的 `plan_basename` 是 `wff_setup`
- **示例**：`"climate-policy"`、`"wff_setup"`

### `research_profile`

- **类型**：enum，当前 accepted 值为 `not_selected`、`quick_factual`、`exploratory_map`、`claim_verification`、`debug`
- **填写时机**：HITL1 phase，Agent 向用户展示选项后基于用户选择写入
- **默认值**（bundle 创建时）：`not_selected`
- **含义**：用户选择的研究深度/广度 profile
  - `quick_factual`：快速事实核查，轻量，单一维度
  - `exploratory_map`：探索性全景 mapping，覆盖面广但深度可控
  - `claim_verification`：对核心主张做 adversarial verification
  - `debug`：最低阈值，仅用于开发/测试（`user_visible: false`，HITL1 不展示，需手动设置）
- **gate 行为**：`hitl1-recorded` gate 检查此字段 ≠ `not_selected`

### `root_must_answer_set`

- **类型**：`string[]`
- **填写时机**：HITL1 phase
- **默认值**（bundle 创建时）：`[]`
- **含义**：用户明确要求必须回答的核心问题列表
- **gate 行为**：`hitl1-recorded` gate 检查此字段非空

### `research_access`

- **类型**：optional discriminated object，`status` 为 `unprobed`、`available` 或 `unavailable`
- **填写时机**：HITL1 bounded capability probe 后写入；旧 bundle 可以缺失
- **分支字段**：
  - `unprobed`：仅 `status`
  - `available`：`probed_at`、HTTP(S) `result_url`、`fetch_outcome: success`，可选 `search_surface` / `fetch_surface`
  - `unavailable`：`probed_at`、`fetch_outcome: failed|blocked|not_attempted`、非空 `reason`，可选 `result_url` / surface fields
- **authority**：只记录直接 probe observation，不是研究 evidence，也不证明未来 invocation 永远可用
- **selected adapter roots**：当前 HITL1 adapter 由 `DPT_FRAMEWORK/host_tools/research-access-adapter.md` 声明。该 adapter 无 callable native surface 时，`reason` 以 `surface_absent:` 开头；selected host policy 拒绝时，`reason` 以 `permission_required:` 开头。它们仍是现有 `reason` 的直接 observation，不是新 field、provider selection、permission grant 或 Gate authority。

### `research_style_params`

- **类型**：`object`（`ResearchStyleParamsSchema`），optional
- **填写时机**：HITL1 phase，Agent 运行 `apply-research-style.mjs` CLI 写入（见 phase-hitl1.md §3c）。Agent 不手写参数——CLI 是参数计算的唯一权威
- **默认值**（bundle 创建时）：不填充（key 存在但值为空，或 key 不存在）
- **含义**：当前研究风格的参数集——控制 Gate CLI 的 `count_floor` 动态阈值和 Phase MD 的 stop conditions。下游只读此 section，不读 YAML 源文件（profile 是单点真相）
- **子字段**：
  | 字段 | 类型 | 含义 |
  |------|------|------|
  | `user_visible` | `boolean` | 此风格是否在 HITL1 展示给用户 |
  | `wave0_per_topic_source_floor` | `positive integer` | Wave0 `count_floor` gate threshold — 每 topic foundation reference 的最低数量 |
  | `wave0_shared_ref_total` | `integer` | Wave0 跨 topic 共享 foundation reference 的全局总量（**computed by `apply-research-style.mjs`** — base + per_topic × topic_count） |
  | `wave1_per_topic_ref_floor` | `positive integer` | Wave1 `count_floor` gate threshold — 每 topic rich MD reference 的最低数量 |
  | `topic_unique_ratio` | `number [0,1]` | Wave1 new-source floor 的比例参数；`ceil(wave1_per_topic_ref_floor * topic_unique_ratio)`，minimum 1 |
  | `counterexample_search` | `boolean` | Wave1 Stop Condition 5 是否强制搜索 disconfirming evidence |
  | `cross_verification` | `boolean` | Wave1 Stop Condition 6 是否强制 cross-check claims |
  | `p0p1_independent_backing` | `positive integer` | P0/P1 findings 需要的最低独立 backing source 数量 |
  | `quality_min_tier` | `enum: tier_1..tier_4` | 最低 source quality tier（Agent guidance，非 gate enforced） |
  | `quality_min_substance` | `enum: substantive/thin/none` | 最低 source substance level（Agent guidance，非 gate enforced） |
  | `wave2_cross_topic_depth` | `integer` | Wave2 cross-topic scan matrix 中每 topic 至少连接的 topic 数（Agent guidance） |
  | `wave2_emergent_search_rounds` | `integer` | Wave2 每 topic emergent search 轮数（Agent guidance） |
- **gate 行为**：`hitl1-recorded` gate **不检查**此字段——内容正确性依赖 Agent discipline。但下游 gate CLI 读取这些 explicit params 做确定性检查：wave0/wave1 `count_floor` 动态阈值、Wave1 `new_source_floor`、Wave2 finding-index consistency / pure-synthesis eligibility。缺失 required parameter 必须诊断为 `missing_profile_parameter`，不得使用 hidden default。
- **示例**：
  ```yaml
  research_style_params:
    user_visible: true
    wave0_per_topic_source_floor: 12
    wave0_shared_ref_total: 18
    wave1_per_topic_ref_floor: 10
    topic_unique_ratio: 0.5
    counterexample_search: true
    cross_verification: true
    p0p1_independent_backing: 2
    quality_min_tier: tier_2
    quality_min_substance: substantive
    wave2_cross_topic_depth: 2
    wave2_emergent_search_rounds: 1
  ```

### `human_decision_checkpoints.hitl1.status`

- **类型**：enum，值为 `not_started`、`pending_user`、`recorded`、`blocked`、`not_applicable`
- **填写时机**：HITL1 phase，用户回答完毕后 Agent 写入 `recorded`
- **gate 行为**：`hitl1-recorded` gate 检查此字段 == `recorded`

### `human_decision_checkpoints.hitl1.recorded_at`

- **类型**：`string`（ISO 8601 timestamp），optional
- **填写时机**：HITL1 phase，与 `status: recorded` 同时写入
- **gate 行为**：`hitl1-recorded` gate 检查此字段非空

### `human_decision_checkpoints.hitl2.status`

- **类型**：enum，同 HITL1 status 值集（`not_started`、`pending_user`、`recorded`、`blocked`、`not_applicable`）
- **填写时机**：HITL2 phase，用户完成 structured final review decision 后 Agent 写入 `recorded`
- **默认值**（bundle 创建时）：`not_started`
- **gate 行为**：`hitl2-recorded` gate 检查此字段 == `recorded`

### `human_decision_checkpoints.hitl2.user_decision`

- **类型**：enum；pre-decision sentinel 为 `not_started`，recorded actions 为 `proceed_to_readiness`、`request_view_revision`、`repair`、`rerun`、`stop_blocked`
- **填写时机**：HITL2 phase，用户从 5 个 structured decision 中选择后 Agent 写入
- **默认值**（bundle 创建时）：`not_started`
- **含义**：
  - `proceed_to_readiness`：用户确认研究完整，进入 readiness 确定性检查
  - `request_view_revision`：用户要求修改某个 wave 的 view（Agent 读取 rationale 决定回到哪个 phase）
  - `repair`：当前 run 有需要修复的问题，Agent 就地修复后 rerun 当前 gate，不重启 lifecycle
  - `rerun`：用户想调整方向/补充内容/改模式；HITL2 gate emits `check.next: phases/phase-rerun.md`，Agent 通过 accepted handoff 进入 rerun node
  - `stop_blocked`：用户判定研究阻塞，终止 lifecycle
- **gate 行为**：`hitl2-recorded` gate 检查此字段非空且在合法枚举中

### `human_decision_checkpoints.hitl2.rationale`

- **类型**：optional `string`（自由文本）
- **填写时机**：HITL2 phase，与 user_decision 同时写入
- **含义**：用户 decision 的理由或补充说明
- **gate 行为**：不强制检查（optional field），但建议填写以帮助 Agent 理解后续修复方向

### `human_decision_checkpoints.hitl2.answerability_class`

- **类型**：enum，值为 `not_assessed`、`ready_substantive`、`ready_insufficient_judgment`、`blocked_repair_required`
- **填写时机**：HITL2 phase，用户评估当前研究产出的 answerability 后写入
- **含义**：
  - `ready_substantive`：研究产出足以支撑实质性回答
  - `ready_insufficient_judgment`：研究产出存在但判断依据不足
  - `blocked_repair_required`：必须修复才能继续
- **gate 行为**：不强制检查（Agent advisory field），但影响 `user_decision` 的选择合理性

### `human_decision_checkpoints.hitl2.final_report_view`

- **类型**：enum，值为 `not_started`、`profile_default`、`executive_brief`、`evidence_map`、`claim_judgment`、`technical_deep_dive`、`custom`
- **填写时机**：HITL2 phase，用户选择期望的 final report 视角
- **默认值**（bundle 创建时）：`not_started`
- **含义**：控制 `phase-final.md` 中 Agent 生成 final report 的格式和侧重点
- **gate 行为**：不强制检查，但 final phase 读此字段决定报告结构

### `human_decision_checkpoints.hitl2.custom_slug`

- **类型**：`string`，optional
- **填写时机**：HITL2 phase，仅当 `final_report_view == custom` 时填写
- **含义**：用户自定义的报告视角标识符

### `human_decision_checkpoints.hitl2.rerun_count`

- **类型**：optional non-negative integer，schema default 为 `0`
- **owner**：`phase-rerun.md` 负责递增；HITL2 写 decision 时必须 preserve 现有值
- **含义**：已进入 rerun node 的次数，用于 accepted max-rerun behavior；不是 Agent 可任意重置的展示计数

## Authority Boundary

- **Schema authority**：`DPT_FRAMEWORK/schema/contracts/profile.mjs`（`ProfileSchema`）
- **Runtime truth**：当前 active bundle 的 `rb_profile.yaml`
- **此 node 的角色**：Agent-readable 字段说明；与 schema 或 runtime state 冲突时以后两者为准
- **此 node 不能替代**：`ProfileSchema` 的 Zod 校验、gate CLI 的 `schema_valid` / `field_value` 检查

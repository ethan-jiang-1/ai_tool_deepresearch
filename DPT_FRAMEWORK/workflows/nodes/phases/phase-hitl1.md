---
node_type: phase
id: phase-hitl1
phase: hitl1
gate: hitl1-recorded
stop: "yes"
execution_contract:
  surface: phase-agent
  search_policy: capability_probe_only
requires:
  - shared/shared-profile
  - shared/shared-agent-ux-guidance
suggested_context:
  - brief/hitl1
---

# Phase: HITL1 (Human-in-the-Loop 1)

## 0. Execution Brief

- **Objective**: Collect the user's research profile, root must-answer set, and HITL1 constraints, then confirm current research access before silent execution.
- **Start here**: Read `brief/hitl1.md`, the original question, `rb_plan.md`, and `rb_profile.yaml`.
- **Path to pass**: Present the HITL1 prompt, wait for the user's answer, atomically apply approved canonical topics and UID-bound seeds, write profile/style decisions, run one bounded real research-access probe, then run the HITL1 gate.
- **Completion check**: User input and a schema-valid available research-access observation are recorded in `rb_profile.yaml`, and `check-gate-hitl1-recorded.mjs` passes.
- **Failure posture**: Do not invent user choices or capability success. If access is unavailable, preserve recorded choices, explain the blocker, and rerun the same probe and gate only after the environment is repaired or the user requests another attempt.

## 1. Stage Goal

向用户提出结构化问题，收集 research profile、root must-answer set 和用户约束，将回答持久化写入 active bundle 的 `rb_profile.yaml`，并在进入 silent waves 前确认当前 Agent 环境具备一次真实 search + fetch 能力。

## 2. Required Inputs

- 已实例化的 run bundle（来自 instantiation phase）
- `shared-profile.md`（`rb_profile.yaml` 字段说明）

## 3. Allowed Actions

### 3a. Topic Rewrite（用户输入展开）

用户原始 research question 可能是详细 brief，也可能只有一句话。在问 HITL 问题之前，Agent 必须先确保有一个够好的 original topic 作为后续 seed topics、wave 分配、evidence coverage 的基础。

**判断输入详细程度：**
- 读用户原始输入（来自 conversation context）
- 一句话（如 "帮我研究 AI 安全"）→ 执行 topic rewrite
- 详细 brief（含明确范围、维度、约束）→ 可直接使用，仍建议做轻量整理

**Topic rewrite 步骤（一句话场景）：**
1. 将一句话展开为 structured original topic，覆盖：背景（这个领域为什么重要）、研究范围（边界在哪）、关键维度（从哪些角度切入）、已知前提（已有的共识）、不确定项（需要 research 回答的 open questions）
2. 将 original topic 写入 `rb_plan.md` 的 `## Goal` section。至少填写 `### Purpose`（一段话概述研究目标）。`### Research Questions` 和 `### Scope` 按 HITL1 用户提供的信息填写——信息不足时标注 `(待 HITL2 确认)`，不编造。
3. 从 original topic 推导初始 topic preview（3-5 个可独立研究的子话题），用户确认前不直接写 `topic_registry` 或 seed 文件
4. 将 original topic + seed topics + 建议的 `research_profile` 一起展示给用户

**Slug 命名约定：** 每个 topic 的 `slug` 格式为 `NN_<descriptive-name>`，`NN` 为该 topic 在 `topic_registry` 数组中的 1-based 位置（两位零填充），**不是** `id` 字段的值。`id` SHOULD 与 NN 一致（如 `"01"`），gate 不校验 id 格式——这是 convention 层面的统一。

例如，`topic_registry` 中 3 个 topic 的 slug 写法：

```yaml
topic_registry:
  - id: "01"
    slug: "01_meal-timing-blood-glucose-insulin"
    title: "Meal Timing & Blood Glucose/Insulin"
  - id: "02"
    slug: "02_front-vs-back-calorie-loading"
    title: "Front vs Back Calorie Loading & Weight"
  - id: "03"
    slug: "03_late-eating-metabolic-syndrome"
    title: "Late Eating & Metabolic Syndrome"
```

`NN` 取自数组位置（第 1 个 topic → `01_`，第 2 个 → `02_`，以此类推），与 `id` 字段值无关。如果 `id` 字段写作 `t1`/`t2`，slug 仍用数组位置 `01_`/`02_`。

用户确认后，Agent 把完整 approved topic set 写入 caller-owned retained JSON，并运行一次 `operate-topic-state.mjs apply`。Engine 在 legal HITL1 current-node/status window 中分配 immutable UID/ordinal/slug，并用一个 prepared manifest 提交最终 registry 与全部 UID-bound seed skeletons。若返回 accepted workspace，Agent 运行 exact recover command 后重试；不得直接编辑 registry/seed。

**Gate 不判断 rewrite 质量。** 人类审查 topic semantics；Engine 验证 canonical identity/intent、UID-bound seed projection、workspace completion 与既有 profile/access contract。

### 3b. HITL1 问题收集

**Prompt 文本来源**：Agent SHALL 从 `brief/hitl1.md` 读取 HITL1 入口 prompt 精确文本，不动模板文字。

**操作步骤**：
1. 读取 `brief/hitl1.md` 的「入口 Prompt」节
2. 填入动态部分：
   - `{DYNAMIC: topic_rewrite_result}` → 从 §3a topic rewrite 结果提取
   - `{DYNAMIC: seed_topics_preview}` → 从 `rb_plan.md` topic_registry 生成简短预览
3. 向用户展示完整的入口 prompt
4. 遵循 `shared-agent-ux-guidance.md` 的环内行为规则——用户可以直接选字母，也可以问问题、对比选项、表达不确定
5. 用户显式确认后：
   - 将 `research_profile` 写入 `rb_profile.yaml`（字母→canonical enum 翻译）
   - 将 `root_must_answer_set` 写入 `rb_profile.yaml`
   - 将 `search_preference` 写入 `rb_profile.yaml`（如果用户提供；否则记录 `not_specified_use_profile_defaults`，**不追问**）
   - 将 `human_decision_checkpoints.hitl1.status` 设为 `recorded`
   - 将 `human_decision_checkpoints.hitl1.recorded_at` 设为当前 ISO 8601 timestamp
   - 写 retained topic-state input 并运行 `operate-topic-state apply`；普通 apply/recover 命令由 Agent 执行，不要求用户共同运行

### 3c. Research Style Parameters（研究风格参数应用）

用户选择 `research_profile` 后，Agent MUST 运行 **`apply-research-style.mjs` CLI** 将对应研究风格的参数写入 `rb_profile.yaml`。该 CLI 是参数计算的**唯一权威**——Agent 不读 JSON style 文件、不做乘法、不手写参数。

**操作步骤：**

1. **跑 CLI**：
   ```bash
   node DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle <path> --style <research_profile>
   ```
   例如 `--style claim_verification`。CLI 自动读取 `topic_registry` 长度、计算 topic-count-dependent 值（如 `wave0_shared_ref_total`）、将所有参数写入 `rb_profile.yaml#/research_style_params`、更新 `research_profile` 字段。

2. **验证输出**：读 stdout JSON。确认：
   - `applied` 匹配用户选择的 profile
   - `topic_count` 匹配 `rb_plan.md` 中的 topic_registry 长度
   - `wave0_shared_ref_total` 在合理范围（例如 `claim_verification` 3 个 topic 应为 `12`；若 topic_count=0 则只等于 base 值 `6`——这是合法的，后续 seed-topics 物化后 topic_count 会更新）
   - exit code = 0（非 0 → 读 stderr → 排查原因 → 重跑）

3. **无需自检参数一致性**：CLI 是 JS 确定性计算——同一个 style JSON + 同一个 topic_count 一定产出相同结果。参数正确性由 CLI 保证，不由 Agent 自检保证。

**风格选项展示**：向用户展示 research profile 选项时，只展示 `user_visible: true` 的风格（`quick_factual`、`exploratory_map`、`claim_verification`）。`debug` 风格 (`user_visible: false`) 不展示——仅用于开发/测试。

**参数不被 gate 二次验证**：`research_style_params` 的正确性依赖 CLI 的确定性计算——HITL1 gate 只验证 `research_profile ≠ not_selected`，不对比 JSON 源文件与 profile 内容是否一致。`apply-research-style.mjs` 是参数 computation 的 trust root，其输出由测试保证正确性。

### 3d. Research Access Probe（进入 silent waves 前的能力确认）

Research style CLI 成功后，Agent MUST 使用当前环境的实际 search/fetch surfaces 执行一个短而固定的 capability probe。`execution_contract.search_policy: capability_probe_only` 只授权这个 probe；它不授权 research evidence collection、work-unit delegation 或 Wave work。

**固定顺序：**

1. 使用实际 search surface 发起**至多一次 neutral capability-only search**。Query 只用于确认工具可用，不用于当前 research topic 的证据收集。
2. 按 search surface 返回顺序取**第一个 usable HTTP(S) result**。不评价来源质量，不跳到第二个站点，不建立候选 URL 列表。
3. 若有 usable URL，使用实际 fetch surface 对该 URL 发起**至多一次 fetch**。只有返回真实 page content 才算 success；snippet、搜索摘要、mock response 或手写文本都不算。
4. 将直接 observation 写入 `rb_profile.yaml#/research_access`，然后运行同一个 `hitl1-recorded` gate。

**Observation branches：**

- Search surface 缺失、search 调用失败/被阻止、无 usable HTTP(S) result，或 fetch surface 在调用前缺失：
  ```yaml
  research_access:
    status: unavailable
    probed_at: <ISO 8601 timestamp>
    fetch_outcome: not_attempted
    reason: <direct non-empty reason>
  ```
- Search 返回 usable URL，但实际 fetch 被阻止或失败：写 `status: unavailable`、该 `result_url`、`fetch_outcome: blocked | failed` 和直接 `reason`。
- Search 返回 usable URL 且实际 fetch 返回 page content：
  ```yaml
  research_access:
    status: available
    probed_at: <ISO 8601 timestamp>
    result_url: <HTTP(S) URL from this search>
    fetch_outcome: success
  ```

`search_surface` / `fetch_surface` MAY 记录当前工具名称作 audit label，但不是 gate-required facts。不要记录 query history、response body、HTTP status matrix、retry list 或 derived gate verdict。

**Unavailable recovery：** 保留已记录的 `research_profile`、`root_must_answer_set`、style params 和 `hitl1.status: recorded`。明确告诉用户当前环境无法启动 evidence-backed waves；修复/切换环境或用户要求再次尝试后，重跑本节同一 bounded probe 和同一 gate，不要求用户重复回答 HITL1 choices。

**Evidence boundary：** Probe URL、page content 和 tool output SHALL NOT 写入或计入 `reference/`、`_cache/`、`artifacts/`、work-unit output/result/receipt、`rb_work_unit_ledger.jsonl`、`rb_output_declarations.jsonl` 或任何 Wave coverage/count floor。

## 4. Expected Artifacts

`rb_profile.yaml` 中以下字段已写入：

### Payload Checklist（HITL1 最小写入 contract）

| 字段 | 路径 | 要求 |
|------|------|------|
| `plan_basename` | `rb_profile.yaml#/plan_basename` | 已由 instantiation 写入，确认未被误改 |
| `research_profile` | `rb_profile.yaml#/research_profile` | ≠ `not_selected`；用户从 `quick_factual`、`exploratory_map`、`claim_verification` 中选择 |
| `root_must_answer_set` | `rb_profile.yaml#/root_must_answer_set` | 非空字符串数组 |
| `research_style_params` | `rb_profile.yaml#/research_style_params` | 由 `apply-research-style.mjs` CLI 写入（见 §3c 步骤 1-3），Agent 不手写参数。CLI 后验证 stdout 中的 `applied`、`topic_count`、`wave0_shared_ref_total` 值 |
| `research_access.status` | `rb_profile.yaml#/research_access/status` | `available` 才能通过 HITL1 gate；`unprobed` / `unavailable` 留在 HITL1 |
| available path | `rb_profile.yaml#/research_access/{probed_at,result_url,fetch_outcome}` | ISO timestamp + HTTP(S) URL + `fetch_outcome: success` |
| unavailable path | `rb_profile.yaml#/research_access/{probed_at,fetch_outcome,reason}` | ISO timestamp + `failed | blocked | not_attempted` + 非空直接原因 |
| `hitl1.status` | `rb_profile.yaml#/human_decision_checkpoints/hitl1/status` | = `recorded` |
| `hitl1.recorded_at` | `rb_profile.yaml#/human_decision_checkpoints/hitl1/recorded_at` | 非空 ISO 8601 timestamp |

Optional `research_access.search_surface` / `fetch_surface` 只作 audit label，不是 gate-required facts。该 checklist 是 review surface；`ProfileSchema` 和 gate definition 仍是 machine authority。

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle <path> --current-node phases/phase-hitl1.md
```

## 6. On Gate Pass

1. **发送 HITL1 出口语**：从 `brief/hitl1.md` 的「出口语」节读取模板文字，告知用户即将进入静默自主执行阶段（Setup → Seed Topics → Wave 0 → Wave 1 → Wave 2），期间不会浮出水面，可以关闭终端，下次见面是 HITL2
2. 读取 `check.next`。Advance to `setup`：加载 `phase-setup.md`。

## 7. On Gate Fail

读取 CLI 返回的 `inspect` / `advice`，补充缺失字段或修正默认值后 rerun same gate。常见 fail 原因：
- `research_profile` 仍为 `not_selected` → 确认用户选择后写入
- `root_must_answer_set` 为空 → 确认用户 must-answer 问题后写入
- `research_style_params` 缺失或不完整 → 重新运行 `apply-research-style.mjs` CLI
- canonical topic-state workspace/seed binding fail → 运行返回的 exact recover/repair action，再重跑同一 gate
- `research_access` 缺失或仍为 `unprobed` → 按 §3d 运行真实 bounded probe
- `research_access.status` 为 `unavailable` → 读取 `research_access.reason`，保留用户 choices，修复/切换环境后重跑同一 probe 和 gate；不得进入 Setup
- `research_access.status` 为 `available` 但 schema invalid → 修正 timestamp/HTTP(S) URL/fetch outcome 的直接 observation；不得伪造 success
- `hitl1.status` 不是 `recorded` → 写入 `recorded`
- `hitl1.recorded_at` 缺失 → 写入当前时间戳

## 8. Stop Behavior

`stop: yes` — Agent MUST 暂停执行，等待用户回答结构化问题。用户回答完毕并写入 bundle 后，运行 gate 继续。

`stop: yes` 只意味着等待用户输入，不意味着豁免 deterministic check。用户回答后，仍必须运行 `hitl1-recorded` gate。

若 probe 记录 `unavailable`，Agent 保持 HITL1，向用户暴露 blocker；用户 choices 保留，后续只重跑同一 bounded probe 和 gate。

## 9. Anti-Cheating Rules

- **用户回答 MUST 写入 `rb_profile.yaml`**，不能只停留在 chat memory
- **禁止在用户未回答时填写 placeholder 或假数据**：不能编造 `research_profile`、`root_must_answer_set` 等内容让 gate pass
- **禁止跳过 HITL1 直接进入 setup**：`stop: yes` 意味着必须等待用户
- **禁止 direct registry edit 或 seed-only identity**：approved topics 必须走 topic-state apply；context/`human-directed` 不创造 mutation permission
- **禁止写入不存在的字段路径**：HITL1 结果写入 `rb_profile.yaml` 的 `human_decision_checkpoints.hitl1.*`；不要写入不存在的 `rb_status.json#/phases/hitl1/*`
- **禁止用 mock/fixed URL/搜索摘要/手写 page content 声称 `research_access.status: available`**：available 只能来自当次实际 search 返回的 URL 和实际 fetch page content
- **禁止把 probe 当 research evidence**：Probe URL/content/tool output 不得进入 reference、cache、artifact、work-unit、ledger、output declaration 或 Wave coverage
- **禁止自动 retry tree**：一次 attempt 至多一次 search 和一次 fetch；失败后只在环境修复或用户要求再次尝试时重跑同一 probe
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl1 START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl1 END — <summary>"` |

---
node_type: phase
id: phase-hitl1
phase: hitl1
gate: hitl1-recorded
stop: "yes"
execution_contract:
  surface: phase-agent
  search_policy: no_search
requires:
  - shared/shared-profile
  - shared/shared-agent-ux-guidance
suggested_context:
  - brief/hitl1
---

# Phase: HITL1 (Human-in-the-Loop 1)

## 0. Execution Brief

- **Objective**: Collect the user's research profile, root must-answer set, and HITL1 constraints into durable bundle state.
- **Start here**: Read `brief/hitl1.md`, the original question, `rb_plan.md`, and `rb_profile.yaml`.
- **Path to pass**: Present the HITL1 prompt, wait for the user's answer, write profile decisions and style parameters, then run the HITL1 gate.
- **Completion check**: User input is recorded in `rb_profile.yaml` and `check-gate-hitl1-recorded.mjs` passes.
- **Failure posture**: Because `stop: yes`, do not invent missing user choices; ask/repair only around real user input and gate feedback.

## 1. Stage Goal

向用户提出结构化问题，收集 research profile、root must-answer set 和用户约束，并将回答持久化写入 active bundle 的 `rb_profile.yaml`。

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
3. 从 original topic 推导初始 seed topics（3-5 个可独立研究的子话题）→ 写入 `rb_plan.md` frontmatter 的 `topic_registry`；**物化动作（创建 `seed_topics/<slug>.md`）已移至下游 `phase-seed-topics`**——HITL1 只写 registry，不创建 seed topic 文件，避免职责重叠
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

**Gate 不判断 rewrite 质量。** `hitl1-recorded` gate 只做 structural 校验（`PlanSchema` 可解析、`topic_registry` 非空）。Original topic 是否合理、seed topics 是否覆盖关键维度——这是人类在 HITL1 审查的事。

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

## 4. Expected Artifacts

`rb_profile.yaml` 中以下字段已写入：

### Payload Checklist（HITL1 最小写入 contract）

| 字段 | 路径 | 要求 |
|------|------|------|
| `plan_basename` | `rb_profile.yaml#/plan_basename` | 已由 instantiation 写入，确认未被误改 |
| `research_profile` | `rb_profile.yaml#/research_profile` | ≠ `not_selected`；用户从 `quick_factual`、`exploratory_map`、`claim_verification` 中选择 |
| `root_must_answer_set` | `rb_profile.yaml#/root_must_answer_set` | 非空字符串数组 |
| `research_style_params` | `rb_profile.yaml#/research_style_params` | 由 `apply-research-style.mjs` CLI 写入（见 §3c 步骤 1-3），Agent 不手写参数。CLI 后验证 stdout 中的 `applied`、`topic_count`、`wave0_shared_ref_total` 值 |
| `hitl1.status` | `rb_profile.yaml#/human_decision_checkpoints/hitl1/status` | = `recorded` |
| `hitl1.recorded_at` | `rb_profile.yaml#/human_decision_checkpoints/hitl1/recorded_at` | 非空 ISO 8601 timestamp |

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
- `hitl1.status` 不是 `recorded` → 写入 `recorded`
- `hitl1.recorded_at` 缺失 → 写入当前时间戳

## 8. Stop Behavior

`stop: yes` — Agent MUST 暂停执行，等待用户回答结构化问题。用户回答完毕并写入 bundle 后，运行 gate 继续。

`stop: yes` 只意味着等待用户输入，不意味着豁免 deterministic check。用户回答后，仍必须运行 `hitl1-recorded` gate。

## 9. Anti-Cheating Rules

- **用户回答 MUST 写入 `rb_profile.yaml`**，不能只停留在 chat memory
- **禁止在用户未回答时填写 placeholder 或假数据**：不能编造 `research_profile`、`root_must_answer_set` 等内容让 gate pass
- **禁止跳过 HITL1 直接进入 setup**：`stop: yes` 意味着必须等待用户
- **禁止写入不存在的字段路径**：HITL1 结果写入 `rb_profile.yaml` 的 `human_decision_checkpoints.hitl1.*`；不要写入不存在的 `rb_status.json#/phases/hitl1/*`
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl1 START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl1 END — <summary>"` |

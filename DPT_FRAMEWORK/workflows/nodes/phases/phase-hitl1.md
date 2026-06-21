---
node_type: phase
id: phase-hitl1
phase: hitl1
gate: hitl1-recorded
stop: "yes"
requires:
  - shared/shared-profile
suggested_context: []
---

# Phase: HITL1 (Human-in-the-Loop 1)

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
2. 将 original topic 写入 `rb_plan.md` 正文（Markdown body，非 frontmatter）
3. 从 original topic 推导初始 seed topics（3-5 个可独立研究的子话题）→ 写入 `rb_plan.md` frontmatter 的 `topic_registry`；**物化动作（创建 `seed_topics/<slug>.md`）已移至下游 `phase-seed-topics`**——HITL1 只写 registry，不创建 seed topic 文件，避免职责重叠
4. 将 original topic + seed topics + 建议的 `research_profile` 一起展示给用户

**Gate 不判断 rewrite 质量。** `hitl1-recorded` gate 只做 structural 校验（`PlanSchema` 可解析、`topic_registry` 非空）。Original topic 是否合理、seed topics 是否覆盖关键维度——这是人类在 HITL1 审查的事。

### 3b. HITL1 问题收集

- 向用户展示结构化 HITL1 问题面（见下方 checklist）
- 基于用户回答选择 `research_profile` enum 值
- 将 `root_must_answer_set` 写入 `rb_profile.yaml`
- 将 `human_decision_checkpoints.hitl1.status` 设为 `recorded`
- 将 `human_decision_checkpoints.hitl1.recorded_at` 设为当前 ISO 8601 timestamp

## 4. Expected Artifacts

`rb_profile.yaml` 中以下字段已写入：

### Payload Checklist（HITL1 最小写入 contract）

| 字段 | 路径 | 要求 |
|------|------|------|
| `plan_basename` | `rb_profile.yaml#/plan_basename` | 已由 instantiation 写入，确认未被误改 |
| `research_profile` | `rb_profile.yaml#/research_profile` | ≠ `not_selected`；用户从 `quick_factual`、`exploratory_map`、`claim_verification` 中选择 |
| `root_must_answer_set` | `rb_profile.yaml#/root_must_answer_set` | 非空字符串数组 |
| `hitl1.status` | `rb_profile.yaml#/human_decision_checkpoints/hitl1/status` | = `recorded` |
| `hitl1.recorded_at` | `rb_profile.yaml#/human_decision_checkpoints/hitl1/recorded_at` | 非空 ISO 8601 timestamp |

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle <path> --current-node phases/phase-hitl1.md
```

## 6. On Gate Pass

读取 `check.next`。Advance to `setup`：加载 `phase-setup.md`。

## 7. On Gate Fail

读取 CLI 返回的 `inspect` / `advice`，补充缺失字段或修正默认值后 rerun same gate。常见 fail 原因：
- `research_profile` 仍为 `not_selected` → 确认用户选择后写入
- `root_must_answer_set` 为空 → 确认用户 must-answer 问题后写入
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

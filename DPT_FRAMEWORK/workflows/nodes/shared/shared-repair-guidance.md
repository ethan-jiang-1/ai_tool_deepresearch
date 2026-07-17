---
node_type: shared
id: shared-repair-guidance
shared_scope: repair
authority: guidance-only
requires: []
suggested_context:
  - shared-gate-rules
---

# Shared: Repair Guidance

## Purpose

为 Agent 提供 gate failure 后的通用 repair posture、retry limit、diagnostic escalation 规则和各 check type 的修复方向。

## Standard Repair Loop

```
gate fail → 读取 CLI 返回的 inspect / advice → 针对性 repair → rerun same gate
```

- **不要跳过**：先读 CLI 的 `inspect`（诊断）和 `advice`（方向），再决定修什么
- **不要盲目修**：针对具体 fail 的 rule 修，不要全局重做
- **rerun same gate**：修完后重新运行同一个 gate CLI，不要跳到下一个 gate

## Retry Limit

- **默认 retry limit**：3 次
- 同一 gate 连续 3 次 repair 后仍 fail → **diagnostic escalation**：写入 trace/log 诊断，换策略、缩小修复面、关闭/重试 work unit，或在当前 legal phase 静默 hold。
- No-progress（连续 repair 但 inspect 输出不变）→ diagnostic escalation，不等满 3 次。

## Responsibility and Placement

Retry exhaustion, a missing decision/permission, a non-fabricable prerequisite, or a structural blocker assigns the next repair responsibility; it does not decide where interaction occurs. The current loaded node's `stop` contract alone places interaction.

In non-terminal `stop: no` phases, record accepted diagnostics, change strategy, use a legal handoff, or hold at the latest legal phase. Do not initiate a question, status, acknowledgement, phase bypass, `final/` write, or manual status edit. A direct factual answer to a user-initiated current turn adds no checkpoint, permission, mutation, route, or reentry authority. At HITL1/HITL2, ask only for the semantic decision that the active checkpoint legally owns.

## Repair Direction by Check Type

| Check Type | Fail 含义 | 修复方向 |
|-----------|----------|---------|
| `file_exists` | 目标文件不存在 | 创建该文件（按 spec 或 template 的约定内容） |
| `dir_exists` | 目标目录不存在 | 创建该目录（`mkdir`） |
| `pattern_match` | bundle name 不匹配 accepted naming pattern | **fail-stop**：重新 instantiate 合法命名的 bundle，不 rename 或 patch |
| `schema_valid` | 文件存在但 parse/Zod 校验失败 | 读取 `inspect` 中的 Zod error detail，修正对应字段 |
| `field_non_empty` | 目标字段为默认值或空 | 填入合法值（如 HITL1 后 `research_profile` 不能为 `not_selected`） |
| `field_value` | 目标字段值与期望不符 | 确认正确的值后写入（如 `hitl1.status` 必须是 `recorded`） |
| `status_value` | `rb_status.json` 的 `current_gate`/`next_gate` 与预期不符 | 检查是否 phase 顺序错乱或 status 被手动修改；通过合法 predecessor gate pass、route-bound `enter-phase`, and `advance-status` 修复 witness chain。不要手改 `rb_status.json` 来制造通过。 |
| `cross_field` | 多个文件间的字段不一致（如 basename） | 以 `plan_basename` in `rb_plan.md` + `rb_profile.yaml` 为准；若 bundle dir 命名不匹配→fail-stop 重新 instantiate |

## Authority Boundary

- **Retry limit runtime 值**：`rb_profile.yaml`（如有配置）或默认 3
- **Escalation/block 记录**：写入 accepted trace/log diagnostic；status 只能由合法 lifecycle tool path 更新
- **此 node 的角色**：通用 repair 姿势指导；具体 gate 的修复细节以该 gate CLI 的 `inspect`/`advice` 输出为准
- **此 node 不是**：任何具体 gate 的隐藏修复脚本；不替代 CLI feedback

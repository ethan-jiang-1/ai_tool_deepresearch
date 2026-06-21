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

为 Agent 提供 gate failure 后的通用 repair posture、retry limit、escalation 规则和各 check type 的修复方向。

## Standard Repair Loop

```
gate fail → 读取 CLI 返回的 inspect / advice → 针对性 repair → rerun same gate
```

- **不要跳过**：先读 CLI 的 `inspect`（诊断）和 `advice`（方向），再决定修什么
- **不要盲目修**：针对具体 fail 的 rule 修，不要全局重做
- **rerun same gate**：修完后重新运行同一个 gate CLI，不要跳到下一个 gate

## Retry Limit

- **默认 retry limit**：3 次
- 同一 gate 连续 3 次 repair 后仍 fail → **escalation**，记录到 `rb_trace.jsonl` 和 `rb_status.json`
- No-progress（连续 repair 但 inspect 输出不变）→ escalation，不等满 3 次

## Escalation

以下情况触发 escalation/block：
- 连续 repair 达到 retry limit 且无进展
- 修复需要用户 decision 或权限（如 `plan_basename` 不一致需要用户确认是否重新 instantiate）
- 无法不造假继续（如 gate 要求 `research_profile != not_selected` 但用户未回答 HITL1）
- 结构性 blocker（如 `DPT_FRAMEWORK/` 文件缺失或破坏）

Escalation MUST 记录到 `rb_status.json`（state → `blocked`）和 `rb_trace.jsonl`（gate attempt entry with escalation detail）。

## Repair Direction by Check Type

| Check Type | Fail 含义 | 修复方向 |
|-----------|----------|---------|
| `file_exists` | 目标文件不存在 | 创建该文件（按 spec 或 template 的约定内容） |
| `dir_exists` | 目标目录不存在 | 创建该目录（`mkdir`） |
| `pattern_match` | bundle name 不匹配 accepted naming pattern | **fail-stop**：重新 instantiate 合法命名的 bundle，不 rename 或 patch |
| `schema_valid` | 文件存在但 parse/Zod 校验失败 | 读取 `inspect` 中的 Zod error detail，修正对应字段 |
| `field_non_empty` | 目标字段为默认值或空 | 填入合法值（如 HITL1 后 `research_profile` 不能为 `not_selected`） |
| `field_value` | 目标字段值与期望不符 | 确认正确的值后写入（如 `hitl1.status` 必须是 `recorded`） |
| `status_value` | `rb_status.json` 的 `current_gate`/`next_gate` 与预期不符 | 检查是否 phase 顺序错乱或 status 被手动修改；如 status drift 但 surface 正确，更新 status 为正确值 |
| `cross_field` | 多个文件间的字段不一致（如 basename） | 以 `plan_basename` in `rb_plan.md` + `rb_profile.yaml` 为准；若 bundle dir 命名不匹配→fail-stop 重新 instantiate |

## Authority Boundary

- **Retry limit runtime 值**：`rb_profile.yaml`（如有配置）或默认 3
- **Escalation/block 记录**：必须写入 `rb_status.json` 和 `rb_trace.jsonl`
- **此 node 的角色**：通用 repair 姿势指导；具体 gate 的修复细节以该 gate CLI 的 `inspect`/`advice` 输出为准
- **此 node 不是**：任何具体 gate 的隐藏修复脚本；不替代 CLI feedback

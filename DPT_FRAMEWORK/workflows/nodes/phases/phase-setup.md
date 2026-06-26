---
node_type: phase
id: phase-setup
phase: setup
gate: setup-ready
stop: "no"
requires:
  - shared/shared-profile
suggested_context:
  - shared/shared-schemas
---

# Phase: Setup

## 1. Stage Goal

验证已实例化 bundle 的 structural consistency — 确认 canonical control files 可解析、scaffold 存在、HITL1 已记录、basename 跨文件一致 — 使 bundle 具备进入 wave0 的条件。

**`setup-ready` 不是 `readiness-passed`。** 此 phase 只检查结构一致性，不做研究质量、evidence coverage、synthesis adequacy 判断。

## 2. Required Inputs

- 已实例化的 run bundle（含 HITL1 写入的 `rb_profile.yaml`）
- `shared-profile.md`（字段 reference）
- `shared-schemas.md`（schema 和 trace 区分说明）

## 3. Allowed Actions

- 检查 control files 存在且可解析：
  - `rb_plan.md` → `PlanSchema`
  - `rb_profile.yaml` → `ProfileSchema`
  - `rb_status.json` → `StatusSchema`
  - `rb_queue.json` → `QueueSchema`
  - `rb_trace.jsonl`（存在即可，不要求非空）
- 检查 directory scaffold 存在：`seed_topics/`、`reference/`、`artifacts/`、`final/`、`_cache/`
- 检查 HITL1 marker 已写入 profile：`human_decision_checkpoints.hitl1.status == recorded`
- 检查 `rb_status.json` 仍然是 `current_gate: setup_ready` / `next_gate: seed_topics_ready`（无 status drift）
- 按 normalization 规则检查 bundle dir basename、`rb_plan.md` frontmatter `plan_basename`、`rb_profile.yaml` `plan_basename` 三者一致

## 4. Expected Artifacts

一致的 pre-wave0 bundle surface：所有 control files 存在且可解析、scaffold 完整、HITL1 已记录、basename 一致、无 status drift。

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle <path> --current-node phases/phase-setup.md
```

## 6. On Gate Pass

读取 `check.next`。调用 `advance-status` 推进状态：
```bash
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to seed_topics_ready
```
然后加载 `check.next` 指向的 node（应为 `phase-seed-topics.md`）。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复后 rerun same gate。常见 fail 原因及修复方向：

| Fail | 修复 |
|------|------|
| 缺失 control file | 检查文件是否被误删，按 template 重建 |
| Schema 校验失败 | 读取 inspect 中的 Zod error detail，修正对应字段 |
| 缺失 scaffold dir | `mkdir` 创建对应目录 |
| HITL1 marker 未记录 | 回到 HITL1 phase 完成用户输入收集 |
| Status drift | 将 `current_gate`/`next_gate` 恢复为 `setup_ready`/`seed_topics_ready` |
| Basename 不一致 | 以 `plan_basename` in plan + profile 为准；若 bundle dir 命名非法→fail-stop 重新 instantiate |

**Persistent failure：** 若 setup gate 连续 3 次修复无进展，记录 escalation 到 `rb_status.json`（`state: blocked`）和 `rb_trace.jsonl`，不能冒充 `setup-ready` 已通过。

## 8. Stop Behavior

`stop: no` — Agent 自主验证。若遇到权限/工具/结构性 blocker 无法修复，记录 escalation。

## 9. Anti-Cheating Rules

- **禁止把 setup pass 当 readiness pass**：`setup-ready` 只确认结构一致性，不意味研究质量过关
- **禁止手动修改 control files 冒充 ready**：gate fail 必须通过真实 repair → rerun 解决
- **禁止跳过 setup gate 直接进入 wave0**：必须 `setup-ready` gate pass 后才能推进
- **禁止在 setup 阶段做 research**：setup 是结构检查，不做搜索/阅读/evidence 工作
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:setup START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:setup END — <summary>"` |

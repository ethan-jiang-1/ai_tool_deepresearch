---
node_type: phase
id: phase-setup
phase: setup
gate: setup_ready
next: wave0
stop: "no"
requires:
  - shared-profile
suggested_context:
  - shared-schemas
---

# Phase: Setup

## 1. Stage Goal

验证已实例化 bundle 的 structural consistency——确认 canonical control files 可解析、scaffold 存在、HITL1 已记录——使 bundle 具备进入 Wave0 的条件。

## 2. Required Inputs

- 已实例化的 `dpt_rb_*` run bundle（含 HITL1 写入的 `rb_profile.yaml`）
- `shared-profile.md`

## 3. Allowed Actions

- 检查 control files（`rb_plan.md`、`rb_profile.yaml`、`rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`）存在且可解析
- 检查 directory scaffold（`seed_topics/`、`reference/`、`artifacts/`、`final/`）存在
- 检查 HITL1 profile data 已记录
- 检查 plan/profile/status 的基本一致性
- 检查没有提前写入 wave complete 状态

## 4. Expected Artifacts

- 所有 control files 存在且可解析
- Directory scaffold 完整
- `rb_profile.yaml` 中 HITL1 fields 非空
- 无提前的 wave completion claim

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle <path>
```

## 6. On Gate Pass

Advance to `wave0`：加载 `phase-wave0.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复缺失或不一致的 control files / scaffold / HITL1 记录，rerun same gate。

## 8. Stop Behavior

`stop: no` — Agent 自主验证。若遇到权限/工具/结构性 blocker 无法修复，记录 escalation 到 state/trace。

## 9. Anti-cheating Rules

- MUST NOT 替 Agent 做 research
- MUST NOT 把 setup pass 当成 readiness pass
- 结构验证只检查存在性和可解析性，不做语义 quality judgment

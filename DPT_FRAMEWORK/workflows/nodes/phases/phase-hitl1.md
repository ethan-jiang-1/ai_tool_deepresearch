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

向用户提出结构化问题，收集 research profile、root must-answer set 和用户约束，并写入 active bundle 的 `rb_profile.yaml`。

## 2. Required Inputs

- 已实例化的 `dpt_rb_*` run bundle（来自 instantiation phase）
- `shared-profile.md`（`rb_profile.yaml` 字段说明）

## 3. Allowed Actions

- 向用户展示结构化问题（research scope、depth、constraints、must-answer questions）
- 将用户回答写入 `rb_profile.yaml` 的对应字段
- 更新 `rb_status.json` 中 HITL1 相关状态

## 4. Expected Artifacts

- `rb_profile.yaml` 中 `research_profile`、`root_must_answer_set` 已填写
- HITL1 recorded/status marker 已写入 `rb_status.json`
- Trace 中有 HITL1 completion event

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle <path> --current-node phases/phase-hitl1.md
```

## 6. On Gate Pass

Advance to `setup`：加载 `phase-setup.md`。

## 7. On Gate Fail

读取 CLI 返回的 `inspect` / `advice`，补填缺失的 profile 字段或 status marker，rerun same gate。

## 8. Stop Behavior

`stop: yes` — Agent 暂停执行，等待用户回答结构化问题。用户回答完毕并写入 bundle 后，运行 gate 继续。

## 9. Anti-cheating Rules

- 用户回答 MUST 写入 `rb_profile.yaml`，不能只停留在 chat memory
- MUST NOT 在用户未回答时填写 placeholder 或假数据
- MUST NOT 跳过 HITL1 直接进入 setup

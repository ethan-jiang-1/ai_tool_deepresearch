---
node_type: phase
id: phase-hitl2
phase: hitl2
gate: hitl2_recorded
next: readiness
stop: "yes"
requires:
  - shared/shared-profile
suggested_context: []
---

# Phase: HITL2 (Human-in-the-Loop 2)

## 1. Stage Goal

产出 decision brief 并询问用户 structured final review decision。将用户 decision 记录到 `rb_profile.yaml`。

用户 final 后反馈也通过 HITL2 repair/rerun 承载——反馈写入 `rb_profile.yaml` 的 HITL2/user feedback 字段，再回到受影响 phase 或 repair path。

## 2. Required Inputs

- Wave0/Wave1/Wave2 verified artifacts
- `shared-profile.md`

## 3. Allowed Actions

- 产出 decision brief（summary of findings、open questions、recommended actions）
- 向用户展示 structured decision 问题
- 将用户 decision 写入 `rb_profile.yaml`
- 更新 `rb_status.json` 中 HITL2 相关状态

## 4. Expected Artifacts

- Decision brief artifact（`artifacts/` 下）
- 用户 decision 已记录到 `rb_profile.yaml`
- HITL2 recorded/status marker 已写入 state
- Trace 中有 HITL2 recorded evidence

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle <path>
```

## 6. On Gate Pass

Advance to `readiness`：加载 `phase-readiness.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，补填 missing decision fields，rerun same gate。

## 8. Stop Behavior

`stop: yes` — Agent 暂停执行，等待用户 review decision brief 并做出 decision。用户回答完毕并写入 bundle 后，运行 gate 继续。

## 9. Anti-cheating Rules

- 用户 decision MUST 写入 `rb_profile.yaml`，不能只停留在 chat memory
- MUST NOT 在用户未回答时填写 placeholder decision
- 用户 final 后反馈 MUST 通过 HITL2 repair/rerun 承载，MUST NOT 通过 final node hidden loop

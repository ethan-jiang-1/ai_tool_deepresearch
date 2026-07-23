---
bug_id: BUG-101
title: "Topic-state apply sequencing contradiction between phase instruction and engine gate"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: hitl1
gate: hitl1-recorded
---

# BUG-101: Topic-state apply 的 phase instruction 与 engine gate 之间的时序矛盾

## 现象

`phase-hitl1.md §3a` 指示 Agent 在 HITL1 用户确认后：

> "先写 controls snapshot，再写 retained topic-state input 并运行 operate-topic-state apply"

即 topic-state apply 应在 gate 之前执行。但实际执行时：

```
node DPT_FRAMEWORK/cli/operate-topic-state.mjs apply --bundle ... --input ...
→ verdict: blocked, reason: "HITL1 apply requires current_node phase-hitl1 and hitl1_recorded→setup_ready window"
```

Engine 要求 gate window 已建立（`hitl1_recorded→setup_ready`），而 gate 又要求 canonical topic state 已存在（`canonical_topic_state_prerequisite`）。形成 chicken-and-egg：

```
Phase says: topic-state apply → gate
Engine says: gate window → topic-state apply
Gate says: topic-state must exist → pass
```

## 实际 workaround

Agent 的解决路径：
1. 先写 profile 决策（research_profile, root_must_answer_set, hitl1.status=recorded）
2. 跑 research access probe
3. 跑 gate → gate fail on `canonical_topic_state_prerequisite`（因为 topic state 还没 apply）
4. Fix status drift (advance-status)
5. 再次尝试 topic-state apply → 此时 gate window 已就绪，apply 成功
6. Rerun gate → pass

这多跑了一轮 gate fail + status fix + rerun。如果 phase instruction 和 engine 的时序一致，应该一次 pass。

## 建议方向

- 方案 A：让 `operate-topic-state.mjs apply` 在 HITL1 `stop: yes` phase 中接受 apply（降低 window 校验严格度）
- 方案 B：更新 phase-hitl1.md 的步骤顺序，明确 topic-state apply 应该在 gate 第一次 run 之后、rerun 之前执行
- 方案 C：将 topic-state apply 从 HITL1 gate 的 prerequisite 中分离——gate 只检查 profile 字段，topic-state 在 gate pass 后、setup 前执行

---
bug_id: BUG-104
title: "enter-phase renders full shared context on every transition, causing cumulative context pressure"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
affected: all phase transitions
---

# BUG-104: enter-phase 每次渲染完整 shared context 导致累积上下文压力

## Current Base Recheck (2026-07-28)

This behavior remains objectively present: `enter-phase.mjs` renders every
file in the loaded `result.plan` in full for every invocation. The current
Base does not maintain a session-level loaded-file cache, and that is not
asserted to be an Agent-correctness contract. Repeated full rendering is thus
a bounded operability concern, but its claimed causal link to a particular
Agent stop remains unproven. Keep this card deferred/research-only until a
real-Agent observation isolates the effect; do not add session memory or a
host controller from deterministic fixture evidence.

## 现象

每次 `enter-phase --node <next>` 调用都会渲染该 phase 所需的 shared context 文件。例如 enter-phase 到 hitl1 时：

```
<!-- DPT_LOADED_FILE_START shared/shared-profile.md -->
  (shared-profile.md 全文, ~33KB)
<!-- DPT_LOADED_FILE_START shared/shared-agent-ux-guidance.md -->
  (shared-agent-ux-guidance.md 全文)
...
```

本 run 中经历了 5 次 enter-phase：
1. instantiation → hitl1
2. hitl1 → setup
3. setup → seed-topics
4. seed-topics → wave0
5. (wave0 → wave1... 未执行)

每次 transition 都向 agent context 追加 shared context 内容。到 wave0 时，agent context 中已有多次重复加载的 shared-profile.md、shared-schemas.md、shared-silent-execution.md 等。

## 根因

`enter-phase` 的设计假设每个 phase 是独立 session——但实际 run 中，一个 agent session 会连续穿越多个 phase。同一个 shared context 文件（如 shared-profile.md）被加载了 3-4 次，每次都是相同内容。

这是导致 BUG-099（agent 在 wave0 停下来）的重要贡献因素。

## 建议方向

- `enter-phase` 对 shared context 做幂等去重：同一次 agent session 中，相同的 shared node id 只渲染一次
- 或者在 `enter-phase` 输出中使用引用标记（`<!-- INCLUDE shared-profile.md -->`）而非全文渲染，让 agent 按需读取
- 长期：将 shared context 从每次 transition 的渲染中移出，改为 phase agent 启动时一次性加载的"常驻上下文"

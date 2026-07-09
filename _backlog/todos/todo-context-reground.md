# TODO: context-reground（长上下文 head 重锚 — parked）

> 状态: parked | 优先级: 低 | 更新: 2026-07-09  
> 互补: `todo-phase-recover.md`（已晕时兜底）  
> 相关: 各 phase §6 `check.next` tail anchoring — **增强不取代**

## Why

长 phase（尤其 wave）里，plan / lifecycle 位置 / root question 会被挤出上下文（lost-in-the-middle + single-phase-on-demand loading）。Framework 会 re-inject gate feedback，但很少周期性 re-inject「我是谁、为什么、整体到哪了」。

Tail anchoring（§6 → `check.next`）仍然正确且 load-bearing。本 todo 补的是 **head grounding**。

## 地基对齐（2026-07-09）

| 旧期望 | 现状 |
|--------|------|
| `START_FROM_HERE` reload 纪律 | ❌ 改为 `BUNDLE_MAP.md` + control files |
| 无 periodic reground 机制 | ✅ 仍成立 — 无 dedicated reground MD |
| `plan-hostfile` sections | ✅ 已有，但未周期性注入上下文 |
| Engine token 计数触发 | ❌ 仍无（正确 non-goal） |

## Current Direction（不变，仅换真相源）

- 触发倾向：phase 进入 + gate 边界（结构化信号，不靠 token 计数）
- 物料最小集：lifecycle 位置 + root must-answer + topic 进度指针 + 本 phase 目标
- 载体倾向：共享静态 lifecycle 图 + 每 phase §0 head；可选 gate 附带 position 信号
- 真相源与 phase-recover 对齐：`BUNDLE_MAP` + `rb_status` + `rb_profile` + `rb_plan`

## Non-Goals

- 不做 history summarization / compaction
- 不取代 §6 tail anchoring
- 不 re-inject 全部历史 artifacts

## Next Step

保持 parked。phase-recover 程序草稿出来后再 explore，避免两套不一致的「我在哪」叙事。

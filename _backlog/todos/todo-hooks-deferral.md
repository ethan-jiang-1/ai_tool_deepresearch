# TODO: workflow boundary hooks（延后）

> 状态: 延后 / parked | 优先级: 低 | 更新: 2026-07-15

## Why

Boundary hooks 是可选的、phase 间确定性检查（如 setup→wave0、wave0→wave1、readiness→final）。

## 地基对齐（2026-07-15）

| 旧 deferral 理由 | 现状 |
|------------------|------|
| evidence ownership 未干净 | ✅ **大体已干净** — ledger + ref-count + work-unit 已落地 |
| `workflows/hooks/` | ❌ **目录仍不存在** — 正确未开工 |
| README 链 `schema-core → prototype-start-from-here → …` | ❌ 过时 — 前驱已 DONE，hooks 从未创建 |

**延后条件更新：** BUG-069 已修复（gate hints + contract lineage），phase-recover 方向更清楚（post-final-recovery、consistency-validator、recover-declaration 已落地）。两个解锁条件均显著改善。仍延后的理由：等 phase-recover Agent-facing 程序定稿后再加 hooks，避免 checkpoint 家族在不完整的恢复路径上叠床架屋。

## Current Direction

将来 hooks 应是 framework 级确定性检查：读 bundle-root + submitted declarations；不是又一个 Agent flow controller；不靠扫任意目录发现产出。

候选首 hook：`wave0_closeout_to_wave1_start`（声明 / reference inventory / queue 一致性 → trace diagnostics，不做最终语义判决）。

## 与 coding-agent hooks 的区别

本 todo = **Engine/workflow Boundary Hooks**。  
`todo-coding-agent-setup-ux` 里的 PreToolUse/PostToolUse = **宿主 coding agent 权限钩子**。两码事，勿混。

## Non-Goals

- 不在 recover / BUG-069 收口前加 hooks
- 不把 hooks 做成隐藏 workflow runner
- 不写 runtime 数据进 `DPT_FRAMEWORK/`

## Next Step

保持延后。解锁条件已改善（BUG-069 已修复 + phase-recover infra 已落地）。等 phase-recover Agent-facing 程序定稿后可构思首 hook（候选：`wave0_closeout_to_wave1_start`）。

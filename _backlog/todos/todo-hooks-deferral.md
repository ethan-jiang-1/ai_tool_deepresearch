# TODO: workflow boundary hooks（延后）

> 状态: 延后 / parked | 优先级: 低 | 更新: 2026-07-22（v0.40 同步）

## Why

Boundary hooks 是可选的、phase 间确定性检查（如 setup→wave0、wave0→wave1、readiness→final）。

## 地基对齐（2026-07-15）

| 旧 deferral 理由 | 现状 |
|------------------|------|
| evidence ownership 未干净 | ✅ **大体已干净** — ledger + ref-count + work-unit 已落地 |
| `workflows/hooks/` | ❌ **目录仍不存在** — 正确未开工 |
| README 链 `schema-core → prototype-start-from-here → …` | ❌ 过时 — 前驱已 DONE，hooks 从未创建 |

**延后条件更新：** BUG-069 已修复，`todo-phase-recover` 也已由 `check-reentry`、bundle-truth reload guidance 与 narrow recovery owners 完成。仍延后的理由不是等待基础设施，而是尚未发现现有 Gate / inspect / reentry contract 无法表达的直接 boundary gap。没有该 gap 时，新增 hooks 只会制造第二套 checkpoint。

## Current Direction

将来 hooks 应是 framework 级确定性检查：读 bundle-root + submitted declarations；不是又一个 Agent flow controller；不靠扫任意目录发现产出。

候选首 hook：`wave0_closeout_to_wave1_start`（声明 / reference inventory / queue 一致性 → trace diagnostics，不做最终语义判决）。

## 与 coding-agent hooks 的区别

本 todo = **Engine/workflow Boundary Hooks**。  
`todo-coding-agent-setup-ux` 里的 PreToolUse/PostToolUse = **宿主 coding agent 权限钩子**。两码事，勿混。

## Non-Goals

- 不为预防性需求新增 hooks family
- 不把 hooks 做成隐藏 workflow runner
- 不写 runtime 数据进 `DPT_FRAMEWORK/`

## Next Step

保持延后。只有真实 bundle/Agent observation 显示 `wave0_closeout_to_wave1_start` 或其他边界缺少现有 Gate、inspect、continuation/reentry 的确定性 authority 时，才以该单一缺口 explore；不为“预防”新建 hooks family。

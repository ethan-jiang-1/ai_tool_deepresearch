# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-05 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
>
> **plan 没有编号，文件名即标识。完成后文件名不变，位置即状态。**

## 完成一个 plan 的步骤

1. `git mv plans/<name>.md _done/_closed_plans/<name>.md`
2. 更新 `_done/_closed_plans/README.md`（加一行）
3. 更新本文件（删掉该 plan）
4. 更新 `../_done/README.md`（计数 +1 closed）

---

## 活跃列表

- [autonomous-silent-execution-terminology.md](autonomous-silent-execution-terminology.md) — 长程自主静默执行的智能体：统一 phase 边界术语（transition/handoff/witnessing），把这个前提焊进项目与 Agent 认知
- [agent-persistence-and-exit-codes.md](agent-persistence-and-exit-codes.md) — 挫败→提前放弃 vs exit code：别碰 exit code（已对），杠杆在硬底（已建）+ advice channel（欠喂，禁止形→安心形 + goal-visibility）
- [cli-exit-code-contract.md](cli-exit-code-contract.md) — exit-code 契约隐式 + 不统一（三套约定 + code-2 语义冲突 + log-event 永远 0）；显性化放 COMMANDS.md + CEC-001 spec，draft 内容留给 framework/OpenSpec agent 对齐
- [no-implicit-human-interaction.md](no-implicit-human-interaction.md) — commands 是 Agent-facing；人与系统交互只在 HITL1/HITL2；docs 层的 "Agent/operator" slash + drag tone + RUN.md:16 路由问句半活着"有人在场的 fiction"，是 BUG-020 的文档侧入口

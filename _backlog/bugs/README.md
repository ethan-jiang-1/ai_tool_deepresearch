# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-02 | `_backlog/bugs/` — 活跃 bug 在此，修完移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)。
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

- [BUG-014](BUG-014-phase-agent-bypasses-subagent-relay-regression.md) — Phase Agent 绕过 Sub-agent relay 直接做搜索（P0，BUG-006 回归）
- [BUG-015](BUG-015-wave-gate-quality-rules-too-strict.md) — Wave gate 质量规则过严，非 relay 产出被结构性拒斥（P0，BUG-014 cascade effect）
- [BUG-016](BUG-016-cross-bundle-queue-contamination-via-agent-context.md) — Agentic Queue 跨 Bundle 污染（P0，BUG-014 根因之一）
- [BUG-017](BUG-017-trace-log-system-not-self-contained-for-diagnosis.md) — Trace/log 三层断裂，无法独立诊断 gate 失败（P1）
- [BUG-018](BUG-018-wave0-repair-whack-a-mole-and-yaml-sanitization.md) — Wave0 gate 修复 whack-a-mole + Sub-agent YAML 未 sanitize + shared_ref 阈值不能归零（P1）

**Next available bug ID: BUG-019**

# Proposal: 2026-09-01-slim-cts-requirements

## Why

`research/canonical-topic-state` 的两条巨无霸 requirement（L48 "Canonical topic mutation…" 278 行 + L326 "Topic-state operations…" 386 行）合计占全 spec 69%（663/958 行），远超仓库常态（中位 26 行、p90=100 行），审阅成本高（来源：`_backlog/plans/spec-drift-audit-remediation-and-requirement-slimming.md` §1.4，C3b 批次）。

## What Changes

- **两个 requirement 拆为七个**（按散文段与场景的自然主题边界；全部文本逐字节保留，仅换标题）：
  - 块3 → `Topic-state apply SHALL run one atomic prepared workspace with exact recovery`（55 行）/ `Topic-state input SHALL bind canonical identity and materialize plan, seed, and enrichment intent`（100 行）/ `Sanctioned lifecycle windows SHALL authorize every canonical topic mutation`（85 行）
  - 块4 → `Topic-state operations SHALL NOT touch non-topic authority surfaces`（70 行）/ `Wave projection packets SHALL be the one strict seed-projection write seam`（146 行）/ `Projection apply SHALL be authorized inside the route-bound loaded Wave phase with exact slot postconditions`（49 行）/ `Layout mutation and post-final reentry SHALL stay bounded sanctioned operations`（98 行）
- **66 个场景（38+28）全数保留**，按主题归入对应新 requirement，组内保持原相对顺序；含 2 个既有 `@deprecated` 标注场景（原样随块搬迁）。
- **header `> req:` 不变**（CTS-001..012 全保留）。
- **不产出**：无 normative 语义变更、无行为变更、无代码变更、无新 capability。
- 装配脚本 `assemble-delta.mjs` 随 change 归档留证（行集守恒由脚本内置校验强制）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/canonical-topic-state` | 主 spec 全文（959 行）+ 两个目标块的结构勘察（块3：22 散文段+38 场景；块4：10 散文段+28 场景） | Modify | requirement 结构重组（2→7），文本逐字保持；无行为变更。 |
| `research/seed-topic-materialization` | catalog 行 | Excluded | 相邻 capability 无需感知结构重组。 |
| `engine/check-inspect-feedback` | catalog 行 | Excluded | 反馈面词汇无涉。 |

## Impact

- `openspec/specs/research/canonical-topic-state/spec.md`：REM（2 旧块）+ ADD（7 新块）；总行数 +5（净增标题行）。
- 零代码/测试行为触点；新增一个 unit 结构锁。
- 文本锁面：apply 前 `list-doc-locks` 复核 CTS spec 的锁定测试。

## Source of Record 与责任边界

- Source of Record 不变：同一 `operate-topic-state` 操作面行为。最短合法闭环：纯结构重组。Net simplification：审阅粒度回归常态（≤150 行），后续 diff 面缩小。
- Semantic-precision reflection：7 个标题各对应一个有界问题（原子 workspace / 输入绑定与物化 / lifecycle 授权 / 非话题面禁触 / packet 写缝 / 路由绑定授权 / layout+post-final 边界）；推理停止点不变。
- 责任边界：无 user decision、无 permission 变化；Engine verdict 面零触碰。

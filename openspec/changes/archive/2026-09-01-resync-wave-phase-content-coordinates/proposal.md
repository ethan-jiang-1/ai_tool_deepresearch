# Proposal: 2026-09-01-resync-wave-phase-content-coordinates

## Why

六路 spec↔code 漂移审计（来源：`_backlog/plans/spec-drift-audit-remediation-and-requirement-slimming.md` §1.3，C2 范围）确认 `research/research-wave-phase-content` 主 spec 存在 4 处坐标/措辞腐坏：spec 引用 `phase-wave0.md` §3.3 做 seed projection update（实际 §3.4）；引用不存在的 `phase-wave2.md` "Rerun-Aware Behavior section"（该段名在全库 phase 节点中出现 0 次）；"Wave1 and Wave2 SHALL **add** a §3.0" 是 changelog 式主动语态（两文件 §3.0 早已存在）；wave2 的 `__BACKFILL_*__` 处理描述与实际（documentation tokens，仅由 projection writer 替换）不符。main spec 是 behavior authority，死坐标会直接误导 coding agent。

## What Changes

- **seed projection 坐标修正**：`Phase-wave0 §3.3` → `§3.4（Seed Projection Update）`；`Phase-wave2 §3.2.3` → `§3.2 Execution Loop`（wave1 §3.3 恰好正确，保留）。
- **死段名清除**：两处 "Rerun-Aware Behavior section" 指称改写为实际承载面（wave0/wave1 的 §3.0 first-run/rerun-added 同一分类规则 + §3.1 task card 常规 cache 生产要求；wave2 的 direction resolver + Engine rerun add policy + pair-coverage guidance），规范内容逐字保留。
- **changelog 语态修正**："Wave1 and Wave2 SHALL add a §3.0" → 现在时行为描述（§3.0 sections implement the existing RWP-014 classification）。
- **wave2 token 语义对齐**：明确 wave2 的 `__BACKFILL_WAVE2_JUDGMENT__`/`__BACKFILL_PENDING_QUESTIONS__` 是 documentation tokens，仅由现有 projection writer 替换，不是 Agent-edit targets（`phase-wave2.md` L237 现状）；wave0/wave1 的 Agent 经 projection writer 替换 token 的要求不变。
- **不产出**：无行为语义变更、无新 capability、无 CLI/schema/engine 变更、无 header req ID 增删。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/research-wave-phase-content` | 主 spec 全文（1163 行）+ `workflows/nodes/phases/phase-wave0.md`（§3.3=Submitted Reference Closeout、§3.4=Seed Projection Update）+ `phase-wave1.md`（§3.3=Seed Projection Update、L74 first-run/rerun-added 同一分类）+ `phase-wave2.md`（§3.0/3.1/3.2/3.3、L237 documentation tokens、L279 `action:add`/`action:supplement` 内联散文） | Modify | 两个 requirement 块的坐标与指称同步到 phase 节点现状；normative 内容不变。无 New capability：被修改描述均有已检查 contract 拥有。 |
| `research/research-wave-gate-implementation` | catalog 行 + `wave-contract-evaluators.mjs` rerun add policy（RWG 审计已证 MATCH） | Excluded | `action:add` 全量重合成的确定性裁决由该 capability 的 gate evaluator 拥有，本 change 不触碰。 |
| `research/research-return-map` | C1 已归档的相邻修复 | Excluded | backfill token 的 wave 归属语义已在 C1 同步，本 change 不重复。 |

## Impact

- `openspec/specs/research/research-wave-phase-content/spec.md`：两个 requirement 块（"Wave2 rerun full re-synthesis on topic addition" L432–479、"Rerun action:add SHALL include full cache trail" L481–566）整块替换（delta verbatim 同步）。
- 零代码触点：本 change 不改任何 `.mjs`。
- 文本锁面：`node scripts/list-doc-locks.mjs openspec/specs/research/research-wave-phase-content/spec.md` 在 apply 前复核；新增一个 unit 文本锁固化清零态。

## Source of Record 与责任边界

- Direct Source of Record：phase 节点现状（三个 `phase-wave*.md` 的实际章节结构、wave2 L237/L279 的实际措辞）。本 change 让 spec 描述对齐现状。
- 最短合法闭环：删除 1 个死段名 + 2 个错坐标 + 1 处 changelog 语态；零新增控制面。Net simplification：消除后续 agent 的死坐标误读。
- Semantic-precision reflection：不改任何具名概念/状态；仅修正读者到 phase 节点的导航坐标，有界问题与推理停止点不变。
- 责任边界：纯文档对齐，无 user decision、无 permission 变化、Engine verdict 面零触碰。

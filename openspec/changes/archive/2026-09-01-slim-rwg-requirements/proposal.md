# Proposal: 2026-09-01-slim-rwg-requirements

## Why

`research/research-wave-gate-implementation` 的三条巨无霸 requirement（L19 "Wave1 complete gate rule set" 218 行、L293 "Gate CLI evaluates wave1 rules" 207 行、L805 "Blocking judgment contracts" 303 行）合计 728 行、51 场景，远超仓库常态（来源：`_backlog/plans/spec-drift-audit-remediation-and-requirement-slimming.md` §1.4，C3c 批次）。

## What Changes

- **三个 requirement 拆为七个**（全部文本逐字节保留，唯一例外为计划内 M3 措辞精确化，见下）：
  - 块A → `Wave1 complete gate rule set SHALL validate provenance, depth contracts, and reference format` / `Wave1 focus-coverage limit SHALL stay inside the existing degradation partition`
  - 块B → `Wave1 gate CLI SHALL evaluate definition-owned rule families and typed semantic sections` / `Wave1 inspect and gate SHALL consume one shared pure convergence result`
  - 块C → `Blocking Wave rules SHALL use one closed contract chain with truth-type authority` / `Wave1 closeout classification and prerequisite masking SHALL own root short-circuit` / `Wave adapters SHALL share one target-level direct-output operation`
- **M3 顺手精确化（计划内唯一文本改写）**：`per_topic_ref_md_count_floor` 的 glob 措辞改为如实陈述——definition 仍声明其为 `count_floor` target，convergence evaluator 在 materialization/backing root 存在时优先接管（消除 spec 与 definition JSON 的措辞互斥，行为零变更）。
- **51 个场景（16+12+23）全数保留**，按主题归组，组内原相对顺序。
- **header `> req:` 不变**（RWG-001..022 现有集合，含既有缺 015）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/research-wave-gate-implementation` | 主 spec 全文（1424 行）+ 三块结构勘察（A: 8 散文段+16 场景；B: 11+12；C: 9+23） | Modify | requirement 结构重组（3→7）+ 一处计划内措辞精确化；无行为变更。 |
| `engine/check-inspect-feedback` | catalog 行 | Excluded | hint/advice 词汇无涉。 |
| `research/research-wave-phase-content` | catalog 行 | Excluded | phase 文档面无涉（C2 已处理）。 |

## Impact

- `openspec/specs/research/research-wave-gate-implementation/spec.md`：REM（3 旧块）+ ADD（7 新块）。
- 零代码触点；新增一个 unit 结构锁。
- M3 替换行经装配脚本内置为已知替换，守恒校验显式豁免并留痕。

## Source of Record 与责任边界

- Source of Record 不变：同一组 gate definition/evaluator/CLI 行为。最短合法闭环：纯结构重组 + 一句措辞对齐。Net simplification：审阅粒度回归常态。
- Semantic-precision reflection：7 标题各对应一个有界问题（gate 规则集 / focus-coverage 降级边界 / CLI 规则族求值 / 共享收敛结果 / 闭合契约链 / root 短路 / adapter 单一操作面）；停止点不变。
- 责任边界：无 user decision、无 permission 变化；Engine verdict 面零触碰。

# Proposal: megablock-requirement-split

## Why

全库 ≥190 行 requirement 块 11 个(2026-09-03 实测;超粒度吸积残留,场景化契约与散文主题纠缠)。主 plan R2 与 REVIEW(G1 拍板:验收口径 ≥190 + 160–190 观察名单)授权把 11 块按深挖定稿的处置表机械拆为 27 个子 requirement,全部 ≤160 行。设计定稿见 `_backlog/plans/spec-lean-f4-megablock-deepdive.md`(含 2026-09-03 REVIEW 通过的 §11 K1/K2)。

## What Changes

- 11 个 ≥190 行块按散文主题分界分割为 **27 个子块**(文本逐字守恒,新增标题行是唯一净增):
  post-final-recovery ×4 / content-delivery-phase-content ×3 / cli-phase-transition ×3 / research-wave-phase-content ×3 / semantic-fact-closure ×3 / workflow-directory-contract ×2 / seed-topic-materialization ×2 / hitl-ux ×2 / runtime-reentry-debuggability ×2 / artifact-persistence-recovery ×2 / rerun-incremental-node ×2。
- 每个受影响 main spec 的 delta = REMOVED(原块,Reason=粒度拆分/Migration=子块清单)+ ADDED(子块全文)。
- **requirement ID 策略(polish 修正 2026-09-04)**:requirement 身份 = 标题稳定锚点;C3 **不动 registry、不动 header 枚举**——原块语义由首子块标题继承,其余子块为无 ID 标题(DWU 39 块/31 ID 现状先例:无 ID 标题合法;多 spec header≠count 无强制 1:1)。风险面=纯文本守恒重构。
- **HITL2-CONFIRM**(深挖 §7 清理候选):REVIEW 已定性 P5/P9 对象不同 → **保留两段,不合并**(见判定书 §1)。
- RWP 12 行复述甄别并入 I 块执行:真复述 → 指向 phase 节点;normative → 保留。

## Capabilities

### New Capabilities

(无——requirement 级拆分,capability 集合不变)

### Modified Capabilities

- `research/post-final-recovery`、`research/content-delivery-phase-content`、`engine/cli-phase-transition`、`research/research-wave-phase-content`、`governance/semantic-fact-closure`、`workflow/workflow-directory-contract`、`research/seed-topic-materialization`、`agent/hitl-ux`、`engine/runtime-reentry-debuggability`、`bundle/artifact-persistence-recovery`、`workflow/rerun-incremental-node`:各有一个 ≥190 行 requirement 拆为多子块(粒度回落 ≤160),capability 单一聚焦不变。

## Impact

- files:11 个 main spec(delta → apply);**registry 与 header 零触碰**(D3:纯文本重构)。
- 装配工具:`openspec/governance/assemble-spec-delta.mjs`(C1 产物)逐块 dry-run + `--out` 落地;守恒与 declared==actual 断言内置。
- 不触碰:160–190 观察名单(10 块)、capability 边界、engine 行为、registry(无新增/废弃 ID)。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/post-final-recovery` | 目标块实文(357 行)+ 深挖处置表 | Modify | ≥190 块拆 6 子块,粒度修复;无新 capability、无行为 authority 转移 |
| `research/content-delivery-phase-content` | 目标块实文(257 行)+ 深挖处置表 | Modify | ≥190 块拆 3 子块(含场景-only unit 带 lead) |
| `engine/cli-phase-transition` | 目标块实文(239 行)+ 深挖处置表 | Modify | ≥190 块拆 3 子块 |
| `research/research-wave-phase-content` | 目标块实文(234 行)+ 深挖处置表 | Modify | ≥190 块拆 3 子块(含 12 行复述甄别) |
| `governance/semantic-fact-closure` | 目标块实文(192 行)+ 深挖处置表 | Modify | ≥190 块拆 3 子块 |
| `workflow/workflow-directory-contract` | 目标块实文(196 行)+ 深挖处置表 | Modify | ≥190 块拆 2 子块 |
| `research/seed-topic-materialization` | 目标块实文(195 行)+ 深挖处置表 | Modify | ≥190 块拆 2 子块 |
| `agent/hitl-ux` | 目标块实文(194 行)+ 深挖处置表 | Modify | ≥190 块拆 2 子块(HITL2-CONFIRM 按 REVIEW 保留) |
| `engine/runtime-reentry-debuggability` | 目标块实文(191 行)+ 深挖处置表 | Modify | ≥190 块拆 2 子块 |
| `bundle/artifact-persistence-recovery` | 目标块实文(189 行)+ 深挖处置表 | Modify | ≥190 块拆 2 子块 |
| `workflow/rerun-incremental-node` | 目标块实文(190 行)+ 深挖 §11 REVIEW 分组 | Modify | ≥190 块拆 2 子块(K1/K2 冻结分组) |

## Source of Record / 责任边界 / 化简影响

- **Source of Record**:主 spec 文本(工具只读);守恒断言 = Engine-owned verdict;declared==actual = 分组与解析器一致性的确定性证明。
- **最短闭环**:深挖表 → 分组 YAML(人审语义归组,4 路并行审)→ 装配器断言 → delta → apply 落地;无中间态。
- **净简化**:11 个超粒度块 → 27 个单一主题 requirement(≤160 行),治理/评审/导航粒度回到常态;复用 C1 工具,无新 control。
- **责任边界**:用户已拍板口径(G1)与拆分方案(R2/深挖 REVIEW);Agent 执行机械拆分(分组由人审语义归组兜底);引擎(装配器/governance)出确定性断言。HITL2-CONFIRM 与 RWP 12 行甄别按 REVIEW 结论执行,不扩大。

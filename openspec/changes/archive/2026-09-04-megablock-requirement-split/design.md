# Design: megablock-requirement-split

## Context

动机与范围见 proposal.md;每块的主题分界与单元处置定稿于 `_backlog/plans/spec-lean-f4-megablock-deepdive.md`(REVIEW 2026-09-03)。本 change 复用 C1 装配工具(`openspec/governance/assemble-spec-delta.mjs`)。

## Goals / Non-Goals

**Goals:**
- 11 块 → 27 子块,全库不再有 >190 行 requirement 块(G1 验收口径);文本逐字守恒。
- 每子块单一主题、可独立评审;场景保持组内原相对顺序。
- RWP 12 行复述甄别与 HITL2-CONFIRM 按 REVIEW 结论处理(不合并)。

**Non-Goals:**
- 不碰 160–190 观察名单(10 块);**不新增/不废弃注册 ID、不改 header 枚举**(D3:纯文本重构,标题即语义锚);不改 capability 边界;不做能力级拆分研究。

## Decisions

### D1. 分组来源 = 深挖表 + 人审语义归组(4 路并行,装配器断言兜底)
每个块的 prose/scenario 以共享解析器(spec-unit-parse.mjs)的 1-based 索引为准;深挖 P 编号在个别块与解析器有 ± 偏差 → 以内容匹配重映射,不由人工号硬套。场景归组原则:与该场景 WHEN/THEN 所行使规则的 unit 同置;跨依赖不可免时在分组报告中显式标注(拼装后由 human review 复核)。

### D2. 文本落地 = 装配器 dry-run + `--out` 整块替换
对每个块:分组 YAML → dry-run(declared==actual + 覆盖完备 + 守恒)→ `--out` 产出替换文本 → 作为 apply 输入替换主 spec 对应块。新增标题行是唯一净增;块外字节不动。

### D3. ID 策略 = 不动 registry/header(纯文本重构)——2026-09-04 polish 修正
实测多 spec header 与块数不相等(POF 8/6、RWP 22/21、WDC 10/11、RRD 11/12、REI 6/7),doc-order 无法可靠把原块 ID 映射到子块;且 DWU 39 块/31 ID 的现状证明"无 ID 标题"合法、header 与 count 无强制 1:1。
**结论**:C3 不新增/不废弃任何注册 ID、不改 header 枚举——requirement 身份 = 标题稳定锚点;原块语义由首子块标题继承,其余子块为无 ID 标题(仓库既有惯例,check-spec-req-ids/check-project-reqs 均不强制 header==count)。副作用:本 change 无 registry 触碰,风险面大幅收窄。

### D4. RWP 12 行复述甄别
在 research-wave-phase-content 的 I 块拆分时逐段核对 §2.1:真复述(owner=对应 phase 节点存在且更权威)→ 段落改指针;normative → 保留。判定记录随 change 归档。

### D5. HITL2-CONFIRM = 保留(REVIEW 定案)
P5(五快捷选项确认)与 P9(candidate 流确认)对象不同,不合并、不改写;仅确认语义两处保留并各按所属 H2/H1 落位。

## Semantic-Precision Reflection

- **问题**:每一子块回答一个有界问题(如 "apply 校验与 rerun 预算" vs "workspace/lineage/witness"),读者不必穿过 27 个场景重建主题。
- **保留的区别**:场景永不与所行使规则拆分;跨 unit 依赖保留在原文(不删不改),仅组织上分组。
- **停止点**:读者在 ≤160 行单主题块内获得结论;治理评审以块为单位不再需要跨 200+ 行重建。

## Risks / Trade-offs

- [自动场景归组语义错配] → 人审归组 + 装配器守恒 fail-closed + 拆分后逐块 review;HITL2/RWP 特例按 REVIEW 定案。
- [header/registry 失配] → header 枚举随块更新 + check-spec-req-ids/check-project-reqs 全程门槛。
- [doc-lock 波及] → `list-doc-locks` 先跑;锁定在 CDP-Final 等 <190 块上,本批无直接命中,若有意外失配同 change 更新。

## Migration Plan

apply 序:逐块(分组 YAML 已绿)→ 主 spec 整块替换 + delta 同步 → 全部 11 块后:header/registry 更新 → RWP 甄别 → 全量验证。回滚:git revert 级(单 change)。

## Open Questions

(无——G1 口径、REVIEW 判定、ID 策略均已在 D1-D5 定案。)

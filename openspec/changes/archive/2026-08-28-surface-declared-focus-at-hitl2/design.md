# Design: HITL2 可见化已声明 research focus 的承接情况

## Context

HITL2 是 delivery 前唯一的人类审阅点（`stop: yes`），HIU-003 规定 research review SHALL 包含「足够回答 / 不足 / 推荐 + 理由影响」。focus_coverage 结果已由 `wave-depth-contracts.mjs#evaluateWave1FocusCoverage` 校验并写入 depth-review，reference evidence map（P3）已渲染 per-topic focus status。缺口只在：HITL2 的 review 指引没有要求 Agent 把「已声明 focus」与「focus_coverage 结果」交叉呈现。动机见 proposal.md。

## Goals / Non-Goals

**Goals:**

- HITL2 review 显式列出每个已声明 focus 的 focus_coverage 结果，让 drop 可见。
- 尊重 accepted 边界：不新增 Gate / profile field / weight / quota，不改 absence=not declared 语义。

**Non-Goals:**

- 不新增确定性 gate（那会推翻 URC「focus 不做 Gate input」+ wave1-intake「absence = no-focus path」）。
- 不把 controls snapshot 或 focus 措辞变成 Engine 可解析的结构化 authority。

## Decisions

- **D1：ADD 新 requirement HIU-007，而非 MODIFY HIU-003。** HIU-003 是超长 requirement（含 composition handoff），整体重抄易错且无必要；本 change 是新增一个 review 组件，用 ADD 表达为独立、可测试的可见性契约。备选 MODIFY HIU-003 —— 否决（重抄 ~200 行、无行为增益）。
- **D2：数据来源复用既有 surface，不新增 CLI。** Agent 从 controls baseline + newest Decisions revision 识别「已声明 focus」（叙事读取，Agent 判断），从 `depth-review.yaml#/focus_coverage` 或 reference evidence map 读结构化结果。备选：新增 focus-declaration 扫描 CLI —— 否决（把叙事变结构化，触碰 URC 边界）。
- **D3：只改 Markdown，不动 Engine/schema。** 责任边界：呈现归 Agent；判定（rerun/repair/接受）归用户在 HITL2；focus_coverage 校验与 absence 语义归 Engine 且不变。

## 责任边界（semantic precision → simple reliable control → helper-oriented）

- 语义边界：covered / partial / blocked / not declared 四种结果 + 「声明了但 not declared（drop）必须可见」；不新增具名状态。
- Source of Record：已声明 focus 的叙事 = controls baseline + Decisions revision；结果 = depth-review focus_coverage（Engine 校验过的既有事实）。
- 最短合法闭环：改 brief + phase 指引 → MD 契约测试断言两处呈现 focus-coverage 映射 → 全量测试。
- Net simplification：不新增任何 control；只把既有数据在既有审阅点呈现出来。
- 责任：呈现 = Agent；判定 = user（HITL2）；校验/语义 = Engine（不变）。

## Risks / Trade-offs

- [Agent 可能仍不实际呈现，导致 drop 依旧不可见] → 这是可见性契约，非硬校验；由 MD 契约测试锁定指引存在 + 用户可在 HITL2 主动追问。真正闭环仍靠 HITL2 这一用户判断点（accepted 设计如此）。
- [ADD 新 requirement 引入新 ID HIU-007 的注册] → 由 apply/archive 的 requirement_governance 同步到 req-registry，finalizer 校验。

## Migration Plan

- 无数据迁移。改两处 Markdown + 一处 spec delta 即完成。
- 回滚：移除 brief/phase 的新增 review 行、回退 delta 即可。

## Open Questions

（无）

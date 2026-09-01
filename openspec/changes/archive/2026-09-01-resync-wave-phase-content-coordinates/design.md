# Design: 2026-09-01-resync-wave-phase-content-coordinates

## Context

`research/research-wave-phase-content` 主 spec 的两个 requirement 块存在坐标/指称腐坏（见 proposal Why）。行为现状正确：三个 phase 节点的实际章节结构、wave2 的 documentation-token 语义（L237）、`action:add`/`action:supplement` 的内联区分（L279）均已在审计中逐一核对。本 change 只做描述对齐，零代码触点。

## Goals / Non-Goals

**Goals:**

- delta 对两个 requirement 块整块替换，delta 与替换后主 spec 块逐字一致。
- 语义保持：仅修正坐标（§3.4/§3.2）、死段名（Rerun-Aware Behavior → 实际承载面）、changelog 语态（SHALL add → implement）；规范要求本身逐字保留。
- 新增一个 unit 文本锁固化清零态。

**Non-Goals:**

- 不改 phase 节点本身（`workflows/nodes/**` 零触碰）；不改任何 `.mjs`。
- 不做 requirement 瘦身（C3 范围）；不动 header req ID。
- 不重写 wave2 token 的运行时语义描述以外未尽事项（如 wave2 §3.3 Closeout 的坐标引用，未发现失真）。

## Decisions

1. **整块替换**：与 C1 相同的 verbatim 块语义（`residual-spec-drift-text-locks` 惯例）。
2. **死段名改写为实际承载面而非重建段名**：wave0/wave1 的 cache-trail 要求实际由 §3.0 "same for first-run and rerun-added Topics" + §3.1 task card 常规 cache 生产承载（`phase-wave0.md` L77/L105、`phase-wave1.md` L74/L100）；wave2 的 add/supplement 区分由 §3.0 round-awareness + L279 pair-coverage 散文 + Engine rerun add policy 承载。重写指称而不是把死段名加回 phase 节点——后者才是行为变更。
3. **wave2 token 语义单列**：wave0/wave1 的"Agent 经 projection writer 替换 token"与 wave2 的"documentation tokens，仅 writer 替换"是不同的现实，spec 必须分别陈述（原句把两者混为一个机制）。
4. **设计评审三连**：semantic precision — 读者拿到的 phase 坐标重新可解析；simple reliable control — 净删 4 个失真点，零新增；helper-oriented — 无责任边界变化。已记录于 proposal。

## Risks / Trade-offs

- [文本锁过宽] → 只锁死段名/错坐标的**不存在**与修正指称的**存在**，不锁整段。
- [块边界漂移] → apply 前 sed 重核 `### Requirement:` 边界；程序化整块替换 + 逐字回验（C1 同法）。
- [既有测试锁定旧坐标文本] → apply 前 `list-doc-locks` 复核（C1 经验：doc-lock 列表即完整爆炸半径）。

## Migration Plan

纯文本变更，git revert 即完全回滚。

## Open Questions

无。

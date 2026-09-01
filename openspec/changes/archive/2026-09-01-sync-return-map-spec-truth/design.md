# Design: 2026-09-01-sync-return-map-spec-truth

## Context

`research/research-return-map` 主 spec 的三个 requirement 块（RRM-003 L76–153、RRM-006 L264–291、RRM-007 L292–878）存在与代码现状脱节的描述文本（见 proposal Why）。行为现状本身是 accepted 且正确的：`shared-return-map-authoring.md` 已是 compatibility pointer，`templates/seed-topic-template.md` + `command_playbook/operate-topic-state.md` 是 canonical owner（`tests/integration/md/seed-topic-projection-document-contract.test.mjs` 的断言锚点证明了这一点）；wave-token 过滤由现有 return-map 检查实现；5 个退役 token 规则名在代码中零存在。本 change 只做描述对齐。

## Goals / Non-Goals

**Goals:**

- delta 对主 spec 三个 requirement 块做**整块替换**，delta 与替换后主 spec 块逐字一致（满足 `residual-spec-drift-text-locks.test.mjs` 的 verbatim 同步语义）。
- 语义保持：除三处失真点（所有权锚、伪函数名、退役散文时态）外，normative 内容逐字保留，为 C3a 瘦身提供干净基线。
- 新增一个 unit 文本锁 `tests/engine/rrm-spec-truth-sync-text-locks.test.mjs`，把"清零态"变成回归锁。

**Non-Goals:**

- 不改任何行为：无 CLI/schema/gate/trace 变更；`return-map.mjs` 仅删一行注释中的一个死符号名。
- 不做 requirement 瘦身/拆分（C3a 范围）；不新增 header req ID；不动 `> req:` 头。
- 不触碰其他 spec 的 backfill token 提法（如 RWP 的 P4，属 C2）。

## Decisions

1. **整块替换而非行内 patch**：与既有 `residual-spec-drift-text-locks` 的整块替换语义一致，避免部分块同步造成新漂移。Alternative（行内 patch）被否：delta 与 main 的逐字校验会失配。
2. **退役散文改为过去时命名 + 不存在性声明，而非 `@deprecated` 场景**：这 5 个规则名从未在本 spec 形成过 scenario 块，无场景可标注； prose 化的"retired historical names, no rule exists"是更短的合法表述。Alternative（`@deprecated` 场景标注）保留给确有场景块的内容（canonical-topic-state 惯例）。
3. **伪函数名改为语义散文而非真实符号名**：遵守上一 plan 确立的 "spec prose 不点名实现 .mjs" 规则；语义（wave 归属表、skip 条件、目标波传递）逐字保持。
4. **文本锁锚定"否定断言 + 存在性断言"**：伪函数名/退役现在时/幽灵注释断言不存在；token→wave 归属表与 skip 语义关键句断言存在。防回归而不锁死措辞全部。
5. **设计评审三连的适用性**：semantic precision — RRM-003 概念收窄为 pointer 语义，读者有界问题不变；simple reliable control — 净删 3 个失真描述源，零新增控制面；helper-oriented — 无责任边界变化。均已记录于 proposal。

## Risks / Trade-offs

- [文本锁过宽锁死未来合法措辞] → 锁只针对"失真模式"（伪函数名模式、退役现在时句式）与关键语义句存在性，不锁整段文本。
- [RRM-007 块 587 行整块搬运出错] → delta 由 sed 从 main spec 逐字提取后再做定点 edit，apply 反向执行同样的整块替换；`git diff` 人工复核唯一差异点。
- [其他 spec 引用被改描述] → 已检索：无其他 main spec 引用伪函数名或 "shared authoring contract owns" 措辞；`list-doc-locks` 在 apply 前复核锁定面。

## Migration Plan

纯文本变更，无部署/回滚面；git revert 即完全回滚。

## Open Questions

无。

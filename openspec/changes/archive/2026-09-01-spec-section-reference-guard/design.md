# Design: 2026-09-01-spec-section-reference-guard

## Context

C2 审计的两处 HIGH 漂移（§3.3→§3.4 坐标腐坏、死段名 "Rerun-Aware Behavior"）均属"spec 引用坐标/段名与 owner Markdown 脱节"，现有 19 个 governance checker 不覆盖。C4 以最小 checker 补位，并对首扫发现的现存缺陷（autorun L120）就地清零。

## Goals / Non-Goals

**Goals:**

- 规则1（§ 坐标可达性）+ 规则2（现在时退役散文禁令）；check-all 自动发现接入。
- fixture 双向单测；autorun L120 一句改写（整块替换，delta verbatim）。

**Non-Goals:**

- 不做语义裁判（不判定引用是否"该存在"，只判定"引用是否可解析"）。
- 不覆盖无文件锚定的段名引用（如裸 "Rerun-Aware Behavior section"——此类需自然语言对齐，留给人审；在 checker 注释中说明边界）。
- 不改 gate/CLI/引擎代码。

## Decisions

1. **只断言可解析性**：`<file>.md §X.Y` → 文件存在 + 编号标题存在。正则锚定 `### X.Y（`/空格边界，避免误配 `3.40`。
2. **规则2 用整词句式** `SHALL be retired`：仅命中现在时退役 SHALL；`@deprecated` 标注与过去时散文不误伤（CTS 惯例与 C1 后的 RRM 均验证）。
3. **check-all 自动发现**：脚本名符合 `check-*.mjs` 即接入，零接线改动（check-all.mjs L41-44 机制）。
4. **autorun L120 改写**：`SHALL be retired from X` → `SHALL NOT appear in X (retired)`——同义禁令，消除 guard 误报源；整块 verbatim 替换留痕。
5. **设计评审三连**：semantic precision — checker 只回答"引用是否可解析"；simple reliable control — 一个只读脚本、两条规则、fail 带行号；helper-oriented — 确定性裁决归 Engine 面，修复归 Agent。

## Risks / Trade-offs

- [正则漏报（非 `.md §` 形式的坏引用）] → 明确边界：本 guard 只承诺文件锚定引用；裸段名漂移靠 review（已在 C2 修毕）。
- [误报（合法引用格式变体）] → 当前全库扫描 0 误报后落地；未来新格式若触发，按 checker 行号修复引用即可。

## Migration Plan

checker 为增量只读工具；git revert 即完全回滚。

## Open Questions

无。

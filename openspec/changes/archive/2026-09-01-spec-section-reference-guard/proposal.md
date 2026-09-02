# Proposal: 2026-09-01-spec-section-reference-guard

## Why

C2 批次证实了"spec 引用的章节坐标/段名已消失"这类漂移（`phase-wave0 §3.3`→实际 §3.4；死段名 "Rerun-Aware Behavior"），且现有 governance 无 checker 覆盖此类缺陷；C3a 同期还发现第二处现在时退役散文（`verification/experiment-agent-autorun` L120，本 change 顺手清零）。防复发 guard 是 plan（`_backlog/plans/spec-drift-audit-remediation-and-requirement-slimming.md` §3-C4）的落地。

## What Changes

- **新增 governance checker** `openspec/governance/check-spec-section-references.mjs`（只读、失败 exit 1）：
  - 规则1：main spec 中形如 `<file>.md §X.Y` 的坐标引用，目标文件必须存在于 `workflows/nodes/**` 且含该编号标题（`### X.Y …`）。
  - 规则2：main spec 禁止现在时退役句式 `SHALL be retired`（退役内容须 `@deprecated` 标注或过去时散文）。
- **接入 check-all**：check-all 自动发现 `check-*.mjs`（无接线改动）。
- **顺手清零**：`verification/experiment-agent-autorun` L120 "SHALL be retired from current registered playbooks" → "SHALL NOT appear … (retired)"（语义不变的禁令改写；checker 首扫即发现的现存缺陷）。
- **不产出**：不改行为语义、不改任何 gate/CLI/引擎代码、不新增 capability。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `verification/experiment-agent-autorun` | 主 spec L114-154 块 + guard 首扫命中 L120 | Modify | 一句退役措辞改写（禁令语义不变，整块替换）。 |
| `governance/change-feedback-loop` | catalog 行 | Excluded | checker 是普通 governance 工具，随 check-all 自动发现，不需要新 capability 或新 requirement ID（check-code-impl-ids 允许无 @impl）。 |
| `agent/agent-context-routing` | catalog 行 | Excluded | 无涉。 |

## Impact

- 新增 `openspec/governance/check-spec-section-references.mjs`；接入现有 check-all 自动发现（无 check-all.mjs 改动）。
- `openspec/specs/verification/experiment-agent-autorun/spec.md`：一个 requirement 块整块替换（一句改写）。
- 新增 `tests/governance/check-spec-section-references.test.mjs`（fixture 双向断言）。
- 首扫即清零现存缺陷；此后该类缺陷在 `governance:check`/finalizer 中即红。

## Source of Record 与责任边界

- Source of Record：owner Markdown 的实际标题结构。最短合法闭环：一个只读 checker + 一句改写，无新增状态/恢复面。Net simplification：此类漂移从"人肉考古"变为"机器即红"。
- Semantic-precision reflection：checker 断言的是"读者可达性"（引用坐标必须解析），不判定语义质量——不做语义裁判。
- 责任边界：checker 只返回确定性 fail/文件行号根因；无 user decision、无 permission 变化。

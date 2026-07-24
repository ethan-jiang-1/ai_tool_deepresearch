---
bug_id: BUG-111
title: "Reference diagnosis conflated canonical naming, rich content, and submitted backing"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave1
gate: wave1-complete
---

# BUG-111: Reference 的 canonical path/content/backing 被混淆

## 现象

Agent 创建了 40 个 rich per-source reference files，但它们使用如 `01-01_...` 的非 canonical names。Gate 选中的 canonical-prefix aggregate candidates 是 bare YAML arrays，因此未形成可计数的 parser-aligned rich-reference plus submitted-backing authority。

## 校正后的事实

`parseReferenceMetadata()` 在 first semantic section 前接受 bullet/colon metadata；production evidence 不支持“parser whitespace-strict”或“40 files 已处于正确 rich-reference contract”的结论。canonical filename、rich parser-aligned content 与 submitted backing 是三个独立 root，任何一个缺失都不能由另一个替代。

## 实际影响

- 不能用 bare YAML aggregate、filesystem presence 或非 canonical filename 声称 Gate 应计数。
- 不能以所谓 whitespace mismatch 为由增加 exact-byte template 或第二 parser authority。

## 建议方向

- 在 authoring point 提供 canonical full-topic-slug path、parser-aligned rich content 与 backing 的直接反馈。
- 让同一 parser/evaluator 分别报告 path、content 和 backing root；不新增 generic Markdown linter、fenced YAML authority 或 exact-format blocker。

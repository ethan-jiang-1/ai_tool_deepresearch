---
bug_id: BUG-105
title: "Shared reference failure diagnosis conflated raw source YAML with the rich-reference contract"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave0
gate: wave0-complete
---

# BUG-105: Shared reference 的 raw YAML 与 rich-reference contract 被混淆

## 现象

Wave0 gate 报告 `0 countable references (threshold: 9)`。production bundle 中同时存在两类不同 surface：40 个 rich per-source Markdown files 使用了如 `01-01_...` 的非 canonical 文件名；Gate 选中的五个 canonical-prefix aggregate candidates 则是 bare YAML arrays。

这些 bytes 证明 count/authority 没有闭合，但不证明 rich-reference Markdown parser 拒绝 YAML code fence。

## 根因

原始诊断混淆了 `source.yaml` 的 raw YAML output contract、rich-reference Markdown content contract、canonical filename，以及 submitted backing。这四项是独立 authority facts。当前证据不能支持“Gate 要求 rich metadata 是顶层 YAML”或“应把 fenced YAML 作为第二 rich-reference authority”的结论。

## 实际影响

- Gate 在 shared_ref_count_floor 上连续失败，随后只有 quality-only failure 时才合法 degraded。
- 非 canonical paths、bare aggregate arrays 和缺少 submitted backing 不能作为 rich-reference coverage。

## 建议方向

- 在 canonical rich-reference authoring point 提供 parser-aligned template 与直接 path/content/backing feedback。
- 分别诊断 canonical path、rich content 与 submitted backing；保留 `source.yaml` 的独立 raw YAML contract。
- 不新增 fenced/bare YAML rich-reference authority、generic Markdown linter 或 filesystem scan 补 provenance。

---
bug_id: BUG-111
title: "Reference file metadata-block format contract is unparseable by agent — 40 files in correct format still fail gate"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave1
gate: wave1-complete
---

# BUG-111: Reference metadata-block format 对 agent 不可解析

## 现象

Agent 按照 `shared-reference-template.md` 的 metadata-block 格式创建了 40 个 reference 文件（每 topic 8 个），包含所有必填字段（source_url, acceptance_status, source_type, tier, evidence_role, trust_level, why_it_matters, accessed_at, related_topic_uid）和 5 个 semantic sections。Gate 仍然报告 `reference_format`、`reference_source_url_parseable`、`per_topic_ref_md_count_floor` 失败——count=0。

## 根因假设

`parseReferenceMetadata()` 对 metadata block 的解析有严格的格式要求（如 `- key: value` 中 `: ` 后的空格数、行首空格的精确格式、section heading 的识别方式），这些要求没有在 template 中以 machine-verifiable 的方式指定。Agent 按照人类可读的 template 生成的格式与 parser 期望的格式存在微妙偏差。

## 实际影响

- BUG-105 的根源：不是 agent 不会写 reference，而是 parser 和 template 之间的格式契约 gap
- BUG-110 的推手：即使 agent 按 template 写了 40 个文件，gate 也无法通过，导致 fatigue degradation 永远不触发
- 40 个 well-formed reference 文件被 gate 视为 0 个 countable references

## 建议方向

- 提供 `reference-example.md` 作为 golden example，agent 可以逐字符复制格式
- 或：让 gate 在 `reference_format` 失败时输出 exact parse error with line number（类似 YAML parser 的错误信息）
- 或：改用 structured format（JSON Schema）替代 metadata block，消除解析歧义

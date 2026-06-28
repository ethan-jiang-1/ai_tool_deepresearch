# Reference Flat Format (delta)

> req: REF-006

## ADDED Requirements

### Requirement: Wave1 sub-agent reference file format specification

`phase-wave1-subagent.md` SHALL 在 §2 Artifacts section 中包含 reference 文件（`reference/{topic.slug}-<source-slug>.md`）的完整格式规范。

格式规范 SHALL 与 `shared-reference-template.md` 对齐：

- **元数据块**：位于文件头部、首个 `## ` header 之前。每行 `- key: value` 格式。9 个必填字段：`source_url`、`acceptance_status`、`source_type`、`tier`、`evidence_role`、`trust_level`、`why_it_matters`、`accessed_at`、`related_topic`
- **5 个标准 section**（`## ` header，顺序固定）：Key Facts、Core Content Capture、Relevance To This Research、Quotable Terms / Concepts、Risks And Limitations
- **明确排除 YAML frontmatter**：reference 文件 SHALL NOT 使用 `---` 包裹的 YAML frontmatter 格式

#### Scenario: Sub-agent role definition includes reference format spec

- **WHEN** Phase Agent 读取 `phase-wave1-subagent.md` §2 Artifacts
- **THEN** section SHALL 在 evidence-summary 和 question-list 之后，包含 reference 文件的格式规范
- **AND** 规范 SHALL 列出 9 个 metadata 字段名和 5 个 section header 名
- **AND** 规范 SHALL 明确禁止 YAML frontmatter 格式

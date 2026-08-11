# Reference Flat Format - Delta

> req: REF-002

## MODIFIED Requirements

### Requirement: Rich MD reference file template

每个 `reference/*.md` 文件 SHALL 遵循一致的 rich MD 模板，包含：

1. **Metadata block**: New or rewritten reference files SHALL begin with one
   `---` delimited YAML mapping containing:
   - `source_url`: 原始 URL
   - `source_file`: 本地文件路径或 `_none_`
   - `acceptance_status`: `accepted` / `accepted ⚠️` / `EXCLUDED`
   - `source_type`: `primary` / `secondary` / `mixed` / `meta`
   - `source_family`: source 来源分类
   - `tier`: `Tier 1` / `Tier 2` / `Tier 3` / `Tier 4`
   - `evidence_role`: `foundation` / `primary_topic_reference` / `deepening_reference` / `meta`
   - `topic_unique_status`: `shared_foundation` / `topic_NN_unique`
   - `accessed_at`: YYYY-MM-DD
   - `source_date_scope`: YYYY-YYYY
   - topic binding: `related_topic_uid` containing one exact registered UID or `all`, or compatibility field `related_topic` containing `all` or comma-separated exact current/previous ids or slugs; both MAY appear only when they resolve identically
   - `trust_level`: `academic` / `practitioner` / `official` / `caution` / `analyst` / `community`
   - `why_it_matters`: 为什么这条 source 对 research 重要
   - `related_entities`: 逗号分隔的关联实体列表
   - `captured_excerpt`: `yes` / `no`
   - `supports_claims`: 该 source 支持的 claim 列表
   - `risks_or_limitations`: 已知风险或局限
   - `excluded_reason`: `_none_` 或排除原因

The required metadata contract SHALL remain the eight common keys `source_url`, `acceptance_status`, `source_type`, `tier`, `evidence_role`, `trust_level`, `why_it_matters`, and `accessed_at`, plus one resolvable topic-binding form. `related_topic_uid` and legacy `related_topic` are compatibility inputs to one canonical resolver, not two authorities. A normal first-run reference that uses the existing `related_topic` form SHALL remain valid. A rerun or historical reference that uses only an exact `related_topic_uid` SHALL also be valid. Conflict, unknown identity, or ambiguity SHALL fail as topic binding rather than as a missing raw field.

Existing bullet metadata lines of the form `- key: value` before the first
recognized semantic section SHALL remain read-compatible only; they are not the
canonical writer presentation and do not require a bulk migration. A
frontmatter-bearing reference SHALL obtain metadata only from its opening YAML
mapping. Malformed YAML, a non-mapping YAML root, or an invalid frontmatter
boundary SHALL produce one parser-owned reference-metadata root with a repair
target at the metadata block, rather than a cascade of inferred missing-field
roots.

2. **Standard semantic sections**：
   - `## Key Facts`（bullet list，定量 + 定性事实）
   - `## Core Content Capture`（narrative synthesis paragraph）
   - `## Relevance To This Research`（为什么跟本次研究相关）
   - `## Quotable Terms / Concepts`（可用于最终报告的引述或概念）
   - `## Risks And Limitations`（诚实声明：此 source 不能支持什么）

The five semantic sections SHALL remain required and non-empty. In the
fenced-code-excluded body of each required section, the shared reference-format
evaluator SHALL reject a raw document-markup signature: `<!doctype` or an
opening or closing `html`, `head`, `body`, `script`, `style`, or `iframe` tag,
case-insensitively. This is a bounded structural format rule for copied
document payloads, not an HTML sanitizer or research-quality judgment. It
SHALL ignore the same literal inside fenced code and SHALL continue to tolerate
harmless heading case, heading level, surrounding spacing, section order,
prose length, Key Facts bullet count, and ordinary Markdown or non-document
inline HTML presentation. A contaminated section SHALL report one
`reference_format` root that names the reference coordinate and section and
directs the Agent to replace the copied document markup with interpreted
Markdown facts before rerunning the same checkpoint. The evaluator SHALL not
automatically strip, rewrite, or migrate existing reference/cache/evidence
bytes. `Key Facts` count or prose-richness feedback MAY remain advisory; `Core
Content Capture` SHALL remain a distinct narrative semantic section rather than
being inferred from the Key Facts list.

#### Scenario: Reference file has complete canonical metadata

- **WHEN** an Agent creates or rewrites a reference `.md` file
- **THEN** the file SHALL contain all common required metadata fields and one resolvable topic binding in its opening YAML frontmatter mapping
- **AND** values with YAML-sensitive punctuation or prose SHALL use YAML-safe quoting or block syntax

#### Scenario: Legacy inline metadata remains readable

- **WHEN** an existing reference contains all common required metadata as bullet key-value lines before its first semantic section
- **THEN** reference format validation SHALL continue to read and validate that metadata through the same semantic reader
- **AND** the existing bundle SHALL not require a formatting-only rewrite merely to pass current inspection

#### Scenario: Invalid frontmatter has one metadata root

- **WHEN** a reference begins with an unparseable or non-mapping YAML frontmatter block
- **THEN** reference format validation SHALL report one metadata-frontmatter root that identifies the frontmatter block as the repair surface
- **AND** it SHALL not emit one missing-field finding for each key that the invalid mapping could not supply

#### Scenario: UID form satisfies topic binding

- **WHEN** a reference contains all common required metadata and exact `related_topic_uid: tp_...` but no `related_topic`
- **THEN** reference format validation SHALL treat the topic-binding requirement as present
- **AND** it SHALL resolve the UID against current canonical registry facts

#### Scenario: Legacy form remains valid for normal execution

- **WHEN** a normal first-run reference contains all common required metadata and existing `related_topic` syntax
- **THEN** reference format validation SHALL continue to accept it through the shared resolver
- **AND** this change SHALL NOT require the normal producer to enter a rerun-specific format branch

#### Scenario: Conflicting identity forms fail closed

- **WHEN** both `related_topic_uid` and `related_topic` are present but resolve differently
- **THEN** validation SHALL return one topic-binding conflict
- **AND** it SHALL NOT report the UID form as merely an unknown optional field or select the legacy field by precedence

#### Scenario: Reference file has all standard sections

- **WHEN** Agent 创建 reference `.md` 文件
- **THEN** 文件 SHALL 包含可识别且非空的 `Key Facts`、`Core Content Capture`、`Relevance To This Research`、`Quotable Terms / Concepts`、`Risks And Limitations` 五个 semantic section

#### Scenario: Raw document markup in a required section is one format root

- **WHEN** a non-code body of one required semantic section contains
  `<!doctype` or an `html`, `head`, `body`, `script`, `style`, or `iframe` tag
- **THEN** the shared reference-format evaluator SHALL return one blocking
  `reference_format` root naming that reference and section
- **AND** the repair SHALL direct the Agent to replace the copied document
  markup with interpreted Markdown facts and rerun the same checkpoint

#### Scenario: Fenced document-markup literal remains reference content

- **WHEN** one required semantic section contains one of the bounded document
  markup signatures only inside a fenced code block and is otherwise non-empty
- **THEN** the reference-format evaluator SHALL not report document-markup
  format pollution for that section
- **AND** it SHALL not strip or rewrite the fenced literal

#### Scenario: Harmless Markdown presentation does not block

- **WHEN** a reference exposes all five semantic sections but differs only in heading case, heading level, whitespace, ordering, prose length, Key Facts bullet count, ordinary Markdown, or non-document inline HTML presentation
- **THEN** reference-format parsing SHALL accept the equivalent semantic structure or emit advisory feedback
- **AND** presentation differences alone SHALL NOT fail the reference or reduce its numeric count eligibility

#### Scenario: Missing semantic section remains one format root

- **WHEN** an accepted reference lacks a non-empty `Core Content Capture` section
- **THEN** the shared reference-format evaluator SHALL return that one missing semantic-section root
- **AND** count-floor SHALL NOT repeat it as a thin-content or zero-count symptom

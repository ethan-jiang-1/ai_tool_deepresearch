> req: REF-002, REF-007

## MODIFIED Requirements

### Requirement: Rich MD reference file template

Each reference/*.md file SHALL follow one rich Markdown template with a canonical YAML-frontmatter metadata presentation and five semantic sections.

1. **Metadata block**: New or rewritten reference files SHALL begin with one --- delimited YAML mapping. The mapping SHALL contain:
   - source_url: the original URL
   - source_file: local file path or _none_
   - acceptance_status: accepted / accepted ⚠️ / EXCLUDED
   - source_type: primary / secondary / mixed / meta
   - source_family: source classification
   - tier: Tier 1 / Tier 2 / Tier 3 / Tier 4
   - evidence_role: foundation / primary_topic_reference / deepening_reference / meta
   - topic_unique_status: shared_foundation / topic_NN_unique
   - accessed_at: YYYY-MM-DD
   - source_date_scope: YYYY-YYYY
   - topic binding: related_topic_uid containing one exact registered UID or all, or compatibility field related_topic containing all or comma-separated exact current/previous ids or slugs; both MAY appear only when they resolve identically
   - trust_level: academic / practitioner / official / caution / analyst / community
   - why_it_matters: why the source matters to this research
   - related_entities: a comma-separated related-entity list
   - captured_excerpt: yes / no
   - supports_claims: claims supported by this source
   - risks_or_limitations: known risks or limitations
   - excluded_reason: _none_ or an exclusion reason

The required metadata contract SHALL remain the eight common keys source_url, acceptance_status, source_type, tier, evidence_role, trust_level, why_it_matters, and accessed_at, plus one resolvable topic-binding form. related_topic_uid and legacy related_topic are compatibility inputs to one canonical resolver, not two authorities. A normal first-run reference that uses the existing related_topic form SHALL remain valid. A rerun or historical reference that uses only an exact related_topic_uid SHALL also be valid. Conflict, unknown identity, or ambiguity SHALL fail as topic binding rather than as a missing raw field.

Existing bullet metadata lines of the form - key: value before the first recognized semantic section SHALL remain read-compatible only; they are not the canonical writer presentation and do not require a bulk migration. A frontmatter-bearing reference SHALL obtain metadata only from its opening YAML mapping. Malformed YAML, a non-mapping YAML root, or an invalid frontmatter boundary SHALL produce one parser-owned reference-metadata root with a repair target at the metadata block, rather than a cascade of inferred missing-field roots.

2. **Standard semantic sections**:
   - Key Facts (bullet list, quantitative and qualitative facts)
   - Core Content Capture (narrative synthesis paragraph)
   - Relevance To This Research (why it is relevant)
   - Quotable Terms / Concepts (terms or concepts usable in the final report)
   - Risks And Limitations (honest statement of what this source cannot support)

The five semantic sections SHALL remain required and non-empty, but the shared parser SHALL identify them tolerantly across harmless heading case, heading level, surrounding spacing, and section order differences. Exact ## level, a fixed section order, a fixed prose character count, and a fixed number of Key Facts bullets SHALL NOT be blocking authority. Key Facts count or prose-richness feedback MAY remain advisory; Core Content Capture SHALL remain a distinct narrative semantic section rather than being inferred from the Key Facts list.

#### Scenario: Reference file has complete canonical metadata

- **WHEN** an Agent creates or rewrites a reference .md file
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

- **WHEN** a reference contains all common required metadata and exact related_topic_uid: tp_... but no related_topic
- **THEN** reference format validation SHALL treat the topic-binding requirement as present
- **AND** it SHALL resolve the UID against current canonical registry facts

#### Scenario: Legacy form remains valid for normal execution

- **WHEN** a normal first-run reference contains all common required metadata and existing related_topic syntax
- **THEN** reference format validation SHALL continue to accept it through the shared resolver
- **AND** this change SHALL NOT require the normal producer to enter a rerun-specific format branch

#### Scenario: Conflicting identity forms fail closed

- **WHEN** both related_topic_uid and related_topic are present but resolve differently
- **THEN** validation SHALL return one topic-binding conflict
- **AND** it SHALL NOT report the UID form as merely an unknown optional field or select the legacy field by precedence

#### Scenario: Reference file has all standard sections

- **WHEN** an Agent creates a reference .md file
- **THEN** the file SHALL contain recognizable and non-empty Key Facts, Core Content Capture, Relevance To This Research, Quotable Terms / Concepts, and Risks And Limitations semantic sections

#### Scenario: Harmless Markdown presentation does not block

- **WHEN** a reference exposes all five semantic sections but differs only in heading case, heading level, whitespace, ordering, prose length, or Key Facts bullet count
- **THEN** reference-format parsing SHALL accept the equivalent semantic structure or emit advisory feedback
- **AND** presentation differences alone SHALL NOT fail the reference or reduce its numeric count eligibility

#### Scenario: Missing semantic section remains one format root

- **WHEN** an accepted reference lacks a non-empty Core Content Capture section
- **THEN** the shared reference-format evaluator SHALL return that one missing semantic-section root
- **AND** count-floor SHALL NOT repeat it as a thin-content or zero-count symptom

### Requirement: Agent-facing source.yaml and reference metadata formats SHALL be parser-aligned and complete

Agent-facing phase docs, shared schema docs, work-unit tasks, and repair diagnostics SHALL describe artifacts/waveN/{topic}/source.yaml in the exact shape parsed by the Engine: a top-level YAML array where each entry includes at least url, title, retrieved_date, and topic_tag. Guidance SHALL warn that wrapping entries under sources:, wave:, or topic: produces an object and is invalid for this parser.

Reference Markdown metadata guidance SHALL present opening YAML frontmatter as the canonical new-output form parsed by the shared reference metadata reader. Guidance SHALL describe the eight common required fields plus one topic-binding form, explain that related_topic_uid and legacy related_topic feed the same canonical resolver, and state that conflicting dual declarations fail. It SHALL explicitly state that legacy bullet metadata remains read-compatible but is not the form a new producer should choose. A malformed YAML mapping SHALL receive a parser-aligned metadata-block repair; a valid mapping missing one required field SHALL receive the existing field-specific repair. Normal first-run guidance SHALL not require a rerun-specific metadata branch, and rerun/history guidance SHALL not require mass rewriting of already covered legacy references merely to change presentation.

At the Wave0 source-intake authoring decision point, the actual delegated actor guidance SHALL load shared/shared-reference-template through its requires chain. The template SHALL expose the canonical reference/00-shared-<slug>.md filename, parser-aligned YAML-frontmatter rich Markdown metadata and semantic sections, and the required output_files[] reference declaration with source_url. A Phase document merely mentioning the template, indirect discovery by the actor, a bare YAML document without Markdown sections, filesystem presence, a noncanonical filename, or an otherwise parseable reference with no formal submitted backing SHALL NOT substitute for that producer contract. This requirement SHALL NOT create a byte-exact formatting rule, a second parser, a generic Markdown linter, a new reference metadata authority, or Phase-owned Wave0 reference creation.

Guidance SHALL keep reference/_INDEX.md separate from topic identity authority: it is the accepted eight-column navigation table and must be updated by the normal Wave materialization step. Repair diagnostics SHALL distinguish an invalid/missing table parent from missing rows and SHALL give one nearest same-inspect action without asking the user to run ordinary repair commands.

#### Scenario: source.yaml top-level array is documented

- **WHEN** an Agent reads wave source output instructions
- **THEN** it SHALL see that source.yaml starts with YAML list entries at the top level
- **AND** it SHALL see that { sources: [...] }, wave:, or topic: wrappers are invalid for the current parser

#### Scenario: source.yaml required fields are documented

- **WHEN** an Agent writes a source.yaml entry
- **THEN** guidance SHALL require url, title, retrieved_date, and topic_tag
- **AND** guidance SHALL state that retrieved_date is a string date and topic_tag is a string tag usable by gate diagnostics

#### Scenario: YAML serialization guidance avoids common parse failures

- **WHEN** an Agent writes field values containing colons, semicolons, arrows, brackets, or long prose
- **THEN** guidance SHALL instruct it to quote or block-string those values using YAML-safe syntax
- **AND** diagnostics SHALL prefer parser-aligned repair language over generic cannot parse YAML array

#### Scenario: Reference metadata uses canonical YAML frontmatter

- **WHEN** an Agent writes a new reference/*.md file
- **THEN** guidance SHALL show an opening YAML frontmatter mapping as the accepted metadata form parsed by the shared reference metadata reader
- **AND** it SHALL distinguish legacy bullet compatibility from the canonical new-output form

#### Scenario: Source intake receives the reference template it must use

- **WHEN** a Wave0 source-intake actor receives a generated task
- **THEN** its role guidance SHALL load the existing shared-reference template through the actual delivery chain
- **AND** it SHALL author any shared reference as its declared reference output rather than ask the Phase Agent to create an alternate projection

#### Scenario: Wave1 rerun repair uses normal materialization contract

- **WHEN** Wave1 rerun inspect reports UID binding or index-table drift for historical references
- **THEN** the Phase Agent SHALL repair the named reference projection or index table and rerun the same inspect
- **AND** it SHALL NOT enqueue research solely to change metadata spelling, mass-rewrite already covered historical references, or ask the user to execute the mechanical repair

### Requirement: Wave1 sub-agent reference file format specification

Wave1 topic reference file format SHALL remain aligned with
`shared-reference-template.md`, while canonical Wave1 topic-reference
materialization remains Phase-owned after successful work-unit submit. Sub-agent
role/task guidance SHALL provide source evidence, source claims, cache trails,
and optional source-candidate details needed for materialization; it SHALL NOT
make rich topic-reference Markdown a required delegated receipt unless a
separate accepted task explicitly assigns that output.

The format specification SHALL be available to Phase Agent materialization
guidance and to any work-unit task explicitly assigned a reference output. New
rich-reference files SHALL begin with one YAML-frontmatter mapping containing
the eight common metadata fields plus one resolvable topic-binding form, then
expose the five required non-empty semantic sections. Legacy bullet metadata
before the first recognized semantic section remains read-compatible only; it
is not a second writer presentation. Heading case, level, spacing, section
order, and list presentation remain tolerant. A malformed or non-mapping
frontmatter block SHALL return the shared
`reference_metadata_frontmatter_invalid` root at that mapping rather than
field-level cascades.

#### Scenario: Phase Agent guidance includes canonical reference format

- **WHEN** the Phase Agent materializes Wave1 topic references after successful submit
- **THEN** its guidance SHALL include or point to one opening YAML-frontmatter metadata mapping and the five semantic sections
- **AND** it SHALL not tell the Agent to rewrite existing valid legacy bullet metadata merely to change presentation

#### Scenario: Sub-agent role is not canonical reference presentation owner

- **WHEN** a Wave1 work-unit task is generated for `dpt-evidence-extractor`
- **THEN** the task SHALL require submitted source evidence, source claims, cache trails, result, and receipt surfaces
- **AND** it SHALL NOT require canonical topic-reference presentation as a delegated receipt unless that task explicitly assigns reference output under an accepted output contract

#### Scenario: Explicitly assigned reference output uses the shared format

- **WHEN** a future or supplementary accepted work-unit task explicitly assigns a rich reference Markdown output
- **THEN** that output SHALL use the same opening YAML-frontmatter metadata mapping and five semantic sections
- **AND** it SHALL still require submitted source/cache backing before it can count as fetched-source evidence

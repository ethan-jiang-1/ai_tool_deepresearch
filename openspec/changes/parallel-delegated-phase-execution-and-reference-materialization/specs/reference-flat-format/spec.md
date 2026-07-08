> req: REF-006, REF-008

## MODIFIED Requirements

### Requirement: Wave1 sub-agent reference file format specification

Wave1 topic reference file format SHALL remain aligned with `shared-reference-template.md`, but canonical Wave1 topic reference materialization SHALL be Phase-owned after successful work-unit submit. Sub-agent role/task guidance SHALL provide source evidence, source claims, cache trails, and optional source-candidate details needed for materialization; it SHALL NOT make rich topic reference Markdown a required delegated receipt unless a separate accepted task explicitly assigns that output.

The format specification SHALL be available to the Phase Agent materialization guidance and to any work-unit task that is explicitly assigned a reference output. The format SHALL align with `shared-reference-template.md`:

- **Metadata block**: at the top of the file, before the first `## ` header. Each line in `- key: value` format. 9 required fields: `source_url`, `acceptance_status`, `source_type`, `tier`, `evidence_role`, `trust_level`, `why_it_matters`, `accessed_at`, `related_topic`
- **5 standard sections** (`## ` headers, fixed order): Key Facts, Core Content Capture, Relevance To This Research, Quotable Terms / Concepts, Risks And Limitations
- **Explicitly exclude YAML frontmatter**: reference files SHALL NOT use `---` wrapped YAML frontmatter format

#### Scenario: Phase Agent guidance includes reference format spec

- **WHEN** the Phase Agent materializes Wave1 topic references after successful submit
- **THEN** the materialization guidance SHALL include or point to the reference metadata and section format
- **AND** the generated reference SHALL list 9 metadata field names and 5 section header names
- **AND** the reference SHALL forbid YAML frontmatter format

#### Scenario: Sub-agent role is not canonical reference presentation owner

- **WHEN** a Wave1 work-unit task is generated for `dpt-evidence-extractor`
- **THEN** the task SHALL require submitted source evidence, source claims, cache trails, result, and receipt surfaces
- **AND** it SHALL NOT require canonical topic reference presentation as a delegated receipt unless that task explicitly assigns reference output under an accepted output contract

#### Scenario: Explicitly assigned reference output uses same format

- **WHEN** a future or supplementary accepted work-unit task explicitly assigns a rich reference Markdown output
- **THEN** that output SHALL use the same metadata block and five standard sections
- **AND** it SHALL still require submitted source/cache backing before it can count as fetched-source evidence

## ADDED Requirements

### Requirement: Phase-owned reference materializations SHALL preserve submitted source backing

Phase-owned reference files SHALL be consumer-facing projections, not alternate delegated evidence authority. A Phase-owned reference SHALL identify concrete backing from submitted source claims, accepted source URLs, cache trails, work-unit refs, prior-wave artifacts, or Wave2 ledger/index findings. It SHALL NOT introduce accepted fetched-source evidence that lacks submitted work-unit or prior accepted backing.

For Wave1 topic references, backing SHALL come from submitted `wave1_topic_deepening` rows and their source/cache claims. For Wave2 existing-backed cross references, backing SHALL come from already submitted Wave0/Wave1 evidence plus Wave2 `W2F-xxx` ledger/index process evidence. For Wave2 new external evidence, backing SHALL come from submitted `wave2_targeted_evidence` rows.

This change SHALL NOT require a new required reference metadata key or a new required `_INDEX.md` column to classify Phase-owned projections. Classification SHALL use the existing reference metadata block, `_INDEX.md` rows and `source_layer`, submitted source/cache/work-unit ledgers, output declarations, and Wave2 `W2F-xxx` ledger/index refs. `source_layer` is a navigation label and SHALL NOT be sufficient authority by itself.

#### Scenario: Wave1 topic reference cites submitted backing

- **WHEN** the Phase Agent writes `reference/{topic_slug}-<source-slug>.md`
- **THEN** the reference SHALL cite or be traceable to submitted Wave1 source claims and cache trails for its `source_url`
- **AND** `_INDEX.md` SHALL include a row for the reference

#### Scenario: Wave2 existing-backed cross reference cites prior evidence

- **WHEN** the Phase Agent writes `reference/00-cross-*.md` during pure synthesis
- **THEN** the reference SHALL cite a `W2F-xxx` id and concrete Wave0/Wave1 backing refs
- **AND** it SHALL NOT claim new fetched-source discovery unless targeted evidence was submitted

#### Scenario: unbacked reference is diagnostic, not authority

- **WHEN** a reference file exists with a source URL or claim that cannot be tied to submitted or prior accepted backing
- **THEN** gates or inspectors SHALL report it as unbacked drift or repair input
- **AND** it SHALL NOT count as delegated fetched-source coverage

#### Scenario: source layer is not authority by itself

- **WHEN** `_INDEX.md` lists a reference row with `source_layer: wave2_cross` or another legal navigation layer
- **AND** the reference lacks deterministic backing through submitted source/cache/work-unit ledgers or Wave2 finding refs
- **THEN** the row SHALL NOT make the reference accepted evidence
- **AND** gates or inspectors SHALL diagnose missing backing rather than infer authority from the layer label

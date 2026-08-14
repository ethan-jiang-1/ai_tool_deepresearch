## MODIFIED Requirements

### Requirement: Sub-agent reference file format specification

Rerun-produced reference files SHALL use the same metadata and semantic
contract as normal reference materialization. They SHALL expose the eight
common required metadata keys, exactly one current canonical topic-binding form
(`related_topic_uid` or `related_topic_uids`), and the five required non-empty
semantic sections: Key Facts, Core Content Capture, Relevance To This Research,
Quotable Terms / Concepts, and Risks And Limitations.

The shared parser SHALL tolerate harmless heading case/level, whitespace,
section order and list-marker presentation. A fixed heading level, fixed
section order, fixed prose length, or fixed Key Facts bullet count SHALL NOT be
a rerun-specific blocking rule. A retained historical reference containing
`related_topic` remains human-readable but SHALL return the common
`reference_topic_binding_legacy_unsupported` result when a current rerun reader
attempts to consume it; rerun SHALL not rewrite it, migrate it, or create a
metadata-only work unit.

#### Scenario: Rerun reference uses the normal tolerant semantic contract

- **WHEN** a rerun-added Topic materializes a reference with all required
  metadata, a current UID binding, and five non-empty semantic sections in an
  equivalent presentation
- **THEN** the same shared reference-format evaluator used by normal execution
  SHALL accept it
- **AND** rerun SHALL NOT impose a second fixed-order or fixed-quantity format
  path

#### Scenario: Historical UID binding does not require legacy-field rewrite

- **WHEN** an existing rerun-consumed reference has one exact registered
  `related_topic_uid` and no legacy `related_topic`
- **THEN** the shared resolver SHALL treat the topic binding as present
- **AND** the Agent SHALL NOT create a work unit solely to change metadata
  spelling

#### Scenario: Legacy reference cannot enter a current rerun evidence path

- **WHEN** a rerun encounters a retained reference containing `related_topic`
- **THEN** the current reader SHALL return
  `reference_topic_binding_legacy_unsupported`
- **AND** it SHALL not use that reference for rerun provenance, coverage, or
  reference materialization

#### Scenario: Sub-agent role definition includes reference format

- **WHEN** Phase Agent reads `phase-wave1-subagent.md` to construct sub-agent
  task context
- **THEN** the §2 Artifacts section SHALL include the reference file format
  specification after the evidence-summary and question-list format
  specifications
- **AND** the format specification SHALL reference
  `shared-reference-template.md` specific field and section header names

#### Scenario: Task card action text includes reference format checklist

- **WHEN** Phase Agent creates a task card for wave1 deepening
- **THEN** the `action` field SHALL include a complete checklist of the
  reference file format (9 metadata field names + 5 `##` section header names)
- **AND** the checklist SHALL explicitly state use of metadata block format
  (`- key: value`), not YAML frontmatter (`---`)

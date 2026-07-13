> req: RTI-001, RTI-003

## MODIFIED Requirements

### Requirement: Sub-agent reference file format specification

Rerun-produced reference files SHALL use the same metadata and semantic contract as normal reference materialization. They SHALL expose the eight common required metadata keys, one canonical topic-binding form resolved from exact `related_topic_uid` or compatible legacy `related_topic`, and the five required non-empty semantic sections: Key Facts, Core Content Capture, Relevance To This Research, Quotable Terms / Concepts, and Risks And Limitations.

The shared parser SHALL tolerate harmless heading case/level, whitespace, section order and list-marker presentation. A fixed heading level, fixed section order, fixed prose length, or fixed Key Facts bullet count SHALL NOT be a rerun-specific blocking rule. Existing historical references that resolve through the canonical adapter SHALL not require metadata-only mass rewrite.

#### Scenario: Rerun reference uses the normal tolerant semantic contract

- **WHEN** a rerun-added Topic materializes a reference with all required metadata and five non-empty semantic sections in an equivalent presentation
- **THEN** the same shared reference-format evaluator used by normal execution SHALL accept it
- **AND** rerun SHALL NOT impose a second fixed-order or fixed-quantity format path

#### Scenario: Historical UID binding does not require legacy-field rewrite

- **WHEN** an existing rerun-consumed reference has one exact registered `related_topic_uid` and no legacy `related_topic`
- **THEN** the shared resolver SHALL treat the topic binding as present
- **AND** the Agent SHALL NOT create a work unit solely to change metadata spelling


### Requirement: Gate content quality rules for reference files

Rerun Wave1 SHALL use the normal Gate rule set and shared evaluators. Numeric countability SHALL require authority-selected accepted status plus a parseable source URL. Required semantic-section availability SHALL remain a separate `reference_format` responsibility. The historical blocking `key_facts_min_lines` rule SHALL be removed rather than retained as a rerun-specific floor; Key Facts quantity or prose richness MAY appear only as advisory feedback.

Source URL presence, submitted backing, canonical topic binding, accepted index navigation, cache/provenance integrity and genuinely missing required semantic sections SHALL remain blocking through their direct owners. Presentation tolerance SHALL NOT grant authority to filesystem-only references or weaken ledger/receipt/hash validation.

#### Scenario: Fewer than five Key Facts is not a rerun blocker

- **WHEN** an authority-backed rerun reference has accepted status, a parseable source URL and all five non-empty semantic sections but fewer than five Key Facts bullets
- **THEN** Wave1 SHALL NOT fail `key_facts_min_lines` or reduce the numeric count
- **AND** any quantity observation SHALL remain advisory and absent from `failed_rule_ids` and `hints[]`

#### Scenario: Missing semantic section remains blocking once

- **WHEN** an authority-backed rerun reference lacks the Core Content Capture semantic section
- **THEN** the shared reference-format evaluator SHALL return one missing-section root
- **AND** count-floor SHALL NOT repeat the same absence as a thin-content or zero-count symptom

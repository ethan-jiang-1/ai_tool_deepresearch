> req: SNC-005

## ADDED Requirements

### Requirement: Sub-agent role contracts SHALL return source backing instead of owning consumer reference presentation

Sub-agent role contracts for Wave1 topic deepening and Wave2 targeted evidence SHALL focus on bounded high-I/O source work: search, fetch, extraction, evidence summaries or bounded evidence payloads, structured source claims, accepted source URLs when available, cache trails, runtime receipts, and result JSON. They SHALL NOT be the canonical owner of consumer-facing reference presentation unless a specific accepted work-unit task explicitly assigns a reference output.

For Wave1 `dpt-evidence-extractor`, canonical topic reference Markdown files SHALL be Phase-owned post-submit materializations. For Wave2 `dpt-topic-scout`, the Sub-agent SHALL return source evidence and cache trails for the assigned finding; the Phase Agent SHALL update `finding-index.yaml`, `cross-topic-ledger.md`, seed-topic backfill, and any `reference/00-cross-*.md` projection after submit.

When a Sub-agent is explicitly assigned a fetched-source reference output, normal work-unit submit rules still apply: the output path must be declared, cache trails must be verified, and the reference must not gain authority without submitted ledger backing.

#### Scenario: Wave1 evidence extractor returns source substrate

- **WHEN** a `dpt-evidence-extractor` work unit completes
- **THEN** its result SHALL expose source claims, accepted source URLs when available, output files for evidence-summary/question-list, and cache trails
- **AND** canonical topic reference Markdown SHALL be materialized by the Phase Agent after successful submit and before Wave1 gate for accepted submitted sources suitable for consumer navigation

#### Scenario: Wave2 topic scout does not update synthesis authority files

- **WHEN** a `dpt-topic-scout` work unit completes
- **THEN** it SHALL return bounded evidence, source URLs, confidence/fills-gap payload, and cache trails
- **AND** it SHALL NOT decide final finding status or update `finding-index.yaml`, `cross-topic-ledger.md`, `synthesis.md`, or seed-topic backfill authority

#### Scenario: explicitly assigned reference output remains ledger-bound

- **WHEN** a work-unit task explicitly assigns a Sub-agent to write a reference Markdown file
- **THEN** that file SHALL be declared in `output_files[]` and backed by verified cache trails where fetched-source evidence is claimed
- **AND** `operate-work-unit submit` SHALL remain the only delegated success boundary

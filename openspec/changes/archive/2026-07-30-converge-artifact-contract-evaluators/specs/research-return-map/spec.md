> req: RRM-001

## MODIFIED Requirements

### Requirement: Research wave returns SHALL include Agent-readable evidence-to-claim maps

Wave0, Wave1, and Wave2 return/backfill surfaces SHALL include an Agent-readable map from evidence to meaning. The map SHALL help a future Agent answer: what this evidence says, which must-answer, hypothesis, pending question, or finding it affects, where to read the supporting material, what status changed, and what next hop is recommended.

The return map is a navigation and interpretation layer over existing authority surfaces. It SHALL NOT replace submitted work-unit ledger rows, reference/*.md, artifacts/waveN/..., _cache/..., or finding-index.yaml, and it SHALL NOT make filesystem-only or undeclared evidence count for gate coverage.

Return-map shape checks SHALL consume only the declared Seed Topic projection/backfill slots for the inspected Wave. A rich reference file, a Wave1 evidence-summary.md or question-list.md artifact, a Wave2 synthesis/ledger/index artifact, a Phase-owned reference projection, or reference/_INDEX.md SHALL NOT be inferred to be a return-map document merely from its directory, filename, URL, or prose. Those artifacts SHALL be evaluated only through their declared format, artifact, index, and submitted-backing contracts.

Return-map shape checks SHALL be implemented as Agent-facing guidance, task/backfill validation, inspect output, or advice. Missing or malformed return-map fields SHALL NOT by themselves establish or revoke delegated gate coverage, phase handoff evidence, readiness evidence, final delivery evidence, or submitted work-unit authority.

Each important return-map entry SHALL include at least:

- a short evidence meaning or claim summary;
- a relationship to the topic question, hypothesis, pending question, or finding (supports, refutes, partial, opens, defers, or context);
- bundle-relative refs to available evidence surfaces such as reference/*.md, artifacts/wave0/<topic>/source.yaml, artifacts/wave1/<topic>/evidence-summary.md, artifacts/wave1/<topic>/question-list.md, artifacts/wave2/cross-topic-ledger.md, artifacts/wave2/finding-index.yaml, _cache/..., and _work_units/...;
- a status label such as supported, refuted, partial, open, emergent, or deferred;
- a next-hop reading or repair pointer for future Agent re-entry.

#### Scenario: Wave0 origin backfill explains hypothesis impact

- **WHEN** Wave0 finds that AIDLC originated from AWS/Raja SP rather than bottom-up community emergence
- **THEN** the topic return/backfill SHALL say that the original hypothesis was refuted
- **AND** it SHALL link to the relevant source.yaml, reference file, cache leaf, and work-unit/ledger refs when available
- **AND** it SHALL tell a future Agent whether to continue with provenance confirmation, ecosystem spread, or branding-risk analysis

#### Scenario: Return map does not create evidence authority

- **WHEN** a return-map entry links to a filesystem-only reference that lacks submitted work-unit ledger coverage
- **THEN** the map MAY describe it as cleanup or forensic context
- **AND** it SHALL NOT make that reference count as delegated gate coverage

#### Scenario: Return-map validation is diagnostic only

- **WHEN** an inspect/advice command reports missing evidence_meaning, relationship, refs, status, or next_hop in a declared Seed Topic projection slot
- **THEN** the diagnostic SHALL direct the Agent to repair the map or backfill shape through its existing legal writer
- **AND** it SHALL NOT treat the map shape as a substitute for submitted work-unit rows, gate attempts, phase handoff witnesses, or final delivery evidence

#### Scenario: Rich reference is not a return-map input

- **WHEN** a submitted rich reference has canonical reference metadata and semantic sections but no return-map entry fields
- **THEN** Wave inspect SHALL not emit a return-map missing-fields, naked-evidence-list, or unsupported-prose finding for that reference
- **AND** its format and submitted-backing checks SHALL retain their existing owners

#### Scenario: Wave1 artifact is not a return-map input

- **WHEN** a submitted Wave1 evidence-summary.md or question-list.md satisfies its declared artifact contract but omits return-map fields
- **THEN** Wave1 inspect SHALL not emit return-map findings for that artifact
- **AND** a malformed Seed Topic Wave1 projection SHALL still be reported at its exact Seed Topic coordinate

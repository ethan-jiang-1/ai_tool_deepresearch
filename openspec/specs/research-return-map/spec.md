# Research Return Map

> req: RRM-001, RRM-002, RRM-003

## Purpose

Define the Agent-readable evidence-to-claim return map that wave returns and seed-topic backfill surfaces SHALL include. The return map is a navigation and interpretation layer over existing authority surfaces, helping future Agents understand what evidence says, which must-answer/hypothesis/pending question/finding it affects, where to read supporting material, what status changed, and what next hop is recommended.

## Requirements

### Requirement: Research wave returns SHALL include Agent-readable evidence-to-claim maps

Wave0, Wave1, and Wave2 return/backfill surfaces SHALL include an Agent-readable map from evidence to meaning. The map SHALL help a future Agent answer: what this evidence says, which must-answer, hypothesis, pending question, or finding it affects, where to read the supporting material, what status changed, and what next hop is recommended.

The return map is a navigation and interpretation layer over existing authority surfaces. It SHALL NOT replace submitted work-unit ledger rows, `reference/*.md`, `artifacts/waveN/...`, `_cache/...`, or `finding-index.yaml`, and it SHALL NOT make filesystem-only or undeclared evidence count for gate coverage.

Return-map shape checks SHALL be implemented as Agent-facing guidance, task/backfill validation, inspect output, or advice. Missing or malformed return-map fields SHALL NOT by themselves establish or revoke delegated gate coverage, phase handoff evidence, readiness evidence, final delivery evidence, or submitted work-unit authority.

Each important return-map entry SHALL include at least:

- a short evidence meaning or claim summary;
- a relationship to the topic question, hypothesis, pending question, or finding (`supports`, `refutes`, `partial`, `opens`, `defers`, or `context`);
- bundle-relative refs to available evidence surfaces such as `reference/*.md`, `artifacts/wave0/<topic>/source.yaml`, `artifacts/wave1/<topic>/evidence-summary.md`, `artifacts/wave1/<topic>/question-list.md`, `artifacts/wave2/cross-topic-ledger.md`, `artifacts/wave2/finding-index.yaml`, `_cache/...`, and `_work_units/...`;
- a status label such as supported, refuted, partial, open, emergent, or deferred;
- a next-hop reading or repair pointer for future Agent re-entry.

#### Scenario: Wave0 origin backfill explains hypothesis impact

- **WHEN** Wave0 finds that AIDLC originated from AWS/Raja SP rather than bottom-up community emergence
- **THEN** the topic return/backfill SHALL say that the original hypothesis was refuted
- **AND** it SHALL link to the relevant `source.yaml`, reference file, cache leaf, and work-unit/ledger refs when available
- **AND** it SHALL tell a future Agent whether to continue with provenance confirmation, ecosystem spread, or branding-risk analysis

#### Scenario: Return map does not create evidence authority

- **WHEN** a return-map entry links to a filesystem-only reference that lacks submitted work-unit ledger coverage
- **THEN** the map MAY describe it as cleanup or forensic context
- **AND** it SHALL NOT make that reference count as delegated gate coverage

#### Scenario: Return-map validation is diagnostic only

- **WHEN** an inspect/advice command reports missing `evidence_meaning`, `relationship`, `refs`, `status`, or `next_hop`
- **THEN** the diagnostic SHALL direct the Agent to repair the map or backfill shape
- **AND** it SHALL NOT treat the map shape as a substitute for submitted work-unit rows, gate attempts, phase handoff witnesses, or final delivery evidence

### Requirement: Seed-topic backfill SHALL preserve traceable meaning, not only evidence lists or conclusions

Seed-topic backfill for Wave0, Wave1, and Wave2 SHALL replace backfill tokens with concise map entries that combine evidence meaning with traceable refs. Backfill SHALL NOT be only a naked list of URLs, only a prose conclusion, or only a count summary.

Wave0 backfill SHALL connect sources/references to must-answers and initial hypotheses. Wave1 backfill SHALL connect mechanism/trend/open-question updates to evidence-summary, question-list, reference, cache, and work-unit refs. Wave2 backfill SHALL preserve finding IDs and link to `cross-topic-ledger.md` and `finding-index.yaml` entries used for projection.

#### Scenario: Wave1 backfill explains what was learned

- **WHEN** a Wave1 deepening task updates `__BACKFILL_WAVE1_MECHANISMS__`
- **THEN** the replacement content SHALL include one or more mechanism/trend statements
- **AND** each statement SHALL include refs to the evidence-summary or question-list and supporting reference/cache/work-unit surfaces where available

#### Scenario: Wave2 backfill preserves finding lineage

- **WHEN** a Wave2 backfill task updates `__BACKFILL_WAVE2_JUDGMENT__`
- **THEN** the replacement content SHALL cite relevant finding IDs
- **AND** it SHALL link those findings back to `finding-index.yaml`, `cross-topic-ledger.md`, and source artifacts used by the finding

### Requirement: Shared guidance SHALL teach the same return-map shape across waves

Agent-facing workflow/shared docs, work-unit tasks, and wave phase instructions SHALL teach the same minimum return-map shape across Wave0, Wave1, and Wave2. The wording SHALL make clear that evidence collection, extraction, synthesis, and seed-topic backfill all need short meaning statements plus refs, so later Agents can follow the map without rereading the whole bundle blindly.

#### Scenario: Wave docs describe return-map fields consistently

- **WHEN** a Phase Agent reads Wave0, Wave1, or Wave2 guidance
- **THEN** it SHALL see the same minimum return-map fields: evidence meaning, relationship, refs, status, and next hop
- **AND** it SHALL see that refs are bundle-relative paths under the active bundle root

#### Scenario: Missing map receives repair-targeted feedback

- **WHEN** a seed-topic backfill or wave artifact contains only unsupported prose or only an evidence list
- **THEN** inspect/advice SHALL name the missing return-map fields
- **AND** advice SHALL direct the Agent to add meaning, relationship, refs, status, and next-hop entries rather than bypassing the gate or surfacing to the user

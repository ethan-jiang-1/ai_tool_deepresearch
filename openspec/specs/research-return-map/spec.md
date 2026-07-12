# Research Return Map

> req: RRM-001, RRM-002, RRM-003, RRM-004, RRM-005

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

### Requirement: Evidence-bearing return-map refs SHALL include concrete existing reference files

Evidence-bearing seed-topic return-map entries SHALL include at least one concrete, bundle-relative, existing `reference/*.md` file ref unless the entry explicitly records that no consumer-facing reference is materializable and gives a limitation / deferral reason.

`reference/` is the primary consumer navigation layer. `artifacts/`, `_cache/`, and `_work_units/` MAY appear as secondary provenance refs, but they SHALL NOT be the only refs for an evidence-bearing return-map entry that claims support, refutation, partial support, emergent evidence, or context from existing evidence.

Glob refs and count summaries SHALL be invalid as consumer navigation refs. This includes patterns such as `reference/topic-*.md`, `reference/topic-*.md (8 files)`, and `reference/topic-*.md（8 个）`. The map must enumerate concrete files.

This requirement does not make return maps evidence authority. Submitted work-unit ledgers, reference backing checks, cache trails, and accepted gate surfaces remain the authority for whether evidence counts. The return map only tells a future Agent or reader where to navigate.

Implementation SHALL use a deterministic evidence-bearing predicate instead of broad prose interpretation. At minimum, entries with relationship/status values that claim support, refutation, partial support, emergent evidence, or contextual evidence SHALL be treated as evidence-bearing. Entries may be treated as limitation/non-materialized only when their return-map fields explicitly mark deferral/open/no materializable evidence and do not claim existing evidence support through refs or status.

Concrete reference validation for evidence-bearing seed-topic return-map entries SHALL be blocking for `inspect-wave0-output`, `inspect-wave1-output`, `inspect-wave2-output`, and any active gate/check that declares return-map navigation readiness. It SHALL NOT be described as diagnostic-only when the command includes the finding in `check.passed: false`.

#### Scenario: concrete existing reference ref passes

- **WHEN** an evidence-bearing return-map entry contains `refs: reference/01_topic-source.md`
- **AND** `reference/01_topic-source.md` exists under the active bundle root
- **THEN** return-map concrete reference validation SHALL pass for that entry

#### Scenario: internal-only refs fail

- **WHEN** an evidence-bearing return-map entry contains refs only to `artifacts/wave1/01_topic/evidence-summary.md`, `_cache/wave1/...`, or `_work_units/wave1/...`
- **THEN** return-map concrete reference validation SHALL fail
- **AND** advice SHALL ask the Agent to add concrete `reference/*.md` navigation or record an explicit limitation
- **AND** wave inspect output SHALL classify the finding as blocking when it contributes to command failure

#### Scenario: globbed reference ref fails

- **WHEN** a return-map entry contains `reference/01_topic-*.md`
- **THEN** validation SHALL fail
- **AND** diagnostics SHALL require enumerated concrete reference files

#### Scenario: count-summary reference ref fails

- **WHEN** a return-map entry contains `reference/01_topic-*.md (8 files)` or `reference/01_topic-*.md（8 个）`
- **THEN** validation SHALL fail
- **AND** diagnostics SHALL identify the glob/count summary as non-navigable

#### Scenario: missing concrete reference ref fails

- **WHEN** a return-map entry contains `reference/01_topic-source.md`
- **AND** that file does not exist under the active bundle root
- **THEN** validation SHALL fail
- **AND** diagnostics SHALL name the missing reference file

#### Scenario: explicit limitation may omit concrete reference

- **WHEN** a return-map entry records an explicit limitation, deferral, no materializable source, or non-consumer-facing status
- **THEN** the entry MAY omit concrete `reference/*.md`
- **AND** it SHALL still include refs to the relevant artifacts or process surfaces when available

#### Scenario: deterministic evidence-bearing predicate does not rely on prose judgment

- **WHEN** a return-map entry uses `relationship: supports`, `relationship: refutes`, `relationship: partial`, `relationship: context`, `status: supported`, `status: refuted`, `status: partial`, or `status: emergent`
- **THEN** concrete reference validation SHALL treat the entry as evidence-bearing
- **AND** the validator SHALL NOT require semantic interpretation of the surrounding prose to decide whether the entry needs concrete `reference/*.md` refs

### Requirement: Return-map parsing SHALL tolerate balanced field presentation wrappers

Return-map parsing SHALL map a balanced asterisk bold wrapper around an existing canonical field label, such as `**evidence_meaning**:`, to the same field as `evidence_meaning:`. Presentation normalization SHALL occur before existing entry, required-field, enum, reference, and concrete-navigation validation. Underscore emphasis, inline-code wrappers, or other Markdown presentation SHALL remain outside this requirement.

The accepted canonical fields SHALL remain `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`. Presentation tolerance SHALL NOT accept misspelled fields, missing colons, invalid enum values, fabricated refs, or arbitrary Markdown structures. The implementation SHALL use a narrow line-level normalization and SHALL NOT add a Markdown parser dependency.

#### Scenario: Bold-wrapped canonical fields are accepted

- **WHEN** a return-map entry uses balanced bold wrappers around all five canonical field labels
- **THEN** the parser SHALL extract the same canonical fields and values as the unwrapped form
- **AND** downstream enum and reference validation SHALL still run

#### Scenario: Misspelled wrapped field remains invalid

- **WHEN** a return-map entry contains `**evidence_meanng**:`
- **THEN** presentation normalization SHALL not map it to `evidence_meaning`
- **AND** required-field validation SHALL report the missing canonical field

#### Scenario: Presentation tolerance does not weaken refs

- **WHEN** a bold-wrapped return-map entry has no concrete reference for an evidence-bearing claim
- **THEN** existing concrete-reference navigation validation SHALL still fail according to its accepted classification

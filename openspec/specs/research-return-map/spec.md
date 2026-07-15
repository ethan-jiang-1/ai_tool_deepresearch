# Research Return Map

> req: RRM-001, RRM-002, RRM-003, RRM-004, RRM-005, RRM-006, RRM-007

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

### Requirement: Return-map inspection SHALL filter backfill tokens by target wave

`hasBackfillToken()` SHALL accept a `wave` parameter and match only tokens belonging to that wave:

| Wave | Tokens checked |
|---|---|
| Wave0 | `__BACKFILL_WAVE0_EVIDENCE__` |
| Wave1 | `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, `__BACKFILL_PENDING_QUESTIONS__` |
| Wave2 | `__BACKFILL_WAVE2_JUDGMENT__` |

When `hasBackfillToken()` returns true for the target wave, return-map validation for that wave SHALL be skipped. Tokens belonging to other waves SHALL NOT cause a skip.

Call sites in `inspectSeedTopicReturnMaps()` SHALL pass the current target wave. The `__BACKFILL_PENDING_QUESTIONS__` token is assigned to Wave1 (Wave1 is its primary consumer; Wave2 appends W2F-xxx entries when no token is present).

#### Scenario: Wave0 inspect not short-circuited by Wave1 token

- **WHEN** a seed topic file has `__BACKFILL_WAVE1_MECHANISMS__` present
- **AND** Wave0 inspect runs with `wave: 'wave0'`
- **THEN** `hasBackfillToken(content, 'wave0')` SHALL return false
- **AND** Wave0 return-map validation SHALL proceed

#### Scenario: Wave2 inspect not short-circuited by Wave1 shared token

- **WHEN** a seed topic file has `__BACKFILL_PENDING_QUESTIONS__` present (Wave1's token, not yet consumed)
- **AND** Wave2 inspect runs with `wave: 'wave2'`
- **THEN** `hasBackfillToken(content, 'wave2')` SHALL return false (token belongs to Wave1)
- **AND** Wave2 return-map validation SHALL proceed

### Requirement: Return-map inspection SHALL verify per-row current-round authority references

After return-map validation, `inspectSeedTopicReturnMaps()` SHALL verify that each current-round submitted row has either its work_id referenced in the target section's parsed refs fields or an explicit no-projection disposition entry.

For Wave0 and Wave1:
1. Read eligible rows via `readSubmittedWorkUnitDeclarations()` and filter by index `rerun_count == profile.rerun_count`. Resolve topic binding through the canonical UID/current-or-previous layout resolver.
2. For each eligible row, parse the target wave section's refs fields (within the section delimited by its header and the next `## ` header) using existing `FIELD_LINE_RE` pattern.
3. Check if the row's `work_id` appears in any parsed refs field, OR if a valid no-projection disposition entry exists for that work_id. A valid disposition entry SHALL satisfy ALL of: (a) `relationship` is `defers` OR `status` is `deferred`; (b) `next_hop` contains a limitation reason keyword (`limitation`, `not materializable`, `process-only`, `not consumer-facing`, `record-only`, `internal`); (c) `refs` either references the work_id (for traceability) or is empty/`none`.
4. If any eligible row has neither condition satisfied, produce a blocking finding with `repair_kind: agent_action`, `write_to: seed_topics/{slug}.md`, and `missing_fact` naming the unreferenced work_id.

For Wave2:
1. Read `finding-index.yaml`. Separate findings into two groups:
   - Current-round: `created_in_rerun_count == profile.rerun_count` → SHALL be checked (blocking if W2F-xxx id missing from section refs)
   - Legacy: no `created_in_rerun_count` field OR `created_in_rerun_count < profile.rerun_count` → SHALL be included for projection scope, but missing W2F-xxx id SHALL produce advisory only (non-blocking, `repair_kind: agent_action`, `blocking_basis: advisory`)
2. For each current-round finding, check if its W2F-xxx id appears in the target section's parsed refs fields. Missing → blocking finding.
3. For each legacy finding, check if its W2F-xxx id appears in the target section's parsed refs fields. Missing → advisory finding (Agent should include it or record disposition, but inspect does not block).
4. Pure synthesis findings (no delegated work-unit row) SHALL be included in both groups.
5. Targeted-evidence findings SHALL additionally verify submitted `wave2_targeted_evidence` backing exists.

If no eligible rows or current-round findings exist for the topic/wave, the check SHALL pass (nothing to verify).

#### Scenario: All eligible rows referenced passes check

- **WHEN** a topic has two eligible Wave1 rows from round 2
- **AND** both work_ids appear in the section's parsed refs fields
- **THEN** the authority reference check SHALL pass

#### Scenario: Missing work_id produces blocking finding

- **WHEN** a topic has one eligible Wave0 row (work_id `wv0_abc`) from round 2
- **AND** `wv0_abc` does not appear in the section's refs fields
- **AND** no no-projection disposition entry exists for `wv0_abc`
- **THEN** inspect SHALL produce a blocking finding naming `wv0_abc`

#### Scenario: No-projection disposition satisfies check

- **WHEN** a topic has one eligible Wave1 row (work_id `wv1_xyz`)
- **AND** `wv1_xyz` does not appear in refs fields
- **AND** the section contains a valid disposition entry: `relationship: defers`, `next_hop: "limitation: not materializable; process-only output"`, `refs: _work_units/wave1/wv1_xyz`
- **THEN** the authority reference check SHALL pass

#### Scenario: No eligible rows skips check

- **WHEN** a topic has submitted Wave1 rows only from round 1 (index.rerun_count=1)
- **AND** profile `rerun_count` is 2
- **THEN** no eligible rows exist
- **AND** the check SHALL pass

#### Scenario: Wave2 pure synthesis finding checked

- **WHEN** `finding-index.yaml` has finding W2F-015 with `created_in_rerun_count: 2` affecting this topic
- **AND** no delegated work-unit row exists for W2F-015 (valid pure synthesis)
- **AND** W2F-015 appears in the section's refs fields
- **THEN** the Wave2 authority reference check SHALL pass

#### Scenario: Legacy findings produce advisory, not blocking

- **WHEN** `finding-index.yaml` has a legacy finding W2F-003 without `created_in_rerun_count`
- **AND** profile `rerun_count` is 2
- **AND** W2F-003 does not appear in the section refs
- **THEN** the finding SHALL produce an advisory finding (non-blocking, `repair_kind: agent_action`, `blocking_basis: advisory`)
- **AND** inspect SHALL NOT block on this finding
- **AND** the advisory SHALL name W2F-003 and suggest including it in projection or recording a disposition

#### Scenario: Legacy finding with W2F ref present passes

- **WHEN** `finding-index.yaml` has a legacy finding W2F-003 without `created_in_rerun_count`
- **AND** profile `rerun_count` is 2
- **AND** W2F-003 appears in the section refs
- **THEN** no finding SHALL be produced (present in projection, no action needed)

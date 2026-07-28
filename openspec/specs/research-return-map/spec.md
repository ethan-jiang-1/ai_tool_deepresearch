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

One focused `shared-return-map-authoring` Markdown contract SHALL own the canonical Agent-facing return-map entry example, Wave-to-section ownership, and one-time token lifecycle. It SHALL state that evidence collection, extraction, synthesis, and seed-topic backfill all carry short meaning statements plus refs so later Agents can navigate the map without rereading the whole bundle blindly. It SHALL expose the same minimum entry-local fields for Wave0, Wave1, and Wave2: `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`, plus optional entry-local identity/metadata defined by the accepted return-map contract. It SHALL state that refs are bundle-relative, concrete consumer navigation comes first when materialized, and internal artifact/cache/work-unit refs remain secondary provenance.

For Wave0, `<work_id>/<positive ordinal>` SHALL mean the exact 1-based ordinal
of an element in that current work unit's result-declared, schema-valid
`artifacts/wave0/<topic>/source.yaml` array at inspection time. It is a current
projection coordinate, not a permanent candidate ID or a snapshot guaranteed by
`result_hash`. One submitted source intake with multiple current array elements
therefore requires one entry or explicit identity-bound deferred disposition for
each coordinate. A bare `work_id` in `refs` is secondary provenance and SHALL
NOT cover a Wave0 candidate. This guidance does not make the array, entry, or
disposition evidence authority.

Wave0, Wave1, Wave2, and seed-topic materialization phase nodes SHALL load that shared contract through their actual `requires` chain at the backfill/content-production decision point. The applicable role nodes (`subagent-dpt-source-intake`, `subagent-dpt-evidence-extractor`, and `subagent-dpt-topic-scout`) SHALL retain only a static reference or concise cue; generated work-unit task/spawn guidance SHALL remain self-contained. None of these consumers SHALL reproduce a second complete generic entry template or redefine the five common fields, section ownership, evidence-bearing predicate, or ref hierarchy.

They SHALL not reproduce a source-array parser or local projection validator.
The template remains the document-shape owner and the existing
`operate-topic-state` playbook remains the sole complete packet/repair protocol;
concise Wave-local cues may point to both without copying either contract.

Generated work-unit `task.md` and spawn prompts SHALL remain self-contained and MAY repeat the shortest five-field cue rather than runtime-parse a framework Markdown template. Their field set and authority disclaimer SHALL be statically parity-checked against the shared contract. They SHALL NOT reproduce the complete section/token/example contract or instruct a delegated actor to discover a phase-only context indirectly.

The shared authoring surface SHALL distinguish one-time token lifecycle from terminal content: a token is expected before its owning first materialization and absent after replacement. Token absence in a completed section SHALL NOT be described as evidence that backfill was skipped. The change SHALL retain existing section headings, token families and `RRM-007` inspect authority; it SHALL NOT rename sections, re-inject consumed tokens, or create another return-map validator.

When return-map inspect reports an invalid entry or missing current-round
projection, guidance SHALL direct the Agent to the named coordinate, retained
packet, and same Wave inspect. It SHALL NOT ask the Agent to reconstruct
validator logic locally or surface an ordinary mechanical repair to the user.

#### Scenario: Wave guidance resolves one canonical entry shape

- **WHEN** a Phase Agent reaches Wave0, Wave1, or Wave2 seed backfill
- **THEN** the loaded shared return-map contract SHALL expose the five common entry fields and wave-to-section mapping
- **AND** phase-local guidance SHALL add only its wave-specific authority and execution details

#### Scenario: Generated work-unit cue remains self-contained and aligned

- **WHEN** Engine generates task/spawn guidance for a work unit that writes research output
- **THEN** the guidance MAY include the concise five-field return-map cue without loading the complete shared Markdown
- **AND** static parity SHALL fail if its canonical field set or authority disclaimer drifts from the shared contract

#### Scenario: Duplicate complete templates are rejected

- **WHEN** workflow package/static validation inspects seed and Wave phase guidance
- **THEN** it SHALL find one complete generic return-map template in the shared authoring contract
- **AND** phase files SHALL not retain independently maintained complete copies of that generic template

#### Scenario: Consumed token absence is normal terminal state

- **WHEN** a Wave has replaced its accepted one-time token with valid return-map entries
- **THEN** shared guidance SHALL describe the token as consumed
- **AND** later Agents SHALL NOT be instructed to reinsert it or infer missing work solely from its absence

#### Scenario: Existing projection verdict remains single-owner

- **WHEN** a seed backfill contains unsupported prose, a malformed entry, or misses current-round projection
- **THEN** the existing Wave return-map inspect SHALL remain the deterministic verdict owner
- **AND** shared authoring guidance SHALL direct repair to the named seed coordinate and rerun that same inspect

#### Scenario: Wave0 guidance explains source-array ordinal

- **WHEN** a Wave0 Phase Agent has one current result-declared source intake
  whose `source.yaml` contains two valid array entries
- **THEN** the loaded guidance SHALL identify `<work_id>/1` and `<work_id>/2`
  as separate candidate coordinates
- **AND** it SHALL direct the Agent to form entries or explicit dispositions
  through the existing packet writer rather than hand-edit the seed

#### Scenario: Shared guidance does not create candidate authority

- **WHEN** a Wave0 card or guidance example names a candidate coordinate
- **THEN** submitted work-unit/output authority and the schema-valid source
  array SHALL remain the source of record
- **AND** the guidance SHALL not claim that a Seed Topic entry creates a
  submitted source, cache trail, reference, receipt, or an independent Gate
  authority; exact coverage remains the existing return-map evaluator's result

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

### Requirement: Return-map inspection SHALL verify current-round projection identities

One pure deterministic projection-readiness evaluator SHALL interpret canonical
registry/seed binding, the target Wave's current direct-authority identities,
and canonical Seed Topic appendix entries for both the applicable Wave inspect
and formal Wave gate. It SHALL inspect only the target Wave's existing slot
family:

| Wave | owned slot family | current projection identity |
| --- | --- | --- |
| Wave0 | `wave0_evidence` | each candidate coordinate in a current eligible result-declared `source.yaml` array |
| Wave1 | `wave1_mechanisms`, `wave1_trends`, `pending_questions` | each current eligible submitted `work_id` |
| Wave2 | `wave2_judgment` plus exact W2F entries in `pending_questions` | each current-round usable finding resolved to the topic |

For Wave0, the evaluator SHALL obtain candidates only through a narrow
submitted-candidate projection reader. That reader SHALL authenticate a current
eligible `wave0_source_intake` row, its validated manifest exact required tuple
`(path, role: source_yaml, direct_contract: wave0.source-metadata-array.v1)`,
and a validated result whose `hashValue(result)` equals the accepted
`result_hash` before accepting the declared output. It SHALL call the neutral
direct-output operation for that tuple and, only after a passed
`ReferenceMetadataArraySchema` result, derive ordinals
`1..snapshot_meta.validated_array_length`. The resulting coordinate is
`<work_id>/<1-based source.yaml array ordinal>`. `result_hash` binds the result
declaration rather than source bytes; this is a current inspection-time
projection, not a persistent candidate snapshot. The reader/evaluator SHALL not
discover source files by directory scan, select an optional/orphan output, infer
candidates from generic prose, collapse duplicate URLs, parse YAML, or expose a
source catalog.

For Wave1 and Wave2, the direct sources remain the canonical registry/current-
seed binding, current eligible submitted Wave1 rows, current-round usable Wave2
finding-index facts resolved to their affected topics, and the parsed seed
document. The evaluator SHALL not infer a topic from disk scan, generic prose,
artifact count, cache, or an orphan seed. It SHALL use the shared executable
slot map and tolerant accepted field presentation parser. A canonical heading
base identifies its mapped slot under the existing bounded suffix grammar; a
declared legacy heading base may only locate an eligible legacy slot under that
same grammar and is never packet input, a new identity, or a general heading
synonym. Raw Markdown patches and undocumented prose markers are not identity.

For a Wave2 packet-created entry, an exact valid `entry_id: W2F-*` that matches
the validated current-round finding and its resolved target topic selects that
finding in either owned Wave2 slot, including `pending_questions`; `refs`
remains responsible for navigation and may carry an accepted deferred `none`
value. For a historical entry without
that packet-created metadata, the existing exact W2F token in parsed `refs`
remains its only selection path. In either case, a W2F substring in prose or
invalid/dangling metadata SHALL NOT select an entry or satisfy coverage.

Evaluation SHALL root-short-circuit in this order: unusable registry/seed
binding or submitted-source/finding authority parent; unavailable readable
target family or missing required card; entry identity binding; malformed,
token, generic-prose, deferred, or concrete-navigation structure; then current
identity coverage. A direct parent finding SHALL mask all dependent candidate
omissions. A malformed identity-bearing entry SHALL retain its local structural
root before an omission is reported. Declared legacy headings and repeated
matching headings remain read-compatible under the accepted family-union policy,
but SHALL not satisfy a missing current identity. Historical/orphan seeds shall
not become current targets. A selected slot's missing or repeated writer target
is not an evaluator input: only `apply` packet admission SHALL emit
`seed_projection_layout_missing` or `seed_projection_layout_ambiguous` before
workspace creation.

For a usable Wave0 family, a candidate is covered only by a valid entry whose
entry-local `entry_id` equals its exact candidate coordinate. A valid explicit
deferred disposition uses the same exact `entry_id`; generic `Wave0 submitted`
prose, anonymous `refs: none`, a bare work ID in `refs`, or an out-of-range /
wrong-coordinate entry SHALL not cover it. Each uncovered current coordinate
SHALL yield one blocking `return_map_current_candidate_omission` finding that
names the exact coordinate. A schema-valid empty source array creates no
candidate demand; independent Wave0 source-output/floor contracts retain their
existing verdict ownership.

For a usable Wave1/Wave2 family, the existing current work-id and W2F coverage
forms remain accepted. Once parents are usable, every current submitted Wave1
work or current W2F identity mapped to that topic SHALL be represented by one
valid entry or explicit identity-bound deferred disposition.

For a usable family with one or more current direct-authority identities,
untouched current-wave tokens, generic `WaveN submitted` prose, a wrong slot,
missing/invalid current identity, invalid concrete-first navigation, or missing
required entry fields SHALL be blocking structural/provenance findings. With no
current direct-authority identity, a token alone SHALL NOT create a projection
demand or require a synthetic entry; independently applicable malformed-entry
findings remain reportable. Wave inspect and formal gate SHALL consume the same
evaluator result; these findings shall be degradation-ineligible and SHALL
prevent completion handoff. Equivalent Markdown whitespace/wrappers remain
presentation-tolerant. This readiness contract does not create submitted
evidence authority, a second receipt, a persistent projection state, or a second
Gate parser.

Formal gates SHALL add the evaluator's structured findings directly to their
existing contract evaluation and SHALL NOT invoke the inspect CLI or independently
reparse seed Markdown. The existing Wave1 token definition rules
`no_stale_mechanisms_token`, `no_stale_trends_token`, and
`no_stale_pending_questions_token`, and the existing Wave2 token definition
rules `backfill_judgment_token_absent` and
`backfill_questions_token_absent`, SHALL be retired. They are duplicate token
validators, not independent authority checks; retiring them does not make token
failure degradation-eligible.

Within each Wave inspect or formal-gate invocation, the caller SHALL build one
normalized canonical registry fact and pass that same fact to its existing Wave
contract evaluator and this projection evaluator. Wave2 SHALL likewise load one
finding-index fact and pass it to both consumers. These facts are direct,
per-invocation reads; they SHALL NOT be persisted as a projection authority or
reloaded independently by the second evaluator.

#### Scenario: Current token blocks Wave0 completion

- **WHEN** a current eligible Wave0 row exists and its current seed retains
  `__BACKFILL_WAVE0_EVIDENCE__`
- **THEN** inspect and formal Wave0 gate SHALL report one exact blocking slot
  root
- **AND** degraded handoff SHALL not be emitted

#### Scenario: One Wave0 entry cannot cover two submitted candidates

- **WHEN** one current eligible Wave0 submitted row has a current
  result-declared `source.yaml` with two schema-valid array elements and the
  Seed Topic contains only a valid `<work_id>/1` entry
- **THEN** inspect and formal Wave0 gate SHALL report exactly the uncovered
  `<work_id>/2` `return_map_current_candidate_omission`
- **AND** a bare `<work_id>` reference elsewhere SHALL not suppress that finding

#### Scenario: Duplicate URLs remain separate submitted candidates

- **WHEN** two positions in one current result-declared `source.yaml` array have
  the same URL and otherwise valid metadata
- **THEN** they SHALL remain distinct `<work_id>/1` and `<work_id>/2`
  projection identities
- **AND** one entry SHALL not satisfy both positions

#### Scenario: Exact deferred candidate disposition is complete navigation

- **WHEN** a current Wave0 candidate has no materializable consumer reference
- **AND** its entry uses the exact coordinate, `relationship: defers`,
  `status: deferred`, `refs: none`, and a limitation in `next_hop`
- **THEN** it SHALL satisfy that coordinate's projection coverage
- **AND** it SHALL not create a reference, source claim, receipt, or accepted
  evidence fact

#### Scenario: Source-output parent masks dependent candidates

- **WHEN** a current eligible Wave0 row cannot establish a hash-bound,
  declared safe, schema-valid `source.yaml` output
- **THEN** inspect and formal gate SHALL report the direct submitted-source
  authority/output root
- **AND** they SHALL not emit derived candidate omissions for that row

#### Scenario: Current direct output is not a result-hash snapshot

- **WHEN** an otherwise accepted Wave0 result still declares its required
  `source_yaml` output and the current direct output has three schema-valid
  array elements
- **THEN** the candidate reader SHALL derive `<work_id>/1`, `<work_id>/2`, and
  `<work_id>/3` from the successful direct-output cardinality
- **AND** it SHALL not claim that `result_hash` hashes or freezes the
  `source.yaml` bytes

#### Scenario: Wave1 keeps its existing row identity behavior

- **WHEN** Wave1 evaluates a current submitted row with an accepted exact
  work-id identity form
- **THEN** it SHALL retain the existing Wave1 row coverage behavior
- **AND** Wave0 source-array ordinal rules SHALL not alter it

#### Scenario: Generic submitted prose is not a projection

- **WHEN** a Wave1 or Wave2 slot contains only `WaveN submitted` or another
  identity-free generic status line while current authority exists
- **THEN** inspect and formal gate SHALL fail with the exact entry/identity root
- **AND** it SHALL not be treated as a deferred disposition

#### Scenario: Valid writer output satisfies one truth path

- **WHEN** a legal packet writes an entry bound to a current Wave0 candidate,
  current Wave1 submitted work, or current-round W2F identity resolved to its
  topic in its owned slot
- **THEN** the same pure evaluator used by inspect and gate SHALL recognize
  that identity once
- **AND** neither caller SHALL maintain a competing token/entry validator

#### Scenario: Read compatibility does not authorize an ambiguous write

- **WHEN** a historical current seed has repeated recognized heading occurrences
  for one Wave family and its entries otherwise meet the applicable readiness
  contract
- **THEN** Wave inspect and formal gate SHALL evaluate the accepted family union
  without creating a duplicate-heading blocker
- **AND** only an `apply` packet that selects that slot SHALL reject before
  workspace creation with `seed_projection_layout_ambiguous`

#### Scenario: Parent failure masks dependent omissions

- **WHEN** current registry binding, submitted authority or finding-index parent
  is unusable
- **THEN** the evaluator SHALL report that direct root once per parent
- **AND** it SHALL mask dependent per-entry/per-row projection omissions

#### Scenario: No current authority does not invent a projection demand

- **WHEN** a usable current topic has no current submitted/finding authority
  demand for the inspected Wave
- **THEN** readiness SHALL not require an invented entry merely to consume a
  token or emit a token-only projection root
- **AND** independent applicable structural failures SHALL remain reportable

#### Scenario: Wave0-valid content cannot satisfy Wave1 validation

- **WHEN** a seed topic contains a complete Wave0 return-map entry
- **AND** its Wave1 family contains an incomplete entry or evidence-bearing prose-only conclusion
- **AND** Wave1 inspect runs without a Wave1 backfill token
- **THEN** Wave1 inspect SHALL fail with a blocking finding scoped to the Wave1 family
- **AND** the complete Wave0 entry SHALL NOT satisfy any Wave1 field or reference check

#### Scenario: Wave1 family uses union without forcing duplicate entries

- **WHEN** a complete current-round Wave1 entry is present in `## 本轮新增机制理解`
- **AND** `## 本轮新增趋势与难点` and `## 待验证问题` are present but have no projection entry
- **AND** every eligible Wave1 row is bound by the valid family entry or an identity-bound disposition
- **THEN** Wave1 entry shape and row coverage SHALL pass
- **AND** inspect SHALL NOT require the complete entry to be copied into the two empty sibling sections

#### Scenario: Incomplete sibling entry cannot borrow fields

- **WHEN** one Wave1 section has a complete valid entry
- **AND** another Wave1 section contains an entry missing `refs` and `next_hop`
- **THEN** the incomplete entry SHALL retain its blocking shape finding
- **AND** fields from the complete sibling entry SHALL NOT complete it

#### Scenario: Sibling Wave1 lineage cannot satisfy an entry

- **WHEN** one Wave1 entry has valid Wave1 artifact refs and concrete consumer navigation
- **AND** another evidence-bearing Wave1 entry lacks its per-statement Wave1 artifact lineage or concrete consumer reference
- **THEN** the second entry SHALL retain its local blocking finding
- **AND** the first entry SHALL NOT satisfy the second entry's lineage or navigation

#### Scenario: Entry identity metadata stays inside one entry

- **WHEN** `- entry_id: wu-w1-b000-deep-i0001/1` is followed by that list item's indented canonical fields, or the same `entry_id` occurs among the continuation fields after `- evidence_meaning:`
- **THEN** it SHALL bind as that entry's optional metadata without becoming a sixth required field
- **AND** a dangling or duplicate entry_id, peer list item, intervening prose block, next `evidence_meaning`, or next H2 SHALL NOT bind across the boundary
- **AND** a deeper-indented refs bullet SHALL remain in the same entry

#### Scenario: Heading suffix preserves canonical boundary

- **WHEN** a seed uses `## 当前判断（更新于 rerun_count=5 深挖后）`
- **AND** the matched occurrence's content otherwise satisfies Wave2 projection
- **THEN** the extractor SHALL bind it to the canonical `## 当前判断` section
- **AND** the suffix SHALL NOT create a missing-section finding

#### Scenario: Repeated canonical heading occurrences stay in one family

- **WHEN** a historical seed contains two `## 本轮新增趋势与难点` occurrences
- **THEN** Wave1 inspect SHALL parse each occurrence only to its next H2 and include both in the Wave1 family union
- **AND** `RRM-007` SHALL NOT create a duplicate-heading blocker or allow an invalid entry in one occurrence to borrow fields from the other

#### Scenario: Shared pending section preserves logical wave ownership

- **WHEN** `## 待验证问题` contains one Wave1 entry whose next_hop mentions W2F-015 but whose refs bind a current Wave1 row
- **AND** another entry's parsed refs contain exact W2F-015
- **THEN** Wave1 shape/navigation/row coverage SHALL evaluate only the non-W2F entry
- **AND** Wave2 shape/navigation/finding coverage SHALL evaluate only the W2F-015 entry
- **AND** neither entry SHALL satisfy the other wave's identity coverage

#### Scenario: Wave1 pending token does not skip Wave2 finding coverage

- **WHEN** `## 待验证问题` still contains `__BACKFILL_PENDING_QUESTIONS__`
- **AND** finding-index has a current affected finding W2F-015 for the topic
- **AND** no Wave2-selected pending entry or current-judgment entry references W2F-015
- **THEN** Wave2 inspect SHALL NOT skip because the token is Wave1-owned
- **AND** it SHALL emit the blocking per-topic W2F-015 omission

#### Scenario: All eligible rows referenced across family passes

- **WHEN** a topic has two eligible Wave1 rows from round 2
- **AND** one row is bound in the mechanism section and the other in the trend section
- **THEN** family-union authority coverage SHALL pass

#### Scenario: Bare exact work_id in refs satisfies coverage

- **WHEN** a valid Wave1 entry's parsed refs contain exact token `wu-w1-b000-deep-i0001`
- **AND** the eligible row has that exact work_id
- **THEN** row coverage SHALL pass without requiring an `_work_units/` path or `entry_id`
- **AND** `wu-w1-b000-deep-i00010` SHALL NOT satisfy `wu-w1-b000-deep-i0001`

#### Scenario: Anonymous disposition cannot cover a row

- **WHEN** a topic has an eligible Wave1 row `wv1_xyz`
- **AND** a Wave1 disposition has `relationship: defers`, `status: deferred`, a limitation reason, and `refs: none`
- **AND** that entry has no exact work-id token/path in parsed refs and no entry-local `entry_id: wv1_xyz/<n>`
- **THEN** the disposition SHALL NOT satisfy `wv1_xyz`
- **AND** Wave1 inspect SHALL emit a blocking omission naming `wv1_xyz`

#### Scenario: Identity-bound no-projection disposition passes

- **WHEN** a topic has an eligible Wave1 row `wv1_xyz`
- **AND** a Wave1 entry has `entry_id: wv1_xyz/1`, `relationship: defers`, `status: deferred`, a limitation reason, and `refs: none`
- **THEN** the disposition SHALL satisfy coverage for `wv1_xyz`

#### Scenario: Invalid authority is not an empty-success result

- **WHEN** the submitted declaration ledger cannot bind a current-round row to its index record or manifest topic identity
- **THEN** inspect SHALL emit the submitted-authority prerequisite root
- **AND** it SHALL NOT report zero eligible rows as a passing coverage result
- **AND** dependent missing-row symptoms SHALL be masked
- **AND** repair classification SHALL preserve the submitted-authority owner rather than point to the seed file

#### Scenario: Normalized reader preserves legacy API and paired round

- **WHEN** a valid submitted declaration row is paired with an index record carrying `rerun_count: 2`
- **THEN** the normalized reader SHALL expose that ledger/index pair from one index load
- **AND** the legacy declaration reader SHALL return the same ledger row bytes/shape as before
- **AND** eligible projection SHALL obtain round 2 from the paired index record without rereading the index

#### Scenario: No submitted declarations form a valid empty projection set

- **WHEN** profile round authority is valid
- **AND** no work-unit submitted declaration exists in the output declaration ledger
- **THEN** submitted row projection coverage SHALL use an empty eligible-row set
- **AND** this subcheck SHALL NOT invent a missing-index projection root
- **AND** independent work-unit or Wave contract evaluators SHALL still fail on their own direct requirements, including a submitted index record missing its declaration row

#### Scenario: No eligible rows skips only the authority subcheck

- **WHEN** a topic has submitted Wave1 rows only from round 1
- **AND** profile `rerun_count` is 2
- **THEN** no current-round eligible rows exist
- **AND** per-row coverage SHALL pass without suppressing independent structural findings

#### Scenario: Wave2 finding is isolated to every affected topic

- **WHEN** current finding W2F-015 has `affected_topics` resolving to topics A and B
- **AND** W2F-015 appears in topic A's Wave2 target family but not topic B's
- **THEN** topic A projection SHALL satisfy W2F-015
- **AND** Wave2 inspect SHALL emit one blocking omission for topic B

#### Scenario: Unaffected topic does not need the finding

- **WHEN** current finding W2F-015 affects only topic A
- **AND** topic B does not reference W2F-015
- **THEN** no W2F-015 projection finding SHALL be produced for topic B

#### Scenario: Unknown affected topic masks projection symptom

- **WHEN** W2F-015 contains an `affected_topics` token that is unknown or ambiguous in canonical topic layout
- **THEN** the inspect-only affected-topic projection prerequisite SHALL be reported at W2F-015's `affected_topics` field
- **AND** inspect SHALL NOT guess a seed or emit a dependent missing-W2F projection repair

#### Scenario: Future finding round is an invalid prerequisite

- **WHEN** profile `rerun_count` is 2
- **AND** W2F-015 has `created_in_rerun_count: 3`
- **THEN** inspect SHALL report an invalid finding round-binding root
- **AND** it SHALL NOT classify W2F-015 as current or legacy
- **AND** it SHALL mask dependent per-topic projection omissions for W2F-015

#### Scenario: Malformed finding round is not legacy

- **WHEN** W2F-015 has `created_in_rerun_count: "2"` or a negative/fractional value
- **THEN** inspect SHALL report the inspect-only round-binding prerequisite at that field
- **AND** it SHALL NOT silently treat W2F-015 as legacy

#### Scenario: Legacy affected-topic omission remains advisory

- **WHEN** legacy finding W2F-003 has no `created_in_rerun_count` and affects topic A
- **AND** topic A's Wave2 family does not reference W2F-003
- **THEN** inspect SHALL emit an advisory naming W2F-003 and topic A
- **AND** the finding SHALL have `repair_kind: agent_action` and `blocking_basis: advisory`
- **AND** the advisory SHALL NOT fail the Wave2 inspect

#### Scenario: Prerequisite failure masks dependent projection symptoms

- **WHEN** the required target family or finding-index parent cannot be parsed
- **THEN** inspect SHALL report the earliest direct prerequisite root
- **AND** it SHALL NOT emit dependent per-row/per-finding missing-reference symptoms

#### Scenario: Invalid identity-bearing entry masks its dependent omission

- **WHEN** a target entry's parsed refs contain exact current row `wv1_xyz` but the entry is missing `next_hop`
- **THEN** Wave1 inspect SHALL emit the entry-local missing-field root
- **AND** it SHALL NOT also emit a missing-row projection finding for `wv1_xyz` in that invocation
- **AND** a prose-only `wv1_other` mention or anonymous `refs: none` SHALL NOT receive that masking treatment

#### Scenario: Missing seed uses narrow canonical binding prerequisite

- **WHEN** a plan-bound current seed file is missing or cannot bind to its canonical topic
- **THEN** Wave inspect SHALL emit one narrow prerequisite derived from the existing canonical topic-state seed-binding interpretation
- **AND** it SHALL use `repair_kind: missing_contract`, name `operate-topic-state inspect` as the canonical diagnostic operation, and keep the invoking Wave inspect as `rerun`
- **AND** it SHALL NOT run or inherit unrelated submitted-progress or accepted-workspace blockers from the full topic-state inspect
- **AND** it SHALL mask missing-family and per-row/per-finding symptoms rather than direct an ad hoc seed edit

#### Scenario: Current demand makes an unavailable family blocking

- **WHEN** a plan-bound seed has no usable Wave1 family member and no Wave1 token
- **AND** that seed has two current-round eligible Wave1 rows
- **THEN** Wave1 inspect SHALL emit one blocking family prerequisite for that seed
- **AND** it SHALL mask the two dependent row-omission findings until a target family member is available

#### Scenario: Legacy-only demand does not become a section blocker

- **WHEN** a plan-bound seed has no usable Wave2 family member and no Wave2 token
- **AND** only legacy findings W2F-003 and W2F-004 affect that topic
- **THEN** Wave2 inspect SHALL emit one advisory for each missing finding/topic pair
- **AND** it SHALL NOT emit a blocking missing-family prerequisite

#### Scenario: Inactive historical seed is not migrated by projection inspect

- **WHEN** a plan-bound historical seed lacks a canonical target H2
- **AND** the current Wave has no current eligible row or current/legacy affected finding for that seed
- **THEN** `RRM-007` SHALL NOT emit a missing-section migration blocker for that seed
- **AND** independent plan/seed/workflow contracts remain unaffected

#### Scenario: Wave2 uses plan-derived current seed set

- **WHEN** plan registry resolves current topics A and B and the seed directory also contains an unrelated extra Markdown file
- **THEN** all Wave inspect return-map calls SHALL evaluate only plan-derived current seed slugs
- **AND** Wave2 SHALL NOT discover projection scope by directory scan
- **AND** the invoking inspect SHALL pass one normalized registry fact to both the Wave evaluator and seed checker without a second raw plan read

#### Scenario: Other-wave token does not short-circuit target validation

- **WHEN** a seed topic contains `__BACKFILL_WAVE1_MECHANISMS__`
- **AND** Wave0 inspect runs
- **THEN** Wave0 target-family validation SHALL proceed
- **AND** the Wave1 token SHALL NOT make Wave0 pass or skip

#### Scenario: Current-wave token preserves first materialization behavior

- **WHEN** a seed topic contains the target wave's accepted backfill token
- **THEN** target-wave family availability, entry shape, and projection coverage SHALL retain the accepted token skip behavior
- **AND** the existing Wave evaluator's stale-token finding SHALL remain independent and MAY still fail the aggregate inspect command
- **AND** no second generic token family SHALL be introduced

#### Scenario: All eligible rows referenced passes check

- **WHEN** a topic has two eligible Wave1 rows from round 2
- **AND** both work_ids appear in the section's parsed refs fields
- **THEN** the authority reference check SHALL pass

#### Scenario: Missing Wave0 candidate produces a blocking finding

- **WHEN** a topic has one eligible Wave0 row (work_id `wv0_abc`) from round 2
  whose current result-declared source array has two valid elements
- **AND** only `entry_id: wv0_abc/1` is present in the section
- **AND** no exact no-projection disposition entry exists for `wv0_abc/2`
- **THEN** inspect SHALL produce a blocking finding naming `wv0_abc/2`

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

### Requirement: Template and command guidance SHALL preserve separate Seed Topic questions

`DPT_FRAMEWORK/workflows/nodes/templates/seed-topic-template.md` SHALL be the
sole canonical, instantiable Seed Topic Document template. `templates/` SHALL
be a discoverable namespace for current and future document templates, rather
than a shared-guidance catch-all. This template SHALL own initialization
skeleton, appendix slot map, exact canonical headings, per-heading `回填卡`,
Wave-to-section ownership, one-time token lifecycle, canonical `entry_id` plus
five-field entry example, and concrete-first ref presentation hierarchy. It
answers only what an instantiated Seed Topic looks like, which parts are fixed
or later backfilled, and who supplies a later entry, when, and in what document
format.

Each card SHALL visibly state its writer, direct authority, backfill timing,
entry identity/field shape, concise `operate-topic-state` materialization
pointer, and prohibited direct-edit/generic-prose behavior, and SHALL use the
exact label `回填卡（只读操作约束，不是 Projection Entry）`. It SHALL state that
return maps are Agent-readable navigation projections, not evidence authority.
The cards and template SHALL NOT define Projection Packet fields, lifecycle
authorization, apply/recover mechanics, repair map, or rerun-direction input.
Those execution questions SHALL have one authoritative Agent-readable guidance
home in `command_playbook/operate-topic-state.md`, alongside the existing
command that consumes the packet.

For new canonical rendering, these exact canonical headings replace the prior
fresh-render no-rename constraint. The five former heading bases remain declared
legacy aliases solely for bounded read compatibility and a legal targeted packet
upgrade; they are not a second template or Agent-selectable heading vocabulary.

`phase-seed-topics`, `phase-wave0`, `phase-wave1` and `phase-wave2` SHALL load
this template through their actual `requires` chain at the relevant document
decision point. `phase-rerun` SHALL use `operate-topic-state` guidance for its
rerun-direction operation and SHALL not load a document template merely to find
an operation schema. Phase bodies SHALL add only their local authority, command
sequence and checkpoint. Role guidance and generated work-unit task/spawn text
SHALL remain self-contained with at most a concise five-field cue and authority
disclaimer; they SHALL not reproduce the complete slot/table/token/example
contract or packet protocol.

The old focused authoring files SHALL not remain a second complete template.
They MAY be short compatibility pointers during migration but SHALL not define
their own entry grammar, slot ownership, token lifecycle or full skeleton. A
static parity/duplicate-template check SHALL compare named slot and card
descriptor facts between the template and executable slot map, reject a second
complete Seed Topic template, and reject duplicated packet grammar outside the
command playbook. No runtime code SHALL parse the Markdown template to derive
behavior.

When a deterministic result names a legal packet/entry/slot repair, guidance
SHALL expose the direct fact, named owner surface and same Wave inspect to
rerun. When no legal path exists, it SHALL expose the owner or missing-contract
boundary; it SHALL not tell users to hand-edit a seed or ask Agents to rebuild
validator logic.

#### Scenario: Template answers the document-level question without owning mutation

- **WHEN** a human or Phase Agent needs to understand a current Seed Topic
  Document's skeleton, slots, backfill timing and entry format
- **THEN** one loaded `templates/seed-topic-template` SHALL provide those facts
- **AND** packet schema, authorization and repair SHALL remain in the existing
  `operate-topic-state` command guidance

#### Scenario: A visible card constrains a backfill without becoming content

- **WHEN** a canonical seed renders one of its Appendix Slots
- **THEN** its canonical heading SHALL be immediately followed by that slot's
  permanent `回填卡`, then its token or entries
- **AND** the renderer, writer and parser SHALL preserve the card and SHALL not
  classify it as a Projection Entry

#### Scenario: Concise actor cue remains permitted

- **WHEN** a generated work-unit task or role guidance needs to mention a
  return-map result
- **THEN** it MAY include the five fields and authority disclaimer needed for
  its self-contained actor contract
- **AND** it SHALL not become a second complete template or runtime authority

#### Scenario: Command guidance preserves the legal repair boundary

- **WHEN** inspect reports an invalid packet entry or missing projection
- **THEN** `operate-topic-state` guidance SHALL direct the Agent to the named
  slot/authority owner and the same inspect
- **AND** it SHALL not represent a user decision as writer permission

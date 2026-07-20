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

Wave0, Wave1, Wave2, and seed-topic materialization phase nodes SHALL load that shared contract through their actual `requires` chain at the backfill/content-production decision point. The applicable role nodes (`subagent-dpt-source-intake`, `subagent-dpt-evidence-extractor`, and `subagent-dpt-topic-scout`) SHALL retain only a static reference or concise cue; generated work-unit task/spawn guidance SHALL remain self-contained. None of these consumers SHALL reproduce a second complete generic entry template or redefine the five common fields, section ownership, evidence-bearing predicate, or ref hierarchy.

Generated work-unit `task.md` and spawn prompts SHALL remain self-contained and MAY repeat the shortest five-field cue rather than runtime-parse a framework Markdown template. Their field set and authority disclaimer SHALL be statically parity-checked against the shared contract. They SHALL NOT reproduce the complete section/token/example contract or instruct a delegated actor to discover a phase-only context indirectly.

The shared authoring surface SHALL distinguish one-time token lifecycle from terminal content: a token is expected before its owning first materialization and absent after replacement. Token absence in a completed section SHALL NOT be described as evidence that backfill was skipped. The change SHALL retain existing section headings, token families and `RRM-007` inspect authority; it SHALL NOT rename sections, re-inject consumed tokens, or create another return-map validator.

When return-map inspect reports an invalid entry or missing current-round projection, guidance SHALL direct the Agent to the exact named seed section/entry and rerun the same Wave inspect. It SHALL NOT ask the Agent to reconstruct validator logic locally or surface an ordinary mechanical repair to the user.

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

`inspectSeedTopicReturnMaps()` SHALL evaluate seed projection only within the section family owned by the current Wave inspect command. Fields, refs, entries, tokens, and dispositions outside that family SHALL NOT satisfy its shape, navigation, row, or finding checks.

The mapping SHALL be deterministic and shared by all call sites:

| Wave | Target section family |
|---|---|
| Wave0 | `## 本轮新增证据` |
| Wave1 | all entries in `## 本轮新增机制理解` and `## 本轮新增趋势与难点`; entries whose parsed `refs` lack an exact W2F token in `## 待验证问题` |
| Wave2 | all entries in `## 当前判断`; entries whose parsed `refs` contain an exact `W2F-[0-9]{3,}` token in `## 待验证问题` |

The extractor SHALL match each canonical H2 base heading with harmless surrounding whitespace and an optional explanatory suffix introduced by whitespace or one of `(`, `（`, `:`, `：`, `-`, or `—`, then use the next H2 as its boundary. It SHALL NOT accept an undelimited longer name or arbitrary alias. Each Wave inspect invocation SHALL build one normalized canonical topic-registry fact containing the complete canonical registry rows and a compatible current/previous-slug layout view. It SHALL pass that same fact to the Wave evaluator, canonical seed-binding check, eligible projection, and return-map checker; it SHALL NOT raw-read the plan again or infer seeds from directory contents. The Wave evaluator SHALL consume the compatible layout view without changing its target expansion or verdict, and Formal Gate callers that do not preload the fact SHALL retain the existing evaluator API/verdict. Before section extraction, every plan-bound current seed file SHALL be readable and match the canonical topic-state seed-binding fields. This check SHALL reuse the existing canonical binding interpretation without invoking the full canonical topic-state progress/workspace inspect. For a missing or invalid seed binding, Wave inspect SHALL emit one narrow canonical seed-binding prerequisite using the canonical owner's `missing_contract` boundary and diagnostic operation, use the invoking Wave inspect as `rerun`, and mask family/row/finding symptoms rather than emit a section-edit finding. For a usable seed, a multi-section family SHALL be usable when at least one member H2 occurrence is located; empty or absent siblings SHALL NOT create per-section quotas. Multiple occurrences of the same canonical H2 SHALL each be bounded by the next H2 and included in the same family union; `RRM-007` SHALL leave placeholder uniqueness to its existing skeleton owner rather than create a duplicate-heading projection blocker. A family SHALL be unavailable only when all members are absent. The existing current-wave token filter SHALL run before family availability and retain its accepted skip behavior.

Without a current-wave token, family availability SHALL follow projection demand:

| Family state and direct demand for this seed/wave | Required result |
|---|---|
| usable family with malformed or evidence-bearing target entry | retain the entry-local blocking finding |
| unavailable family with one or more current eligible rows or current affected findings | emit one blocking family prerequisite for that seed/wave and mask dependent row/finding omissions |
| unavailable family with legacy affected findings only | emit the accepted advisory omission for each finding/topic pair; do not add a blocking family prerequisite |
| unavailable family with no current or legacy projection demand | emit no `RRM-007` migration finding |

`RRM-007` SHALL NOT unconditionally migrate an inactive historical seed solely because a canonical H2 is absent.

Within the target family:

1. Each entry SHALL be parsed inside one section. Canonical fields and optional identity metadata SHALL NOT cross an H2 boundary or the next entry boundary.
2. Every non-empty target entry SHALL independently satisfy the accepted five canonical fields, enums, concrete-navigation predicate, and any accepted lineage predicate explicitly defined per statement/entry, including Wave1 statement refs. A valid sibling SHALL NOT supply its missing field, concrete ref, or per-entry Wave1 lineage.
3. Prose-only conclusions, naked evidence lists, glob/count-summary refs, incomplete entries, invalid enums, and invalid navigation/lineage found in a target section SHALL retain their accepted finding behavior.
4. The accepted Wave2 family-level ledger/index lineage predicate and demand-driven row/finding identity coverage SHALL be evaluated over the union of valid target entries and their parsed refs. No generic minimum-entry quota SHALL apply when that seed/wave has no current row/finding demand. This change SHALL NOT require every general Wave2 judgment entry to carry a W2F id independently; exact W2F refs remain enforced per expected finding/topic pair.
5. A section that is present but contains no target projection entry SHALL NOT fail merely because a sibling section owns the relevant projection. Wave1 mechanism, trend, and pending-question sections SHALL NOT each be required to duplicate an entry.

An optional `entry_id` SHALL be parsed as entry-local metadata when it occurs before or after canonical fields in the same Markdown list item or contiguous canonical-field block at the same/continuation indentation. A leading `entry_id` SHALL bind only when the next nonblank contract line is a canonical field in that block. A same-or-shallower-indented peer list item, the next `evidence_meaning` entry start, the next H2, or an intervening non-contract prose block SHALL close the current or pending entry; a deeper-indented bullet under active `refs` SHALL remain a refs continuation. `entry_id` SHALL NOT enter the canonical `fields` map or the five-field required list. A dangling `entry_id`, duplicate `entry_id` metadata within one entry, or metadata that would cross one of those boundaries SHALL produce a local identity-shape finding rather than bind through whole-section text search.

`## 待验证问题` is a shared physical section with two logical owners. The entry selector SHALL use an exact W2F token in that entry's parsed `refs`, not a substring or a mention in `evidence_meaning`, `next_hop`, or surrounding prose. Wave1 checks SHALL exclude W2F-ref entries, while Wave2 checks SHALL include only W2F-ref entries from this shared section. A Wave1-owned backfill token SHALL retain Wave1 ownership and SHALL NOT skip Wave2 inspection. Finding-index remains the expected-set authority, so an affected finding absent from all Wave2-selected entries SHALL still produce its per-topic omission.

For Wave0 and Wave1, the existing submitted declaration reader owner SHALL expose one normalized read that pairs each accepted work-unit `ledger_row` with its validated `index_record` during the same index load. Existing `readSubmittedWorkUnitDeclarations()` behavior SHALL remain a ledger-row projection of those facts. One work-unit-owned projection module SHALL import those normalized facts and the existing manifest/queue/topic validators; Inspect and `operate-work-unit inspect --eligible-rows` SHALL consume its shared eligible projection. The normalized reader SHALL NOT import the projection or manifest-validation module, and return-map SHALL NOT pair or validate ledger/index/manifest authority itself. The eligible projection SHALL:

1. Validate the profile current `rerun_count`, submitted ledger/index identity, submitted manifest/index identity, declared canonical result path, and canonical UID/current-or-previous topic layout before filtering. Immutable snapshot validation SHALL recompute the existing queue-item snapshot hash from `manifest.queue_item` and compare it with the stored index/manifest identity; comparing only two stored hash fields SHALL NOT suffice. The result path SHALL be a safe bundle-relative existing regular file, but this narrow view SHALL NOT revalidate result content/hash or active/terminal queue state. Only an absent `rerun_count` under a valid `human_decision_checkpoints.hitl2` parent SHALL normalize to `0`; an unreadable profile, missing/malformed parent, or present `null`, string, negative, or fractional value SHALL produce a profile-round prerequisite and SHALL NOT fall back to `0`.
2. Return only submitted rows whose index `rerun_count` equals the current profile value, grouped by canonical topic UID and current seed slug; legacy rows without round identity remain excluded with the accepted warning.
3. Treat the absence of any work-unit submitted declaration as a valid empty set for this eligible projection only. The existing Wave evaluator SHALL still report a submitted-index-without-declaration recovery root when that direct authority exists. Once a work-unit submitted declaration exists, unreadable/malformed declarations or any missing/inconsistent required index, manifest, result-path, queue-snapshot, or topic binding SHALL produce the direct prerequisite root and SHALL NOT be converted to empty rows.
4. Not require unrelated full work-unit health facts such as result content/hash, active/terminal queue state, lease, beacon, cache-trail, receipt, transaction, or orphan-directory health to establish this projection view; those remain owned by their existing evaluator.

Each eligible row SHALL be satisfied within its canonical topic's valid target-entry union by either:

- a boundary-complete exact `work_id` token in parsed `refs`, including either a bare token or a concrete `_work_units/.../<work_id>` path whose directory segment exactly equals that id; or
- entry-local `entry_id` metadata exactly shaped as `<work_id>/<n>`, where `n` is a positive integer; or
- an explicit no-projection disposition where `relationship` is `defers` OR `status` is `deferred`, `next_hop` contains an accepted limitation reason, and the entry is bound through either exact identity form above.

`refs: none`, an empty refs value, a substring/path-prefix collision, or a `work_id` outside parsed refs/entry-local metadata SHALL NOT identify a row. `refs: none` MAY appear in a disposition only when that entry's metadata binds exact `<work_id>/<n>`. `entry_id` SHALL NOT become a sixth universal required field for historical entries.

An omitted eligible row SHALL produce one blocking Wave inspect finding with `repair_kind: agent_action`, the current seed file in `write_to`, a `missing_fact` naming the row and target section family, and the exact invoking inspect command as `rerun`.

For Wave2, one inspect invocation SHALL load the finding-index parse fact once and pass it to both the existing formal evaluator and return-map projection parent; formal Gate callers without a preloaded fact SHALL retain the existing reader API/verdict. Return-map SHALL NOT parse YAML again or reimplement targeted-backing validation. It SHALL use the same validated profile-round semantics above: only an absent field under the valid HITL2 parent becomes `0`; malformed profile authority is a prerequisite failure. For each `affected_topics` string token, the inspect-only finding projection parent SHALL union exact candidates from the existing canonical topic-layout UID, current/previous slug, and legacy-id resolver semantics, deduplicate by canonical topic key, and accept exactly one owner; zero owners are unknown and multiple owners are ambiguous. Multiple aliases in one finding that normalize to the same canonical key SHALL create one topic demand. It SHALL NOT create another token-owner map, require existing Wave2 pair facts to change, or alter formal Gate behavior. Before projection coverage, the inspect-only parent SHALL:

1. Require `affected_topics` to be a non-empty string-token array and resolve every token through canonical UID/current-or-previous topic layout.
2. Each finding SHALL be grouped only into the canonical topics named by `affected_topics`; its W2F id in topic A SHALL NOT satisfy projection for topic B.
3. Report malformed, unknown, or ambiguous `affected_topics` as one inspect-only projection prerequisite finding at the exact finding-index field, then mask dependent projection omissions.
4. For each affected topic, a finding with `created_in_rerun_count == profile.rerun_count` SHALL require its W2F id in that topic's target-section-family refs and omission SHALL block the Wave2 inspect.
5. For each affected topic, a finding with no `created_in_rerun_count` or a lower round value SHALL remain in projection scope, but omission SHALL be advisory and SHALL NOT fail the Wave2 inspect.
6. A present `created_in_rerun_count` that is not a non-negative integer or is greater than `profile.rerun_count` SHALL produce one inspect-only invalid round-binding prerequisite finding at the exact field; inspect SHALL NOT classify it as current or legacy and SHALL mask dependent projection symptoms.
7. Pure synthesis findings SHALL remain in scope. Targeted-evidence backing SHALL remain owned by the existing Wave2 authority evaluator and SHALL NOT be reimplemented by this projection check.

Missing/unparseable/non-object finding-index YAML or a non-array `findings` parent SHALL reuse the existing root and mask all dependent projection symptoms. A missing or malformed W2F `id` SHALL reuse the existing formal root and mask only that finding's projection. Other scan, synthesis-eligibility, backing, handoff, or unrelated per-finding formal defects SHALL remain independently blocking through their existing evaluator but SHALL NOT mask projection for findings whose `id`, `affected_topics`, and round fields are usable.

If the plan-derived seed set/binding, a current-demand family, submitted projection authority, finding-index parse result, or inspect-only topic/round normalization cannot be used, inspect SHALL report the earliest direct prerequisite root once per direct parent/field and SHALL mask dependent per-row/per-finding symptoms. After usable parents, an omitted row SHALL produce one instance per row and a finding omission/advisory SHALL produce one instance per finding/topic pair. If an invalid target entry carries an exact parsed-ref or entry-local identity candidate, its local shape/navigation/lineage root SHALL mask the dependent omission for that same identity until the entry is repaired; prose, substring, and anonymous-none mentions are not candidates. A valid empty row/finding set SHALL pass only coverage; independent usable entry findings SHALL continue to run.

Repair ownership SHALL follow the direct surface: section/entry/row/finding omissions inside a readable canonically bound seed and finding-index `affected_topics`/round fields use `agent_action`; missing/unbound seed files use the narrow canonical seed-binding prerequisite defined above, and submitted ledger/index/manifest authority failures preserve their direct submitted owner's `missing_contract`/legal Engine-operation classification. Neither SHALL direct the Agent to hand-edit Engine-owned files. Every blocking result SHALL rerun the invoking Wave inspect.

This contract is blocking within the mandatory pre-gate `inspect-wave0-output.mjs`, `inspect-wave1-output.mjs`, or `inspect-wave2-output.mjs` command when a current omission exists. It SHALL NOT by itself establish or revoke submitted evidence authority or formal Gate coverage, and this change SHALL NOT require formal Wave Gate CLIs to consume the return-map evaluator.

The existing target-wave backfill-token filter SHALL remain unchanged: another wave's token SHALL NOT short-circuit the current inspect, while the current wave's accepted token SHALL retain first-materialization skip behavior for the return-map projection subcheck. This subcheck skip SHALL NOT suppress the existing Wave evaluator's stale-token finding or imply that the aggregate Wave inspect command passes.

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

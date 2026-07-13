> req: RWG-002, RWG-005, RWG-018, RWG-019

## MODIFIED Requirements

### Requirement: Wave1 complete gate rule set

The Wave1 complete gate definition SHALL include work-unit provenance checks for delegated topic deepening outputs. Wave1 SHALL validate per-topic output coverage through submitted work-unit ledger rows and SHALL reject non-work-unit-only evidence.

The Wave1 gate definition SHALL also include deterministic depth-contract checks for `artifacts/wave1/{topic}/depth-review.yaml`. Submitted work-unit rows SHALL be the direct authority for source claims, accepted URLs, cache/degraded refs, and actor provenance. The checker SHALL derive exact source URL novelty, cache mapping, observed new-source count, and the profile-derived floor from `reviewed_work_unit_refs[]`, current Wave0 source authority, and profile facts. The review SHALL own only non-derivable Phase judgments and supplementary decision closure; copied source/cache/floor fields SHALL NOT become a second blocking authority.

Wave1 reference-format checks SHALL evaluate the eight common metadata keys plus one canonical topic binding resolved from `related_topic_uid` or legacy `related_topic`. An exact registered UID without the legacy field SHALL be valid; the existing normal first-run legacy form SHALL remain valid; dual forms SHALL resolve identically or fail once as a binding conflict. Reference-index coverage SHALL continue to require the accepted eight-column `reference/_INDEX.md` table. A missing or unparseable parent table SHALL fail as one parent root before per-reference row coverage is evaluated.

Numeric `count_floor` SHALL use the narrow shared countability predicate: accepted status plus at least one parseable `source_url` on already authority-selected references. Required semantic section availability SHALL remain in `reference_format`. Fixed Core Content Capture character count, fixed Key Facts bullet count, section order/case/heading level, homepage/path depth, Jaccard similarity, duplicate-looking URL, self-reference, and other prose-quality heuristics SHALL NOT affect numeric count. The existing `key_facts_min_lines` rule SHALL be removed from the blocking Wave1 gate definition; Key Facts quantity MAY remain a non-blocking inspect advisory rather than being duplicated beside `reference_format` and `count_floor`.

These checks SHALL remain deterministic process/structure checks. They SHALL NOT score source insightfulness or other Agent-owned semantic quality.

#### Scenario: Wave1 deepening coverage is ledger-first

- **WHEN** a topic deepening file exists without a matching submitted Wave1 work-unit ledger row
- **THEN** Wave1 complete gate SHALL fail delegated provenance

#### Scenario: Wave1 depth review is required

- **WHEN** a topic has `evidence-summary.md` and `question-list.md`
- **AND** `artifacts/wave1/{topic}/depth-review.yaml` is missing or unparsable
- **THEN** Wave1 complete gate SHALL fail with diagnostics naming the missing depth-review projection

#### Scenario: Wave1 exact source novelty floor blocks shallow output

- **WHEN** reviewed submitted Wave1 rows contain exact-new accepted source URLs below the profile-derived floor
- **THEN** Wave1 complete gate SHALL fail
- **AND** diagnostics SHALL name the topic, required floor, observed new source count, and supplementary work-unit repair path

#### Scenario: Wave1 missing floor parameter blocks hidden defaults

- **WHEN** the active profile/runtime data lacks a required parameter for deriving the Wave1 new-source floor
- **THEN** Wave1 complete gate SHALL fail with a `missing_profile_parameter` diagnostic
- **AND** the gate SHALL NOT substitute an unstated default threshold

#### Scenario: UID-only reference satisfies Wave1 topic binding

- **WHEN** a historical or rerun-time reference has all common required metadata and exact `related_topic_uid` but omits legacy `related_topic`
- **THEN** Wave1 reference-format evaluation SHALL bind it to the registered canonical topic
- **AND** it SHALL NOT fail solely because the legacy key is absent

#### Scenario: Invalid reference index is one parent failure

- **WHEN** `reference/_INDEX.md` is missing or contains a prose summary/list instead of the accepted eight-column table
- **THEN** Wave1 SHALL fail with one parent index-table root
- **AND** per-reference missing-row failures SHALL remain masked until the parent table is valid

#### Scenario: Numeric count does not repeat content-format checks

- **WHEN** an authority-backed accepted reference has a parseable source URL but short prose or fewer than five Key Facts bullets
- **THEN** the numeric count-floor evaluator SHALL still count it
- **AND** only a genuinely missing required semantic section MAY fail the separate shared reference-format rule

#### Scenario: Depth facts come from reviewed submitted rows

- **WHEN** a depth review identifies submitted work-unit refs and omits copied source/cache/new-source fields
- **THEN** Wave1 gate SHALL derive source claims, cache mapping, novelty, observed count, and required floor from direct authority
- **AND** omission of the retired duplicate fields SHALL NOT fail the review


### Requirement: Wave2 complete gate rule set

The Wave2 complete gate definition SHALL distinguish pure main-agent synthesis from delegated targeted evidence search. Delegated Wave2 targeted evidence outputs SHALL require submitted work-unit ledger rows; pure synthesis artifact checks SHALL continue to use synthesis artifact rules.

The Wave2 gate definition SHALL require deterministic evidence that the pure synthesis path was earned: scan matrix coverage, finding-index parseability, confidence/backing field consistency, unresolved search-required count, and targeted search receipt refs when a finding decision required delegated search. It SHALL fail when synthesis prose exists but scan/triage/gap-analysis artifacts are absent or inconsistent.

`cross-topic-ledger.md` SHALL contain the six required non-empty semantic sections: Cross-Topic Scan Matrix, Wave1 Legacy Questions, Cross-Topic Resolutions, Emergent Cross-Topic Questions, Exploration Decisions, and HITL2 Handoff. The historical `ledger_fixed_sections` rule id MAY remain stable for compatibility, but its checker SHALL evaluate section availability as a tolerant set rather than an ordered regex. Section order, heading level, spacing, and equivalent case SHALL NOT independently fail the Gate.

These checks SHALL NOT judge whether the synthesis is profound or whether a finding is semantically valuable. They only verify that the required process evidence, semantic sections and cross-file consistency exist.

#### Scenario: Delegated Wave2 targeted search requires work-unit row

- **WHEN** Wave2 targeted evidence search creates new evidence outputs
- **THEN** Wave2 complete gate SHALL require submitted work-unit coverage for those outputs

#### Scenario: Wave2 synthesis without scan matrix fails

- **WHEN** `artifacts/wave2/synthesis.md` exists
- **AND** `cross-topic-ledger.md` lacks the Cross-Topic Scan Matrix section or `finding-index.yaml` lacks scan coverage fields
- **THEN** Wave2 complete gate SHALL fail structure/preflight checks
- **AND** the primary finding SHALL name the missing semantic/structured fact rather than a heading-format preference

#### Scenario: Search-required finding without receipt or deferral fails

- **WHEN** `finding-index.yaml` contains a finding with `search_required: true`
- **AND** the finding has no submitted targeted evidence receipt refs and no explicit `defer_hitl2`, `requires_internal_data`, or `record_only` decision
- **THEN** Wave2 complete gate SHALL fail convergence checks

#### Scenario: Six ledger sections may be reordered

- **WHEN** all six required non-empty sections exist in a different order or equivalent heading presentation
- **THEN** the `ledger_fixed_sections` compatibility rule SHALL pass
- **AND** no ordered-regex shadow checker SHALL fail formal Gate or inspect


### Requirement: Gate CLI evaluates wave1 rules from definition

The Wave1 gate CLI SHALL evaluate work-unit provenance rule types and Wave1 depth-contract rule types from the gate definition. It SHALL use work-unit helper diagnostics for ledger/index/manifest/result/receipt/beacon/hash/cache mismatches and SHALL use deterministic readers for `depth-review.yaml`, Wave0 source URL sets, structured source claims, submitted cache trail mappings, canonical reference topic binding, and the reference-index table.

Formal gate and side-effect-free Wave1 inspect SHALL consume the same pure reference-format and reference-index evaluator results. The evaluator SHALL use the shared UID/current/previous-layout resolver through one reference-metadata adapter; neither wrapper SHALL maintain a hard-coded required legacy field list or a second topic parser. The formal wrapper MAY retain its existing gate-attempt/trace ownership, while inspect remains read-only.

The Wave1 CLI SHALL not scan non-work-unit delegated directories as a production coverage source, and SHALL not reintroduce retired content heuristics as blocking checks or diagnostic advice. If a submitted index/status binding exists but the corresponding bundle declaration row is missing, the shared evaluator SHALL return `submitted_declaration_missing` as the parent root and SHALL mask dependent output/cache/count/bypass symptoms until declaration recovery or a new legal attempt is completed.

All Wave0/Wave1/Wave2 shared evaluator roots SHALL expose the static contract lineage needed for one repair: `missing_fact` and `write_to`; inspect and formal Gate wrappers SHALL add the exact invoked checkpoint as `rerun`. These are read-only feedback coordinates, not a new authority or generic repair controller. `missing_fact` SHALL identify the earliest direct failed fact and its owning contract; `write_to` SHALL name the exact authorized bundle surface or legal Engine operation. Existing `inspect`/`advice` strings MAY remain for compatibility but SHALL NOT be the only repair information.

Wave1 semantic Markdown checks SHALL protect section/content availability while tolerating equivalent presentation. `question_list_has_four_sections` SHALL require the four named semantic sections without fixed order, case, heading level, spacing, or list style. `source_url_present` SHALL accept a parseable bare HTTP(S) URL or Markdown link. `key_findings_non_empty` SHALL accept common bullet, numbered, or non-empty paragraph content under the semantic Key Findings section. These tolerant evaluators, not the historical regex presentation, SHALL own the blocking result.

#### Scenario: Wave1 CLI ignores non-work-unit coverage

- **WHEN** non-work-unit delegated directories contain Wave1-looking result files
- **AND** no submitted work-unit ledger rows cover the outputs
- **THEN** Wave1 gate CLI SHALL fail delegated provenance

#### Scenario: Wave1 CLI evaluates depth review from definition

- **WHEN** the Wave1 gate definition contains a depth-review rule
- **THEN** the CLI SHALL parse the rule target from the active bundle
- **AND** the rule SHALL contribute to the overall pass/fail determination

#### Scenario: Inspect and gate share reference evaluation

- **WHEN** Wave1 inspect and the formal Wave1 gate evaluate the same bundle bytes
- **THEN** both SHALL report the same reference topic-binding, parent-index, row-coverage and source-layer result
- **AND** only the formal gate wrapper MAY perform its accepted durable gate side effects

#### Scenario: Normal legacy reference remains valid

- **WHEN** a normal first-run bundle uses the existing valid `related_topic` metadata form and an accepted index table
- **THEN** the shared Wave1 evaluator SHALL continue to accept that reference binding
- **AND** no rerun-only producer or gate branch SHALL be required

#### Scenario: Missing declaration masks downstream Wave1 symptoms

- **WHEN** a Wave1 work unit is submitted in index/status but its bundle ledger row is absent
- **THEN** inspect and gate SHALL report one `submitted_declaration_missing` parent root for that work ID
- **AND** they SHALL mask dependent missing-output, cache-mapping, count-floor, and delegated-bypass symptoms

#### Scenario: Affected root carries contract-lineage repair coordinates

- **WHEN** an in-scope Wave1 rule rejects a deterministic fact
- **THEN** its primary structured diagnostic SHALL include non-empty `missing_fact`, `write_to`, and `rerun`
- **AND** the Agent SHALL not need to inspect Engine source to locate the authorized repair surface or checkpoint

#### Scenario: Question-list order is not blocking authority

- **WHEN** all four required question-list semantic sections are present and non-empty in an equivalent order or harmless heading presentation
- **THEN** the shared evaluator SHALL accept the structure
- **AND** the historical ordered-regex presentation SHALL NOT fail Wave1


### Requirement: Blocking judgment contracts SHALL close across producer, authority, checker, diagnostic, and guard

Each blocking deterministic gate/output contract SHALL have a closed and minimal contract chain:

- producer instruction that tells the Agent what direct deterministic shape to write;
- runtime authority surface that stores the truth in the active bundle or submitted ledger;
- one checker implementation that consumes that exact authority shape;
- diagnostic/advice output that exposes the smallest actionable root cause and repair coordinates; and
- regression or static guard that catches future drift.

For in-scope Wave artifact/provenance rules, formal gate and inspect SHALL reuse the same pure evaluator result and rule id. Their primary root object SHALL also share the same `missing_fact` and `write_to`; each command SHALL project its own exact checkpoint in `rerun`. Formal lifecycle checks such as node binding, handoff preflight, routing, degraded eligibility, gate-attempt durability, checkpoint, and `trace_event_*` SHALL remain formal-only and SHALL NOT be duplicated in inspect.

Blocking rules SHALL protect required structure, deterministic authority, provenance, consumer navigation, or explicit accepted floors. Presentation/maintenance preferences SHALL use tolerant parsing or advisory feedback unless they are necessary to locate or parse a direct authority surface.

If a prerequisite authority surface is absent or unparseable, the checker SHALL report that prerequisite as the primary root cause and SHALL short-circuit dependent checks whose results would only be downstream symptoms. For reference inventory, an invalid or missing eight-column `_INDEX.md` table SHALL mask per-reference row and source-layer symptoms until the table parses. The implementation SHALL use local guards rather than a generalized dependency engine.

If a surface is not Agent-produced, the audit MAY record an explicit non-Agent-produced exemption for the producer instruction surface. Otherwise, missing or contradictory closure surfaces SHALL be treated as judgment/output contract drift.

#### Scenario: blocking rule has a closed contract chain

- **WHEN** an active gate rule contributes to pass/fail
- **THEN** apply evidence or maintained audit mapping SHALL identify its producer instruction or explicit non-Agent-produced exemption, runtime authority, checker route, diagnostic surface, and test guard
- **AND** in-scope Wave artifact/provenance rules SHALL identify the shared evaluator route used by formal and inspect
- **AND** static or focused regression coverage SHALL fail when the checker route or contract inventory is missing

#### Scenario: presentation preference is not promoted to authority

- **WHEN** direct structured authority proves a required fact and Markdown differs only in harmless presentation
- **THEN** the command SHALL accept tolerant equivalent parsing or emit advisory feedback
- **AND** it SHALL NOT create an independent blocking rule for the preference

#### Scenario: authority conflict is resolved by truth type

- **WHEN** producer docs, submitted ledger rows, return-map refs, helper checks, or inspect wording disagree about the same deterministic fact
- **THEN** implementation SHALL resolve the conflict using the judgment-layer Source of Record for that truth type
- **AND** the lower-authority surface SHALL be updated or diagnosed rather than silently broadening gate acceptance

#### Scenario: missing prerequisite masks dependent rules

- **WHEN** a parent YAML object, required array, or required field cannot be read
- **THEN** the checker SHALL report the parent/field as the blocking root
- **AND** dependent rules SHALL be recorded as masked or omitted rather than failed independently

#### Scenario: Root feedback names one authorized repair loop

- **WHEN** a blocking rule has one actionable direct root
- **THEN** primary feedback SHALL name that fact in `missing_fact`, its exact mutable or Engine-owned repair surface in `write_to`, and the same checkpoint in `rerun`
- **AND** it SHALL NOT provide competing repair branches or require the Agent to infer contract lineage from opaque prose

#### Scenario: Wave root projection feeds the standard Gate hint

- **WHEN** a shared Wave blocking root reaches a formal Gate wrapper
- **THEN** the standard top-level `hints[]` entry SHALL be projected from that root rather than reconstructed from inspect/advice prose
- **AND** the matching inspect command SHALL expose the same direct fact and authorized repair surface without formal routing side effects

#### Scenario: delegated bypass scan has one side-effect owner

- **WHEN** inspect and formal gate evaluate delegated-bypass provenance for the same bundle
- **THEN** both SHALL consume the same pure scan result
- **AND** only the formal wrapper MAY emit durable bypass trace/log evidence
- **AND** one formal invocation SHALL emit that diagnostic at most once

#### Scenario: Invalid index table masks row cascade

- **WHEN** the reference index parent cannot be parsed as the accepted table
- **THEN** the shared evaluator SHALL return one `reference_index_table_invalid` or equivalent root and the index path as the nearest repair target
- **AND** it SHALL NOT return one primary `missing_index_row` failure for every reference file in the same evaluation


### Requirement: Wave gates SHALL aggregate accepted topic layouts by UID

For each canonical topic UID, Wave0 and Wave1 gate evaluators SHALL use the shared resolver's bounded current-plus-previous slug set when locating submitted artifact/reference coverage. Reference metadata SHALL use a thin adapter over the same resolver: exact `related_topic_uid`, or legacy `related_topic` current/previous ids or slugs, SHALL resolve to canonical UID sets without introducing another identity map. If both metadata forms are present, they SHALL agree or fail closed as one binding conflict.

Historical files SHALL remain at recorded paths and SHALL count only when existing submitted provenance authority binds them to the same UID. Historical reference files SHALL NOT require mass rewriting merely to replace a valid legacy binding with a UID. Current seed checks and new work eligibility SHALL continue to use only the current slug. A rerun-added topic without historical coverage SHALL enter the normal Wave0/Wave1 production and reference-materialization path.

Accepted slugs SHALL be alternatives for one UID, not separate mandatory targets. Per-topic floors SHALL evaluate aggregate submitted coverage across the UID's accepted slugs and SHALL NOT require one file per historical alias. The same physical file or submitted row SHALL count at most once for one UID. A previous slug SHALL NOT create a new topic, satisfy another UID or grant authority without existing submitted coverage.

#### Scenario: Renamed topic retains historical wave coverage
- **WHEN** a topic's submitted Wave1 outputs remain under a unique previous slug after canonical rename
- **THEN** the Wave1 gate SHALL attribute those outputs to the same UID without requiring file moves or ledger rewrites

#### Scenario: New rerun output uses current slug
- **WHEN** new work is enqueued after layout mutation
- **THEN** its required output paths SHALL use the current slug while historical coverage remains readable under previous slugs

#### Scenario: Duplicate match counts once
- **WHEN** one submitted output is discoverable through more than one accepted-layout check
- **THEN** gate counting SHALL deduplicate it by existing provenance identity

#### Scenario: Previous aliases are not extra floors
- **WHEN** one UID has several previous slugs but valid submitted coverage under only one accepted slug
- **THEN** a one-per-topic rule SHALL evaluate the UID aggregate rather than require coverage for every alias

#### Scenario: Historical reference binding does not require migration

- **WHEN** an existing covered reference resolves uniquely through legacy metadata or an exact UID
- **THEN** Wave1 SHALL retain that historical binding without requiring a metadata-only work unit or mass rewrite
- **AND** submitted backing and index navigation requirements SHALL remain unchanged

#### Scenario: Rerun-added topic uses normal Wave1 materialization

- **WHEN** a sanctioned rerun adds a topic with no historical Wave1 coverage
- **THEN** the topic SHALL use current layout coordinates and the normal Wave1 delegated/materialization contract
- **AND** rerun classification SHALL NOT create a second reference, gate or provenance path

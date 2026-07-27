> req: RRM-002, RRM-003, RRM-007

## MODIFIED Requirements

### Requirement: Seed-topic backfill SHALL preserve traceable meaning, not only evidence lists or conclusions

Seed-topic backfill for Wave0, Wave1 and Wave2 SHALL be a readable projection
of existing authority, not a direct Markdown edit. The Agent SHALL form an
identity-bound Projection Packet and submit it through the existing sanctioned
topic-state writer. The writer SHALL map a stable `slot_id` to its canonical
heading/card section, consume the applicable one-time token on first
materialization, and upsert subsequent entries by their stable identity. The
permanent `回填卡` immediately below a canonical heading is immutable layout
context, not a Projection Entry and not a token replacement target.

Every projected entry SHALL combine evidence meaning with traceable refs and
the accepted five fields: `evidence_meaning`, `relationship`, `refs`, `status`
and `next_hop`. Wave0/1 entries bind one submitted work identity in their
owned slots. New Wave2 entries bind an exact current-round W2F identity whose
accepted `affected_topics` resolution includes the seed's current UID; Wave2
may append/upsert only its own W2F entries in pending questions and SHALL not
overwrite Wave1 questions. An explicit `defers/deferred` entry with a limitation is the only
accepted no-consumer-reference disposition. A token, naked URL list, generic
`WaveN submitted` prose, count summary, or anonymous `none` text is not a
projection entry.

Every entry newly materialized from a Projection Packet SHALL also render the
slot descriptor's stable `entry_id`: Wave0/1 use `<work_id>/<positive ordinal>`
and Wave2 uses its exact source `W2F-*` finding id. Historical entries remain
read-compatible through their accepted exact-ref or existing metadata identity
forms and SHALL NOT be rewritten merely to add an `entry_id`.

For a new Wave2 packet entry, the exact `W2F-*` `entry_id` SHALL equal its
validated current-round source identity, which SHALL resolve to the packet
topic, and be its primary deterministic finding selector. `refs` remains the
navigation field and MAY be `none` in an accepted deferred disposition; the
writer SHALL NOT require the W2F ID to be copied into it. Historical entries
without a packet-created Wave2 `entry_id` retain the accepted
exact-W2F-token-in-`refs` identity path. That read path SHALL NOT authorize a
new packet with a legacy-round or wrong-topic finding. A W2F mention in ordinary
prose, `next_hop`, or invalid/dangling metadata SHALL never establish selection.

The projection SHALL NOT replace submitted work-unit rows, source claims,
reference backing, cache trails, finding index or ledger as evidence authority.
It SHALL not create a reference, receipt or submitted coverage. The Agent owns
meaning, relationship, status and next-hop judgment; the Engine owns only
binding, slot placement, serialization and deterministic structure.

#### Scenario: Wave0 projection enters its owned slot

- **WHEN** an eligible current Wave0 submitted work identity has an
  Agent-authored packet entry
- **THEN** the writer SHALL materialize one parseable entry in
  `## Wave0：本主题的新增来源证据`, after its retained `回填卡`
- **AND** it SHALL not use the entry to establish submitted evidence coverage

#### Scenario: Wave1 packet atomically projects its three owned concerns

- **WHEN** a valid Wave1 packet contains mechanisms, trends and pending-
  question entries for one current topic
- **THEN** the writer SHALL commit them together or reject all of them
- **AND** no partial token consumption or generic completion prose SHALL remain

#### Scenario: Wave1 backfill explains what was learned

- **WHEN** a Wave1 deepening task materializes an entry in its owned mechanisms,
  trends, or pending-question slot
- **THEN** that entry SHALL include one or more mechanism/trend statements
- **AND** each statement SHALL include navigation to the evidence-summary or
  question-list and supporting reference/cache/work-unit surfaces where available

#### Scenario: Wave2 preserves finding lineage and Wave1 questions

- **WHEN** a Wave2 packet projects an exact current-round W2F finding that
  resolves to its target topic into current judgment and/or pending questions
- **THEN** each resulting entry SHALL preserve the W2F identity and relevant
  finding-index/ledger/source navigation
- **AND** it SHALL not remove or overwrite a Wave1-owned pending-question entry

#### Scenario: Wave2 backfill preserves finding lineage

- **WHEN** a Wave2 packet materializes an entry in its owned current-judgment or
  pending-question slot
- **THEN** the entry SHALL cite its relevant exact finding ID
- **AND** it SHALL link that finding to `finding-index.yaml`,
  `cross-topic-ledger.md`, and the source artifacts used by the finding

#### Scenario: Deferred disposition is explicit

- **WHEN** an admitted authority identity has no materializable consumer
  reference
- **THEN** the Agent SHALL submit an identity-bound deferred entry with an
  explicit limitation in `next_hop`
- **AND** the writer SHALL not fabricate `reference/*.md`, source claims or a
  successful evidence-bearing entry

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Return-map inspection SHALL verify per-row current-round authority references

One pure deterministic projection-readiness evaluator SHALL interpret current
canonical registry binding, current Wave authority identities and canonical
Seed Topic appendix entries for both the applicable Wave inspect and formal
Wave gate. The evaluator SHALL inspect only the slot family owned by the target
Wave:

| Wave | owned slot family |
| --- | --- |
| Wave0 | `wave0_evidence` |
| Wave1 | `wave1_mechanisms`, `wave1_trends`, `pending_questions` |
| Wave2 | `wave2_judgment` plus exact W2F entries in `pending_questions` |

Its direct sources are the canonical registry/current-seed binding, current
eligible submitted rows for Wave0/1, current-round usable Wave2 finding-index
facts resolved to their affected topics, and the parsed seed document. It SHALL
not infer a topic from disk scan, generic prose,
artifact count, cache or an orphan seed. It SHALL use the shared executable
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
binding or authority parent; an unavailable readable target family or a canonical
heading missing its required card; Wave-family or entry identity binding;
malformed/token/generic-prose/ref structure; then per-current authority coverage.
A direct parent finding SHALL mask dependent token/entry/coverage symptoms. Once
parents are usable, every current submitted work or current W2F identity mapped
to that topic SHALL be represented by one valid entry or explicit identity-bound deferred
disposition. Declared legacy headings and repeated matching headings remain
read-compatible under the accepted family-union policy, but SHALL not satisfy a
missing current identity. Historical/orphan seeds shall not become current
targets. A selected slot's missing or repeated writer target is not an evaluator
input: only `apply` packet admission SHALL emit
`seed_projection_layout_missing` or `seed_projection_layout_ambiguous` before
workspace creation.

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
evidence authority or a second receipt.

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

#### Scenario: Generic submitted prose is not a projection

- **WHEN** a Wave1 or Wave2 slot contains only `WaveN submitted` or another
  identity-free generic status line while current authority exists
- **THEN** inspect and formal gate SHALL fail with the exact entry/identity root
- **AND** it SHALL not be treated as a deferred disposition

#### Scenario: Valid writer output satisfies one truth path

- **WHEN** a legal packet writes an entry bound to a current submitted work or
  current-round W2F identity resolved to its topic in its owned slot
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

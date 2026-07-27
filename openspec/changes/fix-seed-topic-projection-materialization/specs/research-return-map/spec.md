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

#### Scenario: Wave2 preserves finding lineage and Wave1 questions

- **WHEN** a Wave2 packet projects an exact current-round W2F finding that
  resolves to its target topic into current judgment and/or pending questions
- **THEN** each resulting entry SHALL preserve the W2F identity and relevant
  finding-index/ledger/source navigation
- **AND** it SHALL not remove or overwrite a Wave1-owned pending-question entry

#### Scenario: Deferred disposition is explicit

- **WHEN** an admitted authority identity has no materializable consumer
  reference
- **THEN** the Agent SHALL submit an identity-bound deferred entry with an
  explicit limitation in `next_hop`
- **AND** the writer SHALL not fabricate `reference/*.md`, source claims or a
  successful evidence-bearing entry

### Requirement: Shared guidance SHALL teach the same return-map shape across waves

One `shared-seed-topic-template` Markdown contract SHALL own the complete
Agent-facing Seed Topic Document definition: initialization skeleton, appendix
slot map, exact canonical headings, per-heading `回填卡`, Wave-to-section
ownership, one-time token lifecycle, canonical `entry_id` plus five-field entry
example, concrete-first ref hierarchy, Projection Packet loop, repair map and
rerun-direction fragment. Each card SHALL visibly state its writer, direct
authority, entry identity/field shape, sole legal writer action and prohibited
direct-edit/generic-prose behavior. It SHALL state that return maps are
Agent-readable navigation projections, not evidence authority.

For new canonical rendering, these exact canonical headings replace the prior
fresh-render no-rename constraint. The five former heading bases remain declared
legacy aliases solely for bounded read compatibility and a legal targeted packet
upgrade; they are not a second template or Agent-selectable heading vocabulary.

`phase-seed-topics`, `phase-rerun`, `phase-wave0`, `phase-wave1` and
`phase-wave2` SHALL load this contract through their actual `requires` chain at
the relevant document/materialization decision point. Phase bodies SHALL add
only their local authority, command sequence and checkpoint. Role guidance and
generated work-unit task/spawn text SHALL remain self-contained with at most a
concise five-field cue and authority disclaimer; they SHALL not reproduce the
complete slot/table/token/example contract.

The old focused authoring files SHALL not remain a second complete template.
They MAY be short compatibility pointers during migration but SHALL not define
their own entry grammar, slot ownership, token lifecycle or full skeleton. A
static parity/duplicate-template check SHALL compare named slot and card
descriptor facts between template and executable slot map and reject a second
complete generic template. No runtime code SHALL parse the Markdown template to
derive behavior.

When a deterministic result names a legal packet/entry/slot repair, guidance
SHALL expose the direct fact, named owner surface and same Wave inspect to
rerun. When no legal path exists, it SHALL expose the owner or missing-contract
boundary; it SHALL not tell users to hand-edit a seed or ask Agents to rebuild
validator logic.

#### Scenario: One template answers the document-level question

- **WHEN** a human or Phase Agent needs to understand a current Seed Topic
  Document's skeleton, slots, writer loop and repair destination
- **THEN** one loaded `shared-seed-topic-template` SHALL provide those facts
- **AND** the reader SHALL not need to combine two complete shared authoring
  contracts or inspect Engine source

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

#### Scenario: Template feedback preserves the legal repair boundary

- **WHEN** inspect reports an invalid packet entry or missing projection
- **THEN** the template SHALL direct the Agent to the named slot/authority owner
  and the same inspect
- **AND** it SHALL not represent a user decision as writer permission

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
parents are usable, every current submitted work or current W2F identity SHALL
be represented by one valid entry or explicit identity-bound deferred
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

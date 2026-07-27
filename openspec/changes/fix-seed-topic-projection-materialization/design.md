## Context

BUG-138 shows a split between three facts that should converge at a Wave
decision point: submitted work/finding authority, a reader-facing Seed Topic
Document, and Wave completion. The current framework has two partial shared
authoring documents, an initial-skeleton renderer, phase-local prose asking an
Agent to replace tokens, and a return-map reader that can diagnose omissions.
None is the single legal materializer, so completion trace and navigation truth
can diverge.

The selected design keeps the project boundary intact. The Agent judges the
meaning of research. Markdown gives it one complete interface and an operating
loop. JavaScript admits a narrow structured packet, atomically writes only the
legal seed slots, and reports deterministic facts. Submitted rows, source
claims, references, artifacts, finding-index and ledger remain their existing
authorities.

## Goals / Non-Goals

**Goals:**

- Give humans and Phase Agents exactly one complete Seed Topic Document
  template, including the feedback map required to locate the right owner.
- Give each current Wave authority identity one legal, route-bound projection
  path through existing `operate-topic-state apply` and its existing
  workspace/recover durability boundary.
- Make slot ownership, token lifecycle, identity merge and inspect/gate
  interpretation deterministic and shared, rather than copied in phase prose.
- Make Wave completion truthful: a structural projection failure cannot be
  degraded into an advancing handoff.
- Preserve Agent semantic judgment and keep feedback root-first, direct, and
  immediately actionable.

**Non-Goals:**

- Create an evidence source, receipt, trace type, generic Markdown engine,
  second CLI, bundle-local schema/template, automatic repair, watcher, or
  another lifecycle state.
- Make the Engine choose evidence, write research meaning, decide relationships,
  or assess research quality.
- Bulk migrate legacy bundles, repair the cited bundle by hand, or decide
  BUG-132 candidate-level Wave0 coverage.
- Change BUG-134's independent Wave2 synthesis-ledger classification beyond
  retaining strict Seed Topic projection checking.

## Decisions

### 1. One Seed Topic Document template, with one executable slot-map mirror

`shared-seed-topic-template.md` becomes the sole complete human/Agent-facing
contract. It combines the useful content of `shared-seed-topic-authoring.md`
and `shared-return-map-authoring.md`: initial structure, appendices, slot
ownership, packet grammar, exact entry shape, rerun direction, ref hierarchy,
and repair map. Each of `phase-seed-topics`, `phase-rerun`, and
`phase-wave0/1/2` loads this file directly. The old filenames either become
short compatibility pointers or are removed after package references are
migrated; neither retains a complete second template.

The runtime does not parse this Markdown. `canonical-topic-state.mjs` exports a
frozen slot map as the one executable adjustment point for per-slot structural
facts:

```text
slot_id, canonical_heading, legacy_heading_aliases, heading_suffix_policy,
initial_token, owner_wave(s), source_identity_kind, merge_mode,
card { writer, authority, entry_identity, required_entry_fields,
       legal_action, prohibitions }
```

Renderer, locator, writer and readiness evaluator import the same map. Static
tests compare its ordered headings, tokens, owners and card descriptor facts
with named template facts. This preserves an Agent-readable single entry
without elevating guidance to authority or inventing a third JSON schema.

| slot_id | canonical heading | declared legacy heading base | card writer / direct authority |
| --- | --- | --- | --- |
| `wave0_evidence` | `## Wave0：本主题的新增来源证据` | `## 本轮新增证据` | Wave0 Phase Agent / current eligible submitted Wave0 work-unit |
| `wave1_mechanisms` | `## Wave1：本主题的机制理解` | `## 本轮新增机制理解` | Wave1 Phase Agent / current eligible submitted Wave1 work-unit |
| `wave1_trends` | `## Wave1：本主题的趋势、难点与限制` | `## 本轮新增趋势与难点` | Wave1 Phase Agent / current eligible submitted Wave1 work-unit |
| `wave2_judgment` | `## Wave2：本主题的当前跨主题判断` | `## 当前判断` | Wave2 Phase Agent / exact current-round `W2F-*` finding affecting this topic |
| `pending_questions` | `## 本主题的待验证问题与后续验证路径` | `## 待验证问题` | Wave1 first, then Wave2 W2F append / their corresponding current authority |

The per-slot card descriptor also fixes the new writer's entry identity and
slot action; every new entry includes that `entry_id` plus the five canonical
fields. Historical valid entries keep their accepted ref-based identity parsing
and are not rewritten merely to add metadata.

| slot_id | card `entry_id` rule | legal packet target | card-specific prohibition |
| --- | --- | --- | --- |
| `wave0_evidence` | `<work_id>/<positive ordinal>` | Wave0 -> `wave0_evidence` | never use `Wave0 submitted` or artifact/cache as the sole consumer ref |
| `wave1_mechanisms` | `<work_id>/<positive ordinal>` | Wave1 -> `wave1_mechanisms` | do not turn evidence-summary provenance into the only consumer ref |
| `wave1_trends` | `<work_id>/<positive ordinal>` | Wave1 -> `wave1_trends` | do not replace a limitation with generic submit prose |
| `wave2_judgment` | exact current-round source `W2F-*` finding id affecting this topic | Wave2 -> `wave2_judgment` | do not use a general synthesis line without the exact finding binding |
| `pending_questions` | Wave1 `<work_id>/<positive ordinal>`; Wave2 exact current-round `W2F-*` finding id affecting this topic | Wave1 -> `pending_questions`; Wave2 append/upsert only its W2F entry | Wave2 never replaces a Wave1 question entry |

New rendering uses the exact canonical headings above. For compatibility, the
read locator retains the accepted bounded heading-suffix grammar for the
canonical or declared legacy base headings; it does not accept arbitrary
aliases, and it keeps every matching occurrence in the applicable read family.
Normal inspect/gate therefore retains `RRM-007`'s historical family-union
behavior and never treats repeated headings alone as a migration blocker. The
writer has a separate, packet-scoped target locator: a recognized *write target*
has exactly one occurrence for the selected `slot_id`, either a canonical
heading followed by its card or a declared legacy heading. A seed may be legacy,
partial, or mixed after a prior legal targeted upgrade; unrelated slots are not
implicitly migrated. Only this packet admission step rejects an ambiguous
target with `seed_projection_layout_ambiguous` before workspace creation rather
than guessing which historical occurrence to change.

Each canonical heading permanently renders its `回填卡` directly before its
token or entries. The complete template shows the exact same descriptor facts;
for example, the Wave0 card has this stable shape (the other cards vary only by
their slot descriptor):

```markdown
## Wave0：本主题的新增来源证据

> **回填卡（只读操作约束，不是 Projection Entry）**
> - 写入者：Wave0 Phase Agent
> - 依据：当前轮已 submitted 的 Wave0 work-unit
> - 写法：每个 `<work_id>/<ordinal>` 一条；必须含 `entry_id`、
>   `evidence_meaning`、`relationship`、`refs`、`status`、`next_hop`
> - 动作：形成 `context: wave_projection` / `action: apply_seed_projection`
>   packet，经 `operate-topic-state apply` 写入 `wave0_evidence`
> - 禁止：手改本节、只写 “Wave0 submitted”、或把 artifact/cache 当唯一 consumer ref

__BACKFILL_WAVE0_EVIDENCE__
```

The writer only replaces/upserts the entry area after that card; it never
consumes, replaces or parses the card as an entry. A heading/card rule changes
through the slot map plus the paired template update in a future OpenSpec
change, with static parity making an incomplete adjustment fail visibly.

Rejected alternative: retain two focused full docs. It optimizes local context
size but fails the reader's document-level question and repeats the source-of-
reference ambiguity that produced BUG-138. An index page is also rejected: it
adds navigation without eliminating split ownership.

### 2. Extend the existing topic-state seam, do not add a backfill CLI

`operate-topic-state apply` receives a strict `ProjectionPacketSchema` union
member:

```yaml
context: wave_projection
action: apply_seed_projection
topic_uid: tp_...
wave: wave0|wave1|wave2
updates:
  - slot_id: ...
    entries:
      - source_identity: { kind: submitted_work|finding, work_id|finding_id: ... }
        entry_id: ...
        evidence_meaning: ...
        relationship: ...
        refs: [...]
        status: ...
        next_hop: ...
```

The schema is strict. It excludes `path`, heading/token text, line coordinates,
append/replace verbs, and raw Markdown. A packet targets one current canonical
topic and one Wave; Wave1 can atomically modify its several slots. A selected
slot has nonempty entries. A no-consumer-reference outcome is represented by a
source-identity-bound `defers/deferred` entry with an explicit limitation, not
by generic submission prose or an empty slot.

The existing workspace stages one seed replacement, persists its manifest, and
uses its existing recover operation. `rb_plan.md` is read for canonical binding
but is not staged or replaced by this packet operation. The projection operation
does not mutate registry, queue, ledger, status, trace, artifact, reference, or
profile state. This is a narrow allowed mutation under `CTS-004`, not a new
mutation owner.

Rejected alternative: let each Phase directly replace tokens. It duplicates
locators, admits arbitrary headings and makes atomicity/recovery inconsistent.
Rejected alternative: create `backfill-seed`. It duplicates the public seam and
workspace without adding a distinct reader problem or authority.

### 3. Authorize packets only in the loaded Wave's existing window

`lifecycleAuthorization()` adds an explicit table for `wave_projection`:

| Wave | required current node | exact normal status window | direct authority family |
| --- | --- | --- | --- |
| wave0 | `phases/phase-wave0.md` | `seed_topics_ready` -> `wave0_complete` | current eligible submitted Wave0 rows |
| wave1 | `phases/phase-wave1.md` | `wave0_complete` -> `wave1_complete` | current eligible submitted Wave1 rows |
| wave2 | `phases/phase-wave2.md` | `wave1_complete` -> `wave2_complete` | current-round usable finding-index findings whose resolved `affected_topics` include the packet topic UID |

Each row requires the existing route-bound load/handoff witness and the exact
`current_gate` -> `next_gate` status window shown above. The operation fails
before workspace creation outside its row, after Final without accepted reentry,
or when the selected UID is not current. `human-directed`, generic inspect, a
historical seed file, or a successfully submitted result alone never grants
permission.

This makes the ordinary legal loop clear while preserving existing lifecycle
owners: entry/status remains with existing operations, submitted authority with
work/finding contracts, and topic-state only writes the current seed.

### 4. Writer validates binding and mechanics, Agent owns semantics

Before staging, the writer builds or consumes the same direct facts used by
readiness:

- canonical current registry binding resolves the target UID and seed path;
- Wave0/1 source identities resolve to current eligible submitted rows;
- Wave2 identities resolve to exact current-round usable `W2F-*` findings whose
  accepted `affected_topics` resolution includes the packet `topic_uid`;
- the slot map permits the selected wave and source kind;
- every slot selected by the packet has one unique recognized target: canonical
  heading/card or declared legacy alias, including a legal hybrid left by
  earlier targeted upgrades;
- entries have a stable identity, five fields, valid ref shape and a legal
  deferred exception.

The writer consumes an initial token exactly once, serializes a canonical entry,
and upserts a matching entry identity without touching other slots. For an
otherwise legal packet targeting a declared legacy alias, the same transaction
renames only that heading's base to its canonical base, preserves an accepted
suffix when present, and inserts the exact card before the pre-existing token/
entries. It does not rewrite another legacy heading, and read/inspect never
trigger that upgrade. Wave2 may append/upsert W2F entries in
`pending_questions`, but never removes/replaces a Wave1 entry. A post-write
parser/readiness assertion turns a renderer bug into the same transaction
failure rather than a later completion discrepancy.

For a newly materialized Wave2 entry, the writer verifies that `entry_id` is the
exact `W2F-*` source identity, that the finding is current under the existing
round classifier and affects the packet topic, and the parser uses that
validated metadata for Wave2 selection, including in `pending_questions`. It
does not force that ID into `refs`: `refs` remains the navigation field and can
be `none` for a legal deferred disposition. Previously rendered entries remain
read-compatible through the accepted exact-W2F token in their parsed `refs`;
that compatibility does not admit a legacy-round or wrong-topic finding to a
new packet. A W2F mention in ordinary prose or an unvalidated metadata value
never selects an entry.

No packet can create submitted coverage, source claims, consumer reference
files, findings, or receipts. The Agent supplies `evidence_meaning`,
`relationship`, `status` and `next_hop`; all semantic distinctions remain its
judgment.

### 5. One pure readiness evaluator feeds inspect and formal gate

Extract a focused pure helper, named during implementation, from the current
return-map reader. It takes canonical registry facts, the target Wave's direct
authority fact and parsed seed bytes, then emits structured findings. It takes
no packet and makes no write-target cardinality decision. It is the only
interpretation for projection readiness in both the Wave inspect and the
corresponding formal gate.

The evaluator orders work as follows:

1. canonical registry/seed binding and authority-parent prerequisites;
2. current seed readable Appendix Slot family and canonical-card layout;
3. Wave-family/entry identity binding;
4. token/generic-prose/entry/ref shape; then
5. current-row/finding coverage and explicit deferred disposition.

On an unusable parent it emits its direct root and masks dependent omissions.
Once parents are usable, each missing current identity is independently
reported. A current-wave token becomes a projection root only when that
evaluated Wave family has at least one current direct-authority identity; with
no such demand it remains an unconsumed future/empty-slot marker and cannot
force a fabricated entry. Entry presentation continues to tolerate accepted
wrapper/whitespace forms; only required structure, identity, direct reference
availability and explicit disposition are blocking. Structural findings are passed to
`evaluateWaveDegradationEligibility` as ineligible, so a fatigue threshold
cannot create a false completion handoff.

The formal gate imports these structured findings directly into its existing
contract evaluation; it does not invoke an inspect CLI or reparse seed Markdown.
Within one inspect or gate invocation, the caller builds one normalized canonical
registry fact and passes it to both its existing Wave contract evaluator and the
projection evaluator; Wave2 similarly loads one finding-index fact and passes it
to both consumers. This is a per-invocation direct-fact snapshot, not persisted
projection state or a new authority surface.
The existing five definition-level seed-token checks are retired: Wave1's
`no_stale_mechanisms_token`, `no_stale_trends_token`, and
`no_stale_pending_questions_token`, plus Wave2's
`backfill_judgment_token_absent` and `backfill_questions_token_absent`. They
would otherwise duplicate the evaluator's token truth and yield competing
roots. Their removal does not relax token checking: the shared evaluator now
covers Wave0 as well as Wave1/Wave2 and reports its own root-first findings as
degradation-ineligible.

The evaluator recognizes only the map's canonical headings and declared legacy
base aliases under the accepted bounded suffix grammar. It treats an emitted
`回填卡` as immutable layout context rather than a projection entry. A canonical
heading without its required card is a layout root; a declared legacy heading
remains read-compatible until an otherwise legal packet performs the narrow
targeted upgrade. Repeated matching headings remain readable under existing
family rules and participate in the family union. Missing or repeated targets
produce `seed_projection_layout_missing` or
`seed_projection_layout_ambiguous` only when `apply` validates a selected
packet slot; read-only inspect/gate does not infer that mutation request.

Rejected alternative: inspect-only behavior plus prose ordering. It leaves a
formal gate pass route that contradicts the inspect. Rejected alternative: a
new gate family. The existing Wave gates already own advancement and can reuse
the pure result without a second controller.

### 6. Completion ordering changes, not trace authority

Phase guidance changes the Wave closeout sequence to submitted/finding
authority -> Packet -> topic-state apply -> existing Wave inspect -> existing
formal gate. The Agent records normal completion only after inspect passes.
No new backfill receipt, mutable completion state, or trace event is introduced:
the committed topic-state workspace and the seed document prove the writer's
mechanical mutation; submitted/finding surfaces prove authority; the existing
completion trace remains completion evidence only.

### 7. Explicit legacy boundary with a narrow legal heading upgrade

No automatic or bulk migration is introduced. Parseable historical seed files
remain read-compatible. The five old heading bases are finite, declared locator
aliases under the existing bounded suffix grammar, not a second template or an
Agent-selectable heading name. A current seed can be read without mutation even
when it is legacy, partial, or a hybrid from earlier legal upgrades. Its first
otherwise legal packet upgrades only its targeted slot(s) atomically to
canonical heading/card form while materializing those entries. A target slot
with no recognized heading receives one `seed_projection_layout_missing` root;
a repeated target receives one `seed_projection_layout_ambiguous` root. Neither
can be targeted by a packet. This is an honest missing/ambiguous transition,
not a license to guess a
heading, hand-edit content, or create a parallel success path. Any broader
migration would need its own source-of-record and recovery design.

## Risks / Trade-offs

- **A strict packet might reject a real but presentation-variant entry** ->
  retain current tolerant Markdown parsing for accepted wrappers; block only
  required fields/identity/provenance/navigation facts.
- **Wave gate reuse could create noisy duplicate diagnostics** -> pass the
  evaluator's structured result through once and root-short-circuit it before
  unrelated downstream projection checks.
- **Existing live bundles could use old headings** -> preserve read behavior;
  upgrade only the slot(s) named by an otherwise legal packet, in the same
  atomic write; accept partial or mixed layouts, and return one explicit
  missing/ambiguous layout root only when a selected slot has no safe write
  target.
- **A projection packet could be mistaken for evidence authority** -> template,
  schema, evaluator and feedback all state the direct authority boundary, and
  tests prove packets cannot create source/ledger/reference coverage.
- **Template migration could leave hidden duplicate examples** -> static tests
  name the full-template signature and phase requires; short actor cues remain
  permitted but cannot become a second complete contract.

## Migration Plan

1. Add the slot map, packet schema, atomic writer and direct evaluator behind
   the existing topic-state and Wave interfaces.
2. Migrate shared and phase/playbook references to the single template; retain
   only a short compatibility pointer if package consumers require it.
3. Convert inspect and gate to one evaluator result and mark structural rules
   degradation-ineligible.
4. Add unit/integration/e2e tests before changing a native Agent-flow case.
5. Ship v0.53 with canonical headings/cards for new seeds. Legacy, partial, or
   mixed layouts remain readable and upgrade only through their first legal
   targeted packet; a selected missing or ambiguous slot fails honestly when a
   projection packet is attempted.
6. Rollback is framework-version rollback before a packet is applied. For an
   interrupted application, use the existing exact topic-state `recover`; no
   manual seed restoration path is added.

## Open Questions

None that block proposal. The implementation may choose helper/function names,
but it may not change the specified public seam, source-of-record boundaries,
slot ownership, or control loop without revising this change first.

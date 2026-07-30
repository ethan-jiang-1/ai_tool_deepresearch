## Context

C2 follows archived C1. C1 made artifact-family evaluation precise; C2 now
addresses a different reader question: after a legal source/topic-state write,
what canonical projection truth can a Wave reader rely on without reconstructing
mutable history or guessing Markdown boundaries?

The relevant implementation facts are direct and local:

- `work-unit-submit.mjs` validates a `wave0.source-metadata-array.v1` target at
  first submit but currently writes no source-array contribution fact into the
  hash-valid ledger row.
- `work-unit-projection.mjs` currently walks every eligible historical Wave0
  row, rereads the shared live `source.yaml`, and assigns all current ordinals
  to each historical work ID.
- `canonical-topic-state.mjs` rewrites a matching projection block after
  trimming the replacement boundary; its postcondition verifies only selected
  new entry fields, not all preserved neighboring entry boundaries.
- Fresh seed rendering combines Agent initialization and the Engine appendix in
  a body shape that can leave an indistinguishable template ghost after a
  substring edit. `enrich_seed` correctly preserves body bytes and must not
  become a semantic body author.
- `apply-research-style.mjs` is already the sole profile writer and already
  computes against committed topic count. Topic-state currently returns only a
  weak `follow_up: recompute_research_style` string.
- Packet admission and passive return-map reading both validate concrete
  references independently, but only the writer knows whether a new entry can
  legally be committed.

The real-bundle evidence for the first two facts is BUG-151. BUG-152 provides
the replay/concatenation counterexample; BUG-154 the template ghost; BUG-157
the stale style projection; and BUG-176 the opaque exact-path rejection. The
accepted contracts to refine are `DEW-005`, `CTS-004`, `RRM-004`, `RRM-007`,
`RES-002`, `RES-007`, `RES-008`, `STM-001`, `STM-002`, `PRG-002`, `PRP-002`,
`REI-003`, `RWP-001`, and `RWP-014`. `PRG-002` owns HITL1 Gate verdict shape,
`REI-003` owns rerun-ready verdict shape, `PRP-002` owns HITL1 command order,
and the two RWP requirements own Wave0's Agent-facing contribution-coordinate
guidance; no C2 behavior is left only in a generic research-style contract.

## Goals / Non-Goals

**Goals:**

- Give each current Wave0 source ordinal exactly one submitted work-unit owner
  even when a later legal supplement extends the same source array.
- Make packet `committed` mean that the selected projection slot family remains
  independently parseable and ready for the same reader that will consume it.
- Make new Seed Topic initialization safely editable as one bounded Markdown
  region while preserving Engine-owned appendix slots.
- Turn style recomputation from an easy-to-miss prose reminder into a
  structured existing-owner handoff plus a deterministic freshness root.
- Reuse one concrete-navigation interpretation across packet admission and Wave
  readiness, with exact missing/near-match feedback.

**Non-Goals:**

- No generic artifact versioning system, second ledger, source catalog,
  background repair worker, retry tree, or Agent-flow controller.
- No new attempt/finality/correction semantics, queue reactivation, hash
  recompute command, or submitted-row rewrite. Those remain C4 territory.
- No body-to-frontmatter inference, automatic prose editing, source selection,
  reference authoring, or semantic research judgment by the Engine.
- No fabricated migration for an ambiguous legacy shared source target.

## Decisions

### 1. A source contribution is a narrow, submission-bound semantic layer

The semantic layer is `source_contribution`. Its reader is the Wave0 candidate
evaluator, and its bounded question is: “Which current source-array ordinals
did this submitted work unit establish?” It deliberately preserves distinctions
that change that answer: exact target, topic, accepted ledger order, validated
array prefix length, and semantic prefix digest. It deliberately omits source
selection rationale, raw cache detail, queue ownership, and evidence quality;
those facts answer different questions elsewhere.

On first successful submit of a current `wave0_source_intake`, the direct
output evaluator already has a bounded, schema-valid source array. C2 will
derive a deterministic digest over its parsed, recursively key-sorted JSON
representation, together with the target, direct contract ID, and array length.
The submit transaction writes that object as `source_contribution` inside the
hash-valid ledger row before computing the ledger-record hash. It is not
caller-provided and is not copied to the result, index, queue, or Seed Topic.

The reader groups eligible rows by current canonical Topic and exact direct
target, in ledger append order. It evaluates the live target once, compares
every contribution digest to the corresponding current array prefix, and
requires monotonically extending lengths. A contribution owns global ordinals
`previous_length + 1 .. current_length`. This retains current-array semantics
for legal append while preventing any ordinal from being reassigned to each
historical row.

This is a local semantic digest, not an immutable file claim. YAML formatting
changes that leave the parsed ordered source array unchanged remain harmless;
changed, removed, or reordered source entries are a direct contribution-prefix
root. Other direct output contracts do not gain snapshots.

The declaration's only durable copy is the hash-valid ledger row. Duplicate
submit and late-submit replay retain a recorded declaration verbatim. An
already-present row remains an idempotent `recover-declaration` result, and a
legacy no-contribution row may be reconstructed only when the existing durable
facts reproduce its exact old hash. An absent row whose recorded hash requires
`source_contribution` has no witness from which to reconstruct that object:
recovery SHALL fail closed with one missing-contract boundary, without invoking
the live direct-output evaluator or deriving contribution facts from current
`source.yaml` bytes. That deliberate no-path is smaller and more truthful than
a second contribution store or a mutable-file reconstruction rule.

**Alternative considered: distinct source path per supplement.** Rejected.
It would introduce a second aggregation/materialization model, force count and
guidance changes across phases, and still leave current source-file mutation
unexplained. The ledger already owns ordered submitted authority, so the narrow
receipt-derived boundary is smaller and preserves the existing append model.

**Alternative considered: source content snapshot or complete artifact hash.**
Rejected. It increases stored state and turns a candidate-ownership question
into a general artifact history feature. The semantic prefix digest contains the
minimum fact the evaluator needs.

### 2. Legacy compatibility is honest, not reconstructed

A single legacy submitted Wave0 row for a target remains readable through the
current evaluator, matching established behavior, only while no other submitted
row shares that target. Any same-target group that combines a row lacking a
contribution declaration with another submitted row cannot prove where append
ownership changed; timestamps, existing Seed entries, current content, or human
prose are not a legal replacement for a submission-time fact. That case returns
one `missing contribution boundary` root and masks dependent omissions. The
singleton legacy fallback is intentionally not a newly proven prefix, so the
unsubmitted-suffix check applies only to a valid declared-contribution sequence.

This is intentionally a compatibility tightening. C2 does not invent an input
that lets an Agent label an arbitrary historical ordinal split, nor does it
write a ledger repair record. If an old run needs the actual historical source
provenance, it needs independently retained evidence and a separately accepted
recovery authority. The normal forward path is correct for all new submissions.

### 3. Projection writing is a whole selected-slot transaction

The writer will extract/update/render projection entry blocks without trimming
away their trailing structural separator. It will use one slot-entry parser for
both the staged postcondition and the passive readiness reader. The postcondition
is deliberately scoped to the selected slot family, not every future Wave slot:
a Wave0 packet must not be blocked by an untouched Wave2 token, but it must
prove every preserved and new entry boundary in `wave0_evidence` remains
independently parseable.

Before workspace publication, the staged bytes must have one writable target,
one preserved card, exact token consumption, exactly one instance of each
selected entry ID, and independently parsed neighboring blocks. Failure is a
single pre-publication writer root. The same parser then supports Wave inspect
and Gate; no packet-specific “looks committed” test remains.

The shared entry parser and concrete-navigation classifier belong in one
dependency-neutral pure projection-entry contract helper. It accepts parsed
entry bytes plus explicit reference-root facts and returns only structural /
navigation classification; it neither reads a bundle nor writes a seed. This
is necessary because the current return-map evaluator already depends on
canonical topic-state slot location. Keeping the pure entry contract below both
callers avoids a return-map -> canonical-topic-state -> return-map cycle while
leaving topic-state the writer and return-map the readiness-composition owner.

**Alternative considered: commit then tell the Agent to inspect and repair.**
Rejected. A deterministic serializer defect must fail at its own writer
boundary. Asking the Agent to clean committed corrupt bytes turns a direct
Engine defect into a probabilistic recovery chore.

### 4. Reference navigation is admitted once, then read consistently

For a new evidence-bearing Projection Packet entry, packet admission is the
right owner of concrete-reference existence because it controls whether the
entry can become canonical navigation. A source/reference must already be
materialized, or the entry must use the accepted deferred form. The shared
navigation evaluator returns the exact absent path and bounded basename near
matches from `reference/`; it points to existing reference materialization or
selection work and the same apply command.

Passive Wave readiness calls the same evaluator to read existing entries. It
does not become a second differently timed rule, and no forward-reference
success path exists. This preserves the writer-success -> reader-success
postcondition without making a reference file evidence authority.

### 5. Seed body ownership is visible instead of inferred from a substring

New canonical seeds contain an explicit `seed-initialization` start/end boundary
above the research appendix. The body inside it is Agent-owned content; the
appendix, cards, tokens, headings, and later projection entries remain
Engine-owned document structure. The template/renderer parity check includes
the new boundary descriptors. Current-marker seeds are checked for duplicate
renderer-owned headings or pending markers below the end boundary; legacy seeds
remain read-compatible and their body bytes are not silently rewritten.

This uses Markdown for the Agent's real content work and Engine checks only for
the template ownership facts it can know. `enrich_seed` continues to own strict
frontmatter enrichment and does not become a general body patch API.

### 6. Style freshness is a short feedback loop, not a cross-owner transaction

The legal lifecycle is:

```text
user selects research profile
  -> topic-state commits canonical registry and seeds
  -> existing apply-research-style writes profile projection
  -> HITL1/rerun readiness checks exact current projection
```

After a committed registry-length change, topic-state returns a structured
`style_projection` handoff: current profile, committed count, exact existing CLI
command, and same checkpoint. It never writes `rb_profile.yaml`. The relevant
HITL1-recorded or rerun-ready check uses existing `computeResearchStyleParams()`
through one side-effect-free style-projection freshness evaluator to compare
profile values to direct committed registry facts. It runs only after its
existing profile/topic-state prerequisites; an earlier root masks style
freshness. A mismatch is one root, one existing writer, one rerun. This is
deliberate feedback for a probabilistic Agent step: we make the correction
obvious and deterministic rather than add an automatic cross-file mutation or
expect a prose reminder to be noticed.

### 7. Net control simplification and responsibility

C2 removes five divergent paths: live historical source reassignment,
packet-only postconditions, template double-edit ambiguity, string-only style
follow-up, and separate writer/reader reference decisions. It adds no lifecycle
state, controller, retry, or recovery path. The normal loop is direct fact ->
shared evaluator -> smallest root -> existing writer -> same check.

The Agent performs ordinary source/reference/body work and reruns commands. The
Engine captures deterministic receipt facts, validates bytes and structures,
and returns feedback. A user decides research semantics or external risk only;
neither a user instruction nor `human-directed` status permits source
contribution reconstruction or manual ledger edits.

## Risks / Trade-offs

- **Legacy multi-submit targets will become explicit blockers.** This is
  truthful but may expose historical bundles that formerly produced misleading
  coverage. Mitigation: one root with no downstream omission cascade, no false
  migration claim, and a real-bundle negative replay.
- **Ledger loss can make a current Wave0 declaration unrecoverable.** The
  contribution fact intentionally exists only in the missing row. Mitigation:
  retain present-row idempotency and provable no-contribution legacy recovery,
  but return one explicit missing-contract/no-legal-recovery result for a row
  whose hash requires the lost contribution instead of deriving it from mutable
  output bytes or duplicating a second authority surface.
- **Semantic digest normalization could be underspecified.** Mitigation: make
  canonicalization a tested pure helper over parsed JSON-compatible values with
  sorted mapping keys and ordered arrays; never digest YAML presentation bytes.
- **A broad postcondition could block unrelated future work.** Mitigation:
  restrict it to selected slot families and preserve legacy read behavior in
  unselected slots.
- **Near-match advice might look like filename guessing.** Mitigation: surface
  candidates as diagnostic hints only; a legal existing reference/materializer
  remains required before packet commit.
- **Style freshness may add one Gate failure.** Mitigation: it replaces a
  late Wave0 floor surprise with a direct HITL1/rerun root and reuses the sole
  style writer.

## Migration Plan

1. Add pure semantic-array digest/contribution helpers and tests before
   changing submit or projection composition.
2. Extend only current first-submit ledger rows for Wave0 with
   `source_contribution`; preserve recorded declarations on duplicate/late
   replay and existing-row recovery. Retain only exact hash-proven legacy
   no-contribution reconstruction; fail closed when an absent row requires the
   lost contribution declaration.
3. Replace Wave0 current-candidate derivation with grouped contribution
   intervals and direct-root masking; keep narrow singleton legacy read
   compatibility.
4. Refactor projection entry parsing/rendering, navigation evaluation, and
   selected-slot postcondition before changing packet commit behavior.
5. Render the new Seed initialization boundary and update current-marker gate
   checks, without bulk-rewriting legacy body bytes.
6. Replace string-only style feedback with the structured handoff; add the
   exact freshness check and reorder HITL1 guidance.
7. Update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` for `v0.62` during apply.

Rollback is code/guidance rollback for newly written current-version behavior.
No C2 migration mutates old source files, submitted results, existing ledger
rows, queue records, receipts, or historical Seed projections.

## Context

Wave1 currently has all of the raw facts required to close a Topic, but they
are interpreted in separate places. `evaluateWave1Contract()` expands the old
`reference/*{topic}*.md` rule and calls a generic numeric counter;
`checkReferenceIndexCoverage()` can correctly short-circuit an invalid index
parent but has no index writer; `classifyReferenceAuthority()` can distinguish
backed Phase projections from filesystem-only files; and
`phase-wave1.md` describes reference/index closeout without giving the Agent a
single deterministic answer about whether to materialize or research next.

This design addresses the three active incident classes together:

```text
submitted Wave1 source/cache backing
  + current canonical Topic identity
  + committed consumer references
  + reference/_INDEX.md
  + profile reference floor
        |
        v
one pure Wave1 reference-convergence result
        |
        +-- canonical materialization / seed-ref repair
        +-- index synchronization
        `-- one bounded existing supplementary demand
```

The Source of Record remains unchanged. Submitted work-unit rows, their
verified cache/degraded facts, and canonical Topic registry own evidence and
identity. Reference Markdown and `_INDEX.md` are reader-facing projections.
The queue owns a durable demand only after the Phase Agent submits it through
the existing queue operation. No projection, diagnostic, or task prompt gains
evidence, lifecycle, or queue authority.

## Goals / Non-Goals

**Goals:**

- Give the Wave1 Phase Agent and both deterministic wrappers one precise,
  root-first answer for each current Topic: projection repair, index repair,
  existing supplementary work, true supplementary demand, or satisfied.
- Make the canonical full current `topic.slug` path and source qualifier a
  single reusable locator used by materialization guidance, selection, numeric
  counting, index rows, and Seed Topic reference repair.
- Make `NN-wave1-*` and any other noncanonical layout explicit diagnostic
  history. It may remain readable and indexed, but cannot satisfy current
  Topic coverage.
- Turn a true rich-reference shortfall into an exact bounded objective on the
  existing `wave1_topic_deepening` supplementary demand, after all legal
  projection/index repair is exhausted.
- Synchronize the complete eight-column index through the existing
  compare-and-swap persistence primitive with one mechanical outcome.
- Preserve the existing Wave1 source/cache backing contract, queue/work-unit
  transaction, gate routing, degradation policy, and Seed Topic packet writer.

**Non-Goals:**

- No automatic research, queue enqueue, retry, watcher, background index
  process, generic reference controller, or new queue kind.
- No migration that renames old files in place, rewrites submitted result/
  declaration/receipt/cache bytes, or fabricates backing from a filename,
  index row, source layer, or filesystem scan.
- No new source catalog, direct parser for agent prose, index-as-evidence
  authority, duplicate reference counter, lifecycle status, or user-operated
  repair workflow.
- No change to Wave0/Wave2 evidence acceptance or to the accepted
  degradation eligibility of the true Wave1 reference floor.

## Decisions

### 1. Introduce a narrow pure convergence evaluator, not a controller

Add a focused Engine helper, tentatively
`engine/helpers/wave1-reference-convergence.mjs`. Its public result is a
derived fact, not persisted state. It receives a selected bundle, canonical
Topic registry fact, and relevant gate/profile facts and returns global roots,
per-Topic facts, exact repair coordinates, and findings that retain their
existing rule identities.

The evaluator's direct inputs are limited to:

| Fact | Existing authority / reader |
| --- | --- |
| Current Topic UID and full slug | canonical Topic registry / topic-layout resolver |
| Required floor | `rb_profile.yaml` explicit Wave1 parameter |
| Submitted Wave1 source/cache backing | one extracted pure reader over hash-valid submitted declarations, the bound work-unit manifest queue snapshot, accepted source/cache/degraded facts, and the existing backing classifier |
| Committed references and metadata | existing reference metadata parser plus backed-reference classification |
| Index shape and row coverage | existing index parser/validator |
| Existing supplementary demand | `rb_queue.json` through the queue reader |

The change SHALL extract, rather than duplicate, one pure
`resolveReviewedWave1SubmittedBacking`-style reader from the existing submitted
backing/depth-review seams. For one current Topic it shall accept only a
hash-valid submitted `wave1_topic_deepening` row whose manifest-embedded,
hash-bound queue-item snapshot resolves to that Topic's canonical UID and
current slug. Its candidate sources are the existing accepted submitted
source-claim/accepted-URL/cache/degraded facts for those bound rows, normalized
by the same URL normalizer used by reference backing comparison. It shall
deduplicate candidates by normalized URL, retain the submitted row and backing
coordinates needed to materialize a reference, and return them in stable
normalized-URL/work-ID order. It SHALL NOT discover a candidate from a
filename, an index row, a reference body, raw filesystem scan, an Agent
assertion, or an unbound submitted row. Invalid ledger, manifest, snapshot,
Topic binding, claim/cache/degraded mapping, or URL facts are direct parent
roots; they are not evidence that materializable backing is exhausted.

The evaluator SHALL first expose a registry/profile/submitted-backing/queue
parent root and mask dependent Topic reference findings. Independent accepted
depth/new-source roots remain owned by their existing checker and are neither
silently cleared nor relabeled as reference-floor roots. For a usable Topic it
evaluates in this order:

1. For every deterministic submitted-backing candidate without a closed
   canonical consumer projection, or with only a legacy/misnamed equivalent,
   return one `materialize_projection` action containing the stable bounded
   list of exact canonical target/backing coordinates. A present canonical path
   is closed only when its metadata source URL normalizes to that candidate's
   URL and its body cites that candidate's submitted source/cache/work-unit
   coordinates, as well as passing the existing reference format and numeric
   eligibility checks. A path whose candidate-exact binding, required reference
   format, parseable source URL, or numeric eligibility fails returns that
   direct projection root before index or floor evaluation. The Agent persists
   the indicated consumer projection(s),
   synchronizes the index, updates affected Seed Topic refs through the
   existing packet writer, then reruns Wave1 inspect.
2. When every candidate projection is closed but the index parent/rows are
   stale, return one `sync_reference_index` coordinate. An invalid table
   remains one parent finding, never one missing-row finding per reference.
3. Only when every current candidate projection is closed and index repair is
   not required may countable canonical backed references be compared with the
   explicit floor. If they are below it, return a true deficit:
   `required - observed`. If a live supplementary Wave1 demand already binds
   that Topic, return that existing work as the next action instead of making a
   duplicate demand. Otherwise return the exact task-card facts needed for one
   ordinary supplementary enqueue.
4. Otherwise return satisfied for that Topic.

"Materializable backing exhausted" therefore means the resolved candidate set
is empty or every member has a closed canonical projection; it never means
that a glob matched no file, that an index row is absent, or that an unbound
filesystem reference happened to be unreadable. A live supplementary demand is
recognized only when the schema-valid queue item is active/refill/in-flight,
has `kind: wave1_topic_deepening`, `producer_rule: topic_deepening`,
`assignment_mode: supplementary`, and its queue snapshot resolves to the same
current Topic UID/slug. Terminal history, an invalid queue, an old layout, or a
different producer does not suppress a new demand; invalid queue authority is a
parent root rather than permission to enqueue around it.

This preserves BUG-131: a true count-floor finding retains
`per_topic_ref_md_count_floor` and its accepted degradation eligibility.
Projection, index, backing, or parent failures retain their non-floor rule IDs
and cannot be disguised as degradable quality failure.

**Alternative considered: patch the gate's glob failure with queue advice.**
Rejected because it cannot distinguish materializable submitted backing from
new research, repeats the count interpretation outside inspect, and leaves the
legacy/index defects unresolved.

**Alternative considered: a stateful Wave1 repair controller.** Rejected
because queue state and work-unit lifecycle already own durable demand and
attempt facts. The evaluator needs only to classify direct facts and point to
the existing legal action.

### 2. Canonical reference identity comes from one locator

The helper SHALL export a canonical Wave1 reference locator/renderer based on:

```text
reference/{current topic.slug}-{source qualifier}.md
```

The topic component is the current registry slug, never an Agent-truncated
ordinal or a previous layout. The qualifier is derived from one normalized
submitted backing URL and a safe human-readable URL token plus a stable short
digest. It must be collision-resistant and repeatable without an Agent-chosen
filename. The implementation SHALL extract and reuse the existing backing URL
normalizer rather than create a second one, so fragment-only differences cannot
produce inconsistent locator and authority decisions. The digest length/token
grammar is an implementation constant that focused collision tests must cover;
it is not a user-selected path policy.

The locator returns either one safe exact path or a direct unresolved-backing
root. It has three explicit path classes:

- `canonical_current`: exact current locator path for an authenticated backing
  source; eligible for current Wave1 count only after existing authority and
  numeric eligibility checks pass.
- `legacy`: known historical `NN-wave1-*` style; readable/indexable history but
  never current count coverage.
- `misnamed_current`: a reference whose metadata resolves to the current Topic
  but whose path is not the current canonical locator; it is a projection
  repair input and cannot silently count.

`countReferences()` remains the one narrow numeric-eligibility implementation.
It will gain an exact selected-path mode used by convergence rather than a
second count function. The Wave1 adapter stops treating the old broad glob as
a parallel current-layout success path. Existing low-level format, URL,
backing, and index validators are reused as components; candidate closure adds
only the necessary exact comparison against the reader's already returned
candidate coordinate. The new helper does not copy their metadata parser or
evidence authority rules.

**Alternative considered: accept any reference whose filename contains the
full slug.** Rejected because it retains the current ambiguous glob semantics,
allows accidental collisions, and gives a future caller no one place to
generate the corresponding target.

**Alternative considered: rename/move legacy files.** Rejected because their
paths can be referenced by submitted declarations, Seed Topics, index rows,
and historical evidence. A new canonical consumer projection from the same
backing is recoverable; a blind move is not.

### 3. Index synchronization is one narrow mechanical operation

Add a focused `sync-reference-index` CLI/helper. It enumerates current
committed flat reference files (excluding `_INDEX.md` and `README.md`), parses
the existing metadata contract, classifies each file into the existing
`wave0_foundation`, `wave1_topic`, or `wave2_cross` navigation layer, and
renders the complete eight-column inventory with one row per file. Legacy
Wave1 files remain rows with `wave1_topic`; that navigation label never makes
them current countable coverage.

Layer classification SHALL not read the existing index row being repaired:
`00-shared-*` is Wave0, `00-cross-*` is Wave2, and every other file is Wave1
only if parsed reference metadata resolves through the existing Topic-layout
resolver to exactly one current or accepted historical Topic, never `all`.
Missing/unknown/ambiguous/conflicting Topic metadata on that third class is a
direct `reference_index_layer_unclassifiable` block. The renderer may use a
parseable current index only to retain a same-file valid `date_landed`, not to
assign a source layer. It may list an unbacked or excluded reference as
navigation according to its metadata/path class, but never treats that row as
evidence authority or current-floor coverage.

For an existing row, the renderer retains its established `date_landed`; a
newly indexed row receives the sync date. The header carries bundle name,
update date, and actual file count. An unreadable metadata/path prerequisite
returns `blocked` rather than fabricating a row. This lets the table preserve
all reference families without treating a Wave1 sync as permission to discard
Wave0/Wave2 navigation.

The operation renders deterministic UTF-8 bytes in stable `ref_file` order.
It first safely reads the current target and compares the complete rendered
bytes. Equal bytes return `unchanged` before staging or invoking persistence.
When bytes differ, it stages those exact bytes and calls
`persistBundleFile()` for `reference/_INDEX.md` with the observed target
digest as its compare-and-swap precondition. The persistence primitive itself
has only `committed|blocked`; the synchronizer maps its pre-compare to
`unchanged` and never relabels a successful persistence commit. Its only
result vocabulary is:

```text
committed  rendered bytes replaced the expected target
unchanged  rendered bytes already equal the target
blocked    direct parser/path/CAS prerequisite prevented mutation
```

It does not call materializers, alter reference files, write a ledger, append a
gate attempt, or infer source acceptance. A CAS race remains an explicit
`blocked` same-command rerun, not a merge or overwrite policy.

**Alternative considered: append an index row beside every materializer.**
Rejected because it duplicates row rendering across waves, cannot repair an
empty historical template reliably, and makes rerun/idempotency behavior
dependent on prose callers.

### 4. Use the existing supplementary queue/work-unit path with bounded context

When the convergence result reaches a true source deficit, the Phase Agent
forms one ordinary `topic_deepening` task card with:

```text
kind: wave1_topic_deepening
producer_rule: topic_deepening
payload.assignment_mode: supplementary
payload.reference_floor_deficit: positive integer
```

`reference_floor_deficit` is optional for older/general supplementary demands,
but when present it is valid only on a supplementary Wave1 card and is bound by
the queue snapshot. The existing snapshot hash covers this durable payload
field; it is intentionally not a resolver input, but a changed value makes the
manifest/record snapshot stale. It is not a direct-contract selector, not a
required result field, and not an Engine pass assertion. The generated
work-unit task renders it as a read-only acquisition objective so the delegated
actor sees the exact target. Submit and the next convergence evaluation
continue to own what actually counts; a task that discovers fewer usable
sources simply returns to the same loop.

After enqueue, the Phase Agent records the existing `depth-review.yaml`
supplementary decision and queue ID through its accepted Phase-owned process
surface. It does not hand-edit queue JSON. After submit, canonical projection
and index closeout run before the next evaluation. This keeps the current
depth-review supplementary loop and the new reference-floor loop convergent
without making depth review a second source-count authority.

**Alternative considered: put the deficit only in an Agent prose instruction.**
Rejected because the fact would disappear at the queue -> work-unit handoff and
would be impossible to distinguish from a generic supplementary task after
reload.

**Alternative considered: add a `wave1_reference_refill` queue kind.**
Rejected because the existing Wave1 supplementary work-unit contract already
owns new source/cache acquisition and formal submit.

### 5. Integrate once at the Wave1 decision boundary

`evaluateWave1Contract()` becomes the one adapter that invokes convergence
once and projects its findings into both existing wrappers. The formal gate
retains only its accepted durable gate-attempt/trace behavior; inspect remains
side-effect-free. The old Wave1 generic `count_floor`, index, and backing
branches no longer independently reinterpret the same references. Their stable
rule IDs continue to appear in convergence findings so diagnostics, tracing,
and degradation policy retain their existing contracts.

The Phase guidance follows the resulting one-action protocol, not an Engine
controller: materialize a reference from submitted backing using the template
and persistence -> run index sync -> update Seed Topic through the packet
writer when a concrete ref changed -> rerun inspect; or form/enqueue the
returned supplementary card -> claim/submit through the normal work-unit loop
-> rerun inspect. User interaction is not a normal branch in either path.

## Risks / Trade-offs

- **A legacy file cannot be bound to submitted backing** -> It remains a
  non-countable diagnostic; the evaluator reports its direct backing/projection
  root and never creates a copied source or index-derived authority.
- **An invalid historical index lacks usable old dates** -> The full renderer
  regenerates rows from current committed files and uses the sync date only for
  rows without a valid existing date. Date display remains navigation metadata,
  not evidence provenance.
- **A concurrent index update changes target bytes** -> CAS returns `blocked`;
  the retained staging source and same sync command provide the one recovery
  path. There is no automatic overwrite.
- **A new supplementary demand races with existing work** -> The evaluator
  reads queue authority and returns existing Topic-bound supplementary work
  rather than emitting a duplicate. Its target is recomputed only after normal
  work completion.
- **The shared helper becomes too broad** -> Its API is restricted to Wave1
  current Topic reference convergence; Wave0 shared references and Wave2
  cross references only use the index renderer/path classifier where their
  already accepted contracts require it.
- **Focused fixtures accidentally fake authority** -> Integration fixtures use
  real production work-unit submit, persistence, inspect, gate, and queue
  admission; they never hand-write a submitted ledger, receipt, or gate
  attempt.

## Migration Plan

1. Apply the pure locator/evaluator and low-level selected-path count/index
   integration before changing the Phase instructions. Maintain existing
   accepted metadata/backing validators and stable rule IDs.
2. Add the index synchronizer and its CAS/unchanged/blocked proof. It is
   idempotent and does not mutate references or control state.
3. Update Wave1 closeout/template/queue-task projection. New projection files
   use the full current slug; old layouts remain readable but non-countable.
4. On a live legacy bundle, the Agent uses normal post-submit/repair flow to
   materialize a new canonical projection from the same backing, sync the
   index, and refresh affected Seed Topic packet refs. It never bulk-renames
   history. The next inspect exposes any remaining true deficit.
5. Release v0.55. Rollback is framework-code rollback; no automatic bundle
   migration is performed. A partially completed closeout remains visible as a
   reference/index/Seed Topic convergence root and is repaired by rerunning the
   same legal command sequence.

## Open Questions

None block apply. The implementation must document the exact digest length and
safe URL-token normalization in the locator helper and prove collision behavior
with focused tests; that is an implementation constant within the contract
above, not a new user decision or runtime authority.

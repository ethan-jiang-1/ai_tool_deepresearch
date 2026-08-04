## Context

See `proposal.md` for the two incidents and intended behavior. The current Wave0
assignment resolver creates one required `source_yaml` output, while Wave0
guidance still asks the delegated actor to produce a shared rich reference. The
reference authority classifier accepts submitted references and existing
Wave1/Wave2 Phase-owned projections, but cannot authenticate a new Wave0
Phase-owned reference. The generic Wave0 floor path consequently sees a
filesystem reference as a delegated bypass and repeatedly asks for an actor
output that the current completion contract does not own.

Topic-state already has an atomic `wave_projection` writer and exact
contribution-aware Wave0 identities. Its explicit-entry packet shape makes a
single semantic deferred decision require repeated authoring for every source
ordinal. The design must preserve those exact identities rather than replace
them with a work-ID aggregate.

### C1 Ubiquitous Language

`submitted_work` already exists as the `source_identity.kind` wire
discriminator. C1 does not turn that discriminator into a new field or durable
runtime object: it can otherwise be read as a submitted ledger row, an attempt,
or all sources produced by an attempt. It remains serialized compatibility for
"this entry originates from this work unit" and must be paired with `work_id`
and an exact entry identity. C1 uses the following terms in code, specs,
guidance, tests, and the later `CONTEXT.md` glossary update.

| Canonical term | Meaning | Do not use it for |
| --- | --- | --- |
| Work unit / attempt | One Engine-allocated delegated execution attempt, identified by `work_id`. They are the same C1 identity boundary. | A queue demand, source collection, reference, or projection. |
| `submitted_work` wire discriminator | Existing `source_identity.kind` value saying an entry originates from a submitted work unit, always paired with `work_id`. A persisted Wave0 entry additionally needs `entry_id: <work_id>/<ordinal>` for its exact source coordinate. | An aggregate coverage claim, a new runtime object, a complete source identity by itself, or a synonym for a submitted contribution. |
| Submitted ledger row | The Engine-written record created by successful submit. | A filesystem artifact or generic success claim. |
| Submitted Wave0 contribution | One current accepted ledger/result binding plus its declared schema-valid `source.yaml` and verified cache facts. | A bare work ID or every historical byte in a mutable source file. |
| Source identity | One contribution-owned `<work_id>/<ordinal>` coordinate. | A bare work ID, URL, title, or path. |
| Reference | A reader-facing evidence presentation. It can be a compatible legacy delegated output or a backed Phase-owned projection. | Evidence authority merely because it exists or is indexed. |
| Consumer projection | Derived reference/navigation output from submitted backing. | A replacement for submit, ledger, source, cache, or provenance authority. |
| Seed projection | The existing topic-state rendering into a seed document. It is distinct from a consumer reference projection. | A generic synonym for all runtime state. |
| Deferred disposition | Persisted explanation and next hop bound to one source identity. | Aggregate acknowledgement, missing coverage, or a Gate status. |

The qualifying nouns matter: use `consumer projection` and `seed projection`
where the two meanings can meet, and use `submitted Wave0 contribution` rather
than the overloaded conceptual shorthand `submitted_work`; retain the existing
wire discriminator only where serialization requires it.

The packet representation follows that vocabulary. An explicit Wave0 entry is
identity-bound only as the pair `source_identity.work_id` plus
`entry_id: <work_id>/<ordinal>`. In contrast, a deferred-contribution input's
`source_identity` contains a submitted work ID solely to select one current
contribution for expansion; it is never rendered or counted as a source identity
until the writer derives individual entries.

## Goals / Non-Goals

**Goals:**

- Make current Wave0 source intake, formal submit, reference materialization,
  seed projection, inspect, Gate, and feedback use one coherent vocabulary and
  submitted-backing fact family.
- Preserve valid historical delegated references while making new Wave0 shared
  references Phase-owned consumer projections after formal submit.
- Give inspect and Gate one pure Wave0 convergence result so a materializable
  contribution is not misreported as a true reference-floor deficit.
- Compress repeated deferred authoring into one contribution-scoped input while
  preserving individual source-identity persistence and atomicity.
- Leave a small, reviewable contract-coherence matrix and focused regressions
  that catch the next cross-surface terminology/authority drift.

**Non-Goals:**

- No new ledger, source catalog, runtime status, Gate, retry controller,
  watcher, generic registry, metadata field, or index column.
- No retroactive rewrite of immutable legacy work-unit/ledger/reference data.
- No Engine selection of research relevance, source quality, source to explain,
  or deferred semantic meaning.
- No change to Wave1 or Wave2 convergence semantics beyond shared helper reuse
  where it is already a direct dependency.

## Decisions

### 1. Treat formal submit as the sole Wave0 authority handoff

New `wave0_source_intake` assignment/task rendering will describe only the
source YAML and existing cache/result/receipt obligations. A formally submitted
row plus authenticated source/cache facts becomes a submitted Wave0
contribution. Only that contribution unlocks a reader-side reference
materialization candidate.

The assignment contract will advance from `work-unit.assignment.v1` to
`work-unit.assignment.v2`. New claims write v2 and the v2 Wave0 resolver
narrows `output_files` to the source YAML role. Readers and validators retain a
bounded v1 branch that reconstructs the historical broad Wave0 output contract
from the recorded v1 marker. That version, not current framework behavior,
selects the interpretation of immutable manifest/beacon/result/ledger facts.
Markerless historical envelopes retain their existing legacy compatibility
branch; they are neither upgraded to v1 nor inferred to be v2 from a path,
filename, or current default. No data migration or compatibility guess from
path shape is permitted.

This removes a current double path: actor-authored rich references that are not
in the current required-output contract, and Phase-authored files that cannot
yet count. It preserves historical rows because their immutable bound contract
is the authority for interpreting their recorded outputs.

Alternative considered: add `reference` back to the current Wave0 assignment
contract. Rejected because it would revive a second completion route, conflate
search/fetch with reader presentation, and require current actors to satisfy a
floor the Engine can derive from already submitted evidence.

### 2. Add one bounded submitted-backing reader at the existing work-unit projection seam

The implementation will extend the existing authenticated Wave0 contribution
reader in `engine/work-unit-projection.mjs`, or add one narrow adjacent module
if extraction is needed. It will authenticate the submitted ledger/result,
required `source_yaml` tuple, current contribution interval, and verified cache
facts before exposing bounded facts for one exact source identity:

- `work_id` and `<work_id>/<ordinal>`;
- accepted source URL and source-YAML reference;
- work-unit, result, and cache references needed for a scannable reference
  body; and
- direct blocking roots when no safe backing exists.

No other consumer parses `source.yaml` to recreate this binding. The existing
neutral direct-output evaluator remains the owner of source-YAML parse/schema
truth; the new reader consumes its bounded result and only exposes the minimum
source fact needed by reference materialization/provenance. It returns no raw
array or reusable source catalog.

Alternative considered: have the classifier, materializer, topic-state writer,
and Gate each parse source YAML and match URLs independently. Rejected because
it would create four slightly different meanings of `submitted source` and
would repeat BUG-189 in a new form.

### 3. Classify Wave0 references through exact authority, then count them

`classifyReferenceAuthority()` will gain a Wave0 branch that first recognizes a
valid historical submitted delegated reference under its recorded output
contract, then recognizes a Phase-owned shared reference only through the new
exact submitted-backing reader. For a Phase-owned reference, the normal
metadata `source_url` is paired with the exact `<work_id>/<ordinal>` coordinate
and returned source/cache/work-unit refs in the existing scannable body; URL
equality alone cannot select a source. It will keep its fail-closed behavior for
filesystem-only, URL-only, index-only, unsubmitted, and ambiguous inputs.

`countReferences()` stays the narrow numeric eligibility owner. It will count a
classifier-approved Phase-owned Wave0 consumer projection once; it does not
become a provenance reader or a source selector. The reference file and index
are navigation/output surfaces, never authority.

Alternative considered: treat every `00-shared-*` file as a special implicit
projection. Rejected because path shape cannot distinguish valid backing from a
hand-written or stale file.

### 4. Add a pure Wave0 convergence evaluator before the floor projection

Model a small `wave0-reference-convergence` helper on the existing Wave1
convergence seam. It combines direct existing readers for submitted backing,
legacy/projection coverage, reference/index navigation, and profile floor. Its
ordered outcomes are: accepted coverage; materializable candidate; direct
backing failure; missing acquisition coverage; and true remaining floor
deficit. It does not write files or decide semantic source selection.

`evaluateWave0Contract()`, `inspect-wave0-output`, and the formal Wave0 Gate
will consume the same result. A materialization outcome defers only its later
same-branch index/floor result. Independent queue, receipt, provenance, cache,
format, or malformed-reference roots remain visible. The formal Gate preserves
its read-only rule evaluation and uses the convergence output only to describe
the next legal Agent action.

Alternative considered: add a special-case repair hint after generic
`countReferences()`. Rejected because inspect and Gate could still disagree on
whether there is a deficit, and the generic count has no authority to decide
candidate materializability.

### 5. Expand contribution-scoped deferred intent inside the existing atomic writer

`ProjectionPacketSchema` will admit one Wave0-only deferred-contribution branch
alongside existing explicit entries. Its sole `wave0_evidence` update uses
`deferred_contribution: { source_identity: { kind: "submitted_work", work_id },
evidence_meaning, next_hop }`; this `source_identity` is a contribution selector,
not an individual persisted identity. Relationship, status, and refs are fixed
by the writer to the existing explicit-limitation form: `defers`, `["none"]`,
and `deferred`; `next_hop` must satisfy the existing limitation rule. Before it
opens the existing workspace, the writer resolves the authenticated current
contribution and derives its unprojected exact identities. It then writes
ordinary per-identity deferred entries through the existing token, parser,
postcondition, idempotency, and recovery machinery.

The writer rejects collisions or a work unit that is not current submitted
authority. It never accepts a caller-selected ordinal list, so `work-a/1..19`
cannot accidentally defer a later `work-b/20`. Existing explicit entries keep
their present schema and behavior.

Alternative considered: persist a work-ID-level deferred marker and expand it
at read time. Rejected because it would make return-map completeness dependent
on an aggregate projection and hide the source-level authority that Gate and
feedback need.

### 6. Make coherence a maintained review surface, not a runtime registry

Apply will include a compact contract-coherence matrix in this change's
verification evidence and a static regression guard. The matrix is a review
aid, not persisted runtime state:

| Surface | Canonical fact it consumes or produces | Forbidden drift | Verification-plan claim |
| --- | --- | --- | --- |
| Assignment resolver / generated task | Work unit assigns source/cache output only. | Calling a reference a required Wave0 actor output. | `current-wave0-claim-is-source-only` |
| Submit / provenance | Submitted ledger row creates a submitted Wave0 contribution. | Treating a file or bare work ID as submitted authority. | `markerless-legacy-wave0-attempt-remains-legacy`, `wave0-reference-authority-preserves-legacy-and-backed-projections` |
| Materialization | Exact source identity plus authenticated backing. | URL-only or filesystem-only reference construction. | `submitted-wave0-backing-has-exact-source-identity` |
| Topic-state packet | An explicit `source_identity.work_id` + `entry_id` pair, or a `submitted_work`-scoped deferred selector that expands to exact identities. | Treating the wire discriminator or a work ID as aggregate coverage. | `batch-deferred-packet-preserves-individual-identity` |
| Topic-state result | Individual source identities and dispositions. | Letting batch authoring weaken identity coverage. | `batch-deferred-packet-preserves-individual-identity` |
| Inspect / Gate | Same pure convergence outcome. | Declaring a floor deficit before materializable backing. | `wave0-convergence-precedes-shared-reference-floor` |
| Feedback / Phase guidance | One nearest legal action and same rerun. | Sending the actor down a removed rich-reference route. | `wave0-guidance-uses-submitted-backing-closeout` |

The final `CONTEXT.md` update will copy only the durable glossary terms, not
this implementation matrix or behavior rules.

### 7. Responsibility and control boundary

Semantic precision is served by the submitted contribution boundary: a Phase
Agent can know which source identities are materializable, deferred, or still
unknown without reconstructing ledger and YAML history. The shortest legal loop
is submitted source/cache facts -> convergence -> materialize or submit a
deferred contribution intent -> existing writer/persistence -> same inspect ->
existing Gate. This replaces two competing paths and O(N) repeated authoring;
it does not add a state machine or recovery tree.

The Phase Agent chooses whether a submitted source merits a reader-facing
reference and supplies the meaning/next hop for a deferred disposition. The
Engine verifies backing, packet shape, identity expansion, atomic persistence,
and Gate facts. The user is not asked to perform ordinary materialization,
packet, or rerun mechanics; no new user decision is required by this change.

## Risks / Trade-offs

- **Historical bundles have old direct rich-reference outputs** -> Keep marked
  v1 contracts on their recorded interpretation and markerless envelopes on
  their existing legacy branch; do not migrate, rewrite, or infer either from
  path shape.
- **One URL appears in several contributions** -> Require exact source identity
  and authentication rather than URL equality.
- **A convergence helper hides a real error behind a materialization hint** ->
  Defer only its own ordered index/floor outcome and retain independent primary
  roots.
- **Batch input overwrites a manually projected source** -> Derive the current
  contribution interval before workspace creation, reject collisions, and use
  existing idempotent replay rules.
- **Terms drift again in Markdown or diagnostics** -> Add the coherence matrix
  guard and update the short glossary during apply; keep behavioral detail in
  accepted specs and executable tests.

## Migration Plan

1. Land v2 current Wave0 assignment/task contract with explicit marked-v1 and
   markerless-legacy read compatibility, bounded backing reader,
   provenance classification, convergence evaluator, packet branch, and Phase
   guidance together with focused tests.
2. Existing historical submitted work-unit records remain untouched. Their
   direct declared references continue through the legacy authority branch.
3. New Wave0 claims use only source/cache output contracts. Phase Agents repair
   shared-reference closeout via convergence-directed materialization or an
   identity-preserving deferred contribution packet.
4. Release as framework `v0.69`, sync accepted specs, update the glossary and
   progressive backlog evidence, then archive only after the required
   verification and feedback lifecycle closeout succeed.

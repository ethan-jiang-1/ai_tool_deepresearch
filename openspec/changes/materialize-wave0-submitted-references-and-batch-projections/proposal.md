## Why

`BUG-189` shows a direct Wave0 contract contradiction: the Phase asks the
`dpt-source-intake` actor for `reference/00-shared-*.md`, but the Engine-created
Completion Contract makes only `artifacts/wave0/{topic}/source.yaml` a required
direct output. A submitted source/cache contribution can therefore be real
evidence while the shared-reference floor rejects a Phase-authored reference as
an unbacked delegated bypass. `BUG-191` exposes the companion scaling failure:
the correct per-source identity rule makes the Phase Agent hand-author one
equivalent deferred projection entry per source ordinal.

The source incidents are `_backlog/bugs/BUG-189-shared-ref-count-floor-delegated-bypass.md`
and `_backlog/bugs/BUG-191-wave0-projection-ordinal-scaling.md`; the current
triage and admission evidence are recorded in
`_backlog/plans/bug-187-199-systemic-remediation-plan.md`. This change resolves
the two failures through one submitted-backing path, without treating ordinary
filesystem files or an aggregate work ID as evidence authority.

## What Changes

- **BREAKING for newly claimed Wave0 attempts:** remove rich shared-reference
  authoring as a current delegated `wave0_source_intake` completion/coverage
  route. New actor contracts continue to require the exact `source.yaml` and
  cache facts; they no longer advertise a delegated rich reference as a way to
  satisfy the Wave0 shared-reference floor. Existing successfully submitted
  legacy reference outputs remain readable and retain their already accepted
  provenance. A marked v1 attempt keeps its recorded contract interpretation,
  while a markerless historical attempt stays on its existing legacy
  compatibility path; neither is inferred to be v2 from a path or filename.
  This change does not rewrite old bundles or current bound manifests.
- Extend the existing Phase-owned reference materialization model to Wave0.
  After formal submit, the Phase Agent may create a `reference/00-shared-*.md`
  consumer projection only from exact submitted Wave0 source-array and verified
  cache coordinates, persist it through the existing artifact-persistence
  boundary, synchronize `_INDEX.md`, and rerun the same Wave0 inspect.
- Replace the Wave0 floor repair advice that always requests another delegated
  rich-reference output with one pure convergence result. It distinguishes
  existing valid legacy references, materializable submitted source/cache
  candidates, truly absent acquisition coverage, invalid/ambiguous backing, and
  an actual remaining floor deficit. The gate remains read-only and does not
  choose source relevance or write a reference.
- Extend the existing `wave_projection` packet with one strict, Wave0-only
  contribution-scoped deferred-disposition form. The Agent supplies one explicit
  limitation meaning and next hop for a submitted contribution; the existing
  topic-state writer derives all currently unprojected source ordinals from
  submitted authority and atomically persists individual identity-bound
  `defers`/`deferred` entries. Existing explicit entry packets remain supported.
- Keep each persisted Seed Topic entry as exact `<work_id>/<ordinal>` coverage.
  Batch input compresses repeated authoring only; it does not create a new
  aggregate success fact, relax return-map completeness, or overwrite an
  already materialized source entry.
- Establish one C1 vocabulary and contract-coherence review across the existing
  assignment resolver, generated `task.md`, submit/provenance readers,
  materialization input, projection packet, inspect/Gate, and repair feedback.
  The review uses the same authoritative terms and facts at each surface; it is
  design/test evidence, not a new runtime registry, controller, or evidence
  authority.
- Release the framework behavior as **v0.69** during apply, including the
  normal `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` release updates.

### Semantic Precision, Control, And Responsibility

The reader-facing question is: "For this submitted Wave0 source contribution,
which individual source identities have a navigable backed reference and which
are explicitly deferred?" The new Wave0 convergence view preserves submitted
versus filesystem-only provenance, a source's exact ordinal, materializable
versus unavailable backing, legacy direct output versus new Phase-owned
projection, and deferred versus absent coverage. A Phase Agent or maintainer can
stop at the submitted contribution plus convergence result; no one must infer
authority from `reference/` filenames, an index row, or prior chat.

The shortest legal loop is:

```text
submitted source.yaml + verified cache
  -> one Wave0 convergence result
  -> Phase Agent materializes one backed reference or submits one batch-deferred intent
  -> existing persistence/topic-state writer
  -> same Wave0 inspect
  -> existing Wave0 gate
```

For this change, the terms have deliberately narrow meanings. A **work unit**
is one Engine-allocated execution attempt identified by `work_id`; it is not a
queue demand or a source collection. A **submitted Wave0 contribution** is the
current accepted ledger/result binding for that work unit together with its
declared, schema-valid `source.yaml` and verified cache facts. A **source
identity** is one current 1-based source-array coordinate
`<work_id>/<ordinal>` from that contribution, never the bare work ID. A
current Wave0 packet represents that coordinate by pairing
`source_identity.work_id` with `entry_id`; the wire object alone is only the
originating-work-unit envelope. A contribution-scoped deferred input carries
only that work ID as a selector and is not itself persisted as source coverage.
A **reference** is a reader-facing evidence presentation: it may be a compatible
legacy delegated output or a new Phase-owned consumer projection, but it never
becomes evidence authority merely by existing on disk or in `_INDEX.md`. A
**projection** is derived consumer/navigation output and does not replace the
submitted ledger/source/cache authority. A **deferred disposition** is an
identity-bound, persisted explanation and next hop for a source identity; it is
not aggregate acknowledgement or missing coverage.

The C1 design and verification will carry those definitions through one
contract-coherence matrix: the assignment contract tells a new actor exactly
which evidence it produces; the Phase sees exactly which submitted facts it may
materialize; the packet schema accepts exactly one contribution-scoped deferred
intent; the writer expands it to source identities; and inspect/Gate/feedback
read that same fact family. The matrix is a reviewable change artifact and
focused regression surface, not a generic metadata registry or a second
validator.

The existing serialized `source_identity.kind: submitted_work` value remains a
wire-level provenance discriminator. It says an entry originates from a work
unit and MUST be paired with its `work_id`; it does not mean that a bare work
ID is aggregate coverage or a new durable `submitted_work` object. For an
individual Wave0 entry, that envelope is paired with its exact `entry_id`; for
the deferred-contribution input it scopes expansion only. C1 preserves that
compatibility while using the more precise submitted-ledger-row and
submitted-Wave0-contribution terms in conceptual prose.

This replaces two conflicting new-work paths (optional delegated rich-reference
authoring and Phase-authored files that cannot count) with one submitted-backing
interpretation. It also replaces O(N) repeated deferred packet construction with
one bounded input expanded by the existing atomic writer. It adds no generic
controller, retry tree, watcher, second ledger, status, receipt, or Gate.

The Agent retains semantic responsibility for selecting an appropriate submitted
source to explain and for deciding whether a source should be deferred. The
Engine verifies submitted backing, identity, packet expansion, persistence
preconditions, and the Gate result. The user retains only new research
semantics, risk, or permission decisions; none are needed for the normal
mechanical materialize/repair/rerun loop.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delegated-work-units`: new Wave0 actor-bound contracts and generated task
  guidance shall expose source/cache production without a competing rich
  reference coverage path, while preserving immutable already-bound attempts.
- `reference-flat-format`: Wave0 shared references shall be valid Phase-owned
  consumer projections when their metadata and body bind to submitted Wave0
  source/cache/work-unit facts.
- `work-unit-provenance-gate`: provenance evaluation shall distinguish submitted
  legacy Wave0 reference outputs from newly materialized Phase-owned Wave0
  references, with neither filesystem presence nor `_INDEX.md` becoming
  authority.
- `research-wave-gate-implementation`: Wave0 inspect/gate shall consume one
  root-first submitted-backing convergence result before reporting a shared
  reference floor deficit.
- `canonical-topic-state`: the existing route-bound Wave0 projection writer
  shall atomically expand one explicit deferred contribution intent into exact
  current source identities without new persistent authority.
- `research-wave-phase-content`: Wave0 guidance shall use submitted-backing
  materialization and batch-deferred packet paths, then rerun the same inspect;
  it shall not direct the Phase Agent to hand-author evidence authority or the
  Sub-agent to satisfy the new rich-reference floor route.

## Impact

- Framework code: Wave0 assignment/task rendering, submitted-reference backing
  readers, Wave0 inspect/gate composition, topic-state packet schema/writer, and
  reference/index materialization integration.
- Framework guidance: `phase-wave0.md`, `subagent-dpt-source-intake.md`, shared
  reference/projection guidance, and the `operate-topic-state` playbook.
- Domain vocabulary: `CONTEXT.md` will distinguish the C1 source identity,
  submitted contribution, backed reference, projection, and deferred
  disposition without turning the glossary into a behavior contract.
- Verification: focused unit/integration coverage for new and legacy Wave0
  provenance classification, source/cache backing, materialization-first floor
  feedback, batch deferred expansion, partial/idempotent rerun, unsafe or
  unsubmitted input rejection, direct entry compatibility, and the
  assignment-to-Gate contract-coherence matrix. A bounded real Actor observation
  remains separately governed by the remediation plan; fixtures prove Engine
  behavior only.
- Governance/release: delta specs for the six existing capabilities, a
  change-root `verification-plan.yaml`, requirements-registry review, and v0.69
  release documentation. No dependency is added.

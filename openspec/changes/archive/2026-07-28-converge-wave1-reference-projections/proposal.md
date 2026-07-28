## Why

BUG-133, BUG-136, and BUG-137 expose one broken Wave1 closeout loop rather
than three independent presentation defects. A current Topic can have
submitted, cache-backed Wave1 sources but no canonical consumer projection;
can have projections under the historical `NN-wave1-*` layout that the current
full-slug floor does not recognize; or can have valid references while
`reference/_INDEX.md` remains an empty template. The current broad glob count
then reports a floor failure without distinguishing a mechanical projection
repair from a genuine need for new evidence. The originating records are
`_backlog/bugs/BUG-133-wave1-reference-floor-deficit-not-turned-into-repair-demand.md`,
`_backlog/bugs/BUG-136-reference-index-not-refreshed-after-wave-materialization.md`,
and `_backlog/bugs/BUG-137-reference-topic-filenames-omit-full-topic-slug.md`;
their system boundary and sequencing are recorded in
`_backlog/plans/wave-projection-and-lifecycle-convergence.md`.

The framework already has the needed direct authorities: canonical Topic
identity, submitted Wave1 source/cache claims, backed reference files, the
reference index, and the profile floor. This change makes their one legal
closeout question explicit and shared: for this Topic, must the Agent first
repair a projection/index, or is an exact amount of supplementary evidence now
required?

## What Changes

- Add one pure, non-authoritative Wave1 reference-convergence evaluator. It
  consumes current canonical Topic identity, manifest-snapshot-bound reviewed
  submitted Wave1 backing, committed reference projections, `_INDEX.md`, the
  profile floor, and queue state. Both `inspect-wave1-output` and the formal
  Wave1 gate consume its result rather than retaining a parallel broad-glob
  count interpretation. An invalid reviewed row/ledger/manifest/queue fact is
  a parent root; an unbound row, filename, index row, or filesystem scan cannot
  become backing or prove it exhausted.
- Establish one canonical Wave1 reference locator/renderer:
  `reference/{full-current-topic.slug}-{deterministic-source-qualifier}.md`.
  The qualifier is derived only from submitted source/cache/output facts and
  is collision-safe. `NN-wave1-*` is classified explicitly as legacy and
  never silently counted as current Topic coverage; an otherwise misnamed
  current projection remains a repair diagnostic, never a second success
  path.
- Make convergence root-first and ordered. Invalid topic/profile/submitted
  backing facts stop evaluation at their direct parent. The stable deduplicated
  submitted candidate set yields a bounded canonical-materialization action
  before index synchronization; a canonical path must bind its metadata URL and
  body backing coordinates to that exact submitted candidate, while
  format/backing/URL failure remains its direct projection root. Only when every
  candidate is closed and index repair is exhausted may a shortfall become a supplementary
  `wave1_topic_deepening` demand for the exact remaining reference-floor
  deficit.
- Add a narrow `reference/_INDEX.md` renderer/synchronizer that derives the
  existing eight-column inventory from committed reference metadata and
  fail-closed path classification, preserves all reference-family rows, and
  writes only that file through the existing compare-and-swap persistence
  boundary. It compares rendered bytes before persistence so its visible result
  is honestly `committed`, `unchanged`, or `blocked`; it does not author
  reference prose, alter submitted declarations/receipts/cache trails, or
  create evidence authority.
- Carry a true reference-floor deficit on the existing supplementary Wave1
  demand as a snapshot-bound, non-selector read-only objective for the
  delegated task. It gives the Sub-agent the exact acquisition target but does
  not become a new queue kind, direct-output contract selector, evidence
  counter, or pass condition. The next inspect recomputes closure from current
  direct facts.
- Update the shared reference template, Wave1 Phase closeout guidance, queue
  task projection, and gate feedback so the Agent receives one clear loop:
  materialize canonical backed reference -> synchronize index -> refresh the
  existing Seed Topic packet when its concrete ref changes -> rerun the same
  Wave1 inspect; otherwise enqueue, claim, submit, and close one bounded
  supplementary demand -> rerun that same inspect.
- This is a framework behavior change. Apply will release **v0.55** and update
  `CHANGELOG.md` plus the `DPT_FRAMEWORK/RUN.md` banner.

This change does **not** weaken BUG-129's submitted source/cache backing
rules, change BUG-131's degradation policy, make `_INDEX.md` an evidence
authority, introduce a new queue kind/controller/watcher/retry tree, mass
rewrite historical bundles, or make the Agent direct-search Wave1 evidence.

### Semantic Precision, Control, And Responsibility

The new evaluator result is a narrow reader-facing semantic layer for the
Wave1 Phase Agent, the gate/inspect consumer, and a future bundle maintainer:
it answers only whether the next legal action for one current Topic/floor is
canonical projection closeout, index closeout, or bounded supplementary
evidence work. It retains the distinctions that change that answer: current
full-slug identity versus legacy layout, manifest-bound submitted backing versus
filesystem presence, reference projection versus index row, invalid index
parent versus one row, and repairable projection deficit versus true source
deficit. Once it names the nearest class and coordinate, the reader can stop
without manually reconciling globs, filenames, source claims, cache trails, and
index rows.

The shortest correct loop is direct facts -> one pure convergence result ->
one legal Agent action -> the same inspect. The locator and evaluator replace
scattered filename/glob/count reasoning; the narrow index synchronizer replaces
hand-maintained table drift; the existing queue/work-unit path carries real
new-evidence work. No new durable lifecycle state, generic repair controller,
second index authority, or duplicate count checker is added. The Engine
classifies facts and returns the nearest legal coordinate; the Agent authors
semantic reference prose, runs authorized mechanical persistence/sync, and
forms the existing queue demand; the user decides only genuinely new research
semantics, risk, or permission. Human direction does not create a writer or
backing authority.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agentic-queue`: `AGQ-013` SHALL define the bounded, snapshot-bound
  supplementary Wave1 reference-floor-deficit objective as a non-selector
  queue payload fact, preserving the existing `primary|supplementary`
  assignment contract and queue identity rules.
- `delegated-work-units`: `DEW-004` SHALL project that already-bound
  supplementary objective into the generated task as read-only demand context;
  it SHALL not alter result/schema/receipt or delegated authority.
- `reference-flat-format`: `REF-001`, `REF-003`, `REF-005`, and `REF-008`
  SHALL use the canonical full-topic locator, classify legacy layouts without
  counting them as current, and make the eight-column inventory converge
  through the narrow persistence-backed synchronizer.
- `research-wave-gate-implementation`: `RWG-005`, `RWG-012`, `RWG-017`, and
  `RWG-018` SHALL route Wave1's canonical reference/floor/index judgment
  through one root-first convergence result shared by inspect and formal gate.
- `research-wave-phase-content`: `RWP-010`, `RWP-015`, `RWP-016`, and
  `RWP-017` SHALL teach canonical materialization, index sync, Seed Topic
  ref refresh, and materialize-before-supplementary closeout without creating
  a second controller.
- `wave1-intake`: `WAI-005` and `WAI-008` SHALL bind a true reference-floor
  shortfall to the existing supplementary work-unit loop only after available
  submitted backing and index repair have been exhausted.

## Impact

- Framework code: a focused reference locator/convergence helper and extracted
  shared submitted-backing/URL-normalization seam; the Wave1 evaluator and
  count path; reference authority/index rendering helpers; a narrow index-sync
  CLI over existing artifact persistence; existing queue task-envelope
  projection; and Wave1 gate definition wiring. Likely primary surfaces are
  `engine/helpers/ref-count.mjs`,
  `engine/helpers/wave-contract-evaluators.mjs`,
  `engine/helpers/gate-helpers-checks.mjs`,
  `engine/helpers/artifact-persistence.mjs`, `cli/inspect-wave1-output.mjs`,
  `cli/gates/check-gate-wave1-complete.mjs`, and the existing queue/work-unit
  envelope seams.
- Framework guidance: `shared-reference-template.md`, `phase-wave1.md`,
  reference-index template/README wording, and any task guidance that still
  teaches the obsolete `0N-<slug>`/`NN-wave1-*` layout.
- Verification: focused unit tests cover locator/collision/legacy
  classification, manifest-bound backing selection, convergence precedence,
  task-context projection, and index rendering/CAS outcomes. Temporary-bundle
  integration tests exercise real submit, persistence, sync, Wave1 inspect,
  gate, and queue admission for full-slug counting, legacy non-counting, one
  invalid-index parent root, and the controlled floor-8 `6/5/5/6` cases.
  `deterministic_e2e` and
  `agent_flow_e2e` are not applicable because this is a bounded deterministic
  closeout contract, not a full workflow or Agent-judgment claim.
- Governance/release: existing requirement IDs are refined rather than adding
  a new capability or registry entry. The change supplies a verification plan;
  apply and archive run routing, requirement, spec, strict OpenSpec, and
  release/version checks. No dependency is added.

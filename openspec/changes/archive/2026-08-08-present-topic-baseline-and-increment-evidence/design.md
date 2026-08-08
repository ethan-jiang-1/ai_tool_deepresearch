## Context

See `proposal.md` for the reader problem. The existing `reference/README.md`
template is static human navigation. The current `sync-reference-index` helper
renders only `reference/_INDEX.md` and calls `persistBundleFile()` once against
that target's CAS precondition. `REF-003` therefore gives no existing
cross-file transaction, README writer, or partial-write recovery protocol.

The direct facts available to P3 are intentionally uneven. Parsed reference
metadata plus canonical Topic layout can classify a flat reference relationship;
the P2 `focus_coverage` contract can establish a Topic-level current-round
declaration against submitted work-unit refs. It cannot establish that each
individual reader reference was created for that focus increment. The P2
implementation evidence proves deterministic contract tests only, not an
executed Subject-Agent research outcome.

## Goals / Non-Goals

**Goals:**

- Extend the existing reference synchronization entry so `README.md` gains a
  deterministic Reference Evidence Map alongside the retained `_INDEX.md`
  inventory.
- Let a report reader navigate from a reference relationship or Topic-level
  focus status to its direct relative bundle coordinate.
- Preserve an honest `unknown`, no-current-declaration, historical-context,
  `partial`, and `blocked` result rather than turning incomplete provenance
  into coverage.
- Preserve ordinary Wave1 ownership: after legal focus-coverage authoring, the
  Phase Agent runs the existing synchronizer and the same inspect checkpoint.

**Non-Goals:**

- No new evidence, Topic, profile, receipt, Gate, routing, queue, HITL, trace,
  retry, or lifecycle authority.
- No per-reference current-increment attribution, effort/quality score, or
  inference from names, counts, bytes, `scope_role`, or prose.
- No final-report Evidence Map change, Agent return-map change, bulk historical
  rewrite, or cross-file atomic persistence guarantee.

## Decisions

### One extended synchronizer owns two derived targets

`sync-reference-index` remains the only command and explicit mechanical Phase
operation. Its renderer will derive an inventory payload and a README payload
from direct bundle facts in one invocation. The README retains its static
orientation sections and adds a `Reference Evidence Map`; the template supplies
the initial compatible README before the first synchronization. That template
contains only an explicit non-evidentiary "no synchronized projection" empty
state; a sync replaces it with derived facts.

This uses the existing reference-navigation owner instead of adding a reader
ledger, a map-specific command, or a background watcher. It also keeps the
normal Wave0/Wave1/Wave2 post-materialization synchronization path intact.

Alternative rejected: a new Evidence Map file or command. It would duplicate
discovery, introduce a second reader entry point, and need a separate repair
path without adding a new precise authority boundary.

### Split reference relationship from Topic-level increment status

The README will contain two deterministic views:

1. A stable reference table classifies each flat reference as `shared`,
   `Topic-specific`, `cross-Topic`, or `unknown`, with the reference path and
   direct canonical-Topic/classification coordinate.
2. A current canonical Topic table reports only a valid current focus outcome
   (`covered`, `partial`, `blocked`), `not declared`, `historical context`, or
   `unknown`, with the profile/depth-review/submitted-work-unit coordinates.

The renderer reuses canonical Topic resolution for relationships and the P2
focus-coverage evaluator/direct depth-review facts for current status. It does
not interpret commitment prose. A valid covered Topic can link submitted work
refs, but it cannot relabel its reference files as the increment without an
accepted per-reference binding. An unclassifiable reference remains an index
blocker while its README relationship is shown as `unknown` when the map can be
rendered.

`historical context` has a narrower display predicate than `unknown`: the
focus block must be parseable, bind the current canonical Topic, and carry an
earlier integer rerun count. It describes a past declaration only; malformed,
mismatched, or future-round data is `unknown` and never a historical coverage
claim.

Alternative rejected: one per-reference baseline/current-era label. Current
focus coverage binds Topic commitments to submitted work, not every consumer
reference. Such a label would overstate the evidence P2 established.

### Independent per-target CAS with explicit convergence

The synchronizer will render first, compare full bytes for each target, and
persist only changed targets through the existing CAS primitive. Its aggregate
result distinguishes `unchanged`, fully `committed`, and `blocked`; a blocked
result reports any already committed target plus the blocked target/root. A
later retry re-renders from current direct facts and current target bytes.

This is intentionally not a two-file transaction. Existing persistence exposes
only one target and CAS precondition at a time. Declaring atomicity, hidden
rollback, or prose merging would exceed that evidence and make recovery less
reliable. A partial projection remains visible only as a blocked repair root;
it changes neither submitted backing nor Gate/lifecycle state.

Alternative rejected: write both targets directly or roll back a first write
after a later CAS failure. Direct writes lose the existing drift protection;
rollback cannot truthfully guarantee restoration under a second concurrent
change.

### Wave1 only refreshes after a legal focus declaration update

Existing materialization already reaches the synchronizer. P3 adds one
Markdown instruction after the Phase Agent legally writes or updates valid
current `focus_coverage`: run the same synchronization and then the existing
Wave1 inspect. A synchronization block is an Engine-operation root and uses
the existing same-command retry; it does not create research work, alter the
declaration, or ask the user to edit projections.

Semantic precision: the named Reference Evidence Map lets a report reader
answer one bounded question at one stop point: which accepted reference
relationship is visible for a Topic, and what do direct current records say
about that Topic's focus increment. Relationship and increment are deliberately
separate so `unknown` is actionable and no false per-reference era emerges.

Simple reliable control: direct facts feed one pre-existing synchronization
loop, avoiding a second ledger, reconciler, status machine, or watcher. The
only recovery is the existing operation re-run against current CAS bytes.

Responsibility: the user retains semantic usefulness judgment at HITL2; the
Phase Agent performs authorized projection refresh; the Engine renders and
reports deterministic persistence/fact roots. README never grants a display
override or changes a Gate verdict.

## Risks / Trade-offs

- [A later README CAS block follows a committed index write] -> Return a
  blocked result with per-target coordinates and rerun the same operation; do
  not promise rollback or manually merge either file.
- [A reference has no exact canonical binding] -> Keep `_INDEX.md` blocking
  behavior and render `unknown` in README where possible with the direct root.
- [Focus declaration is malformed, stale, or missing direct authority] -> Use
  `unknown` or `historical context`, never a current covered claim.
- [Reader mistakes a Topic-level covered status for a reference-level era] ->
  Separate the two tables and state that no individual reference is attributed
  to the increment without an accepted direct binding.
- [Documentation tests become proof of research usefulness] -> Route tests as
  deterministic renderer/CLI/chain checks only; do not select Agent-flow proof
  for this projection-only change.

## Migration Plan

1. Implement the paired renderer and per-target CAS reporting while retaining
   `_INDEX.md` table bytes and existing CLI invocation compatibility.
2. Update the README template and Wave1 guidance so new bundles and later legal
   focus updates use the same renderer. The template's pre-sync empty state
   asserts no relationship or current-focus fact.
3. Add focused tests for relationship/status rendering, unknown/no-declaration/
   historical/limited cases, per-target CAS block, and a rerun-shaped reader
   path.
4. Release as `v0.81`. Existing bundles converge on their next legal
   synchronization; no historical reference rename or data migration is
   required. Rollback restores prior renderer/template behavior, leaving
   submitted evidence and lifecycle facts untouched; a later compatible sync
   may replace the derived README/index bytes.

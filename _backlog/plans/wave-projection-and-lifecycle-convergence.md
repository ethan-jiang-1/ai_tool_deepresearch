---
title: Wave projection and lifecycle convergence
status: execution_in_progress
created: 2026-07-28
source_bugs: BUG-129, BUG-130, BUG-131, BUG-132, BUG-133, BUG-134, BUG-135, BUG-136, BUG-137
related_changes:
  - fix-seed-topic-projection-materialization (archived)
---

# Wave Projection And Lifecycle Convergence

## 0. Progress Board

This document is the durable progress record for this bug group, not only its
initial analysis. Keep the board and the matching detailed checklist below in
sync whenever work starts, pauses, passes a phase gate, or is archived.

**Last progress update:** 2026-07-28\
**Current position:** Change 3 is archived; Change 4 is ready to re-read its
current terminal-transition seams and propose.

| Order | Proposal name | Bugs | State now | Next checkpoint | Advance only when |
| --- | --- | --- | --- | --- | --- |
| 1 | `make-wave0-candidate-projection-complete` | BUG-132 | `archived` | Completed at `openspec/changes/archive/2026-07-28-make-wave0-candidate-projection-complete/`. | Focused direct and temporary-bundle evidence passed; BUG-132 is closed. |
| 2 | `converge-wave1-reference-projections` | BUG-133, BUG-136, BUG-137 | `archived` | Completed at `openspec/changes/archive/2026-07-28-converge-wave1-reference-projections/`. | Canonical convergence, index CAS sync, and bounded supplementary objective passed focused proof; BUG-133/136/137 are closed. |
| 3 | `scope-wave2-return-map-inspection` | BUG-134 | `archived` | Completed at `openspec/changes/archive/2026-07-28-scope-wave2-return-map-inspection/`. | v0.56 scoped artifact parser removal passed focused proof; BUG-134 is closed. |
| 4 | `complete-terminal-readiness-status` | BUG-135 | `ready_to_propose` | Re-read terminal transition and rollback seams, then propose. | Change 3 is archived and the terminal state invariant remains current. |

### Progress Update Rules

- Exactly one change may be `in_progress`; later changes stay queued. Do not
  open a second apply while the prior change has unresolved verification or
  archive work.
- When work resumes, first update the row's state and its **Next action** in
  the detailed checklist. When work pauses or completes a phase, record the
  actual proposal/archive path, commit, or verification evidence there too.
- A checkbox means the stated artifact or proof exists. Intent, a passing
  discussion, or an unrun test never earns a tick.
- After a change is archived, mark its row `archived`, add its archive and
  proof evidence, make the next row `ready_to_propose`, and re-read the
  current code/spec seams before relying on this research record.

### Progress Log

| Date | Change | Recorded state | Evidence / next action |
| --- | --- | --- | --- |
| 2026-07-28 | Group plan | `research_complete_pre_proposal` | Four-change boundary and verification direction recorded; next action is `/opsx:propose make-wave0-candidate-projection-complete`. |
| 2026-07-28 | `make-wave0-candidate-projection-complete` | `archived` | Candidate-granular Wave0 projection landed with 65/65 focused checks, 7/7 version checks, package/governance validation, and strict OpenSpec validation. BUG-132 moved to fixed; next action is Change 2 seam re-read before proposal. |
| 2026-07-28 | `converge-wave1-reference-projections` | `archived` | v0.55 landed canonical Wave1 backing convergence, all-family index CAS sync, and bounded supplementary objective; 56 focused checks plus routing/requirements/spec governance passed. BUG-133/136/137 moved to fixed; next action is Change 3 seam re-read before proposal. |
| 2026-07-28 | `scope-wave2-return-map-inspection` | `archived` | v0.56 removed the false Wave2 artifact return-map parser route; 67 tests across 4 suites plus routing/requirements/spec governance and strict OpenSpec validation passed. BUG-134 moved to fixed; next action is Change 4 terminal-transition seam re-read before proposal. |

## 1. Decision

BUG-132--137 are not nine variants of one missing "Wave fix." They expose four
different questions with four different direct sources of record:

```text
Wave0 submitted source catalog
  -> Seed Topic candidate navigation                    BUG-132

Wave1 submitted source/cache backing + current refs
  -> canonical reference projection, index, floor loop  BUG-133, BUG-136, BUG-137

Wave2 seed projection vs owned synthesis artifacts
  -> return-map inspection scope                        BUG-134

readiness handoff + rb_status.json
  -> terminal lifecycle truth                           BUG-135
```

The minimum coherent implementation sequence is therefore **four focused
OpenSpec changes**, not one mega-change and not nine incident patches:

1. `make-wave0-candidate-projection-complete` for BUG-132.
2. `converge-wave1-reference-projections` for BUG-133, BUG-136, and BUG-137.
3. `scope-wave2-return-map-inspection` for BUG-134.
4. `complete-terminal-readiness-status` for BUG-135.

These names are proposal names, not active changes. This backlog record grants
no implementation permission. Each item still begins with `/opsx:propose`, a
delta spec/design/tasks/verification plan, and only then `/opsx:apply`.

The split is deliberately not based on file proximity or on all defects being
called "projection." It is based on the bounded reader question, the direct
authority required to answer it, and the legal action that follows. Merging
any two items would make a caller learn unrelated facts and would create a
large, shallow change with an unclear stopping point.

## 2. Honest Bug Disposition

| Bug | Disposition | What this plan authorizes |
| --- | --- | --- |
| BUG-129 | `dormant_current_counterexample_required` | No implementation. Reopen only when a reachable current-line bundle has fully backed Wave1 Phase projection data yet fails solely with `submitted_source_backing_missing`. |
| BUG-130 | `dormant_current_counterexample_required` | No implementation. Reopen only when a complete existing-backed pure-synthesis branch is rejected solely for a missing Wave2 receipt or Phase-owned projection. |
| BUG-131 | `accepted_policy_residual_risk` | No implementation. Wave0/Wave1 eligible quality floors and Wave2 fail-closed authority roots are accepted policy. A different policy needs a separate product decision. |
| BUG-132 | fixed_archived_change | `make-wave0-candidate-projection-complete` archived with focused deterministic proof. |
| BUG-133 | fixed_archived_change | `converge-wave1-reference-projections` archived with focused deterministic proof. |
| BUG-134 | fixed_archived_change | `scope-wave2-return-map-inspection` archived with focused deterministic proof. |
| BUG-135 | active | Change 4. |
| BUG-136 | fixed_archived_change | `converge-wave1-reference-projections` archived with focused deterministic proof. |
| BUG-137 | fixed_archived_change | `converge-wave1-reference-projections` archived with focused deterministic proof. |

"Systematically fix all bugs" here means preserving this distinction. A prior
historical report is not authorization to weaken a currently accepted contract,
invent an override, or repair an unproven contradiction.

## 3. Current System Facts

The proposed changes start from the following confirmed facts, not the older
incident theories:

- `return-map.mjs` currently obtains Wave0/Wave1 projection demands from
  `collectEligibleWorkUnitProjection()`. It proves that each submitted
  `work_id` appears at least once, but it does not read the declared Wave0
  `source.yaml` array. One entry can therefore cover a submitted source intake
  holding many candidates.
- `ReferenceMetadataArraySchema` is the authoritative Wave0 `source.yaml`
  parser. Its rows are an ordered YAML array of `url`, `title`,
  `retrieved_date`, `topic_tag`, and optional `notes`; a second ad hoc parser
  would be duplicate truth.
- The Seed Topic writer already accepts multiple Wave0 entries in one packet,
  validates `<work_id>/<positive ordinal>`, atomically upserts by `entry_id`,
  and supports explicit deferred entries. BUG-132 does not need another seed
  writer, a new token, or raw Markdown mutation.
- Wave1 phase guidance already makes references and `_INDEX.md` Phase-owned
  closeout projections after formal submit. `ref-count.mjs` already accepts a
  backed Phase projection. The missing system interface is not evidence
  authority; it is a common identity/closeout/convergence fact that producer,
  index, floor feedback, and consumer all use.
- `reference/*{topic}*.md` is too weak to be an identity convention. The
  current full registered `topic.slug` is the current Topic identity, while
  historical `NN-wave1-*` names are a different legacy layout. The current
  `shared-reference-template.md` still teaches the obsolete `0N-<slug>` form,
  even though the accepted flat-reference spec and Phase Wave1 guidance state
  `reference/{topic.slug}-<source-slug>.md`.
- `checkReferenceIndexCoverage()` already has the correct root-first behavior:
  an invalid `_INDEX.md` table gives one parent finding before missing row
  symptoms. The gap is reliable production of the index, not another index
  validator.
- `inspect-wave2-output.mjs` separately runs seed readiness, artifact return
  map inspection, and cross-reference return map inspection. Its Wave2 artifact
  branch calls `validateReturnMapContent()` on `synthesis.md` and
  `cross-topic-ledger.md`, incorrectly applying five seed-entry fields to
  artifacts with their own contracts.
- `advance-status.mjs` computes the terminal `readiness_passed / none` pair,
  writes a trace with rollback, but copies the old `rb_status.json#state`.
  Thus terminal truth can retain `not_started`.

## 4. System Boundary

```text
Agent judgment / legal mechanical work
  source candidate meaning, reference prose, synthesis prose, packet contents
                           |
                           v
Engine direct facts and checkpoints
  submitted rows, direct output schemas, cache binding, topic registry,
  reference metadata, index table, gate/inspect result, status/trace
                           |
                           v
Reader-facing projections
  seed entries, reference/*.md, reference/_INDEX.md, synthesis, ledger
```

The changes preserve these rules throughout:

1. A seed entry, reference file, or index row is navigation. It never creates
   submitted evidence, a receipt, a cache trail, or gate authority.
2. A Phase-owned reference may project already submitted backing. It may not
   repair actor-owned source semantics, fabricate a new source URL, or modify
   a ledger/receipt/hash to look backed.
3. Engine computes direct deterministic facts and gives one root-first next
   action. It does not choose research meaning, source relevance, or reference
   prose for the Agent.
4. Agent performs authorized packet formation, materialization, mechanical
   sync, and same-check repair. The user is asked only for a genuinely new
   semantic, risk, or permission decision.
5. No change creates a generic Wave controller, background watcher, retry
   tree, second source catalog, second index authority, or an extra lifecycle
   state.

## 5. Why Four Changes

| Proposed change | Bounded reader question | Direct authority | Why it is separate |
| --- | --- | --- | --- |
| `make-wave0-candidate-projection-complete` | For every candidate in this current submitted Wave0 source intake, where is its navigable entry or explicit disposition? | Current submitted Wave0 row plus its declared, schema-valid `source.yaml`; current canonical seed | Candidate catalog coverage is neither a reference count nor a source-acceptance decision. |
| `converge-wave1-reference-projections` | For this Topic and its required reference floor, is the next legal action projection/index closeout or supplementary evidence work? | Canonical topic identity; submitted Wave1 source/cache claims; backed reference files; index; profile floor | This one question keeps filename identity, index closeout, and floor convergence together without mixing Wave0 catalog semantics. |
| `scope-wave2-return-map-inspection` | Which Wave2 surfaces are seed return-map owners, and which are independently validated artifacts? | Seed Topic slot family; existing Wave2 artifact contracts | It is a scope bug, not a reference closeout or source-floor problem. |
| `complete-terminal-readiness-status` | What lifecycle state is true after the terminal readiness handoff commits? | Existing `advance-status` transition, status file, trace append transaction | It is an atomic lifecycle write; touching research artifacts would only enlarge risk. |

## 6. Change 1: Make Wave0 Candidate Projection Complete

### 6.1 Precise abstraction

The useful semantic level is a **submitted Wave0 candidate coordinate**. It
answers exactly this question:

> For a current canonical Topic, has every candidate recorded in a submitted
> Wave0 source intake been given one navigable Seed Topic entry or one explicit
> deferred disposition?

It does not answer whether the candidate is true, accepted evidence, a
materialized rich reference, or enough to satisfy a source floor. Those remain
owned by the submitted work, source/cache contracts, reference authority, and
existing Wave0 Gate.

The change shall use the existing packet identity grammar rather than add a
second persistent `candidate_id` field immediately:

```text
candidate coordinate = <submitted work_id>/<1-based source.yaml array ordinal>
Seed entry_id        = the same coordinate
```

This is stable for the accepted source-array snapshot, already legal in the
Seed Topic packet, collision-free across submitted work units and reruns, and
retains duplicate candidates as distinct direct facts. It avoids duplicating an
identity in source metadata merely to restate an identity that the submitted
row and ordered parsed array already provide. A proposal may add a persisted
candidate ID only if it demonstrates a real current case that ordinal identity
cannot represent; it must not add one as speculative future flexibility.

### 6.2 Required implementation shape

1. Extend the existing submitted-row projection reader, or a narrowly shared
   helper beneath it, to expose validated current Wave0 source-array rows as
   candidate coordinates. It MUST reuse the direct output contract and
   `ReferenceMetadataArraySchema`; it MUST NOT add a second YAML parser or
   test-local interpretation.
2. Extend the existing seed projection readiness evaluator so Wave0 requires
   every current candidate coordinate, not merely one occurrence of its parent
   work ID. Exact `entry_id` is the primary binding. A bare work ID in `refs`
   may remain useful provenance, but cannot satisfy all candidates of that row.
3. Keep the existing explicit `defers` / `deferred` form legal. It is the
   truthful result when no consumer reference should be materialized. It must
   still carry the exact candidate coordinate and a limitation in `next_hop`.
4. Keep aggregate prose and high-level summaries as optional reader aid. They
   cannot satisfy candidate coverage.
5. Reuse the existing `operate-topic-state apply` Wave0 packet writer. The
   closeout guidance and template must state that Wave0's ordinal is the
   submitted source-array candidate ordinal, and that one packet may contain
   multiple entries for its one owned slot.

### 6.3 Root-first control loop

```text
submitted row / canonical seed parent invalid
  -> report that authority root; do not enumerate candidates

valid current source array + missing candidate coordinate
  -> one exact topic + work_id/ordinal projection finding
  -> Agent forms/repairs a Wave0 packet
  -> existing operate-topic-state apply
  -> rerun existing inspect-wave0-output

valid candidate entry or identity-bound deferred disposition
  -> candidate is navigable; no new evidence authority is created
```

If a source array is invalid, the existing direct-output root wins and hides
derived candidate omissions. If a candidate entry itself is malformed, report
that local entry before declaring unrelated candidates absent. This prevents a
wall of follow-on symptoms and keeps repair at the same inspect.

### 6.4 Compatibility and non-goals

- Apply candidate completeness to current-round Wave0 submitted rows, matching
  the current eligible-row authority policy. Historical rows remain readable;
  no bulk rewrite or hand-authored ledger repair is permitted.
- Do not force every candidate into a rich accepted reference, a shared
  reference, or an evidence-backed conclusion.
- Do not change Wave0 source count floors, degradation policy, Phase-owned
  Wave0 reference ownership, or BUG-129's Wave1 backing contract.
- Do not create a `source catalog` lifecycle, a new CLI, or a second Seed
  writer. The existing packet writer is the seam.

### 6.5 Expected change surface and proof

Likely surfaces are the Wave0 direct-output/projection reader, the shared seed
readiness evaluator, the existing seed template/Phase Wave0 closeout guidance,
the return-map and Wave0 delta specs, and focused tests under `tests/`.

The OpenSpec verification plan should select:

| Class | Required proof |
| --- | --- |
| `unit` | Candidate-coordinate extraction, exact identity matching, duplicate URL preservation, deferred disposition, and parent short-circuiting. |
| `integration` | A temporary bundle reaches real work-unit submit, then real `operate-topic-state apply` and `inspect-wave0-output`; N submitted source-array rows with fewer than N entries fail at exact coordinates, then pass after packet upsert. |
| `deterministic_e2e` | Not applicable unless the existing integration cannot exercise the real submit/writer/inspect seam. |
| `agent_flow_e2e` | Not applicable. This change proves deterministic navigation coverage, not real Agent research behavior. |

No nested-Agent canary is justified for this deterministic contract.

## 7. Change 2: Converge Wave1 Reference Projections

### 7.1 Precise abstraction

This change introduces one narrow, non-authoritative deterministic result,
called here the **Wave1 reference convergence result**. Its question is:

> For this current Topic and profile floor, which submitted-backed consumer
> references/index rows can be repaired now, and only after they are exhausted,
> how many genuinely new sources must a supplementary Wave1 work unit seek?

The result must retain distinctions that change the next legal action:

| Distinction | Consequence |
| --- | --- |
| current full `topic.slug` path vs `NN-wave1-*` legacy layout | Current path is countable identity; legacy is diagnostic/history and never silently current coverage. |
| submitted source/cache backing present vs absent | Present permits Phase projection materialization; absent requires delegated supplementary evidence work. |
| reference file missing/misnamed vs index row missing | The former repairs consumer projection identity; the latter repairs navigation only. |
| invalid index table parent vs one bad/missing row | Repair the parent once before emitting dependent row symptoms. |
| countable current projection vs malformed/unbacked file | Count only the former; do not use an index row or filesystem presence as evidence authority. |
| current projection repair still available vs true count deficit | Materialize/sync and rerun first; only then enqueue bounded new-source work. |

The stopping point is an inspect/gate finding that names one Topic, one repair
class, its direct facts, and one same-check action. A reader should not need to
reconcile globs, source claims, filename conventions, `_INDEX.md`, and queue
rules by hand.

### 7.2 One reference identity path

The change shall establish a shared canonical topic-reference renderer/locator
for current Wave1 projections:

```text
reference/{full current topic.slug}-{deterministic source qualifier}.md
```

The renderer/locator must be the single adjustment point used by closeout
guidance, reference convergence, count selection, index synchronization, and
seed navigation repair. It must:

- retain the full current `topic.slug`, including the registry's ordinal;
- derive a safe, collision-resistant source qualifier only from submitted
  source/cache/output facts, not from an Agent's truncated filename guess;
- identify `NN-wave1-*` and other prior layouts explicitly as legacy rather
  than accepting them through broad substring matching;
- expose an unambiguous target or return a direct unresolved-identity root;
- never turn a legacy path, source-layer cell, or index row into backing.

The current broad `reference/*{topic}*.md` count scope must be replaced or
made to delegate to this one locator. Do not retain it as a parallel success
path. The shared reference template, Phase Wave1 materialization instructions,
accepted flat-reference wording, and the consumer evaluator must describe the
same current layout.

### 7.3 Closeout without a generic controller

This is not a proposal for a generic reference controller. The narrow pieces
are justified as follows:

1. A pure reference convergence evaluator reads existing direct facts and
   returns the nearest repair class. Both Wave1 inspect and the formal Wave1
   Gate must reuse it rather than independently interpreting the floor.
2. `_INDEX.md` is fully deterministic navigation projection. Current code has
   a validator but no reliable renderer/sync owner. Add a narrow index
   renderer/synchronizer for exactly `reference/_INDEX.md`, preferably using
   the existing compare-and-swap persistence boundary. It may derive rows from
   committed reference metadata/path classification; it may not write rich
   reference prose, decide source acceptance, or modify backing authority.
3. The Phase Agent continues to author semantic reference prose from submitted
   backing and to use the existing persistence mechanism. After a committed
   reference it invokes the narrow index sync, then the existing Seed Topic
   packet writer, then the same Wave1 inspect.

The exact CLI spelling can be chosen in the proposal after checking the safest
extension point in `operate-artifact-persistence`, but its interface must be a
single-file, compare-and-swap operation with an explicit `committed|unchanged|
blocked` outcome. It must not be a multi-reference mutator, a research runner,
or a new evidence authority.

### 7.4 Convergence order

The evaluator must preserve the shortest legal loop:

```text
invalid submitted/profile/topic identity parent
  -> report parent; no inferred reference or queue action

legacy/misnamed current projection or otherwise materializable submitted backing
  -> Phase Agent materializes exact canonical path
  -> sync reference/_INDEX.md
  -> update affected seed packet refs when necessary
  -> rerun inspect-wave1-output

invalid index table
  -> sync/repair the one parent table
  -> rerun same inspect before per-row messages

no remaining projection repair, fewer backed current references than floor
  -> one bounded supplementary wave1_topic_deepening demand for the exact
     remaining deficit, with novelty/cache/backing constraints
  -> normal claim/dry-submit/submit/depth-review/closeout loop
  -> rerun same inspect
```

Do not simultaneously ask the Agent to materialize known backing and search
for new sources. Existing materializable backing is always the nearest action.
Only after it is exhausted may the evaluator produce the supplementary demand.
This makes BUG-133's `6/5/5/6` controlled case produce `2/3/3/2` only when
there is no remaining current submitted backing that can legally become a
reference projection.

### 7.5 Legacy handling

There is no blind `mv`, no copied evidence, and no mutation of submitted
declaration rows, result hashes, receipts, or cache provenance.

- A legacy declared reference remains historical submitted evidence at its
  recorded path. If the same accepted source/cache backing permits a current
  Phase-owned canonical consumer projection, materialize that new projection
  through the normal Phase path; this is navigation projection, not new
  acquisition.
- A legacy Phase-owned projection may be superseded by a canonical projection
  from the same backing. It is never silently treated as current countable
  layout. Retention/removal is allowed only through an explicit safe ownership
  rule; it is not required to satisfy the current floor.
- Update the index and any affected seed consumer refs through their existing
  writers after the canonical file is committed. The sequence is deliberately
  recoverable rather than falsely claiming a cross-file transaction: an
  interruption yields a concrete reference/index/seed convergence root and a
  same-check rerun.

### 7.6 Required impact and non-goals

Likely affected surfaces include `ref-count.mjs`, reference authority/locator
helpers, Wave1 contract evaluation and gate definition wiring, index rendering
and persistence seam, Phase Wave1/shared reference guidance, reference and
Wave1 specs, and focused tests.

This change SHALL NOT:

- weaken submitted source/cache backing, re-open BUG-129, or declare a Phase
  reference backed solely because it exists or has an index row;
- make a missing `_INDEX.md` row count as an evidence or floor failure with a
  fabricated source repair;
- turn source-layer into authority;
- change the accepted Wave1 degradation policy from BUG-131;
- create a new queue kind, a generic repair controller, a duplicate count
  checker, a background index watcher, or a mass rewrite of old bundles.

### 7.7 Expected proof

| Class | Required proof |
| --- | --- |
| `unit` | Canonical renderer/locator behavior; legacy classification; source qualifier collision handling; root-first reference convergence classification; index row rendering/parent failure. |
| `integration` | Temporary submitted Wave1 bundle through production inspect/gate paths: full-slug projection counts; `NN-wave1-*` does not silently count; empty index yields exactly one parent root; sync produces rows/count; controlled `6/5/5/6` resolves first by materialization when backing exists and otherwise exposes `2/3/3/2` legal supplementary demands. |
| `deterministic_e2e` | Not applicable unless a temporary-bundle integration cannot cover the actual persistence, inspect, gate, and queue seams. |
| `agent_flow_e2e` | Not applicable. The claim is deterministic convergence and index correctness, not that a real Agent independently judged reference prose. |

The historical mutable bundle that later became green is not a red fixture. The
proposal must create a controlled disposable `6/5/5/6` fixture and use real
production CLI acceptance/inspection paths. It must not hand-write a ledger,
receipt, or gate attempt.

## 8. Change 3: Scope Wave2 Return-Map Inspection

### 8.1 Precise boundary

Wave2 has two distinct artifact families:

```text
Seed Topic Wave2 slots and W2F-bound pending entries
  -> return-map fields and finding binding belong here

synthesis.md, cross-topic-ledger.md, finding-index.yaml
  -> their independently accepted narrative/ledger/index contracts belong here
```

The change answers one question only: which files are legitimate inputs to the
return-map parser? The answer is the current canonical Seed Topic Wave2 family,
not `synthesis.md` or `cross-topic-ledger.md`.

### 8.2 Required shape

- Remove the Wave2 artifact path that calls `validateReturnMapContent()` on
  `artifacts/wave2/synthesis.md` and `cross-topic-ledger.md`.
- Preserve all seed projection readiness checks, including exact W2F identity,
  required fields, concrete navigation, and root-first seed coordinates.
- Preserve the independent Wave2 artifact evaluators and their existing rule
  IDs for synthesis links, six-section ledger structure, and finding-index
  binding. If the current helper also contains a useful finding-index lineage
  diagnostic, relocate it to an artifact-specific helper rather than retaining
  the false implication that the full Wave2 artifact triple is a return map.
- Delete the workaround expectation that narrative or ledger documents carry a
  `## Return Map` section merely to placate the wrong parser.

No Wave2 receipt rule, pure-synthesis policy, or BUG-130 disposition changes
in this work.

### 8.3 Expected proof

| Class | Required proof |
| --- | --- |
| `unit` | Artifact-scope selector ignores valid narrative/ledger prose while seed return-map parsing remains strict. |
| `integration` | A valid Wave2 triple with the workaround sections removed passes `inspect-wave2-output`; a broken seed entry still reports the exact seed coordinate; independently broken synthesis/ledger/index artifacts retain their existing rule IDs. |
| `deterministic_e2e` | Not applicable. The production inspect CLI is the complete deterministic seam. |
| `agent_flow_e2e` | Not applicable. No Agent behavior claim is needed. |

## 9. Change 4: Complete Terminal Readiness Status

### 9.1 Precise boundary

The terminal transition has one deterministic invariant:

```text
target current_gate = readiness_passed
next_gate           = none
rb_status.state     = completed
```

`state` owns irreducible lifecycle truth. Consumers should not have to infer
completion from two other fields. The change is a narrow correction in
`advance-status.mjs`: when the normal terminal transition is constructed, add
`state: completed` to the same in-memory status object that is written before
the trace append and restored on trace failure.

### 9.2 Guardrails

- Do not redefine intermediate `not_started`, `in_progress`, or `blocked`
  semantics.
- Preserve the existing status-write/trace-append rollback ordering.
- Preserve post-final recovery/reentry as a completed-run recovery path; it
  must not turn a previously completed initial run into `not_started` or
  `in_progress` simply because a later recovery handoff is loaded.
- Do not add a new lifecycle state, an override, a dashboard-derived fallback,
  or a second completion checker.

### 9.3 Expected proof

| Class | Required proof |
| --- | --- |
| `unit` | Not applicable unless the implementation extracts a pure terminal-status builder for production reuse. Do not create one only to satisfy a test category. |
| `integration` | Existing `advance-status` fixture reaches a witnessed readiness-to-final handoff and asserts the full status triple. A terminal trace-append failure restores the prior full status including state. Existing post-final recovery remains distinguishable. |
| `deterministic_e2e` | Not applicable; the production CLI transaction is directly covered by integration. |
| `agent_flow_e2e` | Not applicable. |

## 10. Sequencing And Proposal Gates

The changes should be proposed and applied one at a time in this order:

1. Candidate projection completeness first: it defines the precise Wave0
   navigation fact without touching evidence authority.
2. Wave1 reference convergence second: it uses established seed packet and
   Phase-owned projection boundaries, but does not depend on candidate-level
   acceptance semantics.
3. Wave2 inspection scope third: it is independently safe and small; keeping
   it after the two projection changes makes review surface clear without
   blocking it on their implementation.
4. Terminal lifecycle status last: it is fully independent and should remain a
   short atomic change rather than being hidden in a Wave proposal.

Before proposing each change, re-check the named code/spec seams and use this
admission review:

| Change | Semantic precision | Simple reliable control | Helper-oriented responsibility |
| --- | --- | --- | --- |
| Wave0 candidate projection | Candidate coordinate answers per-candidate navigation without becoming evidence authority. | Reuse direct schema/parser and one readiness evaluator; parent failures mask candidate symptoms. | Agent writes semantic entries/deferred disposition through existing packet; Engine judges exact coverage; user decides no ordinary repair step. |
| Wave1 reference convergence | One Topic/floor result preserves identity, backing, index, legacy, and deficit distinctions. | One locator/evaluator and one index sync replace scattered glob/count/index reasoning; materialize before supplementary search. | Agent authors/projections and runs legal sync/queue actions; Engine classifies next action; user is not a pipeline operator. |
| Wave2 scope | Artifact ownership is explicit: seed entries are return maps, synthesis artifacts are not. | Delete an incorrect parser path rather than add a compatibility layer. | Agent stops carrying workaround prose; Engine keeps separate artifact checks. |
| Terminal status | Terminal lifecycle truth has one exact three-field answer. | One atomic transition adjustment, existing rollback, no derived fallback. | Agent invokes ordinary status sync; Engine commits/audits; no human override. |

If a proposal cannot state its bounded question, direct source, one next action,
and removed/avoided complexity in this form, shrink it before `/opsx:apply`.

## 11. Execution Checklist And Progress Record

The technical detail in sections 6--9 says what each change must do. This
section records whether it has actually progressed through the OpenSpec
lifecycle. Update the matching top-board row and progress log with every tick.

### 11.1 Change 1 -- `make-wave0-candidate-projection-complete`

**State:** `archived`\
**Current evidence:** `openspec/changes/archive/2026-07-28-make-wave0-candidate-projection-complete/`
contains the accepted proposal/design/specs/tasks and actual verification record.
The implementation preserves one direct-output parser, one candidate projection
reader, one readiness evaluator, and the existing packet writer.\
**Next action:** re-read Change 2's current seams, then run
`/opsx:propose converge-wave1-reference-projections`.

- [x] Establish the BUG-132 root cause: parent `work_id` coverage is not
  candidate-granular coverage of the submitted Wave0 source array.
- [x] Re-read the current source-array contract, Seed Topic packet writer, and
  shared readiness evaluator immediately before proposing; confirm that
  `<work_id>/<1-based ordinal>` still represents the narrowest stable
  candidate coordinate.
- [x] Create the proposal, delta specs, design, task list, and
  `verification-plan.yaml`; it must reuse `ReferenceMetadataArraySchema` and
  the existing writer rather than introduce another parser, writer, or
  persisted speculative candidate ID.
- [x] Admit the proposal to apply only after its tasks make exact candidate
  binding, explicit deferred disposition, root-first errors, and no new
  evidence authority testable.
- [x] Apply only the approved tasks: expose current submitted candidate
  coordinates, enforce exact Seed Topic coverage, and update the existing
  closeout guidance/template through the established writer seam.
- [x] Run and record focused unit and temporary-bundle integration proof,
  including duplicate URLs, deferred entries, parent short-circuiting, real
  submit -> topic-state apply -> Wave0 inspect, and all four verification
  routing classifications.
- [x] Archive the completed change, update BUG-132's disposition, record the
  archive/commit/proof below, and promote Change 2 in the progress board.

**Archive / proof evidence:** `openspec/changes/archive/2026-07-28-make-wave0-candidate-projection-complete/`; [verification-results.md](../../openspec/changes/archive/2026-07-28-make-wave0-candidate-projection-complete/verification-results.md) records 65/65 focused and 7/7 version checks plus package/governance/strict validation. Commit is not yet created.

### 11.2 Change 2 -- `converge-wave1-reference-projections`

**State:** `archived`\
**Current evidence:** v0.55 convergence, index-sync, queue-objective, and
temporary-bundle proof are recorded in the archive and the verification run.\
**Next action:** Change 3 re-reads its Wave2 seams before proposal.

- [x] Establish that BUG-133/136/137 share one consumer-projection convergence
  problem while preserving submitted source/cache backing as authority.
- [x] After Change 1 archives, re-read the current reference schema, Phase
  Wave1 closeout, count helper, index validator, queue/depth helper, and
  accepted specs; revise this checklist if current facts invalidate any
  assumption.
- [x] Create the proposal, delta specs, design, task list, and
  `verification-plan.yaml`; its bounded result must distinguish canonical
  layout, legacy layout, materializable backing, index repair, and true source
  deficit.
- [x] Admit the proposal to apply only after it names one canonical full-topic
  locator, one shared convergence evaluator, and one narrow `_INDEX.md` sync
  seam, with no generic controller or parallel count authority.
- [x] Apply only the approved tasks: converge current reference identity,
  backing-aware floor evaluation, root-first index repair, and the legal
  materialize-before-supplementary-work order; update all stale naming
  guidance that the proposal owns.
- [x] Run and record focused unit and temporary-bundle integration proof,
  including canonical full-slug count, legacy non-counting, one invalid-index
  parent root, sync behavior, and both sides of the controlled `6/5/5/6`
  case; record all four verification routing classifications.
- [x] Archive the completed change, update BUG-133/136/137 dispositions,
  record the archive/commit/proof below, and promote Change 3 in the progress
  board.

**Archive / proof evidence:** `openspec/changes/archive/2026-07-28-converge-wave1-reference-projections/`; v0.55 focused proof: 56 tests across 9 suites, routing assets valid, and requirements/spec governance zero violations. Commit is not yet created.

### 11.3 Change 3 -- `scope-wave2-return-map-inspection`

**State:** `archived`\
**Current evidence:** `openspec/changes/archive/2026-07-28-scope-wave2-return-map-inspection/`
contains the accepted proposal/design/specs/tasks and implementation evidence.\
**Next action:** Change 4 re-reads the terminal transition and rollback seams
before `/opsx:propose complete-terminal-readiness-status`.

- [x] Establish that the false failure is a parser-scope error: Seed Topic
  Wave2 entries are return maps, while synthesis, ledger, and index artifacts
  own independent contracts.
- [x] After Change 2 archives, re-read the inspect entry point, return-map
  helper, and independent Wave2 artifact evaluators; confirm which useful
  diagnostic, if any, needs artifact-specific ownership.
- [x] Create the proposal, delta specs, design, task list, and
  `verification-plan.yaml`; it must preserve strict seed W2F binding and all
  independent artifact rule IDs.
- [x] Admit the proposal to apply only after it removes the false parser path
  rather than adding a narrative/ledger compatibility return-map format.
- [x] Apply only the approved tasks: stop sending `synthesis.md` and
  `cross-topic-ledger.md` to `validateReturnMapContent()`, retain independent
  artifact checks, and remove the corresponding workflow workaround guidance.
- [x] Run and record focused unit and production-inspect integration proof:
  valid artifacts without workaround sections pass, malformed seed entries
  still fail at exact coordinates, and broken synthesis/ledger/index artifacts
  retain their rule IDs; record all four verification routing classifications.
- [x] Archive the completed change, update BUG-134's disposition, record the
  archive/commit/proof below, and promote Change 4 in the progress board.

**Archive / proof evidence:** `openspec/changes/archive/2026-07-28-scope-wave2-return-map-inspection/`; v0.56 focused proof: 67 tests across 4 suites, routing assets valid, and requirements/spec governance plus strict OpenSpec validation passed. Commit: `fix(wave2): scope return-map inspection`.

### 11.4 Change 4 -- `complete-terminal-readiness-status`

**State:** `ready_to_propose`\
**Current evidence:** the terminal invariant, rollback boundary, and proof
direction are recorded in sections 3, 9, 10, and 12.\
**Next action:** re-read `advance-status` transition and recovery seams, then
run `/opsx:propose complete-terminal-readiness-status`.

- [x] Establish the BUG-135 root cause: the terminal status write retains its
  old `state` although the transition has reached `readiness_passed / none`.
- [ ] After Change 3 archives, re-read the status transition, trace append
  rollback, and post-final recovery behavior; confirm the narrow three-field
  invariant still describes current code.
- [ ] Create the proposal, delta specs, design, task list, and
  `verification-plan.yaml`; it must make the terminal state write atomic with
  the existing transaction and must not introduce a new lifecycle state or
  completion checker.
- [ ] Admit the proposal to apply only after its tasks preserve rollback and
  completed-run recovery semantics explicitly.
- [ ] Apply only the approved tasks: set `rb_status.state` to `completed` in
  the existing terminal transition object and retain the status-write/
  trace-append rollback behavior.
- [ ] Run and record focused `advance-status` integration proof for the full
  terminal triple, trace-append rollback restoration, and post-final recovery;
  record all four verification routing classifications.
- [ ] Archive the completed change, update BUG-135's disposition, record the
  archive/commit/proof below, and complete the umbrella-plan closure checklist.

**Archive / proof evidence:** `TBD`

### 11.5 Close The Umbrella Plan

- [ ] Confirm all four rows above are `archived`, each has its actual archive,
  commit, and verification evidence, and no active OpenSpec change remains.
- [ ] Update BUG-132--137 with their final dispositions; retain BUG-129/130
  as explicit current-counterexample triggers and BUG-131 as accepted policy
  residual risk unless new evidence warrants a separate decision.
- [ ] Move this plan to `_backlog/_done/_closed_plans/` and update the active,
  closed, and done README indexes according to `_backlog/plans/README.md`.

## 12. Shared Verification Discipline

These are deterministic framework contracts. The default proof asset is a
focused `node:test` unit or temporary-bundle integration test that invokes real
production Engine/CLI paths. Do not compensate for a weak fixture by adding a
long nested-Agent canary.

- Each proposal's `verification-plan.yaml` must declare all four canonical test
  classes and mark the unselected classes `not_applicable` with the stated
  rationale.
- A candidate result, source YAML, reference prose, or synthesis file may be
  written as an explicitly labelled test input. It gains authority only through
  the real production submit/persistence/inspect/gate path.
- Negative tests prove correct rejection/diagnosis, not research quality.
- The selected integration tests should be short and local. They should not
  perform network calls, wait for host continuation, or launch sub-agents.
- Add a real Agent-flow case only if a later change makes an explicit claim
  about an Agent following the control-plane guidance. It is not a substitute
  for the deterministic contract tests above.

This follows the successful BUG-138 verification direction: static protocol
contract plus production CLI disposable-chain evidence where necessary, without
turning a slow, unreliable nested Agent test into a permanent test liability.

## 13. Exit Criteria For This Backlog Plan

This plan moves to `_backlog/_done/_closed_plans/` only after all four proposed
changes have been archived and the bug records have their final dispositions.
At that point:

- BUG-132 has candidate-granular current Wave0 projection coverage;
- BUG-133/136/137 have one canonical Wave1 reference identity and closeout
  convergence path with real source-vs-projection classification;
- BUG-134 no longer forces return-map fields into independent Wave2 artifacts;
- BUG-135 writes terminal lifecycle truth atomically; and
- BUG-129/130/131 retain their explicit evidence/policy boundaries unless a
  separately recorded condition changes.

Until then, this is the active planning record for the group. It should not be
used to claim that dormant or policy-only bugs have code fixes.

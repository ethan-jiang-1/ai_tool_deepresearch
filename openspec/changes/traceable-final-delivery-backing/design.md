## Context

`phase-final.md` currently tells the Phase Agent to write a staged report and
call generic artifact `persist` for a `final/` target. The persistence helper
checks safe paths, compare-and-swap, and crash recovery, but it has no
submitted-evidence admission step. `BUG-199` therefore reached legal Final
with a report that claimed evidence-backed conclusions while exposing no
traceable backing.

The direct authority is already available. The Engine-normalized submitted
work-unit declaration reader authenticates accepted rows, while
`classifyReferenceAuthority()` resolves a `reference/` artifact only when it
has submitted or legal Phase-owned submitted backing. `persistBundleFile()` is
the existing sole crash-safe final-byte writer. Final remains `gate: null` and
its report is delivery evidence only after the existing readiness-to-Final
handoff and Final entry.

## Goals / Non-Goals

**Goals:**

- Give a reader one bounded answer for a declared Final conclusion: which
  submitted backing surface can be inspected?
- Reject a Final Markdown report with no, malformed, unsafe, or unauthenticated
  declared backing before its bytes become durable under `final/`.
- Reuse the current submitted-ledger/reference classifier and the current
  persistence commit/recovery path.
- Give the Phase Agent one direct repair loop over retained staging without
  user involvement in ordinary Final work.

**Non-Goals:**

- Decide whether an evidence file semantically supports, completes, or proves
  the Final prose.
- Scan every sentence, create a citation ledger, or turn `reference/` into an
  authority surface.
- Add a Final Gate, lifecycle state, trace event, delivery witness, watcher,
  retry controller, or post-Final mutation path.
- Rewrite historical Final reports or require an Evidence Map for non-Markdown
  Final artifacts in this change.

## Decisions

### 1. The reader-facing declaration is one bounded Evidence Map table

New Final Markdown reports use this canonical authoring shape:

```md
## Evidence Map

| Finding ID | Declared Key Finding | Submitted Backing |
| --- | --- | --- |
| F-001 | Concise declared conclusion | [Wave1 evidence](../artifacts/wave1/topic/evidence-summary.md) |
```

The map has a deliberately narrow question: for a selected Final key finding,
what submitted surface can a reader open? It preserves the distinctions that
change that answer: a direct submitted output versus a submitted-backed
projection, a legal backing versus a disk-only diagnostic artifact, and
structural provenance versus semantic adequacy. The reader can stop at a row
and its resolved backing or receive an explicit rejection; reconstructing
cache, `reference/`, and work-unit history is not required on the normal path.

The parser reuses `markdownSemanticSectionEntries()` for the existing
heading-level/case/whitespace normalization while retaining every matching
heading so duplicate `Evidence Map` sections remain detectable. It reads only
that section's named columns `Finding ID`, `Declared Key Finding`, and
`Submitted Backing`. It tolerates table-column order and harmless cell
whitespace, but rejects an absent, empty, or ambiguous section/table, empty
required cells, conflicting repeated finding declarations, or a cell with no
standard Markdown link. Repeated rows are permitted for multiple backing groups
of one exact declaration. The parser does not inspect report prose outside this
section.

Alternatives rejected:

- A report-wide link scan cannot distinguish evidence links from navigation or
  infer which conclusion a link supports.
- Inline citation requirements make the evaluator decide sentence boundaries
  and prose grammar, yielding a larger and more fragile control surface.
- A second evidence ledger duplicates the submitted declaration authority.

### 2. Backing resolution reuses existing provenance authority

For each parsed link, the evaluator resolves the href from the intended Final
target directory, not the staging-file directory. It accepts only a safe
existing non-symlink regular file within the selected bundle that is either:

1. an exact path in a normalized submitted declaration row with role
   `source_yaml` or `evidence_summary`; or
2. a `reference/` path accepted by `classifyReferenceAuthority()`.

The existing submitted reader remains responsible for row/index/status/receipt
integrity. The existing reference classifier remains responsible for resolving
legacy submitted reference outputs and legal Phase-owned projections. An
unsubmitted artifact, failed work result, bare `_cache/` path, `final/` file,
finding index, synthesis-only artifact, path outside the bundle, or a path that
falls through both families fails closed.

This evaluator returns structured `check`, `inspect`, and `advice` facts: the
smallest affected map row/link, the direct missing or invalid fact, its legal
repair surface when known, and `persist-final-report` as the rerun operation.
It deliberately does not score support, correctness, relevance, completeness,
or narrative quality. Those are Agent/human judgments.

### 3. Add a pre-persist operation, not a second durability path

`operate-artifact-persistence.mjs` gains `persist-final-report` with the same
bundle/source/target/expected-target input model as generic `persist`. It
accepts only safe Markdown targets under `final/` (case-insensitive `.md`
extension) and evaluates the retained source before calling any
workspace-creating persistence helper. A passing report is delegated to
`persistBundleFile()` exactly once, preserving existing CAS, atomic rename,
staging retention, and quiescent `sweep` recovery semantics.

The same evaluator also runs when `sweep` is about to finalize a prepared Final
Markdown payload. This closes the crash window and prevents a workspace made
before the current operation from becoming a bypass. It is one evaluator called
at both admission and recovery, not a second provenance rule or a new workspace
state. If current direct backing no longer passes, `sweep` returns the existing
blocked-workspace shape, leaves the target untouched, and the Agent repairs
retained staging/backing before removing that one workspace and rerunning
`persist-final-report`.

Generic `persist` detects a Final Markdown target and rejects it before the
workspace is created, with `persist-final-report` as its one direct next
operation. It remains the path for non-Final content and non-Markdown Final
artifacts. Backing rejection is a normal deterministic blocker (exit `1`);
invalid arguments/configuration remain exit `2`; a committed report exits `0`.

Target classification preserves the existing configuration-error precedence:
both operations first apply the existing safe-target contract, so an unsafe or
malformed final-looking target remains an exit-`2` configuration error rather
than a Final-backing rejection or redirect. For a safe Final Markdown target,
generic `persist` keeps its existing strict blocked-result schema and names
`persist-final-report` in its existing `reason`; it does not add Final-backing
fields to the generic result.

The new CLI operation gets its own strict result schema rather than broadening
the existing `ArtifactPersistResultSchema`, whose operation discriminator is
intentionally `persist`. Its top-level `check`, `inspect`, and `advice` describe
only Final-backing admission; its ordinary persistence fields describe the
subsequent commit or CAS blocker. This lets an Agent distinguish a map/backing
repair from a durability conflict while preserving unchanged `persist` and
`sweep` consumer contracts.

The evaluator needs enough safe source/target inspection to read either retained
staging (admission) or the accepted prepared payload (recovery), then
`persistBundleFile()` rechecks its existing durability path invariants. This is
not two provenance validators: there is one Final-backing evaluator, plus the
already-required persistence path-safety/CAS checks for a different fact class.

### 4. Final guidance creates demand at the enforcement point

`phase-final.md`, the persistence playbook, and the command inventory will
teach the Agent to write the map in staging, run `persist-final-report`, consume
its structured feedback, repair the named staging row/backing boundary, and
rerun the same operation. The generic persistence instructions will explicitly
exclude Final Markdown reports so the command inventory does not teach a
bypass.

No Final Gate or Final trace is introduced. A successful persistence verdict is
still durability plus structural submitted-backing admission; it does not
independently prove delivery, replace legal Final entry, or authorize a
post-Final action.

### 5. Terminology remains narrow and does not relabel authority

During apply, `CONTEXT.md` will add only these glossary terms:

- **Final key-finding declaration**: a reader-facing declared conclusion in a
  Final Evidence Map; it is not a submitted ledger row or semantic verdict.
- **Final Evidence Map**: the bounded Markdown table of those declarations and
  links; it is not a new ledger, Gate, or report-wide citation requirement.
- **Final backing**: the existing submitted source/output or submitted-backed
  reference resolved for one map link; it is not filesystem presence alone.

These preserve the existing meanings of `Reference`, `Consumer projection`,
and `Submitted ledger row` instead of introducing aliases such as
`submitted_work` for aggregate evidence coverage.

### 6. Evolution review

Semantic precision: the Evidence Map is justified because a delivery reader can
now answer one bounded provenance question without rebuilding lower-level
history; it intentionally reports unknown/rejected rather than pretending a
disk file is evidence.

Simple reliable control: the shortest legal loop is retained staging -> one
backing evaluator -> existing atomic persist -> delivery. The change fills a
missing admission at the only final write point and avoids a Gate, duplicate
ledger, all-prose scanner, watcher, or retry tree. It adds no persistent state
and reuses rather than competes with existing classifier and durability checks.

Helper responsibility: the Agent decides key findings, writes/revises staging,
and performs legal same-command retries; the Engine gives deterministic
structural/provenance feedback; the user makes no ordinary Final delivery
decision. Semantic adequacy remains with the Agent/human and is never hidden
behind a mechanical pass.

## Risks / Trade-offs

- **A bounded table is stricter than free-form citations** -> Parse only its
  designated semantic section and tolerate equivalent heading/cell layout;
  reject only ambiguity or missing identity/backing facts needed for the reader
  question.
- **Future submitted output roles may be useful backing** -> Fail closed until
  a later change explicitly adds their evidence meaning; do not silently admit
  generic `other` outputs.
- **A reference classifier may change in C2 or another provenance change** ->
  Recheck its interface and accepted authority values immediately before apply;
  update this change rather than duplicating its behavior.
- **A structurally valid map can still cite weak evidence** -> Make the
  non-semantic boundary visible in guidance and negative tests; no test claims
  a real Agent made a sound research judgment.

## Migration Plan

1. Land the evaluator and `persist-final-report` operation with focused unit
   and CLI integration coverage before changing Final guidance.
2. Update Final/persistence command surfaces and their static integration
   contract so new Final Markdown reports use the admitted operation.
3. Update the glossary and v0.70 release surfaces during apply.
4. Leave historical Final artifacts untouched. They remain historical delivery
   evidence under their accepted contract and are not silently backfilled or
   reclassified by this change.

Rollback consists of reverting the framework release as a coherent change; no
new runtime state, ledger, trace, or workspace family requires migration. A C3
prepared Final Markdown workspace continues to use the existing `sweep`
recovery path, with the same backing evaluator reapplied before finalization.

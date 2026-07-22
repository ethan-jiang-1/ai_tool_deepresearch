# Plan Lineage And Design Convergence

> Parent plan: [User-Guided Research Controls, Question Closure, and Model-Led Evidence Judgment](../research-question-closure-and-evidence-judgment.md)
>
> Status: design history and archive accounting; it does not authorize framework behavior

## Why This File Exists

The parent plan combines concerns that were previously recorded in separate TODOs. This file makes the accounting explicit so that an archived document is never mistaken for an implemented capability merely because it has moved out of `_backlog/todos/`.

During the backlog reconciliation, the archive directory began to hold two deliberately different statuses:

- a completed TODO receives a `DONE-NNN` identifier;
- a standalone TODO absorbed by an active plan keeps its historical text there without becoming implemented.

Archive location alone is therefore not an implementation claim.

## Archive Audit

The four historical Markdown documents that explain the parent plan are accounted for below.

| Historical document | Archive status | What it contributes here | What the parent plan does **not** claim |
| --- | --- | --- | --- |
| [`todo-evidence-extraction.md`](../../_done/_done_todos/todo-evidence-extraction.md) | `DONE-015`, completed foundation | Submitted ledger authority, structural `countReferences()` / `isCountable()` facts, cache/provenance trails, and the distinction between structural coverage and later semantic judgment. | It is not an absorbed unimplemented feature, and Changes 1/2 do not redesign reference counting, source claims, cache trails, or actor submission contracts. Any remaining main-Agent/ledger parity gap must be proved separately. |
| [`todo-evidence-quality.md`](../../_done/_done_todos/todo-evidence-quality.md) | Absorbed standalone design input; not implemented | The question "structurally countable, but is this actually adequate evidence for the decision?" | It does not authorize a global `EvidenceQuality` record, per-source semantic score, or an `isSemanticallyCountable()` Gate branch. That concern is reframed as model-led, question-level judgment. |
| [`todo-explore-exploit.md`](../../_done/_done_todos/todo-explore-exploit.md) | Absorbed standalone design input; not implemented | The need to make a contextual choice among exploiting known evidence, exploring a new line, recording a limitation, or escalating through an existing lawful route. | It does not authorize `WaveStats`, saturation counters, a strategy projection, or an Engine controller that chooses research strategy. |
| [`todo-user-knowledge-hang.md`](../../_done/_done_todos/todo-user-knowledge-hang.md) | Absorbed standalone design input; not implemented | The missing user-owned criteria: what to seek, accept, exclude, analyze, and deliver for this particular run. | It does not authorize a live external `knowledge_pack_path`, bundle-copy synchronization, global default pack, RAG, or cross-run preference memory. |

The accounting is therefore **three directly absorbed standalone inputs plus one completed foundation = four lineage documents**. Only the structural foundation already exists in the framework. The three absorbed inputs became one active plan so that their unresolved intent is not mistaken for three independently delivered capabilities; Change 1 and Change 2 remain future OpenSpec work.

[`todo-phase-recover.md`](../../_done/_done_todos/todo-phase-recover.md) may also appear near these files because it was closed as `DONE-016` during the same backlog refresh. It is an adjacent operational result, not one of the four lineage documents: it provides bundle-truth recovery and does not supply a user-control, evidence-judgment, or question-closure requirement.

## What Was Preserved And What Was Retired

| Earlier concern | Preserved in the parent plan | Deliberately retired direction |
| --- | --- | --- |
| Evidence quality | The model judges whether evidence is direct, sufficient, independent enough, current enough, and candid enough for a material question under the recorded question/profile and supplied user controls when present. Existing structural provenance remains mandatory. | A universal source grade or a deterministic semantic verdict that would make a source globally countable or uncountable. |
| Explore versus exploit | The model makes a question-specific strategy decision, and a declared Wave1 carry-forward target must later receive a visible Wave2 disposition. | A separate `WaveStats` authority, queue strategy state, or Engine-generated research plan. |
| User knowledge / preferences | HITL1 records one durable, per-run, user-authored control brief in the existing host file; later Agents read that same source. | A live external file as runtime truth, a profile path/copy protocol, or a cross-run user-memory system. |
| Evidence extraction | Existing ledger, receipt, cache, and structural countability facts remain the deterministic substrate on which the model reasons. | Reopening the completed extraction change or treating semantic judgment as another structural countability rule. |

## Discussion History And Convergence

This history explains why the scope is intentionally narrow. It describes design rationale and constraints; it does not create a runtime contract or authorize implementation outside OpenSpec.

1. **The structural foundation came first.** `DONE-015` established declaration-first evidence capture, ledger ownership, structural countability, cache/provenance trails, and Gate consumption of submitted facts. That work solved the question of what evidence was formally submitted and structurally eligible. It also made the remaining gap clearer: a structurally eligible reference does not by itself answer whether a particular research question is adequately supported.

2. **Two apparently separate concerns exposed the same missing loop.** The evidence-quality discussion asked how to distinguish thin, indirect, stale, promotional, non-independent, or otherwise unsuitable material from evidence adequate for a claim. The explore/exploit discussion asked how the research should decide to deepen known evidence, open a new line, stop with a limitation, or use an existing escalation path after a Gate's structural minimum was met. Neither concern is correctly answered by adding another source counter.

3. **The unit of judgment moved from source to question.** A source may be strong for one claim and inadequate for another; a user may accept it for an exploratory map yet exclude it for a decision-grade answer. The useful question is whether the available evidence, under the run's priorities and constraints, is adequate for this material target. The model has the contextual reading and judgment needed for that decision. The Engine should preserve direct facts, validate identity/provenance/receipts, and prevent a declared handoff from disappearing, but must not become a second semantic researcher.

4. **Simplicity rules constrained the possible solution.** The project charter and the simple-reliable-control guidance reject a long derived control chain when direct facts and a capable model can do the work. That ruled out the attractive but premature designs of per-source semantic fields, `isSemanticallyCountable()` branches, `WaveStats`, saturation counters, a strategy controller, a parallel question ledger, and a separate quality Gate. The helper-oriented guidance further keeps ordinary research and lawful repair with the Agent, while reserving the user's role for genuinely new semantic or risk decisions.

5. **User control became the missing upstream input.** Different industries, organizations, and individuals can legitimately want different sources, exclusions, standards of persuasion, analytical lenses, and delivery forms. The model must not silently invent those criteria. At the same time, user context is not externally verified evidence, and a user instruction cannot override provenance, receipts, floors, host policy, or an Engine verdict.

6. **The initial "knowledge pack" idea became a durable run snapshot.** The earlier standalone TODO explored a path to a Markdown file, optional bundle copies, fixed sections, and perhaps a global default. Review against bundle-local runtime truth and reloadability showed that a live external reference would create a second authority and synchronization questions. The retained intent is simpler: HITL1 can accept ordinary conversation or a user-pointed local file, then records the applicable content as one faithful snapshot at `rb_plan.md## Constraints > ### User Research Controls`. Later phases read that host-file coordinate; they do not reread an external path.

7. **Scope and sequencing were narrowed.** When supplied, user controls become normal Wave0 search/evidence guidance, but Wave0 does not gain a new question lifecycle. First, Change 1 establishes the one durable user-control source from HITL1 through Seed, waves, delegated work, and Final, while preserving the normal no-controls path and legal host-file retention on rerun. Only after that route is exercised does Change 2 bind the Wave1 targets that the model explicitly carries forward to an existing Wave2 finding/disposition surface. Question closure is valuable even when no additional user brief was supplied. A possible Change 3 is conditional on real-run evidence that an irreducible question/finding fact is missing.

8. **Downstream evaluation remains downstream.** [`todo-final-output-eval.md`](../../todos/todo-final-output-eval.md) is not absorbed by this plan. When it becomes active, it should consume the recorded question/profile, supplied controls when present, visible question closure, and limitations for a HITL2 diagnostic rather than recreate source scoring, Wave statistics, or an automatic rerun controller.

9. **Free-text capture exposed a host-file boundary, not a new research mechanism.** `rb_plan.md` mixes user-readable narrative with a few template-owned Engine update/check locations. A faithful user snapshot can itself contain familiar headings, checkboxes, or required-fill-looking literals. The design therefore requires one bounded user-content region and shared template-owned locators for the existing registry refresh, Progress update, and required-fill inspection. This narrows false positives in current host-file handling; it does not turn free text into a schema, create a Markdown controller, or claim a new filesystem sandbox for delegated roles.

10. **Submitted provenance was separated from question-parent versioning.** The completed evidence foundation stores hash-valid `result.json` and declared output paths, then checks that named files remain present. It does not freeze the bytes of each Markdown output. The later question-closure discussion therefore rejected a tempting general artifact-version/ledger extension. The delegated `question-list.md` is intentionally not rewritten by supplementary work, so it cannot be the default current declaration after a legal intent change. Change 2 instead extends the existing Phase-owned `depth-review.yaml` with one bounded, current carried-forward-target projection; the successful Wave1 Gate normalizes it and the trace writer records that bounded receipt on the routed `gate_attempt`. Wave2 consumes the receipt, not mutable parent bytes, while each declared target identity still prevents an old finding from closing a changed target.

11. **Host-file mutation must leave reentry coherent.** The current setup-ready caller records its Gate attempt and checkpoint before it asks `writePlanProgress()` to change `rb_plan.md`. Because reentry compares the latest checkpoint's control-file hash with the live host file, that ordinary Progress update can immediately look like unexplained drift. Change 1 already has to centralize the host-file locator used by Progress, so it must make the bounded Progress write and one checkpoint agree on final plan bytes while retaining durable audit evidence before a checked Progress claim. If the final checkpoint cannot be produced, `enter-phase` must not consume the attempted `check.next`. Since the current route trace is append-only, Change 1 exploration must establish that outcome through one coherent existing commit/consumption path, not assume a later failed trace can retract an earlier success. This is a small ordering/failure-visibility correction in the existing trace/checkpoint path, not a reason to exempt `rb_plan.md` from drift checks or add a second checkpoint authority.

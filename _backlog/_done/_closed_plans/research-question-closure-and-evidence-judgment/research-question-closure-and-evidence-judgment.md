# User-Guided Research Controls, Question Closure, and Model-Led Evidence Judgment

> Status: active plan, ready for a focused OpenSpec exploration of Change 1; no framework behavior has changed yet
>
> Created: 2026-07-22
>
> Design constraints: `guidelines/project-charter.md`, `guidelines/evolution-simple-reliable-control.md`, and `guidelines/evolution-helper-oriented-agent.md`

## Purpose

Deep research should begin from the user's recorded research intent and follow the lifecycle of a **material research question**. When the user supplies them, explicit research controls refine that intent:

```text
user records a question, scope, and profile; optional controls state what additionally matters
  -> model judges adequacy and chooses exploit, explore, or a visible limitation
  -> Engine preserves direct facts and proves identity, provenance, receipts, and declared handoffs
```

The model is the semantic evaluator. The Engine remains the authority for deterministic contracts. This plan does not add a second research judge, a new controller, or a cross-run preference system. A run with no additional user controls keeps the current question/profile path; Change 2 never depends on a non-empty control brief.

## Plan Map

This file is the stable overview and entry point. Detailed rationale and candidate contracts live in the sibling directory so they can be read and revised independently.

| Read this when you need... | Detail document |
| --- | --- |
| The archive accounting, what was absorbed, what was completed, and why the design converged on this shape | [01 - Lineage And Convergence](research-question-closure-and-evidence-judgment/01-lineage-and-convergence.md) |
| The HITL1 user-control snapshot, ownership boundary, host-file route, and candidate Change 1 | [02 - User Research Controls](research-question-closure-and-evidence-judgment/02-user-research-controls.md) |
| The question-level judgment rationale and Wave1-to-Wave2 handoff contract for candidate Change 2 | [03 - Question Closure And Model Judgment](research-question-closure-and-evidence-judgment/03-question-closure-and-model-judgment.md) |
| Change order, observation before Change 3, non-goals, simplicity admission test, and final-output boundary | [04 - Sequencing And Guardrails](research-question-closure-and-evidence-judgment/04-sequencing-and-guardrails.md) |

## Archive Accounting

This plan has **three directly absorbed standalone design inputs** and **one completed structural foundation**. “Archived” does not mean all four are implemented.

| Historical document | Status | Relationship |
| --- | --- | --- |
| [`todo-user-knowledge-hang.md`](../_done/_done_todos/todo-user-knowledge-hang.md) | Absorbed, not implemented | Its per-run user controls become the HITL1 host-file snapshot in Change 1, not a live knowledge-pack path. |
| [`todo-evidence-quality.md`](../_done/_done_todos/todo-evidence-quality.md) | Absorbed, not implemented | Its concern becomes model-led adequacy judgment for a material question, not a source score or semantic countability branch. |
| [`todo-explore-exploit.md`](../_done/_done_todos/todo-explore-exploit.md) | Absorbed, not implemented | Its concern becomes a question-specific model decision and a visible Wave1-to-Wave2 disposition, not `WaveStats` or a strategy controller. |
| [`todo-evidence-extraction.md`](../_done/_done_todos/todo-evidence-extraction.md) | `DONE-015`, completed foundation | It supplies submitted-ledger, provenance, cache, receipt, and structural countability facts; this plan does not reopen that implementation. |

[`todo-phase-recover.md`](../_done/_done_todos/todo-phase-recover.md) is a nearby `DONE-016` archive item, but not a source of requirements for this plan. It remains out of scope.

## Core Decisions

- The user may express source/evidence policy, exclusions, analytical lens, decision criteria, and delivery needs in ordinary language. These guide the model but cannot override host policy, provenance, receipts, floors, or Engine verdicts.
- Change 1 records one durable per-run snapshot at `rb_plan.md## Constraints > ### User Research Controls`. A local file may be read at HITL1, but no live external reference survives afterward. New bundles express “no additional controls” in ordinary host-file prose; legacy bundles without the subsection remain on the current normal path. The dedicated subsection is the canonical detailed user wording for the shared research roles; any overlapping concise constraint summary is supporting presentation, not a second interpretation source.
- When controls are supplied, Seed, wave, delegated, and Final Agents use the same host-file source. The no-controls form keeps the existing question/profile path and adds no per-task payload or new task requirement. For affected delegated research work with controls, the existing `task_brief` may add one bundle-relative read-only input coordinate resolved from `_beacon.json#bundle_dir`; it does not copy the brief or create a new write/lifecycle authority. Focused exploration must prove that the generated task and role guidance can deliver this read before treating the route as sufficient.
- The host file must distinguish captured user content from template-owned structure. An embedded heading, checkbox, or required-fill-looking literal cannot redirect the canonical Topic Registry refresh, Progress update, or template-marker check.
- A sanctioned Engine mutation of `rb_plan.md` must not immediately invalidate the checkpoint that records its own Gate attempt. Change 1 must make the bounded Progress update and the one checkpoint agree on final plan bytes, while retaining durable audit evidence before a checked Progress claim. A `gate_attempt` carrying a non-null `next` must not be consumable through `enter-phase` unless the required final checkpoint exists. Because the current route trace is append-only, focused exploration must prove one coherent commit/consumption boundary from existing owners; it must not assume that a later failed attempt retroactively retracts an already written success trace. This corrects the current trace-plus-checkpoint ordering without creating another receipt or checkpoint authority. A failed or non-durable Progress write leaves the prior full plan intact and yields no checked Progress claim; reentry continues to reject later out-of-band drift.
- Structural countability is not semantic sufficiency. The model evaluates evidence in the context of the material question, recorded question/profile, and supplied user controls when present; the Engine validates only deterministic facts and declared handoff coverage.
- Wave0 receives supplied user-control guidance when present but does not receive a question lifecycle. Question closure starts with Wave1 targets and their Wave2 disposition.
- Change 2 must use one authoritative, bounded Wave1 declaration for explicitly carried-forward targets and extend the existing Wave2 finding route; it must not create a parallel ledger or strategy controller. The default Gate input is the existing Phase-owned `depth-review.yaml`, not the delegated `question-list.md`: it already has a current Wave1 review writer and Gate-owned repair coordinate. Its present filename fallback is not yet a UID-bound review resolver, so Change 2 must derive one selector from the accepted canonical Topic-layout facts before it may reuse an identifier-only renamed review. The successful Wave1 Gate freezes its normalized selected-target set as a small handoff receipt in the existing Engine trace; the trace writer must explicitly project that Engine-normalized receipt into the `gate_attempt` event rather than leave it only in a Gate result, `extraCheck`, or diagnostic. Wave2 consumes that exact routed receipt rather than treating the mutable source file as a second authority. It guarantees closure only for targets the model explicitly declares for carry-forward in a Change 2-opted-in current review, not automatic discovery of every possible question in prose. A binding must include canonical Topic identity and the receipt's canonical-intent binding, rather than relying on a mutable slug-looking string, and must not let a stale finding cover a revised target after rerun. An identifier-only layout change may reuse the single Change-2-selected UID-bound declaration only when the bound intent fields are unchanged, then emit a new receipt from it; an `update_intent`, or a layout title change that changes that binding, must produce a refreshed current review and new receipt before Wave2. Existing submitted work-unit coverage proves a result/receipt/path binding, not an immutable byte snapshot of each named output; the review declaration needs only a bounded target revision identity, not a general output-version ledger.

## Delivery Order

1. **Change 1 first:** explore the exact HITL1 write convention and read path. Prove the no-control form, host-file retention across every sanctioned writer, template-owned section isolation, and delegated delivery without adding a second state system or claiming a new filesystem sandbox.
2. **Exercise Change 1 in a real bundle:** confirm user controls stay visible and that a strict source policy reaches an already lawful limitation, degraded, HITL2, or held-checkpoint outcome without lowering an existing floor.
3. **Change 2 second:** only then explore the narrow Wave1 Gate-receipt-to-Wave2 finding-binding contract, using `depth-review.yaml` only as the Phase-owned Gate input and including current-round/legacy compatibility. Reuse the existing Wave2 finding/inspect/Gate path. It remains valid when Change 1 records no additional controls.
4. **Observe before any Change 3:** add a question/finding fact only if a real run demonstrates that the current guidance and structured surfaces cannot retain an irreducible decision-relevant fact across reloads.

## Proposed OpenSpec Changes

This plan should produce **two changes, in this order**. That is the smallest split that leaves each change with one complete, independently verifiable control loop.

| Order | Proposed change id | Proposed title | Why this is one change |
| --- | --- | --- | --- |
| 1 | `capture-user-research-controls` | Capture User Research Controls | HITL1 capture, one bounded `rb_plan.md` subsection, safe host-file locators/required-fill interpretation, retained reads at Seed/waves/delegated work/Final, and the setup trace-Progress-checkpoint ordering all modify the same durable host-file path. Splitting its safety/ordering work from capture would first create a user-content surface that current writers and checks can misinterpret. |
| 2 | `bind-wave1-target-receipts-to-wave2-findings` | Bind Wave1 Target Receipts To Wave2 Findings | The Phase-owned Wave1 declaration, its Gate-time normalization and routed trace receipt, and receipt-bound Wave2 finding coverage form one handoff contract. Splitting the producer from the consumer would either leave an orphan receipt or create a second parent authority, both contrary to the one-truth-path rule. |

There is **no planned third change**. The conditional item remains an observation trigger only: propose it only after a real bundle demonstrates one irreducible decision fact that the two completed loops cannot retain. Final-output evaluation remains its own future backlog concern rather than being folded into either change.

## Immediate Next Move

Start `/opsx:explore` for **Change 1 only**, using [02 - User Research Controls](research-question-closure-and-evidence-judgment/02-user-research-controls.md) as the detailed source. The exploration must identify the lawful behavior for an intentionally strict source policy, the exact sanctioned retention/write path, and the actual delegated read surface before any proposal claims that a prose limitation or user instruction can bypass a floor.

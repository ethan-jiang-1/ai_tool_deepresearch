# Sequencing, Evaluation, And Guardrails

> Parent plan: [User-Guided Research Controls, Question Closure, and Model-Led Evidence Judgment](../research-question-closure-and-evidence-judgment.md)
>
> Status: planning constraints for future OpenSpec work; no framework behavior has changed yet

## Delivery Sequence

The order matters as delivery sequencing, not as a runtime dependency. Change 1 proves the optional user-guidance path in isolation; Change 2 proves declared-question closure whether the run has an additional brief or only its existing question, scope, and profile. A model benefits from durable user criteria when supplied, but a user control alone is not enough unless declared questions also remain visible through later waves.

| Order | Work | Entry condition | Intended result |
| --- | --- | --- | --- |
| 1 | [`capture-user-research-controls`](02-user-research-controls.md) | Ready now for focused OpenSpec exploration. | One `rb_plan.md` host-file snapshot section with optional user-supplied controls, including no-controls and legacy compatibility, stays readable at Seed, waves, delegated work, and Final without new runtime authority. Captured Markdown cannot impersonate Engine-owned host-file sections or required-fill markers, and setup's Progress/checkpoint path leaves one coherent host-file hash while `enter-phase` cannot consume a route whose required checkpoint is absent. |
| 2 | [`bind-wave1-target-receipts-to-wave2-findings`](03-question-closure-and-model-judgment.md) | Change 1 has been exercised in a real bundle; focused exploration confirms the existing Phase-owned Wave1 review write/repair route, canonical-intent validity, receipt projection into the routed Gate trace, and a single UID-bound review selector built from accepted Topic-layout facts. | Every target in a successful current Change 2 Wave1 handoff receipt receives a visible Wave2 disposition through one bounded identity/binding contract. The Phase-owned `depth-review.yaml` is the Wave1 Gate input, not a second Wave2 authority. An identifier-only layout change may reuse one selector-confirmed eligible declaration and emit a new receipt; a title or intent change needs a refreshed current review and new receipt. Retained legacy handoffs remain on their existing compatibility path. The contract also works when Change 1 has no additional brief to apply. |
| 3 | Observe | Changes 1 and 2 have been exercised in one or more bounded real research bundles. | Determine whether the current user-control, question, finding, and limitation facts are enough before proposing any further state. |
| 4 | Conditional Change 3 | A real run proves a missing, irreducible question/finding fact prevents correct routing across reloads. | Add at most the smallest necessary question/finding-scoped fact; otherwise do nothing. |

## Observe Before Any Change 3

After Changes 1 and 2, run one or more bounded real research bundles and inspect the model's question-level decisions. Ask:

- Did the user's scope, source/evidence policy, and delivery needs remain visible through Final without becoming a duplicate state system?
- Did user-supplied Markdown remain inert with respect to Engine-owned host-file section updates and template-marker checks?
- Did a run with no additional control brief preserve its normal behavior while still making material question dispositions visible?
- Did model-declared material carry-forward targets remain visible through Wave2 and final handoff, without pretending to enumerate every possible prose question?
- After an authorized rerun changes a target, did the system distinguish historical evidence from the current target disposition rather than accepting a stale binding?
- Did the model correctly treat thin, promotional, stale, non-independent, indirect, or user-excluded material as insufficient for the relevant target?
- Could current fields (`confidence`, `independent_backing_refs`, `gap_status`, decision, refs, and prose rationale) explain the action taken?
- Is there a repeatable failure where a missing semantic fact, rather than missing judgment or poor guidance, prevents correct routing?

If those answers are satisfactory, there is no Change 3. The framework is better by staying small.

## Conditional Change 3: Only If A Real Question-Level Fact Is Missing

Create a third change only when a real run demonstrates that current model guidance and finding fields cannot retain a decision-relevant fact across reloads. The proposal must name the concrete failure and pass the simplicity admission test below.

The likely maximum shape is a **question/finding-scoped** adequacy assessment on an existing structured surface, for example an explicit sufficient/insufficient assertion with the already relevant backing and limitation refs. The Engine could validate its enum, identity, and bindings, but never decide whether the assertion is true.

It must not default to per-source `tier`, `substance`, `commercial_intent`, retention scores, or an `isSemanticallyCountable()` branch. A source-level field is justified only if the same irreducible fact is needed across multiple claim decisions and cannot be represented by the user brief, existing submitted provenance, and question/finding-level judgment.

## What This Plan Explicitly Rejects

The following are not pre-approved solutions:

- a live external knowledge-pack path, bundle-copy synchronization protocol, global default pack, vector store, RAG pipeline, or cross-run preference memory;
- an enum forest, source scoring scheme, or Markdown parser that tries to deterministically interpret the user's prose;
- a global `EvidenceQuality` object, universal source-tier score, or automatic semantic extension of `isCountable()`;
- `WaveStats`, saturation counters, novelty scores, or an Engine research-strategy controller;
- a second Wave1 question ledger, parallel queue, or separate quality Gate;
- a general per-output content-hash, artifact-version ledger, or revision controller merely to make Wave1-to-Wave2 handoff feel immutable; the Gate receipt needs only a declaration-scoped target revision identity, not a snapshot of delegated output bytes;
- automatic rerun, retry, source expansion, profile mutation, or mid-wave user checkpoint when the model sees a gap;
- duplicating the user brief into every task/manifest/result or treating a Seed projection as a replacement for the user's original words;
- using artifact `origin_refs[]`, a matching topic slug, or a historical finding as an implicit substitute for an explicitly declared current target binding;
- strict Markdown presentation requirements merely because they are easy to parse.

The existing `quality_min_tier`, `quality_min_substance`, independent-backing floors, counterexample requirements, and Wave2 confidence/gap fields remain useful model-facing inputs. They are not evidence that another scoring mechanism is needed.

## Simplicity Admission Test

Any eventual proposal must answer these before implementation:

1. What concrete silent-loss or unreconstructable-decision failure does the new fact catch that the recorded user brief (when present), existing Wave1 question reasoning/review, Wave2 finding index, work-unit ledger, and HITL2 route cannot?
2. Which existing authoritative surface owns the fact, and why is one new bounded projection necessary rather than a second ledger, external pointer, or parser of arbitrary prose?
3. Which old logic, duplicate check, or Agent memory burden does it remove or avoid?
4. What is the single nearest repair action when the check fails?
5. Which focused negative case proves that the new control path does not block correct research presentation or create a second success path?

Failure to answer these is a reason to improve the model-facing guidance or leave the current framework unchanged, not to add a controller.

## Relationship To Final Output Evaluation

[`todo-final-output-eval.md`](../../todos/todo-final-output-eval.md) should eventually consume the recorded question/profile, supplied user controls when present, question-closure evidence, and visible limitations. It should not recreate separate per-source or wave-level evaluators:

```text
recorded intent + supplied controls when present + question closure / visible limitations
  -> run-level diagnostic for HITL2
  -> human decides deliver versus rerun
```

HITL2 retains the semantic/risk decision. No part of this plan authorizes auto-rerun, profile mutation, queue mutation, or a new user checkpoint.

## Non-Goals

- No claim that all research questions can or should be deterministically enumerated.
- No claim that the Engine can detect a model's omission of a material question from free prose; Change 2 closes only the explicit carry-forward declaration chosen by the model.
- No automatic declaration that a user control, Wave1 target, or finding is important, resolved, or adequately evidenced.
- No retroactive block for a legacy bundle merely because it lacks a future optional control subsection or future carried-forward-target declaration; compatibility must preserve the current contract until a new current-round artifact opts into the new one. An opted-in artifact may explicitly declare no carry-forward targets, but it cannot use omission or an unaccepted parent file to claim legacy treatment.
- No redesign of structural reference countability, source claims, cache trails, or actor authoring contracts. Change 2 adds its declaration to the existing Phase-owned Wave1 review and its positive opt-in receipt to the existing Gate trace; it must not broaden that into a direct-output-contract or output-contract overhaul.
- No replacement of the current Wave1 supplementary-depth mechanism.
- No replacement of the current Wave2 triage loop, targeted work units, finding index, HITL2 route, or Final decision authority.
- No use of chat memory or an external live file as a cross-wave state source.
- No cross-run automatic learning of a user's preferences; that remains distinct from this per-run plan and is not justified here.

## Readiness And Next Move

The parent plan is ready to start `/opsx:explore` for **Change 1 only**. That exploration should inspect the exact HITL1 host-file write convention, no-controls/legacy form, sanctioned topic-state/rerun retention path, Seed-topic projection guidance, beacon-rooted work-unit delivery wording, and Final read path; it should prove that one `rb_plan.md` subsection is enough before adding any schema or task field.

After Change 1 has been exercised in a real bundle, explore and propose **Change 2** as the narrow routed-Wave1-receipt-to-Wave2 finding-binding contract. Do not propose Change 3 until those two changes expose a specific missing semantic fact.

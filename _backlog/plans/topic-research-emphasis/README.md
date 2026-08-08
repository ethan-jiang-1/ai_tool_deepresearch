# Topic Research Emphasis

> Status: active / first-order design settled; detailed design deferred
> Started: 2026-08-08
> Scope: future research-planning policy and UX. This is not an approved
> OpenSpec change, implementation contract, Gate rule, or bundle mutation.

## Purpose

Decide how a user can ask for unequal additional research across Topics without
turning source counts into a false proxy for quality, overwhelming the user
with controls, or making later reruns ambiguous.

The plan has two related but separate concerns:

1. **Research allocation**: after every Topic reaches the shared delivery
   baseline, where should optional additional research go?
2. **Evidence presentation**: can a reader see the difference between shared,
   Topic-specific, and cross-Topic evidence without mistaking the `reference/`
   filename prefix for a measure of effort?

Neither concern may be solved by silently lowering a Topic's baseline or by
using `scope_role` as a hidden proxy for research need.

## Current Strategic Shape

The first-order product direction is now coherent enough to stop expanding
implementation detail prematurely:

- Every Topic receives one common, evidence-backed delivery baseline; emphasis
  directs only additional work after that baseline.
- The user expresses emphasis in ordinary language and sees a concise,
  correctable Agent understanding, not a weight form or research-method menu.
- Existing HITL1/HITL2 and rerun carriers are reused before any new canonical
  structure is proposed.
- A future Gate can prove traceable focus coverage, while HITL2 remains the
  place to judge semantic usefulness.
- The remaining product-scale questions are rerun/history UX and reader-facing
  evidence presentation. Detailed commitment taxonomy, fields, thresholds, and
  implementation are deliberately deferred until those are settled.

## Confirmed Decisions

### D-001: Emphasis is incremental, not a different acceptance bar

Confirmed by the user on 2026-08-08.

`Topic research emphasis` means an optional request to invest more research in
one Topic *after all Topics have met the common delivery baseline*.

- It is not a per-Topic quality score, priority score, or source-count floor.
- It does not permit a less-emphasized Topic to fall below the baseline.
- It may guide later incremental work, including a rerun and a newly added
  Topic, but it does not reinterpret historical evidence as newly produced.
- The term replaces the ambiguous design shorthand "topic weight" in this
  plan. It is recorded in the repository glossary as a planning concept, not
  an implemented runtime field.

### D-002: Reuse the existing interaction points

Confirmed by the user on 2026-08-08.

Research emphasis is an optional decision at the existing HITL1 alignment
checkpoint and may be revised when HITL2 records a legal rerun rationale. It
does not create a third checkpoint, a mandatory Topic matrix, or a separate
approval loop.

- A user who makes no emphasis choice receives the balanced common baseline.
- A user may express an initial focus during HITL1 when they already know it.
- At HITL2, a user who chooses rerun states the selected existing Topics, the
  reason for renewed work, and any new Topic. The later `stop: no` rerun phase
  consumes that recorded rationale through the accepted rerun/topic-direction
  path; it does not ask a fresh question.
- Ordinary chat does not itself change a durable emphasis decision, lifecycle
  position, or mutation authority.

### D-003: Topic count follows the minimal independent map

Confirmed by the user on 2026-08-08.

Initial Topic count is not a fixed `3-5` target. The Agent recommends the
smallest independent research map that preserves distinct must-answer
questions, evidence routes, or downstream delivery value.

- A runnable research map has a lower bound of one approved canonical Topic.
  An empty registry remains valid only as a pre-HITL1 bundle scaffold; existing
  HITL1 and Seed Topics Gates already enforce the lower bound before work can
  begin.
- There is no preset upper limit. A genuinely broad landscape may need more
  than five Topics.
- When the proposed map is large, the HITL1 presentation groups related Topics
  into reviewable research threads and explains the split; it does not make the
  user manage a numeric count or budget.
- A Topic exists for semantic independence, not merely to balance effort. Topic
  research emphasis remains the later, separate choice about incremental work.

### D-004: Natural language is the primary emphasis control

Confirmed by the user on 2026-08-08.

The user-facing primitive is a `research focus brief`: plain language about
what they want to understand better for a selected Topic. The default remains
small, and detail unfolds only when the user needs it.

- The normal interaction does not expose weights, formulas, source floors,
  Wave names, queue state, or an effort-allocation spreadsheet.
- A user may add detailed constraints in ordinary language, for example desired
  source classes, excluded broadening, comparison dimensions, counterexamples,
  geography, time range, or delivery audience.
- The Agent translates that request into a concise, readable research direction
  and gives the user a chance to correct the interpretation at the existing
  HITL boundary. It does not pretend that a free-text request is a deterministic
  quality verdict.
- Advanced control is progressive disclosure through the same natural-language
  conversation, not a separate expert-only formula mode.

### D-005: Integrate with existing durable surfaces before adding structure

Confirmed by the user on 2026-08-08.

The first design must preserve the current run-bundle and Topic structure.
It should embed the `research focus brief` into existing HITL1, HITL2, and
legal rerun-direction records instead of first introducing a new canonical
Topic field, parallel settings object, Gate, or interaction step.

- Keep the user's literal natural-language request distinct from the Agent's
  concise, editable interpretation of the research direction.
- Reuse the existing planning/constraint record for the initial HITL1 request,
  and reuse the existing rerun rationale and per-Topic direction path for a
  HITL2 revision.
- At HITL1, the single existing literal snapshot may visibly contain two
  labelled parts: the user's exact focus wording and the Agent's concise,
  user-correctable interpretation. This is a presentation/authoring
  convention inside the existing carrier, not a new canonical Topic field.
- New structure is justified only if the existing surfaces cannot preserve the
  required user intent, revision history, and readable recovery context.
- This is a compatibility and UX constraint, not a claim that the current
  surfaces are already an approved implementation contract for emphasis.

### D-006: Gate verifies traceable focus coverage, not semantic correctness

Confirmed by the user on 2026-08-08.

For a Topic with approved research emphasis, a future deterministic Gate may
verify that each explicit focus commitment has submitted evidence backing or an
explicit, visible limitation. It must not claim to determine whether arbitrary
natural-language intent was substantively answered correctly.

- The Gate's user-readable result should be a compact coverage state such as
  `covered`, `partial`, or `blocked`, rather than a source-count score,
  weight, or LLM self-rating.
- Existing common-baseline and provenance Gates remain in force. Focus
  coverage is an incremental proof boundary, never a way to relax them.
- HITL2 remains the place where the user and Agent decide whether the result
  actually answers the user's intent and whether a rerun is needed.
- The compatible implementation candidate is an optional block in existing
  per-Topic `depth-review.yaml`, not a new canonical Topic field. It still
  requires a focused OpenSpec change before any schema or Gate behavior is
  altered.

### D-007: Emphasis buys a smallest necessary combination of research moves

Confirmed by the user on 2026-08-08.

Additional research is outcome-directed, not a request to mechanically add
sources. From the user's natural-language focus, the Agent selects the
smallest useful combination of work such as new evidence discovery,
verification, counterexample search, comparison, or synthesis.

- The user sees a short natural-language statement of what will be explored
  and can correct it; they do not choose from a long methods menu.
- A focus need not use every research move, and its combination should not be
  exposed as a formula, source-count target, or weight matrix.
- The selected work later becomes the bounded set of focus commitments whose
  traceable coverage is checked by the future Gate.

### D-008: Rerun preserves history and applies emphasis only to new increment

Confirmed by the user on 2026-08-08.

A rerun does not rewrite historical evidence, artifacts, or coverage as if
they were newly produced. A revised focus, refined Topic, or newly added Topic
directs only the incremental work of that legal rerun, with the resulting
evidence visibly attributable to the new increment.

- Historical work remains available as context and provenance, but does not
  silently satisfy a new focus commitment.
- The existing rerun direction path remains the place to translate the new
  focus into current per-Topic work; it does not create a second Topic identity
  or rewrite old references.
- Future reader-facing evidence presentation must make the baseline/historical
  material and the focus-driven increment distinguishable.

## Current Evidence

The inspected completed bundle is
`/Users/bowhead/ai_tool_deepresearch/dpt_rb_enterprise-ai-harness-platforms`.
It has five canonical Topics, `rerun_count: 0`, and all five are reported as
complete by the read-only canonical topic-state inspection.

The first audit is retained in
[evidence/bundle-observation-2026-08-08.md](evidence/bundle-observation-2026-08-08.md).
Its important result is that initial Wave0 source-record counts are nearly
uniform, while the reader-facing reference inventory and seed navigation are
not. Therefore allocation policy and reference-presentation repair require
separate decisions.

[evidence/seed-topic-count-policy-audit-2026-08-08.md](evidence/seed-topic-count-policy-audit-2026-08-08.md)
separately establishes that the current system has an Agent-facing `3-5`
initial-preview instruction, but no Engine/schema cap of five. The observed
five-Topic tendency is therefore plausible prompt anchoring, not a proven
runtime restriction or a measured population statistic.

[evidence/existing-carrier-surface-audit-2026-08-08.md](evidence/existing-carrier-surface-audit-2026-08-08.md)
maps the current HITL1 controls snapshot, HITL2 rationale, and rerun-direction
fields. The user has confirmed that one literal HITL1 snapshot may visibly hold
both the user's original wording and the Agent's separately labelled
interpretation.

[evidence/gate-coverage-boundary-audit-2026-08-08.md](evidence/gate-coverage-boundary-audit-2026-08-08.md)
separates the current deterministic baseline/provenance checks from the
unimplemented question of whether a focus request has traceable incremental
coverage. It does not claim that free-text semantic satisfaction is currently
Gate-verifiable.

## Constraints Already Established

- The selected research style owns shared numeric baseline parameters and is
  recomputed when canonical Topic count changes; a per-Topic semantic policy
  must not be smuggled into that complete style projection.
- `scope_role` describes delivery intent, not evidence need.
- A canonical Topic has a UID-bound registry and seed projection. Rerun
  already has sanctioned add/update/direction operations; any future emphasis
  design must compose with those rather than invent a second Topic identity or
  rerun authority.
- Agent judgment owns semantic research allocation. The Engine may only own a
  future structured contract or deterministic check after an approved OpenSpec
  change defines one.

## Deferred Design Questions

The first-order policy is deliberately paused here. Resume these only when
the product work returns to this plan, one decision at a time:

1. What reader-facing evidence view distinguishes shared, Topic-specific, and
   cross-Topic material, and makes incremental effort inspectable?
2. What exact rerun presentation lets a user revise, remove, or add focus
   without treating historical work as current incremental coverage?
3. Which parts, if any, later need a canonical Topic field, an Agent-facing
   Markdown control, or an Engine-enforced contract?
4. If an OpenSpec change is proposed, what is the smallest compatible scope
   that realizes the confirmed design without overloading current Gates?

## Document Layout

- `README.md`: durable scope, confirmed decisions, and open design questions.
- `evidence/`: reproducible observations from real completed bundles.
- Add a decision record or an ADR only after a hard-to-reverse trade-off is
  actually settled. An OpenSpec proposal is deferred until this design reaches
  a coherent, bounded behavioral change.

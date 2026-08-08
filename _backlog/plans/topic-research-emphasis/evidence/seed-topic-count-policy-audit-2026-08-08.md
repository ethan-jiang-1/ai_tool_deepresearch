# Seed-Topic Count Policy Audit

> Observed: 2026-08-08
> Scope: current Harness source, accepted current specs, tests, and Git
> history. No unselected historical run bundles were scanned.

## Question

Does the Harness require or otherwise enforce five seed Topics, explaining the
observed tendency for new research runs to receive five Topics?

## Finding

No Engine, schema, or Gate rule requires five Topics. There is, however, an
explicit Agent-facing HITL1 instruction that strongly anchors the initial
preview to a short range:

> 从 original topic 推导初始 topic preview（3-5 个可独立研究的子话题）

It appears in `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md`
within the one-sentence-input topic-rewrite path. A model following a bounded
range often selects the upper endpoint, so the observed five-Topic outcome is
plausibly caused by this instruction.

## What Is Not Enforced

- A new `rb_plan.md` template starts with `derived_topic_count: 0` and an empty
  `topic_registry`.
- `CanonicalPlanSchema` accepts an array of canonical Topics without a maximum
  length and requires only that `derived_topic_count` equal the array length.
- The schema test explicitly accepts a canonical empty registry; many
  deterministic tests construct one- and two-Topic bundles.
- Canonical topic-state supports later `add_topic` operations and recomputes
  style parameters from the committed length. It does not impose a count cap.
- Research-style parameters scale a shared-reference target by the actual
  Topic count. They do not select five or reject other counts.

The current runtime does enforce one lower boundary at the correct lifecycle
point: HITL1 and Seed Topics checks reject an empty canonical registry before
research can begin. The empty template is therefore a pre-decision scaffold,
not an executable zero-Topic research run.

The visible HITL1 brief asks the user to review a dynamic topic preview but
does not itself state a Topic count. The `3-5` wording is in the Agent's
operating instruction, so it affects generation rather than validating user
input.

## History

Git blame identifies the current `3-5` sentence as introduced on 2026-07-12
in commit `dde688c9fc` (`establish-canonical-topic-state / C3A`). The commit
established canonical Topic identity and safe plan/seed mutation. Its message
does not state a product rationale for choosing the numeric range, so the
number should be treated as inherited guidance, not a consciously revalidated
policy.

An older archived reference-format design described Topic counts as "usually
5-10" for flat-directory manageability. That is historical design prose, not
an active schema, Gate, or current count rule.

## Evidence Boundary

The supplied completed bundle has five Topics, but one run cannot measure a
population tendency. A genuine distribution claim would require a separately
authorized inventory of selected real run bundles or durable aggregate
telemetry. This audit deliberately does neither.

## Consequence for the Design

Topic count and Topic research emphasis are related but distinct:

- **Topic count** decides the shape of the research map: when independent
  questions deserve separate durable Topics rather than one broader Topic.
- **Topic research emphasis** decides where to spend incremental effort after
  that map's common baseline is complete.

The future UX must replace the unexplained `3-5` default with an
explainable, recommendation-first decomposition rule. It should allow a small
topic set for a narrow question and a larger set for a genuinely independent
multi-part landscape, without asking the user to manage a numeric budget.

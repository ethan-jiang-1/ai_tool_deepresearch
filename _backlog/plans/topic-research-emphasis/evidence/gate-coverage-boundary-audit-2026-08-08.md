# Gate-Coverage Boundary Audit for Topic Research Emphasis

> Observed: 2026-08-08
> Scope: read-only inspection of the current Harness source and design
> reasoning. This is not an approved Gate, schema, or implementation change.

## Question

When a user expresses Topic research emphasis in natural language, what can a
deterministic Gate honestly establish about whether the extra research was done
correctly?

## Current Deterministic Coverage

The current Harness already has strong deterministic checks for the common
baseline and rerun mechanics:

- HITL1 and Seed Topics require at least one approved canonical Topic before
  research begins.
- A matching rerun direction has required, non-empty fields for new research
  dimensions, adjusted depth, search guardrails, and an excerpt grounded in
  the recorded HITL2 rationale.
- Wave1 requires submitted evidence-summary and question-list artifacts,
  identity-bound reviewed work units, cache/provenance backing, and a
  profile-derived new-source floor for every Topic.
- Wave1's depth review requires mechanism, trend/difficulty, and
  limitation/dispute dimensions, plus any profile-required counterexample or
  cross-verification checks.
- Wave2 validates finding/backing consistency, evidence-receipt requirements
  for targeted work, and explicit unresolved/deferral states.

These controls can deterministically answer whether the run has real,
traceable, baseline-compliant evidence work. They are deliberately stricter
than a source-file count and do not treat a reader-facing `reference/` layout
as evidence authority.

## What Current Gates Cannot Establish

No current Gate links a literal `research focus brief` to a selected Topic's
incremental evidence, and no deterministic parser can infer from arbitrary
user prose whether the Agent's research answer is substantively right. A Gate
that claimed otherwise would be checking an LLM's interpretation rather than a
direct runtime fact.

This produces two distinct questions that must not be collapsed:

| Question | Honest owner | Possible result |
| --- | --- | --- |
| Did the system perform verifiable incremental research for the approved focus? | Engine / Gate | `covered`, `partial`, or `blocked`, based on declared commitments and submitted evidence or explicit limitation. |
| Does the result actually answer what the user meant and remain useful? | User and Agent at HITL2 | Semantic approval, correction, or rerun rationale. |

The first is a valid deterministic boundary. The second remains a human/Agent
judgment; it must not be relabelled as a machine `pass`.

## Smallest Plausible Deterministic Extension

If stronger focus-specific assurance is required, the smallest compatible
extension appears to be an optional focus-coverage block inside the existing
per-Topic `artifacts/wave1/{topic}/depth-review.yaml`, only for a Topic with
an approved focus brief or current rerun direction. The depth review is
already the Phase-owned process-evidence surface that binds reviewed submitted
work units, evidence novelty, research dimensions, and a closed decision.

The future block would not parse natural language. It would contain a small
Agent-authored list of explicit focus commitments, each with:

- a readable statement derived from the user-corrected interpretation;
- a controlled completion status such as `covered`, `partial`, or `blocked`;
- links to existing submitted work-unit/evidence/finding coordinates, or an
  explicit limitation when evidence is unavailable.

The Engine could then deterministically verify direct facts: a focus topic has
a current direction, every declared commitment has a legal status, `covered`
items point to valid submitted backing, and unresolved items are visible
instead of silently counted as success. It can expose a compact coverage
range, rather than a false binary semantic verdict. Whether `partial` or
`blocked` blocks an existing Wave completion, passes with a visible limitation,
or triggers another existing legal route is not yet decided; this design does
not create a new lifecycle branch.

This is only a design candidate. It needs an OpenSpec change because it adds
new accepted fields and a Gate behavior. It should not be implemented by
ad-hoc prose or permissive parsing.

## Confirmed Design Direction

The user selected **traceable focus coverage** on 2026-08-08. A future design
therefore retains the current baseline Gates and adds a narrow, internal
focus-coverage check: each declared focus commitment has provenance-backed
work or an explicit limitation, while HITL2 remains the semantic usefulness
decision.

Neither the user interaction nor the compact Gate result exposes formulas,
source-count sliders, Wave names, or a weight matrix. This is a future
OpenSpec direction, not a current implementation claim.

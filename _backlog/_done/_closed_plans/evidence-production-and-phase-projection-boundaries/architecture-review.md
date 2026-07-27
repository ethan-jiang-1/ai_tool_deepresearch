# Architecture Review: Evidence Ownership And Seed Authoring

## Purpose

This note is the detailed reasoning behind the plan. It is not an accepted
contract and does not authorize code edits. Its job is to prevent the same bug
family from being rediscovered under a different Wave filename.

It was revised through 2026-07-27 after the parent plan's premises were checked
against current code. Three bounded OpenSpec changes are now archived. This
note preserves the reusable seams and rejected designs behind that work; the
parent plan's execution queue and handoff cards are authoritative for remaining
work. Where this note and the parent plan's verified code-fact list disagree,
the parent plan wins.

## Design Review Before Change Splitting

The completed work was deliberately split by source of record, not by filename
or individual gate failure. It produced three archived changes: canonical seed
authoring, queue demand admission, and narrow Wave0 shared-reference guidance.
The remaining queue is not a fourth cross-Wave change: it is one floor-policy
decision, two dormant runtime-evidence investigations, and an accepted
degradation-policy record.

| Direction | Canonical seed authoring | Queue demand admission | Evidence ownership and projections |
| --- | --- | --- | --- |
| Source of record | `rb_plan.md#/topic_registry` | work-unit assignment-contract registry | submitted output ledger |
| Semantic precision | Which seed fields mirror the canonical Topic, and which remain Agent-authored enrichment? | Is this demand claimable, and if not, what terminates it? | What legal authority establishes this artifact — a new submitted acquisition, an existing-backed Phase projection, or neither? |
| Simple reliable control | Registry -> existing topic-state merge -> existing evaluator -> same completion checkpoint. No second linter, hash, writer, or repair controller. | One admission evaluator -> enqueue, health, claim. No duplicate validator, no new terminal op. | Direct submitted facts -> one ownership classification -> existing inspect/gate and degradation helper. No second ledger or Wave-specific bypass policy. |
| Helper-oriented responsibility | The Agent performs content work and supplies structured enrichment; the Engine preserves identity and reports the binding root. | The Engine answers claimability once; the Agent is not made a queue-file editor. | The Agent executes legal queue/submit and projection work; the Engine classifies backing and returns the nearest legal repair. |

Combining any two completed changes would have created a shallow module whose
callers must learn two unrelated contracts to repair either. A later Wave1 or
Wave2 repair must be proved from its own current runtime counterexample; it
shall not be opened merely because the two paths share an ownership helper.

BUG-131 is not a further semantic level. The accepted degradation helper already
answers its bounded question after a root has been classified, and Wave0/Wave1
declare eligible floors while Wave2 declares none — so the observed split is the
policy working, not a defect. This plan fixes the upstream false classification
and preserves the fail-closed authority roots. It does not propose a new
degraded mode, human override, or extra HITL transition — and therefore leaves
the pre-HITL2 deadlock in place, which the parent plan records as residual risk
rather than as solved.

## The Repeating Failure Shape

Every bug in scope is an authority mismatch:

| Artifact | What it actually represents | Incorrect old assumption | Correct deterministic question |
| --- | --- | --- | --- |
| Seed identity frontmatter | canonical Topic mirror | Agent prose/YAML to validate later | Does this equal the registry-owned Topic? |
| Wave0 `source.yaml` | newly acquired evidence | ordinary file | Was it produced and submitted by a legal work unit? |
| Wave0 `00-shared-*` | **open — either a cross-topic foundation acquisition or a projection of already-submitted topic sources** | topic output only | Which of the two is it in this instance, and does the corresponding backing exist? |
| Wave1 topic reference | reader-facing rendering of submitted evidence | undeclared delegated evidence | Does it resolve to submitted source/cache backing? |
| Wave2 synthesis/cross reference | Agent judgment over prior accepted evidence | undeclared Wave2 evidence | Does it expose required process and prior-evidence backing? |
| Wave2 targeted evidence | new evidence collected for a finding | pure synthesis | Does the finding have a submitted targeted attempt? |

The answer is not a single boolean named "provenance". It depends on whether
the artifact asserts a new acquisition event or only renders an already
accepted input. That distinction changes the legal writer, required receipt,
and repair path — and for `00-shared-*` the plan must first decide which of the
two it is, because the current design assumes one answer without arguing it.

## Existing Seams To Preserve

The repository already contains useful deep modules. The plan must make callers
converge on them rather than build parallel abstractions.

1. `evaluateSeedTopicAuthoring()` compares one seed file to its resolved
   canonical Topic. Queue completion, topic-state inspection and the seed gate
   already call it.
2. **`renderSeed()` already performs the canonical-preserving merge and single
   YAML serialization** (`canonical-topic-state.mjs:227-240`). Change 1 exposes
   it; it does not build it.
3. `classifyReferenceAuthority()` already distinguishes submitted reference
   outputs, Wave1 Phase projections and Wave2 existing-backed cross
   projections. It returns the closest backing failure for an unbacked file.
   **Both the Wave1 and Wave2 projection branches already pass backed files**,
   and `ref-count` already counts them — so a bug that looks like "projections
   are not routed" is more likely a missing-backing bug.
4. `evaluateWaveDegradationEligibility()` already reads rule metadata and
   separates eligible quality floors from authority roots.
5. Work-unit claim preflight already resolves assignment contracts before a
   record is created. Enqueue's validator covers only `wave1_topic_deepening`
   and trusts the card's own topic binding; this is the correct place to extract
   queue admission.
6. `operate-queue repair --remove-stale` is an existing terminal path whose
   staleness predicate is too narrow. Extend it rather than adding an operation.

The implementation work is therefore convergence, plus at most one missing
producer contract whose necessity is not yet established — not a new global
registry or generic relation language.

## Change 1 Interface

`canonical-seed-authoring` keeps a single writer family: topic-state.

```text
Topic registry  -> topic-state seed renderer -> canonical frontmatter envelope
Agent JSON-like structured enrichment input -> topic-state enrichment operation -> allowed enrichment fields
Agent Markdown body -> seed file body
                         |
                         v
                   evaluateSeedTopicAuthoring
```

The enrichment operation accepts only a selected topic identity and allowed
enrichment object. It reads the canonical registry itself, validates the input,
reuses the existing `renderSeed()` merge, serializes YAML once, and returns the
seed coordinate. It rejects canonical identity keys in input. It does not judge
hypothesis, scope or research quality.

This is needed because current topic-state rendering already creates mutable
frontmatter enrichment placeholders. Asking the Agent never to edit YAML would
otherwise remove required search guardrails/evidence-route data without
providing a legal writer.

One open question the delta spec must settle: `in_scope`, `out_of_scope` and
`evidence_route` exist both as frontmatter placeholders and as body prose
sections (`canonical-topic-state.mjs:129-143` vs `:166-176`). Making the Agent
author the same judgment on two surfaces is itself a source of drift. Pick one
authoritative surface before adding a writer for the other.

## Change 2 And 3 Interfaces

### Queue Admission (Change 2)

`admitQueueDemand(bundle, card)` is a pure internal module returning either a
normalized admissible demand or one primary direct root. It owns:

- bundle and current Topic/finding binding, resolved against the canonical
  registry at both boundaries;
- kind-specific assignment contract and required outputs, for *every* kind;
- actor-role compatibility; and
- whether a card is safe to persist as unclaimed runtime demand.

`enqueue`, queue health inspection and claim preflight call it. Claim still
performs a fresh admission against current runtime facts before allocation; it
does not trust an old enqueue verdict. This is one interface with two time
boundaries, not duplicate validators.

Two extraction details the delta spec must handle: the underlying resolver
signals by `throw`, so a verdict-shaped return is a real refactor rather than a
rename; and `staleReason()` should consult the same verdict so the existing
`repair --remove-stale` terminates unclaimable cards.

### Resolved Shared-Reference Producer Question

Step 0 confirmed that `wave0_source_intake` may declare and back a
`reference/00-shared-*.md`. Change 3 aligned the repair feedback and producer
guidance with that existing path. A `wave0_shared_foundation` work-unit kind or
an `operate-queue` shared-demand operation is therefore rejected: it would add
an authority surface that the current Engine does not need.

D1 is complete. The maintainer retained `claim_verification`'s
`base 6 + per_topic 2` formula, producing 22 for eight topics, and accepted its
eligible-degradation cost. There is no Wave0 implementation change. A future
formula change requires a new product decision and then a floor-only OpenSpec
change.

### Ownership Classification

No universal cross-format metadata field is introduced. Reference authority is
already a mature seam with Wave-specific adapters because the facts differ:

- Wave1 requires source/cache URL plus submitted locator evidence.
- Wave2 existing-backed cross references require prior accepted URL, `W2F`
  process references and submitted prior-wave locators.
- New Wave2 evidence requires targeted submission.

The completed work preserved this classification. Synthesis/finding-index
evaluation keeps its separate structured contract and distinguishes prior
evidence from targeted attempts. I1/I2 are the only routes for demonstrating a
current implementation drift in either branch.

## Degradation Is Downstream Of Ownership

BUG-131 must not create a human override. The ordering is:

```text
direct artifact facts -> ownership classification -> primary root projection
                      -> existing shared degradation eligibility -> routing
```

A false bypass is repaired by correct classification and then passes normally.
An unbacked projection, malformed finding index, missing targeted receipt or
queue defect remains a fail-closed authority root. The current shared helper
allows only definition-owned eligible quality floors after its fatigue
threshold; active Wave2 does not currently declare one. This makes the three
Wave outcomes explainable without weakening their different direct contracts.

## Rejected Designs

| Rejected design | Why it fails the system model |
| --- | --- |
| Let every Phase-written reference count | Turns arbitrary prose into evidence authority and loses acquisition provenance. |
| Require every projection to have a new work unit | Fabricates delegated execution, duplicates evidence work and contradicts pure synthesis. |
| A generic projection ledger/relation | Hides Wave1 and Wave2's materially different backing facts behind a shallow, caller-heavy interface. |
| Cross-topic sentinel in topic-bound intake | Keeps an exception inside the wrong contract and leaves assignment/preflight ambiguity. |
| Queue-only validation | Allows persistence of a card whose later claim facts are invalid; the admission interface must be shared and freshly rechecked. |
| Human override or earlier HITL for hard failures | Replaces deterministic authority with consent and creates another lifecycle/control path. |
| A standalone seed YAML linter | Finds syntax sooner but retains the impossible identity-copy obligation and duplicates the existing evaluator. |

### Resolved Alternatives

The completed falsification rejected both a new shared-reference work-unit kind
and a queue demand operation. A `00-shared-*` file may conceptually be a
projection of submitted topic evidence or a new acquisition, but the accepted
Wave0 path does not introduce a separate deterministic cross-topic coverage
contract. No later Agent may revive either design without a new selected runtime
fact and a separately scoped OpenSpec proposal.

## Completion And Remaining Gates

Step 0 completed: the existing Wave0 producer is legal, the repaired focused
proof passes, and no new producer subsystem is justified. Changes 1, 2 and 3
are archived. There is no active cross-Wave ownership change.

The parent plan now governs the remaining order:

1. D1 is complete: the maintainer retained the style formula, so it created no
   OpenSpec change.
2. I1 and I2 are bounded current-bundle counterexample investigations. They may
   create a Wave1 or Wave2 repair only if the selected bundle contradicts the
   accepted backed-projection or pure-synthesis contract.
3. P1 retains the accepted degradation policy and records the pre-HITL2
   deadlock as residual risk; it is not an implementation change.

The completed proof set establishes that a direct Wave0 shared-reference orphan
does not count, a submitted declared one does, and a backed Wave1 Phase
projection counts. It does not establish a Wave1 or Wave2 runtime defect. Any
future proof obligation must be the specific counterexample defined in the
parent handoff card; do not add a broad E2E or a new cross-topic contract by
analogy.

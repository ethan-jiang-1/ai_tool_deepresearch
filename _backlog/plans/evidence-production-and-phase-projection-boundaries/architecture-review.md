# Architecture Review: Evidence Ownership And Seed Authoring

## Purpose

This note is the detailed reasoning behind the plan. It is not an accepted
contract and does not authorize code edits. Its job is to prevent the same bug
family from being rediscovered under a different Wave filename.

It was revised on 2026-07-26 after the parent plan's premises were checked
against current code. Two premises were falsified and one design question was
re-opened; the affected subsections are marked. Where this note and the parent
plan's verified code-fact list disagree, the code-fact list wins.

## Design Review Before Change Splitting

The plan is deliberately split by source of record, not by filename or by
individual gate failure. It now has three changes plus one investigation step,
because the same criterion that separated seed authoring from evidence
ownership also separates queue admission from both.

| Direction | Canonical seed authoring | Queue demand admission | Evidence ownership and projections |
| --- | --- | --- | --- |
| Source of record | `rb_plan.md#/topic_registry` | work-unit assignment-contract registry | submitted output ledger |
| Semantic precision | Which seed fields mirror the canonical Topic, and which remain Agent-authored enrichment? | Is this demand claimable, and if not, what terminates it? | What legal authority establishes this artifact — a new submitted acquisition, an existing-backed Phase projection, or neither? |
| Simple reliable control | Registry -> existing topic-state merge -> existing evaluator -> same completion checkpoint. No second linter, hash, writer, or repair controller. | One admission evaluator -> enqueue, health, claim. No duplicate validator, no new terminal op. | Direct submitted facts -> one ownership classification -> existing inspect/gate and degradation helper. No second ledger or Wave-specific bypass policy. |
| Helper-oriented responsibility | The Agent performs content work and supplies structured enrichment; the Engine preserves identity and reports the binding root. | The Engine answers claimability once; the Agent is not made a queue-file editor. | The Agent executes legal queue/submit and projection work; the Engine classifies backing and returns the nearest legal repair. |

Combining any two would create a shallow module whose callers must learn two
unrelated contracts to repair either. Conversely, splitting evidence ownership
into Wave0, Wave1, and Wave2 changes would duplicate the same ownership
question while hiding necessary Wave-specific backing facts inside three
parallel checks.

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

### Shared Foundation Demand (Change 3, contingent)

**Contingent on Step 0 in the parent plan.** The engine appears to already
permit a `wave0_source_intake` unit to declare and back a
`reference/00-shared-*.md`, in which case nothing in this subsection is needed.
It is retained only as the design that applies if a falsification run shows a
hard engine rejection.

If it is needed, the `operate-queue` shared-foundation demand operation is
intentionally narrow: it reads the configured floor and submitted coverage,
creates exact missing cards, and reports what it created. It cannot select
sources, declare success, advance a phase, repair a work unit, or schedule a
turn. Those remain Agent Flow and existing work-unit responsibilities.

One reference per demand keeps the submitted output, cache trails, source URL,
Topic binding and count-floor contribution in one inspectable unit. The active
queue window controls concurrency.

The floor itself is a separate, currently unowned decision. It is not an
incidental number: `claim_verification` declares `base 6 + per_topic 2`
(`schema/research-styles/claim_verification.json:4`), which is where the
observed 22-for-8-topics demand comes from, read through
`threshold_source: rb_profile.yaml#/research_style_params/wave0_shared_ref_total`.
BUG-128 names that formula as its primary root cause. A legal producer path
makes 22 reachable; it does not make it reasonable, and no change in this plan
currently owns adjusting or explicitly keeping it.

### Ownership Classification

No universal cross-format metadata field is introduced. Reference authority is
already a mature seam with Wave-specific adapters because the facts differ:

- Wave1 requires source/cache URL plus submitted locator evidence.
- Wave2 existing-backed cross references require prior accepted URL, `W2F`
  process references and submitted prior-wave locators.
- New Wave2 evidence requires targeted submission.

The change makes all reference coverage and bypass scans consume this existing
classification before emitting a root. Synthesis/finding-index evaluation keeps
its separate structured contract, but must use the same distinction when it
decides whether a receipt belongs to prior evidence or a targeted attempt.

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

### Two designs this review previously failed to consider

Both were proposed in the bug records and dismissed by assertion rather than
argument. Neither can be rejected until Step 0 runs.

**Shared reference as a Wave0 Phase projection** (BUG-124, 中期建议 2). If a
`00-shared-*` file is derived entirely from already-submitted topic-bound
`source.yaml` evidence, it makes no new acquisition claim, and by this plan's own
model that is the definition of a projection. Extending the projection branch to
`00-shared-` — which `isWave1TopicReference` explicitly excludes today
(`gate-helpers-checks.mjs:225`) — is strictly cheaper than a new work-unit kind
and a new CLI operation. The counter-argument is that a shared reference may
require genuinely new cross-domain sources. Both cases are real, which suggests
shared references are **two authority classes, not one**, and that forcing them
into a single producer repeats the error this plan diagnoses elsewhere.

**Shared reference as an ordinary extra output of `wave0_source_intake`.** The
engine already permits this (see the parent plan's falsified-premise list). If
Step 0 confirms it, the entire `wave0_shared_foundation` design is answering a
question the engine does not ask, and BUG-124 collapses to a wrong `repair`
block in a gate definition plus a `"optionally"` in producer guidance.

## Change Order And Proof

Step 0 comes first and is an investigation, not a change: it decides whether
Change 3 contains a new Wave0 producer at all, and whether BUG-129 belongs to
classification or to the Wave1 producer contract. Running it costs one
disposable bundle and can delete an entire subsystem from the plan.

Change 1 is independent and reduces authoring fragility before the first Wave.
Change 2 is independent of both and is a prerequisite for any new demand kind.
Change 3 is one cross-Wave ownership change because its caller-facing question
is the same at every Wave: "what authority establishes this artifact, and what
is the next legal action if it does not?"

Every change should prove direct negative cases, not only successful output.
Each bullet below must be traceable to the bug it closes:

- identity input containing `must_answer` is rejected without mutating a seed
  (BUG-126/127);
- a malformed enrichment input is rejected before a queue completion attempt
  (BUG-126);
- a `must_answer` rewrite is reported when it is written, not only at completion
  (BUG-127);
- a card that fails admission cannot be persisted at enqueue, for every kind,
  and the same root appears at claim (BUG-125);
- an unclaimable unclaimed card is terminated by a legal operation rather than
  by editing the queue file (BUG-125);
- a manually written `00-shared-*` file remains uncountable (BUG-124);
- a submitted-and-declared `00-shared-*` file counts, and the gate hint names
  that path rather than a direct write (BUG-124/128);
- a valid Wave1/Wave2 Phase projection passes without a fake work unit
  (BUG-129/130);
- the same file without its required submitted backing fails the named root
  (BUG-129);
- a finding that needs new Wave2 search cannot pass with only Wave1 refs, and
  Wave1 backing is never accepted as a forged Wave2 receipt (BUG-130); and
- the same ineligible authority root remains fail-closed across Waves
  (BUG-131).

Note what is deliberately absent: there is no proof obligation for "a shared
card missing cross-topic binding is rejected", because no checker verifies
cross-topic coverage today and this plan does not yet decide whether one should.
Do not add that proof without first answering the classification question above.

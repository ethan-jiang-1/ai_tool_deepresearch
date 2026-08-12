## Context

See `proposal.md` for motivation. The implementation has one deterministic fact
family: `wave.submitted-reference-convergence`. Its Source of Record is the
existing evaluated relationship among reviewed submitted Wave1 backing,
canonical reference projections, the reference index, and an existing
supplementary demand. `depth-review.yaml#reviewed_work_unit_refs` remains the
Phase-owned binding into submitted authority; it does not become a second
source/cache/floor authority.

The affected surfaces already exist:

| Surface | Existing responsibility | Change-local repair |
| --- | --- | --- |
| `wave1-reference-convergence.mjs` | Resolves submitted backing, candidate projections, convergence outcome, and unreviewed submitted supplementary rows. | Give unusable backing precedence over synthetic guards; pass the canonical slug; restrict the review-sync detector to current hash-valid submitted supplementary assignments. |
| `wave-contract-evaluators.mjs` | Converts the convergence result into public inspect/Gate findings. | Keep `reference_floor_deficit` identity, but make the named depth-review update the primary repair when an unreviewed supplementary row explains the deficit; reuse existing prerequisite masking. |
| `phase-wave1.md` | Agent-readable use of existing legal operations. | State `submit -> valid depth review -> inspect -> exact-target materialization -> index/seed sync -> same inspect`. |
| `operate-topic-state.md` | Authoring guidance for accepted Wave0 packets. | Clarify the one-contribution deferred form without altering the writer grammar. |

## Goals / Non-Goals

**Goals:**

- Restore one reachable, root-first Wave1 closeout loop using only existing
  submit, review, inspect, persistence, index, packet, and rerun operations.
- Make a missing review show as one direct public prerequisite rather than a
  generic dependent symptom.
- Make an omitted submitted supplementary row direct the Agent to update the
  existing depth review before treating its floor deficit as acquisition work.
- Retain exact inspect-provided materialization targets and the existing
  contribution-scoped Wave0 deferred grammar.

**Non-Goals:**

- No new resolver, queue kind, Gate rule, state/status, CLI, locator grammar,
  batching schema, retry tree, or evidence authority.
- No change to `reference_floor_deficit`, its rule identity, packet slot
  uniqueness, contribution intervals, or the Agent's semantic reference prose.
- No public guarantee for locator `48` token / `12` digest constants and no
  Agent-side filename reconstruction.

## Decisions

### D1. Reorder the existing convergence guards, not the fact model

`evaluateWave1ReferenceConvergence` will check a concrete unusable
`submittedBacking` result before synthetic null-Topic or missing-profile guards.
The backing reader's own canonical-topic root remains authoritative when that
is its result. The existing Wave1 evaluator will extend its current
depth-review prerequisite masking so derived count-floor/topic-invalid feedback
does not appear alongside the missing-review root.

This preserves the direct parent fact and creates no new checker. An alternate
prerequisite evaluator was rejected because it would duplicate backing
resolution and force inspect/Gate to reconcile two outcome owners.

### D2. Keep supplementary sync as a projection of the existing floor outcome

The supplementary detector will receive `submittedBacking.topic.topic_slug`,
consider only current hash-valid submitted `wave1_topic_deepening` rows whose
validated manifest assignment mode is `supplementary`, and compare them with
the existing reviewed refs through the same submitted-row `work_id`,
`work_unit_ref`, or `result_ref` coordinate equivalence (including existing
trailing-slash canonicalization). On a `reference_floor_deficit` with such rows, the formatter
will put the exact `depth-review.yaml#reviewed_work_unit_refs` update in its
primary `write_to` and repair. It will retain the current outcome/rule ID and
may continue to surface the enqueue payload only as a later action after review
sync.

Treating all unreviewed primary rows alike is rejected: the signal means a
supplementary submit has not joined the review binding, not that primary
submitted authority should be reclassified. Emitting a new `review_sync` result
is rejected because the floor outcome already carries the relevant convergence
fact and feedback shape.

### D3. Make Phase order explicit and consume inspect output

The phase document will put valid review before the first post-submit
convergence inspect. After the inspect identifies materializable backing, the
Phase Agent uses its exact target, persists through the current boundary,
synchronizes the existing index/Seed projection, and reruns the same inspect.
The document does not repeat or expose locator implementation constants.

Changing REF-011 to include `48`/`12`, or adding a locator CLI, is rejected:
REF-011 already expresses the stable property and WAI-010 already gives the
Agent the exact target. Pinning the values in an implementation regression
protects behavior without creating an accidental authoring contract.

### D4. Keep Wave0 clarification strictly documentary

The playbook will say that multiple explicit entries can share one update, the
deferred form selects one contribution per packet, and multiple deferred
contributions use sequential applies. The existing integration coverage proves
two sequential applies and final inspection; it will not imply an inspection
between the applies.

Adding `deferred_contributions[]`, relaxing the slot guard, or inventing
atomic batching is rejected because each would change writer collision,
idempotency, and transaction behavior with no demonstrated need.

### Constitutional Review

- **Semantic precision:** the bounded reader question is "what existing repair
  must happen before this current Topic can make a truthful convergence claim?"
  The answer stops at a submitted-backing root, a valid depth-review binding,
  or an exact existing convergence action. No state, concept, or view is added.
- **Simple reliable control:** `submit -> valid review -> inspect -> exact
  repair -> same inspect` removes a misordered step and competing hints. One
  resolver remains authoritative, so net control complexity decreases.
- **Helper-oriented responsibility:** Engine computes deterministic roots and
  feedback; the Phase Agent executes already-authorized review/projection work;
  the user makes no ordinary pipeline decision. Neither a user request nor an
  inspect result creates new mutation permission.

## Risks / Trade-offs

- [Over-masking] A true independent error could disappear with a prerequisite.
  -> Limit masking to the existing depth-review derived symptoms; retain tests
  for unrelated invalid Topic/backing conditions.
- [Wrong supplementary classification] Primary work could be treated as a
  sync omission. -> Filter by canonical binding, current hash-valid submitted row, and
  `assignment_mode: supplementary`; add a negative primary-row test.
- [False unreviewed signal] A valid alternate submitted coordinate could be
  mistaken for an omission. -> Resolve review refs through the existing
  submitted-row coordinate equivalence and trailing-slash canonicalization;
  add an alternate-coordinate reviewed-row regression.
- [Feedback compatibility] Existing consumers could rely on floor repair
  wording. -> Preserve `reference_floor_deficit` and rule identity while only
  changing the primary repair when the omitted review ref is causal.
- [Guidance drift] Markdown could imply a new writer or path derivation. ->
  Assert exact inspect-target consumption and absence of locator-constant
  authoring instructions in the Markdown contract test.

## Migration Plan

1. Before target edits, run the change-local verification-routing and
   semantic-closure plan checks and complete the required plan review.
2. Add focused unit and integration regressions, then repair the existing
   convergence/evaluator/Markdown surfaces in small task groups.
3. Update the `v0.89` release surfaces, run selected evidence plus governed
   asset checks and strict OpenSpec validation, then perform the closeout
   review before archive.
4. Rollback is a source/guidance revert; no runtime bundle, ledger, seed, or
   schema migration exists.

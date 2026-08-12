# BUG-220--224 Primary-Source Research

> Status: completed research | Date: 2026-08-12 | Current head: `0a1693291`
>
> Scope: current active cards BUG-220 through BUG-224. This note traces each
> claim to accepted OpenSpec behavior, the current executable owner, focused
> tests, and a direct current-head reproduction where that adds evidence. It
> does not authorize or make implementation changes.

## Decision Summary

| Card | Current-head disposition | Recommended handling |
| --- | --- | --- |
| BUG-220 | Fixed / stale | Close from current-head evidence; add one exact missing-`finding_id` regression in the bounded change, with no runtime change. |
| BUG-221 | Partly stale; one real Wave1 closeout guidance gap remains | Fold the remaining ordering and locator-contract work into one Wave1 change. Do not alter Wave0 feedback batching. |
| BUG-222 | Reproduces | Fold into that same Wave1 change. |
| BUG-223 | Reproduces | Fold into that same Wave1 change. |
| BUG-224 | Works as the accepted single-contribution contract specifies; wording is ambiguous | Close as not a schema defect. Avoid a batching capability change; include one small playbook clarification in the bounded change. |

The narrow change worth proposing is **`repair-wave1-reference-closeout-feedback`**
for the coupled BUG-221/222/223 path, with only a BUG-220 regression and a
one-line BUG-224 clarification as closeout protection. It changes neither
lifecycle state nor evidence authority: it makes the existing Phase-owned
Wave1 closeout loop reachable, root-first, and truthful.

## Method And Boundaries

- The Project Charter makes accepted specs the owner of capability behavior and
  executable contracts plus regression evidence the owner of deterministic
  facts. See [project charter](/Users/bowhead/ai_tool_deepresearch/openspec/constitution/project-charter.md:37).
- The relevant accepted Wave1 contract already requires one pure convergence
  evaluator and rejects a second source catalog, controller, state, watcher, or
  retry tree. See [research-wave-gate-implementation](/Users/bowhead/ai_tool_deepresearch/openspec/specs/research/research-wave-gate-implementation/spec.md:805).
- The focused current-head suite passed: `69` tests across canonical topic
  state, projection CLI, Wave1 convergence, feedback projection, and WAI-009
  coverage. The exact command is recorded in the verification section below.

## BUG-220: Wave2 Finding Packet Feedback

### Current Behavior

This card is stale on current head. A Wave2 packet with
`source_identity: { kind: "finding", work_id: "W2F-001" }` now returns its
primary safe validation coordinate as
`updates[0].entries[0].source_identity.finding_id`, with an expected string and
received `undefined`. It does not select the unrelated Wave0 deferred branch
or report `wave0_evidence` as the primary coordinate.

The direct current-head `TopicApplyPlanSchema.safeParse` reproduction returned:

```json
{
  "primary_validation_path": "updates[0].entries[0].source_identity.finding_id",
  "validation_errors": [
    {
      "path": "updates[0].entries[0].source_identity.finding_id",
      "code": "invalid_type",
      "expected_shape": "string",
      "received_type": "undefined"
    }
  ]
}
```

### Source Of Record And Historical Root

- The executable source-identity discriminator requires `finding_id` for a
  `finding` entry. See [canonical-topic-state.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs:340).
- The packet update still uses a union between ordinary entry updates and the
  Wave0 deferred form. See [canonical-topic-state.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs:369).
- The current feedback projector recursively expands nested union candidates
  and chooses the lower-noise candidate before exposing bounded errors. See
  [canonical-topic-state.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs:782).
- Accepted behavior requires safe field-level feedback and Wave-specific
  source-identity values. See [canonical-topic-state spec](/Users/bowhead/ai_tool_deepresearch/openspec/specs/research/canonical-topic-state/spec.md:424) and
  [its Wave2 schema requirement](/Users/bowhead/ai_tool_deepresearch/openspec/specs/research/canonical-topic-state/spec.md:845).
- Existing focused coverage verifies context-precise nested source-identity
  feedback. See [canonical-topic-state.test.mjs](/Users/bowhead/ai_tool_deepresearch/tests/engine/helpers/canonical-topic-state.test.mjs:689).

### Disposition

**No runtime change.** Close BUG-220 as superseded by the current validation
projection. Add one exact regression for the missing-`finding_id` case to the
same bounded change so this closeout does not rely only on a broad neighboring
test.

## BUG-221: Canonical Wave1 Path And Candidate Feedback

### What Is Already Fixed Or Intentional

Two material claims in the card do not describe current behavior:

1. Wave1 feedback does enumerate every incomplete candidate. The convergence
   evaluator collects all incomplete canonical projections, not the first one.
   See [wave1-reference-convergence.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs:448). The
   feedback formatter maps every candidate to exact target and submitted
   backing coordinates. See [wave-contract-evaluators.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs:215).
   This matches the accepted requirement to expose a target for *each*
   materializable candidate. See [wave1-intake spec](/Users/bowhead/ai_tool_deepresearch/openspec/specs/research/wave1-intake/spec.md:457).
2. Wave0 intentionally returns exactly one bounded materialization candidate
   per inspect/re-run loop. The evaluator selects `unprojected[0]`; see
   [wave0-reference-convergence.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave0-reference-convergence.mjs:184). The accepted
   Wave0 contract explicitly calls for one bounded exact backing action, not a
   batch planner. See [research-wave-gate-implementation](/Users/bowhead/ai_tool_deepresearch/openspec/specs/research/research-wave-gate-implementation/spec.md:759).

Wave0 multi-candidate feedback is therefore outside this card's valid scope and
is a non-goal for the proposed change.

### Remaining Root

The canonical locator currently normalizes the URL, lowercases and sanitizes
`hostname + pathname`, truncates that token at `48`, and uses the first `12`
hex characters of `sha256(normalizedUrl)`. These are executable implementation
constants, not Agent-facing filename instructions. See
[wave1-reference-convergence.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs:31).

The Agent-facing phase document correctly says to use the inspect-provided
exact target instead of inventing a filename, but it says only "truncated" and
"URL's SHA-256." See [phase-wave1.md](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md:220). More importantly, its
visible post-submit checklist directs materialization before depth review. See
[phase-wave1.md](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md:207). The convergence reader cannot produce
candidate feedback until `depth-review.yaml` exists and has reviewed submitted
rows. See [wave1-reference-convergence.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs:152).

That sequence prevents the intended "inspect gives the exact path" behavior on
first materialization. It is the meaningful current defect behind this card.
The absence of literal `48`/`12` values from the Agent guidance is not a
contract gap: REF-011 owns normalized URL + safe token + stable digest, while
WAI-010 owns the inspect-provided exact target.

### Minimal Repair

Within the Wave1 change:

1. Fix the Wave1 order to `submit -> complete valid depth review -> inspect ->
   exact-target materialization -> index/seed sync -> same inspect`. The Agent
   consumes the exact target returned by inspect rather than deriving a path.
2. Keep `48` and `12` as implementation constants. Pin them only with an
   implementation regression; do not add them to REF-011 or the Agent-facing
   contract.
3. Preserve the existing all-candidate Wave1 feedback and single-candidate
   Wave0 loop. No new locator CLI, path grammar, or queue behavior is needed.

### Focused Verification

- A unit regression with a path longer than 48 characters and a
  normalization-sensitive URL pins current locator behavior without promoting
  those constants into a public contract.
- An evaluator/feedback test with at least two incomplete Wave1 candidates
  asserts both target/backing coordinate groups appear.
- A Markdown contract test asserts the Phase checklist orders depth review,
  inspect, then materialization, and tells the Agent to consume inspect output.

## BUG-222: Missing Depth Review Is Masked

### Current Root Cause

This reproduces on current head. `resolveReviewedWave1SubmittedBacking` creates
the precise root `reviewed_work_unit_refs_missing` when
`artifacts/wave1/<slug>/depth-review.yaml` is absent. See
[wave1-reference-convergence.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs:152).

But `evaluateWave1ReferenceTopic` passes `topic: null` whenever that reader is
not OK. See [wave1-reference-convergence.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs:352). The shared convergence function tests the missing topic before it tests
the submitted-backing result. See
[wave1-reference-convergence.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs:442).

Consequently, the direct reproduction with a supplied
`reviewed_work_unit_refs_missing` backing root returns the generic
`wave1_reference_topic_invalid` result instead. That violates the accepted
Wave1 requirement to short-circuit unusable submitted authority first. See
[wave1-intake spec](/Users/bowhead/ai_tool_deepresearch/openspec/specs/research/wave1-intake/spec.md:62). It also violates the general inspect rule that a missing parent must
surface before dependent symptoms. See
[cli-inspect-output-conventions](/Users/bowhead/ai_tool_deepresearch/openspec/specs/engine/cli-inspect-output-conventions/spec.md:426).

### Minimal Repair

Keep the same convergence helper and move/condition the backing-root check so a
concrete `submittedBacking.root` wins over the synthetic null-topic/profile
guards. Extend the existing depth-review prerequisite masking so public inspect
and Gate expose one direct depth-review root, without an additional generic
count-floor or topic-invalid hint. A true topic-binding root remains correct
when it is the backing reader's own root. Do not create a separate prerequisite
checker or invent a depth-review repair path.

### Focused Verification

- Helper test: a null projected topic plus
  `reviewed_work_unit_refs_missing` preserves that exact root/path.
- CLI and formal-gate parity test: a real current Topic with no depth review
  exposes one direct `Missing artifacts/wave1/<slug>/depth-review.yaml` root,
  without a generic topic-invalid or reference-floor sibling.
- Confirm unrelated invalid Topic/layout input still retains its own exact
  `wave1_reference_topic_invalid` root.

## BUG-223: Supplementary Depth-Review Sync Note Never Reaches Feedback

### Current Root Cause

This also reproduces on current head. The supplementary detector is defined to
take a topic slug and forwards it as `topic_slug` to `resolveTopicLayout`. See
[wave1-reference-convergence.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs:381).

Its caller passes `{ topic_uid, topic_slug }` instead of the expected string.
See [wave1-reference-convergence.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs:361). The resulting topic-layout lookup fails with
`topic_slug_unknown`, so `unreviewed_rows` is never attached. The formatter is
otherwise already correct: when rows are present, it names the exact missing
work-unit ref and depth-review repair. See
[wave-contract-evaluators.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs:226).

This is direct drift from accepted WAI-009 behavior: a submitted supplementary
row omitted from the depth review must be named before the Agent treats the
floor as a genuine deficit. See [wave1-intake spec](/Users/bowhead/ai_tool_deepresearch/openspec/specs/research/wave1-intake/spec.md:432).

### Minimal Repair

Pass `submittedBacking.topic.topic_slug` at the existing call site. Keep the
detector's established slug-based API, and restrict it to hash-bound rows whose
`assignment_mode === "supplementary"`; omission of primary rows is not this
repair signal. When unreviewed supplementary rows exist, make the depth-review
`write_to`/repair the primary public action rather than leaving it as a detail
under an enqueue-first action. Preserve the existing `reference_floor_deficit`
outcome and rule identity. No second topic-binding shape, checker, or verdict is
needed.

### Focused Verification

- Retain the existing direct detector tests, which prove its slug API. See
  [wave1-floor-feedback-names-depth-review.test.mjs](/Users/bowhead/ai_tool_deepresearch/tests/integration/wave1-floor-feedback-names-depth-review.test.mjs:91).
- Add an end-to-end evaluator/inspect case with one reviewed primary row and
  one submitted supplementary row omitted from the review. It must produce a
  `reference_floor_deficit` with `unreviewed_rows`, then expose the exact
  `_work_units/wave1/<work-id>` depth-review update as the primary public
  `write_to`/repair.
- A second case with the supplementary ref included must omit that note.
- A primary-row omission case must not be classified as supplementary sync.

## BUG-224: Multiple Whole-Contribution Wave0 Deferrals

### Current Contract

The runtime does exactly what the accepted behavior specifies:

- The deferred form has one strict `deferred_contribution` in the sole
  `wave0_evidence` update. See
  [canonical-topic-state.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs:365).
- A packet may select each slot only once. See
  [canonical-topic-state.mjs](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs:379).
- The accepted specification explicitly calls this a "sole
  `wave0_evidence` update" with one contribution selector. See
  [canonical-topic-state spec](/Users/bowhead/ai_tool_deepresearch/openspec/specs/research/canonical-topic-state/spec.md:697).
- Existing integration coverage applies one contribution, then a later
  contribution, and proves their ordinal intervals stay independent. See
  [operate-topic-state-projection.test.mjs](/Users/bowhead/ai_tool_deepresearch/tests/integration/cli/operate-topic-state-projection.test.mjs:503).

The card's two-update packet correctly fails the slot uniqueness guard. That is
not a loss of expressiveness at the current contract level: submit one retained
deferred packet per contribution, serially, or use multiple explicit entries in
one update when meanings differ.

### Documentation Ambiguity

The playbook phrase "One work ID may contribute multiple entries or exact
deferred dispositions in one `wave0_evidence` update" is imprecise. See
[operate-topic-state.md](/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/command_playbook/operate-topic-state.md:137). It should say that one work ID may
contribute multiple **explicit entries** in one update, while one deferred-form
packet selects exactly one contribution. Multiple contribution-wide deferrals
require sequential applies. Existing coverage proves two sequential applies
and the final inspect; it does not establish an inspect between the applies.

### Disposition

**Do not add `deferred_contributions[]` or relax slot uniqueness.** Either
would change the accepted packet grammar, transaction expansion, collision
semantics, schema projection, playbook, and tests for no demonstrated authority
or lifecycle benefit. Include the one-sentence authoring clarification in the
same bounded change; it does not warrant a standalone OpenSpec change.

## Recommended Change Boundary

### One Proposed Change

`repair-wave1-reference-closeout-feedback`

**Problem statement:** The existing Wave1 convergence loop has the correct
owners and output shapes, but its Phase sequence asks for materialization before
the reviewed backing prerequisite exists; once the prerequisite is absent, a
generic topic error masks its direct repair; and after supplementary work, an
object/string mismatch suppresses the existing depth-review sync note.

**In scope:**

1. Exact root precedence in `wave1-reference-convergence.mjs` for unusable
   submitted backing, including a missing depth-review root.
2. The supplementary-row path: correct slug argument, supplementary-only
   filtering, and depth-review update as the primary public repair.
3. Wave1 post-submit guidance order: submit, valid depth review, inspect,
   inspect-directed materialization, index/seed sync, then the same inspect.
4. One exact BUG-220 regression, one locator implementation regression, and
   one BUG-224 playbook clarification.
5. Focused helper, evaluator, CLI/Gate parity, and Markdown-contract coverage.

**Out of scope:**

- Any new queue, state, status, Gate, command, locator API, or reference
  authority.
- Manual source selection, generic path derivation in agents, or a new
  Wave1/Wave0 materialization controller.
- Wave0 multi-candidate feedback, batch deferred packet capability, or changes
  to TopicApplyPlanSchema beyond BUG-220's already-fixed feedback behavior.
- Reopening BUG-220's union-projection implementation or publishing locator
  truncation/digest lengths as Agent-facing contract.

**Why these three cards belong together:** all three happen on the same
post-submit Wave1 reference closeout path and are owned by the same pure
convergence evaluator plus its one Phase document. Fixing only BUG-222 would
tell the Agent to write a depth review but leave the guidance ordered against
that repair; fixing only BUG-223 would still hide the prerequisite; fixing only
the guidance would expose stale feedback. One narrow change therefore reduces
work without adding a cross-domain abstraction.

### Backlog Closeout Outside The Change

- BUG-220: close as current-head fixed after adding the exact missing-
  `finding_id` regression; do not change runtime behavior.
- BUG-224: close as accepted behavior plus ambiguous wording, not an Engine
  defect. Land only the one-line clarification in the bounded change.
- BUG-221: retain only its Wave1 sequencing/locator-documentation remainder;
  remove the already-fixed "one Wave1 candidate" and intentional Wave0 batching
  claims when updating the card/plan.

## Verification Executed

The following focused current-head command passed with `69` tests and `0`
failures:

```bash
node --test \
  tests/engine/helpers/canonical-topic-state.test.mjs \
  tests/integration/cli/operate-topic-state-projection.test.mjs \
  tests/integration/topic-state-schema-wave-identity.test.mjs \
  tests/engine/helpers/wave1-reference-convergence.test.mjs \
  tests/engine/helpers/wave-contract-evaluators.test.mjs \
  tests/integration/wave1-floor-feedback-names-depth-review.test.mjs
```

This validates the existing behavior and establishes the directly observed
regressions above; it does not claim that the unfixed BUG-222/223 outcomes pass.

## OpenSpec Planning Consequence

- One minimal RWP-015 delta should correct prerequisite ordering because the
  accepted phase spec currently moves to convergence immediately after submit.
- WAI-005, WAI-009, WAI-010, RWG-017, RWG-021, and REF-011 are verify-only;
  their accepted behavior already covers the intended repair.
- Do not add `48` or `12` to REF-011. A `v0.89` Harness target remains
  proportionate for the bounded guidance/runtime/test repair.

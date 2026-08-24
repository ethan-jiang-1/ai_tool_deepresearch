# Design — Document Wave0 Deferred All-Or-Nothing

## Context

See proposal.md — Why. Current state shaping the approach:

- The writer contract is accepted and locked: `expandWave0DeferredContribution`
  (`canonical-topic-state.mjs` 1273-1350) derives candidates for the whole
  contribution, then rejects the packet atomically when any selected identity
  already holds a non-equivalent disposition (lines 1327-1336,
  `projection_deferred_contribution_collision`), before any workspace or seed
  mutation. Existing integration test locks this:
  `operate-topic-state-projection.test.mjs` "rejects a deferred contribution
  that would overwrite a materialized identity" (487-501).
- The misleading surfaces: `operate-topic-state.md` (96-128) says the writer
  "derives every currently unprojected exact identity"; `phase-wave0.md`
  (§3.3, 239-267) says it "expands currently unprojected exact identities".
  Neither states the disposition-compatibility precondition nor the
  explicit-entry recovery.
- Doc-lock surface for both files already exists:
  `tests/integration/md/wave-producer-contract-guidance.test.mjs` asserts
  `deferred_contribution`/`selects one submitted contribution`/sequential
  applies phrases; the natural home for the new precondition/recovery locks.

## Goals / Non-Goals

**Goals:**

- Readers of the playbook and phase-wave0 can determine, without source
  inspection, that `deferred_contribution` is all-or-nothing with respect to
  disposition compatibility, and that a mixed contribution is completed with
  explicit per-ordinal entries.
- The collision feedback names the direct legal recovery.
- Deterministic doc/contract regression fails if the precondition or recovery
  is removed.

**Non-Goals:**

- No change to `expandWave0DeferredContribution` rejection/atomicity/overwrite
  behavior; no subset conversion; no inferred disposition choice.
- No new state, writer, recovery, or permission; no raw-edit repair path.
- No change to explicit entry packet validation or the return-map evaluator.

## Decisions

### D1. Document the exact condition in both guidance surfaces

Both `operate-topic-state.md` and `phase-wave0.md` state the same two facts in
the deferred section:

1. **Precondition**: the contribution-wide form is legal only while every
   selected identity is unprojected or already holds the same equivalent
   deferred disposition; any different persisted projection rejects the whole
   packet atomically before mutation.
2. **Recovery**: for a mixed contribution, apply explicit `wave0_evidence`
   entries for each remaining authoritative ordinal, then rerun the same
   inspect.

Rationale: single wording shared across both surfaces keeps the doc-lock simple
(one phrase set); alternatives — a separate FAQ section or a cross-link only —
were rejected because the Agent reads the deferred form at the point of use and
must not be sent elsewhere to learn the precondition.

### D2. Extend the collision feedback by one recovery sentence

Append to the `projection_deferred_contribution_collision` message: "Defer the
remaining ordinals with explicit `wave0_evidence` entries, then rerun the same
inspect." Rationale: the rejection already names the colliding entry; adding
the recovery closes the loop at the exact point of failure. Alternative
considered: a `recovery` field in the error object — rejected as new surface
with no consumer; the message text is the existing feedback channel.

### D3. Regression placement

- md doc-lock (`wave-producer-contract-guidance.test.mjs`): assert the
  precondition and recovery phrases in both files (whitespace-tolerant regex).
- CLI integration (`operate-topic-state-projection.test.mjs`): extend the
  existing collision test to assert the recovery sentence appears in the
  rejected output; the existing byte-unchanged seed assertion stays.

## Risks / Trade-offs

- [Wording drift between playbook and phase] → both use the same two sentences;
  the doc-lock asserts both files.
- [Feedback message length] → one added sentence at the exact failure point is
  the cheapest correct closure; no structured field added.
- [Reader still misreads "currently unprojected"] → the new paragraph directly
  qualifies that phrase with the all-or-nothing condition; the doc-lock pins it.

## Migration Plan

None — guidance + feedback text only; no schema/state migration.

## Open Questions

None.

## Why

`tests/e2e/wave1-target-receipt-wave2-closure.test.mjs` has eight receipt-closure
scenarios, but every one now stops before Wave1 submission. Its hand-written
seed declares `must_answer: ["Topic A question?"]` while the same test's
canonical `rb_plan.md` declares `["Q?"]`; the existing production evaluator
correctly returns `canonical_binding_mismatch` at `seed_topics/topic-a.md#/must_answer`.

The isolated first scenario is a deterministic 0.4-second red loop. Repairing
the test setup is needed so the receipt-closure E2E reaches the existing
Wave1-to-Wave2 contract it was written to exercise.

After the seed mismatch is repaired, the same direct test wrapper reaches a
second stale fixture input: it calls `evaluateWave1Contract` without the
canonical registry fact that the existing Wave1 CLI and focused evaluator tests
already supply. The per-topic reference-floor rule then fails while resolving
the missing `uidByAnySlug` layout map. This is another test-wrapper omission,
not a reason to change the evaluator or its existing CLI callers.

After both inputs are supplied, the repaired path reaches the existing Wave1
reference-convergence prerequisite: submitted backing without its closed
canonical seed projection produces `materialize_projection`. The temporary
bundle must exercise the accepted `wave_projection` apply operation in its
legal Wave1 lifecycle window; raw fixture prose cannot stand in for that
Engine-owned operation.

That operation then rejects the scaffold's manually authored legacy projection
regions with `writer_postcondition_failed`: a legacy heading is only a
recognized migration input, whereas a successful writer result must leave the
one canonical heading plus projection card that it can reread. The fixture must
use the existing canonical appendix renderer for its initial projection layout.

## What Changes

- Make the receipt-closure E2E scaffold derive its UID-bound seed frontmatter
  from the same canonical Topic fixture passed to `createBundle`.
- Make the test's direct Wave1 evaluator invocation construct and pass the
  existing canonical registry fact from that same temporary bundle.
- Materialize the submitted Wave1 backing into the seed's existing canonical
  projection through `applyCanonicalTopicState` before the direct Gate
  evaluation, using the real lifecycle window and canonical reference path.
- Seed the projection layout with the existing canonical appendix renderer so
  the existing writer can establish and reread its three Wave1 slots.
- Restore all eight existing receipt-closure scenarios to their intended
  Wave1-to-Wave2 execution boundary and re-run the full test inventory without
  claiming unrelated failures are fixed.
- Do not change Harness runtime code, accepted requirements, test-class
  taxonomy, semantic-fact families, APIs, or release version.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/canonical-topic-state` | `openspec/specs/README.md`; `openspec/specs/research/canonical-topic-state/spec.md`; production `evaluateSeedTopicAuthoring` diagnostic | Verify-only | Existing canonical registry and exact UID-bound seed equality correctly reject the stale fixture; their requirement is not changing. |
| `research/wave1-intake` | `openspec/specs/README.md`; `openspec/specs/research/wave1-intake/spec.md`; failing Wave1 admission boundary | Verify-only | The target E2E is blocked before the existing Wave1 intake/receipt behavior runs; no Wave1 contract is changed. |
| `research/wave2-synthesis` | `openspec/specs/README.md`; `openspec/specs/research/wave2-synthesis/spec.md`; receipt-closure test's finding-index assertions | Verify-only | The change restores test reachability to the existing Wave2 carried-target behavior without revising its requirement. |
| `verification/verification-routing` | `openspec/specs/README.md`; `openspec/specs/verification/verification-routing/spec.md` | Verify-only | The JS workflow-scale test belongs to the existing `deterministic_e2e` route with a `node_test_exit` verdict; routing behavior is unchanged. |
| `verification/test-fixtures` | `openspec/specs/README.md`; `openspec/specs/verification/test-fixtures/spec.md` | Excluded | That capability owns the minimal copied/symlinked Harness fixture, not this test's temporary-bundle setup in `tests/e2e/`. |

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- None. This change uses `skip_specs: true` because it restores only test
  fixture alignment with existing accepted behavior.

## Impact

- Affected test source: `tests/e2e/wave1-target-receipt-wave2-closure.test.mjs`.
- Affected verification evidence: its eight existing deterministic E2E
  scenarios and the subsequent full `npm test` inventory.
- No production Harness path, runtime bundle, accepted spec, dependency,
  public API, or version bump is affected.

## Boundaries

The direct Sources of Record are the test's canonical Topic fixture and the
accepted Wave1 projection operation. The smallest legal loop is: derive the
seed from that fixture -> materialize submitted backing through the existing
projection owner -> run the isolated receipt-closure test -> re-inventory
`npm test`. This removes stale duplicate fixture values and supplies the
existing closure prerequisite rather than weakening production admission or
adding a fallback.

No named runtime state, projection, status, module, command, or reader-facing
view is introduced or materially changed. The test reader's bounded question
remains whether the existing carried-target receipt closure behaves through
the existing Wave1-to-Wave2 path; canonical seed validity is its required
precondition, not a new conclusion. The user has selected the sequencing
through the rollout tracker; the Agent plans and will mechanically repair the
fixture only after an explicit Apply, while the existing `node:test` exit owns
the test verdict.

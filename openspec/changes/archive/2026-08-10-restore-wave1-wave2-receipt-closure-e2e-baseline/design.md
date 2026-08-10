## Context

See `proposal.md` for motivation. The receipt-closure test creates a canonical
Topic registry in `rb_plan.md`, then independently hand-writes an otherwise
equivalent seed in `scaffoldTopic`. The two representations have drifted:
the canonical fixture owns `must_answer: ["Q?"]`, while the scaffold
reconstructs it from the display title as `Topic A question?`. The production
canonical-topic-state evaluator correctly rejects that mismatch before the
test reaches Wave1 submission.

The direct Sources of Record are the test's canonical Topic fixture and the
existing production evaluator. This is a test setup repair: the test must
provide an exact canonical seed, rather than make production admission accept
a non-canonical one.

The same test must also establish the pre-existing Wave1 projection that the
production evaluator reads. Submitted backing alone is not a closed projection:
the fixture enters the accepted Wave1 projection lifecycle window and calls the
existing canonical topic-state operation, then returns to the direct Gate
evaluation boundary. This keeps the temporary bundle honest about both writer
and reader facts without introducing a test-owned authority.

Its seed must begin with the writer's existing canonical appendix, rather than
the manually composed legacy heading bodies. Legacy headings are migration
inputs, not a stable fixture API: the writer's postcondition deliberately
requires one canonical heading and card for each materialized slot.

## Goals / Non-Goals

**Goals:**

- Make the temporary-bundle seed frontmatter derive from the same complete
  canonical Topic fixture used to create its plan registry.
- Keep the eight existing receipt-closure cases exercising their existing
  Wave1-to-Wave2 assertions after canonical admission succeeds.
- Make the fixture relationship clear enough that future canonical fields are
  not silently recreated as independent literals in the scaffold.

**Non-Goals:**

- No production Harness, evaluator, Gate, receipt, or Wave2 contract change.
- No weakened canonical-binding check, test-only fallback, or altered accepted
  specification.
- No new test class, runtime authority, Semantic Fact Closure family, or
  affected semantic-closure record.

## Decisions

### Pass one canonical Topic object into the seed scaffold

`scaffoldTopic` will receive the complete Topic object supplied to
`createBundle`, together with only test-specific inputs such as the source
URL. It will derive seed frontmatter from that Topic, including
`topic_uid`, `id`, `slug`, `title`, `must_answer`, `scope_role`, and
`depends_on_topic_uids`, rather than separately accept reconstructed identity
and canonical fields. The body and reference fixture may still use the Topic's
display fields to create its existing test artifacts.

This makes the registry fixture the only canonical input in the test and
removes the stale duplicate `must_answer` literal that caused the failure.
Changing the evaluator would hide a real canonical-binding mismatch and would
expand scope into runtime behavior, so it is rejected.

The scaffold will construct exactly those seven evaluator-bound fields as one
frontmatter object and serialize each derived value through JSON-compatible
YAML representation. This preserves parsed string values and array order
without re-creating YAML quoting rules in the fixture. `previous_layouts` is a
canonical registry field but not a seed binding field, so the repair will not
invent it in seed frontmatter.

### Preserve test-specific values as explicit auxiliary inputs

The source URL remains separate because it is evidence-fixture data, not a
canonical Topic field. Existing test-specific carried targets, findings, and
assertions remain unchanged. This avoids pretending that evidence or Wave2
state belongs to the canonical topic registry.

### Mirror the existing Wave1 evaluator input boundary

`evaluateWave1Contract` accepts the current canonical registry fact for rules
that resolve per-Topic layouts and reviewed reference backing. The production
Wave1 gate CLI and focused evaluator tests already construct it with
`buildCanonicalTopicRegistryFact(bundlePath)` before calling the evaluator. The
receipt-closure test's direct `wave1PassAndProject` wrapper will do the same
against its temporary bundle and pass the fact as the evaluator's existing
optional argument.

This supplies the evaluator's current declared input rather than re-creating a
layout map in the test or adding a null fallback to production code. It keeps
the test's direct call semantically equivalent to the normal Wave1 gate input
boundary while leaving the evaluator, its rules, and CLI behavior unchanged.

### Establish the existing Wave1 projection through its legal operation

After the canonical binding and registry inputs are repaired, the evaluator
correctly reports `materialize_projection` because the test has submitted
backing but has not projected it into the seed's three Wave1 slots. The
fixture will use `applyCanonicalTopicState` with `context: wave_projection`,
`action: apply_seed_projection`, `wave: wave1`, and the submitted work ID plus
the current canonical Wave1 reference. Its status and trace will first express
the existing `wave0_complete -> wave1_complete` handoff window required by that
operation. It will then restore the existing direct Wave1 Gate status window.

The operation remains the source of truth for authorization, submitted-work
provenance, reference validation, and slot materialization. The E2E does not
write a projection region directly or add a test-only evaluator bypass.

### Use the canonical projection appendix as fixture layout

`renderSeedProjectionAppendix()` is the executable initial layout for the
projection slots. The scaffold will use it in place of hand-authored sections
for Wave1 mechanisms, trends, and pending questions. The test still lets the
existing writer create the entries; it does not pre-fill entry content or make
the writer's postcondition vacuous.

### Verify the native lifecycle contract and report the global baseline honestly

The focused deterministic E2E file is the primary proof that all eight
receipt-closure scenarios again reach their existing intended contract. The
full `npm test` command will then inventory the repository baseline. Its exit
status and counts are evidence for the whole suite only; failures outside this
file remain separately reported rather than being attributed to this repair.

## Risks / Trade-offs

- [A Topic field needed by the seed is omitted during refactor] -> Derive the
  complete frontmatter shape from the passed Topic and use the isolated suite
  to cover canonical admission before all eight downstream cases.
- [String escaping or array presentation creates another false mismatch] ->
  Serialize the seven evaluator-bound values through JSON-compatible YAML so
  their parsed values and ordering remain identical to the passed Topic.
- [Direct evaluator call omits a required canonical input] -> Build the
  existing canonical registry fact from the temporary bundle immediately
  before Wave1 evaluation and pass it through the established argument.
- [Submitted backing is mistaken for closed projection] -> Use the existing
  Wave1 projection operation and its real lifecycle window before Gate
  evaluation; do not raw-write seed projection content.
- [Legacy fixture prose is mistaken for a writer-stable slot layout] -> Seed
  the existing canonical appendix and let the writer establish its entries.
- [The repair masks a production contract defect] -> Keep the evaluator and
  canonical registry unchanged; the positive case must pass through the
  existing evaluator, while existing negative closure scenarios remain intact.
- [Full-suite red status is overclaimed as fixed] -> Record the focused suite
  result separately from the post-repair `npm test` failure inventory.

## Migration Plan

No deployment, runtime migration, or compatibility conversion is required.
Apply changes only `tests/e2e/wave1-target-receipt-wave2-closure.test.mjs`.
Run the focused test file, then `npm test` to refresh the global inventory.
Reverting the test edit restores only the stale fixture construction and does
not alter production state or behavior.

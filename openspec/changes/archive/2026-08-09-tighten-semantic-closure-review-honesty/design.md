## Context

See `proposal.md` for motivation. The current v1 contract deliberately treats a safe repository-relative file
as the referential coordinate and an optional `#fragment` as a human-facing hint. The checker validates the base
file in assets mode but does not and cannot establish that an arbitrary source token is the declared symbol or
semantic role. The current feedback guideline already sends semantic completeness to Agent-owned plan and
closeout review, and every supported lifecycle entry already routes through that guideline and the structural
checker.

The first affected dogfood proves that this boundary needs more precise author/reviewer instructions, not a
larger parser: five distinct fragments were inaccurate at the archived revision, and one Agent-facing projection
was classified as a verdict consumer despite v1 already providing `overlap: derived`. Historical records are
immutable evidence and are not a migration target.

## Goals / Non-Goals

**Goals:**

- Make future authors choose an actual symbol or an honest bare file coordinate.
- Give plan and closeout reviewers one stable role rubric relative to the family bounded conclusion.
- Deliver any false-precision or role-classification finding through the existing ordinary pending-task loop.
- Prove that current proposal and lifecycle instruction surfaces deliver the rubric, while stating that this
  deterministic proof does not establish review quality.

**Non-Goals:**

- Change `semantic-closure/v1`, its Zod contract, checker behavior, coordinate grammar, or catalog vocabulary.
- Add `agent_facing_projections`, another overlap relation, a v2 migration, or a topology registry/view.
- Scan JavaScript tokens, comments, exports, imports, or callsites as symbol/role proof.
- Rewrite archived closure records, execute tests from the checker/finalizer, or change Harness runtime behavior.

## Decisions

### 1. Keep v1 data and executable checks unchanged

The observed defect is false confidence in human-authored hints and role classification. Both require contextual
judgment over the revision and family conclusion; neither becomes deterministic merely by adding a regex. The
Apply implementation therefore changes Agent-facing contract/guidance and selected tests, not
`semantic-fact-closure-contract.mjs`, `check-semantic-closure.mjs`, or finalizer ordering.

Alternative considered: require every fragment to occur as a token in its file. Rejected because a comment,
import, callsite, or unrelated declaration can satisfy token presence without proving the stated role, while
generated or anonymous surfaces may have no stable symbol. This would add a blocking false-positive/negative
surface and still leave semantic judgment unresolved.

### 2. Use the existing v1 roles relative to the bounded conclusion

The review rubric uses these existing slots:

- `authority.resolver`: the semantic decision interface for the family conclusion;
- `established_by`: surfaces that legally establish or change authority used by that conclusion;
- `consumers`: only surfaces whose use of the conclusion can authorize, reject, pass, fail, or block; and
- `overlap`: projection/legacy relationships, with `derived` for Agent-facing material projected from the
  conclusion.

A task/schema/starter/prompt is not promoted to `consumers` merely because it displays the contract. A raw or
diagnostic reader is not promoted merely because it exposes an input or historical record. When the reviewer
cannot establish a role, the result is `unknown` owned by an ordinary pending task; the Agent does not force the
surface into the nearest YAML slot.

Alternative considered: add a first-class projection field. Rejected because v1 already expresses the observed
projection through `overlap: derived`, and there is not yet a repeated post-calibration failure showing that a
new blocking field pays for its migration and maintenance cost.

### 3. Centralize review delivery in existing configuration and guideline surfaces

`openspec/config.yaml` will give authors the actual-fragment-or-bare-path rule and the
verdict-consumer/derived-projection distinction while they create `semantic-closure.yaml`. Its
`change-feedback-loop/apply` and `/archive` operation-guidance entries will name the same review boundary and
direct the Agent to the central guideline. `guidelines/change-feedback-loop.md` will carry the detailed
plan/closeout rubric and ordinary-task route. The supported Apply/Archive entries already obtain operation
guidance and require that guideline; they remain thin delivery routes instead of copying the rubric into eight
adapters.

Apply will inspect those adapters against `SUPPORTED_ENTRY_SURFACES`. It will edit an adapter only if the scoped
plan review finds that an existing entry does not actually deliver the central guideline. Such a finding must be
recorded as ordinary pending work before the edit, preserving scope honesty.

Alternative considered: copy the full rubric into every skill and command. Rejected because this multiplies the
same prose across current and future adapters and makes the next wording change a synchronization problem.

### 4. Verification proves delivery, not semantic review quality

The selected integration asset is `tests/integration/governance/change-feedback-finalizer.test.mjs`. It already
creates a fresh OpenSpec change from the production config, obtains proposal/apply/archive instructions, reads the
central guideline, and iterates the finalizer-owned supported-entry inventory. Apply will extend it to assert that:

- proposal plus Apply/Archive operation instructions expose the actual-fragment-or-bare-path and
  verdict-consumer-versus-derived-projection review boundary;
- the central plan and closeout rubric checks those distinctions and routes findings to ordinary pending tasks;
- every path in the finalizer-owned supported-entry inventory still reaches the current operation guidance and
  shared guideline, while checker PASS remains non-semantic.

`node_test_exit` owns the deterministic verdict. Passing this test proves text delivery and adapter reachability;
it does not prove a future Agent named every consumer, classified every role correctly, or executed selected
runtime tests.

### 5. Semantic precision, control simplicity, and helper responsibility

The reader is a closure author/reviewer asking whether a coordinate and role honestly identify an actual changed
surface. The required reasoning distinctions and stop point are stated in proposal/specs: actual anchor or bare
path, verdict consumer or projection, otherwise explicit unknown/pending work. No new reader-facing data model is
introduced.

Direct Sources of Record remain the accepted specs, the selected change record, and actual source/spec revision.
The shortest loop is author -> plan review -> implementation -> actual-diff closeout -> ordinary repair task.
Net simplification is avoidance of a v2 schema, scanner, second verdict, retry/fallback, topology registry, and
eight copied rubrics; no new control layer is added.

The user owns new semantic/risk/scope decisions. The Agent owns authorized inspection, honest coordinate/role
authoring, and reversible task repair. Node owns only existing deterministic structure/reference and native test
exit verdicts. Human-directed guidance cannot override a failed checker or manufacture a missing capability.

## Risks / Trade-offs

- **Risk: Guidance remains dependent on Agent judgment.** -> This is explicit in the accepted boundary; plan and
  closeout review occur at two different revisions, and every uncertain/failing judgment becomes durable work.
- **Risk: Bare paths reduce navigation convenience.** -> Prefer an actual stable symbol when available; a bare path
  is deliberately less precise than a false fragment and must carry adjacent prose.
- **Risk: `overlap` may remain awkward for future projection varieties.** -> Record post-calibration incidents; only
  a repeated inability to classify without distortion justifies a focused schema change.
- **Risk: Text assertions can pass while an Agent ignores guidance.** -> Report the selected integration claim only
  as deterministic delivery evidence; do not relabel it as semantic compliance or Agent-behavior proof.
- **Risk: Adapter drift could bypass the central rubric later.** -> Continue consuming the finalizer-owned inventory
  in the integration test, so newly supported entries must preserve the existing guidance route.

## Migration Plan

1. Complete the plan review and both custom plan-mode checks before target edits.
2. Update proposal authoring instructions, Apply/Archive operation guidance, the central feedback guideline, and
   the selected integration assertions.
3. Run the selected native integration test and the required governance checks.
4. Sync the two modified deltas into their existing main specs and re-compare semantics.
5. Perform actual-diff closeout; any newly observed ambiguity returns to an ordinary pending task.
6. Use the governed finalizer for archive.

There is no runtime or data migration. Rollback removes the new guidance/assertions and restores the prior main
spec wording before archive; archived historical `semantic-closure.yaml` records remain untouched either way.

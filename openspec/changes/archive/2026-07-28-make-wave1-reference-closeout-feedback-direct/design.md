## Context

Wave1 already evaluates submitted backing, canonical reference projection,
index inventory, and floor through `evaluateWave1ReferenceTopic()`. Its result
is converted into a finding, then generic inspect and formal Gate projectors
turn every unmasked blocking finding into `hints[]`. This is the right
authority path, but it can leave the Agent with a materialization prerequisite
and downstream `reference_ledger_coverage`/floor wording at the same decision
point.

Direct truth remains the submitted work-unit row and accepted source/cache
facts, the canonical projection, and the index. The proposed closeout feedback
is only a reader-facing projection of the existing convergence result.

## Goals / Non-Goals

**Goals:**

- Make a materializable Wave1 submitted candidate produce one actionable Phase
  closeout hint with exact existing candidate coordinates and one same-inspect
  rerun.
- Preserve independent backing, provenance, queue, receipt, and structural
  failures. Reuse the convergence evaluator's existing materialization-before-
  index-before-floor ordering; do not infer a cross-rule dependency or mask a
  separately evaluated finding.
- Keep inspect and formal Gate on the same convergence result and teach the
  Phase Agent the existing materialize -> sync -> seed packet -> rerun loop.

**Non-Goals:**

- No new writer, CLI, durable feedback state, queue path, retry controller, or
  generic reference recovery subsystem.
- No ledger mutation, submitted-result/output declaration change, receipt
  rewrite, source selection, web search, or alternate evidence authority.
- No assertion that an Agent-flow observation has passed; deterministic
  contract coverage and Agent-flow evidence remain distinct proof classes.

## Decisions

### D1. Treat canonical materialization as a prerequisite root

When the existing convergence evaluator returns `materialize_projection`,
the Wave adapter will create one primary `agent_action` finding from that
result. Its `write_to` names the canonical relative target derived by
`canonicalWave1ReferencePath()` and the returned candidate's stable submitted
backing coordinates (`normalized_url`, `work_ids`, `work_unit_refs`,
`source_refs`, and `cache_trail_refs`); its `rerun` is the current inspect/Gate
command. This is presentation of existing facts, not a new response field or
authority surface.

The evaluator's existing outcome order is the only dependency declaration this
change consumes: `materialize_projection` precedes `sync_reference_index` and
`reference_floor_deficit`, so those later convergence outcomes are not emitted
until the same checkpoint reruns. The adapter SHALL NOT assign
`masked_by_rule_id` to a separately evaluated finding by matching Topic text,
filename/glob, rule order, filesystem proximity, source URL, or any other
post-hoc heuristic. A concrete legacy file or ledger/index failure can survive
canonical materialization and is therefore an independent root unless its
own evaluator already declares it dependent.

Alternative: append a new `closeout_feedback` object alongside generic hints.
Rejected because it creates another reader surface whose relationship to the
existing hint/action contract consumers must be inferred.

### D2. Preserve truly independent roots

Invalid/missing submitted backing, a malformed candidate, legacy or misnamed
files with their own invalid backing/index/format, unrelated queue or receipt
failure, and a true post-closeout floor deficit remain independent primary
facts. The projector must not hide a real authority boundary merely because a
materialization root exists, or infer dependency from a matching filename,
Topic string, or source URL.

Alternative: suppress every ledger/floor diagnostic while a materialization
candidate exists. Rejected because a canonical projection does not repair an
already-existing legacy file or its ledger/index/format defect; suppression
would make the same-check rerun fail with a previously hidden root.

### D3. Reuse the established Phase operations

The Phase Agent continues to author candidate-bound reference prose, persist
it through the existing artifact-persistence route, synchronize the existing
index, refresh the existing topic-state packet, and rerun the same checkpoint.
Engine classifies the direct root and exposes coordinates; it does not write
reference prose or advance the workflow.

### D4. Guideline review

This materially refines one existing reader-facing projection. Its bounded
question is: "What is the nearest legal closeout action for this Topic before
any further evidence work?" It preserves the distinctions that change that
answer: exact submitted backing versus none, canonical projection versus
legacy filesystem presence, dependent symptom versus independent authority
failure, and post-closeout shortfall versus pre-closeout prerequisite.

The control loop becomes shorter: `direct convergence facts -> one primary
hint -> existing legal closeout -> same inspect`. Reusing the convergence
evaluator's existing ordered outcomes avoids competing downstream closeout
instructions; it adds no checker, state, recovery tree, or controller.
Engine owns deterministic classification, Agent owns existing authorized
materialization and rerun, and the user has no ordinary command or fabricated
authority duty. A genuinely unavailable writer remains `missing_contract`.

## Risks / Trade-offs

- [False closure] A separate authority failure could be hidden with the
  materialization symptom. -> Reuse only the evaluator's existing ordered
  convergence outcomes; retain focused negative tests for legacy/index/ledger,
  invalid backing, and independent queue/receipt/provenance roots.
- [Hint compatibility] Existing consumers may rely on generic hint order. ->
  Preserve the hint shape and make the primary root deterministic; test inspect
  and formal Gate projections.
- [Guidance drift] Markdown could imply a new mutation route. -> Reference only
  existing persistence/index/topic-state commands and explicitly forbid ledger
  or submitted-output edits.

## Migration Plan

1. Create and validate the verification plan before implementation.
2. Add failing focused tests for candidate-exact materialization-first hint
   projection and separately evaluated roots remaining visible, then adjust
   the existing convergence finding/projector and Phase guidance.
3. Run declared unit/integration coverage, governance checks, strict OpenSpec
   validation, then release `v0.60`.
4. Rollback is a code/guidance revert only; no bundle or data migration exists.

## Open Questions

None. The change consumes existing candidate coordinates and does not decide
whether a new writer is needed.

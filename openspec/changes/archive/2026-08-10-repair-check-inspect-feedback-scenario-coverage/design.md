## Context

See `proposal.md` for the motivation. The accepted
`engine/check-inspect-feedback` main spec ends in the middle of CHI-005, its
sixth parsed requirement, so its three existing Scenario blocks are absent from
the parser-visible main specification. The archived
`make-feedback-name-contract-roots` delta preserves the complete original
requirement; it is recovery evidence, not a continuing behavior authority.
Current Engine paths and regressions corroborate some historical examples, but
this static repair does not re-prove every CHI-005 runtime behavior.

## Goals / Non-Goals

**Goals:**

- Restore the complete existing CHI-005 requirement and all three Scenario
  blocks to the accepted main spec during Apply.
- Establish a delta that identifies the exact contract being restored and lets
  OpenSpec validate its Scenario grammar.

**Non-Goals:**

- Changing Engine feedback behavior, feedback semantics, tests, runtime state,
  requirement IDs, or Semantic Fact Closure runtime families.
- Treating archived change artifacts as a second behavior authority or
  back-editing an archived change.
- Creating a new validator, recovery path, named runtime state, projection,
  module, or Agent workflow.

## Decisions

### Restore from bounded recovery evidence

The accepted main spec remains the Source of Record and is the defective
surface. The archived delta is used only to recover the exact previously
accepted text. Current implementation and regression surfaces are limited
corroboration for historical examples, not proof that every restored scenario
currently executes. The Apply edit will make the main spec whole again; it will
not add or revise observable behavior.

### Use one narrow MODIFIED delta

The change declares only CHI-005 as a `MODIFIED` requirement and copies the
complete requirement block with its three existing scenarios. A new requirement
or requirement ID would falsely imply new behavior and make the registry less
accurate.

### Keep the control loop direct

The OpenSpec validator is the grammar verdict owner. The shortest loop is:
restore the requirement block, compare it exactly with the delta, validate the
target spec, then validate the full main-spec inventory. No runtime checker,
test runner, or secondary interpretation layer is needed.

No material semantic layer changes, so semantic-precision review is not
applicable. The direct main-spec edit avoids added control complexity. The user
authorizes phase selection; after explicit Apply, the Agent performs the
reversible restoration and the validator owns the deterministic verdict.

## Risks / Trade-offs

- [Recovery text is copied incorrectly] -> Compare the complete target block
  and all three scenarios against this delta before validation.
- [Archived evidence is treated as behavior authority] -> Keep the archive in
  rationale only; sync this delta into the current main spec during Apply.
- [Requirement identity is misstated] -> Refer to it as the sixth parsed
  requirement, `CHI-005`; do not invent `CHI-006`.
- [A static repair hides an implementation change] -> Require an actual-diff
  closeout that limits target edits to the accepted main spec.

## Migration Plan

1. Complete and polish the proposal artifacts without target edits.
2. On explicit Apply, run the required plan checks, restore CHI-005 in the
   accepted main spec, and make the exact delta/main comparison.
3. Run target and full-inventory validation, then complete governed closeout,
   spec sync, tracker update, and archive checks.

The edit is a version-controlled Markdown restoration. If validation exposes a
copying mistake before archive, restore the prior main-spec text and correct the
delta-driven repair; no deployed runtime migration or compatibility procedure
is required.

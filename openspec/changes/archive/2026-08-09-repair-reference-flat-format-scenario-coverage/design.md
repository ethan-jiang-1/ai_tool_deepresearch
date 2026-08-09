## Context

See `proposal.md` for the motivation. The authoritative main spec has a
Wave0 backing requirement registered as REF-009, followed by four valid
four-hash Scenario blocks. Its heading is `+### Requirement: ...`, however,
so the OpenSpec parser never makes that text a requirement and reports an
empty `requirements.8.scenarios` collection. The registry already assigns
REF-009; no identity allocation or capability expansion is needed.

After the original heading repair, the same targeted validator exposes a new
`requirements.9.scenarios` root for REF-010. That successor and the separately
named `engine/check-inspect-feedback` root remain outside this change's
authority and prevent a truthful all-green repository-wide claim.

## Goals / Non-Goals

**Goals:**

- Make the existing REF-009 heading parser-visible so its four existing
  Scenarios are attached to the accepted requirement.
- Prove directly that the original `requirements.8.scenarios` root is gone,
  and use the global scan only to inventory the separately named successor and
  check/inspect debts.
- Keep the delta a complete REF-009 block so OpenSpec archive semantics do not
  drop any existing requirement or Scenario text.

**Non-Goals:**

- Do not amend submitted-backing semantics, materialization authority,
  metadata/index shape, numeric eligibility, or Agent-facing workflow text.
- Do not alter the OpenSpec parser, add a test class or test asset, suppress
  the independent check/inspect finding, or add a validator exception.
- Do not create a Semantic Fact Closure family, runtime state, projection,
  command, or new reader-facing concept.

## Decisions

### Repair the exact malformed heading

Apply will replace only the leading `+` in the REF-009 `### Requirement:`
heading. The requirement body and all four Scenario blocks remain byte-for-byte
equivalent in meaning. Rewriting the body or duplicating scenarios would add
review noise and could accidentally amend the backing contract; an exception in
the validator would preserve a malformed Source of Record.

### Use a complete modified delta for the existing requirement

The delta copies the complete, corrected REF-009 requirement block under
`## MODIFIED Requirements`. This is required so archive has the full replacement
block and can preserve all backing and legacy compatibility boundaries. It does
not allocate a new requirement ID or create an adjacent requirement merely to
satisfy scenario validation.

### Keep validation on the direct grammar boundary

The target diagnostic is `openspec validate bundle/reference-flat-format --type
spec --json`: after the edit it must no longer report
`requirements.8.scenarios`; its newly exposed `requirements.9.scenarios` root
is separately recorded as `reference-flat-format-requirement-9-scenario` for a
successor change. `openspec validate --specs` is an inventory check whose
remaining errors must be exactly those two named successor/check-inspect roots.
No JS-led or Agent-flow test class fits a static Markdown grammar repair, so the
closed verification plan truthfully has zero claims.

No named runtime or reader-facing semantic layer changes, so the
semantic-precision review is not applicable. The smallest legal loop is target
heading repair -> targeted validator -> global diagnostic inventory; this
removes a parser discontinuity without adding state, fallback, controller, or
another authority. The user chose the named debt, the Agent performs the
reversible Apply edit, and the existing validator owns the verdict; no user
operation or runtime mutation authority is invented.

## Risks / Trade-offs

- [Delta omits part of REF-009] -> Keep the full corrected requirement block in
  the delta and compare it with the main-spec block during Apply review.
- [Repair is overclaimed as all-spec completion] -> Require the original
  `requirements.8.scenarios` root to disappear and record every newly exposed
  or pre-existing global root by its named debt and capability path.
- [Unrelated wording changes enter the repair] -> Limit the target diff to the
  single leading character and reject behavior, registry, or runtime edits in
  closeout review.

## Migration Plan

No runtime deployment or data migration is required. Apply changes one main-spec
heading, runs the direct and inventory validation commands, then archives via
the governed finalizer. Reverting restores only the previous malformed Markdown
heading and has no runtime-state effect.

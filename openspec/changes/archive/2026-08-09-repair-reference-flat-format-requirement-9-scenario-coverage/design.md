## Context

The accepted `bundle/reference-flat-format` main spec is the behavior Source of
Record for REF-010, but its text ends mid-sentence at `exact seriali` and has
no attached Scenario blocks. The OpenSpec validator therefore reports
`requirements.9.scenarios` as empty. The pre-existing complete requirement and
two scenarios are recoverable without semantic inference from the archived
`2026-08-08-make-feedback-name-contract-roots` delta. The current shared
reference template and focused Engine regression independently corroborate the
same YAML quoting and diagnostic contract.

## Goals / Non-Goals

**Goals:**

- Restore REF-010's complete existing requirement text and two parser-visible
  Scenario blocks in the authoritative main spec.
- Preserve the recovered full requirement in a complete `MODIFIED` delta for
  governed sync and archive.
- Use the direct target validator for the repaired root and use global
  validation only to inventory the separate remaining CHI-006 scenario debt.

**Non-Goals:**

- Do not modify Engine parsing or diagnostic behavior, the shared reference
  template, tests, YAML metadata semantics, or any runtime bundle state.
- Do not repair `engine/check-inspect-feedback` requirement 6, add a validator
  exception, allocate requirement IDs, or claim an all-specs-green baseline.
- Do not introduce or materially change a named runtime state, projection,
  status, concept, module, command, reader-facing view, or Semantic Fact
  Closure family.

## Decisions

### Restore the exact existing REF-010 block

Apply will replace the truncated REF-010 block in
`openspec/specs/bundle/reference-flat-format/spec.md` with the complete text
and two scenarios preserved in the archived delta. The main spec remains the
accepted behavior authority; the archived delta is recovery evidence rather
than a competing authority. The current template and focused Engine test
corroborate that the recovered text represents existing behavior, so this is a
specification restoration, not a behavioral amendment.

The delta contains the complete replacement under `## MODIFIED Requirements`.
It preserves REF-010's existing identity and does not alter adjacent REF-009 or
REF-011 material.

### Keep the loop at the grammar boundary

The legal loop is: restore the accepted requirement block, run
`openspec validate bundle/reference-flat-format --type spec --json`, then run
`openspec validate --specs` as an inventory. The target check must stop
reporting `requirements.9.scenarios`; the global inventory is expected to leave
only `engine/check-inspect-feedback` `requirements.6.scenarios`, which remains
the separately named debt.

This uses the existing validator as the single deterministic grammar verdict
owner. It adds no state, checker, fallback, recovery branch, or alternative
metadata authority, and avoids the complexity of changing code or tests for a
spec-text defect.

### Preserve responsibility and semantic boundaries

No new semantic level is introduced, so semantic-precision admission is not
applicable. The user selected the named repair scope; during an explicit Apply
phase the Agent may make the reversible main-spec restoration; the validator
owns the pass/fail result. A historical delta, template, or test cannot itself
authorize a runtime or product change, and none is proposed.

## Risks / Trade-offs

- **Recovered text drifts from established behavior:** copy the exact archived
  REF-010 block and compare the final main-spec block with the delta before
  archive; template and focused-test evidence provide independent corroboration.
- **Repair swallows adjacent requirements:** scope the main-spec replacement to
  REF-010 only; require REF-009 and REF-011 to remain unchanged in closeout.
- **Success is overclaimed:** require the target root to disappear and record
  the sole remaining global root as the separately tracked CHI-006 debt rather
  than call `openspec validate --specs` green.

## Migration Plan

No runtime deployment or data migration exists. Apply restores one accepted
main-spec requirement block, runs target and inventory diagnostics, performs
the governed delta/main sync review, and archives through the finalizer.
Reverting restores only the defective truncated prose and has no runtime-state
effect.

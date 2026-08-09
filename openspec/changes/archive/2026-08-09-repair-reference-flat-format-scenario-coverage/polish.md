# Planning Polish

Change: `repair-reference-flat-format-scenario-coverage`
Scope: planning artifacts only; no target edit or task checkbox state was changed.

## Pass 1: Whole-Change Coherence

**Concern examined:** Whether the proposal, REF-009 delta, design, task order,
verification plan, and semantic-closure record describe one bounded repair
rather than an accidental submitted-backing behavior change.

**Authoritative facts checked:**

- `openspec/specs/bundle/reference-flat-format/spec.md` has a `+###` prefix on
  the Wave0 REF-009 heading, while its four existing Scenario blocks are
  already present beneath it.
- `openspec validate bundle/reference-flat-format --type spec --json` reports
  the resulting empty `requirements.8.scenarios` collection.
- `openspec/governance/req-registry.yaml` assigns the existing REF-009 identity
  to this exact Wave0 backing requirement.
- The change-local `verification-plan.yaml` has four explicit
  `not_applicable` classes and zero claims; `semantic-closure.yaml` has the
  required `not_applicable` record.

**Result:** No actionable coherence finding. The proposal, delta, design, and
tasks consistently preserve the existing backing semantics; they name the
OpenSpec validator as the only grammar verdict and do not claim a new runtime
fact, user permission, or Agent workflow.

## Pass 2: Risk-Led Delta And Baseline Review

**Concern examined:** A full modified-requirement delta could accidentally
discard REF-009 content at archive time, or this isolated repair could
overclaim repository-wide spec health while the second named debt remains.

**Authoritative facts checked:**

- A read-only Node comparison confirms the delta's REF-009 requirement block
  exactly equals the main-spec block after removal of only the malformed leading
  `+`, and contains all four Scenario headers.
- `openspec validate engine/check-inspect-feedback --type spec --json` reports
  the independent `requirements.6.scenarios` error for
  `engine/check-inspect-feedback`.
- `openspec/governance/finalize-change-archive.mjs` runs strict selected-change
  validation and project governance checks; it does not make a full
  `openspec validate --specs` pass part of the archive proof.
- `openspec validate repair-reference-flat-format-scenario-coverage --strict`,
  verification-routing plan mode, requirement plan mode, project-specs
  governance, and `git diff --check` all pass for the planning artifacts.

**Result:** No fact-settled artifact correction is needed. The design, tasks,
and named-debt ledger already require targeted REF-009 validation and treat the
remaining check/inspect error as an external, separately named diagnostic
boundary rather than as a passing result.

## Outcome

**not ready**: repository-wide `openspec validate --specs` remains red on the
separate named debt `check-inspect-feedback-requirement-6-scenario`. This change
must not claim that overall baseline is clean or repair that unrelated main
spec. Its planning artifacts are otherwise complete and its scoped Apply tasks
are explicit; the outstanding baseline is an external blocker to an all-specs
green readiness claim, not permission to broaden this change.

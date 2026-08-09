# Planning Polish

Change: `repair-reference-flat-format-requirement-9-scenario-coverage`

Scope: planning artifacts only; no main-spec target edit, target-code edit, or
task checkbox state was changed.

## Pass 1: Whole-Change Coherence

**Concern examined:** Whether proposal, REF-010 delta, design, tasks,
verification plan, and semantic-closure record make one bounded recovery
argument instead of changing YAML/frontmatter behavior through a spec repair.

**Authoritative facts checked:**

- The accepted `bundle/reference-flat-format` main spec ends REF-010 at `exact
  seriali` and the target validator reports `requirements.9.scenarios`.
- The active delta's REF-010 block matches the archived
  `2026-08-08-make-feedback-name-contract-roots` recovery block exactly and
  contains exactly two Scenario headers.
- `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-reference-template.md`
  retains the same `acceptance_status: "accepted :warning:"` quoting rule.
- `node --test tests/engine/feedback-contract-naming.test.mjs` passed `3/3`;
  this is corroborating current implementation evidence, not a new test claim.
- The plan has four explicit `not_applicable` verification classes with zero
  claims, and the closure record is honestly `not_applicable` because no
  runtime fact family or verdict consumer changes.

**Result:** No actionable coherence finding. The artifacts preserve the main
spec as accepted behavior authority, use the archived delta only as recovery
evidence, and leave Engine/template/test/runtime behavior outside scope.

## Pass 2: Risk-Led Recovery And Scope Review

**Concern examined:** Restoring a full block could accidentally modify REF-009
or REF-011, turn historical evidence into a competing authority, or overclaim
global specification health.

**Authoritative facts checked:**

- REF-009 ends before the truncated REF-010 heading, and REF-011 begins after
  it; task 1.1 requires a REF-010-only replacement and task 1.2 requires an
  exact delta/main comparison.
- `openspec validate repair-reference-flat-format-requirement-9-scenario-coverage
  --strict`, requirement plan mode, main-spec governance,
  verification-routing plan mode, semantic-closure plan mode, and
  `git diff --check` all exit zero for the planning state.
- The current target validator reports only REF-010's expected
  `requirements.9.scenarios` root for this capability. The global inventory
  has exactly one separate root as well:
  `engine/check-inspect-feedback` `requirements.6.scenarios`.
- The proposed design keeps the shortest legal loop: restore accepted prose,
  run target validation, then inventory the named remaining debt. It adds no
  validator, state, fallback, controller, or authority surface.

**Result:** No fact-settled planning correction is needed. The independent
CHI-006 failure stays named in both the plan and the task list; it is neither
suppressed nor pulled into this change.

## Pass 3: Final Readiness Boundary

**Concern examined:** Whether the final artifact graph and validation evidence
support a truthful Apply-readiness claim.

**Authoritative facts checked:**

- `openspec status --change repair-reference-flat-format-requirement-9-scenario-coverage
  --json` reports proposal, specs, design, and tasks complete.
- `openspec list --json` reports `0/11` completed tasks, preserving Apply as
  the only phase that advances checkbox state.
- The scoped planning checks in Pass 2 are green; full `openspec validate
  --specs` is red on the current REF-010 repair target and the separately
  named CHI-006 debt.

**Outcome:** **not ready** for an all-specs-green baseline claim. There is no
unresolved product decision in this change, and its planning artifacts are
complete; the remaining boundary is the known REF-010 target defect plus the
unrelated, separately named CHI-006 debt. This outcome neither authorizes
target edits nor broadens the change. A subsequent explicit Apply may execute
the approved scoped task list and must preserve the CHI-006 boundary.

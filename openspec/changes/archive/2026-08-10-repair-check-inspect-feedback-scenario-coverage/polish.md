# Planning Polish

Change: `repair-check-inspect-feedback-scenario-coverage`

Scope: planning artifacts only; no accepted main-spec target, Harness code,
test, runtime state, or task checkbox state was changed.

## Pass 1: Whole-Change Coherence

**Concern examined:** Whether the proposal, CHI-005 delta, design, tasks, and
two change-local governance records form one bounded main-spec restoration
argument rather than silently changing Engine feedback behavior.

**Authoritative facts checked:**

- The accepted `engine/check-inspect-feedback` main spec stops the sixth parsed
  requirement at `authori`; its target validator reports
  `requirements.6.scenarios`.
- `openspec/governance/req-registry.yaml` assigns that requirement `CHI-005`.
  “Sixth parsed requirement” is its parser position, not a new registered ID.
- The active `MODIFIED` delta and the archived recovery block compare exactly,
  with three Scenario headers each.
- `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs` and
  `tests/engine/feedback-contract-naming.test.mjs` corroborate a parser
  example only; `verification-plan.yaml` has zero native test-class claims and
  `semantic-closure.yaml` is honestly `not_applicable`.
- `openspec/config.yaml` requires proposals to be written in Chinese.

**Repair made:** Translated `proposal.md` into Chinese without changing its
scope, capability paths, authority claims, or non-goals.

**Result:** No unresolved coherence finding. The main spec remains the behavior
Source of Record; the archived delta is limited to recovery evidence; no
runtime behavior, new ID, new control layer, or semantic-fact family is
introduced.

## Pass 2: Risk-Led Recovery And Proof-Boundary Review

**Concern examined:** Whether a historical-text recovery could be incomplete,
misidentified as `CHI-006`, or claim a wider repair than the current main-spec
defect.

**Authoritative facts checked:**

- A read-only Node comparison reports `exactRecoveryMatch: true`,
  `archivedScenarios: 3`, and `deltaScenarios: 3`.
- `openspec validate repair-check-inspect-feedback-scenario-coverage --strict`,
  requirement plan mode, main-spec governance, verification-routing plan mode,
  semantic-closure plan mode, and `git diff --check` all exit zero.
- `openspec validate engine/check-inspect-feedback --type spec --json` reports
  only the target root `requirements.6.scenarios`; the global inventory is
  `84/85`, with that same root as its sole failure.
- The task list requires a CHI-005-only target edit, exact delta/main
  comparison, target validation, full inventory, and an actual-diff closeout.

**Result:** No fact-settled planning repair is needed. The current red global
inventory is the unimplemented target of this change, not evidence of a second
root, a runtime behavior failure, or permission to widen scope.

## Pass 3: Final Readiness Boundary

**Concern examined:** Whether the artifact graph, feedback lifecycle, and
verification plan allow a truthful Apply-readiness conclusion without advancing
implementation state.

**Authoritative facts checked:**

- `openspec status --change repair-check-inspect-feedback-scenario-coverage
  --json` reports proposal, specs, design, and tasks complete.
- `openspec list --json` reports `0/11` completed tasks; plan and closeout
  markers each appear exactly once and remain unchecked.
- The plan names the mandatory two-pass polish, target-specific validator,
  all-spec inventory, pre-archive tracker update, closeout review, archive
  checks, and non-circular finalizer/ledger transition.
- All planning checks above are green; the only global spec failure remains the
  target main-spec defect until an explicit Apply performs the planned repair.

**Result:** The initial readiness boundary was coherent, subject to the
remaining evidence-scope review below. It did not authorize a target edit,
prove Engine runtime behavior, or make the current global inventory green.

## Pass 4: Evidence-Scope Correction

**Concern examined:** Whether the planning artifacts overstate one focused
frontmatter test as proof for all three restored CHI-005 scenarios.

**Authoritative facts checked:**

- `tests/engine/feedback-contract-naming.test.mjs` directly exercises the
  frontmatter parse diagnostic only.
- Currentness feedback has separate integration evidence in
  `tests/integration/wave2-finding-currentness-feedback.test.mjs`, while
  `canonical-topic-state.mjs` exposes the cross-field diagnostic path.
- The archived change's verification plan and task history distribute these
  historical behavior claims across multiple unit and integration surfaces.
- This change restores main-spec Markdown only. Its `verification-plan.yaml`
  intentionally has zero claims, so no selected native test can be presented
  as proof for this change.

**Repair made:** Narrowed proposal, design, task 0.1, and the prior polish
record to call current Engine/test reading limited recovery corroboration rather
than proof of every restored scenario.

**Result:** No new runtime verification or target behavior change is needed.
The target grammar validator remains the sole planned verdict for this static
repair.

## Pass 5: Feedback Lifecycle And Archive Ordering

**Concern examined:** Whether the durable task sequence can enter Apply and
archive without treating planning polish as a completed review or moving the
named debt to archived before the finalizer has succeeded.

**Authoritative facts checked:**

- `tasks.md` has exactly one unchecked `openspec-feedback:plan-review` before
  its first target edit and exactly one unchecked
  `openspec-feedback:closeout-review` before archive checks.
- The task list contains eleven independently checkable items. It puts scoped
  plan checks before restoration, target and inventory grammar verdicts before
  the pre-archive tracker state, and actual-diff closeout before finalization.
- `guidelines/change-feedback-loop.md` assigns scoped review to the Agent,
  preserves ordinary finding tasks, and assigns the final mechanical archive
  transition only to `finalize-change-archive.mjs` after all tasks complete.
- Task 3.3 is marked immediately before finalization, returns to unchecked on a
  finalizer failure, and moves the named-debt ledger to archived only after a
  successful finalizer result. It therefore avoids a tracker/finalizer cycle.

**Result:** No task-order repair is needed. Planning polish remains a
pre-Apply quality gate, and neither task state nor the tracker claims an
archive outcome early.

**Outcome:** **ready for apply**. All required planning artifacts are complete
and internally coherent after this final clean pass. The completed planning
checks establish only OpenSpec/governance structure and the static recovery
plan. They do not authorize a target edit, prove every CHI-005 runtime
scenario, or make the current `84/85` main-spec inventory green. An explicit
`/opsx:apply` (or user request to apply) is still required for this exact
change.

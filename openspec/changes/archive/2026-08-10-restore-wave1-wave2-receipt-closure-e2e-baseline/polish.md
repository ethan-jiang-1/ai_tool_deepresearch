# Planning Polish

Change: `restore-wave1-wave2-receipt-closure-e2e-baseline`

Scope: planning artifacts only; no production Harness file, test file, accepted
main spec, runtime bundle, or task checkbox state was changed.

## Pass 1: Whole-Change Coherence

**Concern examined:** Whether the proposal, skip-specs declaration, design,
tasks, verification route, and semantic-closure record form one bounded
fixture-alignment argument rather than a disguised canonical-topic-state or
Wave2 behavior change.

**Authoritative facts checked:**

- The current receipt-closure test's plan fixture declares `must_answer:
  ["Q?"]`, while its independent seed scaffold writes `Topic A question?`.
- `evaluateSeedTopicAuthoring` has exactly seven fixed ordered binding fields:
  `topic_uid`, `id`, `slug`, `title`, `must_answer`, `scope_role`, and
  `depends_on_topic_uids`. It rejects the current seed at the first mismatch;
  it does not bind `previous_layouts` or inspect the body.
- The accepted canonical-topic-state spec defines parsed-value equality, with
  exact strings and array order significant, and keeps canonical frontmatter
  separate from body prose.
- The accepted verification-routing spec classifies this JS-driven,
  temporary-bundle lifecycle chain as `deterministic_e2e`, whose verdict
  authority is `node_test_exit`.
- The accepted Wave2 synthesis contract keeps receipt-target bindings distinct
  from origin references and requires an exact binding with a legal decision /
  gap-status route for coverage.

**Repair made:** Clarified `design.md` and task 1.1 to construct only the
seven evaluator-bound frontmatter values from the passed Topic and serialize
them through JSON-compatible YAML. This removes any re-created YAML quoting or
array convention without inventing the non-binding `previous_layouts` field.

**Result:** The change still skips delta specs honestly: it neither changes the
seven-field production evaluator nor an accepted Wave1/Wave2 requirement. The
test fixture is the sole stale owner, and `semantic-closure.yaml` remains
`not_applicable`.

## Pass 2: Risk-Led Reachability And Proof-Boundary Review

**Concern examined:** Whether making admission pass could either discard the
eight receipt-closure scenarios' negative coverage or overstate one focused
test file as a global green baseline.

**Authoritative facts checked:**

- Each of the eight test cases currently creates its own canonical Topic,
  scaffolds its seed, asserts Wave1 completion, then exercises the existing
  valid, empty, uncovered, stale, origin-only, intent-drift, layout-only, or
  invalid-route receipt-closure boundary.
- The existing test is blocked before those assertions only because the seed
  frontmatter fails canonical admission; no test or production source points
  to a required change in the evaluator, Gate, receipt, or finding-index
  checker.
- `verification-plan.yaml` has one deterministic-contract claim bound to this
  exact `tests/e2e/` asset. It declares a fixture-backed temporary bundle and
  `node_test_exit`; it does not claim Subject-Agent behavior.
- The recorded full-suite result is `2705` pass / `41` fail. Task 2.2 requires
  a post-repair inventory and expressly forbids representing a focused result
  as proof that unrelated baseline failures are fixed.

**Result:** No further fact-settled repair is needed. The planned change
restores test reachability to the existing behavior; the focused suite proves
only its stated deterministic contract, and `npm test` remains a separate
whole-suite inventory.

## Pass 3: Final Readiness Boundary

**Concern examined:** Whether the artifact graph, feedback lifecycle, and
governance checks permit an honest Apply-ready result without marking work
completed or modifying a target file.

**Authoritative facts checked:**

- `openspec status --change restore-wave1-wave2-receipt-closure-e2e-baseline
  --json` reports proposal, skipped specs, design, and tasks complete; the
  active change has `0/13` completed tasks.
- `tasks.md` has exactly one unchecked `openspec-feedback:plan-review` before
  the target edit and one unchecked `openspec-feedback:closeout-review` before
  archive. It includes plan/assets checks, focused/native verification,
  full-suite inventory, archive checks, and tracker evidence update.
- `openspec validate restore-wave1-wave2-receipt-closure-e2e-baseline --strict`,
  verification-routing plan mode, semantic-closure plan mode, requirement
  governance plan mode, main-spec governance, and `git diff --check` all exit
  zero.

**Result:** No unresolved decision or failed planning check remains.

**Outcome:** **ready for apply**. The plan authorizes neither a target edit nor
an archive by itself. An explicit `/opsx:apply` or user request to apply this
exact change remains required; Apply begins with task 0.1 and the current
feedback-operation guidance.

# Planning Polish

Change: `restore-deterministic-e2e-regression-baseline`  
Date: 2026-08-09  
Scope: planning artifacts only; no target code, test, main-spec, governance, or task-state edit.

## Pass 1: Whole-Change Coherence

Concern: the three repairs must restore existing proof without silently changing a Harness,
finalizer, version, Gate, or semantic-closure contract.

Authoritative facts examined:

- `openspec/governance/finalize-change-archive.mjs` runs one production finalizer across
  project-level governance checks; it does not drive a current run bundle.
- `openspec/governance/verification-routing-contract.mjs` classifies a one-CLI,
  no-runtime deterministic component proof as `integration`; the other two tests traverse
  temporary run-bundle checkpoint chains and remain `deterministic_e2e`.
- `DEEP_RESEARCH_HARNESS/RUN.md`, top-level `CHANGELOG.md`, and the accepted
  `research-styles`, `post-final-recovery`, and `rerun-incremental-node` specs establish
  the release and rerun facts that the tests read.

Finding and repair: the finalizer proof had been described as an E2E test despite having no
current run-bundle runtime. The proposal, design, tasks, and verification plan now route it to
`tests/integration/governance/change-feedback-loop-archive.test.mjs` with `runtime: none`.
The two actual Harness lifecycle chains remain `deterministic_e2e`. `skip_specs: true` remains
honest because no accepted behavior changes.

## Pass 2: Risk-Led Fixture And Assertion Closure

Concern: a fixture that merely returns `archived` could drift by omitting one of the production
finalizer's later checkers or inputs; a dynamic release test could retain obsolete release-specific
text as a permanent assertion.

Authoritative facts examined:

- The production finalizer's ordered checks are `openspec_status`, `artifacts`, `tasks`,
  `strict_validation`, `requirement_governance`, `main_spec_governance`,
  `capability_taxonomy`, `capability_discovery`, `verification_routing`,
  `semantic_closure`, and `native_archive`.
- The invoked checker sources identify the required fixture closure: their local contracts,
  requirement registry/main spec, capability catalog, semantic-fact catalog, and change-local
  skip-specs, discovery, routing, and closure records.
- `RUN.md` has two current `v0.82` declarations and top-level `CHANGELOG.md` has a non-empty
  `## v0.82` section. The old `v0.74` Breaking/Harness-source text is historical release content.
- The focused lineage test reports one `style_projection_freshness` root after C5 recognizes
  `synchronized_count_incremented`, as the accepted current-freshness contract requires.

Finding and repair: the fixture task's former general phrase "every dependency" did not require
the test to observe every finalizer stage. The proposal, design, task 1.1, and verification claim
now require an exact ordered `checks` assertion and enumerate the fixture prerequisites. The
release task and verification claim now require the two `RUN.md` release declarations to agree,
their matching changelog section to be non-empty, and no Harness-local changelog; they no longer
preserve the `v0.74` wording as an invariant.

Clean final pass: the resulting plan has one Source of Record per failing assertion, preserves
the C5-versus-formal-Gate boundary, provides executable done conditions, and makes no new product
decision. No unresolved planning decision remains.

## Baseline Evidence

The following current focused tests fail for the scoped stale-proof reasons above:

- `node --test tests/e2e/change-feedback-loop-archive.test.mjs` blocks at
  `requirement_governance_failed` because the isolated fixture lacks
  `requirement-reservation-contract.mjs`.
- `node --test tests/e2e/deep-research-harness-migration.test.mjs` rejects its stale `v0.74`
  `RUN.md` assertion while the entry declares `v0.82`.
- `node --test --test-name-pattern "keeps event-bound style params" tests/e2e/post-final-rerun-lineage-continuity.test.mjs`
  reports the expected formal `style_projection_freshness` root before the existing writer runs.

These are baseline observations, not proof of an applied repair.

## Readiness Checks

All passed after this polish:

```text
openspec validate restore-deterministic-e2e-regression-baseline --strict
node openspec/governance/check-verification-routing.mjs --change restore-deterministic-e2e-regression-baseline --mode plan
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-project-specs.mjs
git diff --check
```

Verdict: ready for apply.

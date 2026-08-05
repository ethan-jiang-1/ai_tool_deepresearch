# Apply Verification Record

Date: 2026-08-05

## Change-Scoped Evidence

- The focused deterministic regression set passed with 116 tests across 21
  suites. It covered the entry contract, production and disposable creators,
  bundle inspection, file observability, continuation and context routing,
  command documents, release-version alignment, fixture-backed health checks,
  Autorun terminology, explicit target handling, and the migration E2E path.
- The selected verification-plan assets passed: the unit, integration, and
  deterministic-E2E claims all have Node test exit-code evidence.
- Verification routing assets passed with 7 declared claims.
- Strict OpenSpec change validation, project requirement validation,
  project-spec validation, and Git whitespace validation all passed.

## Full Regression Boundary

The full npm test run completed after the change-scoped repairs with 2,612
tests, 2,561 passes, 51 failures, and no cancellations. The repository was
already non-green before those repairs, also with 51 failed tests. The exact
top-level failure list is not stable under the full parallel run, so equal
counts are not evidence of one-for-one identity.

The repaired migration suites no longer appear among the full-run failures:
Agent Experiment explicit creator/preparation targets, Agent Experiment
Autorun terminology knowledge surfaces, and Deep Research Harness research
entry routing contract.

The remaining failures are outside the Harness rename's deterministic claims:
post-final/rerun, Wave receipt and work-unit behavior, setup and phase-document
contracts, gate-chain and topic-state behavior, real-Agent playbook contracts,
and verification knowledge surfaces. Several current failures demonstrate
pre-existing test-isolation debt under the parallel suite, including attempts
to read a bare rb_status.json after another test changes/removes its relative
fixture context and an empty CLI JSON capture. These are not source-root,
entry-card, or current-run-bundle-root failures.

No non-migration full-suite failure was changed as part of this apply. The
focused sequential test run is the deterministic evidence for this change;
the full suite result remains separately recorded repository regression debt.

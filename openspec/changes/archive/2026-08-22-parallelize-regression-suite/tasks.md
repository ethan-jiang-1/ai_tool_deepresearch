# parallelize-regression-suite

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Read `proposal.md`, `design.md`, Completed 2026-08-22: scoped review per `openspec/operations/change-feedback-loop.md` (Apply Review) - whole-change coherence reviewed against verification-routing/integration-tests/test-fixtures specs, the six target files, and the harness helper; touched surfaces are 13 snapshot call sites + one additive helper; `wave1-focus-coverage-contract` verified already isolated (per-run tmpdir root) and excluded from the change; `semantic-closure: not_applicable` holds (test-owned path organization only, no runtime fact family). No actionable finding remains.
      this task list, `verification-plan.yaml`, and `semantic-closure.yaml`
      against the current canonical sources: the accepted
      `verification/verification-routing` spec (four test classes and claim
      routing unchanged), `verification/integration-tests` (INT-001 isolation
      spirit), `verification/test-fixtures`, the six target test files, and
      `tests/e2e/helpers/deterministic-chain-harness.mjs`. Reviewed
      whole-change coherence and the touched surfaces (13 snapshot call sites,
      one additive helper; `wave1-focus-coverage-contract` verified already
      isolated via per-run tmpdir root and left unchanged). For `semantic-closure: not_applicable`, the reason
      holds: no runtime fact family, resolver, authority surface, or
      production behavior changes — only test-owned snapshot path organization.
      Done when no actionable finding remains and plan-mode governance passes.
- [x] 0.2 Plan-mode governance before the first target edit: Completed 2026-08-22: strict validate valid; verification-routing plan valid (6 claims after removing the w1-focus claim); semantic-closure plan valid; project reqs plan consistent (662 registered). Structural results only, not runtime proof.
      `openspec validate 2026-08-22-parallelize-regression-suite --strict`,
      `node openspec/governance/check-project-reqs.mjs --mode plan`,
      `node openspec/governance/check-verification-routing.mjs --change
      2026-08-22-parallelize-regression-suite --mode plan`,
      `node openspec/governance/check-semantic-closure.mjs --change
      2026-08-22-parallelize-regression-suite --mode plan`. Done when all
      exit zero and structural PASS results are recorded as planning evidence
      only.

## 1. Target Edits

- [x] 1.1 Add `uniqueSnapshotRoot(bundle, token)` to Completed 2026-08-22: `uniqueSnapshotRoot(bundle, token)` added and exported from `tests/e2e/helpers/deterministic-chain-harness.mjs`; `snapshotBundle`/`restoreBundle` signatures and semantics unchanged; `node --check` passes.
      `tests/e2e/helpers/deterministic-chain-harness.mjs`:
      `export function uniqueSnapshotRoot(bundle, token) { return join(dirname(bundle), \`.snap-\${token}-\${basename(bundle)}\`); }`
      (`basename`, `dirname`, `join` already imported). `snapshotBundle` /
      `restoreBundle` signatures and semantics unchanged.
- [x] 1.2 `tests/integration/cli/check-gate-wave0-complete.test.mjs`: both Completed 2026-08-22: both wave0 call sites use `uniqueSnapshotRoot(sharedBundle, 'wave0')`; snapshot root tracked in `createdDirs` for after() cleanup; `node --check` passes.
      `snapshotBundle(sharedBundle, dirname(sharedBundle))` call sites →
      `snapshotBundle(sharedBundle, uniqueSnapshotRoot(sharedBundle, 'wave0'))`;
      append the unique snapshot root to the file's after() cleanup list so
      `.snap-*` is removed with the bundle dirs.
- [x] 1.3 `tests/integration/cli/operate-queue-validation.test.mjs`: all seven Completed 2026-08-22: all seven call sites use `uniqueSnapshotRoot(sharedBundle, 'queue-validation')`; tracked for cleanup; `node --check` passes.
      call sites → `uniqueSnapshotRoot(sharedBundle, 'queue-validation')`;
      cleanup list updated.
- [x] 1.4 `tests/integration/cli/check-gate-wave2-complete.test.mjs`: one call Completed 2026-08-22: wave2 site uses `uniqueSnapshotRoot(sharedBundle, 'wave2')`; tracked; `node --check` passes.
      site → `uniqueSnapshotRoot(sharedBundle, 'wave2')`; cleanup updated.
- [x] 1.5 `tests/integration/cli/check-gate-hitl2-recorded.test.mjs`: one call Completed 2026-08-22: hitl2 site uses `uniqueSnapshotRoot(sharedBundle, 'hitl2')`; tracked; `node --check` passes.
      site → `uniqueSnapshotRoot(sharedBundle, 'hitl2')`; cleanup updated.
- [x] 1.6 `tests/integration/cli/check-gate-readiness-passed.test.mjs`: one Completed 2026-08-22: readiness site uses `uniqueSnapshotRoot(sharedBundle, 'readiness')`; tracked; `node --check` passes.
      call site → `uniqueSnapshotRoot(sharedBundle, 'readiness')`; cleanup
      updated.
- [x] 1.7 `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs`: one Completed 2026-08-22: handoff site uses `uniqueSnapshotRoot(shared.bundle, 'handoff-witnessing')`; snapshot root tracked in a new module-level `snapshots` array; `cleanupAfterTest` pass branch removes both bundles and snapshots, fail branch preserves both for diagnosis; `node --check` passes.
      call site → `uniqueSnapshotRoot(shared.bundle, 'handoff-witnessing')`.
      Keep the fail-preserve diagnosis behavior (`cleanupAfterTest(pass)`):
      failure branch preserves bundle + snapshot root; pass branch removes
      both.
- [x] 1.9 Uniquify the shared bundle literal name - [x] 1.10 Skip disposable runtime dirs in
      `tests/integration/md/agent-experiment-autorun-terminology.test.mjs`
      `testSources()` walk: directories starting with `.test-`
      (.test-tmp/.test-bundles/.test-chain-tmp) are concurrent write/delete
      surfaces for other parallel suites and are not test sources. Finding
      recorded in design D5: parallel run B flaked with ENOENT on
      `tests/.test-tmp/ldc-*/DEEP_RESEARCH_HARNESS/.../claude-deepseek.mjs`
      (terminology scan racing claude-deepseek.test.mjs cleanup). Completed
      2026-08-22: skip added; focused run green; `node --check` passes.

Completed 2026-08-22: `'shared'` → per-file names
      ('shared-wave0' ×2, 'shared-wave2', 'shared-hitl2', 'shared-readiness',
      'shared-queue-validation' ×7); zero remaining `createBundle('shared')`
      literals; focused runs of all five files green (132/132); design D4
      records the finding and the verification of 'pass'/'malformed' literals
      (unique-wrapped or single-file, no change needed). across the five racing
      files (12 sites): `createBundle('shared')` → `'shared-wave0'` /
      `'shared-wave2'` / `'shared-hitl2'` / `'shared-readiness'` /
      `'shared-queue-validation'` (wave0 2, queue-validation 7, wave2/hitl2/
      readiness 1 each). Finding recorded in design D4: parallel run 2 flaked
      on `dpt_disp_shared_3` ENOENT (1-hex suffix space of 16 values, pinned
      as a contract by new-disposable-bundle.test.mjs; `--force` deletion
      across files). Other literals ('pass', 'malformed') verified
      unique-wrapped or single-file, no change needed.

- [x] 1.8 Shared-path sweep (evidence, fix only if a real cross-file fixed Completed 2026-08-22: sweep evidence - `tests/engine/.test-chain-tmp/` used only by `transition-chain.test.mjs`; `tests/.test-tmp/fake-claude.mjs` only by `claude-deepseek.test.mjs`; all `tests/.test-tmp/*` writers use `mkdtempSync` unique subdirs (`check-project`, `check-capability-*`) or distinct fixed names (`gate-wrapper` vs `health-verifier`). No cross-file fixed path found; nothing to fix.
      path is found): confirm `tests/engine/.test-chain-tmp/` is used only by
      `transition-chain.test.mjs`; `tests/.test-tmp/fake-claude.mjs` only by
      `claude-deepseek.test.mjs`; each `tests/.test-tmp/<fixture-base>` fixed
      subdir has a distinct owner. Any cross-file collision found → apply the
      same unique-root principle and record it here.

## 2. Verification

- [x] 2.1 Focused runs Completed 2026-08-22: all six changed files pass in focused serial runs (wave0 28/28, wave2 31/31, hitl2 15/15, readiness 19/19, queue-validation 39/39, handoff 1/1; 133 total, 0 fail).: `node --test` on each of the six changed files →
      all pass (serial, one process per file).
- [x] 2.2 Full parallel Completed 2026-08-22: full parallel `npm test` green - 2799/2799, 0 fail, wall 163s (baseline: 159s with 43 fails in 3 files before the fix; target <=200s met).: `npm test` (default file parallelism) → 0 fail;
      record wall time (target ≤ ~200s on the 8-core measurement machine).
- [x] 2.3 Second consecutive full parallel run Completed 2026-08-22: two consecutive full parallel runs green after all
      fixes (A2 165s, B2 168s; 2799/2799 both, 0 fail). Earlier evidence:
      baseline 159s/43 fails; after snapshot fix 163s green then 1 fail
      (bundle-name race, fixed by D4) then 158s green then 1 fail
      (terminology scan race, fixed by D5) then 165s/168s green. → 0 fail (flake surface = 0).
- [x] 2.4 Full serial Completed 2026-08-22: `npm test -- --test-concurrency=1 --test-reporter=tap` green - 2799/2799, 0 fail, wall 542s (baseline 605s; target <=605s met).: `npm test -- --test-concurrency=1 --test-reporter=tap`
      → 0 fail; wall ≤ 605s baseline; record leaf count (baseline 2799).
- [x] 2.5 Cleanup check Completed 2026-08-22: after green parallel runs, no `.snap-*` from the five non-handoff files remains; stale pre-change `tests/.test-bundles/.baseline-snapshot` (old shared path) removed; handoff preserves its own 1 bundle + 1 snapshot per run by design (health-issue diagnosis), expected.: after green parallel runs, `tests/.test-bundles/`
      accumulates no `.snap-*` dirs from the other five files
      (wave0/wave2/hitl2/readiness/queue-validation) and no `.baseline-snapshot`
      shared path. Handoff-witnessing intentionally preserves its own 1 bundle
      + 1 snapshot per run (`cleanupAfterTest` health-issue diagnosis, by
      design) - expected, not a regression.

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` - Establish the change-scoped
      diff boundary (only the six CLI test files + the terminology test
      (D5) + the one additive harness helper + this change's assets), review
      the actual diff against proposal/design/tasks/verification-plan, and
      reassess `semantic-closure: not_applicable` against the implemented
      surfaces. Completed 2026-08-22: boundary = 7 test files
      (wave0/wave2/hitl2/readiness/queue-validation/handoff snapshot roots
      13 sites + 'shared' bundle names 12 sites; terminology testSources
      `.test-` skip) + `uniqueSnapshotRoot` helper; `wave1-focus-coverage`
      and e2e files untouched (verified already isolated); diff matches
      proposal/design incl. D4/D5 findings; verification-plan claims
      exercised (focused 133 + 9 green; parallel A2/B2 2799/2799 ×2 green
      walls 165s/168s; serial 2799/2799 542s); `semantic-closure:
      not_applicable` reassessed against implemented surfaces - holds
      (test-owned path/name organization only, no runtime fact family or
      production surface). No actionable finding remains.

      proposal/design/tasks/verification-plan, and reassess
      `semantic-closure: not_applicable` against the implemented surfaces.
      Record every actionable finding as an ordinary unchecked task; complete
      only when none remains.
- [x] 3.2 Archive-mode governance: Completed 2026-08-22: reqs archive
      consistent (662 registered); project specs 82 valid; routing assets
      valid (6 claims); semantic-closure assets valid; strict validate
      valid; `git diff --check` OK.
      `node openspec/governance/check-project-reqs.mjs --mode archive --change
      2026-08-22-parallelize-regression-suite`,
      `node openspec/governance/check-project-specs.mjs`,
      `node openspec/governance/check-verification-routing.mjs --change
      2026-08-22-parallelize-regression-suite --mode assets`,
      `node openspec/governance/check-semantic-closure.mjs --change
      2026-08-22-parallelize-regression-suite --mode assets`, strict change
      validation, and `git diff --check`. Done when all exit zero.

> The final archive transition is the governed finalizer
> (`node openspec/governance/finalize-change-archive.mjs --change
> 2026-08-22-parallelize-regression-suite`) — a lifecycle action, not a task
> (the finalizer blocks on incomplete tasks, so it cannot be listed as one).

# de-spawn-bundle-instantiation

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Read `proposal.md`, `design.md`, Completed 2026-08-22: scoped review per `openspec/operations/change-feedback-loop.md` (Apply Review) - whole-change coherence reviewed against verification-routing spec, the six target suites, the harness helper, and the new-disposable-bundle naming contract; touched surfaces = one additive helper + six createBundle refactors with plan_basename semantics preserved (setup-ready identity via patchPlanBasename); `semantic-closure: not_applicable` holds (test setup process calls only). No actionable finding remains.
      this task list, `verification-plan.yaml`, and `semantic-closure.yaml`
      against the current canonical sources: the accepted
      `verification/verification-routing` spec, the six target test files,
      `tests/e2e/helpers/deterministic-chain-harness.mjs`, and
      `experiments_env/shared/new-disposable-bundle.mjs` naming contract.
      Reviewed whole-change coherence and the touched surfaces (one additive
      helper, six createBundle refactors, plan_basename semantics). For
      `semantic-closure: not_applicable`, the reason holds: no runtime fact
      family, resolver, authority surface, or production behavior changes -
      only test setup process calls. Done when no actionable finding remains
      and plan-mode governance passes.
- [x] 0.2 Plan-mode governance before the first target edit: Completed 2026-08-22: strict validate valid; verification-routing plan valid (6 claims); semantic-closure plan valid; project reqs plan consistent (662 registered). Structural results only, not runtime proof.
      `openspec validate 2026-08-22-de-spawn-bundle-instantiation --strict`,
      `node openspec/governance/check-project-reqs.mjs --mode plan`,
      `node openspec/governance/check-verification-routing.mjs --change
      2026-08-22-de-spawn-bundle-instantiation --mode plan`,
      `node openspec/governance/check-semantic-closure.mjs --change
      2026-08-22-de-spawn-bundle-instantiation --mode plan`. Done when all
      exit zero.

## 1. Target Edits

- [x] 1.1 Add `cloneBundleTemplate(template, name, { targetDir, caseId, Completed 2026-08-22: `cloneBundleTemplate` added to deterministic-chain-harness.mjs (rmSync-then-cpSync, `dpt_disp_<name>_<hex>` naming with randomInt(0,16), optional patchPlanBasename); `node --check` passes.
      patchPlanBasename })` to
      `tests/e2e/helpers/deterministic-chain-harness.mjs` per design D1
      (rmSync-then-cpSync, `dpt_disp_${name}_${hexSuffix}` naming with
      `randomInt(0,16)` from node:crypto, optional plan_basename rewrite).
      `node --check` passes.
- [x] 1.2 `check-gate-wave1-complete.test.mjs`: `before()` instantiates one Completed 2026-08-22: wave1-complete createBundle + createParityBundle clone a module-level before()-built template; 33 per-test spawns -> 1; template + clones tracked.
      template; `createBundle(name)` clones it (33 per-test spawns -> 1);
      template and clones tracked for after() cleanup. Focused run green.
- [x] 1.3 `check-gate-hitl1-recorded.test.mjs`: extract the 17 inline Completed 2026-08-22: hitl1-recorded 16 inline spawn pairs -> `createBundle(name)` helper + 1 template (17 -> 1).
      NEW_BUNDLE spawns into a `createBundle(name)` that clones a
      before()-built template (16 inline spawns removed). Focused run green.
- [x] 1.4 `check-gate-setup-ready.test.mjs`: template + clone with Completed 2026-08-22: setup-ready 12 inline spawns -> createBundle with `patchPlanBasename: true` (14 -> 1); identity check preserved.
      `patchPlanBasename: true` (gate enforces bundle-logical-name ==
      plan_basename == profile plan_basename). Focused run green.
- [x] 1.5 `wave1-target-receipt-gate.test.mjs`: template + clone (9 -> 1). Completed 2026-08-22: wave1-target-receipt-gate createBundle clones template (9 -> 1).
      Focused run green.
- [x] 1.6 `gate-dynamic-threshold.test.mjs`: template + clone (6 -> 1). Completed 2026-08-22: gate-dynamic-threshold createBundle clones template (6 -> 1).
      Focused run green.
- [x] 1.7 `tests/e2e/wave1-target-receipt-wave2-closure.test.mjs`: template + Completed 2026-08-22: wave2-closure (e2e) createBundle clones template (8 -> 1); class stays deterministic_e2e.
      clone (8 -> 1); class stays deterministic_e2e; chain steps unchanged.
      Focused run green.
- [x] 1.8 Sweep evidence: in the six files, remaining NEW_BUNDLE spawns == 1 Completed 2026-08-22: sweep - each of the six files has exactly 1 NEW_BUNDLE spawn (the template); only check-gate-setup-ready.mjs (gate) compares plan_basename, which is patched via patchPlanBasename; no other basename-identity gate found.
      per file (the template); grep for any gate/basename/plan_basename
      comparison beyond setup-ready; record result.

## 2. Verification

- [x] 2.1 Focused runs: `node --test` on each of the six changed files ->
      all pass. Completed 2026-08-22: all six files green (wave1-complete
      35/35, hitl1 16/16, setup-ready 12/12, wave1-target-receipt-gate 9/9,
      gate-dynamic-threshold 6/6, wave2-closure 8/8; 86 total). Wall:
      wave1-complete 51s->13s, hitl1 18s->5s (template-cleanup fix applied
      after first run exposed the multi-describe ENOENT).
- [x] 2.2 Full parallel: `npm test` -> 0 fail; wall recorded. Completed
      2026-08-22: green - 2799/2799, 0 fail, wall 139s (WS-A parallel
      baseline 165-168s).
- [x] 2.3 Second consecutive full parallel run -> 0 fail (flake = 0).
      Completed 2026-08-22: 136s, 2799/2799, 0 fail - two consecutive
      green, flake = 0.
- [x] 2.4 Full serial: `npm test -- --test-concurrency=1` -> 0 fail; wall
      <= 542s baseline; leaf count unchanged (2799). Completed 2026-08-22:
      green - 2799/2799, 0 fail, wall 500s (WS-A baseline 542s; target met;
      leaf count 2799).

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` - Establish the change-scoped
      diff boundary (six test files + one additive helper + this change's
      assets), review the actual diff against proposal/design/tasks/
      verification-plan, reassess `semantic-closure: not_applicable` against
      the implemented surfaces. Completed 2026-08-22: boundary = the six
      refactored suites (wave1-complete, hitl1-recorded, setup-ready,
      wave1-target-receipt-gate, gate-dynamic-threshold, wave2-closure) +
      `cloneBundleTemplate` helper (note: WS-A's parallelize change is also
      uncommitted in the worktree; WS-B-specific surface is as above). Diff
      matches proposal/design; each file has exactly 1 NEW_BUNDLE template
      spawn; patchPlanBasename only in setup-ready (the only gate comparing
      plan_basename); verification-plan claims exercised (focused 86/86;
      parallel A 139s / B 136s 2799/2799 x2; serial 500s 2799/2799);
      `semantic-closure: not_applicable` reassessed against implemented
      surfaces - holds (test setup process calls only, no runtime fact
      family or production surface). No actionable finding remains.

- [x] 3.2 Archive-mode governance: Completed 2026-08-22: reqs archive consistent (662); project specs 82 valid; routing assets valid (6 claims); semantic-closure assets valid; strict validate valid; `git diff --check` OK.
      `node openspec/governance/check-project-reqs.mjs --mode archive --change
      2026-08-22-de-spawn-bundle-instantiation`,
      `node openspec/governance/check-project-specs.mjs`,
      `node openspec/governance/check-verification-routing.mjs --change
      2026-08-22-de-spawn-bundle-instantiation --mode assets`,
      `node openspec/governance/check-semantic-closure.mjs --change
      2026-08-22-de-spawn-bundle-instantiation --mode assets`, strict change
      validation, and `git diff --check`. Done when all exit zero.

> The final archive transition is the governed finalizer
> (`node openspec/governance/finalize-change-archive.mjs --change
> 2026-08-22-de-spawn-bundle-instantiation`) - a lifecycle action, not a task.

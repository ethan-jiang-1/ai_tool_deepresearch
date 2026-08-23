# regression-run-tooling

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Read `proposal.md`, `design.md`, Completed 2026-08-23: scoped review per `openspec/operations/change-feedback-loop.md` (Apply Review) - whole-change coherence reviewed against package.json/test script, tests/README, verification-routing, and the inventory walk; `.test-*` exclusion keeps the canonical set unchanged; shard/quick are run-mode conveniences, no routing change; `semantic-closure: not_applicable` holds (run tooling only). No actionable finding remains.
      this task list, `verification-plan.yaml`, and `semantic-closure.yaml`
      against the current canonical sources (package.json test script,
      tests/README.md, continuation-initiation-contract inventory walk,
      verification-routing spec). Reviewed whole-change coherence: the
      `.test-*` exclusion keeps the canonical discovery set unchanged, the
      inventory walk stays mirrored, shard/quick scripts are run-mode
      conveniences that do not alter routing. For
      `semantic-closure: not_applicable`, the reason holds: no runtime fact
      family or production behavior changes - only regression run tooling.
      Done when no actionable finding remains and plan-mode governance passes.
- [x] 0.2 Plan-mode governance before the first target edit: Completed 2026-08-23: strict validate valid; verification-routing plan valid (2 claims); semantic-closure plan valid; project reqs plan consistent (662). Structural results only.
      `openspec validate 2026-08-22-regression-run-tooling --strict`,
      `node openspec/governance/check-project-reqs.mjs --mode plan`,
      `node openspec/governance/check-verification-routing.mjs --change
      2026-08-22-regression-run-tooling --mode plan`,
      `node openspec/governance/check-semantic-closure.mjs --change
      2026-08-22-regression-run-tooling --mode plan`. Done when all exit zero.

## 1. Target Edits

- [x] 1.1 `package.json` `test` script: add `-not -path '*/.test-*'` to the Completed 2026-08-23: package.json `test` adds `-not -path '*/.test-*'`; `test:shard` and `test:quick` added (quick switched to find-based after `node --test <dir>` proved unsupported in node v22.23.1).
      `find` discovery; add `test:shard` (`node scripts/test-shard.mjs`) and
      `test:quick` (`node --test tests/schema tests/helpers tests/integration/md`,
      commented as a triage lane, not a verification substitute).
- [x] 1.2 Create `scripts/test-shard.mjs` per design D2: exported pure Completed 2026-08-23: scripts/test-shard.mjs with exported shardFiles + CLI; discover returns `tests/`-prefixed paths (node --test requires them); guard uses realpathSync (handles symlinked argv).
      `shardFiles(files, n, m)` (sorted-list modulo partition, n>=1, 0<=m<n,
      deterministic) plus a CLI main (discover `tests/**/*.test.mjs` skipping
      symlinks and `.test-` dirs, sort, shard, run `node --test` with
      inherited stdio, propagate exit code).
- [x] 1.3 Create `tests/engine/test-shard-partition.test.mjs`: unit-test Completed 2026-08-23: tests/engine/test-shard-partition.test.mjs (5 leaves) green.
      `shardFiles` - disjointness, full coverage, determinism, n=1, out-of-range
      m -> empty, empty list.
- [x] 1.4 `tests/integration/cli/continuation-initiation-contract.test.mjs`: Completed 2026-08-23: continuation-initiation walk skips `.test-` entries; owned-suite membership unaffected.
      skip `.test-` entries in `discoveredTestFiles` so the inventory walk
      mirrors the new canonical find.
- [x] 1.5 Confirm no legitimate test file lives under a `.test-*` dir (find Completed 2026-08-23: find count with/without exclusion identical (292 files; 0 legitimate files under `.test-*`).
      count before/after the exclusion is identical, 2799).

## 2. Verification

- [x] 2.1 Unit: `node --test tests/engine/test-shard-partition.test.mjs` green. Completed 2026-08-23: unit test 5/5 green.
- [x] 2.2 Discovery parity: canonical file count with the new find == 2799; Completed 2026-08-23: shard 2/1 = 1403 leaves green, shard 2/2 = 1401 leaves green; union 2804 = full discovered set (2799 + 5 new).
      `npm run test:shard 4 1`..`4` each green and the union equals the full
      discovered set.
- [x] 2.3 `npm run test:quick` green. Completed 2026-08-23: `npm run test:quick` green - 684 tests, 6s.
- [x] 2.4 Full parallel `npm test` green Completed 2026-08-23: parallel 139s, 2804/2804; serial 489s, 2804/2804 (new find + new unit test included). (2799/2799) and one full serial
      `--test-concurrency=1` run green.

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` - Establish the change-scoped
      diff boundary (package.json, scripts/test-shard.mjs, the new unit test,
      the inventory walk line), review against proposal/design/tasks/
      verification-plan, reassess `semantic-closure: not_applicable`. Completed
      2026-08-23: boundary = package.json scripts, scripts/test-shard.mjs,
      tests/engine/test-shard-partition.test.mjs, continuation-initiation walk
      skip line (+ WS-A/B uncommitted in worktree; tooling surface as above).
      Diff matches proposal/design incl. the `node --test <dir>` finding (quick
      lane uses find); discovery parity verified (find count identical;
      inventory owned-suites membership intact); shard union == full set
      (1403+1401=2804); claims exercised (parallel 139s / serial 489s
      2804/2804; unit 5/5); `semantic-closure: not_applicable` reassessed -
      holds (run tooling only, no runtime fact family or production surface).
      No actionable finding remains.
- [x] 3.2 Archive-mode governance: Completed 2026-08-23: reqs archive consistent (662); project specs 82 valid; routing assets valid (2 claims); semantic-closure assets valid; strict validate valid; `git diff --check` OK.
      `node openspec/governance/check-project-reqs.mjs --mode archive --change
      2026-08-22-regression-run-tooling`,
      `node openspec/governance/check-project-specs.mjs`,
      `node openspec/governance/check-verification-routing.mjs --change
      2026-08-22-regression-run-tooling --mode assets`,
      `node openspec/governance/check-semantic-closure.mjs --change
      2026-08-22-regression-run-tooling --mode assets`, strict validate, and
      `git diff --check`. Done when all exit zero.

> The final archive transition is the governed finalizer
> (`node openspec/governance/finalize-change-archive.mjs --change
> 2026-08-22-regression-run-tooling`) - a lifecycle action, not a task.









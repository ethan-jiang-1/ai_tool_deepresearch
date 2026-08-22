# 01 — State And Measurements

Measured/verified 2026-08-21 on the development machine, serial, no parallel
test execution.

## Repo state

- `git rev-parse HEAD` → `27554eaab` (`docs: plan serial regression suite
  optimization`); `git status` clean. Plan baseline `046b741dc` is the parent
  commit → the plan's measurement is current.
- Canonical command (plan §Measurement):

  ```bash
  npm test -- --test-concurrency=1 --test-reporter=tap
  ```

  `package.json` test script expands to
  `find tests/ -name '*.test.mjs' -print0 | xargs -0 node --test`; the flags
  are appended by `npm test -- ...` to the `node --test` invocation.
- Plan's recorded baseline: `3028` passed / `0` failed / `822.455s` wall,
  `43` observations `>3s` totalling `357.641s`, top-10 `206.577s`.

## Suite inventory (291 modules)

| Directory | `.test.mjs` | Notes |
|---|---:|---|
| `tests/engine/` | 87 | helpers, queue/work-unit flow, static framework-doc contracts |
| `tests/integration/` | 158 | CLI + Markdown workflow checks |
| `tests/e2e/` | 14 | workflow-scale deterministic chains |
| `tests/schema/` | 18 | contract/schema validation |
| `tests/governance/` | 7 | requirement/spec governance checks |
| `tests/experiments_env/` | 4 | experiment-environment regression |
| `tests/host_tools/` | 3 | host-tool integration |
| **Total** | **291** | plus `tests/suspended/{unit,integration,e2e}/` (empty) |

Largest files by lines: `engine/work-unit-submit.test.mjs` (2953),
`integration/cli/operate-work-unit.test.mjs` (2249),
`integration/cli/check-gate-wave1-complete.test.mjs` (1602),
`engine/consistency-validator.test.mjs` (1270),
`e2e/work-unit-attempt-recovery.test.mjs` (1210).

## Fresh timings (this session)

Serial, one sample each — selection signal, not a guarantee.

| Run | Wall | Note |
|---|---:|---|
| `node --test --test-concurrency=1 --test-reporter=tap tests/integration/cli/continuation-initiation-contract.test.mjs` | **101.95s** | pure import-aggregator; re-executes 9 discovered suites |
| `node --test --test-concurrency=1 --test-reporter=tap tests/integration/cli/operate-work-unit.test.mjs` | **33.10s** | owned run; includes the 12.4s timeout-holder leaf |
| Full canonical run (`npm test -- --test-concurrency=1 --test-reporter=tap`), 2026-08-22 | **757.0s** | 3028 leaves / 0 fail; suite-level >3s inventory: 37 leaves / 254.7s |

→ Deduplicating the aggregate alone removes ~100s of *duplicated* execution
(plan's `>3s` inventory attributed only 12.433s to it). The engine aggregate
(`work-unit-attempt-recovery.test.mjs` importing disposition + transaction
suites) adds more. See `02-duplication-ledger.md`.

### Drift vs the plan baseline

| Metric | Plan (2026-08-21) | Fresh run (2026-08-22) |
|---|---:|---:|
| Wall time | 822.455s | 757.0s |
| Passed | 3028 | 3028 |
| >3s observations | 43 (357.641s) | 37 (254.660s) |

→ Same command, same machine class; the >3s set and its total shrank ~30%.
Timings are selection signals only; per-case durations in the plan's inventory
are approximate until the per-file driver profile lands.

## TAP structure discovery (important for tooling)

`node --test` with **explicit file args + `--test-reporter=tap` does NOT emit
per-file path subtests**. Top-level `# Subtest:` lines are the files' own
top-level describe names (verified: `grep -c "# Subtest: .*test\.mjs"` = 0 on
the full-suite TAP). Consequences:

- Per-file attribution is impossible from one full-suite TAP; use the per-file
  driver (`tools/run-per-file-profile.mjs`) which runs each of the 291 files
  individually, serially (~15-18 min).
- Suite-wide leaf inventory works with `parse-tap.mjs --collect-all`
  (3028 leaves; 37 >3s leaves this run).
- A describe named like `helper.mjs` would hijack naive file detection;
  `parse-tap.mjs` only treats subtest names containing `/` as file boundaries.

## Tools (in `tools/`)

| Tool | Purpose | Status |
|---|---|---|
| `parse-tap.mjs` | TAP → per-file/leaf profile; modes: fileOverride, collectAll | validated (agg 214 leaves/100.85s; full 3028 leaves/757.0s) |
| `count-preload.mjs` | NODE_OPTIONS `--import` hook counting child_process + fs copy per test file | validated. Caveat: must never ESM-import `node:fs`/`node:child_process` — Node snapshots builtin ESM named exports at first import, hiding later patches |
| `run-per-file-profile.mjs` | 291 × `node --test --test-concurrency=1 <file>` with preload; writes `/tmp/per-file-profile.json` + `/tmp/dsh-instr.log` | running (2026-08-22) |
| `collect-instr.mjs` | merge instrument log + profile into a cost table | pending instrument log |

## TAP leaf-timing method (reproducible)

Node's `tap` reporter emits, for every leaf `test()`, a YAML diagnostic block:

```
ok 1 - <name>
  ---
  duration_ms: 106.582041
  type: 'test'
  ...
```

- Top-level `# Subtest: <file path>` lines bound each file; leaves nest under
  them. A parser can attribute every `type: 'test'` leaf to its file and sum
  `duration_ms` per file → per-file serial profile and the `>3s` inventory in
  one pass over one TAP stream.
- Full canonical run was started 2026-08-21 (background job), TAP captured to
  `/tmp/full-suite.tap`; on completion, extract: fresh wall time (drift vs
  `822.455s`), per-file totals, complete `>3s` leaf list, and the leaf counts
  needed to close the duplication ledger.

## Fixed-wait inventory (static grep, `Atomics.wait` / `setTimeout`)

| File | Waits | Plan linkage |
|---|---|---|
| `tests/engine/work-unit-transaction.test.mjs` | `Atomics.wait` 1200 / 1000 / 900 ms; `setTimeout(poll, 10)` | P3 tail candidate; ~3.1s of pure holding |
| `tests/integration/cli/operate-work-unit.test.mjs` | `Atomics.wait` 2500 / 1800 / 6000 ms; `setTimeout(poll, 10)`; 10s reject timeout | P0.3 "event release" targets the 2×6s holder (plan finding 4) |

The engine-file waits are additional fixed-hold seconds beyond the plan's
P0.3 example; they are cheap event-release candidates for the P3 tail.

## Open items

- [ ] Parse `/tmp/full-suite.tap` when the background run finishes → fresh
      baseline + per-file profile + exact duplicated leaf counts.
- [ ] Reconcile spawn-call-site counts: plan cites `755` process/synchronization
      call sites; this session's `git grep -o` of
      `spawn(|spawnSync|execFile|execFileSync|execSync|fork(` counts `546`
      across 95 files. The two counts use different definitions; the
      instrumented profile (see `03`) is the authoritative number.

## Per-file profile (quiet-machine pass, 2026-08-22)

- Driver: `tools/run-per-file-profile.mjs` → 291 files, sum of per-file wall
  **767.7s** (canonical 757.0s + ~10s per-file startup). Total leaf time 722.7s.
- >3s leaves this pass: **36 / 258.9s** (plan: 43 / 357.6s). Per-case
  durations swing with machine state (finalizer rank-1: 24.2s here vs 69.2s
  plan; handoff :988: 24.1s vs 22.8s); ranking stable, absolutes not.
- Top files by wall: aggregate 101.5s (420 launches), e2e rerun-round 59.8s
  (463), finalizer 52.7s (25 heavy launches), operate-work-unit 34.0s (139),
  run-agent-experiment 27.7s (61), handoff 24.1s (142), operate-queue-validation
  23.1s (98 — NEW, not in plan >3s list), check-gate-wave1 22.9s (84),
  check-gate-wave0 22.3s (63), wave1-focus-contract 21.1s (149),
  post-final-lineage 19.8s (164), check-gate-wave2 14.8s (70).
- Full artifacts: `08-cost-table.md` (291 files, launches/copies/bytes),
  `09-per-file-profile.json` (raw).
- New P3 finding: gate-matrix families (check-gate-wave0/1/2-complete,
  readiness, hitl1/hitl2-recorded, operate-queue-validation,
  agent-experiment-autorun) = 36-98 launches each, 7-23s — dominate the
  1-3s tail; direct-matrix + shared-fixture candidates.

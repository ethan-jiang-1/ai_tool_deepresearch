# 03 — Cost Profile Method (Scope-Discovery Q3: "Where is time spent?")

Purpose: produce the plan's P0.1 artifact — "one serial per-file profile using
the exact canonical file selection, plus TAP leaf timings" — and the
source-category cost model the scope gate demands ("measured ranges by source
category, not the provisional P0-P3 allocation alone").

## Step 1 — Per-file profile from one canonical TAP stream (already running)

**Timing discipline:** per-file wall times are only meaningful on a QUIET
machine. Do not run the driver while subagents or other heavy work are active —
the plan requires "same machine conditions" for before/after comparisons.
Instrument COUNTS (spawn/copy) are load-independent; wall times are not.
(First attempt 2026-08-22 was aborted because concurrent subagent load
inflated per-file timings ~5-10×.)

Parse `/tmp/full-suite.tap` (or a fresh canonical run) with a small Node
script:

- Walk the TAP stream; each top-level `# Subtest: <path>` opens a file scope;
  each nested `type: 'test'` leaf has `duration_ms`.
- Emit per file: wall sum, leaf count, top-5 leaves, `>3s` leaves; plus the
  global `# duration_ms` footer as the baseline wall time.
- Output: `per-file-profile.csv` style table (file, leaves, sum_s, top_leaf_s)
  and the full `>3s` inventory — comparable row-by-row with the plan's
  Complete Inventory to detect drift.

Script placement: this research folder or `_temp/` (repo rules: never repo
root / `DEEP_RESEARCH_HARNESS/`; run-scoped helpers belong in run-bundle
`_scripts/`, but these are repo-analysis tools, not run helpers).

## Step 2 — Subprocess count per file (instrumented pass)

Goal: attribute process-spawn cost, not just wall time.

- Preload hook (CJS, `NODE_OPTIONS="--require <hook>"`) that patches
  `child_process` (`spawn`, `spawnSync`, `execFile`, `execFileSync`, `execSync`,
  `fork`) and counts per test-file child. `node --test` spawns one child per
  test file, so a per-process counter maps 1:1 to the file.
- Counts must distinguish: production CLI launches vs. test-helper launches
  (the plan's `755` figure vs. this session's `546` grep differ by counting
  definition — resolve and record the definition).
- Also count `run-agent-experiment` supervisor launches inside host-tool
  suites (plan P2 hypothesis queue).

## Step 3 — Fixture-copy count/bytes (instrumented pass)

- Patch `fs` copy ops (`copyFile`, `cpSync`, `cp`) in the same preload; report
  count + bytes per test file. Feeds the "share immutable setup / clone per
  mutation" P1 decisions (rerun-round-continuity, wave1-focus, C5/Final).

## Step 4 — Fixed-wait correlation

- Static inventory exists (`01`). Correlate each `Atomics.wait`/`setTimeout`
  site with its leaf's `duration_ms` from the profile → the "fixed hold vs.
  real work" split per leaf. P0.3 event-release candidates must each show
  "contention facts observable before the hold ends".

## Step 5 — Baseline-feasibility seeds for P1 (record, don't build yet)

For each workflow family in `04`, answer per plan gate row 5: provenance of
the shared baseline, absolute binding assumptions, first independent mutation
→ `safe at <checkpoint> | unsafe | unknown`.

## Exit evidence (plan P0)

- Module inventory proves every active owned suite executes once (duplication
  ledger closed with leaf counts).
- Per-file serial profile + subprocess/fixture/wait attribution table.
- P0 measured saving ≥120s on two serial before/after runs (slower run wins).

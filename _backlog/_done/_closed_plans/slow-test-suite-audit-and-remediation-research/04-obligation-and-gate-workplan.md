# 04 — Obligation And Gate Workplan (Scope-Discovery Q2/Q4/Q5/Q6)

## Reading clusters for the obligation ledger

One row per `>3s` case (and per file above 1s): assertion, production
authority (which Engine/CLI fact it binds), mutation vs. no-mutation claim,
neighboring coverage, and disposition. Seed judgments below are from the
plan's Complete Inventory — re-verify each against the code before deciding.

| Cluster | Files (slow observations / slow time) | Seed dispositions (plan rows) |
|---|---|---|
| A. Governance finalizer | `integration/governance/change-feedback-finalizer.test.mjs` (5 / 128.610s), `change-feedback-loop-archive.test.mjs` (1) | Restructure P0 (rows 1, 3, 4, 7, 12); Keep P1 (row 6) |
| B. Rerun continuity | `e2e/rerun-round-continuity.test.mjs` (13 / 56.435s) | Keep + profile P1/P2 (rows 15, 16, 21, 24, 26, 27, 28, 30, 32, 33, 35, 36, 37) |
| C. Host-tool supervision | `integration/host_tools/run-agent-experiment.test.mjs` (7 / 25.319s), `host-tools/claude-deepseek.test.mjs` (1) | Split matrix P1/P2 (rows 19, 31, 38, 39, 41, 42, 43); Keep + profile P2 (row 40) |
| D. Wave1 focus coverage | `integration/cli/wave1-focus-coverage-contract.test.mjs` (4 / 20.615s) | Share setup P1 (rows 13, 22, 25, 34) |
| E. Handoff witnessing | `integration/cli/handoff-witnessing-lifecycle.test.mjs` (1 / 22.838s) | Keep + profile P1 (row 2) |
| F. Remaining e2e/integration | 13 observations / 103.824s (post-final-rerun-lineage-continuity, final-refinement-continuity, seed-topic-projection-materialization, operate-topic-state-projection, case-138, gate-dynamic-threshold, reference-evidence-map-rerun, wave1-focus-coverage-rerun) | Keep + profile / Share setup (rows 5, 10, 11, 14, 17, 18, 20, 23, 29) |

Suggested execution: one background subagent per cluster (A-F) with the plan's
decision matrix + this template; each returns a mini obligation ledger. Do not
read `_old_topics` archives for context; the plan + code + archived OpenSpec
changes are sufficient.

## Reading template (per case)

1. Test name, file:line, `duration_ms` from profile.
2. Exact assertion(s) — what fact would fail?
3. Production authority — which Engine/CLI/checker fact is bound? Is a
   production path (CLI subprocess, finalizer, synchronizer) actually
   exercised, or could a direct helper prove the same fact?
4. Mutation claims — what must NOT mutate; what must persist.
5. Neighboring coverage — same fact proven elsewhere (retained sentinel?
   direct matrix?).
6. Disposition + evidence required (plan decision matrix).

## Baseline-feasibility questions (gate row 5)

- **B (rerun continuity):** plan says the family "already us[es] a shared
  snapshot" but "each restored branch still launches many production CLIs".
  Find where the snapshot is built: once per run or per branch? At what
  checkpoint is it byte-stable? Which branch is the first independent
  mutation?
- **D (wave1 focus):** rows 13/22/25/34 all descend from a pre-Wave1 baseline.
  Is one immutable baseline cloneable per variant, or does each variant need
  distinct authored state?
- **F (C5/Final):** `post-final-rerun-lineage-continuity` (row 5) "copies
  snapshot" — measure copy count/bytes (profile step 3) before touching.
- Every "share setup" row needs: provenance of the baseline, absolute binding
  assumptions (paths, bundle ids, ledger rows), and the first mutation →
  verdict `safe at <checkpoint> | unsafe | unknown`.

## Suspension registry (gate row 6 / plan §Controlled Suspension)

- `tests/suspended/{unit,integration,e2e}/` already exist — but the plan
  requires `tests/suspended/README.md` (original path/class, test name,
  measured time, proof obligation, why indeterminate, owner, replay command,
  replacement hypothesis, dated review condition) **before** the first move.
  Create it as part of any suspension work.
- Suspension saves operating latency only; it never satisfies a P0-P3 budget
  or the durable `<300s` gate. Do not suspend before the decision matrix is
  applied.

## OpenSpec decision gate (after scope discovery; plan §OpenSpec Decision Gate)

- No active changes today (`openspec/changes/` = `archive/` only).
- Expected outcome shape: dedup is a narrow harness fix (maybe a
  documentation-worthy narrow task, no behavioral Change); snapshot/matrix
  work touches distinct proof boundaries → separate Changes, each with its own
  obligation + baseline/replacement map; anything touching discovery, classes,
  or proof permissions is an explicit behavior/governance Change.
- Every proposal must use the accepted `verification-routing` selection rules;
  do not create a placeholder "make tests faster" Change.

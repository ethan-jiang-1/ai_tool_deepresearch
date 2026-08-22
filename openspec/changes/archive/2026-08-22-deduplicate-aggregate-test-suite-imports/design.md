## Context

The serial suite duplicates ~107s of execution because two test files import
canonically discovered `.test.mjs` suites (see `proposal.md` and
`_backlog/plans/slow-test-suite-audit-and-remediation-research/02-duplication-ledger.md`).
`continuation-initiation-contract.test.mjs` is a pure import-aggregator: it
declares no own assertions and its only purpose is the continuation-initiation
verification claim's execution entry. `tests/engine/work-unit-attempt-recovery.test.mjs`
has its own static inventory assertions plus two side-effect imports that
serve no own-assertion purpose.

## Goals / Non-Goals

**Goals:**

- Every canonically discovered `.test.mjs` module executes exactly once.
- Keep the `@impl` requirement linkage and the file identity of both assets
  (they are referenced by archived verification-plans and the requirement
  registry is unaffected).
- Prove ownership without re-execution: the aggregate asserts the nine owned
  suites exist and are covered by the canonical glob.
- Keep every owned leaf and its native proof boundary unchanged.

**Non-Goals:**

- No other speed work (finalizer restructure, snapshot sharing, matrices,
  P3 tail) — deferred per
  `_backlog/plans/slow-test-suite-audit-and-remediation.md` §"Execution
  Decision — 2026-08-22".
- No change to `npm test` discovery, concurrency, timeouts, skips, or test
  classes.

## Design

### Aggregate → inventory/wiring test

`continuation-initiation-contract.test.mjs` becomes a small `node:test` suite
with one assertion set:

- A hard-coded list of the nine owned suite paths (relative to repo root,
  mirroring the current imports exactly).
- For each: `existsSync` at the repo-root-resolved path, and membership in the
  set of files matched by a dependency-free recursive walk that mirrors the
  canonical glob `tests/**/*.test.mjs` (`find tests/ -name '*.test.mjs'`).
  `find` does not follow symlinked directories, so the walk uses `lstatSync`
  and skips symlinks — `tests/fixtures/DEEP_RESEARCH_HARNESS/*` are symlinks
  into the harness and must not be traversed (loop/cost risk).
- Repo root is resolved from `import.meta.url` (robust to cwd), matching how
  other suites locate the repo root.

The test deliberately does not `import` any owned suite, so no leaf is
re-executed. If a future change renames/moves/retires an owned suite, this
inventory test fails — that is the intended wiring signal (update the list in
the same change that moves the suite).

### Engine recovery suite

Remove the two side-effect imports
(`./work-unit-attempt-disposition.test.mjs`,
`./work-unit-transaction.test.mjs`). Nothing in the file references their
module scope (they are pure side-effect imports). Its 4 owned leaves (static
implementation-inventory assertions) are unchanged and still run once.

### Duplication ledger (measured)

Measured on 2026-08-22 per-file profile (single samples; durations vary ±2%
across runs).

| Module | Owned leaves | Removed duplication |
|---|---:|---|
| `tests/integration/cli/continuation-initiation-contract.test.mjs` | 1 (new inventory test) | 214 leaves / 420 launches / ~101-103s |
| `tests/engine/work-unit-attempt-recovery.test.mjs` | 4 (unchanged) | disposition + transaction suites re-run inside it / ~5.5s |

Expected suite leaf delta: 3028 → 2798 (aggregate 214→1 drops 213; recovery
child 21→4 drops 17). Expected wall saving ≈ 107-108s.

## Risks And Open Questions

- Requirement registry: `@impl` IDs (SWE-001, SWE-006, CPT-001, CPT-003,
  DEW-003, GSK-006, CHI-001; DEW-022..024, CHI-004) are not bound to test
  paths in the registry (checked) — no registry edit needed.
- Active verification-plans: `openspec/changes/` holds only `archive/`; no
  active asset-path constraint on either file.
- The inventory walk is a single in-process directory scan that adds no
  process launches; the focused aggregate file runs in ~1.0s wall including
  Node startup (was 101.95s). Symlinked directories under `tests/fixtures/`
  are skipped so the walk cannot traverse the harness tree.
- Verification of "one execution": compare canonical TAP leaf counts before
  and after (the aggregate's 214 duplicated leaves disappear; total leaf count
  drops by exactly the duplicated set, and `rerun-round-continuity`-style
  suites keep their single pass).

# 02 — Duplication Ledger (Scope-Discovery Q1: "What actually runs twice?")

## Static import graph of `.test.mjs` modules

Complete static scan of `tests/**/*.test.mjs` for relative imports of other
`*.test.mjs` files (side-effect `import './x.test.mjs'`). Dynamic
`import('./x.test.mjs')` calls: **none**.

### 1. `tests/integration/cli/continuation-initiation-contract.test.mjs`

Pure import-aggregator — 13 lines total, **zero own assertions**. Header
declares `@impl SWE-001, SWE-006, CPT-001, CPT-003, DEW-003, GSK-006, CHI-001`.
Imports 9 discovered suites (all canonically run by `npm test`):

`advance-status`, `enter-phase`, `check-gate-rerun-ready`,
`check-gate-seed-topics-ready`, `check-gate-wave0-complete`,
`check-gate-wave1-complete`, `check-gate-wave2-complete`,
`operate-work-unit`, `transition-integrity` (all `tests/integration/cli/`).

**Measured cost:** aggregate alone = **101.95s** wall (this session).
`operate-work-unit` owned run = 33.10s. The plan's `>3s` inventory credited
this duplication only 12.433s (the single visible slow leaf); **the true
duplicated cost is ≈102s**, i.e. most of the plan's whole P0 budget.

### 2. `tests/engine/work-unit-attempt-recovery.test.mjs`

94-line suite with **its own static inventory assertions** ("routes every
work-unit authority mutation through an exact-target v2 transaction", etc.)
**plus** two side-effect imports of discovered suites:

`./work-unit-attempt-disposition.test.mjs`, `./work-unit-transaction.test.mjs`
(both `tests/engine/`).

→ The imported suites execute twice under canonical discovery. Cost not yet
isolated; `work-unit-transaction` (957 lines) contains ~3.1s of fixed
`Atomics.wait` plus heavy process work, so this is non-trivial.

## Constraints and facts relevant to the repair

- **No active OpenSpec change references either aggregate path.** All
  verification-plan declarations are in archived changes
  (`2026-07-17-simplify-iterative-research-interaction`,
  `2026-07-31-make-work-unit-attempt-recovery-explicit`,
  `2026-08-07-align-supersession-root-masking-fixture`). `openspec/changes/`
  currently contains only `archive/`. → no `check-verification-routing
  --mode assets` path constraint for the repair.
- A closed-plan machine-checks catalog already documents the aggregate as
  "import-aggregator re-running advance-status/enter-phase/check-gate-*/
  operate-work-unit/transition-integrity suites" (do-not-read archive area;
  noted from a grep hit only).
- The aggregate carries requirement linkage via `@impl` comments. Repair must
  keep the requirement linkage visible (comment or registry row) — check the
  requirement registry for path references before moving/renaming.
- Plan decision matrix disposition for both rows: **Deduplicate** — remove the
  aggregate execution, retain one owner for every owned leaf, with "module
  inventory shows one execution and all owned cases still pass" as required
  evidence.

## Candidate repairs (evaluate in order; decide only after the TAP profile)

1. **Aggregate → inventory/wiring test (no import).** Make
   `continuation-initiation-contract` assert that the 9 owned suites exist and
   are discovered (file-list + leaf-count check against the canonical glob),
   without importing them. Keeps the file as the verification-plan-shaped
   asset for the claim; drops ~102s. The same pattern fixes the engine
   aggregate's two imports (which serve no own-assertion purpose there).
2. **Non-test shared contract module** for any shared helper the imported
   suites genuinely need (the plan's P0.2 wording). Only if option 1 cannot
   preserve the proof.
3. Verify: after repair, `npm test -- --test-concurrency=1` TAP shows each
   owned leaf exactly once; owned suites still pass; `@impl` linkage retained.

## Open items

- [ ] Quantify engine-aggregate duplicated cost from the full-run TAP
      (per-file leaves for `work-unit-attempt-disposition`,
      `work-unit-transaction`, and the recovery suite's own leaves).
- [ ] Confirm requirement registry rows for SWE-001/CPT-001/… / DEW-022..024 /
      CHI-001/004 do not bind the file path.
- [ ] Re-run after repair: aggregate file focused run + full canonical run
      (both must pass; plan verification §1-§2).

---

## Measured quantification (per-file profile, 2026-08-22 quiet-machine pass)

| Module | Leaves | Wall | Process launches | Note |
|---|---:|---:|---:|---|
| `tests/integration/cli/continuation-initiation-contract.test.mjs` | 214 | **101.5s** | **420** | pure import-aggregator re-executing 9 discovered suites |
| `tests/engine/work-unit-attempt-recovery.test.mjs` | 21 | **5.5s** | (in engine counts) | own inventory + 2 imported suites re-executed |

- Aggregate dedup ≈ **101.5s wall / 420 child-process launches** removed → the
  single largest measured item in the suite; plan's `>3s` inventory credited it
  12.433s.
- Engine aggregate dedup ≈ **5.5s** (disposition + transaction suites run once,
  recovery suite keeps its own 21 leaves).
- Combined dedup saving ≈ **107s** of the suite's 767.7s per-file sum (~14%).
- Full cost table: `08-cost-table.md` (291 files, launches/copies/bytes).

## Repair decision (updated with measurements)

Both rows → **Deduplicate** per the plan's decision matrix:
1. `continuation-initiation-contract.test.mjs` → convert to an
   inventory/wiring test that asserts the 9 owned suites exist and are
   discovered (file-list + leaf-count check), without importing them. Keeps
   the verification-plan-shaped asset and `@impl` linkage; drops 420 launches.
2. `tests/engine/work-unit-attempt-recovery.test.mjs` → remove the two
   side-effect imports (they serve no own-assertion purpose; its 21 owned
   leaves are static inventory).
3. No active verification-plan references either path (checked); requirement
   registry path-binding check remains as the only pre-implementation gate.

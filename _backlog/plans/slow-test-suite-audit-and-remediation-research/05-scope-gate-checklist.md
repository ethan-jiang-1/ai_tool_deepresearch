# 05 — Scope-Gate Checklist (tracking)

Mirrors plan §"Scope Discovery Gate" (closing conditions), §"Verification And
Stop Conditions", and §"OpenSpec Decision Gate". Tick only with measured
evidence.

## Closing conditions (all five required)

- [ ] **C1 — Every proposed removal/split/suspension has an obligation map and
      a named native verdict authority.** (Ledger per cluster in `04`.)
- [ ] **C2 — Potential savings expressed as measured ranges by source
      category** (dedup / fixed-wait / snapshot-share / direct-matrix /
      CLI-prefix), not just the provisional P0-P3 allocation. (Profile in
      `03` + fresh full run.)
- [ ] **C3 — Tests grouped by shared behavioral boundary and implementation
      shape**, not duration/directory. (Cluster grouping in `04`.)
- [ ] **C4 — Each group has a decision:** no change / narrow harness-only /
      behavior-or-spec change / further investigation.
- [ ] **C5 — Scope statement distinguishes temporary operating-lane relief
      (suspension) from the durable, complete-coverage `<300s` result.**

## Measurement gate

- [ ] Fresh canonical baseline on this machine (background run in progress):
      `npm test -- --test-concurrency=1 --test-reporter=tap` → wall time vs
      plan's `822.455s`.
- [ ] Per-file profile + full `>3s` inventory parsed from one TAP stream;
      drift vs plan inventory recorded.
- [ ] Duplication ledger closed with exact duplicated leaf counts
      (aggregate ≈102s + engine aggregate quantified).
- [ ] Spawn/fixture/wait attribution table produced (definitions recorded —
      plan's `755` vs grep `546` discrepancy resolved).

## Verification / stop conditions (plan §"Verification And Stop Conditions")

- [ ] Every changed file: focused serial run first; report
      test/pass/fail/skip/cancel + leaf timing.
- [ ] Each P0-P3 workstream: canonical command twice, slower run is the
      result; record both walls + counts + per-file delta.
- [ ] Test-count change requires obligation ledger rows (old → retained /
      direct matrix / sentinel / approved retirement; suspend row is NOT a
      replacement).
- [ ] Durable acceptance: two clean serial runs, each **strictly <300s**, zero
      failures/cancellations, no unresolved suspension rows.
- [ ] Stop-and-redesign triggers honored: removing a unique production
      boundary, hand-written Engine authority, test contamination, missed
      budget. No concurrency/skip/timeout/discovery-exclusion loopholes.

## Decision-gate options (choose one after C1-C5)

- [ ] Isolated harness defect, no proof/routing consequence → document why no
      behavioral Change is needed.
- [ ] Coherent shared test-harness behavior → one Change naming that boundary.
- [ ] Distinct proof boundaries → separate Changes with own maps.
- [ ] Discovery/class/proof-permission alteration → explicit
      behavior/governance Change, scope accepted-spec impact first.
- [ ] Savings or proof equivalence unknown → keep exploring; no placeholder
      Change.

---

## Progress (2026-08-22)

- [x] **C1** — obligation maps for all 42 distinct >3s cases: ledgers 06-a..g complete (all 7 clusters; every case has assertion/authority/mutation/neighbors/disposition/evidence).
- [x] **C2** — savings by source category with measured ranges: `07` (dedup 107s measured; finalizer ~35-45s; event release ~10-12s; snapshot/matrix ~25-35s; gate-matrix P3 ~40-60s), backed by `08-cost-table.md` (291 files, launches/copies/bytes) + `09-per-file-profile.json`.
- [x] **C3** — clusters grouped by behavioral boundary + implementation shape (finalizer / rerun / host-tools / wave1 / handoff / e2e-lineage / misc), not by duration.
- [x] **C4** — every group has a decision (see `07` disposition table).
- [x] **C5** — no suspension proposed; durable <300s is the only acceptance target.
- [x] Fresh canonical baseline: 757.0s / 3028 leaves / 37 >3s leaves. Per-file profile: 291 files, 767.7s sum, 36 >3s leaves / 258.9s (quiet-machine pass).
- [x] Instrument counts → `08-cost-table.md` (launches/copies/bytes per file; aggregate 420 launches, finalizer 25 launches but ~2s each, archive fixture 178KB).
- [x] Duplication ledger quantified: 101.5s / 420 launches (aggregate) + 5.5s (engine aggregate) = ~107s — see `02`.
- [ ] Decision-gate options: narrow harness fix (dedup) + one harness-economy Change + possibly finalizer Change — see `07` §6. **Final boundary choice is the next decision.**

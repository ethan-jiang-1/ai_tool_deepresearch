# 07 — Scope-Gate Consolidation (DRAFT)

> Status: **DRAFT — pending** (a) F-cluster ledgers (F2/F1a in flight),
> (b) per-file profile on a quiet machine. Numbers marked `[pending]` are
> placeholders from plan inventory + subagent economics; replace with
> measured values before closing the gate.
> Companion to plan §"Scope Discovery Gate" + §"OpenSpec Decision Gate".

## 1. Measured baseline (fresh, 2026-08-22)

- Canonical command: `npm test -- --test-concurrency=1 --test-reporter=tap`
- Wall **757.0s** (plan baseline 822.455s — machine drift ~8%); 3028 leaves,
  0 fail. Suite-level >3s inventory this run: 37 leaves / 254.7s (plan: 43 /
  357.6s). Per-case durations are selection signals, not guarantees.
- Duplicated execution measured: `continuation-initiation-contract.test.mjs`
  alone = **101.95s** (214 leaves re-run); plan attributed 12.433s to it.

## 2. Savings by source category (measured ranges; budget plan P0-P3)

| Category | Cases/clusters | Measured/estimated saving | Plan budget |
|---|---|---|---|
| **Dedup (aggregate imports)** | continuation-initiation aggregate (9 suites), engine recovery aggregate (2 suites) | **≈102s** measured + engine aggregate `[pending]` (plan: 12.4s) | P0.2 |
| **Finalizer restructure** | change-feedback-finalizer (rows 1,3,4,7,12 ≈ 128.6s cluster; ~89 subprocesses) + archive row 6 | est. **60-70s** (direct checker matrices + 2-3 sentinels; drop 6× full-prefix replay + 3-5 redundant `openspec instructions` launches) | P0.4/P0.5 |
| **Event release** | operate-work-unit 2×6s holder (12.4s leaf); engine transaction Atomics.wait (3.1s) | **~10-13s** (handshake keeps contention facts; plan's own P0.3) | P0.3 |
| **Snapshot share (P1)** | wave1-focus (4 rows, 20.6s cluster → ~15s saved); rerun variants (728×2, 739 → ~10s); handoff prefix (22.8s case, 60% dup prefix → ~10s) | est. **30-35s** | P1 |
| **Split matrix (P2)** | host-tools run-agent-experiment (7 rows, 25.3s; reasonForProcess/completion/cost are pure — unit suite already covers most; keep 1-2 supervisor sentinels) | est. **10-15s** | P2 |
| **Fixture share (P2/P3)** | gate-dynamic-threshold 8c table (6 rows), claude-deepseek setupTemp 14×→3× | est. **3-5s** | P2/P3 |
| **1-3s tail (P3)** | remaining files above 1s (per-file profile `[pending]`) | `[pending]` — target ~125s across ~280 files | P3 |

**Working estimate: dedup + finalizer + event-release + snapshot + split ≈
215-240s of the needed 522s; the 1-3s tail (≈464s of non-`>3s` wall) supplies
the rest via P3.** These are planning ranges, not achieved speed — each
workstream earns its budget from two serial before/after runs.

## 3. Disposition summary (by cluster; ledgers 06-*)

| Cluster | Dispositions | Retained real sentinels |
|---|---|---|
| A finalizer | 5× Restructure, 1× Retain (archive success) | 1 blocked early-stop, 1 archive success, 1-2 short-circuit CLIs |
| B rerun | 2 Retain (470, 458), 6 Keep+profile, 3 Share setup, 3 Keep+profile with long-chain sentinel (759/772/784 — NOT dedup; integration twin is short-chain) | full rerun chain (458), receipt replay (470), fail/repair (843), no-transition invariants (697/709) |
| C host-tools | 5× Split matrix, 2-3× Keep+profile, 1× Share setup | 1-2 supervisor sentinels (budget wiring :416, stdio :543), completion integration (:496/:509) |
| D wave1 | 4× Share setup | 1 real wave1 Gate + inspect sentinel |
| E handoff | 1× Keep + Share prefix | three-branch lifecycle proof via real CLIs |
| G misc | 2× Keep+profile, 1× Keep+profile + 8c-table share | public-template submit, case-138 setup script, dynamic-threshold gate |
| F e2e lineage | 2× Keep (18, 17), 3× Keep+profile (10, 11, 14), 1× Keep+profile (5); row 11 has an Investigate sub-question (`plan_basename` derivation — see ledger F) | C5 lineage append (5), refinement gate (14), premature-entry rejection (17), round-mismatch CLI wiring (10), synchronizer round-discrimination (11), full-chain ordering canary (18) |

## 4. Guardrail check

- All ledgers confirm: no candidate hand-authors a gate/transition/status/
  ledger/trace/verdict; snapshots copy byte-identical production-built
  predecessors; fake Agent children prove host supervision only.
- No candidate moves a test class, changes discovery, or adds a periodic lane
  → no verification-routing change is required by the current dispositions.
- Suspension registry: NOT needed so far — every `>3s` case got a safe
  disposition. `tests/suspended/` stays empty; README not created.

## 5. Open questions (close before/at implementation)

1. **Engine aggregate cost** (work-unit-attempt-recovery imports): quantify
   from per-file profile `[pending]`.
2. **Finalizer direct matrix wiring**: checkers that arm outer subprocesses
   (e.g. `check-verification-routing.mjs:101` → `validate-playbook.mjs`) must
   stay in the sentinel, not the direct path (ledger A open q3).
3. **Rank 6 archive snapshot**: byte-safety of the full synchronized chain —
   until proven, retain as-is.
4. **Rank 12 single invocation**: whether `openspec instructions` can emit
   both apply+archive in one launch is an external-CLI capability.
5. **Rerun long-chain sentinel count**: 759/772/784 need ONE long-chain
   sentinel per family + integration twin; decide exact reduction.
6. **Byte-stability checkpoints**: `phase-wave1.md` (D), `post-wave2_complete`
   (B), `post-passWave0WithDiagnostics` (E) — verify zero re-runs before
   implementing snapshot sharing.
7. **`assertOnlyTraceDiagnosticsChanged`** invariant (B rows 697/709) — decide
   sentinel preservation when consolidating.
8. **C-level P1/P2 tag mismatch** (plan inventory tags rows 19/31 as P1 while
   §P2.2 names run-agent-experiment) — resolved as P2 per §P2.2's explicit
   text; record in the Change proposal if it matters.

## 6. OpenSpec decision-gate outlook (plan §"OpenSpec Decision Gate")

Evidence so far points to:
- **Narrow harness fix (no behavioral Change):** dedup of the two aggregates
  (≈102s) — module-inventory repair only; document why no proof boundary
  changes.
- **One Change, coherent boundary "test-harness predecessor/economy":**
  snapshot sharing + direct matrices (wave1, rerun variants, handoff prefix,
  host-tools split) — shares one test-harness behavior and proof-preservation
  design; its proposal must name that boundary and carry per-cluster
  obligation + baseline/replacement maps.
- **Finalizer restructure** may need its own Change (distinct proof
  boundary — governance checker matrices vs. CLI sentinels) OR fold into the
  harness-economy Change if the obligation maps stay per-cluster.
- No discovery/class/proof-permission alteration → no
  behavior/governance-level Change expected.
- Decision deferred until F ledger + per-file profile close the gate.

---

## Update 2026-08-22 — measured per-file profile (quiet machine)

- Per-file driver: 291 files, sum of per-file wall **767.7s** (canonical
  baseline 757.0s + ~10s per-file startup). Total leaf time 722.7s.
- >3s leaves this pass: **36 / 258.9s** (plan: 43 / 357.6s — per-case
  durations swing with machine state; e.g. finalizer rank-1 measured 24.2s
  here vs 69.2s in the plan; ranking is stable, absolute values are not).
- **Top files by wall + launches (see `08-cost-table.md`):**

| File | Wall | Leaves | Launches | Copies |
|---|---:|---:|---:|---:|
| continuation-initiation-contract (aggregate) | 101.5s | 214 | 420 | 1 |
| e2e rerun-round-continuity | 59.8s | 16 | 463 | 18 |
| change-feedback-finalizer | 52.7s | 7 | 25 | 19 (164KB) |
| operate-work-unit | 34.0s | 42 | 139 | 0 |
| run-agent-experiment | 27.7s | 30 | 61 | 0 |
| handoff-witnessing-lifecycle | 24.1s | 1 | 142 | 0 |
| operate-queue-validation (NOT in plan >3s list) | 23.1s | 39 | 98 | 0 |
| check-gate-wave1-complete | 22.9s | 35 | 84 | 0 |
| check-gate-wave0-complete | 22.3s | 28 | 63 | 0 |
| wave1-focus-coverage-contract | 21.1s | 4 | 149 | 0 |
| post-final-rerun-lineage-continuity | 19.8s | 4 | 164 | 7 (5KB) |
| check-gate-wave2-complete | 14.8s | 31 | 70 | 0 |
| operate-topic-state-projection | 11.4s | 15 | 65 | 0 |
| final-refinement-continuity | 11.4s | 2 | 90 | 0 |
| change-feedback-loop-archive | 9.4s | 1 | 3 | 20 (178KB) |

- **New P3 findings (not in the plan's >3s inventory):** the gate-matrix
  families (`check-gate-wave0/1/2-complete`, `check-gate-readiness-passed`,
  `check-gate-hitl1/hitl2-recorded`, `operate-queue-validation`,
  `agent-experiment-autorun`) each run 36-98 launches with many small leaves
  (22.9s/84, 23.1s/98, 22.3s/63, 10.4s/55, 9.3s/58, 8.3s/36, 7.2s/61) —
  these dominate the 1-3s "tail" the plan's P3 targets; they are direct
  matrix + shared-fixture candidates.
- **Measured savings summary (replaces estimates where measured):**
  - Dedup: **107s** (101.5 aggregate + 5.5 engine) — measured.
  - Finalizer restructure: target ~35-45s (rank-1 now 24.2s + guidance rows
    ~16s + reservation 10.3s; direct matrices + sentinels).
  - Event release: ~10-12s (holder 12.5s → handshake; engine waits ~3s).
  - Snapshot/matrix: ~25-35s (wave1 21.1s file, rerun variants, handoff 24.1s
    with 142 launches → prefix sharing).
  - Gate-matrix P3: ~40-60s (files above, launch-count reduction).
  - **Projected total ≈ 220-250s of the needed ~470s below 300s target** —
    the rest must come from P3 per-file tail work per the plan's discipline.

---

## Implementation guardrail (user decision, 2026-08-22)

**Never merge independent test cases for speed.** Tests exist to prove
independent, clear facts; every `it()`, every parameterized variant (e.g.
`sameAttempt` in the transaction-holder tests), and every assertion is
preserved as-is. Optimization only changes *how a case is set up or held*
(fixed wait → explicit ready/release handshake; repeated setup → copied
immutable baseline; redundant subprocess → direct matrix + retained
sentinel). A "share setup" or "split matrix" disposition must keep all old
rows/assertions and all retained real boundaries; it never collapses cases.
This is the reading for plan decision-matrix rows "Share immutable setup",
"Split", and P1.4's "table-driven direct matrix".

## Workstream 2 (event release) — in progress 2026-08-22

Change `replace-transaction-holder-fixed-wait` (plan P0.3): replaced the
2×6s fixed `Atomics.wait` in the `operate-work-unit.test.mjs:1707` holder
with a ready/release file handshake (holder writes `*.holder-ready`, polls
≤30s for `*.holder-release`; test waits ready → runs every assertion
unchanged → writes release). Focused run 42/42 pass; holder leaf **12.5s →
1.2s** (~11.3s saved). No assertions changed, no cases merged; both
`sameAttempt` variants preserved. Full canonical run pending; engine
transaction waits (`:900/:1200/:1800`) remain a P3 item (separate facts).

# Slow Test Suite — Research Notes

> Status: **scope discovery substantially complete — gate closing** | Updated:
> 2026-08-22 | Companion to `_backlog/_done/_closed_plans/slow-test-suite-audit-and-remediation.md`

These notes accumulate the *scope-discovery research* the plan explicitly
requires **before** any OpenSpec Change is proposed (plan §"Scope Discovery
Gate" and §"OpenSpec Decision Gate"). They are working material for later
adjustment sessions: measurements, ledgers, methods, and open questions —
**not** an approved change scope and **not** a substitute for the plan's
decision matrix.

## How to use

1. Start from the plan, then this folder. `01` and `02` are already
   measurable facts; `03`-`05` are methods/workplans with checklists.
2. Any number that feeds a later decision must be re-measured with the
   canonical serial command (plan §"Measurement"); do not quote a stale
   number as a guarantee.
3. When a ledger row is decided, update the corresponding file and tick the
   `05` checklist. When the gate closes, this folder becomes the source
   material for the Change proposal.

## Index

| File | Content | State |
|---|---|---|
| `01-state-and-measurements.md` | Verified repo facts, canonical command, TAP parse method, fresh timings | Measured 2026-08-22 |
| `02-duplication-ledger.md` | Import/discovery duplication: who imports `.test.mjs`, quantified cost (101.5s/420 launches aggregate + 5.5s engine), repair options, constraints | Complete |
| `03-cost-profile-method.md` | How to produce the serial per-file profile + instrumentation (subprocess / fixture-copy / fixed-wait) | Method + quiet-machine discipline |
| `04-obligation-and-gate-workplan.md` | Per-case obligation reading clusters, baseline-feasibility questions, suspension registry method, OpenSpec gate | Workplan executed |
| `05-scope-gate-checklist.md` | The plan's 5 closing conditions + decision-gate matrix as a tracking checklist | C1-C5 closed; boundary choice pending |
| `06-ledger-a..g.md` | Per-cluster obligation ledgers (42 distinct >3s cases) | Complete |
| `07-scope-gate-consolidation.md` | Savings by category (measured ranges), disposition summary, open questions, OpenSpec outlook | Substantially complete |
| `08-cost-table.md` | Instrumented cost table: 291 files, wall / leaves / launches / copies / bytes | Measured |
| `tools/` | parse-tap, count-preload, run-per-file-profile, collect-instr | Validated |

> Note: the raw per-file profile (`09-per-file-profile.json`) was removed
> 2026-08-22 — its embedded leaf names tripped the retired-content hygiene
> scan (`_backlog/plans` is a scan root). The durable findings live in
> `08-cost-table.md` and `01`/`07`; the raw JSON is regenerable via
> `tools/run-per-file-profile.mjs` + `tools/parse-tap.mjs` if needed.

## Current headline facts (2026-08-21)

- Repo HEAD: `27554eaab` (`docs: plan serial regression suite optimization`);
  working tree clean. Plan baseline `046b741dc` is HEAD's parent → plan is
  current, not stale.
- 291 discovered `.test.mjs` modules; canonical `npm test` = `find tests/ -name
  '*.test.mjs' -print0 | xargs -0 node --test` (flags appended after `--`).
- **Duplication is the biggest known cheap win and is understated by the
  plan's `>3s` inventory**: the pure import-aggregator
  `continuation-initiation-contract.test.mjs` re-executes 9 discovered suites
  and measured **101.95s wall alone**; the plan credited only 12.433s to this
  duplication. `tests/engine/work-unit-attempt-recovery.test.mjs` additionally
  re-executes 2 discovered suites.
- `tests/suspended/{unit,integration,e2e}/` already exist (empty, created the
  measurement day); no `README.md` yet (plan §"Controlled Suspension" step 3
  requires one before the first suspension).
- No active OpenSpec changes (`openspec/changes/` holds only `archive/`);
  only archived verification-plans reference the aggregate file paths → no
  active asset-path constraint on deduplication.

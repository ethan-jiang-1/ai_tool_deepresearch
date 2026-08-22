# Slow Test Suite Audit And Remediation

> Status: active — scope discovery closed 2026-08-22; workstreams 1 (dedup) & 2 (event release) completed & archived; remaining P0-P3 deferred | Measured: 2026-08-22 | Baseline commit: `046b741dc`

## Objective

Reduce the canonical serial regression time from `822.455s` to **strictly below
300 seconds**, without parallel execution or a weaker proof boundary. This plan
inventories every individual TAP `test` case measured above 3 seconds, then
addresses the equally material aggregate cost of the 2,985 faster cases.

The target is not met by an unaccounted change to `npm test` discovery, a skip,
a timeout increase, or test concurrency. The canonical command must continue to
discover every active `tests/**/*.test.mjs` file. The controlled-suspension
exception defined below may temporarily remove a registry-listed indeterminate
case, but it is coverage debt and cannot satisfy the durable target. A test may
be retired only when its exact proof obligation is explicitly covered elsewhere;
a test may be split only when the new focused proof retains the same production
authority at its boundary.

## Measurement

Canonical command, with TAP parsed at `type: test` leaves rather than cumulative
`describe` suites:

```bash
npm test -- --test-concurrency=1 --test-reporter=tap
```

- Result: `3028` passed, `0` failed.
- Wall time: `822.455s` (13m 42.5s).
- Observations above 3s: `43`, totaling `357.641s` (`43.5%` of wall time).
  Summing the table's individually rounded millisecond values yields `357.642s`.
- Distinct semantic cases: `42`; one case is executed twice through an aggregate
  test-file import.
- Top 10 observations: `206.577s` (`25.1%` of wall time).
- Timings are one same-machine serial sample. Use them to select investigation
  targets, not as stable performance guarantees.

## Target And Time Budget

Reaching 300 seconds requires saving **at least 522.456s**. The known `>3s`
observations explain 357.641s, so removing only the visible outliers cannot
meet the goal. The remaining 464.814s must be profiled and reduced through
fixture/process economics as well.

The following is a planning budget, not an unmeasured claim of achieved speed.
Each workstream earns its budget only from two serial before/after runs.

| Workstream | Primary cost removed | Required saving | Cumulative serial ceiling |
|---|---|---:|---:|
| P0 | Duplicate discovery, fixed waiting, finalizer checker replay | 120s | 702s |
| P1 | Repeated state-chain setup and branch-local CLI prefixes | 130s | 572s |
| P2 | Repeated subprocess/project setup in integration matrices | 150s | 422s |
| P3 | The measured 1-3s long tail across the entire suite | 125s | 297s |

The 2.5-second margin is intentionally small: a workstream that misses its
budget must trigger a new measurement/design pass before later work is declared
complete. No workstream may compensate by excluding a canonical proof asset.

## Guardrails

- The accepted `verification-routing` spec remains authoritative: tests belong
  to `unit`, `integration`, or `deterministic_e2e` according to their actual
  proof boundary. Moving a JS test to an unselected periodic lane is outside
  this plan unless a separate OpenSpec change first specifies and accepts that
  runner and its proof obligations.
- `agent_flow_e2e` is not a storage class for slow Node tests. A fake process or
  fixture cannot be relabelled as real Agent evidence.
- A full-chain sentinel keeps real production CLI/Engine authority. Snapshot
  reuse may establish a legal predecessor state, but must not hand-author a
  gate, transition, submitted status, ledger fact, trace event, or verdict.
- Mutable bundles, run roots, journals, and output paths remain per-case.
  Sharing means copying an immutable, test-run-local baseline, never sharing a
  live runtime directory between cases.
- The target has no concurrency loophole: every timing gate uses
  `--test-concurrency=1`.

## Test Decision Matrix

For every candidate, record its current proof obligation, native authority,
replacement asset(s), and measured delta before changing it. Apply the first
matching disposition below.

| Question | Disposition | Required evidence |
|---|---|---|
| Is the same `.test.mjs` owned by canonical discovery and also imported by another discovered suite? | **Deduplicate** the aggregate entry; retain one owner. | Module inventory shows one execution and all owned cases still pass. |
| Is elapsed time merely keeping a holder alive after the asserted condition is observable? | **Replace fixed wait** with an explicit ready/assert/release handshake. | Same contention/rejection facts occur; test has a bounded safety timeout only. |
| Do several cases differ only in a deterministic parser, checker, classification, or output mapping? | **Split** into an in-process/direct contract matrix plus one or two real CLI sentinels. | Matrix covers every old row; sentinel proves the CLI wires to that contract. |
| Do branches share a legal predecessor but mutate independently afterward? | **Share immutable setup** and restore to the original path for each branch. | Byte snapshot is built through production predecessors in the current run; each branch has isolated mutations. |
| Is a case a unique submit, inspect, Gate, synchronizer, archive, launcher, or authority-consistency boundary? | **Retain** one production-path sentinel and optimize only setup/prefix cost. | Explicitly name the unique boundary and show it still executes. |
| Does an assertion prove no unique fact after the preceding rows are mapped to retained/replaced tests? | **Retire** it. | A one-to-one obligation map, including failure code and non-mutation claim, is reviewed; no skip or silent deletion. |

Retirement is therefore a proof transfer, not a count-reduction tactic. If the
map is ambiguous, retain the test and profile it instead.

## Top Findings

1. The `69.226s` governance-finalizer case alone consumes `8.4%` of the suite. It
   repeatedly launches the production finalizer while progressively repairing one
   fixture to reach successive checker boundaries. The short-circuit contract is
   valuable; proving every checker by rerunning all earlier subprocesses is not.
2. `change-feedback-finalizer.test.mjs` contributes five observations totaling
   `128.610s` (`15.6%` of the suite). Instruction projection, checker semantics,
   and one or two production CLI sentinels should be separated.
3. `continuation-initiation-contract.test.mjs` imports
   `operate-work-unit.test.mjs`, while canonical discovery also runs the imported
   file directly. This duplicates the full suite. The visible slow symptom is the
   same timeout-holder case at `12.449s` and `12.433s`; faster cases are duplicated
   too but do not appear in this threshold inventory.
4. The timeout-holder test deliberately sleeps for 6 seconds twice via
   `Atomics.wait`. Real contention is worth proving, but the holder can be released
   by an explicit test handshake after all contenders have observed `busy`; elapsed
   wall time is not the fact under test.
5. `rerun-round-continuity.test.mjs` contributes 13 observations totaling
   `56.435s`. These are mostly valuable cross-checkpoint contracts already using a
   shared snapshot, but each restored branch still launches many production CLIs.
   Preserve representative full chains and move branch-local setup toward direct
   deterministic helpers only where the same authority facts remain established.
6. Host-tool cases group several modes in one test and repeatedly create projects
   and child processes. The failure matrix is valuable; fixture/process startup is
   the likely optimization surface.

## Complete Inventory (>3s)

Recommendation vocabulary:

- **Restructure**: keep the claim, reduce repeated production CLI/checker setup.
- **Keep + profile**: unique full-chain value is plausible; instrument before changing.
- **Deduplicate**: remove aggregate discovery duplication, not the owned test.
- **Event release**: preserve real contention but replace fixed wall-clock holding.
- **Share setup**: reuse an immutable baseline/snapshot while preserving isolation.
- **Split matrix**: keep all cases, isolate one production sentinel from direct matrix checks.

| Rank | Seconds | Test and location | Initial judgment |
|---:|---:|---|---|
| 1 | 69.226 | `short-circuits every governance checker through the production CLI` — `tests/integration/governance/change-feedback-finalizer.test.mjs:354` | Restructure (P0): checker-level contracts plus bounded production CLI sentinels. |
| 2 | 22.838 | `prevents status laundering across normal, HITL2 rerun, and superseded-pass paths` — `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs:988` | Keep + profile (P1): unique three-branch lifecycle proof; inspect CLI count and health-check duplication. |
| 3 | 22.718 | `delivers feedback marker task instructions and operation guidance for a fresh change` — `tests/integration/governance/change-feedback-finalizer.test.mjs:250` | Restructure (P0): static guidance assertions need not each launch OpenSpec. Keep one projection sentinel. |
| 4 | 15.552 | `requires the selected reservation transition while accepting another complete pending reservation` — `tests/integration/governance/change-feedback-finalizer.test.mjs:455` | Restructure (P0): direct requirement checker matrix plus one finalizer boundary. |
| 5 | 14.961 | `retains the accepted C5 audit lineage through a newer Final handoff and appends globally` — `tests/e2e/post-final-rerun-lineage-continuity.test.mjs:241` | Keep + profile (P1): high-value C5/Final lineage proof; optimize copied snapshot and CLI count only. |
| 6 | 14.598 | `uses the production finalizer to archive a synchronized isolated change` — `tests/integration/governance/change-feedback-loop-archive.test.mjs:303` | Keep (P1): sole native archive success sentinel; share fixture initialization if independently safe. |
| 7 | 13.312 | `uses native status and blocks the production CLI before validation when closeout is pending` — `tests/integration/governance/change-feedback-finalizer.test.mjs:338` | Restructure (P0): retain one early-stop CLI sentinel, remove unrelated fixture startup. |
| 8 | 12.449 | `blocks default and forced timeout for valid holders and exposes no unrelated progress` — `tests/integration/cli/operate-work-unit.test.mjs:1707` | Event release (P0): two explicit 6s holds dominate; preserve same/different-attempt contention. |
| 9 | 12.433 | Same owned case re-executed through `tests/integration/cli/continuation-initiation-contract.test.mjs:12` importing the file above | Deduplicate (P0): aggregate contract must not import a canonically discovered `.test.mjs`. |
| 10 | 8.490 | `rejects historical focus backing and accepts a current submitted increment through the normal Wave1 route` — `tests/e2e/wave1-focus-coverage-rerun.test.mjs:62` | Keep + profile (P1): valuable historical/current round boundary; share rerun baseline. |
| 11 | 8.093 | `keeps historical and current Topic-level focus facts distinct through the production synchronizer` — `tests/e2e/reference-evidence-map-rerun.test.mjs:85` | Keep + profile (P1): production synchronizer proof; reuse the same prepared rerun snapshot as related focus tests if isolation holds. |
| 12 | 7.803 | `receives current operation guidance from a temporary OpenSpec root` — `tests/integration/governance/change-feedback-finalizer.test.mjs:329` | Restructure (P0): one OpenSpec invocation should project both phase guidance records where possible. |
| 13 | 7.767 | `keeps missing focus and covered focus on the existing clean Wave1 path` — `tests/integration/cli/wave1-focus-coverage-contract.test.mjs:85` | Share setup (P1): two full bundles for one clean-path matrix; clone one pre-Wave1 baseline. |
| 14 | 6.019 | `delivers the base, refines in place, and accepts C5 only after an explicit expansion request` — `tests/e2e/final-refinement-continuity.test.mjs:106` | Keep + profile (P1): distinct refinement/C5 contract. |
| 15 | 5.732 | `binds a production receipt to its round and rejects replay before recovering the delivery tail` — `tests/e2e/rerun-round-continuity.test.mjs:470` | Keep + profile (P2): valuable replay/freshness chain; count redundant CLI setup. |
| 16 | 5.568 | `preserves two simulated-Agent intent revisions through production rerun continuity` — `tests/e2e/rerun-round-continuity.test.mjs:577` | Keep + profile (P2): distinct revision continuity; retain production mutation boundary. |
| 17 | 5.064 | `rejects a premature primary-looking file before Final entry without entry mutation` — `tests/e2e/final-refinement-continuity.test.mjs:92` | Keep + profile (P2): fail-closed mutation proof; share prepared Final baseline. |
| 18 | 4.985 | `runs Wave0 -> Wave1 -> Wave2 with packet -> inspect -> completion -> gate ordering` — `tests/e2e/seed-topic-projection-materialization.test.mjs:47` | Keep (P2): representative end-to-end ordering canary. |
| 19 | 4.893 | `fails closed for malformed, exhausted, or over-cap final cost` — `tests/integration/host_tools/run-agent-experiment.test.mjs:444` | Split matrix (P1): three process-heavy modes; preserve all outcomes and one full supervisor sentinel. |
| 20 | 4.751 | `submits the public Wave2 conditional template without a hidden source-identity rejection` — `tests/integration/cli/operate-topic-state-projection.test.mjs:279` | Keep + profile (P2): public-template submit path is a useful regression boundary. |
| 21 | 4.701 | `keeps a future add direction inactive until profile-count synchronization makes it current` — `tests/e2e/rerun-round-continuity.test.mjs:739` | Keep + profile (P2): time/round boundary is substantive. |
| 22 | 4.641 | `blocked emits only the existing definition-owned degradable limit` — generated at `tests/integration/cli/wave1-focus-coverage-contract.test.mjs:102` | Share setup (P1): clone one prepared Wave1 baseline for blocked/partial/invalid variants. |
| 23 | 4.574 | `keeps the setup-only Final boundary empty and free of Subject/native output` — `tests/integration/md/case-138-standard-final-refinement-contract.test.mjs:66` | Keep + profile (P2): production setup script sentinel; inspect whether fixture creation can start from a frozen baseline. |
| 24 | 4.567 | `uses real submit and inspect authority for current and prior round rows in the long chain` — `tests/e2e/rerun-round-continuity.test.mjs:759` | Keep + profile (P2): explicit real authority coverage; avoid replacing with fabricated rows. |
| 25 | 4.322 | `partial emits only the existing definition-owned degradable limit` — generated at `tests/integration/cli/wave1-focus-coverage-contract.test.mjs:102` | Share setup (P1): same baseline opportunity as rank 22. |
| 26 | 4.322 | `fails a partial Wave2 artifact, repairs it, and reruns the same gate once` — `tests/e2e/rerun-round-continuity.test.mjs:843` | Keep + profile (P2): representative fail/repair/rerun chain. |
| 27 | 4.288 | `traverses the full rerun chain through production checkpoints` — `tests/e2e/rerun-round-continuity.test.mjs:458` | Keep (P2): canonical success-chain sentinel against which focused branches can be reduced. |
| 28 | 4.221 | `fails Wave2 on a missing required artifact without invoking its transition` — `tests/e2e/rerun-round-continuity.test.mjs:697` | Keep + profile (P2): fail-closed transition proof. |
| 29 | 4.147 | `claim_verification -> wave1 gate fails with threshold 10 (8c.2)` — `tests/integration/cli/gate-dynamic-threshold.test.mjs:397` | Keep + profile (P2): threshold integration; check whether fixture setup is shared with adjacent table cases. |
| 30 | 4.111 | `stale action:add direction does not activate the Wave2 full-synthesis restriction` — generated at `tests/e2e/rerun-round-continuity.test.mjs:728` | Share setup (P2): stale/invalid variants should clone one boundary snapshot. |
| 31 | 4.071 | `keeps a specific lifecycle reason for Agent process and stream failures` — `tests/integration/host_tools/run-agent-experiment.test.mjs:477` | Split matrix (P1): five child modes; isolate direct classification matrix from one supervisor process sentinel. |
| 32 | 4.056 | `invalid action:add direction does not activate the Wave2 full-synthesis restriction` — generated at `tests/e2e/rerun-round-continuity.test.mjs:728` | Share setup (P2): pair with rank 30. |
| 33 | 4.026 | `blocks omitted current-row seed projection and passes after an identity-bound Agent repair` — `tests/e2e/rerun-round-continuity.test.mjs:800` | Keep + profile (P2): repair-chain proof, not a deletion candidate. |
| 34 | 3.885 | `keeps an invalid focus declaration under the non-degradable depth contract and masks the limit` — `tests/integration/cli/wave1-focus-coverage-contract.test.mjs:133` | Share setup (P1): reuse the focus contract baseline. |
| 35 | 3.663 | `fails Wave1 on inconsistent submitted work-unit authority without advancing` — `tests/e2e/rerun-round-continuity.test.mjs:709` | Keep + profile (P2): authority consistency and no-transition proof. |
| 36 | 3.620 | `reports a real submitted row as legacy only after its round binding is removed` — `tests/e2e/rerun-round-continuity.test.mjs:772` | Keep + profile (P2): real-row classification proof. |
| 37 | 3.560 | `fails closed when long-chain work-unit authority becomes inconsistent` — `tests/e2e/rerun-round-continuity.test.mjs:784` | Keep + profile (P2): fail-closed long-chain proof. |
| 38 | 3.553 | `rejects missing or extra declared run-root bundles without outside cleanup` — `tests/integration/host_tools/run-agent-experiment.test.mjs:371` | Split matrix (P2): two fixture projects can share immutable source setup. |
| 39 | 3.364 | `fails closed when the native completion is missing or malformed` — `tests/integration/host_tools/run-agent-experiment.test.mjs:496` | Split matrix (P2): retain both parser outcomes, reduce full supervisor setup. |
| 40 | 3.260 | `accepts remote endpoint and launches fake claude` — `tests/integration/host-tools/claude-deepseek.test.mjs:178` | Keep + profile (P2): external launcher contract with fake process; likely low first-pass ROI. |
| 41 | 3.235 | `launches Interactive as one positional prompt with inherited stdio and no Headless-only flags` — `tests/integration/host_tools/run-agent-experiment.test.mjs:543` | Keep + profile (P2): unique interactive spawn contract. |
| 42 | 3.194 | `cannot turn successful generic enqueue/save checks into a Heavy PASS without completion` — `tests/integration/host_tools/run-agent-experiment.test.mjs:509` | Keep + profile (P2): proof-permission boundary; optimize fixture startup only. |
| 43 | 3.009 | `passes the bounded per-case cap to the Headless child` — `tests/integration/host_tools/run-agent-experiment.test.mjs:416` | Keep + profile (P2): cheap relative to surrounding supervisor cases. |

## File Concentration

| File | Slow observations | Slow time |
|---|---:|---:|
| `tests/integration/governance/change-feedback-finalizer.test.mjs` | 5 | 128.610s |
| `tests/e2e/rerun-round-continuity.test.mjs` | 13 | 56.435s |
| `tests/integration/host_tools/run-agent-experiment.test.mjs` | 7 | 25.319s |
| `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs` | 1 | 22.838s |
| `tests/integration/cli/wave1-focus-coverage-contract.test.mjs` | 4 | 20.615s |
| All other files | 13 | 103.824s |

The imported duplicate is attributed separately to
`continuation-initiation-contract.test.mjs`; it executes the owned
`operate-work-unit.test.mjs` case rather than defining another semantic case.

## Scope Discovery Gate: Before Any OpenSpec Change

The current evidence establishes that the suite is too slow and identifies
strong hypotheses. It does **not** yet establish the implementation scope.
Do not create, name, or apply an OpenSpec Change until this gate is complete.

| Discovery question | Work to perform | Scope-closing output |
|---|---|---|
| What actually runs twice? | Build a module import/discovery graph for all 291 test modules, then compare owned leaf counts with canonical TAP leaves. | A duplication ledger: owner, importer, exact duplicated leaves, and the smallest legal ownership repair. |
| What does each expensive case uniquely prove? | For every `>3s` case, and each file above 1s, write its assertion, production authority, mutation/no-mutation fact, and neighboring coverage. | An obligation ledger with **retain / split / deduplicate / share setup / investigate / candidate retire**. |
| Where is time spent? | Produce serial per-file and leaf timing, subprocess count, fixture-copy count/bytes, setup-prefix/suffix time, and fixed-wait inventory. | A reproducible cost profile with measured source categories, not just wall-clock rankings. |
| Can a direct contract replace a production repetition? | Trace each candidate from test assertion to the owning helper/checker/CLI. Identify whether a retained production sentinel already exercises its wiring. | A replacement map showing every direct matrix row and every retained real boundary. |
| Can a predecessor baseline be shared legally? | For each workflow family, trace baseline provenance, absolute binding assumptions, and first independent mutation. | A baseline feasibility record: `safe at <checkpoint>`, `unsafe`, or `unknown`, with reasons. |
| Is temporary suspension justified? | Apply the decision matrix after profiling; do not suspend simply because a test is slow. | A registry-ready debt row with the exact unanswered question and review condition, or a decision to keep active. |

The gate closes only when the following are true:

1. Every proposed removal, split, or suspension has an obligation map and a
   named native verdict authority.
2. The potential savings are expressed as measured ranges by source category,
   not the provisional P0-P3 allocation alone.
3. Tests are grouped by a shared behavioral boundary and implementation shape,
   not merely by duration or directory.
4. Each resulting group has a decision: no change, a narrow harness-only
   change, a behavior/spec change, or further investigation.
5. The scope statement distinguishes temporary operating-lane relief from the
   durable, complete-coverage `<300s` result.

Only after this gate closes should we decide whether OpenSpec is warranted and,
if so, use the ledger to determine the smallest coherent Change boundary.

## Provisional Remediation Hypotheses (Not Yet Change Scope)

The workstreams below are investigation queues and performance budgets, not
approved implementation packages. Their names, ordering, and even whether they
become Changes remain deliberately undecided until the scope-discovery gate
closes.

### P0: Establish a complete cost model and remove known waste (120s budget)

1. Produce one serial per-file profile using the exact canonical file selection,
   plus TAP leaf timings. For every file above 1s, record wall time, top leaf
   tests, production CLI/Node child count, fixture-copy count/bytes, and fixed
   waits. Do not use the profile to change semantics; it is the denominator for
   P1-P3.
2. Replace aggregate `.test.mjs` imports with a non-test shared contract module,
   or make the aggregate assert inventory/wiring without importing canonically
   discovered suites. The aggregate `continuation-initiation-contract` currently
   imports nine discovered suites, including `operate-work-unit.test.mjs`.
3. Replace the two 6-second transaction-holder sleeps with a parent/child
   ready/assert/release handshake. The holder must remain real; only the arbitrary
   waiting is removed.
4. Refactor the finalizer suite along its natural seams: direct checker result
   matrices for every failure identity, a small ordered short-circuit set, one
   blocked production-finalizer sentinel, and one native archive success sentinel.
   Do not replay an ever-longer prior checker prefix merely to reach each checker.
5. Separate static source/guidance assertions from generated OpenSpec instruction
   projection. One generated-change projection proves delivery; source text
   rows must not repeatedly call `openspec init/new/instructions`.

P0 investigation/implementation exit evidence, if it becomes in scope: module inventory proves every active owned suite executes once;
both contention variants observe `busy` without a multi-second hold; every
finalizer failure code, ordering claim, and success/blocked production boundary
has a named replacement; and the serial suite saves at least 120 seconds.

### P1: Make legal predecessor state cheap (130s budget)

1. Treat a suite's production-built baseline as a first-class test helper:
   create it once per test run, snapshot it byte-for-byte at its original path,
   and restore it before each independent mutation. Never copy it to a new
   runtime path or reuse a mutated state.
2. Apply this pattern first to the dense `rerun-round-continuity` family, Wave1
   focus coverage, handoff witnessing, and C5/Final continuity. The profile must
   distinguish prefix creation from the unique suffix being asserted.
3. Reduce each branch to the narrowest production suffix that proves its fact.
   Retain explicit representative chains for normal, rerun, superseded-pass,
   failed repair/rerun, and Final/C5 lineage. Do not reduce all branches to
   fixtures or direct helpers.
4. Collapse parameterized variants only when their distinction is a direct
   deterministic condition. A table-driven direct matrix is acceptable; the
   production submit/inspect/Gate/synchronizer path remains a sentinel.

P1 exit evidence: every branch has a baseline provenance note and a retained
sentinel map; no test-authored authority has replaced an Engine fact; and the
profile shows 130 additional serial seconds removed.

### P2: Eliminate repeated integration process economics (150s budget)

1. Refactor host-tool and CLI failure matrices so source-project creation is
   separate from each per-case mutable run root. Keep child process launch only
   for arguments, inherited stdio, lifecycle, native completion, or timeout facts
   that genuinely require it.
2. For `run-agent-experiment`, move parser/classification/cost-cap combinations
   to a direct matrix when the production supervisor sentinel already proves the
   launch and completion path. Preserve a fake Agent child where process behavior
   is the proof subject; it proves host supervision, never Agent behavior.
3. For each integration family with repeated identical CLI prefixes, build a
   legal immutable fixture once and clone it per mutation. If a prefix itself is
   the contract, retain it as an independent sentinel rather than hiding it.
4. Use the P0 profile to select the next families, including the 1-3 second
   majority. The observed `755` test-side process/synchronization call sites are
   a hypothesis queue, not a mandate to remove every spawn.

P2 exit evidence: each converted matrix lists old rows, direct-contract rows,
and retained subprocess sentinels; both direct and sentinel paths pass; and 150
additional serial seconds are measured.

### P3: Burn down the medium-cost tail (125s budget)

Work file-by-file from the P0 profile rather than using the `>3s` threshold as
a boundary. For every selected 1-3 second file, choose the decision-matrix
disposition and require a before/after file timing. Stop only once the durable
serial result is below 300 seconds; a broad mechanical rewrite is not a success
criterion.

## Controlled Suspension For Indeterminate Slow Tests

When a very slow case cannot be classified safely after focused profiling, it may
be temporarily removed from canonical discovery for deeper investigation. This
is a declared coverage debt, not deletion or a new test class.

1. Move the asset to exactly one of `tests/suspended/unit/`,
   `tests/suspended/integration/`, or `tests/suspended/e2e/`. The `e2e` directory
   is a filesystem grouping for the accepted `deterministic_e2e` class; it does
   not introduce a fifth class.
2. Rename it from `*.test.mjs` to `*.suspended.mjs`, otherwise the current
   `npm test` file glob will still discover and execute it. Its individual replay
   command is `node --test --test-concurrency=1 <path-to-suspended-file>`.
3. Add one row to `tests/suspended/README.md` before the move: original path and
   class, test name, measured time, exact proof obligation/native authority,
   why it is indeterminate, owner, replay command, replacement hypothesis, and
   a dated next-review condition. Update any aggregate import to avoid a hidden
   second execution.
4. Run the suspended file once before moving it and once at its new path; both
   must pass. Retain its fixture/helper dependencies under normal source control.
   A suspended test is not reported as active regression coverage.
5. Restore, split, replace, or explicitly retire the case only through the
   decision matrix and obligation map. There is no permanent "suspended" status.

Report two separate results while suspension exists:

| Result | Meaning | May claim full active coverage? |
|---|---|---|
| Temporary operating latency | `npm test` serial wall time with registry-listed suspension debt | No |
| Durable serial regression | All obligations are active or explicitly re-homed, with no unresolved suspended row | Yes |

Suspension can make the temporary operating lane usable while investigation
continues, but its saved time does **not** satisfy a P0-P3 budget or the durable
`<300s` acceptance gate.

## OpenSpec Decision Gate (Not Yet Ready)

Do not propose a Change from the present document. After scope discovery, choose
one of the following based on the completed ledgers:

| Scope outcome | Next action |
|---|---|
| One isolated harness defect, with no proof or routing consequence | Decide whether a narrow implementation task is sufficient under repository process; document why no behavioral Change is needed. |
| A coherent set shares one test-harness behavior and proof-preservation design | Propose one Change whose proposal names only that coherent boundary. |
| Snapshot, direct-matrix, or suspension work touches distinct proof boundaries | Propose separate Changes only after each has its own obligation and baseline/replacement map. |
| A candidate alters canonical discovery, test classes, proof permissions, or periodic-lane acceptance | Treat it as an explicit behavior/governance change; scope its accepted-spec impact before proposing. |
| Savings or proof equivalence remain unknown | Keep exploring; do not create a placeholder Change. |

Any future proposal must use the accepted verification-routing selection rules.
The decision gate exists to prevent a large "make tests faster" Change with no
single reader question, direct Source of Record, or defensible proof boundary.

## Verification And Stop Conditions

1. For every changed or suspended file, run its focused serial command first;
   report test/pass/fail/skip/cancel counts and leaf timing.
2. After each P0-P3 workstream, run the canonical command twice on the same
   machine conditions:

   ```bash
   npm test -- --test-concurrency=1 --test-reporter=tap
   ```

   Record both wall times, test/pass/fail/skip/cancel counts, the complete
   `>3s` inventory, and the per-file profile delta. The slower of the two runs
   is the workstream result.
3. A test-count change requires an obligation ledger: old test name -> retained,
   replacement direct matrix, replacement sentinel, or approved retirement.
   A suspend row is not an accepted replacement.
4. The durable acceptance gate is two clean serial runs, each **strictly below
   300s**, with zero failures/cancellations and no unresolved suspension rows.
   A temporary operating result may be reported separately only with its complete
   suspension registry and explicitly degraded coverage status.
5. Stop and redesign when a proposed optimization removes a unique production
   boundary, requires hand-written Engine authority, causes test contamination,
   or misses its allocated budget. Do not trade it for concurrency, a skip, a
   timeout increase, or quiet test discovery exclusion.

---

## Research Progress — 2026-08-22 (scope discovery complete; gate C1-C5 closed)

Working notes live in `_backlog/plans/slow-test-suite-audit-and-remediation-research/`
(README indexes `01-09` + `tools/`). Key updates to this plan:

- **Fresh canonical baseline** (same command, quiet machine): `757.0s`,
  `3028` passed / `0` failed; suite-level `>3s` leaves `37 / 254.7s` (plan
  baseline was `822.455s` / `43 / 357.6s` — machine drift; ranking stable,
  per-case absolutes are selection signals only).
- **Duplication is the largest measured item and is far bigger than the
  `>3s` inventory suggested:** `continuation-initiation-contract.test.mjs`
  alone = **101.5s / 420 child-process launches** (re-executes 9 discovered
  suites; plan credited 12.433s); `tests/engine/work-unit-attempt-recovery.test.mjs`
  adds **5.5s** (re-executes 2 discovered suites). Combined dedup ≈ **107s**
  (~14% of the per-file wall sum `767.7s`). Both paths are referenced only by
  archived verification-plans; no active asset-path constraint.
- **Per-file cost profile** (291 files, `08-cost-table.md`): top items —
  aggregate `101.5s`, e2e `rerun-round-continuity` `59.8s/463`, finalizer
  `52.7s/25 heavy launches`, `operate-work-unit` `34.0s/139`,
  `run-agent-experiment` `27.7s/61`, handoff `24.1s/142`.
- **New P3 finding not in the plan's `>3s` inventory:** gate-matrix families
  (`operate-queue-validation` `23.1s/98`, `check-gate-wave0/1/2-complete`
  `22.3/22.9/14.8s`, readiness/hitl1/hitl2-recorded, `agent-experiment-autorun`
  `7.2s/61`) dominate the 1-3s tail; direct-matrix + shared-fixture candidates.
- **Obligation ledgers** for all 42 distinct `>3s` cases are complete
  (`06-ledger-a..g.md`); every case has assertion / authority / mutation /
  neighbors / disposition / evidence. No suspension is proposed.
- **Measured savings outlook:** dedup `107s` (measured) + finalizer
  `~35-45s` + event release `~10-12s` + snapshot/matrix `~25-35s` +
  gate-matrix P3 `~40-60s` ≈ `220-250s` of the ~470s needed below `300s`; the
  remainder is P3 per-file work per this plan's discipline.

## Execution Decision — 2026-08-22 (first workstream only)

Per the OpenSpec decision gate's "isolated harness defect" option, the
**first executed workstream is aggregate-import deduplication** (≈107s
measured): convert `continuation-initiation-contract.test.mjs` to an
inventory/wiring test that does not import discovered suites, and remove the
two side-effect imports from `tests/engine/work-unit-attempt-recovery.test.mjs`.
All other workstreams (finalizer restructure, snapshot sharing, matrices,
P3 tail) are **deferred** and will be revisited after this change lands, using
`07-scope-gate-consolidation.md` as the working agenda.

## Workstream 1 (deduplication) — COMPLETED 2026-08-22

Archived change: `2026-08-22-deduplicate-aggregate-test-suite-imports`
(all 17 finalizer checks passed, `specs_updated: false`).

- `continuation-initiation-contract.test.mjs` → inventory/wiring test (no
  imports; `@impl` linkage and file path preserved).
- `tests/engine/work-unit-attempt-recovery.test.mjs` → two side-effect
  imports removed (own 4 leaves unchanged).
- Verification: full canonical serial run **2798 passed / 0 failed / 0
  cancelled, wall 649.9s** (baseline 757.0s → **≈107s saved**); leaf total
  3028 → 2798 exactly as designed.
- Remaining workstreams (finalizer restructure, event release, snapshot
  sharing, matrices, P3 tail) are deferred per §"Execution Decision";
  working agenda: `_backlog/plans/slow-test-suite-audit-and-remediation-research/07-scope-gate-consolidation.md`.

## Workstream 2 (event release) — COMPLETED 2026-08-22

Archived change: `2026-08-22-replace-transaction-holder-fixed-wait`
(all 17 finalizer checks passed, `specs_updated: false`).

- `operate-work-unit.test.mjs:1707` holder: 2×6s fixed `Atomics.wait`
  → ready/release file handshake (holder stays real; ready written on lock
  acquisition, bounded 30s release poll; test waits ready, runs every
  assertion unchanged for both `sameAttempt` variants, writes release).
- Verification: focused run 42/42 pass; holder leaf **12.5s → 1.2s**
  (deterministic saving ~11.3s); full canonical run **2798 passed / 0 failed
  / 0 cancelled, wall 610.0s** (residual wall delta vs 649.9s within machine
  variance; single sample).
- No test cases merged and no assertion changed (implementation guardrail,
  research notes §07).
- Remaining workstreams (finalizer restructure, snapshot sharing, matrices,
  P3 tail incl. engine transaction waits `:900/:1200/:1800`) deferred per
  §"Execution Decision".

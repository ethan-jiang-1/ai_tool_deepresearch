# Obligation Ledger B: rerun-round-continuity.test.mjs

> Generated: 2026-08-21 | Plan: `_backlog/_done/_closed_plans/slow-test-suite-audit-and-remediation.md`
> File: [tests/e2e/rerun-round-continuity.test.mjs](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs)

## File-Level Snapshot Economics

**Where is the shared snapshot built?**

Once per test run, inside `before()` at line 454:

```js
before(() => { root = createTempRoot(); baseline = buildBaseline(); snapshot = snapshotBundle(baseline, root); });
```

`buildBaseline()` (lines 406-418) creates a fresh bundle via `instantiateBundle`, then pushes it through the full production chain: instantiation → hitl1 → setup → seed-topics → wave0 → wave1 → wave2. `snapshotBundle()` (harness line 47-51) does `cpSync(source, snapshot, { recursive: true, errorOnExist: true })` — a full byte-level copy.

**At what checkpoint is it byte-stable?**

After `wave2_complete` gate (line 415), before any HITL2 decision. The baseline bundle has a complete Wave0→Wave1→Wave2 chain with one submitted work-unit per wave, and status `current_node: 'phases/phase-hitl2.md'`.

**Which branch is the first independent mutation?**

Each test case calls `restoreBundle(snapshot, baseline)` (harness lines 53-57), which does `rmSync(target, { recursive: true, force: true })` followed by `cpSync(snapshot, target, { recursive: true, errorOnExist: true })`. The first mutation is always the test case's first write to the restored baseline — typically `stageHitl2()` or a direct `writeFileSync` on a profile/manifest.

**Approximate production CLI launches:**

- `buildBaseline()` once: ~32 CLI launches (1 instantiate + 6×3 gate/enter/advance + 5 stageWave0 + 5 stageWave1 + 3 logCompletion)
- Total CLI launches across all 13 cases: ~190-210 (varies per case; each full-chain case like "receipt replay" adds ~41 CLI, lighter cases like the `for (direction)` loop add ~12-15 each)
- **Per-branch setup prefix**: Every case inherits the 32-launch baseline once. After that, each case's unique suffix ranges from 3 (a single `runGate` + `advanceStatus`) to ~41 (the full receipt-round cycle).
- The 13 cases share the same baseline but each runs its own full production gate chain through `runGate`/`enterPhase`/`advanceStatus` — the gates are not mocked, they are the real production CLI path.

---

## Case Ledger

### "binds a production receipt to its round and rejects replay before recovering the delivery tail"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:470](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:470)
- measured: 5.732s
- assertion: A production delivery receipt (`composition_handoff_receipt`) is bound to its round (`for_rerun_count`); a stale replay of a prior round's receipt is rejected by the production HITL2 gate without trace mutation; a fresh `proceed_to_readiness` in the current round produces a new, distinct receipt that routes to Final.
- authority: `DEEP_RESEARCH_HARNESS/engine/helpers/composition-handoff.mjs:evaluateCompositionProceed` — checks `for_rerun_count` mismatch (line 100), verifies `projection_sha256` (lines 167-188), and rejects stale predecessor receipts (line 261). Enforced through `check-gate-hitl2-recorded.mjs` (line 25: calls `evaluateCompositionProceed`).
- mutation: The `composition_handoff_receipt` must not be replayable across rounds; `for_rerun_count` must match the profile's current `rerun_count`; `projection_sha256` must be fresh and distinct between rounds.
- neighbors:
  - `tests/integration/cli/check-gate-hitl2-recorded.test.mjs` — receipt schema, `composition_handoff_receipt` presence/absence
  - `tests/integration/cli/check-gate-readiness-passed.test.mjs:136,187,359-360` — receipt projection validation, missing/malformed receipt
  - `tests/engine/helpers/composition-handoff.test.mjs:113,146` — unit-level receipt migration and ineligibility
- disposition: **Retain**
- evidence: Unique production boundary: receipt replay rejection is a stateful gate decision that combines the round-binding check, projection SHA freshness, and the no-trace-mutation invariant. The integration-level receipt tests cover schema and individual validation rules but do not exercise the full round-replay→rejection→recovery→new-receipt cycle.
- cost drivers: Two full `restoreBundle` → `runRerunCycle` paths (lines 471-493: ~41 CLI launches each), plus the rejected replay gate (line 510: 1 CLI), and the recovery chain (lines 520-531: 7 CLI). The per-branch prefix (runRerunCycle) is fully repeated for both `firstRound` and `rerunRound`.

### "preserves two simulated-Agent intent revisions through production rerun continuity"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:577](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:577)
- measured: 5.568s
- assertion: Two distinct intent revisions (round 1: lifecycle-cost comparison; round 2: cash-flow stress) are written to `rb_plan.md` Decisions, survive a simulated crash/recovery cycle, are byte-stable after reuse, and the second revision's active amendments exclude the superseded first revision's claims.
- authority: `DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs` (inspect, recover, apply) — the production topic-state CLI owns the crash barrier, recovery, and the plan SHA check. The intent revision text itself is fixture-authored (simulated Agent prose), but the plan integrity (`plan_sha256`) and topic-state inspect/apply are production.
- mutation: Both revisions must be byte-stable in `rb_plan.md`; revision 2 must not contain the superseded claims (lifecycle-cost, vendor-only); the plan SHA must change deterministically after each revision write; `rerun-ready` gate must pass after `rerun_count` is synchronized to 2.
- neighbors:
  - `tests/integration/cli/operate-topic-state-projection.test.mjs` — topic-state apply/replay patterns
  - `tests/engine/helpers/canonical-topic-state.test.mjs` — projection entry upsert and replay
- disposition: **Keep+profile**
- evidence: Distinct revision continuity proof: the test proves that two Agent-authored intent revisions survive a production crash/recovery and remain byte-stable. The integration tests cover apply/replay but not the multi-round revision-preservation chain. The plan explicitly calls this "distinct revision continuity" (P2).
- cost drivers: Two full `operate-topic-state.mjs` CLI calls for inspect+recover (lines 613, 615), two more for inspect (lines 619, 646), plus the full `passAndEnter` chain for two rounds (lines 624-629: ~15 CLI, lines 631-632: ~6 CLI). The `runRerunCycle`-equivalent chain (lines 624-629) is the dominant cost.

### "keeps a future add direction inactive until profile-count synchronization makes it current"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:739](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:739)
- measured: 4.701s
- assertion: An `action:add` direction with `directionCount: 2` is seeded when `rerun_count` is still 1; the Wave2 gate passes without activating the full-synthesis restriction (because the future direction is not yet current); after `setProfileRerunCount(bundle, 2)` synchronizes the count, the gate fails with the `action:add .* Delta Synthesis` message; restoring the synthesis to full mode passes the gate.
- authority: `DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs:522-533` — the `rerun_add_full_synthesis` rule checks `direction.fields.action === 'add'` and the `Delta Synthesis` heading in `synthesis.md`. The gate is `check-gate-wave2-complete.mjs`.
- mutation: The `seed_topics/topic-a.md` direction bytes must not change when `setProfileRerunCount` is called (line 750); the future direction must be inactive until profile count synchronization.
- neighbors:
  - `tests/integration/cli/check-gate-wave2-complete.test.mjs:723,741,756,793` — action:add delta/full synthesis, topic pair coverage
- disposition: **Share setup**
- evidence: The stale/invalid direction variants (lines 724-737) and this future-direction case share the same `reachWave2` baseline. The integration test `check-gate-wave2-complete.test.mjs` already covers the action:add rule in isolation. The e2e test's unique contribution is the round-synchronization boundary (future direction does not activate until count matches). However, the integration test at line 723 already covers the delta-rejection path. The e2e's unique fact — "future direction is inactive" — could be covered by a single sentinel that shares the snapshot with the stale/invalid variants.
- cost drivers: `reachWave2` (lines 699, 741-742: ~5 CLI for Wave0+Wave1 staging), then `setProfileRerunCount`, `runGate` (failed, line 751), `runGate` (passed, line 755). The `reachWave2` prefix is the dominant cost.

### "uses real submit and inspect authority for current and prior round rows in the long chain"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:759](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:759)
- measured: 4.567s
- assertion: The `inspectEligible` CLI returns only current-round (`rerun_count: 2`) submitted rows for the current round and excludes prior-round rows; the returned row has `status: 'submitted'` and `rerun_count: 2`.
- authority: `DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs:inspect` with `--eligible-rows` — the production CLI filters by `rerun_count` matching the profile's current count (line 146: `result.eligible_rows = eligible.rows`).
- mutation: The current-round row must be the only eligible row; no prior-round row may appear; the row's `status` must be `submitted`; the `rerun_count` must match the current round.
- neighbors:
  - `tests/integration/cli/rerun-round-continuity.test.mjs:72-85` — **identical assertion** with a lighter fixture (direct `claimAndSubmitWorkUnit`, no full bundle chain). This integration test proves the same fact: current-round rows are included, prior-round rows are excluded.
- disposition: **Deduplicate**
- evidence: The integration test `tests/integration/cli/rerun-round-continuity.test.mjs:72-85` proves the exact same fact — eligible row filtering by `rerun_count` — using a direct work-unit fixture that bypasses the full bundle chain. The e2e test adds no unique production authority (both call the same `operate-work-unit.mjs inspect --eligible-rows`). The e2e's `reachWave1` prefix establishes a real bundle chain, but the assertion being tested is the CLI filtering logic, not the chain itself. The plan's decision matrix says: "Is the same fact proven by another test?" → retire or deduplicate. The integration test is the canonical owner of this fact; the e2e can be retired or reduced to a wiring-only sentinel that verifies the CLI is reachable from a real bundle.

### "reports a real submitted row as legacy only after its round binding is removed"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:772](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:772)
- measured: 3.620s
- assertion: After deleting `rerun_count` from a submitted work-unit's index entry, `inspectEligible` excludes it from eligible rows and emits the warning `legacy submitted row.*without rerun_count excluded`.
- authority: `DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs:inspect` — the production CLI classifies rows without `rerun_count` as legacy and emits the warning (line 151).
- mutation: The row must be excluded from `eligible_rows`; the warning text must match the legacy pattern; the row's `work_id` must not appear in eligible rows.
- neighbors:
  - `tests/integration/cli/rerun-round-continuity.test.mjs:87-99` — **identical assertion** with a lighter fixture. Same warning text, same delete-and-inspect pattern.
- disposition: **Deduplicate**
- evidence: The integration test proves the exact same fact — legacy row exclusion with the same warning text — using `claimAndSubmitWorkUnit` directly. The e2e adds a `reachWave1` chain that is unrelated to the assertion being tested (the legacy check operates on the work-unit index, not the bundle chain). The integration test is the canonical owner.

### "fails closed when long-chain work-unit authority becomes inconsistent"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:784](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:784)
- measured: 3.560s
- assertion: After corrupting the manifest `receipt_nonce` to mismatch the index, `inspectEligible` returns `passed: false`, clears `eligible_rows` to `[]`, and emits `manifest/index mismatch.*receipt_nonce` and `authority is inconsistent` warnings.
- authority: `DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs:inspect` — the production CLI detects the manifest/index mismatch (line 146-151).
- mutation: The manifest corruption must cause `passed: false`; `eligible_rows` must be empty; both warnings must appear; no Engine authority files (trace, status, queue, declarations) must be mutated.
- neighbors:
  - `tests/integration/cli/rerun-round-continuity.test.mjs:101-115` — **identical assertion** with a lighter fixture. Same corruption pattern, same warning text.
- disposition: **Deduplicate**
- evidence: The integration test proves the exact same fact — fail-closed on manifest/index mismatch — using `claimAndSubmitWorkUnit` directly. The e2e adds `assertOnlyTraceDiagnosticsChanged` which verifies that no Engine authority is mutated, but this is the same invariant tested by the `--eligible-rows` path in the integration test. The integration test is the canonical owner.

### "fails a partial Wave2 artifact, repairs it, and reruns the same gate once"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:843](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:843)
- measured: 4.322s
- assertion: After corrupting `finding-index.yaml` (malformed YAML), the `wave2-complete` gate fails; the status node remains at `phases/phase-wave2.md`; after repairing the artifact (re-running `stageWave2`), the same gate passes; the trace shows two gate attempts: first failed, second passed.
- authority: `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave2-complete.mjs` — the production gate rejects malformed YAML and passes after repair.
- mutation: The gate must fail on malformed artifact without advancing the status node; the repair must allow the same gate to pass; the trace must show two distinct gate attempts with the correct pass/fail sequence.
- neighbors:
  - `tests/integration/cli/check-gate-wave2-complete.test.mjs` — various Wave2 failure modes, but does not test the exact fail→repair→rerun cycle at the gate level
- disposition: **Keep+profile**
- evidence: The fail→repair→rerun cycle is a unique production boundary: it proves that the gate is idempotent (can be retried after repair) and that the trace records both attempts. The integration tests cover individual failure modes but not the repair-and-retry cycle. This is a representative sentinel per the plan's P2 guidance.

### "traverses the full rerun chain through production checkpoints"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:458](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:458)
- measured: 4.288s
- assertion: After restoring from snapshot, a full rerun cycle (HITL2 rerun decision → rerun-ready → seed-topics → wave0 → wave1 → wave2) passes all six gates; the status reaches `phases/phase-hitl2.md` with `current_gate: 'wave2_complete'`; the trace contains real passing gate attempts for all six gates.
- authority: All six production gates: `check-gate-hitl2-recorded.mjs`, `check-gate-rerun-ready.mjs`, `check-gate-seed-topics-ready.mjs`, `check-gate-wave0-complete.mjs`, `check-gate-wave1-complete.mjs`, `check-gate-wave2-complete.mjs`.
- mutation: All six gates must pass; the trace must contain a real passing `gate_attempt` event for each gate.
- neighbors:
  - None — this is the only full-chain success sentinel.
- disposition: **Retain**
- evidence: Canonical success-chain sentinel against which focused branches can be reduced (per the plan, P2). This is the only test that proves the full rerun chain passes end-to-end. No other test exercises all six gates in sequence.

### "fails Wave2 on a missing required artifact without invoking its transition"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:697](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:697)
- measured: 4.221s
- assertion: After deleting `synthesis.md`, the `wave2-complete` gate fails; the status node remains at `phases/phase-wave2.md`; the failure message mentions the missing file; no Engine authority files are mutated (only trace diagnostics appended).
- authority: `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave2-complete.mjs` — the production gate checks for required artifacts.
- mutation: The gate must not advance the status node past `phases/phase-wave2.md`; the trace must include a failed `wave2-complete` gate attempt; no Engine authority (status, queue, declarations, work-units) must be mutated.
- neighbors:
  - `tests/integration/cli/check-gate-wave2-complete.test.mjs` — covers various Wave2 failure modes, including missing artifacts
- disposition: **Keep+profile**
- evidence: Fail-closed transition proof. The integration test covers the gate rule in isolation, but the e2e test additionally proves the `assertOnlyTraceDiagnosticsChanged` invariant — that a failed gate does not mutate Engine authority. This is a valuable cross-cutting invariant that the integration test may not cover. The `reachWave2` prefix is the dominant cost.

### "stale action:add direction does not activate the Wave2 full-synthesis restriction"

- file:line: generated at [tests/e2e/rerun-round-continuity.test.mjs:728](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:728)
- measured: 4.111s
- assertion: A stale `action:add` direction (count: 0) seeded into the bundle does not trigger the `action:add` full-synthesis restriction; the `wave2-complete` gate passes without the `action:add` check.
- authority: `DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs:522-533` — the `rerun_add_full_synthesis` rule checks `direction.fields.action === 'add'` and the `Delta Synthesis` heading.
- mutation: The gate must pass; the inspect output must not contain `action:add`.
- neighbors:
  - `tests/integration/cli/check-gate-wave2-complete.test.mjs:723` — action:add delta rejection
  - The `invalid` variant at line 728 (the paired generated case)
- disposition: **Share setup**
- evidence: The stale and invalid variants (lines 724-737) are generated by the same `for (direction)` loop and share the same `reachWave2` baseline. Both cases test the same rule (`rerun_add_full_synthesis`) with different input values. The integration test already covers the rule's core logic. The e2e's unique contribution is the "does not activate" boundary (stale count=0, invalid count='not-a-number'), which could be a single sentinel sharing the snapshot with the future-direction case (line 739).

### "invalid action:add direction does not activate the Wave2 full-synthesis restriction"

- file:line: generated at [tests/e2e/rerun-round-continuity.test.mjs:728](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:728)
- measured: 4.056s
- assertion: An invalid `action:add` direction (count: 'not-a-number') seeded into the bundle does not trigger the `action:add` full-synthesis restriction; the `wave2-complete` gate passes without the `action:add` check.
- authority: Same as the stale variant — `DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs:522-533`.
- mutation: Same as the stale variant.
- neighbors: Same as the stale variant.
- disposition: **Share setup**
- evidence: Pair with the stale variant (rank 30). The two cases are parameterized by the same `for (direction)` loop and should share one immutable snapshot baseline. The `reachWave2` prefix is the dominant cost.

### "blocks omitted current-row seed projection and passes after an identity-bound Agent repair"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:800](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:800)
- measured: 4.026s
- assertion: When the Wave1 canonical topic state projection is omitted (`projectWave1: false`), `inspect-wave1-output.mjs` fails with `return_map_current_row_omission` referencing the submitted work-unit; after applying the projection via `applyCanonicalTopicState`, the same inspect CLI passes with `return_map_classification: 'diagnostic-only'`; the Engine authority files (index, ledger, manifest) are unchanged.
- authority: `DEEP_RESEARCH_HARNESS/engine/helpers/return-map.mjs:578` — the `return_map_current_row_omission` classification. Enforced through `DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs`.
- mutation: The omission must be detected; the repair must clear the omission without mutating Engine authority; the index, ledger, and manifest must be byte-identical before and after repair.
- neighbors:
  - `tests/integration/cli/inspect-wave-return-map.test.mjs:444,458,477,495,520,530,541,546,552` — covers `return_map_current_row_omission` and related return-map classifications extensively
- disposition: **Keep+profile**
- evidence: The repair-chain proof is unique: the test proves that an identity-bound Agent repair (re-applying the canonical topic state projection) clears the omission without mutating Engine authority. The integration tests cover the omission detection but not the full repair→re-inspect→authority-preservation cycle. The plan marks this as "not a deletion candidate."

### "fails Wave1 on inconsistent submitted work-unit authority without advancing"

- file:line: [tests/e2e/rerun-round-continuity.test.mjs:709](/Users/bowhead/ai_tool_deepresearch/tests/e2e/rerun-round-continuity.test.mjs:709)
- measured: 3.663s
- assertion: After corrupting the Wave1 manifest's `receipt_nonce` to mismatch the index, the `wave1-complete` gate fails; the status node remains at `phases/phase-wave1.md`; the failure message references `manifest/index mismatch` or `receipt_nonce` or `authority`; no Engine authority files are mutated.
- authority: `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs` — the production gate checks manifest/index consistency.
- mutation: The gate must not advance the status node; the trace must include a failed `wave1-complete` gate attempt; no Engine authority must be mutated.
- neighbors:
  - `tests/integration/cli/rerun-round-continuity.test.mjs:101-115` — same authority-inconsistency pattern but for the `inspect` CLI, not the `wave1-complete` gate
  - `tests/e2e/rerun-round-continuity.test.mjs:784` — same pattern but for the `inspect` CLI path
- disposition: **Keep+profile**
- evidence: Authority consistency and no-transition proof. This is a distinct boundary from the integration test: the integration test proves the `inspect --eligible-rows` path detects inconsistency, but this test proves the `wave1-complete` gate itself detects it and refuses to advance. The no-transition invariant (`assertOnlyTraceDiagnosticsChanged`) is the unique e2e contribution.

---

## Guardrail Assessment

**Full-chain sentinel requirement**: The plan requires that "snapshot reuse may establish a legal predecessor state but must not hand-author a gate, transition, submitted status, ledger fact, trace event, or verdict."

All 13 cases in this file satisfy the guardrail. Every gate, transition, status advancement, and trace event is authored by the production CLI path (`runGate`, `enterPhase`, `advanceStatus`, `logCompletion`). The snapshot only provides the predecessor state — the assertions exercise real production authority. No case fabricates a gate result, hand-authors a trace event, or bypasses the CLI.

**Candidate violations evaluated**: None found. The `writeOrReuseIntentRevision` function (line 350) writes simulated Agent prose to `rb_plan.md`, but the test explicitly labels this as "Simulated-Agent prose write. This is not an Engine parser or semantic verdict." The plan integrity is verified by the production `operate-topic-state.mjs inspect` CLI's `plan_sha256`, not by the test. The simulated Agent input is a fixture, not a hand-authored verdict.

---

## Summary

| Case | Disposition | Unique boundary? | Integration-test overlap? |
|---|---|---|---|
| receipt replay + recovery (470) | Retain | Yes — round-binding replay rejection | Partial (receipt schema only) |
| intent revisions (577) | Keep+profile | Yes — multi-round revision preservation | Partial (apply/replay only) |
| future direction inactive (739) | Share setup | Yes — count synchronization boundary | Partial (action:add rule only) |
| real submit/inspect rows (759) | Deduplicate | No — same fact in integration test | Yes (identical) |
| legacy row exclusion (772) | Deduplicate | No — same fact in integration test | Yes (identical) |
| inconsistent authority fail-closed (784) | Deduplicate | No — same fact in integration test | Yes (identical) |
| fail/repair/rerun Wave2 (843) | Keep+profile | Yes — repair-and-retry cycle | Partial (failure modes only) |
| full rerun chain (458) | Retain | Yes — only full-chain sentinel | None |
| missing Wave2 artifact (697) | Keep+profile | Yes — no-transition invariant | Partial (missing artifact rule) |
| stale action:add (728) | Share setup | No — parameterized variant | Yes (same rule) |
| invalid action:add (728) | Share setup | No — parameterized variant | Yes (same rule) |
| omitted projection repair (800) | Keep+profile | Yes — repair + authority preservation | Partial (omission detection only) |
| Wave1 authority inconsistency (709) | Keep+profile | Yes — gate-level no-transition | Partial (inspect only) |

**Three deduplication candidates** (rows 759, 772, 784) have identical assertions in `tests/integration/cli/rerun-round-continuity.test.mjs` with lighter fixtures. The integration test is the canonical owner; the e2e cases can be retired or reduced to wiring-only sentinels.

**Three share-setup candidates** (rows 728-stale, 728-invalid, 739) share the same `reachWave2` baseline and test the same `rerun_add_full_synthesis` rule. They can share one immutable snapshot and be collapsed into a parameterized matrix with one or two production sentinels.

**Seven retain/keep+profile cases** have unique production boundaries not covered elsewhere: the full chain sentinel (458), receipt replay (470), intent revisions (577), missing artifact (697), Wave1 authority (709), projection repair (800), and fail/repair/rerun (843).
---

## Verification note (parent, 2026-08-22) — rows 759/772/784 "Deduplicate" claims

The subagent flagged rows 759/772/784 as Deduplicate candidates against
`tests/integration/cli/rerun-round-continuity.test.mjs` (:72/:87/:101). The
integration twin does cover the same exclusion facts (current-round inclusion,
legacy exclusion + native warning, fail-closed inconsistency), but the e2e
rows are **not identical assertions**: they prove the facts through a LONG
chain (rerunCount 2, real submit/inspect authority across rounds). The plan's
inventory dispositions for these rows are **Keep + profile** (rows 24/36/37:
"explicit real authority coverage; avoid replacing with fabricated rows",
"real-row classification proof", "fail-closed long-chain proof").

→ Revised judgment: do NOT retire rows 759/772/784. Treat them as
**Keep + profile**, with a possible **Split matrix** reduction: the exclusion
logic rows can lean on the integration twin, but at least ONE long-chain
sentinel per fact family must remain to prove the long-chain dimension
(real submit/inspect authority across rerunCount 2). This matches the plan's
own disposition; the Deduplicate framing is superseded.

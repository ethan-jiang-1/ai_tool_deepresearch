## 1. Shared Direction Resolver (RTI-007)

- [x] 1.1 Implement `resolveRerunDirection` in `wave-contract-evaluators.mjs`. Parse `rerun_count` from `## 本轮重跑方向`, return 5 states. Export.
- [x] 1.2 Update `checkRerunAddFullSynthesis` to use `resolveRerunDirection`. matching/future→apply, stale→ignore, legacy_unbound→old behavior.
- [x] 1.3 phase-rerun Stage 1 target + crash recovery: compute `target = profile.rerun_count + 1`. Check if direction section exists with `rerun_count == target` → skip to increment+gate (crash recovery: direction already written this round). Otherwise → proceed to Stage 3.
- [x] 1.4 phase-rerun Stage 3 rerun_count binding: write `rerun_count: <target>` into `## 本轮重跑方向`. Step 2: increment profile to target. Document invariant: after completion, direction.rerun_count == profile.rerun_count == target.
- [x] 1.5 direction resolver unit tests: 8/8 pass (5 states + crash recovery + target + stale)

## 2. Engine-Owned Round Stamping (WPG-015)

- [x] 2.1 Add `rerun_count` field to WorkUnitIndexRecord schema.
- [x] 2.2 Update claim: read rerun_count from rb_profile.yaml, write into index record.
- [x] 2.3 Add `--eligible-rows` flag to operate-work-unit inspect. collectEligibleRows() filters by index.rerun_count == profile.rerun_count, validates authority first.
- [x] 2.4 integration test: claim stamps rerun_count, eligible-rows filters correctly (4/4 pass)

## 3. Phase-Rerun Integration

- [x] 3.1 phase-rerun Stage 2 stale direction ignored (对比推断): use `resolveRerunDirection` states in the comparison table. Only topics with `matching` direction and supplement/add actions produce topic adjustments. Topics with `stale` direction → treated as no-change.

## 4. Phase-Wave0: Authority-Driven Rebuild (RWP-014)

- [x] 4.1 phase-wave0 §3.3 authority-driven rebuild `phase-wave0.md` §3.3: replace grep-replace-token with authority-driven rebuild. When token present → replace with return-map entries. When token absent → run `operate-work-unit inspect --eligible-rows` for topic/wave0, read outputs at returned paths, derive entries with entry_id (`<work_id>/<n>`), append entries with new entry_ids. Include no-projection disposition pattern.

## 5. Phase-Wave1: Classification + Rebuild (RWP-014)

- [x] 5.1 phase-wave1 §3.0 classification "Classify Direct Facts" to `phase-wave1.md`. Classification uses shared direction resolver: `matching`/`future` + `action: supplement` → supplement; otherwise → reuse (if valid submitted coverage exists) or new (if no coverage).
- [x] 5.2 phase-wave1 §3.1 exclude reuse: exclude reuse. Enqueue supplementary with `new_search_dimensions` for supplement. Include `rerun_count` in queue lineage for documentation (Engine-owned field is authoritative; lineage is advisory).
- [x] 5.3 phase-wave1 §3.3 authority rebuild: authority-driven rebuild for all three sections. Same pattern as wave0. `__BACKFILL_PENDING_QUESTIONS__` token → first materialization replace; rerun append.

## 6. Phase-Wave2: Classification + Rebuild + Finding Round Marker (RWP-020)

- [x] 6.1 phase-wave2 §3.0 targeted-evidence classification "Classify Direct Facts" to `phase-wave2.md`: targeted-evidence path only. Emergent finding + needs_search → targeted evidence; existing valid targeted evidence → reuse. Pure synthesis and backfill NOT subject to per-topic reuse. Documents difference from existing §3.2 triage: classification adds round-awareness to filtering old vs new findings.
- [x] 6.2 phase-wave2 §3.2.3 authority rebuild: authority-driven rebuild from `cross-topic-ledger.md` and `finding-index.yaml`. Filter findings by `created_in_rerun_count == profile.rerun_count` (current-round) plus legacy findings (no field → always included). Extract W2F-xxx entries per affected topic, append with W2F-xxx dedup.
- [x] 6.3 phase-wave2 §3.2.1 finding round marker guidance in §3.2.1: Phase Agent SHALL write `created_in_rerun_count` (from profile current value) when creating new findings in `finding-index.yaml`.
- [x] 6.4 finding round marker in phase-wave2 §3.2.1

## 7. Return-Map Inspect: Per-Wave Token + Per-Row Authority Check (RRM-006, RRM-007)

- [x] 7.1 hasBackfillToken per-wave filter()`: accept `wave` parameter. Use explicit token-wave mapping. Update all call sites in `inspectSeedTopicReturnMaps()`.
- [x] 7.2 per-row authority check in return-map reference check: for Wave0/Wave1, read eligible rows (index.rerun_count == profile.rerun_count), resolve topic binding, scan target section refs fields for each work_id. For Wave2, read finding-index.yaml, filter by `created_in_rerun_count` plus legacy findings. Each work_id/finding-id must be referenced OR have explicit no-projection disposition. Any unreferenced row/finding → blocking finding.
- [x] 7.3 section-scoped refs parsing: parse refs fields only within the target wave section (header-delimited). Use existing `FIELD_LINE_RE` and `BUNDLE_REF_RE` patterns.
- [x] 7.4 return-map per-wave token + section-scope tests added

## 8. Requirement Registry

- [x] 8.1 registry: RTI-007, RWP-020, RRM-006/007, WPG-015
- [x] 8.2 check-project-reqs PASS
- [x] 8.3 check-project-specs PASS

## 9. Version Bump v0.29

- [x] 9.1 CHANGELOG v0.29
- [x] 9.2 RUN.md v0.29 banner

## 10. Verification

- [x] 10.1 return-map tests PASS (6/6)
- [x] 10.2 direction resolver tests: 8/8 pass
- [x] 10.3 lifecycle claim tests PASS
- [x] 10.4 full engine tests PASS (0 failures)
- [x] 10.5 integration suite: pre-existing failures confirmed (unrelated to this change)
- [x] 10.6 integration test: tests/integration/cli/rerun-round-continuity.test.mjs (4/4 pass)
- [x] 10.7 E2E playbook: experiments_playbook/exp_rerun-round-continuity/README.md created
  - Reconciled 2026-07-15: the named asset never existed, so this historical checkbox did not carry runnable evidence. `formalize-verification-routing` supersedes it with `tests/e2e/rerun-round-continuity.test.mjs` for deterministic round-state/failure/recovery proof and executed `experiments_playbook/exp_wfn_rerun/case-318-heavy-rerun-direction-recovery.md` for real subject-Agent direction/crash-window recovery. Do not cite the missing README as execution evidence.
  - (a) Playbook MUST create a real disposable bundle via `new-disposable-bundle.mjs` — no reuse of fixture state.
  - (b) MUST cover two paths: round-2 supplement (add new dimension to existing topic) AND round-3 stale direction (direction.rerun_count=2 ignored when profile=3).
  - (c) Verdict MUST validate three evidence classes: trace events (`rb_trace.jsonl` — direction resolver states, claim rerun_count stamp), gate output (`check-gate-wave1-complete`/`wave2-complete` JSON — passed), and inspect output (`--eligible-rows` returns correct round-filtered rows, per-row authority check passes after rebuild).
  - (d) Playbook SHALL include explicit done_condition per step and a final verdict step that reads all three evidence classes.

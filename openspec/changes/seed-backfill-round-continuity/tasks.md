## 1. Shared Direction Resolver (RTI-007)

- [ ] 1.1 Implement `resolveRerunDirection(content, profileRerunCount)` in `DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs`. Parse `rerun_count` from `## 本轮重跑方向` section via existing regex. Return one of five states: `matching` (== profile), `stale` (< profile), `future` (> profile), `legacy_unbound` (no field), `invalid` (unparseable). Export for reuse by gate, classification, and `checkRerunAddFullSynthesis`.
- [ ] 1.2 Update `checkRerunAddFullSynthesis` to use `resolveRerunDirection`. `matching`/`future` → apply action. `stale` → ignore. `legacy_unbound` → apply existing pre-v0.29 behavior. `invalid` → diagnostic, action not applied.
- [ ] 1.3 Update `phase-rerun.md` Stage 1: compute `target = profile.rerun_count + 1`. Check if direction section exists with `rerun_count == target` → skip to increment+gate (crash recovery: direction already written this round). Otherwise → proceed to Stage 3.
- [ ] 1.4 Update `phase-rerun.md` Stage 3 step 1: write `rerun_count: <target>` into `## 本轮重跑方向`. Step 2: increment profile to target. Document invariant: after completion, direction.rerun_count == profile.rerun_count == target.
- [ ] 1.5 Add focused unit tests: (a) matching → action applied, (b) stale → action ignored, (c) future → action applied (crash window), (d) legacy_unbound → old behavior, (e) target computation: profile=1 → target=2, (f) crash recovery: direction=2, profile=1, target=2 → skip to increment.

## 2. Engine-Owned Round Stamping (WPG-015)

- [ ] 2.1 Add `rerun_count` field to WorkUnitIndexRecord schema in `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`: `rerun_count: z.number().int().nonnegative().optional()`.
- [ ] 2.2 Update `operate-work-unit claim` in `DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs`: read `rerun_count` from `rb_profile.yaml` at claim time, write into index record's `rerun_count` field. If profile field is absent or 0, write 0.
- [ ] 2.3 Update `operate-work-unit inspect` in `DPT_FRAMEWORK/engine/work-unit-inspect.mjs`: add `--eligible-rows` flag via `parseArgs` with `type: 'boolean'`. When present, return all submitted rows filtered by index `rerun_count == profile.rerun_count`, validated through ledger/index/manifest/queue-snapshot/canonical-topic binding. Each row includes `work_id`, `result_path`, `rerun_count`, resolved topic binding. Legacy rows without `rerun_count` excluded. Output is JSON to stdout; exit code 0 on success, 1 on bundle error. Update CLI usage text (`--eligible-rows  Output current-round eligible submitted rows for Agent consumption`).
- [ ] 2.4 Add unit test: claim with profile rerun_count=2 → index record has rerun_count=2. Legacy index record without field → not returned by --eligible-rows when profile count > 0.

## 3. Phase-Rerun Integration

- [ ] 3.1 Update `phase-rerun.md` Stage 2 (对比推断): use `resolveRerunDirection` states in the comparison table. Only topics with `matching` direction and supplement/add actions produce topic adjustments. Topics with `stale` direction → treated as no-change.

## 4. Phase-Wave0: Authority-Driven Rebuild (RWP-014)

- [ ] 4.1 Update `phase-wave0.md` §3.3: replace grep-replace-token with authority-driven rebuild. When token present → replace with return-map entries. When token absent → run `operate-work-unit inspect --eligible-rows` for topic/wave0, read outputs at returned paths, derive entries with entry_id (`<work_id>/<n>`), append entries with new entry_ids. Include no-projection disposition pattern.

## 5. Phase-Wave1: Classification + Rebuild (RWP-014)

- [ ] 5.1 Add §3.0 "Classify Direct Facts" to `phase-wave1.md`. Classification uses shared direction resolver: `matching`/`future` + `action: supplement` → supplement; otherwise → reuse (if valid submitted coverage exists) or new (if no coverage).
- [ ] 5.2 Update §3.1: exclude reuse. Enqueue supplementary with `new_search_dimensions` for supplement. Include `rerun_count` in queue lineage for documentation (Engine-owned field is authoritative; lineage is advisory).
- [ ] 5.3 Update §3.3: authority-driven rebuild for all three sections. Same pattern as wave0. `__BACKFILL_PENDING_QUESTIONS__` token → first materialization replace; rerun append.

## 6. Phase-Wave2: Classification + Rebuild + Finding Round Marker (RWP-020)

- [ ] 6.1 Add §3.0 "Classify Direct Facts" to `phase-wave2.md`: targeted-evidence path only. Emergent finding + needs_search → targeted evidence; existing valid targeted evidence → reuse. Pure synthesis and backfill NOT subject to per-topic reuse. Documents difference from existing §3.2 triage: classification adds round-awareness to filtering old vs new findings.
- [ ] 6.2 Update §3.2.3: authority-driven rebuild from `cross-topic-ledger.md` and `finding-index.yaml`. Filter findings by `created_in_rerun_count == profile.rerun_count` (current-round) plus legacy findings (no field → always included). Extract W2F-xxx entries per affected topic, append with W2F-xxx dedup.
- [ ] 6.3 Update Wave2 synthesis guidance in §3.2.1: Phase Agent SHALL write `created_in_rerun_count` (from profile current value) when creating new findings in `finding-index.yaml`.
- [ ] 6.4 Add `created_in_rerun_count` to shared-schemas.md finding contract documentation.

## 7. Return-Map Inspect: Per-Wave Token + Per-Row Authority Check (RRM-006, RRM-007)

- [ ] 7.1 Update `hasBackfillToken()`: accept `wave` parameter. Use explicit token-wave mapping. Update all call sites in `inspectSeedTopicReturnMaps()`.
- [ ] 7.2 Implement per-row authority reference check: for Wave0/Wave1, read eligible rows (index.rerun_count == profile.rerun_count), resolve topic binding, scan target section refs fields for each work_id. For Wave2, read finding-index.yaml, filter by `created_in_rerun_count` plus legacy findings. Each work_id/finding-id must be referenced OR have explicit no-projection disposition. Any unreferenced row/finding → blocking finding.
- [ ] 7.3 Section-scope the check: parse refs fields only within the target wave section (header-delimited). Use existing `FIELD_LINE_RE` and `BUNDLE_REF_RE` patterns.
- [ ] 7.4 Add focused unit tests: (a) all work_ids referenced → pass, (b) one work_id missing → blocking, (c) no-projection disposition → pass, (d) no eligible rows → pass, (e) Wave0 inspect not short-circuited by Wave1 token, (f) Wave2 pure synthesis finding referenced → pass, (g) Wave2 legacy finding missing from refs → advisory only, not blocking, (h) Wave2 legacy finding present in refs → no finding, (i) section-scoped: work_id in different section not counted.

## 8. Requirement Registry

- [ ] 8.1 Register new IDs in `openspec/governance/req-registry.yaml`: RTI-007 under `rerun-topic-integration`; RWP-020 under `research-wave-phase-content`; RRM-006, RRM-007 under `research-return-map`; WPG-015 under `work-unit-provenance-gate`.
- [ ] 8.2 Run `node openspec/governance/check-project-reqs.mjs` — MUST PASS.
- [ ] 8.3 Run `node openspec/governance/check-project-specs.mjs` — MUST PASS.

## 9. Version Bump v0.29

- [ ] 9.1 Update `CHANGELOG.md`: add v0.29 entry covering direction resolver, Engine-owned round stamping, authority-driven projection rebuild, per-row inspect verification, and finding round marker.
- [ ] 9.2 Update `DPT_FRAMEWORK/RUN.md` version banner to match CHANGELOG v0.29.

## 10. Verification

- [ ] 10.1 Run `node --test tests/engine/helpers/return-map.test.mjs` — per-wave token + per-row authority checks.
- [ ] 10.2 Run `node --test tests/engine/helpers/wave-contract-evaluators.test.mjs` — direction resolver 5 states.
- [ ] 10.3 Run `node --test tests/engine/work-unit-lifecycle.test.mjs` — claim stamps rerun_count.
- [ ] 10.4 Run full engine suite: `node --test tests/engine/` — no regressions.
- [ ] 10.5 Run integration suite: `node --test tests/integration/` — no regressions.
- [ ] 10.6 Deterministic integration test (`tests/integration/cli/rerun-round-continuity.test.mjs`): create disposable bundle → round-1 completion → round-2 rerun with supplement → verify (a) target_rerun_count computed correctly, (b) direction resolver returns matching after completion, future during crash window, (c) claim stamps rerun_count=2, (d) --eligible-rows returns only round-2 rows, (e) authority check passes after rebuild, (f) crash recovery: direction written, profile not incremented → re-execution skips to increment.
- [ ] 10.7 **Controlled E2E playbook** (`experiments_playbook/exp_rerun-round-continuity/README.md`): **Required before completing apply.** Agent-driven, trace-verdict. Hard acceptance criteria:
  - (a) Playbook MUST create a real disposable bundle via `new-disposable-bundle.mjs` — no reuse of fixture state.
  - (b) MUST cover two paths: round-2 supplement (add new dimension to existing topic) AND round-3 stale direction (direction.rerun_count=2 ignored when profile=3).
  - (c) Verdict MUST validate three evidence classes: trace events (`rb_trace.jsonl` — direction resolver states, claim rerun_count stamp), gate output (`check-gate-wave1-complete`/`wave2-complete` JSON — passed), and inspect output (`--eligible-rows` returns correct round-filtered rows, per-row authority check passes after rebuild).
  - (d) Playbook SHALL include explicit done_condition per step and a final verdict step that reads all three evidence classes.

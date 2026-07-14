## 1. Template Header Rename (CTS-008, STM-009)

- [ ] 1.1 Rename backfill section headers in `canonical-topic-state.mjs` `renderNewSeedBody()`: `## 本轮新增证据` → `## Wave0 证据`, `## 本轮新增机制理解` → `## Wave1 机制`, `## 本轮新增趋势与难点` → `## Wave1 趋势与缺口`, `## 当前判断` → `## Wave2 发现`, `## 待验证问题` → `## 待解决问题`. Verify with `node --test tests/engine/helpers/canonical-topic-state.test.mjs`.
- [ ] 1.2 Rename backfill section headers in `phase-seed-topics.md` template: same 5 header renames plus update the backfill responsibility table (guidance table target column). Also update inline references in §3.1 and evidence-route guidance text that reference old header names.

## 2. Classify Direct Facts for Wave1 (RWP-020)

- [ ] 2.1 Add §3.0 "Classify Direct Facts" to `phase-wave1.md` before existing §3.1. Mirror wave0 §3.0 pattern: classify each Topic by direct bundle authority → reuse/fresh/supplement. Include orphan `evidence-summary.md` without submitted backing → not coverage.
- [ ] 2.2 Update `phase-wave1.md` §3.1 Fill Queue: change "If queue is empty or thin, enqueue one delegated deepening queue item per topic" to exclude reuse-classified topics ("Do not enqueue duplicate work for an existing Topic whose valid submitted Wave1 deepening is being reused").

## 3. Classify Direct Facts for Wave2 (RWP-021)

- [ ] 3.1 Add §3.0 "Classify Direct Facts" to `phase-wave2.md` before existing §3.1. Classify each Topic/finding by direct bundle authority: reuse cross-topic coverage / normal pipeline / emergent targeted evidence.
- [ ] 3.2 Update `phase-wave2.md` §3.1 Filling: scope enqueue to only topics/findings classified as needing normal (non-reuse) demand.

## 4. Token Re-injection in Phase-Rerun (RBC-001, RBC-002, RBC-003, RTI-007)

- [ ] 4.1 Add Stage 3 step 1d "Refresh Backfill Targets" in `phase-rerun.md` between step 1c (recompute research_style_params) and step 2 (increment rerun_count). Instructions: for each existing topic (not add_topic), read seed file, for each wave section check if `__BACKFILL_*__` token exists → skip if present, insert at section bottom if absent. Skip add_topic. Idempotent. Staged write.
- [ ] 4.2 Include the five wave-section-to-token mapping table (with both old and new header names) in the phase-rerun step 1d instructions, so the Agent can locate the correct section for token insertion regardless of whether the seed file uses old or new headers. Detection instructions: grep entire file for each `__BACKFILL_*__` string; if found → skip; if not found → locate target section by header (new or old) and insert token at section bottom.

## 5. Missing-Token Fallback in Wave Phases (RWP-022)

- [ ] 5.1 Add fallback instructions to `phase-wave0.md` §3.3 backfill section: if `__BACKFILL_WAVE0_EVIDENCE__` not found, check reuse classification → skip if reuse, otherwise record diagnostic and append after last content in Wave0 Evidence section.
- [ ] 5.2 Add fallback instructions to `phase-wave1.md` §3.3 backfill section: same pattern for `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, and `__BACKFILL_PENDING_QUESTIONS__`.
- [ ] 5.3 Add fallback instructions to `phase-wave2.md` §3.2.3 backfill section: same pattern for `__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__`.

## 6. Requirement Registry and Governance

- [ ] 6.1 Register new requirement IDs in `openspec/governance/req-registry.yaml`: add `RBC` prefix and RBC-001/002/003 under new `rerun-backfill-continuity` group; add RWP-020/021/022 under existing `research-wave-phase-content` group; add RTI-007 under existing `rerun-topic-integration` group; add CTS-008 under existing `canonical-topic-state` group; add STM-009 under existing `seed-topic-materialization` group. All groups in alphabetical order.
- [ ] 6.2 Run `node openspec/governance/check-project-reqs.mjs` — MUST PASS (0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired).
- [ ] 6.3 Run `node openspec/governance/check-project-specs.mjs` — MUST PASS (0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader).

## 7. Verification

- [ ] 7.1 Run existing regression tests: `node --test tests/engine/helpers/canonical-topic-state.test.mjs` — verify renderNewSeedBody() still produces valid seed skeleton with renamed headers.
- [ ] 7.2 Run full engine test suite: `node --test tests/engine/` — verify no regressions from template changes.
- [ ] 7.3 Run integration test suite: `node --test tests/integration/` — verify no regressions from phase doc changes.
- [ ] 7.4 Manual review: read each modified phase doc and verify the Agent would follow the correct logical flow for a round-2 supplement rerun (classify → skip reuse → enqueue supplement → submit → backfill token found → replace → gate passes).

# Design Analysis: Seed Topic Backfill Zone Lacks Round Continuity

## Metadata

| Field | Value |
|---|---|
| **Identifier** | `seed-backfill-round-continuity` |
| **Category** | Structural Design Flaw（非单点 bug） |
| **Severity** | **P0** — blocks sanctioned multi-round rerun |
| **Status** | Analysis Updated — post repair-rerun commit (`80d0c9e83`) |
| **Date** | 2026-07-13 (original), updated 2026-07-15 |
| **Related Bugs** | BUG-081 (seed skeleton minimal) — **resolved**; BUG-082 (work-unit provenance) — **resolved**; BUG-080 (rerun backfill quality) |
| **Related Change** | `repair-rerun-added-topic-bootstrap` (committed `80d0c9e83`) — addressed BUG-081/082, partially mitigated wave0, did NOT address this flaw |

---

## 1. What This Is

### The Core Flaw (unchanged)

Seed topic 文件的「研究轮次追加区」是 **单次消费结构**。`__BACKFILL_*__` token 被设计为 grep 定位 → 替换 → gate 验证已消费（`negate: true` pattern_match）。第一次 research round 完美工作。但框架明确支持多轮 rerun（HITL2 → rerun → seed-topics → wave0/1/2 → HITL2 循环），token 在 round 1 消费后永久消失，round 2 没有结构化的回填目标。

### 这不是 BUG-081

| 关注点 | BUG-081 | 本缺陷 |
|---|---|---|
| 新 topic (add_topic) 获得 backfill token | ✅ `renderNewSeedBody()` 产出完整骨架 | ❌ 不影响 `renderNewSeedBody()` |
| 已有 topic 在 round 2+ 获得 backfill token | ❌ `renderNewSeedBody()` 只影响新建 | ✅ phase-rerun 重新注入 token |
| 本质 | 初始骨架太薄 | **回填区结构缺乏跨轮连续性** |

**即使 BUG-081 已修好**（每个新 topic 都有完整骨架+5 个 token），round 1 消费后 token 仍然消失，round 2 仍然没有回填目标。

---

## 2. What the repair-rerun Commit (`80d0c9e83`) Actually Changed

The commit built a fundamentally different approach to rerun evidence continuity — work-unit-evidence-first rather than token-reinjection. This section documents what was addressed and what wasn't, verified against the actual code.

### 2.1 Resolved: New Topics Get Fresh Tokens (BUG-081)

**File**: `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs`

`renderNewSeedBody()` (lines 105-170) now generates a full skeleton with enrichment fields and all five `__BACKFILL_*__` tokens. `renderSeed(topic)` (called without existing seed for `add_topic` in `buildMutation()` line 535) produces a brand-new seed with fresh tokens. **New topics in reruns are properly initialized.**

### 2.2 Partially Mitigated: Wave0 on Existing Topics

**File**: `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` §3.0

The new "Classify Direct Facts" section tells the Agent:

- `existing Topic + valid submitted Wave0 coverage -> reuse` that submitted historical coverage
- `new Topic + no submitted Wave0 coverage -> normal Topic pipeline`
- `supplement intent -> normal supplementary demand`

§3.1 then says: "Do not enqueue duplicate work for an existing Topic whose valid submitted Wave0 coverage is being reused." §3.3 backfill only fires after successful submit — so reuse topics never reach backfill.

**Gate impact**: `gate-wave0-complete.definition.json` does NOT check `__BACKFILL_WAVE0_EVIDENCE__` at all (14 rules, none involve seed topic backfill tokens). Round 1 submitted ledger rows persist. The gate passes for reuse topics because all its checks (source.yaml existence, shared ref count, cache coverage, work-unit ledger) are satisfied by round 1 evidence.

**Limitation**: This is an Agent instruction, not an Engine-enforced skip. If the Agent misclassifies a topic, it could still enqueue work and then fail to find the backfill token.

### 2.3 Resolved: Supplementary Work Units Can Cite Prior Outputs

**File**: `DPT_FRAMEWORK/engine/work-unit-validation.mjs` — `buildSourceRefLineage()` (line 473)

This function enables a Wave1 supplementary work unit to cite a prior submitted `evidence_summary` output without redeclaring it. Eligibility requires:
- Same `topic_uid`, same `wave`, same `kind`
- Role is in `prior_submitted_output_roles` (Wave1 deepening contract authorizes `['evidence_summary']`)
- Index/result/ledger hash integrity, manifest binding, queue terminal binding all pass

This is a **new infrastructure capability** that didn't exist when the original plan was written. It changes how supplementary deepening works: the new unit can reference the old evidence file rather than reproduce it.

### 2.4 Resolved: Depth Review Facts Derived from Submitted Rows

**File**: `DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs` (lines 483-514)

The depth-review contract no longer trusts `source_claims`, `wave0_source_urls`, `new_source_urls`, or `new_source_floor` fields in `depth-review.yaml`. Those fields, if present, are ignored for the verdict and produce only a diagnostic (`[depth_review_projection_drift]`). Facts are derived directly from the submitted rows named by `reviewed_work_unit_refs[]`.

### 2.5 Resolved: Declaration Recovery

**File**: `DPT_FRAMEWORK/engine/work-unit-submit.mjs` — `recoverWorkUnitDeclaration()`

Missing ledger rows (from prior rounds) can be reconstructed from index/status/result/receipt/cache/trace/transaction evidence via `operate-work-unit recover-declaration`. This prevents round 2 gates from failing due to lost round 1 ledger rows.

### 2.6 Unchanged: Wave1 and Wave2 Have No Classify Direct Facts

**Verified**: `phase-wave1.md` and `phase-wave2.md` have NO §3.0 classification section. They still say "enqueue one... per topic" without any reuse skip logic. There is no symmetry with wave0's classification.

### 2.7 Unchanged: Phase-Rerun Does Not Re-inject Tokens

**Verified**: `phase-rerun.md` was not modified by the commit. `canonical-topic-state.mjs` `renderSeed()` (line 182) preserves existing seed bodies byte-for-byte. There is NO code path anywhere that re-injects `__BACKFILL_*__` tokens into existing seeds. After a round-2 rerun with `action: supplement`, seed files contain consumed return-map entries from round 1 — no tokens.

### 2.8 Unchanged: Seed Template Uses Round-Relative Headers

**Verified**: Both `phase-seed-topics.md` template (lines 182-195) and `canonical-topic-state.mjs` `renderNewSeedBody()` (lines 156-169) still use:
- `## 本轮新增证据` (not `## Wave0 证据`)
- `## 本轮新增机制理解` (not `## Wave1 机制`)
- `## 本轮新增趋势与难点` (not `## Wave1 趋势与缺口`)
- `## 当前判断` (not `## Wave2 发现`)
- `## 待验证问题` (not `## 待解决问题`)

**Impact of changing these headers**: Gate checks match on `__BACKFILL_*__` token strings (raw content grep), not section headers. `parseMarkdownSemanticSections` operates on English-named sections only. The only hardcoded Chinese header reference in Engine code is `## 本轮重跑方向` in `wave-contract-evaluators.mjs` line 329 — a separate concern. **Renaming backfill section headers would NOT break any Engine code**, but `renderNewSeedBody()` and the phase-seed-topics template must be updated together for consistency.

### 2.9 New Finding: Wave0 Gate Has No Backfill Token Check

**Verified**: `gate-wave0-complete.definition.json` contains 14 rules. None of them check `seed_topics/*.md` for `__BACKFILL_WAVE0_EVIDENCE__`. The only `pattern_match` rule in the wave0 gate checks for `example.com` URLs. This means wave0 backfill is purely Agent-disciplined (anti-cheating rule §9); the Engine does not verify it.

Wave1 and Wave2 gates DO check their respective tokens with `negate: true` — but on rerun, those tokens are already gone from round 1, producing **false gate passes** (gate can't distinguish "consumed this round" from "consumed last round").

---

## 3. Refined Impact Trace

### Primary Failure Scenario (still valid, refined)

**Given**: 研究跑完一轮完整 cycle。所有 seed topic 文件的 `__BACKFILL_*__` token 已消费。

**When**: HITL2 用户决定 rerun，提供新 rationale（如 "补充成本分析维度"）。Phase-rerun 正确写入 `## 本轮重跑方向` section（含 `action: supplement`, `new_search_dimensions`）。但 `renderSeed()` 保留 body byte-for-byte — token 不回来。

**Then**:

| Wave | What Happens |
|------|-------------|
| **wave0** | §3.0 classifies as "existing + valid submitted coverage → reuse." No queue item enqueued. No backfill attempted. **OK — but only if Agent follows §3.0 correctly.** |
| **wave1** | No classification logic. Agent may enqueue supplementary deepening. If deepening produces new mechanism/trend evidence: §3.3 says "Locate `__BACKFILL_WAVE1_MECHANISMS__`" — token not found. Agent must improvise. Gate passes trivially (tokens already gone from round 1). **New evidence not backfilled.** |
| **wave2** | Same pattern. No classification logic. Token not found. Gate passes trivially. **New cross-topic findings not backfilled.** |

### Phase-by-Phase Breakdown (updated)

| Phase | Status | Detail |
|-------|--------|--------|
| **phase-rerun** | ❌ Still broken | Writes `## 本轮重跑方向` (what to search) but doesn't create structural backfill targets (where to write). `renderSeed()` preserves body byte-for-byte — no token re-injection. |
| **phase-seed-topics** | ❌ Still broken | Rerun-aware behavior (lines 320-338) preserves existing files but doesn't refresh tokens. Only wave0 reads `new_search_dimensions`; wave1/wave2 have no rerun-awareness. |
| **phase-wave0 §3.3** | ✅ Mitigated | §3.0 Classify Direct Facts → reuse topics skip queue → never reach §3.3. Gate has no backfill token check anyway. |
| **phase-wave1 §3.3** | ❌ Still broken | No classification logic. No missing-token fallback. Three tokens in play (`MECHANISMS`, `TRENDS`, `PENDING_QUESTIONS`). Gate checks all three with `negate: true` — passes trivially on rerun (false positive). |
| **phase-wave2 §3.2.3** | ❌ Still broken | Same pattern. Two tokens (`JUDGMENT`, `PENDING_QUESTIONS`). Gate passes trivially. |
| **gate-wave1-complete** | ⚠️ False pass | `negate: true` on `__BACKFILL_WAVE1_*__` — tokens absent from round 1 consumption → passes without round 2 backfill |
| **gate-wave2-complete** | ⚠️ False pass | Same false-pass pattern for `__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__` |

---

## 4. Refined Design

The original plan proposed three design changes: wave-fixed sections with `### Round N` accumulation, backfill instructions in seed topic headers, and phase-rerun token re-injection. Given what the repair-rerun commit built, the design should be simplified.

### 4.1 Design Principle

**Submitted work units are authoritative; seed topic backfill is a downstream projection.** The repair-rerun commit already established this principle for wave0 (§3.0) and depth review (facts derived from submitted rows). Extend it consistently to wave1 and wave2.

### 4.2 Three Changes

**Change A: Add "Classify Direct Facts" to phase-wave1.md and phase-wave2.md**

Mirror wave0 §3.0. Before queue fill, classify each Topic from direct bundle authority:

- `existing Topic + valid submitted Wave1 deepening -> reuse` that submitted historical deepening coverage
- `new Topic + no submitted Wave1 deepening -> normal deepening pipeline`
- `supplement intent -> normal supplementary deepening` through the same producer path
- orphan `evidence-summary.md` or `depth-review.yaml` without submitted backing -> not coverage

Same for wave2 with cross-topic/targeted-evidence coverage. This prevents the "Agent enqueues work, completes it, then can't find backfill token" scenario — because existing topics with valid coverage won't get new work unless there's a genuine supplement need tied to `new_search_dimensions`.

**Why this works**: The `buildSourceRefLineage` infrastructure already lets supplementary work units cite prior outputs. Combined with classification, the Agent can distinguish "this topic already has valid deepening, skip" from "this topic needs new deepening for the supplement dimension, enqueue." The supplement path is legitimate — it just needs a structural backfill target (Change B).

**Change B: Add Token Re-injection to phase-rerun.md**

After stage 1c (recompute research_style_params) and before stage 2 (increment rerun_count), add:

```
Stage 1d: Refresh Backfill Targets

For each affected existing topic (not add_topic):

1. Read the seed file
2. For each wave section, check if its __BACKFILL_*__ token exists:
   - ## Wave0 证据 → __BACKFILL_WAVE0_EVIDENCE__
   - ## Wave1 机制 → __BACKFILL_WAVE1_MECHANISMS__
   - ## Wave1 趋势与缺口 → __BACKFILL_WAVE1_TRENDS__
   - ## Wave2 发现 → __BACKFILL_WAVE2_JUDGMENT__
   - ## 待解决问题 → __BACKFILL_PENDING_QUESTIONS__
3. If token exists → skip (prior round incomplete, token still valid)
4. If token absent → insert fresh token at section bottom (after last content line, before next ## header)
5. Skip add_topic (fresh skeletons already have tokens from renderNewSeedBody())
6. Idempotent: re-running this stage does not create duplicate tokens
```

This is dramatically simpler than the original plan's design:
- No `### Round N` accumulation (submitted work-unit rows carry temporal order; seed topics are flat per-wave projections)
- No old-template migration (phase-rerun rewrites seed files to current format on first encounter; one-time, automatic)
- No header renaming in this stage (the header change is Change C, applied separately)

**Why this works**: The token names (`__BACKFILL_WAVE0_EVIDENCE__` etc.) are already wave-named — they don't need to change. The detection logic is a simple grep per section. The existing gate `negate: true` pattern_match checks continue to work exactly as before — they check for token presence regardless of round number.

**Change C: Rename Seed Template Headers to Wave-Fixed Names**

Remove "本轮" (this round) from header names. The structure says which wave the content belongs to, not which round wrote it:

| Old | New |
|---|---|
| `## 本轮新增证据` | `## Wave0 证据` |
| `## 本轮新增机制理解` | `## Wave1 机制` |
| `## 本轮新增趋势与难点` | `## Wave1 趋势与缺口` |
| `## 当前判断` | `## Wave2 发现` |
| `## 待验证问题` | `## 待解决问题` |

Update in two places:
- `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs` `renderNewSeedBody()` (lines 156-169)
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md` template (lines 166-195)

**Why this is safe**: Gate checks match on `__BACKFILL_*__` token strings (raw content grep), not section headers. `parseMarkdownSemanticSections` operates on English sections only. The only hardcoded Chinese header in Engine code is `## 本轮重跑方向` in `wave-contract-evaluators.mjs` line 329 — a separate section, unchanged.

### 4.3 No Longer In Scope

- **`### Round N` accumulation**: Submitted work-unit rows carry temporal order; seed topics are flat per-wave projections. Adding round sub-headers creates complexity without benefit in the new architecture.
- **Old-template migration logic**: phase-rerun naturally rewrites seed files to current format when it re-injects tokens. First encounter with an old-format file → write new-format with re-injected tokens. No special migration code needed.
- **`shared-schemas.md` documentation**: Not needed — the multi-round concept lives in work-unit lineage (submitted rows), not in seed file structure.
- **Missing-token fallback in wave phases**: With Change A (classification skips reuse topics) and Change B (phase-rerun re-injects tokens for supplement topics), the fallback becomes a rare edge case. The wave phase instructions should still mention it ("if token not found, check: was this topic classified as reuse? If so, skip. Otherwise, the token should have been re-injected by phase-rerun — record diagnostic and append after last section content."), but it's no longer the primary path.

---

## 5. Interactions

### With Existing Infrastructure

| Mechanism | File | How It Interacts |
|---|---|---|
| `buildSourceRefLineage` | work-unit-validation.mjs | Supplementary work units cite prior outputs; classification (Change A) decides whether to enqueue; token re-injection (Change B) provides target for new backfill |
| `recover-declaration` | work-unit-submit.mjs | Prior-round ledger rows stay intact; round 2 work doesn't need to reconstruct them |
| `renderNewSeedBody()` | canonical-topic-state.mjs | New topics get fresh tokens (BUG-081 fixed); Change C updates header names |
| Gate `negate: true` checks | gate-wave1/2-complete.definition.json | Continue to work — they verify token consumption regardless of round |
| `parseMarkdownSemanticSections` | gate-helpers-checks.mjs | Unaffected by header renaming (operates on English sections only) |

### Dependency Order

```
Change C (rename headers) ── independent, can be done first
Change A (classify for wave1/2) ── independent, can be done in parallel with C
Change B (token re-injection) ── depends on C (must know new header names to locate sections)
```

---

## 6. Verification

### Unit-Level

- **Test 1**: Round 1 complete seed file (all 5 tokens consumed) → token re-injection → all 5 `__BACKFILL_*__` tokens appear at correct section bottoms, original content preserved
- **Test 2**: Seed file with existing (unconsumed) tokens → token re-injection → no duplicate tokens (idempotent)
- **Test 3**: New topic seed (add_topic) → token re-injection → skipped (fresh tokens preserved)
- **Test 4**: `renderNewSeedBody()` output → all 5 headers use wave-fixed names, tokens present
- **Test 5**: Old-format seed file (old headers) with consumed tokens → token re-injection → tokens injected after old section content (detected by token absence, not header name)

### Integration-Level

- **Test 6**: Round 1 complete bundle → phase-rerun with supplement action → verify seed files have re-injected tokens + `## 本轮重跑方向` section → wave0 classifies as reuse (skip) → wave1 classifies as supplement (enqueue) → wave1 backfill finds token → gate passes (token consumed this round)
- **Test 7**: Same scenario with add_topic → new topic gets fresh skeleton + goes through normal pipeline → all gates pass

### Gate-Level

- **Test 8**: Seed file with unconsumed `__BACKFILL_WAVE1_MECHANISMS__` → wave1 gate fails (negate: true, token present) — existing behavior preserved
- **Test 9**: Seed file with consumed tokens + no new round 2 backfill → wave1 gate passes — same as current behavior (acceptable: classification skips unless supplement produces new evidence)

### Edge Cases

- **Test 10**: Phase-rerun crash after token re-injection → rerun is idempotent (duplicate tokens not created)
- **Test 11**: Phase-rerun crash before token re-injection → wave phases use fallback path (token not found → check classification → skip or diagnostic)
- **Test 12**: `rerun_count = 3` (max) → third re-injection works identically to second
- **Test 13**: Mixed bundle (some topics reuse, some supplement, one add_topic) → each follows correct path

---

## 7. Files to Modify

| File | Change | Description |
|---|---|---|
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` | **Major** | Add §3.0 Classify Direct Facts + update §3.1 to exclude reuse topics |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` | **Major** | Add §3.0 Classify Direct Facts + update §3.1 to exclude reuse topics |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md` | **Major** | Add Stage 1d: token re-injection after research_style_params recompute |
| `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs` | Minor | `renderNewSeedBody()`: rename backfill section headers to wave-fixed names |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md` | Minor | Template: rename backfill section headers to wave-fixed names, update guidance table |

**Engine code impact**: Zero Engine code changes needed. Gate definitions unchanged. `operate-topic-state` unchanged. All changes are Agent-facing phase instructions + one template string change in `renderNewSeedBody()`.

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase-rerun writes malformed token position | Low | Medium | Simple logic: find section boundary, insert one line. Staged write + verify before rename. |
| Agent misclassifies topic in wave1/wave2 | Low-Medium | Medium | Classification uses same pattern as wave0 §3.0 (already in production). Gate hints provide structured feedback. |
| Gate false-pass for unconsumed round-N tokens | Low | Low | Token consumption is still verified by `negate: true` checks. The only gap is round-N token not consumed because Agent skipped backfill — but classification prevents unnecessary enqueue, and token re-injection ensures fresh targets exist. |
| Seed topic file growth over rounds | Low | Low | `rerun_count < 3` cap. Return-map entries are concise. Token re-injection adds only 5 lines per rerun. |
| Changing template headers creates inconsistency with existing bundles | Low | Low | Old bundles keep old headers until next rerun. Phase-rerun naturally rewrites headers when re-injecting tokens (first rerun after this change). No migration needed — the token re-injection logic detects tokens by name, not by header. |

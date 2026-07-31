---
bug_id: BUG-157
title: research_style_params computed with topic_count=0 before topic-state apply — stale until manual recompute
severity: P2
phase: hitl1
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-157: research_style_params stale before topic-state apply

## What happened

The HITL1 phase execution order is:
1. User selects research_profile → Agent writes `research_profile: exploratory_map`
2. Agent runs `apply-research-style.mjs` → computes params with `topic_count: 0` → `wave0_shared_ref_total: 4`
3. Agent runs `operate-topic-state.mjs apply` with 5 topics → `derived_topic_count: 5`
4. `apply` response includes `follow_up: "recompute_research_style"`
5. Agent re-runs `apply-research-style.mjs` → now `topic_count: 5` → `wave0_shared_ref_total: 9`

The `wave0_shared_ref_total` jumped from 4 to 9 after topic materialization. The initial value of 4 was computed against an empty registry and would have been used for Wave0 shared reference allocation if the Agent missed the `follow_up` instruction.

## Impact

If the Agent misses step 5 (the `follow_up: "recompute_research_style"` instruction), Wave0 operates with `wave0_shared_ref_total: 4` instead of 9 — a 56% reduction in shared reference allocation. This would cause the Wave0 gate to fail on insufficient shared reference count, requiring a late-stage repair.

The `follow_up` field in the apply response is easy to overlook because:
- It's a single string in a JSON response with 8+ fields
- The Agent's attention is on the `verdict: "committed"` success signal
- There's no gate-level enforcement that style params match topic_count

## Expected behavior

Option A: `operate-topic-state.mjs apply` should auto-recompute research style params when `derived_topic_count` changes, making `follow_up: "recompute_research_style"` an automatic side effect rather than an Agent reminder.

Option B: The HITL1 gate should detect `research_style_params.wave0_shared_ref_total` mismatch with `topic_registry.length` and fail with a specific hint.

**Why:** The current design relies on the Agent noticing and acting on a `follow_up` string — the weakest possible contract. The Engine already has the logic to compute correct params; it should apply them or at minimum gate-check them.

**How to apply:** Short-term: add a gate rule to `hitl1-recorded` that verifies `research_style_params` are consistent with current `topic_count`. Long-term: have `apply` auto-trigger style recompute when topic_count changes.

## C2 disposition (2026-07-30)

Fixed with the short feedback loop, not an automatic cross-owner mutation.
`canonical-topic-state` returns a structured `style_projection` handoff only
after a committed registry-length change; the existing
`apply-research-style.mjs` remains the sole profile writer. The shared pure
freshness evaluator is consumed by `check-gate-hitl1-recorded.mjs` and
`check-gate-rerun-ready.mjs`, which return one exact writer command and rerun
of the same Gate for absent, partial, wrong-profile, or stale parameters.

Verification coordinates:

- `tests/engine/helpers/research-style-params.test.mjs`
- `tests/engine/helpers/canonical-topic-state.test.mjs`
- `tests/integration/cli/apply-research-style.test.mjs`
- `tests/integration/cli/check-gate-hitl1-recorded.test.mjs`
- `tests/integration/cli/check-gate-rerun-ready.test.mjs`
- `tests/integration/md/phase-hitl1-research-access.test.mjs`

Outside the current HITL1/rerun freshness checkpoints, legacy count-floor
fallback remains readable-compatible. It does not permit a current readiness
checkpoint to accept an absent style projection.

---
bug_id: BUG-153
title: operate-topic-state apply Zod validation errors are opaque — no field-level detail
severity: P1
phase: seed-topics, hitl1
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-153: operate-topic-state apply Zod validation errors are opaque

## What happened

When `operate-topic-state.mjs apply` receives input that fails Zod validation, the error response is:

```json
{
  "verdict": "blocked",
  "reason_code": "input_invalid",
  "repair_kind": "agent_action",
  "reason": "Invalid input",
  "recommended_action": "Correct the retained complete input and rerun this same apply checkpoint."
}
```

No field-level detail about **which** field failed or what the expected format is. The Agent must grep the Engine source code (`canonical-topic-state.mjs`) to discover schema requirements.

## Concrete failures encountered

1. `must_answer` was a string → should be `z.array(z.string().min(1)).min(1)` — error: "Invalid input"
2. `scope_role` was `"baseline"` → only accepts `primary|synthesis|comparison|supporting` — error: "Invalid input"
3. `context` field entirely missing → required by `MutationPlanSchema` and `SeedEnrichmentPlanSchema` — error: "Invalid input"
4. `enrich_seed` input missing `context: "seed_topics"` → error: "Invalid input"

## Impact

Each validation failure costs ~2-3 turns: run apply → get opaque error → grep source → discover schema → fix input → rerun. With 3 apply calls in this run (one hitl1 topic apply + two enrich_seed), this wasted ~6-9 repair turns.

## Expected behavior

The error response should include `validation_errors[]` with per-field `path`, `expected`, and `received` (when safe to expose). At minimum, the first Zod issue's `path` and `message` should be surfaced.

**Why:** The `repair_kind: agent_action` contract assumes the Agent can self-correct, but without field-level diagnostics, the Agent has no actionable information beyond "read the source code." This violates the contract-lineage-aware feedback principle [[contract-lineage-aware-feedback]].

**How to apply:** In `canonical-topic-state.mjs`, when `TopicApplyPlanSchema.safeParse(input)` fails, include `parsed.error.issues` in the error response. At minimum surface `issues[0].path` and `issues[0].message`. Consider a `validation_summary` field with all issue paths.

## C3 Disposition (2026-07-30)

C3 retains `TopicApplyPlanSchema` as the sole validator and projects bounded safe `validation_errors[]` from its `ZodIssue[]`: a stable primary field coordinate, safe expectation detail, and the same `apply` rerun. It redacts arbitrary retained values, file bytes, paths, and stack traces; lifecycle and owner rejections remain their original non-writable boundary.

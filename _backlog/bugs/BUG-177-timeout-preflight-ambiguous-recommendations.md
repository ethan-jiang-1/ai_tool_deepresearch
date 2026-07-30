---
bug_id: BUG-177
title: timeout-preflight recommendations inconsistent for similarly-stuck work units
severity: P3
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-169: timeout-preflight ambiguous recommendations

## What happened

Two work units were claimed at the same time, both spawned as sub-agents, both stalled (past deadline). `timeout-preflight` gave different recommendations:

- **#1 (SDD)**: `recommended_action: "submit"` — despite having 4 receipt lines and no result.json
- **#2 (methodologies)**: `recommended_action: "wait"` — despite having 1 receipt line and being equally stuck

The diagnostic difference between the two was unclear. Both had similar states (claimed, past deadline, no result.json, minimal receipt events). Why one was "submit"-ready and the other needed to "wait" was not explained.

## Impact

The Phase Agent couldn't determine the correct action from the preflight output alone. For #1, manually writing result.json and submitting worked. For #2, waiting didn't help — the sub-agent remained stuck until a SendMessage push.

## Expected behavior

`timeout-preflight` should include a `diagnosis` field explaining WHY the recommendation was made:
```json
{
  "recommended_action": "submit",
  "diagnosis": "work unit has sufficient cache/output artifacts despite incomplete receipt; submission will accept existing artifacts",
  "evidence": ["source.yaml exists (8 entries)", "receipt has 4 events", "no result.json yet"]
}
```

**Why:** The current binary recommendation ("submit" vs "wait") gives the Phase Agent no basis for deciding whether to follow the recommendation or override it. A diagnostic trail would make the preflight actionable.

## C3 Disposition (2026-07-30)

C3 exposes `recommendation_basis` from the already selected candidate, progress, lease, or integrity branch. It gives the direct facts behind `submit`, `repair`, `wait`, `inspect`, `block`, or `timeout` while preserving existing eligibility, lease, dry-submit, terminalization, and recovery semantics.

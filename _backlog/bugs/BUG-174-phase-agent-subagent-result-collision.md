---
bug_id: BUG-174
title: Phase Agent and sub-agent result.json collision when Phase Agent unblocks stuck work
severity: P2
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-166: Phase Agent vs sub-agent result collision

## What happened

When sub-agents deadlocked (BUG-162), the Phase Agent wrote result.json and source.yaml directly and ran formal submit. When the sub-agent later completed and tried to dry-submit, it got:

```
wrong_work_id -- the work unit was already submitted by a prior attempt
```

This happened for work units #2 and #5. The Phase Agent's manual submission accepted the work, but the sub-agent's later completion created confusion: which result.json is canonical? The submitted one? The sub-agent's (which has more sources)?

## Concrete scenario

1. Phase Agent claims work unit #2 → spawns sub-agent → sub-agent stalls
2. Phase Agent writes source.yaml (7 entries) + result.json → dry-submit → submit (accepted)
3. Sub-agent later completes with 12 entries and 12 cache trails → attempts dry-submit → "already submitted"
4. Sub-agent's superior work (12 entries vs 7) is lost because the Phase Agent's partial submission was accepted first

## Impact

The Phase Agent is forced into a lose-lose choice:
- Wait for sub-agent: risk deadline expiry, phase never drains
- Submit early: lose potentially better sub-agent work

In this run, topic #2 ended with 10 entries (Phase Agent later padded to meet floor), but the sub-agent's 12-entry version with richer cache trails was discarded.

## Expected behavior

Option A: `operate-work-unit.mjs replace` should allow replacing a submitted work unit with a better result from the same queue item (currently `replace` only works for terminal attempts).

Option B: The Phase Agent should be able to "hold" a submission and merge sub-agent output when it arrives.

Option C: The sub-agent should detect "already submitted" and append its additional sources via a supplementary demand path instead of silently failing.

**Why:** The current binary submit model (first submission wins) creates a perverse incentive to either wait indefinitely for sub-agents or submit prematurely. Neither is correct for a framework that values evidence quality.

## C4 Disposition (2026-07-31)

- Implemented path (`DEW-022`, `DEW-024`): claim now binds one logical `actor_execution` route together with
  exact `work_id`, `receipt_nonce`, result, and receipt coordinates across manifest/index/beacon/task/result
  validation. Generated task and Phase guidance prohibit Phase-authored substitute content under a
  `delegated_subagent` binding; only an explicitly claimed `phase_agent_fallback` may author its exact attempt.
  Stale predecessor identity or actor-route candidates are rejected before ledger/queue mutation. Eligible
  post-submit integrity drift uses audited `supersede` and a fresh successor instead of in-place overwrite.
- Residual boundary: this is logical routing and deterministic candidate validation, not physical writer
  authentication, host/sub-agent liveness, or proof that an Agent obeyed the prose. Same-binding physical-writer
  behavior remains observation-gated (including the separate BUG-170 concern); richer late content without
  direct drift remains supplementary/semantic work, not automatic replacement authority.

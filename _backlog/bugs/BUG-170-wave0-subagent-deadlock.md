---
bug_id: BUG-170
title: dpt-source-intake sub-agent deadlock — stalls at work_started/fetch_batch_started without producing result.json
severity: P1
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-162: dpt-source-intake sub-agent deadlock

## What happened

3 dpt-source-intake sub-agents were spawned in parallel via the Agent tool. After ~5 minutes:
- **#1 (SDD)**: Produced 4 receipt lines (stuck at `fetch_batch_started`), no result.json. Later completed after SendMessage push.
- **#2 (methodologies)**: Produced 1 receipt line (`work_started`), no result.json. Later completed after SendMessage push.
- **#3 (community)**: Produced 10 receipt lines (reached `cache_write_started`), source.yaml had 100 lines, but no result.json. The sub-agent said "Still in progress: Writing cache leaf files."

All 3 sub-agents failed to self-complete within their 600s deadline. Each required Phase Agent intervention — either direct result.json writing or SendMessage pushes.

## Root cause hypothesis

The sub-agent task.md is ~80 lines of dense contract language. The dpt-source-intake role requires reading 5+ separate guidance files (role guidance, page-fetch guidance, seed topic, beacon, manifest, result schema). The sub-agent spends most of its context budget on reading framework docs rather than doing actual search/fetch/write work. When it finally gets to the work, the context window is already saturated.

Additionally, sub-agents spawn as background tasks with no polling mechanism for the Phase Agent to detect completion. The Phase Agent must manually inspect filesystem state.

## Impact

This is the **single biggest Wave0 blocker**. In this run:
- 3 initial sub-agents: 2 completely stalled, 1 partially worked
- 2 subsequent sub-agents (#4, #5): similarly slow, #5 eventually completed but after Phase Agent already submitted
- Phase Agent had to manually write source.yaml, result.json, cache, and run dry-submit+submit for 4 of 5 topics
- Total time wasted on sub-agent deadlock: ~15-20 minutes of waiting + manual repair

## Expected behavior

Option A: Reduce sub-agent task.md complexity. The task should be ~20 lines: "Read seed_topics/{slug}.md. Search for these terms: [...]. Fetch these URLs. Write source.yaml with url/title/retrieved_date/topic_tag/notes. Write cache files. Write result.json. Run dry-submit."

Option B: Phase Agent executes delegated work directly (not via sub-agent spawn) but through the work-unit envelope.

**Why:** The current contract-first task design is architecturally correct but operationally broken for real sub-agent execution. The sub-agent drowns in contract language before reaching actual work.

**How to apply:** Create a "fast path" task.md variant that front-loads the actionable instructions and defers contract reference to a separate "reference" section at the bottom.

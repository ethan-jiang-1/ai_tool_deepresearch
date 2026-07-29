---
bug_id: BUG-184
title: Seed projection return_map requires entries for ALL source.yaml candidates — partial projection blocks gate
severity: P2
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29 data repair)
surfaced_at: 2026-07-29
---

# BUG-184: Return map requires all source entries

## What happened

Each seed topic's wave0_evidence projection must have an entry for EVERY source.yaml candidate (e.g., `wu-w0-b000-src-i0001/1` through `/10` for 10 sources). The Phase Agent wrote 3 entries per topic (covering the most important sources). The gate rejected this as `return_map_current_candidate_omission` — every single position must have either an evidence entry or a deferred disposition.

For 5 topics × 10 sources each = 50 projection entries required. Writing 3 entries per topic was insufficient.

## Impact

This is the last remaining gate failure. All 5 topics need projection entries for candidates 4-10 (or explicit deferred dispositions).

## Expected behavior

The gate should suggest the missing candidate IDs in a batch-repairable format. Currently each missing entry generates a separate hint, producing dozens of hints that are hard to action programmatically.

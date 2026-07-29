---
bug_id: BUG-180
title: Submitted work units have no legal repair path — fail/timeout/replace/recover all rejected
severity: P1
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29 data repair)
surfaced_at: 2026-07-29
---

# BUG-180: No legal repair for submitted work units

## What happened

When work units #4 and #5 had hash mismatches (Phase Agent submitted, then sub-agent overwrote result.json), every legal repair path was blocked:
- `operate-work-unit fail`: rejected ("status: submitted")
- `operate-work-unit timeout --force`: rejected ("status: submitted")  
- `operate-work-unit replace`: rejected (not terminal)
- `operate-work-unit recover-declaration`: failed ("hash mismatch")

The only option was nuclear: delete work units from ledger, index, and filesystem; reactivate queue items via manual rb_queue.json editing; re-claim and re-submit. This required editing 4 Engine-owned files.

## Impact

A single hash mismatch (caused by sub-agent/Phase Agent result collision, BUG-174) became an unrecoverable state that required bypassing every Engine integrity boundary.

## Expected behavior

`operate-work-unit replace` should accept submitted work units when the Phase Agent declares "result content mismatch — replacing with corrected result." The hash mismatch is proof that the submitted result is no longer valid.

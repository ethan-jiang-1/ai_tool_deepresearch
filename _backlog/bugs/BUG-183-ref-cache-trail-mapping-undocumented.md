---
bug_id: BUG-183
title: Reference output_files require corresponding cache_trail directories — mapping contract undocumented
severity: P2
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29 data repair)
surfaced_at: 2026-07-29
---

# BUG-183: Reference cache trail mapping undocumented

## What happened

When reference file outputs were added to work unit result.json output_files, the gate required each reference to be "mapped to a valid submitted cache trail." The cache trail must:
1. Be a directory (not a file)
2. Contain websearch.json + page.md + meta.json
3. Be declared in the work unit's result.json cache_trails array

None of these requirements were documented in the task.md or shared-reference-template.md. The mapping contract (which reference maps to which cache trail) is implicit.

## Impact

6 gate failures for `cache_coverage` across 2 work units. Each required: create cache dirs with 3 files each → update result.json cache_trails → recompute result_hash and ledger_record_hash → sync index.

## Expected behavior

The task.md result JSON starter should include a comment: "Each reference in output_files requires a corresponding cache_trail directory with websearch.json, page.md, and meta.json."

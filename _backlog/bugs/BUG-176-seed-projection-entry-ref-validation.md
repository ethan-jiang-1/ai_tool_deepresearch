---
bug_id: BUG-176
title: Seed projection entry refs must point to existing files — no forward reference or lazy resolution
severity: P2
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-168: Seed projection entry ref validation requires exact existing file paths

## What happened

`operate-topic-state.mjs apply` with `apply_seed_projection` rejected all 5 projection packets with:

```
verdict: blocked
reason_code: projection_entry_ref_missing
```

The projection entries reference shared reference files in their `refs` field:
```json
"refs": ["reference/00-shared-cross-methodology-01.md"]
```

The apply validation checks that every referenced file **already exists** at the exact path. Since the reference files were created with slightly wrong names (`-1.md` not `-01.md`), all projections blocked.

## Impact

This creates a chicken-and-egg problem:
1. Projection entries must reference existing reference files
2. Reference files must be collectively validated by inspect (which checks projection completeness)
3. If reference file naming is off by one character, BOTH projection AND reference validation fail

In this run, the seq numbering issue (1 vs 01) cascaded into: projection_entry_ref_missing → no projection entries → seed_projection_token not replaced → inspect fails on BACKFILL tokens.

## Expected behavior

Option A: Projection apply should validate ref paths and give a clear error like "ref 'reference/00-shared-cross-methodology-01.md' not found. Existing files: 00-shared-cross-methodology-1.md, ..." — surface the near-match.

Option B: Allow projection entries with forward references (refs that will be created before gate check). The inspect already cross-validates projections against references; the apply step doesn't need to also enforce file existence.

**Why:** The apply step is the writer, not the validator. Enforcing file existence at write time couples two independently validated concerns and creates cascading failures from trivial naming issues.

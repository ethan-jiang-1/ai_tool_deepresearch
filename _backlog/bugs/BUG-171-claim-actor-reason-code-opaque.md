---
bug_id: BUG-171
title: operate-work-unit claim actor reason_code enum opaque — same class as BUG-153
severity: P1
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-163: operate-work-unit claim reason_code opaque

## What happened

`operate-work-unit.mjs claim` requires `--actor-reason` to be an exact enum value matching the legal tuple for the given `--actor-outcome` + `--actor-source` combination. Passing `"search and fetch confirmed working"` produced:

```
input_issues: [{"field": "reason_code", "supplied_value": "search and fetch confirmed working",
  "message": "Invalid enum value. Expected 'probe_succeeded' | 'probe_access_denied' | ..."}]
```

Unlike BUG-153 (which just says "Invalid input"), this error DOES list allowed values — but only in the deeply nested `input_issues` array. The top-level response is `ok: false` with exit code 1, making the Agent scrape the full JSON output to find the actual error.

## Impact

Same pattern as BUG-153 but in the work-unit claim path. Cost 2 extra turns: first claim attempt → opaque error → read full output → discover legal tuples → second claim attempt with correct enum.

## Expected behavior

Same fix as BUG-153: surface validation errors at the top level of the response. For claim specifically, print the legal_tuples table in the `recommended_action` prose.

**Why:** The claim command is the gateway to all delegated work. Making it hard to invoke correctly blocks the entire Wave0 pipeline.

**How to apply:** Add a top-level `validation_errors[]` field, or at minimum include the expected reason_code values in the `recommended_action` string.

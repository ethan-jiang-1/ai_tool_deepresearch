---
bug_id: BUG-208
title: Wave2 finding-index currentness requirements (`W2F-[0-9]{3,}` id + `created_in_rerun_count`) are not surfaced by feedback
severity: P3
phase: wave2
status: open
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-07)
surfaced_at: 2026-08-07
---

# BUG-208: Wave2 finding "currentness" contract is under-documented

## Observation

Applying a `wave2_judgment` seed projection failed with opaque
`wave2_finding_not_current` until the finding index entries had:

1. `id` matching `/^W2F-[0-9]{3,}$/` (i.e. `W2F-001`, not `W2F-01`); and
2. a `created_in_rerun_count` field equal to the current `rerun_count` (0).

Neither requirement is documented in `phase-wave2.md` §3.2.1 (which says only
"creating new findings SHALL write `created_in_rerun_count` from profile
current value" as an afterthought) nor in the `operate-topic-state` playbook.
The apply error is a bare `wave2_finding_not_current` with no coordinate or
hint about which field is missing.

## Why it matters

- First-time Wave2 authors will guess the `W2F-xx` id format and omit
  `created_in_rerun_count`, then see an opaque rejection.
- The `shared-schemas.md` finding-index contract lists 15 required fields but
  does not list `created_in_rerun_count` among them.

## Suggested direction

- Document the two currentness requirements in the finding-index contract
  (`shared-schemas.md`) and the phase node.
- Have the apply error name the missing/mismatched fact (id format vs
  `created_in_rerun_count` vs current round).

## Verification

Create a finding-index with `id: W2F-01` (2-digit) or without
`created_in_rerun_count`, then apply a wave2_judgment packet → opaque
`wave2_finding_not_current`.

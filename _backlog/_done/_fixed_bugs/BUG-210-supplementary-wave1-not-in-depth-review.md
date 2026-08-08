---
bug_id: BUG-210
title: Wave1 supplementary work units are not auto-included in depth-review, and the floor-deficit feedback does not point there
severity: P2
phase: wave1
status: fixed
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-07)
surfaced_at: 2026-08-07
---

# BUG-210: supplementary Wave1 deepening must be hand-added to `reviewed_work_unit_refs`

## Observation

After a `wave1_topic_deepening` supplementary work unit
(`wu-w1-b000-deep-i0006`) was formally submitted to close a reference-floor
deficit for topic 03, `inspect-wave1-output.mjs` continued to report
`per_topic_ref_md_count_floor` "Current canonical reference floor is 4/8;
deficit 4" and did not list the new candidates as materializable.

Root cause: `resolveReviewedWave1SubmittedBacking` (in
`wave1-reference-convergence.mjs`) only reads work units named in
`artifacts/wave1/<topic>/depth-review.yaml#reviewed_work_unit_refs`. The
supplementary submission's `source_claims` are ignored until the Phase Agent
manually appends `_work_units/wave1/wu-w1-b000-deep-i0006` to that list. The
floor-deficit message and the `wave1_topic_deepening` §3.4 guidance do not
state that the depth-review must be updated to include the supplementary
work-unit ref.

## Why it matters

- The legal path for closing a reference-floor deficit (enqueue supplementary →
  submit → materialize) silently depends on an undocumented depth-review edit.
- Without that edit, the inspect loops at the same deficit and the supplementary
  evidence appears to have no effect.
- `reviewed_work_unit_refs` is Phase-owned process evidence, so an
  auto-inclusion rule would have to respect its authoring intent — but the
  absence of any pointer in the feedback is the defect.

## Suggested direction

- Have the `reference_floor_deficit` / `per_topic_ref_md_count_floor` feedback
  name the depth-review `reviewed_work_unit_refs` update as the first action,
  or auto-derive reviewed refs from all submitted rows for the topic.

## Verification

Submit a supplementary `wave1_topic_deepening` for a topic whose depth-review
does not list it, then run `inspect-wave1-output.mjs` → floor stays at the old
deficit and no new candidates surface until the depth-review is hand-edited.

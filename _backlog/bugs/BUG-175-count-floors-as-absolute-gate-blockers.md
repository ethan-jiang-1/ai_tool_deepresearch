---
bug_id: BUG-175
title: exploratory_map count-floor calibration remains a product-policy decision
severity: P2
phase: wave0
status: policy_residual
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
revised: 2026-08-01
---

# BUG-175: exploratory_map count-floor calibration

## Current technical finding (2026-08-01)

The implementation claim in the original report is no longer correct: count
floors are not absolute Wave0 Gate blockers.

Both `shared_ref_count_floor` and `per_topic_count_floor` are marked
`degradation_eligible` in the Wave0 Gate definition. After the fatigue
threshold (currently three attempts), when those are the only unresolved
rules, the Gate emits a legal degraded handoff with `degraded_rules` rather
than a clean pass. The Gate remains fail-closed when any queue, provenance,
structural, trace, or other ineligible blocker remains.

The focused integration coverage exercises both boundaries: a shared-reference
count-floor-only case produces the degraded handoff, while a case with an
unsubmitted work unit still fails. The original "no degradation path" claim is
therefore closed as an implementation diagnosis.

## Policy residual

`exploratory_map` still calibrates Wave0 at 10 source entries per topic plus
`4 + 1 * topic_count` shared references. For five topics, that is 50 per-topic
entries plus 9 shared references. Whether those default quality floors should
be lower remains a product-policy question, not a pending Engine defect.

Any threshold change requires a policy-only OpenSpec change supported by new,
qualifying real-bundle evidence. Fabricated sources, synthetic source entries,
and invented cross-topic references remain prohibited; degraded handoff is not
permission to create them.

## Historical incident (2026-07-29)

`exploratory_map` profile sets:
- `wave0_per_topic_source_floor: 10` (10 source entries per topic)
- `wave0_shared_ref_total: 4 + 1 * topic_count` (9 shared reference files for 5 topics)

The CCDS4 report described these as hard requirements and recorded that meeting
them required:

1. Creating 9 shared reference files from scratch (mechanical busywork)
2. Padding source.yaml files from 5-8 entries to exactly 10 (adding entries for sources that weren't actually fetched)

The historical report likely conflated `inspect-wave0-output.mjs` diagnostics,
additional ineligible blockers, or both with the formal Gate verdict. The
degradation-policy implementation predates the report (commit `6e47de3ea`,
2026-07-24), but the original runtime bundle and trace are unavailable, so the
exact historical path cannot be reconstructed.

## Historical impact report

The report estimated that ~40% of Wave0 execution time was spent meeting count
floors rather than doing actual evidence collection. It said the Phase Agent
had to:
- Write 9 shared reference files with fabricated cross-topic relevance
- Add 15+ synthetic source entries to underfilled topics

This remains useful evidence for a future calibration decision, but not proof
of current Gate behavior.

## Policy question

The former Option A, wiring a degraded pass for eligible count-floor gaps, is
already implemented. A lower default floor remains possible only through the
evidence-backed policy route above.

The completed framework-contract remediation plan leaves the accepted
`exploratory_map` count-floor policy unchanged. There is no new qualifying
research-bundle evidence or user decision authorizing lower defaults.

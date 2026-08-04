---
bug_id: BUG-202
status: open
discovered: 2026-08-05
phase: wave1
severity: P1_gate_blocker
---

# Depth-Review Gate Requires Submitted WU for All Topics — Failed Topics Create Deadlock

## Symptom

`per_topic_depth_review_contract` fails with "reviewed_work_unit_refs[] must name submitted
work-unit rows" for topics 02 and 03 which have no submitted Wave1 work units. The gate
requires depth-review.yaml for ALL registry topics, but the depth-review schema requires
valid submitted work-unit references.

## Deadlock

1. Gate requires depth-review.yaml for every topic in topic_registry
2. depth-review.yaml requires `reviewed_work_unit_refs[]` containing submitted WU IDs
3. Topics whose Wave1 submission failed have no valid submitted WU IDs
4. Empty array is rejected; non-submitted WU IDs are rejected
5. No degraded pass option available

## Observed In

- Topic 02 (02_developer-role-coder-to-orchestrator): wu-w1-b000-deep-i0002 failed (structural validation)
- Topic 03 (03_agentic-productivity-metrics): wu-w1-b000-deep-i0008 failed (section parser + degraded capture)

## Workaround Attempted

Tried to re-enqueue and resubmit 02,03 as retry tasks, but queue fail mechanics
created repair items that blocked subsequent claims (see BUG-203-queue-fail-creates-repair-cascade.md).

## Related

- BUG-200-supplementary-work-unit-contribution-ownership.md (Wave0 similar pattern)
- BUG-201-wave1-question-list-section-parser.md (contributed to 03 failure)

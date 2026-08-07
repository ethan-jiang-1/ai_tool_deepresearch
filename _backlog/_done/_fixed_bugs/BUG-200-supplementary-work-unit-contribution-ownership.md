---
bug_id: BUG-200
status: closed; current-head covered without a new change 2026-08-07
discovered: 2026-08-05
phase: wave0
severity: P1_gate_blocker
---

# Supplementary Work-Unit Contribution Ownership Not Recognized by Projection Writer

## Closure (2026-08-07)

Current projection writer behavior and its regression already recognize the
submitted contribution interval for supplementary work units. The historical
projection rejection is therefore closed as current-head covered; no new
product change was required. The final disposition is recorded in the
[closed remediation ledger](../_closed_plans/gate-schema-progressive-gate-schema-queue-remediation.md).

## Symptoms

Supplementary work units (`wave0-supp-*` queue items) successfully submit valid
sources that are appended to `source.yaml` and pass the `per_topic_count_floor`
gate check. However, `operate-topic-state apply` with `apply_seed_projection`
rejects their ordinals with:
```
projection_source_identity_not_current: <supp_wuid>/<N> is not a retained
contribution-owned Wave0 source identity
```

Meanwhile, the Wave0 gate (`return_map_current_candidate_omission`) insists on
Return Map entries for exactly those rejected ordinals.

## Reproduction

1. Submit primary source intake via `wave0-source-*` queue item → WU owns ordinals 1-K
2. Submit supplementary source intake via `wave0-supp-*` queue item → appends ordinals K+1 to N
3. `per_topic_count_floor` passes (total sources >= threshold)
4. Create `apply_seed_projection` packet with entries for ordinals 1-N
5. Primary WU entries (1-K) committed; supplementary WU entries (K+1 to N) blocked
6. Gate fails with `return_map_current_candidate_omission` for supplementary ordinals

## Observed in

- Topic 04 (`04_platform-team-ai-native-responsibilities`): wu-w0-b000-src-i0012 (1-8) + wu-w0-b000-src-i0013 (9-10)
- Topic 05 (`05_ai-native-engineer-hiring`): wu-w0-b000-src-i0009 (1-4) + wu-w0-b000-src-i0014 (5-10)
- Topic 07 (`07_patrick-debois-agent-enablement-patterns`): wu-w0-b000-src-i0011 (1-9) + wu-w0-b000-src-i0015 (10)

## Hypothesis

The contribution ownership tracking in `operate-topic-state apply` only
recognizes work units whose `queue_item_id` matches a known pattern (e.g.,
`wave0-source-*`) and does not extend to supplementary/replacement queue items
(`wave0-supp-*`, `replacement-wu-*`).

## Workaround

Use only primary work unit ordinals in seed projections. Accept that
supplementary sources are counted for `per_topic_count_floor` but not
individually tracked in Return Map entries. Gate may need degraded pass for
topics with supplementary-only ordinals.

## Related

- BUG-175-count-floors-as-absolute-gate-blockers.md (count floor absolute vs degraded)

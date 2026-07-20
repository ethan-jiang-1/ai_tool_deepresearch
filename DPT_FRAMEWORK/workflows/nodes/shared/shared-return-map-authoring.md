---
node_type: shared
id: shared-return-map-authoring
shared_scope: return-map-authoring
authority: guidance-only
execution_contract:
  surface: shared-guidance
  search_policy: no_search
requires: []
suggested_context: []
---

# Shared: Return-Map Authoring

## Purpose And Authority

Return maps are Agent-readable navigation projections, not evidence authority. Submitted work-unit/finding facts remain the authority for coverage and the existing Wave inspect remains the only deterministic verdict. When an inspect names a seed section/entry, repair that coordinate and rerun the same inspect; do not reconstruct validator logic or ask the user to perform ordinary mechanical repair.

## Wave-To-Section Ownership

| Producer | Seed section | Direct authority |
| --- | --- | --- |
| Wave0 source intake | `## 本轮新增证据` | current-round submitted Wave0 outputs |
| Wave1 extraction | `## 本轮新增机制理解`, `## 本轮新增趋势与难点`, `## 待验证问题` | current-round submitted Wave1 outputs |
| Wave2 synthesis | `## 当前判断`, `## 待验证问题` | current-round finding/ledger/index facts |

One-time tokens are expected before their owning first materialization and absent after replacement. Token absence in a completed section is normal terminal state, not evidence that backfill was skipped. Do not rename headings or re-inject consumed tokens.

## Canonical Return-Map Entry

Use this one complete generic definition for all Waves; phase guidance adds only its Wave-specific producer and source details.

```markdown
- evidence_meaning: <what the evidence changes for this seed>
  relationship: <supports|refutes|partial|opens|defers|context>
  refs:
    - reference/<concrete-existing-file>.md
    - artifacts/<supporting-lineage> # optional secondary provenance
  status: <supported|refuted|partial|open|emergent|deferred>
  next_hop: <concrete consumer navigation or explicit limitation>
```

`refs` are bundle-relative. Evidence-bearing entries lead with a concrete existing `reference/*.md` consumer-navigation file; `artifacts/`, `_cache/`, and `_work_units/` are secondary provenance only. If no consumer reference can be materialized, write an explicit limitation entry such as `relationship: defers`, `status: deferred`, `refs: none`, and a `next_hop` that names the limitation. Optional entry-local identity or Wave metadata MAY be added without changing these five fields.

## Authoring Boundaries

Generated work-unit task/spawn text stays self-contained and may repeat only the concise five-field cue plus this authority boundary: it must not reproduce this complete example, section table, token lifecycle, or ref hierarchy. Role guidance may point here or retain a shortest cue. No runtime code parses this Markdown.

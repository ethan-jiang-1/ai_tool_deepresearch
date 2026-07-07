# TODO: evidence-quality

> 状态: 待设计 | 优先级: 高 | 更新: 2026-07-07

## Why

Evidence extraction answers “what did we capture?” Evidence quality answers “should this captured material count?”

Counting every submitted reference is too weak. A reference can be declared, traceable, and still be too thin, promotional, weakly sourced, or irrelevant to support a claim. Low-quality evidence should be discarded from countable coverage; it should not be “repaired” into quality by prose.

## Current Direction

Use a layered model:

- Agent/sub-agent performs semantic quality assessment and writes structured quality fields.
- Engine validates the fields and applies deterministic countability rules.
- Gate/reentry consume countable coverage derived from submitted declarations, not ad hoc filesystem shape.

## Candidate Schema

```javascript
const EvidenceQuality = z.object({
  substance: z.enum(['substantive', 'thin', 'none']),
  source_tier: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']),
  commercial_intent: z.enum(['none', 'mild', 'strong', 'unknown']),
  independent_backing: z.number().int().min(0).default(0),
  retention_decision: z.enum(['retain', 'prune_partial', 'exclude_source']),
});
```

## Deterministic Rules

- `retention_decision: exclude_source` means the reference is not countable.
- `substance: thin|none` means the reference is not countable.
- strong commercial intent without independent backing cannot support P0/P1 claims.
- discarded material may lower countable coverage and trigger additional search work, but the discarded source itself is not repaired.

## Design Questions

- Should quality fields live in each reference file, in work-unit result JSON, or in a declaration-derived index?
- What minimum quality rules can Engine enforce without pretending to make semantic judgments?
- How should quality reports aggregate into final gate advice?

## Non-Goals

- Do not replace human or Agent semantic judgment.
- Do not build a full citation scoring system in one step.
- Do not count unsubmitted files.
- Do not preserve retired delegated transport as a quality-evidence path.

## Next Step

Explore/propose evidence-quality after evidence-extraction clarifies the declaration and countability surface.

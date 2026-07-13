# BUG-087: depth-review.yaml 的 `source_claim_cache_mapping` 要求 cache trail 在 submitted ledger 中

## 发现
2026-07-14, wave1 gate `depth_review_contract` 的 `source_claim_cache_mapping` 子规则要求每个 `source_claims[].cache_trail_refs[]` 指向的 cache trail 出现在 submitted work-unit ledger row 中。Phase Agent 手工创建的 cache trail 即使格式完全正确（websearch.json+page.md+meta.json），只要不在任何 submitted WU 的 cache_trails[] 数组里，就被拒绝。

## 严重程度
P1 — Phase Agent 无法手工创建满足 depth-review 要求的 cache trails。必须走完整 sub-agent claim→submit 流程。与 BUG-082/084 同类。

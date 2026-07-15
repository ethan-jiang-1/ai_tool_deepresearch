# BUG-089: `operate-work-unit submit` 拒绝 `source_ref` 不在本 WU `output_files` 中的 source_claim——阻止 supplementary WU

## 发现
2026-07-14, wave1 gate 修复中。为 06/07 提交包含额外 source_claims 的 supplementary WU（i0035/i0036），submit 被拒：

```
accepted source claim source_ref is not declared in output_files[]: artifacts/wave1/06_tw-recent-2026-ai-coding/evidence-summary.md
```

该 `evidence-summary.md` 已在之前的 WU（i0019）中提交。Supplementary WU 只需要声明额外的 cache trails 来满足 `source_claim_cache_mapping`，不需要重复声明已有文件。

## 根因
submit validator 要求每个 `source_claims[].source_ref` 指向本 WU 的 `output_files[]` 中的文件。这在首次提交时合理，但阻止了 supplementary/repair WU 引用已有 evidence 文件。

## 影响
- Phase Agent 无法通过 supplementary WU 修复 source_claim_cache_mapping
- 与 BUG-087 共同形成死锁：需要 supplementary WU → submit 拒绝 source_ref 不在 output_files → 无法满足 source_claim_cache_mapping
- 多 WU 协作的 provenance 模型被单 WU 假设阻断

## 严重程度
P1 — BUG-087 死锁的直接原因。阻止 Phase Agent 用 supplementary WU 修复 provenance 缺陷。

## 建议修复
submit validator 应允许 source_claim.source_ref 指向已在其他 submitted WU 中声明的文件。

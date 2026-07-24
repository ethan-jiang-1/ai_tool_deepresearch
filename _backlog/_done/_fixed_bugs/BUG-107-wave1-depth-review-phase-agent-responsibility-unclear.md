---
bug_id: BUG-107
title: "Wave1 depth-review.yaml creation responsibility is unclear — sub-agents don't create it, Phase Agent misses it"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave1
gate: wave1-complete
---

# BUG-107: Wave1 depth-review.yaml 创建责任不明确

## 现象

Wave1 5/5 sub-agents 成功完成并 submit（evidence-summary.md + question-list.md 全部产出），但 gate 报告所有 5 个 topic 的 `depth-review.yaml` 缺失。Phase Agent 没有在 sub-agent submit 后创建这些文件。

## 根因

Phase-wave1.md 的 contract 将 `depth-review.yaml` 定义为 Phase Agent 职责（"Phase Agent materializes rich reference files" 和 "Review submitted source/depth evidence into depth-review.yaml"），但 phase 的主要 instruction flow 聚焦在 sub-agent claim→spawn→submit loop 上。Phase Agent 的 post-submit 职责在 instruction 中没有明确的 trigger/checklist。

## 实际影响

- Wave1 gate 对 5 个 topic 分别报 `per_topic_depth_review_contract` 缺失
- 每个 topic 有 7 个 masked sub-rules（source_claim_cache_mapping, source_novelty_floor 等），共 35 个 masked failures
- Phase Agent 在 sub-agent submit 后自然认为 "work done"——没有显式的 post-submit checklist

## 建议方向

- 在 phase-wave1.md 的 drain loop 末尾增加 explicit post-drain checklist
- 或：让 depth-review.yaml 由 sub-agent 产出（作为第三个 required_receipt）
- 或：在 gate fail 的 hints 中明确标注 "这是 Phase Agent 职责，非 sub-agent 职责"

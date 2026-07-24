---
bug_id: BUG-109
title: "Wave1 gate has excessive rule coupling — 35+ masked sub-rules make repair analysis overwhelming"
severity: P3
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave1
gate: wave1-complete
---

# BUG-109: Wave1 gate 规则过度耦合

## 现象

Wave1 gate attempt 1 报告 11 个 failed_rule_ids + 35 个 masked_rule_ids。许多 masked rule 是上层 failure 的 cascade：`per_topic_depth_review_contract` 缺失一个 depth-review.yaml 会导致 7 个 sub-rules 被 mask。5 个 topic × 7 sub-rules = 35 个 masked failures，但它们都源于同一个 root cause（Phase Agent 未创建 depth-review.yaml）。

## 根因

Gate 的 rule hierarchy 将 depth-review.yaml 的存在性检查和内容质量检查做成了 independent rules，但内容检查（source_claim_cache_mapping, source_novelty_floor 等）依赖于文件存在。当文件不存在时，这些 sub-rules 被 mask 而非直接报 "file missing"，导致 agent 看到 35+ 个错误而无法快速定位 root cause。

## 实际影响

- Agent 面对巨大的 hint 列表难以识别真正的 root cause
- 修复一个 root cause（创建 depth-review.yaml）会 unmask 35 个 sub-rules，其中可能还有 real failures
- 增加了 gate 的 repair→rerun 循环次数

## 建议方向

- 当 depth-review.yaml 缺失时，将内容质量 sub-rules 标记为 `blocked_by: file_missing` 而非 `masked`
- 在 hints 中 group by root cause：先显示 "X files missing" 作为一个 hint，再显示内容问题作为 dependent hints
- 考虑将 file existence check 提升为 gate preflight——在进入 content quality rules 之前先确认所有 required files 存在

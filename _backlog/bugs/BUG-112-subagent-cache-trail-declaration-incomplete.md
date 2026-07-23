---
bug_id: BUG-112
title: "Sub-agent cache_trails declaration incomplete — submit rejected even though cache files exist on disk"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave1
---

# BUG-112: Sub-agent cache_trails 声明不完整

## 现象

4/5 wave1 sub-agents 的 `operate-work-unit.mjs submit` 被拒绝。Rejection reason: `accepted source claim cache/degraded ref is not declared in cache_trails[]`. 但实际的 cache leaf 文件（websearch.json, page.md, meta.json）存在于磁盘上——sub-agent 确实写了它们，只是在 result.json 的 `cache_trails[]` 中没有完整列出。

只有 topic 05 (wu-w1-b000-deep-i0005) 成功 submit——它的 cache_trails 声明是完整的。

## 根因

Sub-agent（dpt-evidence-extractor）负责在 result.json 中声明 `cache_trails[]`。The sub-agent 写了 cache 文件但没有总是完整地更新 result.json 中的 cache_trails 条目。Submit-time validation 检查的是 result.json 中的声明和实际文件的对应关系——如果声明不完整，submit 被拒绝，状态保持 `claimed`。

## 实际影响

- 4/5 wave1 work units 处于 `claimed` 状态，无法被 re-submit（已提交的 result hash 可能已过期）
- Gate 报 `wave1_work_unit_submission_presence` + `wave1_delegated_bypass_suspected`
- 即使 sub-agent 的研究工作和文件写入质量很高，gate 也无法通过

## 建议方向

- Dry-submit 阶段应检查 cache_trails 声明完整性（而非等到正式 submit）
- 或：sub-agent 的 result 写入流程中增加 cache_trails 自动校验
- 或：submit 时允许 Engine 扫描已存在的 cache 文件来补全声明（"lazy trail discovery"）

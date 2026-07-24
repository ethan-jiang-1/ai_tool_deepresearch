---
bug_id: BUG-112
title: "Wave1 direct flow bypasses existing dry-submit before formal submit"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave1
---

# BUG-112: Wave1 没有把现有 dry-submit 交付到 returned-work path

## 现象

4/5 Wave1 work units 的 formal `operate-work-unit.mjs submit` 被拒绝。一个 root 是 `accepted source claim cache/degraded ref is not declared in cache_trails[]`：cache leaf files 存在，但 result.json declaration 不完整。

只有 topic 05 (wu-w1-b000-deep-i0005) 成功 submit——它的 cache_trails 声明是完整的。

## 根因

Dry-submit validator 已能在 formal submit 前诊断 cache/receipt/output roots。缺口不是 validator 不存在，而是 Wave1 returned-work main path 直接调用 formal submit，未把 `dry-submit -> repair or fail-and-replace -> formal submit` 作为 Phase Agent 的直接 loop。filesystem presence 仍不能制造 declaration 或 provenance。

## 实际影响

- 4/5 Wave1 work units 处于 `claimed` 状态，formal submit 未形成 submitted coverage。
- Gate 报 `wave1_work_unit_submission_presence` + `wave1_delegated_bypass_suspected`
- 即使 sub-agent 的研究工作和文件写入质量很高，gate 也无法通过

## 建议方向

- 在 returned-work path 中先运行 existing dry-submit，并把 structured root 返回给 Agent。
- 只允许 accepted mechanical declaration repair 在同一 `work_id` rerun dry-submit；semantic post-`work_done` root 走 fail-and-replace。
- 不用 cache scan 自动补 declaration，也不手写 ledger/result/receipt authority。

---
bug_id: BUG-108
title: "Seed topic backfill token replacement has no clear owner — stale __BACKFILL_WAVE*__ tokens persist after sub-agent submit"
severity: P3
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave1
gate: wave1-complete
---

# BUG-108: Seed topic backfill tokens 无明确 owner

## 现象

Seed topic 文件包含 `__BACKFILL_WAVE0_EVIDENCE__`、`__BACKFILL_WAVE1_MECHANISMS__`、`__BACKFILL_WAVE1_TRENDS__`、`__BACKFILL_WAVE2_JUDGMENT__` 等占位 token。Wave0 和 wave1 sub-agent 完成后，这些 token 仍然 stale。Gate 的 `no_stale_mechanisms_token` / `no_stale_trends_token` / `no_stale_pending_questions_token` 规则检测到并报 failure。

## 根因

Shared-seed-topic-authoring.md 定义了这些 token 作为 "后续 Wave 必须替换" 的占位符，但没有任何 phase instruction 明确指定 **谁** 在 **什么时候** 替换它们。Sub-agent 只负责写 `artifacts/waveN/` 下的产出，不负责编辑 `seed_topics/`。Phase Agent 的 instruction 提到 backfill 但未列为 required action。

## 实际影响

- Wave1 gate 对 5 个 topic 报 `no_stale_mechanisms_token` + `no_stale_trends_token` + `no_stale_pending_questions_token`
- Phase Agent 用 sed 做 mechanical replacement（"see artifacts/wave1/... for findings"），但这只是绕过 gate，不是真正的 content backfill
- Wave2 的 `__BACKFILL_WAVE2_JUDGMENT__` token 同理会引发同样问题

## 建议方向

- 在 sub-agent task card 的 `writes_to` 中包含 seed topic 文件的 backfill section
- 或：让 gate 区分 "agent-backed placeholder" 和 "stale token"——如果对应的 wave 已 submit，placeholder 自动 pass
- 或：完全去掉 token 机制，改为 gate 直接检查对应的 artifacts/waveN/ 产出是否存在

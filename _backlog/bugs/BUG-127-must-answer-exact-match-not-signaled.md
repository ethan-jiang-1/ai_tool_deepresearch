---
bug_id: BUG-127
title: "must_answer exact-match contract not signaled in seed topic task brief or authoring template"
severity: P3
discovered: 2026-07-26
bundle: dpt_rb_openspec-influence-landscape
phase: seed-topics
node: phases/phase-seed-topics.md
---

# BUG-127: Seed topic 的 `must_answer` 要求与 canonical registry 精确匹配，但 task brief 和 authoring contract 未明确告知

## 现象

Phase Agent 在 seed-topics phase 为 topic 01 写 seed file 时，将 `must_answer` 从 canonical registry 的完整文本：

> "What is OpenSpec's core design, architecture, and SDD workflow? How does the Propose→Apply→Archive state machine, dual-directory model, 50KB context limit, and tool-agnostic design actually work?"

缩短为：

> "What is OpenSpec core design, architecture, and SDD workflow"

意图是「语义相同，表述更简洁」。但 `operate-queue.mjs complete` 的 receipt check 报告：

```
frontmatter must_answer must equal canonical Topic must_answer.
```

这是**字符串级别的精确匹配**——包括 Unicode 箭头（→）、所有空格、所有单词。`must_answer` 不是人类审查的语义字段，而是 Engine enforce 的 canonical identity field。

## 重现线索

1. 从 `rb_plan.md` topic_registry 读取 `must_answer` 原文
2. 写 seed file 时改写/缩短 `must_answer` 文本
3. `operate-queue.mjs complete` → "must_answer must equal canonical Topic must_answer"
4. 必须恢复 canonical 原文的精确字节序列

## 根因假设

**主因**：`must_answer` 承载了双重职责——它既是人类阅读的研究问题，也是 Engine 的 canonical identity 校验字段。但 phase instruction（`phase-seed-topics.md`）和 authoring contract（`shared-seed-topic-authoring.md`）都没有明确告知 Agent："这个字段必须**逐字节**与 canonical registry 一致，你不能改写、缩短、或重新措辞。"

**副因**：task card 的 `done_condition` 写的是 "YAML frontmatter 含 id/slug/title（均非空）"，没有提到 `must_answer` 的精确匹配要求。Agent 在自检时只检查了 `done_condition` 中列出的字段。

**第三因**：Unicode 字符（如 → U+2192）在 YAML 中是合法的，但 Agent 可能在复制粘贴或手写时将其替换为 "to" 或其他 ASCII 表示。这种行为不会被任何中间步骤捕获——只有 final complete 的 receipt check 会检测到不匹配。

## 框架层面的问题

1. `must_answer` 的 canonical identity 角色和 human-readable 角色没有在文档中分离——Agent 自然认为可以对 human-readable 文本做改写
2. `done_condition` 的字段列表不完整——遗漏了 Engine 实际校验的 `must_answer` 精确匹配
3. 没有 pre-complete 的 `must_answer` 比对工具——Agent 无法在 complete 之前自检 seed file 的 `must_answer` 是否与 registry 一致

## 建议方向

- **短期**：在 `shared-seed-topic-authoring.md` 的 frontmatter 部分增加显式警告："> `must_answer` SHALL be byte-for-byte identical to the canonical `topic_registry` entry. Do not rephrase, shorten, or expand. Copy the exact text including Unicode characters."
- **短期**：task card 的 `done_condition` 加上 `"must_answer matches canonical registry"`
- **短期**：提供 `validate-seed-must-answer.mjs --bundle <path> --topic <slug>` 让 Agent 在 complete 前做精确比对
- **中期**：考虑把 `must_answer` 从 seed file frontmatter 中移除（它已经是 topic_registry 的冗余副本），Engine 直接从 registry 读取，不再要求 seed file 携带副本

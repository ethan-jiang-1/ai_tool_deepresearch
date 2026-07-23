---
bug_id: BUG-102
title: "Seed topic YAML validation occurs at gate time, not authoring/enrichment time"
severity: P3
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: seed-topics
gate: seed-topics-ready
---

# BUG-102: Seed topic YAML 校验发生在 gate 时而非 authoring 时

## 现象

Agent 在 seed-topics phase enrichment 中，为 `04_openspec-adjacent-lightweight-alternatives.md` 的 frontmatter 写了：

```yaml
forbidden_broadening:
  - "Spec Kit vs OpenSpec" (different model)
```

引号外的 `(different model)` 在 YAML 中是 illegal token。但 enrichment 阶段没有任何校验反馈。直到 `check-gate-seed-topics-ready.mjs` 解析 YAML frontmatter 时才抛出：

```
YAMLParseError: Unexpected scalar at node end at line 25, column 30
```

Gate 是整个 phase 的最后一步——agent 已经完成了文件写入、queue drain 等所有操作，此时才发现一个 syntax error 导致 gate 失败。

## 根因

- YAML frontmatter 校验只在 gate 的 schema validation 中执行
- seed topic authoring (agent 手动 Edit/Write) 没有实时的 lint/validate feedback
- `operate-queue.mjs complete` 的 receipt check 只检查文件存在性，不检查 YAML 合法性

## 实际影响

- 拉长了 feedback loop：语法错误 → gate fail → 读 inspect → 找到错误行 → Edit fix → rerun gate
- 如果多个文件都有 YAML 问题，需要多轮 gate fail/fix/rerun

## 建议方向

- `operate-queue.mjs complete` 的 receipt check 中增加 YAML frontmatter 解析校验
- 或者在 seed-topics phase 中增加一个轻量的 `validate-seed-yaml.mjs`，enrichment 后立即跑
- 长期：agent 用结构化 API（而非 raw Edit）写 frontmatter，消除手工 YAML 错误的可能

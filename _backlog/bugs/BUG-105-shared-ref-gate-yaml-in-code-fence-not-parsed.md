---
bug_id: BUG-105
title: "Shared reference gate cannot parse YAML inside Markdown code fences — format mismatch between agent output and gate parser"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave0
gate: wave0-complete
---

# BUG-105: Shared reference gate 无法解析 Markdown code fence 中的 YAML

## 现象

Wave0 gate 要求 `reference/00-shared-*.md` 中包含至少 `wave0_shared_ref_total`（本 run=9）个 countable references。Agent 创建了 3 个 shared reference 文件，每个包含 4 个 source references（共 12 个），以 YAML code block 嵌入 Markdown：

```markdown
# Shared Reference: ...

```yaml
- url: https://...
  title: ...
  retrieved_date: ...
  notes: ...
```
```

Gate 报告 `0 countable references (threshold: 9)`，所有 3 个文件标记为 `filesystem_only_not_backed: projection_backing_drift: lacks source_url metadata`。

## 根因

Gate parser 期望 shared reference 文件中的 YAML 在文件顶层（raw YAML array），而不是嵌套在 Markdown code fence 中。Agent 自然地将 reference 文件写为 Markdown prose + YAML code block，因为这是"人类可读文档"的自然格式。但 gate 的 parser 只识别顶层 YAML 结构中的 `url` 字段。

这是 **Agent 产出格式 vs. Engine 解析格式的 mismatch**——不是 Agent 写错了内容，而是内容放在了 Engine 看不到的地方。

## 实际影响

- Gate 在 shared_ref_count_floor 上连续失败 3 次
- 第 3 次触发 fatigue degradation，gate 以 degraded 状态 pass（`degraded_reason: fatigue_threshold_reached_with_only_degradation_eligible_quality_rules`）
- 12 个有效的 shared references 未被计数，wave0 的 shared reference 覆盖被低估

## 建议方向

- Gate parser 应能解析 Markdown 文件中的 YAML code blocks（扫描 ````yaml`  fence）
- 或：在 shared reference authoring contract 中明确规定格式要求（"raw YAML at file top level, no markdown wrapping"）
- 或：提供 `00-shared-template.yaml` 作为格式参考

# BUG-085: Wave1 gate `reference_format` 和 `reference_index_coverage` 拒绝 `related_topic_uid` 格式

## 发现时间
2026-07-14，rerun wave1 gate 检查。01-05 的 52 个 reference 文件在数据迁移中从 `related_topic: N` (数字) 更新为 `related_topic_uid: tp_...` (UID)，gate 报 `reference_format` + `reference_index_coverage` 失败。

## 严重程度
**P2** — 不影响新 topic，但阻止已有 topic 通过 wave1 gate。老 bundle 迁移到 C3 UID 格式后无法通过后续 gate。

## 症状

```
reference_format:01_deer-valley-retreat-feb-2026
reference_format:02_engelberg-retreat-jul-2026
...
reference_index_coverage:01_deer-valley-retreat-feb-2026
...
```

52 个 reference 文件全部从 `related_topic: N` 更新为 `related_topic_uid: tp_...` 后，wave1 gate 的 reference 格式检查拒绝。

## 根因推测

`wave-contract-evaluators.mjs` 中的 `reference_format` 和 `reference_index_coverage` 规则使用 frontmatter 字段匹配来验证 reference 文件。这些规则可能硬编码了 `related_topic` 字段名，未适配 C3 引入的 `related_topic_uid`。

## 复现

1. 老 bundle 的 reference 文件使用 `related_topic: 1-5` (数字)
2. 数据迁移中更新为 `related_topic_uid: tp_...`
3. Wave1 gate 的 reference 检查拒绝新格式

## 建议修复

- Gateway 规则应同时接受 `related_topic` 和 `related_topic_uid`
- 或通过 layout resolver 解析 reference topic binding，而非直接匹配字段名

## 相关

- BUG-082: rerun 新 topic wave0 provenance
- `DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs` — reference 格式检查

# BUG-094 — `## 本轮重跑方向` section 格式无模板，supplement 方向写入不规范

**报告日期**: 2026-07-18
**发现环境**: `dpt_rb_ai-era-bpm-process-disruption` seed topics 10-12（rerun_count=4 supplement）

## 问题

`phase-rerun.md`（line 88-100）定义了 `## 本轮重跑方向` section 的格式——但只在 prose 中描述，没有模板文件、没有 schema、没有 engine 代码生成。

当前写入的 `## 本轮重跑方向` section（topics 10-12）采用的是 ad-hoc 格式：

```
## 本轮重跑方向（rerun_count=4）
**action**: supplement
**target_dimension**: xxx
**new_search_dimensions**: ...
**rationale**: ...
```

但 `phase-rerun.md` 规定的格式（line 90-100）是：

```
## 本轮重跑方向

- **rerun_count**: N
- **action**: supplement
- **new_search_dimensions**: [...]
- **adjusted_depth**: ...
- **search_guardrails**: ...
- **rationale_excerpt**: ...
```

**差异**：
1. 实际写入的 section 标题带了 `（rerun_count=4）` 后缀——不在规范中（但 topic 08-09 也有类似的后缀，说明这是 Agent 的自发行为）
2. 实际用的是 `**key**: value` 格式，规范要求的是 `- **key**: value`（bullet list）
3. 实际多了 `target_dimension` 字段——规范中没有
4. 实际缺了 `adjusted_depth` 和 `search_guardrails` 字段——规范中要求

## 根因

与 BUG-093 同源——seed topic 的所有 section 格式定义分散在多个文件中，没有单一模板。`## 本轮重跑方向` 的格式只在 `phase-rerun.md` 的 prose 中描述，Agent 不容易发现和遵循。

## 影响

- `phase-rerun.md` 的 crash recovery 逻辑（line 47-51）依赖 `rerun_count` 字段来判断方向是否已写入。格式不一致可能导致 crash recovery 误判
- 下游 wave0 Agent 读取 `new_search_dimensions` 做定向搜索时，如果字段名不一致（`target_dimension` vs `new_search_dimensions`），会漏掉搜索方向

## 建议修复

1. 在 `phase-seed-topics.md` §3.1 的模板中明确包含 `## 本轮重跑方向` section 的占位和格式说明
2. 或在 `canonical-topic-state.mjs` 中让 engine 生成该 section 的 placeholder token（如 `__BACKFILL_RERUN_DIRECTION__`）
3. 格式统一：是 `**key**: value` 还是 `- **key**: value`，定一个并写入模板

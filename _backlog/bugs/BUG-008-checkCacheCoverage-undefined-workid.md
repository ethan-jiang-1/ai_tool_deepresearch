# BUG-008: checkCacheCoverage 对缺少 work_id 的旧 ledger 产生无意义消息

**Severity**: P1 — 影响生产诊断质量
**Found**: 2026-07-01, 分析生产 bundle `dpt_rb_ai-agents-chinese-hospital-systems-2026`
**Related**: [[implement-evidence-extraction]], [[cache_coverage]]

## 症状

真实生产 bundle `dpt_rb_ai-agents-chinese-hospital-systems-2026` 的 `rb_output_declarations.jsonl` 包含 49 条 record，全部缺少 `work_id`、`declared_at`、`producer_rule`、`slot_result_ref`、`runtime_receipt_ref`、`creation_reason` 字段（仅含 `output_files` + `cache_trails`）。运行 `checkCacheCoverage()` 时，所有 warning 消息显示 `declaration undefined`：

```
[cache_coverage] WARNING (Phase 1): declaration undefined has empty cache_trails for reference reference/00-shared-beijing-pilot-base-hospitals.md
```

`declaration undefined` 对操作者没有任何诊断价值——无法追溯到具体是哪个 task 产出的 reference 缺 cache trail。

## 根因

`DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` 中的 `checkCacheCoverage()` 直接使用 `decl.work_id` 构造消息：

```javascript
inspect.push(`[cache_coverage] WARNING (Phase 1): declaration ${decl.work_id} has empty cache_trails...`);
```

旧代码写入的 ledger record 不包含 `work_id`（见 BUG-009），导致 `decl.work_id === undefined`。

## 复现

1. 取任意含旧格式 ledger 的生产 bundle（如 `dpt_rb_ai-agents-chinese-hospital-systems-2026`）
2. 运行 `node -e "import('DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs').then(m => console.log(m.checkCacheCoverage('<bundle>')))"`
3. 观察所有 warning 消息中 `declaration undefined`

## 修复方向

`checkCacheCoverage()` 应在 `decl.work_id` 为 `undefined` 时使用 fallback 标识：

1. **首选 fallback**: `decl.output_files` 中第一个 `role=reference` 的 `path`（如 `reference/00-shared-beijing-pilot-base-hospitals.md`）
2. **次选 fallback**: 数组索引（如 `record #1`）

修改位置：`DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` `checkCacheCoverage()` 函数内所有使用 `decl.work_id` 的 inspect 字符串。

## 验证

- 对旧格式 ledger（无 work_id）运行 `checkCacheCoverage`，确认消息包含可追溯的 reference path 而非 `undefined`
- 对新格式 ledger（有 work_id）运行，确认消息仍包含 work_id
- `tests/engine/helpers/gate-helpers.test.mjs` 或新增 regression test

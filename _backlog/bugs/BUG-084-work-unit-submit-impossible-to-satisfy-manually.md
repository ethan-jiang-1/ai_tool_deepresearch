# BUG-084: `operate-work-unit.mjs submit` 校验字段过多，手工构造 result.json 不可行

## 发现时间
2026-07-13，尝试为 rerun 新 topic 06/07 走 `operate-work-unit.mjs claim → submit` 流程。

## 严重程度
**P1** — 当 Phase Agent 因任何原因需要手工完成 work-unit submit（如 sub-agent 不可用、fallback 场景、rerun 新 topic 无历史 provenance），submit 的多层交叉校验导致即使文件内容正确也无法提交。这与 BUG-082/083 共同构成"rerun 新 topic 无法通过 wave0 gate"的完整根因链。

## 症状

`operate-work-unit.mjs claim` 成功（返回 `claimed_count: 2`），但之后 `submit` 连续失败，每次报不同的字段缺失/不匹配：

```
attempt 1: schema_version must be "work-unit.result.v1" (not "1.0.0")
attempt 2: result/index mismatch: actor_contract_version
attempt 3: unrecognized_keys: actor_execution
attempt 4: result/index mismatch: execution_actor_class
attempt 5: dry-submit → invalid_result, wrong_work_id, missing_receipt
```

每个错误修完后暴露下一个。校验链覆盖了 result.json 与 `_work_units/_index.json`、`manifest.json`、`rb_queue.json` 的交叉字段匹配。**手工穷举所有必填字段并保持与 index/manifest/queue 一致几乎不可能。**

## 复现条件

1. `operate-work-unit.mjs claim` 创建 work-unit 目录
2. 手工写入 `result.json`（不使用真实 sub-agent）
3. `operate-work-unit.mjs submit` → 连续失败，每次暴露新的校验字段

## 根因

`operate-work-unit.mjs submit` 的校验链太深：

1. **Schema 层**：`WorkUnitResultSchema` 校验 result.json 自身字段
2. **Index 层**：result 字段与 `_work_units/_index.json` 中 work-unit record 交叉比对（`actor_contract_version`、`execution_actor_class`、`receipt_nonce`、`output_files` 等）
3. **Queue 层**：result 的 `queue_item_id` + `work_id` 与 `rb_queue.json` 的 `delegated_in_flight` 交叉比对
4. **Manifest 层**：result 字段与 work-unit 目录的 `manifest.json` 比对

任何一层不匹配都返回 `invalid_result`，但**错误消息只报告第一个发现的不匹配**。Agent 必须反复试错才能逐个发现所有必填字段。

这不是"安全"——这是在正常情况下由 sub-agent 自动生成的字段，在手工场景下变成无法发现的隐式契约。

## 影响范围

- 所有手工/fallback work-unit submit 场景
- Phase Agent 在 sub-agent 不可用时的 fallback 路径
- rerun 新 topic 的 provenance 建立
- 任何需要"事后补充 provenance"的恢复场景

## 建议修复

### 短期（不修改框架）
无。手工绕过不可行。

### 中期（框架改进，三选一）

**方案 A：`dry-submit` 返回完整缺失字段列表**
- `dry-submit` 一次性返回**所有**校验失败（而非只报第一个）
- 让 Agent 可以一次性补齐所有缺失字段，而非反复试错

**方案 B：提供 `--agent-generated` 标志**
- `claim` 成功后自动生成带全部必填字段的 result.json 骨架
- Agent 只需填充 `summary`、`output_files`、`source_claims` 等业务字段
- Engine 负责填充 `actor_contract_version`、`receipt_nonce` 等基础设施字段

**方案 C：`submit` 接受最小 result**
- Engine 从 manifest.json / index / queue 自动补全 `actor_contract_version`、`execution_actor_class`、`receipt_nonce` 等字段
- Agent 只需提供 `summary` + `output_files`
- 缺少的元数据字段从已记录的 claim 信息自动推导

推荐 **方案 C**：submit 时 Engine 应自动补全已在 manifest/index/queue 中记录的信息，不要求 Agent 在 result.json 中重复声明。

## 相关

- BUG-082: Rerun 新 topic wave0 无 provenance（上游根因）
- BUG-083: claim 路径发现性差（上游根因）
- `DPT_FRAMEWORK/cli/operate-work-unit.mjs:119-128` — submit handler
- `DPT_FRAMEWORK/engine/work-unit-submit.mjs` — submit 校验逻辑
- `DPT_FRAMEWORK/schema/contracts/work-unit.mjs` — WorkUnitResultSchema

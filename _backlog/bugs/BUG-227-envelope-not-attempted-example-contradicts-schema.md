# BUG-227: research-access envelope 的「Available」示例用单样本 `not_attempted`，与 ProfileSchema 冲突（gate 拒绝）

> 状态: 活跃 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-17 | source: 真实 run 执行（dpt_rb_ai-transformation-organization，HITL1 probe）

## Why（完整上下文）

HITL1 需要 Phase Agent 跑一次隔离的 direct-sample probe，并把观察写入
`rb_profile.yaml#/research_access`。`shared-hitl1-research-access-envelope.md` 的
「Compact Return」章节给出了三个示例，其中「Available」示例对未启用的 reserve 样本
（`rfc_editor`）写：

```yaml
research_access:
  status: available
  ...
  sample_observations:
    ...
    - sample_id: rfc_editor
      source_group: overseas
      outcome: not_attempted
```

但 `ProfileSchema`（`schema/contracts/profile.mjs`）与 `hitl1-recorded` gate 对
`not_attempted` 的语义是：**仅当整个 probe 未发起任何请求时**（whole-probe
no-request branch，所有样本都必须是 `not_attempted`）才合法；单个样本未启动必须用
`round_budget_not_attempted`。示例与 schema 直接矛盾。

## 复现

1. 按 envelope 的 Available 示例，把 reserve 样本（如 `cnki_catalog` / `rfc_editor`）
   的 outcome 写成 `not_attempted`（组内已有 content，reserve 未启用）。
2. 运行 `hitl1-recorded` gate：
   ```bash
   node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs --bundle <bundle> --current-node phases/phase-hitl1.md
   ```
3. gate fail：`profile_schema_valid` —
   `research_access.sample_observations: not_attempted is reserved for a whole probe
   that started no direct page request.`
4. 把该样本改成 `round_budget_not_attempted` 后 gate 通过。

## 影响（本 run 实账）

- HITL1 probe 观察按官方示例写入后被 gate 拒绝一次；Agent 需从 gate 的
  inspect 文本反推正确枚举。耗时约 5 分钟。
- 对按文档示例执行的 Agent，这是可复现的一次性打回；文档示例（authority
  surface）与 schema（machine authority）冲突，谁对需要 Agent 现场判断。

## 为什么是框架缺陷（不是 Agent 执行错误）

- 两份权威表面（envelope 示例 vs ProfileSchema）对同一枚举给出互相矛盾的合法值；
  文档示例把 `not_attempted` 用在单样本上，而 schema 明确保留给 whole-probe。
- 文档（`shared-hitl1-research-access-envelope.md`）与 schema 同属
  `DEEP_RESEARCH_HARNESS/`，本应一致。

## Owner / 最小修复方向

- Owner: `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-research-access-envelope.md`
  的 Compact Return 示例（`not_attempted` → `round_budget_not_attempted`，两处
  reserve 样本）。
- 同步检查 `shared-profile.md` 的 terminal outcomes 描述是否同样误导。
- 回归测试建议：envelope 示例文本与 `ProfileSchema` 枚举互检（或至少
  `tests/` 里锁一个「示例即合法」的解析测试）。

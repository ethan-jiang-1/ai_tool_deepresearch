## Context

参见 `proposal.md`。目前 Gate 门禁面的 `hints[].repair_kind`（宏观治理责任）与 Work-Unit 面的 `next.repair_kind`（微观恢复动词）发生同名碰撞，导致 LLM Agent 在注意力解析上面临概念混淆。

## Goals / Non-Goals

**Goals:**
- 将 Gate 门禁提示字段重构为自解释的 `resolution_owner`；
- 将 Work-Unit 恢复动词字段重构为自解释的 `recovery_action`；
- 保留 File 观测面的 `repair_directive`；
- 全面清理文档中因同名冲突而编写的防御性解释，提升代码库内聚度。

**Non-Goals:**
- 不改变各枚举项背后的底层业务逻辑与恢复状态机行为。

## Decisions

### 1. 语义精准三元组 (Precision Triad)
- **Gate 提示责任人**：`hints[].resolution_owner: "agent_action" | "engine_operation" | "user_decision" | "external_action" | "missing_contract"`
  - *Rationale*：直接回答“谁来负责解决此门禁失败”。
- **Work-Unit 恢复动作**：`next.recovery_action: "recover-transaction" | "recover-declaration" | "supersede" | "wait" | "missing_contract"`
  - *Rationale*：直接回答“执行哪个具体的 CLI 恢复动词”。
- **File 观测自愈**：`repair_directive: "materialize_canonical_surface" | "reconcile_topic_identity" ...`
  - *Rationale*：直接回答“针对底层文件系统发出什么修复指令”。

### 2. 字段重命名与平滑切换
- 在单一原子变更中同步更新 Schema、Engine 导出、规范描述、控制面表述和测试用例，避免过渡期不一致。

## Risks / Trade-offs

- [Risk] 现有的测试用例断言 `next.repair_kind` 或 `hints[].repair_kind`。
  - → *Mitigation*：同步更新测试中的断言字段为 `next.recovery_action` 和 `hints[].resolution_owner`。

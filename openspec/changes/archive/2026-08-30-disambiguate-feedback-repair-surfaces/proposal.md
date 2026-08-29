## Why

在目前的系统反馈体系中，存在两套完全不同维度的反馈字段共享同一个键名 `repair_kind`，造成严重的同名冲突与 Agent 注意力机制串味：

1. **Gate / Phase 反馈面**：`hints[].repair_kind`（取值为 `agent_action`、`engine_operation`、`user_decision`、`external_action`、`missing_contract`），其语义本质是**高层责任主体划分（Who resolves）**；
2. **Work-Unit 反馈面**：`next.repair_kind`（取值为 `recover-transaction`、`recover-declaration`、`supersede`、`wait`、`missing_contract`），其语义本质是**底层具体 CLI 动词映射（What command to execute）**。

由于两者同名且均包含 `missing_contract` 枚举项，LLM Agent 在解析错误反馈时极易在“宏观角色分工”与“微观命令行执行”之间产生混淆与幻觉，代码库被迫引入大量冗余的防御性文档和规则解释。

本 Change 遵循 DDD 语义精准原则，将两套反馈字段彻底物理隔离并精确命名：
- Gate / Phase 门禁面：`hints[].repair_kind` $\rightarrow$ **`hints[].resolution_owner`**
- Work-Unit 恢复面：`next.repair_kind` $\rightarrow$ **`next.recovery_action`**（导出常量由 `WORK_UNIT_REPAIR_KINDS` $\rightarrow$ `WORK_UNIT_RECOVERY_ACTIONS`）
- File 观测面：保持现有的 **`repair_directive`** 命名不变。

## What Changes

1. **底层 Schema 与数据层**：
   - 更新 Gate 门禁校验器，将提示载体字段由 `hints[].repair_kind` 重命名为 `hints[].resolution_owner`；
   - 更新 Work-Unit 恢复词汇表与调度器，将恢复动作载体字段由 `next.repair_kind` 重命名为 `next.recovery_action`，并将导出常量更新为 `WORK_UNIT_RECOVERY_ACTIONS` 与 `RECOVERY_ACTION_CLI_VERB`。
2. **OpenSpec 规范层**：
   - 同步更新 `openspec/specs/engine/check-inspect-feedback/spec.md` 与 `openspec/specs/agent/delegated-work-units/spec.md` 中关于两套反馈载体字段的描述与契约。
3. **控制面与工作流指引**：
   - 更新 `DEEP_RESEARCH_HARNESS/RUN.md` 中恢复决策表的列头与解释；
   - 更新 `COMMANDS.md`、`shared-subagent-protocol.md` 等文档中的恢复字段说明。
4. **引导文档瘦身**：
   - 彻底删除 `CONTEXT.md` 和 `invariants-brief.md` 中关于同名冲突的防御性免责声明，简化为清晰的独立字段定义。
5. **测试套件同步**：
   - 更新 `tests/engine/work-unit-recovery-decision-table.test.mjs` 与集成测试中的断言。

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `engine/check-inspect-feedback` | `openspec/specs/engine/check-inspect-feedback/spec.md` | Excluded | 属于反馈面字段命名精确化重构，保持 100% 行为等价（通过 skip_specs 声明） |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Excluded | 属于工作单元恢复字段精准化重构，无业务需求变更（通过 skip_specs 声明） |

## Impact

- 彻底消除跨层级反馈同名冲突，Agent 认知负担大幅减轻；
- 移除多处冗余的防御性解释，代码与文档内聚度显著提升；
- 所有确定性门禁、事务恢复与回归测试 100% 保持等价通过。

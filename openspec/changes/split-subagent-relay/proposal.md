## Why

`DPT_FRAMEWORK/engine/subagent-relay.mjs` 现已 **1683 行**，是框架内最大的单文件引擎。历史上拆分曾因 trace 单例与 pipeline 交叉引用而实施困难；同期 `harden-relay-pipeline` 对 `gate-helpers.mjs` 的拆分（2402 行 → 80 行 barrel + 5 个子模块，1091 tests pass）已证明 **barrel re-export 模式在本 repo 可行**。

项目处于「打扫卫生」阶段。应在 **零行为变化** 前提下按 **pipeline 逻辑域** 拆成扁平子模块；**200–800 行/文件仅为 sanity 参考**，边界以职责清晰、依赖 DAG 无环为准，不为凑行数合并或拆碎模块。canonical import 路径保持不变。

## What Changes

- 将 monolith 迁入 **5 个扁平子模块**（`subagent-relay-{suffix}.mjs`），与文件头 pipeline 阶段对齐：`schemas-trace` → `fork-dispatch` → `stage` → `slot-runtime` → `collect-pipeline`。
- `subagent-relay.mjs` 保留为 **barrel re-export**；外部 `import … from '…/subagent-relay.mjs'` **不变**。
- **`getDispatchMap()` 策略**：`stageSubagentSlots` / `forkAndStageSubagents` 内 `dispatchMap` 字面量改为 `getDispatchMap()`（production CLI 只传 2 参，依赖此默认解析）。
- **不**改 export 签名、schema 语义、trace 事件、on-disk 路径、workflow MD、测试断言。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `framework-engine`：subagent-relay 5 子模块布局 + barrel 契约（FRE-004）。

## Impact

| 层级 | 改 import？ | 说明 |
|------|------------|------|
| Production JS engine | **否** | `queue-manager.mjs` |
| Production CLI | **否** | `drive-relay-slot.mjs` |
| Workflow MD | **否** | 0 inline import；走 CLI |
| Tests + fixtures | **否** | import barrel 不变 |
| MD 契约 CLI | **须仍 PASS** | `validate-subagent-logging-contract.mjs` |

**Barrel 必须 re-export 全部 32 个 public symbol**（`rg '^export '` 清单）。

**Version bump**：不需要。

**文档漂移（非阻塞）**：`_backlog/` 行号、guidelines 行数描述。

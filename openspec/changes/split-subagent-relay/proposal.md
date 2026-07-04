## Why

`DPT_FRAMEWORK/engine/subagent-relay.mjs` 现已 **1683 行**，是框架内最大的单文件引擎。历史上拆分曾因 trace 单例与 pipeline 交叉引用而实施困难；同期 `harden-relay-pipeline` 对 `gate-helpers.mjs` 的拆分（2402 行 → 80 行 barrel + 5 个子模块，1091 tests pass）已证明 **barrel re-export 模式在本 repo 可行**。

项目处于「打扫卫生」阶段；继续往 relay 里加 slot 类型、receipt 校验、pipeline 编排会让单文件更难维护、更难测、更难 review。应在 **零行为变化** 前提下，把 subagent-relay 拆成 200–800 行/文件的子模块，canonical import 路径保持不变。

## What Changes

- 将 `subagent-relay.mjs` 主体逻辑迁入同目录下 **5 个扁平子模块**（`subagent-relay-{suffix}.mjs`，参照 `gate-helpers-core.mjs` 命名，**不用子目录**）。
- `DPT_FRAMEWORK/engine/subagent-relay.mjs` 保留为 **barrel re-export**（参照 `gate-helpers.mjs`），所有现有 `import … from '…/subagent-relay.mjs'` **不变**。
- 子模块按 pipeline 阶段划分，单文件目标 **200–800 行**；低于 200 行的碎片（如单独 trace 模块）合并进相邻模块。
- **不**改任何 export 签名、Zod schema 语义、trace 事件集、on-disk 路径约定。
- **不**改 workflow / phase **MD**（全仓扫描：0 处 inline `import subagent-relay`；runtime 经 `drive-relay-slot` CLI，见 design.md Impact Surface）。
- **不**改 `tests/engine/subagent-relay.test.mjs` 的断言语义（测试 import 路径不变，可后续 mirror 结构）。
- **不**拆 `queue-manager.mjs` 或其他引擎（留给后续 change）。

## Capabilities

### New Capabilities

（无 — 纯 refactor，不引入新 capability。）

### Modified Capabilities

- `framework-engine`：补充 subagent-relay 子模块布局与 barrel import 契约（canonical 入口仍为 `subagent-relay.mjs`；行为不变）。

## Impact

### 影响面结论（全仓扫描 2026-07-04）

Barrel 策略下 **外部零 import 路径变更**。Workflow MD 是 **零触碰面**（SNC-003：Phase Agent 经 CLI 驱动 relay，禁止 inline JS 直调引擎）。

| 层级 | 改 import？ | 数量 | 说明 |
|------|------------|------|------|
| Production JS engine | **否** | 1 | `queue-manager.mjs` |
| Production CLI | **否** | 1 | `drive-relay-slot.mjs` → barrel |
| Workflow / phase MD | **否** | 0 import | 10+ 文件走 `drive-relay-slot` bash |
| Regression tests + fixtures | **否** | 4 | 含 `subagent-logging-contract` integration |
| MD 静态契约 CLI | **否**（须仍 PASS） | 1 | `validate-subagent-logging-contract.mjs` |
| Experiment playbooks | **否** | 9 case | MD 内嵌 JS 仍 import barrel |
| Guidelines / OpenSpec / backlog MD | **否** | prose only | 路径 `subagent-relay.mjs` 不变；行号可能 stale |

**Runtime 链**：`phase-wave*.md` → `shared-subagent-protocol.md` §1.5 → `node …/drive-relay-slot.mjs` → `subagent-relay.mjs`（barrel）。

**Production barrel 必须 export 的符号 union**（详见 design.md）：

- `queue-manager.mjs`：`SlotResult`, `validateRuntimeReceipt`, `resolveSlotFromResultRef`
- `drive-relay-slot.mjs`：`stageSubagentSlots`, `stageReplacementSlot`, `recordAgentSpawnRequested`, `loadSlotByManifestEntry`, `ingestAgentReceipt`, `commitSlotResult`, `collectAndMergeSubagentResults`
- `tests/engine/subagent-relay.test.mjs`：32 个 public export 主回归（`rg '^export '` 清单，**非**文件头 L63–74 注释）

### 代码与 spec 变更

| 区域 | 影响 |
|------|------|
| `DPT_FRAMEWORK/engine/subagent-relay.mjs` | 变为 barrel（~100 行） |
| `DPT_FRAMEWORK/engine/subagent-relay-*.mjs` | 新增 5 个扁平子模块（与 barrel 同级） |
| `DPT_FRAMEWORK/engine/queue-manager.mjs` | 无 import 路径变更 |
| `DPT_FRAMEWORK/cli/drive-relay-slot.mjs` | 无 import 路径变更 |
| `DPT_FRAMEWORK/workflows/**/*.md` | **不改** |
| `tests/engine/subagent-relay.test.mjs` | 回归验证，语义不变 |
| `openspec/specs/framework-engine/spec.md` | delta：子模块结构 + 影响面 requirement |
| `openspec/governance/req-registry.yaml` | 新增 FRE-004 |

**Version bump**：不需要。纯内部 refactor，无 distributable API 或行为变化。

**文档漂移（非阻塞）**：`_backlog/` 行号引用、`guidelines/agentic-subagent-mechanism.md` 行数描述——apply 后可选手动更新，本 change 不强制。

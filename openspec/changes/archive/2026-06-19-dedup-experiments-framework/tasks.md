## 1. 共性基础设施（先做，所有实验家族依赖）

- [x] 1.1 实现 `DPT_FRAMEWORK/engine/trace.mjs`（统一 trace writer，工厂模式）@impl TRW-001：`createTrace(filePath, options?)` 工厂，统一 3 种变体（静默版、彩色 echo 版、图标版）
- [x] 1.2 编写 trace writer 自身的单元测试（`tests/engine/trace.test.mjs`），覆盖 3 种变体（默认 echo、静默、自定义图标）和 traceInit/traceEntry/traceSummary/traceCleanup API
- [x] 1.3 验证 trace writer 输出符合 `schema/contracts/trace.mjs` 的 `TraceEntrySchema` @impl TRW-002
- [x] 1.4 创建 `experiments/shared/` 目录 @impl EXS-001
- [x] 1.5 搬移 `new-disposable-bundle.mjs`：从 `DPT_FRAMEWORK/command_experiments/scripts/` 搬到 `experiments/shared/`，更新内部 schema import 路径 @impl EXS-002；搬移后删除空的 `DPT_FRAMEWORK/command_experiments/scripts/` 目录
- [x] 1.6 创建 `DPT_FRAMEWORK/engine/` 目录 @impl FRE-001
- [x] 1.7 创建 `tests/engine/` 目录（测试统一放在 root `tests/`，不在 `DPT_FRAMEWORK/` 内）

## 2. agentic-queue（独立，有 CLI）→ 停，验证

- [x] 2.1 搬移 `queue-manager.mjs`：从 `experiments/prototype-agentic-queue/agentic-queue.mjs` 搬到 `DPT_FRAMEWORK/engine/queue-manager.mjs`，更新内部 import trace 路径 @impl FRE-001
- [x] 2.2 搬移 CLI：从 `experiments/prototype-agentic-queue/agentic-queue-cli.mjs` 搬到 `DPT_FRAMEWORK/cli/operate-queue.mjs`，更新 import 路径
- [x] 2.3 搬移测试：`agentic-queue.test.mjs` → `tests/engine/queue-manager.test.mjs`，更新 import 路径
- [x] 2.4 更新 `exp_agentic-queue/` 3 个 playbook 的 import 路径：engine → `../DPT_FRAMEWORK/engine/queue-manager.mjs`，trace → `../DPT_FRAMEWORK/engine/trace.mjs`；Step 1 bundle 创建改为 `experiments/shared/new-disposable-bundle.mjs`
- [x] 2.5 从 `experiments/prototype-agentic-queue/` 移除已搬走的 `.mjs` 文件，确认保留 `EXPERIMENT.md` + `nodes-agentic-queue/`
- [x] **停**：运行 queue-manager 单元测试(14 pass) + agentic-queue 3 playbook(simple/medium/complex 全 PASS)，全量回归 76 pass 0 fail ✅

## 3. gate-loop（独立）→ 停，验证

- [x] 3.1 搬移 `gate-loop.mjs`：从 `experiments/prototype-gate-loop/gate-loop.mjs` 搬到 `DPT_FRAMEWORK/engine/gate-loop.mjs`，更新内部 import trace 路径 @impl FRE-001
- [x] 3.2 搬移测试：`gate-loop.test.mjs` → `tests/engine/gate-loop.test.mjs`，更新 import 路径
- [x] 3.3 更新 `exp_gate-loop/` 3 个 playbook 的 import 路径：engine → `../DPT_FRAMEWORK/engine/gate-loop.mjs`，trace → `../DPT_FRAMEWORK/engine/trace.mjs`；Step 1 改为 `experiments/shared/new-disposable-bundle.mjs`
- [x] 3.4 从 `experiments/prototype-gate-loop/` 移除已搬走的 `.mjs` 文件，确认保留 `EXPERIMENT.md` + `nodes-gate-loop/`
- [x] **停**：gate-loop 单元测试 11 pass，playbook smoke test SIMPLE PASS，全量回归 87 pass 0 fail ✅

## 4. gate-fork（独立）→ 停，验证

- [x] 4.1 搬移 `gate-fork.mjs`：从 `experiments/prototype-gate-fork/gate-fork.mjs` 搬到 `DPT_FRAMEWORK/engine/gate-fork.mjs`，更新内部 import trace 路径 @impl FRE-001
- [x] 4.2 搬移测试：`gate-fork.test.mjs` → `tests/engine/gate-fork.test.mjs`，更新 import 路径
- [x] 4.3 更新 `exp_gate-fork/` 3 个 playbook 的 import 路径：engine → `../DPT_FRAMEWORK/engine/gate-fork.mjs`，trace → `../DPT_FRAMEWORK/engine/trace.mjs`；Step 1 改为 `experiments/shared/new-disposable-bundle.mjs`
- [x] 4.4 从 `experiments/prototype-gate-fork/` 移除已搬走的 `.mjs` 文件，确认保留 `EXPERIMENT.md` + `nodes-gate-fork/`
- [x] **停**：运行 gate-fork 单元测试 + gate-fork 3 个 playbook → 全部 PASS，人工确认后再继续

## 5. subagent（独立运行时，不依赖 gate-fork）→ 停，验证

subagent 的 fork/repair/dispatch/collect/merge 逻辑是独立的运行时语义（启动真实 native subagent），
与 gate-fork.mjs 的通用 forkGate 无关。搬迁时保留所有逻辑不变，只改 trace 接入方式。

- [x] 5.1 搬移 `subagent-relay.mjs`：从 `experiments/prototype-subagent/subagent.mjs` 搬到 `DPT_FRAMEWORK/engine/subagent-relay.mjs`
  - trace 改用 `createTrace` 工厂 + module-level `ensureTrace(bundleDir)` auto-init 模式（与 queue-manager 一致）
  - 所有内部 trace 调用走 `ensureTrace` 返回的单例，consoleEcho: false
  - 保留所有 fork/repair/dispatch/collect/merge 逻辑，不做任何行为变更 @impl FRE-001
  - 新增完整 module header（Role, Pipeline, Architecture, Trace, On-disk paths, Exports）
  - 19 个 public 函数全部加 @param/@returns JSDoc
  - 重命名：`parentRelayWriteResult`→`commitSlotResult`, `markRelayFailure`→`markSlotFailed`
  - 返回字段重命名：`ci`→`checkResult`, `reFork`→`forkDecision`, `awaitingParentRelay`→`awaitingAgent`, `trace`→`phaseLog`
  - `collectAndMergeSubagentResults` 始终返回全部字段（null 表示未使用）
- [x] 5.2 搬移测试：`subagent.test.mjs` → `tests/engine/subagent-relay.test.mjs`（24 tests pass）
- [x] 5.3 更新 `exp_subagent/` 4 个 playbook 的 import 路径：`commitSlotResult` rename, Step 1 bundle 创建 `experiments/shared/new-disposable-bundle.mjs`
- [x] 5.4 从 `experiments/prototype-subagent/` 移除已搬走的 `.mjs` 文件（`subagent.mjs`、`subagent.test.mjs`、`trace.mjs`），确认保留 `EXPERIMENT.md`
- [x] **停**：subagent-relay 单元测试 24 pass + 4 playbook 全 PASS，全量回归 0 fail ✅

## 6. workflow-chain（独立，但被 workflow-fsm 依赖）→ 停，验证

- [x] 6.1 搬移 `workflow-chain.mjs`：从 `experiments/prototype-workflow-next/workflow-next.mjs` 搬到 `DPT_FRAMEWORK/engine/workflow-chain.mjs` @impl FRE-001
  - trace 完全无状态：trace 实例作为可选尾参数透传（`assessNode(fileRef, state, runtime, trace?)`），无模块级 `_trace`，无注入函数
  - `emit(runtime, trace, type, detail)` — trace 参数穿透到所有 pipeline 函数（`readMarkdownFile`, `resolveDependencyClosure`, `executeMarkdownFile`, `executeLoadPlan`）
  - sandbox `traceEntry` 闭包捕获传入的 trace，无模块级状态
  - 重命名：`loadNextMarkdown`→`assessNode`, `createInitialState`→`createState`
  - `resolveDependencyClosure` 递归参数内化（public 签名只留 `fileRef, runtime, trace?`）
  - 新增完整 module header（Role/Quick Start/Pipeline/Trace/Exports），Controller API 只有 3 个函数
  - 所有 11 个 public export 加 @param/@returns JSDoc
- [x] 6.2 搬移测试：`workflow-next.test.mjs` → `tests/engine/workflow-chain.test.mjs`（28 pass）
  - 设 `process.env.NODES_DIR` 后动态 import（engine 在 import 时读 NODES_DIR）
  - fixture 文件名从连字符修正为点号（匹配实际文件）
- [x] 6.3 更新 `exp_workflow-next/` 3 个 playbook 的 import 路径：
  - engine → `../DPT_FRAMEWORK/engine/workflow-chain.mjs`（3 函数：`createWorkflowRuntime, createState, assessNode`）
  - trace → `../DPT_FRAMEWORK/engine/trace.mjs`（`createTrace` 工厂）
  - playbook 用 `const trace = createTrace(path, { consoleEcho: false }); assessNode(..., trace)` 传入 trace
  - Step 1 改为 `experiments/shared/new-disposable-bundle.mjs`
  - env var 名修正：`experiments/prototype-workflow-next/nodes-workflow-next` → `NODES_DIR`
- [x] 6.4 从 `experiments/prototype-workflow-next/` 移除已搬走的 `.mjs` 文件（`workflow-next.mjs`、`workflow-next.test.mjs`、`trace.mjs`），确认保留 `EXPERIMENT.md` + `nodes-workflow-next/`
- [x] **停**：workflow-chain 单元测试 28 pass + 全量回归 116 pass 0 fail ✅

## 7. workflow-fsm（依赖 workflow-chain 的 loader 函数）→ 停，验证

workflow-fsm 内嵌了 workflow-chain 的 7 个函数：`nodePath`, `parseFrontmatter`,
`readMarkdownFile`, `resolveDependencyClosure`, `createState`, `executeMarkdownFile`,
`executeLoadPlan`。Phase 6 完成后这些函数在 `./workflow-chain.mjs` 中有权威版本。

- [x] 7.0 验证等效性：diff 确认 workflow-fsm 内嵌的 7 个 loader 函数与 `DPT_FRAMEWORK/engine/workflow-chain.mjs` 中的对应函数签名和实现一致（或差异无害）
  - **结论**：5 个函数可 import from workflow-chain（`nodePath`, `parseFrontmatter`, `readMarkdownFile`, `resolveDependencyClosure`, `createState`），2 个必须保留 FSM 专有版（`executeMarkdownFile` — transition() sandbox 是 FSM 核心语义，`executeLoadPlan` — 依赖 FSM 版 executeMarkdownFile 的 `{ state, transitionResult }` 返回形态）。FSM 专有的 `executeMarkdownFile` 和 `executeLoadPlan` 保留在 workflow-fsm.mjs 中。
- [x] 7.1 搬移 `workflow-fsm.mjs`：从 `experiments/prototype-workflow-fsm/workflow-fsm.mjs` 搬到 `DPT_FRAMEWORK/engine/workflow-fsm.mjs` @impl FRE-001, FRE-002
  - 从 `./workflow-chain.mjs` import 5 个 loader 函数 + 2 个 schema（`NodeFrontmatter`, `WorkflowState`）
  - `createInitialState` 改为 `createState` 的 re-export alias（向后兼容）
  - trace 完全无状态（与 Phase 6 一致）：`createMachine(fsmPath, initialState?, trace?)` 将 trace 存为 Machine 实例字段（非模块级），`runFSM(fsm, state, runtime, max?, trace?)` 接受 trace 尾参数。所有内部函数（`emit`, `executeMarkdownFile`, `executeLoadPlan`, `evaluateNode`）将 trace 做可选尾参数透传。无 `setFsmTrace`，无模块级 `_trace`。每台 Machine 可用独立 trace 实例，互不干扰
  - 保留 FSM 独有逻辑：`FSMDefinition` schema, `loadFSM`, `createFSMRuntime`, `resolveTransition`, `executeMarkdownFile`（transition sandbox，内部函数）, `executeLoadPlan`（内部函数）, `evaluateNode`（内部函数, renamed from loadAndExecuteNode）, `Machine`, `createMachine`, `runFSM`
  - 暴露面精简：19 export → 10 export。`executeMarkdownFile`/`executeLoadPlan`/`evaluateNode` 改为内部函数。多余 wc re-exports（`nodePath`, `parseFrontmatter`, `readMarkdownFile`, `resolveDependencyClosure`, `NodeFrontmatter`）移除，consumer 直接从 `./workflow-chain.mjs` import
  - 新增完整 module header（Role/Quick Start/Pipeline/Trace/Exports），所有 7 个 public export 加 @param/@returns JSDoc
- [x] 7.2 搬移测试：`workflow-fsm.test.mjs` → `tests/engine/workflow-fsm.test.mjs`（32 pass）
  - 设 `process.env.NODES_DIR` 后动态 import（engine 在 import 时读 NODES_DIR）
  - import 路径更新为 `../../DPT_FRAMEWORK/engine/workflow-fsm.mjs`
- [x] 7.3 更新 `exp_workflow-fsm/` 3 个 playbook 的 import 路径：
  - engine → `../DPT_FRAMEWORK/engine/workflow-fsm.mjs`（`createMachine(path, null, trace)`）
  - trace → `../DPT_FRAMEWORK/engine/trace.mjs`（`createTrace` 工厂）
  - playbook 用 `const trace = createTrace(path, { consoleEcho: false }); createMachine(..., null, trace)` 注入 trace
  - `setTraceFile`/`traceInit`/`traceEntry` → `trace.traceInit`/`trace.traceEntry`
  - Step 1 + cleanup 改为 `experiments/shared/new-disposable-bundle.mjs`
- [x] 7.4 从 `experiments/prototype-workflow-fsm/` 移除已搬走的 `.mjs` 文件（`workflow-fsm.mjs`、`workflow-fsm.test.mjs`、`trace.mjs`），保留 `nodes-workflow-fsm/` + `package.json`
  - 注意：此目录无 `EXPERIMENT.md`（从未创建）
- [x] **停**：workflow-fsm 单元测试 32 pass + 全量回归 148 pass 0 fail + 3 playbook 全 PASS ✅

## 8. 升级 schema/contracts/queue.mjs

- [x] 8.1 基于 `DPT_FRAMEWORK/engine/queue-manager.mjs` 中已验证的 `QueueItemSchema` 定义 `QueueWorkUnitSchema`（20 字段，含 work_id, title, target, action, producer_rule, priority_class, required_receipts, completion_receipt, failure_route, writes_to, status, payload 等）+ 5 个 queue 专有 enum（Target, ItemStatus, PriorityClass, RestorePriority, JsonObject）@impl SCO-009
- [x] 8.2 将 5 个 active window 槽位从 `z.null()` 改为 `QueueWorkUnitSchema.nullable()`，`refill_pool` 从 `z.array(z.unknown())` 改为 `z.array(QueueWorkUnitSchema)`。Engine 的 `QueueItemSchema` 改为从 contracts import（`export const QueueItemSchema = QueueWorkUnitSchema` 向后兼容），删除 engine 内重复的 schema + enum 定义 @impl SCO-009
- [x] 8.3 验证 `validate-bundle.mjs` 对现有 skeleton `rb_queue.json`（全部 null 槽位）仍 PASS（向后兼容）。全量回归 135 pass 0 fail ✅

## 9. 收尾清理 + 实验入口移出框架

`command_experiments/` 是实验入口 playbook，不是框架代码。移出 `DPT_FRAMEWORK/`，与 `experiments/` 并列，实验相关东西聚在一处。

**注意**：playbook MD 内 bash heredoc 写的 JS import 路径相对于 disposable bundle（`$B/`，repo 根），不依赖 MD 文件自身位置 → 移动 playbook 不需要改任何 JS import。

- [x] 9.1 `git mv DPT_FRAMEWORK/command_experiments experiments_playbook` → 6 个 exp_* 目录，20 个 playbook。删除空的 `DPT_FRAMEWORK/command_experiments/`
- [x] 9.2 更新非归档引用（~15 个文件，~50 处）→ 全部 `experiments_playbook/`。`openspec/config.yaml` 同步修正目录树结构（`experiments_playbook/` 移到根节点）和 prototype 标准结构（移除已搬走的 .mjs/trace.mjs/package.json）
- [x] 9.3 检查 6 个 prototype 目录：无 `.mjs` 残留。`prototype-workflow-fsm` 缺 `EXPERIMENT.md`（从未创建）
- [x] 9.4 移除 6 个 `package.json`（目录下无 JS 代码，`"type": "module"` 无意义）
- [x] 9.5 验证：全量回归 135 pass 0 fail + playbook 抽检（bundle 创建 + validate 5/5）从新位置正常
- [x] 9.6 `grep -r "DPT_FRAMEWORK/command_experiments"` 残留引用仅在 `openspec/changes/dedup-experiments-framework/` 自身（proposal/design/tasks 中的"从旧路径搬出"叙述），guidelines/specs/README/CLAUDE/源码均无残留

## 10. 全量验证 + Requirement ID 注册

- [x] 10.1 运行所有 6 个 engine 的单元测试（`node:test`）→ 135 pass 0 fail ✅
- [x] 10.2 运行 `validate-bundle.mjs` 和 `inspect-bundle.mjs` 验证无回归 ✅
- [x] 10.3 在 `openspec/governance/req-registry.yaml` 注册 FRE-001, FRE-002, TRW-001, TRW-002, EXS-001, EXS-002, SCO-009（状态: pending — 来源 delta spec）
- [x] 10.4 运行 `node openspec/governance/check-project-reqs.mjs` → 55 registered (5 retired, 0 orphan), 55 occurrences ✅
- [x] 10.5 运行 `node openspec/governance/check-project-specs.mjs` → 24 main spec files, 0 violations ✅

## 11. Post-Activation 指南清理

- [x] 11.1 更新 `guidelines/README.md`：5 个 landed surfaces 从 Target → Current（`experiments_playbook/`、`DPT_FRAMEWORK/engine/`、`DPT_FRAMEWORK/engine/trace.mjs`、`experiments/shared/new-disposable-bundle.mjs`、`check` verdict events）；Queue projection 从 Proposed → Current
- [x] 11.2 检查 `guidelines/command-experiments.md`：标题 "Target Guidance" → "Current Guidance"；状态 "目标指导" → "生效"；移除激活条件；"Current Use" 两层合并为单一 active 状态；Post-Activation Cleanup 标记为 completed
- [x] 11.3 对照实际布局：所有 guideline target path 存在且正确（6 engines、trace、20 playbooks、shared、prototypes fixture-only）
- [x] 11.4 无冲突：project-charter.md 和 command-experiments.md Layer Contract 与实际一致

## 12. Main Specs 对齐 — Source-of-Truth 审计

代码物理位置大规模变更后，`openspec/specs/` 中的 main spec 是系统的 source of truth。如果它们引用旧路径或旧措辞，整个规约体系的可信度归零。这个 phase 在 archive 之前逐 spec 对齐，确保读到的东西和文件系统里的一致。

- [x] 12.1 确认 3 个新 capability 的 main spec 已从 delta spec 合并到 `openspec/specs/`：
      `framework-engine`（FRE-001, FRE-002）、`trace-writer`（TRW-001, TRW-002）、
      `experiment-shared-infra`（EXS-001, EXS-002）。
      每个目录含完整 `spec.md`，`> req:` 行引用正确的 requirement ID。P0 bug 修复：framework-engine delta spec 中 3 处 `workflow-loader` → `workflow-chain`。
- [x] 12.2 确认 `openspec/specs/schema-core/spec.md` 已合并 SCO-009：
      `QueueWorkUnitSchema` 定义、5 个 slot 改为 `.nullable()`、`refill_pool` 改为 `z.array(QueueWorkUnitSchema)`。
      追加了 6-contracts 表格 + 4 个 QueueWorkUnitSchema scenarios。
- [x] 12.3 扫描已有 main spec，修正因搬迁导致的过时措辞（实际修复 5 个 spec，原 task 只列了 2 个）：
      - `agentic-queue`（AGQ-006）："prototype" → "engine"，playbook 路径更新
      - `agent-testing`（AGT-001/002/003）："prototype-{component}" → "engine at DPT_FRAMEWORK/engine/"；"segment" → "node"；bare `trace.mjs` → `DPT_FRAMEWORK/engine/trace.mjs`
      - **额外发现**: `dynamic-node-loading`（DYS-001）：全文 segment→node，`segments-gate-loop/` → `nodes-gate-loop/`
      - **额外发现**: `conditional-nodes`（COS-001）：全文 segment→node，`segmentRegistry` → `nodeRegistry`，`loadNextSegment` → `loadNextNode`
      - **额外发现**: `cmd-bundle-instantiation`（CMI-001）：`command_playbook/` → `DPT_FRAMEWORK/command_playbook/`
- [x] 12.4 确认所有 main spec 的 `> req:` 行引用的 requirement ID 在 `req-registry.yaml` 中注册且状态为 `alive`（非 `pending`、非 `retired`）。7 个 pending ID 已通过创建 main spec 变为 alive，registry 注释已更新。
- [x] 12.5 对照 `DPT_FRAMEWORK/engine/`、`experiments/shared/`、`tests/engine/` 实际文件布局，逐项复核 main spec 中所有 target path 描述。旧路径零残留（`segments-gate-loop`, `segmentRegistry`, `loadNextSegment`, `workflow-loader`, `prototype-{component}` 全部清除）。
- [x] 12.6 运行 `node openspec/governance/check-project-specs.mjs` → 27 main spec files, 0 violations ✅；`check-project-reqs.mjs` → 55 registered (5 retired, 0 orphan), 62 occurrences ✅
- [x] 12.7 在 `openspec/changes/archive/README.md` 添加路标：说明 archives 是历史快照、路径反映归档时状态、当前权威位置以 `openspec/specs/` 为准，含路径漂移对照表。

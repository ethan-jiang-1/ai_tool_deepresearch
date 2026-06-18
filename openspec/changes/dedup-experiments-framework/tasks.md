## 1. 共性基础设施（先做，所有实验家族依赖）

- [ ] 1.1 创建 `DPT_FRAMEWORK/trace/` 目录，实现 `trace.mjs` @impl TRW-001：`createTrace(options?)` 工厂，统一 3 种变体（静默版、彩色 echo 版、图标版）
- [ ] 1.2 编写 trace writer 自身的单元测试（`DPT_FRAMEWORK/tests/trace/trace.test.mjs`），覆盖 3 种变体（默认 echo、静默、自定义图标）和 traceInit/traceEntry/traceSummary/traceCleanup API
- [ ] 1.3 验证 trace writer 输出符合 `schema/contracts/trace.mjs` 的 `TraceEntrySchema` @impl TRW-002
- [ ] 1.4 创建 `experiments/shared/` 目录 @impl EXS-001
- [ ] 1.5 搬移 `new-disposable-bundle.mjs`：从 `DPT_FRAMEWORK/command_experiments/scripts/` 搬到 `experiments/shared/`，更新内部 schema import 路径 @impl EXS-002；搬移后删除空的 `DPT_FRAMEWORK/command_experiments/scripts/` 目录
- [ ] 1.6 创建 `DPT_FRAMEWORK/engine/` 目录 @impl FRE-001
- [ ] 1.7 创建 `DPT_FRAMEWORK/tests/engine/` 和 `DPT_FRAMEWORK/tests/trace/` 目录

## 2. agentic-queue（独立，有 CLI）→ 停，验证

- [ ] 2.1 搬移 `queue-manager.mjs`：从 `experiments/prototype-agentic-queue/agentic-queue.mjs` 搬到 `DPT_FRAMEWORK/engine/queue-manager.mjs`，更新内部 import trace 路径 @impl FRE-001
- [ ] 2.2 搬移 CLI：从 `experiments/prototype-agentic-queue/agentic-queue-cli.mjs` 搬到 `DPT_FRAMEWORK/cli/queue.mjs`，更新 import 路径
- [ ] 2.3 搬移测试：`agentic-queue.test.mjs` → `DPT_FRAMEWORK/tests/engine/queue-manager.test.mjs`，更新 import 路径
- [ ] 2.4 更新 `exp_agentic-queue/` 3 个 playbook 的 import 路径：engine → `../DPT_FRAMEWORK/engine/queue-manager.mjs`，trace → `../DPT_FRAMEWORK/trace/trace.mjs`；Step 1 bundle 创建改为 `experiments/shared/new-disposable-bundle.mjs`
- [ ] 2.5 从 `experiments/prototype-agentic-queue/` 移除已搬走的 `.mjs` 文件，确认保留 `EXPERIMENT.md` + `nodes-agentic-queue/`
- [ ] **停**：运行 queue-manager 单元测试 + agentic-queue 3 个 playbook → 全部 PASS，人工确认后再继续

## 3. gate-loop（独立）→ 停，验证

- [ ] 3.1 搬移 `gate-loop.mjs`：从 `experiments/prototype-gate-loop/gate-loop.mjs` 搬到 `DPT_FRAMEWORK/engine/gate-loop.mjs`，更新内部 import trace 路径 @impl FRE-001
- [ ] 3.2 搬移测试：`gate-loop.test.mjs` → `DPT_FRAMEWORK/tests/engine/gate-loop.test.mjs`，更新 import 路径
- [ ] 3.3 更新 `exp_gate-loop/` 3 个 playbook 的 import 路径：engine → `../DPT_FRAMEWORK/engine/gate-loop.mjs`，trace → `../DPT_FRAMEWORK/trace/trace.mjs`；Step 1 改为 `experiments/shared/new-disposable-bundle.mjs`
- [ ] 3.4 从 `experiments/prototype-gate-loop/` 移除已搬走的 `.mjs` 文件，确认保留 `EXPERIMENT.md` + `nodes-gate-loop/`
- [ ] **停**：运行 gate-loop 单元测试 + gate-loop 3 个 playbook → 全部 PASS，人工确认后再继续

## 4. gate-fork（独立，但被 subagent 依赖）→ 停，验证

- [ ] 4.1 搬移 `gate-fork.mjs`：从 `experiments/prototype-gate-fork/gate-fork.mjs` 搬到 `DPT_FRAMEWORK/engine/gate-fork.mjs`，更新内部 import trace 路径 @impl FRE-001
- [ ] 4.2 搬移测试：`gate-fork.test.mjs` → `DPT_FRAMEWORK/tests/engine/gate-fork.test.mjs`，更新 import 路径
- [ ] 4.3 更新 `exp_gate-fork/` 3 个 playbook 的 import 路径：engine → `../DPT_FRAMEWORK/engine/gate-fork.mjs`，trace → `../DPT_FRAMEWORK/trace/trace.mjs`；Step 1 改为 `experiments/shared/new-disposable-bundle.mjs`
- [ ] 4.4 从 `experiments/prototype-gate-fork/` 移除已搬走的 `.mjs` 文件，确认保留 `EXPERIMENT.md` + `nodes-gate-fork/`
- [ ] **停**：运行 gate-fork 单元测试 + gate-fork 3 个 playbook → 全部 PASS，人工确认后再继续

## 5. subagent（依赖 gate-fork 的 fork router）→ 停，验证

- [ ] 5.0 验证等效性：diff `experiments/prototype-subagent/subagent.mjs` 中内嵌的 fork router 函数（`evaluateBranch`/`forkRouter`/`convergeRepair`）与 `DPT_FRAMEWORK/engine/gate-fork.mjs` 中的对应函数，确认一致或差异无害
- [ ] 5.1 搬移 `subagent-relay.mjs`：从 `experiments/prototype-subagent/subagent.mjs` 搬到 `DPT_FRAMEWORK/engine/subagent-relay.mjs`，移除内嵌 fork router 副本，改为 `import { evaluateBranch, forkRouter, convergeRepair } from './gate-fork.mjs'` @impl FRE-001, FRE-002
- [ ] 5.2 搬移测试：`subagent.test.mjs` → `DPT_FRAMEWORK/tests/engine/subagent-relay.test.mjs`，更新 import 路径
- [ ] 5.3 更新 `exp_subagent/` 4 个 playbook 的 import 路径：engine → `../DPT_FRAMEWORK/engine/subagent-relay.mjs`，trace → `../DPT_FRAMEWORK/trace/trace.mjs`；Step 1 改为 `experiments/shared/new-disposable-bundle.mjs`
- [ ] 5.4 从 `experiments/prototype-subagent/` 移除已搬走的 `.mjs` 文件，确认保留 `EXPERIMENT.md`
- [ ] **停**：运行 subagent-relay 单元测试 + subagent 4 个 playbook → 全部 PASS，人工确认后再继续

## 6. workflow-loader（独立，但被 workflow-fsm 依赖）→ 停，验证

- [ ] 6.1 搬移 `workflow-loader.mjs`：从 `experiments/prototype-workflow-next/workflow-next.mjs` 搬到 `DPT_FRAMEWORK/engine/workflow-loader.mjs`，更新内部 import trace 路径 @impl FRE-001
- [ ] 6.2 搬移测试：`workflow-next.test.mjs` → `DPT_FRAMEWORK/tests/engine/workflow-loader.test.mjs`，更新 import 路径
- [ ] 6.3 更新 `exp_workflow-next/` 3 个 playbook 的 import 路径：engine → `../DPT_FRAMEWORK/engine/workflow-loader.mjs`，trace → `../DPT_FRAMEWORK/trace/trace.mjs`；Step 1 改为 `experiments/shared/new-disposable-bundle.mjs`
- [ ] 6.4 从 `experiments/prototype-workflow-next/` 移除已搬走的 `.mjs` 文件，确认保留 `EXPERIMENT.md` + `nodes-workflow-next/`
- [ ] **停**：运行 workflow-loader 单元测试 + workflow-next 3 个 playbook → 全部 PASS，人工确认后再继续

## 7. workflow-fsm（依赖 workflow-loader）→ 停，验证

- [ ] 7.0 验证等效性：diff `experiments/prototype-workflow-fsm/workflow-fsm.mjs` 中内嵌的 loader 函数与 `DPT_FRAMEWORK/engine/workflow-loader.mjs` 中的对应函数，确认一致或差异无害
- [ ] 7.1 搬移 `workflow-fsm.mjs`：从 `experiments/prototype-workflow-fsm/workflow-fsm.mjs` 搬到 `DPT_FRAMEWORK/engine/workflow-fsm.mjs`，移除内嵌 loader 副本，改为 `import { resolveDependencyClosure, executeLoadPlan, createInitialState, createWorkflowRuntime, nodePath, parseFrontmatter, readMarkdownFile } from './workflow-loader.mjs'` @impl FRE-001, FRE-002
- [ ] 7.2 搬移测试：`workflow-fsm.test.mjs` → `DPT_FRAMEWORK/tests/engine/workflow-fsm.test.mjs`，更新 import 路径
- [ ] 7.3 更新 `exp_workflow-fsm/` 3 个 playbook 的 import 路径：engine → `../DPT_FRAMEWORK/engine/workflow-fsm.mjs`，trace → `../DPT_FRAMEWORK/trace/trace.mjs`；Step 1 改为 `experiments/shared/new-disposable-bundle.mjs`
- [ ] 7.4 从 `experiments/prototype-workflow-fsm/` 移除已搬走的 `.mjs` 文件，确认保留 `EXPERIMENT.md` + `nodes-workflow-fsm/`
- [ ] **停**：运行 workflow-fsm 单元测试 + workflow-fsm 3 个 playbook → 全部 PASS，人工确认后再继续

## 8. 升级 schema/contracts/queue.mjs

- [ ] 8.1 基于 `DPT_FRAMEWORK/engine/queue-manager.mjs` 中已验证的 `QueueItemSchema` 定义 `QueueWorkUnitSchema`（包含 work_id, title, target, action, producer_rule, priority_class, required_receipts, completion_receipt, failure_route, writes_to, status, payload 等字段）@impl SCO-009
- [ ] 8.2 将 5 个 active window 槽位从 `z.null()` 改为 `QueueWorkUnitSchema.nullable()`，`refill_pool` 从 `z.array(z.unknown())` 改为 `z.array(QueueWorkUnitSchema)` @impl SCO-009
- [ ] 8.3 验证 `validate-bundle.mjs` 对现有 skeleton `rb_queue.json`（全部 null 槽位）仍 PASS（向后兼容）

## 9. 收尾清理

- [ ] 9.1 检查 6 个 prototype 目录：确认已移除所有 `.mjs` 文件，只保留 `EXPERIMENT.md`、`nodes-*/`、以及仍需要的 `package.json`
- [ ] 9.2 移除不再需要的 `package.json`（目录下无 JS 代码的）

## 10. 全量验证 + Requirement ID 注册

- [ ] 10.1 运行所有 6 个 engine 的单元测试（`node:test`）→ 全部 PASS
- [ ] 10.2 运行 `validate-bundle.mjs` 和 `inspect-bundle.mjs` 验证无回归
- [ ] 10.3 在 `openspec/governance/req-registry.yaml` 注册 FRE-001, FRE-002, TRW-001, TRW-002, EXS-001, EXS-002, SCO-009
- [ ] 10.4 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS
- [ ] 10.5 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS

## 11. Post-Activation 指南清理

- [ ] 11.1 更新 `guidelines/README.md`：将 `dedup-experiments-framework` 涉及的 landed surfaces 从 Proposed/Target 标记为 Current
- [ ] 11.2 检查 `guidelines/command-experiments.md`：移除或修订仅适用于 activation 前的迁移措辞，保留 stable core
- [ ] 11.3 对照 accepted specs 和实际 `DPT_FRAMEWORK/` / `experiments/` 布局，逐项复核 guideline 中所有 target path
- [ ] 11.4 降级或移除与 accepted specs 或 executable implementation 冲突的 target convention

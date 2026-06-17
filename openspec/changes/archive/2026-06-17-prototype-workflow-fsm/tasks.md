# Tasks: prototype-workflow-fsm

## 1. 实验目录和基础文件

- [x] 1.1 创建 `experiments/prototype-workflow-fsm/` 目录和 `package.json`（`"type": "module"`）
- [x] 1.2 创建 `trace.mjs`，复用 workflow-next API，trace source 前缀使用 `wfsm-` — @impl WFS-001, WFS-002, WFS-003
- [x] 1.3 创建 `workflow-fsm.test.mjs`，使用 `node:test` + `node:assert`
- [x] 1.4 创建 `nodes-workflow-fsm/` 目录，用于存放实验 MD 节点和依赖 MD

## 2. FSM 定义加载与校验 (WFS-001)

- [x] 2.1 定义 `FSMDefinition` Zod schema：`name` + `initial` + `states`（每个 state 有 `on: Record<string, string | null>`）— @impl WFS-001
- [x] 2.2 实现 `loadFSM(path)`：读取 `.fsm.json` 并用 Zod 校验，验证 `initial` 在 `states` 中存在 — @impl WFS-001
- [x] 2.3 实现 `createFSMRuntime(fsm)`：初始化 `currentState: fsm.initial`、`contentCache: Map`、`receipts: []`、`executionLog: []` — @impl WFS-001
- [x] 2.4 验证 `loadFSM()` 不读取任何 MD 文件，runtime content cache 初始为空 — @impl WFS-001

## 3. Transition 机制 (WFS-002)

- [x] 3.1 实现 `resolveTransition(fsm, currentNode, status)`：查 FSM 表，返回 `{ action: 'advance'|'complete'|'halt', next?, reason? }` — @impl WFS-002
- [x] 3.2 支持三种转移结果：advance（目标为 string）、complete（目标为 null）、halt（currentNode 或 status 无匹配）— @impl WFS-002
- [x] 3.3 transition 调用写入 receipt（type: 'transition'，含 currentNode 和 status）— @impl WFS-002

## 4. MD 节点加载与执行 (复用 workflow-next 语义)

- [x] 4.1 从 workflow-next 复用 `nodePath()`、`parseFrontmatter()`、`readMarkdownFile()`、`resolveDependencyClosure()` — @impl WFS-003
- [x] 4.2 实现 `loadAndExecuteNode(nodeRef, state, runtime)`：解析依赖闭包 → 执行依赖 → 执行目标节点 → 读取 transition 结果 — @impl WFS-003
- [x] 4.3 VM 沙箱注入 `transition(currentNode, status)` 函数、`state`、`console` — @impl WFS-002, WFS-003
- [x] 4.4 沙箱中无代码块时记录 `no_code_block` receipt，不抛错 — @impl WFS-003

## 5. runFSM 运行循环 (WFS-003)

- [x] 5.1 实现 `runFSM(fsm, state, runtime)`：从 `fsm.initial` 开始循环执行节点 → 读 transition → advance/retry/complete/halt — @impl WFS-003
- [x] 5.2 支持 self-loop retry（当前节点 error → 重试当前节点）— @impl WFS-003
- [x] 5.3 支持 complete 终止（transition target 为 null）— @impl WFS-003
- [x] 5.4 支持 halt 终止（无匹配转移规则），返回 reason — @impl WFS-003
- [x] 5.5 依赖解析失败（missing/cycle/malformed）时 halt，cursor 不前进 — @impl WFS-003
- [x] 5.6 `maxIterations` 参数（默认 100）防止自环死循环 — @impl WFS-003
- [x] 5.7 实现 `Machine` 类：自知的声明式实例，封装 fsm + state + runtime — @impl WFS-003
- [x] 5.8 实现 `Machine.step()`：原子推进——loadAndExecuteNode → resolveTransition → 更新内部状态 — @impl WFS-003
- [x] 5.9 实现 `Machine.run()`：step 循环直到终止或超限，返回 outcome — @impl WFS-003
- [x] 5.10 实现声明式 getter：`current`、`outcome`、`canAdvance`、`isComplete`、`isHalted`、`receipts`、`iterations`、`haltReason` — @impl WFS-003
- [x] 5.11 实现 `createMachine(pathOrDef, initialState)` 工厂函数 — @impl WFS-003

## 6. 实验 Fixtures

- [x] 6.1 创建 simple 链 FSM：`wave-entry.md → wave-audit.md → wave-final.md → null` — @impl WFS-001
- [x] 6.2 创建 retry 场景 FSM：节点 error → self，success → next — @impl WFS-002
- [x] 6.3 创建 halt 场景 FSM：节点返回未定义 status — @impl WFS-002
- [x] 6.4 创建 simple 节点 MD：`wave-entry.md`、`wave-audit.md`、`wave-final.md`，每个末尾调用 `transition()` — @impl WFS-003
- [x] 6.5 创建 retry 节点 MD：第一次执行返回 error，第二次返回 success（用 counter 控制）— @impl WFS-002
- [x] 6.6 创建 dependency chain MD：chain-entry → chain-context → chain-policy（验证依赖优先执行）— @impl WFS-003

## 7. 单元测试 (node:test)

- [x] 7.1 测试 FSM loading：valid FSM、invalid initial、empty states — @impl WFS-001
- [x] 7.2 测试 resolveTransition：advance、complete、halt（unknown status）、halt（unknown node）— @impl WFS-002
- [x] 7.3 测试 runFSM 简单链：3 节点顺序执行，outcome 为 complete，executionOrder 正确 — @impl WFS-003
- [x] 7.4 测试 runFSM retry 场景：error 后重试成功，节点执行 2 次 — @impl WFS-002, WFS-003
- [x] 7.5 测试 runFSM halt 场景：未知 status 导致 halt — @impl WFS-002, WFS-003
- [x] 7.6 测试依赖解析：chain dependency 按 policy → context → entry 顺序执行 — @impl WFS-003
- [x] 7.7 测试内容缓存/执行分离：shared-lib 首次 file_read + file_executed，二次 cache_hit + file_executed — @impl WFS-003
- [x] 7.8 测试 missing dependency 导致 halt — @impl WFS-003
- [x] 7.9 测试 cycle dependency 导致 halt — @impl WFS-003
- [x] 7.10 测试 runtime.currentState 在 advance 和 retry 后正确更新 — @impl WFS-003
- [x] 7.11 测试 maxIterations guard 在超过限制时 halt — @impl WFS-003
- [x] 7.12 测试 Machine 初始化：current、outcome、canAdvance、isComplete、receipts 初始值 — @impl WFS-003
- [x] 7.13 测试 Machine.step() 链式推进：3 节点逐一 step 后 isComplete — @impl WFS-003
- [x] 7.14 测试 Machine.run() 自动跑到底返回 outcome — @impl WFS-003
- [x] 7.15 测试 Machine retry 自环：step() 后 current 不变，counter 递增 — @impl WFS-003
- [x] 7.16 测试 Machine halt：未定义 status → outcome='halted'，haltReason 有效 — @impl WFS-003
- [x] 7.17 测试 Machine.run(maxIterations) 超限 halt — @impl WFS-003
- [x] 7.18 测试 Machine.step() 在 complete 后为 no-op — @impl WFS-003

## 8. Agent 辅助测试 Playbook

- [x] 8.1 创建 `DPT_FRAMEWORK/command_experiments/exp_workflow-fsm/test-simple.md`：验证 FSM 链式推进，3 节点全部执行，outcome complete
- [x] 8.2 创建 `DPT_FRAMEWORK/command_experiments/exp_workflow-fsm/test-medium.md`：验证 retry 自环 + cache hit 重新执行
- [x] 8.3 创建 `DPT_FRAMEWORK/command_experiments/exp_workflow-fsm/test-complex.md`：验证 halt 场景 + missing/cycle 错误 + 恢复
- [x] 8.4 三个 playbook 使用独立 disposable bundle：`dpt_disp_wfsm_simple/`、`dpt_disp_wfsm_medium/`、`dpt_disp_wfsm_complex/`
- [x] 8.5 三个 playbook 使用独立 trace：`_trace_wfsm_simple.jsonl`、`_trace_wfsm_medium.jsonl`、`_trace_wfsm_complex.jsonl`

## 9. 文档、结论和需求追踪

- [x] 9.1 写 `EXPERIMENT.md`：记录实验目的、运行结果、FSM vs Next 对比、未解决问题 — @impl WFS-003
- [x] 9.2 更新 `openspec/governance/req-registry.yaml`：注册 WFS-001, WFS-002, WFS-003
- [x] 9.3 运行 `node --test experiments/prototype-workflow-fsm/workflow-fsm.test.mjs` — 全部通过
- [x] 9.4 运行 `node openspec/governance/check-project-reqs.mjs`，确保项目级 req ID 无重复/未注册/orphan — PASS
- [x] 9.5 运行 `node openspec/governance/check-project-specs.mjs`，确保 main spec 结构无 delta header / Purpose / Requirements / req 追踪问题 — PASS
- [x] 9.6 运行 `openspec status --change prototype-workflow-fsm`，确认 proposal/design/specs/tasks 完整

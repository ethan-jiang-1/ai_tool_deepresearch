# Tasks: prototype-workflow-next

## 1. 实验目录和基础文件

- [x] 1.1 创建 `experiments/prototype-workflow-next/` 目录和 `package.json`（`"type": "module"`）
- [x] 1.2 创建 `workflow-next.mjs`，定义 single-entry loader 模块并标注 `// @impl WML-001, WDM-001, WMD-001, WLO-001`
- [x] 1.3 创建 `trace.mjs`，复用 gate-loop/gate-fork API，trace source 前缀使用 `wl-` — @impl WLO-001, AGT-004
- [x] 1.4 创建 `workflow-next.test.mjs`，使用 `node:test` + `node:assert`
- [x] 1.5 创建 `nodes-workflow-next/` 目录，用于存放实验 MD entry 和依赖 MD

## 2. Single-entry Runtime (WML-001)

- [x] 2.1 移除 `WorkflowManifest` / `workflow.json` / `steps[]` / `cursor` 语义 — @impl WML-001
- [x] 2.2 实现 `createWorkflowRuntime()`：初始化 `contentCache: Map`、`executionLog: []`、`receipts: []` — @impl WML-001, WLO-001
- [x] 2.3 验证 runtime 创建不读取任何 MD，runtime content cache 初始为空 — @impl WML-001

## 3. Markdown 文件读取与 Frontmatter (WDM-001, WMD-001)

- [x] 3.1 实现 `nodePath(fileRef)`：只解析到 `nodes-workflow-next/` 内部，不支持任意外部路径或嵌套路径 — @impl WDM-001
- [x] 3.2 定义 `NodeFrontmatter` Zod schema：`requires: string[] = []` — @impl WMD-001
- [x] 3.3 实现 `parseFrontmatter(md)`：正则提取开头 `---` block，然后 `JSON.parse()`；无 frontmatter 返回空依赖 — @impl WMD-001
- [x] 3.4 实现 `readMarkdownFile(fileRef, runtime)`：首次读取并缓存 `{ md, frontmatter }`，再次读取记录 cache hit — @impl WDM-001, WLO-001
- [x] 3.5 实现 file read / cache hit receipts — @impl WLO-001

## 4. Dependency Closure 解析 (WMD-001)

- [x] 4.1 实现 `resolveDependencyClosure(fileRef, runtime)`：DFS 解析 `requires`，输出依赖优先 plan — @impl WMD-001
- [x] 4.2 实现同层依赖按 `requires` 声明顺序稳定解析 — @impl WMD-001
- [x] 4.3 实现单次 closure 内去重：菱形依赖 shared file 只进入 plan 一次 — @impl WMD-001
- [x] 4.4 实现 missing dependency 错误：错误包含缺失 fileRef 和 requester fileRef — @impl WMD-001
- [x] 4.5 实现 cycle 错误：错误包含 cycle path（如 `a.md -> b.md -> a.md`）— @impl WMD-001
- [x] 4.6 确保 dependency resolution 失败时不执行任何 MD — @impl WMD-001

## 5. Single-entry Load 和执行语义 (WDM-001, WLO-001)

- [x] 5.1 实现 `executeMarkdownFile(fileRef, state, runtime)`：执行 MD 中受控 JS code block，记录 `executionLog` — @impl WDM-001, WLO-001
- [x] 5.2 实现 `executeLoadPlan(plan, state, runtime)`：按 plan 顺序执行，每个 fileRef 都记录 `file_executed` — @impl WDM-001, WLO-001
- [x] 5.3 实现 `loadNextMarkdown(fileRef, state, runtime)`：加载调用方显式选择的一个 entry MD closure — @impl WML-001, WDM-001
- [x] 5.4 成功 load 后返回 `{ status: 'loaded', state, runtime, plan }` — @impl WDM-001
- [x] 5.5 失败时返回 `{ status: 'error', state, runtime, error }`，不执行任何 MD，并记录 `load_error` — @impl WMD-001, WLO-001

## 6. 实验 MD Fixtures

- [x] 6.1 创建 self-contained entry MD：无依赖，用于验证 entry 被请求时才加载 — @impl WDM-001
- [x] 6.2 创建 chain dependency MD：`entry -> context -> policy`，用于验证依赖优先顺序 — @impl WMD-001
- [x] 6.3 创建 diamond dependency MD：`entry -> a,b -> shared`，用于验证单次 closure 去重 — @impl WMD-001
- [x] 6.4 创建 repeated dependency 场景：后续 explicit load 再次引用已缓存 MD，用于验证 cache hit + 重新执行 — @impl WDM-001
- [x] 6.5 创建 missing/cycle/malformed 专用 MD fixtures，用于错误路径测试 — @impl WMD-001
- [x] 6.6 每个 MD 文件 frontmatter 添加 `req:` 标注，正文说明该文件在实验中的角色

## 7. 单元测试 (node:test)

- [x] 7.1 测试 runtime 初始化：无 manifest/cursor、cache 初始为空 — @impl WML-001
- [x] 7.2 测试 self-contained entry dynamic load：调用 `loadNextMarkdown('wave-entry.md')` 才加载并执行该 entry — @impl WDM-001
- [x] 7.3 测试多个 entry 由调用方显式选择，无 cursor 语义 — @impl WDM-001
- [x] 7.4 测试 dependency-first chain：执行顺序为 `policy.md`, `context.md`, `entry.md` — @impl WMD-001
- [x] 7.5 测试 diamond dependency：shared dependency 在同一次 load graph 中只执行一次 — @impl WMD-001
- [x] 7.6 测试 cache visibility：第二次引用已读 MD 时记录 cache hit，但仍记录新的 file_executed — @impl WDM-001, WLO-001
- [x] 7.7 测试 missing dependency：错误包含 missing file 和 requester，不执行任何文件 — @impl WMD-001
- [x] 7.8 测试 cycle dependency：错误包含 cycle path，不执行任何文件 — @impl WMD-001
- [x] 7.9 测试 malformed frontmatter：返回 error，不执行任何文件 — @impl WMD-001
- [x] 7.10 测试 no-code-block：记录 no_code_block 且 load 成功 — @impl WDM-001
- [x] 7.11 测试 path traversal / absolute / nested path rejected — @impl WDM-001
- [x] 7.12 测试 observability：成功和失败路径都产生预期 receipts — @impl WLO-001

## 8. Agent 辅助测试 Playbook (AGT-004)

- [x] 8.1 更新 `DPT_FRAMEWORK/command_experiments/exp_workflow-next/test-simple.md`：验证 self-contained entry explicit load — @impl AGT-004
- [x] 8.2 更新 `DPT_FRAMEWORK/command_experiments/exp_workflow-next/test-medium.md`：验证 dependency-first、cache hit + 重新执行 — @impl AGT-004
- [x] 8.3 更新 `DPT_FRAMEWORK/command_experiments/exp_workflow-next/test-complex.md`：验证 missing/cycle/malformed 错误、无执行、同 runtime recovery — @impl AGT-004
- [x] 8.4 三个 playbook 使用独立 bundle：`dpt_rb_test_wl_simple/`、`dpt_rb_test_wl_medium/`、`dpt_rb_test_wl_complex/` — @impl AGT-004
- [x] 8.5 三个 playbook 使用独立 trace：`_trace_wl_simple.jsonl`、`_trace_wl_medium.jsonl`、`_trace_wl_complex.jsonl` — @impl AGT-004

## 9. 文档、结论和需求追踪

- [x] 9.1 写 `EXPERIMENT.md`：记录实验目的、运行结果、single-entry loader 语义、cache/execute 语义、未解决问题 — @impl WLO-001
- [x] 9.2 更新 `openspec/governance/req-registry.yaml`：同步 WML-001, WDM-001, WLO-001 single-entry 语义
- [x] 9.3 运行 `node --test experiments/prototype-workflow-next/workflow-next.test.mjs`
- [x] 9.4 运行 `node openspec/governance/check-project-reqs.mjs`，确保项目级 req ID 无重复/未注册/orphan
- [x] 9.5 运行 `node openspec/governance/check-project-specs.mjs`，确保 main spec 结构无 delta header / Purpose / Requirements / req 追踪问题
- [x] 9.6 运行 `openspec validate prototype-workflow-next --strict`
- [x] 9.7 测试全部通过后清理临时 test bundle 目录：`rm -rf dpt_rb_test_wl_simple/ dpt_rb_test_wl_medium/ dpt_rb_test_wl_complex/`

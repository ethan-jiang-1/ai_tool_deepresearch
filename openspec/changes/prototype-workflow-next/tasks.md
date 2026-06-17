# Tasks: prototype-workflow-load

## 1. 实验目录和基础文件

- [x] 1.1 创建 `experiments/prototype-workflow-load/` 目录和 `package.json`（`"type": "module"`）
- [x] 1.2 创建 `workflow-load.mjs`，定义实验模块骨架并标注 `// @impl WML-001, WDM-001, WMD-001, WLO-001`
- [x] 1.3 创建 `trace.mjs`，复用 gate-loop/gate-fork API，trace source 前缀使用 `wl-` — @impl WLO-001, AGT-004
- [x] 1.4 创建 `workflow-load.test.mjs`，使用 `node:test` + `node:assert`
- [x] 1.5 创建 `segments-workflow-load/` 目录，用于存放实验 MD step 和依赖 MD

## 2. Workflow Manifest 和 Runtime (WML-001)

- [x] 2.1 定义 `WorkflowManifest` Zod schema：`name` + 非空 `steps: string[]` — @impl WML-001
- [x] 2.2 实现 `loadWorkflowManifest(path)`：读取 `workflow.json` 并用 Zod 校验，保留 step 顺序 — @impl WML-001
- [x] 2.3 实现 `createWorkflowRuntime(manifest)`：初始化 `cursor: 0`、`contentCache: Map`、`executionLog: []`、`receipts: []` — @impl WML-001, WLO-001
- [x] 2.4 验证 manifest load 不读取任何 step MD，runtime content cache 初始为空 — @impl WML-001

## 3. Markdown 文件读取与 Frontmatter (WDM-001, WMD-001)

- [x] 3.1 实现 `segmentPath(fileRef)`：只解析到 `segments-workflow-load/` 内部，不支持任意外部路径 — @impl WDM-001
- [x] 3.2 定义 `SegmentFrontmatter` Zod schema：`requires: string[] = []` — @impl WMD-001
- [x] 3.3 实现 `parseFrontmatter(md)`：正则提取开头 `---` block，然后 `JSON.parse()`；无 frontmatter 返回空依赖 — @impl WMD-001
- [x] 3.4 实现 `readMarkdownFile(fileRef, runtime)`：首次读取并缓存 `{ md, frontmatter }`，再次读取记录 cache hit — @impl WDM-001, WLO-001
- [x] 3.5 实现 file read / cache hit receipts 和 trace events — @impl WLO-001

## 4. Dependency Closure 解析 (WMD-001)

- [x] 4.1 实现 `resolveDependencyClosure(fileRef, runtime)`：DFS 解析 `requires`，输出依赖优先 plan — @impl WMD-001
- [x] 4.2 实现同层依赖按 `requires` 声明顺序稳定解析 — @impl WMD-001
- [x] 4.3 实现单次 closure 内去重：菱形依赖 shared file 只进入 plan 一次 — @impl WMD-001
- [x] 4.4 实现 missing dependency 错误：错误包含缺失 fileRef 和 requester fileRef — @impl WMD-001
- [x] 4.5 实现 cycle 错误：错误包含 cycle path（如 `a.md -> b.md -> a.md`）— @impl WMD-001
- [x] 4.6 确保 dependency resolution 失败时不执行任何 MD — @impl WMD-001

## 5. Advance 和执行语义 (WDM-001, WLO-001)

- [x] 5.1 实现 `executeMarkdownFile(fileRef, state, runtime)`：执行 MD 中受控 JS code block，记录 `executionLog` — @impl WDM-001, WLO-001
- [x] 5.2 实现 `executeLoadPlan(plan, state, runtime)`：按 plan 顺序执行，每个 fileRef 都记录 `file_executed` — @impl WDM-001, WLO-001
- [x] 5.3 实现 `advanceWorkflow(state, runtime)`：cursor 指向当前 step，一次只推进一个 step — @impl WDM-001
- [x] 5.4 成功 advance 后 cursor 只增加 1，返回 `{ status: 'advanced', state, plan }` — @impl WDM-001
- [x] 5.5 workflow 完成后返回 `{ status: 'complete' }`，不读取或执行任何新文件 — @impl WDM-001
- [x] 5.6 失败时返回 `{ status: 'error', error }`，cursor 不前进，并记录 `load_error` — @impl WMD-001, WLO-001

## 6. 实验 MD 和 Manifest Fixture

- [x] 6.1 创建 `workflow.json`：至少包含 3 个 step，用于验证 step-by-step dynamic load — @impl WML-001
- [x] 6.2 创建 simple step MD：无依赖，用于验证当前 step 才加载 — @impl WDM-001
- [x] 6.3 创建 chain dependency MD：`entry -> context -> policy`，用于验证依赖优先顺序 — @impl WMD-001
- [x] 6.4 创建 diamond dependency MD：`entry -> a,b -> shared`，用于验证单次 closure 去重 — @impl WMD-001
- [x] 6.5 创建 repeated dependency 场景：后续 step 再次引用已缓存 MD，用于验证 cache hit + 重新执行 — @impl WDM-001
- [x] 6.6 创建 missing/cycle 专用 MD fixtures，用于错误路径测试 — @impl WMD-001
- [x] 6.7 每个 MD 文件 frontmatter 添加 `req:` 标注，正文说明该文件在实验中的角色

## 7. 单元测试 (node:test)

- [x] 7.1 测试 manifest loading：step 顺序保留、invalid manifest rejected、runtime cache 初始为空 — @impl WML-001
- [x] 7.2 测试 step-by-step dynamic load：第一次 advance 只加载第一个 step，第二次 advance 才加载第二个 step — @impl WDM-001
- [x] 7.3 测试 dependency-first chain：执行顺序为 `policy.md`, `context.md`, `entry.md` — @impl WMD-001
- [x] 7.4 测试 diamond dependency：shared dependency 在同一次 advance 中只执行一次 — @impl WMD-001
- [x] 7.5 测试 cache visibility：第二次引用已读 MD 时记录 cache hit，但仍记录新的 file_executed — @impl WDM-001, WLO-001
- [x] 7.6 测试 missing dependency：错误包含 missing file 和 requester，cursor 不前进，不执行任何文件 — @impl WMD-001
- [x] 7.7 测试 cycle dependency：错误包含 cycle path，cursor 不前进，不执行任何文件 — @impl WMD-001
- [x] 7.8 测试 complete：cursor 到末尾后返回 complete 且无新 read/execute receipt — @impl WDM-001
- [x] 7.9 测试 observability：成功和失败路径都产生预期 receipts / trace events — @impl WLO-001

## 8. Agent 辅助测试 Playbook (AGT-004)

- [x] 8.1 创建 `DPT_FRAMEWORK/command_experiments/workflow-load/test-simple.md`：验证 manifest load 不预读 step，advance 后动态加载一个 step — @impl AGT-004
- [x] 8.2 创建 `DPT_FRAMEWORK/command_experiments/workflow-load/test-medium.md`：验证 dependency-first、cache hit + 重新执行 — @impl AGT-004
- [x] 8.3 创建 `DPT_FRAMEWORK/command_experiments/workflow-load/test-complex.md`：验证 missing/cycle 错误、cursor 不前进、修正后可继续成功 advance — @impl AGT-004
- [x] 8.4 三个 playbook 使用独立 bundle：`dpt_rb_test_wl_simple/`、`dpt_rb_test_wl_medium/`、`dpt_rb_test_wl_complex/` — @impl AGT-004
- [x] 8.5 三个 playbook 使用独立 trace：`_trace_wl_simple.jsonl`、`_trace_wl_medium.jsonl`、`_trace_wl_complex.jsonl` — @impl AGT-004

## 9. 文档、结论和需求追踪

- [x] 9.1 写 `EXPERIMENT.md`：记录实验目的、运行结果、动态加载观察、cache/execute 语义、未解决问题 — @impl WLO-001
- [x] 9.2 更新 `openspec/governance/req-registry.yaml`：注册 WML-001, WDM-001, WMD-001, WLO-001, AGT-004
- [x] 9.3 运行 `node --test experiments/prototype-workflow-load/workflow-load.test.mjs`
- [x] 9.4 运行 `node openspec/governance/check-project-reqs.mjs`，确保项目级 req ID 无重复/未注册/orphan
- [x] 9.5 运行 `node openspec/governance/check-project-specs.mjs`，确保 main spec 结构无 delta header / Purpose / Requirements / req 追踪问题
- [x] 9.6 运行 `openspec status --change prototype-workflow-load`，确认 proposal/design/specs/tasks 完整
- [x] 9.7 测试全部通过后清理临时 test bundle 目录：`rm -rf dpt_rb_test_wl_simple/ dpt_rb_test_wl_medium/ dpt_rb_test_wl_complex/`

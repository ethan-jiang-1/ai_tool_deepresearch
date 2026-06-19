## 1. 修改 workflow-chain.mjs — 去掉 VM 沙箱

- [x] 1.1 去掉 `node:vm` import、`CODE_BLOCK_RE` 正则、`vm.Script`/`vm.createContext`/`runInContext` 相关代码
- [x] 1.2 重写 `loadMarkdownFile()`（原 `executeMarkdownFile`）：不再搜索和执行 code block——验证 fileRef 在 contentCache 中 + 返回 entry（`{ md, frontmatter }`）。无 code block 不再 emit `no_code_block`（这是正常情况）。emit `file_loaded` 替代 `file_executed`
- [x] 1.3 更新 `executeLoadPlan(plan, state, runtime, trace)`：遍历 plan，每次调用 `loadMarkdownFile`。Engine 在每次成功加载时写入 `state.executionOrder.push(fileRef)` 和 `state.counters[fileRef] = (state.counters[fileRef] || 0) + 1`，替代原来 VM code block 写入。返回 final state（保持原返回类型）
- [x] 1.4 更新 `assessNode()`：适配新的 `executeLoadPlan`（仍返回 state，不需要改签名）。去掉 VM 执行相关注释
- [x] 1.5 更新文件头注释：去掉 VM 沙箱描述，更新 pipeline 图，注明 "MD content is Agent-readable — Engine does NOT execute code blocks"
- [x] 1.6 重命名 `executeMarkdownFile` → `loadMarkdownFile`：函数不再执行任何代码，`load` 准确描述其行为（cache → Agent）

## 2. 更新回归测试

- [x] 2.1 更新测试中的 state 断言：将 `executionOrder`/`counters` 相关断言从 "VM code block 写入" 改为 "Engine 加载时写入"（仍检查 `executionOrder` 顺序和 `counters` 计数，但语义变为 load 而非 execute，key 变为 fileRef）
- [x] 2.2 删除：`file_executed` trace event 断言 → 替换为 `file_loaded`；`no_code_block` 测试 → 改为 "MD without code block loads normally"；VM sandbox error 测试
- [x] 2.3 保留并更新：frontmatter 解析测试、依赖闭包测试（chain/diamond/cycle/missing）、runtime 初始化测试、cache vs re-load 测试、trace receipt 测试、路径遍历拒绝测试
- [x] 2.4 新增测试：`loadMarkdownFile` 返回 entry 而非执行 code block、`executeLoadPlan` 由 Engine 写入 state.executionOrder 和 state.counters

## 3. 验证

- [x] 3.1 运行 `node --test tests/engine/workflow-chain.test.mjs` — 全部 PASS
- [x] 3.2 运行 `node --test tests/engine/` — 全部 PASS（159/159，含 workflow-fsm 等无关联 engine）
- [x] 3.3 运行 `node openspec/governance/check-project-reqs.mjs` — PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
- [x] 3.4 运行 `node openspec/governance/check-project-specs.mjs` — PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）

## 4. 同步 E2E playbook

- [x] 4.1 `test-simple-lazy-load.md`：`counters.wave` → `counters['wave.entry.md']`；`file_executed` → `file_loaded`；`md:executed` trace check → `file_loaded` trace check；case_goal 去"执行"
- [x] 4.2 `test-medium-dep-cache.md`：`file_executed` → `file_loaded`；`counters.sharedLib` → `counters['shared-lib.dep.md']`；变量名 `execs` → `loads`；step 名 `executed_twice` → `loaded_twice`；case_goal/描述去"执行"
- [x] 4.3 `test-complex-error-paths.md`：`file_executed` → `file_loaded`；变量名 `newExecs` → `newLoads`；step 名 `no_execution` → `no_load`；`counters.wave` → `counters['wave.entry.md']`；step 名 `entry_executed` → `entry_loaded`

## 5. 清理 prototype 噪声

- [x] 5.1 更新 prototype 节点 Role in Experiment 注释：`执行`→`加载`、`file_executed`→`file_loaded`、`read/execute`→`read/load`、`loadNextMarkdown`→`assessNode`（14 个文件）
- [x] 5.2 删除 prototype 节点中的 JS code block：VM 死代码无意义，留之误导（18 个文件）
- [x] 5.3 更新 `EXPERIMENT.md`：全文对齐新模型——API 名、trace event 名、cache 语义、去掉"VM 沙箱""未解决问题"等过时段落

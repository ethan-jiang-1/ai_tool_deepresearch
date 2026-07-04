## 1. Transition Entry CLI

- [ ] 1.1 实现 CPT-003: 新增 `DPT_FRAMEWORK/cli/enter-phase.mjs`，支持 `--bundle <path>`、`--node <fileRef>`，调用 `assessNode()` 并绑定 bundle `rb_trace.jsonl`。
- [ ] 1.2 实现 CPT-003: `enter-phase` 按 dependency closure plan 顺序渲染 Agent-readable Markdown 到 stdout，包含 `assessNode()` 注入的 autonomous/terminal header，供 Phase Agent 读入 conversation context 后继续执行。
- [ ] 1.3 实现 CPT-003: `enter-phase` 不修改 `rb_status.json`、不运行 gate、不选择 routing、不驱动 lifecycle loop、不执行 Markdown 指令；缺少 `--bundle`、`--node`、bundle 或 node 不存在时以 JSON/可诊断错误退出。

## 2. Status And Handoff Preconditions

- [ ] 2.1 实现 CPT-004: 为 `advance-status.mjs` 增加 trace reader，写 status 前验证相关 `gate_attempt(passed=true)` 存在。
- [ ] 2.2 实现 CPT-004: `advance-status` 对缺少 phase entry witness 的非初始 lifecycle handoff fail closed，输出 `status:"error"`、`reason`、`advice[]`，且不写 `rb_status.json` 或 `phase_transition`。
- [ ] 2.3 实现 GSK-007: 在 gate helper 中新增 shared lifecycle handoff preflight，基于 `manifest.json` 和 `transitions.chain.json` 推导 prior deterministic edge 与当前 node `load_complete` witness。
- [ ] 2.4 实现 GSK-007: 将 shared handoff preflight 接入所有适用 lifecycle gate CLI；instantiation 入口例外，HITL/rerun deterministic branch 不得由 helper 自行选择 route。
- [ ] 2.5 实现 GSK-007: preflight failure 作为普通 gate failure 返回 inspect/advice，不改变 router、transition table 或 gate-specific content rules。

## 3. Gate Diagnostics And Friction Reduction

- [ ] 3.1 实现 GSK-008: 从 trace/diagnostic artifacts 计算 Engine-derived `attempt_count`，保留 `--attempt` 作为兼容 hint 但不作为 authoritative count。
- [ ] 3.2 实现 GSK-008: 计算 cross-attempt delta diagnostics：`newly_passing`、`still_failing`、`regressed`、`attempt_trend`。
- [ ] 3.3 实现 GSK-008: 高 attempt gate pass 时输出 positive continuation advice，要求消费 `check.next` through `enter-phase`，并说明 final report 在 `phase-final` 交付。
- [ ] 3.4 实现 GSK-008: 为 Wave0 schema/parse 上游失败添加 cascade-mask diagnostics；masked diagnostics 仅用于解释，不改变 pass/fail truth。

## 4. Workflow Control Surface

- [ ] 4.1 实现 WNC-010: 更新 deterministic lifecycle phase 的 On Gate Pass 文案，要求读取 `check.next` 后运行 `enter-phase --bundle <path> --node <check.next>` 并从渲染内容继续。
- [ ] 4.2 实现 WNC-010: 移除或改写把 `advance-status` 表述为“进入/加载下一 phase”的 wording；保留其 status synchronization 角色。
- [ ] 4.3 实现 SWE-003: 在 `shared-silent-execution.md` 增加 “Why Continue”/positive continuation section，明确 final delivery 在 Final，提前 chat synthesis 不合法且更不有用。

## 5. Regression Tests

- [ ] 5.1 验证 CPT-003: 添加 `enter-phase` CLI 测试，断言 `load_complete` 写入 trace、header 渲染到 stdout、`rb_status.json` 未修改。
- [ ] 5.2 验证 CPT-004: 添加 `advance-status` 测试，覆盖缺少 gate pass、缺少 `load_complete`、witness 完整后三种路径。
- [ ] 5.3 验证 GSK-007: 添加 gate preflight 测试，覆盖 Wave1/Wave2 缺 prior pass、缺 current `load_complete`、witness 完整后继续正常 rules。
- [ ] 5.4 验证 GSK-007: 添加 wiring validator/regression，断言所有适用 lifecycle gate CLI 调用 shared handoff preflight helper。
- [ ] 5.5 验证 GSK-008: 添加 attempt delta / pass-side fatigue / cascade-mask 单元或集成测试。

## 6. Controlled E2E

- [ ] 6.1 实现 AGT-010: 添加 standard disposable-bundle E2E playbook，构造 BUG-020 handoff seam，不 mock gate/status/trace behavior。
- [ ] 6.2 实现 AGT-010: E2E 断言未见证 handoff 的 status/gate touch fail closed，并给出 `enter-phase` remedy。
- [ ] 6.3 实现 AGT-010: E2E 断言运行 `enter-phase` 后产生 `load_complete`，后续 status/gate 操作不再因 handoff witness 缺失失败。
- [ ] 6.4 实现 AGT-010: 如添加 heavy canary，则支持 `NOT RUN` 并明确不得作为 real Agent proof；standard E2E 仍为必跑机制证明。

## 7. Version And Documentation

- [ ] 7.1 更新 version-management: 将 `DPT_FRAMEWORK/CHANGELOG.md` 增加 v0.4 条目，简要说明 phase handoff witnessing、`enter-phase`、gate/status preflight。
- [ ] 7.2 更新 version-management: 将 `DPT_FRAMEWORK/RUN.md` 版本横幅同步到 v0.4，并确保入口说明不再暗示直接手读 phase node 是完整 handoff。
- [ ] 7.3 更新命令索引或运行说明中与 `enter-phase` 相关的 Agent-facing command guidance。

## 8. Final Checks

- [ ] 8.1 运行相关 `node --test` regression suites，记录命令和结果。
- [ ] 8.2 运行 AGT-010 standard E2E playbook，记录 PASS/FAIL；若失败，不得 archive。
- [ ] 8.3 运行 `node openspec/governance/check-project-reqs.mjs`，必须 PASS。
- [ ] 8.4 运行 `node openspec/governance/check-project-specs.mjs`，必须 PASS。
- [ ] 8.5 更新 tasks 勾选状态，仅勾选真实完成且验证过的任务。

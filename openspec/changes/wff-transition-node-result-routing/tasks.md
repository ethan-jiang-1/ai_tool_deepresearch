## 1. Transition routing

- [x] 1.1 实现 TRT-005: node-keyed detailed router，按 `currentNodeRef + outcome + structured context` 解析 `next / terminal / no_transition / invalid_input / config_error`，并保留可下游消费的 routing diagnostics
- [x] 1.2 实现 TRT-001/002/003/004: 迁移 chain/FSM backend 到 node fileRef key，链路只保留纯查表，移除 `askNext(path, gate, state)` 公共 contract，并退役 chain 侧 stateful tracker contract

## 2. Gate CLI

- [x] 2.1 实现 GAS-001 + GSK-004: `--current-node` 绑定校验、规则执行、并通过详细 router 回填 `check.next` 与 `routing`
- [x] 2.2 实现 GSK-002: Gate CLI 输出 `check / routing / inspect / advice` 的稳定 JSON 形状，并明确 `passed=true -> exit(0)`, `passed=false -> exit(1)`, terminal routing 不引入独立 exit code，`no_transition | invalid_input | config_error -> exit(2)`

## 3. Node loading and package validation

- [x] 3.1 实现 DYS-001: loader 解析后将 `{ fileRef, md, frontmatter }` 保留在 runtime cache，并让 `assessNode()` 返回 dependency `plan`
- [x] 3.2 实现 WNC-007: workflow package consistency validator 核心 library entrypoint，覆盖 manifest、frontmatter、gate definitions、transition tables、loader runtime cache / dependency plan
- [x] 3.3 实现 WNC-007: workflow package consistency validator thin CLI wrapper 与 machine-readable report，供治理脚本和测试复用

## 4. FSM contracts

- [x] 4.1 实现 WFS-001/WFS-002: 将 FSM definition 与 transition lookup 分层，definition 负责 schema/load，transition 只负责 node fileRef + `passed` / `failed` 的纯 lookup
- [x] 4.2 实现 WFS-003: Machine / createMachine 仅消费已验证 FSM 定义，并与 node-keyed outcome contract 对齐

## 5. Regression coverage

- [x] 5.1 更新 regression tests，覆盖 node-keyed routing、终态/无转移/无效输入/配置错误四类详细结果，以及 gate CLI 的 `--current-node` 与 `routing` 输出
- [x] 5.2 更新受影响的 workflow fixtures、gate fixtures 和 transition table fixtures，确保示例数据与新 contract 一致
- [x] 5.3 更新受影响的 workflow playbooks / docs，清理 gate-key routing、`success`、`askNext()` 旧叙述，并同步 TRT-005 / GSK-002 / WNC-007 术语
- [x] 5.4 运行受影响的 regression suite（至少包含 `tests/engine/transition-chain.test.mjs`、`tests/engine/transition-fsm.test.mjs`、`tests/engine/workflow-fsm.test.mjs` 和相关 CLI integration tests），确认新 routing / gate contract 在回归层全部通过

## 6. Controlled experiments (`experiments_playbook/`)

- [x] 6.1 跑 `experiments_playbook/exp_workflow-chain/test-simple-lazy-load.md`、`test-medium-dep-cache.md`、`test-complex-error-paths.md`，确认 loader/runtime cache、dependency plan 和错误恢复都能从 trace 里裁决 — **3/3 PASS**
- [x] **停 6.2**：整理 workflow-chain 受控实验的 pass/fail、trace 路径和需要返工的点 — **无需返工，全通过**
- [x] 6.3 跑 `experiments_playbook/exp_workflow-fsm/test-simple-define-advance.md`、`test-medium-retry-halt.md`、`test-complex-halt-recovery.md`，确认 node-keyed FSM definition、transition lookup、runtime halt/recovery 的语义闭环 — **3/3 PASS**
- [x] **停 6.4**：整理 FSM 受控实验的 pass/fail、trace 路径和 contract 疑点 — **无需返工，全通过**
- [x] 6.5 跑 `experiments_playbook/exp_wff_validation/test-simple-happy-path.md`、`test-medium-fail-repair.md`、`test-complex-routing-contract.md`，确认 `current-node` 路由、`check.next`、`routing.kind` 和 repair loop 语义都对齐 — **3/3 PASS**
- [x] 6.6 全量 cross-check：18 个 light playbook 全部通过（gate-fork×3, gate-loop×3, workflow-fsm×3, workflow-chain×3, agentic-queue×3, wff_validation×3），确认旧 gate 路径与新 routing contract 无交叉污染
- [x] **停 6.7**：输出 change-level 实验报告 — **18/18 PASS, 0 FAIL, 0 返工**

## 7. Governance checks

- [x] 7.1 运行 `node openspec/governance/check-project-reqs.mjs`，要求 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired
- [x] 7.2 运行 `node openspec/governance/check-project-specs.mjs`，要求 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader

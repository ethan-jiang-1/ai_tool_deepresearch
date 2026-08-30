# Tasks: prove-entry-selection-at-canonical-source

## 1. Planning 收尾（apply 前；目标文件保持不动）

- [x] 1.1 创建 `verification-plan.yaml`：`integration` 必选；`unit` / `deterministic_e2e` / `agent_flow_e2e` 为 not_applicable。claim 覆盖 RUE-006 canonical 锁、三份入口回归改证明、ACR Brief/Routing 指针、伴随非选择树回归。运行 `node openspec/governance/check-verification-routing.mjs --change prove-entry-selection-at-canonical-source --mode plan` 必须 PASS（@impl RUE-006, ACR-004）
- [x] 1.2 确认 `semantic-closure.yaml` 为 `not_applicable` 且 reason 非空；运行 `node openspec/governance/check-semantic-closure.mjs --change prove-entry-selection-at-canonical-source --mode plan` 必须 PASS
- [x] 1.3 运行 `node openspec/governance/check-project-reqs.mjs --mode plan` 必须 PASS（无 New capability、无新 ID、无 reservation）
- [x] 1.4 `openspec-feedback:plan-review` — 通读 proposal、RUE/ACR delta、design、tasks、verification-plan、semantic-closure；核对：Brief 三行过程保留、决策树不改、证明改为 canonical 全文 + 指针非复述、不改 Engine / phase / `CONTEXT.md`。finding 转普通未完成 task。Done：无未决 finding 且 plan-mode 治理检查绿（@impl RUE-006, ACR-002, ACR-004）

## 2. 指针散文（@impl RUE-006, ACR-002）

- [x] 2.1 改根 `AGENTS.md`：`## Deep Research Routing` 收成真指针（`continue-run-bundle.md`、`Entry Selection (canonical)`、`unsupported_current_entry_contract`），删除程序复述。Execution Brief 三行表、Hard Rules（含 `current run bundle root` / bare-path）、Do Not Read、OpenSpec 表、`invariants-brief` 指向保留。只改 `AGENTS.md`。Done：Routing 无 pair-preflight / 无 candidate 才读 RUN / 扫描不选 run 的复述；`CLAUDE.md` 仍是 symlink
- [x] 2.2 改 `DEEP_RESEARCH_HARNESS/AGENTS.md`：研究支只写打开 canonical 节或 `RUN.md`，点名 `unsupported_current_entry_contract`；删除 preflight / fallback 说明文。改行为支、共享上下文、Must Read 标题保留。Done：无第二棵选择树；Harness `CLAUDE.md` 仍是 symlink
- [x] 2.3 改 `DEEP_RESEARCH_HARNESS/README.md` `## 触发规则`：保留意图触发与非研究 carve-out；选择规则改为指向 canonical。不删 `> **最快触发**` 与该 heading
- [x] 2.4 改 `DEEP_RESEARCH_HARNESS/COMMANDS.md` 与 `command_playbook/start-research.md` 的入口句为真指针；`RUN.md` 只改选择指针句，不动 §0 捷径禁令与恢复表
- [x] 2.5 改 `openspec/guidance/models/invariants-brief.md` 第 9 条为指向 canonical 的指针，不再复述决策树（@impl GCO-001 验证面）

## 3. 回归与 spec 同步（@impl RUE-006, ACR-004）

- [x] 3.1 改写 `tests/integration/md/dpt-research-entry-routing-contract.test.mjs`：对 named 指针块（根 Routing、Harness 研究单元格、README 触发规则选择段、RUN Entry Selection 指针段、start-research existing-bundle 句）锁指针三件并 `doesNotMatch` 程序复述；删除「本框架就是项目的 Deep Research 引擎」空转 sync；`RUN.md` §0 与 README 意图/carve-out 断言保留。负向断言不扫 README「第一条」或 RUN reload 段
- [x] 3.2 改写 `tests/integration/md/continue-run-bundle-contract.test.mjs` 第一则：四份行为文件的指针块锁三件、禁止程序复述；第二则 playbook 程序锁不动
- [x] 3.3 改写 `tests/integration/deep-research-harness-entry-contract.test.mjs` routeFiles：不再要求每个文件全文都有 `BUNDLE_ENTRY.md` / `BUNDLE_MAP.md` / `current run bundle root`；对指针块锁三件。playbook 自身锁与 CLI 例保留
- [x] 3.4 把 delta 合并进 `openspec/specs/bundle/run-entry/spec.md` 与 `openspec/specs/agent/agent-context-routing/spec.md`；更新 `openspec/governance/req-registry.yaml` 中 RUE-006 / ACR-002 / ACR-004 描述句。无新 ID
- [x] 3.5 跑 verification-plan 列出的全部 integration asset，必须全绿
- [x] 3.6 改写 `tests/integration/md/harness-entry-doc-consistency.test.mjs` 最后一则：不再要求 Harness AGENTS/CLAUDE 出现 preflight-失败 / 禁止 fallback 句；改为这两份行为文件不得复述这两句。意图触发与 carve-out 两则不动
- [x] 3.7 改写 `tests/integration/md/doc-governance-drift-locks.test.mjs` F-04：不再要求 RUN.md / README 出现中文 anti-fallback 整句；改为该语义只锁在 `Entry Selection (canonical)`，指针面不得复述该句

## 4. 验证与收尾

- [x] 4.1 运行 `node openspec/governance/check-semantic-closure.mjs --change prove-entry-selection-at-canonical-source --mode assets` 与 `node openspec/governance/check-verification-routing.mjs --change prove-entry-selection-at-canonical-source --mode assets` 必须 PASS
- [x] 4.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change prove-entry-selection-at-canonical-source` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
- [x] 4.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
- [x] 4.4 `openspec-feedback:closeout-review` — 审阅本 change diff：指针散文 + 三份入口回归 + main spec/registry；确认未碰 Engine / phase / `CONTEXT.md` / `RUN.md` 恢复表 / Brief 三行过程。Done：无未决 finding 且全部任务完成（@impl RUE-006, ACR-002, ACR-004）

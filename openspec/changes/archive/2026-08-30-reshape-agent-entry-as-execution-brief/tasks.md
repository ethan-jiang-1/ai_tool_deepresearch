# Tasks: reshape-agent-entry-as-execution-brief

## 1. Planning 收尾（apply 前；目标文件保持不动）

- [x] 1.1 核对已有 `verification-plan.yaml` 与 design 决策 7–8、本 tasks 第 3 节一致：`integration` 六条 claim 的 asset 路径存在；`unit` / `deterministic_e2e` / `agent_flow_e2e` 为 not_applicable。运行 `node openspec/governance/check-verification-routing.mjs --change reshape-agent-entry-as-execution-brief --mode plan` 必须 PASS（@impl ACR-002, ACR-004）
- [x] 1.2 确认 `semantic-closure.yaml` 为 `not_applicable` 且 reason 非空；运行 `node openspec/governance/check-semantic-closure.mjs --change reshape-agent-entry-as-execution-brief --mode plan` 必须 PASS
- [x] 1.3 运行 `node openspec/governance/check-project-reqs.mjs --mode plan` 必须 PASS（无 New capability、无新 ID、无 reservation）
- [x] 1.4 `openspec-feedback:plan-review` — 通读 proposal、ACR delta、design、tasks、verification-plan、semantic-closure；核对三行 Brief、短语清单、GCO-008 只改测试定位、不改入口决策树 / Engine。finding 转普通未完成 task。Done：无未决 finding 且 plan-mode 治理检查绿（@impl ACR-002, ACR-004）

## 2. Always-loaded 散文（@impl ACR-002）

- [x] 2.1 重写根 `AGENTS.md`：以 `## 0. Execution Brief` 三行表起笔；退役 `## Before Anything Else`；`## Deep Research Routing` 含 design 决策 8 的英文防错短语及 `current run bundle root` / bare-path 句；Hard Rules / Do Not Read / OpenSpec 表留在 Brief 之后；首屏指向 `invariants-brief.md`。只改 `AGENTS.md`。Done：无 `## Before Anything Else`；Brief 含三支与完成条件；`CLAUDE.md` 仍是 symlink
- [x] 2.2 重写 `DEEP_RESEARCH_HARNESS/AGENTS.md`：以 `## 0. Execution Brief` 起笔；退役 `## ⚡ 第一优先`；`## 共享项目上下文` 按序写出 Charter 与 `CONTEXT.md` 坐标并声明不是 entry、跑研究不必先读；改行为指向根 Brief；含 design 决策 8 的 Harness 短语。只改 `AGENTS.md`。Done：无 `## ⚡ 第一优先`；Harness `CLAUDE.md` 仍是 symlink
- [x] 2.3 更新根 `README.md` `## Start Here`：指向 `AGENTS.md` Execution Brief，不再要求每个实质性任务先 Charter-then-context；保留 scoped-reading 与 on-demand `docs/adr/`
- [x] 2.4 更新 `DEEP_RESEARCH_HARNESS/README.md` 共享项目上下文：保留 non-entry 句；去掉触发前必读 Charter；不改 `> **最快触发**` 与 `## 触发规则（最高优先）` 的入口选择语义；该文件仍含 `BUNDLE_ENTRY.md` / `BUNDLE_MAP.md` / `unsupported_current_entry_contract` / `current run bundle root`

## 3. 回归与 spec 同步（@impl ACR-004）

- [x] 3.1 改写 `tests/integration/md/agent-context-routing-contract.test.mjs`：锁根 Brief 三支、Harness Brief 研究/改行为两支、无 `## Before Anything Else`、无 `## ⚡ 第一优先`、所有权支 Charter 在 CONTEXT 前、Harness 共享上下文 non-entry 且仍按序点名两坐标、README 顺序与 symlink / CONTEXT / ADR 既有断言
- [x] 3.2 改写 `tests/integration/md/project-guidance-topology-contract.test.mjs` 根同步块：从 `## 0. Execution Brief` 抽取并对根 AGENTS/CLAUDE 做对等断言；Harness 仍从 `## 共享项目上下文` 断言 Charter 路径在 CONTEXT 前。其余拓扑断言不动（@impl GCO-008）
- [x] 3.3 跑 verification-plan 列出的全部 integration asset，必须全绿：`agent-context-routing-contract`、`project-guidance-topology-contract`、`dpt-research-entry-routing-contract`、`continue-run-bundle-contract`、`guidance-terminology-pointer-consistency`、`deep-research-harness-entry-contract`。若入口回归因短语漂移变红，只回调 Routing/Harness 研究支短语，不改决策树
- [x] 3.4 把 delta 合并进 `openspec/specs/agent/agent-context-routing/spec.md`；更新 `openspec/governance/req-registry.yaml` 中 ACR-002 / ACR-004 描述句以匹配新过程。无新 ID

## 4. 验证与收尾

- [x] 4.1 跑 `node openspec/governance/check-semantic-closure.mjs --change reshape-agent-entry-as-execution-brief --mode plan` 与 `node openspec/governance/check-verification-routing.mjs --change reshape-agent-entry-as-execution-brief --mode plan` 必须 PASS
- [x] 4.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change reshape-agent-entry-as-execution-brief` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
- [x] 4.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
- [x] 4.4 `openspec-feedback:closeout-review` — 审阅本 change diff：四份散文 + ACR/GCO 回归 + main spec/registry；确认未碰 Engine / phase / `CONTEXT.md` 罗塞塔 / `RUN.md` 恢复表；选定 verification-plan 中的 md 回归证据。Done：无未决 finding 且全部任务完成（@impl ACR-002, ACR-004）

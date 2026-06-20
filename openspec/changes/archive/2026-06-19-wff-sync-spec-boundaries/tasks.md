## 1. Main Spec Sync

- [x] 1.1 实现 SEG-001: 更新 `openspec/specs/seg2node/spec.md`，移除“环境变量 NODES_DIR”要求，改为显式 node directory 配置。
- [x] 1.2 实现 DYS-001: 更新 `openspec/specs/dynamic-node-loading/spec.md`，从 registry/Step instance 模型改为 explicit fileRef + runtime.nodesDir + Markdown closure loader 模型。
- [x] 1.3 实现 GAS-001: 更新 `openspec/specs/gate-state-machine/spec.md`，从 Gate router 加载/路由 node 改为 Gate checkpoint feedback + `askNext()` transition lookup。
- [x] 1.4 实现 COS-001: 更新 `openspec/specs/conditional-nodes/spec.md`，将 branch node execution 表述收窄为 deterministic branch transform / repair checkpoint。
- [x] 1.5 实现 GAF-001: 更新 `openspec/specs/gate-fork-router/spec.md`，将 `Map<Branch, Step>` / workflow node resolution 表述收窄为 explicit branch map -> deterministic handler / transform record。
- [x] 1.6 实现 FOR-001: 更新 `openspec/specs/fork-repair-converge/spec.md`，将 shared repair node / repair loop 表述收窄为 shared deterministic repair checkpoint、gate re-evaluation、deterministic loop termination。
- [x] 1.7 实现 REL-001: 更新 `openspec/specs/repair-loop/spec.md`，将 repair node / terminal escalation step 表述收窄为 repair checkpoint loopback + explicit deterministic termination outcome。
- [x] 1.8 实现 WNC-001/WNC-003: 更新 `openspec/specs/workflow-node-contract/spec.md`，将 manifest 从 runtime navigation authority 收窄为 phase inventory/index，并明确 next-node lookup 归属 transition table / `askNext()`。

## 2. Registry And Text Hygiene

- [x] 2.1 实现 SEG-001/DYS-001/GAS-001/COS-001/GAF-001/FOR-001/REL-001: 更新 `openspec/governance/req-registry.yaml` 中对应 requirement 描述，去掉 env var、registry Step、JS-owned route、workflow node routing、shared repair node、repair node、terminal escalation step 等旧语义。
- [x] 2.2 实现 DYS-001/GAS-001/COS-001/GAF-001/FOR-001/REL-001: targeted scan main specs、guidelines、framework comments、tests、playbooks，确认没有会把 WFF 读成 JS workflow controller 的当前表述。
- [x] 2.3 实现 DYS-001/GAS-001/COS-001/GAF-001/FOR-001/REL-001: 如 scan 命中当前表面中的误导性注释或测试描述，只做文案同步；不得改变 runtime behavior。
- [x] 2.4 实现 COS-001/FOR-001/REL-001: 确认当前 `ForkStep` / `sharedRepairStep` / `convergeRepair()` 文案被描述为 accepted deterministic checkpoint 现状，不声称已实现未来 repair/branch-action injection point。
- [x] 2.5 实现 WNC-001/WNC-003: 更新 `openspec/governance/req-registry.yaml` 中 WNC 描述，去掉 phase metadata `next` 和 lifecycle navigation authority 旧语义。

## 3. Verification

- [x] 3.1 实现 SEG-001/DYS-001/GAS-001/COS-001/GAF-001/FOR-001/REL-001: 运行 targeted scan，确认 `process.env.NODES_DIR`、Gate-owned node loading、registry-to-Step、`Map<Branch, Step>`、shared repair node、repair node、terminal escalation step main-spec 表述不再存在于当前 specs，并确认 FOR requirement 顺序保持 convergence -> re-evaluation -> loop guard。
- [x] 3.2 实现 DYS-001/GAS-001/COS-001/GAF-001/FOR-001/REL-001: 运行相关 regression tests（至少 `node --test tests/engine/workflow-chain.test.mjs tests/engine/ask-next.test.mjs tests/engine/gate-loop.test.mjs tests/engine/gate-fork.test.mjs tests/engine/subagent-relay.test.mjs`）。
- [x] 3.3 收尾检查: 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS。
- [x] 3.4 收尾检查: 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。
- [x] 3.5 实现 WNC-003: 运行 targeted scan，确认 current main specs 不再把 manifest 描述为 runtime navigation authority，并确认 next-node Source of Record 仍指向 transition table / `askNext()`。

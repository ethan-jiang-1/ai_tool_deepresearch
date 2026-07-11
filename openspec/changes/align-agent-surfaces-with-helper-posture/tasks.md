## 1. 收束演进原则

- [ ] 1.1 实现 ACS-001 的指导地位：更新 `guidelines/simple-reliable-control.md` 的 frontmatter role/scope、顶部用途、Purpose 与 Standing，使其明确成为 Charter 之后的 repo-wide 渐进演进评审入口，统一承载 net simplification 与 helper-oriented Agent posture；done condition 是同时保留 guidance authority、accepted-spec/runtime precedence 和 gradual convergence，不能把 promotion 写成当前行为已改变或一次性重写授权。
- [ ] 1.2 对齐 ACS-001 的指导入口：最小更新 `guidelines/project-charter.md` 与 `guidelines/README.md` 已有的 complexity-brake、precedence、decision route、reading order 和 guidance-map 描述，确认 `simple-reliable-control.md` 的第二阅读位与演进评审作用；done condition 是不创建新的 authority level、guideline 或 capability。
- [ ] 1.3 实现 ACS-001 的净简化准入：重构 `guidelines/simple-reliable-control.md`，将现有 complexity budget、burden of proof、New Work 与 design-review checklist 的重复内容合并为一个三问 `Change Admission Test`；done condition 是保留 direct authority、same-check repair、fail-closed 与 gradual convergence 底线，同时删除被三问覆盖的重复规则，而不是只追加新章节。
- [ ] 1.4 实现 ACS-001 的 helper posture：在同一 guideline 中明确 Engine 给直接事实、Agent 执行既有权限和合法路径内的可逆机械工作、用户只通过既有 accepted interaction boundary 决定新的语义选择/破坏性或不可逆动作/权限或 authority 扩张；done condition 是无合法交互入口时显式阻塞，文本同时禁止新 checkpoint、越权、伪造 authority 和 generic helper 子系统，且不创建新的 guideline 文件。

## 2. 对齐 Agent-Facing Command Contract

- [ ] 2.1 实现 ACS-001：最小修改 `DPT_FRAMEWORK/COMMANDS.md` 现有 `Audience And Interaction Contract`，说明普通已授权命令和可逆机械修复由 Agent 执行，blocked Agent 返回 direct prerequisite 与 nearest legal action，human escalation 仅限三类真实边界并复用既有 accepted interaction boundary；done condition 是不新增命令、状态、validator、checkpoint 或 runtime 行为。
- [ ] 2.2 验证 ACS-001：focused review `COMMANDS.md` 与修改后的 requirement，确认 helper wording 不允许绕过 accepted transition、覆盖 Engine verdict、让用户编辑 runtime authority 或把用户重新变成 command co-runner。

## 3. 验证与治理

- [ ] 3.1 回归验证 ACS-001：运行 `node --test tests/engine/command-contract-docs.test.mjs` 必须 PASS；不为本次 guidance wording 新增新的 blocking phrase validator。
- [ ] 3.2 范围验证 ACS-001：检查 implementation diff，除 `guidelines/simple-reliable-control.md`、`guidelines/project-charter.md`、`guidelines/README.md`、`DPT_FRAMEWORK/COMMANDS.md` 与本 change artifacts 外不得包含 runtime/schema/state-machine/gate/trace/receipt/test 行为修改，也不得新增 requirement ID 或 capability。
- [ ] 3.3 OpenSpec 验证 ACS-001：运行 `openspec validate align-agent-surfaces-with-helper-posture --strict` 必须 PASS。
- [ ] 3.4 Requirement governance 验证 ACS-001：运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [ ] 3.5 Main-spec governance 验证 ACS-001：运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。

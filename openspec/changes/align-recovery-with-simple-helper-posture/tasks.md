## 1. 统一演进指导

- [ ] 1.1 支持 ACS-001、ACS-003 的指导层：更新 `guidelines/simple-reliable-control.md` 的 frontmatter role/scope、顶部用途、Purpose 与 Standing，使其成为 Charter 之后的 repo-wide incremental-evolution review entrypoint；done condition 是明确 net simplification、helper posture、autonomous/human-directed authority distinction、HITL/out-of-band placement distinction、`materialize-before-work` 与 `canonical-or-blocked`，同时保留 accepted specs/executable/runtime precedence。
- [ ] 1.2 支持 ACS-001、ACS-003 的净简化准入：把现有 Complexity Budget、Complexity Burden Of Proof、New Work 与 Design Review Checklist 的重复入口收束为三问 `Change Admission Test`；done condition 是删除重复问题和重复 SHALL，但保留 direct authority、state ownership、short-circuit、same-check repair、fail-closed、testability、truthfulness 与 compatibility retirement 的详细 disciplines。
- [ ] 1.3 支持 ACS-001、ACS-003 的 source coverage：把 proposal/design 从 human-override plan、breakpoint-recovery plan 与 BUG-079 提炼出的共同义务写成稳定 guidance（authority context、helper responsibility、`materialize-before-work`、`canonical-or-blocked`、gradual convergence）；done condition 是 guideline 不复制 backlog 路径或 incident 细节，不把来源标记为 runtime-fixed，也不创建新的 lane state、helper subsystem、addendum authority 或 override mechanism。
- [ ] 1.4 对齐 ACS-001、ACS-003 的指导入口：最小更新 `guidelines/project-charter.md` 与 `guidelines/README.md` 现有 complexity-brake、precedence、decision route、reading order 和 guidance-map 描述；将 Charter `Guideline Change Checklist` 中重复的 complexity/mechanism/convergence 问题合并为一个指向 `simple-reliable-control.md` `Change Admission Test` 的入口，同时保留其 authority/layer-specific checks；done condition 是不新增 authority level、guideline、capability 或第二份近似 checklist。

## 2. 对齐 Agent-Facing Contract

- [ ] 2.1 实现 ACS-001：最小修改 `DPT_FRAMEWORK/COMMANDS.md` 的现有 `Audience And Interaction Contract`，加入 Agent-owned ordinary execution、repairable blocker/no-legal-path 行为，以及 autonomous/human-directed authority、HITL/out-of-band placement 的区分；done condition 是不声称 arbitrary override/reentry 已存在，不新增 command、state、checkpoint 或 runtime mutation path。
- [ ] 2.2 实现 ACS-003：扩展现有 `tests/engine/command-contract-docs.test.mjs` 对顶层 `COMMANDS.md` 的 marker assertions，验证 ACS-001 新增的 Agent-owned mechanical execution、autonomous/human-directed authority distinction 和 HITL/out-of-band placement distinction；done condition 是不要求每个 playbook 复制顶层 audience statement，并且复用现有 test surface，不新增 validator、phrase class、prose-quality regex 或 test harness。
- [ ] 2.3 验证 ACS-001、ACS-003：focused review `COMMANDS.md`、delta spec 与 static regression，确认三者使用相同稳定语义，并保留 HITL1/HITL2-only in-run、Final non-interactive、operator diagnostic allowance 和 no-human-co-runner 既有契约。

## 3. 范围与回归验证

- [ ] 3.1 回归验证 ACS-001、ACS-003：运行 `node --test tests/engine/command-contract-docs.test.mjs` 必须 PASS，且 failure message 能指出缺失的 stable marker。
- [ ] 3.2 范围验证 ACS-001、ACS-003：检查 implementation diff，除 `guidelines/simple-reliable-control.md`、`guidelines/project-charter.md`、`guidelines/README.md`、`DPT_FRAMEWORK/COMMANDS.md`、`tests/engine/command-contract-docs.test.mjs` 与本 change artifacts 外不得包含修改；不得新增 runtime schema/state/CLI/event/capability/requirement ID，也不得关闭两个 source plans 或 BUG-079。
- [ ] 3.3 一致性验证 ACS-001、ACS-003：逐项核对 proposal Source Coverage、design staged slices、delta scenarios 与 tasks，确保 current apply 和 follow-up runtime obligations 没有互相冒充或遗漏。
- [ ] 3.4 OpenSpec 验证 ACS-001、ACS-003：运行 `openspec validate align-recovery-with-simple-helper-posture --strict` 必须 PASS。
- [ ] 3.5 Requirement governance 验证 ACS-001、ACS-003：运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [ ] 3.6 Main-spec governance 验证 ACS-001、ACS-003：运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。

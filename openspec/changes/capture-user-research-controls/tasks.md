## 1. Host-File Boundary

- [ ] 1.1 实现 PHS-007：在 `DPT_FRAMEWORK/engine/helpers/` 增加最小的 canonical plan-section locator 与 literal-snapshot fence renderer；它识别固定 host-file layout、把 controls region 作为 opaque content，并为 legacy 无 subsection 返回 no-controls 兼容解释。
- [ ] 1.2 实现 PHS-007：将 `rb_plan.md.tmpl` 的 Constraints 扩展为固定 `### User Research Controls` no-controls form；迁移 `canonical-topic-state.mjs` 的 Topic Registry presentation refresh 和 setup-ready required-fill inspection 到同一 locator，保留 body non-empty 与实际 template marker 的现有严格性。
- [ ] 1.3 实现 PHS-008：重写 `writePlanProgress()` 只操作 canonical Progress section，并返回 `committed` / `unchanged` / `failed` 直接结果；失败不得改写完整 plan，也不得被调用者误报成 checked 状态。

## 2. HITL And Research Guidance

- [ ] 2.1 实现 URC-001、URC-003、PRP-012：更新 HITL1 brief/phase guidance，使 Agent 在既有 HITL1 决策点捕获 optional controls 或经明确授权读取的本地文件内容为一次性 literal snapshot；写清 no-controls、legacy、最小澄清、不可保留 path/不可同步及 material conflict 的现有 structured-owner 处理。
- [ ] 2.2 实现 URC-002、PRP-013：更新 Seed Topics、Wave0/Wave1/Wave2 与 Final guidance，要求 controls present 时读取原 host-file coordinate、允许 Agent 产生不替代原文的 topic-local projection，并把严格限制不可满足时路由到既有 limitation/degraded/HITL2/held-checkpoint 边界。
- [ ] 2.3 实现 DEW-020：在生成 delegated work-unit 的既有 `task_brief` producer 中，仅 controls present 时添加 beacon-rooted、bundle-relative、只读 coordinate；确认没有 queue、manifest、result、receipt 或 schema 字段被增加或复用为用户控制 authority。

## 3. Setup-Ready Durable Handoff

- [ ] 3.1 实现 RRD-011：在既有 gate helper owner 中抽出 setup-ready 专用 ordered commit path，先写不可路由 audit，再应用 Progress outcome，再严格写入并返回唯一 checkpoint，最后才追加带 checkpoint binding 的可路由 passed trace；保留其他 Gate 的现有 attempt path，不创建第二 checkpoint 或 rollback tree。
- [ ] 3.2 实现 RRD-011：让 `check-gate-setup-ready.mjs` 使用该 path；Progress 失败时保留旧 plan、记录无 checked Progress claim，并仅以实际 bytes 的成功 checkpoint/route 决定既有 Gate pass 是否可消费；checkpoint 或 route binding 失败时才输出未可消费的直接 persistence finding 与同一 Gate 的最近重跑动作。
- [ ] 3.3 实现 RRD-011：扩展 checkpoint/trace binding 和 `handoff-helpers.mjs` / `enter-phase` 的 setup-ready consumption validation，使 route-bound checkpoint 存在、attempt binding 与当前 `rb_plan.md` hash 都成为进入下游的直接前提；不豁免合法 reentry drift。

## 4. Focused Proof

- [ ] 4.1 为 PHS-007、PHS-008 编写 `tests/engine/helpers/plan-hostfile-sections.test.mjs` unit tests：覆盖 fenced controls 内的 headings、registry-looking rows、checkbox、required-fill marker 和任意 backtick delimiter，及 Progress 三种直接 outcome。
- [ ] 4.2 为 URC-001、URC-002、DEW-020、PHS-007、PHS-008 编写 `tests/integration/cli/user-research-controls-contract.test.mjs`：使用实际 temporary bundle 的 topic-state、setup-ready 和 task rendering，证明 legacy/no-controls/controls、canonical writer isolation、marker isolation 与 task-brief-only coordinate。
- [ ] 4.3 为 RRD-011 编写 `tests/e2e/setup-ready-hostfile-handoff.test.mjs`：经真实 predecessor/Gate/enter-phase 路径验证 final plan hash、checkpoint binding 和可消费 setup route；覆盖 checkpoint failure 与 post-checkpoint drift 不可消费，且不手写 trace/checkpoint authority。
- [ ] 4.4 为 URC-001、URC-002、URC-003 增加 `experiments_playbook/exp_iterative_interaction/case-714-heavy-user-research-controls.md`，并在 `PLAYBOOK_MANIFEST.md` 登记；以真实 Subject Agent、真实 HITL1 guidance 和 trace/snapshot 证明自然语言 brief、hard exclusion、无 fabricated path/control 与既有 Gate/handoff。
- [ ] 4.5 运行 `node openspec/governance/check-verification-routing.mjs --change capture-user-research-controls --mode plan` 后再开始 target edits，并在所有验证资产创建后运行同命令的 `--mode assets`；修复 routing/asset 发现直到通过。

## 5. Release And Governance

- [ ] 5.1 更新 `CHANGELOG.md`，新增 `v0.41` 条目，说明一次性用户控制 snapshot、bounded host-file handling 与 setup-ready durable handoff；同步 `DPT_FRAMEWORK/RUN.md` banner 和 Current Release 到相同版本。
- [ ] 5.2 运行与变更相关的 unit、integration、deterministic_e2e 和已配置的 agent_flow_e2e 验证；记录无法在当前 host 运行的真实 Agent proof，绝不用 mock 代替 Agent 行为证据。
- [ ] 5.3 运行 `node openspec/governance/check-project-reqs.mjs` 并确认 `0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired`。
- [ ] 5.4 运行 `node openspec/governance/check-project-specs.mjs` 并确认 `0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader`。

## 1. Host-File Boundary

- [x] 1.1 实现 PHS-007：在 `DPT_FRAMEWORK/engine/helpers/` 增加最小的 opaque-region normalizer 与 literal-snapshot fence renderer，以及供各消费者定位自身 canonical target 的 bounded helper；它不构造通用 Markdown AST/完整 section tree，把符合新格式的 controls region 作为 opaque content，并为 legacy 无 subsection 或非新格式同名文本保留 no-controls/普通 Constraints 兼容解释，不把 non-standard Topic Registry presentation 变成 blocker。
- [x] 1.2 实现 PHS-004、PHS-005、PHS-007、URC-001：将 `rb_plan.md.tmpl` 的 Constraints 扩展为精确 no-controls sentence；规定 controls present 的精确 label + complete literal-fence form；迁移 `canonical-topic-state.mjs` 的 Topic Registry presentation refresh 和 setup-ready required-fill inspection 到同一 locator，保留 body non-empty 与实际 template marker 的现有严格性。
- [x] 1.3 实现 PHS-006、PHS-008：重写 `writePlanProgress()` 只操作 canonical Progress section，并返回 `committed` / `unchanged` / `failed` 直接结果；失败不得改写完整 plan，也不得被调用者误报成 checked 状态或新的 Gate verdict。

## 2. HITL And Research Guidance

- [x] 2.1 实现 URC-001、URC-003、PRP-012、PRP-014：更新 HITL1 brief/phase guidance，使 Agent 在既有 HITL1 决策点捕获 optional controls 或经明确授权读取的本地文件内容为一次性 literal snapshot；在生成 retained topic-state input 前先写入 snapshot，并要求 existing topic-state apply/recover 保留该 current host-file body；写清 no-controls、legacy、最小澄清、不可保留 path/不可同步及 material conflict 的现有 structured-owner 处理。
- [x] 2.2 实现 URC-002、PRP-013：更新 Seed Topics、Wave0/Wave1/Wave2 与 Final guidance，要求 controls present 时读取原 host-file coordinate、允许 Agent 产生不替代原文的 topic-local projection，并把严格限制不可满足时路由到既有 limitation/degraded/HITL2/held-checkpoint 边界。
- [x] 2.3 实现 DEW-020：在 Wave/Phase guidance 中规定 Phase Agent 仅在 controls present 时向既有 queue-item `task_brief` 添加 beacon-rooted、bundle-relative、只读 coordinate；确认 Engine 只原样传递已有 brief，且没有 queue、manifest、result、receipt 或 schema 字段被增加、解析或复用为用户控制 authority。

## 3. Setup-Ready Durable Handoff

- [x] 3.1 实现 GSK-005、RRD-001、RRD-011：为既有 `writeGateAttempt()` 增加 setup-ready staged route mode，而不是新 writer/finalizer；它预生成 `gate_attempt_id`，先写明确 `route_pending` 的不可路由 content audit，再应用 Progress outcome，再严格写入带该 ID、`trigger: setup_route_pending`、`content_evaluation_ref`、plan hash 与 `route_state: pending` 的唯一 checkpoint，最后才追加带相同 ID、非空 normalized bundle-relative `_checkpoints/*.json` `checkpoint_ref` 与 `plan_sha256` 的可路由 passed trace；该 invocation 返回一个 structured `route_outcome`，不抛错触发第二次普通 audit；保留其他 Gate 和 non-routing audit 的现有 tolerant attempt path，不创建第二 checkpoint 或 rollback tree。
- [x] 3.2 实现 RRD-011：让 `check-gate-setup-ready.mjs` 使用该 path；Progress 失败时保留旧 plan、记录无 checked Progress claim，并仅以实际 bytes 的成功 checkpoint/route 决定既有 Gate pass 是否可消费；checkpoint 或 route binding 失败时从同一次 `route_outcome` 输出标准 failed envelope（`check.passed: false`、`check.next: null`）和直接 authority-integrity persistence finding，附同一 Gate 的最近重跑动作，且不得再调用普通 `writeGateAttempt(failedResult)` 或产生第二 checkpoint。
- [x] 3.3 实现 RRD-011：扩展 checkpoint/trace binding 和 `handoff-helpers.mjs` / `enter-phase` 的 setup-ready consumption validation：拒绝空、越界、含 `..`、嵌套目录、symlink 或非 JSON regular-file 的 `checkpoint_ref`，只接受 `_checkpoints/<filename>.json`；要求 pending checkpoint 的 trigger/state/no-`gate_result_ref` shape、`gate_attempt_id`、`content_evaluation_ref` 与 trace route facts 双向一致，且 checkpoint、trace 与当前 `rb_plan.md` 的 hash 一致，才成为进入下游的直接前提；不豁免合法 reentry drift。
- [x] 3.4 实现 RRD-012：让 `check-reentry` 排除 `route_state: pending` checkpoint 的 matching/global baseline 选择，只将其作为带 `gate_attempt_id` 的 diagnostic evidence；matching bound trace 可单独报告为 handoff fact，但不能改变 pending checkpoint 的 baseline 身份，任何情况下都报告缺少 passed checkpoint baseline，不得以 pending checkpoint 压制 drift 或声明 setup handoff 完成。

## 4. Focused Proof

- [x] 4.1 为 URC-001、PHS-004、PHS-005、PHS-006、PHS-007、PHS-008 编写 `tests/engine/helpers/plan-hostfile-sections.test.mjs` unit tests：覆盖精确 no-controls/supplied label、incomplete/legacy lookalike、fenced controls 内的 headings、registry-looking rows、checkbox、required-fill marker 和任意 backtick delimiter，及 Progress 三种直接 outcome。
- [x] 4.2 为 URC-001、URC-002、DEW-020、PHS-007、PHS-008、PRP-014 编写 `tests/integration/cli/user-research-controls-contract.test.mjs`：使用实际 temporary bundle 的 topic-state、setup-ready 和 task rendering，证明 legacy/no-controls/controls、canonical writer isolation、marker isolation、topic-state/recovery 后 snapshot 保留与 task-brief-only coordinate。
- [x] 4.3 为 GSK-005、RRD-001、RRD-011、RRD-012 编写 `tests/e2e/setup-ready-hostfile-handoff.test.mjs`：经真实 predecessor/Gate/enter-phase/reentry 路径验证 `gate_attempt_id`、safe bundle-relative direct-file `checkpoint_ref`、final plan hash、`trigger: setup_route_pending`/`content_evaluation_ref`/`route_state: pending` checkpoint、双向 binding 与可消费 setup route；覆盖 checkpoint failure、route-write failure（保留 truthful pending checkpoint，且无第二 checkpoint/audit）、空/越界/嵌套/symlink checkpoint ref、route-fact/hash drift、pending checkpoint 不能成为 reentry baseline 或 global fallback 与 post-checkpoint drift 均不可消费，且不手写 trace/checkpoint authority。
- [x] 4.4 为 URC-001、URC-002、URC-003 增加 `experiments_playbook/exp_iterative_interaction/case-714-heavy-user-research-controls.md`，并在 `PLAYBOOK_MANIFEST.md` 登记；以真实 Subject Agent、真实 HITL1 guidance 和 trace/snapshot 证明自然语言 brief、hard exclusion、无 fabricated path/control 与既有 Gate/handoff。
- [x] 4.5 运行 `node openspec/governance/check-verification-routing.mjs --change capture-user-research-controls --mode plan` 后再开始 target edits，并在所有验证资产创建后运行同命令的 `--mode assets`；修复 routing/asset 发现直到通过。

## 5. Release And Governance

- [x] 5.1 更新 `CHANGELOG.md`，新增 `v0.41` 条目，说明一次性用户控制 snapshot、bounded host-file handling 与 setup-ready durable handoff；同步 `DPT_FRAMEWORK/RUN.md` banner 和 Current Release 到相同版本。
- [x] 5.2 运行与变更相关的 unit、integration、deterministic_e2e 和已配置的 agent_flow_e2e 验证；记录无法在当前 host 运行的真实 Agent proof，绝不用 mock 代替 Agent 行为证据。
  - Result: unit, integration, deterministic e2e, routing and playbook-contract checks passed. A real authenticated case-714 Subject-Agent run completed the honest `research_access: unavailable` HITL1 branch; its durable controls snapshot, failed same Gate, no Setup handoff, and four native observer checks were all recorded under the disposable `/tmp/dpt-case714b.0P0uvP/` bundle. No fixture substituted for Agent behavior.
- [x] 5.3 运行 `node openspec/governance/check-project-reqs.mjs` 并确认 `0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired`。
- [x] 5.4 运行 `node openspec/governance/check-project-specs.mjs` 并确认 `0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader`。

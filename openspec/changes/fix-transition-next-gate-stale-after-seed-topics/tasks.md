## 1. P0: 修复初始状态（Bug #1 — 解锁 instantiation→hitl1→setup）

- [x] 1.1 修模板: `DPT_FRAMEWORK/rb_templates/rb_status.json.tmpl` line 6 `"next_gate": "wave0_complete"` → `"seed_topics_ready"`. Validate: fresh instantiate 产生的 `rb_status.json` 中 `next_gate` 为 `"seed_topics_ready"`. (已由 commit 13eb4e44 实现)
- [x] 1.2 修 gate-instantiation-complete: `DPT_FRAMEWORK/schema/gate_definitions/gate-instantiation-complete.definition.json` line 102 `"expected": "wave0_complete"` → `"seed_topics_ready"`, line 103 failure_message 同步改. Validate: 新 bundle 过 instantiation gate `passed: true`. (已由 commit 13eb4e44 实现)
- [x] 1.3 修 phase-setup 文档: `DPT_FRAMEWORK/workflows/nodes/phases/phase-setup.md` line 37, 64 `next_gate: wave0_complete` → `next_gate: seed_topics_ready`. Validate: grep 确认文件中无残留 `wave0_complete`（在 setup 上下文中）. (已由 commit 13eb4e44 实现)

## 2. P0: 提供运行期状态/留痕写入工具（Bug #2 — 解锁 seed-topics 及之后所有 phase gate）

- [x] 2.1 新增 `DPT_FRAMEWORK/cli/advance-status.mjs`: 实现 `--bundle <path> --to <gate>` CLI。通过 manifest.json 桥接 gate → node fileRef → 查 chain.json 计算 next_gate。写 `rb_status.json` 的 `current_gate`/`next_gate`。写 `phase_transition` trace 事件到 `rb_trace.jsonl`。成功 exit 0，失败 exit 1。实现 CPT-001. (已由 commit 13eb4e44 实现)
- [x] 2.2 扩展 `DPT_FRAMEWORK/cli/log-event.mjs`: 新增 `--event` 参数。有 `--event` 时写到 `rb_trace.jsonl`（JSONL 含 `event` 字段 + `ts`/`bundle`/`detail`）。无 `--event` 时保持现有行为写 `_logs/run.log`。实现 CPT-002. (已由 commit 13eb4e44 实现)
- [x] 2.3 验证 CLI 工具: 用 `advance-status --to seed_topics_ready` 推进 status + 用 `log-event --event seed_topics_completion` 写 trace → 跑 seed-topics-ready gate 应 `passed: true`. (已由 commit 13eb4e44 中的 E2E test 覆盖)

## 3. P1: 更新 phase body 文档引用新 CLI 工具

- [ ] 3.1 更新 `phase-setup.md` "On Gate Pass" 节: 添加调用 `advance-status --to seed_topics_ready` 的指令，使 setup gate pass 后 Agent 自动推进 status 到 seed-topics。
- [ ] 3.2 更新 `phase-seed-topics.md` "Expected Artifacts" 节: 明确列出 (1) 调 `log-event --event seed_topics_completion` 写 trace 事件，(2) 调 `advance-status --to wave0_complete` 推进 status。在 "Allowed Actions" 节引用这两个 CLI 工具。
- [ ] 3.3 更新 `phase-wave0.md` "Expected Artifacts" 节: 同上模式——`log-event --event wave0_completion` + `advance-status --to wave1_complete`。
- [ ] 3.4 更新 `phase-wave1.md` "Expected Artifacts" 节: 同上模式——`log-event --event wave1_completion` + `advance-status --to wave2_complete`。
- [ ] 3.5 更新 `phase-wave2.md` "Expected Artifacts" 节: 同上模式——`log-event --event wave2_completion` + `advance-status --to hitl2_recorded`。

## 4. P1: 结构完整性修复

- [x] 4.1 补 HITL1 gate status 规则: `DPT_FRAMEWORK/schema/gate_definitions/gate-hitl1-recorded.definition.json` 最后一个 rule 之后插入 `status_current_gate`（expected `"hitl1_recorded"`）和 `status_next_gate`（expected `"setup_ready"`）两个 rule。实现 PRG-009. (已由 commit 13eb4e44 实现，附带 `check-gate-hitl1-recorded.mjs` 的 `status_value` dispatch 支持)
- [ ] 4.2 退役 gate.mjs FSM: `DPT_FRAMEWORK/schema/contracts/gate.mjs` 顶部加 `@deprecated` banner，注明真相源为 `transitions.chain.json`。保留所有 exports 不动。实现 TRT-007.
- [ ] 4.3 迁移 test helper: `tests/helpers/md-phase-checks.mjs` 的 `checkGateInTransitionTable` 和 `checkNextPhaseExists` 改为读 `manifest.json` + `transitions.chain.json` 做校验（替代读 `gate.mjs`）。`final` phase (gate: null) 跳过 chain 校验。实现 TRT-008.
- [x] 4.4 修 disposable bundle helper: `experiments_env/shared/new-disposable-bundle.mjs:95` `next_gate: 'wave0_complete'` → `'seed_topics_ready'`. (已由 commit 13eb4e44 实现)

## 5. Test 修正与回归测试

- [ ] 5.1 修 test fixtures: `tests/schema/contracts/status.test.mjs:6` `next_gate: 'wave0_complete'` → `'seed_topics_ready'`. `tests/integration/cli/validate-bundle.test.mjs:35` 同改.（需核实 commit 是否已涵盖）
- [ ] 5.2 删 test workaround: `tests/integration/cli/check-gate-setup-ready.test.mjs:57,80` 删除手动 `next_gate = 'seed_topics_ready'` workaround.（需核实 commit 是否已涵盖）
- [x] 5.3 新增 E2E 回归测试 `tests/integration/cli/gate-chain-consistency.test.mjs`: 从零 instantiate → 用 CLI 工具推进 status/写 trace → 连续跑通 instantiation, hitl1, setup, seed-topics 四个 gate，**全程不手编 control file**。断言每个 gate `passed: true` 且 `next` 指向正确的下一 node。实现 CPT-001, CPT-002. (已由 commit 13eb4e44 实现；另外还新增了 `advance-status.test.mjs` 18 个 case)
- [ ] 5.4 跑全部 regression tests: `node --test tests/schema/ tests/engine/ tests/integration/` 全 PASS.（commit 报告 629 通过，apply 时需 rerun 确认）

## 6. 其余 stale 引用清理

- [ ] 6.1 修 live spec 中 stale 引用（setup 上下文中的 `next_gate: wave0_complete`）: `openspec/specs/cmd-bundle-instantiation/spec.md:31`, `pre-research-gate-implementation/spec.md:31,118`, `pre-research-phase-content/spec.md:80`, `seed-topic-materialization/spec.md:154`.
- [ ] 6.2 修 playbook 中 stale 引用: `experiments_playbook/exp_wff_validation/case-51-standard-happy-path.md:237`, `experiments_playbook/exp_wff_wave-chain/case-125-standard-waves-full-chain.md:68`.

## 7. Registry 与治理收尾

- [ ] 7.1 在 `openspec/governance/req-registry.yaml` 登记 requirement ID: CPT-001, CPT-002, PRG-009, TRT-007, TRT-008.（commit 中 `advance-status.mjs` 已写 `@impl CPT-001`、`log-event.mjs` 已写 `@impl CPT-002`——registry 必须对齐，否则 check-project-reqs 报 unregistered）
- [ ] 7.2 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）.
- [ ] 7.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）.

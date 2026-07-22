## 1. Normalized Parent Facts

- [ ] 1.1 实现 CTS-008：在现有 canonical topic-layout/registry owner 上增加纯 Wave1 depth-review selector 与 intent-binding/target-revision normalizer；它为每个 canonical Topic 只接受一个无歧义 UID-bound review，支持 identifier-only layout reuse，拒绝 intent drift、重复 local ID、缺失/畸形 `{target_id,target_text}` `carried_targets`，并按 `(topic_uid,target_id)` 聚合；不解析 question-list prose 或新增 alias map。
- [ ] 1.2 实现 RWG-020（Wave1）：把该 normalizer 接入既有 depth-review/Wave1 evaluator 与 gate definition；显式空集合可通过，坏 declaration 给出 depth-review 直接 repair coordinate，且当前 pass 将 receipt 仅作为 `writeGateAttempt(..., { carriedTargetReceipt })` 专用 options input 传递，而非泛化 `extraCheck`。

## 2. Routed Receipt

- [ ] 2.1 实现 GSK-012、TRW-006：扩展既有 shared `writeGateAttempt()` 的窄 Wave1 成功 route，将验证后的 contract-versioned carried-target receipt（ordered digest、UID、intent binding、local ID、revision）投影到同一 routed `gate_attempt`；拒绝 generic `extraCheck`/非 Wave1 输入，投影失败不得暴露可消费 handoff、不得让 CLI 直写 trace 或建立第二 passed authority，并修复 Wave1 strict persistence failure 后仍 emit 原 passed result 的现存控制流，使一次 invocation 只输出 failed envelope。
- [ ] 2.2 实现 RWG-020（Wave2）：通过既有 Wave1 Gate + route-bound `load_complete` lineage 选择精确 receipt；仅在 trace 正向声明 receipt contract version 后将 missing/malformed receipt 拒绝为 persistence root，完全无 receipt 的历史 handoff 保持 legacy，并给出同一 Gate/handoff 的最小 repair。

## 3. Wave2 Consumer

- [ ] 3.1 实现 WTS-011：在既有 `finding-index.yaml` evaluator/schema 中增加可选严格 `{receipt_sha256,topic_uid,intent_sha256,target_id,target_revision}` `wave1_target_bindings[]`，与 `origin_refs[]`/`trigger_refs[]` 分离；逐项校验 selected receipt equality，保留 unrelated/emergent/legacy finding 的现有有效性。
- [ ] 3.2 实现 RWG-020（closure）：在既有 Wave2 evaluator/Gate 先将 selected versioned receipt 的每个 `(topic_uid,intent_sha256)` 与当前 canonical registry binding 对照；UID/intent mismatch 在 Wave1 handoff boundary 短路，不得以 finding binding 覆盖。前置通过后，对每个 target 检查至少一个 exact finding binding 和既有 decision/gap-status route；报告最小未覆盖 target 集并只指向 `finding-index.yaml`，不产生 target-level score、state、retry 或第二 validator。
- [ ] 3.3 实现 RWP-021：更新 Wave1/Wave2 phase Markdown 的 producer/consumer guidance 与 examples，明确 Agent 的语义选择、explicit empty set、receipt-bound finding、现有 evidence/limitation/HITL2 路线和 same-check repair；不让用户承担普通命令执行。

## 4. Verification Assets

- [ ] 4.1 为 CTS-008、RWG-020 编写 `tests/engine/wave-carried-target-receipts.test.mjs` unit tests，覆盖空/坏 declaration、重复 ID/receipt pair、layout-only reuse、intent drift、revision/digest stability、ambiguity 与非 prose/slug fuzzy matching。
- [ ] 4.2 为 GSK-012、TRW-006、RWG-020 编写 `tests/integration/cli/wave1-target-receipt-gate.test.mjs`，经真实 Wave Gate/trace/handoff helper 验证 receipt projection、generic metadata exclusion、versioned missing receipt failure、legacy compatibility、直接 repair envelope，以及 strict receipt append failure 只输出一次 failed result。
- [ ] 4.3 为 RWG-020、WTS-011 编写 `tests/e2e/wave1-target-receipt-wave2-closure.test.mjs`，在真实 temporary bundle Wave1->load->Wave2 chain 覆盖 valid/empty/missing/stale/same-origin-only binding、current-intent drift 在 coverage 前短路、layout-only reuse 与 mutable-review 不重开 parent。
- [ ] 4.4 为 RWP-021 创建并登记 `experiments_playbook/exp_iterative_interaction/case-715-wave-target-receipt-closure.md`，用真实 Subject Agent 与真实 bundle/trace 证明显式 carried target、receipt-bound finding、existing limitation/HITL2 route 和无 fabricated controller/user command；不可用 host 能力必须如实记录而不能用 mock 替代。
- [ ] 4.5 target edit 前运行 `node openspec/governance/check-verification-routing.mjs --change bind-wave1-target-receipts-to-wave2-findings --mode plan`，所有验证资产创建后运行 `--mode assets` 并修复发现。

## 5. Release And Governance

- [ ] 5.1 更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 到 `v0.42`，说明 Wave1 target receipt 到 Wave2 finding closure，而不暗示 Engine 评价 evidence quality。
- [ ] 5.2 运行本 change 的 unit、integration、deterministic_e2e 与已配置 agent_flow_e2e；记录真实 Agent proof 或其如实 unavailable branch，绝不伪造 Agent evidence。
- [ ] 5.3 运行 `node openspec/governance/check-project-reqs.mjs` 并确认 `0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired`。
- [ ] 5.4 运行 `node openspec/governance/check-project-specs.mjs` 并确认 `0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader`。

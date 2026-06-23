## 1. Schema: target → targets + new producer_rule

- [ ] 1.1 定义 `TargetSpecSchema`（Zod object: `controller` enum `main-agent|engine` + optional `delegates` with `to` enum `sub-agent` + `role_key` string + optional `timeout_ms` number default 600000）— `DPT_FRAMEWORK/schema/contracts/queue.mjs` @impl AGQ-012
- [ ] 1.2 修改 `QueueItemSchema`：`target` 字段替换为 `targets: TargetSpecSchema`，保持所有现有字段不变 @impl AGQ-011
- [ ] 1.3 新增 `topic_deepening` 到 producer_rule 有效值集合 @impl AGQ-013
- [ ] 1.4 运行现有 queue schema 测试确认 breaking change 被捕获，然后更新测试用例适配 `targets`

## 2. Engine: queue-manager.mjs 适配 targets 模型

- [ ] 2.1 修改 `makeItem()`：参数 `target` → `targets`，默认值 `{ controller: 'main-agent' }` @impl AGQ-011, AGQ-012
- [ ] 2.2 修改 `claim()`：返回的 advice 包含 `delegates_required`（boolean）和 `delegates_config`（role_key + timeout_ms，当 delegates 存在时）@impl AGQ-014
- [ ] 2.3 修改 `complete()`：receipt check 逻辑不变（receipt 检查与 targets 模型正交），但 advice 输出适配 targets 结构
- [ ] 2.4 运行 `node --test tests/engine/queue-manager.test.mjs` 确认所有现有测试 PASS

## 3. CLI: operate-queue.mjs 适配 targets

- [ ] 3.1 修改 `enqueue` 子命令：`--target` flag 替换为 `--targets`（接受 JSON 字符串，如 `'{"controller":"main-agent","delegates":{"to":"sub-agent","role_key":"dpt-source-intake","timeout_ms":600000}}'`）@impl AGQ-011
- [ ] 3.2 修改 `claim` 子命令输出：打印 `delegates_required` 和 `delegates_config` 到 stdout
- [ ] 3.3 修改 `render` 子命令：projection 中 `target` → `targets`，展示 controller 和 delegates（如有）

## 4. Phase MD: seed-topics task card 模板 retrofit

- [ ] 4.1 修改 `phase-seed-topics.md` §3.1 task card JSON 模板：`"target": "main-agent"` → `"targets": { "controller": "main-agent" }`（seed-topics 无 delegates——纯写文件）@impl AGQ-009
- [ ] 4.2 验证 task card 模板中所有字段引用一致（`work_id`、`producer_rule`、`required_receipts` 不变）

## 5. Phase MD: wave0 §3 retrofit — 引用 shared protocol + 参数表

- [ ] 5.1 修改 `phase-wave0.md` §3.1 task card JSON 模板：`"target": "sub-agent"` → `"targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-source-intake", "timeout_ms": 600000 } }` @impl AGQ-007
- [ ] 5.2 重写 `phase-wave0.md` §3.2：从串行 claim/complete 循环改为引用 `shared-subagent-protocol.md` §3 批量并行执行协议 + 声明 wave0 参数表（role_key=`dpt-source-intake`, artifact_template=`reference/{topic.slug}/source.yaml`, artifact_schema=`ReferenceMetadata`, backfill_tokens=`["__BACKFILL_WAVE0_EVIDENCE__"]`, per_topic_backfill=`true`, search_focus=`foundation reference`）@impl SUD-002
- [ ] 5.3 更新 §3.2 行为约束：上下文管理改为引用 `shared-subagent-protocol.md`（而非内联写规则）

## 6. Phase MD: wave1 完整重写 — queue-driven + shared protocol + 参数表

- [ ] 6.1 重写 `phase-wave1.md` frontmatter：添加 `suggested_context: shared/shared-subagent-protocol.md`，保持现有 `requires` 和 `gate` 不变
- [ ] 6.2 重写 §1 Stage Goal：从 "Topic-Scoped Placeholder Skeleton" 改为 "Topic-Specific Deepening — queue-driven batch sub-agent execution via relay" @impl WAI-001
- [ ] 6.3 重写 §2 Required Inputs：添加 `DPT_FRAMEWORK/cli/operate-queue.mjs`、`DPT_FRAMEWORK/engine/subagent-relay.mjs`、`shared-subagent-protocol.md`，保留 Wave0 产出和 topic_registry 引用
- [ ] 6.4 重写 §3 Allowed Actions 为 queue-driven 三阶段 @impl WAI-001, WAI-002, WAI-007：
  - §3.1 灌料：task card JSON 模板（`producer_rule: topic_deepening`、`targets` with `delegates.role_key: dpt-evidence-extractor`、`timeout_ms: 600000`），enqueue CLI
  - §3.2 批量并行执行：引用 `shared-subagent-protocol.md` §3 协议 + 声明 wave1 参数表（role_key=`dpt-evidence-extractor`, artifact_template=`artifacts/wave1/{topic.slug}/evidence-summary.md`, artifact_schema=`EvidenceSummary`, backfill_tokens=`["__BACKFILL_WAVE1_MECHANISMS__", "__BACKFILL_WAVE1_TRENDS__", "__BACKFILL_PENDING_QUESTIONS__"]`, per_topic_backfill=`true`, search_focus=`topic-specific deep evidence`）
  - §3.3 收尾与 gate：检查产出完整性→跑 gate CLI→pass/fail
- [ ] 6.5 保留 §3 inline backfill 逻辑（per-topic 即时回填），嵌入 §3.2 的 collect-as-return step（每个 sub-agent 回来→collect→验证产出→complete queue task→backfill→补位）@impl WAI-004
- [ ] 6.6 重写 §4 Expected Artifacts：`artifacts/wave1/{topic}/evidence-summary.md` 替代 `skeleton.md`，每个 evidence-summary 含至少 1 条 source URL + key findings + open questions
- [ ] 6.7 保留 §7 On Gate Fail 和 §8 Stop Behavior（适配新 gate 和新产出），保留 §9 Anti-Cheating Rules @impl WAI-005
- [ ] 6.8 更新 §Future Expansion Guidance：标注已实现 track 1/2/4；剩余 track 3/5/6 留给后续

## 7. Shared MD: subagent-protocol.md

- [ ] 7.1 新建 `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`（**注意：必须在 phase MD retrofit 之前完成，因为 phase node 的 `suggested_context` 会引用此文件**）@impl AGQ-014, SUC-002
- [ ] 7.2 内容 — §1 通信契约：引用 relay slot 契约（task.md + result.schema.json + runtime-receipt.jsonl + forbidden authority），sub-agent 只收 bounded 上下文，main-agent 通过 relay validation pipeline 收集结果
- [ ] 7.3 内容 — §2 目录结构：`_subagents/wave_NN/slot_MM/`（每 sub-agent 独占一个 slot 目录，零文件冲突）
- [ ] 7.4 内容 — §3 批量并行执行协议：完整循环（灌料→读 queue→取 ≤N task→映射 SlotConfig→stageSubagentSlots→并行 spawn→collect-as-return→验证产出→complete→backfill→补位→全部 collected→collectAndMerge→gate）@impl SUD-003
- [ ] 7.5 内容 — §4 并发控制：`MAX_CONCURRENT_SUBAGENTS` 从 `subagent-relay.mjs` 引用，正=硬上限，-1=不限
- [ ] 7.6 内容 — §5 参数化接口：参数表模板 + wave0/wave1/wave2 各 phase 的参数声明
- [ ] 7.7 内容 — §6 Forbidden Authority：sub-agent 禁区清单（不写 WorkflowState、不 pass/fail gate、不 repair queue、不 authorize stop、不含原始搜索 trail）

## 8. Gate: wave1 适配

- [ ] 8.1 检查 `check-gate-wave0-complete.mjs`：确认不需要改（receipt check 仍是 `file:reference/{topic}/source.yaml`，与 targets 模型正交）
- [ ] 8.2 修改 `check-gate-wave1-complete.mjs`：gate rule 从检查 `skeleton.md` 改为检查 `evidence-summary.md`（每个 topic 一个文件、非空、通过 Markdown link 解析验证至少含 1 条 source URL），新增 `__BACKFILL_WAVE1_*__` token stale check（grep `seed_topics/*.md` 确认无残留 token literal）@impl WAI-005

## 9. Regression: tests/ 更新

- [ ] 9.1 新增 `TargetSpecSchema` 单元测试（tests/engine/queue-manager.test.mjs）：valid targets with delegates、valid targets without delegates、invalid controller、invalid delegates.to、missing controller、timeout_ms default @impl AGQ-012
- [ ] 9.2 更新 queue-manager 集成测试：`makeItem()` 用 `targets` 参数、`claim()` advice 含 `delegates_required`
- [ ] 9.3 新增 operate-queue CLI adapter 测试：`--targets` JSON flag 正确处理（含 delegates 和不含 delegates 两种情况）
- [ ] 9.4 运行全量回归：`node --test tests/engine/ tests/schema/ tests/integration/` 必须全部 PASS

## 10. Playbook: wave0 happy-path 重跑（验证 relay 并行 dispatch 不退化）

- [ ] 10.1 更新 `experiments_playbook/exp_agentic-queue-loop/test-heavy-wave0-happy-path.md`：task card JSON 中 `target` → `targets`（含 `delegates.role_key: dpt-source-intake`），验证 relay-based 并行 dispatch（`stageSubagentSlots` + `ingestAgentReceipt` + `commitSlotResult`）
- [ ] 10.2 更新 `experiments_playbook/exp_agentic-queue-loop/test-heavy-wave0-gate-fail-repair.md`：同上 retrofit
- [ ] 10.3 确认 wave0 playbook 文件命名与 agentic-queue spec (AGQ-008) 一致，必要时重命名对齐
- [ ] 10.4 运行 wave0 playbook 验证 relay 并行 dispatch 闭环

## 11. Playbook: wave1 batch-subagent（新建，3 级）

- [ ] 11.1 新建 `experiments_playbook/exp_agentic-queue-loop/test-simple-wave1-batch-subagent.md`：2-topic happy path，relay 并行 dispatch（2 个 sub-agent 同时 spawn，`dpt-evidence-extractor`），collect-as-return + backfill + gate pass @impl WAI-006
- [ ] 11.2 新建 `experiments_playbook/exp_agentic-queue-loop/test-medium-wave1-gate-fail-repair.md`：gate fail（某 topic 缺 evidence-summary）→ inspect→ repair→ gate pass @impl WAI-006
- [ ] 11.3 新建 `experiments_playbook/exp_agentic-queue-loop/test-complex-wave1-subagent-failure.md`：sub-agent WebFetch blocked → tool degradation chain (WebFetch→curl→python3)→ partial evidence→ gate still pass（partial evidence OK，不造假）@impl WAI-003, WAI-006

## 12. Requirement Registry + Governance

- [ ] 12.1 在 `openspec/governance/req-registry.yaml` 注册新 requirement ID：AGQ-011~014（agentic-queue）、WAI-001~007（wave1-intake，含 WAI-007 batch protocol）、SUD-002~003（subagent-dispatch）、SUC-002（subagent-collect）
- [ ] 12.2 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
- [ ] 12.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）

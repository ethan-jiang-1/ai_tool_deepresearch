## 1. Schema: target → targets + new producer_rule

- [x] 1.1 定义 `TargetSpecSchema`（Zod object: `controller` enum `main-agent|engine` + optional `delegates` with `to` enum `sub-agent` + `role_key` string + optional `timeout_ms` number default 600000）— `DPT_FRAMEWORK/schema/contracts/queue.mjs` @impl AGQ-012
- [x] 1.2 修改 `QueueItemSchema`：`target` 字段替换为 `targets: TargetSpecSchema`，保持所有现有字段不变 @impl AGQ-011
- [x] 1.3 新增 `topic_deepening` 到 producer_rule 有效值集合 @impl AGQ-013（注：保持 bare string，走 MD 模板层约定，不引入 Zod enum）
- [x] 1.4 运行现有 queue schema 测试确认 breaking change 被捕获，然后更新测试用例适配 `targets`

## 2. Engine: queue-manager.mjs 适配 targets 模型

- [x] 2.1 修改 `makeItem()`：参数 `target` → `targets`，默认值 `{ controller: 'main-agent' }` @impl AGQ-011, AGQ-012
- [x] 2.2 修改 `claim()`：返回的 advice 包含 `delegates_required`（boolean）和 `delegates_config`（role_key + timeout_ms，当 delegates 存在时）@impl AGQ-014
- [x] 2.3 修改 `complete()`：receipt check 逻辑不变（receipt 检查与 targets 模型正交），advice 输出适配 targets 结构
- [x] 2.4 修改 `makeRepairItem()`：`target: 'main-agent'` → `targets: { controller: 'main-agent' }`
- [x] 2.5 修改 `render()`：projection 中 `target` → `targets`，展示 controller 和 delegates（如有）
- [x] 2.6 运行 `node --test tests/engine/queue-manager.test.mjs` 确认所有现有测试 PASS（27 tests, 0 fail，含新增的 13 条 targets 测试）

## 3. CLI: operate-queue.mjs 适配 targets

- [x] 3.1 `enqueue` 子命令：`--task` JSON 文件已包含 `targets` 字段，无需额外 CLI flag 变更
- [x] 3.2 `claim` 子命令输出：`emit(result)` 自动包含 `advice`（含 `delegates_required` + `delegates_config`）
- [x] 3.3 `render` 子命令：projection 中 `target` → `targets`（由 engine 2.5 处理）

## 4. Phase MD: seed-topics task card 模板 retrofit

- [x] 4.1 修改 `phase-seed-topics.md` §3.1 task card JSON 模板：`"target": "main-agent"` → `"targets": { "controller": "main-agent" }`（seed-topics 无 delegates）@impl AGQ-009
- [x] 4.2 更新执行循环中 `target = main-agent` → `targets.controller = main-agent`

## 5. Phase MD: wave0 §3 retrofit — 引用 shared protocol + 参数表

- [x] 5.1 修改 `phase-wave0.md` §3.1 task card JSON 模板：`"target": "sub-agent"` → `"targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-source-intake", "timeout_ms": 600000 } }` @impl AGQ-007
- [x] 5.2 重写 `phase-wave0.md` §3.2：从串行 claim/complete 循环改为引用 `shared-subagent-protocol.md` §3 批量并行执行协议 + 声明 wave0 参数表 @impl SUD-002
- [x] 5.3 上下文隔离从 MD 约定改为 relay-enforced（shared protocol §1.4）
- [x] 5.4 `writes_to` 清理：移除 `_cache/search-results/`（由 relay slot 目录管理）
- [x] 5.5 frontmatter `suggested_context` 添加 `shared/shared-subagent-protocol`

## 6. Phase MD: wave1 完整重写 — queue-driven + shared protocol + 参数表

- [x] 6.1 重写 `phase-wave1.md` frontmatter：添加 `suggested_context: shared/shared-subagent-protocol.md`，保持 `requires` 和 `gate` 不变
- [x] 6.2 重写 §1 Stage Goal：从 "Topic-Scoped Placeholder Skeleton" 改为 "Topic-Specific Deepening — queue-driven batch sub-agent execution via relay" @impl WAI-001
- [x] 6.3 重写 §2 Required Inputs：添加 `operate-queue.mjs`、`subagent-relay.mjs`、`shared-subagent-protocol.md`
- [x] 6.4 重写 §3 Allowed Actions 为 queue-driven 三阶段 @impl WAI-001, WAI-002, WAI-007：
  - §3.1 灌料：task card JSON 模板（`producer_rule: topic_deepening`、`targets` with `delegates.role_key: dpt-evidence-extractor`）
  - §3.2 批量并行执行：引用 `shared-subagent-protocol.md` §3 协议 + wave1 参数表
  - §3.2.1 inline backfill 规则（per-topic 即时回填，三个 token 替换顺序）
  - §3.3 收尾与 gate
- [x] 6.5 §4 Expected Artifacts：`evidence-summary.md` 替代 `skeleton.md`（含 source URL + key findings + open questions）
- [x] 6.6 §7-§9 保留并适配新 gate 和新产出，保留 Anti-Cheating Rules @impl WAI-005
- [x] 6.7 Future Expansion Guidance：标注 track 1/2/4 已实现，track 3/5/6 留给后续

## 7. Shared MD: subagent-protocol.md

- [x] 7.1 新建 `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md` @impl AGQ-014, SUC-002
- [x] 7.2 §1 通信契约：relay slot 文件契约（task.md + result.schema.json + runtime-receipt.jsonl + forbidden authority）
- [x] 7.3 §2 目录结构：`_subagents/wave_NN/slot_MM/` authority + `_cache/waveN/slot_MM/` 非 authority
- [x] 7.4 §3 批量并行执行协议：完整循环 + ASCII 流程图（灌料→stage→并行 spawn→collect-as-return→backfill→补位→merge→gate）@impl SUD-003
- [x] 7.5 §4 并发控制：`MAX_CONCURRENT_SUBAGENTS` 正=硬上限，-1=不限
- [x] 7.6 §5 参数化接口：参数表模板 + wave0/wave1/wave2 参数声明
- [x] 7.7 §6 Forbidden Authority：sub-agent 禁区清单（不写 WorkflowState、不 pass/fail gate、不 repair queue、不 authorize stop、不含原始搜索 trail）+ 工具降级链

## 8. Gate: wave1 适配

- [x] 8.1 检查 `check-gate-wave0-complete.mjs`：确认不需要改（receipt check 仍是 `file:reference/{topic}/source.yaml`，与 targets 模型正交）
- [x] 8.2 修改 `gate-wave1-complete.definition.json`：
  - `skeleton.md` → `evidence-summary.md`
  - 移除 `placeholder_marker_present` + 4 个 false completion claim 规则
  - 新增 `source_url_present`（Markdown link regex）
  - 新增 `key_findings_non_empty`（`## Key Findings` section 有编号条目）
  - 新增 3 个 `__BACKFILL_WAVE1_*__` stale token 检查（`no_stale_mechanisms_token`、`no_stale_trends_token`、`no_stale_pending_questions_token`）@impl WAI-005

## 9. Regression: tests/ 更新

- [x] 9.1 新增 `TargetSpecSchema` 单元测试（`tests/engine/queue-manager.test.mjs`）：valid with/without delegates、invalid controller、invalid delegates.to、missing controller、timeout_ms default @impl AGQ-012
- [x] 9.2 新增 `QueueItemSchema` targets 测试：accepts with delegates、accepts controller only、makeItem default、rejects old `target` field
- [x] 9.3 新增 `claim()` advice 测试：`delegates_required=true` when delegates present、`false` when absent @impl AGQ-014
- [x] 9.4 更新 `tests/integration/md/phase-seedtopics-queue-loop.test.mjs`：`"target": "main-agent"` → `targets` assertion
- [x] 9.5 更新 `tests/integration/md/phase-wave0-queue-loop.test.mjs`：7 处 assertion 更新匹配新 §3.2 结构
- [x] 9.6 重写 `tests/integration/cli/check-gate-wave1-complete.test.mjs`：evidence-summary.md 替换 skeleton.md，新增 source URL / backfill token / key findings 测试
- [x] 9.7 更新 `tests/integration/cli/operate-queue.test.mjs`：`makeTask()` 使用 `targets`
- [x] 9.8 运行全量回归：`node --test tests/` → **492 tests, 0 fail**

## 10. (额外) Schema contracts 1:1 测试

- [x] 10.1 新建 `tests/schema/contracts/` 目录，每个 contract 一个 test 文件：
  - `gate.test.mjs`（13 tests：GATE_MACHINE_STATES, GATE_EVENT_TYPES, GATE_TRANSITIONS, validateTransitions, isValidTransition）
  - `plan.test.mjs`（7 tests）
  - `profile.test.mjs`（8 tests）
  - `queue.test.mjs`（23 tests：TargetSpecSchema, QueueWorkUnitSchema, QueueSchema）
  - `reference.test.mjs`（14 tests：ReferenceMetadataSchema, ReferenceMetadataArraySchema）
  - `status.test.mjs`（8 tests）
  - `trace.test.mjs`（8 tests）
- [x] 10.2 删除旧的 `tests/schema/contracts.test.mjs`（混杂 5 个 schema，已全部分解到 1:1 文件）

## 11. (额外) MD integration 测试瘦身：string-grep → 结构+一致性扫描

- [x] 11.1 新建 `tests/helpers/md-phase-checks.mjs`：共享 helper（frontmatter parse、node identity、gate definition 存在、gate in transition table、references 文件存在、next phase 链连续、9-section 结构）
- [x] 11.2 重写 `tests/integration/md/phase-seedtopics-queue-loop.test.mjs`：51 tests → 7 tests（删掉 JS 会兜底的字段级 string-grep）
- [x] 11.3 重写 `tests/integration/md/phase-wave0-queue-loop.test.mjs`：36 tests → 7 tests（同上 + 新增 gate in transition table、references exist、chain continuity）

## 12. (额外) helper 重命名

- [x] 12.1 `tests/helpers/test-tmp.mjs` → `tests/helpers/temp-dirs.mjs`
- [x] 12.2 更新 5 个 importer + 文件内注释

---

## 13. Playbook: wave0 happy-path 重跑（验证 relay 并行 dispatch 不退化）

- [x] 13.1 更新 happy-path playbook：task card JSON `target` → `targets`（含 `delegates.role_key: dpt-source-intake`），action 文本更新 relay slot 目录，writes_to 清理，claim 输出解析适配 targets/advice，backfill task card 适配，V9 验证更新
- [x] 13.2 更新 gate-fail-repair playbook：移除 `_cache/search-results/` mkdir（relay 管理 cache dirs）
- [x] 13.3 命名一致：`test-heavy-wave0-happy-path.md` + `test-heavy-wave0-gate-fail-repair.md` 均在 `exp_wfn_wave0/` 下
- [x] 13.4 验证：enqueue+claim 在真实 bundle 上跑通（targets 带/不带 delegates 两种 CLI 行为正确），sub-agent 搜索部分需 LLM Agent 执行

## 14. Playbook: wave1 batch-subagent（新建，3 级）

- [x] 14.1 新建 `test-heavy-wave1-batch-subagent.md`：2-topic happy path（bundle 含 post-wave0 状态 → enqueue 2 topic_deepening task card → relay 并行 spawn `dpt-evidence-extractor` sub-agent → collect-as-return → backfill 3 个 `__BACKFILL_WAVE1_*__` token → gate pass）@impl WAI-006
- [x] 14.2 新建 `test-heavy-wave1-gate-fail-repair.md`：2 topics，1 缺 evidence-summary → gate fail（inspect 指向缺失 topic + stale token）→ repair task enqueue → sub-agent deepening → complete → backfill → re-gate pass → trace 含 2 条 gate_attempt @impl WAI-006
- [x] 14.3 新建 `test-heavy-wave1-subagent-failure.md`：1 topic 指向 anti-bot 页面 → WebFetch blocked → 走完完整抓取链（WebFetch → curl → node → python3）→ partial evidence（access failure 如实记录，不编造）→ gate 仍 pass @impl WAI-003, WAI-006

## 15. Requirement Registry + Governance

- [x] 15.1 在 `openspec/governance/req-registry.yaml` 注册 15 个新 ID：AGQ-011~014、SUD-002~003、SUC-002、WAI-001~007
- [x] 15.2 `check-project-reqs.mjs` PASS：183 registered, 0 orphan
- [x] 15.3 `check-project-specs.mjs` PASS：41 main specs, 0 violations

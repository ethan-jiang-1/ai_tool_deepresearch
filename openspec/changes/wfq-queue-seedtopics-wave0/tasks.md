## 1. Phase-seed-topics.md body 重写 + V12 内容对齐

- [x] 1.1 @impl STM-001: 重写 `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md` §2 Required Inputs — 新增 `operate-queue.mjs` 依赖 + `rb_profile.yaml` 上游约束
- [x] 1.2 @impl AGQ-009: 重写 §3 Allowed Actions — 三阶段 queue-driven 模式（§3.1 灌料、§3.2 执行循环、§3.3 收尾+gate）
- [x] 1.3 §3.1 灌料：完整 task card JSON 模板（含 QueueItemSchema 字段、producer_rule: seed_topic_materialize、target: main-agent、priority_class: P3_current_gate_gap）+ enqueue CLI
- [x] 1.4 §3.1 Seed Topic 文件结构：对齐 V12 — frontmatter 含 must_answer/hypothesis/in_scope/out_of_scope/search_guardrails/evidence_route + 正文含原始语境约束 block
- [x] 1.5 §3.2 执行循环：ASCII 流程图 + claim→execute(main-agent 写入)→complete→读投影 的逐步 CLI
- [x] 1.6 §3.2 含 gap 标注规则：上游信息不足时标注为显式 gap，不编造
- [x] 1.7 §4–§9 不变

## 2. Phase-wave0.md body 重写（已完成）

- [x] 2.1 @impl RWP-001: 重写 §2 Required Inputs — 新增 `operate-queue.mjs` 和 WebSearch/WebFetch 工具依赖
- [x] 2.2 @impl AGQ-007: 重写 §3 Allowed Actions — 三阶段 queue-driven：灌料（完整 task card JSON + enqueue CLI）、执行循环（ASCII 图 + claim→execute(sub-agent WebSearch+WebFetch)→complete→投影）、收尾（index→gate）
- [x] 2.3 §3.1 action 字段含 WebSearch → WebFetch → 提取 url/title/retrieved_date/topic_tag → 写入 source.yaml 的具体搜索指令
- [x] 2.4 §3.2 含上下文管理约束：sub-agent 搜出结果写 _cache/，main-agent 只读投影
- [x] 2.5 §3.2 含 complete receipt fail → engine repair → re-claim 路径
- [x] 2.6 §4–§9 不变

## 3. Spec 层验证

- [ ] 3.1 验证 delta spec `agentic-queue/spec.md` 的 AGQ-007/AGQ-009 producer_rule 定义与 queue-manager.mjs 兼容（producer_rule 字段为自由 string）
- [ ] 3.2 验证 delta spec `agentic-queue/spec.md` 的 AGQ-008/AGQ-010 playbook spec 与 experiment playbook 格式约定一致
- [ ] 3.3 验证 delta spec `seed-topic-materialization/spec.md` 的 STM-001 MODIFIED 内容覆盖当前 main spec 的完整 requirement
- [ ] 3.4 验证 delta spec `research-wave-phase-content/spec.md` 的 RWP-001 MODIFIED 内容覆盖当前 main spec 的完整 requirement

## 4. 回归测试 — phase body 结构验证

- [ ] 4.1 创建 `tests/integration/md/phase-seedtopics-queue-loop.test.mjs`：读 `phase-seed-topics.md`，用 `node:test` + `node:assert` 做结构断言
- [ ] 4.2 断言 seed-topics frontmatter contract + 9-section 完整性
- [ ] 4.3 断言 §3 含三阶段标记 + key CLI（`operate-queue enqueue`、`operate-queue claim --actor main-agent`、`operate-queue complete`、`check-gate-seed-topics-ready.mjs`、`P3_current_gate_gap`）
- [ ] 4.4 断言 §3.1 含 V12-aligned seed topic 文件结构字段（must_answer, hypothesis, search_guardrails, evidence_route）
- [ ] 4.5 创建 `tests/integration/md/phase-wave0-queue-loop.test.mjs`：同上结构 + 验证 WebSearch/WebFetch + `P5_new_reference_intake` + 上下文隔离约束
- [ ] 4.6 运行已有回归：`node --test tests/engine/queue-manager.test.mjs` — PASS
- [ ] 4.7 运行已有回归：`node --test tests/integration/cli/operate-queue.test.mjs` — PASS
- [ ] 4.8 运行全量回归：`node --test tests/` — PASS

## 5. Experiment playbooks

### 5a. Seed-topics queue-loop simple

- [ ] 5a.1 @impl AGQ-010: 创建 `experiments_playbook/exp_agentic-queue-loop/test-simple-seedtopics-queue-loop.md`
- [ ] 5a.2 Pre-seed：post-setup disposable bundle，含 3 个 topic 的 topic_registry + rb_profile.yaml
- [ ] 5a.3 Scenario — Happy path：灌料 3 个 task → claim→execute（main-agent 写 seed topic 文件，含 V12 fields）→complete ×3 → queue 空 → gate pass → verdict PASS
- [ ] 5a.4 验证产出：每个 seed_topics/<slug>.md 含 must_answer/hypothesis/search_guardrails/evidence_route/原始语境约束
- [ ] 5a.5 共享 utility：`experiments/shared/wff-playbook-utils.mjs` 的 `recordCheck`/`verdict`

### 5b. Wave0 queue-loop simple

- [ ] 5b.1 @impl AGQ-008: 创建 `experiments_playbook/exp_agentic-queue-loop/test-simple-wave0-queue-loop.md`
- [ ] 5b.2 Scenario 1 — Real search：1 个真实 topic → 灌料 → claim → sub-agent **真实 WebSearch + WebFetch** → 写 source.yaml → complete → gate pass → verdict PASS
- [ ] 5b.3 Scenario 2 — Gate fail：3 topic 但只用 local fixture 产出 2 个 source.yaml → gate fail（count_floor）→ inspect 明确指出缺失的 topic → verdict FAIL（expected）
- [ ] 5b.4 Scenario 3 — Repair：接 S2 状态 → 补 source.yaml → rerun gate → pass → trace 含 fail+pass 两条 gate_attempt

## 6. Requirement registry 与 governance

- [ ] 6.1 注册 AGQ-007（source_intake_fan_in）、AGQ-008（wave0 playbook）、AGQ-009（seed_topic_materialize）、AGQ-010（seed-topics playbook）
- [ ] 6.2 运行 `node openspec/governance/check-project-reqs.mjs` — PASS
- [ ] 6.3 运行 `node openspec/governance/check-project-specs.mjs` — PASS

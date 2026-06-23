## 1. Phase-seed-topics.md body 重写 + V12 内容对齐

- [x] 1.1 @impl STM-001: 重写 `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md` §2 Required Inputs — 新增 `operate-queue.mjs` 依赖 + `rb_profile.yaml` 上游约束
- [x] 1.2 @impl STM-001: 重写 §3 Allowed Actions — 三阶段 queue-driven 模式（§3.1 灌料、§3.2 执行循环、§3.3 收尾+gate）
- [x] 1.3 §3.1 灌料：完整 task card JSON 模板（含 QueueItemSchema 字段、producer_rule: seed_topic_materialize、target: main-agent、priority_class: P3_current_gate_gap）+ enqueue CLI
- [x] 1.4 §3.1 Seed Topic 文件结构：对齐 V12 — frontmatter 含 must_answer/hypothesis/in_scope/out_of_scope/search_guardrails/evidence_route + 正文含原始语境约束 block
- [x] 1.5 §3.2 执行循环：ASCII 流程图 + claim→execute(main-agent 写入)→complete→读投影 的逐步 CLI
- [x] 1.6 §3.2 含 gap 标注规则：上游信息不足时标注为显式 gap，不编造
- [x] 1.7 §4–§9 不变

## 2. Phase-wave0.md body 重写（已完成）

- [x] 2.1 @impl RWP-001: 重写 §2 Required Inputs — 新增 `operate-queue.mjs` 和 WebSearch/WebFetch 工具依赖
- [x] 2.2 @impl AGQ-007, RWP-001: 重写 §3 Allowed Actions — 三阶段 queue-driven：灌料（完整 task card JSON + enqueue CLI）、执行循环（ASCII 图 + claim→execute(sub-agent WebSearch+WebFetch)→complete→投影）、收尾（index→gate）
- [x] 2.3 §3.1 action 字段含 WebSearch → WebFetch → 提取 url/title/retrieved_date/topic_tag → 写入 source.yaml 的具体搜索指令
- [x] 2.4 §3.2 含上下文管理约束：sub-agent 搜出结果写 _cache/，main-agent 只读投影
- [x] 2.5 §3.2 含 complete receipt fail → engine repair → re-claim 路径
- [x] 2.6 §4–§9 不变

## 3. Spec 层验证

- [x] 3.1 验证 delta spec `agentic-queue/spec.md` 的 AGQ-007/AGQ-009 producer_rule 定义与 queue-manager.mjs 兼容（producer_rule 字段为自由 string）
- [x] 3.2 验证 delta spec `agentic-queue/spec.md` 的 AGQ-008/AGQ-010 playbook spec 与 experiment playbook 格式约定一致
- [x] 3.3 验证 delta spec `seed-topic-materialization/spec.md` 的 STM-001 MODIFIED 内容覆盖当前 main spec 的完整 requirement
- [x] 3.4 验证 delta spec `research-wave-phase-content/spec.md` 的 RWP-001 MODIFIED 内容覆盖当前 main spec 的完整 requirement

## 4. 回归测试 — phase body 结构验证

- [x] 4.1 创建 `tests/integration/md/phase-seedtopics-queue-loop.test.mjs`：读 `phase-seed-topics.md`，用 `node:test` + `node:assert` 做结构断言
- [x] 4.2 断言 seed-topics frontmatter contract + 9-section 完整性
- [x] 4.3 断言 §3 含三阶段标记 + key CLI（`operate-queue enqueue`、`operate-queue claim --actor main-agent`、`operate-queue complete`、`check-gate-seed-topics-ready.mjs`、`P3_current_gate_gap`）
- [x] 4.4 断言 §3.1 含 V12-aligned seed topic 文件结构字段（must_answer, hypothesis, search_guardrails, evidence_route）
- [x] 4.5 创建 `tests/integration/md/phase-wave0-queue-loop.test.mjs`：同上结构 + 验证 WebSearch/WebFetch + `P5_new_reference_intake` + 上下文隔离约束
- [x] 4.6 运行已有回归：`node --test tests/engine/queue-manager.test.mjs` — PASS
- [x] 4.7 运行已有回归：`node --test tests/integration/cli/operate-queue.test.mjs` — PASS
- [x] 4.8 运行全量回归：`node --test tests/` — PASS (465 tests, 0 failures)

## 5. Experiment playbooks

### 5a. Seed-topics queue-loop simple

- [x] 5a.1 @impl AGQ-010: 创建 `experiments_playbook/exp_agentic-queue-loop/test-simple-seedtopics-queue-loop.md`
- [x] 5a.2 Pre-seed：post-setup disposable bundle，含 3 个 topic 的 topic_registry + rb_profile.yaml
- [x] 5a.3 Scenario — Happy path：灌料 3 个 task → claim→execute（main-agent 写 seed topic 文件，含 V12 fields）→complete ×3 → queue 空 → gate pass → verdict PASS
- [x] 5a.4 验证产出：每个 seed_topics/{slug}.md（slug 已含编号前缀）含 must_answer/hypothesis/search_guardrails/evidence_route/原始语境约束 + File Naming Convention Checklist (N1-N5)
- [x] 5a.5 共享 utility：`experiments/shared/wff-playbook-utils.mjs` 的 `recordCheck`/`verdict`

### 5b. Wave0 queue-loop simple

- [x] 5b.1 @impl AGQ-008: 创建 `experiments_playbook/exp_agentic-queue-loop/test-simple-wave0-queue-loop.md`
- [x] 5b.2 Scenario 1 — Real search：1 个真实 topic → 灌料 → claim → sub-agent **真实 WebSearch + WebFetch** → 写 source.yaml → complete → gate pass → verdict PASS
- [x] 5b.3 Scenario 2 — Gate fail：3 topic 但只用 local fixture 产出 2 个 source.yaml → gate fail（count_floor）→ inspect 明确指出缺失的 topic → verdict FAIL（expected）
- [x] 5b.4 Scenario 3 — Repair：接 S2 状态 → 补 source.yaml → rerun gate → pass → trace 含 fail+pass 两条 gate_attempt

## 6. Requirement registry 与 governance

- [x] 6.1 注册 AGQ-007（source_intake_fan_in）、AGQ-008（wave0 playbook）、AGQ-009（seed_topic_materialize）、AGQ-010（seed-topics playbook）、FRE-003（gate-helpers 共享 frontmatter 解析）
- [x] 6.2 运行 `node openspec/governance/check-project-reqs.mjs` — PASS (168 registered, 14 retired, 0 orphan)
- [x] 6.3 运行 `node openspec/governance/check-project-specs.mjs` — PASS (41 main spec files, 0 violations)

## 7. Markdown frontmatter 统一为 YAML 1.2

- [x] 7.1 @impl FRE-003: gate-helpers.mjs 新增 `parseMdFrontmatter(rawString)` — 正则匹配 `---` 块 + `parseYaml()` → 返回解析对象
- [x] 7.2 gate-helpers.mjs 新增 `readBundlePlan(bundlePath)` — 读 `rb_plan.md`，调 `parseMdFrontmatter()`
- [x] 7.3 更新 `check-gate-seed-topics-ready.mjs`：`getPlan()` 中 `JSON.parse(m[1])` → `readBundlePlan()`；`getDiskSlugs()` 中 `JSON.parse(m[1])` → `parseMdFrontmatter()`
- [x] 7.4 更新 `check-gate-setup-ready.mjs`：`getPlan()` 中 `JSON.parse(m[1])` → `readBundlePlan()`
- [x] 7.5 更新 `check-gate-wave0-complete.mjs`：`getPlan()` 中 `JSON.parse(m[1])` → `readBundlePlan()`
- [x] 7.6 更新 `check-gate-wave1-complete.mjs`：添加 `import { parse as parseYaml } from 'yaml'`；`getPlan()` 中 `JSON.parse(m[1])` → `readBundlePlan()`
- [x] 7.7 更新 `validate-bundle.mjs`：用 gate-helpers 的 `parseMdFrontmatter` 替换本地 `parseMdFrontmatter()`
- [x] 7.8 更新 `instantiate-run-bundle.mjs`：frontmatter 解析用 `parseMdFrontmatter()`
- [x] 7.9 更新 `phase-seed-topics.md`：模板恢复 YAML 格式 + 注释更新（"含 JSON frontmatter"→"含 YAML frontmatter"，"frontmatter 必须为 JSON 格式"→"frontmatter 使用 YAML 格式"）
- [x] 7.9a 更新 `tests/integration/md/phase-seedtopics-queue-loop.test.mjs`：frontmatter 格式断言从 JSON → YAML
- [x] 7.10 更新 `shared-schemas.md`："Markdown with JSON frontmatter" → "Markdown with YAML frontmatter"
- [x] 7.11 @impl FRE-003: 创建防回归扫描测试 `tests/integration/md/parse-md-frontmatter.test.mjs` — grep gate CLI/validate/instantiate 源文件，发现 `JSON.parse` 用于 frontmatter 上下文直接 fail（注意排除 `rb_status.json`/`rb_queue.json`/JSONL 等非 frontmatter 的正当代 `JSON.parse` 使用）
- [x] 7.12 运行全量回归：`node --test tests/` — ALL PASS
- [x] 7.13 运行 governance 检查：`node openspec/governance/check-project-reqs.mjs` + `check-project-specs.mjs` — PASS

## 8. Seed topic 文件结构对齐 V12 完整研究日志

- [x] 8.1 @impl STM-001: 重写 `phase-seed-topics.md` §3.1 Seed Topic 文件结构 — 两段结构：初始化区对齐 V12（主题定位/must_answer/初始假设缺口张力/why now/研究边界/证据锚点/交付价值/下游位置）+ 轮次追加区预埋（显式分隔标记 + 回填责任表 + 历史摘要/新增证据/机制理解/趋势难点/当前判断/待验证问题占位）
- [x] 8.2 更新 `tests/integration/md/phase-seedtopics-queue-loop.test.mjs`：初始化区 13 sections 断言 + 轮次追加区 8 项断言（marker/回填表/wave0-2/6 个 section/状态标签/gate 不检查声明）
- [x] 8.3 更新 proposal.md（What Changes 追加两段结构）+ design.md（新增 D8 决策）+ specs/seed-topic-materialization/spec.md（STM-001 追加轮次追加区 scenario）+ tasks.md（本节）
- [x] 8.4 运行全量回归：`node --test tests/` — ALL PASS
- [x] 8.5 运行 governance 检查：`node openspec/governance/check-project-reqs.mjs` + `check-project-specs.mjs` — PASS

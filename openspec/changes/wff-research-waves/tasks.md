## 实施顺序

```
Section 0 (Seed-Topic 物化) ──┐
                                ├──> Section 4 (Shared Nodes Update)
Section 1 (Wave Phase Nodes) ──┤
                                ├──> Section 4 (Shared Nodes Update)
Section 2 (Gate Definitions)    │
  └──> Section 3 (Gate CLIs) ──┘
                                       └──> Section 5 (Tests)
                                                └──> ⏸️ REVIEW #1
                                                         └──> Section 6 (Req Registry)
                                                                  └──> ⏸️ REVIEW #2 (experiment 策略/覆盖审阅，写 playbook 前)
                                                                           └──> Section 7 (Experiments)
                                                                                    └──> ⏸️ REVIEW #3 (experiment 结果裁决，跑完 playbook 后)
                                                                                             └──> Section 8 (Governance)
```

---

## 0. Seed-Topic 物化阶段（setup→wave0 缺口修复）

> 依赖：无。本 Section 是 Wave 的前置：修复 `wff-pre-research` 遗留的 seed_topics 空缺口。产出新 phase node + gate definition + gate CLI + workflow 注册。参考 `wff-pre-research` 的 9-section body 与 `wff-research-waves` 的 definition-driven gate 模式。

- [x] **0.1** `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`（STM-001）— 完整 9-section body，`phase: seed-topics`、`gate: seed-topics-ready`、`stop: "no"`。引导 Agent 读 `rb_plan.md#/topic_registry` → 为每个 topic 创建 `seed_topics/<slug>.md`（frontmatter: id/slug/title + 正文研究骨架：关键维度/已知前提/open questions）→ 记录 `seed_topics_completion` trace event。Anti-Cheating Rules 禁止物化空目录、禁止 slug 不一致、禁止编造 must_answer 引用
  - verify: body 含 9 个 section；Allowed Actions 覆盖读 registry→创建 `<slug>.md`→写 frontmatter+正文→trace；`stop: "no"`；Anti-Cheating Rules ≥2 条 phase-specific 禁令

- [x] **0.2** `DPT_FRAMEWORK/schema/gate_definitions/gate-seed-topics-ready.definition.json`（STM-002）— deterministic rule set：`dir_non_empty`（`seed_topics/` 至少 1 个 `.md`）、`cross_field`（`mode: "slug_consistency"`，磁盘 slug 集合 = registry slug 集合双向一致）、`field_non_empty`（每文件 frontmatter `title` 非空）+ `cross_field(slug_consistency)` 覆盖 per-file slug 与文件名 stem 一致性、`trace_event_present`（`seed_topics_completion`）、`status_value`（`current_gate == seed_topics_ready` / `next_gate == wave0_complete`）。placeholder rule 全部移除
  - verify: 无 placeholder rule；所有 status 用 snake_case；`mode: "slug_consistency"` 字段存在

- [x] **0.3** `DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs`（STM-003）— 复用 `gate-helpers.mjs` standard pipeline（loadGateDefinition→validateNodeGateBinding→iterate rules→resolveRouting→buildGateResult→emitGateResult）。实现 `dir_non_empty` evaluator 和 `cross_field(slug_consistency)` evaluator。延续 PRG-007 double trace（gate attempt 写 `rb_trace.jsonl`）
  - verify: 空 `seed_topics/` → fail（inspect 指向空目录）；slug 缺失/多余 → fail；registry 空 → fail；全合法 → pass，`check.next` = `phases/phase-wave0.md`

- [x] **0.4** Workflow 注册同步（STM-004）— `manifest.json` phases 数组在 setup 与 wave0 之间插入 `{ "key": "seed-topics", "node": "phases/phase-seed-topics.md", "gate": "seed-topics-ready" }`；`transitions.chain.json` 改 `phase-setup.md`→`phase-seed-topics.md`，新增 `phase-seed-topics.md`→`phase-wave0.md`；`transitions.fsm.json` 同步；`schema/enums.mjs` 的 `CurrentGate` 新增 `seed_topics_ready`（位于 `setup_ready` 与 `wave0_complete` 之间）
  - verify: setup gate pass 后 routing = `phase-seed-topics.md`；seed-topics gate pass 后 routing = `phase-wave0.md`；`validate-bundle.mjs` 仍 PASS（模板初始 status 值更新或由 setup gate 推进）

- [x] **0.5** `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs`（STM-003 依赖）— 添加共享 `readTraceEvents` helper（与 task 3.4 是同一份实现；若 Section 0 先于 Section 3 执行，在此添加）。所有新 check type（`count_floor`、`dir_non_empty`、`cross_field(slug_consistency)`）都是单 CLI 专用，放各自 CLI 的 rule iteration，不进 helpers——与 design D2 放置策略一致
  - verify: `readTraceEvents` 正确解析 JSONL 并按 event name 过滤；不破坏现有 gate（setup/hitl1/instantiation 回归测试 PASS）

- [x] **0.6** HITL1 phase body 微调（STM-001 配套）— `phase-hitl1.md` 3a 节把"推导 seed topics → 写入 topic_registry"措辞明确为"写入 `rb_plan.md` topic_registry；**物化动作移至下游 phase-seed-topics**"，避免 HITL1 既写 registry 又物化文件的职责重叠
  - verify: HITL1 Allowed Actions 不含"创建 seed_topics 文件"；仍写 topic_registry

---

## 1. Wave Phase Node Content

> 依赖：无。产出 3 个 Markdown 文件，纯 content writing。参考 `wff-pre-research` 的 9-section body 模式。

- [x] **1.1** `phase-wave0.md`（RWP-001）— 完整 9-section body，引导 Agent 搜集 foundation shared reference，按 ReferenceMetadata schema 写 `reference/<topic>/source.yaml`，更新 `reference/index.md`，记录 `wave0_completion` trace event
  - verify: body 包含 9 个 section；Allowed Actions 覆盖搜索→阅读→写 YAML metadata（url/title/retrieved_date/topic_tag）→更新 index→更新 trace；Anti-Cheating Rules 禁止 fake URL 和跳过搜索

- [x] **1.2** `phase-wave1.md`（RWP-002, RWP-004, RWP-005）— 完整 9-section body + Future Expansion Guidance section。当前写 topic-scoped skeleton，标记 `capability: foundation-placeholder`。Future section 列出 6 个 expansion tracks 且标注只读。记录 `wave1_completion` trace event
  - verify: body 明确区分 Current Actions 和 Future Guidance；Anti-Cheating Rules 显式列出禁止声称的 5 项；Future tracks 不成为 gate pass 条件

- [x] **1.3** `phase-wave2.md`（RWP-003, RWP-006）— 完整 9-section body，引导 Agent 从 verified Wave0/Wave1 artifacts 派生 synthesis，用 Markdown link `[label](relative/path.md)` 格式引用来源。记录 `wave2_completion` trace event
  - verify: body 要求 synthesis 包含 Markdown link artifact references（至少 1 条）；Anti-Cheating Rules 禁止凭空总结和伪造引用路径

- [x] **1.4** Wave phase anti-cheating rules 审查（RWP-007）— 逐文件确认 Anti-Cheating Rules section 有 ≥2 条 phase-specific 禁令，并引用 `shared-anti-cheating-rules.md`
  - verify: 3 个 wave phase body 都包含 phase-specific 禁令

---

## 2. Gate Definition JSON

> 依赖：Section 1（inform rule design）。需要 ReferenceMetadata schema（`DPT_FRAMEWORK/schema/contracts/reference.mjs`）已定义。

- [x] **2.0** `DPT_FRAMEWORK/schema/contracts/reference.mjs`（RWG-001）— 定义 ReferenceMetadata Zod schema：`url`（string, 必填）、`title`（string, 必填）、`retrieved_date`（YYYY-MM-DD string, 必填）、`topic_tag`（string, 必填）、`notes`（string, 可选）。Export Zod array of objects
  - verify: schema 被 gate-wave0-complete.definition.json 的 `schema_valid` rule 正确引用

- [x] **2.1** `gate-wave0-complete.definition.json`（RWG-001）— ~7 条 rules：`file_exists`（`reference/index.md`）、`dir_exists`（`reference/`、per-topic 目录）、`schema_valid`（ReferenceMetadata contract）、`count_floor`（每个 topic ≥1 metadata）、`trace_event_present`（target: `wave0_completion`）、`status_value`（`current_gate == wave0_complete`/`next_gate == wave1_complete`）
  - verify: placeholder rule 被移除；`count_floor` threshold = 1 per topic；所有 status values 使用 snake_case（`wave0_complete`、`wave1_complete`）

- [x] **2.2** `gate-wave1-complete.definition.json`（RWG-002）— ~7 条 rules：`dir_exists`（`artifacts/wave1/`）、`file_exists`（per-topic `skeleton.md`）、`pattern_match`（`capability: foundation-placeholder` 存在）、`pattern_match`（`negate: true`，排除 "full subagent coverage completed"、"deepening done" 等 false claim）、`trace_event_present`（target: `wave1_completion`）、`status_value`
  - verify: false completion claim pattern 覆盖多个已知 false claim 字样；placeholder marker 检查不使用语义判断

- [x] **2.3** `gate-wave2-complete.definition.json`（RWG-003）— ~6 条 rules：`file_exists`（`artifacts/wave2/synthesis.md`）、`field_non_empty`（synthesis 非空）、`cross_field`（`mode: "markdown_link_resolution"`，解析 Markdown links → 验证目标存在，≥1 有效引用）、`trace_event_present`（target: `wave2_completion`）、`status_value`
  - verify: `cross_field` rule 包含 `"mode": "markdown_link_resolution"` 字段以区分 basename_consistency mode；解析 Markdown link 格式；不退化为 quality check

---

## 3. Gate CLI Implementation

> 依赖：Section 2（gate definitions 完整后才能加载和遍历 rules）

- [x] **3.1** `check-gate-wave0-complete.mjs`（RWG-004, RWG-007, GSK-004）— 从 hardcoded pass 升级为 definition-driven。加载 `gate-wave0-complete.definition.json`，遍历 rules，支持 `file_exists`/`dir_exists`/`schema_valid`/`count_floor`/`trace_event_present`/`status_value`。复用 `gate-helpers.mjs` standard pipeline。写入 `rb_trace.jsonl` runtime audit entry（RWG-007）
  - verify: `count_floor` check 正确比较 `reference/<topic>/source.yaml` 中的 metadata 条目数量与 threshold；CLI 输出标准 JSON gate result

- [x] **3.2** `check-gate-wave1-complete.mjs`（RWG-005, RWG-007, GSK-004）— 从 hardcoded pass 升级为 definition-driven。支持 `file_exists`/`dir_exists`/`field_value`/`field_non_empty`/`pattern_match`/`status_value`/`trace_event_present`。写入 `rb_trace.jsonl`（RWG-007）
  - verify: `pattern_match` 正确检测 false completion claim 字符串；CLI 不 hardcoded pass

- [x] **3.3** `check-gate-wave2-complete.mjs`（RWG-006, RWG-007, RWG-008, GSK-004）— 从 hardcoded pass 升级为 definition-driven。支持 `file_exists`/`field_non_empty`/`cross_field`/`status_value`/`trace_event_present`。`cross_field`（`mode: "markdown_link_resolution"`）：读取 synthesis.md → 正则提取 Markdown links `[text](path)` → 相对路径解析 → 验证目标文件存在。写入 `rb_trace.jsonl`（RWG-007）
  - verify: cross_field 路径解析相对于 `artifacts/wave2/`；CLI 根据 definition JSON 的 `mode` 字段选择 markdown_link_resolution evaluator（非 basename_consistency）；≥1 有效引用 pass；0 有效引用 fail with inspect listing all dead links

- [x] **3.4** `gate-helpers.mjs` 更新（RWG-004, RWG-005, RWG-006）— 添加共享 trace reader `readTraceEvents(bundlePath, eventName)`。`readTraceEvents` 读取 `rb_trace.jsonl`、按 event name 过滤，供 3 wave + seed-topics gate 的 `trace_event_present` 复用（pre-research gate 只写不读，wave gate 是首次读 trace，集中 reader 避免 4 处复制）。所有新 check type（`count_floor`、`dir_non_empty`、`cross_field(slug_consistency)`、`cross_field(markdown_link_resolution)`、`pattern_match` 文件内容扩展）都是单 CLI 专用，放各自 CLI rule iteration
  - verify: `readTraceEvents` 正确解析 JSONL 并按 event name 过滤；两者行为与其他 helper 一致

---

## 4. Shared Node Updates

> 依赖：Section 1-3（phase body + gate 内容确定后才能更新 shared node 摘要）。可与 Section 3 并行。

- [x] **4.1** `shared-gate-rules.md` 追加 wave gate 摘要（SHC-002）— 为 `wave0-complete`、`wave1-complete`、`wave2-complete` 各追加一行 purpose + 检查方向 + repair posture
  - verify: 标注 `authority: generated-summary`；不复制完整 rule list

- [x] **4.2** `shared-schemas.md` 追加 wave artifact 目录结构和 schema（SHC-003）— 摘要 `reference/`、`artifacts/wave1/<topic>/skeleton.md`、`artifacts/wave2/synthesis.md` 的用途；ReferenceMetadata schema 的字段；synthesis Markdown link 引用格式
  - verify: 指向完整 contract 文件位置，不复制 Zod 定义

---

## 5. Integration Tests

> 依赖：Section 3（gate CLI 实现完成后才能跑测试）。所有测试用 `node:test` + `node:assert`，放在 `tests/integration/cli/`。

- [x] **5.1** `check-gate-wave0-complete.test.mjs`（RWG-001, RWG-004）— happy path + 缺失 reference index + 缺失 per-topic metadata + schema violation（missing url）+ below floor + schema-valid 条目不足但总条目达标（count_floor pass 但 schema_valid fail） + 空 topic_registry（gate fail，inspect 指向空 registry） + status drift
  - verify: 至少 8 个测试用例，覆盖所有 check type 和关键失败场景；空 topic_registry 场景 gate 返回 `passed: false` 且不 crash；count_floor/schema_valid 独立 fail 场景分别验证

- [x] **5.2** `check-gate-wave1-complete.test.mjs`（RWG-002, RWG-005）— happy path + 缺失 skeleton + 缺失 placeholder marker + false completion claim + status drift
  - verify: 至少 5 个测试用例，`pattern_match` check 覆盖 false completion claim

- [x] **5.3** `check-gate-wave2-complete.test.mjs`（RWG-003, RWG-006, RWG-008）— happy path with valid Markdown links + empty synthesis + 零 links + 所有 link target 不存在 + 部分 target 存在 + status drift
  - verify: 至少 6 个测试用例，`cross_field` check 覆盖引用链验证和 Markdown link 解析

- [x] **5.4** `node --test tests/integration/cli/check-gate-wave*.test.mjs` 全 PASS
  - verify: 0 failures

---

## ✅ REVIEW #1 — 实现完成确认（PASSED）（进 registry 前）

> **停下来。** 确认以下事项后再进入 registry / 实验阶段：
> - 3 个 wave phase node body 符合 spec（9-section + Wave1 Current/Future 分离 + anti-cheating ≥2 条 phase-specific）
> - 3 个 gate definition JSON rule set 完整（placeholder rule 已移除，status value 用 snake_case）
> - 3 个 wave gate CLI 真实 evaluate rules（无 hardcoded pass），新增 `count_floor` evaluator 和 `readTraceEvents` reader 行为正确
> - ReferenceMetadata schema（`reference.mjs`）存在且被 wave0 gate 的 `schema_valid` 引用
> - topic 集合 source of truth = `rb_plan.md` 的 `topic_registry`，空 registry → gate fail
> - integration test（Section 5）全部 PASS，覆盖每个 check type 的 pass + fail
> - shared node 摘要已追加，不复制完整 rule list

## 6. Requirement Registry

> 依赖：Section 5（测试 PASS 后注册 requirement IDs）。**进入前先过 ⏸️ REVIEW #1**——实现没稳定就注册 ID，等于把未验证的契约刻进 registry。

- [x] **6.1*** 注册 RWP-001 ~ RWP-007 到 `openspec/governance/req-registry.yaml`
  - verify: `research-wave-phase-content` capability 有 7 个 IDs，无冲突

- [x] **6.0*** 注册 STM-001 ~ STM-005 到 `openspec/governance/req-registry.yaml`（capability: `seed-topic-materialization`）
  - verify: STM 前缀无冲突（已确认 registry 无 STM 记录）；`seed-topic-materialization` capability 有 5 个 IDs（STM-001 phase node / STM-002 gate definition / STM-003 gate CLI / STM-004 workflow registration / STM-005 boundary playbook）

- [x] **6.2*** 注册 RWG-001 ~ RWG-008 到 `openspec/governance/req-registry.yaml`
  - verify: `research-wave-gate-implementation` capability 有 8 个 IDs

- [x] **6.3*** 注册 RWE-001 ~ RWE-009 到 `openspec/governance/req-registry.yaml`
  - verify: `research-wave-experiments` capability 有 9 个 IDs，无冲突
  - **注意**：RWE-008（Wave1 boundary 横切约束）和 RWE-009（cross-artifact reference 独立验证）是跨 playbook 的约束条件，不是独立 playbook——9 个 ID 中只有 7 个对应 playbook 文件（RWE-001~007）。注册时在描述末尾标注 `— cross-cutting constraint, no standalone playbook` 避免混淆

- [x] **6.4*** 更新 GSK-004 registry 描述：覆盖范围从 "extended from 1 to 3 pre-research gate CLIs" 改为 7 个（3 pre-research + 1 seed-topics + 3 wave gate CLIs），注明新增 `count_floor` check type 与 `cross_field` 的 Markdown link 用法
  - verify: GSK-004 描述与 gate-skeleton delta spec 一致；消除 registry 描述（仍写 3）与实现（7）的隐性不一致

- [x] **6.5*** 运行 `node openspec/governance/check-project-reqs.mjs` PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
  - verify: exit code 0

---

## 7. Experiment Playbooks

> 依赖：Section 5（gate 实现稳定后再做 playbook 实验）。所有 playbook 放在 `experiments_playbook/exp_workflow-foundation/`。
> **进入前先过 ⏸️ REVIEW #2**——实验设计错了，8 个 playbook 全是浪费且给假信心。

## ⏸️ REVIEW #2 — Experiment 策略与覆盖审阅（写 playbook 前）

> **停下来。** 在写任何 playbook 之前，确认实验设计本身站得住：
> - **覆盖矩阵对齐 pre-research 的 bar**：happy / boundary / repair / fault-tolerance / full-chain e2e / review-surface 六角，每一角是否都有对应 playbook？是否有 wave 被遗漏？
> - **新引入的解析器都有压测**：`count_floor`（Wave0 per-topic 计数）、`cross_field` Markdown link 解析（Wave2 引用链）、`pattern_match` false-completion-claim（Wave1）、`trace_event_present`（首次读 rb_trace）——每个新 check type 是否都有 fail-case playbook 暴露其行为？
> - **MD 步步为营**：每个 playbook 是否遵循 MD解释→短bash→MD展示输出→MD解释→下一步？JS block 是否每段聚焦一个确定性动作？有没有一段 JS 从头跑到尾？
> - **Agent 能知错改错**：gate fail 后，MD 是否展示完整 JSON output、逐条解释 inspect/advice、明确指出 repair 动作？repair loop 的前后 diff 是否可见？
> - **no-make-believe**：Wave0 reference（url/title）和 Wave2 synthesis 是否真的摊在 Markdown 正文里供人审，而不是只靠 trace 计数？
> - **review checklist 完整性**：boundary / review-surface playbook 的 human review checklist 是否覆盖了 gate 查不到的语义维度（reference 真实性、引用准确性、placeholder 清晰度）？
> - **thin driver 纪律**：driver 是否只做确定性执行（写 fixture、调 gate、记 trace），不做内容判断？
> - **disposable bundle 隔离**：每个 playbook 是否创建独立 `dpt_disp_*`，互不污染？
>
> 这道关过不了，下面的 7.0-7.7 不该开写。

---
### Group 1 — 单 gate 验证（从简到繁，逐个验证每个 gate 独立行为）

- [x] **7.0*** `test-simple-seed-topics-boundary.md`（STM-005）— light playbook：pre-seeded post-setup bundle（含 topic_registry）→ 物化全部 seed_topics（gate pass）→ 清空 seed_topics → gate fail（inspect 指向空目录）→ 物化部分 topic（slug 缺失）→ gate fail（cross_field slug_consistency 报缺失）→ 多余文件 → gate fail（报多余）。Body 显式列出 slug 一致性 DO/DON'T
  - verify: playbook PASS；trace 记录 4 条 `check` event（1 pass + 3 fail）；`dir_non_empty` 和 `slug_consistency` 行为可见

- [x] **7.2*** `test-simple-wave1-boundary.md`（RWE-002, RWE-008）— light playbook：pre-seeded reference → 写 skeleton + `capability: foundation-placeholder` → gate pass → 写 unmarked skeleton → gate fail → 写含 false claim 的 skeleton → gate fail。Body 显式列出 DO/DON'T
  - verify: playbook PASS；trace 记录 3 条 `check` event（1 pass + 2 fail）；reviewer 能在 Markdown 中看到 boundary

- [x] **7.3*** `test-simple-wave2-synthesis.md`（RWE-003, RWE-009）— light playbook：pre-seeded Wave0/Wave1 → 写 synthesis 含 valid Markdown links → gate pass → 写无 link synthesis → gate fail → 写有 links 但 target 都缺失 → gate fail
  - verify: playbook PASS；trace 包含 3 条 `check` event（1 pass + 2 fail）；`cross_field` 行为可见

- [x] **7.1*** `test-simple-wave0-happy-path.md`（RWE-001）— light playbook：创建 disposable bundle → 写入 fixed seed topics → 写 schema-valid reference metadata → 运行 wave0-complete gate（pass）→ 移除一个 topic 的 metadata → 验证 gate fail（inspect 指向缺失 topic）→ 清空 topic_registry → 验证 gate fail（inspect 指向空 registry，证明 topic 集合 source of truth = registry 而非磁盘扫描）→ 再写数量达标但 schema 不合格的 reference → 验证 gate fail（count_floor pass 但 schema_valid fail，AND 交互）→ 再写 registry 3 topic 但漏 1 个 reference 目录 → 验证 gate fail（`{topic}` 展开后精确指出缺失）→ verdict from trace
  - verify: playbook PASS；trace 记录 5 条 `check` event（1 pass + 4 fail）；空 registry 场景 gate 返回 `passed: false` 且不 crash；count_floor/schema_valid AND 交互分支可见；`{topic}` 展开机制可见

---
### ⏸️ PAUSE — 手工验证 Group 1

> **停下来。** 运行上面 4 个 playbook，确认每个 gate 的行为在真实 bundle 中正确：
> - 7.0 seed-topics：`dir_non_empty` 和 `slug_consistency` 检测到空目录/缺 slug/多余 slug？
> - 7.2 wave1：`pattern_match` 检测到 placeholder marker 缺失？false completion claim 被 `negate:true` 拦下？
> - 7.3 wave2：`cross_field(markdown_link_resolution)` 解析 Markdown link → 验证目标存在 → 死链接被检测？
> - 7.1 wave0：`count_floor` + `schema_valid` AND 交互正确？空 registry 场景 gate 返回 `passed:false` 不 crash？`{topic}` 展开精确指出缺失 topic？
> - 每个 playbook 的 `_trace.jsonl` 中 `check` event 数量是否与预期一致？
>
> **Group 1 4 个 playbook 全部 PASS 后再开写 Group 2。**

---
### Group 2 — 多 gate 串联 + 横切（建在 Group 1 验证通过的基础上）

- [ ] **7.5** `test-medium-wave-repair-loop.md`（RWE-005）— light repair-loop playbook：选择 Wave2 gate（引用链最容易演示 fail→fix→pass）。synthesis 初始无有效 links → gate fail → read inspect/advice → 追加 links → rerun → pass。展示 repair 前后 diff
  - verify: trace 同时记录 failed 和 passed `check` events；fails 数量 < 初始 rules fail 数量；final verdict PASS
  - **已知覆盖缺口**：Wave0 和 Wave1 的 repair 路径仅由集成测试（Section 5）覆盖，没有独立 playbook。

- [ ] **7.6** `test-medium-wave-fault-tolerance.md`（RWE-006）— light fault-tolerance playbook：覆盖 malformed YAML（parse error → schema_valid fail）、missing artifact reference target（cross_field individual fail but other ref valid → overall pass）、status drift（wrong current_gate → status_value fail）。不修正错误，只证明 gate 检测到
  - verify: 所有畸形场景 gate 都返回 actionable inspect/advice（不 crash、不 silent pass）；trace 记录各 fail event
  - **已知未覆盖的更底层结构损伤场景**：corrupted `rb_trace.jsonl`、`--bundle` 指向不存在的目录、`rb_plan.md` YAML frontmatter 无法 parse

- [ ] **7.4** `test-simple-waves-full-chain.md`（RWE-004）— light playbook：pre-seeded post-setup bundle → **物化 seed_topics（gate seed-topics pass）** → 写 Wave0 reference → gate wave0 pass → 写 Wave1 skeletons → gate wave1 pass → 写 Wave2 synthesis → gate wave2 pass。证明 seed-topics → wave0→1→2 全链路可顺序串联
  - verify: trace 记录 4 条 `check` event 全部 pass（seed-topics + 3 wave）；verdict PASS

- [ ] **7.7** `test-complex-wave-review-surface.md`（RWE-007）— light playbook：pre-seeded 完整 Wave0/Wave1 → 写入 fixed synthesis（不依赖 live AI）→ gate wave2 pass。Markdown body 显式展示 Wave0 reference metadata（url/title/retrieved_date/topic_tag 摊开成表，供人审 reference 是否真实，对应 charter 的 no-make-believe 原则）、synthesis 全文、引用链表格、review checklist
  - verify: reviewer 不读 JS 即可在 MD 中看到 Wave0 reference 真实内容（url/title 摊开）、synthesis 全文和引用链；不依赖 live AI generation

## ⏸️ REVIEW #3 — Experiment 结果裁决（跑完 playbook 后）

> **停下来。** 8 个 playbook 全部跑完后，进 governance 前确认：
> - **verdict 只来自 trace**：每个 playbook 的 PASS/FAIL 是否真的从 `_trace.jsonl` 的 `check` event 裁决，而不是看 console output 或人觉得"应该过了"？
> - **trace event 数量对得上**：happy/fail playbook 的 trace 是否记录了预期数量的 `check` event（如 7.1 应有 1 pass + 4 fail，7.4 full-chain 应有 4 个全 pass（seed-topics + 3 wave），7.0 seed-topics 应有 1 pass + 3 fail）？数量对不上说明流程没跑全。
> - **fail case 真的 fail 了**：boundary / fault-tolerance / repair-loop playbook 里的 fail 分支，gate 是否真的返回 `passed: false` 且 inspect 指向正确缺失？还是被 silent pass 蒙混？
> - **repair loop 闭环**：7.5 的 failed→passed trace 是否同时存在？repair 后的 rules fail 数量是否真的 < 初始？
> - **review surface 有真东西**：7.7 摊出来的 Wave0 reference / synthesis 内容是否真实可审，还是占位/假数据？
> - **disposable bundle 清理**：跑完是否还有残留 `dpt_disp_*` 目录？
> - **governance 前置**：`check-project-reqs.mjs` 和 `check-project-specs.mjs` 是否都还没跑（它们是 Section 8 的事，不应在实验裁决里做）？
>
> 这道关过了，才能进 Section 8 governance。

---

## 8. Governance Checks

> 依赖：全部 Section 完成。两个 check 脚本必须 PASS 才能归档。

- [ ] **8.1** `node openspec/governance/check-project-reqs.mjs` PASS — 扫描 registry 一致性
  - verify: exit code 0，0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired

- [ ] **8.2** `node openspec/governance/check-project-specs.mjs` PASS — 扫描 delta header 和大纲完整性
  - verify: exit code 0，0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader

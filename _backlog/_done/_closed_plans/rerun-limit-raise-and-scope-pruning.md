# Rerun 上限提升 + 剔除/差异化投入（scope pruning & weighting）计划

> 状态: closed（2026-08-28，A / B1 / B2 全部收口，已移入 `_done/_closed_plans/`）
> 触发: 用户跑 harness 后反馈，rerun 这条线的第一个
> 感受根因: 当前 rerun 是**只增不减**——能 add topic、加维度、补 direction，但不能「删 topic」、不能「降深度/广度」；且 topic 之间「一视同仁」。
>
> **v2 更新（本轮）**:
> - B1「剔除」**pivot**：不造 in-place retire 了，改用「起一个新 bundle 收窄 topic 集」（现成逃生口），见 B1。
> - B2「降深度/广度」**重新挂接**到已归档的 `topic-research-emphasis` 设计（P1–P3 已实现「重要 topic 多挖」），剩余缺口是「次要 topic 少挖 / 数值权重」——两者当时被 D-001/D-004 明确否掉，见 B2。
>
> **落地记录（2026-08-28，两个 OpenSpec change 全闭环）**:
> - ✅ **A（上限 32）** + **B1-a（doc 修复）** → `openspec/changes/archive/2026-08-28-raise-rerun-limit-and-fix-removal-guidance`（17/17 finalizer 检查）。
> - ✅ **B2-(a)（重要 topic 多挖的落地兜底）** → 走「HITL2 可见性」，`openspec/changes/archive/2026-08-28-surface-declared-focus-at-hitl2`（新增 HIU-007：HITL2 review 列出已声明 focus → focus_coverage 结果，堵 silent-focus-drop，不推翻 URC/wave1-intake）。
> - ✅ **B2 收口**：用户确认「只提重要的，不提的自然就是次要」——即自然语言 emphasis（(a) 已做）。**不做** B2-(b)「次要 topic 少挖」、**不做** B2-(c)「数值权重」，不重开 D-001/D-004。

## 诉求清单

| ID | 诉求 | 一句话 | 现状结论 |
|----|------|--------|---------|
| A | rerun 次数上限 | 10 → **32** | 机械，只改一处 definition |
| B1 | 剔除 seed topic | 收窄 topic 集 | **pivot：新 bundle**，不造 retire |
| B2 | 差异化投入（权重） | 不让 topic 一视同仁 | ✅ 收口：自然语言 emphasis（(a) 已做 + HITL2 可见性），不做少挖/数值权重 |

---

## 现状事实基线（grounded，逐条有坐标）

### A) 上限：10 → 32

- **单一真相源**: `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-rerun-ready.definition.json` → rule `rerun_count_valid` → `{ "check": "rerun_count_limit", "operator": "less_than", "value": 11 }`。即 `rerun_count < 11` → 最多 **10** 次。
- **唯一语义解释**: `engine/helpers/rerun-availability.mjs#evaluateRerunAvailability` 读 `rule.value` 为 `exclusiveLimit`，算 `available = evaluatedCount < exclusiveLimit`；**不硬编码数字**。
- **消费者**（都走同一 evaluator，无第二处数字）: `cli/gates/check-gate-rerun-ready.mjs`（formal gate，`includeNextIncrement:false`）、`engine/helpers/post-final-recovery.mjs`（guard，记 `definition_sha256`+limit）、`phase-hitl2.md` §3a 只读 advice（`includeNextIncrement:true`）、`engine/helpers/handoff-helpers.mjs`（count delta + definition binding）。
- **测试不硬编码**: `tests/engine/helpers/rerun-availability.test.mjs` 用合成 `exclusiveLimit:3`；`tests/integration/md/iterative-interaction-contract.test.mjs` 断言 brief 不得硬编码 rerun_count 比较。
- **accepted spec 明示**: `openspec/specs/workflow/rerun-incremental-node/spec.md`（REI-003）「Changing the active boundary value ... SHALL require a separate accepted behavior change」→ 本次即那个 change；且 spec 要求 docs/spec **不硬编码数字**。
- 结论: 数字 `11` 只在 definition JSON 一处 + 其 `failure_message` 文案「maximum of 10」。

### B1) 剔除 seed topic

- 现状已存在 `mutate_layout`（`operate-topic-state.mjs apply`, context `rerun`）的 `remove_topic_uids[]`，支持 rename / reorder / renumber / **safe-remove**。
- `safeRemoveBlocker`（`engine/helpers/canonical-topic-state.mjs:1530`）把「历史」定义为三处命中即挡: (1) `rb_queue.json` active_window/refill_pool/terminal_history 绑定该 UID；(2) `_work_units/_index.json` 任一 work unit 绑定该 UID；(3) `artifacts/wave0/{slug}`、`artifacts/wave1/{slug}`、`reference/{slug}`（含历史 slug）。命中 → `remove_has_history`；无法唯一 resolve → `remove_history_unresolved`；inbound dependency → `remove_has_dependents`。
- 结论: 只有**从未开工、无依赖**的 topic 能删；凡走过 wave0 的 topic 一律不能删。in-place 退役已研究 topic 需新造 retire 语义，成本中-大。
- **pivot（用户决定）**: 不造 retire。**「剔除已研究 topic」= 起一个新 bundle，HITL1 时只放保留的 topic**。这是现成逃生口（rerun 上限耗尽 / post-final recovery 本就建议 "start a new Deep Research"），零引擎改动。
  - 代价（显式记录）: 新 bundle 是 clean slate，**保留的 topic 会从头重挖**，不继承旧 bundle 已收集的证据。若将来要「保留旧证据、只退一个 topic」，才回到 retire 语义（本轮不做）。
- **仍值得做的 doc 修复（B1-a，小）**: `phase-rerun.md` Stage 2 表把 remove/rename/renumber 标成 `unsupported C3B`，与 Stage 3 + `operate-topic-state.md` + accepted specs 矛盾。应改为: safe-remove 仅限从未开工 topic；已研究 topic 的剔除 = 新 bundle（不写回本 bundle）。

### B2) 差异化投入（权重 / 不「一视同仁」）

- **已实现的部分**: `topic-research-emphasis` 计划 P1–P3 已归档（2026-08-08），代码在 current head。语义 = 每个 topic 先吃同一个 common baseline，用户用**自然语言 focus brief** 表达「哪个 topic 多挖」，P2 提供可追溯 focus coverage Gate（covered/partial/blocked），P3 提供读者证据地图。详见 `_backlog/_done/_closed_plans/topic-research-emphasis/README.md`（D-001~D-010）+ `progressive/README.md`。
- **当时明确否掉的两样**（D-001/D-004）:
  1. **数值权重 / 优先级分 / source-count floor 差异化**（D-001: "not a per-Topic quality score, priority score, or source-count floor"；D-004: "does not expose weights, formulas, source floors"）。
  2. **让次要 topic 掉到 baseline 之下**（D-001: "does not permit a less-emphasized Topic to fall below the baseline"）。
- 深度广度机器权威 = `research_profile` + `research_style_params`（`computeResearchStyleParams({styleDefinition, topicCount})` 纯函数；唯一 writer `apply-research-style.mjs`；只在 registry length 变化重算）。`research_profile` 在 rerun 被 C5/lineage 视为不可 drift。rerun 方向里的 `adjusted_depth` 是 prose guidance，无 engine 消费。
- **待定（重开 D-001/D-004 才成立）**: 「次要 topic 少挖」= 掉到 baseline 之下 = per-topic 或全局降档；「数值权重」= 显式 weight 表单。两者都是**新需求**，须用户明确要，才切 OpenSpec change。

---

## (a)「重要 topic 多挖」落地审计（本轮实跑验证）

> 用户要求：不要只信"号称对了"，要看当前 harness 里这块到底怎么落地。

**结论：机器侧是真的、测试锁死的；但「用户 focus → wave1 focus_coverage」这一跳是纯 Agent 自觉、无引擎兜底，且从未被真 Agent 跑通过。**

### 真的部分（deterministic，已验证）

- Gate 规则在 `schema/gate_definitions/gate-wave1-complete.definition.json`（`focus_coverage_limit`）。
- 校验器 `engine/helpers/wave-depth-contracts.mjs#evaluateWave1FocusCoverage` 全套：exact keys（`topic_uid`/`rerun_count`/`outcome`/`commitments`）、covered/limited 两种 commitment shape、boundary_kind ∈ {external_action,user_decision,missing_contract}、round 绑定（ref 必须带当前 `rerun_count`）、submitted work-unit 权威校验。
- 读者地图 `engine/helpers/reference-index-sync.mjs`：`reference/README.md` 的 `### Current focus increments`，无 focus_coverage 时诚实显示 `not declared`。
- 测试 14/14 通过（`wave-depth-focus-coverage`、`wave1-focus-coverage-contract`、`wave1-focus-coverage-rerun`、`reference-evidence-map(-rerun)`）。

### 裂缝（落地风险，命名：**silent focus drop**）

1. **HITL1 focus brief 是叙事，Engine 故意不解析**：`phase-hitl1.md` §3b.2 明说 focus 写进 `rb_plan.md## Constraints > ### User Research Controls`，"不被 renderer、Engine、Gate 或后续 consumer 解析为结构化 authority"。`plan-hostfile-sections.mjs` renderer 对 focus **零结构化标记**。
2. **schema 里没有任何结构化「focus 已声明」字段**（profile.mjs 里唯一的 `primary_focus` 是 HITL2 composition 的交付 view，不是 HITL1 研究 focus）。所以 Engine 无从知道"用户声明了 focus"。
3. **focus_coverage 缺块 = clean pass**：`evaluateWave1FocusCoverage` 第 172 行，无 `focus_coverage` → `passed: true, status: 'none'`；集成测试还专门锁死 `keeps missing focus and covered focus on the existing clean Wave1 path`。
4. **纯 Agent 自觉的传导**：`phase-wave1.md` line 249 让 Agent"从 controls baseline + Seed projection 派生 commitment"，是 instruction 不是 enforcement。Agent 一漏，gate 干净通过、读者地图显示 `not declared`，**全链路零确定性信号提示"声明了但没承接"**，用户只能到 HITL2 自己肉眼发现。
5. **真 Agent 链从未跑过**：Case 125 登记但未 launch（`topic-research-emphasis/progressive/README.md` 明写 "unlaunched real Agent-flow surface"）；P3 实包验证里 5 个 topic 全部 `not declared`。

### 修法方向（若用户要"确保它做得对"）

- **A（确定性兜底，推荐）**: 加一个**最小结构化「focus 已声明」标记**（presence flag：topic_uid + round，不解析 prose）——HITL1 接受 focus 时写入；再加一条 gate/inspect：`declared focus @ topic X @ round N ⇒ wave1 depth-review 必须带 focus_coverage（covered/partial/blocked），否则 fail`。守住"Engine 不解析自由文本"的边界，只堵住 silent drop。
- **B（HITL2 可见性）**: HITL2 汇总列出「已声明 focus」vs「covered/partial/blocked/not declared」，让 drop 可见（仍依赖 A 的标记才可靠）。
- **C（验证兜底，最小）**: launch Case 125（真 Agent flow）+ 加一条 deterministic_e2e（seed 一个 focus brief + depth-review，断言读者地图显示 increment）。

---

## 方案设计

### A) 上限 32（小，机械）

1. `gate-rerun-ready.definition.json` → `"value": 11` 改 `"value": 33`（exclusive → max 32）。
2. 同文件 `failure_message` 文案 "maximum of 10 rerun cycles" → "maximum of 32 rerun cycles"。
3. 复查 `shared-profile.md` / `shared-gate-rules.md` —— 当前均无手写数字，只确认措辞稳。
4. 新增/对齐回归: 读 production-parsed operator/value，证 `<33` 通过、`==33` 与 `>33` 失败（对齐 REI-003，不复制数字到独立常量）。
5. 迁移注意: `post-final-recovery` guard 记 `definition_sha256`；改 definition 会让**在飞** post-final recovery 判定 drift（`rerun_rule_drift`），新 run 无影响，预期 fail-closed，不额外处理。

### B1) 剔除 topic → 新 bundle（不做 retire）

- **B1-a（小，doc 修复）**: 修 `phase-rerun.md` Stage 2 的 stale `unsupported C3B` 行 → 指向 safe-remove（仅限从未开工 topic）+ 「已研究 topic 剔除 = 新 bundle」。可与 A 并进一个小 change。
- **B1-b: 本轮不做**。若未来要「保留旧证据 + 退一个 topic」再回到 retire 语义（`safeRemoveBlocker` 加 retire 分支、`previous_layouts[]`/`retired_topics[]`、wave/gate/reference 排除、style 重算）。

### B2) 差异化投入 → 三选一，先问清

- **(a) 重要 topic 多挖** → 已做完（P1–P3）。本轮**零新 change**，只需在 HITL1/HITL2 UX 里让用户感知到 focus brief 的入口（若跑的时候没感知到，可能是入口文案/推荐没把 emphasis 摆出来——可单独观察，不急着改）。
- **(b) 次要 topic 少挖（掉到 baseline 之下）** → 重开 D-001。两种粒度:
  - 全局降档（`research_profile` 降档：claim_verification→exploratory_map→quick_factual，复用 style ladder，小-中）；
  - per-topic 降档（把 `adjusted_depth` 升级为结构化 per-topic floor，大）。
- **(c) 数值权重/优先级** → 重开 D-004，需新 schema + 权重语义 + gate/coverage 消费，最大。**不建议**（D-001 的「weight 是质量假代理」论据仍成立）。

---

## OpenSpec change 切分（proposal 草案，随用户拍板调整）

| Change | 内容 | 规模 | 前置 |
|--------|------|------|------|
| 1 | A（上限 32）+ B1-a（doc 修复） | 小 | 无 |
| 2 | B2-(b) 全局 profile 降档（若用户选 b） | 小-中 | 重开 D-001 |
| 3 | B2-(b) per-topic 深度/广度 overlay（若用户要） | 大（后置/可选） | Change 2 |
| 4 | B1-b retire（本轮不做，未来触发） | 中-大 | 用户重新要「保留证据 + 退 topic」 |

建议顺序: 1 →（2，若选 b）→（3，可选）。

---

## 风险 / 边界

- **证据诚实 vs 剔除**: 新 bundle 收窄不触碰旧 bundle provenance（旧 bundle 原地保留为历史）。绝不物理删/重写。
- **`definition_sha256` 绑定**: 上限改动对在飞 post-final recovery 的影响（预期 fail-closed）。
- **重开 D-001/D-004 的成本**: 「少挖」或「权重」会碰到 emphasis 设计里反复论证过的「source-count ≠ 质量」「不让次要 topic 掉到 baseline」红线，须显式推翻已归档决策，不是小改。
- **composition/final 一致性**: 若走降档/权重，HITL2 `composition_handoff` 必须显式表达「哪些 topic 少挖、深度为何降低」，否则 Final 与 evidence 对不上。

---

## 已拍板（closed decisions）

1. **B1**：剔除 = 新 bundle（clean slate，保留 topic 从头重挖）。不做 in-place retire（留待未来显式触发）。
2. **B2**：差异化投入 = 自然语言 emphasis——「只提重要的，不提的自然就是次要」。(a) 已做（P1–P3）+ 本轮 HITL2 可见性（HIU-007）堵 silent drop。**不做**数值权重、**不做**次要 topic 降档，不重开 D-001/D-004。
3. Change 落地顺序：1（A + B1-a）→ 2（HITL2 可见性），均已归档。

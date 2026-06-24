## Why

Wave2 是最后一个尚未接入 queue 的 research phase。Wave0（source intake）和 wave1（deepening）已在 Change 1/2 中实现完整的 queue-driven 三阶段 + sub-agent dispatch，但 wave2 仍是 foundation placeholder——一份简单的 `synthesis.md`，没有 queue、没有迭代 gap-fill、没有 sub-agent 补搜。V12 的核心教训是：synthesis 不能只基于已有 artifact 做本地综合——真正的 synthesis 过程中才会发现缺了什么（某 topic 证据不足、某 claim 未验证、某维度未覆盖），需要回头搜、补证据、再综合。这是一个 **synthesize → find gaps → search → re-synthesize** 的迭代 loop。Change 3 把 wave2 升级为 queue-driven iterative synthesis phase，闭合所有 research phase 的 queue 覆盖。

## What Changes

- 重写 `phase-wave2.md` §3：从自由文本升级为 queue-driven 三阶段（灌料→执行循环→收尾+gate）
- 新增 `phase-wave2-subagent.md`：gap-fill 补搜 sub-agent 的行为指令（role: `dpt-topic-scout`，定向搜索填补 synthesis 发现的缺口）
- **Synthesis 本体 1 个 task card**（`targets: {controller: main-agent}`，Phase Agent 执行综合判断；`main-agent` 为当前 Queue schema wire value）——queue 在 N=1 时仍提供 `file:` receipt 检查、done-condition pressure、trace 记录、repair 自动生成
- **Per-topic backfill N 个 task card**（`targets: {controller: main-agent}`，Phase Agent 执行 token 替换；`main-agent` 为当前 Queue schema wire value）
- **Gap-fill 补搜**不走 queue delegates（顺序依赖的判断链——先 synthesis 产出 gap list，再定向补搜），由 Phase Agent 直接 spawn sub-agent（`dpt-topic-scout`），搜索结果回写 synthesis
- **迭代 loop**：synthesis → 识别缺口 → spawn sub-agent 补搜 → 回写 synthesis → 直到无新缺口或达到迭代上限
- 新增 producer_rule `cross_topic_synthesis`（synthesis 本体 task，`priority_class: P2_close_open_loop`）+ `seed_topic_backfill_wave2`（per-topic backfill task，`priority_class: P4_progressive_artifact_or_seed_backfill`）
- Wave2 gate 适配：新增 3 个 `pattern_match` 规则（两个 backfill token 替换 `negate:true` 分别覆盖 `__BACKFILL_WAVE2_JUDGMENT__` 和 `__BACKFILL_PENDING_QUESTIONS__` + wave1 evidence 引用检查）
- 实验验证：wave2 synthesis + gap-fill loop playbook
- **Wave2 artifact 从单一 synthesis.md 升级为三件套**：`synthesis.md`（narrative projection）+ `cross-topic-ledger.md`（Agent-readable 动态账本，6 个固定 section）+ `finding-index.yaml`（JS-readable shadow index，11 个 required field）。`synthesis.md` 降级为叙事投影，不再作为动态 finding source of truth
- **Finding taxonomy**：三类 finding（`wave1_legacy_question` / `cross_topic_resolution` / `cross_topic_emergent_question`）替代原来的统一 "gap" 概念。不是所有 finding 都是 gap——resolution 是既有证据整合，不应搜索
- **六种 exploration/exploitation decision**：`use_existing_evidence` / `exploit_search` / `explore_search` / `defer_hitl2` / `requires_internal_data` / `record_only`。每个 finding 必须先做 decision 才能 spawn sub-agent；legacy gap-fill 是 exploit，emergent exploration 是 explore
- **Cross-topic scan matrix**：`cross-topic-ledger.md` 的固定 section，记录哪些 topic pair/group 被检查、检查了哪些维度（shared_pattern/contradiction/resolution_opportunity/emergent_question），证明 cross-topic scan 真的发生过
- **JS feedback rails 三层检查点**：L0（local parse/shape，抓 malformed YAML/缺 section）、L1（lifecycle consistency，7 个语义边界检查点抓 decision/receipt/handoff 断链）、L2（phase gate，最终裁决）。反馈节奏按语义边界触发，不是每次编辑都跑
- **Failure budget**：L0 立即修复；L1 同一 finding/边界最多 2 次修复尝试后 escalate 到 `defer_hitl2` 或 `record_only`；L2 不降级
- **Backfill 从 token 替换升级为 projection**：从 ledger/index 投影，保留 `source_layer: wave2_cross_topic`、finding id、decision/status，不改变 finding 归属
- 极少量 gate CLI 改动——wave2 gate CLI 需新增 `pattern_match` check type 支持（~35 行，可从 wave1 gate CLI 复用逻辑）。Engine、queue、relay 零改动

## Capabilities

### New Capabilities

- `wave2-synthesis`: Wave2 cross-topic synthesis via queue-driven iterative finding triage + targeted search loop。1 个 synthesis task card（Phase Agent 执行；当前 wire value 为 `targets.controller: "main-agent"`）+ N 个 per-topic backfill task card（从 ledger/index 投影，替换 `__BACKFILL_WAVE2_JUDGMENT__` + `__BACKFILL_PENDING_QUESTIONS__`）。

  **三件套 artifact group**：`synthesis.md`（narrative projection，人类阅读）+ `cross-topic-ledger.md`（Agent-readable dynamic ledger，6 个固定 section：Scan Matrix / Legacy Questions / Resolutions / Emergent Questions / Exploration Decisions / HITL2 Handoff）+ `finding-index.yaml`（JS-readable shadow index，11 个 required field per finding）。

  **Finding taxonomy**：`wave1_legacy_question`（来自 Wave1 question-list 的未解决问题）/ `cross_topic_resolution`（用其他 topic 既有 evidence 回答 legacy question，不搜索）/ `cross_topic_emergent_question`（Wave1 阶段不存在、Wave2 拉通后首次出现）。每个 finding 有 lifecycle：candidate → classified → decision_made → searched/not_searched/deferred → projected → backfilled。

  **六种 decision**：`use_existing_evidence` / `exploit_search` / `explore_search` / `defer_hitl2` / `requires_internal_data` / `record_only`。Synthesis 过程中发现 finding 时，先做 decision，只有 exploit_search/explore_search 才 spawn sub-agent。

  **JS feedback rails**：L0/L1/L2 三层检查点，按语义边界触发（ledger/index 初建后、finding triage 后、sub-agent spawn 前、receipt ingest 后、synthesis projection 后、backfill projection 后、phase gate），每层反馈给出 check/inspect/advice。L1 最多 2 次修复尝试后 escalate。

### Modified Capabilities

- `research-wave-phase-content`: RWP-003（wave2 phase body）从 foundation placeholder 升级为 queue-driven iterative synthesis——§3 改为三阶段模式，§3a backfill 改为 queue-driven，新增 finding triage + targeted search loop 指令。**Expected Artifacts 从单一 synthesis.md 扩展为三件套**（synthesis.md + cross-topic-ledger.md + finding-index.yaml），ledger 有 6 个固定 section，index 每 finding 有 11 个 required field。RWP-006（synthesis link 引用）扩展——除 Wave0/Wave1 artifact 外，narrative 需引用 finding id（W2F-xxx），gate 检查 ledger/index 存在性和完整性。
- `agentic-queue`: 新增 producer_rule `cross_topic_synthesis`（synthesis 本体 task）和 `seed_topic_backfill_wave2`（wave2 per-topic backfill task）。Synthesis task receipt 从单文件扩展到三件套。
- `research-wave-gate-implementation`: RWG-003（wave2 gate rule set）扩展——新增 backfill token 替换验证、wave1 evidence 引用完整性检查、**三件套 artifact 存在性检查**（ledger 文件存在 + section pattern + index YAML parse）。**新增 phase-internal feedback checkpoint 概念**（区别于 phase boundary gate），L0/L1 反馈用于 Phase Agent 修复，L2 gate 用于 phase transition 裁决。

## Impact

- **Phase MD**: `phase-wave2.md`（§3 完整重写为 queue-driven 三阶段 + finding triage + targeted search loop + 三件套 artifact + JS feedback checkpoint 调用）+ 新增 `phase-wave2-subagent.md`（gap-fill sub-agent 行为指令）
- **Shared MD**: `shared-subagent-protocol.md`（无需修改——gap-fill sub-agent 不通过 queue delegates，直接 spawn，但仍遵循 relay slot 契约）+ `shared-schemas.md`（需要新增 wave2 三件套 artifact 路径说明 + finding-index schema + finding type/decision/status enum 值）
- **Gate**: `check-gate-wave2-complete.mjs`（新增三件套 artifact 检查 + backfill token 替换检查 + evidence-summary/question-list 引用完整性）+ `gate-wave2-complete.definition.json`（新增 ledger section pattern、index YAML parse、finding id reference 规则）
- **Registry**: `req-registry.yaml` 新增 WTS-001~009 + AGQ-015~016 + RWP-008 + RWG-009~010
- **Playbook**: 新增 `experiments_playbook/exp_wfn_wave2/` 下 wave2 synthesis + finding triage + feedback loop playbook
- **Tests**: `tests/integration/md/` 新增 phase-wave2 queue-loop structure regression + artifact group structure tests

### Non-Goals (显式范围外)

- 不改 `queue-manager.mjs`、`operate-queue.mjs`、`subagent-relay.mjs`——engine/relay 层零改动
- 不做 V12 30+ 字段 evidence 质量模型（tier/trust_level/commercial_intent/marketing_risk 等）——那是后续 change 的事，landing analysis §6.2c 已标记为 Change 3/4 考虑
- 不做 V12 四区 question ledger 的完整生命周期管理（synthesis 以 question-list.md 为输入、通过 backfill 更新状态标签，但不引入新的 ledger 结构或 EQP 协议）——这超出 wave2 范围
- 不做 V12 Anti-Stall Budget（证据质量退化的量化边界）
- 不做 stop authorization 强制执行
- 不做 error recovery / stale claim 检测
- 不改 `phase-wave0.md`、`phase-wave1.md`、`phase-seed-topics.md`（它们已在 Change 1/2 完成）
- Gap-fill sub-agent 不做 multi-round fan-in/fan-out（每轮独立 spawn，sub-agent 之间不通信）

## Acceptance Criteria

Change 完成必须满足以下条件：

- **AC1**: `phase-wave2.md` §3 为完整 queue-driven 三阶段（灌料→执行循环→收尾+gate），§3.2 含 finding triage + targeted search loop 协议（finding 分类 → decision 判断 → 迭代收敛条件 + sub-agent spawn 指令）
- **AC2**: `phase-wave2-subagent.md` 存在且定义完整 gap-fill sub-agent 行为（role/input/output/dirs/forbidden/fetch chain）
- **AC3**: `gate-wave2-complete.definition.json` 新增规则覆盖三件套 artifact（ledger 存在 + non-empty、ledger 固定 section pattern、index YAML parse） + backfill token 替换检查 + wave1 evidence 引用检查
- **AC4**: `check-gate-wave2-complete.mjs` 支持 `pattern_match` check type（含 `negate`），所有现有测试保持 PASS
- **AC5**: wave2 happy-path playbook PASS——2-topic synthesis → gate pass，三件套 artifact 均存在，synthesis.md 含 Markdown links + W2F-xxx finding id，ledger 含 6 个 section，index parseable
- **AC6**: wave2 finding triage + search playbook PASS——正确区分 legacy question/resolution/emergent question，resolution 不 spawn sub-agent，search finding 有 receipt，无 orphan finding
- **AC7**: wave2 gate-fail repair playbook PASS——gate fail → inspect/advice → repair → gate pass，trace 含 2 条 gate_attempt
- **AC8**: 全量回归 `node --test tests/` PASS（无退化）
- **AC9**: `node openspec/governance/check-project-reqs.mjs` PASS
- **AC10**: `node openspec/governance/check-project-specs.mjs` PASS

## Key References

| 文件 | 角色 |
|------|------|
| `_backlog/queue/agentic-queue-landing-analysis.md` §4, §6.2a | 上游需求基准：wave2 设计方向 + Change 3 范围定义 |
| `_backlog/_workflow/openspec-change-map.md` | Change 结构维度参考（owns/does not own、验收标准、关键引用） |
| `_backlog/wave2_e2/emergent-phenomena-in-cross-topic-synthesis.md` | **设计输入**：三件套 artifact group、finding taxonomy（三类 + 六 decision）、scan matrix、anti-cheating rules |
| `_backlog/wave2_e2/wave2-engine-feedback-rails.md` | **设计输入**：JS feedback rails（L0/L1/L2 三层、7 个语义边界检查点、failure budget、consistency rules） |
| `guidelines/project-charter.md` | 四层分工权威边界（Agent/JS/MD/JSON） |
| `guidelines/agentic-queue-mechanism.md` | 两层 loop 定调（外层 gate+chain、内层 claim→execute→complete） |
| `guidelines/agentic-workflow-mechanism.md` | 外层 loop 机制（phase 间 gate → chain → next） |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` | 当前 wave2 foundation placeholder——改写的起点 |
| `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md` | Relay slot 通信契约——gap-fill sub-agent 遵循的目录/契约/concurrency 规则 |
| `DPT_FRAMEWORK/engine/queue-manager.mjs` | Queue engine——enqueue/claim/complete/fail/preempt/render API |
| `DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs` | 当前 wave2 gate CLI——需新增 `pattern_match` check type |
| `DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs` | Wave1 gate CLI——`pattern_match` + `negate: true` 实现的参考模板 |
| `DPT_FRAMEWORK/schema/gate_definitions/gate-wave2-complete.definition.json` | 当前 wave2 gate definition——需新增规则覆盖三件套 + 扩展 backfill token 检查 |
| `openspec/specs/agentic-queue/spec.md` | Queue spec——AGQ-015, AGQ-016 的新 producer_rule |
| `openspec/specs/research-wave-phase-content/spec.md` | Phase content spec——RWP-003, RWP-006, RWP-007 的 MODIFIED + RWP-008 的 ADDED |
| `openspec/specs/research-wave-gate-implementation/spec.md` | Gate implementation spec——RWG-003 的 MODIFIED + RWG-009, RWG-010 的 ADDED |
| `_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/flows/queue-agentic-flow.md` | V12 queue loop 参考——教训来源（不直接读取，除非用户要求） |

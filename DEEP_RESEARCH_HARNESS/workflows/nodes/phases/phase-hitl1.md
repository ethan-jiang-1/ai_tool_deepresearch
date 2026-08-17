---
node_type: phase
id: phase-hitl1
phase: hitl1
gate: hitl1-recorded
stop: "yes"
execution_contract:
  surface: phase-agent
  search_policy: direct_retrieval_probe_only
requires:
  - shared/shared-profile
  - shared/shared-agent-ux-guidance
  - shared/shared-hitl1-capability-probe
  - shared/shared-hitl1-research-access-envelope
  - shared/shared-anti-cheating-rules
suggested_context:
  - brief/hitl1
---

# Phase: HITL1 (Human-in-the-Loop 1)

## 0. Execution Brief

- **Objective**: Resolve the user's research alignment, then collect the accepted research profile, root must-answer set, optional per-run research controls, and HITL1 constraints before confirming current direct research access for silent execution.
- **Start here**: Read `brief/hitl1.md`, the original question, `rb_plan.md`, and `rb_profile.yaml`.
- **Path to pass**: Present the HITL1 alignment draft, wait for the user's answer, write its narrative snapshot before accepted profile/status/topic-state writes, capture the separately rendered optional controls snapshot, apply approved canonical topics and UID-bound seeds, write profile/style decisions, spawn one bounded isolated direct-sample probe, then run the HITL1 gate.
- **Completion check**: User input and a schema-valid completed research-access observation are recorded in `rb_profile.yaml`, and `check-gate-hitl1-recorded.mjs` passes.
- **Failure posture**: Consume top-level `hints[]` first. Ask only for a genuine missing HITL decision; execute authorized mechanical repair yourself and rerun the exact same Gate.

## 1. Stage Goal

向用户展示研究对齐草案，收集 research profile、root must-answer set 和用户约束。草案中的 profile、must-answer 和 Topic map 在既有 HITL1 决定解决前都不是 canonical state。解决后，Agent 先把已确认或明确委托的研究理解写入 `rb_plan.md## Goal > ### HITL1 Alignment Snapshot`；结构化决定仍写入 current run bundle 的 `rb_profile.yaml`，可选研究控制仍只写入 `rb_plan.md## Constraints > ### User Research Controls`。随后在进入 silent waves 前，由一个隔离 probe agent 在当前执行器已获许可的表面上直接观察中国与海外固定公开样本的真实取用情况。

## 2. Required Inputs

- 已实例化的 run bundle（来自 instantiation phase）
- `shared-profile.md`（`rb_profile.yaml` 字段说明）

## 3. Allowed Actions

### 3a. Topic Rewrite（用户输入展开）

用户原始 research question 可能是详细 brief，也可能只有一句话。在问 HITL 问题之前，Agent 必须先确保有一个够好的 original topic 作为后续 seed topics、wave 分配、evidence coverage 的基础。

**判断输入详细程度：**
- 读用户原始输入（来自 conversation context）
- 一句话（如 "帮我研究 AI 安全"）→ 执行 topic rewrite
- 详细 brief（含明确范围、维度、约束）→ 可直接使用，仍建议做轻量整理

**Topic rewrite 步骤（一句话场景）：**
1. 将一句话展开为 structured original topic，覆盖：背景（这个领域为什么重要）、研究范围（边界在哪）、关键维度（从哪些角度切入）、已知前提（已有的共识）、不确定项（需要 research 回答的 open questions）
2. 将 original topic 写入 `rb_plan.md` 的 `## Goal` section。至少填写 `### Purpose`（一段话概述研究目标）。`### Research Questions` 和 `### Scope` 按 HITL1 用户提供的信息填写——信息不足时标注 `(待 HITL2 确认)`，不编造。
3. 从 original topic 推导最小独立 Topic map：保留需要分别回答的问题、证据路径或交付价值；preview 至少有一个 proposed Topic、没有预设上限。一个 Topic 足够时不得为凑数拆分；较大 map 按可审阅的研究线程分组并说明拆分理由。用户确认前，proposed must-answer、Topic map 和 research profile 都只作草案展示；不得直接写 `topic_registry`、seed 文件、accepted profile 或 HITL1 status
4. 将 original topic + seed topics + 建议的 `research_profile` 一起展示给用户

**Slug 命名约定：** 每个 topic 的 `slug` 格式为 `NN_<descriptive-name>`，`NN` 为该 topic 在 `topic_registry` 数组中的 1-based 位置（两位零填充），**不是** `id` 字段的值。`id` SHOULD 与 NN 一致（如 `"01"`），gate 不校验 id 格式——这是 convention 层面的统一。

例如，`topic_registry` 中 3 个 topic 的 slug 写法：

```yaml
topic_registry:
  - id: "01"
    slug: "01_meal-timing-blood-glucose-insulin"
    title: "Meal Timing & Blood Glucose/Insulin"
  - id: "02"
    slug: "02_front-vs-back-calorie-loading"
    title: "Front vs Back Calorie Loading & Weight"
  - id: "03"
    slug: "03_late-eating-metabolic-syndrome"
    title: "Late Eating & Metabolic Syndrome"
```

`NN` 取自数组位置（第 1 个 topic → `01_`，第 2 个 → `02_`，以此类推），与 `id` 字段值无关。如果 `id` 字段写作 `t1`/`t2`，slug 仍用数组位置 `01_`/`02_`。

用户接受、修正或明确委托后，Agent 只有在 §3b.1 已写入 alignment snapshot、§3b.2 已写入 separately rendered controls snapshot，且既有 status synchronization 已成功后，才把完整 approved topic set 写入 caller-owned retained JSON 并运行一次 `operate-topic-state.mjs apply`。Engine 在 legal HITL1 current-node/status window 中分配 immutable UID/ordinal/slug，并用一个 prepared manifest 提交最终 registry 与全部 UID-bound seed skeletons。若返回 accepted workspace，Agent 运行 exact recover command 后重试；不得直接编辑 registry/seed。提交成功后立刻读取结果；只有结果返回的 `style_projection` handoff 才决定后续是否需要 style writer。

**Gate 不判断 rewrite 质量。** 人类审查 topic semantics；Engine 验证 canonical identity/intent、UID-bound seed projection、workspace completion 与既有 profile/access contract。

### 3b. HITL1 问题收集

**Prompt 文本来源**：Agent SHALL 从 `brief/hitl1.md` 读取 recommendation-first 入口文本。

**操作步骤**：
1. 读取 `brief/hitl1.md` 的「入口 Prompt」节
2. 填入动态部分：
   - `{DYNAMIC: grounded_goal_and_scope}` → 从原始问题与 §3a topic rewrite 提取目标、研究对象、决策/交付用途和边界
   - `{DYNAMIC: proposed_must_answer_questions}` → 基于原始问题提出具体问题
   - `{DYNAMIC: seed_topics_preview}` → 从 §3a 的 proposed minimum independent Topic map 生成简短预览
   - `{DYNAMIC: recommended_profile_description}` → 一个用户可理解的深度/广度推荐
   - `{DYNAMIC: recommendation_reason_and_effort}` → 推荐理由与大致投入影响
   - `{DYNAMIC: material_frontier_questions_or_none}` → 仅当当前可回答的答案会实质改变既有研究决定时，列出首轮最多三个彼此独立的问题；每项写明推荐或透明默认值及受影响的既有决定。依赖未决答案的问题留到后续；没有这类问题时明确说明当前无须主动澄清
3. 向用户展示完整的入口 prompt
4. 遵循 `shared-agent-ux-guidance.md`：用户可直接接受、自然语言修正、选可选字母或继续提问
5. 在用户清楚接受、修正或明确委托前，入口中展示的 profile、must-answer 和 Topic map 都保持为 reviewable draft；不得写 accepted profile、HITL1 status 或 canonical Topic state。
6. 用户清楚接受、修正或明确委托后，该表达本身就是决定；先简短重述已解决的研究理解，只有实质歧义、真实成本/权限或不可逆风险才问最小确认，不得要求笼统的第二次确认。随后：
   - 按 §3b.1 先写 alignment snapshot；它是叙事上下文，不是 profile、Topic、Gate 或 lifecycle authority
   - 将 `research_profile` 写入 `rb_profile.yaml`（字母→canonical enum 翻译）
   - 将用户接受或修正后的具体问题写入 `root_must_answer_set`
   - 将 `human_decision_checkpoints.hitl1.status` 设为 `recorded`
   - 将 `human_decision_checkpoints.hitl1.recorded_at` 设为当前 ISO 8601 timestamp
   - 按 §3b.2 保持 separately rendered controls snapshot，再运行既有 status synchronization：
     ```bash
     node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to hitl1_recorded
     ```
     读取并消费成功 stdout 后，才写 retained topic-state input 并运行 `operate-topic-state apply`。读取 committed apply/recover JSON 后按 §3c 消费其中的 style handoff，再做 probe 与 HITL1 Gate。同步失败时 canonical topic state 不变；Agent 只遵循返回的既有 legal operation 或 no-path boundary，不手写 `rb_status.json`、不用 force/context bypass，也不先跑 HITL1 Gate 来发现顺序。普通 apply/recover 命令由 Agent 执行，不要求用户共同运行；普通 status 命令同样由 Agent 执行。

### 3b.1 HITL1 Alignment Snapshot

用户清楚接受、修正或明确委托后，在写 accepted profile、HITL1 status 或 retained topic-state input 前，Agent 必须在 `rb_plan.md## Goal > ### HITL1 Alignment Snapshot` 替换 template-owned required-fill marker。快照用简短叙事记录：已确认或明确委托的目标、最终的研究对象/用途/范围理解、material forks 与透明默认值，以及它们和 accepted must-answer、Topic、profile 决定的关系。它不是 conversation transcript，不复用或改变 `### User Research Controls` 的 literal form，也不得被解析、复制或反向推断为 profile field、Topic identity、Gate input 或 lifecycle authority。

若稍后的 profile、status 或 canonical Topic-state operation 阻塞或失败，已经写入的 snapshot 仍是可读叙事上下文，不证明任何 profile/status/Topic fact 已记录，也不允许推进 Gate 或 phase。Agent 必须使用返回的既有 inspect/recover/apply 或 no-path owner；snapshot 仍可读时不得从 chat 重建决定或要求用户重复决定。只有新的已解决用户决定改变其叙事时，才替换 snapshot；不得创建 snapshot-specific recovery state。

### 3b.2 Optional User Research Controls Snapshot

用户可提供优先级、明确排除、来源/证据偏好、分析视角、交付要求、相关业务背景，或一个 optional `research focus brief`。focus 以普通语言说明某个 Topic 还要额外理解什么；它只在所有 Topic 的共同基线之上指导本轮研究，不降低其他 Topic 的既有基线。所有这些内容都是研究指导，不是 profile、Topic field、Gate、来源 floor、receipt、lifecycle 或 schema override。

若用户表达 focus，Agent 先在当前 HITL1 loop 用简短语言反映理解，并允许用户修正；接受后 supplied-controls literal snapshot 必须保留两个清楚标注的叙事部分：`用户的重点原话（逐字保留）` 与 `Agent 对本轮额外研究方向的理解（可由用户修正）`。前者逐字保留，后者只表达当前理解；两者不被 renderer、Engine、Gate 或后续 consumer 解析为结构化 authority。没有 focus 时，不创建空 focus record，维持已有 no-controls/ordinary-controls form。

在用户决定和任何 material conflict 已澄清、且 §3b.1 alignment snapshot 已写入后，Agent 先运行纯 renderer，读取 stdout，再只在已有的 `rb_plan.md## Constraints > ### User Research Controls` coordinate 写入返回的精确 section，随后才创建 retained topic-state input：无额外控制时运行 `node DEEP_RESEARCH_HARNESS/cli/plan-hostfile-sections.mjs render-no-controls`；有控制时把包含上述 labelled focus narrative（如有）的已解析本 run literal snapshot 放在显式 UTF-8 input path，运行 `node DEEP_RESEARCH_HARNESS/cli/plan-hostfile-sections.mjs render-supplied-controls --input <snapshot-path>`。renderer 不寻找 bundle、不写 host file，也不取得新的 writer authority。若 renderer 缺失或返回 code `2` invocation/configuration root，只修正该调用或报告缺失 contract；不得手写较短 fence、发明 alternate rendering protocol，或绕过已有 host-file owner。

用户明确授权读本地文件时，只读取一次并只摘取本 run 适用、可分享的控制到 snapshot；不得保留路径、以后重读、递归读取链接、复制无关内容或形成同步协议。若控制或 focus 与 profile、must-answer、style 或 proposed Topic map 有 material conflict，先在本 HITL1 取得最小用户决定并更新既有 structured owner；不得让 silent phase 私自选择赢家。文件不可读、意图不清或控制过宽时，只问最小澄清或 host prerequisite，绝不虚构 snapshot。topic-state apply/recover 后继续读取已 durable 的 host-file snapshot，不从 chat 或外部路径重建。

### 3c. Research Style Projection Handoff（研究风格参数投影）

`apply-research-style.mjs` 仍是 `rb_profile.yaml#/research_style_params` 的唯一 writer；topic-state 和 Gate 都不写 profile。它必须在 canonical topic registry 已 committed 后才运行，且只由 topic-state 返回的 structured handoff 触发。

**操作步骤：**

1. **读取 committed topic-state JSON**：若结果含有 `style_projection.status: refresh_required`，读取其中的 `selected_profile`、`committed_topic_count`、`checkpoint` 与 `command`。这些是已经提交的 direct facts，不从 profile 再解析或重建命令。
2. **执行 exact command**：运行 `style_projection.command` 原样返回的既有 `apply-research-style.mjs` CLI。该命令读取已提交 registry，计算完整参数对象，并只写 `research_profile` / `research_style_params`。读 stdout，确认 `applied` 与 handoff 的 profile 一致，`topic_count` 与 handoff 的 committed count 一致；Agent 不读 style JSON、不做乘法、不手写参数。
3. **没有 handoff 就不做 style work**：投影/enrichment/rename/reorder 等没有 registry-length change 时，结果不会含 style handoff；不要解析 profile 或启动无条件 style CLI。若 handoff 明示 `profile_unavailable`，不要猜选 profile 或直接改 profile，保留给已有 profile/Gate owner 的 direct root。
4. **同一 Gate 复核 freshness**：在其他 HITL1 prerequisite 已通过后，`check-gate-hitl1-recorded.mjs` 会比较完整参数、selected profile 与 committed count。它不是 style writer；若失败，structured hint 仍只给出同一个 CLI 与同一个 Gate rerun。

**风格选项展示**：向用户展示 research profile 选项时，只展示 `user_visible: true` 的风格（`quick_factual`、`exploratory_map`、`claim_verification`）。`debug` 风格 (`user_visible: false`) 不展示——仅用于开发/测试。

### 3d. Research Access Probe（进入 silent waves 前对当前执行器直接取用的有界观察）

开始本节前，Phase Agent MUST 读取 `shared/shared-hitl1-capability-probe.md` 和独立的
`shared/shared-hitl1-research-access-envelope.md`。Phase 只 actor-deliver 通用安全 guide 和该
controller，不复述其 sample、timeout、concurrency、confirmation、classification 或 return-shape
内容，也不要求任何 provider、工具名或搜索表面。用户的 HITL1 semantic decision 已记录且 required
style handoff 完成后，Phase 无需第二次确认。

`execution_contract.search_policy: direct_retrieval_probe_only` 只授权一次隔离 probe，不授权
Phase 直接检索页面、research evidence collection、work-unit delegation 或 Wave work。

**固定顺序：**

1. 从 `brief/hitl1.md` 的「能力检查沟通 > 探测前提示」读取并原样输出模板。不得在这个已记录的 HITL1 decision 后再请求确认或新的研究决定。
2. 将 `shared/shared-hitl1-capability-probe.md` 的通用安全边界和独立 controller 原样 actor-deliver 到同一个 prompt，并**恰好一次** Spawn 一个 isolated probe agent。prompt 不得包含 bundle path、profile/status/Gate 指令、work-unit 身份、文件写入义务、provider 名、`WebSearch`/`WebFetch` 前提或当前 research topic。Phase Agent SHALL NOT 直接检索样本页面。
3. 等待该 agent 的一个 final return。只接受 controller 所列的 schema-valid current `research_access` available/unavailable branch；Phase Agent 是 `rb_profile.yaml#/research_access` 的唯一 writer，并将 valid return 原样写入。spawn 失败、没有 return、非单一 `research_access` object、malformed 或 contradictory return 时，Phase 写 controller 的 complete honest no-request relay form：`status: unavailable`、当前 ISO `probed_at`、每个 declared sample 一条 `not_attempted` 且不含 surface、一个 direct non-empty `reason`。不得伪造 available、添加 status/Gate/retry state、URL/candidate history、网络位置或 VPN verdict，也不得自动再 spawn。
4. profile write 后、运行 `hitl1-recorded` Gate 前，用原始问题、已确认 must-answer、Topic map、显式 source constraint 与当前 controls snapshot 判断观察到的中国/海外限制是否 material to 本轮研究。**UI 语言、用户语言、假定地理位置和 VPN 状态都不是 source relevance 的语义证据。** 若存在 material gap，停留在同一 HITL1 conversation，呈现最小的用户决定边界（见下）；若没有 material gap，先输出 `brief/hitl1.md` 的「能力检查沟通 > 已记录观察」模板，再运行同一个 Gate。结果不是 Gate verdict；不得提前发送「出口语」或宣布已经进入静默执行。

**Material-gap 对齐 loop：** 当 Agent 判断某个已观察来源组/样本限制与用户明确研究语义相关时，才渲染 `brief/hitl1.md` 的有界中文 prompt（值只来自当前 observation 与已记录研究语义）。用户可：(a) 自行调整网络后请求一次新的完整探测；(b) 修改显式 source constraints；或 (c) 明确「按当前取用范围继续」。没有自动 retry、固定 retry 次数、轮询、VPN 操作、permission bypass 或新的 HITL checkpoint。Agent 不验证、不保留、不推断用户是否实际改变网络；用户的新的 retry 请求本身即充分。每次用户请求的新 round 都从固定双组样本开始一轮完整探测并**替换**当前 observation，不累积 attempt history 或声称 access durable。用户明确接受当前范围时，把其逐字决定只追加到既有 controls snapshot，保留未放宽的硬 source constraint，然后运行同一个 Gate。用户既未解决 material gap 也未请求新 round 时，继续留在既有 HITL1 loop。

**Unavailable recovery：** 保留已记录的 `research_profile`、`root_must_answer_set`、style params 和 `hitl1.status: recorded`。对 schema-valid completed current observation，Gate 不产生 blocking unavailable-root feedback；任何来源限制的 materiality 由 Phase 负责在调用 Gate 前完成用户对齐。不从当前 observation 或 reason prose 推断外部 route。完成既有 direct repair 后，由 Phase Agent 重跑本节同一 isolated probe 和同一 Gate，不要求用户重复回答 HITL1 choices、运行 `curl` 或手改 profile。在 probe 与 Gate 成功前不得进入 Setup。

**Evidence boundary：** Probe URL、page content 和 tool output SHALL NOT 写入或计入 `reference/`、`_cache/`、`artifacts/`、work-unit output/result/receipt、`rb_work_unit_ledger.jsonl`、`rb_output_declarations.jsonl` 或任何 Wave coverage/count floor。

## 4. Expected Artifacts

`rb_plan.md## Goal > ### HITL1 Alignment Snapshot` 已在 accepted profile、HITL1 status 与 canonical Topic-state apply 前写入，保留用户确认或明确委托的研究理解及其与 structured decisions 的关系。它只作叙事 reload context，不是任何 Engine、profile、Topic、Gate 或 lifecycle authority。

`rb_profile.yaml` 中以下字段已写入：

### Payload Checklist（HITL1 最小写入 contract）

| 字段 | 路径 | 要求 |
|------|------|------|
| `plan_basename` | `rb_profile.yaml#/plan_basename` | 已由 instantiation 写入，确认未被误改 |
| `research_profile` | `rb_profile.yaml#/research_profile` | ≠ `not_selected`；用户从 `quick_factual`、`exploratory_map`、`claim_verification` 中选择 |
| `root_must_answer_set` | `rb_profile.yaml#/root_must_answer_set` | 非空字符串数组 |
| `research_style_params` | `rb_profile.yaml#/research_style_params` | 由 `apply-research-style.mjs` CLI 写入（见 §3c 步骤 1-3），Agent 不手写参数。CLI 后验证 stdout 中的 `applied`、`topic_count`、`wave0_shared_ref_total` 值 |
| `research_access.status` | `rb_profile.yaml#/research_access/status` | schema-valid `available` 或 `unavailable` completed observation 通过 HITL1 gate；`unprobed` / absent 留在 HITL1 |
| direct samples | `rb_profile.yaml#/research_access/sample_observations` | 每个 controller declared sample 恰好一条：fixed `sample_id` + 匹配 `source_group` + 一个 closed terminal `outcome` |
| content-only surface | `rb_profile.yaml#/research_access/sample_observations[].retrieval_surface` | 仅 `outcome: content` 时可带一个 truthful executor-neutral surface（`native`/`browser`/`node_fetch`/`curl`） |
| unavailable reason | `rb_profile.yaml#/research_access/reason` | `status: unavailable` 时必填非空 direct summary reason |
| no-request branch | `rb_profile.yaml#/research_access/sample_observations` | whole-probe relay 失败时每个 sample 都是 `outcome: not_attempted` 且无 surface；单个预算到期样本用 `round_budget_not_attempted` |
| `hitl1.status` | `rb_profile.yaml#/human_decision_checkpoints/hitl1/status` | = `recorded` |
| `hitl1.recorded_at` | `rb_profile.yaml#/human_decision_checkpoints/hitl1/recorded_at` | 非空 ISO 8601 timestamp |

`rb_profile.yaml#/research_access` 只由 Phase Agent 写入；isolated probe agent 只返回 transient observation，绝不写 bundle state 或运行 Gate。当前 observation 是 compact final snapshot，不含 URL/body/header/status code/candidate/query/raw tool label/retry/VPN/geolocation/IP/provider 字段。该 checklist 是 review surface；`ProfileSchema` 和 Gate definition 仍是 machine authority。

## 5. Gate Command

```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs --bundle <path> --current-node phases/phase-hitl1.md
```

## 6. On Gate Pass

1. **发送 HITL1 出口语**：仅在 `hitl1-recorded` Gate 通过后，从 `brief/hitl1.md` 的「出口语」节读取模板文字，告知用户即将进入静默自主执行阶段（Setup → Seed Topics → Wave 0 → Wave 1 → Wave 2），期间不会浮出水面，可以关闭终端，下次见面是 HITL2。第 3d 节的「访问可用」结果不是出口语，也不代替这个 Gate-pass-only 步骤。
2. 读取 `check.next`（应为 `phases/phase-setup.md`）。Advance to `setup`：执行
   `node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node phases/phase-setup.md`
   ——这是写入 `current_node` 的唯一合法 loader。

> 兼容例外（WNC-010）：instantiation/HITL1 为 bootstrap status shape 例外，本 phase 不执行 `advance-status` source-gate 同步；例外**不豁免 `enter-phase`**——gate pass 后必须按上述命令加载 `phase-setup.md`。自 setup 起的后续 phase 按其 §6 常规 handoff 执行。

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority，也不得用其 prose 猜 repair kind、字段或命令。按每个 independent primary hint 执行：

1. `repair_kind: user_decision`：只向用户询问 `missing_fact` 指出的真实 HITL1 语义，例如尚未选择的 `research_profile`、缺失的 must-answer 问题或未确认的 Topic intent。不得要求用户运行普通命令，也不得重复询问已经记录的 choice。
2. `repair_kind: agent_action`：在用户决定已经存在、且 `write_to` 是 authorized mutable surface 时，由 Agent 写入或修正 exact field/file；不得借机械 repair 发明新的用户语义或伪造 probe success。
3. `repair_kind: engine_operation`：由 Agent 运行 `write_to` 指向的 existing legal operation，例如 style apply、topic-state inspect/recover/apply 或其他 exact command；不得让用户代跑，也不得直接编辑 Engine-owned authority。
4. `repair_kind: missing_contract`：报告 exact unavailable capability/contract boundary，不手写 status、trace、receipt、provenance 或平行成功状态。

Hint 不创造 permission。用户决定或外部前置条件满足后，后续机械步骤立即回到 Agent；完成可执行动作后 Agent MUST 运行 hint 的 exact `rerun`，回到同一个 `hitl1-recorded` checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 猜 blocking repair；按 `missing_contract` 暴露最小边界。

常见 root 仍按上述责任分类：`research_style_params` 通过 `apply-research-style.mjs`；canonical topic-state workspace/binding 通过返回的 exact operation；`research_access: unprobed` 或 absent 运行 §3d 真实 bounded probe；completed current observation 的来源限制走 material-gap 对齐（用户调整环境后重探、修改来源约束或接受当前范围）。只有用户决定真实存在且已持久化后，才可记录 `hitl1.status: recorded`；`recorded_at` 缺失属于随后可执行的机械修复。

## 8. Stop Behavior

`stop: yes` — 仅当当前 `user_decision` hint 指出尚未取得的结构化 HITL1 回答时，Agent MUST 暂停并等待该最小决定。若用户 choice 已记录而 Gate 只剩 `agent_action` 或 `engine_operation`，Agent 必须自行执行，不得再次把用户变成 pipeline co-runner。用户回答写入 accepted owner 后，由 Agent 运行 exact `rerun` 继续。

`stop: yes` 只意味着等待用户输入，不意味着豁免 deterministic check。用户回答后，仍必须运行 `hitl1-recorded` gate。

存在 material access gap 时，Agent 停留在同一 HITL1 conversation，等用户明确请求新的完整 round、修改来源约束，或接受当前范围；不得自动空转重试、验证网络变化或伪造 probe success。完成用户语义决定后由 Agent 重跑同一 bounded probe 和 Gate。Native policy failure 不创造 shell permission；permission 已存在时 Agent 不得把 fallback command 交给用户。

## 9. Anti-Cheating Rules

- **用户回答 MUST 写入 `rb_profile.yaml`**，不能只停留在 chat memory
- **禁止在用户未回答时填写 placeholder 或假数据**：不能编造 `research_profile`、`root_must_answer_set` 等内容让 gate pass
- **禁止跳过 HITL1 直接进入 setup**：`stop: yes` 意味着必须等待用户
- **禁止 direct registry edit 或 seed-only identity**：approved topics 必须走 topic-state apply；context/`human-directed` 不创造 mutation permission
- **禁止写入不存在的字段路径**：HITL1 结果写入 `rb_profile.yaml` 的 `human_decision_checkpoints.hitl1.*`；不要写入不存在的 `rb_status.json#/phases/hitl1/*`
- **禁止用 mock/fixed URL/搜索摘要/手写 page content 声称 `research_access.status: available`**：available 只能来自当前执行器实际直接取得样本 page content
- **禁止把 probe 当 research evidence**：Probe URL/content/tool output 不得进入 reference、cache、artifact、work-unit、ledger、output declaration 或 Wave coverage
- **禁止自动 retry tree**：不得修改独立 controller 的有界 sequence、重复 surface、添加 tier，或持久 query/URL/attempt history
- **禁止把用户语言、UI 语言、假定地理位置或 VPN 状态当作来源相关性的语义证据**
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl1 START"` |
| Phase 结束 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl1 END — <summary>"` |

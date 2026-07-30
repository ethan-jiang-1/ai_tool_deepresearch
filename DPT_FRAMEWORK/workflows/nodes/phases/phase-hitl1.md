---
node_type: phase
id: phase-hitl1
phase: hitl1
gate: hitl1-recorded
stop: "yes"
execution_contract:
  surface: phase-agent
  search_policy: capability_probe_only
requires:
  - shared/shared-profile
  - shared/shared-agent-ux-guidance
suggested_context:
  - brief/hitl1
---

# Phase: HITL1 (Human-in-the-Loop 1)

## 0. Execution Brief

- **Objective**: Collect the user's research profile, root must-answer set, optional per-run research controls, and HITL1 constraints, then confirm current research access before silent execution.
- **Start here**: Read `brief/hitl1.md`, the original question, `rb_plan.md`, and `rb_profile.yaml`.
- **Path to pass**: Present the HITL1 prompt, wait for the user's answer, capture the optional controls snapshot before applying approved canonical topics and UID-bound seeds, write profile/style decisions, run one bounded real research-access probe, then run the HITL1 gate.
- **Completion check**: User input and a schema-valid available research-access observation are recorded in `rb_profile.yaml`, and `check-gate-hitl1-recorded.mjs` passes.
- **Failure posture**: Consume top-level `hints[]` first. Ask only for a genuine missing HITL decision; execute authorized mechanical repair yourself and rerun the exact same Gate.

## 1. Stage Goal

向用户提出结构化问题，收集 research profile、root must-answer set 和用户约束。结构化决定仍写入 active bundle 的 `rb_profile.yaml`；可选研究控制只写入 `rb_plan.md## Constraints > ### User Research Controls`，并在进入 silent waves 前确认当前 Agent 环境具备一次真实 search + fetch 能力。

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
3. 从 original topic 推导初始 topic preview（3-5 个可独立研究的子话题），用户确认前不直接写 `topic_registry` 或 seed 文件
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

用户确认后，Agent 先把完整 approved topic set 写入 caller-owned retained JSON。只有在 §3b 已通过既有 status synchronization 后，才运行一次 `operate-topic-state.mjs apply`。Engine 在 legal HITL1 current-node/status window 中分配 immutable UID/ordinal/slug，并用一个 prepared manifest 提交最终 registry 与全部 UID-bound seed skeletons。若返回 accepted workspace，Agent 运行 exact recover command 后重试；不得直接编辑 registry/seed。提交成功后立刻读取结果；只有结果返回的 `style_projection` handoff 才决定后续是否需要 style writer。

**Gate 不判断 rewrite 质量。** 人类审查 topic semantics；Engine 验证 canonical identity/intent、UID-bound seed projection、workspace completion 与既有 profile/access contract。

### 3b. HITL1 问题收集

**Prompt 文本来源**：Agent SHALL 从 `brief/hitl1.md` 读取 recommendation-first 入口文本。

**操作步骤**：
1. 读取 `brief/hitl1.md` 的「入口 Prompt」节
2. 填入动态部分：
   - `{DYNAMIC: grounded_goal_and_scope}` → 从原始问题与 §3a topic rewrite 提取目标和边界
   - `{DYNAMIC: proposed_must_answer_questions}` → 基于原始问题提出具体问题
   - `{DYNAMIC: seed_topics_preview}` → 从 `rb_plan.md` topic_registry 生成简短预览
   - `{DYNAMIC: recommended_profile_description}` → 一个用户可理解的深度/广度推荐
   - `{DYNAMIC: recommendation_reason_and_effort}` → 推荐理由与大致投入影响
3. 向用户展示完整的入口 prompt
4. 遵循 `shared-agent-ux-guidance.md`：用户可直接接受、自然语言修正、选可选字母或继续提问
5. 用户清楚接受或修正后，该表达本身就是决定；只有实质歧义、真实成本/权限或不可逆风险才问最小确认。随后：
   - 将 `research_profile` 写入 `rb_profile.yaml`（字母→canonical enum 翻译）
   - 将用户接受或修正后的具体问题写入 `root_must_answer_set`
   - 将 `human_decision_checkpoints.hitl1.status` 设为 `recorded`
   - 将 `human_decision_checkpoints.hitl1.recorded_at` 设为当前 ISO 8601 timestamp
   - 先写 controls snapshot，再运行既有 status synchronization：
     ```bash
     node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to hitl1_recorded
     ```
     读取并消费成功 stdout 后，才写 retained topic-state input 并运行 `operate-topic-state apply`。读取 committed apply/recover JSON 后按 §3c 消费其中的 style handoff，再做 probe 与 HITL1 Gate。同步失败时 canonical topic state 不变；Agent 只遵循返回的既有 legal operation 或 no-path boundary，不手写 `rb_status.json`、不用 force/context bypass，也不先跑 HITL1 Gate 来发现顺序。普通 apply/recover 命令由 Agent 执行，不要求用户共同运行；普通 status 命令同样由 Agent 执行。

### 3b.1 Optional User Research Controls Snapshot

用户可提供优先级、明确排除、来源/证据偏好、分析视角、交付要求或相关业务背景。它们是本轮研究指导，不是 profile、Gate、来源 floor、receipt、lifecycle 或 schema override。

在用户决定和任何 material conflict 已澄清后，Agent 只做一次以下持久化写入，随后才创建 retained topic-state input：无额外控制时写入精确 no-controls sentence；有控制时用 `plan-hostfile-sections.mjs` 的 `renderSuppliedControls()` 在 `rb_plan.md## Constraints > ### User Research Controls` 写入精确 label 和 literal snapshot。不得手写较短 fence。

用户明确授权读本地文件时，只读取一次并只摘取本 run 适用、可分享的控制到 snapshot；不得保留路径、以后重读、递归读取链接、复制无关内容或形成同步协议。若控制与 profile、must-answer 或 style 有 material conflict，先在本 HITL1 取得最小用户决定并更新既有 structured owner；不得让 silent phase 私自选择赢家。文件不可读、意图不清或控制过宽时，只问最小澄清或 host prerequisite，绝不虚构 snapshot。topic-state apply/recover 后继续读取已 durable 的 host-file snapshot，不从 chat 或外部路径重建。

### 3c. Research Style Projection Handoff（研究风格参数投影）

`apply-research-style.mjs` 仍是 `rb_profile.yaml#/research_style_params` 的唯一 writer；topic-state 和 Gate 都不写 profile。它必须在 canonical topic registry 已 committed 后才运行，且只由 topic-state 返回的 structured handoff 触发。

**操作步骤：**

1. **读取 committed topic-state JSON**：若结果含有 `style_projection.status: refresh_required`，读取其中的 `selected_profile`、`committed_topic_count`、`checkpoint` 与 `command`。这些是已经提交的 direct facts，不从 profile 再解析或重建命令。
2. **执行 exact command**：运行 `style_projection.command` 原样返回的既有 `apply-research-style.mjs` CLI。该命令读取已提交 registry，计算完整参数对象，并只写 `research_profile` / `research_style_params`。读 stdout，确认 `applied` 与 handoff 的 profile 一致，`topic_count` 与 handoff 的 committed count 一致；Agent 不读 style JSON、不做乘法、不手写参数。
3. **没有 handoff 就不做 style work**：投影/enrichment/rename/reorder 等没有 registry-length change 时，结果不会含 style handoff；不要解析 profile 或启动无条件 style CLI。若 handoff 明示 `profile_unavailable`，不要猜选 profile 或直接改 profile，保留给已有 profile/Gate owner 的 direct root。
4. **同一 Gate 复核 freshness**：在其他 HITL1 prerequisite 已通过后，`check-gate-hitl1-recorded.mjs` 会比较完整参数、selected profile 与 committed count。它不是 style writer；若失败，structured hint 仍只给出同一个 CLI 与同一个 Gate rerun。

**风格选项展示**：向用户展示 research profile 选项时，只展示 `user_visible: true` 的风格（`quick_factual`、`exploratory_map`、`claim_verification`）。`debug` 风格 (`user_visible: false`) 不展示——仅用于开发/测试。

### 3d. Research Access Probe（进入 silent waves 前的能力确认）

已提交 topic-state 的 required style handoff 完成后，Agent MUST 使用当前环境的实际 search/fetch surfaces 执行一个短而固定的 capability probe。`execution_contract.search_policy: capability_probe_only` 只授权这个 probe；它不授权 research evidence collection、work-unit delegation 或 Wave work。

**固定顺序：**

1. 使用实际 search surface 发起**至多一次 neutral capability-only search**。Query 只用于确认工具可用，不用于当前 research topic 的证据收集。
2. 按 search surface returned order 取**最多前三个 syntactically eligible actual HTTP(S) candidates**。Eligible URL 不含 raw single quote、ASCII whitespace/control 或 URL credentials，且不指向 `localhost`/`.localhost`、loopback、literal private 或 link-local target。不得使用用户/模型构造或替换的 URL。Resolved/redirected destination 的 DNS/network policy 仍由 host 强制。
3. 对 candidate 1 开始 serial probe。每个 candidate 使用 runtime 的实际 native fetch surface 发起**至多一次 native fetch**；native 返回真实 page content 时立即结束整个 probe，不得再调用 `curl` 或考察后续 candidate。
4. 仅当当前 candidate 的 native surface 在调用前不存在，或 native 没有返回真实 page content（blocked / unavailable / failed），且 independently configured host shell/network permission 已允许 exact command 和 target 时，Agent 对当前 candidate 执行下面**至多一次、同一 URL、standalone** fallback：

   ```bash
   curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'
   ```

   URL 必须作为 single-quoted（单引号）单一 argument 传入。命令不得包含 prefix assignment、pipe、redirection、command substitution、shell chaining 或 trailing command；`--globoff` 禁止 `{}` / `[]` URL expansion，redirect 至多五次且只能使用 HTTP(S)。
5. 当前 candidate 的 native 或 permitted exact same-URL fallback 返回 requested real page content 时，立即写一个 final `available` observation 并结束整个 probe。仅在当前 candidate 已完成其合法 bounded sequence 且没有真实内容时，才考察下一 candidate：candidate 2 只在 candidate 1 不能返回真实内容后考察；candidate 3 只在 candidate 2 不能返回真实内容后考察。任何 permission/no-legal-path boundary 都在当前 candidate 停止，不得跳至后续 candidate。至多三个 candidates 都无真实内容时，写一个 final `unavailable` observation。随后运行同一个 `hitl1-recorded` Gate。Command exit success、空 body、search snippet、HTTP error/challenge shell 或手写文本都不能证明 access available。

**Observation branches：**

- Search surface 缺失、search 调用失败/被阻止、没有 syntactically eligible actual HTTP(S) candidate，且没有 fetch invocation：
  ```yaml
  research_access:
    status: unavailable
    probed_at: <ISO 8601 timestamp>
    fetch_outcome: not_attempted
    reason: <direct non-empty reason>
    eligible_candidate_count: 0
  ```
- 当前 candidate 在 native fetch 返回 requested real page content：
  ```yaml
  research_access:
    status: available
    probed_at: <ISO 8601 timestamp>
    result_url: <final considered HTTP(S) URL from this search>
    fetch_outcome: success
    fetch_surface: <actual native surface>
    eligible_candidate_count: <1..3>
    final_candidate_ordinal: <1..eligible_candidate_count>
  ```
- 当前 candidate 的 native 无真实内容后，exact fallback 返回 requested real page content：写同一个 available shape，并写 `fetch_surface: curl`。Fallback success 必须记录 `fetch_surface: curl`。
- 当前 candidate 尚未调用 native，且没有 legal fetch surface 或 independently permitted fallback：写 `status: unavailable`、该 candidate `result_url`、`fetch_outcome: not_attempted`、positive `eligible_candidate_count` / `final_candidate_ordinal`，以及直接 no legal path reason；不得改选后续 candidate。
- Native 已调用但唯一 fallback 没有 legal path：写 `status: unavailable`、该 candidate `result_url`、actual native `fetch_outcome: failed | blocked`、native `fetch_surface`、positive `eligible_candidate_count` / `final_candidate_ordinal`，以及直接 no legal path reason；不得将 attempted native outcome 改写为 `not_attempted` 或改选后续 candidate。
- 至多三个 candidates 的 permitted sequences 都没有返回真实内容：写 `status: unavailable`、最终 considered `result_url`、final non-success `fetch_outcome`、已知时的 final `fetch_surface`、positive `eligible_candidate_count` / `final_candidate_ordinal`，以及一个 bounded direct `reason`；不得增加 query、URL、attempt-history fields。

`search_surface` / `fetch_surface` 在 `ProfileSchema` 中 remains optional，existing Gate does not independently enforce these audit labels；但 v0.39 HITL1 writer 对当前 successful probe 必须记录 actual successful `fetch_surface`。不要记录 query history、response body、HTTP status matrix、retry list 或 derived gate verdict。

**权限边界：** Native failure does not authorize shell/network access，也不授权绕过 policy。已独立配置的 host permission 足够时，fallback/write/Gate 是 Agent-owned mechanics：不得要求用户运行 `curl`、确认继续或代跑 pipeline，也不得静默扩大 committed project config。若 `curl`/network permission 缺失、target 不合格、binary 不存在或 fallback 失败，先记录 honest unavailable，只暴露最小 permission/external-environment prerequisite；用户同意本身不能把失败或缺失的 page content 变成 success。

**Unavailable recovery：** 保留已记录的 `research_profile`、`root_must_answer_set`、style params 和 `hitl1.status: recorded`。明确告诉用户当前环境无法启动 evidence-backed waves；最小外部前置条件解决后，由 Agent 重跑本节同一 bounded probe 和同一 gate，不要求用户重复回答 HITL1 choices。在 probe 与 gate 成功前不得进入 Setup。

**Evidence boundary：** Probe URL、page content 和 tool output SHALL NOT 写入或计入 `reference/`、`_cache/`、`artifacts/`、work-unit output/result/receipt、`rb_work_unit_ledger.jsonl`、`rb_output_declarations.jsonl` 或任何 Wave coverage/count floor。

## 4. Expected Artifacts

`rb_profile.yaml` 中以下字段已写入：

### Payload Checklist（HITL1 最小写入 contract）

| 字段 | 路径 | 要求 |
|------|------|------|
| `plan_basename` | `rb_profile.yaml#/plan_basename` | 已由 instantiation 写入，确认未被误改 |
| `research_profile` | `rb_profile.yaml#/research_profile` | ≠ `not_selected`；用户从 `quick_factual`、`exploratory_map`、`claim_verification` 中选择 |
| `root_must_answer_set` | `rb_profile.yaml#/root_must_answer_set` | 非空字符串数组 |
| `research_style_params` | `rb_profile.yaml#/research_style_params` | 由 `apply-research-style.mjs` CLI 写入（见 §3c 步骤 1-3），Agent 不手写参数。CLI 后验证 stdout 中的 `applied`、`topic_count`、`wave0_shared_ref_total` 值 |
| `research_access.status` | `rb_profile.yaml#/research_access/status` | `available` 才能通过 HITL1 gate；`unprobed` / `unavailable` 留在 HITL1 |
| candidate count | `rb_profile.yaml#/research_access/eligible_candidate_count` | current completed probe 写 `0..3`；仅 no-candidate unavailable 可为 `0` |
| final candidate | `rb_profile.yaml#/research_access/final_candidate_ordinal` | 至少考虑一个 candidate 时写 `1..eligible_candidate_count`；零 count 时不写 |
| available path | `rb_profile.yaml#/research_access/{probed_at,result_url,fetch_outcome}` | ISO timestamp + HTTP(S) URL + `fetch_outcome: success` |
| unavailable path | `rb_profile.yaml#/research_access/{probed_at,fetch_outcome,reason}` | ISO timestamp + `failed | blocked | not_attempted` + 非空直接原因；positive count 保留 final `result_url` |
| current successful writer audit | `rb_profile.yaml#/research_access/fetch_surface` | v0.39 writer 记录 actual successful surface；schema optional，Gate 不独立 enforce |
| `hitl1.status` | `rb_profile.yaml#/human_decision_checkpoints/hitl1/status` | = `recorded` |
| `hitl1.recorded_at` | `rb_profile.yaml#/human_decision_checkpoints/hitl1/recorded_at` | 非空 ISO 8601 timestamp |

`research_access.search_surface` / `fetch_surface` 在 schema 中保持 optional audit labels，不是 gate-required facts；v0.39 current successful writer 仍记录 actual `fetch_surface`。该 checklist 是 review surface；`ProfileSchema` 和 Gate definition 仍是 machine authority。

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle <path> --current-node phases/phase-hitl1.md
```

## 6. On Gate Pass

1. **发送 HITL1 出口语**：从 `brief/hitl1.md` 的「出口语」节读取模板文字，告知用户即将进入静默自主执行阶段（Setup → Seed Topics → Wave 0 → Wave 1 → Wave 2），期间不会浮出水面，可以关闭终端，下次见面是 HITL2
2. 读取 `check.next`。Advance to `setup`：加载 `phase-setup.md`。

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority，也不得用其 prose 猜 repair kind、字段或命令。按每个 independent primary hint 执行：

1. `repair_kind: user_decision`：只向用户询问 `missing_fact` 指出的真实 HITL1 语义，例如尚未选择的 `research_profile`、缺失的 must-answer 问题或未确认的 Topic intent。不得要求用户运行普通命令，也不得重复询问已经记录的 choice。
2. `repair_kind: agent_action`：在用户决定已经存在、且 `write_to` 是 authorized mutable surface 时，由 Agent 写入或修正 exact field/file；不得借机械 repair 发明新的用户语义或伪造 probe success。
3. `repair_kind: engine_operation`：由 Agent 运行 `write_to` 指向的 existing legal operation，例如 style apply、topic-state inspect/recover/apply 或其他 exact command；不得让用户代跑，也不得直接编辑 Engine-owned authority。
4. `repair_kind: external_action`：只暴露当前环境无法代理的 search/fetch 前置条件；保留已记录 choices，环境修复或用户要求再次尝试后，由 Agent 重跑同一 bounded probe。
5. `repair_kind: missing_contract`：报告 exact unavailable capability/contract boundary，不手写 status、trace、receipt、provenance 或平行成功状态。

Hint 不创造 permission。用户决定或外部前置条件满足后，后续机械步骤立即回到 Agent；完成可执行动作后 Agent MUST 运行 hint 的 exact `rerun`，回到同一个 `hitl1-recorded` checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 猜 blocking repair；按 `missing_contract` 暴露最小边界。

常见 root 仍按上述责任分类：`research_style_params` 通过 `apply-research-style.mjs`；canonical topic-state workspace/binding 通过返回的 exact operation；`research_access: unprobed` 运行 §3d 真实 bounded probe；`unavailable` 是外部前置条件；available-path schema repair只能基于当次真实 observation。只有用户决定真实存在且已持久化后，才可记录 `hitl1.status: recorded`；`recorded_at` 缺失属于随后可执行的机械修复。

## 8. Stop Behavior

`stop: yes` — 仅当当前 `user_decision` hint 指出尚未取得的结构化 HITL1 回答时，Agent MUST 暂停并等待该最小决定。若用户 choice 已记录而 Gate 只剩 `agent_action` 或 `engine_operation`，Agent 必须自行执行，不得再次把用户变成 pipeline co-runner。用户回答写入 accepted owner 后，由 Agent 运行 exact `rerun` 继续。

`stop: yes` 只意味着等待用户输入，不意味着豁免 deterministic check。用户回答后，仍必须运行 `hitl1-recorded` gate。

若 probe 记录 `unavailable`，Agent 保持 HITL1，只暴露 `external_action` 的最小 blocker；用户 choices 保留，前置条件解决后由 Agent 重跑同一 bounded probe 和 Gate。Native policy failure 不创造 shell permission；permission 已存在时 Agent 不得把 fallback command 交给用户。

## 9. Anti-Cheating Rules

- **用户回答 MUST 写入 `rb_profile.yaml`**，不能只停留在 chat memory
- **禁止在用户未回答时填写 placeholder 或假数据**：不能编造 `research_profile`、`root_must_answer_set` 等内容让 gate pass
- **禁止跳过 HITL1 直接进入 setup**：`stop: yes` 意味着必须等待用户
- **禁止 direct registry edit 或 seed-only identity**：approved topics 必须走 topic-state apply；context/`human-directed` 不创造 mutation permission
- **禁止写入不存在的字段路径**：HITL1 结果写入 `rb_profile.yaml` 的 `human_decision_checkpoints.hitl1.*`；不要写入不存在的 `rb_status.json#/phases/hitl1/*`
- **禁止用 mock/fixed URL/搜索摘要/手写 page content 声称 `research_access.status: available`**：available 只能来自当次实际 search 返回的 URL 和实际 fetch page content
- **禁止把 probe 当 research evidence**：Probe URL/content/tool output 不得进入 reference、cache、artifact、work-unit、ledger、output declaration 或 Wave coverage
- **禁止自动 retry tree**：整个 probe 至多一次 search、最多三个 returned-order eligible candidates；每个 candidate 至多一次 native fetch 和一次 exact same-URL curl fallback。禁止第四 candidate、重复 surface、额外 tier、pipe/redirect/chaining 或持久 query/URL/attempt history
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl1 START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl1 END — <summary>"` |

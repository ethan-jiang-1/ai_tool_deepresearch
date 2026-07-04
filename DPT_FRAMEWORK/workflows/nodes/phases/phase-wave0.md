---
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0-complete
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: relay_required
  delegated_role_keys:
    - dpt-source-intake
requires:
  - shared/shared-profile
  - shared/shared-schemas
  - shared/shared-silent-execution
  - shared/shared-subagent-protocol
  - shared/shared-anti-cheating-rules
suggested_context:
  - phases/subagent-dpt-source-intake
---

# Phase: Wave0 — Foundation Shared Reference

## 0. Execution Brief

- **Objective**: Run relay-backed foundation source intake for every topic.
- **Start here**: Load queue state, `topic_registry`, seed topic files, and role guidance `dpt-source-intake`.
- **Path to pass**: Enqueue delegated source-intake tasks, spawn relay Sub-agents, complete with committed slot results, update `reference/_INDEX.md`, then run the Wave0 gate.
- **Completion check**: `check-gate-wave0-complete.mjs` passes for `phases/phase-wave0.md`.
- **Failure posture**: Do not bypass relay with direct search; use gate feedback for refill/repair loops and record silent degradation only after bounded attempts.

## 1. Stage Goal

搜集少量真实的 shared reference evidence，为 topic_registry 中的每个 topic 创建结构化 YAML metadata（url/title/retrieved_date/topic_tag），写入 `artifacts/wave0/<topic>/source.yaml`，更新 `reference/_INDEX.md`。

**Wave0 是 foundation evidence collection，不是 comprehensive research。** 每个 topic 需要至少 foundation floor 数量的 reference——exact 阈值读取 `rb_profile.yaml#/research_style_params/wave0_per_topic_source_floor`（HITL1 选择研究风格后由 Agent 写入）。例如 `claim_verification` 要求 ≥12，`quick_factual` 要求 ≥6，`debug` 要求 ≥1。目标不是 coverage completeness，而是为 Wave1 的 topic-scoped skeleton 和 Wave2 的 cross-topic synthesis 提供可信的 evidence 基座。

## 2. Required Inputs

- 已通过 `seed-topics-ready` gate 的 active bundle（`seed_topics/` 已物化）
- `rb_plan.md` frontmatter 的 `topic_registry`（topic 集合的 source of truth）
- `shared-profile.md`（research profile 和 root must-answer set）
- `shared-schemas.md`（ReferenceMetadata schema 字段定义和 wave artifact 目录结构）
- `DPT_FRAMEWORK/cli/operate-queue.mjs`（Agentic Queue CLI — 灌料、claim、complete 的入口）
- `DPT_FRAMEWORK/engine/subagent-relay.mjs`（Sub-agent Relay Engine — slot 生命周期管理）
- `shared-subagent-protocol.md`（relay slot 通信契约、目录结构、并发控制、Forbidden Authority、抓取链）
- 运行 Phase Agent 有页面搜索工具（如 Claude Code `WebSearch` 或 Codex `web_search`）。页面内容抓取：如有内置工具（Claude Code `WebFetch`）则使用，否则走 `shared-subagent-protocol.md` 抓取链

## 3. Allowed Actions — Queue-Driven 三阶段

> **search_preference 下游使用**：Agent SHALL 在 wave0 搜索和 source intake 期间读取 `rb_profile.yaml` 的 `search_preference` 字段。将用户的自然语言偏好作为搜索策略的软约束（如 "优先找中文资料" → 优先搜索中文源；"关注 2024 年后" → 优先检索近期文献）。`search_preference` 不替代 `research_style_params` 的硬参数（如 source quality tier），而是在硬参数框架内的搜索策略倾斜。

Wave0 使用 Agentic Queue 驱动 source intake。所有搜索/fetch 工作走 task card → claim → execute(Sub-agent) → complete 循环。

### 3.1 灌料 (Filling) — 首次进入 wave0

如果 queue 为空（`operate-queue check <bundle>` 返回 `queue_health: "thin"` 或 `active_window` 为空，无待执行 task）：

1. 读取 `rb_plan.md` frontmatter 的 `topic_registry`，确定 topic 集合
2. 为每个 topic 生成一个 task card JSON 文件，然后 enqueue：

**Task card JSON 模板（写入临时文件如 `/tmp/wfq-task-{topic.slug}.json`）：**

> **模板变量来源**：`topic_registry` 数组中的每个条目含 `id`、`slug`、`title` 三个字段（PlanSchema）。模板中 `{topic.slug}` 取 `slug` 字段值，`{topic.title}` 取 `title` 字段值。搜索关键词从 `topic.title` 和同 topic 的 seed topic 文件（`seed_topics/{slug}.md`）中的 `search_guardrails.required_terms` 派生。
>
> **产出说明**：Wave0 source intake 需为每个 topic 产出 `source.yaml`（thin YAML 数组，每 source 一条 entry），同时为跨 topic 的共享 foundation reference 产出 `reference/00-shared-<slug>.md`（rich MD，格式见 `shared-reference-template.md`）。单次 intake 产出的数量依 topic 信息密度而定。若 `source.yaml` 条目数未达到 `rb_profile.yaml#/research_style_params/wave0_per_topic_source_floor`、或 `00-shared-*.md` 文件数未达到 `rb_profile.yaml#/research_style_params/wave0_shared_ref_total` 的动态阈值，下游由 **§3.3.1 Count-Floor Re-Fill Loop** 通过 supplementary task 补齐——本 task card 不承担达到阈值的责任。

```json
{
  "work_id": "wave0-source-{topic.slug}",
  "title": "Source intake: {topic.title}",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-source-intake", "timeout_ms": 600000 } },
  "action": "搜索 [{topic.title}] 的 foundation reference。从 topic.title 和 seed_topics/{topic.slug}.md 的 search_guardrails 派生搜索关键词。使用 WebSearch 找到至少 1 条可信来源，使用 WebFetch 获取每个来源的页面内容。如果 WebFetch 被阻止，必须走降级链：curl -L → node fetch → python3 urllib，全部失败才可报告 inaccessible。提取并写入 artifacts/wave0/{topic.slug}/source.yaml（YAML 数组，每条含 url, title, retrieved_date(YYYY-MM-DD), topic_tag(\"{topic.slug}\"), notes(可选)）。同时，若发现跨 topic 的共享 foundation reference（行业全景、方法论文献、跨 topic 对比数据等不属于单个 topic 的），写入 reference/00-shared-<slug>.md（rich MD，格式见 shared-reference-template.md：metadata block 9 字段 + 5 个 ## section）。将原始 WebSearch 结果、抓取页面和 source 元信息写入 `_cache/wave0/primary/{topic.slug}/`：每个 source 在 `sNN_<source-slug>/` 子目录下保存 `websearch.json`（原始搜索结果）、`page.md`（页面内容）、`meta.json`（11 字段：url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status）。NN 从 01 开始递增，<source-slug> 与 reference/ 文件名 qualifier 一致。**返回 JSON 必须包含 Agent Output Declaration：`output_files[]`（每个产出文件声明 path/role/source_url/source_slug，role=reference 时 source_url 必填）和 `cache_trails[]`（实际写入的 leaf source 目录路径，每目录直接含 websearch.json/page.md/meta.json，不声明 parent cache dir）。**",
  "producer_rule": "source_intake_fan_in",
  "lineage": {"topic_slug": "{topic.slug}", "phase": "wave0"},
  "priority_class": "P5_new_reference_intake",
  "required_receipts": ["file:artifacts/wave0/{topic.slug}/source.yaml"],
  "done_condition": "artifacts/wave0/{topic.slug}/source.yaml 存在，通过 ReferenceMetadata schema 校验（url 非空、title 非空、retrieved_date 为 YYYY-MM-DD、topic_tag 匹配 {topic.slug}），且至少含 1 条 reference",
  "verification": {"engine": ["receipt_check"], "agent": ["url_accessible", "title_matches_page"]},
  "writes_to": ["artifacts/wave0/{topic.slug}/source.yaml", "reference/00-shared-<slug>.md（跨 topic 共享 reference，可选）"],
  "status_sync": ["wave0_intake"],
  "completion_receipt": "file:artifacts/wave0/{topic.slug}/source.yaml",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "{topic.slug}", "topic_title": "{topic.title}"}
}
```

3. Enqueue 每个 task card：
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wfq-task-{topic.slug}.json
```

4. 全部 topic 灌入后，验证：
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
```
确认 `queue_health: "ready"` 且 active_window 已填充。

### 3.2 Batch Parallel Execution — 引用 Shared Sub-agent Protocol

Wave0 的 claim→execute→complete 使用 relay 批量并行执行（灌料→stage→并行 spawn→collect-as-return→backfill→补位→merge→gate）。Sub-agent 的具体搜索和产出指令见 `subagent-dpt-source-intake.md`（via `suggested_context`）。Relay 基础设施（slot 契约、目录结构、并发控制、禁区清单）见 `shared-subagent-protocol.md`。

> **驱动 relay（SNC-003，供需接线）**：Phase Agent MUST 经 `drive-relay-slot` CLI 驱动 relay slot 生命周期（`stage` → spawn → `commit` → `merge`），**不**手编排 `stageSubagentSlots`/`commitSlotResult` 引擎函数、**不**手写 slot 文件。`stage` 产出 spawn prompt（含 slot 目录 + `_beacon.json` 指针），Phase Agent 用原生 Agent tool spawn sub-agent，sub-agent 返回的 JSON 经 `commit` 校验落盘。命令形态见 `shared-subagent-protocol.md` §1.5。

**Wave0 参数表**：

| 参数 | 值 |
|------|-----|
| `role_key` | `dpt-source-intake` |
| `artifact_template` | `artifacts/wave0/{topic.slug}/source.yaml` |
| `artifact_schema` | `ReferenceMetadata` |
| `backfill_tokens` | `["__BACKFILL_WAVE0_EVIDENCE__"]` |
| `per_topic_backfill` | `true` |
| `search_focus` | foundation reference |
| `timeout_ms` | `600000` |

**执行约束**（wave0 特有，叠加 `shared-subagent-protocol.md` Forbidden Authority）：

- **不跳过 task**：只要 claim 返回了 task card（`item` 非 null），就必须执行并 complete，不得无故跳过
- **不伪造产出**：每条 reference 必须来自 WebSearch + WebFetch 获取的真实页面。url 必须指向真实可访问页面，title 反映实际页面标题，retrieved_date 为真实检索日期
- **网页内容抓取**：Sub-agent 必须获取来源页面的真实内容。详见 `shared-subagent-protocol.md` Page Content Fetching Chain。摘要：内置工具（如 `WebFetch`）优先，用户显式开启浏览器也可用；没有则从 `curl` 开始 → `node -e "fetch(...)"` → `python3 -c "import urllib.request..."`（最后兜底）。不允许因缺工具或工具 blocked 就拿搜索摘要凑合。所有手段都失败才能报告"无法获取内容"
- **complete 阻塞**：如果 complete 时 receipt check 失败（source.yaml 不存在或 schema 不对），engine 自动生成 repair task（`producer_rule: queue_repair`），Phase Agent 必须修复而不是跳过。修复后重新 claim
- **delegated complete 路径**：claim 返回含 `targets.delegates.to: "sub-agent"` 的 task 后，Phase Agent MUST 通过 Relay spawn Sub-agent，用 `drive-relay-slot commit` 收集（引擎校验后写 committed slot `result.json`），再调用 `operate-queue complete --result` 并传入 `slot_result_ref`。Phase Agent MUST NOT 在自己的上下文直接执行 WebSearch/WebFetch 来替代 Sub-agent。
- **上下文隔离**：上下文隔离由 relay slot 契约在机制上强制（见 `shared-subagent-protocol.md` Communication Contract）。Sub-agent 只收到 bounded 上下文（task.md + result.schema.json），返回的 JSON 被 `result.schema.json` 约束形状——大段搜索 trail 不在 schema 允许的字段里。Phase Agent 经 `drive-relay-slot commit` 收集验证后的 `result.json`，**不读 Sub-agent 的原始搜索输出**。如需抽查，去 `_cache/wave0/{batch}/{topic_slug}/`（非 authority），但默认不读
- **即时回填 seed topic（不可跳过）**：每个 topic 的 complete 成功后，**在 claim 下一个 task 之前**，必须立刻回填 `seed_topics/{topic.slug}.md`：`grep -n '__BACKFILL_WAVE0_EVIDENCE__'` 定位 token → **替换 token 行**为 ref 摘要列表（`- **ref-XX-NN**: ...`）。趁 Sub-agent 搜索结果还 fresh 就写，不等 wave0 结束

### 3.3 Queue 空后 — 收尾与 Gate

#### Transition trigger

当 `operate-queue claim <bundle> ...` 返回 `item: null` 时，表示 active queue 已被 drain。Agent 应进入本节的 closeout/gate 流程，不得因为没有新 task 就自行发明 work item。

当 claim 返回 `item: null`（queue 空）时：

1. `node DPT_FRAMEWORK/cli/drive-relay-slot.mjs merge <bundle> --wave <N>` — collect 所有 slot 结果，merge evidence counts 到 WorkflowState（driver 内部调 `collectAndMergeSubagentResults`）
2. 检查 `reference/_INDEX.md` 是否已更新（列出所有 topic 的 reference 摘要）
3. 如果 index 缺失或未更新 → 手动写入（这是单步收尾动作，不重新灌 Q）
4. 跑 gate（含 **§3.3.1 Count-Floor Re-Fill Loop** —— gate fail 时自动进入自主补充循环）：
```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md
```
5. gate pass → 读取 `check.next` → 加载 `phase-wave1.md`
6. gate fail → 按 §3.3.1 和 §7 处理

#### 3.3.1 Count-Floor Re-Fill Loop（source 数量不足时的自主补充循环）

当 gate 因 `per_topic_count_floor` 或 `shared_ref_count_floor` 规则失败时，Phase Agent 进入自主补充循环——读 gate inspect → 识别不足 topic 或 shared ref gap → 创建 supplementary task card → enqueue + drain → rerun gate。此循环完全静默，无需用户介入（`stop: no`）。

**架构依据**：Queue guideline §5.3 Rule 3——Q empty + gate fail → gate is authority，Phase Agent MAY re-fill Q to address specific gaps。

**Loop 流程：**

1. 跑 gate（§3.3 step 4 的 CLI 命令）
2. gate pass → 退出 loop
3. gate fail → 读 CLI 返回的 `inspect` 和 `advice`
4. 分类 fail：
   - 若 inspect 中包含 `"Count floor not met"`（`per_topic_count_floor`：某 topic 的 `source.yaml` 条目不足；`shared_ref_count_floor`：`00-shared-*.md` 文件不足）→ 进入补充流程（继续步骤 5）
   - 若 count_floor 全部通过但其他规则失败 → 跳过补充流程，按 §7 表逐条修复 → rerun gate
5. 追踪 attempt：从 `rb_trace.jsonl` 中 grep `gate_attempt` 得到 attempt 计数。若 attempt_count ≥ 3 → 通过 accepted trace/log surface 记录 `silent_degradation`（`gap_impact: partial`），切换策略（调整搜索关键词、更换搜索角度），不 escalation
6. No-progress?（连续两次同一 topic/shared 的 count 未增加）→ 通过 accepted trace/log surface 记录 `silent_gap`（`gap_impact: partial`），切换策略（调整搜索关键词、更换搜索角度），不 escalation
7. 解析不足：
   - `per_topic_count_floor` fail → 提取 topic slug、当前数 N、阈值 T，gap = T - N
   - `shared_ref_count_floor` fail → 提取当前数 N、阈值 T，gap = T - N
8. 创建 supplementary task card（模板见下方）
9. 批量 enqueue → drain queue（claim → Sub-agent execute → complete）→ rerun gate

**Supplementary task card JSON 模板**（写入临时文件如 `/tmp/wfq-wave0-suppl-{topic.slug}-r{attempt}.json`）：

> **模板变量**：`{topic.slug}`、`{topic.title}` 来自 topic_registry。`{target_count}` 为 Phase Agent 从 gate inspect 计算的 gap（阈值 - 当前数）。`{attempt}` 为当前 gate attempt 序号（1-based）。对于 `shared_ref_count_floor` gap，topic 变量填充为 `shared`。

```json
{
  "work_id": "wave0-suppl-{topic.slug}-r{attempt}",
  "title": "Supplementary source intake: {topic.title} (attempt {attempt})",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-source-intake", "timeout_ms": 600000 } },
  "action": "对 [{topic.title}] 做补充 source 搜集——不重复完整 foundation intake。目标：找到至少 {target_count} 个尚未在 source.yaml 或 reference/ 目录中的新增来源。先读 artifacts/wave0/{topic.slug}/source.yaml 和现有 reference/00-shared-*.md 的 source_url metadata，确认已有来源，避免重复。使用 WebSearch 搜索不同角度的新增来源（不同于已有 URL 的 domain 或视角）。使用 WebFetch 获取每个新增来源的页面内容。如果 WebFetch 被阻止，必须走降级链：curl -L → node fetch → python3 urllib，全部失败才可报告 inaccessible。对每个新增来源：若为 topic-specific → 追加 entry 到 artifacts/wave0/{topic.slug}/source.yaml（保护已有 entry，只追加不覆盖）。若为跨 topic 共享 foundation reference → 写入 reference/00-shared-<slug>.md（rich MD，按 shared-reference-template.md 完整格式：9 字段 metadata block + 5 个 ## section）。将原始搜索/抓取内容写入 `_cache/wave0/suppl-r{attempt}/{topic.slug}/`：每个新 source 在 `sNN_<source-slug>/` 下保存 `websearch.json` + `page.md` + `meta.json`（11 字段）。NN 从已有 source 数量+1 开始递增，<source-slug> 与 reference/ 文件名 qualifier 一致。

**关键约束（防止占位符 reference）：**
- **禁止占位符 URL**：不得创建 source_url 为 https://example.com 或任何等效占位符 URL（如 placeholder.com、fake-url.com 等）的 00-shared-*.md 文件。每个 reference 文件必须来自真实的 WebSearch + WebFetch 获取的页面，source_url 必须指向可访问的真实网页。追加到 source.yaml 的 entry 同理——url 字段必须是真实 URL。
- **最低内容标准**：每个新 00-shared-*.md 文件的 ## Key Facts section 必须包含至少 3 条具体的、可验证的事实陈述——不得使用泛化描述如 "Collected during wave0 intake phase" 或 "See primary reference files"。
- **诚实失败**：如果经彻底搜索后（至少 3 个不同搜索角度、多种关键词组合）无法找到新增的合法来源：**不得创建占位符 00-shared-*.md 文件**。改为写入 artifacts/wave0/suppl-failure-r{attempt}.md，内容包括：搜索关键词列表、尝试的搜索角度（至少 3 个）、为何未能找到新来源（搜索空间已耗尽 / 所有搜索结果均为已收录来源 / 页面无法访问等具体原因）。Phase Agent 会在 drain 后检查此文件。",
  "producer_rule": "source_intake_fan_in",
  "lineage": {"topic_slug": "{topic.slug}", "phase": "wave0", "trigger": "count_floor_repair", "attempt": {attempt}},
  "priority_class": "P1_state_or_gate_repair",
  "required_receipts": [],
  "done_condition": "至少 1 条新 entry 被追加到 source.yaml 或至少 1 个新的 reference/00-shared-*.md 文件被写入——source_url 不与已有 entry/文件重复。已有 entry 不得被删除或修改。",
  "verification": {"engine": [], "agent": ["url_accessible", "title_matches_page", "source_url_not_duplicate", "existing_entries_preserved"]},
  "writes_to": ["artifacts/wave0/{topic.slug}/source.yaml（追加，不覆盖）", "reference/00-shared-<slug>.md（新增）"],
  "status_sync": ["wave0_intake"],
  "completion_receipt": null,
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "{topic.slug}", "topic_title": "{topic.title}", "target_count": {target_count}, "attempt": {attempt}}
}
```

**Supplementary task card 与 primary source intake task card 的关键差异：**

| 维度 | Primary intake (§3.1) | Supplementary re-fill (§3.3.1) |
|------|----------------------|-------------------------------|
| 产出方式 | 创建 `source.yaml` | **追加**到已有 `source.yaml`（不覆盖已有 entry） |
| `priority_class` | `P5_new_reference_intake` | `P1_state_or_gate_repair` |
| `required_receipts` | `source.yaml` 文件 | `[]`（count 是 gate 职责） |
| `completion_receipt` | `source.yaml` 文件路径 | `null` |
| 对已有产出的行为 | 初次创建 | 只追加，禁止删除/修改已有 entry |
| 触发条件 | 首次进入 wave0 | gate `per_topic_count_floor` 或 `shared_ref_count_floor` 失败 |

**Drain 注意事项：**

- Supplementary task 的 `required_receipts: []`、`completion_receipt: null`——Phase Agent 在 Sub-agent 返回后手动验证：检查 `source.yaml` 新增了有效 entry（url 非空、source_url 不重复、已有 entry 未被修改），或 `reference/` 下新增了有效的 `00-shared-*.md` 文件。若无效 → `operate-queue fail`。
- 补充循环期间**不重新回填 seed topic**——backfill token 已在首次 intake 完成后替换。
- Sub-agent 可能找不到足够的新来源——gate rerun 会重新计算 gap。只要至少 1 条有效新增就算 partial success。

**Loop 终止条件：**（与 wave1 一致）gate pass → 退出；all count_floor pass but other rules fail → 退出补充 loop，按 §7 修复；attempt ≥3 → 通过 accepted trace/log surface 记录 `silent_degradation`，切换策略；no-progress → 通过 accepted trace/log surface 记录 `silent_gap`，切换策略。

## 4. Expected Artifacts

- `reference/_INDEX.md`（非空，摘要每个 topic 和 shared 目录的 reference）
- `artifacts/wave0/<topic>/source.yaml`（对于 topic_registry 中的每个 topic，至少 `wave0_per_topic_source_floor` 条 reference metadata。exact 数量读取 `rb_profile.yaml#/research_style_params/wave0_per_topic_source_floor`——gate CLI 动态读取此值做 `count_floor` 校验），每条满足以下 contract：
  - `url`：string，非空
  - `title`：string，非空
  - `retrieved_date`：string，YYYY-MM-DD 格式
  - `topic_tag`：string，非空，匹配 registry 中的 topic key
  - `notes`：string，可选
- `reference/00-shared-<slug>.md（rich MD，格式见 shared-reference-template.md）`（可选——共享 foundation reference：行业全景、方法论文献、跨 topic 对比数据等不属于单个 topic 的 reference。格式同 per-topic source.yaml，`topic_tag` 填 `shared`）
- `rb_trace.jsonl` 中有 `wave0_completion` event（通过 CLI 写入）：
  ```bash
  node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --event wave0_completion
  ```
- `rb_status.json` 中 `current_gate: wave0_complete` / `next_gate: wave1_complete`（通过 CLI 推进）：
  ```bash
  node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to wave0_complete
  ```

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md --attempt <N>
```

Retry 时传 Agent-reported `--attempt N`（N 从 1 开始，每次 rerun 递增）。若 gate 返回 `step_back: true`，暂停并重新阅读本 phase instructions §0 和 §3.3.1 后再决定策略。

## 6. On Gate Pass

读取 `check.next`。调用 `advance-status` 推进状态后加载下一 phase：
```bash
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to wave1_complete
```
然后加载 `check.next` 指向的 node（应为 `phase-wave1.md`）。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复后 rerun same gate。常见 fail 原因及修复方向：

| Fail | 修复 |
|------|------|
| `reference/_INDEX.md` 缺失或为空 | 写入 index 摘要 |
| `artifacts/wave0/<topic>/source.yaml` 缺失 | 为该 topic 搜索并写入 reference metadata |
| schema violation（缺少 url/title 等必填字段） | 补充缺失字段 |
| `per_topic_count_floor` fail：某 topic 的 `source.yaml` 条目数 < 动态阈值 | **进入 §3.3.1 Count-Floor Re-Fill Loop**：读 gate inspect → 解析不足 topic 和 gap → 创建 supplementary task card（`work_id: wave0-suppl-{topic.slug}-r{N}`，追加 source.yaml 条目，不覆盖已有）→ enqueue + drain → rerun gate。最多 3 次 gate attempt |
| `shared_ref_count_floor` fail：`00-shared-*.md` 文件数 < 动态阈值 | **同上**：进入 §3.3.1 Re-Fill Loop，创建 supplementary task card 搜集跨 topic 共享 foundation reference → 写 `00-shared-*.md` |
| registry 为空 | 通过 accepted trace/log surface 记录 `silent_degradation`（`gap_impact: blocks_must_answer`），从 `rb_plan.md` frontmatter 尝试重建 topic_registry。不浮出水面，不回到 HITL1 |
| `trace_event_present` fail | 确认已记录 `wave0_completion` trace event |
| status drift | 恢复 `current_gate`/`next_gate` 为 `wave0_complete`/`wave1_complete` |

**Persistent failure：** 若 wave0 gate 连续 3 次修复无进展（含 count_floor re-fill attempt），通过 accepted trace/log surface 记录 `silent_degradation`（`gap_impact: partial`）：
```bash
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"wave0","gate":"wave0-complete","gap_impact":"partial","reason":"persistent_failure_3x","attempts":3}'
```
不写 `state: blocked`。降级后 Agent 仍有责任继续尝试不同的修复策略（换搜索关键词、调整搜索角度），不浮出水面。

## 8. Stop Behavior

`stop: no` — Phase Agent 自主搜集 foundation reference，不发送阶段进度或 idle/no-work 汇报。Active queue、thin queue、per-topic count-floor gap、shared-ref count-floor gap、no-progress round、或 registry 为空，都是继续灌料、claim/complete、re-fill、换搜索策略、运行 gate 或记录 silent holding 的信号。

若 registry 为空，通过 accepted trace/log surface 记录 `silent_degradation`，尝试从 `rb_plan.md` 重建 topic_registry。Evidence quality and reference coverage take priority: before gate pass, do not turn quality/count gaps into user-facing status. Phase 完成条件是 `wave0-complete` gate pass + gate CLI `check.next`；不得自判完成或自行加载下一 phase。

> **静默阶段纪律**：本 phase 在静默自主阶段。`requires` 已加载 `shared-silent-execution.md`。遇错按降级优先级链处理（重试→换源→降级方法→标记 gap），绝不浮出水面向用户报告进度、提问或请求确认。

## Rerun-Aware Behavior

> 当 rerun 路径被触发（`phase-rerun` gate pass → chain → seed-topics → wave0），Phase Agent MUST 按增量模式执行 reference collection。

### 检测

读 `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count`。若 `rerun_count > 0`，当前为 rerun 轮次。同时读取各 topic 的 `seed_topics/{slug}.md` 中的 `## 本轮重跑方向` section。

### 增量行为

| 场景 | 行为 |
|------|------|
| **已有 topic，无 `## 本轮重跑方向` section** | Reference 全部保留。若该 topic 的 `artifacts/wave0/{slug}/source.yaml` 已有 foundation floor 数量的 reference，不再为此 topic 创建 task card（跳过）。若不足 floor，只为不足的部分搜索。 |
| **已有 topic，有 `action: supplement`** | 保留已有 reference。task card 的 action 中追加 `new_search_dimensions` 中指定的新搜索角度。已有维度的 reference 全部保留——不做去重或覆盖。 |
| **新增 topic（`action: add`）** | 全量搜索——与首次 wave0 一致。创建 standard task card。**Cache 写入与首次运行完全相同**：每个 source 必须在 `_cache/wave0/primary/{topic.slug}/sNN_<source-slug>/` 下写入 `websearch.json` + `page.md` + `meta.json`（11 字段），并在 slot result 的 `cache_trails[]` 中声明每个 leaf 路径。 |
| **移除 topic（`action: remove`）** | 该 topic 的 reference 保留在 `reference/{slug}/` 中，但不再为该 topic 创建 task card。如需标记，在 `reference/_INDEX.md` 中注明 deprecated。 |

### 灌料约束

在 enqueue 每个 topic 的 task card 前，Agent MUST 检查 `seed_topics/{slug}.md` 的 `## 本轮重跑方向` section。若 `action: supplement`，task card 的 action 字段中需明确追加搜索维度。若 `action: remove`，跳过该 topic（不创建 task card）。

## 9. Anti-Cheating Rules

- **禁止使用 fake URL 或伪造 source metadata**：每条 reference 必须来自真实搜索/阅读，url 必须指向真实可访问的页面
- **禁止声称 evidence coverage 或 research depth completeness**：Wave0 只需要 foundation floor，不是 comprehensive research
- **禁止跳过实际搜索直接编造 reference**：reference metadata 必须基于真实内容（title 反映实际页面标题，retrieved_date 是真实检索日期）
- **禁止在 Wave0 做 synthesis 或 claim verification**：Wave0 只收集 reference metadata，不做跨 topic 综合或结论判断
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:wave0 START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:wave0 END — <summary>"` |
| Repair loop 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "repair_loop_start" --detail '{"kind":"repair_loop_start","phase":"wave0","gate":"wave0-complete","attempt":<N>,"reason":"<reason>"}'` |
| Repair 动作 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "repair_action" --detail '{"kind":"repair_action","phase":"wave0","gate":"wave0-complete","attempt":<N>,"action":"<action>","work_id":"<id>"}'` |
| Repair loop 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "repair_loop_done" --detail '{"kind":"repair_loop_done","phase":"wave0","gate":"wave0-complete","attempt":<N>,"outcome":"<outcome>"}'` |
| Repair 升级 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "repair_escalated" --detail '{"kind":"repair_escalated","phase":"wave0","gate":"wave0-complete","attempt":<N>,"reason":"<reason>"}'` |
| Repair 降级 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "repair_degraded" --detail '{"kind":"repair_degraded","phase":"wave0","gate":"wave0-complete","attempt":<N>,"reason":"<reason>"}'` |

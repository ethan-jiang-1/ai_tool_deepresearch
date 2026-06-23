---
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0-complete
stop: "no"
requires:
  - shared/shared-profile
  - shared/shared-schemas
suggested_context:
  - shared/shared-anti-cheating-rules
---

# Phase: Wave0 — Foundation Shared Reference

## 1. Stage Goal

搜集少量真实的 shared reference evidence，为 topic_registry 中的每个 topic 创建结构化 YAML metadata（url/title/retrieved_date/topic_tag），写入 `reference/<topic>/source.yaml`，更新 `reference/index.md`。

**Wave0 是 foundation evidence collection，不是 comprehensive research。** 每个 topic 只需要至少 foundation floor 数量的 reference。目标不是 coverage completeness，而是为 Wave1 的 topic-scoped skeleton 和 Wave2 的 cross-topic synthesis 提供可信的 evidence 基座。

## 2. Required Inputs

- 已通过 `seed-topics-ready` gate 的 active bundle（`seed_topics/` 已物化）
- `rb_plan.md` frontmatter 的 `topic_registry`（topic 集合的 source of truth）
- `shared-profile.md`（research profile 和 root must-answer set）
- `shared-schemas.md`（ReferenceMetadata schema 字段定义和 wave artifact 目录结构）
- `DPT_FRAMEWORK/cli/operate-queue.mjs`（Agentic Queue CLI — 灌料、claim、complete 的入口）
- 运行 Agent 有 WebSearch 和 WebFetch 工具可用

## 3. Allowed Actions — Queue-Driven 三阶段

Wave0 使用 Agentic Queue 驱动 source intake。所有搜索/fetch 工作走 task card → claim → execute(sub-agent) → complete 循环。

### 3.1 灌料 (Filling) — 首次进入 wave0

如果 queue 为空（`operate-queue check <bundle>` 返回 `queue_health: "thin"` 或 `active_window` 为空，无待执行 task）：

1. 读取 `rb_plan.md` frontmatter 的 `topic_registry`，确定 topic 集合
2. 为每个 topic 生成一个 task card JSON 文件，然后 enqueue：

**Task card JSON 模板（写入临时文件如 `/tmp/wfq-task-{topic.slug}.json`）：**

> **模板变量来源**：`topic_registry` 数组中的每个条目含 `id`、`slug`、`title` 三个字段（PlanSchema）。模板中 `{topic.slug}` 取 `slug` 字段值，`{topic.title}` 取 `title` 字段值。搜索关键词从 `topic.title` 和同 topic 的 seed topic 文件（`seed_topics/{slug}.md`）中的 `search_guardrails.required_terms` 派生。

```json
{
  "work_id": "wave0-source-{topic.slug}",
  "title": "Source intake: {topic.title}",
  "target": "sub-agent",
  "action": "搜索 [{topic.title}] 的 foundation reference。从 topic.title 和 seed_topics/{topic.slug}.md 的 search_guardrails 派生搜索关键词。使用 WebSearch 找到至少 1 条可信来源，使用 WebFetch 获取每个来源的页面内容。提取并写入 reference/{topic.slug}/source.yaml（YAML 数组，每条含 url, title, retrieved_date(YYYY-MM-DD), topic_tag(\"{topic.slug}\"), notes(可选)）。搜索过程和中间结果写入 _cache/search-results/ 目录。",
  "producer_rule": "source_intake_fan_in",
  "lineage": {"topic_slug": "{topic.slug}", "phase": "wave0"},
  "priority_class": "P5_new_reference_intake",
  "required_receipts": ["file:reference/{topic.slug}/source.yaml"],
  "done_condition": "reference/{topic.slug}/source.yaml 存在，通过 ReferenceMetadata schema 校验（url 非空、title 非空、retrieved_date 为 YYYY-MM-DD、topic_tag 匹配 {topic.slug}），且至少含 1 条 reference",
  "verification": {"engine": ["receipt_check"], "agent": ["url_accessible", "title_matches_page"]},
  "writes_to": ["reference/{topic.slug}/source.yaml", "_cache/search-results/"],
  "status_sync": ["wave0_intake"],
  "completion_receipt": "file:reference/{topic.slug}/source.yaml",
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

### 3.2 Queue-Driven 执行循环

```
┌─────────────────────────────────────────────────────────────────────┐
│                     QUEUE-DRIVEN EXECUTION LOOP                      │
│                                                                      │
│  ┌─ 1. claim ──────────────────────────────────────────────────────┐│
│  │   operate-queue claim <bundle> --actor main-agent               ││
│  │   → stdout JSON: { item: {...task card...}, ... }                ││
│  │   → item 为 null → queue 空 → 跳到 §3.3                          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 2. execute ────────────────────────────────────────────────────┐│
│  │   target = sub-agent:                                            ││
│  │     a. 启动 sub-agent，传入 task.action 指令 + 当前 bundle 路径  ││
│  │     b. sub-agent 使用 WebSearch → WebFetch → 提取 metadata       ││
│  │     c. sub-agent 写入 reference/<topic>/source.yaml              ││
│  │     d. sub-agent 搜索中间结果写入 _cache/wave0/search-results/   ││
│  │     e. sub-agent 返回后，main-agent **不读回完整搜索结果**        ││
│  │        —只读 §3.2.1 投影确认 done-condition                      ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 3. complete ───────────────────────────────────────────────────┐│
│  │   a. 创建 result JSON → /tmp/wfq-result-{work_id}.json:         ││
│  │      { "work_id": "...", "receipt": "file:reference/.../...yaml"││
│  │        "summary": "source intake complete for topic X",          ││
│  │        "writes": ["reference/.../source.yaml"] }                 ││
│  │   b. 运行:                                                       ││
│  │      operate-queue complete <bundle> --result <result.json>      ││
│  │   → receipt check PASS → promote → refill → render               ││
│  │   → receipt check FAIL → engine 自动生成 repair task             ││
│  │       → 读 CLI 输出的 inspect/advice                              ││
│  │       → 修复产出（补写文件、修 schema）→ 回到 step 1 (claim)     ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 4. 读投影 ─────────────────────────────────────────────────────┐│
│  │   cat <bundle>/_cache/agentic-queue/current-task.md              ││
│  │   → 确认 done-condition 已满足                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 5. 回填 seed topic（趁热，不可跳过）─────────────────────────────┐│
│  │   complete 成功后，立刻回填 seed_topics/{topic.slug}.md：          ││
│  │     a. grep -n '__BACKFILL_WAVE0_EVIDENCE__' 定位 token 行        ││
│  │     b. 读取 reference/{topic.slug}/source.yaml                    ││
│  │     c. 替换 token 行为 ref 摘要（url/title/tier/trust/key data）   ││
│  │   → 替换 token，不追加——确保内容填入正确位置                       ││
│  │   → 回到 step 1（claim 下一个 task）                               ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**执行约束：**

- **不跳过 task**：只要 claim 返回了 task card（`item` 非 null），就必须执行并 complete，不得无故跳过
- **不伪造产出**：每条 reference 必须来自 WebSearch + WebFetch 获取的真实页面。url 必须指向真实可访问页面，title 反映实际页面标题，retrieved_date 为真实检索日期
- **工具降级链**：sub-agent 抓取网页内容时，如果 WebFetch 被安全策略阻止，**必须降级**——`curl -L <url>` → `python3 -c "import urllib.request..."` → `node -e "fetch(...)"`。不允许因为上层工具 blocked 就放弃抓取，更不允许拿搜索摘要当网页内容凑合。只有所有降级手段都失败才能报告"无法获取内容"
- **complete 阻塞**：如果 complete 时 receipt check 失败（source.yaml 不存在或 schema 不对），engine 自动生成 repair task（`producer_rule: queue_repair`），Agent 必须修复而不是跳过。修复后重新 claim
- **上下文管理**：sub-agent 执行搜索/抓取，bounded 输出写入 `_cache/wave0/search-results/`。main-agent 在 complete 后只读 `_cache/agentic-queue/current-task.md` 投影确认 done-condition，**不把完整搜索结果读回对话** — 这是防止 wave0 上下文膨胀的关键约束
- **即时回填 seed topic（不可跳过）**：每个 topic 的 complete 成功后，**在 claim 下一个 task 之前**，必须立刻回填 `seed_topics/{topic.slug}.md`：`grep -n '__BACKFILL_WAVE0_EVIDENCE__'` 定位 token → **替换 token 行**为 ref 摘要列表（`- **ref-XX-NN**: ...`）。趁 sub-agent 搜索结果还 fresh 就写，不等 wave0 结束

### 3.3 Queue 空后 — 收尾与 Gate

当 claim 返回 `item: null`（queue 空）时：

1. 检查 `reference/index.md` 是否已更新（列出所有 topic 的 reference 摘要）
2. 如果 index 缺失或未更新 → 手动写入（这是单步收尾动作，不重新灌 Q）
3. 跑 gate：
```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md
```
5. gate pass → 读取 `check.next` → 加载 `phase-wave1.md`
6. gate fail → 按 §7 On Gate Fail 处理

## 4. Expected Artifacts

- `reference/index.md`（非空，摘要每个 topic 的 reference）
- `reference/<topic>/source.yaml`（对于 topic_registry 中的每个 topic，至少 foundation floor 数量的 reference metadata 条目，每条满足以下 contract）：
  - `url`：string，非空
  - `title`：string，非空
  - `retrieved_date`：string，YYYY-MM-DD 格式
  - `topic_tag`：string，非空，匹配 registry 中的 topic key
  - `notes`：string，可选
- `rb_trace.jsonl` 中有 `wave0_completion` event
- `rb_status.json` 中 `current_gate: wave0_complete` / `next_gate: wave1_complete`

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md
```

## 6. On Gate Pass

读取 `check.next`。Advance to `wave1`：加载 `phase-wave1.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复后 rerun same gate。常见 fail 原因及修复方向：

| Fail | 修复 |
|------|------|
| `reference/index.md` 缺失或为空 | 写入 index 摘要 |
| `reference/<topic>/source.yaml` 缺失 | 为该 topic 搜索并写入 reference metadata |
| schema violation（缺少 url/title 等必填字段） | 补充缺失字段 |
| `count_floor` fail（某 topic reference 数量 < 1） | 为该 topic 搜集更多 reference |
| registry 为空 | 回到 HITL1 补充 topic_registry |
| `trace_event_present` fail | 确认已记录 `wave0_completion` trace event |
| status drift | 恢复 `current_gate`/`next_gate` 为 `wave0_complete`/`wave1_complete` |

**Persistent failure：** 若 wave0 gate 连续 3 次修复无进展，记录 escalation 到 `rb_status.json`（`state: blocked`）和 `rb_trace.jsonl`。

## 8. Stop Behavior

`stop: no` — Agent 自主搜集 foundation reference。若 registry 为空，报告并停止，不编造假 reference。

## 9. Anti-Cheating Rules

- **禁止使用 fake URL 或伪造 source metadata**：每条 reference 必须来自真实搜索/阅读，url 必须指向真实可访问的页面
- **禁止声称 evidence coverage 或 research depth completeness**：Wave0 只需要 foundation floor，不是 comprehensive research
- **禁止跳过实际搜索直接编造 reference**：reference metadata 必须基于真实内容（title 反映实际页面标题，retrieved_date 是真实检索日期）
- **禁止在 Wave0 做 synthesis 或 claim verification**：Wave0 只收集 reference metadata，不做跨 topic 综合或结论判断
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

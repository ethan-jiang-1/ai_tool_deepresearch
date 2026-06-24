## Context

Change 1 (`wfq-queue-seedtopics-wave0`) 和 Change 2 (`wfq-wave1-intake-subagent`) 已将 queue-driven 三阶段 + sub-agent dispatch 落地到 seed-topics、wave0、wave1。Wave2 是最后一个仍为 foundation placeholder 的 research phase——当前 `phase-wave2.md` 只有最简单的自由文本 §3（读 Wave0/Wave1 artifact → 写 synthesis.md → gate），没有 queue、没有 gap-fill、没有迭代。

V12 的教训：synthesis 不能只在本地综合已有 artifact——真正的 synthesis 过程中才会发现缺了什么（某 topic 证据不足、某 claim 未验证、某维度未覆盖），需要回头搜、补证据、再综合。这是一个 **synthesize → find gaps → search → re-synthesize** 的迭代 loop。

wave2 与 wave0/wave1 有本质差异：

| | wave0 | wave1 | wave2 |
|---|-------|-------|-------|
| 模式 | fan-out（每 topic 并行搜） | fan-out（每 topic 并行 deepening） | fan-in（多 topic 汇聚综合） |
| 核心动作 | WebSearch + WebFetch | WebSearch + WebFetch + 提取 | Read + Compare + Synthesize |
| sub-agent | dpt-source-intake | dpt-evidence-extractor | dpt-topic-scout（仅 gap-fill） |
| 并发 | 多 sub-agent 并行 | 多 sub-agent 并行 | 单 main-agent synthesis + 按需 spawn sub-agent |
| queue 价值 | N topic → N task（并行） | N topic → N task（并行） | 1 synthesis task + N backfill task（file receipt + trace + repair；内容完整性由 gate 验证） |

## Goals / Non-Goals

**Goals:**
- 重写 `phase-wave2.md` §3：从自由文本升级为 queue-driven 三阶段（灌料→执行循环→收尾+gate）
- 新增 `phase-wave2-subagent.md`：gap-fill sub-agent 行为指令（role: `dpt-topic-scout`）
- 1 个 synthesis task card（main-agent 执行）+ N 个 per-topic backfill task card（main-agent 执行）
- Wave2 artifact 从单一 synthesis.md 升级为三件套：synthesis.md + cross-topic-ledger.md + finding-index.yaml
- Finding taxonomy（三类 finding + 六种 decision）替代统一 "gap" 概念
- Cross-topic scan matrix 作为过程证据面
- Iterative finding triage + targeted search loop：classify → decision → search only if exploit_search/explore_search → re-synthesize → 迭代至收敛或上限
- Gap-fill sub-agent 直接 spawn（不通过 queue delegates——顺序依赖的判断链）
- JS feedback rails：L0/L1/L2 三层 + 7 个语义边界检查点 + failure budget
- Wave2 gate 扩展：三件套 artifact 检查 + backfill token 替换验证 + evidence 引用完整性
- 零新 JS 代码（Path A——纯 MD 驱动，复用现有 engine/CLI/relay）

**Non-Goals:**
- 不改 `queue-manager.mjs`、`operate-queue.mjs`、`subagent-relay.mjs`
- 不做 V12 30+ 字段 evidence 质量模型（那是后续 change 的事——§6.2c 已标记为 Change 3/4）
- 不做 V12 四区 question ledger 的完整生命周期管理——wave2 以 wave1 的 question-list.md 为输入（Change 2 已实现四区结构：Targets → Reconciliation → Emergent Protocol → Exploration/Exploitation Decision），通过 backfill 更新 `__BACKFILL_PENDING_QUESTIONS__` 的问题状态标签（`[开放]`/`[部分解答]`/`[涌现]`），但不引入新的 ledger 结构或 V12 Emergent Question Protocol
- 不做 V12 Anti-Stall Budget
- 不做 stop authorization 强制执行
- 不做 error recovery / stale claim 检测
- 不改 `phase-wave0.md`、`phase-wave1.md`、`phase-seed-topics.md`（它们已在 Change 1/2 完成）
- 不做 wave2 探索/利用的**完整 V12 EQP 生命周期管理**（finding taxonomy——三类 finding + 六种 decision、scan matrix、backfill-as-projection with `source_layer`——已纳入本 change；V12 四区 question ledger 的完整生命周期管理、V12 Emergent Question Protocol 的 full state machine 不在本 change 范围内）

## Decisions

### D1: Synthesis 本体走 queue，gap-fill 不走 queue

**选择：** Synthesis 本体是 1 个 queue task card（`targets: {controller: main-agent}`，`producer_rule: cross_topic_synthesis`）。Gap-fill 补搜不走 queue delegates——main-agent 在 synthesis 过程中发现缺口后，直接 spawn sub-agent（`dpt-topic-scout`），结果回写 synthesis。

**原因：**
- Synthesis 是 main-agent 的核心判断工作（读多个 topic 的 evidence-summary + question-list → 跨 topic 综合）——不能委托给 sub-agent
- Queue 在 N=1 时仍提供关键价值：`file:` receipt 检查（synthesis.md 存在）、done-condition pressure、trace 记录、repair 自动生成；非空、Markdown link 和 backfill token absence 由 wave2 gate 验证
- Gap-fill 是顺序依赖的判断链：先 synthesis 产出 gap list，再定向补搜——gap 是什么在 synthesis 完成前不知道，无法在灌料时预生成 task card
- Gap-fill sub-agent 仍遵循 relay slot 契约（`_subagents/wave_02/slot_MM/` 目录、task.md + result.schema.json、runtime-receipt），但不通过 queue 的 `targets.delegates` 机制

**替代方案：** Gap-fill 也走 queue（synthesis 完成后灌入 gap-fill task card）→ 增加不必要的 complexity——gap-fill 的数量和内容在 synthesis 前未知，灌料时机变成了 "synthesis 中途"，打破了 "进入 phase 时一次性灌料" 的约定。

### D2: Queue task 架构——1 + N

**选择：** Wave2 的 queue 中有两类 task card：

| Task | 数量 | producer_rule | target | 执行者 |
|------|------|---------------|--------|--------|
| Synthesis 本体 | 1 | `cross_topic_synthesis` | `{controller: main-agent}` | main-agent |
| Per-topic backfill | N（= topic_registry 大小） | `seed_topic_backfill_wave2` | `{controller: main-agent}` | main-agent |

**执行顺序：** Synthesis 本体先执行（`P2_close_open_loop` 优先级）→ synthesis 完成 + gap-fill loop 收敛 → per-topic backfill 执行（`P4_progressive_artifact_or_seed_backfill` 优先级）。这确保了 backfill 写回 seed topic 时 synthesis 已经是 gap-filled 的最终版本。

**为什么 backfill 不和 synthesis 合并：** Per-topic backfill 是独立的、可并行的文件写入操作——一个 topic 的 backfill 失败不影响其他 topic。拆成 N 个 task card 有以下好处：
- 每个 backfill 有独立的 queue task 与 `file:` receipt；token 替换的 deterministic 验证在 wave2 gate 中完成
- 单个失败生成 repair task，不阻塞其他 topic
- 可以利用 queue 的 promote + refill 自动流转
- Trace 中每条 backfill 有独立记录

**Task card JSON 中的 `{topic.slug}` 替换责任：** 灌料时 Agent 为每个 topic 独立创建 task card JSON 文件——`{topic.slug}` 等模板变量在写入 JSON 文件时由 Agent 替换为具体值。Queue receipt engine 只做 literal string matching（`file:seed_topics/{topic}.md` 中的 `{topic}` 不会展开），因此 task card 在 enqueue 前必须是 fully resolved 的。这与 Change 1/2 的灌料方式一致。

### D3: Finding triage + targeted search loop（替代原 gap-fill loop）

**选择：** 不采用 "发现 gap 就搜" 的机械规则。每个 finding 必须先分类、做 decision，只有 `exploit_search` 和 `explore_search` 才 spawn sub-agent。

**Three finding types（替代统一 "gap" 概念）：**

| Finding type | 来源 | 正确动作 | 是否搜索 |
|---|---|---|---|
| `wave1_legacy_question` | Wave1 question-list 中的 `[仍开放]` / `[部分进展]` | 先做 cross-topic 对齐；若未解且可搜索，再定向补搜 | 可能需要 |
| `cross_topic_resolution` | A topic 的问题被 B/C topic 既有 evidence 回答 | 记录 resolution、更新状态、投影回相关 topic | **不需要** |
| `cross_topic_emergent_question` | 多个 topic 拉通后首次出现的 pattern、矛盾、空白 | 做 exploration/exploitation decision；搜索、记录、移交或暂存 | 视 decision |

**Six decisions（每个 finding 必须先做 decision）：**

| Decision | 适用对象 | 动作 | Sub-agent? |
|---|---|---|---|
| `use_existing_evidence` | `cross_topic_resolution` | 用已有 Wave1 evidence 整合回答 | no |
| `exploit_search` | unresolved `wave1_legacy_question` | 窄域定向补搜 | yes |
| `explore_search` | searchable `cross_topic_emergent_question` | 有限探索新关系问题 | yes |
| `defer_hitl2` | 需要人类取舍、优先级判断 | 进入 HITL2 handoff | no |
| `requires_internal_data` | 需要专有/非公开数据 | 进入 HITL2 handoff | no |
| `record_only` | 低影响或超出当前 Wave2 budget | 记录为 open/deferred | no |

**Loop 结构（在 synthesis task 执行过程中）：**

```
┌─────────────────────────────────────────────┐
│ 1. Read all topic evidence-summary +        │
│    question-list from wave1                 │
│         │                                    │
│         ▼                                    │
│ 2. Build cross-topic scan matrix            │
│    (check topic pairs for shared_pattern,   │
│     contradiction, resolution_opportunity,   │
│     emergent_question)                       │
│         │                                    │
│         ▼                                    │
│ 3. Inventory findings into ledger/index:    │
│    - Wave1 legacy questions                 │
│    - Cross-topic resolutions                │
│    - Emergent cross-topic questions         │
│         │                                    │
│         ▼                                    │
│ 4. For each finding: classify type →        │
│    make decision → update index             │
│         │                                    │
│         ▼                                    │
│ 5. JS feedback check (L0/L1)                │
│    → repair ledger/index if needed          │
│         │                                    │
│         ▼                                    │
│ 6. For exploit_search / explore_search:     │
│    spawn dpt-topic-scout sub-agent          │
│    → ingest receipt → update index          │
│         │                                    │
│         ▼                                    │
│ 7. JS feedback check (L1)                   │
│    → verify receipt + status update         │
│         │                                    │
│         ▼                                    │
│ 8. Write synthesis.md as projection         │
│    (引用 W2F-xxx finding id)                 │
│         │                                    │
│         ▼                                    │
│ 9. JS feedback check (L1)                   │
│    → verify no orphan findings,             │
│      narrative references valid finding ids │
│         │                                    │
│         ▼                                    │
│10. Backfill seed topics as projection       │
│    → complete queue task                    │
└─────────────────────────────────────────────┘
```

**迭代参数（在 phase-wave2.md frontmatter 中声明）：**

| 参数 | 默认值 | 语义 |
|------|--------|------|
| `max_gapfill_iterations` | 2 | 最多 finding triage + search 迭代轮次 |
| `max_gapfill_subagents_per_round` | 3 | 每轮最多 spawn 的 sub-agent 数量 |

**收敛条件（任一满足即停止迭代）：**
1. 当前轮未发现新 finding（no new findings identified）
2. 已达到 `max_gapfill_iterations` 上限
3. 所有未解决 finding 都是 `requires_internal_data` / `defer_hitl2` / `record_only` 类型

**为什么是 2 轮默认而不是更多：** V12 的教训是 synthesis loop 可能无限扩展。2 轮在 "足够深入" 和 "避免 scope creep" 之间取平衡。Phase MD 的 frontmatter 允许 override。达到上限后，unresolved finding 必须进入 HITL2 handoff 或 record_only，不能静默消失。

### D4: Gap-fill sub-agent role——`dpt-topic-scout`

**选择：** Gap-fill 使用 `dpt-topic-scout` role（已存在于 DPT role registry，但未在 workflow phase 中使用过）。

**dpt-topic-scout 的职责（与 dpt-source-intake 和 dpt-evidence-extractor 的区别）：**

| Role | 搜索焦点 | 产出 | 使用的 phase |
|------|---------|------|-------------|
| `dpt-source-intake` | Foundation reference（宽） | `source.yaml` | wave0 |
| `dpt-evidence-extractor` | Topic-specific deep evidence | `evidence-summary.md` + `question-list.md` | wave1 |
| `dpt-topic-scout` | Targeted gap-fill（窄、定向） | gap-fill result JSON → 回写 synthesis | wave2 |

**Gap-fill sub-agent 的输入：**
- 具体缺口描述（"Topic X 的 claim Y 缺少独立验证来源"）
- 搜索关键词/方向（从 gap 描述派生）
- 目标 schema（简洁 JSON：found_evidence, source_urls, fills_gap, confidence）

**Gap-fill sub-agent 的输出：** 结构化 JSON → main-agent 读后更新 synthesis.md 对应段落。

### D5: Backfill token 系统扩展

**选择：** Wave2 使用两个 backfill token（已在 seed topic 文件中预埋）：

| Token | 替换内容 | 来源 |
|-------|---------|------|
| `__BACKFILL_WAVE2_JUDGMENT__` | 该 topic 的跨 topic 综合判断 | Wave2 ledger/index 中与该 topic 相关的 finding 投影 |
| `__BACKFILL_PENDING_QUESTIONS__` | 更新后的问题状态标签 | Wave2 ledger/index 的 finding status/decision + question-list.md 的问题状态 |

**替换规则（在 task card action 中明确）：**
- `__BACKFILL_WAVE2_JUDGMENT__`：从 ledger/index 中筛选 `affected_topics` 包含该 topic 的 finding，提取 resolution/synthesis 判断（1-3 段）→ 替换 token 行
- `__BACKFILL_PENDING_QUESTIONS__`：更新问题状态标签——`[开放]`→`[部分解答]`（被 cross-topic resolution 或 search 解答）、保持`[开放]`（仍无解答）、新增 cross-topic emergent question 标记为 `[涌现]` 并保留 `source_layer: wave2_cross_topic` → 替换 token 行

### D6: Wave2 gate 规则扩展

**选择：** Wave2 gate 在现有 5 条规则基础上扩展，覆盖三件套 artifact 检查、backfill token 验证和 finding id 引用。

**Gate 规则（更新后）：**

| 规则 | Check type | 说明 |
|------|-----------|------|
| synthesis.md 存在且非空 | `file_exists` + `field_non_empty` | 现有，不变 |
| **ledger.md 存在且非空（新）** | `file_exists` + `field_non_empty` | 确保 ledger artifact 存在 |
| **ledger 固定 section 存在（新）** | `pattern_match` | 验证 6 个 section 标题各至少出现一次 |
| **index.yaml 可 parse（新）** | `yaml_parse` | 确保 finding-index.yaml 是合法 YAML |
| Markdown link 引用完整性 | `cross_field` (markdown_link_resolution) | 现有，不变 |
| **synthesis 含 finding id 引用（新）** | `pattern_match` | 正则匹配 `W2F-\d{3}`，narrative 必须引用至少 1 个 finding id |
| trace event | `trace_event_present` | 现有，不变 |
| status value | `status_value` | 现有，不变 |
| **judgment token 已替换（新）** | `pattern_match` (negate: true) | 检查 seed_topics 中无残留 `__BACKFILL_WAVE2_JUDGMENT__` |
| **pending questions token 已替换（新）** | `pattern_match` (negate: true) | 检查 seed_topics 中无残留 `__BACKFILL_PENDING_QUESTIONS__` |
| **wave1 evidence 引用存在（新）** | `pattern_match` | 检查 synthesis.md 内容匹配 wave1 evidence-summary/question-list 引用 |

**为什么用 `pattern_match` 而不是新增 `cross_field` mode：** wave1 evidence 引用检查只需要验证 synthesis.md 中有指向 wave1 evidence-summary/question-list 的 Markdown link 文本——不需要单独验证目标文件存在（现有 `cross_field` 规则已保证所有 link 目标存在）。`pattern_match` 是 wave1 gate CLI 已支持的 check type（含 `negate`）——wave2 gate CLI 直接复用，零新机制。

**为什么新增 backfill token 检查：** Change 1/2 中 backfill 是 inline（在 task complete 时即时回填）。Wave2 backfill 是独立的 queue task card；当前 queue receipt engine 只支持 `file/json/queue/slot/trace/none` 等前缀，不能验证“某文本不存在”。Gate 侧加 `pattern_match` + `negate: true` 确保 seed topic 文件中没有残留 token。

### D7: Engine/relay 零改动，gate CLI 极少量改动

**选择：** Engine（`queue-manager.mjs`）和 relay（`subagent-relay.mjs`）零改动。Gate CLI 需新增 `pattern_match` check type 支持。

**变更分布：**
| 层 | 改动量 | 说明 |
|----|--------|------|
| Engine | 0 行 | queue-manager、subagent-relay 不动 |
| Gate CLI | ~35 行 | `check-gate-wave2-complete.mjs` 新增 `pattern_match` evaluator（含 `negate`），可从 `check-gate-wave1-complete.mjs` 复用逻辑；`yaml_parse` 和 `file_exists` 已存在于其他 gate CLI，直接复用 |
| Gate definition | +7 条规则 | JSON 配置变更：ledger existence、ledger section pattern、index YAML parse、finding id reference + backfill token ×2 + wave1 evidence reference |
| Phase MD | ~150 行 | `phase-wave2.md` §3 重写 + `phase-wave2-subagent.md` 新建 |
| Shared MD | ~10 行 | `shared-schemas.md` wave2 三件套 artifact 路径 + finding-index schema 说明 |

**为什么 engine/relay 零改动：**
- Queue engine 已完整——enqueue/claim/complete/fail/preempt/render 全部可用
- Sub-agent relay 已完整——slot 目录创建、receipt 验证、collect 流水线全部可用
- Gate CLI infrastructure（`gate-helpers.mjs`）已支持 `cross_field`（含 markdown_link_resolution）
- Wave2 的特殊性（fan-in synthesis + 顺序依赖 finding triage）是 Agent flow 层面的——不需要新 engine 机制，只需要正确的 MD 指令 + gate CLI 补上已存在于 wave1 的 `pattern_match` check type

### D8: Wave2 三件套 artifact group

**选择：** Wave2 从单一 `synthesis.md` 升级为三件套 artifact group：

```
artifacts/wave2/
  synthesis.md           # narrative projection（人类阅读）
  cross-topic-ledger.md  # Agent-readable dynamic ledger（6 个固定 section）
  finding-index.yaml     # JS-readable shadow index（11 个 required field per finding）
```

**各 artifact 职责：**

| Artifact | 职责 | 非职责 |
|---|---|---|
| `synthesis.md` | 面向人类阅读的 cross-topic narrative；组织最终综合判断、关键 patterns、残留问题；引用 Wave0/Wave1 artifacts + W2F-xxx finding id | 不作为动态 finding source of truth；不承载完整 scan matrix；不证明 exploration 真的发生 |
| `cross-topic-ledger.md` | Agent-readable source of truth；动态增长文件，每轮 synthesis/triage/exploration 后追加/更新 finding 状态 | 不给 JS 做结构化解析（那是 index 的职责） |
| `finding-index.yaml` | JS-readable structured shadow；每个 finding 有 id/type/status/decision/refs；让 JS engine 能做确定性反馈 | 不承载长篇 reasoning（那是 ledger 的职责）；不替代 ledger |

**原因：** Wave1 的 paired artifacts（evidence-summary.md + question-list.md）证明：Agent 的行为需要显形为可检查的 artifact surface。单一 `synthesis.md` 让 JS 最多检查 "文件存在、非空、有链接"，无法验证 cross-topic scan 是否发生、finding 是否被分类和决策、search 是否有 receipt。三件套让 JS feedback 面从 3-4 条检查扩展到 ~15 条 deterministic 检查。

**对标 Wave1：** Wave1 不是只产出一篇 summary——它有 paired artifacts（evidence-summary + question-list）。Wave2 也需要同样的 "行为显形"，不同点是 Wave2 是 fan-in/cross-topic，不是 per-topic fan-out，所以它是 artifact group 而不是每个 topic 两个文件。

**`cross-topic-ledger.md` 固定 sections：**

| Section | 作用 |
|---|---|
| Cross-Topic Scan Matrix | 记录哪些 topic pair/group 被检查，检查了 shared_pattern / contradiction / resolution_opportunity / emergent_question 哪些维度 |
| Wave1 Legacy Questions | 从 Wave1 question-list 汇入未完全解决的问题，记录 Wave2 对齐后的状态 |
| Cross-Topic Resolutions | 记录用其他 topic 既有 evidence 回答 legacy question 的整合动作 |
| Emergent Cross-Topic Questions | 记录 Wave1 阶段不存在、Wave2 拉通后才出现的新问题 |
| Exploration Decisions | 记录每个 finding 的 action decision |
| HITL2 Handoff | 汇总需要人类判断、内部数据、或超出 Wave2 budget 的 finding |

### D9: Finding taxonomy 和 decision 模型

**选择：** 不把所有 "新东西" 都叫 gap。引入三类 finding + 六种 decision。

**Finding lifecycle：**
```
candidate → classified → decision_made → searched/not_searched/deferred
  → resolved/partial/open/deferred → projected_to_synthesis and/or hitl2_handoff
  → backfilled_to_related_seed_topics
```

Ledger 记录 reasoning，index 记录 lifecycle state。JS 不判断 reasoning 是否好，但可以检查 lifecycle 是否断链。

**Finding type enum（`wave1_legacy_question` / `cross_topic_resolution` / `cross_topic_emergent_question`）：**
- `cross_topic_resolution` 不是 gap——它是对已有问题的整合性解答，用 existing evidence，不应搜索
- `cross_topic_emergent_question` 是 Wave1 阶段不存在的全新问题

**Decision enum（6 个值）：** `use_existing_evidence` / `exploit_search` / `explore_search` / `defer_hitl2` / `requires_internal_data` / `record_only`

**为什么区分 exploit_search 和 explore_search：** legacy gap-fill 是 exploit（目标收敛），emergent exploration 是 explore（天然可能发散）。语义分开后，达到上限时可以区分处理：exploit 未完成记录为 open，explore 未完成进入 HITL2 handoff 或 record_only。

### D10: Cross-topic scan matrix

**选择：** `cross-topic-ledger.md` 的第一个固定 section 是 scan matrix。对于 topic_count ≤ 5，默认检查所有 topic pair。Ledger 应显示 scan 发生了，即使没有发现有趣的 finding。

**Scan matrix 格式：**
```markdown
| pair_id | topics | checked_dimensions | finding_ids | notes |
| P01 | topic-a + topic-b | shared_pattern, contradiction, resolution_opportunity, emergent_question | W2F-001, W2F-002 | ... |
| P02 | topic-a + topic-c | shared_pattern, contradiction, resolution_opportunity, emergent_question | none | Checked; no material cross-topic relation found |
```

**原因：** 这不是要求 Agent 做机械笛卡尔积，而是给 JS 和人类一个反馈面：如果 Wave2 声称做了 cross-topic synthesis，却没有 scan surface，就很容易滑回自由总结。`pair_count_checked` vs `pair_count_expected` 的差距也是 JS feedback 的检查点。

### D11: JS feedback rails——三层反馈 + 语义边界节奏

**选择：** JS engine 不判断 content quality，但通过三层反馈持续检查 structure、refs、status、receipt。

**三层反馈：**

| Level | 何时 | 成本 | 目的 |
|---|---|---|---|
| L0 local parse/shape | Agent 写完稳定 YAML/ledger 块后 | 便宜 | 抓 malformed YAML、缺 fixed section、broken 引用 |
| L1 lifecycle consistency | 语义边界后：scan 完成、decision 分配完、sub-agent result ingest 完、projection 完 | 中等 | 抓 decision/receipt/handoff/projection 断链 |
| L2 phase gate | Wave2 artifact/backfill 完成、queue 清空后一次 | 最高权威 | 决定 Wave2 能否推进到 HITL2 |

**七个语义边界检查点：**
1. 初建 ledger/index 后 → 文件存在、fixed section、YAML parse、finding 字段完整、scan matrix 存在
2. Finding triage 后 → 每个 finding 有 type/decision/status/refs/affected_topics；resolution 的 search_required=false
3. Spawn sub-agent 前 → 只有 decision=exploit_search|explore_search 的 finding 才送去搜索
4. Sub-agent result ingest 后 → receipt refs 存在、status 已更新、失败搜索如实记录
5. Synthesis projection 后 → synthesis.md 引用 W2F-xxx、无 unknown finding id、无 orphan finding
6. Seed-topic backfill projection 后 → backfill 引用有效 finding id、保留 source_layer
7. Wave2 gate → phase boundary 最终裁决

**反馈节奏原则：** 不每次编辑都跑（会碎片化 Agent Flow），不只在最后跑（会变成事后验尸）。只在一个有意义的状态对象完成跃迁后跑。

**Feedback 输出形态（check/inspect/advice）：**
```text
check: failed
inspect:
  - W2F-002 decision=explore_search but subagent_receipt_refs is empty.
  - W2F-004 appears_in_synthesis=false and hitl2_handoff=false.
advice:
  - For W2F-002, attach relay runtime receipt or change decision to defer_hitl2/record_only.
  - For W2F-004, project to synthesis, add to HITL2 Handoff, or mark decision=record_only.
```

JS 不裁决 research quality；JS 裁决"有没有可审计的过程形状"。这正是项目的基本分工：LLM owns judgment，MD controls Agent Flow，Engine owns deterministic checkpoints。

### D12: Failure budget and escalation

**选择：** 反馈失败不能变成无限循环。引入 failure budget：

| Level | 修复策略 |
|---|---|
| L0 | 立即修复并 rerun——便宜且 deterministic |
| L1 | 同一 finding/状态边界最多 2 次修复尝试 → 超过则 escalate：finding 改为 `defer_hitl2` 或 `record_only`，附清晰原因 |
| L2 | 使用现有 phase gate repair discipline：persistent failure 应 escalate 而非静默降级 |

**原因：** 防止 feedback thrash——Agent 反复修同一个 finding 却修不好，会卡住 Wave2。Escalation 保持诚实：一个无法被修到 coherent 的 finding，应该变成显式的 unresolved/handoff 对象，而不是无限阻塞。

### D13: Backfill as projection（不是归属地转移）

**选择：** Seed topic backfill 是从 Wave2 ledger/index 的**投影**，不是把 cross-topic finding 改写为 topic-local question。

**规则：**
- 不把 cross-topic emergent question 改写成 topic-local pending question
- 不隐藏 finding id（W2F-xxx）
- 不丢失 decision/status
- 不声称 backfill 是新的 evidence source——source of truth 仍是 Wave2 ledger/index
- 必须标记 `source_layer: wave2_cross_topic`

**Backfill 格式：**
```markdown
### Cross-Topic Questions (from Wave2)

- W2F-002 [涌现] 为什么 topic-a 与 topic-b 在 X 机制上方向相反？
  - source_layer: wave2_cross_topic
  - affected_topics: topic-a, topic-b
  - decision: requires_internal_data
  - see: artifacts/wave2/cross-topic-ledger.md#W2F-002
```

Backfill token `__BACKFILL_WAVE2_JUDGMENT__` 和 `__BACKFILL_PENDING_QUESTIONS__` 仍然存在（D5），但替换内容从 ledger/index 投影而来，不是直接从 narrative 摘抄。

## Risks / Trade-offs

- **[Finding triage 不收敛] Synthesis 可能每轮都发现新 finding，超过 max_gapfill_iterations** → 强制收敛并记录 unresolved findings 到 ledger 的 HITL2 Handoff section。这不影响 gate pass——gate 不评估研究完整性，但要求 unresolved finding 显式沉淀（不能静默消失）。
- **[Main-agent 上下文压力] Synthesis 需要读多个 topic 的 evidence-summary + question-list，上下文可能很大** → 每个 topic 的 evidence-summary 是 bounded 结构化文档（wave1 sub-agent 输出已被 schema 约束形状），不是完整搜索 trail。Topic 数量在 foundation 阶段 ≤5，可管理。上下文可持续性测量留给 Change 4 full-chain 实验。
- **[dpt-topic-scout 首次在 workflow 中使用] role 已注册但无 phase 使用经验** → Gap-fill 任务是窄、定向搜索（比 wave0 的 broad source intake 更简单），playbook 先验证 1 个 finding 的最短路径。
- **[Backfill 失败不阻塞 synthesis gate pass？] 当前 gate-wave2-complete 不检查 backfill token** → 新增 backfill token 规则后，backfill 未完成会 block gate。这是期望行为——确保 seed topic 闭合。
- **[三件套 artifact 增加了 Agent 的写入负担] 从 1 个文件到 3 个文件** → ledger 是 Agent 自己在 synthesis 过程中的 working memory（天然产出，不是额外负担）；index 是 ledger 的结构化影子（main-agent 写完 ledger 后顺手写 index，字段固定）。Wave1 已经有 paired artifacts 的先例——Agent 可以做到。
- **[Feedback thrash] L1 检查可能让 Agent 反复修同一个 finding 修不好** → D12 failure budget：同一 finding/边界最多 2 次尝试后 escalate 到 defer_hitl2/record_only。Gate 不要求所有 finding 完美——只要求 lifecycle 不断链。
- **[Scan matrix 在 topic_count > 5 时的可行性] 笛卡尔积不可行** → 不做机械全覆盖。topic_count > 5 时，先按 shared dimension 聚类，再扫描每个 cluster 内的最相关 pair/group。JS 不强制 pair_count，只检查 scan accounting 是否存在。

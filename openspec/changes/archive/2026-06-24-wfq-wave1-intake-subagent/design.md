## Context

Change 1 (`wfq-queue-seedtopics-wave0`, 已归档) 把 queue-driven 三阶段落地到了 seed-topics 和 wave0。但存在三个已知 gap：

1. **Wave1 仍是 foundation placeholder**：`phase-wave1.md` §3 是自由文本，只写 skeleton，不做真正的 deepening。
2. **Sub-agent dispatch 未真正实现**：wave0 的 task card 写 `target: sub-agent`，但实际执行时 main-agent 自己调 WebSearch+WebFetch——噪声直接进主上下文。
3. **Wave0/Wave1/Wave2 的 sub-agent 执行模式相同但会各自描述**：搜索→提取→回填的循环逻辑一样，差异只在角色名、产出路径、回填 token——应该有统一的批量并行协议+参数化接口，而不是三份重复的 MD 执行循环。

`subagent-relay.mjs`（1066 行）已实现完整的并行 slot 管理能力——`stageSubagentSlots()`、`ingestAgentReceipt()`、`commitSlotResult()`、`collectAndMergeSubagentResults()`——以及 `MAX_CONCURRENT_SUBAGENTS = 4`。`_subagents/wave_NN/slot_MM/` 目录结构和通信契约（task.md + result.schema.json + runtime-receipt + forbidden authority）也早已定义好。这些设施在 experiment playbook 中已验证过，但从未被 workflow phase 实际使用。

Change 2 的架构方向：**queue 管 work list，relay 管并行 slot 执行，shared protocol 定义参数化接口。**

## Goals / Non-Goals

**Goals:**
- 重写 `phase-wave1.md` §3：从 foundation placeholder 升级为 queue-driven deepening，引用 shared protocol + 参数表
- `target` (enum) → `targets` ({controller, delegates?})  breaking schema change
- Wave0 §3 retrofit：引用 shared protocol + 参数表，`targets.delegates` 替代 `target: sub-agent`
- 新增 `shared-subagent-protocol.md`（核心交付物）：通信契约、目录结构、批量并行执行协议、并发控制、参数化接口、Forbidden Authority
- Queue + relay 桥接：queue task card → relay SlotConfig 映射，`stageSubagentSlots()` 接收 custom dispatchMap，`ingestAgentReceipt()` + `commitSlotResult()` + `collectAndMergeSubagentResults()` 构成 collect 流水线
- 批量并行执行：≤ `MAX_CONCURRENT_SUBAGENTS`（正=硬上限，-1=不限），collect-as-return + 补位
- Wave0/Wave1/Wave2 共性提炼到 shared protocol，差异用参数表（role_key, artifact_template, artifact_schema, backfill_tokens, search_focus）表达
- 新增 producer_rule `topic_deepening`
- Wave1 gate 适配新产出路径

**Non-Goals:**
- 不改 `subagent-relay.mjs` 本身的逻辑——它的 `stageSubagentSlots()`、`ingestAgentReceipt()`、`commitSlotResult()`、`collectAndMergeSubagentResults()` API 不变。Change 2 是首次在 workflow phase 中调用这些 API
- 不做 stop authorization 强制执行
- 不做 error recovery / stale claim 检测
- 不做 JS helper `deriveTasks()` 批量灌料
- Wave1 deepening 不做 multi-round 迭代（每 topic 单轮）
- 不改 `phase-wave2.md`、`phase-readiness.md`、`phase-final.md`（Change 3/4）

## Decisions

### D1: `target` → `targets` schema shape

**选择：** `targets: { controller: 'main-agent' | 'engine', delegates?: { to: 'sub-agent', role_key: string, timeout_ms?: number } }`

**注意：** `delegates` 中不再需要 `noise_boundary` 字段——目录结构由 relay 的 `_subagents/wave_NN/slot_MM/` 管理，sub-agent 只写自己 slot 目录，隔离由 relay 的 slot 契约保证。`timeout_ms` 替代了原 `noise_boundary` 作为可选参数，默认 600000（10 分钟），传递给 relay SlotConfig。

**为什么不是其他方案：**
- `targets: [{role: 'main-agent'}, {role: 'sub-agent', ...}]`（数组）——过度复杂。一个 task 只有一个 sub-agent 委托。
- `delegates` 用 optional 而非 nullable：不存在 = main-agent 自己执行；存在 = spawn sub-agent。

### D2: Queue + Relay 桥接架构

**选择：** queue 管 work list（灌料 + receipt check），relay 管并行 slot 执行（`stageSubagentSlots` → 并行 spawn → `ingestAgentReceipt` → `commitSlotResult` → per-slot collect → 补位 → `collectAndMergeSubagentResults`），phase MD 做桥接（task card → SlotConfig 映射 + 参数表声明）。

**桥接方式：**
1. Phase MD 灌料完成后，读 queue 获取 pending task card 列表
2. 取前 N 个 task card（N ≤ MAX_CONCURRENT_SUBAGENTS），映射为 relay SlotConfig：
   - `task.work_id` → `slot.key`
   - `task.action` → `slot.taskDescription`
   - `task.targets.delegates.role_key` → `slot.roleAgentKey`
   - `task.targets.delegates.timeout_ms` → `slot.timeoutMs`
3. 构建 custom dispatchMap：`new Map([['pass', slotConfigs]])`
4. `stageSubagentSlots(state, bundleDir, dispatchMap)` → 创建 `_subagents/wave_NN/slot_MM/` 目录
5. 并行 spawn N 个 sub-agent
6. 任意返回 → `ingestAgentReceipt()` → `commitSlotResult()` → 验证产出 → `complete()` queue task → inline backfill → 从 queue 取下一个 task（如有）→ 补 spawn 到释放的 slot
7. 全部 collected → `collectAndMergeSubagentResults()` → gate

**为什么不用"relay 不改"方案：** relay 的 slot 管理、并发控制、result 验证、trace 已经是完整的——不需要重新发明。Phase MD 直接 spawn sub-agent 的话，需要自己管理目录隔离（多个 sub-agent 同时写 `_cache/` 会冲突）、自己验证结果格式、自己记录 trace。relay 已经有所有这些能力，桥接比绕过更简单。

**relay API 不变：** `stageSubagentSlots()` 已支持 custom dispatchMap 参数（playbook 已验证）。不需要改 relay 代码——只需要在 phase MD 执行时传入从 queue task card 派生的 dispatchMap。

### D3: Wave1 deepening 的深度边界

**选择：** 每个 topic 单轮 deepening——sub-agent 搜索→提取 evidence→写 evidence-summary.md→main-agent backfill seed topic。不做 multi-round fan-in/fan-out。

**原因：**
- Change 2 的核心任务是建立 queue-driven sub-agent dispatch 的闭环，不是做完整的多轮 deepening
- 单轮足够验证：sub-agent 真的被 spawn、噪声真的隔离在 `_cache/`、backfill 真的替换了 token
- Multi-round deepening（V12 的 round-N search-results/、fan-in review）可以在后续 change 中叠加上去——queue 的三阶段模板天然支持多轮（灌料时可以生成 round-1、round-2... task card）

**V12 对照：** `phase-wave1.md` Future Expansion Guidance 的 6 个 track 中，Change 2 覆盖 track 1 (deepening)、track 2 (subagent dispatch)、track 4 (repair/backfill)。Track 3 (candidate intake)、5 (fan-in review)、6 (quality gates) 留给后续。

### D4: Inline backfill 保持 per-topic 即时模式

**选择：** 沿用 wave0 的 inline backfill 模式——每个 topic 的 deepening task complete 后立刻回填 seed topic，再 claim 下一个。不改为 queue-driven batch backfill。

**原因：** wave0 已验证 inline backfill 可行。Wave1 deepening 比 wave0 更依赖"趁热回填"——deepening 提取的 mechanism 理解和趋势判断是语义密集的，等全部 topic 做完再回填第一个 topic 的细节已丢失。`phase-wave1.md` 当前 §3c 已经是 per-topic 即时回填，queue-driven 化后保持这个顺序不变。

### D5: 上下文隔离——relay slot 契约天然强制

**选择：** 上下文隔离不再靠 MD 约定——relay 的 slot 契约在机制上强制了隔离。Sub-agent 只收到自己 slot 目录里的 `task.md` 和 `result.schema.json`（bounded 上下文），只写自己的 `runtime-receipt.jsonl`。Sub-agent 看不到 WorkflowState、gate 内部、其他 topic 结果、queue 内容。Main-agent 收集结果时读 `result.json`（结构化 JSON），不读 sub-agent 的完整搜索过程。这比"main-agent 自觉不读"可靠得多——信息根本没给 sub-agent，sub-agent 的输出也被 schema 约束了形状。

**对比旧设计：** 原方案靠 `noise_boundary` 路径 + MD 约定"main-agent 不要读完整搜索结果"——enforcement 为零。Relay 方案中，sub-agent 的输出格式被 `result.schema.json` 严格约束（status, summary, evidenceCount, references, confidence, notes），大段搜索 trail 和页面 dump 根本不在 schema 允许的字段里——sub-agent 想塞噪音都塞不进去。

### D9: `_cache/` — 中间产物暂存区，非 authority

**选择：** `_cache/` 保留其 project charter 定义的角色——可重建缓存，不是 authority。Sub-agent 在搜索过程中产生的**中间产物**（WebSearch 原始返回、WebFetch 页面 dump、还没提取的原始数据）写入 `_cache/`。只有经过 main-agent 验证和 promote 的结果才进入 authority 路径（`result.json` → artifact 文件）。

**目录关系：**

```
_subagents/wave_NN/slot_MM/     ← relay 管理（authority 产出）
  task.md                       ← bounded 任务
  result.schema.json            ← 输出形状约束
  _status.json                  ← slot 状态
  runtime-receipt.jsonl         ← 自证"真的跑了"
  result.json                   ← parent 验证后的最终结论（authority）

_cache/waveN/slot_MM/            ← 可重建中间产物（非 authority）
  search-results/               ← WebSearch 原始返回（可能质量不够，不 promote）
  fetched-pages/                ← WebFetch 页面 dump（噪声源，隔离在此）
  extraction-notes/             ← 提取过程中的草稿
```

**为什么保留 `_cache/`：** WebSearch 的结果不总是可用的——source 可能质量不够、页面可能 inaccessible、内容可能不相关。但 sub-agent 搜了就是搜了，中间产物需要落地（否则 trace 无处可查，debug 无从下手）。`_cache/` 就是放这些"搜了但不确定要不要"的东西。Wave 结束后可以全删。

**Sub-agent 做的事：** 读 `task.md` → WebSearch + WebFetch → 中间结果写 `_cache/` → 提取证据 → 返回结构化 JSON（仅精华）给 parent → parent 验证后写 `result.json`。主 Agent **只读 `result.json`**——如果怀疑 sub-agent 的提取质量，可以去 `_cache/` 抽查原始数据，但默认不读。

**Authority 边界：** `result.json` + artifact 文件 = authority。`_cache/` = 非 authority（可重建、可删除、不是 receipt 检查的目标）。

### D6: Producer rule 标准化

**选择：** 新增 `topic_deepening` producer_rule（WAI-001），保持现有 `source_intake_fan_in`（AGQ-007）和 `seed_topic_materialize`（AGQ-009）不变。

**现状：** `producer_rule` 在 `QueueWorkUnitSchema` 中是 `z.string().min(1)`——没有 Zod enum 约束。三个 producer_rule 值是 MD 模板层的约定。Change 2 不引入 `ProducerRule` Zod enum——保持 bare string。

### D7: 批量执行协议 + 参数化接口

**选择：** `shared-subagent-protocol.md` 定义完整的批量并行执行循环（§3），wave0/wave1/wave2 的差异用参数表表达（§5），各 phase MD 只需声明参数表 + 引用协议，不各自描述执行循环。

**参数表设计（各 phase MD 在 §3.2 中声明）：**

| 参数 | 含义 | Wave0 | Wave1 |
|------|------|-------|-------|
| `role_key` | DPT role agent | `dpt-source-intake` | `dpt-evidence-extractor` |
| `artifact_template` | 产出路径 | `reference/{slug}/source.yaml` | `artifacts/wave1/{slug}/evidence-summary.md` |
| `artifact_schema` | Zod schema | `ReferenceMetadata` | `EvidenceSummary` |
| `backfill_tokens` | 回填 token 列表 | `["__BACKFILL_WAVE0_EVIDENCE__"]` | `["__BACKFILL_WAVE1_MECHANISMS__", "__BACKFILL_WAVE1_TRENDS__", "__BACKFILL_PENDING_QUESTIONS__"]` |
| `per_topic_backfill` | 即时回填 | `true` | `true` |
| `search_focus` | 搜索焦点 | foundation reference | topic-specific deep evidence |
| `timeout_ms` | 超时 | 600000 | 600000 |

**为什么参数化：** Wave0/Wave1/Wave2 的 sub-agent 执行模式完全相同——灌料→stage→并行 spawn→collect-as-return→验证产出→backfill→补位→merge。差异只在 role_key、产出路径、回填 token、搜索描述。如果不参数化，三份 phase MD 各自写一套执行循环，以后改并发策略要改三个地方。参数化后，改 shared protocol 一处即可。

### D8: MAX_CONCURRENT_SUBAGENTS 语义

**选择：** 复用 `subagent-relay.mjs:99` 的 `MAX_CONCURRENT_SUBAGENTS = 4`。

| 值 | 语义 |
|----|------|
| 正数（默认 4）| 硬上限，同时最多 spawn 该数量的 sub-agent |
| `-1` | 不限——queue 里有多少 pending task 就 spawn 多少，全量并行 |
| `0` | 无效，等价于 1 |

Phase MD 可通过 `max_concurrent_override` 参数覆盖（如 wave2 gap-fill 设 -1 全量并行），需在 phase node frontmatter 中声明理由。

## Risks / Trade-offs

- **[Breaking change] `target` → `targets`** → 一次性改完所有引用，不保留 backward compat。Change 1 的三个 playbook 需要重跑。
- **[Relay 动态 dispatchMap]** `stageSubagentSlots()` 已支持 custom dispatchMap（playbook 已验证），但从未在 workflow phase 的 queue-driven 上下文中使用。Mitigation：wave0 happy-path playbook 先用 1 topic 跑通最短路径。
- **[Scope 风险] ~12 文件改动** → 按 task 顺序实施，每完成一组就跑回归和 playbook 验证。
- **[Sub-agent 返回顺序不确定]** 并行执行时 sub-agent 返回顺序与 topic_registry 顺序可能不同——backfill 和 queue complete 必须按实际返回顺序处理，不能假设 slot_00 先于 slot_01 返回。协议已设计为 "collect-as-return" 模式。

## Migration Plan

1. Schema + engine + CLI 先改（`target` → `targets`），所有现有测试必须 PASS
2. `shared-subagent-protocol.md` 新建（phase MD retrofit 会引用它，所以先创建）
3. Phase MD retrofit：seed-topics（task card 模板 `target` → `targets`）→ wave0（§3 引用 shared protocol + 参数表）→ wave1（完整重写 §3，引用 shared protocol + 参数表）
4. Gate 适配（wave1 gate check 产出路径 + backfill token 检查）
5. Wave0 playbook 重跑（验证 relay 并行 dispatch 不退化）
6. Wave1 playbook 新写（验证批量并行 deepening 闭环）
7. Registry 更新 + `check-project-reqs.mjs` + `check-project-specs.mjs` PASS

Rollback：如果 relay dispatch 在 playbook 中持续失败，可暂时回退到 main-agent 串行执行（task card 模板去掉 `delegates`），不阻塞 wave1 deepening 内容本身的验证。

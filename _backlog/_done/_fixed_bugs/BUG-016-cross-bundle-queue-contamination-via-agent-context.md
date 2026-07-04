# BUG-016: Agentic Queue 跨 Bundle 污染 — Agent 上下文混入导致 work_id 错乱，queue 无 bundle identity 校验

**Reported**: 2026-07-03
**Severity**: P0（Queue 是 Sub-agent relay pipeline 的唯一入口；queue 被污染 → relay 整个堵死 → Agent 被迫走捷径绕过 provenance，直接触发 BUG-014）
**Status**: Open
**Bundle**: `dpt_rb_chinese-football-future-development`（受害 bundle）
**Related**: [[BUG-014-phase-agent-bypasses-subagent-relay-regression]]（本次污染是 BUG-014 中"queue 入口污染"的具体机制）、[[BUG-006-task-card-controller-allows-bypassing-subagent]]（同一链条的前序修复）

---

## 0. 阅读说明

**本 bug 由旁观者（非 run 执行者）在事后审计 run bundle 状态时发现。** 发现者未参与该 run 的执行过程，仅通过阅读 `rb_queue.json`、`rb_trace.jsonl`、`_logs/run.log`、`_cache/agentic-queue/current-task.md` 等控制文件和审计轨迹，还原了污染事件的全貌。以下所有证据均来自这些文件的持久化记录。

---

## 1. 一句话核心诊断

**Agentic Queue 没有 bundle identity binding。** 当同一个 Agent 会话先后或同时处理多个 run bundle 时，Agent 可能在灌料（enqueue）阶段将 bundle A 的 topic slug 错误地写入 bundle B 的 queue。Queue engine 不做 `topic_registry` 一致性校验，照单全收。污染一旦写入 `rb_queue.json`，后续所有 relay 操作（claim → complete → promote）都在错误的 work_id 上执行，导致 relay pipeline 彻底堵死。

**这不是 queue engine 的 bug——engine 忠实地操作了被污染的数据。污染发生在 Agent → queue 的边界上，而这条边界没有校验层。**

---

## 2. 证据链

### 2.1 污染事件时间线（从 `rb_trace.jsonl` + `_logs/run.log` 还原）

所有时间均为 2026-07-02 UTC：

| 时间 | 事件 | 证据来源 |
|------|------|---------|
| 15:02:23 | Bundle `chinese-football-future-development` 实例化，queue 初始化为干净模板（全部 slot = null） | `instantiate-run-bundle.mjs` 代码逻辑 + `rb_queue.json.tmpl` 内容 |
| 15:09:06 | Queue 首次被加载（`existed: true`——文件已存在，正常） | `rb_trace.jsonl` L12 |
| 15:09:32 | 灌入 `seed-topic-01_chinese-professional-league-development` → slot_1_current ✅ 正确 | `rb_trace.jsonl` L14 |
| 15:09:32 | 灌入 `seed-topic-02_national-team-competitiveness` → slot_2_next ✅ 正确 | `rb_trace.jsonl` L17 |
| **15:09:33** | **灌入 `seed-topic-03_clinical-scenarios` → slot_3_pending ❌ 污染！** | `rb_trace.jsonl` L20 |
| 15:09:33 | 灌入 `seed-topic-04_football-governance-cfa-reform` → slot_4_pending ✅ 正确 | `rb_trace.jsonl` L23 |
| **15:09:33** | **灌入 `seed-topic-05_challenges-and-tech-trends` → slot_5_tail ❌ 污染！** | `rb_trace.jsonl` L26 |
| 15:12:01 | Topic 01 完成，receipt 验证通过，queue promote | `rb_trace.jsonl` L29-35 |
| 15:12:01 | Topic 02 完成，receipt 验证通过，queue promote | `rb_trace.jsonl` L37-43 |
| 15:12:01 | **Topic 03 完成尝试失败：`work_id mismatch: expected seed-topic-03_clinical-scenarios, got seed-topic-03_youth-training-academy-system`** | `_logs/run.log` ERROR |
| 15:12:01 | **Topic 04 完成尝试失败：`work_id mismatch: expected seed-topic-03_clinical-scenarios, got seed-topic-04_football-governance-cfa-reform`** | `_logs/run.log` ERROR |
| 15:12:01 | **Topic 05 完成尝试失败：`work_id mismatch: expected seed-topic-03_clinical-scenarios, got seed-topic-05_football-industry-commercialization`** | `_logs/run.log` ERROR |
| 15:12:12 | Agent claim `seed-topic-03_clinical-scenarios`（污染 work_id），receipt 验证失败（文件不存在） | `rb_trace.jsonl` L48-51 |

### 2.2 污染 work_id 的来源

两个污染 work_id 显然不属于本 bundle：

| 污染 work_id | 正确 work_id（本 bundle topic_registry） |
|-------------|--------------------------------------|
| `seed-topic-03_clinical-scenarios` | `seed-topic-03_youth-training-academy-system` |
| `seed-topic-05_challenges-and-tech-trends` | `seed-topic-05_football-industry-commercialization` |

`clinical-scenarios` 和 `challenges-and-tech-trends` 属于典型的"医疗 AI 临床应用"类研究 topic，与本 bundle 的"中国足球未来发展"主题完全不相关。这强烈暗示 Agent 在灌料时混入了**同一会话中处理过的另一个 run bundle 的 topic 数据**。

### 2.3 投影缓存（Projection Cache）的二次污染

`_cache/agentic-queue/current-task.md` 文件当前（2026-07-03）内容：

```
slot_1_current: seed-topic-03_clinical-scenarios        ← 仍为污染数据
slot_2_next:   seed-topic-04_football-governance-cfa-reform  ← 正确
slot_3_pending: seed-topic-05_challenges-and-tech-trends    ← 仍为污染数据
slot_4_pending: empty
slot_5_tail:   empty
```

而当前 `rb_queue.json`（authority）的 work_id 已被修复为正确的 football topic。但 **projection cache 从未被重新生成**，至今仍保留污染数据。Phase Agent 如果读取此 projection 来判断"下一步做什么"，会被导向错误的 work_id。

### 2.4 当前 `rb_queue.json` 状态（部分修复但不一致）

```json
{
  "queue_health": "ready",
  "slot_1_current": { "work_id": "seed-topic-01_...", "status": "queued" },
  "slot_2_next":    { "work_id": "seed-topic-02_...", "status": "queued" },
  // ... 全部 5 个 slot 的 work_id 已修正为 football topic
  // 但全部 status 仍为 "queued"（01/02 实际已完成）
}
```

修复只改了 work_id，没有同步更新 status，也没有重新生成 projection。

---

## 3. 根因分析

### 3.1 直接原因：Agent enqueue 时 work_id 生成错误

Agent 在 seed-topics 阶段为每个 topic 生成 enqueue task card 时，topic 03 和 05 的 work_id 用了错误 bundle 的 topic slug。这不是随机错误——两个错误 slug 同属一个明显的语义域（医疗 AI），说明 Agent 的上下文中混入了另一个 run 的数据。

可能的触发场景：
- 同一 Agent 会话先跑了一个"医疗 AI 临床应用"研究，再跑"中国足球"研究
- Agent 在生成 football bundle 的 enqueue 命令时，上下文中仍有医疗 AI topic 的残留
- 当 football topic 03 和 05 的语义与医疗 topic 接近时（"体系/系统" vs "挑战/趋势"），Agent 更容易混淆

### 3.2 系统缺陷一（P0）：Queue 入口无 topic_registry 一致性校验

`operate-queue.mjs enqueue` 接收 task card JSON，写入 queue slot，但**不做任何 bundle-level 校验**：

- 不检查 `work_id` 中的 topic_slug 是否在 `rb_plan.md` frontmatter 的 `topic_registry` 中存在
- 不检查 task card 的 `lineage.topic_slug` 是否与 bundle 的 `plan_basename` 一致
- 不检查 task card 的 `payload.topic_slug` 是否与 `rb_profile.yaml` 的 topic 集合一致

涉及代码路径（推断，未修改）：
- `DPT_FRAMEWORK/engine/queue-manager.mjs` — enqueue 逻辑
- `DPT_FRAMEWORK/cli/operate-queue.mjs` — enqueue 命令入口
- `DPT_FRAMEWORK/schema/contracts/queue.mjs` — QueueSchema 定义

### 3.3 系统缺陷二（P0）：Queue 文件无 bundle identity 标记

`rb_queue.json` 不包含任何 bundle identity 字段（无 `plan_basename`、无 `bundle_name`、无 `topic_registry_hash`）。这意味着：

- 无法在 enqueue 时做同源性校验
- 无法在 load 时检测"这个 queue 是否属于当前 bundle"
- Queue 文件理论上可以从一个 bundle 复制到另一个 bundle 而不会报错

对比：`rb_status.json` 有 `bundle` 字段，`rb_trace.jsonl` 有 `bundle` 字段，但 `rb_queue.json` 没有。

### 3.4 系统缺陷三（P1）：Projection cache 无 staleness detection

`_cache/agentic-queue/current-task.md` 是从 `rb_queue.json` 生成的可读投影，但：

- 没有记录生成时间戳或 source queue 的 hash
- `operate-queue check` 或 `operate-queue project` 可能不会在 queue 变更后自动重新生成 projection
- 导致 Phase Agent 读取的 projection 与 authority queue 不一致

这使污染从"queue 层"扩散到了"Agent 指令层"——即使 queue 后来被手动修复，Agent 仍然读到错误的 projection。

### 3.5 系统缺陷四（P2）：无 queue repair/cleanup CLI

当 queue 被污染后，没有标准化的修复路径：

- 没有 `operate-queue validate --against-bundle <bundle>` 命令
- 没有 `operate-queue repair --remove-stale` 命令
- Agent 只能手工编辑 JSON（容易出错）或绕过 queue（触发 BUG-014）

---

## 4. 事件链：污染如何导致 Relay 全面失效

```
Agent 上下文混入其他 bundle 的 topic slug
  → enqueue 时 work_id 生成错误（3/5 正确，2/5 错误）
  → queue 状态变为 ready（engine 认为一切正常）
  → claim topic 01 → 完成 → promote（正常）
  → claim topic 02 → 完成 → promote（正常）
  → promote 后 slot_1_current = seed-topic-03_clinical-scenarios（污染 work_id 进入 active slot）
  → 尝试 complete topic 03（正确 work_id: seed-topic-03_youth-training-academy-system）
  → engine 拒绝：work_id mismatch（slot_1 期望 clinical-scenarios，实际收到 youth-training）
  → 尝试 complete topic 04、05 → 同样被拒绝（都 mismatch slot_1 的 clinical-scenarios）
  → Agent 尝试 claim 污染 work_id → receipt 验证失败（文件不存在）
  → 此时 queue 完全不可用——不能 complete 正确 work_id，也不能 claim 污染 work_id
  → Agent 的静默纪律要求"自己解决"（shared-silent-execution）
  → **Agent 绕过 queue → 直接做 WebSearch → BUG-014 触发**
```

关键点：**2/5 的污染率就足以让整个 relay pipeline 瘫痪。** 因为 queue 是线性 promote 的（slot 完成 → 下一个 slot 进入 active），污染堵塞在 slot_1_current 后，所有后续的正确 task 都无法被 complete。

---

## 5. 影响评估

### 5.1 当前 Bundle 影响

| 方面 | 状态 |
|------|------|
| Seed-topics materialization | 最终完成（5/5），但 topic 03 走了非 relay 路径 |
| Wave0 (shared refs + per-topic sources) | 完成，但 queue 未参与——所有产出均绕过 relay |
| Wave1 deepening | **卡住**——queue 从未被灌入 wave1 task card，只有 topic 01 有手工产出 |
| `_cache/agentic-queue/current-task.md` | **仍含污染数据**（2026-07-03） |
| `rb_queue.json` | work_id 已修复但 status 过期，queue_health 仍为 "ready" |
| `rb_output_declarations.jsonl` | 有 14 行（wave0 产出），但非通过 relay delegated complete 写入 |

### 5.2 系统性影响

任何在同一个 Agent 会话中处理多个 run bundle 的场景，都可能触发此 bug。风险与 Agent 会话中处理的 bundle 数量成正比。

---

## 6. 修复建议

### 6.1（P0）Enqueue 入口增加 topic_registry 一致性校验

`operate-queue.mjs enqueue` 在执行写入前：

1. 读取 `<bundle>/rb_plan.md` frontmatter 的 `topic_registry`
2. 提取 task card 的 `work_id` 或 `lineage.topic_slug` 中的 topic slug
3. 校验该 slug 是否在 `topic_registry` 中存在
4. 不存在 → 拒绝入队，返回明确 error：`"topic_slug '{slug}' not found in bundle topic_registry. This task card may belong to a different bundle."`

涉及文件：
- `DPT_FRAMEWORK/cli/operate-queue.mjs` — enqueue 命令
- `DPT_FRAMEWORK/engine/queue-manager.mjs` — enqueue 内部逻辑

### 6.2（P0）Queue Schema 增加 bundle identity 字段

在 `QueueSchema` 中增加：

```json
{
  "bundle_name": "chinese-football-future-development",
  "plan_basename_hash": "...",
  ...
}
```

- `bundle_name`：在 `instantiate-run-bundle` 时写入
- 所有 queue 操作前校验 `bundle_name` 匹配当前 `<bundle>` 参数
- 不匹配 → 拒绝操作

涉及文件：
- `DPT_FRAMEWORK/schema/contracts/queue.mjs` — QueueSchema
- `DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl` — 添加 `bundle_name: "{{name}}"`（或 null，在 instantiate 时注入）
- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` — 注入 `bundle_name` 到 queue

### 6.3（P1）Projection cache 增加 staleness detection

`operate-queue project` 生成 projection 时：

1. 在 projection 文件头部记录 `generated_at` 时间戳和 `source_queue_hash`（`rb_queue.json` 的 SHA256）
2. `operate-queue check` 读取 projection 时校验 hash 是否匹配当前 `rb_queue.json`
3. 不匹配 → 警告 `"projection is stale — rerun operate-queue project"` 或自动重新生成

涉及文件：
- `DPT_FRAMEWORK/engine/queue-manager.mjs` — project/render 函数
- `DPT_FRAMEWORK/cli/operate-queue.mjs` — check 命令

### 6.4（P2）增加 queue repair CLI

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs repair <bundle> --remove-stale
```

- 读取 `rb_plan.md` topic_registry
- 遍历所有 slot + refill_pool
- 移除 work_id 中的 topic_slug 不在 topic_registry 中的 task card
- 移除已完成但 status 未更新的 task card（receipt 文件已存在的）
- 输出变更摘要

涉及文件：
- `DPT_FRAMEWORK/cli/operate-queue.mjs` — 新增 repair 子命令
- `DPT_FRAMEWORK/engine/queue-manager.mjs` — repair 逻辑

---

## 7. 复现条件

1. 同一 Agent 会话中先后执行两个不同主题的 run bundle（如：先跑"医疗 AI 临床应用"，再跑"中国足球未来发展"）
2. 两个 bundle 的 topic_registry 长度相同（均为 5 个 topic）或 topic 编号有重叠（如都有 topic 03、05）
3. 后执行的 bundle 在 seed-topics 阶段由 Agent 生成 enqueue 命令
4. Agent 上下文中仍有前一个 bundle 的 topic slug 残留
5. Agent 在生成部分 topic 的 work_id 时混用了前一个 bundle 的 slug
6. `operate-queue enqueue` 不做校验，照单全收

**观察到的污染率**：5 个 topic 中 2 个被污染（40%）。这 2 个足以使整个 5-slot queue 失效。

---

## 8. Tags

`queue-contamination` `cross-bundle` `agent-context` `identity-binding` `projection-staleness` `BUG-014-root-cause` `relay-pipeline` `P0`

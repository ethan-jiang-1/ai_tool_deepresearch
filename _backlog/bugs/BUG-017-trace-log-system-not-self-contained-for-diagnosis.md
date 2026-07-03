# BUG-017: Trace/log 系统三层断裂，无法从记录中独立诊断 gate 失败原因

**Reported**: 2026-07-03
**Severity**: P1（trace 是静默阶段 debug 的唯一入口，当前状态需要对照 chat transcript 才能理解事件链，违背 "不依赖 chat memory" 的设计原则）
**Status**: Open
**Bundle**: `dpt_rb_chinese-football-future-development`
**Related**: [[BUG-014-phase-agent-bypasses-subagent-relay-regression]]（trace 本应捕获 relay 旁路决策）, [[BUG-015-wave-gate-quality-rules-too-strict]]（trace 本应揭示 gate 质量规则阻塞模式）

---

## 0. 一句话核心诊断

**Trace/log 系统有三层记录（rb_trace.jsonl / run.log / _diagnostics/gates/），但三层没有打通。rb_trace.jsonl 有 event label 但没有 detail（"骨架无肉"），run.log 有 detail 但截断且缺少 repair action（"有肉但碎"），_diagnostics/gates/ 有完整 gate 失败细节但未被 trace 引用。一个没看过 chat transcript 的人打开这些记录，无法重建完整事件链。**

---

## 1. 三层记录现状

### 1.1 rb_trace.jsonl（66 行）— 骨架无肉

**全量内容**：

```
行  | event              | phase | detail
----|--------------------|-------|--------
1   | run_start          | (空)  | (空)
2-4 | gate_attempt       | (空)  | (空)
5   | phase_transition   | (空)  | (空)
6-8 | gate_attempt       | (空)  | (空)
9   | phase_transition   | (空)  | (空)
10-11| gate_attempt       | (空)  | (空)
12-51| queue_loaded/check | (空)  | (空)
52  | seed_topics_comp...| (空)  | {"topic_count": 5}  ← 唯一一条有 detail 的
53  | gate_attempt       | (空)  | (空)
54  | phase_transition   | (空)  | (空)
55  | wave0_completion   | (空)  | (空)
56  | diagnostic         | (空)  | (空)
57  | gate_attempt       | (空)  | (空)
58  | diagnostic         | (空)  | (空)
59-60| gate_attempt       | (空)  | (空)
61  | phase_transition   | (空)  | (空)
62  | wave1_completion   | (空)  | (空)
63  | diagnostic         | (空)  | (空)
64  | gate_attempt       | (空)  | (空)
65  | diagnostic         | (空)  | (空)
66  | gate_attempt       | (空)  | (空)
```

四个致命缺陷：

| 缺陷 | 影响 |
|------|------|
| **所有 66 行 timestamp 为空** | 无法重建时间线。不知道 gate fail 之间隔了 2 秒还是 20 分钟。无法判断 Agent 是在修复还是在 idle。 |
| **所有 event 的 phase 为空** | `gate_attempt` 出现在行 2、6、10、53、57、59、64、66——哪些是 wave0？哪些是 wave1？不知道。 |
| **gate_attempt/diagnostic event 的 detail 为空** | `diagnostic` event 出现了 5 次（行 3、7、56、58、63、65），但没有一条包含 gate fail 的原因。 |
| **没有 repair action event** | gate fail → gate retry 之间 Agent 做了什么？64 条 event 中只有 queue_loaded/receipt_checked/check/complete/promote/projection_rendered——全是 queue 操作。没有 `repair_action`、`repair_loop_start`、`silent_degradation`。 |

**66 行中只有第 52 行（seed_topics_completion）包含 detail。其余 65 行全是空壳。**

### 1.2 run.log（133 行）— 有肉但碎

**记录了什么**：

```
[15:13:05] ERROR queue_load_exception: "queue_health invalid value..."
[15:13:18] INFO gate_attempt: seed-topics-ready (passed)
[15:13:21] INFO phase:seed-topics END
[15:13:39] INFO phase:wave0 START
[15:35:59] WARN gate_attempt: wave0-complete FAILED → inspect: [...]
[15:37:45] WARN gate_attempt: wave0-complete FAILED → inspect: [...]
[15:38:03] INFO gate_attempt: wave0-complete PASSED
[15:38:07] INFO phase:wave0 END
[15:38:24] INFO phase:wave1 START
[15:54:40] WARN gate_attempt: wave1-complete FAILED → inspect: [...]
[15:55:27] WARN gate_attempt: wave1-complete FAILED → inspect: [...]
```

**能看到的**：gate 失败的时间点、inspect 摘要（部分截断）、phase 开始/结束时间。

**看不到的**：

| 缺失 | 影响 |
|------|------|
| **15:13-15:35 之间的 22 分钟**（wave0 START → gate_attempt）没有任何记录 | 这段时间 Agent spawn 了 sub-agent、做了 5 个 topic 的搜索、写了 source.yaml——全是静默完成的。无法知道 sub-agent 是否成功、产出了什么 |
| **15:38-15:54 之间的 16 分钟**（wave1 START → gate_attempt）同理 | 第二个 sub-agent batch 的搜索过程完全不可见 |
| **gate fail 之间的 repair action** | wave0 attempt 1 fail (15:35) → attempt 2 fail (15:37) 之间的 2 分钟，Agent 做了什么？写了 ledger？修了格式？创建了 cache 目录？run.log 沉默 |
| **queue 污染的完整上下文** | `queue_load_exception` 记录了 Zod error 但截断了（`...expected one of \"r"`），看不到完整的 schema error |
| **Sub-agent bypass 决策** | Agent 选择绕过 relay 的决定没有记录——这是最重要的诊断信息 |

### 1.3 _diagnostics/gates/（6 个 JSON 文件）— 最好的部分

```
_diagnostics/gates/
  2026-07-02T15-08-31.967Z-hitl1-recorded.json     ← passed
  2026-07-02T15-08-51.711Z-setup-ready.json        ← passed
  2026-07-02T15-35-59.285Z-wave0-complete.json     ← FAILED (attempt 1)
  2026-07-02T15-37-45.687Z-wave0-complete.json     ← FAILED (attempt 2)
  2026-07-02T15-54-40.736Z-wave1-complete.json     ← FAILED (attempt 1)
  2026-07-02T15-55-27.849Z-wave1-complete.json     ← FAILED (attempt 2)
```

**这些是唯一真正可用于诊断的东西。** 每个文件完整记录了：
- 所有 fail 的规则 ID 和对应的 inspect detail
- Uncountable reason（`key_facts_insufficient: 0 bullets, need 5`、`source_url_is_homepage`）
- Jaccard clone 检测结果（含具体文件名和相似度）
- Cache trail 缺失列表（逐个文件列出）
- 完整的 advice 列表

**但诊断文件有两个问题**：
1. **Gate pass 时不写文件**——wave0 attempt 3 通过了，但没有对应的 diagnostic 文件（无法对比 "修复了什么才通过的"）
2. **不被 trace 引用**——`rb_trace.jsonl` 的 `gate_attempt`/`diagnostic` event 不含 `diagnostic_path` 字段（虽然 run.log 里写了 `diagnostic_path`），无法从 trace 跳转到详细信息

---

## 2. 三层断裂的具体表现

### 2.1 时间线断裂

用现有记录还原 gate 失败时间线：

```
rb_trace:     gate_attempt → diagnostic → gate_attempt → diagnostic → gate_attempt
              (无 timestamp)    (无 detail)   (无 timestamp)  (无 detail)

run.log:      [15:35:59] FAIL  [15:37:45] FAIL  [15:38:03] PASS
              (有 inspect)      (有 inspect)

_diagnostics: wave0-complete.json (attempt 1, full detail)
              wave0-complete.json (attempt 2, full detail)
              (attempt 3 pass — no file)
```

**只能对照 run.log 的时间戳 + _diagnostics 的内容才能重建：15:35 第一次 fail（ledger 缺失），15:37 第二次 fail（source_url + cache），15:38 通过。** 但 rb_trace 不知道这些事件的顺序（无 timestamp），run.log 不知道完整原因（截断），_diagnostics 不知道 Agent 在两次 fail 之间做了什么（没有 repair action）。

### 2.2 因果关系断裂

Wave0 的 relay 旁路 → Wave1 的同样旁路 → Wave1 gate 因 format 问题 fail。这两个 phase 的失败有因果关系，但 trace 里没有任何连接：
- rb_trace 的 phase 字段全是空的
- run.log 没有 "relay bypassed" 或 "sub-agent spawn method" 记录
- _diagnostics 每个文件是孤立的——wave1 的诊断文件不会引用 wave0 的诊断文件

### 2.3 决策链断裂

gate fail 后 Agent 做了修复决策：

```
wave0 attempt 1 fail (ledger missing, cache missing)
  → Agent 决策: 手工创建 rb_output_declarations.jsonl + 手工创建 cache 目录 + 写 meta.json
  → wave0 attempt 2 fail (source_url missing, cache trail wrong path)
  → Agent 决策: 修复 ledger 的 source_url + 修正 cache trail 路径
  → wave0 attempt 3 pass
```

**这些决策没有一个出现在 trace 或 run.log 里。** 你只能从 _diagnostics 的 diff（attempt 1 vs attempt 2 的 inspect 变化）推断 Agent 做了什么，而不能直接看到。

---

## 3. 缺失的关键 event 类型对照

`shared-silent-execution.md` §2 和 phase-wave0.md/phase-wave1.md 的 Log section 要求的记录 vs 实际：

| 要求的 event | 来源 | 实际 |
|-------------|------|------|
| `phase:<name> START` | phase MD Log section | ✅ run.log 有（wave0/wave1 各一次） |
| `phase:<name> END` | phase MD Log section | ✅ run.log 有 |
| `gate_attempt`（含 detail） | gate CLI 自动 | ⚠️ run.log 有摘要但截断，rb_trace 有 label 但 detail 空 |
| `diagnostic`（含 detail） | gate CLI 自动 | ⚠️ 同上 |
| `repair_loop_start` | phase MD Log section | ❌ 没有 |
| `repair_action` | phase MD Log section | ❌ 没有 |
| `repair_loop_done` | phase MD Log section | ❌ 没有 |
| `repair_escalated` | phase MD Log section | ❌ 没有 |
| `repair_degraded` | phase MD Log section | ❌ 没有 |
| `silent_degradation` | shared-silent-execution.md §2 | ❌ 没有 |
| `silent_gap` | shared-silent-execution.md §2 | ❌ 没有 |
| `silent_unpassable` | shared-silent-execution.md §6.3 | ❌ 没有 |
| `ledger_append` | queue-manager.mjs 内部 | ⚠️ 仅在 queue 操作时自动触发，手工写 ledger 不触发 |

**缺失率：14 个要求的 event 类型中，4 个有（但质量参差），10 个完全没有。**

---

## 4. 根因分析

### 4.1 rb_trace.jsonl 的 detail 空（P0）

gate CLI 写入 `gate_attempt` event 时调用了 `traceEntry()` 或 `logEvent()`，但**没有把 inspect/advice 内容写入 trace detail**。trace 只写了 event label，detail 字段留空。

实际上，inspect/advice 被写入了两个地方：
1. `run.log`（通过 `log-event.mjs` CLI）——有摘要但截断
2. `_diagnostics/gates/`（通过 gate CLI 的 diagnostic writer）——完整但孤立

**但 `rb_trace.jsonl` 的 `gate_attempt`/`diagnostic` event 没有携带 inspect/advice 的引用或摘要。**

### 4.2 无 timestamp（P0）

`rb_trace.jsonl` 的 event 没有 `timestamp` 字段。`log-event.mjs` CLI 写入 run.log 时加了 timestamp，但 `traceEntry()`（内部函数，写入 rb_trace.jsonl）没有加。**这是 engine 层面的问题——trace 写入函数没有自动注入 timestamp。**

### 4.3 Phase 字段为空（P1）

`traceEntry()` 被调用时没有传入 phase 参数。phase MD 的 log-event CLI 调用也没有传 `--phase` flag。Gate CLI 在写 `gate_attempt` 时知道当前 gate 名称，但没有写入 phase context。

### 4.4 Repair action 没有记录（P1）

Phase MD 的 Log section 定义了 repair loop 的 event 模板，但 **Agent 在静默阶段不会主动调用 `log-event.mjs` 来记录 repair action**。静默阶段的 "不要浮出水面" 纪律被 Agent 理解为 "不要做任何多余的事"——包括 trace。

**这是设计问题**：trace 的写入责任在 Agent，但 Agent 在静默阶段的首要纪律是 "不要停，自己修"。写入 trace 被视为 "停下来做汇报"，与静默纪律冲突。

### 4.5 Sub-agent bypass 无法被 trace 捕获（P1）

当前没有 event type 可以表达 "Phase Agent 做出了绕过 relay 的决策"。这是一个 gap——trace schema 没有涵盖这个关键的诊断信号。

---

## 5. 修复方向

### 5.1（P0）Engine 自动注入 timestamp

`traceEntry()` 函数应该在写入每条 rb_trace.jsonl entry 时自动添加 `timestamp` 字段（ISO 8601）。Agent 不需要手动传——engine 做。

涉及文件：`DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs`（或 trace 工具 module）

### 5.2（P0）Gate CLI 写入 trace detail + diagnostic ref

`check-gate-*.mjs` 在写 `gate_attempt` event 时，应该：
- 将 inspect/advice 的第一条写入 detail（摘要，不截断）
- 将 diagnostic 文件路径写入 `diagnostic_path` 字段
- 写入 `phase` 字段（从 gate name 推导：wave0-complete → wave0 phase）

### 5.3（P1）Agent 职责分离：repair action 自动记录

将 repair action 的 trace 写入从 Agent 职责中分离：
- Phase MD 不再要求 Agent 手动调用 `log-event.mjs` 记录 repair_action
- 改为：gate CLI 在 gate retry 时自动对比上次 attempt 的 diagnostic → 检测到 inspect 变化 → 自动写入 `repair_progress` event（"attempt N → N+1: X issues resolved, Y new issues"）
- Agent 只需要做 repair，不需要主动记录

### 5.4（P1）增加 bypass detection event

在 gate 中增加一条检测：如果 `rb_output_declarations.jsonl` 缺失但 `source.yaml`/`evidence-summary.md` 等产出存在 → 自动写入 `relay_bypass_suspected` event 到 trace。

### 5.5（P2）rb_trace.jsonl 与 _diagnostics/ 的引用链

`rb_trace.jsonl` 的 `gate_attempt` event 携带 `diagnostic_path`（指向 `_diagnostics/gates/<timestamp>-<gate>.json`），形成 trace → detail 的引用链。这样 debugger 能从 trace 概览跳转到 diagnostic 详情。

---

## 6. 本次 bundle 的实际诊断能力评估

| 问题 | 纯靠 log 能诊断吗？ | 还需要什么？ |
|------|-------------------|-------------|
| Queue 污染（BUG-014 Root Cause 1） | ⚠️ 部分能（run.log 有 queue_load_exception，但截断） | 完整 error message |
| Relay 旁路决策 | ❌ 不能（没有任何 event 记录） | 新 event type |
| Gate 质量规则阻塞（BUG-015） | ✅ 能（_diagnostics 有完整 inspect） | 需要 trace→diagnostic 引用 |
| Agent repair 尝试 | ❌ 不能（没有 repair action event） | 自动 repair progress detection |
| Wave0→Wave1 因果关系 | ❌ 不能（两层 trace 完全独立，phase 字段为空） | phase 字段 + 跨 phase 链路 |
| 时间线重建 | ⚠️ 部分能（run.log 有 timestamp） | rb_trace 需要 timestamp |

**综合**：如果是一个没看过 chat 的人，他能从 `_diagnostics/gates/` 知道 gate 为什么 fail，但**完全无法知道**：(1) gate 为什么 fail 了这么多次（因为没有 repair 记录），(2) Agent 为什么选择了绕过 relay（因为 bypass 决策不可见），(3) 两次 phase 的失败是否相关（因为跨 phase 引用不存在）。

---

## 7. Tags

`trace-quality` `log-system` `diagnostic-gap` `timestamp-missing` `repair-audit` `silent-execution` `P1`

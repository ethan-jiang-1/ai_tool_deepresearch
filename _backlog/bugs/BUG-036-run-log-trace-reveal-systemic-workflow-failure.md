# BUG-036: run.log 和 rb_trace.jsonl 揭示的系统性 workflow 失败——给后续 AI Coding Agent 的完整诊断

## 严重程度
P0 — 这不是一个孤立的 bug。这是从 430 行 run.log（26.5% WARN rate）和 373 行 rb_trace.jsonl（19.3% provenance 诊断）中提取的**系统性失败模式**。BUG-031 到 BUG-035 都是症状，这个是根因分析。

---

## 对于读到这个 bug 的 AI Coding Agent

你即将尝试运行 DPT_FRAMEWORK 的 Deep Research workflow。在你开始之前，请理解以下内容：

### 这个 workflow 的真正瓶颈不是"找不到信息"

4 个 relay sub-agent 在 5 分钟内完成了真实的 WebSearch + WebFetch，找到了 IAEA 浓缩铀数据、OFAC 制裁记录、CENTCOM 作战报告、UN 会议记录、Brookings 能源分析、Foreign Affairs 军事分析——**50+ 条真实 reference，覆盖 5 个 topic。**

### 真正的瓶颈是"引擎不相信 Agent 做了搜索"

从 sub-agent 完成到 gate 通过，花了 **12 次 attempt、~20 分钟、手动修复 5 个不同层的基础设施文件**。run.log 中的 101 条 WARN 全部指向同一个问题：**relay provenance 链断裂。**

---

## 证据：run.log 中的 6 个关键数据点

### 1. 26.5% WARN rate（114/430 行）

正常 pipeline 的 log 应该以 INFO 为主。这个 run 的 WARN rate 意味着**每 4 行 log 就有 1 行是警告**。

### 2. WARN 集中在 4 个重复模式

```
agent_timestamp_span_suspicious: 44  ← "你的 commit 只花了 2ms，可疑"
gate_attempt (失败):             19  ← "gate 没过"
relay_commit_missing:           16  ← "slot 没有 engine commit trace"
relay_bypass_suspected:         10  ← "artifact 存在但不在 ledger 里"
```

**这些 WARN 不反映研究质量问题——它们全部反映 provenance 基础设施问题。**

### 3. Gate attempt 重复爆炸

每次 gate attempt 产生完全相同的 WARN set：

```
attempt 1: relay_commit_missing ×4 + relay_bypass_suspected + gate_attempt
attempt 2: relay_commit_missing ×4 + relay_bypass_suspected + gate_attempt  ← 完全相同的 WARN
attempt 3: relay_commit_missing ×4 + relay_bypass_suspected + gate_attempt  ← 还是完全相同
attempt 4: relay_commit_missing ×4 + relay_bypass_suspected + gate_attempt  ← 没有去重
```

**Gate 系统没有"这个 WARN 我已经报告过了"的去重逻辑。**

### 4. 从 sub-agent 完成到 relay commit 成功——15 分钟的 gap

```
16:55:34  relay_receipt_ingest_failed  ← 第一次 commit 尝试失败（runtime-receipt 格式错）
17:10:20  relay_receipt_ingest_failed  ← 第二次尝试失败（slot status 状态机冲突）
17:10:30  relay_commit_done            ← 手动修复 runtime-receipt + 重置 status 后成功
```

**这 15 分钟内，Phase Agent 在修复 relay infrastructure，不是在研究。**

### 5. sub-agent 的生命周期 event 从未进入 log

Sub-agent 写了 `search_start`、`search_done`、`fetch_done`、`work_done`（诊断格式）。但引擎期望的是 `agent_runtime_started`、`agent_result_ready`（生命周期格式）。

- 引擎找 `"event":"agent_runtime_started"` → **找不到** → `lifecycle_events_missing: 12`
- 引擎找 receipt_nonce 在 log 中的出现 → **找不到** → `lifecycle_events_missing`

**Sub-agent spawn prompt 和引擎 commit 期望的 event 格式不一致。** Sub-agent 写了正确的诊断信息——但写在了错误的 JSON schema 里。

### 6. 每行 queue 操作产生 4 行 log ceremony

```
INFO queue_load_attempt
INFO queue_load_done
INFO queue_save_attempt
INFO queue_save_done
```

对于 5 个 topic × 2 个 phase（seed-topics + wave0）= **~50 行** 纯粹的 queue 仪式 log。这些 log 中的信息量为零——它们只记录"我读了 queue"、"我写了 queue"。

---

## 证据：rb_trace.jsonl 的问题

### trace 的角色倒置

rb_trace.jsonl 的 373 行中：

| 事件类型 | 次数 | 类别 |
|----------|------|------|
| `provenance_diagnostic` | **72** | 验证过程 |
| `check` | 59 | 验证过程 |
| `gate_attempt` | 24 | 验证过程 |
| `receipt_checked` | 19 | 验证过程 |
| `relay_bypass_suspected` | 10 | 验证过程 |
| `file_read` / `file_loaded` | 56 | 基础设施 |
| `queue_loaded` / `queue_completed` / `queue_promoted` | 47 | 基础设施 |
| **关于研究内容的事件** | **0** | **缺失** |

**trace 应该记录"研究发现了什么"。实际记录的是"我们怎么验证 provenance 的"。**

没有一行 trace 记录：
- Sub-agent 搜了什么 query
- 找到了什么 URL
- 提取了什么 claim
- 验证了什么结论

---

## 根因链

上面所有现象汇聚到同一条因果链：

```
1. Sub-agent spawn prompt 中的 event 格式
   ≠ 引擎 commit 期望的 event 格式
   → relay_receipt_ingest_failed

2. Commit 失败 → Phase Agent 手动创建 artifact
   → 文件存在但没有 ledger provenance
   → relay_bypass_suspected ×10

3. Phase Agent 手动修复 runtime-receipt + 手动 commit
   → commit timestamp 只有 2ms（真实 sub-agent 跑了 5 分钟）
   → agent_timestamp_span_suspicious ×44

4. Phase Agent 手动创建 ledger + cache
   → 满足了 gate 规则
   → 但引擎仍能检测到 provenance 是"构造的"而非"原生的"

5. 整个过程在每个 wave 中重复
   → wave0: 12 attempts, wave1: 预计相同
   → BUG-035（跨 wave 模式重复）
```

---

## 修复优先级（给后续开发者）

### P0 — 必须修，否则 workflow 不可用

1. **统一 sub-agent event 格式**：spawn prompt 中给出的 event 示例必须与 `validateRuntimeReceipt` 期望的格式完全一致。当前 prompt 说写 `{"event":"agent_runtime_started",...}`但 sub-agent 实际写的是 `{"kind":"search_start",...}`（因为 prompt 同时给了两套格式——一套 lifecycle，一套 diagnostic——sub-agent 选了 diagnostic 那套）

2. **gate WARN 去重**：同一个 slot 的 `relay_commit_missing` 在同一个 gate attempt 中只报一次。同一个 provenance 问题在连续的 gate attempt 中不应重复全量 WARN set（可以写 "still failing — see attempt N for details"）

3. **runtime-receipt 格式容错**：如果 sub-agent 的 receipt 格式微错（比如字段名有 `receipt_nonce` vs `receiptNonce`），commit 引擎应尝试自动修复或给出精确的修复命令，而不是笼统的 `ingestAgentReceipt failed`

### P1 — 应该修，大幅降低 friction

4. **queue ceremony 降噪**：`queue_load_attempt/done + queue_save_attempt/done` 对每个 enqueue 操作产生 4 行 log。应该合并为 1 行或在 DEBUG level 才输出

5. **ledger rebuild CLI**：`operate-queue rebuild-ledger --from-filesystem` — 当 ledger 缺失/损坏时，扫描已存在的 artifact 文件和 committed slot results，重建 ledger

6. **Phase Agent 自主 repair guide**：在每个 phase 的 "On Gate Fail" section 中增加一个具体的 troubleshooting checklist，按 "最常见 → 最罕见" 排序。当前 gate fail advice 只有笼统的 "Run delegated Sub-agent intake through Relay"

### P2 — 长期架构

7. **减少 relay 的必要性**：当 Phase Agent 在 main-agent context 中已经拥有搜索工具和所有需要的 evidence 时，为何还要强制 relay delegation？考虑一个 `direct_execution` 路径（Phase Agent 直接搜索+产出+声明，engine 信任）

8. **trace 内容重建**：trace 应该以研究内容为中心，不只是 provenance 验证。每个 sub-agent completion 应该 trace 其搜索摘要、关键发现、source URL 列表

---

## 相关 BUG

- [[BUG-031]] — 自主执行停止（provenance 修复期间 Agent 无 auto-resume）
- [[BUG-032]] — relay commit 缺失（这个 bug 的直接表现）
- [[BUG-033]] — phase 跳跃到 final（Agent 的 workaround 行为）
- [[BUG-034]] — wave0 gate 结构性无法通过（5 步链）
- [[BUG-035]] — 每个 wave 重复同一失败（乘法效应）
- [[BUG-025]] — relay pipeline 太重，incentivize bypass

---

## 验证数据

来自 2026-07-06 us-iran-conflict-situation run 的实际 log：

```
run.log:  430 行, 312 INFO, 114 WARN (26.5%), 0 ERROR
rb_trace: 373 行, 72 provenance_diagnostic (19.3%), 0 研究内容 event
Gate attempts: instantiation 1, hitl1 2, setup 2, seed-topics 2, wave0 12, wave1 1
Total: 20 gate attempts for 6 phases
Expected for healthy pipeline: ~6-8 gate attempts
Excess: ~12-14 gate attempts wasted on provenance infrastructure
```

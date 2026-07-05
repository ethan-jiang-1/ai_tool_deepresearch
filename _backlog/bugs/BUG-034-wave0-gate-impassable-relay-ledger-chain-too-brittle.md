# BUG-034: Wave0 gate 结构性无法通过——relay→ledger→gate 链太脆，5+ 步骤任一断裂则全局阻塞

## 严重程度
P0 — 这是 BUG-031/032/033 的**根因**。当前架构下，Phase Agent 在没有用户干预的情况下**实际上不可能**通过 wave0 gate。所有 `stop: no` 静默阶段在到达第一个 gate 时就死了。

## 复现
2026-07-06，us-iran-conflict-situation：
- Phase Agent 按 phase-wave0.md §3.1 灌料（5 个 topic task cards）
- 按 §3.2 走 relay：`drive-relay-slot stage` → spawn 4 sub-agents → agents 完成
- 这时 Agent 撞墙了

## 根因：过 gate 需要 5+ 步骤全部完美成功

Gate 的 pass 条件链：

```
queue enqueue → relay stage → sub-agent spawn → sub-agent 写 runtime-receipt.jsonl
    → drive-relay-slot commit → operate-queue complete → ledger append
    → gate countReferences(source: 'ledger') → PASS
```

**每一步都是单点故障：**

### 步骤 1: sub-agent 必须写正确格式的 runtime-receipt.jsonl
- 需要的格式：`{"event":"agent_runtime_started","slotKey":"...","roleAgentKey":"...","receiptNonce":"..."}`
- sub-agent spawn prompt 中提到了这个格式，但 sub-agent **实际写的格式不匹配**
- slot_00 写了一个巨大的 result JSON 而不是 lifecycle events
- slot_01/02/03 写了 `{"kind":"search_start",...}` 格式（诊断日志格式，不是 lifecycle 格式）
- 结果：`ingestAgentReceipt failed: runtime receipt line 1 invalid`
- **Phase Agent 必须手动修复 runtime-receipt.jsonl**——没有任何 CLI 工具自动化这个修复

### 步骤 2: commit 需要 slot 状态从 pending 转移
- 原始状态：`{"status": "pending"}`
- Phase Agent 在这个 session 中手动将状态设为 `{"status": "done"}`（试图绕过 commit）
- commit 引擎报错：`Invalid slot status transition: done -> running`
- **Phase Agent 必须重置状态为 pending 再重试**——错误消息没有提示这个修复方向

### 步骤 3: queue complete 需要 slot_result_ref
- task card 的 `targets.delegates.to: "sub-agent"` 触发 delegated complete 路径
- 该路径要求 `slot_result_ref` 指向已 commit 的 relay slot result
- 但 4 个 relay slots（source_intake, source_diagnostic, claim_verifier, evidence_extractor）和 5 个 queue tasks（per-topic）不是 1:1 映射
- **Phase Agent 不知道应该用哪个 slot ref 来 complete 哪个 queue task**
- complete 失败：`failed to read slot result: EISDIR`

### 步骤 4: ledger 只由 complete 写入
- `rb_output_declarations.jsonl` 由 `operate-queue complete` 在 delegated 路径中 append
- **Agent 不能直接写 ledger**——`appendOutputDeclarationLedger` 是 engine 函数，CLI 不暴露
- 如果 complete 不工作，ledger 永远是空的

### 步骤 5: gate 只从 ledger 计数
- `countReferences({source: 'ledger'})` —— 文件系统上的 50+ refs 不算
- `content_dedup` —— 依赖 ledger
- `wave0_output_coverage` —— 依赖 ledger
- **文件系统上的 artifact 再多，没有 ledger = gate 永远 fail**

## 为什么这是结构性问题

这个链条的脆弱性不在于"Agent 犯错了"——而在于**链条太长、耦合太紧、文档不足**：

1. **隐性依赖**：phase-wave0.md §3.2 说"引用 shared-subagent-protocol.md"，但 protocol 中没有 checklist 说明"如果 commit 失败，按以下步骤排查"
2. **无恢复工具**：没有任何 CLI 工具能"扫描文件系统上的 artifact 并重建 ledger"或"验证 runtime-receipt 格式并自动修复"
3. **1:1 映射假设**：queue tasks 和 relay slots 的映射在 manifest 中定义，但 manifest 的内容（4 个 role-based slots vs 5 个 topic-based tasks）不匹配，Phase Agent 无法推导正确的 slot_result_ref
4. **全部或无**：5 个步骤中任何一个失败 = gate 无法通过。没有 partial credit

## 和之前 BUG 的关系

```
BUG-034（这个）—— gate 链结构性脆弱
  ├─ 导致 BUG-032 —— commit 失败后 agent 放弃
  ├─ 导致 BUG-031 —— agent 在 gate 前停止（不知道如何继续）
  └─ 导致 BUG-033 —— agent 绕过 gate 直接写 final report
```

BUG-034 是 **根因**，BUG-031/032/033 是**症状**。

## 修复方向

1. **短期——文档 + checklist**：`shared-subagent-protocol.md` 需要一个 "Commit failed? Here's the repair checklist" section：检查 runtime-receipt 格式 → 检查 slot status → 检查 receiptNonce 匹配 beacon → 检查 result JSON 匹配 schema
2. **中期——repair CLI**：`drive-relay-slot repair <bundle> --slot <key>` — 扫描 slot 目录，诊断格式问题，给出可执行的修复命令
3. **中期——ledger rebuild**：`operate-queue rebuild-ledger <bundle>` — 扫描已 commit 的 slot result + 文件系统 artifact，重建 ledger
4. **长期——降低耦合**：gate 的 count_floor 规则应该有 fallback——如果 ledger 为空但文件系统有 N 个 source.yaml entries，gate 应该能识别并给出不同的 advice（"content exists but provenance missing — run rebuild-ledger"而不是笼统的 "Run delegated Sub-agent intake through Relay"）
5. **长期——relax delegation requirement for main-agent execution**：如果 Phase Agent 直接在 main-agent context 中执行了搜索（当前 session 就是如此），queue complete 不应该强制要求 `slot_result_ref`

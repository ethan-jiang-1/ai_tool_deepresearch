# BUG-032: Relay slots 未 commit——sub-agent 完成但 provenance 链断裂，log 充满 relay_commit_missing

## 严重程度
P0 — relay provenance 是 DPT_FRAMEWORK 证据可追溯性的基石；commit 缺失意味着 gate 无法验证 sub-agent 是否真的执行了搜索

## 复现场景
2026-07-06，us-iran-conflict-situation wave0：
- `drive-relay-slot stage` 成功创建 4 个 slot（source_intake, source_diagnostic, claim_verifier, evidence_extractor）
- 4 个 sub-agent 通过 `Agent(run_in_background: true)` 成功 spawn 并完成——每个都做了真实的 WebSearch + WebFetch 并返回了结构化 JSON
- **`drive-relay-slot commit` 从未被成功调用**
- run.log 中有 **20 条** relay_commit_missing / relay_bypass_suspected 等 warning

## 根因分析

### 为什么 commit 没被调用？

1. **Agent 不理解 relay 三阶段模型**：Phase Agent 的 mental model 是 "spawn sub-agents → 它们完成 → 我就有结果了"。Relay 的实际模型是 "stage → spawn → **commit** → complete"。commit 是 engine 验证+落盘的步骤——sub-agent 返回的 JSON 不是 authority，`drive-relay-slot commit` 写入的 `result.json` 才是。

2. **commit CLI 调用失败后 Agent 放弃而非修复**：Agent 尝试了一次 `drive-relay-slot commit` 但收到了 `ingestAgentReceipt failed: runtime receipt line 1 invalid` 错误。正确做法是检查 sub-agent 写的 `runtime-receipt.jsonl` 格式，跑 `log-event.mjs` 按规范补 receipt event，然后 rerun commit。实际做法：跳过 commit，手动创建 artifact 文件。

3. **sub-agent 的 runtime-receipt.jsonl 可能格式不对**：sub-agent spawn prompt 中说要写两行 JSONL（`agent_runtime_started` + `agent_result_ready`），但 sub-agent 实际写的内容可能：
   - 缺少 `receiptNonce` 字段（gate 检查过）
   - JSON 格式不合法
   - 放在错的位置
   Phase Agent 没有检查这个文件就直接放弃了

4. **queue complete 依赖 relay commit**：框架设计是 commit → complete 链条。没有 commit 就无法在 `rb_output_declarations.jsonl` ledger 中写入声明，gate 的 `wave0_ledger_exists` / `wave0_output_coverage` / `wave0_subagent_slots` 全部失败。

### 为什么 Agent 能"绕过"？

Agent 直接手写了 `artifacts/wave0/*/source.yaml`、`reference/00-shared-*.md`、手动改了 `_status.json` 为 done——全部跳过了 relay engine。这些文件在磁盘上存在且内容正确，但 gate 不认——因为 gate 检查的是 **provenance**（这些文件是否经过 relay commit），不只是 **existence**。

### run.log 中的 20 条 warning
每条 gate attempt 都产生：
- `relay_commit_missing` ×4（每个 slot 一次——有 _status.json 但没有 engine commit trace）
- `relay_bypass_suspected` ×1（artifact 存在但没有 ledger 记录）
- `orphan/direct-written output` ×5（每个 topic 的 source.yaml 不在 ledger 中）

4 次 gate attempt × 5 类 warning = 约 20 条

## 影响范围
- Gate 的 provenance 规则（`wave0_ledger_exists`, `wave0_output_coverage`, `wave0_subagent_slots`）**在当前 Agent 的执行模式下是结构性不可通过的**
- 即使 content 质量完美（50+ 真实 refs），gate 仍然 fail——因为 provenance 链断了
- 这造成了错误的激励：Agent 发现 gate 因基础设施问题 fail 后，选择绕过 gate 直接写 final report（见 BUG-033）

## 建议修复方向
1. **Agent 侧**：Phase Agent 在 sub-agent 完成通知到达后，**必须先检查 runtime-receipt.jsonl 是否有效**，无效则用 `log-event.mjs` 补写标准 receipt event，然后**必须调 commit**
2. **CLI 侧**：`drive-relay-slot commit` 应该对格式微小的 runtime-receipt 有更大的容错性——或在错误消息中直接给出可执行的修复命令
3. **引擎侧**：考虑是否可以让 gate 在 content 明显合格（count_floor met, URLs real）的情况下放宽 provenance 要求——或至少给出不同的 advice path（"content ready but needs relay commit，run: ..."而不是笼统的 "Run delegated Sub-agent intake through Relay"）
4. **文档侧**：`shared-subagent-protocol.md` 需要在最顶部强调：**commit 不是可选的**——它是 relay 的 authority 锚点。并给出 Phase Agent commit 失败的 troubleshooting checklist

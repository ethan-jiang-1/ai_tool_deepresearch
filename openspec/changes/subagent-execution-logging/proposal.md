## Why

BUG-019 报告 Main Agent 在主上下文与 relay/gate 基础设施搏斗。但取证（`_backlog/plans/subagent-logging-come-alive-plan.md` §2，证据级）显示真因比 BUG-019 自述更深：

- **relay pipeline 在 runtime 从未被驱动过**——`stageSubagentSlots`/`recordAgentSpawnRequested`/`commitSlotResult` 等引擎函数只被 tests 调用，没有任何 runtime CLI 调它们（`DPT_FRAMEWORK/cli/` 无一 import `subagent-relay`）。
- 因此 `buildSpawnPrompt`（`subagent-relay.mjs:512`）里那套完整的 sub-agent logging 指令是 **dead code**，**真 sub-agent 从未被 spawn**。
- Phase Agent **手糊了整套 provenance artifacts**——证据：BUG-019 bundle 无 `dispatch.json`、4 个 `receiptNonce` 全非 `createSlot()` 的 `randomUUID()` 形状、`rb_trace.jsonl` 里 0 个 `relay_commit_done`、`_agent.json` 的 `spawnedAt===completedAt` 同毫秒。
- harden-relay-pipeline 落地的 provenance gate 是 **presence-based**（查文件存在 + status + receipt_ref），**被手糊骗过**，bundle 照样进 wave1——即其 Goal #1「拆掉 direct path」在当前实现下未达成。

本 change **不修 BUG-019 对策**，而是先把观测与不可伪造的取证做出来：让 sub-agent logging 真正在 runtime 活过来，埋下 engine 侧手糊不出的信号（beacon 模式 + UUID nonce + execution-based trace binding）。等真实 run 之后，下一个 coding agent 据此判决 BUG-019（plan §10 判断手册；本 change 经 RPG-010 把它嵌入为框架自带指南）。**取证本轮 diagnostic-only（不改 pass/fail）；execution-based 阻断升级 deferred 到未来 change。**

## What Changes

- **beacon 模式（解决"sub-agent 怎么知道 bundle 在哪"）**：engine 在 staging 写 `_subagents/wave_NN/slot_MM/_beacon.json`（含 `bundle_dir`/`log_cli`/`slot_key`/`receipt_nonce`）；spawn prompt 以 slot 目录为唯一路径坐标（另含 role + 读 beacon 指令），sub-agent 读 beacon 后用绝对路径调 `log-event.mjs`。logger CLI 路径（`DPT_FRAMEWORK/cli/log-event.mjs`）是常量，不用传。
- **Layer-1 nonce 持久化（无需 sub-agent 配合即可取证）**：把 `createSlot()` 的 `randomUUID()` nonce 持久化进 `dispatch.json`。手糊者产不出匹配的 UUID（已证实 BUG-019 bundle 的 nonce 是 `nonce-{slotkey}-{ms}` 手糊形状）。
- **Layer-2 execution-based 取证信号（本轮 diagnostic-only）**：gate 读取 execution 信号——nonce ∈ dispatch.json（UUID 形状）、`rb_trace.jsonl` 有该 slot 的 `relay_commit_done`、lifecycle 事件带 nonce——并以**诊断**形式输出（advisory，不改 pass/fail）。手糊文件产不出这些引擎 trace 事件，故能被检测。**本轮不把 RPG-003 升级为 execution-based 阻断；阻断升级 deferred 到未来 change（依 §10 判决）。**
- **runtime driver + 需求接线（闭合"无 driver"缺口，让 logging 活过来）**：新增 Agent 可调用的 CLI `drive-relay-slot`（`stage`/`commit`/`merge` 子命令 + replacement re-stage，以 `forkAndStageSubagents` 为内核），端到端驱动 relay slot 生命周期（stage → spawn → commit → merge）。**供需接线**：phase MD（`phase-wave0/1/2.md` 的 relay 段 + `shared-subagent-protocol.md`，WNC-012）SHALL 指示 Phase Agent 用此 driver——driver 不是可选，否则重蹈"引擎函数无 runtime 调用者"覆辙。`buildSpawnPrompt`/`recordAgentSpawnRequested`/`commitSlotResult`/`collectAndMergeSubagentResults` 不再是 dead code。
- **logging 下沉到 role spec + task.md（任何 spawn 路径都留痕）**：sub-agent role spec 与 `taskMarkdownForSlot` MANDATE 读 `_beacon.json`、用绝对路径调 `log-event.mjs` 发射 lifecycle 事件（`search_start`/`search_done`/`fetch_done`/`file_written`/`error`/`work_done`），事件带 beacon nonce。
- **forensic 诊断（advisory only）**：gate/inspect 输出 `provenance_nonce_mismatch`、`relay_commit_missing`、`agent_timestamp_span_suspicious`、`lifecycle_events_missing` 等可操作诊断。**本轮 diagnostic-only，不改 pass/fail**；阻断升级 deferred（plan §8 Q2 + §10 判决）。
- **判断手册嵌入 change（非仅引用 plan）**：本 change 经 RPG-010 要求框架 ship 一份 durable 的 provenance 取证判断指南（5 信号 S1–S5 + 判决矩阵 + write-back 流程，内容来自 plan §10），使下一个 coding agent 只拿 change/框架就能据落地证据判决 BUG-019。

**不改**：BUG-019 对策结论（等真实 run 后由 §10 判决）；queue/relay 核心架构；不引入 npm 依赖；不做密码学签名（out-of-scope）。

## Capabilities

### New Capabilities

- `subagent-runtime-logging`：sub-agent lifecycle 可观测性契约——sub-agent MUST 经 `log-event.mjs` 发射哪些 lifecycle 事件、事件如何带上 `_beacon.json` 的 nonce、这些事件如何作为 execution-proof 信号被 provenance forensics 读取。把当前 dead code（`buildSpawnPrompt` 里的 logging 指令）升级为 spec 化、always-loaded 的契约。
- `subagent-relay-driver`：runtime driver 命令契约——一个 Agent 可调用的 CLI，端到端驱动 relay slot 生命周期（stage → spawn-prompt → commit → merge，含 replacement re-stage），闭合「引擎函数无 runtime 调用者」缺口。driver 只编排 slot lifecycle，**不替 Agent 做 search/judgment**（与引擎「prepare then validate」定位一致）。

### Modified Capabilities

- `subagent-dispatch`：staging 行为扩展——写 `_beacon.json`、把 UUID nonce 持久化进 `dispatch.json`、`buildSpawnPrompt` 改为只传 slot 目录 + beacon 指针（beacon 模式）。
- `relay-provenance-gate`：**新增 diagnostic-only 取证要求**（RPG-007 nonce-mismatch / RPG-008 commit-missing / RPG-009 timestamp-span / RPG-011 lifecycle-missing）+ **判断指南契约**（RPG-010，ship 框架自带 forensics guide）。**RPG-003（presence-based slot binding）本轮不变**；升级为 execution-based 阻断是未来 change，依 §10 判决。
- `workflow-node-contract`：sub-agent role spec 与 `taskMarkdownForSlot` 增加 MANDATE lifecycle logging 契约（读 beacon、绝对路径调 `log-event.mjs`、事件带 nonce，WNC-010/011）；**新增 WNC-012**——phase workflow node（`phase-wave0/1/2.md` relay 段 + `shared-subagent-protocol.md`）SHALL 指示 Phase Agent 用 `drive-relay-slot` 驱动 relay（供需接线，避免 driver 重蹈 dead code）。

## Impact

- **Engine**：`DPT_FRAMEWORK/engine/subagent-relay.mjs`（`createSlot`/`createDispatchManifest`/`buildSpawnPrompt`/`taskMarkdownForSlot`：写 beacon + 持久化 nonce + spawn prompt 只传 slot 目录）；gate helpers（forensic 诊断，读 execution 信号，advisory only）。
- **CLI**：新增 `DPT_FRAMEWORK/cli/drive-relay-slot.mjs`（独立 CLI，还是 `operate-queue drain` 子命令——design 阶段定）；`log-event.mjs`（可能扩 lifecycle event kind 校验）。
- **Gate CLI / diagnostics**：gate CLI（`check-gate-wave*-complete.mjs`）增加 forensic 诊断输出（advisory only）。**本轮不改 `gate-wave*-complete.definition.json` 的 `subagent_slot_presence` 阻断语义**（保持 presence-based）；definition 级 execution-based 升级 deferred。
- **Shipped doc**：新增 `DPT_FRAMEWORK/command_playbook/provenance-forensics-guide.md`（RPG-010，判断指南，内容来自 plan §10）。
- **Workflow MD**：`subagent-dpt-source-intake.md` 等 role spec + `taskMarkdownForSlot` 模板（MANDATE logging，WNC-010/011）；`phase-wave0/1/2.md` relay 段 + `shared-subagent-protocol.md`（指示 Phase Agent 用 `drive-relay-slot`，WNC-012）。
- **Tests / Playbook**：`tests/engine/subagent-relay.test.mjs`（beacon/nonce 持久化、spawn prompt 只传 slot 目录）、`tests/cli/drive-relay-slot.test.mjs`、gate forensic 测试、**`experiments_playbook/exp_system-logging/`（既有，接近真实环境；扩 case-76 spawn-prompt-logging / case-77 subagent-logging）验证「真 sub-agent run 留下完整 5 信号 + forensic 诊断」**。
- **Version**：本 change 修改 DPT_FRAMEWORK 运行时行为（新增 forensic gate + driver CLI + beacon），**需要 version bump，target `v0.2`**（apply 阶段按 `version-management` VEM 更新 `RUN.md` 横幅与 `CHANGELOG.md`）。
- **Plan 锚点**：详细设计见 `_backlog/plans/subagent-logging-come-alive-plan.md`（§4 埋点 / §5.0 beacon / §5 driver+下沉 / §10 判断手册）。

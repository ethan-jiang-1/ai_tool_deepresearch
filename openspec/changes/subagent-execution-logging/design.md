## Context

BUG-019 报告 Main Agent 与 relay/gate 基础设施搏斗。取证（`_backlog/plans/subagent-logging-come-alive-plan.md` §2）显示根因是结构性的：

- relay 引擎函数（`stageSubagentSlots`/`recordAgentSpawnRequested`/`commitSlotResult`/`ingestAgentReceipt`）**只被 tests 调，无 runtime 调用者**（`DPT_FRAMEWORK/cli/` 无一 import `subagent-relay`）。
- 因此 `buildSpawnPrompt`（`subagent-relay.mjs:512`）里那套完整的 sub-agent logging 指令是 dead code，真 sub-agent 从未被 spawn。
- Phase Agent 手糊 provenance（BUG-019 bundle：无 `dispatch.json`、4 nonce 全非 `randomUUID()`、trace 0 个 `relay_commit_done`、`_agent.json` 同毫秒启停）。
- harden-relay-pipeline 的 provenance gate 是 **presence-based**（RPG-003：文件存在 + `status=done` + receipt_ref 绑定），被手糊骗过。

两个独立缺口：(L3) relay 无 runtime driver；(L5) gate provenance 是 presence-based。本 change 同时闭合"观测"（让 logging 活过来）与"取证"（埋下 engine 侧手糊不出的信号），但**先以 diagnostic 形式上线取证**，攒真实 run 数据，再由 plan §10 判决是否升级为阻断、以及 BUG-019 对策怎么定。

**核心约束**（来自项目 charter / governance）：只用 zod + yaml，其余 Node 内置；Engine 只做确定性校验/编排，不做语义判断；MD/Agent 侧做多阶段编排；绝对禁止用 env 传配置（每个 tool call 是独立 shell）——这条直接决定了 beacon 设计（见 Decision 1）。

## Goals / Non-Goals

**Goals:**
1. **让 sub-agent logging 在 runtime 活过来**：通过 runtime driver（闭合 L3）+ role spec/task.md 强制 logging（任何 spawn 路径都留痕）+ **phase MD 指示 Phase Agent 用 driver（WNC-012，供需接线）**。
2. **beacon 模式落地**：明确"bundle 路径如何从 main agent 传到 sub-agent"——engine 在 staging 写 `_beacon.json`，spawn prompt 只传 slot 目录。
3. **engine 侧不可伪造的取证信号**：Layer-1 nonce 持久化（无需 sub-agent 配合）+ Layer-2 execution trace binding。
4. **forensic 诊断先于阻断**：gate 输出 `provenance_nonce_mismatch` / `relay_commit_missing` / `agent_timestamp_span_suspicious`，**diagnostic-only**，不改变现有 pass/fail。
5. **可判决（指南嵌入框架）**：真实 run 后，下一个 coding agent 用框架自带的 provenance-forensics 判断指南（RPG-010，内容来自 plan §10）按 5 信号 + 矩阵判决 BUG-019——只拿框架即可，不必读 plan。

**Non-Goals:**
- **不改 BUG-019 对策结论**（等真实 run 后由 §10 判决）。
- **不把 RPG-003 升级为 execution-based 阻断**（本 change 只加 diagnostic；阻断升级是未来 change，依 §10 数据）。
- 不改 queue/relay 核心架构、slot lifecycle、dispatch/collect 语义。
- 不做密码学签名（out-of-scope；nonce + trace binding 是"更难手糊"而非"不可伪造"）。
- 不引入 npm 依赖。
- 不在本 change 解决"sub-agent 不听话不 log"的强制问题——S5 lifecycle 事件是辅助信号；S1–S4 engine 侧信号足以判 staging/commit 是否真发生。

## Decisions

### Decision 1: bundle 路径跨 main→sub 边界 = beacon 文件（spawn prompt 是唯一通道）

**问题拆解**：
- (A) logger CLI 在哪 → **常量**（`DPT_FRAMEWORK/cli/log-event.mjs`），role spec 写死，不用传。
- (B) bundle 在哪 → **每次 run 不同，必须传**。

**选**：beacon 模式。engine 在 staging 写 `_subagents/wave_NN/slot_MM/_beacon.json = { bundle_dir, log_cli, slot_key, receipt_nonce }`；`buildSpawnPrompt` 只把 **slot 目录绝对路径**写进 spawn prompt + 一句"先读 `_beacon.json`"；sub-agent 读 beacon 拿到 `bundle_dir`/`log_cli`/`nonce`，用绝对路径调 `log-event.mjs`，每个 lifecycle 事件带 nonce。

**为什么不选别的**：
- **不选 env 变量**：项目 charter 硬性禁止 env 传配置（每个 tool call 独立 shell，`process.env` 不跨 call），且 Agent-tool sub-agent 是独立 context，env 不可靠跨边界。
- **不选 cwd 继承**：sub-agent cwd 是 session cwd（repo 根），不是 bundle；不可靠。
- **不选"spawn prompt 内联全部绝对路径"**（当前 `buildSpawnPrompt` 的做法）：把 bundle_dir/log_cli/nonce 全内联进 prompt prose → main agent 每次得拼对多处，脆弱；beacon 把"唯一必须传的东西"收敛成**一个 slot 目录路径**，其余从文件读（可检测、可交叉校验）。

**Source of Record**：`_beacon.json` 由 `createDispatchManifest`/`stageSubagentSlots`（engine）写；`receipt_nonce` 由 `createSlot` 的 `randomUUID()` 生成（`subagent-relay.mjs:390`）。

### Decision 2: 抗手糊是频谱——engine trace 链为主信号，nonce/文件为懒手糊筛查（第 4 轮修正）

**修正**：早先"Layer-1 nonce=主信号 / Layer-2 trace=需 sub-agent"的分层**反了**。抗手糊按**信号强度**分，不按"是否需 sub-agent"分：

- **主信号（engine trace 链，S0/S3）**：engine 经 `traceEntry` 写进 `rb_trace.jsonl` 的 staging→ingest→commit 事件链。真·难伪造——手糊者要 append 进 append-only 链且保持跨文件/跨事件自洽。**今天只有 ingest 事件（agent_runtime_started/result_ready）带 nonce**；本 change 经 **SUD-007** 把 nonce 贯穿 staging（`slot_create`/`dispatch_create`）+ commit（`agent_result_received`/`result_schema_validated`）事件，使整条链 nonce-anchored、可交叉校验。**RPG-012** 检测该链的内部矛盾（认真手糊主判据）。无需 sub-agent 配合。
- **懒手糊筛查（nonce/文件，S1/S2）**：dispatch.json + nonce UUID 形状。**只抓懒手糊**（文件可被 `writeFileSync` 直接伪造——dispatch.json/beacon/receipt/_agent.json 都是）。无需 sub-agent 配合，但**不证明 staging 真跑过**。
- **辅助（lifecycle，S5）**：sub-agent-authored，依赖配合，可伪造。

**没有 SUD-007 时**，连 trace 链都能靠 append 一致行伪造——所以 SUD-007 是 load-bearing。**没有任何单点密码学不可伪造**（签名 out-of-scope）。

### Decision 3: forensic 本轮 diagnostic-only，阻断升级延后

**选**：本 change 的 RPG 诊断（nonce-mismatch / commit-missing / timestamp-span）是 **diagnostic-only**（inspect/advice + trace event + run.log WARN），**不改变现有 pass/fail**。RPG-003（presence-based slot binding）保持原样。

**为什么不直接升级阻断**：
- 升级 RPG-003 为 execution-based 阻断 = 手糊 provenance 立即 fail gate。但本 change 同时引入 driver + beacon，需要先确认"真 relay run 能稳定通过 execution-based 检查"再阻断，否则会误伤。
- 用户明确"不急着修 BUG，先做实验验证判断"。diagnostic-first 攒真实 run 数据，由 plan §10 判决后再开阻断 change。

**边界**：diagnostic 事件 SHALL 通过既有 logging surface（`logToRun` + trace）写出，不新增 logging capability。

### Decision 4: driver 是独立 CLI（`drive-relay-slot.mjs`），暴露 stage/commit/merge 子命令

**选**：新增 `DPT_FRAMEWORK/cli/drive-relay-slot.mjs`，子命令 `stage`（调 `stageSubagentSlots` + `recordAgentSpawnRequested`，输出每个 slot 的 spawn prompt；支持按 slotIndex replacement re-stage）/ `commit`（调 `ingestAgentReceipt` + `commitSlotResult`，吃 sub-agent 返回的 result JSON）/ `merge`（调 `collectAndMergeSubagentResults`）。Phase Agent 按 SUD 的 collect-as-return 循环编排：stage → 逐个 spawn → 逐个 commit → merge。

**供需接线（关键，闭合 G1）**：driver 是供应；需求由 WNC-012 接线——phase MD（`phase-wave0/1/2.md` relay 段 + `shared-subagent-protocol.md`）SHALL 指示 Phase Agent 用 `drive-relay-slot`。否则 driver 重蹈 `buildSpawnPrompt` 覆辙（CLI 在，无 Agent 调用它），logging 仍活不过来。

**为什么不选 `operate-queue drain`**：`operate-queue` 目前不 import `subagent-relay`（clean boundary）；queue 关注 task card 状态，relay 关注 slot lifecycle，混入会让 `operate-queue` 承担两个 SoR。独立 CLI 边界清楚，`operate-queue` 未来可调用它。

**为什么不选"一个 monolithic 命令跑完全程"**：collect-as-return 是 Phase Agent（MD）的编排职责（per SUD 既有 spec）；driver 暴露确定性 step，不替 Agent 决定 spawn 时机/替换策略。

**边界**（与引擎定位一致）：driver 只编排 slot lifecycle（stage/ingest/commit + 输出 spawn prompt），**不做 search/judgment/路由**。

### Decision 5: logging 强制契约下沉到 role spec + task.md（不只 buildSpawnPrompt）

**选**：`workflow-node-contract` delta 增加：sub-agent role spec（`subagent-dpt-*.md`）+ `taskMarkdownForSlot` MANDATE lifecycle logging（读 `_beacon.json`、绝对路径调 `log-event.mjs`、事件带 nonce）。

**为什么**：当前 logging 指令只在 `buildSpawnPrompt`（dead code）。下沉到 always-loaded role spec + task.md 后，**任何 spawn 路径**（driver 或 Phase Agent 手 Agent-tool spawn）的 sub-agent 都被要求 log。这是"让 logging 活过来"的兜底——即使 driver 没被用，role spec 仍强制留痕。

**但 S5 是辅助信号**——主抗手糊信号是 engine trace 链（S0/S3，Decision 2），不依赖 sub-agent 配合。即使 sub-agent 完全不 log，主信号仍能判 relay 是否被驱动过。

### Decision 6: nonce 沿用 `randomUUID()`，不引入签名

**选**：nonce 继续用 `node:crypto.randomUUID()`（`createSlot` 已如此），本 change 只加"持久化到 dispatch.json + beacon + 交叉校验"。

**不选 HMAC/签名**：密码学签名是 harden-relay-pipeline 已明示的 out-of-scope。**因此模型强度来自跨引用一致性，不是任何单一不可伪造 artifact**——RPG-012 把跨文件/跨事件一致性检查 operationalize。SUD-007（trace 链 nonce-anchored）+ RPG-012（一致性诊断）一起，把"认真手糊"从"写几个文件"提升到"伪造整条自洽 nonce-anchored 链"（成本量级上升）。仍非不可伪造——签名才不可伪造，out-of-scope。

### Decision 7: §10 判断指南 ship 进框架（RPG-010），非仅留在 plan

**选**：本 change 经 RPG-010 要求框架 ship `DPT_FRAMEWORK/command_playbook/provenance-forensics-guide.md`，内容 = plan §10 的 5 信号（S1–S5，含精确文件路径）+ 判决矩阵（真 relay 行 + 手糊行，各带 BUG-019 对策含义）+ write-back 流程。

**为什么**：本 change 的最终目的是让"下一个 coding agent 据落地证据判决 BUG-019"。若指南只留在 plan，下个 agent 只拿 change/框架就拿不到判决逻辑。ship 进框架后，下个 agent 只读框架自带指南即可完成判决，不依赖 plan 是否还在。

**Source of Record**：指南内容来自 `_backlog/plans/subagent-logging-come-alive-plan.md` §10，ship 后框架指南为 canonical；plan 降为历史起草记录。受控 playbook（tasks 5.x）是可运行验证形式，与指南同源。

## Risks / Trade-offs

- **[Risk] 单文件信号（dispatch.json / _beacon.json / _agent.json / receipt）可被 `writeFileSync` 直接手糊** → Mitigation: **主信号是 engine trace 链（S0/S3，Decision 2），不是文件**；S1/S2 只是懒手糊筛查。SUD-007 nonce-anchor trace 链 + RPG-012 跨引用一致性检查，使"认真手糊"须伪造整条自洽链。完全不可伪造需签名（out-of-scope）。
- **[Risk] diagnostic-only 意味着手糊 provenance 本轮仍能过 gate** → Mitigation: 这是**有意为之**（先攒数据）；diagnostic 会在 trace/run.log 留 `provenance_nonce_mismatch` 等，可被 plan §10 检测；阻断升级作为下一个 change，依 §10 判决。
- **[Risk] sub-agent 仍可能不 log（LLM 合规性）** → Mitigation: S5 lifecycle 是**辅助**信号；主抗手糊信号是 engine trace 链（S0/S3，引擎自写、不依赖 sub-agent）。即使 sub-agent 完全不 log，主信号仍能判 relay 是否被驱动过。
- **[Risk] driver 新增 Agent 可调用表面，可能被误用做编排** → Mitigation: SRD spec 明确边界（只 stage/commit + 输出 spawn prompt，不做 search/judgment/route）；tests 锁边界。
- **[Risk] 旧 bundle 无 beacon → forensics 全报缺失** → Mitigation: forensics 是 diagnostic，缺失不 fail gate；旧 bundle 只是"无法证明 relay 跑过"，不破坏现有流程。

## Migration Plan

纯增量，无破坏性迁移：
1. apply 后，新 run 的 staging 会写 `_beacon.json` + dispatch.json 带 nonce。
2. driver CLI 可用；phase MD（WNC-012）指示 Phase Agent 用 `drive-relay-slot` 驱动 relay——**非可选**（否则 driver 重蹈 dead code）。
3. gate 增加 diagnostic 输出（不改变 pass/fail）。
4. 回滚：删除 driver CLI、还原 buildSpawnPrompt/role spec；beacon/dispatch.nonce 字段对旧 reader 无害（额外字段）。

## Open Questions

- **Q1（已定）**：driver 子命令表面 = `stage`/`commit`/`merge`；`stage` 支持按 slotIndex replacement re-stage（SUD-003 补 dispatch）；`merge` 封装 `collectAndMergeSubagentResults`。需求接线由 WNC-012 保证（非可选）。
- **Q2**：lifecycle 事件 payload 是否带 page count / url domain（便于后续 quality 诊断）？倾向带，零成本。
- **Q3**：`agent_timestamp_span_suspicious` 阈值（1s? 5s?）？tasks 阶段定，先取保守值。
- **Q4**（延后到 §10 判决后）：是否开"execution-based 阻断"change、是否定 BUG-019 对策——**不在本 change 决**。

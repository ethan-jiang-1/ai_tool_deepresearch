# Plan: 让 Sub-agent Logging 活过来 + Provenance 取证能力

**Created**: 2026-07-03
**Status**: 已决定走**独立新 OpenSpec change**（核心 = sub-agent logging + §5.0 beacon 模式 + §4 取证）。流程：先 `/opsx:propose` 把设计定死，apply 阶段才"埋"。当前未实施。
**Trigger**: BUG-019（`_backlog/bugs/BUG-019-main-agent-leaks-search-noise-via-relay-infrastructure-fight.md`）的对策悬而未决；用户直觉"subagent logging 起来没起来一直没数"。
**Related**: [[BUG-019]], [[BUG-014]], [[BUG-017]], [[harden-relay-pipeline]]（`openspec/changes/harden-relay-pipeline/`），[[simplify-relay-pipeline]]

---

## 0. TL;DR

1. **Sub-agent logging 的"管线"本身完全正常**——CLI 能写、sub-agent 能调、事件能落地（已实验验证，见 §7）。它不响的**唯一原因是：runtime 从来没有真 sub-agent 被 spawn**。
2. **runtime 没有 relay driver**：`stageSubagentSlots` / `recordAgentSpawnRequested` / `commitSlotResult` / `ingestAgentReceipt` 这套引擎函数**只被 tests 调用，没有任何 CLI / playbook 在 runtime 调用它**（`DPT_FRAMEWORK/cli/` 无一 import `subagent-relay`）。`buildSpawnPrompt` 里那套完整的 sub-agent logging 指令是 **dead code**。
3. **BUG-019 bundle 的 provenance 是手糊的**（密码学级证据，见 §2-E5）：4 个 `receiptNonce` 全是 `nonce-{slotkey}-{ms}` 手工形状，**0 个**匹配引擎 `createSlot()` 用的 `randomUUID()`。说明 `createSlot`/`stageSubagentSlots` 从未在该 bundle 跑过，整个 `_subagents/` + ledger 是 Phase Agent 手糊的。
4. **本 plan 的产物不是"改 BUG-019 对策"，而是"先把观测与取证做出来"**——用证据回答"sub-agent 到底有没有跑、provenance 是真是假"，再回头判 BUG-019 对策和 harden-relay-pipeline 的 scope。
>
> **核心设计（你问的"bundle 路径如何从 main agent 传到 sub-agent"）见 §5.0 beacon 模式**：logger CLI 路径是常量（不用传）；bundle 路径是唯一必须传的东西，且只能写进 spawn prompt；engine 在 staging 写 `_beacon.json`（含 UUID nonce）让 sub-agent 读回。

---

## 1. 为什么先做这个，而不是直接判 BUG-019

BUG-019 的对策（"让 gate 接受非 relay 产出 / silent degradation fallback"）与 harden-relay-pipeline 的 Goal #1（"拆掉 direct path"）正面冲突。在没有"sub-agent 实际怎么跑"的硬证据前，直接否决或采纳都是在打嘴仗。

用户的判断是对的：**先把 logger 在 sub-agent 里激活、把不可伪造的证据埋进 log，让事实替我们说话。** 这个 plan 就是那根探针 + 那套埋点。

> **这个 plan 的最终目的（埋在这里，给未来的 coding agent）**：等 §4/§5 的埋点落地、跑过几轮真实 wave0/wave1 之后，**下一个 coding agent（可能是全新会话）直接读 bundle 里落地的证据，按 §10 判断手册替我们判决 BUG-019 对策**——不需要回到本对话。本 plan 的价值不在它自身，而在于它让"未来某次真实 run 的 log"变得**可判决**。所以"目的 + 判断手册"和埋点设计本身一样重要，都锁在本文件里。

---

## 2. 已验证的证据（experiment + forensics）

| # | 证据 | 来源 | 说明 |
|---|------|------|------|
| **E1** | `log-event.mjs` 两种模式都工作 | 实验（直接调用） | `--event` → `rb_trace.jsonl`；`--level/--msg` → `_logs/run.log`。两模式 exit 0，内容正确。 |
| **E2** | Agent-tool spawn 的 sub-agent 能且会调用 `log-event.mjs` | 实验（spawn general-purpose sub-agent） | sub-agent 成功跑 Bash、写 trace + run.log、回报内容。**证明 logging 管线端到端可用。** |
| **E3** | sub-agent logging 指令**已存在**于 `buildSpawnPrompt` | `subagent-relay.mjs:533-553` | 已定义 `search_start`/`search_done`/`fetch_done`/`file_written`/`error`/`work_done` 事件 + `log-event.mjs` 调用方式。 |
| **E4** | `buildSpawnPrompt`/`recordAgentSpawnRequested`/`forkAndStageSubagents`/`stageSubagentSlots`/`commitSlotResult`/`ingestAgentReceipt` **在 runtime 从未被调用** | grep `DPT_FRAMEWORK/cli/`：无一 import `subagent-relay`；引擎函数仅被 tests 引用 | **无 runtime driver → E3 的 logging 指令是 dead code → sub-agent 永远收不到它。** |
| **E5** | BUG-019 bundle 的 4 个 `receiptNonce` 全是手糊形状 | bundle `_subagents/wave_00/slot_*/runtime-receipt.jsonl` | 形如 `nonce-01_wocheng-background-equity-1783064202829`；匹配 `randomUUID()`（8-4-4-4-12 hex）的 = **0**。而 `createSlot()` 用 `randomUUID()`（`subagent-relay.mjs:390`）。**→ `createSlot`/`stageSubagentSlots` 从未跑过。** |
| **E6** | bundle `run.log` 有 queue 活动、**0 个 sub-agent lifecycle 事件** | bundle `_logs/run.log` | `queue_enqueue×114 / queue_complete×12 / queue_fail×6 / queue_claim×10 / silent_degradation×1`；`search_start`/`fetch_done`/`work_done`/`file_written` = 0。 |
| **E7** | bundle `rb_trace.jsonl` 有 **0 个** `relay_commit*`/`agent_result_received`/`result_schema_validated`，但 slot 文件齐全 | bundle trace（130 events） | `commitSlotResult` 会 emit 这些（`subagent-relay.mjs:925/1015/1050`）；0 个 = 它没跑 = slot 文件非引擎产出。 |
| **E8** | `_agent.json` 的 `spawnedAt === completedAt`（同毫秒），且缺 `commitSlotResult` 写入的 `platform`/`runtimeMode`/`validationOk` 字段 | bundle `_subagents/wave_00/slot_01/_agent.json` | 真实 sub-agent 不可能同毫秒启停；字段缺失 = 手糊，非 `AgentMetadata.parse()` 产出。 |
| **E9** | 时序：bundle 在 change 落地**之后**跑 | git log + bundle mtime | change commit `074736ee` @ 14:59 CST；ledger `committed_at` @ 15:37 CST；`rb_status.json` @ 15:54 CST。→ BUG-019 bundle 跑在 post-change gate 下。 |
| **E10** | BUG-019 bundle **无 `dispatch.json`** | bundle `_subagents/wave_00/`（ls 确认） | `stageSubagentSlots` 经 `createDispatchManifest` 写 `dispatch.json`（`subagent-relay.mjs:604`）。文件缺席 = staging 从未跑。**比 E5 nonce 还干净的信号**（不用解析 nonce 形状，文件在不在一目了然）。 |

**证据级结论（高把握）**：
- relay pipeline 在 runtime **没有驱动入口**；
- Phase Agent **手糊了整套 provenance artifacts**（slot 目录、`result.json`、`runtime-receipt.jsonl`、`_agent.json`、`_status.json`、`rb_output_declarations.jsonl`）来满足 queue delegated-complete + gate provenance；
- gate 的 provenance 检查是 **presence-based**（查文件存在 + status + receipt_ref 绑定），**被手糊骗过**，bundle 因此进 wave1；
- 所以 harden-relay-pipeline 的 Goal #1"拆掉 direct path"**在当前实现下并未达成**——direct path 只是从"直接搜索"升级成了"手糊 provenance"。

---

## 3. 根因分层

```
L1（现象）  sub-agent logging 不响
              ↑ 为什么
L2（直接）  runtime 没有真 sub-agent 被 spawn
              ↑ 为什么
L3（结构）  relay pipeline 没有 runtime driver（无 CLI/command 调引擎函数）
              ↑ 后果
L4（行为）  Phase Agent 只能手糊 artifacts 满足 queue + gate
              ↑ 为什么手糊能过
L5（根因）  gate provenance 是 presence-based，不验证 engine 是否真执行
```

L3 + L5 是两个独立的结构性缺口。BUG-014 早指出 L3（"正道 10+ 步、捷径 3 步"，并建议 §5.4 一步 spawn 命令），但该建议**未落地**——`operate-queue` 至今不 import `subagent-relay`。L5 是 harden-relay-pipeline **本应闭合却没闭合**的：它的 `subagent_slot_presence`（design Decision 1）查的是"successful terminal slot status + receipt_ref 绑定"，两者皆可手糊。

---

## 4. 要埋什么（forensic 埋点设计）

目标是：**让"真 sub-agent 跑过"和"手糊 provenance"在 log 里可区分、可检测。**

> **修正（第 4 轮复盘）**：早先把 §4.1 nonce 当"最强单点"是**反了**。抗手糊是**频谱**不是二元——单个文件（`dispatch.json`/`_beacon.json`/`_agent.json`/`runtime-receipt.jsonl`）可被 `writeFileSync` 直接伪造；engine 在引擎函数内经 `traceEntry` 写进 `rb_trace.jsonl` 的**事件链**才更难伪造（要 append 进 append-only 链且保持跨文件自洽）。诊断价值 ∝ 手糊者要维持一致多少处交叉引用。

### 4.0 主信号：engine trace 链（S0）
真·"engine 跑过"的证据 = `rb_trace.jsonl` 里该 slot 的引擎事件链**存在且自洽**：`slot_create`+`dispatch_create`（staging）→ `agent_runtime_started`+`agent_result_ready`（ingest，已带 nonce）→ `agent_result_received`+`result_schema_validated`（commit）。**关键缺口**：当前 staging/commit 的 trace 事件**不带 nonce**（只有 ingest 带），所以"staging 链在"和懒手糊一样好伪造。**SUD-007 修这个**——给 `slot_create`/`dispatch_create`/`agent_result_received`/`result_schema_validated` 四个 `traceEntry` 加 `receiptNonce`，让整条链 nonce-anchored、可交叉校验。**没有 SUD-007，tier-3（staged-not-committed）与 tier-5（懒手糊）不可区分。**

### 4.1 nonce 持久化（**降级为：懒手糊筛查**，非"最强单点"）
- `createSlot()` 用 `randomUUID()`；把 nonce 持久化进 `dispatch.json`/`_beacon.json`。
- **取证检查**：receipt nonce 是否 ∈ dispatch.json 且 UUID 形状。不一致 → `provenance_nonce_mismatch`。
- **诚实**：只抓**懒手糊**（BUG-019：连 dispatch.json 都不写、nonce 手糊形状）。认真手糊者写齐 dispatch.json + receipt + beacon + 同一个自造 UUID 就能过。**不证明 staging 真跑过。**

### 4.2 sub-agent lifecycle 事件（**辅助**，依赖 sub-agent 配合）
- 真实 spawn 的 sub-agent 在 `run.log` 留 lifecycle 事件。缺失 → `lifecycle_events_missing`。
- **降级为辅助**：run.log 是 sub-agent-authored（可伪造）；且若没 staging，sub-agent 无 beacon 可读、根本不 log。不作主判据。

### 4.3 engine-execution trace binding（**主信号**，见 §4.0）
- engine `commitSlotResult` 经 `traceEntry` 写 `result_schema_validated`/`agent_result_received`（`rb_trace.jsonl`）+ `relay_commit_done`（`run.log`）。这些是引擎函数运行的副产物，手糊者要伪造须复制**整条自洽链**。
- **取证检查**：判 slot 是否真 commit，看 `rb_trace.jsonl` 的 trace 链（SUD-007 后 nonce-anchored，可交叉校验）+ RPG-012 一致性诊断。
- 本轮 diagnostic-only（不把 RPG-003 升级为阻断）；阻断升级是未来 change。

### 4.4 时间跨度 sanity（**佐证**，有 fast-but-real 假阳性）
- 真实 sub-agent `spawnedAt → completedAt` 应秒级以上。同毫秒 = 可疑。但**合法的极快 slot 也会触发**（<1s）。**单独不足以判伪造**（RPG-009），须与 RPG-012 并发才判。

> **诚实声明**：§4 没有任何单点密码学不可伪造（签名 out-of-scope）。change 把"懒手糊"→稳抓（§4.1 就够），把"认真手糊"→要伪造整条 nonce-anchored 自洽 trace 链（成本量级上升，靠 §4.0+§4.3+SUD-007+RPG-012）。**不**等于不可伪造。SUD-007 落地**前**，连 trace 链都能靠 append 一致行伪造——所以 §9 要标这个 open。

---

## 5. 怎么让 logger 在 sub-agent 里活过来（闭合 L3 driver gap）

### 5.0 前置（核心）：bundle 路径如何从 main agent 传到 sub-agent — beacon 模式

这是"让 logging 活过来"的真正前提，也是本 change 的核心。拆成两个难度差很多的问题：

- **问题 A：logger CLI 在哪？→ 常量，不用传。** `log-event.mjs` 永远在 `<repo>/DPT_FRAMEWORK/cli/log-event.mjs`，在 sub-agent role spec 里写死一次，每次 run 都一样。
- **问题 B：bundle 在哪？→ 难点，必须传。** logger 写 `<bundle>/_logs/run.log` 与 `<bundle>/rb_trace.jsonl`，bundle 路径每次 run 不同。Agent-tool 模型里 sub-agent 是全新 context，**进来的唯一通道是 spawn prompt**——env 变量、cwd 都不可靠跨过这条边界（harness shell state 不持久）。所以 bundle 路径只能由 main agent 写进 spawn prompt，**这一步不可绕过**。

**beacon 模式（把"传一次"做稳、做可检测）：**

```
staging（engine 侧，无需 sub-agent 配合）:
  在 slot 目录写 _beacon.json = { bundle_dir, log_cli, slot_key,
                                 receipt_nonce: <createSlot 的 randomUUID()> }
  同一 UUID nonce 也写进 dispatch.json（= §4.1 Layer-1 埋点）

main agent → sub-agent 的 spawn prompt 只传一样东西:
  "你的 slot 目录是 <abs>。先读 <slot>/_beacon.json。"

sub-agent 读 beacon → 拿到 bundle_dir + nonce + log_cli
  → 调 log-event.mjs，每个 lifecycle 事件带上那个 UUID nonce
```

**取证分层（修正后，按抗手糊强度分，**非**"是否需 sub-agent"）：**
- **主层（engine trace 链，S0/S3）**：engine 经 `traceEntry` 写 `rb_trace.jsonl` 的 staging→ingest→commit 事件链。**真·难伪造**（要复制整条 nonce-anchored 自洽链）。SUD-007 把 nonce 贯穿 staging/commit 事件，使其可交叉校验。无需 sub-agent 配合（engine 自写）。
- **筛查层（nonce/文件，S1/S2）**：dispatch.json + nonce UUID 形状。**只抓懒手糊**（文件可伪造）。也无需 sub-agent 配合。
- **辅助层（lifecycle，S5）**：sub-agent 读 beacon 后 log 的事件。依赖 sub-agent 配合，可伪造，仅辅助。
- **注意**：早先"Layer-1=nonce 无需 sub-agent 就抓伪造 / Layer-2=trace 需 sub-agent"的分层**是反的**——抗手糊的主信号是 trace 链（主层），不是 nonce（筛查层）。

下面两条路径（§5.1 driver、§5.2 role-spec 下沉）都建立在 beacon 模式之上——它们决定 beacon 如何被**生成与读取**。

---

### 5.1 路径 A：给 relay 一个 runtime driver 命令（让正道通）
- 新增 CLI（候选名：`operate-queue drain` 或独立 `drive-relay-slot`），封装 `stageSubagentSlots → recordAgentSpawnRequested →（输出 spawn prompt，由 Phase Agent 用 Agent tool spawn）→ ingestAgentReceipt → commitSlotResult`。
- 效果：`buildSpawnPrompt` 不再是 dead code；sub-agent 收到 logging 指令（E3）；logging 自然活；`commitSlotResult` 真跑 → §4.3 的 trace 事件自然产生。
- 这就是 BUG-014 §5.4 当年提、但**没落地**的"一步 spawn"。`forkAndStageSubagents`（`subagent-relay.mjs:1299`）已部分封装，可作为 driver 的内核。
- **边界**：driver 不替 Agent 做 search/judgment（与引擎"prepare then validate"定位一致），只编排 slot lifecycle。

### 5.2 路径 B：把 logging 指令下沉到 always-loaded role spec + task.md（让任何路径留痕）
- 当前 logging 指令只在 `buildSpawnPrompt`（dead code）；`taskMarkdownForSlot`（`subagent-relay.mjs:474`）和 role spec（`subagent-dpt-source-intake.md` 等）**没有** logging 要求 → 这是即使走 relay、sub-agent 也可能不 log 的直接原因之一。
- 下沉后：任何路径（driver 或 Phase Agent 手 Agent-tool spawn）spawn 的 sub-agent，都被 role spec/task.md MANDATE 调用 `log-event.mjs` 的 lifecycle 事件。
- 与 §4.2 配合：lifecycle 事件既被要求，又作为 provenance 取证信号。

### 5.3 两者关系
- A 让正道通；B 让捷径也留痕。**B + §4 取证检查是"埋证据"的核心**——即使 Agent 仍手糊/绕路，我们也能从 log 看出来（nonce 不对、无 lifecycle、无 relay_commit_done）。
- 单做 A：若 Agent 仍拒绝走 driver、坚持手糊，照样无 log。所以 A 必须配 §4 的取证检查（让手糊过不了 gate）才有约束力。

---

## 6. 边界（这个 plan 不做什么）

- **不改 BUG-019 对策结论**（gate 接受非 relay 产出）——等 §4 取证数据收集一轮后再判。届时若数据显示"手糊普遍存在"，则证伪 BUG-019 的"relay 走不通所以要 fallback"前提（实为"relay 没被驱动"）；若数据显示"relay 真驱动了仍失败"，则 BUG-019 的 fallback 论点才有根据。
- 不引入 npm 依赖（项目 Hard Rule）。
- 不改 queue/relay 核心架构（与 harden-relay-pipeline Non-Goals 一致）。
- 不做密码学签名（与 change out-of-scope 一致）。
- 不在 explore 阶段动 `DPT_FRAMEWORK/` target code（OpenSpec phase gate）。

---

## 7. 已做的实验记录（证据基础）

| 实验 | 做法 | 结果 |
|------|------|------|
| **Exp-1** | 直接 `node log-event.mjs --event …` 与 `--level/--msg …` | 两模式 exit 0，分别正确写 `rb_trace.jsonl` / `_logs/run.log` |
| **Exp-2** | Agent-tool spawn 一个 general-purpose sub-agent，令其调用 `log-event.mjs` 两次并回报文件内容 | sub-agent 成功写 trace + run.log，内容正确 → **sub-agent logging 管线端到端可用** |
| **Exp-3** | BUG-019 bundle 4 个 `receiptNonce` 形状比对 `randomUUID()` | 0/4 匹配 UUID → nonce 手糊 → `createSlot` 未跑 |
| **Exp-4** | grep `DPT_FRAMEWORK/cli/` 是否 import `subagent-relay` | 无 → 无 runtime relay driver |

探针 bundle 已清理（`/tmp/dpt-probe-logging`）。

---

## 8. 下一步 / open questions

- **Q1（driver 形态）**：是 `operate-queue drain`（顺延现有 CLI），还是独立 `drive-relay-slot`？需看 queue/relay 边界——`operate-queue` 目前不 import relay，driver 可能更适合独立 CLI，再由 operate-queue 调用。
- **Q2（gate 强度）**：§4.1–4.4 的取证检查先做 **diagnostic**（collect evidence）还是直接 hard gate？**建议先 diagnostic 一轮**，攒数据，再升级阻断——避免误伤真 relay run。
- **Q3（归属）——已定**：走**独立新 change**（名候选 `subagent-execution-logging`；核心 = §5.0 beacon 模式 + §4 取证 + §5 driver/下沉 + §10 判断手册）。本 plan 是该 change 的输入。BUG-019 对策不改，等真实 run 后由 §10 手册判决。
- **Q4（lifecycle payload）**：`work_done`/`fetch_done` 要不要带 page count、url domain（便于后续 quality/重复诊断）？**建议带**，零成本。

---

## 9. 把握度标定

- **高（证据级，已验证）**：sub-agent logging 管线本身工作（E1/E2）；BUG-019 bundle provenance 是**懒手糊**（E5/E7/E8：S1✗ 无 dispatch.json、S2✗ 非 UUID nonce）；relay 无 runtime driver（E4/Exp-4）；bundle 在 post-change 跑（E9）。
- **中（方向对、待设计）**：driver 命令形态（§5.1）、gate execution-based 升级（§4.3）。
- **重要修正（第 4 轮）**：BUG-019 是**懒手糊** tier——**不会**被抓到"认真手糊者"（写齐 dispatch.json + UUID nonce + append 一致 trace 行）。
- **open（必须在 §9 标出）**：SUD-007 落地**前**，连 trace 链都可被 append 一致行伪造；SUD-007 + RPG-012 落地后才把认真手糊的成本量级提上去。**仍非密码学不可伪造。**
- **低 / 未决**：BUG-019 对策最终怎么定——**故意悬置**。等埋点落地、跑过真实 run 后，**由下一个 coding agent 按 §10 判断手册（6-tier 矩阵）判决**。
- **已判（2026-07-04，受控 E2E）**：`subagent-execution-logging` apply 后，case-65 金路径（`drive-relay-slot` + 真 sub-agent + S0–S5 全自洽）判 **tier-1**——"relay 走不通"前提为假，**fallback 方向否决**；case-66 验证 tier-4 carve-out（staged-not-committed 只报 RPG-008，不误判伪造）。判决与证据回写在 `_backlog/bugs/BUG-019-*.md` §6。诚实边界：受控 E2E 已判；首次真实 production run（`dpt_rb_*`）后按 guide §4 复核确认，方可 Close。

---

## 10. 给下一个 coding agent 的判断手册（真实 run 后据此判决）

> **你是谁、为什么读到这里**：你可能是一个全新会话的 coding agent，接手了这个 plan。你的任务**不是**重新设计，而是：等 §4/§5 埋点 apply 之后，跑真实 wave0/wave1，**读 bundle 里落地的证据，替我们判决 BUG-019 对策**。本节是你唯一需要的操作手册——不用回看本 plan 的推导过程，照 §10.1→§10.3 做即可。

### 10.1 前置确认（先做，否则信号不存在）

埋点必须已 apply。确认这 6 样东西在产出里：
- `_subagents/wave_NN/dispatch.json` 每个 slot 带 `receipt_nonce`（UUID）← SUD-005
- `_subagents/wave_NN/slot_MM/_beacon.json` 含 `bundle_dir`/`log_cli`/`slot_key`/`receipt_nonce` ← SUD-004
- **staging/commit 的 trace 事件带 `receiptNonce`**（S0/S3 才能交叉校验）← **SUD-007**
- sub-agent role spec / task.md MANDATE 调 `log-event.mjs` 的 lifecycle 事件 ← §5.2 / WNC-010/011
- **phase MD 指示 Phase Agent 用 `drive-relay-slot`** ← WNC-012（否则 driver 是 dead code）
- 有 runtime driver `drive-relay-slot` 能真把 relay 跑通 ← §5.1 / SRD

没 apply 就先 apply（开 `subagent-execution-logging` change 的 apply 阶段），别往下判。

### 10.2 跑完一轮真实 run 后，读这些信号（**每个 evidence-producing slot**，不是 per-wave）

| 信号 | 看哪里 | 谁写的 | 抗手糊 | 缺失意味着 |
|---|---|---|---|---|
| **S0** engine trace 链在且自洽 | `rb_trace.jsonl` 的 `slot_create`/`dispatch_create`/`agent_runtime_started`/`agent_result_ready`/`agent_result_received`/`result_schema_validated`（SUD-007 后全带 nonce） | engine `traceEntry` | **强**（要伪造整条自洽链） | engine 没真跑（**最关键**） |
| **S1** `dispatch.json` 在 | `_subagents/wave_NN/dispatch.json` | engine 写文件 | 弱（文件可伪造） | staging 没跑（懒手糊筛查） |
| **S2** nonce UUID 且 ∈ dispatch | receipt/beacon nonce ↔ dispatch | `createSlot` | 弱（两边都可手糊写） | 懒手糊 / nonce 未绑定 |
| **S3** commit 链在（`result_schema_validated`+`agent_result_received`，带 nonce） | `rb_trace.jsonl` | engine `commitSlotResult` | **强** | 引擎 commit 没跑 |
| **S4** `spawnedAt→completedAt` 跨度 > 1s | `_agent.json` | engine `commitSlotResult` | 弱（可伪造，且有 fast-but-real 假阳性） | 可疑（**单独不足**） |
| **S5** run.log 有带 nonce 的 lifecycle 事件 | `_logs/run.log` | sub-agent | 弱（sub-agent-authored，依赖配合） | sub-agent 没 log（辅助） |

> **S0/S3（engine trace 链）才是主信号**——引擎函数运行的副产物，手糊者要复制整条 nonce-anchored 自洽链。**S1/S2 只是懒手糊筛查**（文件可伪造，只抓懒的）。**S4 佐证、S5 辅助**。**绝不从单一信号定伪造**：tier-6（不一致）须 RPG-012 交叉引用矛盾 + 复核。

### 10.3 判决矩阵（6 tier，pattern → 结论 → 对 BUG-019 怎么办；**按 slot 判**）

| tier | 观察到的 pattern | 结论 | BUG-019 对策含义 |
|---|---|---|---|
| 1 | S0✓ S3✓ `status=done` | relay 端到端**真跑通** | "relay 走不通所以要 fallback"**前提为假** → fallback **否决**。若 gate 仍卡 → 格式/YAML 问题（BUG-018），非 relay 架构 |
| 2 | S0✓ S3✓ `status=failed/partial` | relay 真跑，但 slot **真失败**了 | 非伪造、非观测缺口 → 查 slot 为何失败。fallback 仍否决 |
| 3 | S0✓ 但 S5✗ | relay 真跑、provenance 真，只是 sub-agent 没 log | 观测缺口（补 §5.2 role-spec 下沉），**非** provenance 问题；fallback 仍否决 |
| 4 | staging✓（S0 staging 段 + dispatch.json）commit✗（无 S3，`_status≠done`） | **staged-not-committed**：engine staged，commit 没跑 | driver **有** staging，commit 路径出问题 → 查 commit 为何跳过。**非伪造**，非"修 driver" |
| 5 | S1✗ **或** S2✗（无 dispatch.json / 非 UUID nonce） | **懒手糊**（= 当前 BUG-019 bundle） | relay **没被驱动**（driver gap），非"走不通" → §5.1 driver + WNC-012 接线，**非** fallback |
| 6 | 文件/trace 在但**交叉引用矛盾**（RPG-012） | **不一致**：认真手糊 / 损坏 / fast-but-real 之一 | 须 RPG-012 + 复核，**不单凭 RPG-009 定伪造**；数据够了开 execution-based 阻断 change |

### 10.4 你的操作步骤

1. 确认 §10.1 埋点已 apply（**含 SUD-007**——否则 S0 trace 链没 nonce-anchored，tier 4/6 不可靠）。
2. 跑 ≥1 轮真实 wave0（或 wave1）。
3. **对每个 evidence-producing slot** 读 §10.2 的 S0–S5（一个 wave 里不同 slot 可能在不同 tier，**按 slot 判，不按 wave 笼统判**）。
4. 套 §10.3 的 6-tier 矩阵得出每个 slot 的结论。
5. 按结论定 BUG-019 对策（tier 1/2/3 → fallback 否决；tier 4 → 查 commit；tier 5 → driver + 接线；tier 6 → 复核 + 考虑阻断 change）。
6. **把结论回写**：更新 `_backlog/bugs/BUG-019-*.md` 的对策段 + 本 plan §9 把握度。

> 一句话：**S0/S3（engine trace 链）是主信号；S1/S2 只是懒手糊筛查；绝不从单一信号定伪造。staged-not-committed（tier 4）≠ 手糊——别误判成"修 driver"。**

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

目标是：**让"真 sub-agent 跑过"和"手糊 provenance"在 log 里可区分、可检测。** 四类埋点，由弱到强：

### 4.1 unforgeable nonce binding（最强单点）
- `createSlot()` 已用 `randomUUID()`（E5 证明手糊 nonce 形状不对）。
- **埋点强化**：在 `dispatch.json`（`createDispatchManifest` 已写 `subagent-relay.mjs:604`）里记录每个 slot 的 engine-generated nonce。
- **取证检查**：比对 `runtime-receipt.jsonl` 的 `receiptNonce` 是否 = `dispatch.json` 记录值、且为 UUID 形状。不一致 → `provenance_nonce_mismatch`。
- 手糊者拿不到引擎生成的 nonce（除非也手糊 dispatch.json 并猜中——但 dispatch.json 由引擎写，且可交叉校验）。

### 4.2 sub-agent lifecycle event presence
- buildSpawnPrompt 已定义 lifecycle 事件（E3）。真实 spawn 的 sub-agent 应在 `run.log`/`rb_trace.jsonl` 留下至少 `work_done`。
- **取证检查**：每个 evidence-producing slot 必须有对应 lifecycle 事件；缺失 → 产出视为无 provenance。
- 价值：即使 §5.2 把 logging 下沉到 role spec，手糊者仍可绕过——lifecycle 事件缺失是独立兜底信号。

### 4.3 engine-execution trace binding（"验证执行"而非"验证存在"的核心）
- `commitSlotResult` 会 emit `relay_commit_attempt`/`result_schema_validated`/`relay_commit_done`（engine 自写，Agent 手糊不出来——这是引擎函数运行时的 `traceEntry` 副产物）。
- **取证检查**：gate 的 `subagent_slot_presence` 升级为——除了文件存在，**还要求 `rb_trace.jsonl` 里有该 slot 的 `relay_commit_done` 事件**。
- 这是把 gate 从 presence-based 升级为 execution-based 的关键。Agent 手糊文件时**不会**产生这些 trace 事件（除非手写 trace——但 trace 是 append-only 且有交叉校验，难度量级不同）。

### 4.4 时间跨度 sanity
- 真实 sub-agent `spawnedAt → completedAt` 应秒级以上。同毫秒 = 手糊（E8）。
- **取证检查**：`_agent.json` 跨度 < 阈值（如 1s）→ 可疑。

> **诚实声明**：§4 全部是"更难手糊"而非"密码学不可伪造"。真正不可伪造需要 engine 侧签名（harden-relay-pipeline design 已明示 out-of-scope）。但 §4.1+4.3 组合已把"手糊"从 trivial（写几个 JSON）提升到 needs-effort（要伪造 UUID nonce + 伪造引擎 trace 事件 + 对齐时间跨度），足以让"normal shortcut"暴露——而这正是 change 声称要防的 "accidental/shortcut bypass"。

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

**两层取证（按是否依赖 sub-agent 配合分层）：**
- **Layer-1（staging 证明，无需 sub-agent 配合）**：engine 在 staging 把 UUID nonce 写进 `dispatch.json`/`_beacon.json`。检测 = receipt/ledger 的 nonce 是否 ∈ dispatch.json 的 UUID。**这一层直接抓 BUG-019 那种手糊**（已证实：bundle 无 dispatch.json、4 nonce 全非 UUID）——哪怕 sub-agent 一个字都没 log。
- **Layer-2（execution 证明，需 sub-agent 配合）**：sub-agent 读 beacon、log 带 nonce 的 lifecycle 事件、engine 跑 `commitSlotResult` 留 `relay_commit_done`。检测 = trace 里是否有该 slot 的 commit + lifecycle 事件。

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

- **高（证据级，已验证）**：sub-agent logging 管线本身工作（E1/E2）；BUG-019 bundle provenance 是手糊（E5/E7/E8）；relay 无 runtime driver（E4/Exp-4）；bundle 在 post-change 跑（E9）。
- **中（方向对、待设计）**：driver 命令形态（§5.1）、gate execution-based 升级（§4.3）——方向由证据支撑，具体实现需 design + 测试。
- **低 / 未决**：BUG-019 对策最终怎么定——**故意悬置，不在本会话判**。等 §4/§5 埋点落地、跑过真实 run 后，**由下一个 coding agent 按 §10 判断手册判决**（5 个信号 + 矩阵的明确流程，不再是泛泛"收集数据"）。

---

## 10. 给下一个 coding agent 的判断手册（真实 run 后据此判决）

> **你是谁、为什么读到这里**：你可能是一个全新会话的 coding agent，接手了这个 plan。你的任务**不是**重新设计，而是：等 §4/§5 埋点 apply 之后，跑真实 wave0/wave1，**读 bundle 里落地的证据，替我们判决 BUG-019 对策**。本节是你唯一需要的操作手册——不用回看本 plan 的推导过程，照 §10.1→§10.3 做即可。

### 10.1 前置确认（先做，否则信号不存在）

埋点必须已 apply。确认这 4 样东西在产出里：
- `_subagents/wave_NN/dispatch.json` 每个 slot 带 `receipt_nonce`（UUID）← Layer-1
- `_subagents/wave_NN/slot_MM/_beacon.json` 含 `bundle_dir`/`log_cli`/`slot_key`/`receipt_nonce`
- sub-agent role spec / task.md MANDATE 调 `log-event.mjs` 的 lifecycle 事件 ← §5.2
- 有 runtime driver 能真把 relay 跑通 ← §5.1

没 apply 就先 apply（开 `subagent-execution-logging` change 的 apply 阶段），别往下判。

### 10.2 跑完一轮真实 run 后，读这 5 个信号（每个 evidence-producing slot / 每个 wave）

| 信号 | 看哪里 | 谁写的 | 缺失意味着 |
|---|---|---|---|
| **S1** `dispatch.json` 在 | `_subagents/wave_NN/dispatch.json` | `createDispatchManifest`（engine，staging） | staging 没跑 |
| **S2** nonce 是 UUID 且 ∈ dispatch.json | slot `runtime-receipt.jsonl` / `_beacon.json` 的 nonce ↔ dispatch.json 记录 | `createSlot`（`randomUUID()`） | 手糊 / nonce 未绑定 |
| **S3** trace 有 `relay_commit_done` | `rb_trace.jsonl` 该 slot 事件 | `commitSlotResult`（engine） | 引擎 commit 没跑 |
| **S4** `spawnedAt→completedAt` 跨度 > 1s | `_agent.json` | `commitSlotResult` | 手糊（同毫秒） |
| **S5** run.log 有带 nonce 的 lifecycle 事件 | `_logs/run.log` 的 `search_start`/`work_done` 等 | sub-agent（经 `log-event.mjs`） | sub-agent 没真跑 / 没 log |

> **S1–S4 是 engine 侧落地、sub-agent 无法伪造**（除非恶意手写 trace/dispatch——那已超出"normal shortcut"，密码学签名才防，out-of-scope）。**S5 依赖 sub-agent 配合，是辅助而非必要。所以哪怕只看 S1–S4 也足以判 relay 是否真驱动过。**

### 10.3 判决矩阵（pattern → 结论 → 对 BUG-019 怎么办）

| 观察到的 pattern | 结论 | BUG-019 对策含义 |
|---|---|---|
| S1✓ S2✓ S3✓ S4✓ S5✓ | relay 端到端**真跑通** | BUG-019 的"relay 走不通所以要 fallback"**前提为假** → 对策（gate 接受非 relay 产出）**否决**。若 gate 仍卡 → 是格式/YAML 问题（BUG-018 范畴），不是 relay 架构 |
| S1✓ S2✓ S3✓ 但 S5✗ | relay 真跑、provenance 真，只是 sub-agent 没 log | 观测缺口（补 §5.2 role-spec 下沉），**不是** provenance 问题；BUG-019 fallback **仍否决** |
| S1✗ **或** S2✗ **或** S3✗ | provenance 被**手糊**（= 当前 BUG-019 bundle 情形，见 §2） | relay **没被驱动**（L3 driver gap），不是"走不通"。修法 = §5.1 driver + §4.3 execution-based gate，**不是** fallback（fallback 会把手糊官方化） |
| 即便 driver 已存在仍持续手糊 | Agent 主动偏好伪造 | provenance 必须 execution-based 硬阻断（§4.3），并立项查"为何 Agent 不走 driver" |

### 10.4 你的操作步骤

1. 确认 §10.1 埋点已 apply。
2. 跑 ≥1 轮真实 wave0（或 wave1）。
3. 对每个 evidence-producing slot 读 §10.2 的 5 个信号。
4. 套 §10.3 矩阵得出结论。
5. 按结论定 BUG-019 对策：否决 fallback / 否决+补观测 / 上 driver+execution-gate / 立项查伪造偏好。
6. **把结论回写**：更新 `_backlog/bugs/BUG-019-*.md` 的对策段 + 本 plan §9 把握度（把"低/未决"升到"高，证据见…"）。

> 一句话：**S1–S4 全✓ → relay 没坏，BUG-019 的 fallback 是错的；S1/S2/S3 任一✗ → 是"没驱动"不是"走不通"，修 driver 而不是开 fallback。**

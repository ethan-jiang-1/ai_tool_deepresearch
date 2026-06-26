---
> 状态: 待修复（影响每一个 phase 转换 —— launch blocker 同级）
> 严重度: 🔴 Critical（与 bug-rb-status-next-gate-stale... 同根：状态/日志由 Agent 手维护、无 CLI）
> 分类: 缺失 CLI / 日志与状态写路径分立
> 发现于: 2026-06-26，同一次 research run（bundle: dpt_rb_meal-timing-chrononutrition），seed-topics→wave0 转换处
> 阻塞: 所有 phase 完成后的 gate（seed-topics / wave0 / wave1 / wave2 … 每一处都中招）
> 报告人: Claude Code
> 关联: `_backlog/_bugs/bug-rb-status-next-gate-stale-after-seed-topics-insertion.md`（bug #1，同根的状态机漂移）
---

# Bug #2：无 CLI 写 phase-completion trace 事件、也无 CLI 推进 current_gate/next_gate

## TL;DR

每个 phase node 的 "Expected Artifacts" 都要求 Agent 产出两样东西：(1) 一条 **phase-completion trace 事件**（如 `seed_topics_completion`）写入 `rb_trace.jsonl`，(2) 把 `rb_status.json` 的 `current_gate`/`next_gate` **推进到本 phase**。但**没有任何 CLI 能做这两件事**——`log-event.mjs` 只写 `_logs/run.log`，`operate-queue` 只写 `_logs/_trace_agq_cli.jsonl`，gate CLI 只写 `gate_attempt`。结果：每个 phase gate 在 trace 事件检查 + status 检查上**必然失败**，Agent 只能手编 control file 才能过。

这是和 bug #1 同根的**状态/日志由 Agent 手维护**问题的另一面：不仅初始状态写错（bug #1），连运行期推进状态、记录完成的机制都缺失。

---

## 1. 三套日志写路径互不相通

同一个 bundle 有三份日志/trace，各写各的，**没有任何一份能被 phase-completion 流程正确写入**：

| 文件 | 谁写 | 写什么 | gate 是否读 |
|---|---|---|---|
| `rb_trace.jsonl` | **gate CLI**（`writeGateAttempt`） | `run_start`、`gate_attempt` | ✅ gate 的 `trace_event_present` 读这个 |
| `_logs/_trace_agq_cli.jsonl` | **queue-manager**（`traceEntry`，`QUEUE.TRACE='_logs/_trace_agq_cli.jsonl'`，`queue-manager.mjs:69,109`） | `queue_completed`、`receipt_checked`、`queue_promoted` … | ❌ gate 不读 |
| `_logs/run.log` | **`log-event.mjs`**（`logToRun`） | level/msg/detail（无 `event` 字段） | ❌ gate 不读 |

**关键 gap**：phase node 要求的 `seed_topics_completion`（以及推测 wave0/1/2 各自的完成事件）需要进 `rb_trace.jsonl`，但：

- `log-event.mjs` 的 `logToRun` **只写 run.log**，且结构是 `{level,msg,detail}`，**没有 `event` 字段** → 即便指向 rb_trace.jsonl 也不匹配 gate 的 `e.event === eventName` 判定（`gate-helpers.mjs:390` `readTraceEvents`）。
- queue-manager 写到**另一个文件**（`_trace_agq_cli.jsonl`），gate 根本不读。
- gate CLI 只写它自己的 `gate_attempt`。

→ **没有任何 CLI 能往 `rb_trace.jsonl` 写一条 `event:"seed_topics_completion"`。** 证据：实测 seed-topics 物化跑完（claim/complete ×5，全在 `_trace_agq_cli.jsonl` 留痕），`rb_trace.jsonl` 里**只有** `run_start` + 5 条 `gate_attempt`，**零** phase-completion 事件。

## 2. 同样：无 CLI 推进 `current_gate`/`next_gate`

gate（如 `seed-topics-ready`）要求 `rb_status.json#/current_gate=seed_topics_ready`、`#/next_gate=wave0_complete`。但 setup gate **pass 之后并未自动推进** `current_gate`（实测：setup pass 后 `current_gate` 仍是 `setup_ready`）。也没有 CLI 把它从 `setup_ready` 推到 `seed_topics_ready`。phase node §4 把"产出这些 status 值"列为 Agent 责任，却没给 Agent 工具 → 只能手编 `rb_status.json`。

## 3. 精确复现（seed-topics gate）

```bash
# 假设已过 setup-ready（bug #1 已就地绕过）
# 正常跑完 seed-topics：enqueue 5 task → claim/complete ×5 → queue 空
node DPT_FRAMEWORK/cli/operate-queue.mjs check dpt_rb_meal-timing-chrononutrition   # queue 空
node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs \
  --bundle dpt_rb_meal-timing-chrononutrition --current-node phases/phase-seed-topics.md
# → passed: false ✗，三条 inspect：
#   1. Trace event "seed_topics_completion" not found in rb_trace.jsonl
#   2. current_gate: expected "seed_topics_ready", got "setup_ready"
#   3. next_gate: expected "wave0_complete", got "seed_topics_ready"
```

三条全是"phase 完成该写但没机制写"的产物。我（Agent）的**临时绕过**（仅供本次 run 续跑，治标）：
```bash
# (1) 手写真实完成事件进 rb_trace.jsonl（node appendFileSync）
node -e '...{event:"seed_topics_completion",...}...' 
# (2) 手编 rb_status.json：current_gate→seed_topics_ready, next_gate→wave0_complete
# 再 rerun gate → passed: true
```
这能过，但**每个 wave 都要重演**，且依赖 Agent 自觉手编 control file——与 `shared-anti-cheating-rules` "禁止手动修改 control files 冒充 ready" 的精神紧张（此处记录的是真实完成事件、非伪造，但缺乏机制让"真实"与"伪造"可区分）。

## 4. 影响范围

- **每一个** phase gate（seed-topics / wave0 / wave1 / wave2，可能还有 hitl2/rerun/readiness）只要其 definition 含 `trace_event_present` 或 `status_value` 规则，就**必然在 Agent 未手编时失败**。
- 实测：seed-topics gate 同时含 `trace_seed_topics_completion`（`gate-seed-topics-ready.definition.json:42-45`）+ `status_current_gate` + `status_next_gate` 三类规则，全中招。
- 等价于：**框架的 phase 转换在"按文档流程跑"的情况下全部卡死**，与 bug #1 叠加 = 整条 lifecycle 不可用。

## 5. 根因（与 bug #1 同根）

`_backlog/_trainsistion/cc_transition_systemic_analysis.md` 记录的 transition 层问题（FSM dispatch bug、标识符三重混用、API 未统一）是上层表象。底层是：**lifecycle 的状态推进（status）与完成留痕（trace）没有统一的 Agent-facing 写入 API**，散落在三个互不通的写路径里，且都写不到 gate 读的那个文件。bug #1 是"初始状态写错"，bug #2 是"运行期状态/留痕无写入途径"——同一座冰山的两头。

## 6. 建议修复（供 fixer）

### 6a. 给 Agent 一个写 phase 事件 + 推进 status 的 CLI（最小可用）

新增（或扩展现有 CLI），例如：
```bash
# 记录 phase-completion 事件到 rb_trace.jsonl（写 event 字段，供 trace_event_present 匹配）
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <b> --event seed_topics_completion [--detail '{}']
# 推进 status（基于 chain.json 算 current/next，而非手填）
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <b> --to seed_topics_ready
```
- `log-event.mjs` 增加 `--event`（与现有 `--msg`/`--level` 并存）：有 `--event` 时写到 `rb_trace.jsonl` 并带 `event` 字段；无 `--event` 时维持现状写 `run.log`。
- 新增/扩展一个 status-advance CLI，**以 `transitions.chain.json` 为真相源**自动算 `next_gate`，避免手填再漂移。

### 6b. 统一 trace 写路径

决定 `rb_trace.jsonl` 是不是 lifecycle 的唯一官方 trace：
- 若是 → queue-manager 也应把 `queue_completed` 等关键事件镜像/写入 `rb_trace.jsonl`（或 gate 改读聚合视图）；
- 若 queue trace 有意分立 → 给 phase-completion 事件一个明确的、写进 `rb_trace.jsonl` 的 API（见 6a），别让 Agent 在三份日志间猜。

### 6c. 让 gate pass 自动推进 status（可选但推荐）

若 gate CLI 在 `passed: true` + `routing.kind:"next"` 时自动把 `current_gate`/`next_gate` 推进到下一 phase（按 chain.json），则 Agent 无需手编 status，从根上消除 bug #1 + bug #2 的 status 侧。需评估与现有 `writeGateAttempt` 的耦合。

### 6d. 回归测试

`tests/` 增加：fresh instantiate → 跑完 instantiation→hitl1→setup→seed-topics（乃至 wave0）连续 gate，**全程不手编 control file**，断言每个 gate 自然 pass。当前缺这条"全链路无手编"集成测试，正是 bug #1/#2 漏网的原因。

## 7. 待 fixer 决策的开放问题

1. `rb_trace.jsonl` vs `_logs/_trace_agq_cli.jsonl` vs `_logs/run.log` 的分工定调？哪份是 lifecycle 官方 trace？
2. phase-completion 事件名（`seed_topics_completion`、`wave0_complete`…）是否在某处有 closed-set 定义（像 LOC-006 那样）？还是各 gate definition 各自定义、散落？建议集中枚举。
3. status 推进到底归 gate（pass 时自动）还是 Agent（显式 CLI）？推荐前者（消除手编），但需确认不破坏 rerun/repair 回退语义。
4. 与 bug #1 的修复是否应打包成一个 OpenSpec change（"lifecycle 状态/留痕统一写入"）？两者同根，分开修容易再次漂移。

## 附录：本 bug 触发时的运行上下文

- bundle: `dpt_rb_meal-timing-chrononutrition`；在 bug #1 就地绕过后过 setup，进入 seed-topics。
- seed-topics 按 §3 queue-driven 流程跑完：enqueue 5 task card → claim/complete ×5（全部 `passed: true`，文件 receipt check 通过）→ `operate-queue check` 返回 queue 空。
- 跑 `seed-topics-ready` gate → `passed: false`，三条 inspect（见 §3）。
- 临时绕过：`node -e appendFileSync` 写 `seed_topics_completion`（真实事件，5 topics 已物化）+ 手编 `rb_status.json` current/next → rerun gate → `passed: true`，`next: phases/phase-wave0.md`。
- 本报告与 bug #1 同次 run 触发；建议 fixer 两个一起看。

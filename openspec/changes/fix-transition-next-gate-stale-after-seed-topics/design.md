## Context

`hitl1` 和 `seed-topics` 两个阶段被插入 workflow lifecycle 后，与 transition/gate status 相关的工件**只更新了一部分**。这导致了两个互相叠加的 launch blocker：

**Bug #1 — 初始状态写错**：`rb_status.json.tmpl`、`gate-instantiation-complete.definition.json`、`phase-setup.md` 停留在旧链（`next_gate: wave0_complete`），而 `gate-setup-ready.definition.json` 已更新为新链（`next_gate: seed_topics_ready`）。矛盾使每个新建 bundle 死在 setup-ready gate。

**Bug #2 — 运行期无写入途径**：即使修了 bug #1 过了 setup gate，下一个 phase gate（seed-topics-ready）要求 (a) `rb_trace.jsonl` 里有 `seed_topics_completion` 事件，(b) `current_gate` 已推进到 `seed_topics_ready`，(c) `next_gate` 已推进到 `wave0_complete`。但**没有任何 CLI 能写 phase-completion trace 事件或推进 status**——`log-event.mjs` 只写 `_logs/run.log`（无 `event` 字段），gate CLI 只写 `gate_attempt`，queue-manager 写到另一个文件（`_trace_agq_cli.jsonl`）。这两个 bug 叠加 = lifecycle 从 setup 之后每一个 phase gate 全部卡死。

已更新的工件：`transitions.chain.json`、`manifest.json`、`gate-setup-ready.definition.json`、`enums.mjs`、seed-topics 全套。未更新的工件分两类：初始状态（bug #1 覆盖）+ 运行期写入工具缺失（bug #2 覆盖）。

### 三套命名系统（设计意图，无需改动）

| 系统 | 格式 | 示例 | 用途 |
|------|------|------|------|
| Node fileRefs | `path/to/file.md` | `phases/phase-wave0.md` | chain.json keys, CLI `--current-node`, 路由查找 |
| Gate names | kebab-case | `wave0-complete` | manifest, frontmatter `gate` 字段, gate def 文件名 |
| Gate state enums | snake_case | `wave0_complete` | `rb_status.json` 值, `enums.mjs` `CurrentGate`, gate def `expected` 字段 |

### 路由系统（健康，不需要改动）

Gate CLI 通过 `resolveRouting(transitionsPath, currentNodeRef, outcome)` 查 `transitions.chain.json`（以 node fileRef 为 key 的纯映射表），不依赖 `rb_status.json` 的 `current_gate`/`next_gate`。路由系统是健康的、唯一的真相源。

## Goals / Non-Goals

**Goals:**
- 修复模板和 gate definition 中 stale 的 `next_gate` 值（Bug #1）
- 新增 `advance-status.mjs` CLI：Agent 调用它以 `transitions.chain.json` 为真相源推进 `current_gate`/`next_gate`（Bug #2 status 侧）
- 扩展 `log-event.mjs` CLI：新增 `--event` 参数写 `rb_trace.jsonl`（Bug #2 trace 侧）
- 补全 `gate-hitl1-recorded.definition.json` 中缺失的 status 规则，使所有 10 个 gate 保持一致的 status 检查模式
- 退役 `gate.mjs` 抽象 FSM（与真相源脱节的死代码），迁移 test helper 到以 `transitions.chain.json` 为真相源
- 新增回归测试覆盖 instantiation→hitl1→setup→seed-topics 连续 gate pass 路径，**全程不手编 control file**
- 清理 spec/playbook/test-fixture 中的 stale 引用

**Non-Goals:**
- 不改动 routing engine（`ask-next.mjs`、`transition-chain.mjs`、`gate-helpers.mjs`）——它们是正确的
- 不加 gate pass 时自动推进 status（见 D2 修订）——提供显式 CLI 而非 engine 隐式推进
- 不统一三份日志/trace 文件（`rb_trace.jsonl` vs `_logs/_trace_agq_cli.jsonl` vs `_logs/run.log`）——本 change 只给 phase-completion 事件一个写进 `rb_trace.jsonl` 的途径，整体日志架构统一属于更大范围的 `_trainsistion` 清理
- 不改 `enums.mjs` `CurrentGate`（已正确包含所有 gate）
- 不改 `transitions.chain.json`（已是 correct chain）
- 不改 seed-topics 或 wave0 上下文中正确的 `next_gate: wave0_complete` 引用

## Decisions

### D1: 修模板和 instantiation gate definition，而非在其他地方"适配"

**选择**: 把 `rb_status.json.tmpl` 的 `next_gate` 从 `wave0_complete` 改为 `seed_topics_ready`；把 `gate-instantiation-complete.definition.json` 的 expected `next_gate` 同步改为 `seed_topics_ready`。

**原因**: 真相源（`transitions.chain.json:4`）已铁定 `phase-setup.md → phase-seed-topics.md`。`next_gate` 语义 = 「setup 的下一站 gate」= `seed_topics_ready`。模板是初始值产生点，instantiation gate 是第一道校验——两者必须对齐真相源。反向修改（让 setup gate 迁就旧模板值）会破坏已更新的 setup gate 和 chain.json。

**替代方案**: 在 instantiation gate pass 之后由 Agent 更新 `next_gate`。拒绝原因：模板直接产出正确值比事后修补更简洁；且 hitl1 gate 不检查 status（现已修复），中间无 guard。

### D2: 不加 gate-pass 自动推进，提供显式 CLI 工具

**选择**: 新增 `advance-status.mjs` CLI——Agent 显式调用来推进 `rb_status.json` 的 `current_gate`/`next_gate`。gate CLI 在 pass 时**不**自动推进 status。`log-event.mjs` 扩展 `--event` 参数——Agent 显式调用来写 phase-completion trace 事件。两者都是 Agent-facing 的明确动作，不是 engine 隐式行为。

**原因**:
- Gate 的职责是「检查」而非「推进」。让 gate 同时负责检查和推进会模糊 C（Check 硬性验证）的边界——gate 变成有副作用的 actor 而非纯 validator。
- Rerun 路径需要 status 回退到之前的值，显式 CLI 让 Agent 拥有完整的控制权（先回退 → 再推进），而非 gate 隐式覆盖。
- `advance-status` 以 `transitions.chain.json` 为单一真相源计算 `next_gate`——Agent 只需传 `--to <gate>`（如 `--to seed_topics_ready`），CLI 自动查链确定 `next_gate`。这比 Agent 手填值更可靠，也比 engine 隐式推进更可控。
- 所有 10 个 gate 现在都有完整的 `status_current_gate`/`status_next_gate` 规则（本次补全 hitl1），guardrail 覆盖无盲区——即使 Agent 忘了调 CLI，gate 也会 fail 并给出清晰指引。

**替代方案**: gate pass 时自动推进 status（bug #2 建议 6c）。已有 `writeGateAttempt` 往 bundle 写 audit 记录，加 status 写入在技术上不复杂。但如前所述，这会模糊 gate 的纯 validator 角色。如果在实践中 Agent-CLI 模式证明繁琐，可以在后续 change 中 reopen 这个决定。

### D3: 退役 gate.mjs 抽象 FSM，迁移 test helper 到 chain.json

**选择**: 在 `gate.mjs` 顶部加 deprecation banner（保留 exports 不删），改 `tests/helpers/md-phase-checks.mjs` 的校验逻辑从读 `gate.mjs` 改为读 `transitions.chain.json` + `manifest.json` 桥接。

**原因**:
- `gate.mjs` 的 `GATE_MACHINE_STATES`（缺 `hitl1_recorded`、`seed_topics_ready`、`rerun_ready`）和 `GATE_TRANSITIONS`（旧链 instantiation→setup→wave0，用 `hitl2_pending_user` 替代 `hitl2_recorded`）与真相源脱节。
- 它不被任何 runtime 路径引用（只被 test helper 和两个 test 文件引用），是事实上的死代码。
- `md-phase-checks.mjs` 已经 gracefully 处理了缺失 gate（不在 FSM 中的 gate 视为 standalone 跳过），所以不更新 FSM 不会导致 false failure。
- 但让 test helper 依赖一个废弃的 FSM 会持续产生 confusion。改为以 chain.json 为真相源后，test helper 的校验会更有实际意义（验证 gate 是否在真实链中）。

**替代方案**: 更新 `gate.mjs` 到当前链。拒绝原因：(1) 无 runtime consumer，更新死代码无实际价值；(2) FSM 的事件模型（`PASS_SETUP`、`USER_PROCEED` 等）与 chain.json 的 outcome 模型（`passed`、`failed`、`rerun`）是两套根本不同的抽象，强行同步会引入新的 impedance mismatch；(3) `_trainsistion` backlog 已挂账统一 transition 层，应在那时一并决定 FSM 去留。

### D4: 补全 hitl1 gate 的 status 规则

**选择**: 在 `gate-hitl1-recorded.definition.json` 中加入 `status_current_gate` 和 `status_next_gate` 规则。

**原因**: 这是唯一缺少这两个规则的 gate（其他 9 个 gate 全有）。补全后 instantiation→hitl1→setup 形成连续 status 检查链，任何一站发生 drift 都会被捕获。

### D5: `advance-status` CLI 设计——以 chain.json 为真相源

**选择**: 

```bash
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to <gate>
```

- `--to <gate>`: 目标 gate 的 snake_case 枚举值（如 `seed_topics_ready`）。CLI 以 `transitions.chain.json` 为真相源自动计算对应的 `next_gate`。
- 算法：通过 `manifest.json` 桥接 gate 值 → node fileRef → 查 `chain.json[node][passed]` → 得到 next node fileRef → 通过 manifest 桥接回 gate 枚举值 → 写 `next_gate`。
- 同时把 `current_gate` 设为 `--to` 的值。
- 同时写一条 `phase_transition` trace 事件到 `rb_trace.jsonl`（`event: "phase_transition"`，detail 含 `from`/`to`/`next`），供 audit。
- 未知 gate 或 chain lookup 失败 → 打印 JSON error 到 stdout，exit 1。成功 → 打印 `{ status: "ok", current_gate, next_gate }` 到 stdout，exit 0。

**原因**: 让 CLI 而非 Agent 做 chain 查表——单一真相源，消除手填漂移风险。Agent 只需知道「我要推进到哪个 gate」，不需要知道「下一站是什么」。

### D6: `log-event` CLI 扩展——向后兼容的 `--event` 参数

**选择**: 在现有 `log-event.mjs` 基础上加 `--event` 参数。行为分叉：

- 有 `--event`：写 `rb_trace.jsonl`，JSONL 行含 `event` 字段（值 = `--event` 参数） + `ts`、`bundle`、`detail`（可选 `--detail` JSON）。不写 `run.log`。
- 无 `--event`（现有行为）：写 `_logs/run.log`，维持 `{level, msg, detail}` 格式。完全不改现有行为。

```bash
# 写 phase-completion trace 事件
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --event seed_topics_completion

# 带 detail 的 trace 事件
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --event seed_topics_completion --detail '{"topic_count":5}'

# 现有行为不变
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --level info --msg "phase done"
```

**原因**: 最小改动，不破坏现有调用方（所有现有 `log-event` 调用都不传 `--event`）。`rb_trace.jsonl` 是 gate 的 `trace_event_present` 规则读取的唯一文件——必须把事件写进这个文件。gate 判定逻辑（`gate-helpers.mjs:390`）用 `e.event === eventName` 匹配——所以 JSONL 行必须有 `event` 字段。

## Risks / Trade-offs

- **[风险] 修复后旧 bundle 的 instantiation gate 可能 fail** → 这是期望行为。旧 bundle 的 `next_gate: wave0_complete` 是一个真实的 inconsistency，修复后的 gate 会正确识别并给出清晰的 fix 指引（"restore the correct value to seed_topics_ready"）。
- **[风险] gate.mjs deprecation 可能影响未知的外部引用** → 低概率。grep 确认只有 tests/ 下的 3 个文件引用 gate.mjs exports。保留 exports（加 deprecation banner）不删除，即使有外部引用也不会 break。
- **[风险] test helper 迁移到 chain.json 可能改变校验行为** → `md-phase-checks.mjs` 的 `checkGateInTransitionTable` 和 `checkNextPhaseExists` 目前对不在 gate.mjs 中的 gate（如 seed-topics-ready、hitl1-recorded）gracefully skip。迁移到 chain.json（通过 manifest 桥接）后，所有在 manifest 中的 gate 都会被校验是否在 chain 中有对应 node，覆盖面更广。需要确保新逻辑不会对合法情况（如 `final` 的 `gate: null`）产生 false positive。

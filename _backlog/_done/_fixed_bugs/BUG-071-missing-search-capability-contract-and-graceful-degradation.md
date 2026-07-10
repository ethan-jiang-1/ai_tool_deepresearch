# BUG-071 — 研究波次无"检索能力契约"且对缺失实时检索无优雅降级/阻塞面

| 属性 | 值 |
|------|-----|
| ID | BUG-071 |
| 发现日期 | 2026-07-10 |
| 最后复审 | 2026-07-10 — 由一次正式 run 实测复现 |
| 严重级别 | **P1** |
| 当前状态 | **未修（open）**。框架假设存在实时检索能力，但既不预检、也不在缺失时快速失败或降级；离线/沙箱/企业代理环境下会在 wave0 静默卡死。 |
| 来源 | `dpt_rb_ai-engineer-worlds-fair-2026` 正式 run（exploratory_map，5 topics） |
| 修复来源 | 无 |
| 子 Bug | 无（共发现次生缺陷见 §4，建议拆分） |
| 相关 | [[BUG-069]]（Agent-facing 契约不自洽，同类"无测试拦截的漂移"根因面）；`CLAUDE.md` "Real-environment E2E is deferred" |

---

## 1. 问题本质

DPT 框架的 `wave0/wave1/wave2` 阶段在**设计上硬依赖实时联网检索**（真实 fetched source + `reference/00-shared-*.md` + `rb_output_declarations.jsonl` 取证账本 + work-unit provenance 交叉校验）。但框架存在三处结构性缺失，使"检索基础设施不可用"这一**非常常见的真实环境**（CI 沙箱、air-gapped、企业代理、claude.ai 网络策略拦截）变成一个**无法优雅处理的硬阻塞**：

1. **无能力预检（capability probe）**：框架从不验证 `WebSearch` / `WebFetch` / 等价 sub-agent 检索通道是否可用，就直接进入依赖它们的波次。
2. **无优雅降级 / 离线模式**：检索不可用时，框架没有提供任何"降级研究"或"离线模式"的契约路径。
3. **无定义化的"阻塞面（blocker surface）"**：框架的 anti-cheating 规则（`shared-anti-cheating-rules.md`、各 phase §9）明确禁止编造来源、禁止把搜索摘要当证据、禁止 mock/make-believe（见 `CLAUDE.md` project-charter）。但当**产生真实证据的能力本身缺失**时，规则只说"不许造假"，却**没有告诉 Agent 该走哪条路**——既不 fail-fast，也不降级，也不把阻塞交还用户。

净效果：Agent 在 wave0 入口**静默卡死**，没有任何 gate 级信号、没有诊断、没有下一步指令，只能自行 improvise（本次 improvise 产物是 `artifacts/ANALYTICAL_SCAFFOLD.no-live-evidence.md`，一份明确标注"无实时证据"的分析骨架——这是 Agent 越权补救，不是框架支持的行为）。

---

## 2. 发现时的症状（实测序列）

2026-07-10 一次正式 run。结构阶段全绿：

- `instantiation-complete` gate ✅
- `hitl1-recorded` gate ✅（首次失败后修复，见 §4）
- `setup-ready` gate ✅
- `seed-topics-ready` gate ✅（5 个 `seed_topics/0*_*.md` 物化）
- 进入 `phase-wave0.md`，读 gate 定义确认取证要求（`per_topic_source_floor=10`、`wave0_shared_ref_total=9`、work-unit ledger 交叉校验）

随后尝试真实检索，逐步确认**本环境无任何网络出口**：

| 探针 | 命令 | 结果 |
|------|------|------|
| WebSearch（通用） | `WebSearch "OpenAI GPT"` | 仅返回 `REMINDER` 行，**无任何 result block** |
| WebSearch（专指） | `WebSearch "AI Engineer World's Fair 2026 Moscone West"` | 同上，空结果 |
| WebFetch | `WebFetch https://en.wikipedia.org/wiki/AI_Engineer` | `Unable to verify if domain en.wikipedia.org is safe to fetch. This may be due to network restrictions or enterprise security policies blocking claude.ai.` |
| curl（直连） | `curl -m 15 https://en.wikipedia.org/wiki/AI_Engineer` | `curl: (35) Recv failure: Connection reset by peer` / `HTTP 000` |

**后果**：
- wave0 gate 永远无法通过（provenance 不可能满足），但 gate 本身不会"提前"报告"检索不可用"——它会一直等到 Agent 提交缺失账本时才报 `wave0_work_unit_ledger_exists` / `per_topic_count_floor` 失败。
- Agent 被迫二选一：违反 anti-cheating 编造证据，或自行 improvise 一份无证据的骨架并显式标注。本次选择了后者（诚实但越权）。
- 用户侧表现为"研究卡住了，没下文"，正是本 bug 的症状。

---

## 3. 根因

不是某个 CLI 的 bug，而是**框架缺少"检索能力契约"这一层**：

- **R1 — 能力假设未声明、未验证**。框架的 `search_policy: work_unit_required`（phase-wave0.md §0）只在 phase 内部声明"本阶段要检索"，但没有任何在 run 启动 / wave 进入前的全局预检确认检索通道可用。`operate-work-unit.mjs` / `enter-phase.mjs` / `advance-status.mjs` 均无 capability probe。
- **R2 — 缺失即失败，但失败不可观测**。当检索返回空集（`WebSearch` 无 result block）或通道被策略拦截（`WebFetch` 网络限制、`curl` reset），框架没有把这些"零证据信号"翻译成一个明确的、可机器判定的 blocker 状态。sub-agent / Agent 只能拿到空结果，自己猜"是没搜到还是搜不了"。
- **R3 — 禁止造假 ≠ 给出替代路径**。`CLAUDE.md` 与 anti-cheating 规则构成一道"不能伪造"的硬墙，但墙的另一侧（"那我该怎么办"）是空的：没有 `capability_unavailable` 的 gate outcome、没有 `deferred_offline` 的 bundle 状态、没有把阻塞交还用户的约定 surface。Agent 在"造假（违规）"与"卡死（无指令）"之间被夹住。
- **R4 — 与范围声明的张力**。`CLAUDE.md` 写 "Real-environment E2E is deferred"，暗示框架当前面向"能联网的真实环境"。但即使如此，**面向联网环境也应在入口快速判定"当前是否在联网环境"**；当前实现把这一判定完全推给 Agent 在 wave0 自行踩坑，违反 "fail fast / clear diagnostic" 的工程原则。

---

## 4. 共发现次生缺陷（建议拆分为独立 bug）

本次 run **还**触发一个与检索无关、纯框架内部的 gate 状态不一致，单独列出供拆分：

### 4.1 bootstrap 链 `current_gate` 期望与协议漂移

- 新 bundle 默认 `current_gate: "setup_ready"` / `next_gate: "seed_topics_ready"`（由 `instantiate-run-bundle.mjs` 写入）。
- `gate-instantiation-complete.definition.json` 的 `status_value` 规则要求 `current_gate == "setup_ready"` —— 即**实例化 gate 校验的是"下一个 gate"的名字**，而非"本 gate 已通过"。
- 但 `gate-hitl1-recorded.definition.json` 要求 `current_gate == "hitl1_recorded"`（即"本 phase 的 gate 名"）。
- 两个 gate 对 `current_gate` 的语义约定**互相矛盾**：实例化 gate 用"下一 gate 名"，hitl1/setup/seed gates 用"本 gate 名"。

**实测冲突**：实例化 gate 通过后，按 `RUN.md` §2 协议应 `advance-status --to <source_gate_enum>`（source = `instantiation_complete`）。但若执行 `advance-status --to instantiation_complete`，会把 `current_gate` 设为 `instantiation_complete`，而 **hitl1 gate 要求 `current_gate == hitl1_recorded`** —— 仍会失败。本次 hitl1 gate 首次运行即报：

```
rb_status.json#/current_gate: expected "hitl1_recorded", got "setup_ready"
```

唯一能通过的方式是**直接** `advance-status --to hitl1_recorded`（把 current_gate 设为"下一 phase 的 gate"），这恰好反向印证了协议描述（`--to <source_gate>`）与实际 gate 期望（`--to <本 phase gate>`）的不一致。该操作能跑通，是因为 `hitl1_recorded` 属 `BOOTSTRAP_TARGET_NODES`，`validateSourceGateStatusSync` 对其返回 `covered:false` 不做 handoff 校验——属于侥幸绕过，而非契约自洽。

**根因**：`current_gate` 的"应等于什么"在 bootstrap 链（instantiation→hitl1→setup）上没有单一、自洽的定义；新 bundle 默认 `setup_ready` 这个"未来 gate 名"更是 off-by-one 的异常初值。协议文档（RUN.md）的 `advance-status --to <source_gate>` 描述与 gate 定义实际要求不符，迫使 Agent 自行 improvise。

**建议**：若确认本 bug 与 §1–§3 分属不同面，拆分为 `BUG-072-bootstrap-current-gate-inconsistent-with-advance-status-protocol`；优先级可低于本 bug（本次靠 workaround 已绕过，未阻断）。

---

## 5. 触发条件与影响范围

**触发条件**（任一即触发本 bug）：
- 运行环境无网络出口（沙箱、air-gapped、企业代理、`claude.ai` 网络策略拦截 `WebFetch`）。
- `WebSearch` 工具返回空集（工具被禁用或配置为空）。
- sub-agent 检索通道（dpt-source-intake 角色依赖的 WebSearch/fetch）不可用。

**影响**：
- 任何"离线/受限网络"环境下的正式 research run 会在 wave0 静默卡死，无诊断、无 fail-fast、无降级、无用户交还。
- 与 `BUG-069` 同类根因面重叠：都是"框架假设某前置条件成立却从不验证，且失败时无测试/无诊断拦截"。

**非影响**：网络正常的真实环境不受影响；结构阶段（instantiation/hitl1/setup/seed-topics）不依赖检索，全部正常。

---

## 6. 建议修复

1. **能力预检（R1/R2）**：在 run 进入 wave0 前（或在 `enter-phase phase-wave0` / `operate-work-unit claim` 路径上）加一个 capability probe：
   - 探测 `WebSearch` 是否返回非空 result；探测 `WebFetch` / `curl` 是否可达任意 stable endpoint。
   - 探针失败 → 产生一个**明确的、机器可判定的 blocker 状态**（如 `rb_status.json` 增加 `capability: { search: unavailable, reason, probed_at }`，或 gate 增加一个 `capability_unavailable` outcome）。

2. **fail-fast 而非静默卡死**：wave0 gate 在检测到 `search capability unavailable` 时，**不**进入"等 Agent 提交缺失账本"的循环，而是直接以结构化 reason 退出，reason 明确写"检索基础设施不可用，无法满足 wave0 provenance"。

3. **定义降级 / 交还面（R3）**：新增框架支持的阻塞交还路径，至少三选一或组合：
   - **离线/降级模式**：允许 Agent 在"明确标注无实时证据"的契约下产出分析骨架（即把本次 improvise 的 `ANALYTICAL_SCAFFOLD.no-live-evidence.md` 行为**正规化**为一种受支持的 bundle 状态，而非越权补救）。
   - **素材注入模式**：用户/外部把 URL/网页文本作为真实证据 ingest 进 bundle 的受支持入口（当前无此入口）。
   - **环境前移**：在 `instantiate-run-bundle.mjs` 或 RUN.md 入口就提示"本框架需要联网检索能力"，并在缺失时提前终止并说明。

4. **诊断可观测（R4）**：把"检索返回空集 / 通道被拦截"翻译成 trace 事件（如 `capability_probe` / `search_unavailable`），使 `audit-phase-status.mjs` 能直接显示"卡在 wave0 是因为检索不可用"，而非让 Agent 自行推断。

5. **（若拆分 §4.1）bootstrap 状态自洽**：统一 `current_gate` 语义为"待运行/刚通过的本 phase gate 名"，修正新 bundle 默认初值（不应是 `setup_ready` 这个未来 gate 名），并同步 RUN.md 协议描述与 gate definition 的实际期望；加一个 CI 测试断言"相邻 gate 的 current_gate 期望在链上自洽"。

---

## 7. 当前综合判定

| 维度 | 状态 | 关键证据 |
|------|------|---------|
| R1 能力预检 | ❌ 缺失 | `operate-work-unit` / `enter-phase` / `advance-status` 均无 probe |
| R2 缺失可观测 | ❌ 缺失 | 空结果/拦截只表现为"无证据"，无 machine-decidable blocker |
| R3 禁止造假≠替代路径 | ❌ 缺失 | anti-cheating 只有硬墙，无 `capability_unavailable`/`deferred_offline` surface |
| R4 范围声明张力 | ⚠️ 待对齐 | `CLAUDE.md` 说 Real-environment E2E deferred，但未定义"非联网环境如何 fail-fast" |
| §4.1 bootstrap current_gate 漂移 | ⚠️ 已绕过未修 | hitl1 gate 首次失败 `expected hitl1_recorded got setup_ready`；靠 `--to hitl1_recorded` 侥幸绕过 |

**严重级别理由（P1）**：本 bug 使框架在**一整类真实环境**（沙箱/离线/代理）下无法完成其核心职责（证据化深度研究），且**失败不快速、不诊断、不降级、不交还**——表现为用户侧"研究卡住没下文"。这与 `BUG-069` 的"Agent 必须读源码才能续跑"同源，属"无测试/无诊断拦截的漂移"根因面的又一处敞开。若框架定位包含受限网络环境，则为 P1；若严格限定"仅联网真实环境"，可降 P2 但仍应补 capability probe（fail-fast 是基本工程要求）。

**核心判断**：问题的本质不是"环境没网"，而是"框架假设有网却从不验证、且在假设落空时无契约化的失败/降级/交还路径"。把这次卡死当成一次性 env 问题会掩盖这个根因；建议按 §6 修能力预检 + 定义降级/交还面。

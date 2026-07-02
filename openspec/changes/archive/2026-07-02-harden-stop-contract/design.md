## Context

BUG-013 暴露了 `stop: no` 契约的结构性脆弱。当前防御只有一层——Markdown prose 中的 `stop: no` 字段和 `shared-silent-execution.md` 中的 SHALL NOT 声明。Agent 疲劳后，LLM 最自然的 fallback 就是 "问用户"——没有任何机制能把它拉回来。

本设计在五个层面同时加固，形成一个纵深防御体系。每一层独立生效，互为补充。即使某一层被 Agent 忽略（LLM 不可靠），其他层仍然在岗。

**约束**：Engine 保持 passive——不驱动 loop、不强制 stop、不替 Agent 做决策。所有加固都是**信号注入**：更强的 MD 文案、更早的上下文提示、更明确的 gate 诊断输出。

**OpenSpec apply 边界**：本 change 的 artifact 打磨阶段只修改 `openspec/changes/harden-stop-contract/`。实现、测试、governance registry、accepted specs、experiment playbook 等仓库外部改动只能在 artifacts 定稿后由 `tasks.md` 逐项驱动；任务勾选状态必须反映当前 repo truth，新增或未验证的任务不得标记为 complete。

## Goals / Non-Goals

**Goals:**
1. `stop: no` phase 的 Agent 极难浮出水面——五层防御共同作用
2. Agent 疲劳时有明确的 "step back, re-read" 信号（来自 gate CLI 基于 Agent-reported retry hint 的 fatigue 诊断）
3. 所有 manifest lifecycle `stop: no` phase 共享同一份静默执行契约（`shared-silent-execution.md`）
4. Phase body 中的 "ask the user" 泄露路径全部修复
5. `assessNode()` 注入的自主契约头是 Agent 读到 phase 内容的第一段文字——无法错过；Final 作为 `phase: final + stop:no + gate:null` 终端交付点使用专门的 terminal delivery header
6. 非 HITL lifecycle node 不把“本地小步骤完成”误判为可停顿点：不阶段性汇报、不 idle 汇报、不自判“没事做”，持续推进到 gate pass + `check.next`

**Non-Goals:**
- 不改变 Engine 的 passive 性质——Engine 不驱动 loop、不阻止 Agent 行为
- 不新增 frontmatter 字段——`stop: yes/no` 仍是唯一执行控制字段
- 不修改 transitions.chain.json 的路由逻辑
- 不改变 gate-loop.mjs 的纯 stateless 设计——fatigue 检测在 buildGateResult 层，不在 checkGate 层
- 不定义 gate 如何接受 silent degradation 后前进的通用机制——Agent 不得绕过 gate，也不得自行加载下一 phase

## Decisions

### D1: 五层纵深 vs 单点强化

**决策**：五层同时加固，不依赖任何单层。

**理由**：LLM 的行为不可靠。任何单层防御——无论文案多强——都可能被疲劳的 Agent 忽略。纵深防御的核心思想是：即使某一层失效，其他层仍然在岗。

```
Layer 1 (requires)    → 确保契约被加载到上下文
Layer 2 (body fix)    → 消除 phase 内部的矛盾指令
Layer 3 (doc加固)     → 契约文案本身更强、更显眼
Layer 4 (engine信号)  → gate CLI 输出明确的 fatigue 诊断
Layer 5 (注入)        → 契约头是 Agent 读到的第一段文字，无法跳过
```

**替代方案**：只在 `shared-silent-execution.md` 中加强文案。被否决——单层防御在 BUG-013 中已经失效。

### D2: 契约注入位置——assessNode vs phase body

**决策**：在 `assessNode()` 中注入，而不是手写到每个 phase body 中。注入先由 manifest membership 限定 lifecycle 覆盖，再根据 entry frontmatter 使用两种文案：

- 普通 manifest lifecycle `stop: no` 且 `gate != null`：注入 AUTONOMOUS MODE header，禁止浮出水面、提问、请求确认、报告进度
- `phase: final` 且 `stop: no` 且 `gate: null`：注入 TERMINAL DELIVERY MODE header，禁止中途交互和 post-delivery feedback loop，但允许在 final artifact 写入后进行终端交付

**理由**：
- 集中管理：一条注入逻辑覆盖所有 manifest lifecycle `stop: no` phase。未来如果文案需要调整，改一处即可。
- 无法遗漏：新 manifest lifecycle phase 只要加入 manifest 且声明 `stop: no`，就会通过同一逻辑获得注入；非 manifest relay/task surface 不会因 frontmatter 相似而被误纳入。
- 与 body 分离：注入的契约头是 "元指令"（告诉 Agent 当前处于什么模式），不跟 phase 的业务逻辑混在一起。
- Final 不被普通禁令误伤：Final 是合法终端交付点，不是中途 ask-user 泄露路径。

**Lifecycle 判定 Source of Record**：注入只覆盖 `manifest.phases[].node` 中列出的 lifecycle entry fileRef。`phase`、`gate`、`stop` frontmatter 用于选择 header variant，但不负责判定 lifecycle membership。若 active `runtime.nodesDir` 没有可解析 manifest，`assessNode()` 不做注入；绝不通过 filename、directory 或 `stop:no` frontmatter 猜测 lifecycle。这样可保证 `phase-wave2-subagent.md` 等 relay/task surface 不被误纳入。

**注入时机**：`executeLoadPlan` 成功后、`assessNode` 返回前。此时 `entry.md` 已在 content cache 中，frontmatter 已解析完毕。注入发生在 entry node 的 `entry.md` 上，不影响依赖节点的原始内容。

**普通 autonomous 注入内容格式**：
```markdown
## AUTONOMOUS MODE -- YOU SHALL NOT SURFACE TO THE USER

This is a `stop: no` phase...
[5-8 行绝对禁令]

---
```

**Final terminal delivery 注入内容格式**：
```markdown
## TERMINAL DELIVERY MODE -- DELIVER FINAL ARTIFACTS ONLY

This is the terminal `stop: no` + `gate: null` phase...
[禁止提问/确认/进度汇报；允许在 final/ artifact 写入后交付最终报告]

---
```

放在 frontmatter 之后、phase body 的 `# Phase:` 标题之前。用 `---` 水平线分隔，视觉上是一个独立的醒目块。

### D3: Fatigue 检测位置——buildGateResult vs checkGate

**决策**：attempt-aware fatigue diagnostics 放在 `buildGateResult()`（gate helpers 层），不放在 `checkGate()`（gate loop 层）。

**理由**：
- `checkGate()` 是纯 stateless 函数，加入 attempt counter 会破坏其纯性
- `buildGateResult()` 是 gate CLI 的统一结果构造入口，已经有 `inspect`/`advice` 注入能力
- fatigue 信号本质上是 "advice 的一种特殊形式"——告诉 Agent "你应该 step back"
- Agent 通过 `--attempt N` CLI flag 主动报告当前 retry attempt，Engine 被动返回诊断——符合 Agent/Engine 边界
- Engine 不追踪、不验证、也不断言 "连续失败次数"；`--attempt` 是 Agent-reported retry hint，不是 Engine-owned runtime truth

**阈值**：`fatigueThreshold = 3`。这是当前 phase body 中普遍使用的 retry limit。当 gate fail 且 Agent-reported `attemptNumber >= 3` 时触发。

**返回值变化**：`check` 对象新增 `fatigue_warning: true` 和 `step_back: true`；`advice` 数组追加 3 条 stop-mode-safe fatigue 指导信息。advice 不得默认当前 node 是 `stop:no`；如需引用静默纪律，必须写成条件式（例如 "If this invocation is for a stop:no phase..."）。

### D4: Phase body 矛盾修复策略

**决策**：所有 manifest lifecycle `stop: no` phase body 做 contradiction audit。所有 "ask the user" 路径改为静默降级；所有旧式 `state: blocked`、`escalation`、`report and stop` 指令必须改写为 silent degradation + accepted trace/log surface + gate-respecting repair/降级。

| Phase | 原行为 | 新行为 |
|-------|--------|--------|
| instantiation (name collision) | 报错停止，请求用户提供新名称 | 自动生成 hex6 后缀替代名，通过 accepted trace/log surface 记录 `silent_degradation` |
| instantiation (illegal name) | 同上 | 自动规范化名称（替换非法字符为 `-`），通过 accepted trace/log surface 记录 normalization |
| setup (3x fail) | 写 `state: blocked` | 通过 accepted trace/log surface 记录 `silent_degradation`，标记 gap 后继续 |
| rerun (seed_topics 为空) | 停止，要求用户确认全量重跑 | 默认全量重跑，通过 accepted trace/log surface 记录 `silent_degradation` |
| wave0/wave1/wave2 persistent failure | escalation / `state: blocked` / report and stop | 通过 accepted trace/log surface 记录 `silent_degradation` / `silent_gap`，换策略或降级；不得向用户请求决策 |
| final terminal delivery | 被普通 silent 禁令误判为不得交付 | `phase: final + gate:null` 时写 final artifact 后交付；不提问、不请求确认、不处理后续反馈 |

**理由**："问用户" 在 `stop: no` phase 中是绝对禁止的操作。任何需要用户输入的场景都必须有一个合理的静默降级路径。

**Gate 边界**：silent degradation 不能绕过 gate，也不能让 Agent 自行加载下一 phase。下一 phase 只能来自 gate CLI `check.next`。如果某个 gate 未来需要接受 degradation artifact 才能 pass，那必须由 gate-specific contract 另行定义；本 change 只修正 Agent 的中途浮出水面行为。

**Unpassable holding**：当 gate 明确不接受降级 artifact 且 Agent 已穷尽合法修复/换策略路径时，本 change 的稳定停靠行为是记录 `silent_unpassable` trace event 并保持当前 phase 的 non-blocked/in-progress holding 状态。它不创建 failed chain edge、不设 `state: blocked`、不浮出水面、不自行加载下一 phase。该事件是后续合法审查或 operator inspection 的审计线索，不是 phase transition authority。

### D5: 原则契约 vs 每个 node 的特殊 Stop Behavior

**决策**：`stop:no` 加固是原则性契约，不要求所有 node 的 §8 Stop Behavior 使用完全相同的模板。共通不变量由 `shared-silent-execution.md` 和 AUTONOMOUS MODE header 承担；每个 phase body 仍然用自己的业务语言说明本 node 的特殊 stop 语义。

**共通不变量**：
- 非 HITL lifecycle `stop:no` node 不是对话 checkpoint；Agent 不得做阶段性进度汇报、idle 汇报、"nothing left" / "没事做" 汇报或中途总结
- 当前 node 的目的始终是完成本 node：drain active queue、修复 gate fail、执行降级链、重新跑 gate，直到 gate pass 并读取 `check.next`
- 当 Agent 觉得“本地已经做完”时，下一步是检查 queue/status/artifacts、运行 gate、根据 inspect/advice 修复，或进入合法 silent holding；不是浮出水面
- silent degradation / silent_gap / silent_unpassable 都不是 phase transition authority；下一 phase 只能来自 gate CLI 的 `check.next`

**node-specific concretization**：
- instantiation/setup/readiness 等短 phase 重点写清：短步骤完成后仍要 reload/check/run gate，不汇报“已创建/已验证”
- seed-topics/wave0/wave1/wave2 等 queue-driven phase 重点写清：active queue、thin queue、count-floor gap、quality gap 都是继续灌料/claim/complete/re-fill/self-check 的信号
- wave0/wave1/wave2 的 stop 契约必须把质量目标放在前面：证据数量、reference 质量、cross-topic synthesis 和 Quality Self-Check 不达标时，优先换策略补足，不把质量缺口变成用户汇报
- rerun/final 保留各自例外：rerun 不自行路由；Final 是 terminal delivery exception，只在 final artifacts 写入后交付，不形成 post-delivery loop

## Risks / Trade-offs

- **[R1] 契约注入可能让 phase body 显得冗余**：Agent 会先看到注入的 AUTONOMOUS MODE 块，然后才看到 phase 自己的 "Stop Behavior" 段。两者内容有重叠。→ **Mitigation**：注入块聚焦 "当前处于什么模式 + 绝对禁令"，phase body 的 §8 Stop Behavior 聚焦 "这个 phase 特有的 stop 逻辑"。两者互补不重复。

- **[R2] `--attempt N` 依赖 Agent 配合**：疲劳的 Agent 可能忘记传 `--attempt`。→ **Mitigation**：Phase body §5 和 §7 明确指示传 `--attempt`。Layer 5 的契约头提醒 Agent 跟踪 attempt count。即使 Agent 忘记传，其他四层仍在生效。`--attempt` 是增强信号，不是必要条件。

- **[R3] 契约注入修改了 content cache 中的 `entry.md`**：如果未来有其他代码假设 `entry.md` 是原始文件内容，会遇到注入后的文本。→ **Mitigation**：`parseFrontmatter` 在注入前已完成，`entry.frontmatter` 不受影响。注入后的 `entry.md` 仅用于 Agent 阅读——这正是注入的目的。如果未来需要原始内容，可以在注入前保存副本。

- **[R4] hex6 后缀可能产生不太友好的 bundle 名**：但 name collision 在 production 中极少发生（用户不会同时跑两个同名 bundle）。如果真的发生，HITL1 阶段用户可以看到实际的 bundle 名并决定是否继续。

- **[R5] Final header 误伤交付语义**：普通 AUTONOMOUS header 如果写成绝对禁止 surface，可能让 Final 不敢交付。→ **Mitigation**：Final 使用 TERMINAL DELIVERY MODE header，禁止中途交互但明确允许最终交付。

- **[R6] `--attempt N` 被误读为 Engine 真实追踪连续失败**：这会制造假权威。→ **Mitigation**：spec 和 advice 文案统一称为 Agent-reported retry hint，Engine 只基于显式输入返回诊断。

- **[R7] 旧 phase body 文案残留**：wave0/wave1/wave2 中可能仍有 `blocked`、`escalation`、`报告并停止` 等旧语义。→ **Mitigation**：Layer 2 改为全 manifest lifecycle `stop:no` phase contradiction audit，并在 tasks 中列出 wave phase 专项清理。

- **[R8] Fatigue advice 误伤 `stop:yes` gate**：gate CLI 覆盖 HITL gates，固定输出 "this is stop:no" 会对 `stop:yes` node 撒谎。→ **Mitigation**：GSK-006 的 advice 文案必须 stop-mode-safe，不默认当前 node 是 `stop:no`。

- **[R9] Lifecycle 注入误伤 relay/task surface**：`phase-wave2-subagent.md` 等文件也可能含 `stop:no`。→ **Mitigation**：只以 manifest membership 判定 lifecycle；frontmatter 和文件名不作为 lifecycle authority。

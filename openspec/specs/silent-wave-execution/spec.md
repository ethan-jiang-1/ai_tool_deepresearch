# silent-wave-execution

> req: SWE-001, SWE-002

## Purpose

Silent Wave Execution 定义了 Agent 在用户缺席（静默自主阶段）时的行为契约——在 wave0/1/2 执行期间完全自主、不浮出水面、遇错按降级优先级链自行处理、将 escalation 改写为降级并完整 trace、到达合法浮出水面点（HITL2）时汇总报告静默期积累的降级。

## Requirements

### Requirement: Silent wave execution contract

在 `stop: no` phase 执行阶段，Agent SHALL 自主执行，不提问、不请求确认、不展示 A/B 选择、不把中途阻塞报告给用户。静默阶段包括：instantiation、setup、seed-topics、wave0、wave1、wave2、readiness、rerun，以及终端交付 phase final。合法浮出水面点为以下 3 个（2 个交互式决策点 + 1 个终端交付点）：

- **交互式决策点**：HITL1 和 HITL2——声明 `stop: yes`，Agent 停止等待用户输入
- **终端交付点**：Final——声明 `stop: no` 且 `gate: null`，Agent 写入 `final/` artifact 后交付最终报告并自然终止，不等待用户输入、不请求确认、不处理 post-delivery feedback

非终端 `stop: no` phase（除 Final 外）Agent SHALL NOT 停止等待用户、报告进度、或向用户呈现任何中途状态。Final 不是中途状态报告；Final 的唯一允许输出是基于 `final/` artifact 的终端交付。

非终端 `stop: no` phase 是 active autonomous work loop，不是对话轮次。Agent SHALL NOT 将 "no obvious local next step"、"active queue 暂时为空"、"一个子步骤完成"、"gate fail 多次" 或 "quality gap 尚未补齐" 解释为可以汇报阶段性进展、idle 状态、"nothing left" 或 "没事做"。当本地工作看似完成时，Agent SHALL 检查 queue/status/artifacts，运行 gate，读取 inspect/advice 修复，执行降级链，或在合法条件下记录 silent holding；不得浮出水面。

每个 manifest lifecycle `stop: no` phase SHALL 通过其 frontmatter `requires` 字段加载 `shared/shared-silent-execution.md`，这是 workflow-node-contract 中 universal silent execution dependency 的强制性要求。该文件定义了静默执行的完整行为契约，包括绝对禁令（§0）、降级优先级链（§1）、状态规则（§2）、冲突覆盖（§3）、用户消息处理（§4）和疲劳抵抗（§5）。Relay/sub-agent task surfaces（例如 `phase-wave2-subagent.md`）不属于本 requirement 的 lifecycle phase 范围。Agent SHALL 在进入 lifecycle phase body 之前阅读该契约。

在静默自主阶段中，Agent SHALL 自行处理所有执行问题，遵循以下降级优先级链（从先到后）：

**降级优先级链（Degradation Priority Chain）：**
1. **重试（Retry）**：网络波动、临时不可用 → 等待后重试（遵循 `shared-repair-guidance.md` 已有修复策略），阻塞消除后自动恢复
2. **换源（Alternative Source）**：特定 URL 不可访问、爬取被拒 → 搜索替代源（更换 domain、更换搜索策略），不降低 evidence quality tier 要求
3. **降级方法（Method Degradation）**：当前方法路径全部失败 → 切换到替代方法（如 WebFetch 不可用 → curl → node fetch → python3），记录方法切换链
4. **标记 gap（Mark Gap）**：所有替代方案已穷尽、源和方法均不可用 → 通过 accepted trace/log surface 在 `rb_trace.jsonl` 中标记为 `silent_gap`，记录对 must-answer 问题的影响评估（`gap_impact: none|partial|blocks_must_answer`），继续到下一个 task
   - `gap_impact: blocks_must_answer` 时 Agent SHALL 在周围 topic 中搜索替代覆盖路径，但不浮出水面

Agent SHALL 在每个降级步骤通过 accepted trace/log surface（例如 `log-event.mjs --event` 或 accepted trace writer）记录到 `rb_trace.jsonl`：原问题、已尝试的恢复步骤（按优先级链顺序）、最终降级决策、影响评估（`gap_impact`）。Agent SHALL NOT hand-edit or directly append JSONL outside an accepted trace/log surface.

Agent SHALL NOT 在任何静默阶段因阻塞而向用户请求决策（包括但不限于 "网络不通，是否等待？"、"源不可访问，是否跳过？"、"已完成 XX，是否继续？"、"遇到错误，是否重试？"、"请选择 A 或 B"）。Final SHALL NOT 请求确认或提供选项；它只交付已写入的 final artifact。

用户可以在静默阶段关闭终端——系统 SHALL 能从 durable state（`rb_status.json`、`rb_profile.yaml`、`rb_trace.jsonl`）恢复，Agent 恢复时 SHALL 通过 `rb_status.json` 定位当前 phase 继续执行，SHALL NOT 重新开始已完成的工作。

**静默阶段优先级覆盖（Silent-Phase Priority Override）：**

在静默阶段，以下来自其他 shared 文件的规则被本 requirement 的静默纪律显式覆盖：

| 被覆盖的规则 | 来源 | 静默阶段改写 |
|-------------|------|------------|
| "修复需要用户 decision 或权限 → escalation/block" | `shared-repair-guidance.md` Escalation 段 | → 降级处理（按降级优先级链），不 escalation，不 block |
| "连续 repair 达到 retry limit 且无进展 → escalation" | `shared-repair-guidance.md` Retry Limit 段 | → 降级处理（按降级优先级链），不 escalation |
| "不能在 escalation 条件触发后继续假装一切正常" | `shared-anti-cheating-rules.md` 规则 3 | → 在静默阶段，"继续执行"不是"假装正常"——降级 + trace 本身就是静默阶段的正确行为。本规则在静默阶段不适用 |
| "遵守 3 次 retry limit；no-progress 或超限后 escalation→block" | `shared-anti-cheating-rules.md` 规则 3 | → 3 次 retry 后不 escalation/block，改为降级 + trace + 继续，按降级优先级链选择下一步 |

Agent SHALL NOT 因 escalation 条件满足而浮出水面。Pre-HITL2 静默阶段（instantiation、setup、seed-topics、wave0、wave1、wave2）积累的降级和未解决阻塞 SHALL 在到达 HITL2 时汇总给用户。Rerun 路径中的静默降级 SHALL 在下一次 HITL2 decision brief 中汇总。Readiness 中若出现降级 SHALL 回到当前 phase 内修复或记录不可通过状态，不得把 Final 当作审查点。Final 只交付最终报告，不承担静默期降级决策审查或 post-delivery repair 对话。

**降级期间的 `rb_status.json` state 规则：**

Agent 在静默阶段降级时 SHALL NOT 将 `rb_status.json` 的 state 设为 `blocked`。降级期间的 state 行为：
- 当前 phase 的 run state SHALL 保持 `in_progress`（不写入 `blocked`，不触发 stop）
- 每次降级 SHALL 通过 accepted trace/log surface 在 `rb_trace.jsonl` 中写入 `silent_degradation` event，包含：原 escalation 原因、降级决策（按优先级链选择的具体步骤）、影响评估（对 must-answer 问题的影响）
- 如果降级类型为 mark gap 且 `gap_impact: blocks_must_answer`，通过 accepted trace/log surface 在 `rb_trace.jsonl` 中额外写入 `silent_gap_critical` event，但不改变 `rb_status.json` state
- Agent SHALL NOT 写入 `rb_status.json` 的 `blocked` state 或以任何方式触发 stop——静默阶段的降级不构成 lifecycle block

**疲劳抵抗（Fatigue Resistance）：**

Agent 疲劳是静默执行失败的主要原因之一。当 gate repeatedly fails 时，Agent 容易出现决策质量退化——"问用户" 是 LLM 最自然的 fallback。为抵抗疲劳：

1. **Self-Check Protocol**：当同一个 gate fail 达到 3 次时，Agent SHALL 暂停修复、重新阅读当前 phase 的完整 instructions 和 `shared-silent-execution.md` §0，确认自己处于 `stop: no` phase，然后选择与之前不同的修复策略再重试
2. **Fatigue-Aware Gate CLI**：Agent SHALL 在 gate CLI 重试时传递 `--attempt N`（N 为 Agent-reported retry attempt hint）。Engine 在 N ≥ 3 且 gate fail 时注入 `fatigue_warning: true` + `step_back: true` + 明确的 "不要问用户" advice。Engine 不追踪也不验证真实连续失败次数
3. **Structural vs. Fixable Failure**：Agent SHALL 区分结构性失败（gate 规则在当前条件下根本不可满足）和可修复失败（产出物可被修正）。结构性失败应降级（mark gap + trace + 改变策略），可修复失败应换策略重试。无限制循环在两种情况下都是错误的
4. **降级不是失败**：使用降级优先级链是正确的自主行为，不是失败。当无法确定是否应该降级时，优先选择降级——这比错误地浮出水面要好

**Gate 边界（不可绕过）**：silent degradation 不是 phase transition authority。Agent SHALL NOT 因标记 gap 或写入 `silent_degradation` 而自行加载下一 phase。下一 phase 只能来自 gate CLI `check.next`。如果当前 gate 不接受降级后的 artifact，Agent SHALL 继续在当前 phase 内修复或换策略。若同一 gate 被判定为结构性不可通过，Agent SHALL 记录 `silent_unpassable` trace event（通过 accepted trace/log surface，包含 gate、phase、attempt、reason、exhausted_strategies、next_legal_review_hint），停止重复同一无效修复策略，并保持当前 phase 的 runtime state 为 non-blocked/in-progress holding 状态。`silent_unpassable` SHALL NOT authorize loading the next phase, SHALL NOT set `rb_status.json` to `blocked`, and SHALL NOT surface to the user; it is an audit marker for later legal review or operator inspection.

#### Scenario: Agent handles errors silently during any lifecycle stop:no phase
- **WHEN** Agent 在任意 manifest lifecycle `stop: no` phase 执行中遇到阻塞
- **THEN** Agent SHALL 按降级优先级链自行处理
- **AND** Agent SHALL 通过 accepted trace/log surface 将处理过程写入 `rb_trace.jsonl`
- **AND** Agent SHALL NOT 向用户报告阻塞或请求决策

#### Scenario: User closes terminal during silent phase
- **WHEN** 用户在静默自主阶段关闭终端
- **THEN** 系统 SHALL 能够从 durable state 恢复
- **AND** Agent 恢复时 SHALL 通过 `rb_status.json` 定位当前 phase，继续执行
- **AND** Agent SHALL NOT 重新开始已完成的工作

#### Scenario: Agent must not stop mid-phase to ask user
- **WHEN** Agent 在 manifest lifecycle `stop: no` phase 中完成一个操作
- **THEN** Agent SHALL 继续执行或运行 gate
- **AND** Agent SHALL NOT 输出 "已完成 XX，是否继续？" 等停止等待消息
- **AND** Agent SHALL NOT 向用户展示任何形式的 A/B 选择或确认请求

#### Scenario: Agent must not surface idle or progress summaries

- **WHEN** Agent 在非终端 manifest lifecycle `stop: no` phase 中认为本地小步骤已经完成或暂时没有明显下一步
- **THEN** Agent SHALL inspect queue/status/artifacts or run the current gate
- **AND** Agent SHALL repair from gate inspect/advice, continue node-specific work, or record a legal silent holding event
- **AND** Agent SHALL NOT report progress, summarize "done so far", claim "nothing left", or wait for the user

#### Scenario: Gate pass is the non-terminal phase objective

- **WHEN** a non-terminal manifest lifecycle `stop: no` phase has not received gate CLI `check.next`
- **THEN** Agent SHALL remain inside the current node's work/repair/degradation loop
- **AND** Agent SHALL NOT treat local completion, silent degradation, or an empty active window as phase completion
- **AND** Agent SHALL NOT load another lifecycle node without `check.next`

#### Scenario: Final delivers without becoming an interaction loop
- **WHEN** Agent 执行 Final phase
- **THEN** Agent SHALL write at least one final artifact under `final/`
- **AND** Agent MAY deliver the final report as the terminal output
- **AND** Agent SHALL NOT ask for confirmation, offer A/B choices, or handle post-delivery feedback inside Final

#### Scenario: Repair escalation degrades silently
- **WHEN** Agent 在静默阶段遇到需要 escalation 的情况
- **THEN** Agent SHALL 按降级优先级链选择下一步
- **AND** Agent SHALL 通过 accepted trace/log surface 将降级决策写入 `rb_trace.jsonl`
- **AND** Agent SHALL NOT 将 `rb_status.json` state 设为 `blocked`
- **AND** Agent SHALL NOT 浮出水面请求用户决策

#### Scenario: Cumulative degradations summarized at HITL2
- **WHEN** pre-HITL2 静默阶段或 rerun 路径积累了一个或多个降级事件
- **THEN** Agent 在对应的 HITL2 decision brief 中 SHALL 包含 "静默期降级汇总" section
- **AND** 汇总 SHALL 帮助用户判断累积降级是否影响研究质量
- **AND** Final SHALL NOT be used as a degradation review checkpoint

#### Scenario: User sends message during silent phase
- **WHEN** 用户在静默阶段主动发送消息
- **THEN** Agent MAY 以单轮、陈述式状态回复
- **AND** Agent SHALL NOT 因用户消息而停止等待——回复后继续执行

#### Scenario: Agent self-checks after repeated gate failure
- **WHEN** 同一个 gate 连续 fail 达到 3 次
- **THEN** Agent SHALL 暂停修复，重新阅读当前 phase 的完整 instructions 和 `shared-silent-execution.md` §0
- **AND** Agent SHALL 选择与之前不同的修复策略再重试
- **AND** Agent SHALL NOT 向用户展示 A/B 选择或请求决策

#### Scenario: Structural gate failure triggers degradation not loop
- **WHEN** gate 规则在当前条件下根本不可满足（结构性问题，非产出物质量不足）
- **THEN** Agent SHALL 降级（mark gap + trace + 改变修复策略）
- **AND** Agent SHALL NOT 无限制循环重试同一个不可修复的 gate
- **AND** Agent SHALL NOT bypass the gate or load the next phase without gate CLI `check.next`

#### Scenario: Unpassable gate enters silent holding state
- **WHEN** a manifest lifecycle `stop: no` phase has exhausted legal repair/degradation strategies and the gate still does not return `check.next`
- **THEN** Agent SHALL record `silent_unpassable` through an accepted trace/log surface
- **AND** Agent SHALL keep `rb_status.json` out of `blocked`
- **AND** Agent SHALL NOT ask the user, present options, or load another phase
- **AND** Agent SHALL stop repeating the same no-progress gate invocation until a legal external change or later legal review path exists

### Requirement: Fatigue resistance in silent execution contract

`shared-silent-execution.md` SHALL include fatigue resistance guidance (§5) that instructs the Agent to self-check after repeated gate failures and distinguish structural from fixable failures. The guidance SHALL be part of the behavioral contract loaded by all manifest lifecycle `stop: no` phases via the `requires` dependency mechanism.

The fatigue resistance section SHALL cover:

- **Self-Check Protocol**: specific steps to take when a gate has failed 3+ consecutive times
- **Gate CLI Fatigue Signal**: instruction to pass Agent-reported `--attempt N` to gate CLI on retries
- **Structural vs. Fixable Failure**: criteria to distinguish failures that require strategy change from failures that require degradation
- **Degradation Affirmation**: explicit statement that degradation is correct autonomous behavior, not failure

Additionally, `shared-silent-execution.md` SHALL include an absolute prohibition preamble (§0) that appears before §1 and states the core contract in the strongest possible terms: the Agent SHALL NOT surface to the user during non-terminal `stop: no` phases. Gate failure is not an emergency. User-facing surfacing is forbidden, including questions, confirmations, progress reports, idle/no-work summaries, A/B choices, and "done so far" updates. Final SHALL be explicitly named as the terminal delivery exception: delivery is allowed after final artifacts exist, but questions, confirmations, progress reports, A/B choices, and post-delivery feedback handling are still forbidden.

#### Scenario: Agent reads fatigue resistance before phase body

- **WHEN** a manifest lifecycle `stop: no` phase is loaded via `assessNode()`
- **THEN** `shared-silent-execution.md` SHALL be in the dependency closure before the phase body
- **AND** the Agent SHALL read §0 (absolute prohibition) and §5 (fatigue resistance) before executing the phase

#### Scenario: Fatigue guidance instructs pass --attempt N

- **WHEN** the Agent reads the fatigue resistance section
- **THEN** the guidance SHALL instruct passing `--attempt N` to gate CLI on retries
- **AND** the guidance SHALL explain that N is Agent-reported, not Engine-verified
- **AND** the guidance SHALL explain that the engine returns `step_back: true` when N ≥ 3 and the gate fails

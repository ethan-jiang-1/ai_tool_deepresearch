## Why

当前 framework 已有 HITL1、静默研究、HITL2→rerun 和 Final 交付的机械骨架，但用户体验仍被内部 enum、字母菜单和无信息增益的二次确认主导；同时，silent contract 把“框架不主动打扰”过度实现成了“用户主动说话也不回应”。这与 Agent 作为智能助手的责任相反，也让真实使用变得僵硬。

本 change 落实 `_backlog/plans/deep-research-iterative-refinement-positioning.md` 的产品姿态，并以 `guidelines/evolution-helper-oriented-agent.md` 与 `guidelines/evolution-simple-reliable-control.md` 为复核约束：框架主动邀请并等待用户决定的位置只有 HITL1 和 HITL2，中间默认静默自主，Final 只作终端交付。

## What Changes

- 将 HITL1 收敛为一次有意义的研究方向对齐：Agent 先给出对目标、must-answer、topic preview 和研究投入的一个推荐，用户用自然语言接受或修正，Agent 映射到现有 profile/topic owners 并执行后续机械链。
- 将 HITL2 收敛为“当前研究审阅 + 一个 Agent 推荐”：用户可以直接说交付、换视角、继续补某个方向、纠错或停止，Agent 仅在 HITL2 accepted decision boundary 内映射到现有五个 enum。
- 删除 shared blanket second-confirmation rule。已经清楚表达的用户决定本身就是确认；只在实质歧义、真实权限/成本扩张或不可逆风险边界请求最小确认。
- 保留非 HITL `stop:no` phase 的静默自主约束：框架不主动发 acknowledgement、进度、错误、idle 或确认请求，Agent 依据现有 direct feedback 自行 repair/rerun/continue。
- 允许 Agent 在正常 conversation/message boundary 回应用户主动发来的消息。回应不是第三个 HITL，不创建 checkpoint、permission、mutation authority、pause state 或 interrupt lifecycle；一条中途消息也不承诺会被持久化或立即改变当前 run。
- **BREAKING**：保留现有无状态 continuation cue 与 `next_action`，但将非终端 `stop:no` cue 的 `interaction: prohibited` 统一改为 `interaction: do_not_initiate`。该值只表达框架不主动联系用户，不是 interaction authority。`stop:yes` 的 `required`、Final 的 `terminal_delivery` 和全部 `next_action` 保持不变。
- 同步收窄 accepted specs、shared silent guidance、Engine 注入的 autonomous header、Agent-facing command/entry docs 和 continuation cue 消费面，不留互相矛盾的指令。
- 在 `project-charter.md` 短写 iterative research posture，并让 `RUN.md`、framework README 与 HITL briefs 统一呈现 HITL1 -> silent autonomy -> HITL2 -> Final delivery。不新增 evolution guideline。
- 清理 rerun limit 的 truth drift：删除 phase/shared docs、requirement registry 描述和 integration tests 中旧的 `<3` 副本，让文档与 boundary test 从 active `gate-rerun-ready.definition.json` 获取当前上限。本 change 不改变 active limit 或 loop-protection 行为。
- 增加 focused unit/integration 验证和真实 `agent_flow_e2e`，覆盖 HITL1 自然语言接受、HITL2 自然语言 rerun、中段不主动浮出，以及用户主动回合不成为 lifecycle/permission 的边界。

## Capabilities

### New Capabilities

无。本 change 只收敛现有责任明确的 capability，不创建一个与 HITL、silent execution 和 phase contract 重叠的“iterative interaction”总包。

### Modified Capabilities

- `hitl-ux`：HITL1/HITL2 改为 Agent 推荐优先、自然语言可接受/修正、无 blanket second confirmation 的对话环。
- `pre-research-phase-content`：HITL1 phase 接受自然语言决定，并在决定进入 accepted owner 后把 profile/topic/Gate 机械执行交还 Agent。
- `content-delivery-phase-content`：HITL2 以 research review 和一个推荐呈现，自然语言仅在该 accepted boundary 内映射到现有 decision owner；Final 保持 terminal delivery。
- `silent-wave-execution`：silent 表示不主动打扰，不再禁止对用户主动消息的正常回应；同时更新 stop:no gate/work-unit continuation cue 语义。
- `workflow-node-contract`：Engine 注入的 autonomous header 与新 silent 语义一致，不再声称所有 user interaction 绝对禁止。
- `cli-phase-transition`：`enter-phase` 和 `advance-status` 的 stop:no continuation projection 输出 `do_not_initiate`，保持现有 next action、locator 和 authority boundary。
- `delegated-work-units`：成功 claim 的 continuation projection 输出 `do_not_initiate`，仍立即指向 inspect/poll，不改变 work-unit 状态或轮询义务。
- `agent-command-surface`：区分“框架主动邀请并等待决定”与“用户主动发起对话”，同时保持用户决定不创造 permission 或缺失 capability。
- `run-entry`：入口文档统一呈现两个主动 HITL、中段默认静默自主、用户主动消息的边界与 Final terminal delivery。
- `rerun-incremental-node`：rerun legality 和 loop protection 不再在 prose/registry/test 复制具体 limit，boundary test 从 active Gate definition 读取当前规则，不改变实际上限。

## Impact

- **Direct Source of Record**：HITL durable decision 仍是 `rb_profile.yaml` + 现有 HITL Gate；phase 交互位置仍是 manifest/frontmatter `stop`；路由仍是 transition table + Gate `check.next`；rerun limit 仍是 `DPT_FRAMEWORK/schema/gate_definitions/gate-rerun-ready.definition.json`。Continuation cue 只是这些 direct facts 的无状态 projection。
- **最短合法闭环**：`HITL1 Agent recommendation -> user intent -> existing profile/topic owners -> silent autonomous execution -> HITL2 review + one recommendation -> user intent -> existing profile decision/Gate/route -> Final or rerun`。
- **Net simplification**：删除统一二次确认、减少内部 enum/phase 暴露、删除“用户不存在”的过度 silent 规则、消除 header/cue 冲突和 rerun-limit 副本；不新增 state、Gate、CLI、transition、checker、controller、guideline 或 retry/recovery tree。
- **责任边界**：用户只决定新的研究语义、风险、成本或权限；决定进入现有 accepted owner/path 后，Agent 执行 profile/topic operation、Gate、handoff、status sync、repair 和后续研究；Engine 继续独占 schema、Gate、transition、receipt、trace 的确定性 verdict。用户主动消息本身不扩大任何一层的 authority。
- 影响面集中在 `DPT_FRAMEWORK/workflows/`、continuation projection helper/调用方、Agent-facing docs、focused `tests/`、`experiments_playbook/` 与 OpenSpec governance 描述。不新增 npm 依赖，不修改 runtime schema 或 bundle migration。
- 本 change 修改 `DPT_FRAMEWORK/` 行为与 Agent-facing cue enum，需要 version bump：target version 为 **v0.32**。Apply 时将同步 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` banner/current-release。

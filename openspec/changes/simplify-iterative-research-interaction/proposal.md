## Why

当前 framework 已有 HITL1、静默研究、HITL2→rerun 和 Final 交付的机械骨架，但用户体验仍被内部 enum、字母菜单和无信息增益的二次确认主导；同时，silent contract 把“框架不主动打扰”过度实现成了“用户主动说话也不回应”。这与 Agent 作为智能助手的责任相反，也让真实使用变得僵硬。

本 change 落实 `_backlog/plans/deep-research-iterative-refinement-positioning.md` 的产品姿态，并以 `guidelines/evolution-helper-oriented-agent.md` 与 `guidelines/evolution-simple-reliable-control.md` 为复核约束：框架主动邀请并等待用户决定的位置只有 HITL1 和 HITL2，中间默认静默自主，Final 只作终端交付。

## What Changes

- 将 HITL1 收敛为一次有意义的研究方向对齐：Agent 先给出对目标、must-answer、topic preview 和研究投入的一个推荐，用户用自然语言接受或修正，Agent 映射到现有 profile/topic owners 并执行后续机械链。
- 将 HITL2 收敛为“当前研究审阅 + 一个 Agent 推荐”：用户可以直接说交付、换视角、继续补某个方向、纠错或停止，Agent 仅在 HITL2 accepted decision boundary 内映射到现有五个 enum。
- 删除 shared blanket second-confirmation rule。已经清楚表达的用户决定本身就是确认；只在实质歧义、真实权限/成本扩张或不可逆风险边界请求最小确认。
- 保留非 HITL `stop:no` phase 的静默自主约束：框架不主动发 acknowledgement、进度、错误、idle 或确认请求，Agent 依据现有 direct feedback 自行 repair/rerun/continue。
- 将 `repair_kind` 收窄为行动责任提示，而不是交互时机授权。`user_decision|external_action|missing_contract` 在 `stop:no` 中仍向 Agent 保留最小诚实边界，但 hint 本身不得触发用户提问、批准请求、状态输出或等待；是否主动邀请用户只服从当前 lifecycle `stop` contract。
- 收窄 stop:no Gate/Inspect 的 action-bearing `repair`/`advice[]` producer：保留真实 `repair_kind`、最小缺失事实、owner boundary 和 same-check rerun，但删除“现在问用户”“返回 HITL”“surface blocker”等交互指令；已有 mechanical owner 时修正误标为 `user_decision` 的 finding。Gate verdict、route 和非权威 `failure_message`/definition bytes 不变。
- Agent 在正常 conversation/message boundary 收到用户主动消息时应当回应，而不是假装用户不存在。回应不是第三个 HITL，不创建 checkpoint、permission、mutation authority、pause state 或 interrupt lifecycle；一条中途消息也不承诺会被持久化或立即改变当前 run。
- Final 的 `non-interactive` 同样表示不主动提问/等待/形成循环，而不是忽略用户当前回合。Final artifact 前只回答 verified direct facts/最小边界且不冒充 delivery；terminal cue 不变；artifact 后只有明确 rerun 可走现有 audited recovery。
- **BREAKING**：保留现有无状态 lifecycle continuation cue 与 `next_action`，但将由直接 node `stop:no` authority 派生的 `interaction: prohibited` 统一改为 `interaction: do_not_initiate`。该值只表达框架不主动联系用户，不是 interaction authority。Work-unit claim 没有读取 lifecycle `stop`，因此它的 continuation 删除重复 `interaction` 字段，只保留 `next_action: inspect_and_poll_claimed_work`。`stop:yes` 的 `required`、Final 的 `terminal_delivery` 和全部 `next_action` 保持不变。
- 同步收窄 accepted specs、shared silent guidance、Engine 注入的 autonomous header、Agent-facing command/entry docs 和 continuation cue 消费面，不留互相矛盾的指令。
- 在 `project-charter.md` 短写 iterative research posture，并让 `RUN.md`、framework README 与 HITL briefs 统一呈现 HITL1 -> silent autonomy -> HITL2 -> Final delivery。不新增 evolution guideline。
- 清理 rerun limit 的 truth drift：删除 phase/shared docs、requirement registry、integration tests 和 active experiment/runner index 中旧的 `<3`/`rerun_count=3` 副本，让文档、boundary test 和 experiment 从 active `gate-rerun-ready.definition.json` 获取当前上限。本 change 不改变 active limit 或 loop-protection 行为，也不触碰独立 fatigue threshold。
- 在 HITL2 推荐或接受 rerun 前，就近用 current profile count（含 rerun phase 必需 increment）与一个共享纯 evaluator 排除已知不可执行路径；同一 evaluator 替换 rerun-ready Gate 与 post-final recovery 内现有的近似判断，HITL2 只读调用只消费 closed availability facts。正式 legality 仍由现有 rerun-ready Gate 裁决，不新增 CLI/Gate/state 或复制数值。
- 闭合 post-final rerun 的既有合法机械组合：canonical topic add/safe-remove commit 后，`apply-research-style.mjs` 与 C5 复用一个纯 style-parameter computation；CLI 仍是唯一 writer。C5 保留原 event-bound style + recorded count delta 的兼容形状；一旦 style fields 变化，只接受 event-bound style definition + 当前 committed registry 的完整精确投影。Style 已写而 count 尚未递增的合法崩溃窗口回到现有 phase-rerun count owner，其他 profile 变化继续 fail closed。
- 删除 C5/handoff 中“看到任意后续 rerun-ready pass 就算 descendant”的过早短路；accepted lineage 只有在既有 normal Gate、route-bound load、transition/status synchronization 与 current coordinate 连续一致时才投影 current owner，孤立 pass 或手工状态漂移继续阻塞。
- 删除两套无 owner 的 HITL 微控制：固定第 3/5 轮轻推计数改为 Agent 根据语义是否停滞来总结/推荐；`gap_queue_backed` 文本暗号改为 Agent 先提出具体 must-answer、用户接受或修正后写入现有 owner。不新增计数器、parser、state 或 schema 字段。
- 增加 focused unit/integration 验证和真实 `agent_flow_e2e`，覆盖 Agent 从 production guidance 生成 recommendation、HITL1 自然语言接受后自行完成真实 bounded probe/Gate（available 时进入 bounded silent segment，honest unavailable 时留在 HITL1）、HITL2 自然语言 rerun，以及同一用户主动回合用例在 non-terminal 与 Final 两种 production header 下得到回应但不成为 lifecycle/permission 的边界。

## Capabilities

### New Capabilities

无。本 change 只收敛现有责任明确的 capability，不创建一个与 HITL、silent execution 和 phase contract 重叠的“iterative interaction”总包。

### Modified Capabilities

- `hitl-ux`：HITL1/HITL2 改为 Agent 推荐优先、自然语言可接受/修正、无 blanket second confirmation 的对话环。
- `pre-research-phase-content`：HITL1 phase 接受自然语言决定，并在决定进入 accepted owner 后把 profile/topic/Gate 机械执行交还 Agent。
- `content-delivery-phase-content`：HITL2 以 research review 和一个可执行推荐呈现，自然语言仅在该 accepted boundary 内映射到现有 decision owner；Final 保持 terminal delivery，并回应用户主动回合而不形成 Final loop。
- `silent-wave-execution`：silent 表示不主动打扰，不再禁止对用户主动消息的正常回应；同时更新 stop:no gate/work-unit continuation cue 语义。
- `check-inspect-feedback`：`repair_kind` 只分配行动责任；非终端 stop:no hint 保留最小 Agent-facing 边界，但不自行授权用户交互或等待。
- `research-wave-phase-content`：Wave failure、timeout-preflight `block` 与 delegated actor blocker 服从 Wave 的 stop:no contract，不再由 hint/classification 自动升级成用户请求。
- `workflow-node-contract`：Engine 注入的 autonomous header 与新 silent 语义一致，不再声称所有 user interaction 绝对禁止。
- `gate-skeleton`：stop:no action-bearing feedback 保持 interaction-placement-neutral；fatigue advice 保留既有 threshold/verdict，但把绝对禁言提示收窄为 framework 不主动浮出，避免 Gate failure 重新注入旧语义。
- `cli-phase-transition`：`enter-phase` 和 `advance-status` 的 stop:no continuation projection 输出 `do_not_initiate`，保持现有 next action、locator 和 authority boundary。
- `delegated-work-units`：成功 claim 的 continuation projection 只保留 `inspect_and_poll_claimed_work`，不再复制 lifecycle interaction placement；dry-submit boundary 也服从 lifecycle interaction contract，仍不改变 work-unit 状态、验证、修复或轮询义务。
- `agent-command-surface`：区分“框架主动邀请并等待决定”与“用户主动发起对话”，同时保持用户决定不创造 permission 或缺失 capability。
- `run-entry`：入口文档统一呈现两个主动 HITL、中段默认静默自主、用户主动消息的边界与 Final terminal delivery。
- `rerun-incremental-node`：rerun legality 和 loop protection 不再在 prose/registry/test 复制具体 limit，boundary test 从 active Gate definition 读取当前规则，不改变实际上限。
- `post-final-recovery`：fresh eligibility 与 pre-commit revalidation 复用同一 next-increment evaluator；event-bound increment 后按 recorded delta 识别 accepted lineage，再交给 formal rerun-ready Gate，不把 replay 误判成下一次 rerun。
- `research-styles`：把现有 style 参数数学抽成 CLI/C5 共用的纯计算；CLI 保持唯一写入 owner，C5 只读验证精确投影。
- `runtime-reentry-debuggability`：reentry 消费同一个 C5 stage 结果，接受合法 style projection，并要求 descendant Gate/load/transition/status 连续性而不是信任孤立 pass。
- `version-management`：删除 accepted VEM-004 中历史 `v0.7` 的永久当前值，保持“proposal 决定版本、apply 使用同一版本”的稳定规则；本 change 的 v0.32 target 只保留在 proposal/tasks/CHANGELOG 历史面。

## Impact

- **Direct Source of Record**：HITL durable decision 仍是 `rb_profile.yaml` + 现有 HITL Gate；phase 交互位置唯一服从 manifest/frontmatter `stop`；`repair_kind` 只提供行动责任/最小边界；路由仍是 transition table + Gate `check.next`；rerun limit 仍是 active Gate definition；style definition + committed canonical registry 仍决定现有 CLI 的精确参数投影；normal Gate/load/transition/status 仍决定 descendant lifecycle truth。Lifecycle/claim cues 和 C5/reentry result 都只是这些 direct facts 的无状态 projection。
- **最短合法闭环**：`HITL1 Agent recommendation -> user intent -> existing profile/topic owners -> silent autonomous execution -> HITL2 review + one available recommendation -> user intent -> existing profile decision/Gate/route -> Final or rerun`。Rerun availability 直接读完整 current profile + shared evaluator 对 active rule 的结果；只有 supported exhaustion 才留在 HITL2 询问 new-bundle 决定，unsupported input 只报告其直接 contract boundary。
- **Net simplification**：删除统一二次确认、固定轮次轻推、文本暗号伪状态，减少内部 enum/phase 暴露，删除“用户不存在”的过度 silent 规则，消除 producer/consumer 两侧的 hint 自动 escalation、shared override table、header/cue 冲突、claim interaction 副本和 rerun-limit/历史版本副本；一个窄纯 evaluator 取代三份 rerun-limit 判断，一个纯 style computation 取代 CLI 数学与两个 C5 count-only comparator 的分叉，existing normal handoff truth 取代 orphan-pass descendant short circuit。不新增 state、Gate、CLI、transition、controller、receipt、guideline 或 retry/recovery tree。
- **责任边界**：用户只决定新的研究语义、风险、成本或权限；决定进入现有 accepted owner/path 后，Agent 执行 profile/topic operation、Gate、handoff、status sync、repair 和后续研究；Engine 继续独占 schema、Gate、transition、receipt、trace 的确定性 verdict。用户主动消息本身不扩大任何一层的 authority。
- 影响面集中在 `DPT_FRAMEWORK/workflows/`、continuation/C5/handoff projection helper 及调用方、现有 style CLI 的内部计算边界、Gate fatigue advice、Agent-facing docs、focused `tests/`、`experiments_playbook/` 与 OpenSpec governance/version 描述。不新增 npm 依赖，不修改 runtime schema、C5 event/manifest/envelope 或 bundle migration。
- 本 change 修改 `DPT_FRAMEWORK/` 行为与 Agent-facing cue enum，需要 version bump：target version 为 **v0.32**。Apply 时将同步 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` banner/current-release。

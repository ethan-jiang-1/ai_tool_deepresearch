## Why

当前运行只能在 HITL1 记录问题、范围和结构化 profile，无法保留用户对来源、排除项、分析视角和交付方式的本轮研究判断。后续 Seed、Wave、委派角色与 Final 因而没有同一份可审计的用户语义输入，只能依赖易丢失的对话上下文或各自猜测。

本 change 依据 `_backlog/plans/research-question-closure-and-evidence-judgment/02-user-research-controls.md`，在既有 HITL1 和 host file 内补齐这个缺口，同时修正该 host file 的受限写入、Progress 与 checkpoint 之间已存在的完整性边界。

## What Changes

- 新增可选的 `User Research Controls`：HITL1 将用户本轮的优先级、排除项、来源/证据策略、分析视角和交付需要，作为一份可读、持久的快照记录在 `rb_plan.md## Constraints` 下。未提供控制时记录明确的正常路径；旧 bundle 缺少该小节时保持现有行为。
- 明确用户、Agent 与 Engine 的边界：用户决定新的研究语义和风险取舍；Agent 忠实捕获、理解并在证据中应用；Engine 仍独占 schema、provenance、receipt、Gate、host policy 与生命周期 verdict。自由文本不得覆盖这些确定性契约。
- 让 Seed、Wave 和 Final 使用同一 host-file 坐标；有委派工作时，只能通过既有 `task_brief` 传递 beacon-rooted、bundle-relative 的只读坐标，不能新建队列、manifest、result 或跨运行记忆字段。
- 把嵌入的用户 Markdown 视为有边界的内容区域。Topic Registry、Progress 和 required-fill 检查只定位 template-owned 区域，消除用户文本伪装标题、checkbox 或模板标记时的误写、误判。
- 收敛 setup-ready 的审计/Progress/checkpoint 交易边界：成功的可消费 handoff 只能对应已写入的最终 `rb_plan.md` 字节和所需 checkpoint；不能以 append-only trace 的后续记录“撤销”早先的成功路由，也不豁免 reentry drift 检查。

本 change 不增加新的 lifecycle、HITL、Gate、控制器、通用 Markdown parser、外部文件同步、用户控制 schema、profile flag、工作单元字段或平行 checkpoint。HITL1 仅可读取用户明确提供的本地文件以形成快照；以后阶段不保留路径、不重读该文件。严格用户来源限制若使问题无法回答，仍遵守既有 limitation/degraded/HITL2/held-checkpoint 合法路径，绝不降低 source floor 或伪造通过。

需要 framework version bump，目标版本为 `v0.41`；apply 时同步根目录 CHANGELOG 和 `RUN.md` banner。

## Capabilities

### New Capabilities

- `user-research-controls`: HITL1 一次性捕获、持久化和跨研究角色使用可选的用户研究控制，同时定义其 authority 与兼容边界。

### Modified Capabilities

- `plan-hostfile-sections`: 在 Constraints 中建立有边界的用户内容区域，并使模板 owned 区段的更新和 marker 检查不受其内容干扰。
- `pre-research-phase-content`: 让 HITL1 捕获和后续 Phase guidance 消费用户控制，并在冲突时停留在既有 HITL1 决策边界。
- `delegated-work-units`: 允许现有 `task_brief` 携带唯一、只读的 bundle-relative host-file 坐标，而不改变 work-unit authority。
- `runtime-reentry-debuggability`: 让 setup-ready 的可消费 handoff、Progress 与 checkpoint 对同一份最终控制文件达成可验证的一致性。

## Impact

- 影响 `rb_plan.md` 模板、HITL1/Seed/Wave/Final Markdown guidance、host-file locator helpers、setup-ready Gate 及其 handoff/checkpoint 路径。
- 影响现有 plan-hostfile、pre-research、delegated-work-unit、runtime-reentry 的 focused verification；不新增依赖、网络服务或外部存储。
- 最短合法闭环为：用户在 HITL1 决定语义 -> Agent 记录一个 host-file 快照并据此执行已授权工作 -> Engine 检查直接的结构与审计事实。它避免了第二份控制状态、翻译层、控制器、同步循环和多份 checkpoint authority。

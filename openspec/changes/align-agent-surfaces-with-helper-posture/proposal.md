## Why

当前系统已经有“最短正确控制回路”和“人类不是 pipeline command co-runner”两条原则，但它们尚未合成一个清楚的演进姿态：遇到新问题时，设计仍容易新增 condition、状态或恢复入口；遇到用户明确想推进但前置条件不满足时，Agent 也容易退回只报错、只给命令、把机械操作交还用户的 tool posture。`_backlog/plans/breakpoint-recovery-persistence-model.md`、`_backlog/plans/human-override-and-state-mutability.md`、`_backlog/bugs/BUG-078-post-final-hitl2-rerun-reentry-blocked.md`、`_backlog/bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md` 与 `dpt_rb_ai-era-bpm-process-disruption/` 暴露了这种张力，而 `_backlog/todos/todo-helper-not-tool.md` 只应作为长期方向，不能被误实现成新的 helper 子系统。

现在需要先回退一步，把未来 change 的默认方向说清楚：触碰复杂 surface 时应产生可说明的净简化；在既有权限与确定性 contract 内，Agent 应帮助用户完成可逆、机械性的推进工作，只把真正需要人类判断或授权的部分交还用户。`simple-reliable-control.md` 已被 Charter 放在第二阅读位和 complexity brake 的位置，但它自身的 role、scope 与 Purpose 仍主要描述质量控制，尚未清楚承担“系统今后如何渐进演进”的指导地位。

## What Changes

- 重构 `guidelines/simple-reliable-control.md` 中重复的 complexity budget、burden of proof、渐进收敛与 review checklist 表述，收束为一条可执行的净简化准入原则；不是在原有规则之上再叠加一套评审机制。
- 提升同一 guideline 的显式地位：把其 frontmatter role/scope、Purpose 与 Standing 对齐为 Charter 之后的 repo-wide 渐进演进评审入口，统一承载“净简化”和“Agent 从 tool posture 向 helper posture 演进”两条长期方向。
- 最小更新 `guidelines/project-charter.md` 与 `guidelines/README.md` 的现有引用，确认这一阅读和评审路线；该提升仍属于 guidance，不覆盖 accepted specs、executable contracts 或 runtime truth。
- 在同一 guideline 中明确协作姿态：Engine 保持简单、确定、tool-like；Agent 读取 Engine 的前置条件与失败反馈，解释缺口，并在用户意图和权限已经足够时亲自执行可逆、机械性的修复或推进动作。
- 明确 Agent 只在出现新的语义选择、破坏性或不可逆动作、权限/authority 扩张时，通过既有 accepted interaction boundary 请求用户决定；没有合法交互入口时显式阻塞，不新建 checkpoint。用户作出决定后，后续已授权机械步骤仍由 Agent 完成。
- 修改既有 `agent-command-surface` requirement，使“Agent-facing”不只表示命令受众，还明确表示普通、已授权的命令执行和机械修复不应被转嫁给人类 co-runner。
- 保留真实性与 authority 边界：helper posture 不允许伪造 evidence、receipt、trace 或状态，不允许静默改变用户意图，也不允许 Agent 自行扩大权限。
- **不产出** generic helper/persona/memory 系统，不新增 runtime state、CLI、validator、controller、event、condition tree 或 recovery path。
- **不处理** node movement、human override、post-final reentry、BUG-078 或 BUG-079 的运行时修复；这些问题以后仍须在直接 authority 和合法 transition contract 上分别提出 change。
- 本 change 不修改 `DPT_FRAMEWORK/` 的运行时行为，不新增依赖，不需要 framework version bump。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `agent-command-surface`: 完整化 ACS-001 的 Agent-facing audience contract，要求 Agent 在既有授权范围内执行普通机械动作，并把 human escalation 限定在语义、不可逆/破坏性或权限扩张边界。

## Impact

- 指导层：`guidelines/simple-reliable-control.md` 将成为“净简化 + helper-oriented Agent posture”的统一演进原则，不新增 sibling guideline。
- 指导索引：最小对齐 `guidelines/project-charter.md` 与 `guidelines/README.md`，使其现有第二阅读位、precedence 和 decision route 明确覆盖渐进简化与 helper 方向。
- 规格层：修改现有 ACS-001，不分配新 requirement ID，不新增 capability。
- Agent-facing 文档：最小对齐 `DPT_FRAMEWORK/COMMANDS.md` 的现有 audience contract；不增加新的命令或操作面。
- Runtime、schema、state machine、gate、trace、receipt、tests 与依赖：无行为变化。

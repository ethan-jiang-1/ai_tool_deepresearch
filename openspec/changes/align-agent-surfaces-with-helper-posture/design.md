## Context

仓库当前已经分别表达了两件正确的事：

- `guidelines/simple-reliable-control.md` 要求 direct authority、短反馈链、一个最近动作，并反对不断增加 state、validator、fallback 和 recovery branch。
- `agent-command-surface` 的 ACS-001/ACS-002 要求人类只负责 trigger 和既定 HITL 边界，pipeline command execution 属于 Agent。

问题不在于缺少第三套机制，而在于这两条原则没有被合成同一个设计姿态。结果是，控制复杂度评审散落在 `Complexity Budget`、`Complexity Burden Of Proof`、`Compatibility And Gradual Convergence` 和 `Design Review Checklist` 中；同时，“命令由 Agent 运行”尚未明确覆盖失败后的普通机械修复。面对用户明确想推进、但 deterministic prerequisite 暂未满足的情况，系统容易走向两个坏方向：Engine 增加一个专用 override/reentry 机制，或 Agent 只把命令和修复步骤打印给用户。

本 change 把这两类偏差收束为一个简单分工：Engine 继续给直接事实和合法边界，Agent 在边界内帮助用户完成工作。

## Goals / Non-Goals

**Goals:**

- 把“净简化”变成未来 change 的默认准入姿态，并通过合并现有重复规则实现文档自身的净简化。
- 将 `simple-reliable-control.md` 从偏质量控制的局部表述提升为 Charter 之后的 repo-wide 渐进演进评审入口，但不改变其 guidance authority 层级。
- 把 helper 定义为 Agent 的责任分配，而不是新的 actor、state、service、persona 或 controller。
- 让 Agent-facing command contract 明确：已有用户意图、权限和合法路径足够时，Agent 执行可逆、机械性的命令与修复，不把用户变成 co-runner。
- 把需要用户参与的边界收束为新的语义选择、破坏性/不可逆动作、权限或 authority 扩张；用户决定后，Agent 继续完成已授权机械步骤。
- 保持 Engine、accepted specs、runtime truth 和真实性边界不变。

**Non-Goals:**

- 不实现 `_backlog/todos/todo-helper-not-tool.md` 中设想的通用 helper、persona、memory 或长期协作系统。
- 不新增 generic override、debug mode、node movement、post-final reentry、recovery controller 或 human mutation API。
- 不修复 BUG-078/BUG-079，不改变 Final、HITL2、gate、transition、receipt、trace 或 `rb_status.json` 语义。
- 不把“用户同意”解释成绕过 accepted transition 或伪造 authority 的权限。
- 不对历史复杂度做一次性重写。

## Decisions

### 1. 提升 guideline 地位，但不制造新 authority

`guidelines/simple-reliable-control.md` 继续是唯一的复杂度与演进姿态入口，不创建 `helper-guideline.md` 或新的治理 capability。它的地位从“主要约束 checker/gate/recovery 复杂度”明确提升为：在 Charter 确定 ownership 和 authority 边界之后，负责判断新 change 应采用怎样的简单控制形状，以及 Agent/user 应如何分担行动与决定。

Apply 时同步三处现有入口：

- `simple-reliable-control.md` 的 frontmatter `role`、`scope`、顶部用途、Purpose 和 Standing 明确写出 repo-wide incremental evolution、net simplification 和 helper-oriented Agent posture；
- `project-charter.md` 现有 complexity-brake、Guidance Conflict Resolution、Quick Router、Reading Order 和 Related Guidance 只做最小措辞扩展，确认该 guideline 也是渐进演进与 Agent/user responsibility 的评审入口；
- `guidelines/README.md` 保持它在第二阅读位，更新 suite index、decision route 和 guidance map 描述。

“提升地位”不改变 authority order。该 guideline 仍然是 guidance：它不能宣布某个 runtime 行为已经存在，不能覆盖 accepted specs 或 Engine verdict，也不能单靠 prose 要求一次性重写。它提升的是未来方案的默认方向和进入设计评审时的可见性。

**Alternative considered:** 只在 `simple-reliable-control.md` 内自我声明更高地位。拒绝，因为该文件 `defers_to` Charter；若 Charter 和 suite index 不确认其路线，自我声明既不清楚也容易产生 authority 歧义。

### 2. 在现有 guideline 内做替换式收束

Apply 时不在文件末尾追加一套规则，而是：

- 保留 direct authority、short-circuit、same-check repair 和真实性底线；
- 将现有 complexity budget、六问 burden、New Work 与十二项 checklist 的重复内容合并为一个 `Change Admission Test`；
- 在同一处加入 Agent/Engine/user 的协作责任；
- 删除被新表述覆盖的重复问题和重复 SHALL，避免 guideline 规则数继续增长。

准入测试只保留三个问题：

1. 最短合法闭环和直接 Source of Record 是什么？
2. 这个 change 删除、合并或避免了哪一份现有复杂度？若只增加，为什么是不可避免的确定性底线？
3. 哪个决定确实需要用户，用户决定后哪些机械步骤由 Agent 完成？

这不是新的 runtime gate、模板文件或 validator；它替换现有分散的 design-review 问题。

**Alternative considered:** 新建一份 helper guideline。拒绝，因为它会制造新的阅读入口和原则重叠，正好违背本 change 的目标。

### 3. Helper 是 Agent posture，不是系统机制

协作闭环定义为：

```text
user goal
  -> Agent reads direct runtime facts
  -> Engine/check reports legal prerequisites and smallest blocker
  -> Agent explains the blocker and nearest legal action
  -> Agent executes authorized reversible mechanical work
  -> rerun the same checkpoint
```

只有当下一步包含新的语义选择、破坏性/不可逆动作、或权限/authority 扩张时，Agent 才通过现有 accepted interaction boundary 把最小决定交给用户；若当前没有合法交互入口，Agent 显式报告阻塞，不打开新的确认循环。用户决定后，Agent 恢复执行者角色，完成其余已授权机械步骤。

“机械工作”指结果已经由用户目标、accepted spec 和 direct Engine facts 决定，Agent 只需调用既有命令、编辑既有目标、重新运行同一检查或执行其他可逆步骤。它不包括替用户选择研究含义、改变交付目标、删除不可恢复数据、扩大 host permission、伪造 evidence/receipt/trace，或绕过不存在的 transition。

**Alternative considered:** 让 Engine 检测“强烈用户意图”并自动 override。拒绝，因为意图判断属于 Agent，override 会新增状态、条件和 authority，而且用户同意本身不能证明 lifecycle transition 合法。

### 4. Engine 仍然简单、确定、tool-like

本 change 不把 Engine 改造成 helper。Engine 的 Source of Record 和职责保持不变：读取结构化 authority，返回 pass/fail、最小根因和合法 next action，必要时 fail closed。

Helper posture 发生在 Agent 消费这些输出之后。Agent 可以解释、执行和协作，但不能重写 Engine verdict。这样既保留 Agent 智力，也不把 deterministic authority 交给对话推断。

**Alternative considered:** 新增 shared lifecycle evaluator、reentry authority 或通用 repair command。拒绝，因为当前 change 没有需要新 runtime truth 才能表达的事实；这些方案会先增加机制，再期待未来获得简化收益。

### 5. 修改 ACS-001，而不创建 helper capability

ACS-001 已经拥有“command surfaces are Agent-facing, humans are not command co-runners”的行为边界。修改它比创建新 capability 更准确：约束条件、文档 surface 和交互边界都没有改变，只是把 Agent-facing 的执行责任说完整。

修改后的 requirement 要求 `DPT_FRAMEWORK/COMMANDS.md` 的 audience contract 说明：

- 已有权限和合法路径足够时，普通命令与可逆机械修复由 Agent 执行；
- deterministic prerequisite 不满足时，Agent 先说明 direct blocker 和最近合法动作；
- 只有语义、不可逆/破坏性、权限/authority 扩张需要用户决定，且必须使用现有 accepted interaction boundary；
- 该边界不新建 HITL checkpoint，也不允许绕过 gate 或伪造状态。

不修改 ACS-003 的 static validator，不新增 phrase class。当前 change 是职责措辞对齐，不值得为一句原则再增加 blocking validator；Apply 时通过 focused review 和现有验证确认。

### 6. 渐进方向，不要求历史系统一步到位

Helper posture 是今后的收敛方向，不是对现有所有 workflow 的即时合规宣言。历史上已经存在的复杂路径继续由 accepted specs 和 executable contracts 决定；本 change 不要求为了统一措辞立即重写它们。

以后触碰一个既有 surface 时，proposal 应说明本次完成了哪一个局部收敛：减少一条用户必须执行的机械步骤、删除一个重复 condition、复用一个直接 checkpoint、缩短一个反馈链，或明确一个原本含糊的人类决定边界。每次只推进能安全验证的一步，但新 work 不应继续朝相反方向积累。

这使“从 tool 到 helper”成为持续的设计方向，而不是一次性项目，也不是依赖某个未来通用 helper 平台才能开始的事情。

### 7. Node movement 只作为边界示例，不在本 change 实现

当用户明确想移动 node 时，理想 helper 行为是读取直接状态、运行现有诊断、说明目标 node 的合法前置条件与当前缺口。如果现有 accepted contract 已提供合法且已授权的修复/transition，Agent 应执行它，而不是只把命令交给用户。

如果现有 contract 根本没有该 transition，Agent 必须明确说明“当前没有合法路径”。即使用户同意，也不能手写 `rb_status.json`、伪造 gate attempt 或制造新 canonical footprint。是否新增一种合法 transition 是独立行为 change，届时仍需通过净简化准入测试。

## Risks / Trade-offs

- [“Helper”被理解成 Agent 可以越权] -> 将 helper 明确绑定到现有用户意图、现有权限、accepted contract 和可逆机械动作；真实性与 fail-closed 边界保持不变。
- [三个 escalation 类别仍被实现成 condition tree] -> 它们只用于 Agent 判断何时需要人类决定，不进入 schema、state machine、CLI 或 validator。
- [修改 guideline 反而继续变长] -> Apply 必须合并和删除重复 review 内容；不得只追加新章节，且保留一个 canonical admission test。
- [提升地位被误解为 guidance 可以覆盖 spec] -> Charter 与 guideline 同时保留 authority order，并明确 promotion 只影响未来 design-review posture，不改变当前 behavior truth。
- [helper 方向被误解为历史 workflow 必须立即重写] -> 使用 gradual convergence：新 work 停止反向叠加，触碰既有 surface 时只做可验证的局部收敛。
- [没有立即解决 incident] -> proposal 明确区分演进原则和 runtime fix；BUG-078/079 继续作为后续 change 的证据，不在这里用 prose 假装已修复。
- [Agent-facing contract 缺少机械测试] -> 不为 guidance wording 新增 blocking validator；通过现有 OpenSpec/governance 检查和人工 focused diff 验证，避免质量控制再次膨胀。

## Migration Plan

1. 提升并重构 `guidelines/simple-reliable-control.md`，使 role/scope/Purpose/Standing、净简化准入与 helper posture 成为一个一致入口。
2. 最小更新 `guidelines/project-charter.md` 与 `guidelines/README.md` 的既有引用，确认其第二阅读位和演进评审地位，不改变 authority order。
3. 最小修改 `DPT_FRAMEWORK/COMMANDS.md` 的现有 audience contract，使其满足更新后的 ACS-001；不改命令、CLI 或 runtime behavior。
4. 运行现有 OpenSpec 与 governance 检查，并复审 diff 中新增/删除的规范性规则，确认没有新 capability、state、command、validator 或 checkpoint。
5. 若措辞产生误导，可回滚 guidance 与 command-audience 文本；不存在数据或 runtime migration。

## Open Questions

无。本 change 有意不决定 node movement 或 post-final recovery 的运行时方案。

## Why

现有两条 Evolution Directions 分别约束控制复杂度与 Agent/user/Engine 的行动责任，却都假定设计者已经找对了要建模的东西。于是新增 state、projection、status、reader-facing view 或流程概念时，团队仍可能只是换一个名字、抹平决定性差异，或让读者不得不回到底层重建含义。

本 change 将 Dijkstra 在 EWD 340《The Humble Programmer》中的抽象语境固化为第三条长期 Evolution Direction：新增抽象只有在它让一个明确的读者能够针对一个有界问题作出更精确判断时才有理由存在。它先于控制形状和行动责任审查，但不新增 runtime 能力。

## What Changes

- 新建 guidelines/evolution-abstraction-semantic-precision.md，标题为 Evolution Direction: Abstraction as Semantic Precision。它保留名句所在的完整 EWD 340 Argument Four 原文段落、一手来源，以及紧随原文的“这在本项目意味着什么”解读，使有限推理覆盖大量情形的语境留在正式文件内。
- 新文件以“引入一个新东西之前，先退后一步”为核心反思，而非四项填写式 Admission Test。相关设计应说明：它要回答什么问题；为此必须保留或可以合并哪些差异；读者能否在此层得到精确结论或精确的 unknown，而不必在正常路径回到底层重建。
- 审计并更新所有有效 `guidelines/*.md` 的宪章层级：Project Charter 不再 `defer_to` 任何外部文件；其余 guideline 只 `defer_to` Project Charter；同层 `siblings`、Reading Order 与 Related Guidance 统一以 semantic precision → simple reliable control → helper-oriented responsibility 的顺序提供当前三方向，并不把 config、spec、framework、experiment 或 bundle 放进宪章导航。更新 Project Charter、Guidelines Index、OpenSpec config 与两份既有 Evolution Directions，使核心入口按该顺序加载。
- 扩展 guidance-constitution capability 的 GCO-007/GCO-008，并更新 focused Markdown integration regression。验证保护当前三方向的路由与来源，不声称能自动证明 Agent 已理解或遵循该指导。

**BREAKING**: None. 不修改 runtime behavior、schema、CLI、bundle state、Gate、trace、framework version 或已接受 capability 的执行语义。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- guidance-constitution: 扩展 charter-companion 对“何种抽象值得引入”的语义精度方向，以及未来相关设计的三方向阅读路由；不改变 guidance-only、implementation-neutral 边界。

## Impact

- Affected guidance: 所有有效 `guidelines/*.md`，包括新 direction、Project Charter、Guidelines Index、两份既有 Evolution Directions 和七份机制/支持 guidance。
- Charter convergence: Project Charter carries no `defers_to` dependency. Every other active guideline defers only to Project Charter; every active sibling route exposes the current triad in its applicable semantic → simple → helper order. Constitutional navigation stays inside `guidelines/`; AGENTS/config and downstream capability specs, framework files, experiments, and runtime bundles remain outside it.
- Affected governance: openspec/config.yaml、guidance-constitution delta、GCO-007/GCO-008 registry entries，以及 change-root verification plan。
- Affected verification: tests/integration/md/evolution-direction-governance.test.mjs；它只验证 Markdown/config 的静态路由契约。
- 直接 authority、合法 repair、最短控制闭环和 action responsibility 的既有归属不变。新 direction 不把 well-described projection 升格为 authority，也不授权 Engine 判断研究相关性、证据取舍或综合质量。
- 不要求每个 mechanism guideline 都把三方向重复写进正文。此次套件级审计只统一 frontmatter 和导航层级；机制文档仍按其直接问题保留必要的事实说明与选择性正文链接。

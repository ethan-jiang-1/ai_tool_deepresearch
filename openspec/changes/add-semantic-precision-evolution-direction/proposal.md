## Why

现有两条 Evolution Directions 已分别约束控制复杂度与 Agent/user/Engine 的行动责任，但它们没有先回答一个更上游的问题：新增 state、projection、Module、CLI feedback 或流程概念时，是否真的形成了一个可精确推理的新语义层。结果是未来设计仍可能把机制重新命名、分散前置条件，或把无关区别与决定性区别一起隐藏。

本 change 将 Dijkstra 在 EWD 340《The Humble Programmer》中的抽象语境固化为第三条长期 Evolution Direction。它不是新增 runtime 能力；它让 Coding Agent 在进入具体控制与责任设计前，先判断新概念是否让有限推理能够对一个有界决策更精确地成立。

## What Changes

- 新建 `guidelines/evolution-semantic-precision.md`，作为 Charter 之下与 simplicity、helper 并列的第三条 charter-companion direction。它保留 Dijkstra 原句、EWD 340 一手来源和历史语境，并把“new semantic level”操作化为 semantic object、必要区别、reader-facing Interface、合法行动或 honest no-path 的设计审查。
- 更新 `guidelines/project-charter.md`：在入口处给出短语境和链接，并将 guidance precedence、Quick Router、Reading Order、Guideline Change Checklist 与 Related Guidance 改为三方向顺序：semantic precision → simple reliable control → helper-oriented responsibility。
- 更新 `openspec/config.yaml`：proposal/design 必须完成三方向 review；新方向要求说明有界决策、保留/合并的语义区别、Interface 是否足以支持合法下一行动，以及它避免或收敛的概念复杂度。
- 更新 `guidelines/README.md`、两份既有 evolution direction 及所有当前在 navigation/siblings 中列出 evolution companion 的 active guidance 文件，使常用入口一致加载三份文件；不修改 archived OpenSpec、closed backlog 或正在进行的 delegated-work change artifacts。
- 扩展既有 `guidance-constitution` capability，登记并加入 semantic-precision direction 与三方向 routing 的 requirement；更新 Markdown integration regression，使三条 canonical path、EWD 340 source/context 和 OpenSpec routing 都有可执行保护。

**BREAKING**: None. 不修改 runtime behavior、schema、CLI、bundle state、Gate、trace、framework version 或已接受 capability 的执行语义。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `guidance-constitution`: 扩展 charter-companion 的语义层抽象纪律，以及 future proposal/design 的三方向 review route；不改变其 guidance-only、implementation-neutral 边界。

## Impact

- Affected guidance: new `guidelines/evolution-semantic-precision.md`; `guidelines/project-charter.md`; `guidelines/README.md`; existing evolution directions; and active guidance navigation/sibling surfaces.
- Affected governance: `openspec/config.yaml`, the `guidance-constitution` delta/main spec and `GCO-007`/`GCO-008` registry entries.
- Affected verification: `tests/integration/md/evolution-direction-governance.test.mjs` only; it verifies documentation-routing contracts, not Agent behavior or runtime capability.
- Direct Source of Record remains unchanged: accepted specs, executable contracts, and runtime truth still decide behavior. The new document is guidance only.
- The shortest design loop becomes: identify the bounded decision and direct facts → establish the semantic object and essential distinctions → apply the smallest deterministic control → assign human/Agent/Engine responsibility. It avoids a fourth controller, state namespace, validator, retry path, or abstraction framework.
- User/Agent/Engine responsibility remains unchanged: users decide only new semantics, risk, or permission; Agents perform legal work; Engine owns deterministic verdicts. `human-directed` creates no permission or runtime capability.

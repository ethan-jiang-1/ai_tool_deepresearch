## Why

Coding Agent 即使读过很长的 Charter，仍会把本 agentic research framework
误解为传统确定性程序。由此产生的错误反复出现且具有结构性：把 Agent judgment
搬进 JavaScript、把 Markdown 当作无权威的装饰、或把静态 framework definition
误当作当前 run fact。

项目需要一个短小、可发现的术语入口，以及一份记录核心架构取舍的持久文档。只提供
这些文档还不够；正常的 repository 与 framework entry route 必须要求 Agent 读取它。

## What Changes

- 采用现有根 `CONTEXT.md` 作为非权威、项目级 glossary，并在 apply 中补足它指向
  `guidelines/` terminology canon 与 ADR 0001 的直接链接。它压缩已正典化的
  terminology，不复制 runtime state、accepted behavior 或 executable contract。
- 保留根 `docs/adr/0001-keep-agent-flow-markdown-driven-and-engine-gated.md`，作为记录
  首个持久架构决定的 ADR：Agent Flow 保持 Markdown-driven 且 Engine-gated，而不是变成
  JavaScript workflow controller。
- 同步更新根 `AGENTS.md`、`CLAUDE.md` 与 `README.md`：每个实质性 repository task
  在开始前都先读 Project Charter，再读 `CONTEXT.md`。
- 同步更新 `DPT_FRAMEWORK/AGENTS.md`、`DPT_FRAMEWORK/CLAUDE.md` 与
  `DPT_FRAMEWORK/README.md`：framework work 同样先读根 Project Charter、再回链根
  glossary，不创建第二个 framework-local context。
- 预登记 `ACR` prefix 与 `ACR-001` 至 `ACR-004`，使 delta spec 在 apply 前已有全局
  requirement traceability。
- 为必需 entry routing 与 glossary 的非权威边界增加 deterministic integration
  regression。
- 不改变 framework runtime behavior、CLI/schema contract、bundle layout、Engine
  authority 或 framework version。

### Semantic Precision

新 glossary 给未来 Coding Agent 一个有界答案：哪些 project term 描述 system、actor、
deterministic boundary 和 runtime fact。它保留会改变合法结论的区别，例如 framework
与 active bundle、Gate definition 与 Gate verdict、Gate verdict 与 Chain route、phase
handoff 与 work completion，以及 Source of Record 与 permission。读者可在该层完成
vocabulary alignment；需要 behavior、executable contract 或 runtime fact 时再沿链接
下钻，glossary 不宣称能回答这些下层问题。

### Control and Responsibility

本 change 用一个强制 entry route 取代反复、临时的 prompt 重述，避免第二份 framework
glossary、derived runtime view 或新的 Engine control logic。用户选择 vocabulary 与
routing posture；Agent 负责读取并遵循；既有 Engine 与 OpenSpec authority 不变。

## Capabilities

### New Capabilities

- `agent-context-routing`: 让 project terminology glossary 与 architecture-decision
  record 能从 repository 和 framework Agent entry route 被发现，同时不创建竞争性
  source of truth。它约束的是 project-wide vocabulary entry，而非既有
  `agent-command-surface` 所有的 framework command audience、HITL 或 phase-boundary
  contract。

### Modified Capabilities

- None.

## Impact

- 受影响文档：`CONTEXT.md`、`docs/adr/`、根 `AGENTS.md` / `CLAUDE.md` /
  `README.md` 与 `DPT_FRAMEWORK/AGENTS.md` / `DPT_FRAMEWORK/CLAUDE.md` /
  `DPT_FRAMEWORK/README.md`。
- 受影响验证：`tests/integration/md/` 下一个 deterministic documentation-routing
  regression。
- terminology 仍与 `guidelines/README.md`、`guidelines/agentic-execution-model.md`
  和 `guidelines/project-charter.md` 对齐。
- 不新增 dependency，不改变 public runtime API、schema field、bundle content 或
  framework version。

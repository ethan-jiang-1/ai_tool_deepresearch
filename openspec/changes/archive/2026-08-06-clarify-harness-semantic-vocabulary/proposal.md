## Why

`DEEP_RESEARCH_HARNESS/` 已是唯一的 Harness 源坐标，但其 Agent 入口、命令
playbook 与多个 accepted spec 仍用泛称 `framework` 或人类可读的 `DPT` 指代同一
可复用系统。根据 [CONTEXT.md](../../../CONTEXT.md)，读者本应能直接区分 Deep
Research Harness、目录坐标、research run 和 current run bundle；目前却需要从上下文
猜测这些词是否仍在指向已退役的旧概念。

本变更落实用户要求的语义化收敛：逐项判断一个表述实际命名的对象，而不是把命中的
字符串批量替换。此时处理是必要的，因为这些表述直接进入 Coding Agent 的操作上下文，
会干扰后续对 Harness 与 run bundle 的边界判断。

## What Changes

- 在本 change 中建立受审计的语义判定台账，逐项记录第一批候选表述的来源、所指对象、
  保留的必要区别、决定与理由。候选扫描只用于发现，台账中的语义判断才授权修改。
- 仅当自然语言实际指代可复用系统、其源目录、一个 research run 或其 current run
  bundle 时，分别收敛为 `Deep Research Harness` / `Harness`、
  `DEEP_RESEARCH_HARNESS/`、`research run`、`run bundle` 或 `current run bundle root`。
- 同步第一批高信号 Harness Markdown 与对应 accepted requirement，使 Agent 的 entry、
  command、bundle-isolation、silent execution 和 directory-boundary 叙述使用同一
  领域模型，不改变现有路由、Gate、权限或运行时行为。
- 将人类可读的 `DPT` 角色族说明收敛为 Harness 术语；保留已接受的 role key、bundle
  前缀和管理标记，直到有单独的协议迁移决定。
- 为已判定的高信号表述补充有限的正向静态回归和人工语义复核。该回归验证明确的
  reader-facing contract，不把“某个字面量不存在”升级为新的 Engine authority。

本变更不重命名 `framework_root`、`framework_version`、`FRAMEWORK_ROOT`、
`framework-version.mjs`、`framework-engine` capability、`dpt_*` 目录/role grammar 或
`DPT managed: real-subagent` sentinel。这些是结构化协议或稳定标识；若要迁移，须以
单独的 breaking change 明确旧 bundle、代码消费者、测试与兼容性策略。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `run-entry`: entry、触发和 Agent-run execution 的 reader-facing 用语 SHALL 准确指向
  Deep Research Harness，而不引入新的 entry 或交互点。
- `agent-command-surface`: Harness command/playbook 的受众、责任和 continuation
  叙述 SHALL 使用已判定的领域术语。
- `cmd-bundle-instantiation`: bundle creator 的自然语言导航与既有的“bundle 不含可复用
  系统副本”说明 SHALL 区分 Harness 与 run bundle，同时保留已有结构化字段和 bundle
  grammar。
- `cmd-subagent-environment`: real-subagent setup 的人类可读 taxonomy SHALL 指向
  Deep Research Harness；其已接受 marker 与 role-key 协议不变。
- `bundle-data-isolation`: reusable Harness assets 与 current run bundle runtime truth
  的边界用语 SHALL 与 glossary 对齐。
- `silent-wave-execution`: Agent/Harness 发起行为的叙述 SHALL 指向 Harness，而不改变
  silent-execution authority 或 user-turn 语义。
- `workflow-directory-contract`: read-only Harness assets、目录坐标和 current run
  bundle 的自然语言边界 SHALL 清晰；现有字段名仍保持为兼容协议。

## Impact

- 影响范围限于 `DEEP_RESEARCH_HARNESS/` 中由台账判定为高信号的 Agent-facing
  Markdown，以及上述 `openspec/specs/` capability 的 accepted requirements 和其
  对应静态回归。
- `CONTEXT.md` 是术语含义的直接 Source of Record；各 accepted spec 仍是其 capability
  行为的 Source of Record。台账只记录本 change 的判断，不创建第二个全局词汇权威。
- 最短闭环是：候选来源 -> 逐项语义判定 -> 最小的术语修复 -> 有限正向回归与人工复核。
  这消除读者重建同义词的成本，且不增加 alias resolver、全局扫描 Gate、状态、兼容层或
  控制器。
- 用户已确定 canonical domain model；Agent 在 approved apply 中执行可逆的台账和文档/规格
  修改；Engine 仅给出有限静态回归的确定性 verdict。没有新的用户权限、运行时权威或
  Agent flow 被创建。
- 不修改 Harness 行为、CLI、schema、bundle 内容、运行时状态、release version 或依赖，
  因而不需要 Harness version bump。OpenSpec archives、Git history 与既有 run bundles
  也不在本 change 的修改范围内。

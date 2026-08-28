## Context

动机见 `proposal.md` 的 Why。本 change 是 document-only：只编辑
`DEEP_RESEARCH_HARNESS/COMMANDS.md`，把已由 Engine 严格校验、但 Agent 靠试错才发现的
contract 提前写进索引。无跨文件、无 schema/state/transition 变更、无测试变更、无 spec delta
（`skip_specs: true`）。

两条现有机器检查直接约束本次写作，是设计决策的硬边界：

- `openspec/governance/check-content-drift.mjs` 的 `CLI_VERB_RE` 会抽取 COMMANDS.md 里所有
  `operate-*.mjs <verb>` 并校验 `<verb>` 是否被该工具源码 dispatch。因此新增的
  `operate-queue.mjs` 行只能用真实动词集（`check`/`enqueue`/`claim`/`complete`/`fail`/`preempt`/
  `count`/`render`/`project`/`repair`），**绝不把 `drain` 当 CLI verb**（`drain` 是队列状态概念）。
- `tests/engine/command-contract-docs.test.mjs` 要求 prose 中出现的可执行命令串带完整
  `node DEEP_RESEARCH_HARNESS/cli/<tool>.mjs <verb> ...` 前缀；紧凑表格行只要同列给出 `cli/`
  文件坐标即可用 bare form。

## Goals / Non-Goals

**Goals:**

- 补齐 `operate-queue.mjs` 生命周期的索引覆盖，并给出 `complete` 的最小 result 形状。
- 给出三套可复制的 contract 正例（queue result / projection packet / Evidence Map 列头）。
- 用最小 one-liner 前置 G3–G7 的 gotcha。
- 全部改动通过现有 governance 检查与既有 md/engine 回归。

**Non-Goals:**

- 不改 Engine 裁决行为、exit code 语义、CLI 名称、schema 字段或测试文件。
- 不新增命令、不新增第二份 walkthrough 叙事、不新增 kebab↔snake 手写对照表。
- 不把附录变成第二真相源：模板只指向既有 schema/engine owner，不复制权威内容。
- 不新增确定性回归（避免把「纯文档补全」扩成「改测试」）。

## Decisions

1. **单文件、单附录 + 行内 one-liner**：在 `Subagent 环境` 区补 `operate-queue.mjs` 行；在
   COMMANDS.md 尾部加一个 `## Copyable Contract Templates` 附录承载三套模板；G3–G7 各在对应节
   补一行。选择集中附录而非在每个工具行内嵌模板，是为了让「照抄正例」只有一个查找点，且不与
   现有紧凑表格的 bare-form 约定冲突。

2. **动词集只写源码真实 dispatch 集**：`operate-queue.mjs` 行列
   `check`/`enqueue`/`claim`/`complete`/`fail`/`preempt`/`count`/`render`/`project`/`repair`；
   `drain` 仅作为队列状态词出现，不作为 verb。这是 `check-content-drift` 的硬约束。

3. **模板标注 Source of Record**：queue result 指向 `engine/queue-manager-core.mjs`
   `QueueResultSchema`；projection packet 指向 `engine/helpers/canonical-topic-state.mjs` 与对应
   accepted schema；Evidence Map 指向 `engine/helpers/final-delivery-backing.mjs`。附录正文说明
   「模板是 copyable 正例，不是第二真相源」。

4. **result 模板写 `receipt` 前缀语义**：`file:`/`json:`/`queue:`/`trace:`/`work_unit:`，其中
   `work_unit:` 只能由 `operate-work-unit submit` 校验，不能经 `operate-queue complete` 直接过。
   这比 plan 原稿的裸 `receipt` 更可复制，避免 Agent 再试错。

5. **Evidence Map 用 markdown link**：backing 列必须是 `[text](rel-path)` link（引擎
   `markdownLinks()` 校验），相对路径指向已提交 `reference/*.md` 或
   `artifacts/wave1/*/evidence-summary.md`；列名大小写不敏感，正例沿用
   `| Finding ID | Declared Key Finding | Submitted Backing |`。

## Risks / Trade-offs

- [把「模板」写成事实而非指针，制造第二真相源] → 附录每套模板都显式写「Source of Record =
  <engine 文件>」，正例只给最小形状，不复制 validator 分支细节。
- [写出不存在的 verb（如 `drain`）触发 check-content-drift] → 设计决策 2 已把动词集钉死在源码
  dispatch 集；apply 后跑 `node openspec/governance/check-content-drift.mjs` 校验。
- [prose 命令串缺完整 `node` 前缀触发 copyability 回归] → 附录与行内只放 JSON/Markdown 模板，
  不新增 prose 可执行命令串；若需要命令示例，写完整 `node DEEP_RESEARCH_HARNESS/cli/...` 前缀。
- [wave2 投影模板与引擎未来修复 `conditional_forms` 后漂移] → 附录以当前源码事实为准并指向 owner，
  不硬编码「返回空 []」这类实现细节；引擎侧投影修复是独立 change，不在本 scope。

## Migration Plan

无迁移。目标文件是单一 Markdown 文档；回滚即还原该文件改动。不涉及 bundle、schema、CLI 或依赖。

## Open Questions

None.

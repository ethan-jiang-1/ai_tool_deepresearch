# Proposal: repair-gate-feedback-carrier-glossary

## Why

2026-08-31 的 coding-agent 审计（本对话深挖，证据坐标见 design.md「Context」）发现：
`CONTEXT.md` 术语表把 gate/phase 门禁面的反馈载体字段写成 `hints[].resolution_owner`，
但该字段在 engine、schema、CLI、全部 accepted specs 中**不存在**——真实载体是
`repair_kind`（`openspec/specs/engine/check-inspect-feedback/spec.md:57`、
`DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs` 的 `GATE_REPAIR_KINDS`）。
漂移来源是归档 change `2026-08-30-disambiguate-feedback-repair-surfaces`：其 tasks.md 2.2
（gate 侧改名）打了勾但从未落地，而 `CONTEXT.md` 与两个锁测试却按"已完成"的想象终态更新，
导致错误术语以全绿测试状态进入词汇正典。任何按 `CONTEXT.md`（指定的词汇权威）解析 gate
反馈或写 repair 消费代码的 Agent 会找一个 Engine 永远不发的字段——这正是罗塞塔表要防的事故。

## What Changes

- `CONTEXT.md`：术语行（L57）与罗塞塔表 Gate/Phase 行（L72）的载体字段由
  `resolution_owner` 修正为 `repair_kind`（gate 定义内 finding 为 `repair.kind`），
  枚举五值不变，权威源补可执行枚举坐标 `GATE_REPAIR_KINDS`。
- `tests/integration/md/repair-directive-lock.test.mjs`：CONTEXT 三面区分锁由
  presence-string 锁改为**从 engine/schema 导出派生**的锁（导入 `GATE_REPAIR_KINDS`，
  逐值断言出现在罗塞塔行），并新增 negative lock（`resolution_owner` 不得回归）。
- `tests/integration/md/guidance-terminology-pointer-consistency.test.mjs`：F-03
  三面区分断言同步改为 `repair_kind` / `recovery_action` / `repair_directive`
  （negative lock 由 repair-directive-lock 单点拥有）。
- `CONTEXT.md:55` 英文句内全角"。"改半角（同文件 1 字符 rider，语言约定归一）。
- 记录 finding：归档 change `2026-08-30-disambiguate-feedback-repair-surfaces` 的
  tasks 2.2/6.1 完成声明与树不符（记录于 design.md；归档工件不可改）。

**明确不做**：不改 engine/CLI/schema/specs/RUN.md 任何文件；不补完 gate 侧改名；
不新增 checker；不动 README/AGENTS 共享段与 host_tools 文档。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无——本 change 为纯 guidance 投影修正 + 测试锁修正，零 spec 级行为变化；
`.openspec.yaml` 声明 `skip_specs: true`。delta-spec 不适用的原因：三个相关
capability 的 accepted requirement 均已与代码一致，本 change 只把 guidance 投影
拉回它们；不产生任何新的 observable behavior。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/agent-context-routing` | `openspec/specs/agent/agent-context-routing/spec.md`（catalog 行：root context 路由面） | Verify-only | `CONTEXT.md` 属其路由面；本 change 修正投影措辞，不改 requirement |
| `engine/check-inspect-feedback` | `openspec/specs/engine/check-inspect-feedback/spec.md:57-108` | Verify-only | 该 spec 已正确使用 `repair_kind`（spec 与代码一致）；本 change 让 `CONTEXT.md` 对齐它 |
| `bundle/file-observability` | `tests/integration/md/repair-directive-lock.test.mjs`（@impl FIO-008） | Verify-only | `repair_directive` 命名与六值锁保持不变，仅锁实现方式升级为派生 |
| `governance/requirement-traceability` | `openspec/governance/req-registry.yaml` | Excluded | 不新增/修改/退役任何 requirement ID |

## Impact

- 受影响文件：`CONTEXT.md`（3 行）、`tests/integration/md/repair-directive-lock.test.mjs`、
  `tests/integration/md/guidance-terminology-pointer-consistency.test.mjs`。
- 不新增依赖；无 **BREAKING**；Engine/CLI/gate 行为零变化。
- 风险面：两个锁测试同 change 内同步更新（`tests/README.md` 的 doc-locks preflight 纪律）。

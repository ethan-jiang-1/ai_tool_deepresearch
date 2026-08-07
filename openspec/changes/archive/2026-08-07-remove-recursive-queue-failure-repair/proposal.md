## Why

`BUG-203` 已在当前 Head 的真实 Engine 路径复现：通用 Queue `fail()` 对生成
repair item 再次失败时会继续生成 `repair-repair-*`。这不是 Agent 没有写好 repair
内容，而是 `QueueFailureSchema.repair?` 与自动 `makeRepairItem()` 让 Queue 在没有
可证明 successor contract 时制造了新的需求。来源见
`_backlog/plans/gate-schema-progressive-gate-schema-queue-remediation.md` 与
`_backlog/plans/bug-200-204-gate-and-queue-remediation.md`。

本 change 将该不受界限的通用 repair 路径收敛为一个可审计的终止/no-path；已有
delegated terminal replacement 继续由其现有 `operate-work-unit replace` authority
处理，不能借 Queue 的通用失败入口绕过。

## What Changes

- **BREAKING**：`operate-queue fail --failure` 和 `QueueFailureSchema` 不再接受任意
  `repair` queue item。通用 `fail()` 不再自动生成或 preempt repair card。
- 为通用 Queue failure 在既有 terminal history 中记录一个受限的
  `terminal_no_successor` disposition。它说明这个 Queue 入口已经安全终止、没有
  Engine 已证明的通用 successor；它不是完成、retry 或新的 workflow state。
- 让 Queue `inspect`、rendered queue projection 和 shared `phase_queue_drained`
  Gate check 读取同一 terminal-history disposition，给出相同的 direct failure、
  owner/no-path boundary 和同一 checkpoint 的 rerun，而不把空 active window 当作
  queue drain。
- `fail()` 只可终止当前 non-delegated Queue demand。delegated demand 必须通过既有
  work-unit terminal/replacement authority 处理；Queue 不会创建 work ID、replacement
  lineage、receipt、ledger 或完成记录。
- 保持 terminal history、严格 Queue schema、正常 enqueue/claim/complete、audited
  work-unit replacement、timeout retry 与 late-submit 的现有含义。这个 change 不新增
  generic recovery controller、watcher、retry tree、人工 queue edit 或 Gate bypass。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/agentic-queue` | main spec `AGQ-001`、`AGQ-019`；Queue failure schema/lifecycle/render implementation；Queue window lifecycle tests | Modify | 它拥有 Queue fail operation、terminal history、Queue item schema 和 projection；这里正是 arbitrary repair 的 writer。 |
| `engine/gate-skeleton` | main spec `GSK-004`；shared `phase_queue_drained` evaluator and integration tests | Modify | 它拥有 Wave inspect/formal Gate 对 Queue quiescence 的 direct interpretation；必须能看见 `terminal_no_successor`。 |
| `agent/delegated-work-units` | main spec `DEW-006`、terminal replacement lifecycle | Verify-only | 已有 work-unit terminal/replacement path 是合法 successor authority；本 change 不改变其 eligibility、identity 或 transaction。 |
| `workflow/repair-loop` | main spec `REL-001` | Excluded | Gate repair loop 不是 Queue demand failure transport，不能作为通用 Queue failure 的 fallback。 |
| `engine/check-inspect-feedback` | main spec `CHI-002`、`CHI-004` | Verify-only | 本 change 复用既有 structured finding/feedback shape，不新建通用 feedback capability。 |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent/agentic-queue`: `AGQ-019` changes generic Queue failure
  terminal-history/schema semantics from arbitrary repair insertion to a typed,
  finite no-successor disposition with one direct feedback surface.
- `engine/gate-skeleton`: `GSK-008` changes shared queue-drain root projection so an
  unresolved generic terminal failure remains a direct Gate root instead of
  becoming invisible once the active containers are empty.

## Impact

- **Direct Sources of Record:** `rb_queue.json` terminal history plus its
  schema-valid failure disposition are the Queue fact; the existing work-unit
  index/manifest/terminal snapshot remains the separate replacement fact.
- **Shortest legal loop:** Queue failure -> durable terminal history ->
  inspect/projection/Gate expose one no-path -> a future accepted owner may
  create a legal demand -> rerun the same checkpoint. There is no auto-repair
  card between failure and the next decision.
- **Semantic precision:** `terminal_no_successor` answers one bounded reader
  question: “Can this generic Queue terminal failure yield a Queue-owned
  successor now?” It preserves ordinary Queue failure versus the separately
  audited delegated replacement path and lets a reader stop at a truthful
  no-path. It is not a new success status or a generic lifecycle controller.
- **Net simplification:** remove the optional arbitrary repair payload, repair
  factory and repair-of-repair lineage; reuse existing terminal history and
  one Gate evaluator instead of adding retry state or a second queue authority.
- **Responsibility:** the Agent may record an authorized failure and follow an
  existing legal next action; the Engine validates and reports deterministic
  Queue facts; a user only decides genuinely new semantic work or authority.
  No human direction manufactures a repair path.
- **Release:** this changes `DEEP_RESEARCH_HARNESS/` behavior and requires
  release `v0.75`, including the normal `CHANGELOG.md` and `RUN.md` banner
  update during apply. No dependency is added.

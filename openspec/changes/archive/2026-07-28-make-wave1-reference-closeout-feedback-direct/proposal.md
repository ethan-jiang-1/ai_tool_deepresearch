## Why

BUG-142 的历史 bundle 把可 materialize 的 submitted backing 与 `ledger_coverage`
等下游症状同时暴露给 Phase Agent，容易把 reader 引回已经结束的
work-unit 路径。current head 已有 canonical projection、index sync 和 same-inspect
闭环；本 change 不重造它，而是让 Engine 在该 prerequisite 存在时返回唯一、
可执行且不竞争的 closeout feedback。

这使下一位 Phase Agent 能直接回答一个有界问题：此 Topic 当前是否应先从 exact
submitted backing materialize canonical consumer projection，还是确实缺少 backing。

## What Changes

- Refine Wave1 convergence feedback so an available canonical-materialization
  candidate is the sole primary repair root within the existing convergence
  branch. The existing convergence evaluator already short-circuits its
  index-sync and floor outcomes behind materialization. Separately evaluated
  legacy-path, index, ledger, queue, receipt, provenance, and structural
  findings remain primary roots unless their own evaluator emits them as
  dependent; this change adds no cross-rule masking inference.
- Project the existing candidate-exact canonical target/backing coordinates
  through the normal inspect and formal Gate hint surfaces, with one existing
  rerun command. The feedback names a Phase-owned closeout action; it never
  authorizes a ledger write, submitted-result mutation, supplementary demand,
  source selection, or web search.
- Tighten Wave1 Phase guidance around the already accepted loop: materialize
  only from the returned submitted candidate through existing persistence,
  synchronize the existing index, refresh the existing seed packet, and rerun
  the same inspect. A true supplementary path remains available only after
  convergence reports a post-closeout floor deficit.
- Add focused unit/integration coverage for direct materialization feedback,
  independent roots remaining visible, invalid/absent backing, and the
  same-check rerun contract. A full real-Agent observation remains
  supplementary evidence, not an apply blocker for this deterministic feedback
  projection.
- No ledger, queue, receipt, submitted output declaration, evidence authority,
  or new runtime state changes. This change requires framework patch version
  bump `v0.60`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `research-wave-gate-implementation`: refine `RWG-017` and `RWG-021` so
  Wave1 convergence projects one candidate-exact direct materialization root
  before its own downstream index/floor outcomes into inspect/Gate feedback,
  while preserving separately evaluated roots.
- `research-wave-phase-content`: refine `RWP-015` so the Phase Agent consumes
  the existing direct closeout feedback through the existing materialize,
  index-sync, seed-refresh, same-inspect loop.

## Impact

- Affected code: the existing Wave1 convergence finding/projection path and
  shared inspect/Gate hint projector; no new CLI or writer is introduced.
- Affected guidance: `phase-wave1.md` only where it consumes this feedback.
- Direct Sources of Record remain submitted work-unit rows, their accepted
  backing/cache facts, canonical projection files, and the existing index. The
  new feedback is a read-only projection, never another evidence authority.
- Semantic precision: Phase Agent and maintainer can stop at one exact
  closeout-vs-missing-backing distinction without reconstructing all legacy
  diagnostics. The distinction between a primary prerequisite and an
  independent authority failure remains explicit.
- Simple control: `convergence direct facts -> one primary hint -> existing
  closeout action -> same inspect` replaces competing feedback, rather than
  adding a controller, state, retry tree, or validator.
- Responsibility: Engine classifies and projects deterministic roots; the
  Phase Agent executes existing legal closeout operations; the user supplies no
  ordinary command or new permission. An unavailable writer remains a direct
  `missing_contract` boundary.

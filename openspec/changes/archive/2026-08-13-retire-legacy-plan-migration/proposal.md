## Why

当前 `PlanSchema` 仍接受无 canonical marker 的旧 mutable `rb_plan.md`，并让
current Engine 在 sanctioned rerun 中通过 `migrate_legacy` 将其改写为 canonical
topic identity。新 bundle 已只写 `topic_registry_version: "2"`，而 active topic
execution 已要求 canonical plan；保留这条历史 re-entry 分支会让 current contract
同时承诺两套 plan family。

用户已选择 C4b 的 A policy：历史 mutable plan 只可人工阅读，current Engine 不再
inspect、reenter 或 migrate 它。该决策来源于
`_backlog/plans/current-contract-signal-cleanup/changes/C4b-retire-legacy-plan-migration.md`。

## What Changes

- **BREAKING** 收敛 `PlanSchema` 至 canonical `topic_registry_version: "2"` plan；删除
  `LegacyPlanSchema`、legacy topic-entry export 与对旧 mutable plan 的正向 acceptance。
- **BREAKING** 删除 `operate-topic-state` 的 `migrate_legacy` input、inspect migration
  advice，以及任何将旧 plan 转为 canonical plan/seed identity 的 Engine 路径。
- 对旧 mutable plan 统一复用当前 schema/inspect 的 invalid-contract boundary：通用
  `PlanSchema` consumers fail closed；topic-state inspect、reentry、queue admission 和
  post-final recovery 不再给出 migration route、workspace 或 repair authority。
- 保留 canonical UID、`previous_layouts[]`、current layout mutation、seed binding、rerun、
  provenance、receipt 与 recovery 语义；不重写历史 evidence、ledger、receipt、reference
  或 bundle bytes。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `engine/schema-core`: `PlanSchema` 由 canonical-plus-legacy union 收敛为唯一的
  canonical plan contract。
- `research/canonical-topic-state`: topic-state inspect/apply 不再识别或迁移 legacy
  mutable plan，只处理 canonical topic identity。
- `research/post-final-recovery`: post-final reentry 不再保留 legacy-plan migration 作为
  historical addendum 获得 canonical identity 的后续路径。
- `agent/queue-input-validation`: legacy plan 不再被描述为可在 rerun 中迁移的可达
  queue-admission repair，而是 current plan-contract rejection。
- `workflow/rerun-incremental-node`: rerun Phase 不再把 legacy reconciliation 作为
  可准备的 topic-state apply form。
- `research/seed-topic-materialization`: Seed Topics readiness 不再保留 legacy
  slug-only seed success path。
- `engine/runtime-reentry-debuggability`: reentry 不再把旧 mutable plan 连接到
  C5 后的 topic migration；它只消费既有 canonical topic-state invalid boundary。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/schema-core` | `openspec/specs/engine/schema-core/spec.md` 的 `PlanSchema validates frontmatter fields`，以及 `schema/contracts/plan.mjs` | Modify | 该 spec 与 schema 直接定义 legacy union、canonical marker 和 migrated legacy plan。 |
| `research/canonical-topic-state` | `canonical-topic-state/spec.md` 的 stable identity、atomic mutation、operation scope requirements，以及 `canonical-topic-state.mjs` | Modify | 它拥有 inspect 的 legacy mode 与 `migrate_legacy` writer/recovery operation。 |
| `engine/runtime-reentry-debuggability` | `runtime-reentry-debuggability/spec.md` 的 canonical topic-state inspection requirements，以及 `check-reentry.mjs` | Modify | scan 发现 RRD-009 仍承诺 old plan 可经 C5 后到达 migrate；actual reentry 已消费 shared invalid boundary，必须同步其 reader contract。 |
| `research/post-final-recovery` | `post-final-recovery/spec.md` 的 historical addendum scenario | Modify | 它明确承诺 C5 reentry 后仍可通过 `migrate_legacy` 获得 canonical identity。 |
| `agent/queue-input-validation` | `queue-input-validation/spec.md` 的 canonical seed binding / legacy enqueue scenario | Modify | 它把 legacy plan 拒绝连接到 legal rerun/migrate boundary，必须随 migration retirement 收敛。 |
| `workflow/rerun-incremental-node` | `rerun-incremental-node/spec.md` 与 `workflows/nodes/phases/phase-rerun.md` | Modify | Phase 仍把 `migrate_legacy` 呈现为一个完整 rerun apply form，属于 Agent-facing positive compatibility path。 |
| `research/seed-topic-materialization` | `seed-topic-materialization/spec.md` 的 canonical/legacy seed readiness clauses | Modify | 当前 spec 仍允许 resumed legacy bundle 的 slug-only seed compatibility path；该路径必须与 PlanSchema current-only boundary 同步退出。 |
| `research/pre-research-gate-implementation` | Setup-ready 的 `PlanSchema` requirement 与 gate implementation | Verify-only | Gate 继续只消费 `PlanSchema`，无需新增 legacy-specific Gate rule。 |
| `bundle/file-observability` | accepted file-observability spec 与 current reader inventory | Verify-only | 仅诊断文件，不拥有 legacy plan acceptance 或 migration。 |
| `research/canonical-topic-state` | `canonical-topic-state/spec.md` 的 current/previous layout requirement 与 `topic-layout.mjs` | Excluded | `previous_layouts[]` 是 canonical current lineage，不是 legacy mutable-plan compatibility。 |
| `research/reference-flat-format` | C4b card的 boundary and current reference resolver | Excluded | reference metadata historic-reader policy 由 C5a 单独决定。 |
| `agent/delegated-work-units` | C4b card and work-unit inventory | Excluded | historical attempt/transaction contracts 属于 C6，不由 plan migration change 改动。 |

## Impact

- Target code: `schema/contracts/plan.mjs`、schema barrel、canonical topic-state
  inspect/apply/schema projection、以及需要删除 migration feedback 的 reentry/queue/post-final
  consumers and guidance.
- Verification: schema plan contract、topic-state mutation/recovery、queue admission、HITL1/
  Setup/reentry/post-final shared readers，以及 canonical layout, rerun and evidence continuity。
- No new dependency、CLI、state、migration、version router、automatic conversion 或 user
  decision point；historic files keep their on-disk bytes and human readability.

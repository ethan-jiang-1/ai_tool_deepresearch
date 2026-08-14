## Why

当前 rich-reference writer 已只产生 UID binding，但 Engine 仍把历史
`related_topic` 当作 Gate、索引、observability 与 provenance 的有效输入。这保留了一个
仅为历史兼容存在的正向 reader 分支，使当前可执行契约与作者契约不一致。

根据
[`C5a-2` 审批卡](../../../_backlog/plans/current-contract-signal-cleanup/changes/C5a2-historic-reference-reader-policy.md)，
本 change 落实用户确认的 strict current-only 选择 B：旧 reference 仍供人直接阅读，
但不再由 current Engine 解释为可计数 evidence。

## What Changes

- **BREAKING**：current Engine 的 shared reference-binding adapter 只接受当前 UID
  binding（一个 `related_topic_uid`、`all` sentinel，或 exact
  `related_topic_uids` subset）。任何含有历史 `related_topic` key 的 reference，包括
  empty value 和同时带有有效 UID form 的 dual declaration，一律返回一个 adapter-owned
  unsupported-current-contract binding result。
- **BREAKING**：Gate、inspect、file observability、reference index、provenance 与
  rerun 的所有 reader 复用该单一结论；历史 binding 不得通过某个 consumer 的 fallback
  重新成为 current evidence、topic attribution 或 countable coverage。
- 保留历史 Markdown 的字节、路径和人工可读性；不执行 mass rewrite、migration、copy、
  convert 或自动 repair。拒绝结果只定位 reference metadata 这一直接失败边界，不提供
  指向历史文件的原地 `write_to`；若仍需该 evidence，Agent 只能走现有正常
  materialization 路径创建新的 current UID-bound reference。
- 保留 `previous_layouts[]` 对仍使用 UID binding 的 current/historical provenance
  的既有作用。该 change 不改变 topic layout alias 对其它 artifact family 的 reader
  行为。
- 为 UID-only reference、legacy-only reference、dual form、Gate/index/inspect/
  observability/provenance/rerun 传播添加定向回归证据。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/canonical-topic-state` | `spec.md` canonical resolver and legacy-binding requirements | Modify | Owns the one shared binding adapter and its accepted forms. |
| `bundle/reference-flat-format` | `spec.md` rich-reference metadata contract | Modify | Owns which metadata forms make a reference structurally valid for current Engine consumption. |
| `research/research-wave-gate-implementation` | `spec.md` Wave1 reference, layout aggregation, and historic-binding scenarios | Modify | Owns Gate countability and evidence attribution consequences. |
| `engine/cli-inspect-output-conventions` | `spec.md` shared adapter inspection requirements | Modify | Owns inspect's diagnostic treatment of a rejected current binding. |
| `bundle/file-observability` | `spec.md` canonical-topic footprint audit requirements | Modify | Owns deterministic observability of reference binding drift. |
| `workflow/rerun-topic-integration` | `spec.md` rerun reference format and current cardinality rules | Modify | Owns rerun consumption and authoring boundary. |
| `research/research-wave-phase-content` | `spec.md` current writer-form requirement | Verify-only | C5a-1 already owns UID-only new writer forms; this change does not alter authoring. |
| `agent/delegated-work-units` | catalog and existing current binding scope | Excluded | No work-unit identity, assignment, or submit contract changes. |
| `verification/experiment-agent-autorun` | capability catalog | Excluded | C5b owns retained experiment-history policy and remains out of scope. |
| `verification/experiment-observability` | capability catalog | Excluded | C5b owns retained experiment-history policy and remains out of scope. |
| `verification/experiment-ref-integrity` | capability catalog | Excluded | C5b owns retained experiment-history policy and remains out of scope. |
| `verification/experiment-run-strategy` | capability catalog | Excluded | C5b owns retained experiment-history policy and remains out of scope. |
| `verification/experiment-shared-infra` | capability catalog | Excluded | C5b owns retained experiment-history policy and remains out of scope. |

### New Capabilities

None.

### Modified Capabilities

- `research/canonical-topic-state`: restrict current reference-binding reader
  acceptance to UID forms and define the retired-key-presence rejection conclusion.
- `bundle/reference-flat-format`: distinguish preserved human-readable legacy
  Markdown from a reference that is structurally eligible for current Engine
  evidence consumption.
- `research/research-wave-gate-implementation`: make every reference containing
  the retired key non-countable and prevent it from satisfying current
  Gate/provenance paths.
- `engine/cli-inspect-output-conventions`: present the shared legacy-binding
  rejection without consumer-specific fallback diagnostics.
- `bundle/file-observability`: report the common rejection boundary without
  inferring a legacy id/slug or creating a second topic-identity reader.
- `workflow/rerun-topic-integration`: keep rerun authoring UID-only and refuse
  references containing the retired key as current rerun evidence without rewriting them.

## Impact

- Primary implementation surface: `DEEP_RESEARCH_HARNESS/engine/helpers/topic-layout.mjs`
  and its Gate, index, observability, inspect, provenance, and rerun consumers.
- Existing run bundles containing references with `related_topic` remain
  readable to people but will fail the affected current Engine evidence path
  until an Agent makes a new UID-bound current reference through the legal
  normal materialization route.
- No dependencies, new commands, migration tools, durable states, or new
  runtime authorities are introduced. C5b experiment retained history and C6
  work-unit contracts are explicitly excluded.

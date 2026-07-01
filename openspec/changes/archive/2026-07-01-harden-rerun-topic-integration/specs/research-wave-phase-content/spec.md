# Research Wave Phase Content (delta)

> req: RWP-012, RWP-013

## ADDED Requirements

### Requirement: Wave2 rerun full re-synthesis on topic addition

`phase-wave2.md` Rerun-Aware Behavior section SHALL 包含场景表，区分 `action: add`（全量重合成）和 `action: supplement`（delta/append）。

`action: add` 行为 SHALL 与 wave0（`phase-wave0.md` L266）和 wave1（`phase-wave1.md` L404）的 `action: add` 语义对齐：全量执行，与首次运行一致。

`action: add` 时：
- Phase Agent SHALL 重读所有 topic（包括新增 topic）的 evidence-summary.md
- Phase Agent SHALL 重建 cross-topic scan matrix 覆盖全部 topic pair
- Phase Agent SHALL 从 scratch 生成 synthesis.md、cross-topic-ledger.md、finding-index.yaml
- 旧 synthesis 可保留为备份（`*.prev-rerun-N.md`），但不作为 baseline

`action: supplement` 时保持当前 delta/append 行为（`phase-wave2.md` L351-376 现有文本）。

Gate wave2-complete SHALL include a rerun add coverage check: when any seed topic declares `action: add`, `synthesis.md` SHALL NOT use `## Delta Synthesis` as the main processing path, and `cross-topic-ledger.md` or `finding-index.yaml` SHALL cover all topic slugs from `rb_plan.md` topic_registry.

For `action:add`, slug-name coverage alone SHALL NOT be sufficient when the added topic can be identified. The gate SHALL also verify that the added topic participates in cross-topic scan coverage with every pre-existing topic, either through explicit topic-pair rows in `cross-topic-ledger.md` or equivalent structured entries in `finding-index.yaml`.

#### Scenario: Wave2 rerun action:add triggers full synthesis

- **WHEN** seed topic 文件含 `action: add`（新 topic）
- **THEN** Phase Agent SHALL 全量重合成，不追加 delta section
- **AND** synthesis.md SHALL NOT 含 `## Delta Synthesis (Rerun N)` header
- **AND** gate SHALL fail if scan/index coverage omits any topic slug
- **AND** gate SHALL fail if the added topic has no scan coverage with any pre-existing topic

#### Scenario: Slug-only coverage is insufficient for added topic

- **WHEN** seed topic 文件含 `action: add`
- **AND** `finding-index.yaml` lists all topic slugs but no topic-pair or scan evidence involving the added topic
- **THEN** wave2 gate SHALL fail with inspect/advice requesting full cross-topic scan coverage

#### Scenario: Wave2 rerun action:supplement keeps delta mode

- **WHEN** seed topic 文件含 `action: supplement`
- **THEN** Phase Agent SHALL 保留已有 synthesis 为 baseline
- **AND** 新增分析 SHALL 以 `## Delta Synthesis (Rerun N)` header 追加

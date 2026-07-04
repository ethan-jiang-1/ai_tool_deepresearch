# seg2node (delta)

## REMOVED Requirements

### Requirement: 统一使用 "node" 替代 "segment" 作为动态 MD 加载单元的名称

**Reason**: `seg2node` / `SEG-001` 是一次性历史术语迁移，不是持续 capability。当前 repo 在排除 `openspec/specs/`、`openspec/changes/archive/`、`openspec/governance/req-registry.yaml` 后，`seg2node` / `SEG-001` 无活锚点；旧名称 `segmentPath`、`SegmentFrontmatter`、`SEGMENTS_DIR`、`segments-*` 的当前非历史命中也不再指向活实现。当前 node 加载、显式 node directory、frontmatter preservation 等活行为已经由 `dynamic-node-loading`、`workflow-node-contract`、`workflow-chain.mjs` 和相关 tests/playbooks 承接。

**Migration**: 删除 `openspec/specs/seg2node/` main spec。保留 `openspec/changes/archive/` 中的历史迁移记录。按 RET-005 在 `openspec/governance/req-registry.yaml` 中保留 `SEG-001` 并标注 `[DEPRECATED]`；将 `SEG` prefix 标注为 `all entries deprecated; no spec directory`。未来不得复用 `SEG-001` 表示新语义。

#### Scenario: seg2node no longer appears as current accepted capability

- **WHEN** apply 阶段完成退休
- **THEN** `openspec/specs/seg2node/spec.md` SHALL NOT exist
- **AND** `SEG-001` SHALL remain in `openspec/governance/req-registry.yaml` with `[DEPRECATED]`
- **AND** `openspec/changes/archive/` SHALL retain the historical `seg2node` change unchanged

#### Scenario: current node-loading behavior remains covered elsewhere

- **WHEN** developer needs current node loading or explicit node directory requirements
- **THEN** developer SHALL read the active capabilities that own those behaviors, such as `dynamic-node-loading` and `workflow-node-contract`
- **AND** developer SHALL NOT treat `seg2node` as an active current capability

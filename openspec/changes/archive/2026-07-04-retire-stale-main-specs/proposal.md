## Why

`openspec/specs/` 是 accepted behavior 的入口，不应该长期保留已经完成、且当前代码和控制面都不再需要的历史迁移 spec。用户在本轮讨论中指出：如果代码里已经没有了，main spec 还留着就是噪声；本 change 先清理一处高置信案例，避免后续 Agent 把历史 rename 当成当前能力继续引用。

原始需求来源：本轮用户要求“好好审视挖掘一下，代码里确实没有了就清理；一旦犹豫、把不准，就别管”，并明确 `openspec/changes/archive/` 是历史痕迹，不要清理。

## What Changes

- **退休 `seg2node` main spec**：`SEG-001` 描述的是一次历史 `segment` -> `node` 术语迁移，不是持续 capability。当前 repo 中 `seg2node` / `SEG-001` 在排除 `openspec/specs/`、`openspec/changes/archive/`、registry 后无命中。
- **保留历史 archive**：不修改 `openspec/changes/archive/`。archive-only 命中不作为 main spec 仍然 alive 的证据，也不作为本 change 的清理对象。
- **保守审计边界**：只处理高置信退休项。搜不到 requirement ID 或 capability 名但仍有当前文件/命令/phase/playbook 锚点的 spec 不退休，后续如需同步措辞另开 sync change。
- **Requirement registry 退休标记**：apply 阶段按 RET-005 规则保留 `SEG-001`，将其标注 `[DEPRECATED]`，并把 `SEG` prefix 标为 `all entries deprecated; no spec directory`。delta spec 不用 `> req: SEG-001` 声明退休 ID，避免 apply 后被 governance 判定为 reused retired。
- **整 capability 退休手动落地**：OpenSpec 默认 REMOVED delta 只能删除 requirement block；`seg2node` 只有 1 个 requirement，默认 archive 会重建出空 spec 并失败。apply 阶段 SHALL 手动删除 `openspec/specs/seg2node/` 并更新 registry；archive 阶段 SHALL 使用 `openspec archive retire-stale-main-specs --skip-specs`，把 delta 留作审计记录。

不产出：
- 不改 `DPT_FRAMEWORK/` 行为，不删除当前 engine / CLI / workflow / tests。
- 不清理 `_backlog/` 或 `openspec/changes/archive/`。
- 不把漂移但仍有活锚点的 specs 误删；例如 `cmd-subagent-environment`、`run-entry`、`test-fixtures`、`wave0-artifacts-directory`、`content-delivery-*`、`pre-research-*`、`playbook-runner` 等，本 change 只记录审计结论，不修改。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `seg2node`: REMOVED `SEG-001`，将一次性术语迁移从 current accepted specs 中退休。

## Impact

- `openspec/specs/seg2node/`: apply 阶段删除 main spec 目录。
- `openspec/governance/req-registry.yaml`: apply 阶段保留 `SEG-001` 但标注 `[DEPRECATED]`，并标记 `SEG` prefix 无 main spec directory。
- `openspec/changes/archive/`: 不修改。
- Archive command: 使用 `--skip-specs`，因为 specs 已在 apply 阶段手动同步为“整 capability 删除”。
- Version bump: 否。本 change 只清理 OpenSpec main spec 噪声，不改变 `DPT_FRAMEWORK/` runtime 行为。

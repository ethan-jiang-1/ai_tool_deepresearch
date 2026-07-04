## Context

本 change 接在 `spec-reality-sync` 之后，但目标不同：上一轮同步“仍然活着但文本漂移”的 specs；本轮只退休“已经不是当前能力”的 main spec。用户明确要求：代码里确实没有了再清理；只要有一点犹豫就不碰；`openspec/changes/archive/` 作为历史痕迹保留。

当前 `seg2node` main spec 描述的是 2026-06-17 的一次性术语迁移。只读审计结果：

```bash
rg -n "seg2node|SEG-001" -S \
  --glob '!openspec/specs/**' \
  --glob '!openspec/changes/archive/**' \
  --glob '!openspec/governance/req-registry.yaml' \
  --glob '!_original_*' --glob '!**/_original_*' .
```

结果为空。进一步搜索旧术语 `segmentPath` / `SegmentFrontmatter` / `SEGMENTS_DIR` / `segments-*` 时，当前非历史命中只剩 `openspec/specs/seg2node/spec.md` 自身；其余在 `_backlog/_done/` 或 archive。当前 framework 使用 `nodePath` / `NodeFrontmatter` / explicit `nodesDir` 的活约束已由 `dynamic-node-loading`、`workflow-node-contract`、`workflow-chain.mjs` 等承接，不需要 `seg2node` 作为独立 accepted capability。

## Goals / Non-Goals

**Goals:**

- 将 `seg2node` 从 current main specs 中退休，减少 accepted spec 噪声。
- 保持 requirement ID 不复用：`SEG-001` 只标废弃，不删除。
- 明确审计规则，防止把“搜不到名字但实际还活着”的 specs 误删。

**Non-Goals:**

- 不修改 `openspec/changes/archive/`。
- 不清理 `_backlog/`、历史文档或普通英文 “path segment” 用词。
- 不修改 `DPT_FRAMEWORK/`、tests、playbooks、runtime behavior。
- 不退休任何仍有活锚点或只是措辞漂移的 specs。

## Decisions

### D1. Archive-only evidence does not keep a spec alive

`openspec/changes/archive/` 是历史记录，不是 current accepted behavior surface。审计命令排除 archive；archive 中仍有 `seg2node` 和旧 `segments-*` 命中是预期历史，不作为 main spec 继续保留的理由。

Alternative considered: 清理 archive 或用 archive 命中阻止 retirement。拒绝，因为用户明确要求 archive 不碰，且 archive 的用途就是保留历史。

### D2. Retirement requires positive absence plus semantic classification

只用 grep 为空不够。退休必须同时满足：

1. 当前 repo 中 capability name / req ID 无活锚点；
2. capability 语义是已完成迁移、已删除原型或已被后续 capability 吸收；
3. 没有当前 engine / CLI / workflow node / test / playbook / guideline / governance 仍依赖它。

`seg2node` 满足三条。`cmd-subagent-environment`、`run-entry`、`test-fixtures`、`wave0-artifacts-directory` 等虽然 req ID/name 命中少，但有实际文件/模板/命令锚点，因此不退休。

### D3. Retire whole capability manually, keep REMOVED delta as audit record

OpenSpec change 中创建 `specs/seg2node/spec.md`，使用 `## REMOVED Requirements`，写明 Reason 和 Migration。该 delta spec 不声明 `> req: SEG-001`，因为 apply 后 `SEG-001` 会成为 retired ID；若 active delta 继续声明 retired ID，`check-project-reqs.mjs` 会按 reusedRetired fail-closed。

`seg2node` 是整 capability 退休，且 main spec 只有 1 个 requirement。OpenSpec 默认 spec application 的 REMOVED operation 只会删除 requirement block，不会删除 capability directory；删完后会得到 0-requirement main spec，而 OpenSpec `SpecSchema` 和本项目 `check-project-specs.mjs` 都不接受空 main spec。因此本 change 不依赖 archive 自动 apply spec delta 来修改 main specs。

Apply 阶段手动删除 `openspec/specs/seg2node/`，并在 registry 中按 RET-005 标记：

- `SEG-001: ... [DEPRECATED]`
- `SEG: seg2node # all entries deprecated; no spec directory`
- 废弃 capability 组按 registry 既有约定放在废弃区。

Archive 阶段使用 `openspec archive retire-stale-main-specs --skip-specs`。delta spec 作为历史审计记录保留在 archive 中，不再由 archive 自动重放到 main specs。

Alternative considered: 留空 main spec 或把 `seg2node` 改成“历史说明”。拒绝，因为 main specs 是 current accepted behavior，不应承载历史说明；历史说明已经在 archive。

Alternative considered: 让 `openspec archive` 自动应用 REMOVED delta。拒绝，因为该路径只删除 requirement block，不删除空 capability directory，会在 0 requirements 时失败或留下违反项目治理的空 spec。

## Risks / Trade-offs

- [Risk] 未来有人想知道 segment -> node 迁移历史。Mitigation: archive 保留完整 proposal/design/tasks/spec delta；registry 保留废弃 ID。
- [Risk] 误把仍活着的低命中 spec 当 stale。Mitigation: 本 change 只退休 `seg2node`，其他候选只记录审计结论，不修改。
- [Risk] Registry 排序/废弃区处理错误导致 governance fail。Mitigation: apply tasks 明确运行 `check-project-reqs.mjs` 和 `check-project-specs.mjs`。

## 1. Apply audit guard

- [x] 1.1 退休 SEG-001: 重新运行高置信退休审计，确认 `rg -n "seg2node|SEG-001"` 在排除 `openspec/specs/**`、`openspec/changes/archive/**`、`openspec/governance/req-registry.yaml`、`_original_*` 后仍无命中。
- [x] 1.2 退休 SEG-001: 重新运行旧术语 targeted grep，确认 `segmentPath`、`SegmentFrontmatter`、`SEGMENTS_DIR`、`segments-*` 的当前命中仅为 `openspec/specs/seg2node/spec.md`、archive、backlog 或非 capability 语义；若发现 current engine/CLI/workflow/test/playbook 锚点，则停止退休。

## 2. Retire seg2node main spec

- [x] 2.1 退休 SEG-001: 删除 `openspec/specs/seg2node/` main spec 目录；不修改 `openspec/changes/archive/`。这是整 capability 退休，不能只依赖 OpenSpec REMOVED 自动删 requirement block，因为 `seg2node` 只有 1 个 requirement，自动重建会产生 0-requirement main spec。
- [x] 2.2 退休 SEG-001: 更新 `openspec/governance/req-registry.yaml`，将 `SEG-001` 标注 `[DEPRECATED]`，并将 `SEG: seg2node` prefix 标注为 `all entries deprecated; no spec directory`。
- [x] 2.3 退休 SEG-001: 按 RET-005 registry 约定整理废弃 capability 组，确保 `SEG-001` 保留在废弃区且永不复用。
- [x] 2.4 退休 SEG-001: 确认 active delta `openspec/changes/retire-stale-main-specs/specs/seg2node/spec.md` 不含 `> req: SEG-001` 声明，避免 `SEG-001` 标废弃后触发 reusedRetired。

## 3. Safety checks

- [x] 3.1 退休 SEG-001: 运行 `node openspec/governance/check-project-reqs.mjs`，必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [x] 3.2 退休 SEG-001: 运行 `node openspec/governance/check-project-specs.mjs`，必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。
- [x] 3.3 退休 SEG-001: 运行 `openspec validate retire-stale-main-specs`，必须 PASS。
- [x] 3.4 退休 SEG-001: 运行 `openspec status --change retire-stale-main-specs --json`，确认 proposal/design/specs/tasks 均完成并 apply-ready。

## 4. Archive note

- [x] 4.1 退休 SEG-001: 完成 apply 和 safety checks 后，归档时使用 `openspec archive retire-stale-main-specs --skip-specs`，因为 main spec 删除已经在 apply 阶段手动完成；delta spec 只作为 archive 中的审计记录保留。

## 1. 注册 Requirement ID

- [x] 1.1 在 `openspec/governance/req-registry.yaml` 注册 WNC-001 到 WNC-006（`workflow-node-contract`，缩写 WNC）和 GSK-001 到 GSK-003（`gate-skeleton`，缩写 GSK）（`workflow-node-contract`，缩写 WNC）和 GSK-001 到 GSK-003（`gate-skeleton`，缩写 GSK）
  - WNC-001: Phase node metadata contract
  - WNC-002: Shared node metadata contract
  - WNC-003: Phase manifest structure
  - WNC-004: Phase node body structure
  - WNC-005: Final node terminal semantics
  - WNC-006: Skeleton completeness criteria
  - GSK-001: Gate definition JSON skeleton structure
  - GSK-002: Gate CLI skeleton shape
  - GSK-003: One gate per CLI

## 2. 创建 Phase Node 骨架

- [x] 2.1 实现 WNC-001, WNC-004: 创建 `phase-instantiation.md`
- [x] 2.2 实现 WNC-001, WNC-004: 创建 `phase-hitl1.md`
- [x] 2.3 实现 WNC-001, WNC-004: 创建 `phase-setup.md`
- [x] 2.4 实现 WNC-001, WNC-004: 创建 `phase-wave0.md`
- [x] 2.5 实现 WNC-001, WNC-004: 创建 `phase-wave1.md`
- [x] 2.6 实现 WNC-001, WNC-004: 创建 `phase-wave2.md`
- [x] 2.7 实现 WNC-001, WNC-004: 创建 `phase-hitl2.md`
- [x] 2.8 实现 WNC-001, WNC-004: 创建 `phase-readiness.md`
- [x] 2.9 实现 WNC-001, WNC-004, WNC-005: 创建 `phase-final.md`

## 3. 创建 Shared Node 骨架

- [x] 3.1 实现 WNC-002: 创建 `shared-profile.md`
- [x] 3.2 实现 WNC-002: 创建 `shared-gate-rules.md`
- [x] 3.3 实现 WNC-002: 创建 `shared-schemas.md`
- [x] 3.4 实现 WNC-002: 创建 `shared-repair-guidance.md`
- [x] 3.5 实现 WNC-002: 创建 `shared-anti-cheating-rules.md`

## 4. 创建 Manifest 和 Gate 骨架

- [x] 4.1 实现 WNC-003: 创建 `manifest.json`
- [x] 4.2 实现 GSK-001: 创建 8 个 Gate definition JSON 骨架
- [x] 4.3 实现 GSK-002, GSK-003: 创建 8 个 Gate CLI 骨架

## 5. Review 验证

- [x] 5.1 实现 WNC-006: 验证每个 node 的 frontmatter 可被正则提取并 JSON.parse
- [x] 5.2 实现 WNC-006: 验证每个 gate CLI 可被 `node` 执行且返回合法 JSON
- [x] 5.3 实现 WNC-006: 验证每个 gate definition JSON 可被 `JSON.parse` 且包含 `gate`、`description`、`rules` 字段
- [x] 5.4 对照 `_backlog/workflow/breakdown/01-phase-a-workflow-contract-skeleton.md` 的 A01-1 到 A01-9 验收标准逐条检查
- [x] 5.5 验证 manifest.json 的 phase order 为 `instantiation → hitl1 → setup → wave0 → wave1 → wave2 → hitl2 → readiness → final`，正好 8 个 non-terminal gates
- [x] 5.6 对照 `_backlog/workflow/breakdown/90-review-checklist.md` 的 lifecycle/node/gate 相关检查项逐条检查

## 6. 收尾检查

- [x] 6.1 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS
- [x] 6.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS

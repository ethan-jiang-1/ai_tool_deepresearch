# Proposal: align-version-scheme-major-minor-build

## Why

root `CHANGELOG.md` 的历史条目按 `v0.1 … v0.90` 一个点号逐步堆积，粒度过细、
维护价值低（每次小改动都升一个版本）。2026-08-17 已决定重置：版本号改为
`MAJOR.MINOR.BUILD` 双点号（当前 `0.2.0`），历史细碎 `v0.x` 条目整体退役
（不再逐条保留在 CHANGELOG 文件中，由 git history 承担可查阅性）。

## What Changes

- **新增 bump 工具（本 change 的核心价值）**：创建
  `openspec/governance/bump-version.mjs`——读取 root `CHANGELOG.md` 当前
  `MAJOR.MINOR.BUILD` 标题，按显式段 flag 生成并插入新版本标题；配
  `tests/governance/bump-version.test.mjs` 确定性测试锁定全部行为。
- **版本号格式重置**：root `CHANGELOG.md` 版本标题从单点号 `v0.x` 改为双点号
  `MAJOR.MINOR.BUILD`（如 `0.2.0`、`0.2.1`、`0.3.0`），`0.2.0` 为切换点。
- **历史条目退役**：`v0.1 … v0.90` 的细碎条目不再要求留在 CHANGELOG 文件中；
  `SHALL remain inspectable as history` 改为「由 git history 承担可查阅性，
  CHANGELOG 正文只保留当前双点号体系下的简洁历史」。
- **bump 权限边界**：自动过程（Agent/工具）只能递增 `BUILD`（最后一段），
  且须经人授权；`MINOR` 及以上递增必须由人显式决定，不允许自动升级。
- **bump 粒度约束**：版本号（含 `BUILD`）只应在有较大、有意义的变更后前进；
  琐碎/逐条改动不 bump 版本号。bump 工具必须显式指定段
  （`--build` / `--minor` / `--major` 三选一），无参数即拒绝并提示——
  不存在「顺手一跑就升版本」的默认路径，每次 bump 都是有意为之。

零 Harness 运行时行为变化（无 Engine/schema/gate/trace/bundle 变更；新增的
`bump-version.mjs` 是治理 CLI，不属于 Harness 运行时面）：CHANGELOG 本就不
是运行时版本权威（VEM-001 已规定非权威人类历史；framework_version 印章已于
v0.90 退役）。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `governance/version-management`：MODIFY VEM-001（CHANGELOG is concise
  non-authoritative human history）——版本标题格式改为双点号
  `MAJOR.MINOR.BUILD`；历史 `v0.x` 条目退役、可查阅性移交 git history；
  自动 bump 只允许 `BUILD` 段，`MINOR` 及以上必须由人显式决定。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `governance/version-management` | 全 spec（VEM-001~004，含 root CHANGELOG 历史角色与 RUN.md 不投影版本）；root `CHANGELOG.md` 现状；`check-content-drift.mjs:64`（`DEEP_RESEARCH_HARNESS/CHANGELOG.md` required-absent） | Modify | 版本号格式与历史条目角色都在 VEM-001 的正文与 scenario 中；新规则（双点号 + bump 边界）是 VEM-001 行为的修改，不是新 capability |
| `verification/verification-routing` | spec 的 unit 边界（line 34/90/143：`tests/` 内非 integration/e2e 的聚焦测试） | Verify-only | 新增 `tests/governance/bump-version.test.mjs` 属 unit 类；不修改 verification-routing 契约，验证计划按现有边界声明 claim |
| `governance/semantic-fact-closure` | 未读（不涉及 runtime fact family） | Excluded | 纯文档/规范校准，不改任何运行时事实族 |
| `governance/guidance-constitution` | 未读（不涉及 AGENTS.md/CLAUDE.md 或 guidance 拓扑） | Excluded | 不触碰 guidance 文件 |

## Impact

- 新增 `openspec/governance/bump-version.mjs`（治理 CLI，纯 Node ESM 无依赖）
  与 `tests/governance/bump-version.test.mjs`（unit 类确定性测试）。
- 修改 `openspec/specs/governance/version-management/spec.md`（VEM-001
  正文 + scenario）。root `CHANGELOG.md` 已重置为 0.2.0 双点号。
- 无 Engine、CLI、schema、gate、trace、bundle 或其它测试影响。
- `DEEP_RESEARCH_HARNESS/` 零改动；`RUN.md` 无版本 banner（VEM-003 已满足，
  本 change 不改）。

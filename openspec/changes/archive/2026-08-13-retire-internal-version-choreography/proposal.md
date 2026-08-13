## Why

根 `CHANGELOG.md` 的内部 `v0.x` 序列、每个 Harness 行为变更必须声明版本、以及
`DEEP_RESEARCH_HARNESS/RUN.md` 必须同步版本横幅，构成了一个没有 package release、Git
tag 或运行时兼容选择器支撑的三方编排。它把历史说明误呈为当前 contract，并持续制造
proposal、测试和入口文档的同步噪声。

本 change 落实
[`C2c` 决策卡](../../../_backlog/plans/current-contract-signal-cleanup/changes/C2c-retire-internal-version-choreography.md)
中用户于 2026-08-13 选择的 A：保留简短、可选的人类 change history，但停止把它当作
内部 release/version authority，也停止强制 `RUN.md` 同步版本横幅。

## What Changes

- 将 repo-root `CHANGELOG.md` 改为可选的人类历史索引，而不是 Harness 版本、Git release
  或 runtime compatibility 的 Source of Record。既有 `v0.x` 条目保留为历史，不重写、删除
  或伪造 Git tag；未来条目不再要求版本号或每次行为变更都更新。
- 移除每个 Harness 行为 change 必须在 proposal 中决定内部版本号、在 Apply 更新 root
  changelog、并同步 `RUN.md` 横幅的治理规则和测试约束。
- 从 `RUN.md` 移除 Harness `v0.x` banner，让现有 Section 0 直接跟在标题后；入口继续只
  说明当前执行路径，不承担 release 投影。
- **BREAKING（内部 Agent-facing contract）**：`RUN.md` 不再提供可解析的 Harness
  `v0.x` identity；任何当前 reader 不得将 changelog heading 或 entry 文档当作版本选择器。
- 更新受影响的 accepted specs、requirement registry、OpenSpec guidance 和 focused tests，
  使它们只验证入口路由与历史文档的非权威边界。
- 对 `openspec/specs/README.md` 的 current catalog row 和其 static-vocabulary
  projection 做同样的对齐，避免导航或测试词汇继续把 retired banner 表述为当前 contract。
- 不重新打开 `framework_version` writer、模板字段、旧 bundle stamp 或
  `bundle/cmd-bundle-instantiation` 的 CMI-007。它们属于已经 governed-archived 的 C2b；
  C2c 只以其 archive evidence 为前提，不重新归属、删除或修改 C2b 的 artifact contract。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `governance/version-management`: 将 changelog 从强制版本 authority 改为可选、非权威的人类历史，并移除强制 version/bump/banner choreography。
- `bundle/run-entry`: 移除入口版本横幅，把 Section 0 直接置于标题之后，同时保留其当前 research-routing 语义。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `governance/version-management` | `openspec/specs/governance/version-management/spec.md`、`openspec/config.yaml`、`CHANGELOG.md`、`tests/engine/version-management.test.mjs` | Modify | VEM-001--VEM-004 当前直接要求 root changelog version authority、每次行为变更更新、banner 一致性和 proposal-time target version；A 明确改变这些 observable governance rules。 |
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md`、`DEEP_RESEARCH_HARNESS/RUN.md`、`tests/integration/md/dpt-research-entry-routing-contract.test.mjs` | Modify | RUE-001 当前要求 version banner，RUE-002 当前把 Section 0 放在 banner 后；A 使 entry reader 只接收当前路由而不接收 internal release identity。 |
| `bundle/cmd-bundle-instantiation` | `openspec/specs/bundle/cmd-bundle-instantiation/spec.md`、C2b archive artifacts、instantiation/version tests | Excluded | CMI-007 and its creation writer were C2b's separate artifact contract. C2b is archived; C2c uses that evidence as a completed ordering precondition and does not reopen stamp deletion, old-frontmatter policy, or bundle-reader behavior. |
| `bundle/artifact-persistence-recovery` | accepted persistence spec 和 `tests/e2e/deep-research-harness-migration.test.mjs` | Verify-only | 迁移 E2E 会失去 banner/changelog assertion，但 bundle isolation、creation、inspection 和 trace persistence 不改变。 |
| `verification/verification-routing` | accepted verification-routing spec 与现有 unit/integration/deterministic-E2E tests | Verify-only | 本 change 仅重新选择已有测试资产；不新增 verification taxonomy 或真实 Agent behavior claim。 |
| `agent/agent-context-routing` | `CONTEXT.md`、root routing instructions 和 run-entry spec | Excluded | 根 routing 仍选择 `RUN.md`，本 change 不改变 entry selection、continuation route 或 request-specific research boundary。 |

## Impact

Apply 将修改 `openspec/config.yaml`、repo-root `CHANGELOG.md` 的非权威历史说明、
`DEEP_RESEARCH_HARNESS/RUN.md`、`governance/version-management` 与 `bundle/run-entry`
main specs/requirement registry、current spec catalog rows，以及版本和 entry focused tests。
不会添加依赖、schema、CLI、Gate、bundle migration、version router、compatibility adapter 或新的
runtime state。

入口读者的有界问题是“已选定 Harness 后下一步是什么”；答案止于 `RUN.md` 的 Section 0
和既有 downstream route。历史读者的有界问题是“人类想回顾什么”；答案止于可选 changelog、
Git 和 governed OpenSpec archive，三者都不决定当前行为。accepted specs 与 executable
contracts 继续决定 current behavior，selected run bundle 继续决定 runtime facts。

这会删除三个互相同步的版本投影和一组机械测试耦合，换成一个直接入口与一个非权威历史
surface。用户已决定是否保留该人类历史；Agent 在获批准后执行文档、governance、spec 和
test 的机械变更；Engine 不获得新权限、不产生新 verdict，也不负责判断历史说明的语义。

**Versioning:** This Harness-facing change requires **no version bump**. The
internal `v0.x` target, its changelog authority, and its `RUN.md` synchronization
are the behavior being retired; Apply SHALL not manufacture a replacement
version heading, release entry, banner, package release, or Git tag. The one
non-authority note required by VEM-001 is not a replacement release entry.

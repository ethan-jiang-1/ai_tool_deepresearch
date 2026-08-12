# C2: Remove Internal Versioning and Slim the Entry

> 候选 change：`remove-internal-versioning-and-slim-entry`
>
> 状态：C2a archived；C2b/C2c discovery complete，等待逐项 policy decision
>
> 风险：L2

## 要解决什么

历史上，`RUN.md` 有 299 行、约 28 KB，真正的 Section 0 从第 256 行才开始；顶部同时有 Harness banner 与 `Current Release`。C2a 已移除这份重复 release dump，并在 2026-08-12 通过 governed archive。现在 `RUN.md` 为 53 行，Section 0 在第 5 行。

剩下的 C2 不再是 entry 文案问题，而是两个独立 contract decision：新 bundle 是否继续写一个没有 decision reader 的 `framework_version` stamp，以及项目是否继续把内部顺序号、root changelog 与 `RUN.md` banner 当成每次 Harness 行为修改的强制 choreography。

## 已拆分的执行单元

| Slice | Scope | 状态 | 不包含 |
|---|---|---|---|
| C2a | `RUN.md` 移除重复 `Current Release` / release dump，并把既有 Section 0 移到 banner 后 | archived: `2026-08-12-slim-run-entry-history` | `CHANGELOG.md`、`framework_version`、bundle/schema/version-governance policy |
| C2b | 新 bundle 停止写 `framework_version`，旧 stamp 保持可读取但无执行语义 | decision pending；见 [C2b](C2b-retire-framework-version-stamp.md) | changelog governance、schema discriminator 删除 |
| C2c | 决定内部 changelog/banner/version-bump choreography 的未来 Source of Record | decision pending；见 [C2c](C2c-retire-internal-version-choreography.md) | 历史 archive 删除、伪造 Git release 对齐 |

## 已验证事实

| Fact | 证据 | 含义 |
|---|---|---|
| C2a entry 已收缩 | `RUN.md`: 53 lines; Section 0 at line 5 | 历史 dump 不再挡住真实 entry；archive 保留完整证据 |
| 内部版本被强制同步 | `governance/version-management` spec + OpenSpec config rules | 每个 Harness behavior change 当前都带 changelog/banner churn |
| stamp 有 writer | `instantiate-run-bundle.mjs` 调 `readFrameworkVersion()` 替换模板变量 | `framework_version` 确实进入新 bundle |
| stamp 没有发现 decision reader | production chain 仅为 `CHANGELOG.md -> framework-version helper -> instantiate -> rb_plan template`；无 parser router、Gate、CLI decision 或 migration reader | C2b 可停止新写入，但不能据此收紧 generic frontmatter preservation |
| internal release 不是发布体系 | root `CHANGELOG.md` 有 89 个 `v0.x` headings；`package.json` 为 private `0.0.0`；Git tags 仅 `v0.0.1`、`v0.1.1`、`v0.11` | C2c 是治理/信号政策，不应假装在维护真实多版本分发兼容 |
| schema discriminators 仍很多 | `topic_registry_version`、queue/result/receipt schema literals | 这些不是内部 release history，不能一起删 |

## 目标 contract

- C2a 已保证 `RUN.md` 的第一个实际 section 是执行入口。
- C2b 的候选 current-only contract：新 bundle 不写 `framework_version`；已存在的任意 unknown frontmatter 仍按 current plan preservation 语义保留，而不触发 migration、router 或行为选择。
- C2c 的候选 current-only contract：不再把内部顺序号、root changelog 与 `RUN.md` banner 作为每次行为变化必须同步的版本机制；历史记录不删除、不伪造 Git release 对齐。
- schema-version literals 继续用于当前 parser validation；不引入统一 mega-version。

## 影响面

| 层 | 可能改动 |
|---|---|
| Agent entry | `DEEP_RESEARCH_HARNESS/RUN.md`、README/entry contract tests |
| Runtime/writer | `engine/helpers/framework-version.mjs`、`cli/instantiate-run-bundle.mjs`、`rb_templates/rb_plan.md.tmpl` |
| Governance | `CHANGELOG.md`、version-management spec、OpenSpec config version-bump rule |
| Artifact compatibility | existing `rb_plan.md` still carries old `framework_version` frontmatter; rewrites must tolerate or reject it intentionally |
| Tests | framework-version, version-management, instantiation, topic-state frontmatter-preservation, migration entry tests |

## 风险与不可碰项

- `CanonicalPlanSchema` 的 `.passthrough()` 与 topic-state mutation 的 generic frontmatter preservation 是 current behavior；C2b 不能为了删除一个 stamp 而把旧 bundle 的 unknown keys 变成 parse error。
- C2c 若先停止 changelog updates、C2b 尚未移除 reader/writer，后续 bundle 会写入陈旧 stamp。决策顺序可以是 C2c -> C2b，但 implementation 必须显式处理这条 dependency，不能留下 stale stamp。
- 如先改 OpenSpec config 的 version-bump rule，再删 spec，可能让 active unrelated changes 失去其 tasks 约束；该 change 的 lifecycle design 必须写清顺序。
- `CHANGELOG.md` 是历史记录，不能以“降噪”为由删除 archive 或伪造 Git release 对齐。

## Proposal 前的 Go / No-go

- [x] C2a 已 archived：Section 0 在前 60 行、banner -> Section 0 -> trigger context、无 `Current Release` heading；见 `2026-08-12-slim-run-entry-history`。
- [x] C2b 已验证 current writer chain、无 decision reader，以及 old stamp 的 generic preservation boundary；详见 [C2b](C2b-retire-framework-version-stamp.md)。
- [x] C2c 已验证 accepted spec/config choreograph 每次 behavior change，且 internal headings 与 package/tags 没有发布对应关系；详见 [C2c](C2c-retire-internal-version-choreography.md)。
- [ ] C2c、C2b 的用户 policy decision 都明确前，不创建任何新的 C2 proposal；受总 plan 的 Proposal Barrier 约束。

## 验证

```bash
node --test tests/engine/framework-version.test.mjs tests/engine/version-management.test.mjs
node --test tests/integration/cli/instantiate-run-bundle.test.mjs tests/integration/md/artifact-persistence-contract.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```

另需基于 proposal 的 artifact decision 添加一个旧 stamp 的 parse/preserve/reject boundary test。

## 何时算完成

- [x] Agent 能在 `RUN.md` 首屏进入真实执行路由。
- [ ] runtime 不读取 changelog/banner 决策。
- [ ] `framework_version` 的 writer/reader/old-artifact policy 有单一明确结论。
- [ ] current specs/config 不再强迫无实际消费者的内部 version choreography。

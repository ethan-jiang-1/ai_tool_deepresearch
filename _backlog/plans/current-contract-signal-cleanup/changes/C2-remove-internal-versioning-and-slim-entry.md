# C2: Remove Internal Versioning and Slim the Entry

> 候选 change：`remove-internal-versioning-and-slim-entry`
>
> 状态：ready to propose after C1a
>
> 风险：L2

## 要解决什么

当前 `RUN.md` 299 行、约 28 KB，真正的 Section 0 从第 256 行才开始；顶部同时有 Harness banner 与 `Current Release`。这让首次进入的 Agent 在还没得到可执行路由前，先读大量内部 release history。与此同时 `framework_version` 从 `CHANGELOG.md` stamp 到 `rb_plan.md`，但审计尚未发现运行时根据它选择 parser、迁移或行为。

## 已验证事实

| Fact | 证据 | 含义 |
|---|---|---|
| 入口被历史淹没 | `RUN.md`: Section 0 at line 256; file 299 lines / 28,123 bytes | 高信噪比的入口可直接压缩 |
| 内部版本被强制同步 | `governance/version-management` spec + OpenSpec config rules | 每个 Harness behavior change 当前都带 changelog/banner churn |
| stamp 有 writer | `instantiate-run-bundle.mjs` 调 `readFrameworkVersion()` 替换模板变量 | `framework_version` 确实进入新 bundle |
| stamp 没有发现 decision reader | focused search 仅见 preservation/test/docs，而无 version router | 删除候选，但要先排查 external/use-by-doc artifact semantics |
| schema discriminators 仍很多 | `topic_registry_version`、queue/result/receipt schema literals | 这些不是内部 release history，不能一起删 |

## 目标 contract

- `RUN.md` 的第一个实际 section 是执行入口；历史最多是短链接或历史文件。
- `CHANGELOG.md` 不再是 Engine/runtime input。
- 新 bundle 不再以 `framework_version` 承担不可消费的 release-stamp 语义。
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

- 旧 bundle 的 arbitrary frontmatter 是否被 profile/plan writer round-trip preserve，需验证；删除 writer 不代表可以把旧字段当 parse error。
- 如先改 OpenSpec config 的 version-bump rule，再删 spec，可能让 active unrelated changes 失去其 tasks 约束；该 change 的 lifecycle design 必须写清顺序。
- `CHANGELOG.md` 是历史记录，不能以“降噪”为由删除 archive 或伪造 Git release 对齐。

## Proposal 前的 Go / No-go

- [ ] 定义历史记录归宿：保留精简 root `CHANGELOG.md`，或只保留 archived OpenSpec/Git；由用户在 proposal review 选择。
- [ ] 验证所有 `rb_plan.md` readers 是否 `passthrough` unknown `framework_version`，以及 topic mutation 是否会丢失/拒绝它。
- [ ] 逐项列出 OpenSpec config、accepted version spec、tests 和 docs 的同步顺序，避免 rules 与 spec 暂时冲突。
- [ ] 设入口验收而非口号：建议“Section 0 在前 60 行，前置内容不超过 4 KB”。

## 验证

```bash
node --test tests/engine/framework-version.test.mjs tests/engine/version-management.test.mjs
node --test tests/integration/cli/instantiate-run-bundle.test.mjs tests/integration/md/artifact-persistence-contract.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```

另需基于 proposal 的 artifact decision 添加一个旧 stamp 的 parse/preserve/reject boundary test。

## 何时算完成

- [ ] Agent 能在 `RUN.md` 首屏进入真实执行路由。
- [ ] runtime 不读取 changelog/banner 决策。
- [ ] `framework_version` 的 writer/reader/old-artifact policy 有单一明确结论。
- [ ] current specs/config 不再强迫无实际消费者的内部 version choreography。

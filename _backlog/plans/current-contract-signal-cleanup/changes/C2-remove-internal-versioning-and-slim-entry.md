# C2: Remove Internal Versioning and Slim the Entry

> 候选 change：`remove-internal-versioning-and-slim-entry`
>
> 状态：audit coverage closed; C2a/C2b/C2c are governed-archived; the next item is C3's single policy decision
>
> 风险：L2

## 要解决什么

历史上，`RUN.md` 有 299 行、约 28 KB，真正的 Section 0 从第 256 行才开始；顶部同时有 Harness banner 与 `Current Release`。C2a 已移除这份重复 release dump，并在 2026-08-12 通过 governed archive。现在 `RUN.md` 为 53 行，Section 0 在第 5 行。

剩下的 C2 不再是 entry 文案问题，而是两个独立 contract decision：新 bundle 是否继续写一个没有 decision reader 的 `framework_version` stamp，以及项目是否继续把内部顺序号、root changelog 与 `RUN.md` banner 当成每次 Harness 行为修改的强制 choreography。

## 已拆分的执行单元

| Slice | Scope | 状态 | 不包含 |
|---|---|---|---|
| C2a | `RUN.md` 移除重复 `Current Release` / release dump，并把既有 Section 0 移到 banner 后 | archived: `2026-08-12-slim-run-entry-history` | `CHANGELOG.md`、`framework_version`、bundle/schema/version-governance policy |
| C2b | 新 bundle 停止写 `framework_version`，旧 stamp 保持可读取但无执行语义 | archived: `2026-08-13-retire-framework-version-stamp`；见 [C2b](C2b-retire-framework-version-stamp.md) | changelog governance、schema discriminator 删除 |
| C2c | 取消内部 changelog/banner/version-bump choreography 的 authority，保留可选非权威人类历史 | archived: `2026-08-13-retire-internal-version-choreography`；见 [C2c](C2c-retire-internal-version-choreography.md) | 历史 archive 删除、伪造 Git release 对齐、C2b stamp 删除 |

## 已验证事实

| Fact | 证据 | 含义 |
|---|---|---|
| C2a entry 已收缩 | `RUN.md`: 53 lines; Section 0 at line 5 | 历史 dump 不再挡住真实 entry；archive 保留完整证据 |
| 内部版本曾被强制同步 | archive 前的 `governance/version-management` spec + OpenSpec config rules | C2c 已删除每个 Harness behavior change 的 changelog/banner churn |
| stamp writer 已移除 | C2b archive `2026-08-13-retire-framework-version-stamp` | 新 bundle 不再写 `framework_version`，且没有 reader/router/migration replacement |
| old stamp 无 decision reader | C2b archive evidence + generic unknown-frontmatter mutation regression | 不收紧 current preservation boundary，也不解释、迁移或拒绝旧 stamp |
| internal release 不是发布体系 | root `CHANGELOG.md` 有 89 个 `v0.x` headings；`package.json` 为 private `0.0.0`；Git tags 仅 `v0.0.1`、`v0.1.1`、`v0.11` | C2c 是治理/信号政策，不应假装在维护真实多版本分发兼容 |
| schema discriminators 仍很多 | `topic_registry_version`、queue/result/receipt schema literals | 这些不是内部 release history，不能一起删 |

## 已知范围收口（2026-08-12）

这张卡所列的版本相关 surface 已经按 owner 和 consequence 分类。这里的“收口”
表示 C2 不再把所有名字含 version 的字段混在一起；它不表示版本治理或 bundle
stamp 已被移除，也不绕过全域 Coverage Gate。

| Surface | 最终分类 | 证据与后续动作 |
|---|---|---|
| `RUN.md` release dump | 已完成 | C2a 已 archive；当前仅保留一个 entry banner，Section 0 在第 5 行。 |
| `framework_version` | archived C2b | 新 writer chain、CMI-007 与正向 assertions 已随 `2026-08-13-retire-framework-version-stamp` 删除；旧未知 frontmatter 保留 current generic semantics。 |
| root `CHANGELOG.md` / `RUN.md` banner / proposal-time bump rule | archived C2c | `version-management` spec、OpenSpec config、entry specs 及 focused tests 已改为非权威历史/无 banner contract；不是 package/Git release contract。详见 [C2c](C2c-retire-internal-version-choreography.md)。 |
| `DEEP_RESEARCH_HARNESS/CHANGELOG.md` hygiene allowance | false positive / fixture-only | 文件不存在；work-unit hygiene checker 仅在合成 fixture 中放行 historical token，既不读取也不允许此文件成为 current authority。不是 C2 writer/reader。 |
| `topic_registry_version`、queue/result/receipt/experiment `schema_version` 等 | protected current semantic / other family | 它们是当前 parser discriminator 或 C4-C6 的历史-reader contract，不是 internal release sequence；C2 不触碰。 |
| `pre-v0.*` wording in rerun/work-unit/topic specs | other family evidence | 它们描述 C4-C6 的 retained-artifact behavior；必须由对应 producer-reader trace 分类，不能借 C2 删除。 |

## 目标 contract

- C2a 已保证 `RUN.md` 的第一个实际 section 是执行入口。
- C2b 的 current-only contract：新 bundle 不写 `framework_version`；已存在的任意 unknown frontmatter 仍按 current plan preservation 语义保留，而不触发 migration、router 或行为选择。
- C2c 已批准的 current-only contract：保留 root `CHANGELOG.md` 作为可选、非权威的人类历史；不再把内部顺序号、root changelog 与 `RUN.md` banner 作为每次行为变化必须同步的版本机制；历史记录不删除、不伪造 Git release 对齐。
- schema-version literals 继续用于当前 parser validation；不引入统一 mega-version。

## 影响面

| 层 | 可能改动 |
|---|---|
| Agent entry | `DEEP_RESEARCH_HARNESS/RUN.md`、README/entry contract tests |
| Runtime/writer | C2b 已删除 `framework-version` helper、instantiator writer/replacement 与 plan-template field；C2c 不再触碰它们 |
| Governance | `CHANGELOG.md`、version-management spec、OpenSpec config version-bump rule |
| Artifact compatibility | existing `rb_plan.md` still carries old `framework_version` frontmatter; rewrites must tolerate or reject it intentionally |
| Tests | framework-version, version-management, instantiation, topic-state frontmatter-preservation, migration entry tests |

## 风险与不可碰项

- `CanonicalPlanSchema` 的 `.passthrough()` 与 topic-state mutation 的 generic frontmatter preservation 是 current behavior；C2b 不能为了删除一个 stamp 而把旧 bundle 的 unknown keys 变成 parse error。
- C2b 已 archive，因此 C2c 可移除 changelog authority；C2c 不得重新引入 stamp、writer、schema tightening 或 old-bundle policy。
- C2c 先完成 active-change consumer scan，再同步 config/spec；其 archive 已证明没有把旧 version-bump task 约束从未分类 active change 中静默移除。
- `CHANGELOG.md` 是历史记录，不能以“降噪”为由删除 archive 或伪造 Git release 对齐。

## 已完成的分类证据

- [x] C2a 已 archived：Section 0 在前 60 行、banner -> Section 0 -> trigger context、无 `Current Release` heading；见 `2026-08-12-slim-run-entry-history`。
- [x] C2b 已 governed-archived：新 writer chain 和 CMI-007 已删除，generic preservation boundary 有 real mutation regression；见 `2026-08-13-retire-framework-version-stamp`。
- [x] C2c 已验证 accepted spec/config choreograph 每次 behavior change，且 internal headings 与 package/tags 没有发布对应关系；详见 [C2c](C2c-retire-internal-version-choreography.md)。
- [x] 用户于 2026-08-13 选择 C2c A；`retire-internal-version-choreography` 已完成 proposal/design/delta specs/tasks planning validation、Apply、sync、closeout review 与 governed archive。
- [x] `DEEP_RESEARCH_HARNESS/CHANGELOG.md` 的 hygiene allowance 已确认是 fixture-only false positive；实际文件不存在，且没有 reader/writer/authority path。
- [x] current schema discriminators 和 C4-C6 historical-record wording 已明确排除，不纳入 C2。

## 已完成的执行边界

- [x] 全域 Coverage Gate 已完成；C2b/C2c 均已各自获批、proposal、Apply、sync 并 archive。
- [x] 用户已决定 C2c A；其独立 proposal 已明确写入 C2b 的 Apply/Archive 前置条件。
- [x] C2b stamp policy 已获批并 governed-archived；C2c 在此前置满足后完成 target edits 与 archive。

## 验证记录

- C2b: 60 个 focused tests、workflow package 与 governance checks 均通过；旧
  arbitrary frontmatter 的 mutation round-trip regression 保留 generic
  preservation boundary，而不把 `framework_version` 留作 current positive contract。
- C2c: 4 个 selected suites、15 个 tests 通过，无 fail/cancelled/skipped；workflow
  package、strict OpenSpec validation、capability discovery、verification routing、
  semantic closure、archive-mode requirements/spec checks 均通过。

## 已知范围完成条件

- [x] Agent 能在 `RUN.md` 首屏进入真实执行路由。
- [x] C2 known-surface inventory 已逐项归类，且 version discriminator 没有被误列为 release cleanup。
- [x] C2c 已以独立 Apply -> sync -> archive 收口；现在才进入 C3 的单独 policy decision。

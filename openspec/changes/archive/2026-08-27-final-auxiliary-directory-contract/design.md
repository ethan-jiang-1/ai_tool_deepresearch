## Context

动机见 proposal.md「Why」。现状约束：`final-report-series.mjs` 的 `resolveFinalReportSeries` 是对 `final/` 每个直接子项做确定性分类的唯一面；它已把目录统一分到 `supplementary`（`classifyEntry` 的 `entry.kind === 'directory'` 分支），并把 `entries[].classification` 用 Zod enum 约束为 `modern_base | legacy_candidate | revision | supplementary | invalid`。primary series 只由直接根下的 base/revision 文件构成，`primary_sha256` witness 只覆盖 primary 文件，目录内容进 full inventory digest 但不进 primary witness。`phase-final.md` 目前只写主报告命名，无辅助目录/README 纪律。FDB 已拒绝 `final/` 作为 Evidence Map backing，且明确不是全文链接扫描器。

## Goals / Non-Goals

**Goals:**
- 在既有 inventory 分类器里，用最小确定性扩展把 `final_v<N>/`、`final_<feature>_v<N>/` 目录识别为版本绑定 `auxiliary`，并把「带版本语法但无对应主报告」判为 `orphan_auxiliary_directory` blocker。
- 让 `phase-final.md` 携带版本 = 主报告 + 同名辅助目录、自包含、历史只读、README 权威的纪律。
- 全程不新增依赖、不新增 CLI 参数、不新增全文扫描器、不硬拒版本脱钩目录。

**Non-Goals:**
- 不改主报告命名语法与全局版本分配（ARP-004 已定案）。
- 不为辅助档案「该写什么内容」建 schema（内容语义归 Agent/用户）。
- 不让 README 成为 Engine 强制存在的事实，不为其开 FDB 特例。
- 不新增跨版本正文链接的 Engine 扫描/拒绝。

## Decisions

### D1: 用 `auxiliary` 分类值 + `orphan_auxiliary_directory` blocker 表达绑定

把 `InventoryEntrySchema.classification` enum 增加 `auxiliary`，`FinalReportSeriesBlockerSchema.code` enum 增加 `orphan_auxiliary_directory`。目录名匹配辅助语法时返回 `{ classification: 'auxiliary', version, feature }`，否则仍 `supplementary`。

- **为什么**：`auxiliary` 明确区分「版本绑定但非 primary」与「版本脱钩 supplementary」，匹配 plan 的术语与验收；判定只读 `name`/`kind`，是纯确定性。
- **替代**：(a) 复用 `supplementary` 并额外填 `version`——少一个 enum 值，但让「supplementary 也可能带版本」变成隐式组合，消费方需重新解读，语义更模糊；(b) 硬拒所有非版本语法目录——过度约束，破坏已 accepted 的 `final/topics/` 内容。两者都不如显式分类。

### D2: 绑定规则 = 「目录名 = 主报告文件名去 `.md`」，精确匹配

辅助目录 `final_v<N>/` 只绑 `final_v<N>.md`，`final_<feature>_v<N>/` 只绑 `final_<feature>_v<N>.md`（同 feature 同 N）。匹配表用显式正则（复用现有 `UNLABELLED_REVISION_RE`/`LABELLED_REVISION_RE` 去掉 `.md`），不模糊匹配、不跨 feature 猜测。

- **为什么**：复用既有 revision 语法，避免第二个命名语法源；精确匹配让 orphan 判定可测试、无歧义。
- **替代**：按 version 忽略 feature 绑定——会让 `final_v2/` 绑定 `final_technical_deep_dive_v2.md`，破坏「同名」契约且歧义。

### D3: orphan 判定只针对「带版本语法的目录」，不针对 supplementary

`resolveFinalReportSeries` 收集所有 `auxiliary` 目录，对其 version+feature 在 primary revisions 里查同名文件；查不到则加 `orphan_auxiliary_directory` blocker。版本脱钩目录不进这个判定。

- **为什么**：只收紧「用了版本语法却无对应主报告」这种明确脱钩，符合用户选择的「只做确定性结构绑定」。
- **替代**：对所有目录做 orphan 判定——不可行，因为 supplementary 目录本就不绑版本。

### D4: 消费方不改参数与流程

`artifact-persistence.mjs` 的 publisher、`enter-phase`、recovery/check-reentry 只消费 `primary_entries`/`base`/`latest`/`next_version`/`blockers`，不按 `entries[].classification` 做穷举分支。因此 `auxiliary` 只是 `entries` 里多一类非 primary 项，primary 行为不变；apply 阶段 grep 确认无对 classification enum 的穷举匹配会因新值破裂。

### D5: 语义纪律落在 Markdown，README 走非 primary persist 路径

版本自包含、历史只读、README 权威写进 `phase-final.md`（CDP-008）。README/辅助档案是 Final Markdown，仍走既有 non-primary `persist-final-report` 并带 Evidence Map；不新开 FDB 特例。

- **为什么**：helper-oriented——确定性事实归 Engine，意图承载的命名纪律归 Agent/文档权威；simple-reliable-control——不新建扫描器。
- **替代**：Engine 强制 README 存在——会让历史 bundle 全部被拦，且 README 是文档权威非机器事实。

## Risks / Trade-offs

- [版本语法目录从「无害 supplementary」变 blocker] → 这是有意收紧；只影响「目录名带 `final_v` 语法却无同名主报告」的存量 bundle。apply 时用 unit truth table 证明合法成对 bundle 不受影响，并在 proposal Compatibility 明确。
- [classification enum 新增 `auxiliary` 可能破坏穷举匹配的消费方] → apply 前 grep 全部 `classification ===`/`switch` 消费点，确认无对非 primary 值做穷举；若有，改为「primary 判定只看 `revision|modern_base|legacy_base`」的窄判断。
- [README 是文档权威但非机器权威，可能漂移] → 由 CDP-008 的 md parity 测试锚定 `phase-final.md` 措辞；README 本身是 run-scoped 运行时态，不进入框架权威。

## Migration Plan

无数据迁移：纯分类扩展。存量 bundle 若「主报告 + 同名辅助目录」成对，分类不变（合法绑定）；若存在带版本语法的孤儿目录，`publish-final-report`/`enter-phase` 会返回 blocker，Agent 按 blocker 命名目录或补齐主报告，不自动改写。回滚：恢复 `final-report-series.mjs` 与 `phase-final.md` 旧字节即可，无运行时状态迁移。

## Open Questions

无。scope、enforcement 强度、README 权威化方式均已在 proposal 与本设计定案。

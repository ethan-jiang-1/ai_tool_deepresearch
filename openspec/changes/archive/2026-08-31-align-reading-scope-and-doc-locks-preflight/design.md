# Design: align-reading-scope-and-doc-locks-preflight

## Context

- 张力事实：根 `AGENTS.md` L44 与 `README.md` L45 的 Do-Not-Read 行为 "`.exp-bundles/`, including lowercase `dpt_rb_*/` run-bundle directories"；`DEEP_RESEARCH_HARNESS/README.md`「Run Bundle 外形」说 production run bundle 位于 repo root，根目录实际有 4 个 `dpt_rb_*`（gitignored）。
- 所有权事实（2026-08-31 grep 实测）：Do-Not-Read 措辞无 spec owner、无测试锁其内容（`tests/` 中零个测试引用 "Do Not Read" 文本）；doc-locks 纪律无 spec owner。`AGENTS.md`/`README.md`/`config.yaml` 均在 knowledge-surfaces POINTER_SURFACES（仅断言 verification-routing 指针 + 四分类词）。`change-feedback-finalizer.test.mjs` 对 apply guidance 用前缀查找 + `includes` 片段断言，不锁条目数。
- 用户拍板语义（2026-08-31）：任意位置的小写 run-bundle 目录都不得作为 task context；显式指名豁免保留。动机与范围见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 消除 Do-Not-Read 与 run bundle 位置事实之间的范围歧义，两文件同句。
- 把 doc-locks preflight 从 tests/README 建议升格为 apply-phase 显式指令。

**Non-Goals:**

- 不新增 checker、不改 `list-doc-locks.mjs`、不动 main spec、不改 entry selection 语义（豁免条款原文保留）、不动 run bundle 数据。

## Decisions

### D1: Do-Not-Read 行改写（AGENTS.md 与 README.md 同句、原位替换）

旧：`- \`.exp-bundles/\`, including lowercase \`dpt_rb_*/\` run-bundle directories`
新：`- \`.exp-bundles/\`, and any lowercase \`dpt_rb_*/\` or \`dpt_disp_*/\` run-bundle directory anywhere in the repository (run bundles are runtime state, not task context)`

理由：`anywhere in the repository` 直接消除"只覆盖 .exp-bundles/ 下"的严格读法；括号补默认分类锚（run bundle 是 runtime state，不是任务上下文）。措辞辨析（propose 期 polish 发现）：括号刻意不用 "never task context"——同列表 intro 行的豁免（"unless the user explicitly identifies a concrete path"）允许被显式指名时读取，绝对化 "never" 会与豁免字面冲突；"are runtime state, not task context" 陈述默认分类，豁免仍由 intro 行统一管辖，两行无字面矛盾。英文措辞与列表其余行一致（精确坐标/路径用英文）。豁免条款在列表 intro 行，原文不动——用户显式给出 bundle 作为 entry 的既有路径不受影响。备选否决：仅澄清为"`.exp-bundles/` 下的"——用户已拍板任意位置语义；另立中文注释行——同一控制面混排无必要。

### D2: config.yaml `operations.apply.guidance` 末尾追加一条

```yaml
      - >-
        doc-locks-preflight/apply: 若本 change 修改任何 governed document
        （entry docs、COMMANDS.md、specs 等），在首次 target edit 前运行
        node scripts/list-doc-locks.mjs <repo-relative-doc-path> 盘点受影响
        锁，受影响断言在同一 change 内更新。本 guidance 不是审查完成或归档
        许可。
```

理由：与既有三条同构（`<key>/apply:` 前缀 + 操作 + 非许可声明），位置在列表末尾追加（前缀/片段断言兼容）；key 命名沿用 `<source>/apply` 惯例，source 是纪律文档 `tests/README.md` 所在的测试层而非 spec，故用行为名 `doc-locks-preflight`。末句"不是审查完成或归档许可"对齐 house 惯例（guidance 不是 verdict）。备选否决：(a) 写成 governance checker——plan 明确非目标；(b) 改 `list-doc-locks.mjs` 加 hook——引入新机制，违反最短闭环。

### 宪法三步检

- Abstraction as Semantic Precision：读者有界问题 = "这条路径能不能当任务上下文读"/"改 governed doc 前要做什么"；两处文本都自足，停止点明确。
- Simple Reliable Control：两处一行级编辑，无新状态/检查器/第二清单；triage 纪律的 Source of Record 仍是 `list-doc-locks.mjs` 本身。
- Helper-Oriented Agent：preflight 与措辞遵守均为 Agent 普通 mechanical work；Engine verdict 权限边界不变。

## Risks / Trade-offs

- [`config.yaml` YAML 语法破坏会波及 openspec CLI] → 追加的是既有列表形态的同构条目，`openspec validate` + change-feedback-finalizer + 全量套件三重兜底。
- [措辞过宽导致 agent 拒读用户显式给出的 bundle] → 豁免条款原文保留且语义与 entry selection "explicitly supplied" 一致；括号句 "are runtime state, not task context" 陈述默认分类，被指名时的读取由 intro 豁免统一管辖，不禁止人/Agent 在被指名时读。
- [`AGENTS.md`/`README.md` 两处措辞漂移] → D1 规定同句替换；两文件本就由人手工保持同段同句（既有列表已同文），本次一并替换后 `git grep` 可复核。
- [新 guidance 行被误当 permission] → 行尾显式声明"不是审查完成或归档许可"，与既有三条同一姿态。

## Migration Plan

无迁移：三处落点（AGENTS.md、README.md、config.yaml）均为一行级编辑，回滚即逐文件 revert。

## Open Questions

（无——措辞语义已由用户拍板，落点与形态由锁面证据直接支撑。）

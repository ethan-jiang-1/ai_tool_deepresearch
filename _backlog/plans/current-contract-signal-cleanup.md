# 当前 Contract 清噪计划

> **唯一进度入口：每次回来只看下面这张总清单。**
>
> 总进度：`[#########--------]` **9 / 17 个执行项已归档或明确关闭；还剩 8 个（10-17）**
> 当前位置：**10 / C1d 决策；尚无 active OpenSpec change**
> 眼前一步：**为未实现的 fork-repair contract 选择 A（退役，建议）、B（保留未来承诺）或 C（另开产品功能）**
> 修改权限：**尚未获得下一项 APPLY 授权；只可做决策与 OpenSpec proposal artifacts，Harness、tests 与 accepted main specs 不得修改**

## 总 Todo Checklist

编号 `01-17` 是实际执行顺序，每一项对应一个 OpenSpec 执行批次或明确关闭决定；`C...` 是审计卡编号，
两者不是一套编号。当前项只在这张清单内展开，不再另设 `Current Item` 章节。顶层 checkbox
只有在该批次完成 governed archive、commit，并回填本看板后才勾选。

- [x] 01 `C1a`：纠正已退役 content-dedup 的 catalog 状态
- [x] 02 `C2a`：精简 `RUN.md` 入口中的历史版本内容
- [x] 03 `C2b`：停止写入无权威作用的 `framework_version`
- [x] 04 `C2c`：取消内部版本号、changelog 与 banner 的强制编排
- [x] 05 `C3`：停止兼容旧 bundle 入口
- [x] 06 `C4a`：停止兼容旧 `research_access` envelope
- [x] 07 `C4b`：停止迁移旧 mutable plan
- [x] 08 `C5a-1`：当前 reference writer 只写 UID binding
- [x] 09 `C5a-2`：当前 Engine 拒绝历史 reference binding
  - OpenSpec archive: [`2026-08-14-decide-historic-reference-reader-policy`](../../openspec/changes/archive/2026-08-14-decide-historic-reference-reader-policy/)
  - 这项的意义：旧 Markdown 保持可人工阅读、字节不变；但其中的 `related_topic`
    不再算作当前 Gate、index、provenance、observability 或 rerun 的有效证据。
  - 单独执行的原因：它改变的是历史文件的 reader/rejection 边界；误改会影响多类
    Engine 判断，风险和回滚边界都不同于已完成的 writer 清理及后续 experiment 清理。
  - [x] 记录 policy decision
  - [x] 创建 OpenSpec scaffold
  - [x] 创建 `proposal.md`
  - [x] 创建 6 份 delta specs
  - [x] 创建 `design.md`
  - [x] 创建 `tasks.md`
  - [x] 创建 `semantic-closure.yaml`
  - [x] 创建 `verification-plan.yaml`
  - [x] 运行 strict OpenSpec 与 planning-governance validation
  - [x] 完成 proposal review / polish
  - [x] 用户明确授权 `APPLY`
  - [x] 首次修改目标代码前完成 plan review
  - [x] 实施已批准的 tasks（`tasks.md` 15 / 15）
  - [x] 运行 selected verification 与 current-path regression tests
  - [x] 将 delta specs 同步进 accepted main specs
  - [x] 完成 closeout review
  - [x] Governed archive
  - [x] Commit implementation / archive artifacts（`35daf961f`）
  - [x] 更新本看板与 execution ledger
- [ ] **10 `C1d`：决定未实现的 fork-repair contract（当前决策项）**
  - 需要的用户决定：A 退役该无实现的承诺（建议）；B 保留为未来承诺；C 另开独立产品功能。
  - 此项只决定项目承诺；不改变现有 Gate/repair 行为。
  - 选择 A 后才提议独立的 `retire-unimplemented-fork-repair-contract` change。
- [ ] 11 `C1c`：移除 stale abstract Gate FSM 与其内部 API（须先获用户 API-removal 批准）
- [ ] 12 `C1b`：移除无 caller 的 seed-topic authoring pointer
- [ ] 13 `C1e`：移除不可达的 private YAML-subset parser
- [ ] 14 `C1f+C5b`：收口旧 experiment-history 输入（满足合并门时合并）
- [ ] 15 `C6a+C6b+C6c`：停止读取历史 work-unit records（满足合并门时合并）
- [ ] 16 `C6d`：将 transaction v1 明确限定为不支持的历史格式（单独执行）
- [ ] 17 `C7+C8`：最终清理 main specs、context 与 routing 的当前态表述

## 为什么是 17 项

- **审计口径：** 21 张细粒度 decision cards，用来保证风险不漏项。
- **执行口径：** 9 个已归档 change + 8 个剩余执行批次/决定 = 目标总数 17。
- 一张 decision card 不自动等于一个 OpenSpec change。
- 只有 Source of Record、兼容决策、consumer/test 影响面和回滚边界一致时才合并执行。
- 失败后果或 mutation safety 不同时必须拆开，所以 `C5a-2` 不与 experiment 合并，
  `C6d` 不与 `C6a-C6c` 合并。
- 条件合并若不成立，只调整尚未执行的分母；已经完成的编号和记录不重写。第 10 项原先的四卡合并已因 Source of Record、consumer/test 与 rollback boundary 均不共享而拆开为 10-13。

## 去哪里看

| 我想知道 | 只看这里 |
|---|---|
| 走到哪里、下一步是什么 | **本文件顶部总清单** |
| 某个候选为什么有风险、需要决定什么 | [Change-card index](current-contract-signal-cleanup/README.md) |
| 全量扫描有没有漏项 | [Coverage ledger](current-contract-signal-cleanup/coverage-ledger.md) |
| 合并规则与执行协议 | [Policy and protocol](current-contract-signal-cleanup/policy-and-protocol.md) |
| 已归档项的验证证据 | [Execution ledger](current-contract-signal-cleanup/execution-ledger.md) |
| 09 的归档提案与验证记录 | [Archived OpenSpec change](../../openspec/changes/archive/2026-08-14-decide-historic-reference-reader-policy/) |

## 更新规则

每次发生有效状态变化，立即更新本文件：

1. 勾选刚完成的当前子步骤。
2. 加粗下一个未完成子步骤，并同步顶部“眼前一步”。
3. Archive 并 commit 后，勾选顶层执行项，推进“当前位置”并更新进度数字。
4. 详细验证证据写入 execution ledger，不堆进本看板。

只有当所有顶层执行项都已勾选，或有证据证明无需执行并明确关闭，且 coverage 仍然完整、
current docs/specs/tests 只暴露当前成功路径、最终 package/spec/requirement checks 全部通过时，
本计划才算完成。

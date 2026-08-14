# 当前 Contract 清噪计划

> **唯一进度入口：每次回来只看下面这张总清单。**
>
> 总进度：`[#################-]` **17 / 18 个执行项已归档或明确关闭；还剩 1 个（18）**
> 当前位置：**18 / `C7+C8`；仅剩 current-state presentation cleanup，尚未开始 proposal。**
> 眼前一步：**先重验 C7/C8 是否仍共享纯 presentation-only 边界，再列出精确 residual set、owner、风险和验证；未获用户逐项确认前不得创建 proposal 或修改 Harness/specs/docs/tests。**
> 修改权限：**C6d 已 governed-archived 并提交。Item 18 目前只有调查与 decision-card/backlog 更新权限；`DEEP_RESEARCH_HARNESS/`、accepted main specs、routing docs 与 tests 均保持只读。**
>
> Proposal gate：**每个新 OpenSpec proposal 完成 planning checks 后，必须紧接着运行 `polish-openspec-change`；只有 checks 与 polish 都通过，才可进入 review / `APPLY`。**

## 总 Todo Checklist

编号 `01-18` 是实际执行顺序，每一项对应一个 OpenSpec 执行批次或明确关闭决定；`C...` 是审计卡编号，
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
- [x] 10 `C1d`：退役未实现的 fork-repair contract
  - OpenSpec archive: [`2026-08-14-retire-unimplemented-fork-repair-contract`](../../openspec/changes/archive/2026-08-14-retire-unimplemented-fork-repair-contract/)
  - [x] 用户选择 A：退役该无实现的承诺；不改变现有 Gate/repair 行为。
  - 此项只决定项目承诺；不改变现有 Gate/repair 行为。
  - [x] 创建 proposal、完整 removal delta、design、tasks、semantic closure 与 verification plan。
  - [x] 完成 proposal review / polish 与用户 `APPLY` 授权。
  - [x] 实施 9 / 9 tasks、delta/main re-comparison、closeout 与 governed archive。
  - [x] Commit implementation / archive artifacts（`3ca1339cd`）
  - [x] 更新本看板与 execution ledger。
- [x] 11 `C1c`：移除 stale abstract Gate FSM 与其内部 API
  - OpenSpec archive: [`2026-08-14-retire-stale-abstract-gate-fsm`](../../openspec/changes/archive/2026-08-14-retire-stale-abstract-gate-fsm/)
  - [x] 用户批准退役五个无当前 caller 的内部 API export；不保留 adapter、alias 或版本 fallback。
  - [x] 删除 stale FSM、barrel exports 和 stale-only tests；当前 chain/router、Gate definitions、CLI、bundle 与 Agent flow 保持不变。
  - [x] 同步三份 delta，退役 `SCO-003`/`TRT-011` 为不可复用的 registry 历史，并让保留的 `TRT-012` 只指向现有 chain/router。
  - [x] 完成 current-router regression、workflow-package、strict OpenSpec、archive requirement governance、83 份 main specs、closeout review 与 governed archive。
  - [x] Commit implementation / archive artifacts（`f9e45891e`）
  - [x] 更新本看板。
- [x] 12 `C1b`：移除无 caller 的 seed-topic authoring pointer
  - [C1b change card](current-contract-signal-cleanup/changes/C1b-retire-unreferenced-seed-topic-pointer.md)
  - OpenSpec archive: [`2026-08-14-retire-unreferenced-seed-topic-pointer`](../../openspec/changes/archive/2026-08-14-retire-unreferenced-seed-topic-pointer/)
  - [x] proposal 前复核：精确 file/id/scope 在 current supported surfaces 为零引用；manifest、phase `requires` 与 `suggested_context` 均不加载它，workflow package 校验通过。
  - [x] 用户批准删除该旧 Agent-reading pointer；不保留 alias、tombstone、fallback 或迁移路径。
  - [x] 创建并完成 `retire-unreferenced-seed-topic-pointer`；删除仅限该未注册 pointer，当前 owner 保持不变。
  - [x] 创建 proposal、design、tasks、`semantic-closure.yaml` 与 `verification-plan.yaml`；无 accepted capability 行为变更，`specs` 合法 `skip_specs`。
  - [x] 完成 plan review、精确零引用复核、package validation、strict OpenSpec、archive governance 与 closeout review。
  - [x] Governed archive；commit implementation / archive artifacts（`530a25cff`）。
  - [x] 更新本看板与 execution ledger。
- [x] 13 `C1e`：移除不可达的 private YAML-subset parser
  - [C1e change card](current-contract-signal-cleanup/changes/C1e-retire-unreachable-yaml-subset-parser.md)
  - OpenSpec archive: [`2026-08-14-retire-unreachable-yaml-subset-parser`](../../openspec/changes/archive/2026-08-14-retire-unreachable-yaml-subset-parser/)
  - [x] 用户选择 A：退役仅有定义的 private helper；保留 `parseFrontmatter()` 的 JSON/YAML current contract。
  - [x] fresh current-surface scan：`parseYAMLSubset()` 只命中私有定义；apply 后 current source/tests/main specs/guidance 为零命中。
  - [x] 创建并完成 `retire-unreachable-yaml-subset-parser` 的 proposal、design、tasks、`semantic-closure.yaml` 与 `verification-plan.yaml`；无 accepted capability 行为变更，`specs` 合法 `skip_specs`。
  - [x] 运行 strict OpenSpec、requirement plan、project specs、capability taxonomy/discovery、verification-routing plan 与 semantic-closure plan checks。
  - [x] 完成 proposal review / polish，并取得用户 `APPLY` 授权。
  - [x] 删除 private helper，纠正两行测试注释；`parseFrontmatter()` 的 JSON/YAML current contract 与测试断言未改。
  - [x] 运行 39 / 39 focused parser tests、workflow-package validation、archive governance 与 closeout review。
  - [x] Governed archive；commit implementation / archive artifacts（`513186872`）。
  - [x] 更新本看板、execution ledger 与相关 decision cards。
- [x] 14 `C1f`：退役 archived case-ledger helper cluster（standalone）
  - OpenSpec archive: [`2026-08-14-retire-archived-case-ledger-helper`](../../openspec/changes/archive/2026-08-14-retire-archived-case-ledger-helper/)
  - [x] 用户确认 `97 / 502 / 16` 是 completed migration record，不是 current product invariant；不需要新的 current owner。
  - [x] 与 C5b 的 merge gate 不成立：C1f 只移除 archive-path test/helper；C5b 影响 current Supervisor selection。二者 Source of Record、policy、consumer/test 与 rollback boundary 不同。
  - [x] 创建、review 并完成 `retire-archived-case-ledger-helper`；`specs` 合法 `skip_specs`，不改变 accepted observable behavior。
  - [x] 删除 archive-only `normalizeLedgerBundlePlan()`、`validateCaseCompatibilityLedger()`、`readCaseCompatibilityLedger()` 及其专用 archive-path test plumbing；manifest/V2/Supervisor/current playbooks/`yaml` dependency 保持不变。
  - [x] 完成 selected host-tool/Supervisor regression、workflow-package、零引用/protected-surface review、strict OpenSpec 与 archive governance/finalizer。
  - [x] Governed archive；commit implementation / archive artifacts（`374d86c33`）。
  - [x] 更新本看板、execution ledger、coverage ledger 与 C1f change card。
- [x] 15 `C5b`：决定 retained experiment history 是否进入 current prediction/admission/selection（单独执行）
  - [x] 用户选择 C：retained v1 report/audit 可人工阅读或产生非致命 diagnostics，但不得影响当前 prediction、qualification 或 selection。
  - [x] 创建并审阅 standalone OpenSpec proposal：四个 delta specs、design、tasks、semantic closure 与 verification plan 完整；strict/requirement/project-spec/taxonomy/discovery/routing/closure plan checks 通过。
  - [x] 已取得并完成 `APPLY`：先完成 feedback plan review 和 plan checks，再改 Harness/tests；未读取或重写真实 `.exp-bundles/` 历史。
  - [x] 完成 `tasks.md` 的 2.1–4.4（14 / 16）：v1 current-input schemas/reader/qualification projection 已退出；current-v2 stale execution-surface 的显式 qualification 仍保留；选定 52 个 deterministic unit/integration tests 和 archive-preflight governance 均通过。
  - [x] 将 ERS-001/ERS-002、EXA-009、EXO-007、PLR-004 delta specs 同步进 accepted main specs，并登记 `verification.autorun-current-retained-observation` semantic fact family。
  - [x] 完成 closeout review 和 governed archive：[`2026-08-14-decide-retained-experiment-history-policy`](../../openspec/changes/archive/2026-08-14-decide-retained-experiment-history-policy/)。
  - [x] Commit implementation/archive/spec sync（`1aa0c1c35`、`a407cf980`、`969dbfbcd`、`0ea53de58`）；已回填本看板、C5b card 与 execution ledger。
- [x] 16 `C6a+C6b+C6c`：停止读取历史 work-unit records（满足合并门时合并）
  - OpenSpec archive: [`2026-08-14-retire-legacy-work-unit-attempt-inputs`](../../openspec/changes/archive/2026-08-14-retire-legacy-work-unit-attempt-inputs/)
  - [x] C6a：已刻画 current v3 assignment / supplementary 行为；用户选择 A，explicit assignment v1/v2 将被拒绝且不得升级为 v3。
  - [x] C6b：已刻画 current marked submission/recovery/supersession；用户选择 A，markerless hash-mirror attempt 将在任何 current submission/recovery/supersession/provenance 计算前被拒绝，不得升级或静默丢弃。选定 current-path suite `109 / 109` 通过，workflow-package validation 通过。
  - [x] C6c：已刻画 current recorded delegated/fallback actor 路径；用户选择 A，actor-unrecorded attempt 将在任何 current submission/recovery/inspection/supersession/provenance 计算前被拒绝，不得推断、升级或静默丢弃。两条 current 路径均写入并绑定 `work-unit.actor.v1` 与 exact `actor_execution`；selected actor/submit/lifecycle/CLI/provenance suite 通过。
  - [x] 合并门通过：三卡共享 tightly-coupled work-unit attempt Source of Record、同一 A/reject policy、重叠的 submit/inspect/recovery/supersession/provenance consumers 与 tests，且只有一次原子切换到完整 current profile 才安全。合并为 `retire-legacy-work-unit-attempt-inputs`；C6d 与 `legacy_non_work_unit_rows` 明确排除。
  - [x] 完成 unified removal proposal、strict/requirements/project-specs/verification-routing/semantic-closure planning checks 与至少两轮 risk-led polish；补齐 Wave0 rich-reference projection/Gate reader。
  - [x] 用户 review 后明确授权 `APPLY`；在首次 target edit 前完成 plan review。
  - [x] 实施 `tasks.md` 25 / 25：旧 assignment v1/v2、markerless hash-mirror 与 actor-unrecorded attempt 在 submit/recovery/timeout/supersession/Gate authority mutation 前统一得到 `unsupported_current_contract`；完整 current profile 保持可用。
  - [x] 同步三个 delta 到 accepted main specs，完成 selected deterministic evidence、workflow-package validation、semantic closure、closeout review 与 governed archive。
  - [x] Commit implementation / archive artifacts（`7a96ca254`）；更新本看板。
- [x] 17 `C6d`：将 transaction v1 明确限定为不支持的历史格式（单独执行）
  - [C6d decision card](current-contract-signal-cleanup/changes/C6d-retire-transaction-v1-history.md)
  - OpenSpec archive: [`2026-08-15-retire-transaction-v1-history`](../../openspec/changes/archive/2026-08-15-retire-transaction-v1-history/)
  - [x] 用户选择 A：v1 不得建立 submit、recovery、supersession、normalized ledger、Gate、inspect 或 lineage 的 current authority；不迁移、重写或补全历史 journal。
  - [x] 保留 raw fail-closed safety scan：未 committed、malformed、unreadable 或 proof-incomplete journal 继续以 `suspect_transaction` 阻止 mutation；只有结构完整的 committed v1 可作为不阻断的诊断历史。
  - [x] 创建 proposal、DEW-023/DEW-024 delta、design、tasks、semantic closure 与 verification plan。
  - [x] 完成 strict OpenSpec、requirements/specs、taxonomy/discovery、verification-routing、semantic-closure 与 diff planning checks。
  - [x] 完成 `polish-openspec-change` 风险复核：`work-unit-submit.mjs` 和 supersession 的两个 original-evidence reader 都要求 committed v2；不得让只有 `status: committed` 的 malformed v1 绕过 safety scan。
  - [x] 用户明确授权 `APPLY`；先完成 plan review 和 planning checks，再修改 Harness、tests 与 accepted main specs。
  - [x] 实施 `tasks.md` 2.1–2.4：移除正向 v1 schema/union/barrel exports；保留最小 raw safety classifier；只有完整 committed v1 是不阻断的诊断历史。
  - [x] 收紧 declaration recovery 与 supersession：original-submit evidence 必须为 trace/work/queue-bound committed v2；v1-only evidence 在 `missing_contract` 停止，不产生 ledger、successor、Gate 或 lineage authority。
  - [x] 新增 schema/unit/integration/deterministic-E2E 证明：unsafe v1 零 mutation；committed v1 不阻断 current v2；v1-only evidence 无 declaration recovery 或 supersession authority。
  - [x] 完成 selected deterministic verification、workflow-package validation、strict/archive governance、semantic closure、delta/main sync 与 closeout review；`tasks.md` 为 `18 / 18`。
  - [x] Governed archive（全部 finalizer checks passed）并提交 implementation/archive/spec sync（`858cbdb87`）；已回填本看板与 execution ledger。
- [ ] 18 `C7+C8`：最终清理 main specs、context 与 routing 的当前态表述

## 为什么是 18 项

- **审计口径：** 21 张细粒度 decision cards，用来保证风险不漏项。
- **执行口径：** 17 个已归档执行批次 + 1 个剩余执行批次/决定 = 目标总数 18。
- 一张 decision card 不自动等于一个 OpenSpec change。
- 只有 Source of Record、兼容决策、consumer/test 影响面和回滚边界一致时才合并执行。
- 失败后果或 mutation safety 不同时必须拆开，所以 `C5a-2` 不与 experiment 合并，
  `C6d` 不与 `C6a-C6c` 合并。
- 条件合并若不成立，只调整尚未执行的分母；已经完成的编号和记录不重写。第 10 项原先的四卡合并已因 Source of Record、consumer/test 与 rollback boundary 均不共享而拆开为 10-13；第 14 项原先的 C1f+C5b 也因同样的四项门禁拆为 14-15。

## 去哪里看

| 我想知道 | 只看这里 |
|---|---|
| 走到哪里、下一步是什么 | **本文件顶部总清单** |
| 某个候选为什么有风险、需要决定什么 | [Change-card index](current-contract-signal-cleanup/README.md) |
| 全量扫描有没有漏项 | [Coverage ledger](current-contract-signal-cleanup/coverage-ledger.md) |
| 合并规则与执行协议 | [Policy and protocol](current-contract-signal-cleanup/policy-and-protocol.md) |
| 已归档项的验证证据 | [Execution ledger](current-contract-signal-cleanup/execution-ledger.md) |
| 09 的归档提案与验证记录 | [Archived OpenSpec change](../../openspec/changes/archive/2026-08-14-decide-historic-reference-reader-policy/) |
| 10 的归档提案与验证记录 | [Archived OpenSpec change](../../openspec/changes/archive/2026-08-14-retire-unimplemented-fork-repair-contract/) |
| 11 的归档提案与验证记录 | [Archived OpenSpec change](../../openspec/changes/archive/2026-08-14-retire-stale-abstract-gate-fsm/) |
| 12 的归档提案与验证记录 | [Archived OpenSpec change](../../openspec/changes/archive/2026-08-14-retire-unreferenced-seed-topic-pointer/) |
| 13 的归档提案与验证记录 | [Archived OpenSpec change](../../openspec/changes/archive/2026-08-14-retire-unreachable-yaml-subset-parser/) |
| 14 的归档提案与验证记录 | [Archived OpenSpec change](../../openspec/changes/archive/2026-08-14-retire-archived-case-ledger-helper/) |
| 15 的归档提案与验证记录 | [Archived OpenSpec change](../../openspec/changes/archive/2026-08-14-decide-retained-experiment-history-policy/) |
| 16 的归档提案与验证记录 | [Archived OpenSpec change](../../openspec/changes/archive/2026-08-14-retire-legacy-work-unit-attempt-inputs/) |
| 17 的归档提案与验证记录 | [Archived OpenSpec change](../../openspec/changes/archive/2026-08-15-retire-transaction-v1-history/) |
| 18 的待决清理范围 | [C7/C8 decision cards](current-contract-signal-cleanup/README.md) |

## 更新规则

每次发生有效状态变化，立即更新本文件：

1. 勾选刚完成的当前子步骤。
2. 加粗下一个未完成子步骤，并同步顶部“眼前一步”。
3. Archive 并 commit 后，勾选顶层执行项，推进“当前位置”并更新进度数字。
4. 详细验证证据写入 execution ledger，不堆进本看板。

只有当所有顶层执行项都已勾选，或有证据证明无需执行并明确关闭，且 coverage 仍然完整、
current docs/specs/tests 只暴露当前成功路径、最终 package/spec/requirement checks 全部通过时，
本计划才算完成。

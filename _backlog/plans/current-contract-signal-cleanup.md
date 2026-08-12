# Current-contract signal cleanup

> 状态：active
>
> 建立日期：2026-08-12
>
> 下一动作：完成 C1a/C1b 范围决策，再 proposal `retire-inactive-contract-surfaces` 的最小安全 slice
>
> 目标：让 Agent 看到的 Harness、accepted main specs 和 `CONTEXT.md` 只描述当前可执行系统。旧格式、旧入口、旧 schema、旧 alias、旧 migration 和仅为历史兼容存在的 fallback 默认删除，不再让未知消费者成为永久兼容理由。

## 这份 plan 的角色

这是清理工作的 progressive control plane，不是行为 Source of Record，也不直接授权修改 Harness。每个行为变化都必须形成独立、可审查的 OpenSpec change，并严格走完：

`propose -> explore/refine -> apply -> sync -> archive`

在 `/opsx:apply` 之前，`DEEP_RESEARCH_HARNESS/`、`tests/` 和其他 target code 保持只读。accepted main specs、当前代码、Project Charter 以及适用的 OpenSpec operation guidance 仍决定每个 change 的实际边界。

本 plan 采纳的工作方式是：先定义唯一的当前 contract，再按 artifact family 小步删除兼容面；每一步都同时处理实现、成功路径测试、Agent-facing guidance 和 main specs，不建立一个永久的“legacy inventory”来继续养旧行为。

每个候选 change 的具体解释、实际 consumers、风险、影响面和 proposal 前证据门在 [change cards](current-contract-signal-cleanup/README.md) 中维护。总 plan 只保留全局政策、顺序和进度；不要在两处复制同一份 implementation scope。

## 目标状态

| 输入或资产 | 最终处理 |
|---|---|
| 符合唯一当前 contract/schema | 正常运行 |
| 属于旧格式、旧入口或旧 schema | 明确返回 unsupported-current-contract 类失败，停止，不猜测、不补值、不迁移 |
| 历史 bundle/artifact | 可以由人直接查看；当前 Engine 不执行、不升级、不迁移 |
| 当前 contract 自身的 schema/version discriminator | 保留，用来验证当前格式，不用来选择多个历史实现 |
| 当前运行的故障恢复、rerun、late-submit、supersession | 保留；这些是当前语义，不是历史兼容 |

`unsupported_current_contract` 是本 plan 使用的候选统一概念。每个 change 必须确认应复用现有错误 taxonomy，还是需要一个稳定 machine code；不得在多个 reader 内各造一套近义错误。

## Current-only 判定规则

对每一个疑似 compatibility branch，proposal/explore 必须回答以下问题：

- [ ] 当前 writer 是否仍会生成该形状？
- [ ] 当前 Agent-facing entry/guidance 是否仍承诺该形状？
- [ ] 当前生产 call graph 是否仍消费该形状？
- [ ] 除专门的 legacy fixture/test 外，是否存在 current-head 的真实消费者证据？
- [ ] 删除后，当前格式能否完成同一用户目标？
- [ ] 这究竟是旧格式兼容，还是当前运行所需的恢复、provenance 或 supersession 语义？

默认决策：前三项均为否、且只有 legacy tests 自证存在的分支应删除。没有找到消费者不是保留理由；要求保留者必须给出可复现的 current-head consumer 和 contract owner。

不得采用以下折中：

- [ ] 不保留“deprecated but still accepted”双轨状态。
- [ ] 不新增 migration CLI、auto-upgrade、version router 或 compatibility adapter 来延长旧格式寿命。
- [ ] 不把旧 fixture 改名为 compatibility fixture 后继续当正向成功用例。
- [ ] 不因为字段名含 `version` 就删除当前 schema discriminator。
- [ ] 不因为逻辑名含 `fallback` 就删除当前 profile 允许的真实工具降级或故障恢复；先判断其是否跨 contract 兼容。
- [ ] 不清理 `openspec/changes/archive/` 中的历史记录来制造表面上的低噪声。

## Baseline snapshot

2026-08-12 审计快照，仅用于比较趋势；每个 change proposal 前重新测量，不把这些数字写成永久 contract。

- [x] 已读 `openspec/constitution/project-charter.md`。
- [x] 已读根 `CONTEXT.md` 并确认其是非权威 glossary。
- [x] 已扫描 `DEEP_RESEARCH_HARNESS/`、`openspec/specs/` 和相关 focused tests。
- [x] Harness 约 56,867 行。
- [x] accepted main specs 共 85 份，约 26,757 行。
- [x] main specs 约有 623 个 requirements、2,580 个 scenarios。
- [x] 46 份 main spec 含 `this change`、`pre-C*`、deprecated 等历史过渡措辞。
- [x] requirement registry 有 53 个 retired ID；13 个 retired ID 仍出现在 main specs。
- [x] 两份 main spec 全部由 retired requirements 构成：`bundle/bundle-start-from-here`、`engine/gate-content-dedup`。
- [x] `RUN.md` 在真正 Section 0 前约有 243 行、19 KB release/history 内容。
- [x] repo `CHANGELOG.md` 有 88 个内部版本记录；package 为 private `0.0.0`，Git tag 只有 `v0.0.1`、`v0.1.1`，不存在与 `v0.89` 对应的分发 release。
- [x] `framework_version` 会写入 bundle，但未发现 runtime reader 据此拒绝、迁移或选择执行路径。
- [x] 已识别 profile、bundle entry、reference/experiment、work-unit 等多组 legacy success paths。
- [x] baseline verification 全部通过：workflow package、project specs、project requirements plan mode，以及 context/entry/version focused tests。

已观察到的高信号 cleanup candidates：

- `RUN.md` release dump 和双重版本 banner。
- `RUN_BUNDLE.md`、`START_FROM_HERE.md` 旧 bundle entry 成功路径。
- legacy `research_access`、旧 topic/profile 默认补值和迁移 fixture。
- 多版本 reference metadata、experiment report/audit reader。
- work-unit assignment v1/v2/markerless、transaction v1/v2 兼容 reader。
- 已 retired 却仍作为当前 catalog 项的 `gate-content-dedup`。
- runtime 不消费的旧 Gate FSM contract/module，以及仅保护这些模块自身的 tests。
- 描述不存在 API 的 `fork-repair-converge` spec。
- 无消费者或主要承担转发噪声的 shared authoring guidance。

这些是 proposal 输入，不是未经验证的删除清单。

## 全局进度

| 顺序 | OpenSpec change | 状态 | 依赖 | 完成后主要收益 |
|---|---|---|---|---|
| 0 | Baseline and policy | complete | 无 | current-only 原则和审计基线明确 |
| 1 | `retire-inactive-contract-surfaces` | needs split decision | 0 | 先删除 pure tombstone/dead surface；gate utilities/return-map 有 current consumer，另行决定 |
| 2 | `remove-internal-versioning-and-slim-entry` | pending | 1 | 让真正入口靠前，停止内部版本号伪装成发行兼容体系 |
| 3 | `drop-legacy-bundle-entry-compatibility` | pending | 2 | bundle 只剩一个入口 contract |
| 4 | `drop-legacy-profile-and-topic-compatibility` | must split | 3 | profile access 与 topic migration/identity 是不同风险族 |
| 5 | `drop-legacy-reference-and-experiment-formats` | must split | 4 | reference binding 与 experiment retained history 是不同 contract |
| 6 | `drop-legacy-work-unit-contracts` | blocked by product decision | 3-5 | 历史 work-unit artifact 是否仍由 current Engine 读取须先决定 |
| 7 | `rewrite-main-specs-as-current-state` | pending | 1-6 | accepted specs 不再充当 change history |
| 8 | `sharpen-context-and-routing` | pending | 7 | 最后压缩 glossary/routing，减少脆弱措辞测试 |

原则上一次只推进一个 change。若前一 change 尚未 archive，不开始下一个 target edit；探索中发现跨域耦合时，先把它记录为本 plan 的新 checkbox，再决定扩展当前 proposal 还是建立后续 change。

## 每个 change 的固定执行协议

以下 checklist 必须复制或引用到每个 change 的 `tasks.md`，并在本 plan 对应 section 更新状态。

### Proposal and exploration

- [ ] 确认当前没有冲突的 active OpenSpec change。
- [ ] 重新读 Project Charter、根 `CONTEXT.md` 和该 change 直接涉及的 accepted specs。
- [ ] 用 `/opsx:propose` 建立 proposal、design、delta specs 和 tasks；change slug 以本 plan 候选名为默认。
- [ ] proposal 明写唯一 current contract、要删除的 legacy success behavior、明确 out of scope。
- [ ] 建立 producer/reader/caller/test/guidance/spec 五面 inventory，并为每个候选给出 keep/delete/rewrite 结论。
- [ ] 对删除项证明 current writer 不再生成、current call graph 不需要、current user goal 有现行路径。
- [ ] 把 proposal 期间发现的可执行问题写进 `tasks.md`；不只留在聊天、review note 或 implementation evidence。
- [ ] 若 `tasks.md` 声明 `openspec-feedback:*` marker，在 target edit 前读取匹配的当前 apply guidance。
- [ ] 在用户认可 scope/tasks 后才进入 `/opsx:apply`。

### Apply, verification, and archive

- [ ] 同一个 apply slice 删除旧实现分支、正向 legacy tests、legacy fixtures、Agent guidance 和 accepted contract；不留半支持状态。
- [ ] 为唯一 current path 保留或补充行为测试；旧输入最多保留一个有 contract 价值的拒绝边界测试。
- [ ] 运行 focused tests 和全局 governance checks。
- [ ] 运行 current-surface hygiene scan，确认旧 token 不再以正向生产指导出现。
- [ ] review 实际 diff，确认没有顺手改 archived changes、历史 bundles 或无关模块。
- [ ] sync delta specs，使 main specs 只描述 apply 后的当前行为。
- [ ] 若存在 feedback marker，在 archive 前读取匹配的当前 archive guidance并关闭普通 pending tasks。
- [ ] 用 governed finalizer 完成 archive：`node openspec/governance/finalize-change-archive.mjs --change <name>`。
- [ ] 在本 plan 更新状态、证据、指标和下一 change；所有 follow-up discovery 形成新 checkbox。

### 每次都要跑的基础验证

```bash
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-project-reqs.mjs --mode plan
```

Archive 时按当前 change 运行 archive-mode requirement check 和 governed finalizer；实际参数以当时 operation guidance 为准。

## Change Card Gate

具体 scope、真实 consumer、风险、不可碰语义、proposal 前证据和验证命令统一放在 [change cards](current-contract-signal-cleanup/README.md)。

在任何 `/opsx:propose` 前，先完成对应卡片的 Go / No-go checkbox。卡片中发现的 current consumer 会覆盖本计划的初始候选删除判断；它们是防止“为了减少噪声而删掉当前路径”的硬门。

当前排程要点：

- [ ] C1 先拆成 C1a pure tombstone/dead-surface cleanup 与 C1b gate utility/playbook positioning；C1a 才是可逐步提案的最小 slice。
- [ ] C2、C3 保持顺序推进，分别处理入口噪声和 legacy bundle entry 成功路径。
- [ ] C4 与 C5 先拆分 contract family；profile/topic、reference/experiment 不能混在一个 apply。
- [ ] C6 在用户决定历史 work-unit artifacts 的 Engine policy 前保持 blocked。
- [ ] C7、C8 只在 runtime behavior 收敛后再开始，防止 docs/specs 领先真实行为。

## Metrics ledger

每个 change archive 后追加一行，不回写或美化旧 baseline。

| Date | Change | Harness LOC | Main specs / LOC | Requirements / scenarios | Legacy success branches removed | Historical-language hits | Verification | Evidence |
|---|---|---:|---:|---:|---:|---:|---|---|
| 2026-08-12 | baseline | 56,867 | 85 / 26,757 | 623 / 2,580 | 0 | 46 specs contain candidate wording | PASS | initial audit |
| TBD | Change 1 |  |  |  |  |  |  |  |
| TBD | Change 2 |  |  |  |  |  |  |  |
| TBD | Change 3 |  |  |  |  |  |  |  |
| TBD | Change 4 |  |  |  |  |  |  |  |
| TBD | Change 5 |  |  |  |  |  |  |  |
| TBD | Change 6 |  |  |  |  |  |  |  |
| TBD | Change 7 |  |  |  |  |  |  |  |
| TBD | Change 8 |  |  |  |  |  |  |  |

数字不是目标本身。只有当删除同时减少 current contract 数、reader/writer 分支和 Agent 决策歧义时，才算提高信噪比。

## Discovery inbox

后续任何发现先写成 checkbox，再分派到一个 bounded change；没有 owner 的发现不得静默扩张当前 apply scope。

- [ ] 在 Change 1 proposal 时建立首次完整 producer/reader/caller inventory，并把遗漏项加到对应 change。
- [ ] 在每次 archive 后重跑 legacy-token scan，将新的正向 success hit 归入后续 change。
- [ ] 若发现真实外部 current consumer，只记录可复现证据和需要保留的最小 contract；不因此恢复整个旧版本族。
- [ ] 若某 change 同时涉及两个可独立验证的 artifact family，拆成两个 change 并更新全局进度表。

## Plan close criteria

只有以下条件全部满足，才把本文件移入 `_backlog/_done/_closed_plans/`：

- [ ] Changes 1-8 均 archived，或经有证据的 decision 明确判定不需要并记录原因。
- [ ] Harness 的每个受审计 artifact family 只有一个 current positive contract。
- [ ] current docs/specs/tests 不再把旧格式或旧入口展示为成功用法。
- [ ] historical bundles 保持可人工查看，但 current Engine 不迁移、不执行。
- [ ] 当前 recovery/rerun/provenance/supersession 行为均有验证且未被兼容清理破坏。
- [ ] main specs 和 capability catalog 只描述 current observable system。
- [ ] `CONTEXT.md` 与 routing instructions 已做最后一次 signal review。
- [ ] 最终 package、spec、requirement 和 focused behavioral checks 全部通过。
- [ ] 按 `_backlog/plans/README.md` 的完成流程移动本 plan 并更新索引/计数。

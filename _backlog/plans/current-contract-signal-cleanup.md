# Current-contract signal cleanup

> 状态：全域覆盖审计已完成；C2a/C2b/C2c/C3 均已 governed-archived；C4a proposal 已完成并通过 plan-mode governance validation，等待明确 Apply 授权
>
> 建立日期：2026-08-12
>
> 当前阶段：C3 `drop-legacy-bundle-entry-compatibility` 已完成 Apply、main-spec sync、验证和 governed archive；C4a 的 current-only proposal 已定义 optional 字段、`ProfileSchema` 拒绝边界和 HITL1 的既有 schema root，并已通过 planning governance validation。
>
> 下一动作：审查 C4a proposal；仅在获得明确 `/opsx:apply` 授权后，才修改 Harness、tests、accepted main specs 或 governance target。
>
> 目标：让 Agent 看到的 Harness、accepted main specs 和 `CONTEXT.md` 只描述当前可执行系统。旧格式、旧入口、旧 schema、旧 alias、旧 migration 和仅为历史兼容存在的 fallback 默认删除，不再让未知消费者成为永久兼容理由。

## 这份 plan 的角色

这是清理工作的 progressive control plane，不是行为 Source of Record，也不直接授权修改 Harness。每个行为变化都必须形成独立、可审查的 OpenSpec change，并严格走完：

`propose -> explore/refine -> apply -> sync -> archive`

在 `/opsx:apply` 之前，`DEEP_RESEARCH_HARNESS/`、`tests/` 和其他 target code 保持只读。accepted main specs、当前代码、Project Charter 以及适用的 OpenSpec operation guidance 仍决定每个 change 的实际边界。

本 plan 采纳的工作方式是：先定义唯一的当前 contract，再按 artifact family 小步删除兼容面；每一步都同时处理实现、成功路径测试、Agent-facing guidance 和 main specs，不建立一个永久的“legacy inventory”来继续养旧行为。

每个候选 change 的具体解释、实际 consumers、风险、影响面和 proposal 前证据门在 [change cards](current-contract-signal-cleanup/README.md) 中维护；全范围是否真的已覆盖由 [coverage ledger](current-contract-signal-cleanup/coverage-ledger.md) 证明。总 plan 只保留全局政策、顺序和进度；不要在两处复制同一份 implementation scope。

## 全域 Coverage / Proposal Gate

这次清理暴露出一个过程问题：不能因为某个局部刚看清，就创建
proposal，随后才发现另一个 legacy reader、retained artifact、accepted spec 或治理规则耦合其中。卡片存在、或某一组做过 grep，都不等于全范围已经扫描完成。

从现在开始，任何新的 cleanup proposal 都受以下全域门约束：

- [x] C1 的已知 surface 已完成 producer / reader / caller / guidance / spec / test 归类；其五个候选动作已拆成独立卡。
- [x] C2-C5 的 producer / reader / caller / guidance / spec / test 首轮调查已完成，并写入对应 change card。
- [x] 当前语义与历史兼容已分开；`previous_layouts`、current direct-sample statuses、`related_topic_uid: all` 等不因名字像旧格式而进入删除候选。
- [x] `DEEP_RESEARCH_HARNESS/` 的 227 个 tracked files 已盘点；222 个 non-empty asset 与 5 个空模板/placeholder 均已有 owner-based classification，broad-scan candidate clusters 已归入 audit family 或标为 protected/rejection/false positive。
- [x] 85 份 accepted main specs 均已有逐份 classification；机械 keyword hit 没有被当作完成证据。
- [x] `CONTEXT.md`、直接相关 root routing/guidance、以及被候选变更触及的 tests/playbooks 均已有 owner-based classification。
- [x] 每个候选都有明确 owner、风险等级和下一动作；C6 的 reader fanout 已按 C6a-C6d 分开，任何后续发现仍须进入 coverage ledger，不在聊天中隐式扩张。
- [x] coverage ledger 的 `unclassified candidate count` 为 `0`。
- [ ] 用户按风险队列逐项确认需要 product / compatibility policy 的动作；一次只讨论一项。
- [ ] 只有上述全域门已满足、该 slice 获用户批准、且它自己的 Go / No-go 完整时，才可创建独立 OpenSpec proposal。

已记录的例外：C2c 已于 2026-08-13 选择 A（保留可选、非权威的人类
`CHANGELOG.md`；取消内部 `v0.x` authority、proposal-time bump 和 `RUN.md`
banner choreography）。C2b 先独立 Apply、sync 并通过 governed archive
（`2026-08-13-retire-framework-version-stamp`）；随后 C2c 以其 archive record
为硬前置，独立 Apply、sync 并通过 governed archive
（`2026-08-13-retire-internal-version-choreography`）。随后 C3 以独立 change
完成 Apply、sync、验证和 governed archive
（`2026-08-13-drop-legacy-bundle-entry-compatibility`）；下一步是 C4a 的单项
policy decision。

这个 gate 不追溯已归档的 C1a/C2a；全域调查现已完成。它仍要求每个获准 slice 单独走 `propose -> explore/refine -> apply -> sync -> archive`，不会把不同 artifact family 合并成一个大 change。

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
- [x] repo `CHANGELOG.md` 有 89 个内部版本记录；package 为 private `0.0.0`，Git tag 只有 `v0.0.1`、`v0.1.1`、`v0.11`，不存在与 `v0.89` 对应的分发 release。
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
| 1 | `retire-inactive-contract-surfaces` | C1 known-surface inventory closed; C1b-C1f are split candidates awaiting their own approval | 0 | 已停止 catalog 将 retired dedup 表述为 current capability；gate utilities/return-map 已归类为 current，五个实际候选不再混在一起 |
| 2 | `remove-internal-versioning-and-slim-entry` | C2a/C2b/C2c 均 archived；C3 也已完成并归档，下一步是 C4a 的单项 policy decision | 1 | 让真正入口靠前，并停止内部版本号/横幅 choreography |
| 3 | `drop-legacy-bundle-entry-compatibility` | applied, synced, verified, governed-archived (`2026-08-13-drop-legacy-bundle-entry-compatibility`) | 2 | bundle 只剩一个可执行 entry contract |
| 4 | `drop-legacy-profile-and-topic-compatibility` | 已知 surface classification closed：C4a proposal 已通过 planning validation、等待 Apply；C4b policy pending；current profile statuses 与 layout lineage 已有 focused regression evidence | 3 | profile access 与 legacy plan migration 是不同风险族；current layout lineage 保留 |
| 5 | `drop-legacy-reference-and-experiment-formats` | known-surface classification closed；C5a-1b 已证实 Wave2 selected-subset 是 current output，但其无损 metadata form 与 historic-reader policy 仍待单独决策 | 4 | current one/all/subset binding、historic reference reader、experiment retained history 分别决策 |
| 6 | `drop-legacy-work-unit-contracts` | C6a-C6d 已按 explicit assignment、markerless submission、actor provenance、transaction v1 拆卡；reader fanout 已完成；每项仍为 L4 且等待逐项决策 | 3-5 | 不再把四种历史 work-unit 语义误当成一个可安全删除的版本分支 |
| 7 | `rewrite-main-specs-as-current-state` | pending | 1-6 | accepted specs 不再充当 change history |
| 8 | `sharpen-context-and-routing` | pending | 7 | 最后压缩 glossary/routing，减少脆弱措辞测试 |

原则上一次只推进一个 change。若前一 change 尚未 archive，不开始下一个 target edit；探索中发现跨域耦合时，先把它记录为本 plan 的新 checkbox，再决定扩展当前 proposal 还是建立后续 change。

### C2b/C2c 已完成的串行执行记录

这两个 OpenSpec change 曾可同时处于 active 状态，但不得同时进入 target
edits。C2b 和 C2c 分别拥有不同的行为边界，且 C2c 的 task 1.1 把 C2b 的
governed archive 设为硬前置条件；实际执行顺序如下：

1. C2b 已完成 Apply、delta/main sync、closeout review 与 archive checks，并于
   2026-08-13 通过 `finalize-change-archive.mjs` archive。
2. `2026-08-13-retire-framework-version-stamp` archive record 是 C2c task 1.1
   的可审计前置证据。
3. C2c 已完成 plan review、C2b archive evidence、governance checks 和
   current-consumer scan，随后完成 own targets、sync 与 governed archive
   （`2026-08-13-retire-internal-version-choreography`）。
4. C3 已获授权并完成 Apply、main-spec sync、selected verification、closeout
   review 与 governed archive（`2026-08-13-drop-legacy-bundle-entry-compatibility`）。
   因此下一个未决 policy gate 是 C4a，而不是重新打开 C3。

这样 C2b 在当时有效的 VEM choreography 下完成自己的旧规则收尾；C2c 随后
只移除那套 choreography，没有让新 bundle 在二者之间继续写入一个已失去
authority 的 stamp。

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

- [x] C1a 已按更小的 catalog-only slice archive：`2026-08-12-correct-retired-content-dedup-catalog` 只更正 retired `gate-content-dedup` 的 catalog 投影；其余 C1 dead-surface 与 C1b gate utility/playbook 判断仍须单独审查。
- [x] C2a `slim-run-entry-history` 已 governed archive：`RUN.md` 仅保留一个 banner，Section 0 回到第 5 行；`framework_version`（C2b）与版本治理（C2c）未纳入该 change。
- [x] C2b/C2c、C3、C4a/C4b、C5b 的 discovery cards 已先收口；C5a 的 Wave1 handoff 已证实，C5a-1b 也已证实 selected-subset Wave2 reference 是 current output，但其 binding design 仍须独立用户决策。
- [x] C2b stamp policy 已通过 governed archive：`2026-08-13-retire-framework-version-stamp` 删除新 bundle stamp writer、CMI-007 与正向 assertions；60 个 focused tests、package 与 governance checks 通过。
- [x] C2c 的 A policy 已由用户确认；`retire-internal-version-choreography` 已完成 proposal/design/delta-spec/tasks planning validation、Apply、sync、closeout review 与 governed archive。
- [x] C3 的 A policy 已由用户确认并落地：only `RUN_BUNDLE.md`、only `BUNDLE_MAP.md`、only `START_FROM_HERE.md` 的历史 bundle 不得进入 current `continue` / `inspect` / reentry 正向路径；人仍可直接阅读历史 Markdown。`drop-legacy-bundle-entry-compatibility` 已完成 12 份 delta 的 sync、shared predicate、closeout repairs、unit `27/27`、integration `49/49`、deterministic E2E `2/2`、package validation、治理检查和 governed archive（`2026-08-13-drop-legacy-bundle-entry-compatibility`）。
- [x] C4a 的 field-optional policy 已确认：移除 legacy `research_access` envelope 不把字段升级为全局必填；缺失字段继续只在 HITL1 recorded-observation rule 处阻断。下一项只决定 legacy envelope 的 rejection owner/taxonomy。
- [x] C4a 的 rejection-owner policy 已确认：legacy envelope 复用 `ProfileSchema` invalid boundary；HITL1 使用既有 `profile_schema_valid` / `missing_contract` 根因，其他 readers 只走各自既有 schema failure，不建立 legacy-specific code、检测器、迁移或 upgrade。
- [x] C4a proposal `retire-legacy-research-access-envelope` 已完成：三份 delta requirements、design、tasks、verification plan 和 semantic closure 都通过 strict OpenSpec、requirement registry、capability discovery、verification-routing 及 semantic-closure 的 plan-mode validation；等待明确 Apply。
- [ ] C4a、C4b、C5a、C5b 各保留独立 decision gate；profile/topic、reference/experiment 不得混入同一个 apply。
- [ ] C6a-C6d 按 explicit assignment、markerless submission、actor provenance、transaction v1 各自单独讨论并决定；不得用一个总的历史-artifact policy 覆盖四种后果。
- [ ] C7、C8 只在 runtime behavior 收敛后再开始，防止 docs/specs 领先真实行为。

## Metrics ledger

每个 change archive 后追加一行，不回写或美化旧 baseline。

| Date | Change | Harness LOC | Main specs / LOC | Requirements / scenarios | Legacy success branches removed | Historical-language hits | Verification | Evidence |
|---|---|---:|---:|---:|---:|---:|---|---|
| 2026-08-12 | baseline | 56,867 | 85 / 26,757 | 623 / 2,580 | 0 | 46 specs contain candidate wording | PASS | initial audit |
| 2026-08-12 | C1a catalog-only | unchanged | 85 / unchanged | unchanged | 0 | 1 misleading active catalog row corrected | PASS | governed archive `2026-08-12-correct-retired-content-dedup-catalog`; taxonomy + retired-heuristic hygiene passed |
| 2026-08-12 | C2a slim entry history | -246 (`RUN.md` 299 -> 53) | unchanged | unchanged | 0 runtime branches; 1 duplicate history projection removed | `RUN.md` no longer has `Current Release` dump | PASS | governed archive `2026-08-12-slim-run-entry-history`; 32 focused tests + package/governance checks passed |
| 2026-08-13 | C2b retire framework stamp | -36 | -1 requirement / -3 scenarios | CMI-007 retired | 1 new-bundle writer chain | new output/specs no longer present `framework_version` as current contract | PASS | governed archive `2026-08-13-retire-framework-version-stamp`; 60 focused tests + package/governance checks passed |
| 2026-08-13 | C2c retire internal version choreography | -2 (`RUN.md` banner) | 2 current specs rewritten | 6 current requirements rewritten | 3 forced projections: internal target, changelog task, entry banner | no positive current entry/version contract | PASS | governed archive `2026-08-13-retire-internal-version-choreography`; 15 tests / 4 suites + package/governance checks passed |
| 2026-08-13 | C3 legacy bundle entry | not remeasured | 84 / not remeasured | 18 modified requirement blocks synchronized | 3 legacy-only entry paths; incomplete current pairs reject | scoped scan found no positive legacy-entry, fallback, or migration route | PASS | governed archive `2026-08-13-drop-legacy-bundle-entry-compatibility`; unit 27/27, integration 49/49, deterministic E2E 2/2, package and archive governance checks passed |
| TBD | Change 4 |  |  |  |  |  |  |  |
| TBD | Change 5 |  |  |  |  |  |  |  |
| TBD | Change 6 |  |  |  |  |  |  |  |
| TBD | Change 7 |  |  |  |  |  |  |  |
| TBD | Change 8 |  |  |  |  |  |  |  |

数字不是目标本身。只有当删除同时减少 current contract 数、reader/writer 分支和 Agent 决策歧义时，才算提高信噪比。

## Discovery inbox

后续任何发现先写成 checkbox，再分派到一个 bounded change；没有 owner 的发现不得静默扩张当前 apply scope。

- [x] 已完成每个 audit family 的 ledger 更新；不因“已有 change card”推断覆盖，而是以 inventory 和 owner classification 为证据。
- [x] Harness broad scan 的每个 candidate cluster 已归入 C1-C9 或 `protected current semantic` / `current rejection boundary` / `false positive`；无 owner 的 hit 为零。
- [x] C6 的四种已知历史 work-unit shape 已拆为 C6a-C6d，且 reader fanout 已分别映射；这不等于任何 L4 结果已获批准。
- [x] 已为 85 份 main spec 建立逐份 inventory，记录 current behavior owner、classification 和 action。
- [ ] 在每次 archive 后重跑 legacy-token scan，将新的正向 success hit 归入后续 change。
- [ ] 若发现真实外部 current consumer，只记录可复现证据和需要保留的最小 contract；不因此恢复整个旧版本族。
- [ ] 若某 change 同时涉及两个可独立验证的 artifact family，拆成两个 change 并更新全局进度表。

## Plan close criteria

只有以下条件全部满足，才把本文件移入 `_backlog/_done/_closed_plans/`：

- [ ] Changes 1-8 均 archived，或经有证据的 decision 明确判定不需要并记录原因。
- [ ] coverage ledger 的每一项均已分类，且 `unclassified candidate count = 0`。
- [ ] Harness 的每个受审计 artifact family 只有一个 current positive contract。
- [ ] current docs/specs/tests 不再把旧格式或旧入口展示为成功用法。
- [ ] historical bundles 保持可人工查看，但 current Engine 不迁移、不执行。
- [ ] 当前 recovery/rerun/provenance/supersession 行为均有验证且未被兼容清理破坏。
- [ ] main specs 和 capability catalog 只描述 current observable system。
- [ ] `CONTEXT.md` 与 routing instructions 已做最后一次 signal review。
- [ ] 最终 package、spec、requirement 和 focused behavioral checks 全部通过。
- [ ] 按 `_backlog/plans/README.md` 的完成流程移动本 plan 并更新索引/计数。

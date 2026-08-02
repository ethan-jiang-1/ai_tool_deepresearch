# Experiment Progressive Run Plan

> 状态：当前总路线图，2026-08-02 建立
>
> 历史测量与原始假设：[Experiment Progressive Run Strategy](experiment-progressive-run-strategy.md)
>
> 已完成 change：[fast-regression-run-profile](../../openspec/changes/archive/2026-08-02-fast-regression-run-profile/)
>
> 这是一份 planning/routing 文档，不是 runtime authority。每次实际选择以前，都以当前 manifest、V2 frontmatter、retained report 和 `run-agent-experiment.mjs --dry-run --json` 为准。

## 目标

让 Agent Experiment case 成为高频、广覆盖、可逐步扩充的质量资产：快速的确定性回归发现普通回归问题；慢案例、异常案例和真实 Agent proof 分别进入有边界的工作线。整个计划不建立静态 speed taxonomy、第二 suite、后台 scheduler 或把历史观测写成永久 case 身份。

## 这份计划如何承接旧计划

| 原计划内容 | 当前处理 | 理由 |
| --- | --- | --- |
| 18 个 light case 的耗时/成本测量 | 保留为 Phase 0 历史证据 | 它证明 filename tier 不能代表当前速度，但不是当前选择权威 |
| Sprint / Standard / Marathon | 废止为执行分类 | 性质会随代码和重构改变，不能要求人工迁移或维护 |
| Wave A-C 的静态清单与 timeout | 改为 diagnostic / calibration 的实时 bounded profile | 每次从当前 observation 选择，不用陈旧名单猜速度 |
| Wave D Real-Agent Heavy | 保留为独立 Agent-behavior 工作线 | 它不属于 fast deterministic regression，也不与其共享预算或结论 |
| `all` retry、health、FAIL/ERROR | 保留为待诊断问题 | 每个可证实根因再进入小而明确的 OpenSpec change |

## 已完成阶段

### Phase 0 - Historical Measurement

状态：完成，保留在 [Experiment Progressive Run Strategy](experiment-progressive-run-strategy.md)。

产出：确认历史 `light|standard|heavy` 与实际耗时、成本和覆盖价值脱钩；记录了初始 PASS/ISSUES/FAIL/ERROR 信号。

### Phase 1 - Fast Regression Foundation

状态：完成，已归档为 `fast-regression-run-profile`，提交 `dedf89897`。

产出：`regression` 是虚拟、deterministic-only、高频 profile；固定 `480000` ms forecast、`$3.00` batch、`$0.60` case、`120000` ms Agent timeout、`60000` ms health timeout。它只接纳 current matching-v2 `PASS+CLEAN` case，并每个 `experiment` group 至多选一例；qualification 必须显式请求。

它解决了“如何安全高频跑”的入口，不解决慢案例覆盖、Agent-behavior proof、health 根因或全部历史 case 的重新执行。

## 当前事实快照

以下是 2026-08-02 的 dry-run 快照，供排程使用而不替代下一次 dry-run：

| 工作线 | 当前结果 | 解释 |
| --- | --- | --- |
| normal regression | 3 个 eligible：`case-606`、`case-315`、`case-33` | 这是当前 fast pool，不是全库 coverage 声明 |
| regression qualification | 0 个 selected | 当前没有可在 fast envelope 内补 qualification 的 candidate |
| regression gaps | 21 个 `experiment` group 未覆盖，99 个 case ineligible | 主要直接原因包括 unreviewed `all`、慢/高成本、health ISSUES、Agent-behavior、FAIL/NOT_RUN |
| diagnostic (`900000` ms dry-run) | 先选 `case-51`、`case-52`、`case-53` | 67 个候选因预测时长超界被保留，不应静默扩大 batch |
| calibration (`900000` ms dry-run) | 先选 5 个可校准 deterministic case | 93 个候选因边界被保留；真实运行前重新计算 |
| discovery（7 天 Agent-behavior freshness） | 15 分钟请求中含 1 个 due Agent-behavior case；共 20 个 due | 这是一条独立、低频、高成本证据线 |

## 后续阶段与顺序

```text
Phase 1: Fast regression (持续、已可运行)
                |
                v
Phase 2: Diagnostic batch -> root-cause decision -> one or more focused OpenSpec changes
                |
                v
Phase 3: Recompute calibration -> bounded deterministic refresh -> expand or retain gaps
                |
                +------------------------------+
                |                              |
                v                              v
Phase 4: Agent-behavior discovery pilot    Phase 5: Policy review
                |                              |
                +---------- evidence ----------+
                               |
                               v
                    only then propose policy changes
```

### Phase 2 - Diagnostic Remediation

状态：下一步，尚未执行真实 batch。

目的：先处理当前有 FAIL、ERROR、NOT_RUN、PASS+ISSUES 或 stale/unknown direct fact 的 case，避免把已知异常混进 calibration 或 fast regression。

执行步骤：

1. 每次先运行 bounded `diagnostic --dry-run --json`，确认当前被选 case、预测和 omitted 原因。
2. 经明确预算批准后，只运行该次 bounded selection；不因为遗漏候选扩大 timeout 或预算。
3. 逐 case 阅读 native outcome、health、audit 和 trace，写出一个明确 root-cause decision。
4. 任何需要修改 framework、playbook、case 内容、contract 或健康策略的 root cause，都先创建一个或多个 focused OpenSpec change；诊断结果本身不授予 target edit 权限。

退出条件：每个已启动 case 都有 native result 与独立 health 结论；每个可行动问题都有 owner、最小修复和独立验证方式。不得把多个不相关问题塞进一个“大诊断 change”。

### Phase 3 - Deterministic Calibration

状态：等待 Phase 2 的首批结论后执行。

目的：用当前测量补齐 deterministic case 的 duration/cost/source/execution-surface observation，逐步扩大可证明的 fast pool，而不是完成一个静态 Wave B/C 清单。

执行步骤：

1. 重新运行 bounded `calibration --dry-run --json`，不复用本文中的 case 名单。
2. 选择能装入明确 duration 和预算边界的一小批；同一 batch 的实际结果成为下一次 selection 的唯一新增事实。
3. 对 PASS+CLEAN 且满足 fast SLO 的 matching-v2 deterministic case，让现有 selector 自然接纳；其余保留为 gap 或 diagnostic input。
4. 每批后只记录事实、预算、health 和下一步，不给 case 写永久 Sprint/Standard/Marathon 标签。

退出条件：本轮明确的 calibration budget 用尽、selection 无可运行候选，或新增 observation 已回答本轮覆盖问题。届时重新评估，而不是自动扩展为全库长跑。

### Phase 4 - Agent-Behavior Discovery Pilot

状态：与 Phase 3 独立；在明确 provider、预算和真人/Subject Agent 条件后启动。

目的：恢复真实 Agent / Sub-agent proof 的可见性，但不把它伪装成 deterministic regression。

执行步骤：

1. 运行 discovery dry-run，带明确 freshness objective 和小的 duration/budget envelope。
2. 只启动一个当前 selected pilot；原计划中的 `case-711` 不是永久默认，当前候选以 dry-run 为准。
3. 审阅 Subject evidence、native outcome、health 与 provider/permission 事实。
4. 只在发现稳定的 framework 或 contract 缺口时创建 focused OpenSpec change；一次 NOT_RUN 或 provider 不可用不能被写成产品行为结论。

退出条件：得到一个可审计的真实证据结果或诚实的 unavailable boundary，并据此决定是否值得安排下一次 pilot。

### Phase 5 - Policy Review

状态：条件性，不能提前实施。

触发条件：Phase 2-4 累积了足以说明现有 fast SLO、profile selection 或 observability contract 不再适配的直接 evidence。

可能决定：保持现有 policy；为一个明确 root cause 修复；或提出 SLO/profile 行为变更。任何改变 `regression` envelope、admission、预算、timeout、selection 或证据语义的决定都必须新建 OpenSpec change，不能通过本 backlog 文档或一次运行隐式改变。

## OpenSpec Portfolio

| 阶段 | Change 名称 | 状态 | 建立条件 |
| --- | --- | --- | --- |
| Phase 1 | `fast-regression-run-profile` | 已完成并归档 | 已落地 |
| Phase 2 | `experiment-progressive-run-diagnostic-<root>` | 预留命名槽 | 某次 diagnostic 给出可复现、跨边界的明确 root cause |
| Phase 4 | `experiment-progressive-run-agent-behavior-<root>` | 预留命名槽 | pilot 证明需要框架、contract 或操作能力改变 |
| Phase 5 | `experiment-progressive-run-policy-revision` | 预留命名槽 | 多轮 evidence 支持修改 profile/SLO 语义 |

不为“执行已经存在的 profile”创建空 OpenSpec change；也不预先把未知 root cause 塞进一个大 proposal。OpenSpec 用于落地已经明白的行为变化，本文用于保证这些变化出现前的顺序、边界和证据要求始终清晰。

## 下一步

下一次有实验预算的操作先走 Phase 2：重新跑 diagnostic dry-run，确认当次选择后启动该次小批真实 run。完成后只做两件事：记录 direct evidence，并判断是否出现第一个 `experiment-progressive-run-diagnostic-<root>` proposal 的合法边界。Phase 3 和 Phase 4 仍已预先排好，但不抢在该证据之前实施。

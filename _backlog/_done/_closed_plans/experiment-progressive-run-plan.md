# Experiment Progressive Run Plan

> 状态：本轮已完成，2026-08-03 收口
>
> 后续的条件性运行不属于本轮完成条件，已移至
> [Experiment Progressive Follow-up Intake Plan](../../plans/experiment-progressive-follow-up-plan.md)。
> 该文档不授予新的运行预算或自动重试。
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

## Execution Checklist

这里是本计划唯一的执行进度面板。叙述章节定义边界和 done condition；只有 native evidence、dry-run output、通过严格校验的 OpenSpec planning artifact 或已归档 OpenSpec 允许勾选对应项目。

### Phase 0 - Historical Measurement

- [x] P0.1 保留 2026-08-01 的测量、耗时和问题记录为历史 evidence。
- [x] P0.2 明确历史 `light|standard|heavy` 与 Sprint/Standard/Marathon 不是当前执行分类。

### Phase 1 - Fast Regression Foundation

- [x] P1.1 归档 `fast-regression-run-profile` change。
- [x] P1.2 建立 matching-v2 `PASS+CLEAN` 的 virtual fast regression admission。
- [x] P1.3 以真实 qualification evidence 建立初始 3-case fast pool。

### Phase 2 - Diagnostic Remediation

- [x] P2.1 重新运行 unrestricted diagnostic dry-run，确认当前 diagnostic 候选和 direct reasons。
- [x] P2.2 用 `480000` ms / `$3.00` one-case envelope 预检，确认只选择 `case-51-standard-happy-path`。
- [x] P2.3 运行 P2.1 slice：`case-51-standard-happy-path`；native `PASS`、health `ISSUES`、实际 `351290` ms / `$1.9991`，report `730af6f6-2844-48a3-9e7e-b6933a244c54`。
- [x] P2.4 检查该 slice 的 native outcome、health、audit、trace 和实际 duration/cost。
- [x] P2.4a 读取 retained report：确认 native `PASS` 与 health `ISSUES` 独立，提取 timeline、work-unit 和 rerun style-projection 信号。
- [x] P2.4b 用 preserved run root 重放每个 health 信号，建立秒级 red-capable loop：0.4s 纯读回放重现 proceed trace/log `9/8`、三个 bundle 的缺失 work-unit authority，以及 rerun `false,false,true` 的 style-projection 修复序列。
- [x] P2.4c 区分 fixture/playbook、health policy 与 framework contract owner，形成 root-cause decision。
- [x] P2.4c.1 `case-51` fixture/playbook 已落后于 Wave1 carried-target receipt contract：bare `writeGateAttempt` 静默遗漏 `wave1-complete`，Headless Agent 随后直接补写 trace，造成 `9/8` timeline mismatch。修复归属：case fixture，必须由合法 Engine writer 产生 receipt-bound attempt。
- [x] P2.4c.2 `case-51` rerun fixture 在其 happy path 中漏掉 `research_style_params`：真实 history 为 `false,false,true`，当前 projection 已 fresh。修复归属：case fixture，在首个 rerun gate 前建立既有 style projection；不改变 health 对真实失败的记录。
- [x] P2.4c.3 `standard` implementation 将 `work_units` 列为 required，但 accepted `experiment-observability` spec 的 standard 只要求 light + gate diagnostics + timeline。修复归属：health-policy/contract alignment，不能由未分配 work 的 fixture 伪造 `_work_units` authority。
- [x] P2.5 为已确认 root cause 建立并严格验证两个 focused `experiment-progressive-run-diagnostic-<root>` proposal；health-scope 已完成归档，fixture change 已完成 planning。
- [x] P2.5a `experiment-progressive-run-diagnostic-standard-health-scope`：EXO-002 delta、design、tasks 和 verification plan 已落实、验证并归档；`standard` work-unit diagnostics 保持可见但不再阻断 top-level health。
- [x] P2.5b `experiment-progressive-run-diagnostic-case-51-fixture`：fixture repair proposal、design、tasks 和 verification plan 已落实、requalify 并归档；clean-health proof 在 P2.6 后取得。
- [x] P2.6 apply 并归档 `experiment-progressive-run-diagnostic-standard-health-scope`，完成 focused schema/verifier validation；不得伪造 `_work_units` authority。
- [x] P2.7 apply 并归档 `experiment-progressive-run-diagnostic-case-51-fixture`，完成其 Markdown fixture contract validation；focused contract test 与 `validate-playbook` 均通过。
- [x] P2.8a 重新运行 current diagnostic dry-run：`480000` ms / `$2.00` envelope 只选择 `case-51-standard-happy-path`（预测 `351290` ms / `$1.9991`）；`$3.00` 已会选择三例，不能用于本 slice。
- [x] P2.8b 以 P2.8a 的 one-case envelope 对 `case-51-standard-happy-path` 做一次 bounded real requalification；report `3f6c28fd-f043-41f0-ae5c-23ef9b7fc4bf` 为 native `PASS` + aggregate `CLEAN`，实际 `144036` ms / `$0.741939`，三角色 health clean、Wave1 trace/log `1/1` 且带 receipt、rerun-ready 仅一次 pass，audit 同步记录该 profile selection。
- [x] P2.9 重新运行 `900000` ms diagnostic dry-run；`case-51` 已退出 diagnostic，profile 的下一例是 `case-52-standard-fail-repair`（预测 `370910` ms / `$1.668948`），后续候选仅作排程信息。
- [x] P2.10 对 profile 当前选出的 `case-52-standard-fail-repair` 重复 own one-case envelope preflight：`120000` ms / `$0.60` 仅选中它（预测 `98452` ms / `$0.455172`），随后 requalification report `ac5dcd6a-679f-4905-8ddf-de03e433211c` 为 native `PASS`、health `ISSUES`、实际 `87677` ms / `$0.592476`。Wave1 由 Engine 写入 carried-target receipt，trace/log 为 `11/11`、零 mismatch，HITL2 与 readiness 各有真实 false/true pair；health `ISSUES` 保留有意的首次失败，不能写成 `CLEAN`。重新运行 `900000` ms diagnostic dry-run 后，case-52 因 `PASS+ISSUES` 仍是第一例，case-53 为第二例；未扩大 timeout/budget 或启动下一 slice。

### Phase 3 - Deterministic Calibration

- [x] P3.1 在 Phase 2 首批结论后重新运行 bounded calibration dry-run：`900000` ms fresh profile 选出 5 个当前候选，第一例为 `case-11-light-four-returns`（observed-stale 预测 `38053` ms / `$0.257206`）；`case-181` 仍是 stale calibration candidate，但不是当前第一例。
- [x] P3.2 以一例一检查方式运行当前第一例 calibration slice。`38053` ms / `$0.257206` total/per-case 的 one-case preflight 只选中 `case-11-light-four-returns`；real run report `e023f505-788a-44f6-9607-03da1c816172` 为 native `PASS`、health `CLEAN`，实际 `50399` ms / `$0.26413`。completion 的 6 个 required checks 与 trace prefix 的 7 个 event 均存在；health 后附加的第 8 个 `diagnostic` event 是既有 Supervisor health 行为，不改变 native verdict。standalone bundle `validate-bundle` 为 `5/5`。`case-181` 因预测 `382873` ms / `$1.266596` 超出该 envelope 而未获本 slice 授权；其 fixture repair 仍仅有静态 contract evidence，未运行替代 case。
- [x] P3.3 已记录 case-11、case-21 的 observation，并在每例后重新运行 fresh `900000` ms calibration dry-run，让现有 selector 自然重算。case-21 report `6c28db51-840f-408a-905c-5889207f10b8` 为 native `PASS`、health `CLEAN`，实际 `47601` ms / `$0.332009`；completion 有 5 个 required checks，trace prefix 有 6 个 event，health 后追加的第 7 个 `diagnostic` event 是既有 Supervisor health 行为；standalone bundle `validate-bundle` 为 `5/5` 且 `inspect-bundle` 通过。case-951 是 `agent_behavior`/`real_agent`/`ai_judge`：accepted calibration profile 可以选择它，但它不是 regression，也不替代 Phase 4 discovery evidence。`237552` ms / `$0.60` total/per-case 的 fresh preflight 只选中它并报告 Agent-behavior coverage `included`；其 real run report `353a8381-39c0-4081-a8ec-39dd7ac8b9f4` 为 native `NOT_RUN`、health `CLEAN`，实际 `268363` ms / `$0.421716`，completion 无 checks/durable evidence，honest boundary 为独立 Subject Agent、外部 capability 或独立 AI reviewer unavailable；preserved bundle `validate-bundle` 为 `5/5` 且 `inspect-bundle` 通过。其 retained Subject prompt/result/transcript 均存在，result 为 `failed`、`completed_turns: 1`、`timed_out: true`；actor-unavailable marker 已写入，故未启动 AI judge，judge record 与 judge session 均不存在。原始 Agent log 仅表明 Subject 在工作开始后超时，是诊断证据而非成功行为证明或已确认 framework defect。post-run fresh selector 的当前第一例为 `case-123-standard-wave2-synthesis`（预测 `305819` ms / `$1.906836`），其后为 `case-131-standard-delivery-full-chain`、`case-401-light-full-boundary`、`case-41-light-minimal-path`、`case-301-light-chain-dual-exit`；Agent-behavior coverage 为 `unavailable`。不得把 case-951 结果写成 Agent-behavior coverage 或 retry success。未用 `--case` 重排队列。
- [x] P3.3a 使用 `305819` ms / `$2.00` total/per-case 的 fresh calibration one-case preflight；`--dry-run --json` 仅选中 `case-123-standard-wave2-synthesis`，其预测为 `305819` ms / `$1.906836`，其余候选未获该 slice 授权，Agent-behavior coverage 为 `unavailable`。未用 `--case` 重排队列。
- [x] P3.3b 以 P3.3a 相同 envelope 运行 `case-123-standard-wave2-synthesis` 的一个真实 Headless slice；report `86ac9267-7638-4ba7-af62-cbaa3f30a6a5` 为 lifecycle/effective `ERROR`，reason `case_budget_exhausted`，agent process `nonzero`，实际 `294716` ms / `$2.014820`（预测 `$1.906836`，超过 `$2.00` cap `$0.014820`）。native outcome、completion、durable evidence、health 与 health reports 均不存在，preserved run root 可供诊断。原始 Agent result 的 terminal reason 为 `budget_exhausted`，且在一次 tool-use 中被终止；这只建立成本余量不足的 scheduling/guard boundary，不证明 case 成功、行为覆盖或已确认 framework defect。不得自动加预算、手工补 completion 或重试该 case。
- [x] P3.3c 在 case-123 后重新运行 fresh `900000` ms calibration dry-run。selector 将它作为 `observed_matching` 的 `294716` ms / `$2.014820` observation 保留；当前 batch 依序选择 `case-131-standard-delivery-full-chain`（`246324` ms / `$1.766185`）、`case-201-standard-seedtopics-queue-loop`（`595772` ms / `$5.461567`）和 `case-41-light-minimal-path`（`45864` ms / `$0.293128`）。本次 dry-run 不分配实际 Headless budget，未用 `--case` 重排队列。
- [x] P3.4 本轮 bounded calibration 在 case-123 消耗/超过其明确 `$2.00` slice cap 后停止并复盘。新 selector 仍有可校准候选，但不存在下一次真实 slice 的已声明预算；不得因 dry-run 自动继续消费。现有 profile 已吸收真实 observation，未因此改变 profile/SLO 语义；若要重新启动 calibration，须先作新的明确 budget 决定，若需改变 policy 则建立 focused OpenSpec change。

### Phase 4 - Agent-Behavior Discovery Pilot

- [x] P4.1 确认 provider、预算和 Subject Agent / judge 的静态前提：`claude-deepseek.mjs --check` 通过，DeepSeek 配置、Subject settings、launcher 与 `claude` 均可用；本次 Headless slice 的可执行 total/per-case 上限为 `$0.60`，默认 Agent timeout 为 `600000` ms。Subject 与 judge 各自最多 3 分钟；其 provider billing 不由 Supervisor report 单独计量，静态 preflight 不证明实际 runtime available。case-951 的 native `NOT_RUN` 已形成真实 unavailable boundary。
- [x] P4.2 运行 `discovery --max-predicted-duration-ms 900000 --dry-run --json`：selector 选出 6 例；第一例且唯一 due 的 Agent-behavior case 为 `case-211-heavy-wave0-happy-path`，预测 `452214` ms / `$2.289846`，Agent-behavior coverage 为 `included`。其后为 deterministic 的 case-202、case-41、case-74、case-301、case-601；默认 freshness 为 `604800000` ms（7 天）。该 dry-run 未分配真实 Headless budget，不构成 P4.3 消费授权，也不固定历史 `case-711`。
- [x] P4.2a 以 P4.1 的 `$0.60` total/per-case cap 重跑无消费 discovery preflight：只选择 deterministic 的 case-41（`$0.293128`）和 case-74（`$0.219943`）；`case-211-heavy-wave0-happy-path` 因 `predicted_cost_exceeds_case_budget` 被排除，Agent-behavior coverage 为 `unavailable`。这证明当前 cap 不能选择 P4.3 的 Agent-behavior pilot，不以这两个 deterministic case 替代 pilot，也不分配 Headless budget。
- [x] P4.2b 用候选 `$2.45` total/per-case cap 完成独立 one-case discovery preflight：只选择 `case-211-heavy-wave0-happy-path`（`observed_stale`，预测 `452214` ms / `$2.289846`，reserved `$2.289846`），Agent-behavior coverage 为 `included`；其余可运行候选均因 total budget 被排除。该上限相对预测留 `$0.160154`（约 7%）余量，并保留 proof boundary：真实行为证明仍须实际 Agent CLI、模型凭证、所需工具及 native runtime evidence。它是预算决策输入，不分配 Headless budget。
- [x] P4.3 以 P4.2b 的 one-case `$2.45` total/per-case exposure 执行当前 selected `case-211-heavy-wave0-happy-path` pilot；report `3c1e421b-e48f-4196-9ec6-94b19cd5b84f` 为 native `FAIL`、Heavy health `ISSUES`，实际 `435120` ms / `$2.135120`。真实 Subject result、formal submit 和 work-unit inspect 存在，`real-submit` 与 `work-unit-inspect` 均通过；`wave0-gate` 因 `shared_ref_count_floor` 与 `seed_projection_card_missing` 失败。Heavy health 另记录缺少 `_observability/gates/`、trace/log Gate-attempt `3/2` mismatch，以及没有 submitted reference output 的 source recoverability boundary。保留 bundle 显示只声明了 `source.yaml`，且 seed/Wave0 predecessor 与 completion 来自 fixture trace；这是 fixture/playbook conformance failure，不是 framework behavior proof。该 P4.3 authorization 已被实际运行消耗，不能用于 retry 或 requalification。
- [x] P4.4 审阅结论：未确认 framework/contract 缺口，因此不创建预留的 `experiment-progressive-run-agent-behavior-<root>` framework change。最小 owner 是 case-211 fixture/playbook；`experiment-progressive-run-agent-behavior-case-211-fixture` 已完成并归档，补齐 actor-owned conditional reference/source/cache task、合法 setup -> seed-topics -> Wave0 predecessor、dry-submit -> submit -> projection -> inspect -> completion -> monitored-Gate composition。修复后的 focused unit/Markdown integration 为 `6/6` 通过，canonical `validate-playbook` 为 `102/102`，且无 Actor 的 legal-predecessor Engine preflight 通过；这些不替代新的 real-Actor requalification，且不复用 P4.3 budget。
- [x] P4.4a 在修复后重跑无消费 discovery：`900000` ms dry-run 选出 8 例，当前 due 的 Agent-behavior case 为 `case-406-heavy-real-subagent-boundary`（`254929` ms / `$1.212314`），而 `case-211-heavy-wave0-happy-path` 以 retained stale `435120` ms / `$2.135120` 因 `predicted_duration_exceeds_bound` 被排除。再以 `254929` ms、`$1.25` total/per-case 的 one-case profile preflight，仍只选择 case-406；没有使用 `--case` 强制 case-211，也没有启动 case-406。故 case-211 的新 real-Actor requalification 未进入，P4.3 已消费的 `$2.45` 不复用，修复后的 real-Actor PASS/CLEAN 仍未证明。
- [x] P4.4b 以 profile-selected、`300000` ms / `$1.35` total/per-case / `600000` ms timeout 的一个真实 slice 启动 case-406；report `642f2e58-60be-40b7-b4ef-377d585284d2` 为 native `PASS`、Heavy health `ISSUES`，实际 `424247` ms / `$1.246793`。六个 Subject task/result/receipt/output/submit/trace required checks 都通过；Health 唯一 top-level issue 是没有 `_observability/gates/`。保留 bundle 同时显示 fixture 默认写入 `seed-topics-ready` handoff 与 `wave0_completion`，但 case contract 明确不运行或声称 Wave0 Gate。这是 case-406 fixture/playbook health-scope composition root，不是 health Engine 或 real Subject 成功证明之外的 framework defect。
- [x] P4.4c `experiment-progressive-run-agent-behavior-case-406-fixture` 已完成并归档，focused repair 修复该 composition：case 改为 explicit `health_profile: light`，local fixture runner 仅为 case-406 关闭 synthetic Wave0 trace，其他 real-subagent case 保留 default trace。focused integration + shared helper test 为 `7/7` 通过，case-406 `validate-playbook` 为 `1/1`，routing asset validation 为两项有效。修复后无消费 discovery preflight 仍使用 `300000` ms / `$1.35` envelope，选择 case-41、106、74、301，因 retained `424247` ms / `$1.246793` observation 以 `predicted_duration_exceeds_bound` 排除 case-406，Agent-behavior coverage 为 unavailable；未用 `--case` 强制、未启动无关 case 或增加预算。故修复后的真实 Subject requalification 仍是未证明边界，须由未来 fresh profile-selected、明确 duration/budget decision 触发。
- [x] P4.5 用 fresh `discovery` profile 在 `480000` ms / `$1.35` total/per-case envelope 下运行 selector 选择的 case-115、315、31、11；report `68540692-1897-4666-96f2-1df863e4a869` 为 `NOT_RUN:1`、`ERROR:3`，实际 `$1.365504`。case-115 为 native `NOT_RUN` + health `CLEAN`，retained Subject result 显示 0 次 WebSearch/WebFetch，completion reason 是 `missing public WebSearch tool_use`，所以 selected host 的 `surface_absent` 仍是外部 capability boundary；其实际 `$0.935117` 高于预测 `$0.328719`。case-315 的 5 个 native checks 均 PASS，保留 bundle `validate-bundle` 为 `5/5`、`inspect-bundle --summary` 为 7 pass / 0 fail；但其最终 Headless result 为 `error_max_budget_usd`，实际 `$0.430387` 超过当时剩余 cap `$0.414883`，故 lifecycle/effective outcome 必须是 `ERROR`，且没有 Supervisor health。case-31 和 case-11 均未启动；不得把 case-315 的 native completion 或局部只读 inspection 写成完整 PASS/CLEAN，也不得复用该 exposure。

### Phase 5 - Policy Review

- [x] P5.1 已直接复核 retained reports，而非 filename tier 或 backlog 叙述：`3f6c28fd-f043-41f0-ae5c-23ef9b7fc4bf` 的 case-51 为 deterministic `PASS+CLEAN`；`ac5dcd6a-679f-4905-8ddf-de03e433211c` 的 case-52 保留 `PASS+ISSUES`；`e023f505-788a-44f6-9607-03da1c816172` 与 `6c28db51-840f-408a-905c-5889207f10b8` 为 light deterministic `PASS+CLEAN`；`353a8381-39c0-4081-a8ec-39dd7ac8b9f4` 为 real-Agent `NOT_RUN` unavailable boundary；`86ac9267-7638-4ba7-af62-cbaa3f30a6a5` 为 `$2.00` slice 的 `case_budget_exhausted` lifecycle `ERROR`；`3c1e421b-e48f-4196-9ec6-94b19cd5b84f` 与 `642f2e58-60be-40b7-b4ef-377d585284d2` 的 real-subagent evidence 分别暴露 case-211 fixture conformance 和 case-406 early-boundary health-scope composition。每个已确认 owner 均已进入对应 focused fixture change；不把 static repair 当作新的 real-Actor proof。
- [x] P5.2 结论：维持当前 SLO/profile/selection 语义，不建立 `experiment-progressive-run-policy-revision` proposal。现有 policy 已正确保留 native outcome 与 health 的分离、把 unavailable/预算耗尽作为诚实 boundary、并让当前 selector 使用 retained duration/cost；case-406 修复后的 `300000` ms / `$1.35` discovery preflight 因 retained `424247` ms / `$1.246793` 被排除，正是该机制按预期工作的直接证据。单个 budget breach、外部 Actor unavailable，或 case-local fixture scope drift 都不足以支持改变全局 SLO、预算、timeout、admission、profile 或证据语义。
- [x] P5.3 复核 P4.5 后维持该结论：Supervisor 将 native completion 与 lifecycle/effective outcome 分开、在 terminal cost 超当时 cap 时保留 completion 并停止后续 launch，正是 accepted integration contract 的既有 fail-closed 行为。case-115 的 native tool surface 仍由 selected host 拥有，不能用 playbook、fixture 或 fallback provider 修复。单个 fresh batch 中的 forecast deviation 与 external surface absence 尚不足以定义新的 SLO/profile/selection 语义；不新增 policy change、不自动 retry、不增加预算。

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

状态：首批 remediation 已完成：case-51 取得 `PASS+CLEAN`，case-52 fixture repair 已归档并取得 native `PASS`、health `ISSUES` 的真实 requalification。case-52 因 `PASS+ISSUES` 仍是 diagnostic 的当前第一例，不能据此盲目启动 case-53；该 selection 行为留作后续独立决策。Phase 3 现可从 fresh calibration preflight 开始。

目的：先处理当前有 FAIL、ERROR、NOT_RUN、PASS+ISSUES 或 stale/unknown direct fact 的 case，避免把已知异常混进 calibration 或 fast regression。

执行步骤：

1. 每次先运行 bounded `diagnostic --dry-run --json`，确认当前被选 case、预测和 omitted 原因。
2. 一个 diagnostic slice 只启动该次 profile 的第一例：用足以容纳第一例、但不能纳入下一例的明确 duration/budget envelope；不退回成手工 `--case` 队列。
3. 每例结束后立即检查 native outcome、health、audit 和 trace，并重新运行 dry-run；下一例永远由更新后的 profile 决定。
4. 不因为遗漏候选扩大 timeout 或预算；每个 slice 都是一个可见的 stop/checkpoint。
5. 任何需要修改 framework、playbook、case 内容、contract 或健康策略的 root cause，都先创建一个或多个 focused OpenSpec change；诊断结果本身不授予 target edit 权限。

退出条件：每个已启动 case 都有 native result 与独立 health 结论；每个可行动问题都有 owner、最小修复和独立验证方式。不得把多个不相关问题塞进一个“大诊断 change”。

### Phase 3 - Deterministic Calibration

状态：本轮 P3.1-P3.4 已完成。case-11 与 case-21 的 bounded real slice 均已取得 native `PASS` + health `CLEAN`；case-951 的 real Agent-behavior calibration slice 已诚实产生 native `NOT_RUN` + health `CLEAN`。其 retained Subject result 表明一次已开始的 Subject run 因超时失败，随后 actor-unavailable marker 阻止 AI judge 启动；这不是 behavior proof、retry success 或已确认 framework defect。case-123 的 `$2.00` real slice 在 native completion 前耗尽预算并产生 `ERROR`，不能据部分 retained trace 声称 case 成功；fresh selector 已将其真实 observation 吸收，且本轮在这个明确预算停止点结束，不自动授权增加预算、重试或修改 framework。新的 `900000` ms dry-run 当前顺序为 case-131、case-201、case-41，但每一项真实运行均须新的明确 budget 决定。`case-181` 的 fixture source 已修复，但 selector-bound requalification 条件仍未满足：它在原 one-case envelope 下以 `382873` ms / `$1.266596` 被 `predicted_duration_exceeds_bound` 排除。

目的：用当前测量补齐 deterministic case 的 duration/cost/source/execution-surface observation，逐步扩大可证明的 fast pool，而不是完成一个静态 Wave B/C 清单。

执行步骤：

1. 重新运行 bounded `calibration --dry-run --json`，不复用本文中的 case 名单。
2. 选择能装入明确 duration 和预算边界的一小批；同一 batch 的实际结果成为下一次 selection 的唯一新增事实。
3. 对 PASS+CLEAN 且满足 fast SLO 的 matching-v2 deterministic case，让现有 selector 自然接纳；其余保留为 gap 或 diagnostic input。
4. 每批后只记录事实、预算、health 和下一步，不给 case 写永久 Sprint/Standard/Marathon 标签。

退出条件：本轮明确的 calibration budget 用尽、selection 无可运行候选，或新增 observation 已回答本轮覆盖问题。届时重新评估，而不是自动扩展为全库长跑。

### Phase 4 - Agent-Behavior Discovery Pilot

状态：与 Phase 3 独立。P4.3 已在批准 exposure 内执行并获得真实 `FAIL + ISSUES` 证据；其 root 已归因到 case-211 fixture composition，fixture repair 已完成、验证并归档。随后 profile-selected case-406 获得真实 native `PASS + Heavy ISSUES`，其 root 是 early actor-boundary case 错配 Heavy Gate health 与 synthetic Wave0 trace；focused case-406 repair 的 deterministic proof 已通过。修复后的 `300000` ms / `$1.35` discovery preflight 没有选择 case-406，故不能把 static proof 写成 fresh real-Actor PASS/CLEAN，也不能以 `--case` 绕过 selector。最新的 P4.5 batch 则把 case-115 的 selected-host `surface_absent` 和 case-315 的 terminal-cost guard 保留为直接边界，未产生新的 Agent-behavior proof。未来真实 requalification 仍须 fresh profile selection 和明确 duration/budget decision。

目的：恢复真实 Agent / Sub-agent proof 的可见性，但不把它伪装成 deterministic regression。

执行步骤：

1. 运行 discovery dry-run，带明确 freshness objective 和小的 duration/budget envelope。
2. 只启动一个当前 selected pilot；原计划中的 `case-711` 不是永久默认，当前候选以 dry-run 为准。
3. 审阅 Subject evidence、native outcome、health 与 provider/permission 事实。
4. 只在发现稳定的 framework 或 contract 缺口时创建 focused OpenSpec change；一次 NOT_RUN 或 provider 不可用不能被写成产品行为结论。

退出条件：得到一个可审计的真实证据结果或诚实的 unavailable boundary，并据此决定是否值得安排下一次 pilot。

### Phase 5 - Policy Review

状态：本轮 direct-evidence 审阅已完成，结论为维持现有 policy。没有 active `experiment-progressive-run-policy-revision` change；未来只有出现跨 case、可复现且不能由 case/health owner 解决的 SLO、profile 或 selection 语义缺口时才重新进入这一阶段。

触发条件：Phase 2-4 累积了足以说明现有 fast SLO、profile selection 或 observability contract 不再适配的直接 evidence。

可能决定：保持现有 policy；为一个明确 root cause 修复；或提出 SLO/profile 行为变更。任何改变 `regression` envelope、admission、预算、timeout、selection 或证据语义的决定都必须新建 OpenSpec change，不能通过本 backlog 文档或一次运行隐式改变。

## OpenSpec Portfolio

| 阶段 | Change 名称 | 状态 | 建立条件 |
| --- | --- | --- | --- |
| Phase 1 | `fast-regression-run-profile` | 已完成并归档 | 已落地 |
| Phase 2 | `experiment-progressive-run-diagnostic-standard-health-scope` | 已完成并归档 | 已确认 EXO-002 standard health scope drift |
| Phase 2 | `experiment-progressive-run-diagnostic-case-51-fixture` | 已完成并归档 | 已确认 case-51 fixture/playbook drift |
| Phase 3 | `experiment-progressive-run-topic-rewrite-fixtures` | 已完成并归档 | 已确认 case-181/182 topic-rewrite fixture contract drift |
| Phase 2 | `experiment-progressive-run-diagnostic-<root>` | 未来 root cause 的命名槽 | 后续 diagnostic 给出可复现、跨边界的明确 root cause |
| Phase 4 | `experiment-progressive-run-agent-behavior-case-211-fixture` | 已完成并归档 | P4.3 已确认 case-211 fixture/playbook conformance root；不改变 framework contract |
| Phase 4 | `experiment-progressive-run-agent-behavior-case-406-fixture` | 已完成并归档 | P4.4b 已确认 case-406 early-boundary health/fixture composition root；不改变 framework contract |
| Phase 4 | `experiment-progressive-run-agent-behavior-<root>` | 预留命名槽 | pilot 证明需要框架、contract 或操作能力改变 |
| Phase 5 | `experiment-progressive-run-policy-revision` | 预留命名槽 | 多轮 evidence 支持修改 profile/SLO 语义 |

不为“执行已经存在的 profile”创建空 OpenSpec change；也不预先把未知 root cause 塞进一个大 proposal。OpenSpec 用于落地已经明白的行为变化，本文用于保证这些变化出现前的顺序、边界和证据要求始终清晰。

## 本轮收口

P0-P5 的本轮执行与 policy review 已全部结束。P4.3 的 `$2.45` exposure、
case-406 P4.4b 和 P4.5 的各自 `$1.35` slice 均已消费；不得手工 retry、补
completion、复用任何预算或以 `--case` 绕过当前 profile。本轮不再有 active
run、active OpenSpec change 或待执行 case。

case-211 的 `6/6` static proof、case-406 的 `7/7` static proof，以及 case-315
的 native completion 都不构成 fresh full runtime `PASS/CLEAN` evidence；case-115 /
case-232 的 search-required proof 仍需要 selected host 实际提供 native
`WebSearch` / `WebFetch`。这些是 future-triggered boundaries，而不是本计划的
未完成项；其唯一后续入口是
[Experiment Progressive Follow-up Intake Plan](../../plans/experiment-progressive-follow-up-plan.md)。

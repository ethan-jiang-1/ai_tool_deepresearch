## Context

See `proposal.md` for motivation. `experiment-run-strategy` is currently a pure reader/selector over the authoritative manifest/frontmatter and retained Supervisor reports. `calibration`、`discovery`、`diagnostic` 和 `assurance` 已解决无 selector 默认 Light 的问题，但 `discovery` 仍优先纳入 due `agent_behavior`，不能同时成为“高频且几分钟内结束”的 regression loop。

当前磁盘上的 `203` 份 retained reports 都是 v1。它们对多数 case 仍有 source-playbook digest、duration、cost、native outcome 和 health，但没有 execution-surface identity；因此可帮助找 qualification 候选，却不能建立当前 regression membership。框架已经具备 outer `agent-experiment-batch-report/v2`、v2 audit 和 execution-surface contract；本 change 只扩展其 selection observation，不重复引入 report v2。已确认的业务决策来自 `_backlog/plans/experiment-progressive-run-strategy.md` 及本 change 的用户讨论：fast regression 可以是 deterministic-only，但必须广覆盖、快、成本有上限，慢 case 不进入该入口。

## Goals / Non-Goals

**Goals:**

- 定义一个让维护者能精确回答“这个 case 现在能否在 fast regression 内启动，以及缺什么”的 virtual admission projection，并让每个 admission 结论可回溯到一条完整 retained result。
- 用一套固定 SLO 在 case admission、batch selection 和实际 Agent budget 上同时约束速度/成本。
- 用一次显式、真实的 v2 qualification 建立初始 pool；其后以最新 matching observation 自动进入或退出，不维护 case registry。
- 在不把 `regression` 变成 test class、scheduler、Agent-flow controller 或第二 verdict 的前提下，提供每 group 至多一例的快速覆盖选择。

**Non-Goals:**

- 不移动、重命名、批量重写所有 case，也不把 filename cost、health profile 或 proof subject 改作 regression class。
- 不把 `agent_behavior`、慢 case、全库 `verdict_mode: all` 审查、health/timeout 根因修复、日历 daemon、CI 定时任务或 requirement-level coverage taxonomy 纳入本 change。
- 不让历史 v1 report、frontmatter recommendation 或 deterministic fixture 代替当前 v2 runtime qualification。

## Decisions

### 1. Add a virtual regression admission projection

在 `experiment-run-strategy.mjs` 中新增严格 Zod `RegressionAdmissionObservation` / `RegressionCoverage` reader view，并扩展 profile request/selection schema。它服务维护者的有界问题：**在固定 fast envelope 下，哪些当前 registered case 能立刻跑，哪些需 qualification，哪些已被直接事实排除？**

每个 result 保留决定该答案的区别：current manifest/frontmatter、proof subject、Headless eligibility、`all` retry-safety declaration、latest retained result 的 outcome/lifecycle/health、source/execution-surface relation、同一 result 内的 duration/cost、author recommendation 和 group。`eligible`、`needs_qualification`、`ineligible` 是可重算 reader view，不写回 manifest、frontmatter 以外的 registry，且不能被读作 native outcome 或全局覆盖证明。读者在状态、reason、prediction、group gap 处可停止；未知仍明确为 qualification 或 unavailable。

该 view 用直接 Source of Record 替代手工 Sprint/Standard/Marathon 清单、filename-Light 默认和持久 cursor。最短闭环是：真实 v2 result -> read-only admission projection -> explicit bounded selection -> existing Supervisor -> next result。它避免新的 daemon、case state、watcher 和 derived recovery tree。

**Alternative considered:** 建一个长期 `regression-suite.json` / 静态目录。拒绝：它会重复 manifest、让重构后性能变化需要人工同步，并重新引入用户已拒绝的分类维护成本。

### 2. Make the fast SLO policy constants and never caller-widenable

定义一个不可变 `FAST_REGRESSION_SLO`：

```text
max_observed_duration_ms: 120000
max_observed_cost_usd: 0.60
max_predicted_batch_duration_ms: 480000
max_total_budget_usd: 3.00
max_effective_case_budget_usd: 0.60
max_agent_timeout_ms: 120000
max_health_target_timeout_ms: 60000
```

normal `--run-profile regression` 可以接受更小的 existing CLI bounds，但 parser、profile request、selection 和 Supervisor launch 都拒绝更大的值。即使调用者省略 `--max-case-budget-usd`，Supervisor 仍把 `.60` 作为 effective child cap；`--timeout` 与每个 health target 的 `--health-timeout` 也分别不能超过 `120000` 和 `60000` ms。现有通用 Headless `--timeout` 默认值是 `600000` ms，因此非 dry-run regression 必须显式提供不超过 `120000` ms 的 `--timeout`；dry-run 不启动 child，不要求该 flag。这样预测 admission 与真实 launch 有同一成本上界，并防止一个 profile invocation 以现有宽 timeout 变成慢路径；过 cap 的实际结果是现有 lifecycle/budget failure，而不是“为了完成 regression”放宽 spend。

`480000` ms 是 selection 的 end-to-end historical-duration forecast，不是新的 batch deadline 或 scheduler。Supervisor 保持现有顺序 lifecycle；超出预测的本次实际 duration 会作为后续 admission breach 被观察，不会被 Engine 隐式重试或换入别的 case。

**Alternative considered:** 允许 `--run-profile regression` 自由传任意 duration/budget，或让 SLO 从 filename tier 推导。拒绝：前者会让 profile 名称失真，后者重建刚删除的历史 tier 选择权威。

### 3. Separate normal regression from explicit qualification intent

`--run-profile regression` 的 normal intent 只选择 `eligible` cases。新增显式 `--regression-qualification` intent；它只能和 regression profile 组合，并使用同一 fast envelope。它从 `needs_qualification` 中选择 Headless-eligible deterministic candidate：必须有当前 source-matching 的单条历史 PASS+CLEAN result，其 duration/cost 都在 fast SLO 内，且 `all` mode 已有 `regression_retry_safety: reviewed`。它在每个 `experiment` group 最多选择一例，并在 versioned selection observation 中把 intent 记录为 `qualification`。

qualification intent 不是自动 fallback：normal regression 没有 eligible member 时失败并给出 dry-run advice；只有明确 flag 才能启动未拥有 matching v2 identity 的 case。历史 v1 仅可用作这个受限 admission forecast，选择器不得把一个 result 的 duration 与另一个 result 的 cost、outcome 或 health 拼接成候选。初次 apply 后，Agent 按同一 `8min / $3` envelope 执行当前 selection，真实 Headless run 写出的 matching v2 PASS+CLEAN 是唯一可把 case 带进 normal pool 的证据。

**Alternative considered:** normal regression 自动先跑 v1 candidate，或增加一个永久 slow qualification suite。拒绝：前者把未验证的历史速度伪装成 normal regression；后者又形成第二个定期慢入口。

### 4. Keep frontmatter as bounded author input, not membership state

扩展严格 V2 policy schema，允许：

```text
regression_recommendation?: "recommended"
regression_retry_safety?: "reviewed"  # only when verdict_mode is "all"
```

缺省 recommendation 是 neutral。`recommended` 仅在已满足相同 hard admission condition 的同 group candidate 间排序，不提高任何 SLO、proof、health 或 budget 权限。`reviewed` 是当前 playbook 的 author/maintainer admission-safety declaration，不改 native verdict，也不让 Engine 判断 Markdown 语义；Engine 只验证它的 schema presence。若 verdict-affecting playbook flow 变化，source/execution-surface drift 已使已有 member 退出；新的 qualification 前仍由 Agent/maintainer 重新审查并确认该 declaration，而不是把该 literal 当成语义证明。

**Alternative considered:** 按 suggestion 强制 opt-in，或保存 review result 到新 registry。拒绝：前者要求迁移所有旧 case 并把作者偏好变成硬 authority；后者重复 frontmatter/manifest 并增加持久维护面。

### 5. Use experiment groups for breadth and retain direct breach facts

selection 基于现有 `frontmatter.experiment` group 轮转，least-recently-selected group 优先，推荐标记只在同 group tie 内生效，manifest order 是最后 tie-breaker。一个 `eligible` 结论只能读取最新一条 schema-valid v2 report result 或未被同 batch report 覆盖的 v2 audit `case_result`，且该 single result 必须同时携带 matching execution surface、PASS、null lifecycle、CLEAN health、duration 与 cost；选择器不得跨 retained records 合成这些事实。它不会从 `req`、目录层级或 `@impl` 推出额外 coverage；未通过 SLO 的 group 被 explicit gap facts 表示。

后续 matching v2 observation 的 native FAIL、lifecycle ERROR/CANCELLED、health 非 CLEAN、duration/cost 超界、source/execution-surface drift 或安全 declaration 缺失都会产生 `ineligible`。Engine 只投影/拒绝选择；它不会自动 retry、repair、执行 diagnostic 或重判 outcome。Agent 在已经授权的预算内可执行 explicit qualification/diagnostic；用户只需决定新的 SLO 或成本语义，已经决定的运行不再要求用户机械挑选/迁移文件。

**Alternative considered:** 以 requirement refs 做精确 coverage，或发生 breach 时将 case 标为永久 failed。拒绝：目前 `req` 不完整，后者既混淆 outcome 又制造永久状态。

## Risks / Trade-offs

- **[Initial eligible pool is empty]** -> explicit qualification intent uses constrained v1 historical forecasts and no case becomes normal member before real v2 evidence.
- **[One transient slow/dirty observation removes a useful case]** -> prioritize fast-batch predictability; an explicit qualification can re-admit it without restoring a long-lived class.
- **[A strict SLO leaves group gaps]** -> make gaps visible instead of silently duplicating a fast group or widening profile flags; later SLO changes require a new OpenSpec decision.
- **[Retry-safety review of current `all` candidates takes work]** -> scope review to candidates that meet the speed forecast; exclude unreviewed cases rather than bulk-convert all modes.
- **[Actual provider cost exceeds prediction]** -> effective `.60` child cap and existing lifecycle accounting stop it; observed breach exits pool and remains diagnostic evidence.
- **[Actual batch duration exceeds its eight-minute prediction]** -> the Agent timeout and each health-target timeout remain bounded, but no new global deadline interrupts the existing sequential lifecycle; the next projection records the actual breach rather than hiding it behind a scheduler.

## Migration Plan

1. During apply, obtain feedback-operation guidance, complete plan review, and pass verification-routing plan validation before target edits.
2. Extend strict schema/selection-observation support, unit and integration tests, and documentation for normal versus qualification intent. Existing case frontmatter stays valid and neutral by default; existing outer v2 reports remain readable.
3. Derive the then-current fast historical candidate set; review only its `verdict_mode: all` candidates. Add `regression_retry_safety: reviewed` only where the review finds the current flow safe; correct mode or exclude the rest. Add `regression_recommendation` only where it is useful as a ranking hint.
4. Run a dry qualification projection, then one real Headless qualification batch within `480000` ms predicted and `$3.00` total / `.60` per-case actual envelope, with the bounded fast timeouts. Preserve its native runtime evidence; do not record a fixture result as qualification.
5. Confirm the subsequent normal regression dry-run sees only matching v2 PASS+CLEAN members, release `v0.67`, and archive after normal closeout review.

Rollback is code-only: remove the regression profile/fields while leaving retained v2 reports readable and existing calibration/discovery/diagnostic/assurance behavior intact. No case move, runtime-state migration, or report rewrite is required.

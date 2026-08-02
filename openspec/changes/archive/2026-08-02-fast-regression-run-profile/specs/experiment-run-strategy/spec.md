> req: ERS-002

## MODIFIED Requirements

### Requirement: Explicit run profiles select bounded next batches

Run Strategy SHALL 提供 `calibration`、`discovery`、`diagnostic`、`assurance` 和 `regression` 五种显式 run profile。它们是对当前 observation 的虚拟查询，不是持久 case 分类；同一 case 可以同时出现在多个 profile，或在没有证据时只出现在 `unknown` 结果中。Profile selection SHALL 只产出下一批完整 playbook 的可解释顺序，随后仍由 Autorun Supervisor 启动和监督；它 SHALL NOT 充当 daemon、scheduler、Markdown controller、repair controller 或 native verdict judge。

`calibration` SHALL 优先选择没有当前可比较 observation、source/execution-surface 已 stale、或关键成本/结果事实 unknown 的 case。`discovery` SHALL 在明确的预测时长和既有 Headless USD budget 边界内，选择覆盖不同 `experiment` authoring group 的轮转样本，而不是重复集中在最快的单一组或 deterministic-contract case。`diagnostic` SHALL 选择 latest observation 中 native FAIL、lifecycle ERROR/CANCELLED、native NOT_RUN，或 PASS 加 health ISSUES 的 case，并保留触发事实。`assurance` SHALL 只执行调用方明确声明的 scope；它 SHALL NOT 从 `@impl` 标记、目录名或历史 report 自动推断某项 change 的影响范围。`regression` SHALL 使用本 capability 所定义的固定 fast SLO 与 admission 事实；它不是 discovery 的别名，也不承担 Agent-behavior proof 或慢 case 的定期运行。

所有 profile request SHALL 要求明确的 positive predicted-duration bound，并遵守 Headless execution 已有的 positive total USD budget。选择器 SHALL 为每个入选或因边界被排除的 case 给出 duration/cost prediction basis 和 selection reason。没有可用 observation 的 calibration candidate 可以使用 filename cost 的保守 initial estimate；任何未知或不适配的预测 SHALL 被报告为 unavailable，而不得静默越过时间或预算边界。Profile 轮转 SHALL 从保留 report/audit 的最近选择历史导出，使用 manifest order 作为稳定 tie-breaker；它 SHALL NOT 保存第二个 cursor、suite 或 case state。

#### Scenario: Discovery avoids a fastest-only deterministic batch

- **WHEN** discovery 在给定预算和预测时长内有来自多个 authoring group 的合格 candidate
- **THEN** selection SHALL 以保留历史导出的确定性轮转跨 group 取样
- **AND** output SHALL 说明每个 selected case 的预测与 selection reason
- **AND** 它 SHALL 不因为 deterministic-contract candidate 更快而把所有其它 proof subject 静默排除

#### Scenario: Calibration admits a new case under a conservative estimate

- **WHEN** 一个新 case 没有历史 duration/cost observation 且其 filename cost 的 initial estimate 能装入显式 bounds
- **THEN** calibration SHALL 可以选择该 case
- **AND** output SHALL 将 prediction basis 标记为 filename initial estimate 而不是 observed runtime

#### Scenario: Assurance does not infer changed-case coverage

- **WHEN** 一个 OpenSpec change 有多个宽泛的 `@impl` 标记但没有声明的 case scope
- **THEN** assurance SHALL 不自动选择这些 case
- **AND** change-impact proof SHALL 仍由该 change 的 `verification-plan.yaml` 和明确的 Autorun invocation 声明

For `regression`, a case SHALL be `eligible` only when it is Headless-eligible `deterministic_contract` and its latest retained case result is one schema-valid `agent-experiment-batch-report/v2` result or one non-shadowed v2 audit `case_result`. That single result SHALL itself carry a matching execution surface, native PASS, null lifecycle outcome, CLEAN health, duration no greater than `120000` ms, and cost no greater than `$0.60`. The selector SHALL NOT combine duration, cost, outcome, health, source digest, or execution-surface facts from different retained records. Any `agent_behavior` case, even if fast and clean, SHALL be explicitly excluded from fast regression without losing its independent proof value.

A case SHALL be `needs_qualification` only when its latest retained case result is source-matching historical PASS+CLEAN evidence with one complete duration/cost pair within the fast SLO but lacks a matching v2 execution surface. A missing result, a source/execution-surface drift, native FAIL/NOT_RUN, lifecycle ERROR/CANCELLED, health ISSUES/ERROR, missing duration/cost, or any SLO breach SHALL make the case `ineligible`. These states are read-only facts: they do not write case state or automatically retry, repair, or start diagnostic work.

Normal regression intent SHALL select only `eligible` cases. Only explicit qualification intent may select `needs_qualification` cases; it SHALL use the same fast SLO and may select only Headless-eligible deterministic candidates with the required single-result historical forecast. Qualification SHALL select at most one case per `experiment` group and SHALL reject `agent_behavior`, unreviewed `all` cases, historical FAIL/ISSUES, and unavailable forecasts. It is not normal regression's automatic fallback.

V2 frontmatter MAY carry `regression_recommendation: recommended` as author preference; absence is neutral and the field SHALL change only ordering among otherwise fully eligible candidates. A `verdict_mode: all` case SHALL also carry `regression_retry_safety: reviewed` before eligibility or qualification. That value is an author/maintainer declaration: it does not alter native verdict and Engine only verifies its declared shape, not the Markdown semantic review. Source/execution-surface drift removes existing membership; a new qualification still requires current human/Agent review rather than treating the literal as semantic proof.

`regression` SHALL fix the fast envelope at no more than `480000` ms predicted batch duration, `$3.00` total budget, `$0.60` effective per-case budget, `120000` ms Agent timeout, and `60000` ms timeout for each health target. Callers MAY tighten these positive bounds but SHALL fail closed when widening any of them. Selection SHALL use `experiment` as its sole coverage group, rotate by retained selection history, and select at most one candidate per group; recommendation is a same-group tie-breaker before stable history and manifest order. The predicted-duration bound is a forecast, not a global batch deadline or scheduler.

Regression selection output SHALL show each selected eligible case, every group with no selected member, the effective envelope, its single-result prediction basis, and direct unavailable/ineligible/needs-qualification reasons. It SHALL NOT fill a group gap with an over-SLO case, a case without matching v2 evidence, `agent_behavior`, an unreviewed `all` case, or inferred directory/filename coverage.

#### Scenario: Historical v1 speed cannot directly create a regression member

- **WHEN** 一个 deterministic case 的历史 v1 report 显示 PASS+CLEAN、`90` 秒和 `$0.40`
- **AND** 它没有 matching v2 execution-surface observation
- **THEN** regression report SHALL 将该 case 标记为 `needs_qualification`
- **AND** 它 SHALL 不被 normal regression launch 选择

#### Scenario: Fast Agent behavior remains outside regression

- **WHEN** 一个 `agent_behavior` case 的 matching v2 observation 满足全部 duration、cost、native outcome 和 health SLO
- **THEN** regression report SHALL 将它排除并说明 proof-subject 原因
- **AND** 它可继续由 calibration、discovery、diagnostic 或明确 assurance scope 处理

#### Scenario: A breach removes a previously qualified member

- **WHEN** 一个已 eligible case 的最新 matching v2 observation 有 health ISSUES、native FAIL、lifecycle ERROR，或 duration/cost 超过 fast SLO
- **THEN** 下一次 regression projection SHALL 将它报告为 `ineligible`
- **AND** selection SHALL 不自动重跑它或以慢 case 静默补位

#### Scenario: Qualification stays explicit

- **WHEN** normal regression projection has no eligible member 但有一个历史快 case 是 `needs_qualification`
- **THEN** normal regression selection SHALL 不启动该 case

- **AND** 只有显式 qualification intent 才可在同一 fast envelope 内选择它

#### Scenario: One fast case per group fits the regression envelope

- **WHEN** 多个 `experiment` group 各有一个或多个 eligible candidate
- **AND** 轮转后的每个被选 case 总预测不超过 `480000` ms、总预算不超过 `$3.00`
- **THEN** selection SHALL 在该 batch 中至多选择每个 group 的一个 case
- **AND** report SHALL 为每个 selected case 说明 group rotation、recommendation（如有）和 matching v2 prediction

#### Scenario: A group without a qualified fast case remains visible

- **WHEN** 一个 group 只有 stale、slow、ISSUES、Agent-behavior 或未 qualification 的 case
- **THEN** regression report SHALL 将该 group 报告为未覆盖并给出直接原因
- **AND** selection SHALL 不以 filename-Light 或另一个 group 的额外 case 冒充该 group 已覆盖

#### Scenario: Qualification never stitches historical facts together

- **WHEN** one retained result supplies a fast duration but another supplies the cost, PASS, CLEAN, or source-match fact
- **THEN** regression SHALL not report the case as `eligible` or selectable for qualification from that combination
- **AND** its output SHALL retain the direct missing or non-qualifying reason

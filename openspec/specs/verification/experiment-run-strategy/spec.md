# experiment-run-strategy Specification

> req: ERS-001, ERS-002, ERS-003

## Purpose

为当前注册的 Agent Experiment case 提供可重算、可解释的运行策略投影，让维护者在明确的时间与预算边界内选择下一批完整 playbook，同时保留 case 身份、原始创作组织与所有未知事实。

## Requirements

### Requirement: Run strategy derives a virtual case observation without replacing authority

Experiment Run Strategy SHALL 为每个当前 `PLAYBOOK_MANIFEST.md` 注册的 case 建立只读、可重算的 observation。它只能联结以下 direct Source of Record：manifest 的 active path/order、选中 playbook 的当前 V2 frontmatter、filename 的 `light|standard|heavy` 成本标签，以及 `.exp-bundles/` 保留的 schema-valid v2 Supervisor batch report/audit observation。它 SHALL NOT 写入、移动、重命名或重新注册 case，也 SHALL NOT 建立第二个 manifest、case registry、native completion、health verdict 或 cleanup authority。

每个 observation SHALL 将下列事实分别暴露，而不得合成为单一 case class：filename cost（创建时估计/兼容性标签）、frontmatter health profile、proof subject/subject execution/verdict judge、保留运行的 duration/cost、native outcome、lifecycle/effective outcome、health、最后 observation 时间，以及当前 execution-surface relation。没有可用的完整 v2 observation、缺少 required report fact、或 v2 report 未带可比较 execution-surface fingerprint 时，相关字段 SHALL 为明确的 `unknown`，而不得以 filename、目录名或健康状态补推。

来自完整 v2 observation 的历史 duration/cost 在 source playbook 或 execution surface 已变化后仍可作为带来源标记的成本预测输入；它 SHALL NOT 被报告为当前 proof。当前 source playbook digest 或 execution-surface fingerprint 不匹配时，projection SHALL 标记为 `stale`；缺少可比较 fingerprint 时 SHALL 标记为 `unknown`；只有完整可比较的当前 identity 匹配时才可标记为 `matching`。`matching` 只表示观察到的执行表面可比较，绝不把历史结果升级为本次 native completion 或当前 Agent-behavior proof。

Retained v1 batch report、v1 audit event，或 v2 envelope 中的 v1 selection observation SHALL NOT 建立 current observation、prediction、admission 或 selection fact。它们可以保留为人类可读历史，并以非致命 diagnostics 被报告；它们 SHALL NOT 使 dry-run 或 launch 失败。

#### Scenario: New case remains unclassified until an observation exists

- **WHEN** manifest 注册了一个没有保留完整 v2 Supervisor observation 的新 case
- **THEN** projection SHALL 保留 filename cost 和当前 V2 policy
- **AND** observed duration、observed cost、outcome、health 和 execution-surface relation SHALL 明确为 `unknown`
- **AND** case SHALL 不需要全局 taxonomy、文件迁移或 frontmatter 重写才可进入 calibration

#### Scenario: Changed playbook keeps cost history without claiming current proof

- **WHEN** 一个 case 的当前 source playbook digest 与最近完整 v2 保留 observation 不同
- **THEN** projection SHALL 将该 observation 标记为 source/execution-surface `stale`
- **AND** 历史 duration/cost 仍可作为标明陈旧来源的预测输入
- **AND** 历史 native PASS、FAIL 或 health SHALL 不被改写，也不被报告为当前 proof

#### Scenario: Retained v1 history is diagnostic-only

- **WHEN** `.exp-bundles/` 包含 v1 batch report、v1 audit event，或带 v1 selection observation 的 retained envelope
- **THEN** projection SHALL 不从该 record 建立 current observation、prediction、admission 或 selection fact
- **AND** 它 SHALL 保留非致命 diagnostics，而不得阻塞当前 dry-run 或 launch

#### Scenario: PASS and health issues remain separate observation facts

- **WHEN** 最近完整 v2 保留 observation 的 native outcome 是 PASS 且 health 是 ISSUES
- **THEN** projection SHALL 同时展示 PASS 和 ISSUES
- **AND** 它 SHALL 不将该 case 改写为 FAIL、CLEAN 或已校准

### Requirement: Explicit run profiles select bounded next batches

Run Strategy SHALL 提供 `calibration`、`discovery`、`diagnostic`、`assurance` 和 `regression` 五种显式 run profile。它们是对当前 observation 的虚拟查询，不是持久 case 分类；同一 case 可以同时出现在多个 profile，或在没有证据时只出现在 `unknown` 结果中。Profile selection SHALL 只产出下一批完整 playbook 的可解释顺序，随后仍由 Autorun Supervisor 启动和监督；它 SHALL NOT 充当 daemon、scheduler、Markdown controller、repair controller 或 native verdict judge。

`calibration` SHALL 优先选择没有当前可比较 observation、source/execution-surface 已 stale、或关键成本/结果事实 unknown 的 case。`discovery` SHALL 在明确的预测时长和既有 Headless USD budget 边界内，选择覆盖不同 `experiment` authoring group 的轮转样本，而不是重复集中在最快的单一组或 deterministic-contract case。`diagnostic` SHALL 选择 latest current v2 observation 中 native FAIL、lifecycle ERROR/CANCELLED、native NOT_RUN，或 PASS 加 health ISSUES 的 case，并保留触发事实。`assurance` SHALL 只执行调用方明确声明的 scope；它 SHALL NOT 从 `@impl` 标记、目录名或历史 report 自动推断某项 change 的影响范围。`regression` SHALL 使用本 capability 所定义的固定 fast SLO 与 admission 事实；它不是 discovery 的别名，也不承担 Agent-behavior proof 或慢 case 的定期运行。

所有 profile request SHALL 要求明确的 positive predicted-duration bound，并遵守 Headless execution 已有的 positive total USD budget。选择器 SHALL 为每个入选或因边界被排除的 case 给出 duration/cost prediction basis 和 selection reason。没有可用 current v2 observation 的 calibration candidate 可以使用 filename cost 的保守 initial estimate；任何未知或不适配的预测 SHALL 被报告为 unavailable，而不得静默越过时间或预算边界。Profile 轮转 SHALL 从 retained v2 report/audit 的最近选择历史导出，使用 manifest order 作为稳定 tie-breaker；它 SHALL NOT 保存第二个 cursor、suite 或 case state。

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

For `regression`, a case SHALL be `eligible` only when it is Headless-eligible `deterministic_contract` and its latest retained case result is one schema-valid `agent-experiment-batch-report/v2` result or one non-shadowed v2 audit `case_result` with a v2 selection observation. That single result SHALL itself carry a matching execution surface, native PASS, null lifecycle outcome, CLEAN health, duration no greater than `120000` ms, and cost no greater than `$0.60`. The selector SHALL NOT combine duration, cost, outcome, health, source digest, or execution-surface facts from different retained records. Any `agent_behavior` case, even if fast and clean, SHALL be explicitly excluded from fast regression without losing its independent proof value.

A case SHALL be `needs_qualification` only when its latest retained current-v2 case result has a matching source playbook, a complete duration/cost pair within the fast SLO, native PASS, null lifecycle outcome, CLEAN health, and an execution surface that is comparable but does not match the current execution surface. A missing v2 result, retained v1 history, a v1 selection observation, source drift, native FAIL/NOT_RUN, lifecycle ERROR/CANCELLED, health ISSUES/ERROR, missing duration/cost, or any SLO breach SHALL make the case `ineligible`. These states are read-only facts: they do not write case state or automatically retry, repair, or start diagnostic work.

Normal regression intent SHALL select only `eligible` cases. Only explicit qualification intent may select `needs_qualification` cases; it SHALL use the same fast SLO and may select only Headless-eligible deterministic candidates with the required single-result current-v2 forecast. Qualification SHALL select at most one case per `experiment` group and SHALL reject `agent_behavior`, unreviewed `all` cases, current-v2 FAIL/ISSUES, and unavailable forecasts. It is not normal regression's automatic fallback.

V2 frontmatter MAY carry `regression_recommendation: recommended` as author preference; absence is neutral and the field SHALL change only ordering among otherwise fully eligible candidates. A `verdict_mode: all` case SHALL also carry `regression_retry_safety: reviewed` before eligibility or qualification. That value is an author/maintainer declaration: it does not alter native verdict and Engine only verifies its declared shape, not the Markdown semantic review. Source/execution-surface drift removes existing membership; a new qualification still requires current human/Agent review rather than treating the literal as semantic proof.

`regression` SHALL fix the fast envelope at no more than `480000` ms predicted batch duration, `$3.00` total budget, `$0.60` effective per-case budget, `120000` ms Agent timeout, and `60000` ms timeout for each health target. Callers MAY tighten these positive bounds but SHALL fail closed when widening any of them. Selection SHALL use `experiment` as its sole coverage group, rotate by retained current-v2 selection history, and select at most one candidate per group; recommendation is a same-group tie-breaker before stable history and manifest order. The predicted-duration bound is a forecast, not a global batch deadline or scheduler.

Regression selection output SHALL show each selected eligible case, every group with no selected member, the effective envelope, its single-result prediction basis, and direct unavailable/ineligible/needs-qualification reasons. It SHALL NOT fill a group gap with an over-SLO case, a case without matching v2 evidence, `agent_behavior`, an unreviewed `all` case, or inferred directory/filename coverage.

#### Scenario: Historical v1 speed cannot directly create a regression member

- **WHEN** 一个 deterministic case 的历史 v1 report 显示 PASS+CLEAN、`90` 秒和 `$0.40`
- **AND** 它没有完整 current-v2 retained observation
- **THEN** regression report SHALL 将该 case 标记为无 current retained result 的 `ineligible` group gap，并保留非致命历史 diagnostics
- **AND** normal regression 和 explicit qualification SHALL 都不从该 v1 record 选择或启动它

#### Scenario: Fast Agent behavior remains outside regression

- **WHEN** 一个 `agent_behavior` case 的 matching v2 observation 满足全部 duration、cost、native outcome 和 health SLO
- **THEN** regression report SHALL 将它排除并说明 proof-subject 原因
- **AND** 它可继续由 calibration、discovery、diagnostic 或明确 assurance scope 处理

#### Scenario: A breach removes a previously qualified member

- **WHEN** 一个已 eligible case 的最新 matching v2 observation 有 health ISSUES、native FAIL、lifecycle ERROR，或 duration/cost 超过 fast SLO
- **THEN** 下一次 regression projection SHALL 将它报告为 `ineligible`
- **AND** selection SHALL 不自动重跑它或以慢 case 静默补位

#### Scenario: Qualification stays explicit

- **WHEN** normal regression projection has no eligible member，但有一个 source-matching current-v2 case 因 execution-surface drift 是 `needs_qualification`
- **THEN** normal regression selection SHALL 不启动该 case
- **AND** 只有显式 qualification intent 才可在同一 fast envelope 内选择它

#### Scenario: One fast case per group fits the regression envelope

- **WHEN** 多个 `experiment` group 各有一个或多个 eligible candidate
- **AND** 轮转后的每个被选 case 总预测不超过 `480000` ms、总预算不超过 `$3.00`
- **THEN** selection SHALL 在该 batch 中至多选择每个 group 的一个 case
- **AND** report SHALL 为每个 selected case 说明 group rotation、recommendation（如有）和 matching v2 prediction

#### Scenario: A group without a qualified fast case remains visible

- **WHEN** 一个 group 只有 stale、slow、ISSUES、Agent-behavior、retained v1 history 或未 qualification 的 case
- **THEN** regression report SHALL 将该 group 报告为未覆盖并给出直接原因
- **AND** selection SHALL 不以 filename-Light 或另一个 group 的额外 case 冒充该 group 已覆盖

#### Scenario: Qualification never stitches historical facts together

- **WHEN** one retained current-v2 result supplies a fast duration but another supplies the cost, PASS, CLEAN, source-match, or execution-surface fact
- **THEN** regression SHALL not report the case as `eligible` or selectable for qualification from that combination
- **AND** its output SHALL retain the direct missing or non-qualifying reason

### Requirement: Agent-behavior coverage gaps remain visible

Discovery 和 calibration 的 selection report SHALL 独立报告 `agent_behavior` coverage，而不得以 `deterministic_contract` selection 代替它。对请求 freshness objective 的 profile，report SHALL 将 Agent-behavior 结果标记为 `included`、`due` 或 `unavailable`，并给出相应 case、陈旧/未知原因或时间/预算限制。没有 Headless-eligible Agent-behavior case、没有可用预测、或没有 case 能装入给定边界时，结果 SHALL 是 `unavailable`，而不是隐含的 clean coverage。

`PASS + ISSUES` SHALL 保持 diagnostic input。Run Strategy SHALL 不自动将稳定 health diagnosis 过滤、降级、升格为 native FAIL，或把一次 successful rerun 当作 health diagnosis 已解决；这种语义判断仍需在 case/health owner 的明确后续变更中完成。

#### Scenario: Budget cannot fit a due Agent-behavior candidate

- **WHEN** discovery 识别到一个 due 的 Headless-eligible `agent_behavior` case，但其保守预测不能装入调用方给定 bounds
- **THEN** report SHALL 标记 Agent-behavior coverage 为 `unavailable`
- **AND** deterministic case 可以作为其自身的 discovery selection 被列出
- **AND** report SHALL 不声称 deterministic PASS 覆盖了该 Agent-behavior objective

#### Scenario: Health issue is sent to diagnostic rather than rewritten

- **WHEN** latest observation 是 native PASS 加 health ISSUES
- **THEN** diagnostic SHALL 可将其列为 candidate 并展示 health 原因
- **AND** selection SHALL 不把 native outcome 改写为 FAIL

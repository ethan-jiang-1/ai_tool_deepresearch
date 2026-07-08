## Context

本 change 来自 `_backlog/plans/formal-run-bugfix-change-split.md` 的第三个 change，覆盖 `_backlog/bugs/BUG-054-wave1-sub-agent-shallow-no-new-discovery.md`、`_backlog/bugs/BUG-055-wave2-phase-agent-skips-synthesis-depth.md`、`_backlog/bugs/BUG-058-wave1-cache-trails-too-thin-per-topic.md`。

当前 framework 已经具备 queue-driven Wave1/Wave2、work-unit submit、submitted ledger coverage、cache coverage、Wave2 三件套和 route-bound phase handoff。但 formal run 暴露出另一个问题：Agent 能沿着合法路径产出结构化文件，却仍然把 Wave1 做成 Wave0 复述，把 Wave2 做成浅层报告。也就是说，runtime truth 和 gate truth 稳定之后，还缺少 research-method truth 的最小可执行 contract。

本 change 必须守住 charter 边界：Markdown/Agent 控制研究流程和语义判断；JS/CLI 检查 schema、状态、receipt、trace、cache、ledger、可解析结构和确定性一致性。Gate 不变成研究质量评委，但可以拒绝“没有按研究方法留下可审计痕迹”的 shallow path。

## Goals / Non-Goals

**Goals:**

- 恢复 Wave1 per-topic deepening contract：新 topic-specific evidence、机制/趋势/难点/限制分析、profile-driven counterexample/cross-verification、Phase Agent 审收和补充任务循环。
- 让 Wave1 source claims 与 cache trails 可逐项追踪：accepted source URL 必须有 submitted verified cache trail 或 explicit degraded capture。
- 恢复 Wave2 synthesis contract：scan matrix、confidence triage、gap analysis、emergent search decision 必须先于 pure synthesis path。
- 让 Wave2 targeted evidence 只在需要新证据时进入 work-unit path；pure synthesis 不需要 delegated row，但必须证明没有 unresolved evidence gap。
- 为 shallow output、missing cache trail、missing Wave2 scan/triage 和 happy path 提供 regression + controlled E2E 覆盖。

**Non-Goals:**

- 不重新引入 `content_dedup`、homepage/shallow URL、Jaccard、self-reference 或类似 guess-based gate heuristic。
- 不让 JS 判断 source 是否“有洞见”、synthesis 是否“深刻”、finding 是否“值得研究”。
- 不新增外部依赖，不使用 Python，不引入 TypeScript。
- 不启用 parallel claim throughput；那属于 `harden-run-entry-and-agent-discipline`。
- 不把 real-environment E2E 纳入本 change 的 done condition；真实生产 run 仍是 deferred layer。
- 不从 `_old_topics` 或历史实现直接搬路径/术语。原始 bug 中提到的 v12 内容只作为方法思想来源，当前实现必须落到 accepted framework surfaces。

## Decisions

### 1. Depth contract lives in Agent-facing artifacts plus deterministic projections

Wave1/Wave2 深度恢复不能只写在 prose 里，也不能只靠 gate 的自由文本 advice。Apply 应让 Phase Agent 产生可审查的 projection：

- Wave1: `artifacts/wave1/{topic}/depth-review.yaml`，记录 `topic_slug`、reviewed submitted work-unit refs、Wave0 URL set、structured source claims reviewed from submitted results、new source URLs、required new-source floor、depth dimensions、profile checks、decision、supplementary queue refs。
- Wave2: 扩展现有 `finding-index.yaml` 和 `cross-topic-ledger.md`，记录 scan matrix coverage、confidence/backing、gap status、search decision、targeted search receipt refs、pure synthesis eligibility。

这些 projection 不是 semantic authority。它们是 Agent 判断后的可检查痕迹，供 JS 验证“Agent 是否完成了该做的步骤”。

Alternative rejected: 只扩写 `phase-wave1.md` / `phase-wave2.md` 自检清单。清单太容易被 Agent 忽略，且 regression 无法可靠判定 shallow path。

### 2. Submit validates transport; Phase Agent acceptance validates depth completion

`operate-work-unit submit` 继续负责 deterministic contract：result schema、receipt nonce、output files、cache trails、queue binding、hash 和 ledger append。它不应根据 semantic depth 拒绝一个结构合法的 result。

Wave1 topic 是否“完成”由 Phase Agent 在成功 submit 后审查。若 depth review 不通过，正确路径是 enqueue supplementary `wave1_topic_deepening` task（例如 `wave1-deepen-{topic}-v2`，带 `payload.topic_slug`），而不是手改 ledger、force advance、或把已 submitted attempt 倒回未完成。

Alternative rejected: 让 submit 因“内容浅”直接 reject。这样会把 semantic research judgment 塞进 Engine，并让 sub-agent repair 和 deterministic submit failure 混在一起。

### 3. Exact source novelty is a floor classifier, not a dedup heuristic

Wave1 需要证明新增 evidence。Apply 应使用 exact URL equality 和 submitted source mapping 判断某个 URL 是否相对 Wave0 新增；该判断只用于 new-source floor，不用于 broad content quality judgment。

`required_new_source_floor` SHALL be derived only from explicit profile/runtime parameters. The preferred formula is `ceil(wave1_per_topic_ref_floor * topic_unique_ratio)`, minimum 1, when both parameters are present. If the required profile/runtime parameter is missing, the Agent or gate must produce a `missing_profile_parameter` diagnostic and fail or repair through an accepted profile/template path; no hidden fallback is allowed.

Reused Wave0 sources可以被引用为背景，但不能满足 new-source floor。Exact duplicate URL 不等同于恢复 `content_dedup`：这里没有 Jaccard、homepage、path-depth 或 self-reference guess；只是对“新证据”这个 contract 做集合差。

### 4. Cache depth is enforced per accepted source claim

Wave1 accepted source URLs must come from submitted structured `source_claims[]` / `accepted_source_urls[]`, not from ad hoc prose scraping or Phase-owned review projection alone. `depth-review.yaml` may aggregate reviewed claims, but it cannot introduce accepted source coverage without a submitted `work_id` binding. Each accepted source claim used by evidence summaries or topic references must map to a submitted ledger row's verified `cache_trails`, or to an explicit degraded-capture/fetch-failure record. Sparse cache trails 如“7 个 accepted source claim 只有 1 个 cache leaf”必须在 submit/preflight/gate surfaces 暴露为 contract failure.

Primary enforcement should be as early as possible:

1. work-unit result schema and submit validation verify declared source/cache pairs;
2. Wave1 gate re-checks submitted ledger/cache binding for drift or older accepted rows;
3. inspect/advice names the missing source URL, expected cache leaf, and work-unit identity.

### 5. Wave2 pure synthesis is conditional, not default

Pure synthesis remains main-agent work and still does not require delegated work-unit coverage. But “pure” is legal only when the Agent has completed scan matrix + triage + gap analysis and the resulting finding index says no unresolved search-required finding remains.

If triage initially routes a finding to `exploit_search` or `explore_search`, convergence must leave that finding in one of two legal states:

- the search decision remains and has submitted `wave2_targeted_evidence` receipt refs plus updated backing refs; or
- the finding transitions to `defer_hitl2`, `requires_internal_data`, or `record_only` with a matching `gap_status` and a reason visible in ledger/index.

Alternative rejected: require every Wave2 synthesis to spawn delegated search. That would waste work when existing Wave1 evidence is sufficient and would violate the accepted split between pure synthesis and targeted evidence.

### 6. Gate KISS remains load-bearing

The new gate/preflight checks should be deterministic:

- YAML parse and required keys;
- source URL set difference against Wave0 accepted URLs;
- source URL to cache trail mapping;
- presence of required Wave1 depth dimensions in review artifact;
- scan matrix topic-pair coverage;
- finding-index consistency rules;
- delegated targeted evidence receipt refs when search decisions require them.

They should not judge insight, prose quality, or source intellectual value. If a future check needs human-like judgment to avoid false positives, it belongs in Agent-facing review guidance or HITL2, not as a blocking gate rule.

## Risks / Trade-offs

- More artifacts can increase Agent workload -> Keep projection schemas small and generated from work the Agent already performs; avoid duplicating full prose in YAML.
- Source novelty floor may be too strict for narrow topics -> Make the floor explicit and profile-driven; missing floor inputs fail with diagnostics instead of hidden defaults. Explicit degraded capture can satisfy cache-trail mapping for an otherwise accepted source, but it does not waive source novelty or depth-dimension floors.
- Gate checks may accidentally become semantic scoring -> Tests should include allowed low-prose/high-structure fixtures and rejected missing-work fixtures, proving the gate checks process evidence rather than “brilliance”.
- Supplementary Wave1 loops can grow run cost -> Use bounded supplementary tasks and require `supplementary_queue_item_ids` / decision reasons in `depth-review.yaml`.
- Wave2 can defer too much to HITL2 -> Require unresolved findings and deferrals to appear in synthesis, ledger, and HITL2 handoff so deferral is visible rather than hidden.

## Migration Plan

1. Update Wave1/Wave2 delta specs and tasks before any implementation.
2. Extend Agent-facing phase docs and work-unit task guidance first, so demand-side behavior exists before helper supply.
3. Add focused schema/helper support for Wave1 depth review and Wave2 eligibility checks.
4. Add gate definition/CLI checks and diagnostics.
5. Update controlled playbooks and regression fixtures to cover shallow negative cases and non-shallow happy path.
6. Update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` to `v0.8`.

Rollback is ordinary OpenSpec revert before archive: remove the active change or revert apply commits. Runtime bundles produced under the new contract should remain inspectable because new artifacts live under bundle `artifacts/` and do not alter historical ledger authority.

## Apply Notes

No proposal-blocking open questions remain. During apply, if the existing profile/template surface lacks `wave1_per_topic_ref_floor` or `topic_unique_ratio` in any path, implementers SHALL either add the explicit parameter through the relevant accepted profile/template surface or make the Agent/gate produce a clear `missing_profile_parameter` diagnostic before proceeding. Hidden default thresholds remain out of scope.

---
title: Delegated work operability and gate truth
status: analysis_complete_no_remediation_approved
created: 2026-07-25
scope: BUG-114--BUG-123
evidence_bundle: dpt_rb_openspec-adoption-landscape
---

# Delegated Work Operability And Gate Truth

## 结论

`BUG-114`--`BUG-123` 不是十个应逐个堆补丁的缺口。它们横跨三个不同的 authority boundary：

```text
role-specific actor observation
  -> claimed work-unit envelope / returned result
  -> queue lifecycle and a legal replacement attempt
  -> submitted immutable ledger
  -> fresh gate evaluation and fail-closed handoff
```

其中有两个真实的系统性风险：

1. **Producer contract 在 Agent 的决策点不够局部、可构造。** Agent 已经必须执行 claim、写 candidate、dry-submit，却仍要从 schema、beacon、receipt、cache 和 Gate 反推同一 contract。这是 contract-lineage delivery 的问题，不是应由 Agent 猜完所有组合的问题。
2. **失败报告把“当前 direct fact”“派生 queue label”“历史 run 的解释”和“应当保持 fail-closed 的 authority”混在一起。** 这会诱发错误的 recovery 操作：手改 queue、解锁、修改已提交 ledger，或以 content 完整为由跨越 provenance Gate。

因此后续不应建设一个通用 repair controller、queue `unblock` 按钮、fatigue reset 开关、可变 ledger 或 provenance degraded pass。正确形状是：**一个直接事实 -> 一个已有/明确的 checkpoint -> 最小根因 -> 一个合法下一动作**。每个新 operation 只有在现有 direct authority 无法表达其合法转换、并能删除旧的隐式路径时才成立。

本计划是归因和 sequencing 文档，不批准代码行为变更。任何实现仍须先走独立 OpenSpec proposal/spec/tasks，再 apply。

## Authority And Evidence

| Truth type | Source of record | 本计划的用法 |
|---|---|---|
| Accepted behavior | `openspec/specs/` | 判定哪些“建议修法”不能做 |
| Current implementation | `DPT_FRAMEWORK/` at `6e47de3ea` | 判定报告是否仍可在当前版本复现 |
| Incident observation | `dpt_rb_openspec-adoption-landscape` and BUG records | 产生 red-capable hypothesis，不单独证明当前因果 |
| Future remediation | a new OpenSpec change plus fresh `dpt_disp_*` evidence | 才能改变 contract 或关闭 bug |

生产 bundle 只保留为诊断样本。它不能通过手改 queue/status/ledger/trace 变成 closure evidence。新的 deterministic 结论必须用正常 instantiator 创建的 disposable bundle；需要真实 Agent 或 native actor 的结论，必须由 real `agent_flow_e2e` 证明，不能用手写 receipt、result 或 ledger 代替。

## Bug Disposition

| Bug | 性质 | Current disposition | 正确方向 |
|---|---|---|---|
| 114 | claim observation contract 不可发现 | Real usability/feedback gap | 公开合法 tuple 与 role-specific next action；不允许 `not_observed + available`，不把 HITL1 general access 当成 role probe |
| 115 | returned-result contract 碎片化 | Real producer-entry gap | 从 existing direct contracts 生成一份本地可读 envelope/projection，并让 dry-submit 返回最小 independent roots；绝不生成假 receipt/cache/evidence |
| 116 | stdout/stderr “随机”叙述 | Current code contradicts report; needs red repro | 固定 CLI stream/exit contract regression；不能用 `2>/dev/null` 掩盖 failure 后再把空 pipe 当成功 |
| 117 | provenance Gate 无 degraded pass | Misdiagnosed | 保持 provenance/queue/receipt/ledger fail closed；先修合法 submit/replacement path |
| 118 | abandoned attempt 后的 recovery 可达性 | Plausible lifecycle defect, unproven at HEAD | 复现一个 terminal attempt 到显式 fresh replacement 的完整路径；不能强行把 `abandoned` 改写成 `timed_out` |
| 119 | wave1 enqueue 消失/assignment mode 缺失 | Mixed: old input defect, current guidance now covers it | 用 invalid-card non-mutation + valid-card state transition 证明；不以旧 shell pipeline 的观察推断 queue state |
| 120 | Wave1 reference contract 未交付 | Static contract already covered at HEAD | `shared-reference-template.md`、Wave1 template and actor guidance 已列 exact metadata/binding/sections；补真实 loaded-guidance proof 后可关闭 |
| 121 | fatigue 缓存旧 failed rules | Serious if reproducible, currently unproven | 用“同一 fresh bundle，修正 bytes 后高 attempt 重跑”的 red/green case 检验是否重算；不加 `--reset-fatigue` 逃生路径 |
| 122 | `blocked` 无 legal unblock | Misdiagnosed unless 119 red repro survives | `queue_health`/stop authorization 是 queue demand 的派生状态；successful enqueue 已应重算，不能 direct-edit 或独立 unblock |
| 123 | 修改 submitted declaration 使 hash 失效 | Integrity property, not a ledger bug | 新 source 走新的 supplementary work-unit submit；不得 amend/re-hash historical row |

## Current Facts That Bound The Design

- `ActorObservationInputSchema` only accepts four coherent observation tuples. `available` requires a role-specific `native_probe` and `probe_succeeded`; `unknown/not_observed/observation_required` means allocate nothing. A generic HITL1 `research_access` result cannot silently establish an exact delegated role's availability.
- `operate-queue` emits its normal JSON via `console.log`, emits errors/diagnostics on stderr, and successful `enqueue()` runs `syncQueueHealth()`. Therefore a state that becomes healthy after a valid enqueue must be proven with a captured current repro before adding a recovery command.
- Wave1's current task-card template carries `payload.assignment_mode: primary`; its supplementary path names `assignment_mode: supplementary`, and a mode-absent queued card already has a narrow audited repair operation. This is evidence that the old task-card omission has been addressed statically, not evidence that a live Agent read it.
- Current Wave1 reference guidance is explicit about bullet metadata, the eight common facts, either resolvable topic-binding form, five semantic sections, submitted backing, and parser tolerance. The current source is therefore inconsistent with BUG-120's “undocumented” claim.
- Wave Gate `failed_rule_ids` is built from the current `ruleEvaluation`; fatigue changes degraded-handoff eligibility after the evaluation. A stale rule can still exist in a contaminated runtime trace or a real evaluation bug, but it must not be presumed to be a permanent cache without a fresh mutation-and-rerun test.
- Submitted ledger rows bind candidate result content to `result_hash` and `ledger_record_hash`. Accepted specs require a new Wave1 source to be backed by a submitted source claim/cache surface, and explicitly direct missing backing to supplementary `wave1_topic_deepening`; an in-place amendment would destroy the authority the check protects.

## Systemic Boundary Map

```text
M3: contract delivery                       M4: lifecycle reachability
claim facts -> generated work envelope      terminal attempt -> explicit replacement
             -> dry-submit roots             -> claim -> submit
                    |                                |
                    +-------------+------------------+
                                  |
                         submitted immutable ledger
                                  |
M5: truthful evaluation           v
fresh evaluator facts -> root-first Gate feedback -> normal/degraded only when eligible
```

M3, M4 and M5 read different direct authorities. They must not become one "reliability controller" change. A remedy in one layer must not make another layer's authority mutable or optional.

## OpenSpec Change Map

**这个 plan 最多产生三个 sequential OpenSpec changes，不是一个大 change，也不是十个 bug 各开一个 change。**

`0. Establish red-capable facts` 是 proposal 前的 evidence gate，不是第四个 change：它只用当前 CLI 在 fresh disposable bundle 上确认/否定假设，记录诊断；不改 `DPT_FRAMEWORK/`、`tests/` 或 `experiments_playbook/`。需要永久 regression 的 test 和实现，必须放进其所属 change 的 apply tasks。

```text
0. Evidence gate (no behavior change)
        |
        v
1. make-delegated-work-contracts-constructible
        |
        v
2. make-terminal-work-replacement-direct
        |
        v
3. ensure-wave-gate-reevaluation-freshness
```

只有 evidence gate 仍复现对应 current defect，才 proposal 该 change。也就是说最终可能是 1、2 或 3 个 change；不得为了凑 roadmap 预先创建全部三个。

| Order | Candidate change | Owns | Bug ownership | Explicitly out of scope |
|---|---|---|---|---|
| 1 | `make-delegated-work-contracts-constructible` | actor-observation input、claimed work-unit envelope、candidate result contract delivery、dry-submit 的 root-first feedback | **114, 115**；**120** 只作为 loaded-guidance acceptance check | queue health/recovery、Gate routing/degradation、ledger mutation；不把 general HITL1 probe 变成 role probe |
| 2 | `make-terminal-work-replacement-direct` | queue demand、delegated-in-flight、terminal attempt、fresh replacement identity、CLI stdout/stderr/exit semantics | **116, 118, 119, 122**，但仅限 fresh repro 成立的部分；**123** 作为“不改旧 row、创建新 row”的 acceptance invariant | actor contract tuple、Gate evaluator、provenance hash algorithm；没有 `unblock`、手改 state 或 abandoned-to-timed_out 改写 |
| 3 | `ensure-wave-gate-reevaluation-freshness` | current evaluator findings、`failed_rule_ids` projection、fatigue/degradation consumption of that fresh result | **121**；**117** 作为 fail-closed non-regression invariant | queue replacement、producer result construction、ledger/source-claim mutation；没有 reset/force bypass，不能让 provenance root degraded |

`BUG-117`、`BUG-120` 和 `BUG-123` 不各自开启 change：前者是错误的 degraded 诉求，后两者的 current static contract/integrity boundary 应由 Change 1/2 的 acceptance proof 验证。若 evidence 与当前 source 相矛盾，先修正 bug disposition，而不是把错误 premise 变成需求。

### Why This Order

1. **先 Change 1：** Agent 必须先能在 claim/dry-submit 的 decision point 看见完整合法 contract，才有可信的 returned-work evidence；否则后续 queue 或 Gate 失败仍可能只是盲猜输入的噪声。
2. **再 Change 2：** 有可构造 candidate 后，terminal/replacement path 才能以真实 queue/index/ledger lifecycle 测试。它只解决“下一合法 attempt 怎样出现”，不改写已经 terminal 或 submitted 的事实。
3. **最后 Change 3：** Gate 只能消费 truthful producer/queue facts。否则 “stale failure” 测试会混入未提交、不可见 replacement 或手工 authority edit，无法分辨 evaluator defect 与上游 lifecycle defect。

每个 proposal/design 必须列出本表的 **owns** 与 **out of scope**，并通过 `evolution-simple-reliable-control.md` 的 net-simplification review：新增 feedback/projection 或 replacement operation 必须删除一次 Agent 猜测、隐藏 identity 或重复 validator，而不能只加层。

## Proposed Sequence

### 0. Establish red-capable facts before proposing behavior

Create fresh disposable bundles and retain command output, trace/index hashes, and before/after authority bytes. No direct edits to queue, status, ledger, receipts, or trace.

1. **Claim matrix:** execute the four valid actor-observation tuple classes and representative invalid cross-products. Assert a structured, role-bound same-check action, no allocation on unknown, and no brute-force-only discovery.
2. **Returned-work constructability:** claim a real Wave0 and Wave1 work unit; give the designated actor only its generated envelope/task and normal role guidance. Record every direct contract it still needs to discover before its first dry-submit. Separate deterministic contract test from any real actor result.
3. **Queue command protocol:** with Node test harness capture stdout, stderr, exit code and bundle hashes for `check`, valid `enqueue`, invalid Wave1 `enqueue`, claim and repair. Invalid input must have a non-zero exit and no queue mutation; successful enqueue must return one parseable stdout JSON document and move demand to a legal queue location.
4. **Drain/replacement:** terminalize a claimed attempt through the accepted status, then exercise the documented new-demand/replacement path. It must produce a CLI-visible work ID that can be claimed and submitted; filesystem discovery cannot be the normal caller protocol.
5. **Fresh Gate re-evaluation:** run Wave1 Gate until a selected root fails, repair that same direct surface, then rerun at an attempt count at or above the fatigue threshold. The result must be based on current evaluator facts. Keep an independent ineligible provenance root in the fixture to prove fatigue never degrades it.
6. **Novelty without mutation:** submit a supplementary Wave1 attempt with a genuinely new source claim and cache backing. Prove the additional immutable ledger row satisfies the novelty consumer while every prior row's hash remains unchanged.
7. **Real-flow check where authority requires it:** run the smallest available `agent_flow_e2e` with a real actor. If no authorized actor budget exists, mark it `NOT_RUN`; do not replace it with fabricated evidence.

The output of step 0 is a short evidence matrix: **reproduced current defect / static defect already fixed / invalid premise / requires external real-actor evidence**. Only reproduced current defects receive a new behavior change.

### 1. `make-delegated-work-contracts-constructible`

This change is warranted if steps 0.1--0.2 show that the Agent must still infer Engine-known static lineage.

Scope:

- Make `claim`/work-unit envelope expose the complete role-bound observation vocabulary and valid combinations, including which tuple is a no-claim result.
- Deliver one generated Agent-facing contract projection from existing beacon, result schema, output contract and validators: exact immutable identity values, required output roles, result JSON pointers, required receipt event shape, and cache/source obligations.
- Keep it a projection of the existing one truth path. It must not become a second schema, a second validator, a prefilled receipt, a prefilled cache trail, or an evidence generator.
- Make dry-submit group independent roots and retain full durable detail, instead of releasing a cascade that forces source reading or trial-and-error.

Non-goals:

- Do not treat HITL1 general access as a role-specific native probe.
- Do not permit contradictory actor observations.
- Do not have Engine perform research, write substantive outputs, or fabricate provenance.

Required proof: tuple diagnostic tests, generated-envelope consistency tests against the canonical validator, same-work-id mechanical repair tests, and a real actor-flow case or explicit `NOT_RUN` boundary.

### 2. `make-terminal-work-replacement-direct`

This change is warranted only if steps 0.3--0.4 reproduce a current gap between terminalizing a work unit and allocating its legitimate successor.

Scope:

- Use queue demand, delegated-in-flight records, work-unit index and terminal records as direct facts; normalize derived queue health after every successful legal mutation.
- Give `inspect`/claim feedback exactly one legal recovery: repair the same unsubmitted candidate, or terminalize and create one new queue demand/attempt with a fresh identity. It must name the created/replacement work ID once it exists.
- Ensure invalid Wave1 cards fail atomically and visibly, while valid cards with declared assignment mode are accepted and retained.
- Standardize the existing CLI machine-result contract across tested paths: a normal result is parseable stdout JSON; failure exit is non-zero; human diagnostics may remain stderr but must not masquerade as success.

Non-goals:

- No raw `unblock`, no direct `rb_queue.json` mutation, no queue-health override, and no watcher/retry daemon.
- No `abandoned -> timed_out` rewrite merely to reach `late-submit`; these names have distinct audit meaning. A new attempt is the default recovery shape.
- No hidden batch allocation that requires `ls _work_units` to discover its identity.

Required proof: invalid-card no-mutation integration test; zero-demand -> valid enqueue -> claim -> submitted lifecycle; terminal -> fresh replacement lifecycle; stdout/stderr/exit contract test; and a clean-bundle regression proving no old terminal history is mistaken for current demand.

### 3. `ensure-wave-gate-reevaluation-freshness`

This is deliberately separate from queue and producer changes.

Scope if reproduced:

- Locate the single evaluator/result construction path that carries obsolete `failed_rule_ids` after the direct fact is corrected.
- Remove or invalidate that stale projection at its owning boundary, then prove Gate, inspect, hints and degradation eligibility consume the same fresh evaluation.
- Preserve fatigue as diagnostic/eligibility policy, never as a substitute evaluator or a mutation of gate truth.

Non-goals:

- No universal `--reset-fatigue` or `--force-reevaluate` bypass.
- No degradation for queue, receipt, ledger, provenance, identity/binding, required structure or trace roots.
- No use of high attempt count as evidence that a repaired rule should pass.

Required proof: corrected direct artifact removes its own failed rule on a high-attempt rerun; an unchanged independent provenance root remains failed and ineligible; normal eligible quality-only degradation behavior remains covered.

## Closure Rules

- Close BUG-117 as a misdiagnosed request only after the plan records the accepted provenance fail-closed contract and its upstream operability dependencies.
- Close BUG-120 when a loaded-guidance test proves the current Phase/actor `requires` chain delivers the complete template; static source inspection alone is not a real Agent-flow claim.
- Close BUG-123 as an intentional integrity property after the supplementary-new-source lifecycle test passes; it is not closed by adding an amend API.
- BUG-116, BUG-119, BUG-121 and BUG-122 may be reclassified only from captured fresh evidence, never from an incident command transcript that suppressed stderr or reused contaminated state.
- No bug is "fixed" until its OpenSpec change is proposed, applied, tested at the correct verification layer, and archived. A static wording update, console output, or manual bundle repair is not closure evidence.

## Design Guardrails

- Keep Markdown as the Agent flow surface and JS/CLI as deterministic checker/transition authority.
- Do not turn a failure report into permission to fabricate a receipt, result, cache trail, trace event or ledger row.
- Reuse direct validators across producer feedback, inspect and Gate; remove duplicate checks rather than adding a parallel linter.
- Keep rich reference presentation tolerant where equivalent, but keep submitted backing, cache/source mapping, identity, receipt and ledger binding strict.
- Every new persisted field, operation or recovery route must state its owner, direct source of truth, one next action, retirement of old complexity, and focused negative test.

## Sources

- `guidelines/project-charter.md`
- `guidelines/evolution-simple-reliable-control.md`
- `guidelines/evolution-helper-oriented-agent.md`
- `guidelines/agentic-execution-model.md`
- `guidelines/agentic-workflow-mechanism.md`
- `guidelines/agentic-queue-mechanism.md`
- `openspec/specs/delegated-work-units/spec.md`
- `openspec/specs/work-unit-provenance-gate/spec.md`
- `openspec/specs/gate-skeleton/spec.md`
- `openspec/specs/reference-flat-format/spec.md`
- `DPT_FRAMEWORK/cli/operate-queue.mjs`
- `DPT_FRAMEWORK/cli/operate-work-unit.mjs`
- `DPT_FRAMEWORK/engine/queue-manager-core.mjs`
- `DPT_FRAMEWORK/engine/work-unit-actor.mjs`
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-reference-template.md`
- `_backlog/bugs/BUG-114-*.md` through `BUG-123-*.md`

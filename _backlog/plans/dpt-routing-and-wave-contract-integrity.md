---
title: DPT routing and Wave contract integrity
status: progressive_plan_ready_for_openspec_proposals
created: 2026-07-29
source_bugs: BUG-139, BUG-140, BUG-141, BUG-142
evidence_bundle: dpt_rb_openspec-spec-bloat-context-management
recommended_change_count: 2
conditional_change_count: 1
---

# DPT Routing And Wave Contract Integrity

## 1. Decision

这四个发现不是四个孤立的补丁点，而是两条控制链上的断裂：

```text
用户选择 DPT research
  -> 必须先进入 DPT entry
  -> 才能使用该 phase 授权的 research surface

submitted evidence + Phase-owned navigation projection
  -> inspect / Gate 产生一个无歧义 verdict
  -> 才能合法 handoff
```

建议只开 **两个** OpenSpec change：

| Change | 覆盖 | 有界问题 | 原因 |
| --- | --- | --- | --- |
| `harden-dpt-research-entry-routing` | BUG-139, BUG-140 | DPT 已被用户选择时，Agent 在任何研究动作前必须进入正确的 DPT entry。 | 这是入口与 Agent Flow 路由语义，不触碰 runtime Gate/ledger。 |
| `make-wave-gate-verdict-unambiguous` | BUG-141 | 一个 Gate 输出必须能让 reader 精确区分 clean pass、degraded handoff 和 failed，且 `passed` 与 blocking failures 始终一致。 | 这是 runtime verdict/transition API 语义；与入口路由独立。 |

**BUG-142 暂不单独开 change。** 当前 head 已有 Wave1 `Phase-owned reference projection` 合同和 convergence 关闭路径；它在该 bundle 运行结束后的 2026-07-28 16:57 合入。先做一次真实受控验证。只有 current head 仍让 Phase Agent 获得“没有合法下一步”的 materialization feedback，才开一个第三个、只修 closeout feedback/materialization handoff 的 change。

这不是拖延 BUG-142，而是避免为已经存在的 Phase-owned projection contract 再造 ledger mutation、supplement command 或第二条 evidence authority。

## 2. Evidence Digest

### BUG-139 and BUG-140: the same routing boundary, two bypasses

| Bug | 已观察路径 | 根因 | 正确的 contract change |
| --- | --- | --- | --- |
| BUG-139 | generic `research` skill 先匹配，未进入 `RUN.md` | root rule 只抽象地说 `deep-research or equivalent`; skill matching 容易先占据注意力。 | 对 DPT-selected research 明确建立 entry-first rule，并点名当前 generic shortcuts。 |
| BUG-140 | 即使不调用 skill，Agent 直接 WebSearch/WebFetch + 手工综合 | 禁用 skill 不是禁止自行拼装 research loop。 | 同一 rule 明确禁止 entry 前的 direct research/search/fetch/synthesis；不是再增加一个 skill suppression patch。 |

当前 `run-entry` 已定义 `RUN.md` 为 selected DPT 的入口，也要求 root/framework 行为文件同步。缺的是一个可消费的 **唯一合法下一动作**：

```text
selected existing bundle -> read continue-run-bundle.md
selected new research    -> read RUN.md
not selected             -> normal non-DPT routing remains available
```

在这个分流完成前，generic research skill、one-shot research workflow、WebSearch/WebFetch 用于本研究，以及手工 evidence synthesis 都不是合法替代路径。HITL1 的 bounded capability probe 仍是 `RUN.md` 进入后由 phase 合同授权的例外，不能被误写成 entry 前的 research permission。

这里不能诚实承诺“永不被 harness 绕过”：项目文本无法重配所有宿主的 tool injection 或 skill matcher。DPT 可以把自己的 entry contract 和 Agent guidance 做到清晰、同步、可进行真实 Agent observation；平台级条件禁用只有在已验证该宿主支持、且不阻断 framework 所需能力时才是后续独立决定。

### BUG-141: not a boolean arithmetic defect, but an overloaded verdict

bundle trace 的 Wave0 第三次 attempt 已记录：

```json
{
  "passed": true,
  "next": "phases/phase-wave1.md",
  "degraded": true,
  "degraded_rules": ["shared_ref_count_floor"]
}
```

当前 `check-gate-wave0-complete.mjs` 的设计是：在 fatigue threshold 后，只有 degradation-eligible quality rule 未满足时，`passed: true` 表示 **允许 handoff**，不是“所有质量规则均满足”。现有测试也明确期待该组合。

问题在于同一输出还把这些 carried quality rules 放进 `failed_rule_ids`。对 Agent/reader 而言，`passed` 和 `failed` 在同一层级没有明确所指，导致 BUG-141 所描述的非法 advance 风险和人工误判。把 `passed` 机械改成 `false` 会毁掉已经接受的 degraded routing；忽略 `failed_rule_ids` 又会隐藏质量 debt。

应建立的精确语义是：

```text
check.passed             = this Gate may legally route now
check.failed_rule_ids    = still-blocking rules; therefore nonempty => passed false
check.degraded           = passed route is a degraded handoff, never a clean quality pass
check.degraded_rules     = nonblocking-for-routing but still unresolved carried quality rules
```

完整 finding/diagnostic 仍保留质量事实。只改变 public summary 字段的分类，绝不把 degraded rule 假装已经满足。

### BUG-142: the observed files are not an immutable-ledger dead end

该 bundle 的 Wave1 reference 是运行时手工产生的旧式文件，例如：

```text
reference/01_...-wave1-deepening.md
source_url: file:artifacts/wave1/.../evidence-summary.md
```

它们既不是 canonical current reference path，也没有以 submitted HTTP(S) source claim、accepted URL、verified cache/degraded capture 和 work-unit refs 绑定。Gate 因而正确地不把它们当 delegated evidence 或 backed Phase projection。

当前 accepted contract 的正确闭环已经不同：formal Wave1 submit 后，Engine 从 reviewed submitted rows 给出 exact materializable candidates；Phase Agent 写 **canonical Phase-owned navigation projection**，并引用 submitted backing；随后 sync index、更新既有 topic-state packet、重跑同一个 inspect。reference file 本身不需要在 `rb_output_declarations.jsonl` 新增行。

因此以下方案明确拒绝：

- Phase Agent 通过 artifact persistence 或手写方式追加 ledger；ledger 是 submitted delegated coverage authority。
- `operate-work-unit supplement` 修改 submitted output declarations；会破坏 result/hash/receipt 绑定和 immutable submit 边界。
- 用 queue refill/supplementary work 掩盖可 materialize 的已有 submitted backing；supplement 只处理真实 floor deficit。
- 把 filesystem-only reference 或 `_INDEX.md` 变成 authority。

不过该 bundle 的 diagnostic 同时给出了 `per_topic_ref_md_count_floor` materialization root 和大量 `ledger_coverage` repair hints，后者错误地把 reader 指回已耗尽的 work-unit path。current implementation 是否已经通过 convergence 先短路并把此噪声消除，必须以真实 current-head observation 裁决，不能靠 fixture 或计划文字宣布已修。

## 3. Design Review Against The Three Guidelines

### Semantic precision

只引入两个有 bounded reader question 的概念：

1. **DPT-selected entry**：此 research request 应从哪个 entry surface 开始？答案是 new-run、existing-bundle continuation 或 not selected；它不决定 research 内容、搜索结果或 host liveness。
2. **Gate routing verdict**：当前 Gate 能否合法 handoff，及是否带着明确的 degraded quality debt？它不重定义 evidence quality、ledger、status 或 trace。

Phase-owned reference projection 不是新概念；它是现有 accepted split。BUG-142 的验证必须先证明该 split 在真实 Agent Flow 中不能闭环，才可改变它。

### Simple reliable control

最短控制环分别是：

```text
DPT selection -> one entry document -> existing phase/gate flow

submitted backing -> existing Wave1 inspect -> canonical projection + index sync
                  -> same inspect -> formal Gate
```

计划不增加 watcher、tool interceptor、second ledger、new queue type、retry controller、derived state 或 general recovery framework。BUG-141 复用既有 `degraded` information，移除错误 summary overlap；BUG-142 先让 materialization root 赢过无效的 downstream ledger symptom。

### Helper-oriented Agent

当 entry、materialization 或 same-check repair 已有 accepted legal path，Agent 自己读取 direct fact、执行机械动作并重跑 checkpoint；不把普通命令推给用户。只有新研究语义/HITL 或宿主权限这类不可代理边界才升给用户。若 no legal path 存在，feedback 必须诚实给出 `missing_contract`，而不是暗示用户能手写 ledger 解决。

## 4. Progressive Plan

### Stage 0 - Freeze the facts before proposing behavior

- [x] Read BUG-139--142, the project charter, the three specified evolution guidelines, `run-entry`, Wave Gate, provenance and reference contracts.
- [x] Confirm there are no active OpenSpec changes; a new proposal need not reconcile an in-flight change.
- [x] Read the reported bundle without mutating it. Confirm BUG-141's degraded Wave0 attempts and BUG-142's legacy `file:` reference shape / repeated failed Wave1 diagnostics.
- [x] Identify that Wave1 reference convergence landed after the observed run; do not infer current behavior from the old bundle alone.
- [ ] Capture a read-only baseline for the future proposals: current commit, bundle trace/diagnostic paths, current accepted-spec requirement IDs, and the exact change that introduced Wave1 convergence. Attach it to the proposal evidence rather than copying raw diagnostics into specs.
- [ ] Run one disposable **real Agent-flow** current-head Wave1 closeout observation with submitted HTTP(S) source/cache backing. The proof is: inspect emits exact materialization candidates; Agent creates canonical backed Phase-owned references; index/packet loop completes; same inspect and Gate no longer ask for an impossible work-unit claim. A fixture remains only deterministic Engine evidence, not Agent-behavior proof.
- [ ] Decide BUG-142 disposition from that observation:
  - PASS: mark it fixed-by-current-head / close it with the observation and retain no third change.
  - FAIL with a direct missing writer/coordinate: open the conditional change in Stage 4C.
  - FAIL because Phase Agent ignored explicit legal guidance: treat as entry/role-guidance delivery evidence and amend the narrowest existing guidance surface, not ledger architecture.

**Exit criterion:** both candidate changes have a stable source-of-record map, and BUG-142 is classified by current behavior rather than the historical run.

### Stage 1 - Propose `harden-dpt-research-entry-routing`

- [ ] Create one OpenSpec change with delta only for `run-entry` and the narrow behavioral-doc contract it already owns.
- [ ] Define the selector precisely: a reachable named existing bundle/map plus continue/inspect intent selects `continue-run-bundle.md`; otherwise explicit DPT selection plus research/deep-research/investigation/report intent selects `RUN.md`. A bare/discovered/unreachable map does not select a run.
- [ ] Define the entry invariant: before completing that selected entry routing, Agent SHALL not invoke `research`/`deep-research` or another generic one-shot research shortcut, direct WebSearch/WebFetch for the request, or manual evidence collection/synthesis for the request.
- [ ] State the positive next action in every relevant root/framework behavior surface, not merely a list of forbidden tools. The wording must distinguish pre-entry prohibition from the phase-authorized HITL1 probe and later delegated research work.
- [ ] Synchronize only the already-contract-owned surfaces: root `AGENTS.md` / `CLAUDE.md`, `RUN.md`, framework behavior files, and README reference. Prefer one short identical policy anchor plus local routing context; do not create a second policy registry or provider-specific plugin.
- [ ] Add focused document-contract coverage for all required surfaces and both entry choices. It must catch an accidental reintroduction of “skill only” language or an omission of atomic-tool fallback.
- [ ] Add `agent_flow_e2e` controlled observations for new-run and existing-bundle entry. Assert the first research action follows the selected entry; record host/version/available skills. Do not claim this deterministic test proves a platform harness cannot override instructions.
- [ ] Before `/opsx:apply`, record residual risk: no verified host-level conditional suppression is being promised. Investigate a settings/hook only if it demonstrably supports this exact host and can be scoped to DPT-selected research without disabling later framework work; otherwise leave it out.

**Done condition:** a selected DPT request has one documented first action and the controlled observations show no generic skill or atomic-search bypass before the entry flow. No new lifecycle state or runtime bundle field exists.

### Stage 2 - Propose `make-wave-gate-verdict-unambiguous`

- [ ] Create one OpenSpec change that modifies the existing Gate skeleton / wave-gate requirements and no evidence or queue ownership contract.
- [ ] Specify the output invariants, including `check.passed === true` iff the routing verdict is legal and `check.failed_rule_ids.length === 0`. A clean pass has neither failed nor degraded rules; a failed Gate has blocking failed rules and no `next`; a degraded handoff has `passed: true`, `degraded: true`, nonempty `degraded_rules`, empty `failed_rule_ids`, and a legal `next`.
- [ ] Preserve full unresolved quality findings in diagnostics and trace. `degraded_rules` remains the one explicit carrier of quality debt; it must not be silently dropped or reclassified as clean evidence.
- [ ] Use a narrow shared projection/helper only if it removes the same summary-classification duplication across Wave0/Wave1/Wave2. Do not add a new persisted verdict state, controller, retry path, or duplicate validator.
- [ ] Audit every consumer of `failed_rule_ids`, `degraded`, `degraded_rules`, `passed`, `next`, Gate trace and continuation. Publish a compatibility rule so a consumer cannot treat a degraded handoff as a clean quality pass.
- [ ] Update phase/readme guidance to have the Agent consume `check.next` only after confirming whether the handoff is clean or degraded, without creating a user interaction at `stop: no` nodes.
- [ ] Add focused unit/integration tests:
  - normal clean pass;
  - ordinary blocking failure;
  - Wave0 degradation from `shared_ref_count_floor` after threshold;
  - Wave1/Wave2 degraded eligibility and ineligible structural/authority blocker;
  - trace-write/routing failure cannot manufacture `passed: true`;
  - all public Gate output invariants and exit codes.
- [ ] Run one real disposable bundle through the degradation branch to confirm the CLI/trace/enter-phase/advance-status consumers still preserve the carried debt correctly.

**Done condition:** no public Gate response says both “passed” and “blocking rule failed”; degraded handoff remains routeable and explicitly non-clean; existing direct evidence rules and ledger authority are unchanged.

### Stage 3 - Apply and archive in dependency order

- [ ] Apply and archive Stage 1 first. It only changes how a research request enters the framework and gives the next simulation a trustworthy start.
- [ ] Run the Stage 0 current-head BUG-142 observation from the new entry behavior; update its disposition before any conditional code proposal.
- [ ] Apply and archive Stage 2 second. Use the historical Wave0 degraded trace as a regression case and retain a current real observation for Agent-facing interpretation.
- [ ] Update each bug record with: reproduced/current status, exact contract boundary, evidence path, accepted residual risk, and archive/change link. Do not mark a host-level tool matcher fixed by a Markdown-only test.
- [ ] Move this plan only after both mandatory changes are archived and BUG-142 has PASS closure or its conditional change is independently completed.

### Stage 4C - Conditional only: `make-wave1-reference-closeout-feedback-direct`

Open this only if Stage 0 reproduces a current-head failure after the Agent follows the current accepted materialization route.

- [ ] State the precise missing boundary: e.g. inspect returns an exact submitted candidate but no canonical rendering/write coordinate, or it reports `ledger_coverage` before/mixed with the available materialization root.
- [ ] Reuse `resolveReviewedWave1SubmittedBacking()` and existing canonical path/format/index mechanisms. The change may make the materialization root the unique primary hint and mask dependent legacy/unbacked-reference spam until materialization is tried.
- [ ] If a small writer is genuinely missing, make it an Engine-owned bounded operation accepting only exact returned candidate coordinates and producing only a Phase-owned projection. It must not append ledger rows, modify submitted results, choose sources, perform web search, or become an alternate evidence authority.
- [ ] Test direct candidate -> canonical reference -> index sync -> same inspect, plus absent/invalid submitted backing -> one root failure. Include an Agent-flow observation; do not use a hand-authored reference fixture as evidence that the Agent can execute the handoff.

**Non-goal:** no supplemental work-unit path, ledger mutator, retroactive receipt, artifact-persistence exception, or generic reference recovery subsystem.

## 5. Change Admission Checklist

Each proposal must answer these before `/opsx:apply`:

- [ ] What exact bounded question does this change let a named reader answer?
- [ ] What direct Source of Record owns the answer, and what must remain non-authoritative?
- [ ] What existing mechanism is reused, removed, or prevented from being duplicated?
- [ ] What is the one nearest legal action for Agent feedback, and what is the honest no-path boundary?
- [ ] Which assertions are deterministic contract tests, and which require a real Agent-flow observation?
- [ ] Does the proposal avoid turning an Agent/user instruction into an unsupported host-level enforcement claim?
- [ ] Does the proposal preserve `rb_output_declarations.jsonl` as Engine-written delegated coverage authority?

## 6. Explicit Non-Goals

- One mega-change that combines routing, skills, search tools, Gate state, reference authoring and ledger mutation.
- A global platform hook or a promise that all future host skill matching is controllable from this repository.
- Lowering Wave reference floors, auto-degrading structural/provenance failures, or treating legacy `file:` evidence-summary links as submitted source evidence.
- Reopening Wave1 convergence merely because the historical bundle predates it.
- Making users run ordinary DPT commands or hand-edit `rb_output_declarations.jsonl`, receipts, trace, work-unit index, or status files.

## 7. Completion Signal

The plan is complete only when a new DPT-selected research request demonstrably enters the framework before research work, a degraded Gate handoff cannot be mistaken for a clean pass, and Wave1 Phase-owned reference closeout has either passed a real current-head observation or received its own narrowly justified repair change.

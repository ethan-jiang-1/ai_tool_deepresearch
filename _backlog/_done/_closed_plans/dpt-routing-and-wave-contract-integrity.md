---
title: DPT routing and Wave contract integrity
status: complete_via_archived_narrow_repair_bug_142_suspended_pending_observation
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

| Change | 覆盖 | 有界问题 | 原因 | 状态 |
| --- | --- | --- | --- | --- |
| `harden-dpt-research-entry-routing` | BUG-139, BUG-140 | DPT 已被用户选择时，Agent 在任何研究动作前必须进入正确的 DPT entry。 | 这是入口与 Agent Flow 路由语义，不触碰 runtime Gate/ledger。 | 已于 2026-07-29 [archive](../../../openspec/changes/archive/2026-07-29-harden-dpt-research-entry-routing/)；accepted `run-entry` 与 document contract 已同步。 |
| `make-wave-gate-verdict-unambiguous` | BUG-141 | 一个 Gate 输出必须能让 reader 精确区分 clean pass、degraded handoff 和 failed，且 `passed` 与 blocking failures 始终一致。 | 这是 runtime verdict/transition API 语义；与入口路由独立。 | 已于 2026-07-29 [archive](../../../openspec/changes/archive/2026-07-29-make-wave-gate-verdict-unambiguous/)；accepted `GSK-004` / `RWG-021` 已同步，commit `e2c281133`。 |

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

这里不能诚实承诺“永不被 harness 绕过”：项目文本无法重配所有宿主的 tool injection 或 skill matcher。已归档的 Stage 1 因此只以静态 document contract 验证 repository-owned guidance；没有把 synthetic prompt 或 Playbook trace 报告为 host 行为证据。平台级条件禁用只有在已验证该宿主支持、且不阻断 framework 所需能力时才是后续独立决定。

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
- [x] Capture a read-only baseline for the future proposals: current commit, bundle trace/diagnostic paths, current accepted-spec requirement IDs, and the exact change that introduced Wave1 convergence. Attach it to the proposal evidence rather than copying raw diagnostics into specs.
  - Captured 2026-07-29 at `d2bf0e5a7b5112aa3ee99ad736fb2d4628a679e8`.
  - Historical observation coordinate: `/Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-spec-bloat-context-management`, especially its `rb_trace.jsonl` and the Wave0/Wave1 Gate/inspect outputs invoked by [BUG-141](../_fixed_bugs/BUG-141-wave0-gate-contradictory-passed.md) and [BUG-142](../_suspened_bugs/BUG-142-reference-ledger-circular-dependency.md). The bundle is not present in the current workspace, so no raw trace is copied or treated as current-head evidence.
  - Current accepted boundaries: `GSK-004` (Gate public summary projection), `RWG-017` (Wave Gate Phase-owned projection/delegated evidence split), and `WPG-012` (provenance distinction).
  - Wave1 convergence landed in `3679b7136a4a52c1387b7b3e9bc8831910e123bb` (`feat(wave1): converge reference projections`, 2026-07-28T16:57:45+08:00), with its archived change at `openspec/changes/archive/2026-07-28-converge-wave1-reference-projections/`.
- [x] Launch one disposable **real Agent-flow** current-head Wave1 closeout observation with submitted HTTP(S) source/cache backing. The required proof remains: inspect emits exact materialization candidates; Agent creates canonical backed Phase-owned references; index/packet loop completes; same inspect and Gate no longer ask for an impossible work-unit claim. A fixture remains only deterministic Engine evidence, not Agent-behavior proof.
  - Preflight completed 2026-07-29: `node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --case case-225-heavy-returned-work-closeout --dry-run --json` selected exactly `case-225-heavy-returned-work-closeout` (`agent_behavior`, `real_agent`, real child search/fetch, heavy health profile). The selected case is the existing submitted-backing -> Phase-owned closeout -> inspect proof; its runner requires an explicit `--max-total-budget-usd` before it may launch.
- [x] Preserve the first launch as a non-evidentiary cancelled attempt, not as a BUG-142 result.
  - Command: `node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --case case-225-heavy-returned-work-closeout --max-total-budget-usd 5`.
  - The setup script initially generated a queue payload with the helper default `topic_uid` instead of the case's canonical `tp_225...` UID. The disposable payload was aligned before enqueue; no framework source, ledger, submitted result, receipt, or closeout authority was changed.
  - The Subject claimed `wu-w1-b000-deep-i0001`, but native child result, dry/formal submit, Phase closeout, inspect, case checks, and native completion were never produced. The supervisor was externally cancelled before its configured timeout. Its retained report is [`6649b6c9-94da-4cc2-aef2-b2ab3e0ecccb.json`](../../../.exp-bundles/_reports/6649b6c9-94da-4cc2-aef2-b2ab3e0ecccb.json); it records `CANCELLED`, `native_outcome: null`, `completion: null`, and `cost_usd: null`.
  - This establishes neither a current-head closeout failure nor an Agent/child availability failure. It must not be used to classify BUG-142 fixed or failed, or to claim a missing closeout writer.
- [x] Run focused current-head deterministic coverage for the existing closeout contract.
  - `node --test tests/engine/helpers/wave1-reference-convergence.test.mjs tests/integration/cli/wave1-reference-convergence.test.mjs tests/integration/md/parallel-delegated-reference-materialization.test.mjs` passed 26/26 on 2026-07-29.
  - The coverage proves candidate-exact submitted backing, canonical projection before index synchronization/floor deficit, and Phase-owned materialization guidance. It is not a real-Agent observation and does not classify BUG-142.
- [ ] Complete one valid real-Agent observation from the same declared proof boundary. It must finish natively with a real child return, submitted backing, closeout, inspect, and the four deterministic case checks; a cancellation, missing completion, or a hand-authored child result is `NOT_RUN` for BUG-142.
- [ ] Decide BUG-142 disposition from that observation:
  - PASS: mark it fixed-by-current-head / close it with the observation and retain no third change.
  - FAIL with a direct missing writer/coordinate: refine the proposed Stage 4C feedback change only when that failure identifies a necessary writer/coordinate boundary.
  - User-directed feedback-only proposal: Stage 4C may proceed without this classification, but it SHALL not represent itself as a functional BUG-142 fix.
  - FAIL because Phase Agent ignored explicit legal guidance: treat as entry/role-guidance delivery evidence and amend the narrowest existing guidance surface, not ledger architecture.

**Exit criterion:** both candidate changes have a stable source-of-record map, and BUG-142 is classified by current behavior rather than the historical run.

### Stage 1 - Archived `harden-dpt-research-entry-routing`

- [x] Create one OpenSpec change with delta only for `run-entry` and the narrow behavioral-doc contract it already owns.
- [x] Define the selector precisely: a reachable named existing bundle/map plus continue/inspect intent selects `continue-run-bundle.md`; otherwise explicit DPT selection plus research/deep-research/investigation/report intent selects `RUN.md`. A bare/discovered/unreachable map does not select a run.
- [x] Define the entry invariant: before completing that selected entry routing, Agent SHALL not invoke `research`/`deep-research` or another generic one-shot research shortcut, direct WebSearch/WebFetch for the request, or manual evidence collection/synthesis for the request.
- [x] State the positive next action in every relevant root/framework behavior surface, not merely a list of forbidden tools. The wording distinguishes pre-entry prohibition from the phase-authorized HITL1 probe and later delegated research work.
- [x] Synchronize only the already-contract-owned surfaces: root `AGENTS.md` / `CLAUDE.md`, `RUN.md`, framework behavior files, README reference, and the existing downstream `start-research` pointer. No second policy registry or provider-specific plugin was added.
- [x] Add focused document-contract coverage for all required surfaces and both entry choices. It catches a return to skill-only wording, an atomic-tool omission, a pre-entry `start-research` bypass, or a host-enforcement overclaim.
- [x] Reassess `agent_flow_e2e` rather than adding a synthetic observation: existing Playbook/Subject traces begin after injected instructions, so extending them would add an acceptance-critical adapter and still not prove host skill matching before repository routing. The archived change marks this class not applicable and records the residual boundary instead of manufacturing trace evidence.
- [x] Record residual risk: no verified host-level conditional suppression is promised. A settings/hook remains a separate future decision only if it demonstrates exact host scope without disabling later framework work.

**Done condition:** satisfied by [the archived change](../../../openspec/changes/archive/2026-07-29-harden-dpt-research-entry-routing/). A selected DPT request now has one repository-documented first action, verified by the document contract; no new lifecycle state or runtime bundle field exists. This is not a claim that a host cannot preempt repository guidance.

### Stage 2 - Archived `make-wave-gate-verdict-unambiguous`

- [x] Create one OpenSpec change that modifies the existing Gate skeleton / wave-gate requirements and no evidence or queue ownership contract.
  - `make-wave-gate-verdict-unambiguous` proposal created on 2026-07-29. It preserves degraded routing and narrows the public summary classification; it does not open a ledger, queue, receipt, or runtime-state change.
- [x] Specify the output invariants, including `check.passed === true` iff the routing verdict is legal and `check.failed_rule_ids.length === 0`. A clean pass has neither failed nor degraded rules; a failed Gate has blocking failed rules and no `next`; a degraded handoff has `passed: true`, `degraded: true`, nonempty `degraded_rules`, empty `failed_rule_ids`, and a legal `next`.
  - Accepted `GSK-004` now defines the three mutually exclusive public verdicts; accepted `RWG-021` binds the shared adapter projection and handoff consumer contract.
- [x] Preserve full unresolved quality findings in diagnostics and trace. `degraded_rules` remains the one explicit carrier of quality debt; it must not be silently dropped or reclassified as clean evidence.
- [x] Use a narrow shared projection/helper only if it removes the same summary-classification duplication across Wave0/Wave1/Wave2. Do not add a new persisted verdict state, controller, retry path, or duplicate validator.
- [x] Audit every consumer of `failed_rule_ids`, `degraded`, `degraded_rules`, `passed`, `next`, Gate trace and continuation. Publish a compatibility rule so a consumer cannot treat a degraded handoff as a clean quality pass.
- [x] Update phase/readme guidance to have the Agent consume `check.next` only after confirming whether the handoff is clean or degraded, without creating a user interaction at `stop: no` nodes.
- [x] Add focused unit/integration tests:
  - normal clean pass;
  - ordinary blocking failure;
  - Wave0 degradation from `shared_ref_count_floor` after threshold;
  - Wave1/Wave2 degraded eligibility and ineligible structural/authority blocker;
  - trace-write/routing failure cannot manufacture `passed: true`;
  - all public Gate output invariants and exit codes.
- [x] Run one real disposable bundle through the degradation branch to confirm the CLI/trace/enter-phase/advance-status consumers still preserve the carried debt correctly.
  - Current-head deterministic evidence: `tests/e2e/wave-gate-degradation-policy.test.mjs`; the archive retains its verification-plan coordinate.

**Done condition:** no public Gate response says both “passed” and “blocking rule failed”; degraded handoff remains routeable and explicitly non-clean; existing direct evidence rules and ledger authority are unchanged.

### Stage 3 - Apply and archive in dependency order

- [x] Apply and archive Stage 1 first. [`harden-dpt-research-entry-routing`](../../../openspec/changes/archive/2026-07-29-harden-dpt-research-entry-routing/) now gives the next simulation a trustworthy documented entry boundary; host matcher behavior remains out of scope.
- [x] Launch the Stage 0 current-head BUG-142 observation from the new entry behavior and preserve its cancelled evidence without classifying BUG-142.
- [ ] Complete the Stage 0 current-head BUG-142 observation with native completion before classifying BUG-142 fixed or failed. This is no longer an apply gate for the feedback-only change below; it remains the required proof for an Agent-flow claim.
- [x] Apply and archive Stage 2 second. Use the historical Wave0 degraded trace as a regression case and retain a current real observation for Agent-facing interpretation.
  - Archived at [2026-07-29-make-wave-gate-verdict-unambiguous](../../../openspec/changes/archive/2026-07-29-make-wave-gate-verdict-unambiguous/); sync and implementation committed as `e2c281133`.
- [x] Update each bug record with: reproduced/current status, exact contract boundary, evidence path, accepted residual risk, and archive/change link. Do not mark a host-level tool matcher fixed by a Markdown-only test.
  - BUG-139 and BUG-140 are resolved only for the repository-owned `run-entry` document contract; host-level matcher/tool suppression remains explicitly residual.
  - BUG-141 is resolved by archived `make-wave-gate-verdict-unambiguous` (`GSK-004`, `RWG-021`, commit `e2c281133`).
  - BUG-142 is suspended pending a valid current-head observation; the cancelled case-225 attempt is linked as non-evidence and cannot classify a functional closeout defect. The proposed Stage 4C feedback refinement makes no contrary claim.
- [x] Move this plan after both mandatory changes are archived and the conditional change is independently completed.
  - Stage 4C was archived and committed as `b68c24357`; BUG-142 is suspended pending a valid real-Agent observation and is not represented as a functional bug fix.

### Stage 4C - Archived `make-wave1-reference-closeout-feedback-direct`

The user directed this proposal after current-head deterministic convergence
coverage passed. It narrows only the closeout feedback projection; it does not
claim that current head lacks a writer or that BUG-142 has reproduced in a real
Agent flow. The unresolved Agent-flow observation remains its own evidence
boundary.

- [x] State the precise bounded boundary: when an exact submitted candidate can materialize a canonical projection, it is the one primary closeout hint within the existing convergence branch; its index/floor outcomes stay deferred until same-check rerun, while separately evaluated legacy/index/ledger and authority roots remain visible.
- [x] Reuse `resolveReviewedWave1SubmittedBacking()` and existing canonical path/format/index mechanisms. The proposed change does not add a writer; it makes the materialization root direct before dependent feedback can compete.
- [x] Preserve authority limits: no ledger mutation, submitted-output change, receipt rewrite, supplementary path before a true post-closeout deficit, source choice, web search, or alternate evidence authority.
- [x] Create [the OpenSpec proposal](../../../openspec/changes/archive/2026-07-28-make-wave1-reference-closeout-feedback-direct/) with `proposal.md`, `design.md`, `specs/`, `tasks.md`, and `verification-plan.yaml`.
  - Proposal status: strict OpenSpec validation passed and `check-verification-routing --mode plan` accepted its 4 unit/integration claims.
- [x] Apply and archive the narrow feedback projection, guidance, tests, and `v0.60` release tasks.
  - Archived at [2026-07-28-make-wave1-reference-closeout-feedback-direct](../../../openspec/changes/archive/2026-07-28-make-wave1-reference-closeout-feedback-direct/) and committed as `b68c24357`. A real-Agent observation may be added as supplemental evidence, but is not a substitute for the deterministic feedback contract.

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

The plan is complete: the archived DPT-selected entry contract remains synchronized without claiming host enforcement, a degraded Gate handoff cannot be mistaken for a clean pass, and Wave1 Phase-owned reference closeout received its narrowly justified repair change. BUG-142 is suspended pending a separate real-Agent-flow classification; its cancelled observation is not closure evidence.

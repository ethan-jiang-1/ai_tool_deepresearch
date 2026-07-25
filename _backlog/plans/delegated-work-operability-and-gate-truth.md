---
title: Delegated work operability and gate truth
status: change_1_and_2_archived_change_3_and_4_evidence_gated
created: 2026-07-25
reviewed: 2026-07-25
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
| 118 | abandoned attempt 后的 recovery 可达性 | 原报告的 lifecycle dead-end 未在 HEAD 复现；但 terminal snapshot 到 successor demand 仍是可收敛的 constructibility debt | 只允许从 immutable terminal snapshot 派生一次 fresh replacement demand；不能强行把 `abandoned` 改写成 `timed_out` |
| 119 | wave1 enqueue 消失/assignment mode 缺失 | Mixed: old input defect, current guidance now covers it | 用 invalid-card non-mutation + valid-card state transition 证明；不以旧 shell pipeline 的观察推断 queue state |
| 120 | Wave1 reference contract 未交付 | Static contract already covered at HEAD | `shared-reference-template.md`、Wave1 template and actor guidance 已列 exact metadata/binding/sections；补真实 loaded-guidance proof 后可关闭 |
| 121 | fatigue 缓存旧 failed rules | Fresh current gate evidence did not reproduce the caching premise | 用“同一 fresh bundle，修正 bytes 后高 attempt 重跑”的 red/green case 检验是否重算；不加 `--reset-fatigue` 逃生路径 |
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
M3: contract delivery                 M4a: successor constructibility
claim facts -> envelope -> roots      terminal snapshot -> one queue demand
                                                  -> existing claim -> submit
                                                            |
M4b: queue admission / health          submitted immutable ledger
stdout + valid card -> queue fact                |
             -> derived health                  v
M5: truthful evaluation
fresh evaluator facts -> root-first Gate feedback -> normal/degraded only when eligible
```

M3, M4a, M4b and M5 read different direct authorities. They must not become one "reliability controller" change. A remedy in one layer must not make another layer's authority mutable or optional.

## OpenSpec Change Map

## Current Status

`make-delegated-work-contracts-constructible` has completed **Apply** and was archived on 2026-07-25 in commit `82996180e`. Its implementation boundary is `BUG-114` and `BUG-115`: one validator-owned contract lineage at claim and actor authoring entry, plus one selected primary root for existing candidate feedback. The final implementation distinguishes supplied versus omitted CLI input: a present empty `--actor-*` option is malformed pre-trace input, not the existing omitted-observation audit path.

Apply completion establishes the approved code, tests, release metadata, strict OpenSpec/governance checks, and honest evidence record. The selected real-actor case is `NOT_RUN` at its explicit external budget boundary: local runtime/provider checks and dry selection passed, but no USD cap was authorized. No fixture or hand-authored actor artifact substitutes for that result.

Fresh disposable-bundle evidence on 2026-07-25 falsified the **original** Change 2 premise: 92 focused tests proved an abandoned `b000` attempt can be followed by an explicitly enqueued and CLI-claimed `b001` rerun, timeout requeues a claimable fresh work ID, invalid Wave1 assignment mode rejects without queue mutation, and a valid enqueue returns parseable stdout JSON and persists demand. Therefore `BUG-116`, `BUG-119`, and `BUG-122` do not enter Change 2; neither `abandoned -> timed_out`, filesystem discovery, raw `unblock`, nor a second replacement controller is justified.

Change 2, `make-terminal-work-replacement-direct`, completed Apply and was archived on 2026-07-25 in commit `edc3c614f`. It is a narrow constructibility improvement, not a liveness repair: `replace` uses the terminal attempt's immutable queue snapshot as the sole Engine input to create one auditable successor demand. The Phase Agent no longer manually rebuilds an allegedly equivalent task card or invents a successor identity. The operation creates demand only; existing role-bound `claim` remains the sole allocator of a fresh work ID. Its focused schema, lifecycle, CLI, and Wave-guidance regression assets passed 62/62; strict OpenSpec, verification-routing, requirement-registry, and main-spec checks passed, and the accepted delta specs were synced before archive.

Fresh current-gate evidence on 2026-07-25 also does **not** authorize the future Gate candidate, `ensure-wave-gate-reevaluation-freshness`. The real lifecycle loop exercised failure, direct repair, and a third Engine-visible attempt at the fatigue threshold; that attempt passed and emitted the normal next-phase handoff. Wave1 depth-review tests retain Gate/inspect failed-rule parity, and the attempt diagnostic tests prove prior diagnostics are compared with, not substituted for, the current evaluation. `BUG-121` therefore has no reproduced current caching defect and no `--reset-fatigue`, force-re-evaluate, or stale-projection change is justified. A new proposal requires a fresh minimal repro in which a corrected direct fact remains in the current Gate's `failed_rule_ids`.

`BUG-120` remains outside Change 1's closure claim: the delegated actor task can prove supplied-task delivery and native-chain compatibility, but cannot prove the Phase Agent loaded its separate reference guidance.

### Post-Change-2 M4b Entry Decision

On 2026-07-25, the three Change-3 entry axes were rerun against current framework assets. `tests/integration/cli/operate-queue.test.mjs` and `tests/integration/cli/operate-queue-validation.test.mjs` passed 44/44 on their fresh disposable-bundle fixtures. They cover parseable queue command output and exit status, valid/invalid topic and Wave1 assignment-mode admission with non-mutation refusals, and the queue location/repair invariants.

A separate normal-path capture used `new-disposable-bundle.mjs` and only `operate-queue enqueue` as the authority mutation. The command returned exit `0`, one stdout JSON result with `ok: true`, an empty stderr stream, `m4b-entry-probe` in `active_window`, `queue_health: "thin"`, and `stop_authorization_state: "unauthorized_continue_required"`. The retained capture hashes were `rb_queue.json` before `619a33e1453bcbef1e2577e44a906f490c262f4fa0a9393f1ef0dd0b91e6d129`, after `87882025ce29e692797981df06d2d24627c11bfe691a8a67c4260fb33b772409`, and trace `c83d31c85b3de5526459f7438b0396af4841630a9a3a7af233d45da36d6424b1`. The temporary bundle was removed after capture; this is deterministic CLI evidence, not real-actor-flow closure evidence.

No M4b entry red exists. Therefore `make-queue-reentry-outcome-truthful` remains a candidate name only, and no Change 3 proposal or implementation folder is created. The next possible behavior proposal remains gated by a newly captured direct owner failure.

### Change 2/3 Scope Split And Its Consequences

The historical Change 2 candidate mixed two different questions: (a) whether a terminal attempt can mechanically yield one successor demand, and (b) whether queue CLI rendering, task admission, and derived queue health tell the truth about already-existing demand. Fresh evidence rejected the reported current failure for (b). It did not make it correct for the Phase Agent to reconstruct a successor task card from a terminal attempt's immutable snapshot.

The split is therefore deliberate:

- **Change 2, now archived, owns only M4a:** terminal record + matching immutable snapshot -> one lineage-bound queue demand -> existing role-bound claim. It makes no claim about existing `operate-queue` stdout, Wave1 card admission, or queue-health repair.
- **Change 3, `make-queue-reentry-outcome-truthful`, owns M4b if and only if a fresh red enters it:** BUG-116, BUG-119, and BUG-122 remain tied to their distinct direct owners. This is a named evidence-gated candidate, not an approved omnibus repair. Its proposal must narrow to the first demonstrated direct owner; it may cover more than one report only when one reproducer proves one shared CLI/admission/mutation path.
- **Change 4, `ensure-wave-gate-reevaluation-freshness`, stays downstream:** a stale Gate verdict cannot be diagnosed until the producer, replacement-demand, and any actually reproduced queue facts are all truthful.

| Historical Change 2 item | Direct owner now | Current disposition | Re-entry proof and consequence |
|---|---|---|---|
| `BUG-116` stdout/stderr claim | `operate-queue` result rendering and the CLI's stdout/stderr/exit boundary | Current code and focused regression contradict the incident's random-stream premise. Change 2 does not touch this surface. | Fresh disposable bundle shows success JSON only on stderr or no parseable stdout JSON, with stdout/stderr/exit and queue bytes retained. Enter Change 3 only for that direct CLI-result owner, unless the same repro also proves one admission/health owner. |
| `BUG-118` lifecycle dead-end | terminal work-unit record, manifest snapshot, terminal-history row, then normal queue claim | The old queue dead-end did not reproduce. The remaining deterministic reconstruction burden is Change 2's entire scope. | If a legal current or Change-2-derived demand is present but normal role-bound claim cannot allocate it, retain queue/index/trace snapshots and propose a new lifecycle claim change. Do not widen `replace` by assumption. |
| `BUG-119` Wave1 assignment mode | queue admission validation, Wave1 task-card contract, and legal queue locations | Current valid/invalid admission tests contradict the incident's silent-loss premise. Change 2 copies a validated historic snapshot; it never repairs modes. | Valid current `primary`/`supplementary` card is accepted yet absent from every legal location or unclaimable while direct authority remains valid. Enter Change 3 only for that direct admission owner, unless the same repro shares a root with BUG-116/122. |
| `BUG-122` queue health / stop label | `syncQueueHealth()` after successful queue mutation | Current enqueue recalculates derived health; no raw `unblock` is legal or needed. Change 2 uses the same normal admission path. | Valid enqueue leaves direct demand inconsistent with a health/stop projection that blocks its documented next action; retain command result and before/after queue bytes. Enter Change 3 only for that direct derived-health owner, unless the same repro shares a root with BUG-116/119. |
| `BUG-123` immutable ledger concern | submitted-ledger contract plus Change 2's non-mutation invariant | Change 2 may create only a new demand and later a new work unit. It cannot amend a submitted declaration, result hash, or ledger row. | Any Change 2 implementation that needs historical mutation blocks Apply. The separate supplementary-new-source lifecycle remains the evidence needed to close BUG-123's broader novelty claim. |

### Sequencing And Decision Gates

```text
0. evidence and scope lock                         [complete]
        |
        v
1. make-delegated-work-contracts-constructible     [archived]
        |
        v
2. make-terminal-work-replacement-direct           [archived]
        |
        v
3. make-queue-reentry-outcome-truthful             [candidate; fresh-red-gated]
   ├── no fresh red -> no Change 3 proposal
   └── fresh red    -> proposal narrows to the demonstrated direct owner
        |
        v
4. ensure-wave-gate-reevaluation-freshness         [candidate; fresh-red-gated]
```

The numbers and names are stable handles for the planned concerns, not permission to create empty OpenSpec folders. Change 3 is the named home for a reproduced M4b defect, but its actual proposal may own only one direct root; its name must not be used to force three unrelated fixes into one change. Change 4 begins only after Change 3 has either produced no red or archived any required remedy.

| Step | Scope / owner | Entry criterion | Exit criterion | Explicitly not allowed |
|---|---|---|---|---|
| 0 | Evidence and scope lock | Existing incidents and current contracts available | Each BUG-114--123 has disposition, direct owner, evidence class, and re-entry rule | Treating production edits, console confidence, or chat memory as proof |
| 1 | Change 1 (archived) | BUG-114/115 constructibility gap | Archived implementation and honest real-actor boundary | Reopening its actor contract inside lifecycle work |
| 2 | Change 2 / M4a | Terminal snapshot contains all successor-demand facts; C1 is accepted | Archived in `edc3c614f`: one replacement demand is derived without work-ID allocation, historical mutation, or manual equivalent-card authoring | Queue renderer/admission/health redesign, terminal-status rewrite, auto-claim, Gate or ledger changes |
| 3 | `make-queue-reentry-outcome-truthful` / M4b | Change 2 deterministic tests are settled; capture the three named BUG-116/119/122 probes on fresh bundles. A proposal requires a fresh red. | No red: record evidence and create no Change 3 folder. Red: its proposal isolates the first direct owner; grouping is allowed only from shared evidence. | Bundling three reports by historical narrative, raw unblock, manual queue repair |
| 4 | `ensure-wave-gate-reevaluation-freshness` / M5 | Change 2 is settled; Change 3 has no red or its required remedy is archived; a corrected direct Gate fact still appears in current `failed_rule_ids` | One current evaluation feeds Gate/inspect/hints/degradation with unchanged fail-closed roots | Reset/force bypass, stale diagnostic as verdict, degradation of provenance/queue/receipt/ledger roots |

### Why This Order

1. **Change 1 first:** it gave the Agent a constructible candidate contract. Without it, replacement and Gate observations could still be artefacts of guessed producer input.
2. **Change 2 archived:** it removed only the mechanical re-authoring of a successor demand from a terminal snapshot. It depends on current queue admission but does not redefine it.
3. **Change 3 after Change 2:** the new operation deliberately reuses normal admission. Its fresh evidence is the earliest honest basis for the named queue-reentry candidate. If no direct M4b defect is red, Change 3 does not exist as an OpenSpec proposal; if one is red, its scope follows that owner, not the old bug bundle.
4. **Change 4 last:** only a Gate failure that survives truthful producer, successor, and queue facts can be called an evaluator-freshness defect.

Every proposal/design must state its **owns**, **out of scope**, direct source of truth, one next action, deleted or avoided control complexity, and focused negative test. This is the required semantic-precision and net-simplification review; it prevents a new controller from being justified merely by the name “recovery.”

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

The output of step 0 is a short evidence matrix: **reproduced current defect / static defect already fixed / invalid premise / requires external real-actor evidence**. The scope lock for Change 2 and the current no-red results for the original queue/Gate reports have been recorded above. Repeat this protocol only when Change 3 or Change 4 needs a fresh entry decision. A new behavior change normally requires a reproduced current defect; Change 2 is the explicit, narrower exception because it does not repair the falsified liveness premise, but removes a separately identified deterministic reconstruction burden using the terminal snapshot that already owns every successor-demand fact.

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

### 2. `make-terminal-work-replacement-direct` (archived)

The original liveness hypothesis in steps 0.3--0.4 did not reproduce. This proposed scope is instead warranted because an eligible terminal attempt already contains the immutable queue snapshot required for a successor, but the legal path still asks the Phase Agent to manually re-author an equivalent card and choose a fresh queue identity. The Engine can make that mechanical derivation one auditable transition without choosing semantic work or allocation actor.

Scope:

- Use the terminal work-unit record and its immutable queue snapshot as the direct facts for an explicit replacement-demand operation. `failed` and `abandoned` retain their terminal meaning; `timed_out` keeps its existing retry-demand path.
- Create at most one fresh successor demand with audited parent-attempt lineage, preserving the snapshot's kind, canonical Topic, delegated role, assignment mode and output obligation. Reject a submitted attempt, conflicting live/submitted successor, or invalid historical snapshot before mutation.
- Return the generated replacement `queue_item_id` plus exactly one next operation: the existing role-bound `claim`. The operation does not allocate a work ID, because only claim may do so after a current actor observation.
- Make the Phase use this operation after the eligible `fail_and_replace` boundary, deleting manual equivalent-card authoring and filesystem discovery from normal recovery guidance. Its machine result follows existing stdout JSON / non-zero refusal conventions.

Non-goals:

- No raw `unblock`, no direct `rb_queue.json` mutation, no queue-health override, and no watcher/retry daemon.
- No `abandoned -> timed_out` rewrite merely to reach `late-submit`; these names have distinct audit meaning. The original work stays terminal and only its successor demand is new.
- No automatic claim, no hidden batch allocation, and no filesystem discovery. A fresh work ID appears only in the normal claim result.

Required proof: terminal failed/abandoned -> one derived replacement demand -> normal role-bound claim lifecycle; timed-out existing retry remains unchanged; submitted/live-successor/invalid-snapshot duplicate replacement rejects without mutation; replacement lineage and preserved snapshot contract are exact; CLI stdout/stderr/exit contract test; and a clean-bundle regression proving historical terminal state is not mistaken for current demand.

### 3. `make-queue-reentry-outcome-truthful`

This is the named home for the former queue portion of Change 2. It is deliberately **not proposed** today: current evidence says that the three historic reports are not red. Its bounded question is: after a legal queue-entry operation, do the command result and the authoritative queue state tell the Agent whether a demand was committed and which existing next operation is legal?

The name does not authorize a queue controller. It preserves the distinctions that change the answer to that question: malformed/refused input with no mutation; accepted durable demand in a legal location; ordinary role-bound claimability; and a derived health/stop projection that agrees with direct demand. `replace` from Change 2 must reuse those existing facts; it does not get a parallel health or result authority.

Entry evidence:

- After Change 2's deterministic tests, reproduce one of the three cases on a fresh disposable bundle and retain stdout, stderr, exit code, queue/index bytes, and the directly relevant health projection.
- `BUG-116`: a successful queue command has no single parseable stdout JSON result, or a refusal reports a successful exit.
- `BUG-119`: a schema-valid `primary` or `supplementary` Wave1 card is accepted but is absent from every legal location or cannot be normally claimed while its direct authority remains valid.
- `BUG-122`: a valid native entry leaves direct demand inconsistent with a health/stop projection that blocks the documented next action.

Scope if a red is reproduced:

- The Change 3 proposal owns only the first direct failing boundary: CLI result rendering for BUG-116, admission atomicity for BUG-119, or post-mutation derived health for BUG-122.
- It may group reports only when the retained reproducer proves one shared implementation owner. Otherwise the first proposal keeps this name and its narrow owner; the plan must be updated with separately named later work before any unrelated repair is added.
- Its successful result must leave one direct queue truth path and one next existing operation, normally role-bound `claim`. It must not add a new queue status, a second health authority, a generic repair command, or a recovery daemon.

Required proof: the captured red becomes green on a fresh bundle; invalid input remains non-mutating and non-zero; valid demand remains visible and normally claimable; direct queue state and any derived health projection agree; and the other two report axes remain unchanged unless the one shared root legitimately owns them.

### 4. `ensure-wave-gate-reevaluation-freshness`

This is deliberately separate from producer and queue-reentry changes. It is not proposed today because the fresh current evidence did not reproduce the caching premise.

Scope if a fresh red is reproduced after Change 3 has no outstanding remedy:

- Locate the single evaluator/result construction path that carries obsolete `failed_rule_ids` after the direct fact is corrected.
- Remove or invalidate that stale projection at its owning boundary, then prove Gate, inspect, hints and degradation eligibility consume the same fresh evaluation.
- Preserve fatigue as diagnostic/eligibility policy, never as a substitute evaluator or a mutation of gate truth.

Non-goals:

- No universal `--reset-fatigue` or `--force-reevaluate` bypass.
- No degradation for queue, receipt, ledger, provenance, identity/binding, required structure or trace roots.
- No use of high attempt count as evidence that a repaired rule should pass.

Required proof: corrected direct artifact removes its own failed rule on a high-attempt rerun; an unchanged independent provenance root remains failed and ineligible; normal eligible quality-only degradation behavior remains covered.

### Independent Closure Evidence (Not Changes)

- `BUG-117` is an evidence-backed rejection of an unsafe degraded-pass request. Its closure is the documented provenance fail-closed contract and its upstream legal submit/replacement paths, not a new bypass change.
- `BUG-120` remains `NOT_RUN` at the real-actor budget boundary. Only a real loaded-guidance observation can close that delivery claim; it does not expand Change 1, Change 2, Change 3, or Change 4.
- `BUG-123` has two deliberately separate proofs: Change 2 must prove that replacement never mutates a historical ledger row, while the broader supplementary-new-source lifecycle must independently prove that a new immutable row supplies the novelty fact. Neither proof authorizes an amend API. A red in that independent lifecycle is a new direct-owner finding, not scope silently added to Change 2.

## Closure Rules

- Close BUG-117 as a misdiagnosed request only after the plan records the accepted provenance fail-closed contract and its upstream operability dependencies.
- Close BUG-118's original dead-end report by evidence-backed disposition, not by claiming that Change 2 repaired a non-reproduced queue failure. Change 2 closed only its separate manual-successor reconstruction burden through the archived and verified `edc3c614f` implementation.
- Close BUG-120 when a loaded-guidance test proves the current Phase/actor `requires` chain delivers the complete template; static source inspection alone is not a real Agent-flow claim.
- Change 2 proves only BUG-123's historical non-mutation invariant. Close BUG-123's broader novelty claim only after the supplementary-new-source lifecycle test passes; it is not closed by adding an amend API.
- BUG-116, BUG-119, BUG-121 and BUG-122 may be reclassified only from captured fresh evidence, never from an incident command transcript that suppressed stderr or reused contaminated state.
- An evidence-backed invalid premise or misdiagnosed request is a disposition, not a fictitious implementation fix. A real defect is "fixed" only when its named OpenSpec change is proposed, applied, tested at the correct verification layer, and archived. A static wording update, console output, or manual bundle repair is not closure evidence.

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
- `openspec/changes/archive/2026-07-25-make-terminal-work-replacement-direct/`
- `_backlog/bugs/BUG-114-*.md` through `BUG-123-*.md`

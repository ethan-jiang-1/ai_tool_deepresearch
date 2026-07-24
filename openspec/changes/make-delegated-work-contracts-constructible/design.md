## Context

v0.47 的 delegated work 已经有严格且正确的 authority chain：claim 的 actor observation 由 `ActorObservationInputSchema` 与 `work-unit-actor.mjs` 裁决；claim 生成 manifest、beacon、result schema、task 和 spawn prompt；submit/dry-submit 从 attempt-bound facts、output/cache/source validators 与 receipt 中裁决；candidate projection 产生 repair scope/action。v0.40 又已将 canonical role guidance 和 direct-output minimum authoring semantics 投影到 actor task。

BUG-114/115 说明的是交付形状仍不可用，而不是原有 acceptance contract 缺失。actor observation 的四个合法 tuple 存在于 schema super-refine 中，但 invalid CLI input 只得到 Zod 的 generic error；completion facts 虽已出现在 task 的多个段落中，却没有一个明确优先、可完整复查的 authoring entry；candidate action 则由 scope-precedence 选取，而 `rejectionGuidance()` 仍从 sorted `violations[0]` 取详情。这造成 Engine 保留 static lineage、Agent 承担猜测与试错的责任错配。

本设计遵循两条 evolution direction：

- Simple Reliable Control：直接 authority -> 一个已有 checker -> 最早可行动 root -> 一个最近动作；新增 surface 必须是 projection，并删除重复 decision path。
- Helper-Oriented Agent：正常路径不需要用户决定。Agent 做 current role probe、真实 authoring、same-check repair；Phase Agent 做 claim/dry-submit/submit；Engine 只输出 deterministic verdict 与静态导航。通用 HITL1 access 不因此变成 role proof。

## Goals / Non-Goals

**Goals:**

- 让合法 actor-observation vocabulary 从其唯一 closed definition 直接投影到 claim decision point。
- 让一个 newly claimed actor 可以从一个 generated completion contract 得到完整、attempt-bound authoring facts，而不用把多个文件当作竞争性说明。
- 让 `recommended_action`、`primary_root_code` 与 public repair details 永远指向同一 candidate root，同时保留独立 diagnostics。
- 删除 task 中关于完成契约的重复 fragment 与 formal-rejection 的第二个 primary selector，保持现有 submit/validator/timeout authority。

**Non-Goals:**

- 不改变四种 observation tuple、generic HITL1 与 native role probe 的证据边界、fallback eligibility、queue mutation或 actor selection。
- 不新增结果 starter 文件、预填 result/receipt/cache、persistent marker/schema version、ledger/provenance mutation或 Gate rule。
- 不让 Engine 写研究内容、选择 probe outcome、选择 repair strategy，或建设 controller/watcher/retry tree。
- 不把 terminal replacement、queue health、wave Gate freshness、BUG-117/118/119/121/122/123 并入本 Change。

## Decisions

### D1. One closed observation table owns validation and explanation

`schema/contracts/work-unit.mjs` will replace the boolean tuple expression with one immutable `ACTOR_OBSERVATION_CASES` table. Each row contains the legal outcome/source/reason shape, its semantic label, and the existing legal continuation category. `ActorObservationInputSchema` validates against this table; `work-unit-actor.mjs` derives an output-only `actor_observation_contract` projection from exactly the same table and planned role. Neither projection nor table persists a probe result.

`claimWorkUnits` will consume invalid input through the actor-decision path rather than allowing raw Zod text to escape the CLI. The response identifies supplied invalid field/value combinations, planned role, the table-derived valid cases and the same claim checkpoint. It does not synthesize a concrete rerun tuple when the real probe result is unknown: its one next action is the existing native-probe boundary. A no-observation response and an unavailable/fallback response use the same projection but retain their existing respective legal action.

This preserves the fact model: a current `available` claim must still be `native_probe/probe_succeeded`; `unknown/not_observed/observation_required` is still non-allocation; generic HITL access remains diagnostic context, not evidence. Invalid input remains pre-trace and pre-mutation.

Rejected alternatives:

- Accept `available/not_observed`: it turns an absence of role observation into positive actor provenance.
- Reuse HITL1 `research_access`: that is a broad environment observation, not proof that the exact registered delegated role can execute now.
- Put combinations only in a Markdown playbook: it drifts from the Zod validator and is unavailable to a caller that receives CLI feedback.

### D2. One generated completion contract replaces task-level completion fragments

`work-unit-envelope.mjs` will render a bounded `completion-contract.md` beside the existing generated task/schema/beacon. It is a regenerable projection, not a new manifest path, field, state entry or acceptance input. The renderer receives only existing attempt facts and delegates descriptions to their existing owners:

| Projection section | Direct Source of Record | It does not own |
|---|---|---|
| Exact binding/result starter | manifest + generated result schema | result file or acceptance |
| Required outputs | resolved `output_contract.required_outputs[]` + direct-output descriptor | content verdict |
| Receipt skeleton | existing lifecycle receipt event contract | runtime receipt lines |
| Cache/source facts | existing cache policy and output/source contract | cache/source evidence |
| Final check | existing dry-submit command | submit transition |

`task.md` retains task purpose, role guidance, runtime path map and lifecycle boundaries, but its first authoring instruction points to this contract and its duplicate checklist/starter/output/cache/receipt completion content is removed or reduced to a non-normative pointer. Spawn prompt names the same absolute and bundle-relative projection path. The contract itself lists its authority refs so a debugger can inspect the true source without treating the projection as an override.

No write happens merely because a contract was generated. In particular, `result.json`, receipt JSONL, cache leaves, source claims, research output and ledger are absent until an actor produces them. Generated projections are used only for claims made after this version; old claimed work units retain their existing task/schema/beacon surfaces and never migrate.

Rejected alternatives:

- Another `result-starter.json` or `--generate-starter`: current task already has a starter; a separate file repeats only one fragment and risks being mistaken for an actor-authored candidate.
- A more detailed static role document as the sole answer: role docs are rich, cross-attempt guidance, while identity/path/nonce/allowed outputs are attempt-specific.
- A new validator based on the completion Markdown: the existing submit/evaluator remains the sole pass/fail path.

### D3. Candidate root selection becomes the single public primary selector

`work-unit-candidate-projection.mjs` already decorates all evaluated violations with phase order and repair scope, then selects an action by scope precedence. It will expose one pure selection result containing the selected public violation as well as `recommended_action` and `primary_root_code`. `dry-submit`, formal submit rejection, and timeout-preflight will consume that result; formal rejection will no longer separately use `violations[0]` for `repair_kind`, `missing_fact`, `write_to`, and `rerun`.

The collector retains short-circuit structure rather than adding a new dependency engine:

1. missing/corrupt index, record, or claimed status returns immediately;
2. unavailable manifest/beacon suppresses checks requiring their resolved output contract;
3. an unparseable candidate result suppresses output declaration, cache and source-claim checks that need normalized result;
4. a failed cache contract suppresses source-claim checks that depend on validated cache;
5. receipt, identity and queue roots are retained only when their current direct facts are independently evaluable.

The output keeps all independently evaluated violations. The primary root is a decision aid, not a claim that all other roots disappeared. If an actor-owned semantic root outranks a mechanical declaration root, primary feedback directs the existing actor/replacement boundary; the mechanical coordinate remains a secondary, explicit diagnostic. No caller must infer which root generated the given action.

Rejected alternatives:

- Return only one violation: loses independent facts and creates serial trial-and-error.
- Return all violations without a root: recreates the current “which one first?” decision burden.
- Add a generic root graph or recovery dispatcher: current collector ordering and existing checker prerequisites are sufficient; a graph/state layer would validate the validator instead of simplifying it.

### D4. Compatibility, test ownership, and control-surface accounting

New regular production surfaces are limited to the generated completion contract and output-only claim/root projections. They carry no persisted truth. Existing submitted, terminal, and currently claimed attempts remain readable without backfill; old code can ignore the extra generated file and new code still reads historic envelope inputs.

Apply target manifest:

| Surface | Change | Authority and net simplification |
|---|---|---|
| `schema/contracts/work-unit.mjs`, `work-unit-actor.mjs` | one observation case table plus output projection | reuses Zod source; removes opaque generic-combination path |
| `work-unit-lifecycle.mjs`, CLI presentation | structured invalid/no-claim contract | reuses claim decision; removes brute-force parameter guessing |
| `work-unit-envelope.mjs` | generated completion contract; task/spawn point to it | reuses manifest/schema/policy/receipt owners; removes duplicated task fragments |
| `work-unit-candidate-projection.mjs`, `work-unit-submit.mjs`, timeout preflight | one selected root feeds every public primary field | reuses candidate selector; removes `violations[0]` selector |
| `tests/` and existing permitted Agent-flow asset | focused parity and behavior-bound proof | no mock claims of real actor work |

There is no new persistent state, blocking rule, checker, CLI command, fallback, retry, recovery operation, or success authority. The only blocking conditions remain existing schema/submit facts. Each new output surface fails with the one existing next action: role probe then claim, read completion contract then author/write, or rerun the same dry-submit / report existing boundary.

## Risks / Trade-offs

- [Projection drifts from contract owner] -> Render only from current authority objects; add parity tests across Wave0 and primary/supplementary Wave1, including actual identity/paths/roles/cache/receipt facts.
- [Completion file becomes another unread document] -> Make it the first task/spawn authoring entry and remove duplicate task-level completion sections; keep role guidance separate only for semantic research expertise.
- [Valid tuple list invites arbitrary selection] -> State that list shows legal shapes, not a chosen fact; an invalid/missing observation has exactly the native-probe action and no allocation.
- [Short-circuit hides useful failure detail] -> Suppress only facts that cannot be evaluated honestly; retain independent receipt/queue/identity roots and their own coordinates.
- [Public primary root changes integrations] -> Preserve `violations[]`, reason codes, recommended action and existing repair field names; add only consistency, then test existing CLI consumers.
- [Real actor-flow cannot be run in current host] -> Mark that proof `NOT_RUN` with its actual external boundary. Deterministic tests only prove delivery/parity, never actor behavior or research quality.

## Migration Plan

1. Before target edits, create implementation evidence and validate this Change's `verification-plan.yaml`; record current v0.47 behavior on a fresh disposable bundle without mutating a diagnostic production bundle.
2. Add focused red tests for invalid tuple projection/no mutation, completion-contract parity/no pre-created authority files, primary-root field consistency and prerequisite masking.
3. Implement the observation table/projection, then envelope projection and task/spawn consolidation, then route every public candidate feedback path through the one selected root.
4. Run unit/integration/package hygiene/regression checks. Run the selected real Agent-flow case when authenticated runtime and budget exist; otherwise retain its native `NOT_RUN` outcome.
5. Update release metadata to v0.48, run verification-routing/governance/OpenSpec strict checks, and record exact evidence boundaries before archive.

Rollback removes the new output-only projections and restores the old task rendering. Because no schema/state/ledger migration occurs, existing completion-contract files are ignorable and existing claimed/submitted attempts require no data rewrite. A code rollback after v0.48 must keep accepting all existing authoritative attempt surfaces; it need not recreate or delete generated projection files.

## Open Questions

No apply-blocking design question. The real actor-flow run is an evidence availability question, not a reason to alter the deterministic contract or fabricate a completion result.

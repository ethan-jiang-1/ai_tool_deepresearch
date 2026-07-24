## Context

v0.47 的 delegated work 已经有严格且正确的 authority chain：claim 的 actor observation 由 `ActorObservationInputSchema` 与 `work-unit-actor.mjs` 裁决；claim 生成 manifest、beacon、result schema、task 和 spawn prompt；submit/dry-submit 从 attempt-bound facts、direct-output/cache/source validators 与 receipt 中裁决；candidate projection 产生 repair scope/action。v0.40 又已将 canonical role guidance 和 direct-output minimum authoring semantics 投影到 actor task。

BUG-114/115 说明的是交付形状仍不可用，而不是原有 acceptance contract 缺失。actor observation 的四个 case shape（七个精确 tuple）存在于 schema super-refine 中，但 invalid CLI input 只得到 Zod 的 generic error；completion facts 虽已出现在 task 的多个段落中，却没有一个明确优先、可完整复查的 authoring entry。更深的缺口是 direct-output descriptor 只说 Wave0 为“top-level YAML array”，cache policy 只说有三个 leaf 文件，不能交付 evaluator 已知的 metadata field 与 `meta.json` source-mapping 约束；candidate action 则由 scope-precedence 选取，而 `rejectionGuidance()` 仍从 sorted `violations[0]` 取详情。这造成 Engine 保留 static lineage、Agent 承担猜测与试错的责任错配。

本设计遵循两条 evolution direction：

- Simple Reliable Control：直接 authority -> 一个已有 checker -> 最早可行动 root -> 一个最近动作；新增 surface 必须是 projection，并删除重复 decision path。
- Helper-Oriented Agent：正常路径不需要用户决定。Agent 做 current role probe、真实 authoring、same-check repair；Phase Agent 做 claim/dry-submit/submit；Engine 只输出 deterministic verdict 与静态导航。通用 HITL1 access 不因此变成 role proof。

## Goals / Non-Goals

**Goals:**

- 让四个 case shape / 七个精确合法 actor-observation tuple 从其唯一 closed definition 直接投影到 claim decision point，并保持 omitted observation 与 malformed supplied input 的既有/新审计边界清楚分离。
- 让一个 newly claimed actor 可以从既有 `task.md` 的一个 generated Completion Contract section 得到完整、attempt-bound authoring facts，而不用把多个并列 section 或文件当作竞争性说明。
- 让 `recommended_action`、`primary_root_code` 与 public repair details 永远指向同一 candidate root，同时保留独立 diagnostics。
- 删除 task 中关于完成契约的重复 fragment 与 formal-rejection 的第二个 primary selector，保持现有 submit/validator/timeout authority。

**Non-Goals:**

- 不改变四个 observation case shape / 七个精确 tuple、generic HITL1 与 native role probe 的证据边界、fallback eligibility、queue mutation或 actor selection。
- 不新增结果 starter 文件、预填 result/receipt/cache、persistent marker/schema version、ledger/provenance mutation或 Gate rule。
- 不让 Engine 写研究内容、选择 probe outcome、选择 repair strategy，或建设 controller/watcher/retry tree。
- 不把 terminal replacement、queue health、wave Gate freshness、BUG-117/118/119/121/122/123 并入本 Change。

## Decisions

### D1. One closed observation table owns validation and explanation

`schema/contracts/work-unit.mjs` will replace the boolean tuple expression with one immutable `ACTOR_OBSERVATION_CASES` table. Its four rows represent `available/native_probe`, `unavailable/native_probe`, `unknown/not_observed`, and `unknown/native_probe`; the unavailable row expands over four reason codes, so the public projection contains seven exact `{ outcome, source, reason_code }` tuples. Each row also carries only a semantic/continuation category, not a fabricated probe result or a policy-dependent command. `ActorObservationInputSchema` validates against this table; `work-unit-actor.mjs` derives an output-only `actor_observation_contract` from exactly the same table and planned role.

The claim-facing interface is deliberately small and Zod-defined, but output-only: `ActorObservationLegalTupleSchema` contains `outcome`, `source`, `reason_code`, and `observation_case: normal_available|unavailable|observation_required|probe_inconclusive`; `ActorObservationContractProjectionSchema` contains `planned_role_key` and exactly seven `legal_tuples`; `ActorObservationInputIssueSchema` contains `field`, a JSON-safe `supplied_value` or `null`, and `message`. A malformed supplied observation additionally returns its sanitized `provided_observation` and field-level `input_issues`. `evaluateActorDecision()` remains the owner of the exact recommendation because fallback availability also depends on the requested execution actor and kind policy. These schemas are never written into a bundle. The projection neither persists nor selects an observation.

`claimWorkUnits` will consume a partial, enum-invalid, or contradictory **supplied** observation through the actor-decision path rather than allowing raw Zod text to escape the CLI. At the CLI boundary, supplied means that at least one `--actor-*` option is present, even when its string value is empty; only the absence of all four actor-observation options is omitted. That response identifies supplied invalid field/value combinations, planned role, the table-derived exact valid tuples and the same claim checkpoint. It does not synthesize a concrete rerun tuple when the real probe result is unknown: its one next action is the existing native-probe boundary. This malformed-input path is pre-trace and pre-mutation. By contrast, an absent observation remains the accepted normalization to `unknown/not_observed/observation_required`; its existing no-claim audit behavior is not silently changed. A valid unavailable/fallback response uses the same projection and retains its existing legal action.

This preserves the fact model: a current `available` claim must still be `native_probe/probe_succeeded`; `unknown/not_observed/observation_required` is still non-allocation; generic HITL access remains diagnostic context, not evidence. Invalid input remains pre-trace and pre-mutation.

Rejected alternatives:

- Accept `available/not_observed`: it turns an absence of role observation into positive actor provenance.
- Reuse HITL1 `research_access`: that is a broad environment observation, not proof that the exact registered delegated role can execute now.
- Put combinations only in a Markdown playbook: it drifts from the Zod validator and is unavailable to a caller that receives CLI feedback.

### D2. One task section replaces task-level completion fragments

`work-unit-envelope.mjs` will render a bounded `## Completion Contract` section inside the existing generated `task.md`, immediately after the task brief as its first generated authoring section. It is a regenerable view within an existing task, not a new manifest path, file, field, state entry or acceptance input. The renderer receives only existing attempt facts and delegates descriptions to their existing owners:

| Projection section | Direct Source of Record | It does not own |
|---|---|---|
| Exact binding/result starter | manifest + generated result schema | result file or acceptance |
| Required outputs | resolved `output_contract.required_outputs[]` + direct-output evaluator's authoring definition | content verdict |
| Cache leaf construction | existing cache-leaf evaluator definition + resolved cache policy | cache/source evidence |
| Receipt skeleton | existing lifecycle receipt event contract | runtime receipt lines |
| Source facts | current output/source policy plus claim-time lineage projection | source-claim acceptance |
| Final check | existing dry-submit command | submit transition |

The direct-output and cache rows must be generated from the same declarative definitions their validators consume. `DirectOutputAuthoringProjectionSchema` is output-only and carries the direct contract ID, content/root shape, required/optional field facts where applicable, and bounded semantic requirements; `CacheLeafAuthoringProjectionSchema` carries the resolved required leaves, `page.md` non-placeholder/degraded rule, allowed `meta.json` mapping fields, and cache-trail declaration form. In particular, the Wave0 metadata-field definition that builds `ReferenceMetadataSchema` also renders the required/optional field authoring view, and the cache-leaf owner renders its own projection. These schemas are code-only views, not envelope fields. This is a code-local refactor of existing contract definitions, not a task parser, Markdown validator, second schema, or new blocking check.

`task.md` retains task purpose, semantic role guidance, diagnostic logging and lifecycle boundaries, but `Completion Contract` is its first authoring section. It contains the exact binding/paths, result starter and allowed fields, required output tuple plus authoring detail, cache/source facts, receipt skeleton, and handoff/dry-submit coordinate. The old binding/checklist/starter/output/cache/receipt/checkpoint fragments are removed or reduced to non-normative pointers so that the same attempt-bound fact is not stated twice. Spawn prompt names only the existing task and directs the actor to start at `Completion Contract`; it does not reproduce attempt-bound identity, result, output, cache, receipt, or command requirements. The section lists its authority refs so a debugger can inspect the true source without treating the view as an override.

No actor-owned fact is written merely because the section was rendered. In particular, `result.json`, runtime receipt events, cache leaves, source claims, research output and ledger remain absent until an actor produces them. The existing claim envelope may still create its empty runtime-receipt file, status and diagnostic agent file; those are not receipt/evidence events. The restructured task is used only for claims made after this version; old claimed work units retain their existing task/schema/beacon surfaces and never migrate.

Rejected alternatives:

- Another `result-starter.json`, `completion-contract.md`, or `--generate-starter`: current task already has a starter and envelope entry; a second file repeats only one or more fragments, adds navigation, and risks being mistaken for an actor-authored candidate.
- A more detailed static role document as the sole answer: role docs are rich, cross-attempt guidance, while identity/path/nonce/allowed outputs are attempt-specific.
- A new validator based on the completion Markdown: the existing submit/evaluator remains the sole pass/fail path.

### D3. Candidate root selection becomes the single public primary selector

`work-unit-candidate-projection.mjs` already decorates all evaluated violations with phase order and repair scope, then selects an action by scope precedence. It will expose one pure selection result containing `selected_primary` (one member of the normalized public `violations[]`) together with `recommended_action` and `primary_root_code`. Claimed normal `dry-submit` and normal formal submit rejection will derive every flat primary field (`repair_kind`, `missing_fact`, `write_to`, `rerun`, action and code) from that one selected object; formal rejection will no longer separately use `violations[0]`. Timeout-preflight retains its existing minimal `{ recommended_action, primary_root_code }` candidate projection and maps it to lease advice; it does not create a second repair-detail presentation. Late-submit stays outside this candidate path because it evaluates historical timed-out acceptance.

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

New public surfaces are limited to the restructured existing task section and output-only claim/root projections. They carry no persisted truth or file. Existing submitted, terminal, and currently claimed attempts remain readable without backfill; new code still reads historic envelope inputs.

Apply target manifest:

| Surface | Change | Authority and net simplification |
|---|---|---|
| `schema/contracts/work-unit.mjs`, `work-unit-actor.mjs` | one observation case table plus output projection | reuses Zod source; removes opaque generic-combination path |
| `schema/contracts/reference.mjs`, direct-output/cache helpers | expose authoring facts from validator-owned definitions | removes hidden Wave0 field and cache-mapping discovery without a second validator |
| `work-unit-lifecycle.mjs`, CLI presentation | structured invalid/no-claim contract | reuses claim decision; removes brute-force parameter guessing |
| `work-unit-envelope.mjs` | one `task.md` Completion Contract section; spawn identifies it only | reuses manifest/schema/policy/evaluator/receipt owners; removes duplicated task and spawn fragments and avoids a new file |
| `work-unit-candidate-projection.mjs`, `work-unit-submit.mjs` | one selected root feeds every candidate primary field | reuses candidate selector; removes `violations[0]` selector |
| timeout preflight | forwards existing action/code into lease advice | no second selector or repair-detail surface |
| `tests/` and existing permitted Agent-flow asset | focused parity and behavior-bound proof | no mock claims of real actor work |

There is no new persistent state, blocking rule, checker, CLI command, fallback, retry, recovery operation, or success authority. The only blocking conditions remain existing schema/submit facts. Each new output surface fails with the one existing next action: role probe then claim, read completion contract then author/write, or rerun the same dry-submit / report existing boundary.

## First-Round Review Resolution

The paired evolution review changes the design in three ways before Apply:

1. **Simple Reliable Control:** the Completion Contract may only project direct owners. A summary-only descriptor or leaf-file list would force the actor back into evaluator source or trial-and-error, so it is not an admissible constructibility fix. The refactor therefore makes existing validator definitions renderable and deletes repeated task/spawn fragments; it adds neither a Markdown validator nor another checker path.
2. **Helper-Oriented Agent:** a present-but-invalid observation is an Engine-visible malformed input, not an event that should create claim audit history. An omitted observation remains the accepted no-claim fact and retains its current audit behavior. Once the Engine identifies the planned role and valid vocabulary, the Agent performs the bounded native probe and reruns claim; no user decision, HITL conversion, or fabricated availability is introduced.
3. **Evidence honesty and scope:** a retained supplied task can prove delivery and a real actor's native submit-chain compatibility, but cannot prove private reading or causal use of a heading. BUG-120 concerns the Phase Agent's reference-materialization guidance chain, not the delegated actor entry, so this change records no closure claim for it.

## Risks / Trade-offs

- [Projection drifts from contract owner] -> Refactor validator-owned field/leaf definitions into renderable facts, then add parity tests across Wave0 and primary/supplementary Wave1, including actual identity/paths/roles/cache/receipt facts.
- [Completion information is buried in task prose] -> Make `Completion Contract` the first authoring section, remove duplicate task-level completion sections, and keep role guidance separate only for semantic research expertise.
- [Valid tuple list invites arbitrary selection] -> State that list shows legal shapes, not a chosen fact; a malformed supplied observation has exactly the native-probe action and no allocation, while omitted observation retains its current no-claim fact.
- [Short-circuit hides useful failure detail] -> Suppress only facts that cannot be evaluated honestly; retain independent receipt/queue/identity roots and their own coordinates.
- [Public primary root changes integrations] -> Preserve `violations[]`, reason codes, recommended action and existing repair field names; add only consistency, then test existing CLI consumers.
- [Real actor-flow cannot be run in current host] -> Mark that proof `NOT_RUN` with its actual external boundary. Deterministic tests only prove delivery/parity, never actor behavior or research quality.

## Migration Plan

1. Before target edits, create implementation evidence and validate this Change's `verification-plan.yaml`; record current v0.47 behavior on a fresh disposable bundle without mutating a diagnostic production bundle.
2. Add focused red tests for malformed-versus-omitted observation, validator-owned authoring projection, completion-contract parity/no pre-created authority files, primary-root field consistency and prerequisite masking.
3. Implement the observation table/projection, then make direct-output/cache validator definitions renderable, then consolidate task/spawn, then route every public candidate feedback path through the one selected root.
4. Run unit/integration/package hygiene/regression checks. Run the selected real Agent-flow case when authenticated runtime and budget exist; otherwise retain its native `NOT_RUN` outcome.
5. Update release metadata to v0.48, run verification-routing/governance/OpenSpec strict checks, and record exact evidence boundaries before archive.

Rollback restores the old task rendering and removes the output-only claim/root projections. Because no schema/state/ledger migration or new file occurs, existing claimed/submitted attempts require no data rewrite. A code rollback after v0.48 must keep accepting all existing authoritative attempt surfaces.

## Open Questions

No apply-blocking design question. The real actor-flow run is an evidence availability question, not a reason to alter the deterministic contract or fabricate a completion result.

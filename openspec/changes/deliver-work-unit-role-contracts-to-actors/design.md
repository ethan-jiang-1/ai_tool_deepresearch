## Context

v0.38 已建立 closed assignment contract：registered work-unit kind 决定 `delegated_role_key`，assignment resolver 决定 exact `required_outputs[]` path/role/`direct_contract`，generated task/result schema投影这些 bindings，fresh dry-submit/formal submit通过 `direct-output-contract.mjs` 的唯一 evaluator裁决 target bytes。`dpt-evidence-extractor` role Markdown也已经给出与 `wave1.evidence-summary.v1` / `wave1.question-list.v1` 一致的 authoring template。

缺口发生在 actor decision point。`work-unit-envelope.mjs` 生成的 task/spawn只要求 actor读 task/beacon/schema；它显示 opaque contract ID，却没有 canonical role doc ref和minimum semantic requirements。Role docs明确写着“Phase Agent reads this role spec”，actor不直接加载。production actor因此能写大量真实研究内容，却在首次 dry-submit缺 `Key Findings` / four question sections；Phase 后补不能证明actor contract compliance。同一 delivery gap也隔断了role内fetch chain，BUG-096的delegated路径仍未关闭。

设计 paired-read `evolution-simple-reliable-control.md` 与 `evolution-helper-oriented-agent.md`：把既有contract lineage送到最近decision point，复用现有validator与repair loop；不加state、第二validator、自动retry或用户co-runner。

## Goals / Non-Goals

**Goals:**

- 从 closed registered role identity 派生并交付唯一 canonical role guidance ref。
- 从 existing direct-output owner 投影 bounded minimum authoring semantics，不复制 verdict logic。
- 让 actor 在 search/fetch/write 前读取 guidance，并在 `work_done` 前自行验证 assigned bytes。
- 把重复fetch chain收敛到一个shared Agent-facing page-fetch contract，移除active Python fallback。
- 保留v0.38 assignment、dry-submit、formal submit、replacement、receipt与ledger authority。
- 用 deterministic tests证明projection lineage，用一个existing real Wave1 actor case证明首次actor output；fallback branch独立裁决。

**Non-Goals:**

- 不新增contract registry/plugin、role snapshot/hash、manifest/beacon/result字段或assignment version。
- 不让queue payload、Phase Agent、actor选择role file/direct contract。
- 不新增fuzzy/semantic validator、LLM judge、heading regex副本或第二submit path。
- 不建设fetch client/controller、browser abstraction、proxy、retry tree、watcher或daemon。
- 不改变Gate、transition、queue/receipt/provenance/ledger/evidence authority。
- 不把BUG-097 silent-compliance诊断并入本Change。

## Decisions

### D1. Canonical role guidance is derived, not registered again

新增一个pure role-guidance projection helper，输入validated `delegated_role_key`，先确认该key来自existing closed work-unit kind contracts，再按当前稳定命名派生 `DPT_FRAMEWORK/workflows/nodes/phases/subagent-<role_key>.md`，realpath检查它位于shipped role directory且是regular file。输出bounded `{ role_key, role_ref, role_path, shared_guidance_refs[] }`，仅用于task/spawn生成，不写index/manifest/beacon。

`work-unit-envelope.mjs` 在任何envelope文件publication前解析该projection；unknown/mismatch/missing file直接使claim失败。Generated `task.md`和spawn prompt显示同一repo-relative ref与absolute read path，并要求actor先读role/shared refs。Phase Agent仍通过phase `suggested_context`读取role guidance，但不再负责临场复制其内容。

Alternatives rejected:

- 在queue payload或manifest新增`role_guidance_ref`：重复可从closed role推导的truth并需要migration/parity。
- 让Phase Agent把role全文粘进spawn prompt：继续依赖memory/discipline且制造drift。
- 扫描role directory猜匹配：filesystem order/命名不应成为role selection authority。

### D2. Deepen the existing direct-output owner with one actor projection

`direct-output-contract.mjs` 的closed contract definition将同时拥有 evaluator 与一个immutable actor-facing descriptor，例如：contract label、output purpose、required semantic section names或structured shape cue。导出一个bounded `describeDirectOutputContract(contractId)`；evaluation仍读取fresh bytes并返回roots，descriptor不接收target bytes、result、receipt或runtime state。

Envelope只调用descriptor渲染minimum authoring checklist。Unknown contract或missing descriptor在publication前fail closed。Tests从同一个definition table枚举contract IDs，证明descriptor/evaluator闭集一致；不在envelope或role test里再手写另一份heading inventory。Rich examples继续由role Markdown拥有。

Alternatives rejected:

- 解析role Markdown生成deterministic verdict：倒置Markdown/Engine authority。
- 在envelope中switch contract ID并硬编码headings：第二份contract truth。
- 放宽为fuzzy validator：BUG-098不是validator缺失，且会制造另一个acceptance解释。

### D3. One shared page-fetch guidance surface, still Agent-owned

新增一个shipped shared Markdown（建议 `workflows/nodes/shared/shared-page-fetch-guidance.md`）描述每URL的closed chain：available built-in/browser surface -> Node `fetch` -> one exact bounded same-URL `curl`，每层仅在independent host permission允许时使用；真实page content才成功。它还描述multi-URL small batching、cache/source/receipt obligations、unsafe URL/shell边界、exhausted failure与smallest external boundary。

Search/fetch roles通过explicit shared ref加载该surface；generated role projection把该shared absolute path一并给actor。Role docs保留role-specific search目标与evidence obligations，删除重复chain。被触碰的active role docs不得保留Python/`wget`或另一个fallback顺序；`validate-work-unit-hygiene`/focused Markdown tests锁定no-Python/no-duplicate boundary。

该Markdown不执行fetch、不判断page语义、不写cache/receipt。Actor执行已授权mechanics；若需要new permission或external environment，返回Phase Agent最小边界。Phase Agent不把ordinary command交给用户，也不伪造actor facts。

### D4. Generated projections do not change persisted compatibility

Current/historical index、manifest、beacon、result schema与assignment version不变。Task/spawn是regenerable projection；新claim使用v0.40 guidance，existing claimed envelopes继续按其已生成task和现有submit contract可读/可终结，不做migration或backfill。Formal submit仍从hash-bound queue snapshot重建expected contract并fresh-evaluate bytes；task text不能outvote它。

### D5. Verification reuses one real Wave1 actor case

Deterministic layers:

- unit：closed role key derivation、path containment/missing file/unknown role、direct descriptor/evaluator ID parity；
- integration：real claim envelope的task/spawn拥有same role/shared refs、absolute paths和contract-derived minimum authoring projection；supplementary empty-required-output保持无paired rewrite；hygiene证明no Python/role-local duplicate chain；
- deterministic E2E不适用：没有新的multi-phase deterministic state/transition chain，现有claim/submit integration已覆盖authority chain。

Agent-flow layer复用manifest-registered `case-221-heavy-batch-subagent.md`，不新增case/Subject identity。增强case使每个real `dpt-evidence-extractor` actor只从generated task指示的surfaces开始，保留actor completion前/后bound output hashes、result/receipt/cache/source facts和public actor evidence；首次dry-submit必须pass，Phase/Playbook Agent不得在actor `work_done`后追加sections。case general PASS证明role/direct delivery与existing submit path，不证明research quality。

同一次retained actor evidence仅在public facts完整显示native fetch blocked/unavailable、同URLbounded curl、真实cache/source/receipt及formal submit时追加delegated fallback check。Branch未发生或required public facts unavailable时，该claim `NOT_RUN`而不重跑追条件、不影响general case；Codex/Claude runtime evidence不互相外推。Fixture或手写files只能证明deterministic projection，不能证明actor behavior。

### D6. Simplicity and helper admission

最短闭环：closed role + resolved output -> canonical refs/descriptors -> actor reads/writes -> existing dry-submit root -> same-attempt actor repair before work_done or existing fresh-ID replacement after work_done -> formal submit。

Net simplification：删除opaque-ID guessing、Phase临场heading补丁、role-local duplicated fetch chains、Python fallback与用户command handoff。新增的是两个pure bounded projections和一个shared Markdown；没有新state、validator、retry/recovery或success authority。

责任边界：用户只决定new semantics/risk/permission/external action；Sub-agent owns authorized search/fetch/content/cache/result/receipt writes；Phase Agent owns demand/claim/spawn/poll/dry-submit/replacement/submit mechanics；Engine owns identity/contract/direct verdict/provenance/ledger checks。

## Risks / Trade-offs

- [Risk] Actor-facing descriptor与evaluator drift -> Mitigation:同一closed definition table、ID parity unit tests、envelope不持有heading list。
- [Risk] Absolute framework path使task依赖repo layout -> Mitigation:由running framework module解析shipped ref，task同时保留canonical ref；不persist到runtime authority。
- [Risk] Shared fetch guidance变成generic controller seed -> Mitigation:Markdown-only、one URL/one bounded curl、no execution API/state/retry；新增tier需later OpenSpec。
- [Risk] Actor读更多Markdown增加context -> Mitigation:task只投影one role + explicit shared refs；minimum descriptor保持bounded，不加载全phase closure。
- [Risk] case-221 actor runtime不暴露fallback branch -> Mitigation:general delivery claim与optional fallback claim分离，missing branch诚实`NOT_RUN`且不重复运行。
- [Risk] Existing claimed envelopes缺新guidance -> Mitigation:不retrofit/migrate；它们继续由existing contract裁决，新behavior只在new claim生成点生效。

## Migration Plan

1. Apply前记录worktree与verification routing plan，先加role/descriptor/envelope red tests。
2. 实现pure projections与shared guidance，再改generated task/spawn和role refs；不改persisted schemas。
3. 跑unit/integration/hygiene/package regression。
4. 更新existing case-221 observer/evidence boundary并执行一次canonical Autorun when authenticated actor runtime is available。
5. 记录general与optional fallback claim的native PASS/FAIL/NOT_RUN，完成v0.40/governance/strict validation。
6. Rollback可恢复previous task/spawn text与role duplication，因为无schema/data migration；已生成envelopes继续由其existing authority处理。

## Open Questions

无apply-blocking open question。Apply review应确认current framework path helper的最小owner位置，以及case-221现有public actor evidence是否足以绑定optional fallback；不足时fallback claim保持`NOT_RUN`，不得新增第二case或private-reasoning parser。

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
- 用 deterministic tests证明projection lineage，用一个existing real Wave1 actor case证明代表性首次actor output；fallback branch保持独立条件观察。

**Non-Goals:**

- 不新增contract registry/plugin、role snapshot/hash、manifest/beacon/result字段或assignment version。
- 不让queue payload、Phase Agent、actor选择role file/direct contract。
- 不新增fuzzy/semantic validator、LLM judge、heading regex副本或第二submit path。
- 不建设fetch client/controller、browser abstraction、proxy、retry tree、watcher或daemon。
- 不改变Gate、transition、queue/receipt/provenance/ledger/evidence authority。
- 不把BUG-097 silent-compliance诊断并入本Change。

## Decisions

### D1. Canonical role guidance is derived, not registered again

新增窄模块`engine/helpers/work-unit-role-guidance.mjs`作为role/shared projection owner。Lifecycle把existing `kindContractForQueueItem(...).actor_policy`已解析并经actor decision验证的`{ kind, delegated_role_key, actor_policy }`传给它；helper只验证`actor_policy.delegated_role_key`与该key一致，不重建或读取queue payload来做第二次kind lookup。随后它按稳定命名派生 `DPT_FRAMEWORK/workflows/nodes/phases/subagent-<role_key>.md`，realpath检查它位于shipped role directory且是regular file。Helper只解析该canonical role frontmatter的一层direct `requires[]`，逐个解析contained regular shared file；只有shared node自身声明`actor_delivery: required`的direct dependency进入`shared_guidance_refs[]`，并要求恰有一个canonical page-fetch guidance。Role `requires[]`是依赖关系的唯一事实，shared node frontmatter是delivery classification的唯一事实；helper不维护role-to-shared allowlist、不从queue/actor/cwd读取，也不扫描目录或递归加载。Production root只由module `import.meta.url`解析；一个module-level explicit root参数只作为temporary-fixture test seam，claim/CLI/queue/actor均不能提供或覆盖它。输出deep-frozen bounded `{ role_key, role_ref, role_path, shared_guidance_refs[] }`，仅作为claim-time/task/spawn的ephemeral value，不写index/manifest/beacon，也不加入workflow manifest的always-loaded `shared[]`。

正式`claimWorkUnits`保留existing control order：先preview queue/assignment/actor policy并执行actor decision；`no_claim`或invalid decision沿现有repair返回且不读取delivery assets。只有decision为`allow_claim`后，才对effective plans做read-only delivery preflight，解析role/shared projection和每个required direct descriptor；随后才进入写事务、移除queue front、allocate work ID或创建`_work_units`文件，并把同一个resolved projection传给envelope/task/spawn rendering。Unknown/mismatch/missing/escaping file或descriptor直接失败且没有queue/index/envelope mutation。导出的`createWorkUnit`是internal/test envelope constructor，仍可生成无`actor_execution`的legacy-compatible envelope；它不成为production role-delivery入口，也不被本Change强制伪造actor identity。现有`withWorkUnitTransaction`不提供filesystem rollback，因此本Change只保证正式allow-claim中的可预判lineage errors在mutation前失败，不声称任意I/O中断具有全文件原子回滚。Generated `task.md`和spawn prompt显示同一repo-relative ref与absolute read path，并要求actor先读role/shared refs。Phase Agent仍通过phase `suggested_context`读取role guidance，但不再负责临场复制其内容。

Alternatives rejected:

- 在queue payload或manifest新增`role_guidance_ref`：重复可从closed role推导的truth并需要migration/parity。
- 让Phase Agent把role全文粘进spawn prompt：继续依赖memory/discipline且制造drift。
- 扫描role directory猜匹配：filesystem order/命名不应成为role selection authority。
- 把page-fetch guidance加入workflow manifest `shared[]`：会把actor-specific fetch context扩散到所有lifecycle phase，而不是只在work-unit actor decision point加载。
- 在projection helper硬编码role-to-shared allowlist：会与role frontmatter `requires[]`形成双重依赖事实。
- 投影role的全部`requires[]`：会把shared schema/protocol等大上下文无差别送到actor，扩大decision-point context。

### D2. Deepen the existing direct-output owner with one actor projection

`direct-output-contract.mjs` 的single closed contract definition table将同时拥有 evaluator 与一个immutable actor-facing descriptor，例如：contract label、output purpose、required semantic section names或structured shape cue。现有ID set/if-chain收敛进该table，导出一个bounded `describeDirectOutputContract(contractId)`；evaluation仍读取fresh bytes并返回roots，descriptor不接收target bytes、result、receipt或runtime state。

Envelope只调用descriptor渲染minimum authoring checklist。Unknown contract或missing descriptor在publication前fail closed。Tests从同一个definition table枚举contract IDs，证明descriptor/evaluator闭集一致；不在envelope或role test里再手写另一份heading inventory。Rich examples继续由role Markdown拥有。

Alternatives rejected:

- 解析role Markdown生成deterministic verdict：倒置Markdown/Engine authority。
- 在envelope中switch contract ID并硬编码headings：第二份contract truth。
- 放宽为fuzzy validator：BUG-098不是validator缺失，且会制造另一个acceptance解释。

### D3. One shared page-fetch guidance surface, still Agent-owned

新增shipped `workflows/nodes/shared/shared-page-fetch-guidance.md`，frontmatter固定`id: shared-page-fetch-guidance`、`shared_scope: subagent-fetch`、`authority: guidance-only`、`actor_delivery: required`。正文描述每URL的closed chain：available built-in/browser surface -> Node `fetch` -> one exact bounded same-URL `curl`，每层仅在independent host permission允许时使用；真实page content才成功。它还描述multi-URL small batching、cache/source/receipt obligations、unsafe URL/shell边界、exhausted failure与smallest external boundary。每次tier完成后写existing runtime receipt诊断事件`fetch_attempt_done`，`detail`最小包含same URL、`tier`、truthful surface、outcome和bounded reason code。该文件是role direct dependency和generated actor projection，不是workflow manifest always-loaded shared node或acceptance authority。

三个registered production roles（source-intake、evidence-extractor、topic-scout）通过explicit shared ref加载该surface；generated role projection把该shared absolute path一并给actor。两个active auxiliary role docs（claim-verifier、source-diagnostic）也改为引用同一owner以删除现存Python chain，但它们不会被冒充为当前closed kind registration。Role docs保留role-specific search目标与evidence obligations，删除重复chain。Workflow package consistency validator与focused Markdown tests共同锁定shared file存在/contained、role dependency、no-Python/no-duplicate boundary。

该Markdown不执行fetch、不判断page语义、不写cache/receipt。Actor执行已授权mechanics；若需要new permission或external environment，返回Phase Agent最小边界。Phase Agent不把ordinary command交给用户，也不伪造actor facts。

### D4. Generated projections do not change persisted compatibility

Current/historical index、manifest、beacon、result schema与assignment version不变。Task/spawn是regenerable projection；新claim使用v0.40 guidance，existing claimed envelopes继续按其已生成task和现有submit contract可读/可终结，不做migration或backfill。Formal submit仍从hash-bound queue snapshot重建expected contract并fresh-evaluate bytes；task text不能outvote它。

Canonical role guidance是rich capability/authoring guidance，但current assignment projection决定本attempt实际必须写什么。修正`dpt-evidence-extractor`的无条件paired措辞与envelope现有kind-only Wave1提示：primary assignment按两份`required_outputs[]`写pair；supplementary empty-required-output不得因role template或kind文案重写prior pair，只写当前output contract允许/声明的new output/cache/source/result/receipt并使用authorized prior source-ref lineage。Role/shared guidance不得扩大`writes_to`、required outputs或assignment mode。

### D5. Verification reuses one real Wave1 actor case

Deterministic layers:

- unit：closed role key derivation、path containment/missing file/unknown role、direct descriptor/evaluator ID parity；
- integration：real claim envelope的task/spawn拥有same role/shared refs、absolute paths和contract-derived minimum authoring projection；supplementary empty-required-output保持无paired rewrite；hygiene证明no Python/role-local duplicate chain；
- deterministic E2E不适用：没有新的multi-phase deterministic state/transition chain，现有claim/submit integration已覆盖authority chain。

Agent-flow layer复用manifest-registered `case-221-heavy-batch-subagent.md`，不新增case/Subject identity、required check ID或durable role。两个real `dpt-evidence-extractor`都必须只从generated task指示的surfaces开始并各自通过dry-submit/formal submit，整批再通过inspect/Gate。First-return deep proof保持代表性：选定first actor后，在任何dry-submit或Phase edit前确认receipt已有`work_done`，从manifest `required_outputs[]`解析两份paired targets，分别hash并运行predictive dry-submit；formal submit后再次hash且相等。强化existing required check `real-wave1-batch-submit`，把work IDs、two target refs、pre/post hashes、dry-submit/formal-submit outcomes写入durable trace-prefix。任一actor dry-submit失败时，Playbook不得补写content或formal-submit该candidate；它记录existing checks为false并继续到native FAIL finalization。Existing `subject_task/result/receipt/output` roles不变，其中`subject_output`只保留一份代表性原始output bytes。Case PASS证明两名actor完成existing authority path，并通过dry-submit+hash trace证明代表性actor的paired first-return compliance；它不声称第二份paired file或第二名actor的所有首次bytes在cleanup后仍可直接重读，也不证明research quality。

Conditional curl evidence复用代表性actor现有durable `subject_receipt`，不新增cache/observation evidence role或runtime schema。Implementation evidence只读取stable `fetch_attempt_done` rows，并结合durable result的cache/source declarations、paired outputs和formal-submit事实分类为`OBSERVED_PASS|OBSERVED_FAIL|UNOBSERVED`。只有同URL的native/built-in事实明确blocked/unavailable、所有实际可用的browser/Node predecessor tiers均未取得real content、independently permitted bounded curl取得real content并被提交，才是`OBSERVED_PASS`；branch未发生或facts不足是`UNOBSERVED`，跳tier、URL漂移、顺序/结果矛盾是`OBSERVED_FAIL`。该分类不写playbook check、不进入case verdict、不触发重跑追条件。Codex/Claude runtime evidence不互相外推；fixture或手写files不能证明actor behavior。

### D6. Simplicity and helper admission

最短闭环：closed role + resolved output -> canonical refs/descriptors -> actor reads/writes -> existing dry-submit root -> same-attempt actor repair before work_done or existing fresh-ID replacement after work_done -> formal submit。

Net simplification：删除opaque-ID guessing、Phase临场heading补丁、role-local duplicated fetch chains、Python fallback与用户command handoff。新增的是两个pure bounded projections和一个shared Markdown；没有新state、validator、retry/recovery或success authority。

责任边界：用户只决定new semantics/risk/permission/external action；Sub-agent owns authorized search/fetch/content/cache/result/receipt writes；Phase Agent owns demand/claim/spawn/poll/dry-submit/replacement/submit mechanics；Engine owns identity/contract/direct verdict/provenance/ledger checks。

## Risks / Trade-offs

- [Risk] Actor-facing descriptor与evaluator drift -> Mitigation:同一closed definition table、ID parity unit tests、envelope不持有heading list。
- [Risk] Absolute framework path使task依赖repo layout -> Mitigation:由running framework module解析shipped ref，task同时保留canonical ref；不persist到runtime authority。
- [Risk] Shared fetch guidance变成generic controller seed -> Mitigation:Markdown-only、one URL/one bounded curl、no execution API/state/retry；新增tier需later OpenSpec。
- [Risk] Actor读更多Markdown增加context -> Mitigation:task只投影one role + explicit shared refs；minimum descriptor保持bounded，不加载全phase closure。
- [Risk] case-221 actor runtime不暴露fallback branch -> Mitigation:general delivery checks与durable conditional observation分离；missing branch记`UNOBSERVED`并保持BUG-096 active，不伪造claim-level `NOT_RUN`或重复运行。
- [Risk] 代表性paired targets中只有一份作为`subject_output`导出原始bytes -> Mitigation:existing required trace check持久绑定两份target refs、pre/post hashes和dry-submit outcome，result/receipt/output保留Subject归属；明确剩余forensic limitation，不修改archived compatibility ledger。
- [Risk] fetch receipt facts被误当新acceptance contract -> Mitigation:structured detail仅为conditional observation；submit仍只要求existing receipt identity/lifecycle，fetch evidence缺失导致UNOBSERVED而非submit failure。
- [Risk] Existing claimed envelopes缺新guidance -> Mitigation:不retrofit/migrate；它们继续由existing contract裁决，新behavior只在new claim生成点生效。
- [Risk] Rich role template覆盖supplementary empty-required-output assignment -> Mitigation:role与generated Wave1 wording都显式以current assignment projection为attempt scope；primary/supplementary integration test锁定不重写prior pair。

## Migration Plan

1. Apply前记录worktree与verification routing plan，先加role/descriptor/envelope red tests。
2. 实现pure projections与shared guidance，再改generated task/spawn和role refs；不改persisted schemas。
3. 跑unit/integration/hygiene/package regression。
4. 更新existing case-221 observer/evidence boundary并执行一次canonical Autorun when authenticated actor runtime is available。
5. 记录general claim的native PASS/FAIL/NOT_RUN，以及durable conditional fallback observation的OBSERVED_PASS/OBSERVED_FAIL/UNOBSERVED，完成v0.40/governance/strict validation。
6. Rollback可恢复previous task/spawn text与role duplication，因为无schema/data migration；已生成envelopes继续由其existing authority处理。

## Open Questions

无apply-blocking open question。Case-221 public facts不足以绑定fallback时写`UNOBSERVED`，不得新增第二case、playbook verdict check或private-reasoning parser。

## 1. 先锁定五个rerun缺陷与正常路径

- [ ] 1.1 为 CTS-003 增加 focused helper/CLI regression：sanctioned rerun `add_topic` 与 `migrate_legacy seed_binding:new` 生成完整 skeleton、精确五个 wave token、无 `scope_role` 伪正文；existing seed 的 enrichment frontmatter/body 在 update/layout 后保留；normal HITL1 add 继续通过。Done：测试在旧实现上准确暴露 BUG-081，且覆盖正常路径无退化。
- [ ] 1.2 为 AGQ-002、AGQ-014 增加 queue/work-unit regression：delegated active front 的 `operate-queue claim` 与真正 empty window 返回不同 reason；missing actor observation 和无 unavailable reason 的 fallback 均零写入并给唯一动作；历史 b000 后打开 b001，合法 current observation 能 claim rerun 新 demand。Done：测试准确覆盖BUG-083；batch allocator若当前已PASS，只保留证明且不安排重写。
- [ ] 1.3 为 DEW-004、DEW-009、DEW-013、DEW-017 增加 envelope/path/submit regression：beacon/task/spawn/CLI examples共享canonical absolute `bundle_dir`，bundle-relative refs只join一次；relative/root-mismatched beacon由shared evaluator fail closed；从bundle内误传同名relative bundle运行inspect/dry-submit/submit时不创建nested bundle、`_work_units/_transactions`、lock/trace/log；actor-aware fallback task的result starter constants与`result.schema.json`一致，pre-submit checklist覆盖immutable beacon、receipt actor fields、allowed roles、cache leaf/meta URL binding；dry-submit一次返回可独立评估的multi-violations；actor conflict/post-hoc orphan仍fail closed。Done：测试能复现 BUG-084 的schema/actor/role/cache/meta/root错误链且不弱化binding、不污染错误路径。
- [ ] 1.4 为 RWP-001、RWP-014 增加 Wave0 Markdown contract tests：rerun `action:add` 只为缺失 coverage 的新 topic enqueue，存量 historical coverage 不重复派发，delegated path使用 actor probe + work-unit claim/submit，fallback使用 starter + dry-submit，禁止 direct artifact/hand-written provenance。Done：删除任一关键rerun指令都会使测试失败，normal first-run wording仍通过。
- [ ] 1.5 为 RWP-001、RWP-014、AGQ-014 增加 Wave0 provenance invariant regression：旧 topic historical submitted coverage + 新 topic valid submit 可 pass；同样历史前置 + 新 topic orphan `source.yaml` 必须 fail。Done：证明无需修改 Wave0 gate rule set即可关闭 BUG-082。
- [ ] 1.6 为 CTS-007、REF-002、REF-003、RWG-002、RWG-005、RWG-018、RWG-019 增加 Wave1 reference regression：normal legacy metadata + valid table pass；UID-only metadata + valid table pass；conflicting dual fields fail一次；prose-list/missing index只返回parent root并mask 52-style row cascade；valid table缺一row或wrong layer只报真实row；inspect与formal gate共享binding/index结果。Done：测试准确复现BUG-085且不接受summary list、不要求historical mass rewrite。
- [ ] 1.7 为 FIO-006、FIO-007 增加file-observability regression：UID-only reference不被报为dangling/unregistered；legacy current/previous id/slug与Wave1 gate解析一致；dual conflict只有一个root finding；audit保持read-only。Done：测试锁定同一resolver outcome并移除raw-field precedence空间。
- [ ] 1.8 为 IOC-001、IOC-003 增加Wave0/Wave2 inspect regression：UID-only shared/cross reference不产生missing legacy-field advisory；valid legacy仍通过；unknown/conflict使用shared adapter reason；advisory/blocking classification与no-write边界不变。Done：删除local `metadataKeys` binding truth后两条inspect CLI仍符合existing output contract。

## 2. Canonical seed 与 claim 反馈

- [ ] 2.1 实现 CTS-003：重构 `canonical-topic-state.mjs` 的 seed renderer，使无 existing projection 的 add/migration生成 gap-valued完整 skeleton与accepted wave token；为 existing seed合并 canonical keys并保留enrichment/body。Done：1.1测试PASS，topic-state apply仍只触碰plan+explicit seeds/workspace。
- [ ] 2.2 实现 AGQ-002：在 `queue-manager-lifecycle.mjs` 为 delegated-rejected 与 empty-window claim 增加不同 `reason_code`、`blocked_by_queue_item_id` 和一个 `recommended_action`，保留 `item:null` 与queue bytes不变。Done：1.2 queue feedback测试PASS且旧调用方字段未删除。
- [ ] 2.3 实现 AGQ-014：仅在focused测试暴露真实缺陷时修复work-unit claim；若b000→b001现有逻辑已PASS，不改batch allocator，只保留regression并对fallback缺失前置条件的diagnostic做最小投影修正。Done：合法rerun claim与fail-closed actor-preflight测试均PASS，无新batch/state/queue owner。

## 3. Work-unit helper surface 与 submit 闭环

- [ ] 3.1 实现 DEW-004、DEW-009：在 `work-unit-envelope.mjs` 统一beacon/task/spawn/claim projection与CLI examples的canonical absolute bundle root，并从manifest/output contract/cache policy在generated `task.md` 中生成copy-ready Result JSON Starter，包含exact schema/identity/nonce/actor fields和kind允许的result字段，不预写assigned `result.json`。Done：所有root projection相等、relative refs只join一次，starter可由测试解析且keys/constants与generated schema一致。
- [ ] 3.2 实现 DEW-004、DEW-009：在同一generated task中投影pre-submit checklist，明确absolute path直接使用、relative ref只join一次、所有work-unit CLI使用absolute `bundle_dir`、immutable envelope files、actor-aware receipt字段、allowed/required output roles、cache leaf三文件与 `meta.json.url` mapping；不复制独立validator。Done：不同work-unit kind的checklist由active contract生成并通过1.3测试。
- [ ] 3.3 实现 DEW-013：formal submit对repairable candidate拒绝时，把唯一最近动作改为对同一 `work_id`/candidate运行dry-submit；保留现有strict validation、rejection audit和formal submit唯一success authority。Done：rejection advice测试PASS，submit结果/ledger binding未放宽。
- [ ] 3.4 实现 DEW-017：更新fallback generated prompt/指导，使Phase Agent从task/beacon/schema/starter开始、保护beacon等authority、写真实receipt/output/cache/result、dry-submit repair后formal submit；明确禁止post-hoc provenance。Done：fallback task/prompt测试与actor-provenance submit测试PASS。
- [ ] 3.5 实现 DEW-009：让 `loadWorkUnitIndex(..., { createIfMissing:false })` 与基于它的inspect/dry-submit/submit/rejection preflight在missing existing authority时零写入；仅显式create/claim在验证active bundle后初始化目录。扩展现有beacon evaluator校验absolute current root与全部index/manifest/contract-derived binding，并供inspect/dry/formal复用。Done：错误nested bundle命令返回一个absolute-root动作且filesystem bytes/tree不变，beacon drift在任何success authority写入前短路，无第二validator或persistent hash。

## 4. Rerun Agent Flow 控制面

- [ ] 4.1 实现 RWP-001、RWP-014：在 `phase-wave0.md` 增加rerun direct-fact分类与标准new-topic task card路径，明确historical coverage复用、supplement demand、orphan处理、correct claim命令/actor flags、starter/dry-submit/final submit和same-check repair。Done：1.4结构测试PASS，normal first-run `3.1/3.2` 路径保持原行为。
- [ ] 4.2 实现 CTS-003、RWP-001：对齐 `phase-seed-topics.md`，说明canonical add已提交完整skeleton，本phase只verify/enrich且不得重建identity；使用现行exact wave token。Done：seed-topics结构/queue-loop测试PASS。
- [ ] 4.3 实现 DEW-009、DEW-013、DEW-017：更新 `shared-subagent-protocol.md` 与现有work-unit actor decision playbook，把canonical absolute bundle root、beacon只读、relative ref只join一次和fallback/repair的 `starter → real work → dry-submit → repair → formal submit` 放在决策点；native submit reject也回到dry-submit。Done：文档/command contract testsPASS且无新增交互checkpoint/path authority。
- [ ] 4.4 实现 RWP-014、DEW-017：增加anti-cheating wording，禁止为claim前direct research、旧orphan artifact、手工receipt/result追认provenance；合法修复必须新执行claimed attempt或报告missing contract。Done：no-bypass/hygiene tests能检测退化措辞。
- [ ] 4.5 实现 REF-007、RWG-002、RWG-005、RWG-019：更新 `phase-wave1.md` 及必要的现有reference/inspect command wording，明确rerun只分类，new topic走normal Wave1 demand/materialization，historical covered reference无需metadata-only research或mass rewrite，index/metadata失败由Agent机械修复后重跑同一inspect。Done：normal first-run与rerun共用一套producer contract，用户不被要求执行普通修复命令。

## 5. Shared reference binding 与 index 根因短路

- [ ] 5.1 实现 CTS-007、REF-002、RWG-002、RWG-005、RWG-019：在现有 `topic-layout.mjs` resolver上增加thin reference adapter，解析exact UID/`all`与legacy current/previous id/slug list，dual fields必须一致；让reference format与Wave1 evaluator消费该结果。Done：1.6 binding cases PASS，required common metadata/sections/submitted backing保持严格，无第二identity map。
- [ ] 5.2 实现 REF-003、RWG-005、RWG-018：让existing reference-index reader先验证accepted eight-column parent table；missing/list/缺列返回一个parent root并mask row cascade，valid parent后继续missing-row/wrong-layer blocking；formal gate与inspect复用同一pure result。Done：1.6 index/shared-result cases PASS，无新gate rule、dependency engine或durable inspect side effect。
- [ ] 5.3 实现 FIO-006、FIO-007：把file observability的raw `related_topic` regex/alias interpretation替换为同一reference adapter result，保留canonical finding grouping与read-only边界。Done：1.7 PASS，UID-only/legacy/conflict与Wave1 gate reason code一致，不修改reference或registry authority。
- [ ] 5.4 实现 IOC-001、IOC-003：让 `inspect-wave0-output.mjs` 与 `inspect-wave2-output.mjs` 的reference metadata advisory复用shared parser/adapter，移除local legacy-key requirement与topic parsing，保留index-column presentation和existing classification。Done：1.8 PASS，无第二validator、无新增blocking rule。

## 6. Regression 与真实 controlled evidence

- [ ] 6.1 运行 CTS-003/007、AGQ-002/014、DEW-004/009/013/017、RWP-001/014、REF-002/003/007、RWG-002/005/018/019、FIO-006/007、IOC-001/003 targeted tests。Done：canonical topic-state、queue/work-unit claim/envelope/index/submit、reference/index/gate/inspect/file-observability、operate-topic-state/work-unit CLI及phase Markdown全部PASS，无跳过、无修改production bundle。
- [ ] 6.2 运行相关完整 regression suites，至少覆盖 `tests/engine/`、work-unit/queue/phase CLI integration、Markdown contract、Wave0/Wave1 gate与file-observability tests。Done：全部PASS；若发现与本change无关的既有失败，记录精确命令/输出并不得误勾完成。
- [ ] 6.3 更新现有 rerun `action:add` heavy real-Agent canary及suite README，使历史normal-run fixture后通过真实sanctioned topic-state add、controller-driven Wave0/Wave1 enqueue/probe/claim、canonical absolute root、generated starter、real actor output/receipt/cache、dry-submit、formal submit、UID-bound reference、valid `_INDEX.md` row和Wave0/Wave1 gate；fixture不得产出新增topic语义结果。Done：playbook断言beacon binding unchanged、不存在same-name nested bundle、historical references无mass rewrite，并满足Reality Distance Ledger、trace verdict、PASS-cleanup/FAIL-preserve纪律。
- [ ] 6.4 从clean repo由coding Agent逐step执行 heavy canary through Wave1。Done：真实Agent/WebSearch/fetch路径产生trace-backed PASS，五个BUG的关键surface均被观察，beacon未被actor覆盖、无nested bundle、旧reference未批量改写并清理disposable bundle；NOT_RUN或fixture smoke不得计为完成。

## 7. Release 与治理收尾

- [ ] 7.1 更新 CTS-003/007、AGQ-002/014、DEW-004/009/013/017、RWP-001/014、REF-002/003/007、RWG-002/005/018/019、FIO-006/007、IOC-001/003 的实现/Markdown `@impl` 或 frontmatter `req` 标注，并确认没有新 requirement ID需要登记。Done：active deltas、code/docs和registry引用一致。
- [ ] 7.2 为上述requirements更新 `CHANGELOG.md`，新增v0.28简洁条目，说明rerun new-topic normal bootstrap、claim/submit helper、canonical bundle root、shared reference binding与index parent short-circuit。Done：版本位于最新条目且不overclaim真实Agent证据。
- [ ] 7.3 同步 `DPT_FRAMEWORK/RUN.md` 到v0.28，横幅与CHANGELOG最新条目一致。Done：Current Release与banner均为v0.28。
- [ ] 7.4 运行 `node openspec/governance/check-project-reqs.mjs`。Done：0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired，命令PASS。
- [ ] 7.5 运行 `node openspec/governance/check-project-specs.mjs`。Done：0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader，命令PASS。
- [ ] 7.6 运行OpenSpec change validation/status并复读proposal/design/specs/tasks。Done：`repair-rerun-added-topic-bootstrap` apply-ready，五个rerun-only BUG均有requirement、实现task、focused regression和真实evidence入口；新Topic走normal pipeline，historical coverage经shared resolver复用，且无rerun controller/gate exception/state/path/reference owner/submit authority扩张。

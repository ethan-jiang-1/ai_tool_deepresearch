## 1. Governance And Characterization

- [x] 1.1 核对 `CTS-002..007`、`SCO-014`、`AGQ-025`、`DEW-019`、`QIV-007`、`PHS-003`、`STM-008`、`FIO-007`、`RWG-019`、`REI-006`、`RES-008`、`RRD-010` 登记。Done condition：registry/spec/tasks ID一一对应且现有capability数字序正确。
- [x] 1.2 为 `CTS-005`/`SCO-014` 建立C3A plan compatibility。Done condition：缺省history、pre-C3B non-normalized current coordinates仍可读、current/history slug uniqueness、重复history与cross-UID collision均有focused tests。
- [x] 1.3 为 `CTS-007`/`DEW-019` 建立structured binding characterization。Done condition：覆盖payload UID+slug、manifest queue snapshot、legacy slug-only snapshot、ledger work_unit_ref与ambiguous/free-text-only record；禁止serialized substring推断。
- [x] 1.4 为 `CTS-006` 建立真实disk crash fixture与recursive snapshot。Done condition：fixture包含plan、current/old seeds、historical wave/reference outputs、queue/work-unit/ledger；只允许plan/affected seeds/topic-state workspace/run.log变化。
- [x] 1.5 建立apply target manifest并paired-review两条Evolution Directions。Done condition：明确删除artifact/reference move、link rewrite、result/ledger topic fields、generic path inventory；保留一个registry、one resolver、existing CLI/workspace。

## 2. Canonical Schema And Resolver

- [x] 2.1 实现 `SCO-014` `previous_layouts[]` Zod schema/defaults。Done condition：C3A current id/slug read兼容；current+previous slug全registry唯一；history与current分离且去重；不把layout-output normalization升级为global read gate。
- [x] 2.2 实现 `CTS-005` registry layout evaluator。Done condition：按UID输出current、previous与accepted slug list；不创建alias file/cache、retired state或第二truth。
- [x] 2.3 实现 `CTS-007` pure UID/layout resolver。Done condition：解析UID/current/previous slug与structured queue/work-unit binding；path consumers复用existing parser后传slug；无I/O、全局状态、free-text猜测或新path grammar。
- [x] 2.4 实现 `CTS-002` progress/inspect UID resolution。Done condition：改用existing submitted readers + resolver，删除ad-hoc ledger parse/serialized substring fallback；ambiguous legacy binding一个root且fail-closed。
- [x] 2.5 验证schema/resolver。Done condition：覆盖多次rename、repeated renumber dedupe、current/previous collision、historical path原位绑定、unsupported/free-text no-resolution。

## 3. Queue And Work-Unit Binding

- [x] 3.1 实现 `AGQ-025` new queue payload binding。Done condition：Engine从current slug确定性填`payload.topic_uid`并保留`payload.topic_slug`；caller/lineage UID若存在必须一致；queue schema version不变。
- [x] 3.2 实现 `QIV-007` current-layout enqueue validation。Done condition：previous slug返回current slug建议但no-write；caller UID mismatch no-write；omitted UID自动固化；accepted workspace优先exact recover。
- [x] 3.3 实现 `DEW-019` claim/submit binding reuse。Done condition：manifest existing queue-item snapshot保留payload binding；submit/provenance通过snapshot验证UID；result/ledger schema无新增topic字段。
- [x] 3.4 实现legacy submitted resolution。Done condition：ledger通过`work_unit_ref`读取manifest snapshot；unique previous slug解析同UID；missing/ambiguous snapshot明确blocked且不改immutable bytes。
- [x] 3.5 实现layout quiescence evaluator。Done condition：active/refill demand、delegated_in_flight、claimed/nonterminal work按resolver UID聚合并返回existing owner一个动作；topic-state零queue/work-unit mutation。
- [x] 3.6 实现affected-UID diff。Done condition：仅remove或final id/slug/title变化的UID进入quiescence/seed mutation；complete target中的unchanged active UID不阻断。
- [x] 3.7 验证queue/work-unit containment。Done condition：current enqueue/claim/submit、alias reject、UID mismatch、changed-active blocker、unchanged-active nonblock、terminal/submitted immutable resolution与authority snapshot全部PASS。

## 4. Complete Layout Target And Safe Remove

- [x] 4.1 实现 `CTS-006` `mutate_layout` complete-target Zod input。Done condition：rerun context、`expected_plan_sha256`、ordered retained topics、explicit remove UIDs；每个current UID恰好一次；不得混migrate/add/update。
- [x] 4.2 实现 `CTS-006` inspect layout baseline。Done condition：side-effect-free输出完整`rb_plan.md` SHA256与ordered UID/title/lossless slug-stem；非lossless legacy coordinate标`slug_stem_required`；不新增registry hash规则、不写draft/cache、不要求用户算UID/hash。
- [x] 4.3 实现deterministic target registry builder。Done condition：Engine从顺序生成continuous id/slug，preserve UID/intent/dependencies，append/dedupe history；恢复同UID旧slug时promote+rotate history，跨UIDhistory collision阻断；不猜title/slug/remove。
- [x] 4.4 实现 `CTS-005` safe-remove dependency proof。Done condition：inbound dependency明确blocked；remaining dependency graph仍通过CanonicalPlanSchema。
- [x] 4.5 实现safe-remove historical fact proof。Done condition：任何queue terminal/active、work-unit、ledger、submitted output、artifact/reference fact under current/previous slug均blocked；explicit topic-scoped但无法unique resolve的record以`remove_history_unresolved` fail-closed；seed/trace prose不误作content authority。
- [x] 4.6 实现 `CTS-006` rerun authorization reuse。Done condition：只接受C3A current-node/status/latest route-bound witness；HITL1/post-final/maintenance/forged context在workspace前no-write。
- [x] 4.7 实现one-action pre-accept blockers。Done condition：active owner、remove history、dependency、plan hash、slug collision与ambiguous legacy各返回一个最近动作；不创建workspace或级联噪声。
- [x] 4.8 实现byte-identical no-op。Done condition：final staged plan/seeds相同且cleanup empty时返回`unchanged`、无workspace/follow-up；recognized stale body table仍可形成plan-only repair。
- [x] 4.9 验证layout target semantics。Done condition：single/multi rename、swap/reorder、restore-own-previous slug、safe remove、history/dependency reject、duplicate/unknown UID、cross-UID collision、no-op与repeat input全部focused PASS。

## 5. Existing Plan-And-Seed Workspace

- [x] 5.1 实现 `CTS-003` existing manifest layout ordering。Done condition：complete staged plan/current seed replacements + seed-only `cleanup_files[]` expected hashes；无directory move、generic delete或path inventory。
- [x] 5.2 实现new/current seed staging。Done condition：保留seed body，更新current UID/id/slug/title metadata；new target paths先durable stage，old seeds尚未删除。
- [x] 5.3 实现seed target collision preflight。Done condition：same-UID current replace允许；new path必须absent；orphan/cross-UID/symlink/directory target在prepared前blocked且不overwrite/adopt。
- [x] 5.4 实现registry-last roll-forward commit。Done condition：new/current seeds→plan→hash-bound old-seed cleanup；workspace存在时topic work/gates blocked；parent dirs fsync。
- [x] 5.5 实现exact explicit recover。Done condition：expected-old写staged、staged-new视为完成、cleanup old-match删除/absent完成、late drift blocked；不接受新语义或自动rollback。
- [x] 5.6 实现safe remove seed cleanup。Done condition：只删除manifest列出的proved-unused seed且hash匹配；不删除artifact/reference/cache/final或bundle外文件。
- [x] 5.7 实现 `PHS-003` standard Topic Registry table refresh。Done condition：recognized table随同staged plan更新current UID rows并尽力保留status；previous layouts不显示；non-standard body保留+advisory且不阻断。
- [x] 5.8 验证crash/presentation boundaries。Done condition：prepare前、prepared后、seed target collision、new seed后、plan后、partial cleanup、cleanup前、missing staged、late drift、symlink/cross-device与non-standard body均真实disk PASS/no-overwrite。

## 6. Gate, Observability And Agent Integration

- [x] 6.1 实现 `STM-008` current seed contract。Done condition：clean commit后每UID只有current seed；old seed不留alias；workspace时seed gate仅报exact recover。
- [x] 6.2 实现 `RWG-019` wave gate UID aggregation。Done condition：每UID将current+previous slug作为OR alternatives聚合submitted Wave0/Wave1 coverage；不为每alias新增floor；current seed/new work仍current-only；physical output/provenance dedupe。
- [x] 6.3 实现 `FIO-007` observability integration。Done condition：historical artifact/reference path原位归同UID且不建议move；previous slugs不生成missing expected paths；workspace只短路seed/layout临时症状。
- [x] 6.4 实现 `RRD-010` reentry integration。Done condition：workspace一个root/exact recover；layout collision/ambiguous snapshot同UID聚合；post-final仍指C5 boundary且只读。
- [x] 6.5 实现 `REI-006` rerun guidance。Done condition：用户决定完整layout target；Agent自行drain/apply/recover/style/audit；clear mechanical work不推用户；无direct multi-file edit/human-directed bypass。
- [x] 6.6 实现 `RES-008` style follow-up。Done condition：仅safe remove改变registry length时返回existing style action；rename/reorder不触发；topic-state helper不写profile。
- [x] 6.7 更新`DPT_FRAMEWORK/COMMANDS.md`与existing topic-state playbook。Done condition：一个CLI/一个playbook，copyable `inspect → drain或mutate_layout → exact recover → style if named → inspect/audit`。
- [x] 6.8 实现 `CTS-004` static simplicity/helper guards。Done condition：删除one resolver、historical-path immutability、registry-last、Agent-owned mechanics或C5 boundary会失败；新增artifact/reference move、link rewrite、result/ledger topic fields、second CLI/workspace、retired state、force/watcher/daemon/controller会失败。

## 7. Controlled Proof, Version And Backlog

- [x] 7.1 在existing rerun/reentry family新增incident-shaped controlled case。Done condition：production CLI在真实disposable bundle证明rename+renumber、historical files原位继续gate coverage、mid-seed crash/exact recover、safe remove与ambiguous legacy no-write；不新增runner/family/mock。
- [x] 7.2 执行controlled case并更新`experiments_playbook/RUN_EXPS.md`。Done condition：PASS来自真实bytes/CLI/trace checks，repeat inspect/recover稳定，结束清理bundle。
- [x] 7.3 更新overall roadmap与来源计划。Done condition：C3B状态、Human Override B覆盖度、Breakpoint/C3关闭条件与C5剩余边界同步；不提前关闭post-final/override问题。
- [x] 7.4 按version contract更新`CHANGELOG.md`为`v0.26`。Done condition：只声明canonical rename/reorder/safe-remove、UID resolver与历史coverage原位兼容。
- [x] 7.5 同步`DPT_FRAMEWORK/RUN.md` version banner。Done condition：与CHANGELOG最新条目一致，version regression PASS。

## 8. Verification And Governance

- [x] 8.1 运行CTS/SCO/AGQ/DEW/QIV/PHS/STM/FIO/RWG/REI/RES/RRD focused unit/integration/static regressions。Done condition：全部PASS且`git diff --check`无错误。
- [x] 8.2 运行受影响gate/reentry/queue/work-unit/provenance回归。Done condition：current behavior无退化；historical slug coverage与workspace short-circuit通过。
- [ ] 8.3 运行完整`node --test tests`。Done condition：全量PASS；不修无关failure。
- [ ] 8.4 运行`openspec validate mutate-canonical-topic-layout --strict`。Done condition：strict PASS。
- [ ] 8.5 运行`node openspec/governance/check-project-reqs.mjs`。Done condition：0 duplicate/orphan/unregistered/reusedRetired。
- [ ] 8.6 运行`node openspec/governance/check-project-specs.mjs`。Done condition：0 deltaHeaderInMain/missingPurpose/missingRequirements/missingReqHeader。
- [ ] 8.7 最终scope audit。Done condition：一个registry、one pure resolver、existing helper/CLI/plan+seed workspace/playbook；无artifact/reference/final move、link rewrite、result/ledger topic fields、retired/tombstone state、second registry/progress state、queue mutation during layout、ledger/receipt/trace rewrite、post-final mutation、force/generic transaction/controller；apply evidence记录全部验证结果。

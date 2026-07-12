## 1. Governance And Characterization

- [x] 1.1 登记 `CTS` → `canonical-topic-state` 与 `CTS-001`..`CTS-004`，并登记 `SCO-013`、`PRP-011`、`STM-007`、`QIV-006`、`REI-006`、`RES-007`、`RRD-009`。Done condition：prefix/ID唯一、按capability/数字排序、proposal/spec/tasks一致。
- [x] 1.2 为 `CTS-001` 建立 legacy/canonical registry与seed characterization。Done condition：锁定registry owner、UID-bound seed projection、artifact/cache/reference/final为derived/historical；未知identity surface默认blocked。
- [x] 1.3 为 `CTS-002` 建立direct progress fact characterization。Done condition：registry/seed、current-slug queue/work-unit、submitted ledger与accepted artifact precedence可测试；trace/log/chat/mtime/new progress file明确exclude。
- [x] 1.4 为 `CTS-003` 建立真实disk crash fixtures。Done condition：覆盖prepared前后、plan replace后、部分seed replace后、cleanup前与late drift；只用临时bundle和production hooks。
- [x] 1.5 为 `CTS-004` 建立recursive authority snapshot helper。Done condition：只允许`rb_plan.md`、listed seed、topic-state workspace与run.log变化；profile/status/trace/queue/work-unit/ledger/receipt/artifact/cache/reference/final及bundle外零mutation。

## 2. Canonical Schema And Inspection

- [x] 2.1 实现 `SCO-013` `topic_registry_version: "2"`、`LegacyPlanSchema`、`CanonicalPlanSchema` 与compatibility-union `PlanSchema`。Done condition：空registry也可明确分型；general readers可读legacy；new-run HITL1与mutation严格canonical；resumed legacy保留既有read/gate兼容但不可新增/修改topic；parent failure短路下游症状。
- [x] 2.2 实现 `CTS-001` registry/seed UID binding evaluator。Done condition：exact UID/slug/intent matching、orphan/missing/mismatch一个primary blocker；不从filesystem推断新topic。
- [x] 2.3 实现 `CTS-002` progress read model。Done condition：closed precedence输出`not_started|in_progress|complete|blocked`、direct `fact_refs[]`、reason和最多一个action；projection不落盘。
- [x] 2.4 实现 `RRD-009` reentry adapter。Done condition：同一UID症状聚成一个root，accepted workspace为直接blocker，adapter无mutation authority。
- [x] 2.5 验证 schema/inspect。Done condition：覆盖canonical/legacy、duplicate UID/slug、count/dependency drift、orphan seed、queued/claimed/submitted/not-started/mixed blocker与repeat byte-stable。

## 3. Bounded Plan And Seed Workspace

- [x] 3.1 实现 `CTS-003` `canonical-topic-state.mjs` schemas/path helpers。Done condition：一个helper、一个`_diagnostics/topic-state/<operation-id>/`；manifest只绑定plan与listed seed replacements、expected/staged SHA256、input digest、current-node/status snapshot与rerun witness indexes。
- [x] 3.2 实现durability adapters。Done condition：exclusive workspace、durable prepared publish、file/dir fsync、same-device/path/hash recheck与hooks；无copy fallback、timer、watcher、lock/lease/PID或通用transaction框架。
- [x] 3.3 实现 explicit accepted workspace recovery。Done condition：inspect/apply只返回exact `recover --operation-id`；recover只用prepared manifest完成或blocked；无hidden auto-resume，late drift不覆盖，repeat稳定。
- [x] 3.4 实现 plan→seed ordered commit。Done condition：plan replace后crash可继续 exact seed replacements；workspace存在时new topic eligibility blocked；commit完成后cleanup。
- [x] 3.5 验证 workspace boundaries。Done condition：覆盖prepare前crash不overclaim且input retained、prepared后、plan committed/seed pending、seed partial、missing staged、hash/path/cross-device drift、cleanup interruption与zero outside/control mutation。

## 4. Migration And Apply

- [x] 4.1 实现 `CTS-001` `migrate_legacy` reconciliation schema。Done condition：每个registry slug必须提供must-answer/scope-role/dependency slugs；registry-external slug只有显式`adopt`+seed binding choice才可进入；Engine不从artifact/chat/seed prose猜语义。
- [x] 4.2 实现lifecycle authorization adapter。Done condition：inspect anywhere且只读；HITL1要求current-node+`hitl1_recorded→setup_ready`窗口；rerun要求current-node+latest non-superseded route-bound HITL2 witness+`hitl2_recorded→rerun_ready`窗口；context/human-directed不授权；post-final/C5前no-write。
- [x] 4.3 实现 `apply migrate_legacy` transaction。Done condition：仅sanctioned rerun可用；原子写入version marker、UID/intent并可绑定一个exact orphan seed或stage新seed skeleton；touched slug有queued/claimed work时在workspace前blocked并指向existing owner；历史content不因adopt获authority。
- [x] 4.4 实现 `apply add_topic`。Done condition：仅legal HITL1或sanctioned rerun可用；一个plan可含多个add/update但不得混migrate；Engine分配never-reused ordinal/slug/UID并在一个prepared manifest中原子提交final registry+全部seeds；成功前topic不可进入work。
- [x] 4.5 实现 `apply update_intent`。Done condition：仅legal HITL1或sanctioned rerun可用；同一change set先全量验证duplicate target/dependency；只更新title/must-answer/scope-role/dependencies；UID/id/slug immutable；active work由existing owner处理，topic operation零queue/work-unit mutation。
- [x] 4.6 实现 C3B/C5 missing boundary。Done condition：remove/retire/rename/renumber/delete/path-move与post-final fresh apply在prepare前以stable reason/action拒绝，不建议direct multi-file edit或context bypass。
- [x] 4.7 验证 apply authorization/recover。Done condition：覆盖legal HITL1、legal rerun、migrate rerun-only、forged context、stale/missing/superseded witness、wrong status window、post-final no-write、accepted recover after lifecycle drift。
- [x] 4.8 验证 apply semantics。Done condition：覆盖migrate_legacy、explicit external adoption、unaccounted external blocker、multi-add/update atomic set、migration-mix reject、duplicate target、invalid dependency、UID/slug immutability、no-op、late drift与input retention。

## 5. CLI And Existing Owner Integration

- [x] 5.1 实现 `CTS-003`/`CTS-004` `operate-topic-state.mjs`，仅`inspect|apply|recover`与显式bundle/input/operation-id参数。Done condition：stable JSON、exit 0/1/2；无env/force/patch/delete/remove/rename/renumber/set-progress/status/reentry/override。
- [x] 5.2 实现 `PRP-011` HITL1 canonical materialization与new bundle template marker。Done condition：新bundle空registry明确canonical；用户只审语义；Agent写retained input并立即运行apply/style/probe/gate；HITL1 gate要求non-empty canonical plan+UID seeds并短路half-commit症状。
- [x] 5.3 实现 `STM-007` UID-bound seed integration。Done condition：canonical seed phase验证/丰富而非首次保存approved intent；orphan seed不获authority；resumed legacy保留既有slug-only兼容但不可扩张，C5-backed migration/reentry coverage后退役。
- [x] 5.4 实现 `QIV-006` shared enqueue preflight。Done condition：复用同一registry/seed/workspace evaluator；workspace/missing/mismatch/legacy no-write reject；legacy outside rerun不建议不可达migrate；queue schema/contents owner与finding exception不变。
- [x] 5.5 实现 `REI-006` rerun integration。Done condition：add/refine先topic-state apply；active work由existing owner机械处理；remove/rename/renumber与post-final request保持missing boundary。
- [x] 5.6 实现 `RES-007` style follow-up。Done condition：add commit结果只给existing style owner一个follow-up；topic helper不改profile，HITL1/rerun gate前完成recompute。
- [x] 5.7 实现 `RRD-009` reentry integration。Done condition：consume inspect结果、一个root/一个action；accepted workspace即使lifecycle drift也只给exact recover；post-final无workspace时给missing C5而非apply；无topic mutation/progress persistence。
- [x] 5.8 验证 production CLI/decision-point containment。Done condition：真实JSON/exit覆盖三操作、legacy/canonical/workspace/active-owner/follow-up；HITL1/queue共享结果同源，recursive snapshot证明owner边界。

## 6. Agent Guidance And Simplicity Guards

- [x] 6.1 更新`DPT_FRAMEWORK/COMMANDS.md`与一个topic-state playbook。Done condition：copyable `inspect → recover或apply → style follow-up → inspect`；普通命令/机械恢复Agent-owned，只有新语义/风险/权限才问用户。
- [x] 6.2 更新HITL1、seed、rerun与anti-cheating guidance。Done condition：用户审语义后Agent自动apply/style/probe/gate；新scope materialize-before-work；禁direct registry edit、parallel identity、seed-only authority与human-directed permission inflation。
- [x] 6.3 明确 C3B boundary。Done condition：docs/spec/static tests说明remove/rename/renumber/path migration未实现，Agent不得手改多面或误报完成。
- [x] 6.4 增加static contract regression。Done condition：删除registry owner、stable UID、explicit migration、direct progress、one-action或post-final/C3B boundary会失败；runtime不读Markdown作authority。
- [x] 6.5 增加simplicity scope guard。Done condition：一个helper、一个`inspect|apply|recover`CLI、一个workspace、一个playbook；无hidden recovery/second registry/progress DB/event store/global index/watcher/daemon/lock/general transaction/layout mutation。
- [x] 6.6 运行paired Evolution Direction review。Done condition：target manifest证明C3A拆分后的net simplification与user/Agent/Engine责任；apply不得偷偷拉回C3B或queue schema迁移。

## 7. Controlled Proof And Source Closure

- [x] 7.1 在现有reentry/rerun family新增controlled case。Done condition：`new-disposable-bundle.mjs` + production CLI/hooks证明legacy migration、external adopt不授予content authority、HITL1 add后crash、queue在plan-first/seed-pending时拒绝、explicit recover、active-work update blocker、direct progress与zero authority mutation；不新增family/runner。
- [x] 7.2 更新`experiments_playbook/RUN_EXPS.md`并逐step执行case。Done condition：PASS来自真实bytes/CLI/trace checks，repeat inspect/preflight稳定，PASS后清理bundle。
- [x] 7.3 更新Breakpoint P2/P3、Human Override A、BUG-079与Overall roadmap。Done condition：标记C3A identity/intent/progress完成；Human B及remove/rename/renumber转C3B，post-final/override/state-jump/C4/C5仍开放。
- [x] 7.4 按VEM-002更新`CHANGELOG.md`为`v0.24`。Done condition：只声明canonical topic migration/add/intent/progress，不声称layout mutation或post-final/override。
- [x] 7.5 按VEM-003/004同步`DPT_FRAMEWORK/RUN.md` version banner。Done condition：与CHANGELOG一致，version regression PASS。

## 8. Verification And Governance

- [x] 8.1 运行CTS/SCO/PRP/STM/QIV/REI/RES/RRD focused regression、CLI integration、authority snapshot、MD/static scope与受影响HITL1/seed/queue/rerun/reentry tests。Done condition：全部PASS，`git diff --check`无错误。
- [x] 8.2 运行完整`node --test tests`。Done condition：全套PASS；不修无关failure。
- [x] 8.3 运行`openspec validate establish-canonical-topic-state --strict`。Done condition：change严格验证PASS。
- [x] 8.4 运行`node openspec/governance/check-project-reqs.mjs`。Done condition：0 duplicate/orphan/unregistered/reusedRetired。
- [x] 8.5 运行`node openspec/governance/check-project-specs.mjs`。Done condition：0 deltaHeaderInMain/missingPurpose/missingRequirements/missingReqHeader。
- [x] 8.6 最终scope audit。Done condition：single registry/helper/CLI/workspace/read model；无queue schema change/remove/rename/renumber/path migration/parallel registry/progress ledger/FIO/trace/status/post-final/override/state-jump/actor fallback；全部证据闭环记录。

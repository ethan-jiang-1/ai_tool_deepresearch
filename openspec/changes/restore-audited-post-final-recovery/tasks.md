## 1. Governance And Characterization

- [ ] 1.1 登记新 capability `post-final-recovery` 的 `POF` prefix 与 `POF-001..003`，并核对 `CPT-003..006/008`、`RRD-002/008..010`、`CDP-003..004`、`REI-002`、`CTS-003..004`、`ACS-001` 的 main spec/delta映射。Done condition：registry按capability字母序与组内数字序更新，0 duplicate/orphan/unregistered/reusedRetired，MODIFIED旧场景覆盖完整。
- [ ] 1.2 为 `CPT-003` / `RRD-008` 建立 BUG-078 terminal Final characterization。Done condition：真实最小bundle证明latest readiness→Final handoff/load存在、旧 predecessor gate/enter-phase hitl2不可达、当前 `check-reentry` 返回 missing contract且fixture不手写成功authority。
- [ ] 1.3 建立 apply target manifest 并 paired-review 两条 Evolution Directions。Done condition：review确认one `post-final-recovery` capability/module、one operation helper/CLI/workspace/event class与existing trace append owner；明确不新增generic override/state-seed、auth token/service、Final loop、lifecycle mode、second topic owner或parallel addendum success path。
- [ ] 1.4 定义 `CPT-003` / `CDP-004` threat-model assertions。Done condition：tests/docs明确request metadata不是verified identity/permission；host permission是外部边界；same-principal malicious actor不被虚假宣称为可防御。

## 2. Post-Final Recovery Evaluator And Contract

- [ ] 2.1 实现 `POF-001` pure latest-Final-lineage/routing evaluator。Done condition：从existing handoff/load/status/profile/final inventory解析一个lineage；把closed action映射到HITL2 outcome `rerun`并通过existing transition/manifest helper解析target/window；无C5-local target table或Final edge；非法/ambiguous facts一个direct blocker。
- [ ] 2.2 实现 `POF-001` Zod request schema与digest normalization。Done condition：closed `post_final_rerun` action、non-empty reason/scope、inspect-derived expected lineage hashes；拒绝target node/gate/status patch、force、override、identity token与unknown fields。
- [ ] 2.3 实现 `POF-001` rerun-limit reuse。Done condition：读取active `rerun_count_limit` gate rule，按phase-rerun会先递增的顺序判断；下一次必败时workspace前blocked，绝不reset/bypass/hardcode第二份limit。
- [ ] 2.4 实现 `POF-001` owner/quiescence short-circuit。Done condition：accepted artifact-persistence先existing quiescent sweep、topic-state先exact recover、post-final workspace先exact recover；active queue/work-unit或ambiguous control lineage在workspace前blocked；repairable canonical topic drift保留为rerun后C3 root。
- [ ] 2.5 实现 `RRD-008` side-effect-free post-final inspect result。Done condition：输出 `eligible|unchanged|recover_required|blocked`、direct facts与至多一个structured next action；不写profile/status/trace/workspace/log。
- [ ] 2.6 验证 evaluator/contract focused tests。Done condition：clean Final、legacy topic drift、pending C2/C3 owner、stale request、wrong bundle lineage、nonterminal status、active owner、rerun count 0/1/2、unknown action与repeat inspect全部确定性PASS。

## 3. Prepared Workspace And Exact Recovery

- [ ] 3.1 实现 `POF-002` `_diagnostics/post-final-recovery/<operation-id>/` prepared manifest。Done condition：只列request、before/after profile与one exact event，status仅记录terminal expected hash不纳入mutation file list；记录Final lineage、trace prefix/index、commit order与original eligibility；无generic file inventory。
- [ ] 3.2 实现 `POF-002` profile staging。Done condition：只写existing HITL2 `status: recorded`、`user_decision: rerun`、operation `recorded_at`与共享确定性reason+scope→`rationale`序列化，保留其它fields与rerun_count；reason/scope在event中分字段审计；不新增profile scope字段或second request ledger。
- [ ] 3.3 实现 `POF-002` terminal-status CAS guard。Done condition：event发布前status必须仍为accepted `readiness_passed → none`/Final current-node bytes；C5不写status，drift则blocked并归还现有owner。
- [ ] 3.4 在existing trace writer owner实现 `POF-002/003` exact durable append primitive。Done condition：recheck prepared trace prefix/index、append pre-staged exact bytes、fsync file/parent、same operation/event idempotent、conflicting digest blocked；不创建second generic trace writer。
- [ ] 3.5 实现 event-last roll-forward commit。Done condition：profile→terminal-status recheck→shared `prepared_pre_entry` evaluation→existing trace primitive append `post_final_reentry`→cleanup；event前partial profile不授权handoff，event后status仍terminal并等待existing entry/sync owners。
- [ ] 3.6 实现 exact `recover`。Done condition：expected-old profile写staged、staged-new视为完成、terminal status须未漂移、exact event缺失则append、event已存在则cleanup；late profile/status/trace drift blocked且不overwrite/restore/delete history；不接受新input。
- [ ] 3.7 实现 `operate-post-final-recovery.mjs inspect|apply|recover`。Done condition：one Zod envelope与closed per-operation verdicts（inspect `eligible|unchanged|recover_required|blocked`; apply `committed|unchanged|recover_required|blocked`; recover `committed|cleaned|blocked`）、explicit flags、0/1/2 exit convention、retained input提示、one next action；无环境变量、force、target/status/event payload flags。
- [ ] 3.8 验证 crash/containment。Done condition：prepared前、profile后、terminal-status drift、postcondition前、trace-prefix drift、event后、cleanup前、missing staged、hash drift与repeat recover真实disk测试PASS；POF recursive snapshot仅允许profile/trace/workspace/run.log变化，status byte-identical。

## 4. Handoff And Canonical Topic Integration

- [ ] 4.1 实现 `POF-003` / `CPT-003` pure `post_final_reentry` event parser。Done condition：entry前重跑existing HITL2 `rerun` transition lookup并校验recorded resolution、operation/request/Final-lineage/rerun-rule与exact pre-entry shape；不把arbitrary trace text、C5-local/caller target解释为route。
- [ ] 4.2 实现 `CPT-003/005/008` existing handoff selection/`enter-phase`扩展。Done condition：normal gate handoff保持兼容；valid recovery event可进入existing `phase-rerun`并写route-bound `load_complete`引用operation/event，只更新current_node；术语称exceptional handoff witness而非gate pass；不写synthetic gate attempt或gate window。
- [ ] 4.3 实现 `CPT-004/008` exceptional status sync reuse。Done condition：event+route-bound load后existing `advance-status --to hitl2_recorded`重用transition/manifest解析，写`hitl2_recorded → rerun_ready`与normal phase_transition recovery context；其他source/action无例外，不完整链fail closed。
- [ ] 4.4 实现 `CPT-006/008` gate preflight/source witness diagnostics。Done condition：event-only建议enter-phase，event+load/unsynced建议advance-status，stale/mismatched event一个root；不完整链不授权topic/rerun work，不再建议必败predecessor gate循环。
- [ ] 4.5 实现 `REI-002` / `CTS-003` complete exceptional witness adapter。Done condition：initial phase-rerun/topic-state只在valid C5 event+exact event-bound after-profile+route-bound load+exceptional phase_transition+current rerun window后接受；之后只接受event-bound current_count→next_count one-field delta并复用same rule digest；normal HITL2 witness无退化，早期stage或其它profile drift no-write reject。
- [ ] 4.6 实现 `CTS-004` authority containment。Done condition：C5 helper零status/topic/queue/work-unit/ledger/artifact/reference/final mutation；existing enter/advance owners保留node/status；C3继续唯一拥有topic actions；reentry本身不adopt addendum topic。
- [ ] 4.7 验证 handoff/topic-state integration。Done condition：normal rerun无退化；C5 event→enter→advance→C3可执行migrate/add/update/layout；unsupported post-final repair/state-seed仍blocked；historical provenance bytes保持不变。

## 5. Reentry And Agent-Facing Flow

- [ ] 5.1 实现 `RRD-002` accepted control-baseline override。Done condition：valid C5 event+route-bound rerun load+exceptional phase_transition解释旧HITL2 checkpoint后的profile/current-node/status变化；`--at hitl2_recorded`不误报旧hash，其他control/artifact drift语义不变；`--at phase-rerun`仍要求rerun_ready。
- [ ] 5.2 实现 `CPT-006` / `RRD-008` staged root projection。Done condition：workspace→recover、event-only→enter-phase、event+load/terminal-window→advance-status、synced rerun→existing C3 action；C2/C3 owner/limit exhausted/unsupported各一个动作，无manual-bypass cascade/global strategy。
- [ ] 5.3 实现 `RRD-009` canonical topic root handoff。Done condition：C5之前不提前暴露topic apply；valid rerun load后暴露existing C3 inspect/apply/recover；same UID symptoms继续一个root。
- [ ] 5.4 实现 `RRD-010` layout root handoff。Done condition：terminal layout request先走C5；进入rerun后复用existing `mutate_layout` owner；不新增post-final path mover/second workspace。
- [ ] 5.5 更新 `CDP-003/004` Final/rerun guidance。Done condition：Phase Final body与delivery contract只有一条一致路由；Final保持terminal non-interactive；post-final user只决定rerun semantics/risk；accepted request记录HITL2 semantics后直接进入existing rerun，不重复询问同一决定、不描述Final loop。
- [ ] 5.6 更新 `ACS-001` / `CPT-005` command index/playbook。Done condition：copyable `inspect → retain request → apply/recover → enter-phase → advance-status --to hitl2_recorded → check-reentry --at hitl2_recorded → existing C3/pipeline`；明确exceptional handoff不等于gate pass、`--at phase-rerun`表示rerun已pass而非刚entry；host approval若必需只请求该动作；rerun limit耗尽只请求是否新建bundle，之后Agent继续机械步骤。
- [ ] 5.7 扩展 existing command-contract static regression。Done condition：锁定no `--human-directed|--override|--force` permission wording、no human co-runner、no verified identity overclaim、no addendum success path；不新增prose classifier或每句exact marker。

## 6. Focused Regression And Controlled Proof

- [ ] 6.1 为 `POF-001..003` 增加 operation schema/eligibility/CLI focused tests。Done condition：happy path、operation-specific verdict schema、reason+scope profile projection、invalid invocation、C2/C3 owner precedence、rerun limit、stale replay、identical repeat unchanged、same-Final different request blocked、event-last和exit codes全部PASS。
- [ ] 6.2 为 `POF-002` 增加 crash-point integration matrix。Done condition：每个accepted interruption只有exact roll-forward recover或direct drift blocker；无event authority早发、rollback branch或silent overwrite。
- [ ] 6.3 为 `RRD-008..010` 增加 read-only root tests。Done condition：每种state只有一个最近action，parent workspace短路derived symptoms，recursive before/after snapshot零mutation。
- [ ] 6.4 为 `CPT-003..006/008` / `REI-002` / `CTS-003..004` 增加 staged dual-witness tests。Done condition：normal rerun/chain继续PASS；C5 event→enter→advance→current window通过；event without load、load without sync、stale lineage、wrong window、caller context全部在正确owner no-write fail；术语与fail-closed测试不把exceptional event称为gate pass，也不允许不完整event+load链授权下游。
- [ ] 6.5 在existing recovery/reentry experiment family新增incident-shaped controlled case。Done condition：production CLIs在真实disposable bundle完成legal Final→C5 apply/recover→enter rerun→advance status→C3 canonical add/adopt→normal rerun handoff；trace裁决且无 `_cache/addendum/` / `final/addendum/` / hand-written authority。
- [ ] 6.6 执行controlled case并记录proof。Done condition：PASS来自真实bundle bytes、production CLI JSON与`rb_trace.jsonl`；验证prior Final lineage、新 recovery lineage、canonical topic footprint、repeat operation稳定并清理disposable bundle。

## 7. Version, Documentation And Backlog

- [ ] 7.1 更新 `CHANGELOG.md` 为 `v0.27`。Done condition：简洁说明audited Final→rerun、event-last exact recovery、existing C3 reuse与明确无generic override/auth subsystem。
- [ ] 7.2 同步 `DPT_FRAMEWORK/RUN.md` version banner/current release。Done condition：与CHANGELOG最新条目一致，说明post-final rerun由Agent执行legal recovery chain且Final仍terminal。
- [ ] 7.3 更新 overall roadmap、BUG-078/079与来源plan状态。Done condition：BUG-078仅在controlled proof通过后Closed；BUG-079只按canonical post-final route实际覆盖更新；generic maintenance/debug state-seed仍Partial，不提前关闭human-override plan。

## 8. Verification And Governance

- [ ] 8.1 运行 POF/CPT/RRD/CDP/REI/CTS/ACS focused unit/integration/static regressions。Done condition：全部PASS且`git diff --check`无错误。
- [ ] 8.2 运行受影响 handoff/gate/reentry/topic-state/profile/status/Final regressions。Done condition：normal lifecycle、normal HITL2 rerun、C3A/C3B与terminal Final行为无退化。
- [ ] 8.3 运行完整 `node --test tests`。Done condition：全量PASS；无关既有failure只记录不越界修复。
- [ ] 8.4 运行 `openspec validate restore-audited-post-final-recovery --strict`。Done condition：strict PASS。
- [ ] 8.5 运行 `node openspec/governance/check-project-reqs.mjs`。Done condition：0 duplicate/orphan/unregistered/reusedRetired。
- [ ] 8.6 运行 `node openspec/governance/check-project-specs.mjs`。Done condition：0 deltaHeaderInMain/missingPurpose/missingRequirements/missingReqHeader。
- [ ] 8.7 最终 paired-direction scope audit。Done condition：one `post-final-recovery` capability/module/helper/CLI/workspace/event class；existing transition/manifest/trace/handoff/reentry/topic-state owners；无C5-local routing table/Final edge、generic override/state-seed、caller-chosen route/status/event、auth token/service、new lifecycle mode/gate/phase、second Final loop/topic owner/request ledger/trace writer、watcher/daemon/retry tree、parallel addendum authority；apply evidence记录全部验证结果。

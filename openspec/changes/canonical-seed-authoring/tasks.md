## 1. Verification Baseline

- [ ] 1.1 为 CTS-003、STM-001、AGQ-002 运行 `node openspec/governance/check-verification-routing.mjs --change canonical-seed-authoring --mode plan` 并确认 6 个 claims、四类 canonical routes 全部合法后再修改任何 target code。
- [ ] 1.2 为 CTS-003/STM-001 扩展 `tests/engine/helpers/canonical-topic-state.test.mjs` 的先失败断言：parsed-value equality、quoted/colon/multiline/CJK/Unicode `must_answer` round trip、新 skeleton 无 duplicate body sections、existing body byte preservation。
- [ ] 1.3 为 CTS-003 新建 `tests/integration/cli/operate-topic-state-seed-enrichment.test.mjs` 的先失败矩阵：strict complete input、canonical/unknown/partial rejection、setup/rerun authorization、UID/path resolution、active seed card compatibility、pre/post evaluator、unchanged/commit/crash recover与no-side-effect failures。
- [ ] 1.4 为 AGQ-002/STM-001 先更新 queue/Gate 与 Markdown integration 断言：canonical mismatch 指向 `enrich_seed`、parse root保持bounded、same completion rerun、phase/task/shared/playbook wiring存在且raw canonical YAML/duplicate authoring wording不存在。

## 2. Canonical Enrichment Writer

- [ ] 2.1 实现 CTS-003 的 strict `SeedEnrichmentSchema` 与互斥 `TopicApplyPlanSchema` form：`context: seed_topics`、`action: enrich_seed`、exact `topic_uid`和complete five-field enrichment；所有strings/arrays/objects按delta fail closed。
- [ ] 2.2 实现 CTS-003 的 Seed Topics lifecycle authorization：复用existing handoff preflight，接受合法setup/rerun incoming witness与对应status window，拒绝forged/stale/arbitrary maintenance且不创建workspace。
- [ ] 2.3 实现 CTS-003 的single-topic mutation builder：registry解析UID/path、保留unknown non-canonical keys、覆盖exact five enrichment和seven canonical fields、保持body bytes、stage one seed plus unchanged plan contract且不读写queue/work-unit authority。
- [ ] 2.4 实现 CTS-003 的pre-render evaluator和post-render assertion：parseable drift返回first `binding_repair`并由同一merge修复；invalid frontmatter/input与writer postcondition在prepared publication前给一个direct root且无writes。
- [ ] 2.5 实现 CTS-003 的atomic result/recovery细节：`committed|unchanged`输出selected UID/slug/path与nullable repair，Seed Topics active card不触发intent quiescence，prepared manifest记录完整authorization/input hash，late drift与exact recover沿用existing workspace。
- [ ] 2.6 实现 CTS-003 的CLI contract minor update：topic-state schema version升至`1.1.0`，Zod/input failures投影为structured `input_invalid`/same apply rerun，existing inspect/apply/recover forms和result fields保持兼容。

## 3. Shared Evaluator And Completion Feedback

- [ ] 3.1 收敛 CTS-003 的 `evaluateSeedTopicAuthoring()` equality实现与测试，明确typed recursive parsed-value、exact code points/array order和presentation tolerance；保持one helper及fixed first-root field order。
- [ ] 3.2 修改 AGQ-002 的 `seed_topic_materialize` completion adapter：binding mismatch返回`engine_operation`与UID-bound `enrich_seed` owner，parse error只授权exact syntax repair并要求随后跑writer，所有失败保持queue bytes/nonterminal history不变。
- [ ] 3.3 修改 CTS-003/STM-001 的topic-state inspect和seed-topics Gate feedback adapter，使canonical mismatch复用同一evaluator并指向writer owner；保留Gate的registry enumeration、queue drain、trace、routing责任且不新增enrichment/body语义检查。
- [ ] 3.4 运行 CTS-003/AGQ-002 focused helper、topic-state CLI、queue completion和seed-topics Gate tests，确认happy/failure/recovery路径全部通过且没有第二validator或fallback writer。

## 4. Authoring Surface Convergence

- [ ] 4.1 修改 CTS-003/STM-001 的`renderNewSeedBody()`和renderer parity expectations：new seed删除body `must_answer`、scope和evidence-route duplicate sections，保留accepted non-duplicate initialization headings、appendix与tokens。
- [ ] 4.2 修改 STM-001 的`shared-seed-topic-authoring.md`：完整记录body edit -> retained complete `enrich_seed` input -> apply -> queue complete loop、explicit gap规则、frontmatter/body authority与legacy duplicate compatibility，不保留raw canonical YAML template instructions。
- [ ] 4.3 修改 STM-001 的`phase-seed-topics.md` task card/action/done condition和execution loop：Agent只写body并提交structured enrichment，`must_answer`由Engine exact copy且scope/evidence route不双写，failure按same checkpoint静默修复。
- [ ] 4.4 修改 CTS-003/STM-001 的`command_playbook/operate-topic-state.md`及必要command index/rerun add-topic pointers，给出strict input example、authorization、retained-input/recover和legacy parse exception，不创建第二authoring入口。
- [ ] 4.5 扩展 STM-001 的`tests/integration/md/seed-topic-authoring-contract.test.mjs`静态回归，证明实际requires可达、one legal loop存在、complete duplicate/raw-YAML instructions不会在phase/task/shared/playbook surfaces回流，同时容忍presentation prose。

## 5. Workflow-Scale Proof

- [ ] 5.1 实现 CTS-003/STM-001/AGQ-002 的`tests/e2e/canonical-seed-authoring.test.mjs`：从legal Seed Topics fixture boundary以明确标注的simulated Agent body/input驱动多个Topic，经real writer、queue complete、drain和real Gate；覆盖input/binding/recovery fault的same-check修复与authority byte assertions。
- [ ] 5.2 新增 STM-001/CTS-003 的`experiments_playbook/exp_wfn_seedtopic/case-204-heavy-canonical-seed-authoring.md`，使用setup-only disposable bundle与独立real Subject Agent，native trace checks只证明structured writer、exact canonical values、queue complete和Gate pass，不评价enrichment语义。
- [ ] 5.3 为 STM-001/CTS-003 将case-204加入exactly one `PLAYBOOK_MANIFEST.md` entry并通过playbook/frontmatter/route asset校验；case不得靠Playbook Agent或fixture伪装Subject authoring evidence。
- [ ] 5.4 运行 CTS-003/STM-001/AGQ-002 deterministic E2E与case-204 Agent Autorun，要求node-test exit PASS和trace-backed native PASS；Agent runtime不可用时记录诚实NOT_RUN且不得勾选real-Agent claim完成。

## 6. Compatibility And Release

- [ ] 6.1 为 CTS-003/STM-001/AGQ-002 运行pre-v0.50 compatibility cases：existing apply forms、parseable legacy seeds/unknown keys/duplicate body bytes、already-enqueued cards与v0.50 output的v0.49 reader shape均无需data/queue migration。
- [ ] 6.2 为 CTS-003/STM-001/AGQ-002 更新根`CHANGELOG.md`，增加`v0.50`简洁条目，说明structured canonical seed authoring、single-writer repair feedback与duplicate body authoring退役。
- [ ] 6.3 为 CTS-003/STM-001/AGQ-002 同步`DPT_FRAMEWORK/RUN.md`版本横幅、Current Release和最新条目至`v0.50`，内容与CHANGELOG一致。

## 7. Final Verification

- [ ] 7.1 为 CTS-003/STM-001/AGQ-002 运行全部focused unit/integration/deterministic E2E、相关workflow/package validation与repo full JS regression，所有native exits必须PASS且测试文件只位于repo-root `tests/`。
- [ ] 7.2 为 CTS-003/STM-001/AGQ-002 运行 `node openspec/governance/check-verification-routing.mjs --change canonical-seed-authoring --mode assets`，确认所有selected assets存在、case-204注册唯一且route/profile合法。
- [ ] 7.3 为 CTS-003/STM-001/AGQ-002 运行 `node openspec/governance/check-project-reqs.mjs`，必须达到0 duplicate、0 orphan、0 unregistered、0 reusedRetired。
- [ ] 7.4 为 CTS-003/STM-001/AGQ-002 运行 `node openspec/governance/check-project-specs.mjs`，必须达到0 deltaHeaderInMain、0 missingPurpose、0 missingRequirements、0 missingReqHeader。
- [ ] 7.5 为 CTS-003/STM-001/AGQ-002 运行`openspec validate canonical-seed-authoring --strict`并审查最终diff，确认没有queue-admission/evidence-projection/shared-reference scope、new dependency、new persistent state、第二writer/evaluator或`DPT_FRAMEWORK/`内测试文件。

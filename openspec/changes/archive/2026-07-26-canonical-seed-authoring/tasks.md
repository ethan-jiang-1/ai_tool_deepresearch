## 1. Verification Baseline

- [x] 1.1 为 CTS-003、STM-001、AGQ-002 运行 `node openspec/governance/check-verification-routing.mjs --change canonical-seed-authoring --mode plan` 并确认 6 个 claims、四类 canonical routes 全部合法后再修改任何 target code。
- [x] 1.2 为 CTS-003/STM-001 扩展 `tests/engine/helpers/canonical-topic-state.test.mjs` 的先失败断言：parsed-value equality、quoted/colon/multiline/CJK/Unicode `must_answer` round trip、新 skeleton 无 duplicate body sections，以及frontmatter closing-LF 后 deliberate blank line、legacy duplicate prose、appendix 与rerun direction 的 lexical body-suffix preservation。
- [x] 1.3 为 CTS-003 新建 `tests/integration/cli/operate-topic-state-seed-enrichment.test.mjs` 的先失败矩阵：strict complete input、canonical/unknown/partial rejection、setup/rerun authorization、UID/path resolution、active seed card compatibility、pre/post evaluator、unchanged/commit/crash recover与no-side-effect failures。
- [x] 1.4 为 AGQ-002/STM-001 先更新 queue/Gate/topic-state inspect 与 Markdown integration 断言：只有validated Seed Topics queue completion和Gate的canonical或parse root可走 `enrich_seed`；generic inspect/out-of-window的任何authoring root都不提供可执行writer，in-window parse repair保持bounded、same completion rerun、phase/task/shared/playbook wiring存在且raw canonical YAML/duplicate authoring wording不存在。

## 2. Canonical Enrichment Writer

- [x] 2.1 实现 CTS-003 的 strict `SeedEnrichmentSchema` 与互斥 `TopicApplyPlanSchema` form：`context: seed_topics`、`action: enrich_seed`、exact `topic_uid`和complete five-field enrichment；所有strings/arrays/objects按delta fail closed。
- [x] 2.2 实现 CTS-003 的 Seed Topics lifecycle authorization：复用existing handoff preflight，接受合法setup/rerun incoming witness与对应status window，拒绝forged/stale/arbitrary maintenance且不创建workspace；将该已验证window作为queue/Gate发布writer feedback的前提，而非generic inspect的推断依据。
- [x] 2.3 实现 CTS-003 的single-topic mutation builder：registry解析UID/path、保留unknown non-canonical keys、覆盖exact five enrichment和seven canonical fields；捕获closing frontmatter delimiter terminating LF后的lexical body suffix并原样重发（不删除leading LF）；stage one seed plus unchanged plan contract且不读写queue/work-unit authority。
- [x] 2.4 实现 CTS-003 的pre-render evaluator和post-render assertion：parseable drift返回first `binding_repair`并由同一merge修复；invalid frontmatter/input与writer postcondition在prepared publication前给一个direct root且无writes。
- [x] 2.5 实现 CTS-003 的atomic result/recovery细节：`committed|unchanged`输出selected UID/slug/path与nullable repair，Seed Topics active card不触发intent quiescence，prepared manifest记录完整authorization/input hash，late drift与exact recover沿用existing workspace。
- [x] 2.6 实现 CTS-003 的CLI contract minor update：topic-state schema version升至`1.1.0`，Zod/input failures投影为structured `input_invalid`/same apply rerun，existing inspect/apply/recover forms和result fields保持兼容。

## 3. Shared Evaluator And Completion Feedback

- [x] 3.1 收敛 CTS-003 的 `evaluateSeedTopicAuthoring()` equality实现与测试，明确typed recursive parsed-value、exact code points/array order和presentation tolerance；保持one helper及fixed first-root field order。
- [x] 3.2 修改 AGQ-002 的 `seed_topic_materialize` completion adapter：仅在已验证的Seed Topics lifecycle window中将binding mismatch返回为`engine_operation`与UID-bound `enrich_seed` owner，并仅在该window中对parse error授权exact syntax repair后跑writer；窗口外的canonical或parse root都保留direct diagnostic并返回`missing_contract`/current owner，所有失败保持queue bytes/nonterminal history不变。
- [x] 3.3 修改 CTS-003/STM-001 的topic-state inspect和seed-topics Gate feedback adapter：Gate在已验证window中复用同一evaluator并指向writer owner；generic inspect始终只输出direct diagnostic与`missing_contract`/current owner，绝不创建`enrich_seed`或raw-YAML repair path；保留Gate的registry enumeration、queue drain、trace、routing责任且不新增enrichment/body语义检查。
- [x] 3.4 运行 CTS-003/AGQ-002 focused helper、topic-state CLI、queue completion和seed-topics Gate tests，确认happy/failure/recovery路径全部通过且没有第二validator或fallback writer。

## 4. Authoring Surface Convergence

- [x] 4.1 修改 CTS-003/STM-001 的`renderNewSeedBody()`和renderer parity expectations：new seed删除body `must_answer`、scope和evidence-route duplicate sections，保留accepted non-duplicate initialization headings、appendix与tokens。
- [x] 4.2 修改 STM-001 的`shared-seed-topic-authoring.md`：完整记录body edit -> retained complete `enrich_seed` input -> apply -> queue complete loop、explicit gap规则、frontmatter/body authority、bounded syntax-only exception与legacy duplicate compatibility，不保留raw canonical YAML template instructions。
- [x] 4.3 修改 STM-001 的`phase-seed-topics.md` task card/action/done condition和execution loop：Agent正常只写body并提交structured enrichment；仅apply报告的exact syntax coordinate可作bounded frontmatter parse repair，之后必须跑writer；`must_answer`由Engine exact copy且scope/evidence route不双写，failure按same checkpoint静默修复。
- [x] 4.4 修改 CTS-003/STM-001 的`command_playbook/operate-topic-state.md`及必要command index/rerun add-topic pointers，给出strict input example、authorization、retained-input/recover和legacy parse exception，不创建第二authoring入口。
- [x] 4.5 扩展 STM-001 的`tests/integration/md/seed-topic-authoring-contract.test.mjs`静态回归，证明实际requires可达、one legal loop存在、complete duplicate/raw-YAML instructions不会在phase/task/shared/playbook surfaces回流，同时容忍presentation prose。

## 5. Workflow-Scale Proof

- [x] 5.1 实现 CTS-003/STM-001/AGQ-002 的`tests/e2e/canonical-seed-authoring.test.mjs`：从legal Seed Topics fixture boundary以明确标注的simulated Agent body/input驱动多个Topic，经real writer、queue complete、drain和real Gate；覆盖input/binding/recovery fault的same-check修复与authority byte assertions。
- [x] 5.2 新增 STM-001/CTS-003 的`experiments_env/shared/prepare-canonical-seed-authoring-canary.mjs`与`experiments_playbook/exp_wfn_seedtopic/case-204-heavy-canonical-seed-authoring.md`：helper以production setup handoff建立一个legal Seed Topics、queued seed-work 的setup-only disposable boundary；case使用独立real Subject Agent，native trace checks只证明structured writer、exact canonical values、queue complete和Gate pass，不评价enrichment语义。
- [x] 5.3 为 STM-001/CTS-003 在`experiments_env/shared/run-iterative-interaction-subject.mjs`注册`204` real-Agent Subject（含usage surface），并将case-204加入exactly one `PLAYBOOK_MANIFEST.md` entry；case须通过该runner保留并导出`subject_prompt`、`subject_transcript`、`subject_result`，通过playbook/frontmatter/route asset校验，且不得靠Playbook Agent或fixture伪装Subject authoring evidence。
- [x] 5.4 运行 CTS-003/STM-001/AGQ-002 deterministic E2E与case-204 Agent Autorun，要求node-test exit PASS和trace-backed native PASS；Agent runtime不可用时记录诚实NOT_RUN且不得勾选real-Agent claim完成。

## 6. Compatibility And Release

- [x] 6.1 为 CTS-003/STM-001/AGQ-002 运行pre-v0.50 compatibility cases：existing apply forms、parseable legacy seeds/unknown keys/duplicate body bytes、already-enqueued cards与v0.50 output的v0.49 reader shape均无需data/queue migration。
- [x] 6.2 为 CTS-003/STM-001/AGQ-002 更新根`CHANGELOG.md`，增加`v0.50`简洁条目，说明structured canonical seed authoring、single-writer repair feedback与duplicate body authoring退役。
- [x] 6.3 为 CTS-003/STM-001/AGQ-002 同步`DPT_FRAMEWORK/RUN.md`版本横幅、Current Release和最新条目至`v0.50`，内容与CHANGELOG一致。

## 7. Final Verification

- [x] 7.1 为 CTS-003/STM-001/AGQ-002 运行全部focused unit/integration/deterministic E2E、相关workflow/package validation与repo full JS regression，所有native exits必须PASS且测试文件只位于repo-root `tests/`。
- [x] 7.2 为 CTS-003/STM-001/AGQ-002 运行 `node openspec/governance/check-verification-routing.mjs --change canonical-seed-authoring --mode assets`，确认所有selected assets存在、case-204注册唯一且route/profile合法。
- [x] 7.3 为 CTS-003/STM-001/AGQ-002 运行 `node openspec/governance/check-project-reqs.mjs`，必须达到0 duplicate、0 orphan、0 unregistered、0 reusedRetired。
- [x] 7.4 为 CTS-003/STM-001/AGQ-002 运行 `node openspec/governance/check-project-specs.mjs`，必须达到0 deltaHeaderInMain、0 missingPurpose、0 missingRequirements、0 missingReqHeader。
- [x] 7.5 为 CTS-003/STM-001/AGQ-002 运行`openspec validate canonical-seed-authoring --strict`并审查最终diff，确认没有queue-admission/evidence-projection/shared-reference scope、new dependency、new persistent state、第二writer/evaluator或`DPT_FRAMEWORK/`内测试文件。

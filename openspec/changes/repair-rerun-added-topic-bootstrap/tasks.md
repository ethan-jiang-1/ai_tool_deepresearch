## 1. 先用focused regression锁定九个rerun缺陷与normal compatibility

- [ ] 1.1 为 CTS-003 增加new-seed regression：rerun `add_topic`、HITL1 add与`migrate_legacy seed_binding:new`生成同一完整skeleton、exact五个wave token、无`scope_role`伪正文；existing enrichment/body在update/layout后保留。Done：旧实现准确暴露BUG-081，normal add无退化。
- [ ] 1.2 为 RWP-001、RWP-014、WPG-001/002 增加Wave0增量回归：historical submitted coverage + new-topic valid submit pass；historical coverage + new orphan `source.yaml` fail；无rerun gate exception。Done：准确覆盖BUG-082并证明new Topic走normal provenance path。
- [ ] 1.3 为 AGQ-002、AGQ-014 增加claim regression：delegated `operate-queue claim`、empty window、missing observation、unnecessary fallback返回不同root；b000历史后b001合法claim成功。Done：准确覆盖BUG-083；若allocator本来PASS，测试保留且不安排allocator重写。
- [ ] 1.4 为 DEW-004、DEW-009、DEW-013、DEW-017 增加helper regression：beacon/task/spawn/CLI examples共享canonical absolute root；bundle-relative refs只join一次；wrong nested root的inspect/dry-submit/submit零写；starter/schema/actor constants一致；dry-submit返回独立violations。Done：覆盖BUG-084的root、schema、actor、role、cache/meta链且strict binding不放宽。
- [ ] 1.5 为 SNC-006 增加source-ref lineage regression：current output pass；prior same-topic compatible submitted output pass；filesystem-only、unsubmitted、cross-topic、ambiguous fail。Done：准确复现BUG-089并断言exact claim index/JSON pointer/same dry-submit。
- [ ] 1.6 为 EEX-001/002/003、RWG-002/005 增加count regression：short Core Content、few Key Facts、harmless heading/order差异不改变count；missing semantic section只由format报；filesystem-only仍不count；Agent numeric claim忽略。Done：准确覆盖BUG-086并证明blocking `key_facts_min_lines`退役。
- [ ] 1.7 为 WAI-005、RWG-002/005/018 增加depth regression：minimal review只含reviewed refs + judgments即可；source/cache/novelty/floor从submitted rows/Wave0/profile派生；legacy copied fields不override；filesystem-only cache fail；missing reviewed ref短路。Done：准确覆盖BUG-087且无第二authority。
- [ ] 1.8 为 AGO-003/005、DEW-005/010/011、WPG-001/002/008 增加declaration recovery regression：normal/late submit写exact witness；witness不直接满足gate；missing row只有一个parent root；exact recovery、legacy audited recovery、idempotency通过；malformed/conflict/no-witness/unsubmitted零mutation。Done：准确覆盖BUG-088且无new completion path。
- [ ] 1.9 为 CTS-007、REF-002/003/007、RWG-002/005/018/019、FIO-006/007、IOC-001/003 增加reference regression：UID-only/legacy pass；dual conflict一次；prose/no-table index只报parent；valid table缺一row报该row；inspect/gate/observability共享binding。Done：准确覆盖BUG-085且不要求historical mass rewrite。
- [ ] 1.10 为 RWP-002、WAI-005/008 增加Markdown contract regression：`phase-wave1`的`requires`实际包含`shared/shared-reference-template`；depth-review示例不再要求ledger copies；affected feedback后Agent修authorized surface并rerun same checkpoint。Done：仅mention文件名或恢复旧duplicate shape时测试失败。
- [ ] 1.11 为 AGQ-002/014、DEW-013、SNC-006、WPG-008、RWG-018、IOC-001/003 增加contract-lineage feedback regression：每个affected primary root含non-empty `missing_fact`、`write_to`、`rerun`；parent failure mask dependent symptoms；inspect/formal shared root坐标一致。Done：opaque-only rejection或多条竞争动作会失败。

## 2. 接回normal Topic pipeline与helper surface

- [ ] 2.1 实现 CTS-003：重构existing canonical seed renderer/merge，new projection生成完整shared skeleton与accepted tokens，existing seed保留enrichment/body。Done：1.1 PASS，topic-state仍只触碰plan+explicit seed workspace。
- [ ] 2.2 实现 RWP-001、RWP-014：更新`phase-wave0.md`的direct-fact classification、normal task-card path、historical reuse、supplement、orphan处理和correct work-unit claim/submit。Done：1.2与Markdown tests PASS，无Wave0 gate change。
- [ ] 2.3 实现 AGQ-002：delegated queue-claim与empty返回distinct stable roots和`missing_fact/write_to/rerun`，queue bytes不变。Done：1.3 queue cases PASS，existing fields不删除。
- [ ] 2.4 实现 AGQ-014：只在1.3暴露真实缺陷时最小修复next-batch claim；完善missing observation/unnecessary fallback repair coordinates。Done：合法b001 claim PASS，fail-closed cases零authority mutation。
- [ ] 2.5 实现 DEW-004、DEW-009：统一work-unit envelope的canonical absolute root，修正existing-index read prerequisite-before-create和shared beacon binding。Done：wrong nested root无目录/transaction/trace/log/rejection side effect。
- [ ] 2.6 实现 DEW-004、SNC-006：从manifest/output contract/cache policy生成task内Result JSON Starter与checklist，不预写`result.json`。Done：starter keys/constants与generated schema/submit contract一致，不包含rejected keys。
- [ ] 2.7 实现 DEW-013、DEW-017：dry-submit独立violations带triplet，dependent validation short-circuit；formal repairable rejection唯一rerun指向same-candidate dry-submit。Done：1.4/1.11 PASS，formal submit仍唯一normal success。

## 3. 删除Wave1重复quality-control truth

- [ ] 3.1 实现 EEX-001：把`isCountable()`收窄为accepted status + parseable source URL，删除Core Content长度、Key Facts数量、homepage/path、Jaccard/self-reference等heuristics与旧threshold常量。Done：1.6 PASS，unparseable/missing URL仍fail clearly。
- [ ] 3.2 实现 EEX-002/003：让countReferences/ref_count只使用authority-selected reference + narrow predicate，不重复format/backing/index/provenance checks。Done：per-topic exact scope、filesystem orphan和Agent count cases PASS。
- [ ] 3.3 实现 REF-002、WAI-008：shared reference parser保持五个non-empty semantic sections strict，但宽容heading case/level/spacing/order；Key Facts数量/prose richness只advisory。Done：missing section一个format root，presentation-only不block。
- [ ] 3.4 实现 RWG-002/005：从blocking Wave1 gate definition删除`key_facts_min_lines`，count_floor复用narrow count evaluator，reference_format独立拥有semantic availability。Done：definition/static/focused tests证明无duplicate blocker。
- [ ] 3.5 实现 WAI-005、RWG-002/005：重构`wave-depth-contracts.mjs`，从`reviewed_work_unit_refs[]`指向的hash-valid submitted rows派生source/cache/novelty/observed floor，从Wave0/profile取baseline/required floor。Done：1.7 PASS。
- [ ] 3.6 实现 WAI-005：把legacy `wave0_source_urls/source_claims/new_source_urls/new_source_floor`降为optional compatibility/advisory projection，不能override Engine-derived truth。Done：minimal和legacy drift cases PASS。
- [ ] 3.7 实现 REF-002、CTS-007、RWG-002/005/019：在existing topic-layout resolver上增加thin reference binding adapter，统一UID/legacy/dual handling。Done：无second identity map，1.9 binding cases PASS。
- [ ] 3.8 实现 REF-003、RWG-005/018：reference index先验证eight-column parent，再运行row/source-layer checks；parent invalid时mask row cascade。Done：1.9 index cases PASS，无generic dependency engine。
- [ ] 3.9 实现 FIO-006/007、IOC-001/003：file observability及Wave0/Wave2 inspect删除local raw-field parser，消费shared binding/root result并保持read-only。Done：1.9/1.11 PASS。
- [ ] 3.10 实现 SNC-006：构建由hash-valid bundle ledger + canonical topic resolver派生的in-memory submitted-output index；source_ref接受current或prior same-topic compatible output。Done：1.5 PASS，无persistent index，当前cache refs仍由current result声明。

## 4. 增加唯一必要的explicit declaration recovery

- [ ] 4.1 实现 AGO-003/005、DEW-010：扩展ledger/witness schema，定义exact `_work_units/waveN/<work_id>/submitted-declaration.json`与hash-covered legacy `declaration_recovery` audit；half-audit/malformed拒绝。Done：schema focused tests PASS，witness不是ledger reader input。
- [ ] 4.2 实现 DEW-011、AGO-003：normal submit在existing transaction内写/校验exact witness，并把witness纳入durable postcondition/rollback snapshot。Done：ledger/index/status/queue/witness exact-match后才success；failure不overclaim。
- [ ] 4.3 实现 DEW-011、AGO-003：late-submit使用同一witness/durability contract并保存late-accept audit。Done：late-submit focused tests PASS，无second late success path。
- [ ] 4.4 实现 AGO-003、DEW-005/010：在existing `operate-work-unit.mjs` owner增加`recover-declaration`；exact witness path只恢复already-submitted missing row，不accept result、不complete queue。Done：exact/idempotent/unsubmitted/conflict cases PASS。
- [ ] 4.5 实现 AGO-003/005、DEW-010：legacy pre-witness audited reconstruction要求完整index/status/result/manifest/beacon/receipt/output/source/cache、terminal queue history与original submit trace；只rebind必要ledger hash。Done：任一proof缺失零mutation且不建议手写hash。
- [ ] 4.6 实现 WPG-001/002/008、RWG-018：gate/inspect识别submitted index + missing ledger row为`submitted_declaration_missing`，诊断recovery eligibility并maskoutput/cache/count/bypass symptoms；witness不直接coverage。Done：1.8/1.11 PASS。

## 5. 对齐Agent-facing控制面与mechanical responsibility

- [ ] 5.1 实现 RWP-002、WAI-008：把`shared/shared-reference-template`加入`phase-wave1`实际`requires`；materialization wording移除固定five-facts blocker。Done：1.10 PASS，shared template自身与parser contract一致。
- [ ] 5.2 实现 RWP-002、WAI-005：更新Wave1 depth-review minimum shape与repair wording，只要求reviewed refs + non-derivable judgments；Engine-derived facts不让Agent重抄。Done：phase/example/static tests PASS。
- [ ] 5.3 实现 DEW-009/013/017、RWP-001/014：更新`shared-subagent-protocol.md`及existing actor decision playbook，使用canonical root、beacon只读、starter -> real work -> dry-submit -> repair -> formal submit。Done：no new interaction mode/permission/path owner。
- [ ] 5.4 实现 SNC-006、WAI-005：更新supplementary guidance，允许选择exact prior same-topic submitted evidence path，不要求重复声明/覆盖旧evidence；新cache仍current submit。Done：1.5 Markdown/schema/validator agreement PASS。
- [ ] 5.5 实现 AGQ-002/014、DEW-013、WPG-008、RWG-018、IOC-001/003：让affected command output/phase guidance消费`missing_fact/write_to/rerun`，Agent执行authorized repair；只在new semantics/risk/permission/missing capability时escalate。Done：1.11 PASS，legacy inspect/advice可兼容保留。
- [ ] 5.6 实现RWP-014、DEW-005/017、WPG-001：保留anti-cheating wording，禁止direct artifact、post-hoc receipt/result/provenance、hand-written ledger/hash和witness-as-coverage。Done：hygiene tests能检测退化。

## 6. Regression与真实controlled evidence

- [ ] 6.1 运行CTS、AGQ、DEW、SNC、EEX、WAI、REF、RWG、WPG、FIO、IOC targeted tests。Done：1.x全部PASS，无skip、无production bundle mutation。
- [ ] 6.2 运行相关完整`tests/engine/`、queue/work-unit CLI integration、Markdown contract、Wave0/Wave1 gate、file-observability suites。Done：全部PASS；unrelated pre-existing failure记录精确命令/输出，不误勾。
- [ ] 6.3 更新现有rerun `action:add` heavy canary与README：历史normal fixture后真实add两个Topic，走normal Wave0/Wave1，supplementary WU引用prior submitted evidence，minimal depth review从ledger派生，shared template materialization，inspect/gate。Done：fixture只提供历史前置，不产出新Topic research result。
- [ ] 6.4 在同一disposable canary加入明确fault injection：先真实submit，再删除一个bundle ledger row，观察`submitted_declaration_missing`，只用`recover-declaration`恢复。Done：不手写row/hash/result/receipt；witness未直接满足gate；恢复后normal gate path通过。
- [ ] 6.5 由coding Agent从clean repo逐step执行heavy canary through Wave1。Done：real actor/search/fetch产生trace-backed PASS；beacon unchanged、无nested bundle、historical refs无mass rewrite；NOT_RUN/fixture smoke不算PASS，FAIL保留现场。

## 7. Governance、release与最终复读

- [ ] 7.1 更新所有affected code/MD的`@impl`或frontmatter `req`标注，并把registry中EEX-001摘要改为新的narrow countability语义；不分配新ID。Done：active delta、registry、implementation引用一致。
- [ ] 7.2 更新`CHANGELOG.md`到v0.28，简述rerun-added Topic normal pipeline、gate净简化、lineage-aware feedback、declaration recovery和supplementary source lineage。Done：不overclaim real-Agent evidence。
- [ ] 7.3 同步`DPT_FRAMEWORK/RUN.md` v0.28横幅与CHANGELOG最新条目。Done：版本一致。
- [ ] 7.4 运行`node openspec/governance/check-project-reqs.mjs`。Done：0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired。
- [ ] 7.5 运行`node openspec/governance/check-project-specs.mjs`。Done：0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader。
- [ ] 7.6 运行`openspec validate repair-rerun-added-topic-bootstrap --type change --strict --no-interactive --json`与`openspec status --change repair-rerun-added-topic-bootstrap --json`。Done：apply-ready。
- [ ] 7.7 运行`git diff --check`并复读proposal/design/specs/tasks。Done：九个rerun-only BUG均有requirement、implementation task、focused regression与controlled evidence；new Topic走normal pipeline；除narrow declaration recovery外无新增controller/state/gate/success authority；所有affected primary rejection均有`missing_fact/write_to/rerun`。

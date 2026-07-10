> 执行纪律：以下每项按不超过 2 小时的 focused slice 实施；若某项超出，先拆分，不在同一任务中扩建通用 controller。

## 1. Compatibility And Pure Boundary

- [ ] 1.1 实现 IOC-001、IOC-002、IOC-003、RWG-018：在现有 Wave gate integration tests 中锁定 representative bundle 的 direct authority/provenance/floor pass/fail、rule ids 与 Wave0/Wave1 degraded eligibility；只把 design 明列的差异标为 intentional。
- [ ] 1.2 实现 IOC-001、IOC-002、IOC-003、IOC-005：锁定三个 inspect 的 exit code 与 `check.passed`、`wave`、`checks_run`、`checks_failed`、`return_map_classification`、`inspect[]`、`advice[]` 兼容字段。
- [ ] 1.3 实现 IOC-005、CHI-001、RWG-018：增加最小 evaluator finding/result projector 与 focused unit tests，固定 `failed_rule_ids`、`masked_rule_ids`、blocking/advisory/diagnostic-only、一个 root 一个 nearest repair，以及 summary fields 不互相矛盾；不建立 dependency graph。
- [ ] 1.4 实现 RWG-018、CHI-001：把 delegated-bypass 逻辑拆成 pure scanner 与 formal-only emitter；unit tests 证明 scanner 零写入、同一 scan result 可供 checker/inspect 使用、formal emitter 对一次 invocation 最多写一次 trace/log。

## 2. Wave Evaluators And Wrappers

- [ ] 2.1 实现 IOC-001、RWG-018：抽取 Wave0 显式纯 evaluator，并让 `check-gate-wave0-complete.mjs` 使用其 artifact/provenance result；保持 node binding、handoff、routing、degraded、attempt/checkpoint/trace 行为在 wrapper，保持现有 `failed_rule_ids`/`masked_rule_ids` 与 degradation-eligible rule 判定。
- [ ] 2.2 实现 IOC-001、IOC-005：将 `inspect-wave0-output.mjs` 切换到 Wave0 evaluator，保留 accepted return-map blocking 分类，把 flat/naming/非 formal metadata-section/index/readme presentation 降为 advisory，并用全 bundle path+content-hash snapshot 证明无 status/trace/log/checkpoint/handoff/diagnostic 写入。
- [ ] 2.3 实现 IOC-002、RWG-018：抽取 Wave1 显式纯 evaluator，并让 formal wrapper 使用；保留 per-topic artifact、depth-review、reference/index/backing、cache/submitted provenance、backfill、explicit floor 与 bypass rule ids。
- [ ] 2.4 实现 IOC-002、CHI-001、RWG-018：在 Wave1 depth-review checker 加局部 prerequisite guard；missing/unparseable parent 只报 parent，`source_claims`、`new_source_floor`、`decision` 等缺失只 mask 直接依赖检查，并用 focused negative tests 验证多个独立 root 仍分别可行动。
- [ ] 2.5 实现 IOC-002、IOC-005：把 `question_list_has_four_sections`、`source_url_present`、`key_findings_non_empty` 改为 design 指定的 tolerant semantic parser，保持 `key_facts_min_lines` blocking floor；将 `inspect-wave1-output.mjs` 切到 evaluator并执行全 bundle no-write snapshot。
- [ ] 2.6 实现 IOC-003、RWG-018：抽取 Wave2 显式纯 evaluator，并让 formal wrapper 使用；把 `check.failed_rule_ids` 与 `check.masked_rule_ids` additive 加到 Wave2 gate result，保留 triple artifact、finding、ledger、synthesis/backfill/reference/provenance formal rules。
- [ ] 2.7 实现 IOC-003、CHI-001、RWG-018：在 finding-index checker 加 parent/field 局部 guard；missing/unparseable index、non-array `findings` 和单 finding missing field 只 mask 直接依赖 implication，并让 ledger section parser 宽容 heading marker/spacing/case 而不放弃六个 semantic sections。
- [ ] 2.8 实现 IOC-003、IOC-005：将 `inspect-wave2-output.mjs` 切到 evaluator，保留 direct backing/index/provenance blockers，把 `00_shared` 与非 authority `00-cross` presentation 降为 advisory；验证缺 `hitl2_handoff` 只产生一个 primary repair target，并执行全 bundle no-write snapshot。

## 3. Agreement, Durability, And Producer Contract

- [ ] 3.1 实现 IOC-001、IOC-002、IOC-003、RWG-018：删除三个 formal gate rule loop 后的重复 bypass detection/emission；integration tests 证明 suspected bundle 每次 formal invocation 只写一次 bypass trace/log，而 inspect 写零次。
- [ ] 3.2 实现 IOC-001、IOC-002、IOC-003、IOC-005：为每个 Wave 增加 same-unchanged-bundle agreement tests，比较 shared artifact/provenance failed rule ids；允许 formal gate 额外报告 handoff/routing/trace/durability failure，不要求 lifecycle verdict 与 inspect 完全相同。
- [ ] 3.3 实现 IOC-001、IOC-002、IOC-003、RWG-018：补充 degraded/raw-result tests，证明 formal Wave0/Wave1 继续按 evaluator `failed_rule_ids` 计算 degraded eligibility，inspect 在同一 bundle 上仍 raw fail、无 routing、无 degraded witness；Wave2 保持无隐式 degraded 扩张。
- [ ] 3.4 实现 RWP-016：更新 Wave1 phase/shared guidance，修正 `evidence_summary`、`question_list`、`reviewed_work_unit_refs[]`、depth-review novelty/backing，并把 Wave1 inspect 放在 completion evidence/formal gate 前。
- [ ] 3.5 实现 RWP-016：更新 Wave0/Wave2、seed-topic 与 shared guidance，修正 finding fields/enums、existing-backed/targeted-evidence authority、concrete `reference/*.md` navigation 和对应 inspect 时机，不复制 validator prose。
- [ ] 3.6 实现 RWG-018、IOC-005、CHI-001：更新 gate-rule audit/static guards，为每个 in-scope blocker 记录 producer 或 non-Agent-produced exemption、authority、shared evaluator、diagnostic、test guard 与 formal-only/inspect-only partition；确认 presentation-only rule 不再 blocking，inspect/evaluator 不 import durability helpers。

## 4. Version And Verification

- [ ] 4.1 实现 IOC-001、IOC-002、IOC-003、IOC-005、RWG-018、RWP-016、CHI-001：更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 到 `v0.17`，说明 shared Wave evaluator、pure bypass scan、root short-circuit、presentation tolerance、raw inspect 与 additive rule-id fields；保持后续 `v0.18`/`v0.19` apply 顺序。
- [ ] 4.2 验证全部需求：运行三个 Wave helper/unit tests、gate/inspect integration tests、Markdown/gate-rule audit tests与现有 focused regression；不得用 deterministic fixture 结果声称真实 Agent behavior，且本 change 不要求 controlled Agent experiment。
- [ ] 4.3 治理全部需求：核对新增/复用 `@impl` 与 requirement registry，运行 `node openspec/governance/check-project-reqs.mjs` 和 `node openspec/governance/check-project-specs.mjs`，要求 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired / 0 spec structure error。

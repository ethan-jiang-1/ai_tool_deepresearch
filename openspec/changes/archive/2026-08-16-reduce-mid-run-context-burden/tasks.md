# Tasks: reduce-mid-run-context-burden

## 1. 硬前置 — hitl1/hitl2 requires 闭包补全 (SHC-004)

- [x] 1.1 `phase-hitl1.md` 的 `requires` 补 `shared/shared-anti-cheating-rules`(当前 §9 末行已引用该文件,先补闭包再动 §9)
- [x] 1.2 `phase-hitl2.md` 的 `requires` 补 `shared/shared-anti-cheating-rules`
- [x] 1.3 `node --test tests/engine/consistency-validator.test.mjs` 通过(requires 变更后闭包校验绿)

## 2. 删(2)类 — 过时/重复 (SHC-004/RWP)

- [x] 2.1 wave0/1/2 的 `## 9. Anti-Cheating Rules` 整节压缩:shared 通用禁令逐条重复删掉,只留一行指针 + wave 特有条目(@impl SHC-004, RWP)
- [x] 2.2 8 个 `stop: no` phase(instantiation/setup/seed-topics/wave0/1/2/readiness/rerun)的 §7 前导段压缩为一行指针(指向 shared-silent-execution.md 与注入 AUTONOMOUS header),保留 phase 特有 5 条 `repair_kind` 分支
- [x] 2.3 `phase-rerun.md` §9 与自身 §3 语义重复的条目删除(:170 重复 :82 MUST NOT 删除已有 artifacts;:171 重复 §3 的 direct multi-file edit/human-directed 绕过与 seed direction/registry 禁令;:177 重复 §3 的不得重新解析 rb_profile.yaml;:178 重复 §3 的 check.next 路由要求),只留 §3 指针;rerun 特有条目(post_final_reentry 语义、rerun_count 递增、rationale 方向来源、seed direction exact recover)保留
- [x] 2.4 `shared-anti-cheating-rules.md` 结构性缺陷修复:双 `### 13` 去重(chain 策略段 `### 13` 删除)、`### 14` 与 `### 13`(:78) 的 cache_trails 重复合并、孤儿 §12 段落归位、chain 策略删为指向 `transitions.chain.json` 的指针(编号连续 1-16)
- [x] 2.5 `phase-hitl2.md` §9 的 "MUST NOT 将不确定 branch 的路由编码进 transition chain" 与同文件 :110 及 chain 静态数据重复,保留一处 + 指针
- [x] 2.6 `phase-final.md` §9 首条(与正文 :144-148 及注入 header 重复)压缩
- [x] 2.7 `manifest.json#/shared` 移除 `shared-gate-rules.md` 与 `shared-repair-guidance.md`;已读 consistency-validator 消费逻辑(仅文件存在性 + role-spec/actor-fetch 排除,删除安全)并验证 validator 绿(@impl SHC-004)

## 3. 删/指针化(1)类 — 机器已覆盖 (每删一条附机器检查名)

- [x] 3.1 逐条复核审计 §A.3 的 18 个代表例:多数已随任务 2.1 的 wave §9 压缩覆盖(wave0/1/2 §9 整节指针化,机器检查名 `wave0/1/2_delegated_bypass_suspected`、`ledger_record_hash`、`seed_initialization_structure`、`projection_entry_generic_prose`、`depth_review_contract`、`source_novelty_floor`、`missing_profile_parameter`、`classifyReferenceAuthority`、`finding_index_contract`、`synthesis_eligibility` 等);其余独立禁令句指针化:wave0 §3.2 步骤 1 的 beacon 不可变句 → shared-subagent-protocol 指针、wave1 §3.2.1 的 hand-write ledger 句 → shared-anti-cheating 指针
- [x] 3.2 每条删除已记录机器检查名(见 3.1 清单,对照 `machine-checks-catalog.md`)
- [x] 3.3 纯纪律(3)类条目不删;只允许压缩合并(§7 前导段骨架指针化但 phase 特有 detail 句保留;anti-cheating 特有禁令全保留)

## 4. 压缩(3)类 — 纯纪律语义保留

- [x] 4.1 复核三个 wave 的 §3.2 drain 段:当前树非审计声称的"三份近同"——wave0 ~80 行 / wave1 163 行(4 子节) / wave2 89 行(finding triage)全 wave 特有;共享 batch-poll-submit 骨架已完整存在于 `shared-subagent-protocol.md`(三 wave 均 in requires),**不新建** shared-wave-drain-loop.md(证据差异已写回计划 §1.4 与 design D2)
- [x] 4.2 wave0/wave1 的 §3.2 首行补显式指针到 `shared/shared-subagent-protocol.md`;wave2 §3.2 为 finding triage 循环,无 drain 骨架,不指针
- [x] 4.3 交互放置句在 §7/§8 内指向 `shared-silent-execution.md`,不重复全文(§7 前导段压缩已覆盖;§8 Stop Behavior 复核为各 phase 特有简短段,无重复全文)
- [x] 4.4 子代理 MUST NOT 列表去解释性尾巴,保留禁令语义(shared-subagent-protocol MUST NOT 列表 7 条复核为单行禁令无解释性尾巴,无需编辑)

## 5. 立法 — delta 落 main spec + 检查类落地

- [x] 5.1 SHC-004 delta sync 进 `openspec/specs/workflow/shared-node-content/spec.md`
- [x] 5.2 RWP delta sync 进 `openspec/specs/research/research-wave-phase-content/spec.md`
- [x] 5.3 `DEEP_RESEARCH_HARNESS/engine/consistency-validator.mjs` 新增 `phase_local_anti_cheating_duplication` 检查类(phase requires 含 shared-anti-cheating 时,§9 不得逐字重复 shared 禁令标题;行扫描提取 §9,红绿对照验证)(@impl SHC-004, RWP)
- [x] 5.4 `openspec/governance/check-content-drift.mjs` 扩展禁止句 ↔ 机器检查对照(机器覆盖禁令句式在 phase prose 只允许指针形态;红绿对照验证)(@impl RET-006)
- [x] 5.5 `tests/engine/consistency-validator.test.mjs` 补新检查类测试(构造重复场景断言命中并命名节点/句子;负测试断言指针+特有不命中)
- [x] 5.6 `tests/governance/check-content-drift.test.mjs` 补禁止句对照测试(无 shared owner 拒绝 / 有 shared owner 放行)

## 6. 验证

- [x] 6.1 `node --test tests/engine/consistency-validator.test.mjs` 通过(31/31)
- [x] 6.2 `node --test tests/governance/check-content-drift.test.mjs` 通过(6/6)
- [x] 6.3 `node --test "tests/integration/md/**/*.test.mjs"` 全绿(340/340,含 3 个测试按新指针行为更新)
- [x] 6.4 `node --test "tests/engine/**/*.test.mjs"` 全绿(1019/1019)
- [x] 6.5 `node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs` 相关回归绿(passed: true, 0 issues)
- [x] 6.6 复测否定规则计数/重复税,写回计划 §1.3(总行 5,431→4,999 删 432;否定行 456→403 降 53)

## 7. 收尾检查(归档前硬性 done condition)

- [x] 7.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change reduce-mid-run-context-burden` 必须 PASS
- [x] 7.2 `node openspec/governance/check-project-specs.mjs` 必须 PASS(0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader)
- [x] 7.3 `openspec-feedback:plan-review` 在首个 target edit 前完成 plan review:polish 三轮覆盖整体一致性 + risk-led(hitl1/hitl2 requires 悬空发现、manifest.shared 消费逻辑、rerun §9 逐条对照、§7 压缩边界、delta 归属);每个 finding 已转普通任务并关闭。Done:ready for apply 校验全绿 + 无未决 finding(@impl SHC-004, RWP, RET-006)
- [x] 7.4 `openspec-feedback:closeout-review` 归档前完成 closeout review:建立 change-scoped 边界(git status 全部属于本 change:11 phase + 1 shared + manifest + consistency-validator + check-content-drift + 2 main spec + 3 测试更新 + 计划写回);复核实际 diff(400 增 / 97 删,静态删 432 行总行 5,431→4,999,否定行 456→403);semantic-closure(not_applicable)对实际变更面复核——纯 markdown 去重/压缩 + 检查类扩展,requires 闭包/--full/注入头/见证链/current_node 恢复零变化,shared-silent-execution 未动,resolver/authority/verdict 未触碰,与实际面一致;选定验证证据:consistency-validator 31/31(md 340/340、engine 1019/1019、content-drift 6/6、validate-workflow-package passed)、新检查类红绿对照(注入 shared 标题命中 / 恢复零命中)、check-content-drift 红绿对照(无 owner 拒绝 / 有 owner 放行)、3 个旧措辞断言测试按新指针行为更新;delta/main 同步对比完成(SHC-004/RWP 逐字 MATCH)。Done:无未决 finding 且全部任务完成(@impl SHC-004, RWP, RET-006)

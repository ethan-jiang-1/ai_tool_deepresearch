# Tasks: make-work-unit-recovery-feedback-direct

## 1. Planning 收尾(apply 前;目标文件保持不动)

- [x] 1.1 创建 `verification-plan.yaml`:四类 test class——`unit`(repair_kind↔CLI 动词映射 truth table、journal_disposition 枚举、supersede 顶层字段 shape)、`integration`(五面形状一致性、`--feature` 拒绝、RUN.md 决策表锁定)、`deterministic_e2e`(恢复链:busy→wait→rerun、suspect→recover-transaction→rerun、supersede→successor claim/submit、late-submit 恢复链)、`agent_flow_e2e` not selected 写明理由
- [x] 1.2 创建 `semantic-closure.yaml`:`status: affected`;affected 覆盖 4 个 family——`work-unit.transaction-mutation-integrity`(journal_disposition 枚举、busy/transaction 面统一形状、recover rerun)、`work-unit.submission-ledger-and-supersession`(repair_kind 拼写、supersede 顶层字段)、`lifecycle.gate-status-trace-handoff`(blocked 投影、delivery/refinement 区分)、`artifact.persistence-operation-contract`(catalog_additions 新 family:`--feature` 范围、sweep advice workspace 区分);`node openspec/governance/check-semantic-closure.mjs --change make-work-unit-recovery-feedback-direct --mode plan` 必须 PASS
- [x] 1.3 运行 polish-openspec-change 至少两轮(Pass 1 整体一致性 + 至少一轮 risk-led:五面形状的缺事实面、repair_kind 变化对既有调用方、supersede 双写一致、blocked 投影对既有 reentry 快照、决策表↔代码锁定充分性),直到 `openspec validate --strict` + `git diff --check` 通过;决定不了的升级用户
- [x] 1.4 三原则 design review 复核:design.md 的语义边界 / Source of Record / 最短闭环 / net simplification / 责任边界与 delta 一致
- [x] 1.5 `openspec-feedback:plan-review` 在首个 target edit 前完成 plan review:通读 proposal、5 个 delta specs、design、tasks、verification-plan、semantic-closure;核对 semantic-closure 各 family 的 fact/resolver/established_by/consumers/overlap 角色(无 #fragment,全部 bare coordinate;consumers 只放 verdict consumer);每个 finding 转普通任务。Done:plan-mode 四项治理检查绿 + 无未决 finding(@impl ARP-002/004, CHI-004, CPT-003, DEW-020, RRD-008)

## 2. 反馈形状统一(apply)

- [x] 2.1 五面统一(M2/CHI-004):submit 拒绝(`recordSubmitRejection`)、late-submit 拒绝、transaction 阻塞、dry-submit、inspect 五个反馈面统一调用 `engine/work-unit-attempt-disposition.mjs` 的 `projectWorkUnitAttemptDisposition` 投影,输出同一 `attempt_disposition` + `next`(同一 checkpoint 的 exact rerun);缺失事实的面显式 null,不编造
- [x] 2.2 repair_kind 对齐(M3/CHI-004):engine 输出改为 CLI 动词拼写(`recover-transaction`/`recover-declaration`/`supersede`/`wait`/`missing_contract`);反馈额外携带 exact `command` 串;旧下划线值不再输出
- [x] 2.3 recover 不死胡同(M10/CHI-004):`recoverWorkUnitTransaction` 与 `recoverDeclaration` 结果补 `next`(rerun 坐标)
- [x] 2.4 journal_disposition 枚举(M7/DEW-020):`journal_disposition` Zod 有界枚举(`started|committed|rolled_back|suspect|legacy_failed|unknown`),值域不变
- [x] 2.5 supersede 压平(M4/CHI-004):`supersedeWorkUnitAttempt` 顶层加 `tx_id` / `successor_queue_item_id`,并给出 successor 普通位置;`relation` 内旧字段保留

## 3. 投影与调用契约修复(apply)

- [x] 3.1 RA-M3(RRD-008):`finalBoundaryProjection` 对 `verdict: blocked` 直接投影 blocked,不得落入 `blocker:null` reachable;`buildRecoverySummary` 的 reachable 判定在 blocked 时不得为 true
- [x] 3.2 RA-L4(RRD-008):delivery-pending(zero-append)与 refinement(proven-append)投影可区分(如 action stage 字段或不同 target_ref);reentry 测试断言两投影不同
- [x] 3.3 RA-L2(ARP-002):`blockedSweepEntry` 的 `operation_not_prepared` recommendedAction 按 workspace 区分:primary-publication workspace 不得建议 retry generic persist,命名记录的主操作面与合法 retry;non-primary 保持 retry persist
- [x] 3.4 RA-L3(ARP-004):`operate-artifact-persistence.mjs` 对 `persist`/`persist-final-report` 拒绝 `--feature`(exit 2),错误信息含"`--feature` is only accepted by `publish-final-report`; this operation does not accept it"
- [x] 3.5 RA-M5(CPT-003):spec 已收窄;`findBoundLoad` 对三字段 legacy load 的拒绝保留,错误信息改为诚实边界表述(pre-0edb58310 Final load outside readability guarantee)

## 4. 决策表与锁定测试(apply)

- [x] 4.1 RUN.md 恢复段改写为决策表(disposition → 发出面 → repair_kind → CLI 动词 exact 命令 → 重跑什么),内容依据证据 §7 恢复面心智模型;删去与现状不符的散文
- [x] 4.2 锁定测试:`tests/engine/work-unit-recovery-decision-table.test.mjs` 枚举 engine 可发出的全部 **attempt-owned 恢复 repair_kind**(recover-transaction / recover-declaration / supersede / wait / missing_contract),断言每值有表行 + 匹配 CLI 动词(或 exact 命令串);五面形状一致性断言(unit/integration)
- [x] 4.3 恢复链 e2e(扩展既有 `tests/e2e/work-unit-attempt-recovery.test.mjs`):busy→wait→rerun、suspect→recover-transaction→rerun、supersede→successor claim/submit、late-submit 恢复链各一条,temporary bundle
- [x] 4.4 既有测试更新:repair_kind 下划线断言 → 连字符;supersede 嵌套断言 → 顶层(保留嵌套兼容断言);reentry 快照更新(blocked 不再 reachable);`--feature` 静默忽略断言 → 拒绝断言

## 5. 验证与收尾

- [x] 5.1 `npm test` 相关子集绿:`tests/engine/work-unit-*`、`tests/integration/cli/operate-work-unit*`、`tests/integration/cli/operate-artifact-persistence*`、reentry、`tests/e2e/` 恢复链
- [x] 5.2 全量治理检查绿:check-project-reqs `--mode plan`、check-project-specs、check-verification-routing `--mode plan`、check-semantic-closure `--mode plan`(apply 首个 target edit 前把 `artifact.persistence-operation-contract` 写入 global catalog)
- [x] 5.3 收尾检查 1:`node openspec/governance/check-project-reqs.mjs --mode archive --change make-work-unit-recovery-feedback-direct` 必须 PASS
- [x] 5.4 收尾检查 2:`node openspec/governance/check-project-specs.mjs` 必须 PASS
- [x] 5.5 不变量简报第 7 条更新:C2 后 `attempt_disposition`/`repair_kind` 形状(五面统一、连字符拼写)与 C1 时写的现状说明替换
- [x] 5.6 `openspec-feedback:closeout-review` 归档前完成 closeout review:change-scoped diff 复核(engine 8 文件 + schema 1 + RUN.md + 测试 4 + 简报 1,全部属于本 change);semantic-closure 对实际变更面复核——resolver 与实现一致,consumers 仅留 verdict consumer(RUN.md/persist-artifact.md 从 consumers 移到 overlap: derived,artifact family 的 verdict consumer 定为 artifact-persistence 回归测试);选定验证证据:work-unit engine 202/202、CLI 子集 95/95、e2e 65/65(含新增恢复链 22)、md 340/340、决策表锁定 3/3;delta/main 同步完成(5 文件 6 requirement)。Done:无未决 finding 且全部任务完成(@impl ARP-002/004, CHI-004, CPT-003, DEW-020, RRD-008)
- [x] 5.7 archive:`node openspec/governance/finalize-change-archive.mjs --change make-work-unit-recovery-feedback-direct` 成功(调用前勾选本任务);`_backlog/plans/guidance-drift-cleanup-machine-guards.md` 勾选 C2 检查项并登记 CLS 编号

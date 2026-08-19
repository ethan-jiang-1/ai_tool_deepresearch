## 1. Plan review（feedback lifecycle）

- [x] 1.1 openspec-feedback:plan-review — 在首次 target edit 前获取当前 OpenSpec operation guidance（`openspec/operations/`）并做 plan review：核对本 change 四个 delta（DEW-023 / RWG-022 / EEX-001 / POF-001）与 design 的作用面声明仍与当时 guidance 一致；发现偏离时将其记为普通未完成 task（列受影响 requirement、authoritative owner、smallest repair、可独立观察的 done condition），修正后才进入 target edit。Done condition：review 完成且无未记入 task 的 finding。（已完成：读了 change-feedback-loop.md 与全部 operationGuidance；逐个验证 13 个 semantic-closure `#fragment` 均为真实符号、consumers 均为 verdict 消费者；无 finding，无需新增 task。）

## 2. 事务守卫作用面收窄（BUG-234，DEW-023）

- [x] 2.1 实现 DEW-023：将 `work-unit-transaction.mjs` 的 `listBundleFiles` 枚举范围收窄为 work-unit authority 面（`_work_units/**` 排除 lock 与当前 journal + 根 `rb_output_declarations.jsonl`），移除 `AUDIT_ONLY_PATHS` 全树扫描语义。Done condition：非 authority 路径不进入 before/after 快照；`node --test tests/engine/work-unit-transaction.test.mjs` 中迁移后的 authority 面 undeclared 用例通过。
- [x] 2.2 迁移既有测试 `records rolled_back only after exact restoration and suspect for undeclared mutation`：undeclared 写入目标改为 authority 路径（如 `_work_units/_index.json`），并新增断言——事务窗口内写 `_cache/`、`_scripts/`、`reference/` 不产生 suspect、不污染 rollback 证明。Done condition：新用例在未打补丁的引擎上失败、在修复后通过。

## 3. 多 orphan 依赖序恢复（BUG-233，DEW-023）

- [x] 3.1 实现 DEW-023：`withWorkUnitTransaction` 增加内部 `orphanBlocking: 'all'|'none'` 选项（默认 `'all'`），仅 `recover_work_unit_transaction` 使用 `'none'`；`recoverWorkUnitTransaction` 入口检测「被恢复 journal 的文件被另一 unresolved orphan 声明为 target」的 wrapper 关系，存在时返回 `suspect_transaction` + 指向 wrapper 的 `recover-transaction` rerun，不执行变更。Done condition：构造含 wrapper 关系的双 orphan fixture（wrapper + 其目标），对目标的 recover 返回 wrapper 坐标；对 wrapper 的 recover 成功 settle 后，对目标的 recover 成功。
- [x] 3.2 实现 DEW-023：`inspectWorkUnitTransaction` 多 orphan 投影给出确定 first-recoverable 坐标（wrapper 依赖序优先，否则 `started_at` 最早 + tx_id tiebreak），`unlocked: true` 当该坐标 v2/manifest 完整/前后镜像匹配，`repair_kind: recover-transaction` + 精确 rerun。Done condition：双 orphan inspect 输出单一确定坐标，不再是 `multiple unresolved …` 的无路 `missing_contract`。
- [x] 3.3 新增确定性测试：两个 suspect journal（含 wrapper 关系）时，存在一个合法 `recover-transaction` 命令序列结清两者、ledger 恢复可用、全程不手改 journal bytes；并覆盖两个独立（无 wrapper 关系）orphan 的 first-recoverable 排序稳定性。Done condition：`node --test tests/engine/work-unit-transaction.test.mjs` 全绿。
- [x] 3.4 扩展 `tests/integration/cli/operate-work-unit.test.mjs`：多 orphan 状态下 CLI 的 submit/inspect 阻塞反馈断言——单一确定 first-recoverable 坐标、`repair_kind: recover-transaction`、rerun 精确指向该 tx-id（wrapper 依赖序），无 `multiple unresolved …` 无路反馈。Done condition：新增 CLI 用例通过。

## 4. Wave0 平衡选择与计数口径（BUG-232，RWG-022 / EEX-001）

- [x] 4.1 实现 RWG-022：在 `wave0-reference-convergence.mjs` 新增纯函数 `selectBalancedCandidate(candidates, projectedIdentityIds, deferredIdentityIds)`（min 已投影 topic 优先、`topic_slug` 字典序 tiebreak、topic 内最小 `source_ordinal`、`entry_id` 终局 tiebreak），`evaluateWave0ReferenceConvergence` 改用它。Done condition：纯函数 truth table 测试覆盖 min-count、并列、deferred 排除、轮转性质（一 topic 得第 2 个投影前，所有有候选的 topic 均得第 1 个）。
- [x] 4.2 新增 `tests/engine/helpers/wave0-reference-convergence.test.mjs`：多 topic（≥3，字典序刻意不利）候选集的选择序列断言。Done condition：修复前引擎会输出字典序首个 topic 的候选，新测试在此情形下失败、修复后通过。
- [x] 4.3 实现 EEX-001：`ref-count.mjs` `isCountable` 的 acceptance 判定改为 accepted 家族 `{'accepted', 'accepted :warning:'}`（trim 后精确匹配），`EXCLUDED` 与其他值仍不可计数。Done condition：`tests/engine/helpers/ref-count.test.mjs` 新增用例——引号 `"accepted :warning:"` 计数、`EXCLUDED` 不计数——通过，且既有用例不回归。
- [x] 4.4 integration：多 topic wave0 bundle 经 inspect CLI 驱动收敛，断言引导物化序列跨 topic 平衡（非字典序独占）。Done condition：`tests/integration/cli/` 相应用例通过。

## 5. Final lineage 见证收窄（BUG-236，POF-001）

- [x] 5.1 实现 POF-001：`final-report-series.mjs` 的 `FinalReportInventorySchema` 新增 `primary_sha256`（同快照内 primary series 条目 sorted digest），`readFinalReportInventory` 同时计算两 digest；安全扫描 block 语义不变。Done condition：schema 单测（primary/全树两 digest、primary 条目变更只影响 primary_sha256、non-primary 变更只影响全树 sha256）通过。
- [x] 5.2 实现 POF-001：`post-final-recovery.mjs` 的 C5 事件与 prepared manifest 绑定 `primary_sha256` + `final_inventory_basis: 'primary_series'`，commit 前自检使用同一 accessor；事件 envelope schema 扩展该可选字段（legacy 无标记）。Done condition：apply 产生的事件含新字段；无标记 legacy 事件仍可被读取与消费。
- [x] 5.3 实现 POF-001：`handoff-helpers.mjs` pre-load admission 与 `proveNewerFinalAppend`/`inspectNewerFinalStage` 按事件 bound basis 消费；legacy 基准在全树证明不匹配且仅为 non-primary 漂移时走 structural primary-series fallback（retained primary series 经 `resolveFinalReportSeries` 结构有效），fallback 在 proof 结果中显式暴露。Done condition：单测覆盖——primary-scoped 事件 + non-primary 漂移 → admission 与 append proof 通过；legacy + non-primary 漂移 + 新 revision → fallback 通过且暴露；primary 条目内容篡改 → 两基准均 block。
- [x] 5.4 integration：扩展 post-final recovery 测试（`tests/engine/helpers/post-final-recovery.test.mjs` + `tests/integration/cli/post-final-recovery.test.mjs`）：两次连续 rerun，第一次在 final 阶段修改 `final/topics/*.md` 并发布新 primary，断言第二次 inspect 不返回 `accepted_lineage_drift` 且新事件绑定 primary 基准；legacy 绑定（手造无标记事件）同样经 fallback 恢复。Done condition：两文件相关用例通过。

## 6. 文档与词汇同步

- [x] 6.1 核对 `DEEP_RESEARCH_HARNESS/RUN.md` 决策表与 `work-unit-repair-vocabulary.mjs` 导出无漂移（本 change 不加新 repair_kind；多 orphan 反馈仍用 `recover-transaction`）。Done condition：`tests/engine/work-unit-recovery-decision-table.test.mjs` 通过；RUN.md 无需语义修改或已同步。

## 7. 治理收尾（archive 前置）

- [x] 7.1 openspec-feedback:closeout-review — Agent-owned semantic closeout：逐条核对四个 delta 的 requirement 语义已在实现与测试中兑现（233/234/232/236 的验收断言全部落地），把未闭环 finding 记为普通未完成 task（含受影响 requirement、authoritative owner、smallest repair、done condition）。Done condition：全部 finding 闭环或已记 task。（已完成：operationGuidance 集合未变；capability-discovery / verification-routing(assets, 8 claims) / semantic-closure(assets) 三项检查 PASS。逐 delta 核对——DEW-023：`work-unit-transaction.test.mjs` 15/15（authority surface 收窄、并发非授权写不归属 tx、wrapped+independent orphan 确定性排序）+ `operate-work-unit.test.mjs` 41/41（多 orphan submit 阻断收敛到单一 recover 坐标，合法 CLI 序列落定后 submit 成功）；RWG-022：`wave0-reference-convergence.test.mjs` 6/6（round-robin 真值表）+ `check-gate-wave0-complete.test.mjs` 28/28（跨 topic 平衡替代字典序耗尽）；EEX-001：`ref-count.test.mjs` 25/25（`accepted :warning:` 计入 accepted family）；POF-001：`final-report-series.test.mjs` 9/9（primary/whole-tree 双 digest 分离）+ `handoff-final-append-proof.test.mjs` 8/8（basis-aware append 证明真值表含 legacy structural fallback）+ `post-final-recovery` unit 15/15 与 integration 9/9（第二次 rerun 仍为 fresh candidate、新事件绑 primary_series basis、legacy 全树绑定经 structural fallback 恢复）。全套 touched 测试 161/161 通过。无未闭环 finding。）
- [x] 7.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change fix-transaction-guards-and-wave0-reference-balance` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired，selected reservation 已 transition 为 live identity）。Done condition：命令输出 PASS。（已完成：662 registered / 57 retired / 0 orphan，PASS。）
- [x] 7.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。Done condition：命令输出 PASS。（已完成：82 main spec files，0 violations，PASS。）

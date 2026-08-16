# Design: make-work-unit-recovery-feedback-direct

## Context

C2 是 Engine 反馈/投影行为变更(动机与范围见 proposal.md — Why/What)。现状要点(M1-M10、RA-* 已复核,证据 §7/§13):五面里只有 dry-submit/inspect 发 `attempt_disposition`;`repair_kind` 下划线拼写 vs CLI 连字符(`work-unit-transaction.mjs:270`、`work-unit-supersession.mjs:751` vs `cli/operate-work-unit.mjs:34-35`);supersede 的 `tx_id`/`successor_queue_item_id` 嵌套在 `relation`(`:826-836`);recover 无 rerun(`:654-707`);`journal_disposition` 裸字符串(`:194-208`);blocked 落入 `blocker:null` reachable(`recovery-contract.mjs:145-148,178-191`);sweep advice 无条件 retry persist(`artifact-persistence.mjs:1029-1035`);`--feature` 被静默忽略(`operate-artifact-persistence.mjs:90-141`)。用户已拍板:RA-M5 收窄保证(不做 legacy 兼容)、RA-L3 严格拒绝 `--feature` + 提示性错误。

目标文件在 `/opsx:apply` 前保持不动。

## Goals / Non-Goals

**Goals:**
- 五个反馈面同一 `attempt_disposition` + `next` 形状,恢复反馈自带下一步。
- `repair_kind` ↔ CLI 动词的暗号消灭;RUN.md 恢复段 = 被测试锁定的决策表。
- supersede 顶层 `tx_id`/`successor_queue_item_id`;recover 带 rerun;`journal_disposition` 有界枚举。
- RA-M3(blocked 不投影为 reachable)、RA-L4(delivery/refinement 可区分)、RA-L2(sweep advice 按 workspace)、RA-L3(`--feature` 拒绝)、RA-M5(spec 保证收窄)全部落地。

**Non-Goals:**
- 不新增 lifecycle state / Gate / controller / 平行路径;不重写恢复语义本身。
- 不实现 legacy-load 识别(用户放弃兼容);不做 v1 journal 语义扩展。
- 不合并五面实现为一个"恢复控制器"——只统一**形状**,各面仍由各自模块产生直接事实。

## Decisions

1. **统一形状 = 扩展既有投影 helper。** 已存在 `engine/work-unit-attempt-disposition.mjs`(`@impl DEW-022, CHI-004`,其 `projectWorkUnitAttemptDisposition(bundleDir, record, { operation, rerun })` 已输出 identity/transaction/coverage 并接受 rerun 参数);五面(submit 拒绝 / late-submit 拒绝 / transaction 阻塞 / dry-submit / inspect)统一调用它,并保证输出同一 `attempt_disposition` + `next`(同一 checkpoint 的 exact rerun 坐标)。备选:新建第五个反馈结构 → 拒绝:重复;复用既有 helper 是"最短合法闭环"。
2. **repair_kind 拼写改为 CLI 动词;保留读取兼容。** engine 输出改为 `recover-transaction` / `recover-declaration` / `supersede` / `wait` / `missing_contract`;`cli/operate-work-unit.mjs` 的动词匹配已是连字符,engine→CLI 直接对应。旧下划线值不再输出;既有测试断言更新。备选:反馈额外携带命令串而不改拼写 → 也做(反馈带 `command` 字段,双保险)。
3. **supersede 压平 = 顶层新增字段,保留嵌套。** `supersedeWorkUnitAttempt` 顶层加 `tx_id`、`successor_queue_item_id`;`relation` 内旧字段保留(现有消费者与归档测试不破)。迁移路径:新读者用顶层,旧读者继续可用。
4. **recover 不死胡同 = 结果补 `next`。** `recoverWorkUnitTransaction` 与 `recoverDeclaration` 结果加 `next`(rerun 坐标);RUN.md 决策表给出每类 disposition 的 rerun 目标。
5. **journal_disposition = Zod 有界枚举。** 值域不变(`started|committed|rolled_back|suspect|legacy_failed|unknown`),schema 校验;RUN.md 的"结构化概念"变真。
6. **RUN.md 决策表 + 锁定测试。** 表列:disposition → 发出面 → repair_kind → CLI 动词(exact 命令)→ 重跑什么;内容依据证据 §7 恢复面心智模型。锁定测试:`tests/engine/work-unit-recovery-decision-table.test.mjs`(或 md 侧)枚举 engine 可发出的全部 `repair_kind`,断言每值有表行 + 匹配 CLI 动词。引擎新增 repair_kind 时测试先红。
7. **RA-M3**:`finalBoundaryProjection` 对 `verdict: blocked` 直接返回 blocked 投影(无 reachable action、无 `blocker:null` 兜底)。`buildRecoverySummary` 的 `reachable = Boolean(postFinalAction)` 逻辑在 blocked 时不得为 true。
8. **RA-L4**:`nextActionForStage` 的 delivery-pending(zero-append)与 refinement(proven-append)投影区分——如 action 增加 stage 字段或不同 `target_ref`,reentry 测试断言两投影不同。
9. **RA-L2**:`blockedSweepEntry` 的 `recommendedAction` 按 workspace 区分:primary-publication workspace → 命名记录的主操作面与合法 retry(不得说 generic persist);non-primary → 保持 retry persist。
10. **RA-L3**:`operate-artifact-persistence.mjs` 对 `persist`/`persist-final-report` 拒绝 `--feature`(parse 层),错误信息含:"`--feature` is only accepted by `publish-final-report`; this operation does not accept it"。
11. **RA-M5**:CPT-003 spec 已收窄(post-0edb58310 保证);代码侧 `findBoundLoad` 对三字段 legacy load 的现有拒绝保留,错误信息改为诚实边界表述("pre-0edb58310 Final load is outside the readability guarantee")。

## 三原则应用记录

- **语义边界**:统一形状的读者/有界问题/停止点见 proposal 语义反思;`attempt_disposition`(为什么拒绝)与 `next`(下一步)是两个字段,不合并。
- **direct Source of Record / 最短合法闭环**:下一步的唯一真相 = 反馈自带的 `next`/命令串(不再靠调用者记忆);repair_kind↔动词映射 = RUN.md 决策表(被测试锁定)。
- **net simplification**:删除五套各异的反馈结构、下划线暗号、嵌套翻找、死胡同恢复;增加的是同一 helper 的字段与一张表。未新增控制层。
- **helper-oriented 责任边界**:User decision = RA-M5/RA-L3(已拍板);Agent execution = 按 `next` 执行恢复、重跑同一 checkpoint;Engine verdict = 五面一致性、映射锁定、blocked 投影、`--feature` 拒绝均由确定性测试裁决。

## Risks / Trade-offs

- [repair_kind 拼写变化破坏既有调用方/测试] → 仅 engine 输出变;CLI 动词不变;测试同步更新;反馈额外带 `command` 串兜底。
- [supersede 顶层字段与 relation 内旧字段双写漂移] → 同一 commit 内由 helper 单点产出;顶层字段是 relation 的投影,测试断言一致。
- [五面统一形状时某面缺事实(如 late-submit 无 transaction 上下文)] → `next` 允许面级缺省(该面仍发统一形状,缺失字段显式 null),不强行编造。
- [RA-M3 改动影响既有 reentry 快照] → 现有 reentry 测试子集在 apply 时全跑;blocked 投影是收紧(更保守),既有"blocked 却 reachable"的快照本就该红。
- [RUN.md 决策表与 C2 后实际行为漂移] → 锁定测试把表↔代码绑死;C3 的内容漂移 checker 随后再兜一层。
- [RA-M5 收窄后旧 bundle 用户体验变化] → 用户明确放弃兼容;错误信息如实说明边界,不假装可读。

## Migration Plan

无数据/状态迁移。apply 分提交:helper/形状提交 → supersede/recover/journal 提交 → RA-M3/L4 投影提交 → ARP(RA-L2/L3)提交 → RUN.md 决策表 + 锁定测试 → spec 同步 + 归档。每步跑 `tests/engine/work-unit-*`、`tests/integration/cli/operate-work-unit*`、reentry、artifact-persistence 子集。

## Open Questions

无。RA-M3/RA-L2/RA-L4 已确认为行为修复;RA-M5/RA-L3 已由用户拍板;RA-L5 不改。

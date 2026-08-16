# Proposal: make-work-unit-recovery-feedback-direct

## Why

证据文件 `_backlog/plans/cleanup-effect-verification.md` Part II §7(M1-M10)+ §13(RA-*)确认:恢复反馈是"暗号 + 死胡同"——五个反馈面(submit 拒绝 / late-submit 拒绝 / transaction 阻塞 / dry-submit / inspect)里只有两个发出 `attempt_disposition`(M2);`repair_kind` 用下划线拼写而 CLI 动词用连字符,映射无文档(M3);`supersede` 的 `tx_id` / `successor_queue_item_id` 嵌套在 `relation` 内、不在顶层(M4);`recover` 结果无 rerun 字段,恢复后是死胡同(M10);`journal_disposition` 是裸字符串不是有界枚举(M7)。RUN.md 恢复段描述的行为与代码不符,Agent 只能靠猜。本 change(C2)让**反馈自带下一步**:五面统一形状、暗号消灭、决策表被测试锁定,并把 RA-M3/RA-L2/RA-L3/RA-L4 四个确认的行为缺陷一并修复。

## What Changes

全部为 Engine 反馈/投影行为变化(用户已拍板的方向标注 ★):

- **五面统一(M2)**:submit 拒绝(`recordSubmitRejection`)、late-submit 拒绝、transaction 阻塞、dry-submit、inspect 五个反馈面全部发出同一形状的 `attempt_disposition` + `next`(含同一 checkpoint 的 rerun 坐标)。
- **repair_kind 对齐(M3)**:`repair_kind` 值改为 CLI 动词拼写(`recover-transaction` / `recover-declaration`,现状 `recover_transaction` / `recover_declaration`),或在反馈中额外携带 exact 命令串;消灭下划线↔连字符暗号。
- **supersede 压平(M4)**:`supersedeWorkUnitAttempt` 结果把 `tx_id` / `successor_queue_item_id` 提到顶层(现状嵌套在 `relation` 内);文档不再要求读者从嵌套里翻。
- **recover 不死胡同(M10)**:`recoverWorkUnitTransaction` 结果补 `rerun`/`next` 字段(同一 checkpoint 重跑坐标)。
- **journal_disposition 有界枚举(M7)**:`journal_disposition` 由裸字符串改为 Zod 有界枚举(`started|committed|rolled_back|suspect|legacy_failed|unknown`),RUN.md 的"结构化概念"表述变真。
- **RUN.md 决策表(计划 C2 节)**:`RUN.md:36-38` 恢复段改写为一张**被测试锁定**的决策表(disposition → 发出面 → repair_kind → CLI 动词 → 重跑什么);测试断言每个 engine 侧发出的 `repair_kind` 都有表行和匹配 CLI 动词。
- **RA-M3(blocked 投影真话)**:post-final inspection 的 `verdict: blocked` 不得落入 `blocker: null` 的 reachable 投影;blocked 必须投影为 blocked。
- **RA-L2(advice 真话)**:sweep 的 `operation_not_prepared` advice 按 workspace 区分——primary-publication workspace 不得说 "retry generic persist"(playbook 与 ARP 语义为准),non-primary 才可 retry generic persist。
- **RA-L3(--feature 严格化 ★)**:`persist` / `persist-final-report` 收到 `--feature` → invalid_invocation(exit 2),错误信息**提示调用方**:该操作不接受 `--feature`,`--feature` 只属于 `publish-final-report`(暗示"你调用错了")。
- **RA-L4(投影区分)**:zero-append(delivery-pending)与 proven-append(refinement)在 reentry 投影中必须可区分(按 `runtime-reentry-debuggability` spec 要求)。
- **RA-M5(spec 保证收窄 ★)**:用户明确"对兼容毫无兴趣,做对更重要" → **不做 legacy-load 识别**;`cli-phase-transition` 的 pre-contract bundle 可读保证**收窄为 post-0edb58310 load**,并记录迁移边界(pre-0edb58310 的 `{entry, plan, ts}` 三字段 Final load 不在保证内,如实报 boundary 而非假装可读)。
- **RA-L5 不改**(刻意 quarantine 状态)。

## Capabilities

### New Capabilities

无。全部为既有 capability 的 MODIFIED requirement(仓库先例:无 New capability 不建 requirement-reservation)。

### Modified Capabilities

- `engine/check-inspect-feedback`:MODIFY CHI-004——五面统一 `attempt_disposition` + `next` 形状、repair_kind CLI-动词拼写、recover 带 rerun、RUN.md 决策表 + 表↔代码锁定测试。
- `agent/delegated-work-units`:MODIFY DEW-020(`journal_disposition` 有界枚举;submit 拒绝/transaction 阻塞面发统一形状)、MODIFY DEW-021(supersede 结果压平 `tx_id`/`successor_queue_item_id`)、MODIFY DEW-010(late-submit 拒绝面发统一形状)。
- `engine/runtime-reentry-debuggability`:MODIFY RRD-008(blocked 不得投影为 reachable;delivery-pending 与 refinement 可区分)。
- `bundle/artifact-persistence-recovery`:MODIFY ARP-004(`--feature` 严格拒绝 + 提示性错误)、MODIFY ARP-002(sweep advice 按 workspace 区分,primary 不得 retry generic persist)。
- `engine/cli-phase-transition`:MODIFY CPT-003(pre-contract 可读保证收窄到 post-0edb58310 + 迁移边界)。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/check-inspect-feedback` | CHI-004 现文(已用连字符动词);M2/M3/M10;RUN.md:36-38 | Modify | 反馈形状与决策表的正典 owner |
| `agent/delegated-work-units` | DEW-020/021/010 现文;M4/M7;transaction/supersession 代码 | Modify | submit/late-submit/supersede/transaction 面的行为 owner |
| `engine/runtime-reentry-debuggability` | RRD-008 现文;recovery-contract.mjs:145-148,178-191(RA-M3);post-final-recovery.mjs:339,342(RA-L4) | Modify | blocked 投影与 delivery/refinement 区分的 owner |
| `bundle/artifact-persistence-recovery` | ARP-004/002 现文;operate-artifact-persistence.mjs:90-141(RA-L3);artifact-persistence.mjs:1029-1035(RA-L2) | Modify | `--feature` 调用契约与 sweep advice 的 owner |
| `engine/cli-phase-transition` | CPT-003 spec:139-143,224-228;0edb58310^ 三字段 load(RA-M5) | Modify | Final 可读保证的 owner;用户拍板收窄 |
| `bundle/run-entry` | RUE-004 现文;RUN.md:36-38 | Excluded | RUN.md 恢复段的决策表要求并入 CHI-004(反馈投影 owner),避免为文档位置另开 delta |
| `engine/framework-engine` | M2/M3/M4/M10 代码坐标 | Excluded | 行为由 delegated-work-units + check-inspect-feedback 的 requirement 拥有;framework-engine 是 Engine 边界 spec,不承载具体反馈形状 |
| `research/post-final-recovery` | POF-001 现文 | Excluded | C5 恢复语义不改;只改其投影(RA-M3/L4 在 RRD-008) |

## Impact

- **代码**:`engine/work-unit-submit.mjs`、`engine/work-unit-transaction.mjs`、`engine/work-unit-supersession.mjs`、`engine/work-unit-inspect.mjs`、`engine/helpers/recovery-contract.mjs`、`engine/helpers/post-final-recovery.mjs`、`engine/helpers/artifact-persistence.mjs`、`cli/operate-artifact-persistence.mjs`、`cli/operate-work-unit.mjs`(如需)、`cli/check-reentry.mjs`(投影)。
- **文档**:`RUN.md:36-38`(决策表)、`COMMANDS.md`(如命令串变化)、`openspec/guidance/models/invariants-brief.md` 第 7 条(反馈面现状 → C2 后形状)。
- **spec**:5 个 delta(全部 MODIFIED requirement,无新 ID)。
- **测试**:`tests/engine/work-unit-*` 相关子集、`tests/integration/cli/operate-work-unit*`、reentry 投影测试、RUN.md 决策表锁定测试、artifact-persistence `--feature` 拒绝测试。
- **无影响**:不新增 lifecycle state / Gate / controller;不动 schema version(输出字段只增不改语义);不触碰 C5 恢复语义本身。

## 语义反思(semantic-precision)

- **统一反馈形状**(`attempt_disposition` + `next`):读者 = 被恢复反馈的 Phase Agent;有界问题 = "这次拒绝是什么、谁拥有、下一步跑哪个命令";必须保留的区别 = disposition(拒绝原因)与 next(下一步)是两个字段,repair_kind 只命名操作不决定交互时机;正常推理停止点 = 读到 `next` 的 exact 命令串或 rerun 坐标即可执行,不需要翻 ENGINE 源码。
- **RUN.md 决策表**:读者 = 恢复场景的 Agent;有界问题 = "当前 disposition → 哪个 repair_kind → 哪个 CLI 动词 → 重跑什么";停止点 = 表行与测试锁定一一对应,引擎新增 repair_kind 时测试先红。
- **blocked 投影(RA-M3)**:读者 = reentry 调用者;有界问题 = "这个 root 是否 reachable";停止点 = blocked 就是 blocked,不得用 `blocker: null` 伪装成 reachable。

## 简洁准入两问(simple-reliable-control)

1. **direct Source of Record**:恢复下一步的真相 = Engine 反馈本身(每个面自带 `next`),不再是"调用者自己记住原命令"(M10 死胡同的修复);repair_kind ↔ CLI 动词的单一映射 = 决策表(被测试锁定);`--feature` 的合法归属 = `publish-final-report`(ARP-004),其余操作直接拒绝。
2. **最短合法闭环 + net simplification**:五面共用同一形状 = 一个投影 helper 取代五个各自为政的反馈结构;决策表取代 RUN.md 的三段散文;删除的暗号(下划线拼写、嵌套字段、死胡同)多于新增的字段(`tx_id` 上提、`rerun` 补上、`journal_disposition` 枚举化)。未新增 state/Gate/controller。

## 责任边界(user decision / Agent execution / Engine verdict)

- **User decision(已拍板,记录于本 proposal)**:RA-M5 = 收窄 spec 保证到 post-0edb58310 + 记录迁移边界(不做 legacy 兼容);RA-L3 = 严格拒绝 `--feature` 且错误信息提示正确操作。
- **Agent execution**:按决策表与反馈 `next` 执行恢复、重跑同一 checkpoint;语义修复仍属 Agent。
- **Engine verdict**:五面形状一致性、repair_kind↔CLI 动词映射、supersede 顶层字段、blocked 投影、`--feature` 拒绝全部由确定性测试裁决。

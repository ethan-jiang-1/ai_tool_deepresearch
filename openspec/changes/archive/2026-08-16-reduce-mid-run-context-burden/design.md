# Design: reduce-mid-run-context-burden

## Context

See proposal.md — Why. 现状要点:

- 审计 `_backlog/plans/midrun-reading-burden-audit.md` 已把 5,431 行 nodes 全读并三分类
  (~448 sites:55% 机器覆盖 / 8% 过时重复 / 37% 纯纪律),推荐 Option A(纯 markdown)。
- 对照目录 `_backlog/plans/machine-checks-catalog.md` 提供每条 class-(1) 的机器检查名。
- apply 前已核对的当前树事实:
  - wave0/1/2 的 `requires` 均含 `shared/shared-anti-cheating-rules`,其 §9 与 shared
    逐条重复;
  - hitl1/hitl2 的 `requires` **不含** shared-anti-cheating-rules,但其 §9 末行已引用
    "参见 shared-anti-cheating-rules.md"(指针悬空);
  - anti-cheating 结构缺陷:双 `### 13`、`### 14` 与 `### 13`(:78) 重复、孤儿 §12 段落、
    §13-16 为 chain 策略(重复 `transitions.chain.json`);
  - manifest.shared 含 `shared-gate-rules.md`/`shared-repair-guidance.md` 但无 phase
    requires;
  - 8 个 `stop: no` phase 的 §7 前导段逐字重复 `shared-silent-execution.md` 与注入头。

## Goals / Non-Goals

**Goals:**

- 静态删 ~320-430 行(6-8%),每轮重复税降 ~350-550 行。
- 通用禁令、互动放置、drain 循环各收敛到一个事实所有者,phase 只留指针 + 特有内容。
- 立法防疤痕:consistency-validator 新检查类 + check-content-drift 扩展,把
  "phase 散文不得重复机器强制事实"变成机器锁。
- 恢复语义零变化:requires 闭包、--full、注入头、见证链、current_node 恢复不动。

**Non-Goals:**

- 不做引擎级 once-per-run loading(C3 deferred,换恢复语义)。
- 不删任何机器检查、不弱化 fail-closed;gate definition JSON 不动。
- 不重写 phase 节点结构(§0-§9 骨架保留);只瘦身、不重构叙事。
- 不碰 `shared-silent-execution.md` 整份内容(load-bearing)。
- 不做 hook/CI(计划 Non-Goals 沿用用户 2026-08-16 决定)。

## Decisions

### D1: 删除顺序 = 先闭包、后瘦身(硬前置)

- 先给 hitl1/hitl2 补 `shared/shared-anti-cheating-rules` 进 `requires`
  (修复指针悬空,满足 consistency-validator 的闭包要求),再动它们的 §9。
- 再删 wave §9 重复、§7 前导段、rerun 自重复、anti-cheating 结构缺陷。
- 理由:任何 phase 的 in-context anti-cheating 闭包不能因删除而静默变弱
  (审计 §A.5 Must NOT 清单)。

### D2: 不新建 shared drain 文件 — 共享骨架已在 shared-subagent-protocol

- 审计(2026-08-16)声称 wave §3.2 "三份近同 ~30 行"可合并为一个新 shared
  `shared-wave-drain-loop.md`。apply 时以当前树核对:wave0 §3.2 ~80 行
  (dpt-source-intake 角色、wave0 floor、actor 探测全 wave 特有)、wave1 §3.2
  163 行(Returned Work Decision / Topic Reference Materialization / Depth
  Review / Terminal Replacement 四子节全特有)、wave2 §3.2 89 行(finding
  triage 循环,完全 wave2 特有)。**三份并非近同**。
- 共享的 batch-poll-submit 骨架(claim_count 公式、actor 观察、poll/submit/
  repair 骨架)**已完整存在于 `shared-subagent-protocol.md`**(三 wave 的 requires
  均含它)。审计的"新 shared drain 文件"在当前树冗余——共享所有者已存在。
- 决定:不创建 `shared-wave-drain-loop.md`;wave0/wave1 的 §3.2 首行补显式指针
  到 shared-subagent-protocol(wave0 原 "Repeat the shared batch-poll-submit loop"
  已隐含,改为显式);wave2 §3.2 是 finding triage 循环,无 drain 骨架,不指针。
- 理由:simple-reliable-control——不新增事实所有者;每 wave 的 §3.2 特有内容
  保留,零结构重构。
- 备选(审计原案):抽 shared drain 文件。拒绝——需把 163 行 wave1 特有内容从
  新文件剥离,且新文件与 shared-subagent-protocol 职责重叠,制造第二个所有者。

### D3: manifest.shared 漂移方向 = 移除

- `manifest.json#/shared` 删除 `shared-gate-rules.md` 与 `shared-repair-guidance.md`
  (无任何 phase requires;保留在 manifest 但无闭包是误导)。
- 需确认 consistency-validator 对 manifest.shared 的消费逻辑(只查文件存在 +
  role-spec/actor-fetch 排除),删除后不破坏;如 validator 对缺失条目报错,
  apply 时按证据调整并写回计划。
- 备选:补 requires。拒绝——这两个文件无 phase 需要完整加载,补闭包反而增加
  每轮载荷,与目标相反。

### D4: 新检查类 `phase_local_anti_cheating_duplication`

- 实现:consistency-validator.mjs 的 phase 循环内,若 `requires` 含
  `shared/shared-anti-cheating-rules`,读取 shared 文件的禁令句子集(按行/句
  分割),扫描 phase 本地 §9,发现逐字重复即 issue。
- 比对粒度:句子级(shared 文件每行禁令作为比对语料),避免整节指纹误报。
- 测试:构造一个含重复的临时 phase(或 fixture),断言检查类命中并命名节点与句子。

### D5: check-content-drift.mjs 扩展 = 禁止句 ↔ 机器检查对照

- 对机器已覆盖的禁令句式(如"禁止手写 ledger/trace/receipt"),要求文档面只允许
  指针形态(指向 shared 文件或 machine-checks-catalog),不允许在 phase prose 重复。
- 实现:内置一组"机器覆盖禁令句式"语料(取自 machine-checks-catalog 的代表性
  check 名对应禁令),扫描 `workflows/nodes/phases/*.md`,命中即 fail。
- 范围:只扫 phase 节点(shared 文件是所有者,允许全文)。
- **delta 归属**:该工具是既有治理检查族成员(头注释 `@impl RET-006`),扩展是
  工具内部增强——职责仍是"验证 guidance 面与当前树一致"(GCO/RET 既有
  requirement 覆盖),不改变任何 accepted requirement 的可观察契约,因此不新增
  第 3 个 delta;proposal 的 2 个 delta(shared-node-content、research-wave-phase-content)
  即完整立法面。

## Risks / Trade-offs

- [删除 class-(1) 散文丢掉"why"价值] → 优先删(2)类;删(1)类仅限"理由已由检查
  失败信息完整表达"的条目;纯纪律(3)类语义全保留。
- [新 shared drain 文件破坏 requires 闭包] → 三个 wave requires 同步加;跑
  validate-workflow-package + consistency-validator 回归验证闭包解析。
- [manifest.shared 移除破坏 validator] → apply 时先读 validator 消费逻辑,若报错
  按证据处理并写回计划。
- [检查类误报(shared 句子被 phase 引用而非重复)] → 比对粒度句子级 + 只扫 §9
  区域;若误报 apply 时调整语料与扫描边界。
- [§7 前导段压缩丢互动契约] → 压缩后指针指向 shared-silent-execution.md 与注入
  header,契约语义不丢;header 每 stop:no 自动注入,不依赖 phase 散文。

## Migration Plan

- 单 change 内完成;回滚 = revert commit。
- 顺序:hitl1/hitl2 requires 前置 → 删(2)类 → 删/指针化(1)类 → 压缩(3)类 →
  新 shared drain 文件 → 立法 delta 落 main spec → 检查类/check-content-drift
  落地 → 全量测试 + 复测否定计数写回计划 §1.3。

## Open Questions

无。计划 §1.4 与审计已提供逐条分类种子;manifest.shared 方向已在 D3 定为"移除"
(propose 证据决定);若 apply 时证据与当前树不符,按计划 §5 以当前树为准并写回。

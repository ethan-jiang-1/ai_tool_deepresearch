# Proposal: reduce-mid-run-context-burden

## Why

第二轮清理计划 `_backlog/plans/midrun-burden-reduction-and-residual-drift.md` 的
**负担轴**（§1.3-§1.4）:phase 节点否定规则密集（wave0 349 / wave1 421 / wave2 369 行，
~448 个否定 sites），每轮运行手动读税 + 引擎注入头税高企。审计
`_backlog/plans/midrun-reading-burden-audit.md`（5,431 行 nodes 全读）三分类：
(1) 机器已覆盖 ~246（55%）、(2) 过时/重复 ~34（8%）、(3) 纯纪律 ~168（37%）。
本 change 实现审计推荐 **Option A:纯 markdown 去重/压缩,零引擎改动**——静态删
~320-430 行(6-8%),每轮重复税降 ~350-550 行;`requires` 闭包、`--full`、注入头、
见证链、`current_node` 恢复全部不动,fresh context 仍独立可恢复。

## What Changes

全部为 `DEEP_RESEARCH_HARNESS/workflows/nodes/**` 的 markdown 校准(目标坐标以当前树
为准,apply 时逐条复核)。零 .mjs / schema / gate definition / run bundle 改动。

### 删(2)类:过时/重复(~34 sites,审计 §A.4)

- **wave §9 逐条重复**:wave0/1/2 的 `## 9. Anti-Cheating Rules` 与
  `shared/shared-anti-cheating-rules.md` 逐条重复(shared 已在各 wave `requires`),
  整节删为一行指针"Anti-cheating 通用禁令见 `shared/shared-anti-cheating-rules.md`;
  本 phase 特有禁令如下:",保留 wave 特有的条目。
- **8 个 phase §7 前导段**:`## 7. On Gate Fail` 的"先读取 CLI top-level `hints[]`;
  `inspect[]`/`advice[]` 只提供 compatible forensic detail…"前导段
  (wave0/1/2、instantiation、setup、seed-topics、readiness、rerun)重复
  `shared-silent-execution.md:21,23` 与引擎注入头,压缩为一行指针
  "反馈读取与互动放置契约见 `shared/shared-silent-execution.md` 与注入的
  AUTONOMOUS header",保留 phase 特有的 5 条 `repair_kind` 分支。
- **rerun §9 自重复**:`phase-rerun.md` §9 与自身 §3 语义重复的条目
  (`:170` 重复 `:82` MUST NOT 删除已有 artifacts;`:171` 重复 §3 的
  "不得用 direct multi-file edit 或 human-directed 绕过…direct-edit seed
  direction 或 registry";`:177` 重复 §3 的 "Agent 不得重新解析
  rb_profile.yaml";`:178` 重复 §3 的 check.next 路由要求)删除,只留 §3 指针;
  rerun 特有的条目(post_final_reentry 语义、rerun_count 递增、rationale
  方向来源、seed direction exact recover)保留。
- **anti-cheating 结构性缺陷**:修复双 `### 13`(:78 与 :116)、`### 14`(:84)与
  `### 13`(:78)重复(cache_trails 遗漏两条并一条)、孤儿 §12 段落、§13-16 的
  chain 策略内容(重复 `transitions.chain.json`)删为指针。
- **hitl2/final 同文件与 chain 静态数据重复**:hitl2 §9 的 "MUST NOT 将不确定
  branch 的路由编码进 transition chain" 与同文件 :110 及 `transitions.chain.json`
  重复,保留一处 + 指针;final §9 首条与注入 header 重复,压缩。
- **manifest.shared 漂移**(方向已定):`manifest.json#/shared` 移除
  `shared-gate-rules.md`、`shared-repair-guidance.md`(无任何 phase `requires`,
  消费者只有 consistency-validator 的 manifest 校验;保留在 manifest 但无
  requires 是误导,删除后 manifest.shared 与真实闭包一致)。

### 删/指针化(1)类:机器已覆盖(~246 sites,审计 §A.3)

- 每条删除/指针化时在 git commit 或 apply 记录中附机器检查名/rule id
  (以 `machine-checks-catalog.md` 为对照);优先删(2)类,再删(1)类中
  "理由已由检查失败信息完整表达"的条目(如 `delegated_bypass_suspected`、
  `ledger_record_hash`、`seed_initialization_structure`、`depth_review_contract`
  等已覆盖的散文)。**纯纪律(3)类语义一律保留,只允许压缩合并,不允许删除。**

### 压缩(3)类:纯纪律(~168 sites)

- **wave §3.2 drain 段三份近同**(wave0/1/2 各 ~30 行)→ 一份 shared
  `shared/shared-wave-drain-loop.md`(新文件,`authority: guidance-only`,
  进三个 wave 的 `requires`),wave 内留 drain 特有差异。
- **交互放置句** → 指向 `shared-silent-execution.md`(整份不可删,load-bearing)。
- **子代理 MUST NOT 列表**去解释性尾巴,保留禁令语义。

### 立法(防疤痕再长)

- **MODIFY `workflow/shared-node-content`**:SHC-004(anti-cheating 内容要求)新增
  "shared 文件已进 phase `requires` 时,phase §9 不得逐条重复 shared 禁令,只留
  指针 + phase 特有条目"。
- **MODIFY `research/research-wave-phase-content`**:RWP(anti-cheating rules in
  wave phase bodies)新增同约束(wave §9 在 shared 进 requires 时缺席或为指针)。
- **consistency-validator 新检查类**:`phase_local_anti_cheating_duplication`——
  phase 的 `requires` 含 `shared/shared-anti-cheating-rules` 时,其 `## 9`
  不得逐字重复 shared 文件的禁令句子(以 shared 文件句子为比对语料)。
- **check-content-drift.mjs 扩展**:禁止句 ↔ 机器检查对照——对机器已覆盖的
  禁令句式(如"禁止手写 ledger/trace/receipt"),要求文档面只允许指针形态。

### 硬前置(顺序强制)

1. 先给 hitl1/hitl2 补 `shared/shared-anti-cheating-rules` 进 `requires`
   (当前树:两文件 §9 末行已引用该 shared 文件但 requires 缺它——指针悬空,
   先补闭包再动它们的本地 §9)。
2. 再删/压缩各 phase 本地 §9 的重复部分。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `workflow/shared-node-content`:MODIFY SHC-004——phase 本地 §9 在 shared 已进
  requires 时不得重复,只留指针 + phase 特有条目。
- `research/research-wave-phase-content`:MODIFY RWP(anti-cheating rules in wave
  phase bodies)——wave §9 同约束 + consistency 检查类立法。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `workflow/shared-node-content` | SHC-004 spec:107-127;anti-cheating 结构缺陷;wave §9 重复 | Modify | 立法 phase §9 不得重复 shared 禁令,需 SHC-004 扩展 |
| `research/research-wave-phase-content` | RWP spec:393-401;wave0/1/2 §9 现状 | Modify | wave §9 的 anti-cheating 内容要求需扩展 + 检查类立法 |
| `bundle/run-entry` | RUE spec;RUN.md | Excluded | 本 change 不触碰入口/路由文档 |
| `engine/check-inspect-feedback` | CHI-004 spec(已归档 C1 同步) | Excluded | 本 change 不改反馈拼写/形状契约 |
| `workflow/workflow-node-contract` | WNC spec;consistency-validator 现状 | Excluded | 新检查类归属 consistency-validator 内部扩展,不改变 WNC requirement;若 apply 发现需 WNC 变化再评估 |
| `agent/subagent-node-contract` | SNC spec;shared-subagent-protocol.md | Excluded | 子代理 MUST NOT 列表仅去解释性尾巴,不改 SNC 契约语义 |

## Impact

- **目标文件**:`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave{0,1,2,hitl1,hitl2,instantiation,setup,seed-topics,readiness,rerun,final}.md`、
  `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-anti-cheating-rules.md`、
  `DEEP_RESEARCH_HARNESS/workflows/manifest.json`(仅 shared 列表)、新增
  `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-wave-drain-loop.md`。
- **代码**:`DEEP_RESEARCH_HARNESS/engine/consistency-validator.mjs`(新增
  `phase_local_anti_cheating_duplication` 检查类)、
  `openspec/governance/check-content-drift.mjs`(禁止句↔机器检查对照扩展)。
- **测试**:`tests/engine/consistency-validator.test.mjs`(新检查类)、
  `tests/` 下 content-drift 相关测试、现有 md 契约回归。
- **spec**:上述 2 个 delta(全部为既有 capability 的 MODIFIED requirement)。
- **无影响**:零引擎行为变化、零恢复语义变化(`requires` 闭包、`--full`、注入头、
  见证链、`current_node` 恢复不动);`shared-silent-execution.md` 整份不动;
  C3(引擎级 once-per-run loading)保持 deferred,本 change 不触碰 loader。

## 语义反思(semantic-precision)

本 change 不引入新的 reader-facing surface 之外的具名概念/state/command。
新增的唯一 surface 是 shared `shared-wave-drain-loop.md`:

- 读者:运行中的 Wave Phase Agent(需要 drain 循环指引)。
- 有界问题:"当前 wave 如何 drain delegated queue?"——不是 gate 规则、不是
  workflow 控制器、不是第二份 silent-execution。
- 必须保留的区别:shared 文件(guidance-only,可被多 phase 复用)↔ phase 节点
  (stop/gate 所有者);通用禁令(shared-anti-cheating)↔ phase 特有禁令(§9 本地);
  drain 循环(shared)↔ phase 特有 drain 差异(本地)。
- 正常推理停止点:读到 shared 指针或 drain 循环全文即停,不再逐 phase 对照
  重复散文。

## 简洁准入两问(simple-reliable-control)

1. **direct Source of Record**:通用禁令 → `shared-anti-cheating-rules.md`;
  互动放置 → `shared-silent-execution.md`;drain 循环 → 新 shared 文件;
  机器强制事实 → 各 gate rule/validator(以 `machine-checks-catalog.md` 为对照)。
  每处删除/压缩都收敛到一个已存在或新建的事实所有者,不新建真相。
2. **最短合法闭环 + net simplification**:删除/压缩(~320-430 行静态,
  ~350-550 行/轮重复税)远多于增加(一个新 shared 文件 + 2 个检查类);
  新增检查是**替代**人工复查与未来漂移,不是叠加控制层。恢复语义零变化。

## 责任边界(user decision / Agent execution / Engine verdict)

- **User decision**:无方向性拍板项(manifest.shared 漂移方向 = 移除,
  已由 propose 证据决定并记录于本 proposal;如用户有异议可改)。
- **Agent execution**:全部 markdown 去重/压缩/指针化、新 shared 文件起草、
  delta specs、consistency/content-drift 扩展。
- **Engine verdict**:新检查类由确定性测试裁决;既有引擎行为与恢复语义零变化。

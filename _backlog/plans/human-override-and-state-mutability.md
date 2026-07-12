# Plan: 两条 lane 的区分 — audited human-override 与 bundle state 可变更性

**性质:** 第一性原则 + 能力立项前设计计划（pre-OpenSpec）
**状态:** Partial — v0.21 已吸收 helper-oriented/human-directed 指导基础；audited override、rename、state-seed 与 integrity audit runtime slices 仍待切成 OpenSpec change（2026-07-12）
**触发:** `dpt_rb_ai-era-bpm-process-disruption` 的 post-final rerun → 崩溃恢复 → 重编号 → canonical 归一化全过程。一个熟悉框架的人，想做一次明确的修正，被 anti-cheating 规则逼着跨 N 个面手工同步、还被单向棘轮堵在门外。复盘出的根问题：**框架分不清"静默自主"与"明晃晃的人在交互使唤"两条 lane，用同一套刚性规则把两者一起锁死。**
**设计原则:** [`guidelines/project-charter.md`](../../guidelines/project-charter.md)、[`guidelines/evolution-simple-reliable-control.md`](../../guidelines/evolution-simple-reliable-control.md)、[`guidelines/evolution-helper-oriented-agent.md`](../../guidelines/evolution-helper-oriented-agent.md)
**姊妹 plan:** [`breakpoint-recovery-persistence-model`](breakpoint-recovery-persistence-model.md)（那条管"持久化/可恢复"；本条管"可变更 + 可被人修正 + 可调试"）
**症状实证:** [BUG-078](../bugs/BUG-078-post-final-hitl2-rerun-reentry-blocked.md)、[BUG-079](../bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md)（§根本设计张力 + fix E）

---

## 0. 结论

**第一性原则：静默自主 lane 和 人交互使唤 lane 必须在机制上区分开，分别判。**

| lane | 是什么 | 该怎么对待 |
|------|--------|-----------|
| **静默自主**（`stop:no`、Agent 自驱、gate 自动推进） | LLM Agent 无人看管地跑 | **硬堵**——anti-cheating 全套（禁手写 trace、禁改 status、单向棘轮、不得 surface）。防的就是 Agent 偷偷伪造。 |
| **人交互使唤**（HITL 内人显式下命令；开发者主动摆状态调试） | 明晃晃有个有授权的人在使唤 | **不是自主启停那条 lane**——不该用同一套规则堵。应走**有审计的 human-override**：人显式授权 + 记 who/when/why，Engine 照做并留痕。 |

现在框架把两条 lane 混成一条、一律按"自主"的刚性对待。后果就是本次全程：**熟手都要跨 N 个面手改才改得对，小白几乎不可能自救，人强烈明确要求还被"不能改这个不能改那个"顶回去。过度刚性 = 进得来、修不了。**

**关键区分：作弊 = 静默、无审计地伪造（该禁）；授权修正 = 显式、有审计地覆盖（该允）。** 缺的不是"把墙拆松"，而是"开一道带审计的门"。门有审计，就不叫作弊。

---

## 1. 动机（两个，都是真实痛点）

### 1.1 运行期：HITL 里人本是 authority，却被降格
HITL 的语义是"人在环里做决定"。但 anti-cheating 规则（为约束 Agent 而设）一并锁死了人：想改 `rb_status`、重入终态 phase、重编号 topic，全被挡（BUG-078/079 亲历）。名义上人是 authority，实际人得像 Agent 一样受完整 gate 约束。用户强烈、明确地喊"就这么改"时，框架仍不 defer 到人——这违背 HITL 的初衷。

### 1.2 开发期：开发者需要"跳到某 state、摆好环境、从这儿往前跑"
框架**还在开发中**。开发者必须能像 debugger 的 set-next-statement 那样：**主动把 run 置入任意 state → Engine 把环境准备成一致 → 从该点往前跑**。没有这个原语，调试本身就死锁——每验证一个后段 phase 都得从头正经跑一遍，或手抠十几个状态文件（还会漏、还会被 anti-cheating 拦）。"人强烈有要求时你还是得想一想，否则你不死了吗"——就是这个。

> 两个动机指向同一能力：**一条有审计的 human-override，既承载运行期人类 authority，也当开发期的 state-jump 调试原语。**

---

## 2. 第一性原则（写入 guidelines 候选）

1. **两条 lane 分离判定。** 每个会改 durable state 的操作，Engine 先判来源 lane：`autonomous`（Agent 自驱）还是 `human_directed`（人显式授权）。anti-cheating 全套只无条件作用于 `autonomous`。
2. **override 必须有审计，不得静默。** `human_directed` 覆盖 guardrail 时，MUST 写 who / when / why 到 trace + run.log，并打 `override` 标记。**没有审计的覆盖仍视为作弊。** 这是"松动口"与"后门"的唯一区别。
3. **override 后必须可校验。** 每次 override 之后，Engine SHALL 能跑一致性审计，报出该操作是否引入 drift（悬空引用、registry↔artifacts 不匹配、profile↔结构脱钩）。松动口配一致性网，才不至于把 bundle 改烂。

---

## 3. 能力（从原则派生）

| 能力 | 解决的痛 | 说明 |
|------|---------|------|
| **A. 单一真相源 + 派生/校验** | 改一处要手工同步 N 处 | topic 身份/编号只认 `topic_registry`；seed 文件名、`related_topic`、`artifacts/waveN` 目录、dossier 链接、profile 全部**派生**或**对它校验**，不各自为政。 |
| **B. 原子的 `rename-topic` / `renumber` 命令** | 本次"08→06"手改 registry/seed/19 卡/dossier/index/README/artifacts | 一条命令原子改所有派生面 + 更新计数，而非十几处手工 sed。 |
| **C. `human-override` / `authorized-repair`（含 state-seed）** | 想改 status/重入 phase/摆状态调试都被堵 | 认证的人显式授权做通常被禁的改动（改 status、重入终态 phase、置入任意 state 并把环境摆一致），**强制审计**。运行期承载人类 authority，开发期当 state-jump 调试原语。 |
| **D. `audit-bundle-integrity`** | drift 无人检出（悬空 `related_topic`、隐形 topic、profile drift 全是人肉发现的） | 一条只读校验：枚举全 topic 五层（seed/registry/wave0/wave1/交付）完整性 + 交叉引用一致性 + profile↔结构一致性。override 后立即可跑。 |

---

## 4. OpenSpec change 切割建议

按 failure mode 聚，建议 **3 个 change**，顺序 D→A/B→C：

| Change | 覆盖 | 落地风险 | 顺序理由 |
|--------|------|----------|----------|
| `audit-bundle-integrity` | D | 低（只读，独立可测） | 先做——它是 override 的安全网，也立刻能把现存 drift 变成可检出 |
| `topic-identity-single-source` | A + B | 中（触及 registry↔派生面语义） | 单一真相源 + 原子 rename/renumber |
| `audited-human-override-lane` | C + §2 原则 | 高（触及 anti-cheating 核心、lane 判定、trace/status 写入授权） | 最后——依赖 D 的审计网 + A 的单一真相源；是原则的机制落地 |

原则（§2）本身够格进 `guidelines/`（哲学层，非单点缺陷），建议与 `audited-human-override-lane` 同批落。

---

## 5. 关系与边界

- **与 BUG-078/079:** 二者是本 plan 的**症状实证**。078=终态后重入被单向棘轮堵；079=out-of-gate 无 canonical footprint + §根本设计张力 + fix E（audited override）。本 plan 是"为什么会反复被堵 + 怎么根治"的上层设计。
- **与 `breakpoint-recovery-persistence-model`:** 姊妹 plan，两条轴——那条=**持久化**（崩溃时存没存下来）；本条=**可变更性**（改动时传不传播、人能不能修正、开发能不能跳 state）。D（integrity audit）两条 plan 共用。
- **Phase gate 边界:** 本 plan 只写 `_backlog/plans/`，**不动 DPT_FRAMEWORK 代码**；实现只在各 change `/opsx:apply` 时按批准 task 落地（CLAUDE.md 硬规则）。
- **本次 bundle** 是"人肉走完 override + rename + integrity"的活样本，可作为 A/C/D 的 golden fixture。

## 6. 未决问题

- **lane 判定的信号来源？** 靠 CLI flag（`--human-override --reason`）、专用命令、还是会话级 authority token？如何防 Agent 自己伪造 `human_directed` 来源（否则 override 变成 Agent 的新后门）。
- **override 的粒度与边界？** 允许改哪些 state（status/trace/registry/profile 全部？还是白名单？）；哪些即使 override 也不许（如已交付 final 证据的事后篡改）。
- **state-seed 的"环境一致性"到哪一层？** 置入 state X 时，Engine 要不要连带补齐该 state 应有的 canonical artifacts（否则又是一次 BUG-079 式的隐形空洞）。
- **原则是否入 charter？** "两条 lane 分离 + 有审计的 override" 是否上升为 charter 级不变量，而非仅 guidelines 建议。

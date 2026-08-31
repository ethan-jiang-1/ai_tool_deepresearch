# control-surface-drift-density-and-module-boundaries

> 状态: active plan——五 finding 的实测证据与处置决策（2026-08-31 复核：全部硬证据逐项复测通过；原吸收载体 `dsh-harness-idea-transfer-roadmap.md` 判定有误已删除，处置决策回到本文件；C3 importer 证据已按复测修正） | 创建: 2026-08-31 | 来源: coding-agent 全仓通读评估（用户确认五个 finding 均需认真处置）
> 定位: CLS-065 `midrun-burden-reduction-and-residual-drift` 与 CLS-066/067 `agent-guidance-conflict-drift-remediation` 的残余轮——前两轮已建立指针化与 drift-guard playbook，本轮处理它们未覆盖的漂移实例、残留散文墙与引擎模块边界。
> 纪律: 本 plan 只记录证据与处置决策，不改任何行为。所有 `DEEP_RESEARCH_HARNESS/` 与 `openspec/governance/` 改动走 OpenSpec 生命周期（propose → apply）；housekeeping 类除外（见 C4）。

---

## 0. Finding 总览与处置表

| # | Finding | 核心证据 | 处置 | 载体 | 优先级 |
|---|---------|----------|------|------|--------|
| C1 | COMMANDS.md L159 gate 推进链错序（prose 漂移实例） | 链序与 `workflows/transitions.chain.json` 矛盾；由 `938806958`（2026-08-28）引入；无 checker 锁 prose 顺序性声明 | 删手写链改 pointer + 新增防再发 guard | 一个有界 OpenSpec change | P1 |
| C2 | 控制面散文墙（500–1500 字单段 × 8+ 处） | RUN.md L34=1114 / L36=953 / L40=954 / L55=730 chars；COMMANDS.md L17=1463 / L33=659 / L11=460 chars | 语义保持的结构化重构（表格化/原子化） | 一个有界 OpenSpec change（沿用 CLS-065 C2 playbook） | P2 |
| C3 | 引擎超大单文件 | `engine/work-unit-submit.mjs` 2447 行 54 函数 3 importer；`engine/helpers/canonical-topic-state.mjs` 2093 行 85 函数 9 importer | measure-first，逐个有界抽取，public API re-export 保持零 importer 变更 | 先无代码测量报告，后每项抽取一个 change | P3 |
| C4 | `tests/suspended/` 幽灵空目录 + `.gitignore` L54/55 重复行 | git 零追踪、磁盘 0 文件、全仓无文档引用；`.gitignore` 两行 `dpt_disp_*/` | 直接 housekeeping（`rmdir` + 去重），无需 change | 本 plan 内直接执行 | P3（可立即） |
| C5 | repo root 散落 4 个 `dpt_rb_*` bundle 的视觉噪音 | bundle 在 repo root 是 documented convention（DRH README「Run Bundle 外形」）；`.gitignore` L58 + Do-Not-Read 已双重防护 | **accepted，不动**；本节记录理由 | 无 | accepted |

执行顺序：C4（立即）→ C1 → C2 → C3（C1 的 guard 落地后再做 C2，让 guard 立即校验 C2 产出；C1/C2 都动 `COMMANDS.md`，顺序执行避免冲突）。

---

## 1. C1 — gate 推进链 prose 漂移改正与防再发

### 证据（2026-08-31 核实）

- `DEEP_RESEARCH_HARNESS/COMMANDS.md` L159：「六大生命周期 gate 的 `check.next` 推进链：`wave0-complete` → `wave1-complete` → `wave2-complete` → `hitl1-recorded` → `hitl2-recorded` → `readiness-passed`」。
- 真实时序（`workflows/transitions.chain.json` + `workflows/manifest.json`）：`instantiation-complete` → `hitl1-recorded` → `setup-ready` → `seed-topics-ready` → `wave0-complete` → `wave1-complete` → `wave2-complete` → `hitl2-recorded` → `readiness-passed`（+ `phase-hitl2` 的 `rerun` 边经 `rerun-ready` 回环到 seed-topics）。prose 把 `hitl1-recorded` 排到了 wave2 之后，作为「推进链」是错的。
- 引入点：`git log -S` 定位到 `938806958`（2026-08-28，change `2026-08-28-commands-md-coverage-and-copyable-contracts`）——coverage 动机（gate 命令 `--current-node` one-liner）附带手写链，排序出错；当时无 checker 能拦。
- 反面澄清：README「`cli/gates/` 当前 10 个 wrapper」**没有**漂——`cli/gates/` 恰好 10 个 `check-gate-*.mjs` 对应 10 个 gate。漂移仅在链序句。
- 根因分类：prose 层手写了本应由单一真相源派生的**顺序性**内容；现有 `check-content-drift.mjs` / `check-guidance-pointer-targets.mjs` 锚定指针目标与内容漂移，但不校验 prose 中枚举序列的拓扑正确性。

### 方案（change 内二选一，推荐 B）

- **方案 A**：改正为真实 lifecycle 全序（10 gate）。缺点：手写对照表重新生长，下一次结构演进（加 gate/边）会再次漂。
- **方案 B（推荐）**：删除手写链与「六大」计数句，保留一句 pointer：「gate 全集与推进序的单一真相源是 `workflows/manifest.json` + `workflows/transitions.chain.json`；`engine/ask-next.mjs resolveNodeTransitionDetailed()` 提供详细查询」。与 COMMANDS.md L75 既有原则（`--to` 枚举「文档不另立手写对照表」）完全一致，属同一纪律的补齐。

### 防再发 guard

- 新增小 checker（可并入 `check-content-drift.mjs` 或独立 `check-gate-chain-prose.mjs`，挂入 `npm run governance:check`）：扫描 `DEEP_RESEARCH_HARNESS/**/*.md`，凡 prose 中出现 ≥2 个 gate enum 的 `→` 序列且非 pointer 行，与 `transitions.chain.json` 拓扑序比对；非 pointer 的 gate 序列 prose 直接报红（比比对更简单、更不易漏）。验收时用一个故意错序样本验证 guard 能红。

### 验收

- `COMMANDS.md` L159 不再含手写链；guard 在 `governance:check` 全绿；故意错序样本能红；全量 `npm test` 0 fail。

---

## 2. C2 — 控制面散文墙结构化（RUN.md / COMMANDS.md）

### 证据

目标段落（chars 为单行长度，2026-08-31 实测）：

| 位置 | chars | 内容域 |
|---|---|---|
| `RUN.md` L34 | 1114 | HITL1/HITL2/silent/用户消息边界/Final 四合一规则块 |
| `RUN.md` L36 | 953 | delegated work-unit 全生命周期路径 |
| `RUN.md` L40 | 954 | 五反馈面 `attempt_disposition` + `next` 形状声明 |
| `RUN.md` L55 | 730 | late-submit + timeout-preflight + 决策表锁定声明 |
| `COMMANDS.md` L17 | 1463 | HITL-only / autonomous / Final / post-final 四合一受众契约 |
| `COMMANDS.md` L33 | 659 | `continuation` cue 边界 |
| `COMMANDS.md` L11 | 460 | ordinary authorized 执行边界 |
| `RUN.md` L57/L59、`COMMANDS.md` L13/L15/L19 | 290–500（实测 474/474/374/308/290） | 次级段落（第二轮再评估） |

合计首批 ≈ 6.5k chars 的单段规则墙；每段压 4–6 条规则 + 多个否定式边界。对 Agent 读者，部分遵从概率随段落长度上升（本轮评估的结论之一），且这些段落恰是 authority 边界最密的地方——密度直接转化为正确性风险。

### 方案（沿用 CLS-065 C2「指针化 + 结构化」playbook）

- **语义保持重构**：每段拆为原子规则单元——优先表格（触发条件 / 规则 / owner / 反例边界），单条规则一行，保留全部精确 token（枚举、命令、文件坐标原样）。不新增语义、不合并语义、不改变任何 closed enum。
- **canonical home 纪律**：拆分时每条原子规则标注其 owner（owner spec / engine contract / RUN.md 本节），RUN.md/COMMANDS.md 只保留「决策所需最小规则 + owner 指针」，避免拆分过程制造第二真相源。`RUN.md` L34 这类 multi-rule canonical 块若某规则的 canonical home 在 owner spec，则此处降为 pointer + 一行摘要。
- **静态行数预算**：首批八段重构后总行数不增加（拆行增行、删冗余减行，净目标 ≤ 0），与 CLS-065「静态删 432 行」同类验收。
- **顺序约束**：在 C1 guard 合入后执行；guard 不覆盖散文墙本身，但 C1 建立的「gate 序列不进 prose」检查可顺带覆盖 C2 改写中可能新引入的 gate 枚举。

### 验收

- 八个目标段落全部表格化/原子化；改动 diff 中无枚举值、命令拼写、文件坐标变化（可机器 diff 校验）；相关锁定测试（如 `tests/engine/work-unit-recovery-decision-table.test.mjs`、governance checkers、`validate-phase-templates`）全绿；全量 `npm test` 0 fail。

---

## 3. C3 — 引擎大文件边界划分（measure-first）

### 证据

- `engine/work-unit-submit.mjs`：2447 行、54 函数、3 个框架内 importer（`work-unit-core/-supersession/-timeout-preflight`）+ 测试（`tests/engine/work-unit-attempt-recovery`、`tests/integration/cli/rerun-added-topic-wave0`）。2026-08-31 复核修正：原记 9 importer 系 grep `work-unit-submit` 子串误匹配 `work-unit-submitted-ledger.mjs`（`-submit-integrity/-validation/-attempt-disposition/-inspect`、`helpers/gate-helpers-readers` 实际 import 的是 `-submitted-ledger`）。内部实际 ≥5 个子域：submit/dry-submit 主路径、late-submit、declaration-recovery、snapshot/rollback 持久化、rejection payload + repair contract 构造。
- `engine/helpers/canonical-topic-state.mjs`：2093 行、85 函数、9 个框架内 importer（gates ×3：`check-gate-seed-topics-ready/-hitl1-recorded/-rerun-ready`、`cli/operate-topic-state`、`cli/check-reentry`、`cli/operate-queue`、`engine/queue-manager-lifecycle`、`engine/helpers/queue-demand-admission`、`engine/helpers/return-map`）+ 大量测试 importer。2026-08-31 复核修正：原记 10+ 并误列 `handoff-helpers`/`post-final-recovery`（二者不 import 本模块），漏计 `helpers/return-map`。内部混着三类职责：schema-introspection/示例生成（`topicSchema*` 簇约 300+ 行）、projection slot 渲染、四操作（inspect/schema/apply/recover）逻辑。
- 有利条件：work-unit 家族已有成熟拆分先例（`-core/-lifecycle/-supersession/-validation/-inspect/-timeout-preflight/-submit-integrity/-attempt-disposition`），抽取模式不需发明。

### 方案

1. **测量步（无行为改动）**：对两文件做函数级聚类（调用关系 + 共享常量 + `@impl` 标签分组），产出边界建议报告，放本 plan 附录或 `openspec/changes/<change>/design.md`。
2. **抽取步（每项一个有界 change）**：候选边界（按测量步确认后定）：
   - `work-unit-submit.mjs` → `work-unit-submit-durability.mjs`（snapshot/restore/postcondition 簇）与 `work-unit-declaration-recovery.mjs`（declaration recovery 簇）；submit 主路径留在原文件。
   - `canonical-topic-state.mjs` → `topic-schema-projection.mjs`（`topicSchema*` introspection/示例簇，纯函数、叶子依赖，最安全首刀）。
3. **零 importer 变更纪律**：原模块 re-export 被抽取的 public API，现有 importer（`work-unit-submit` 3 个、`canonical-topic-state` 9 个）与测试的 import path 不动；`@impl` 注释随函数迁移。
4. **建议阈值**：抽取后单文件 < 800 行；行为不变以「测试零改动（或仅 import path 无关化）+ 全量 `npm test` 0 fail」证明，不新增行为测试。

### 验收

- 测量报告存在且被 change 引用；每刀抽取独立 change、独立全绿；两文件最终 < 800 行（或测量步给出有据的偏离说明）。

---

## 4. C4 — housekeeping：幽灵目录与 .gitignore 重复行

### 证据

- `tests/suspended/{unit,integration,e2e}`：git 零追踪（空目录 git 不可追踪）、磁盘 0 文件、`tests/README.md` 与测试分层表（根 README「Test Layering」四层）均无此层——纯本地残留，疑似某次测试运行的副产物。
- `.gitignore` L54/L55 重复 `dpt_disp_*/`。

### 处置

直接 `rmdir` 三个空目录并删除 `tests/suspended/` 本身；`.gitignore` 去重一行。无行为影响、无 spec 引用，**不需要 OpenSpec change**；在 plan 关闭时随本节记录完成。

---

## 5. C5 — root `dpt_rb_*` bundle：accepted，不动

### 理由（记录处置决定，防止未来重复提出）

- bundle 位于 repo root 是 documented convention（`DEEP_RESEARCH_HARNESS/README.md`「Run Bundle 外形」：production run bundle 位于 repo root）；迁移到子目录是一次 contract change，破坏既有 bundle 坐标约定，负收益。
- 已有双重防护：`.gitignore` L58 `dpt_rb_*/`（git 噪音为零）+ 根 README/AGENTS Do-Not-Read（agent 导航噪音已被指令面拦截）。
- 残余风险仅剩「人类视觉噪音」，接受。若未来 bundle 数量显著增长，重开本节的触发条件是：repo root 的 `dpt_rb_*` ≥ 10 个，或出现一次真实的 agent 误入 bundle 事故。

---

## 6. 非目标

- 不改任何 gate/queue/work-unit 的判定语义、枚举、CLI 动词与退出码契约。
- 不动 `openspec/changes/archive/`（2216 文件的历史体量是另一议题，本轮不做清理/压缩决策）。
- 不做全仓 prose 密度的无限清理：C2 只处理实测 ≥ 650 chars 的首批八段，其余段落待下一轮证据。
- 不引入新依赖、不改测试框架。

## 7. 关闭步骤

按 `_backlog/plans/README.md` 四步：C1/C2/C3 各 change governed-archive 且全量 `npm test` 0 fail 后，`git mv` 本文件至 `_done/_closed_plans/`，更新两侧 README。C4 在 propose C1 前直接完成并在此打勾：

- [x] C4：`tests/suspended/` 移除 + `.gitignore` 去重（2026-08-31）
- [x] C1：change propose → apply → archive（含 guard 红样本验证）（✓ 2026-08-31 `2026-08-31-pointerize-gate-chain-prose-add-guard`，finalizer 19/19 全绿）
- [ ] C2：change propose → apply → archive（八段结构化 + 行数预算验收）
- [ ] C3：测量报告 → 每刀独立 change → archive
- [ ] 全部完成后按流程关闭本 plan

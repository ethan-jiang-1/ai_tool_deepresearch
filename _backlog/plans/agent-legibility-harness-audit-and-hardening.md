# Plan · agent-legibility-harness-audit-and-hardening

> 状态: active | 创建: 2026-08-25
> 触发源: `/Users/bowhead/deepseek-harness/_faq_on_digested/07_borrowing-harness-idea/`（借鉴 DSH Harness 思路）
> 落地方式: **OpenSpec change**（`/opsx:propose` → explore → apply → archive）。本 plan 只定 change 清单与检查项，不直接改 target code。

---

## 0. 到底做几个 change（一眼看清）

**共 2 个 change：1 个立即立项（Change A），1 个触发式、审计后才可能立项（Change B，很可能永远不做）。** 因为每个 change 要过完整 OpenSpec 生命周期（16 个 governance checker + finalizer + requirement/semantic-closure + 两条收尾检查），代价高，所以**只把「已确认、必须做」的收敛成一个 change，其余全部降级为「先审计、确有缺口才单独立项」**。

| Change | 名字 | 触发时机 | 范围 | 状态 |
|---|---|---|---|---|
| **A** | `agent-legibility-static-hardening` | **立即立项** | ① 根入口链收敛为单一事实源 + drift checker + 负例控制；② 补「Where new behavior goes」归属表（L0–L3 参与阶梯）。两半都是静态层、都不动 engine 核心，合并成一个 change 一次过完生命周期。 | ready to propose |
| **B** | `executable-feedback-negative-control-hardening` | **触发式（暂不立项）** | 审计 16 个 `check-*.mjs` 的负例覆盖 + `.agents/.claude/.codex` 三个 skill 目录漂移。**只有审计出可机械证明的缺口才立项**；无缺口则 no-change 关闭，不产生 change。 | pending audit |

> 运行时查询（borrowing 06/10 的动态层）不立项，触发条件见 §3「Change B 之后」，满足才单独起 change。

---

## 1. 三问打分基线（为什么要做、关什么缺口）

| 三问 | 本仓库现状（证据） | 残余缺口 | 落点 |
|---|---|---|---|
| 1. 知识外置 | 强：Charter、CONTEXT、Control Map、Capability Catalog、req-registry、semantic-fact-families | `CLAUDE.md` 与 `AGENTS.md` 仅首行/第三行不同、其余 75 行逐字节相同（`diff` 实测），是「同一规则两处各写一版」漂移源 | **Change A·①** |
| 2. 正确路径 | 中强：「读」的路由已齐（Control Map / Catalog），「新 capability 边界」四条判据在 config.yaml | 缺显式「新行为→落到哪层+升级条件」归属表（grep 0 命中，待语义复核） | **Change A·②** |
| 3. 反馈延迟 | 强：`check-all.mjs` 聚合 16 checker + finalizer + verification-routing 四类 proof | 负例控制覆盖 + skill 目录漂移，**待审计（不预设）** | **Change B** |

---

## 2. Change A · agent-legibility-static-hardening（唯一立即立项）

**对应 borrowing**：02（一个事实一个 owner）+ 03（paved road 参与阶梯）+ 09（入口链 symlink）。解决「不糊涂 + 不乱发挥·改哪里」。

**为什么合并成一个 change**：①入口链收敛与②归属表都是「agent 可读性静态层」的同一件事的两半，都不新增 engine 行为、不新增依赖；拆成两个 change 要付两次生命周期固定开销，合并只付一次。

**范围 A·① 入口链单事实归属**：
- 收敛根入口文件为单一事实源。候选：`CLAUDE.md` → `ln -s AGENTS.md`（单一真实文件，host 名差异并入一行中性文案）；或两文件各自极短、共享 standing orders 收敛到唯一 home + digest 一致性 checker。explore 阶段定，必须满足「单一事实源 + 机器兜底」。
- 加 drift checker（新 `check-entry-chain.mjs` 或并入现有检查）+ 负例 fixture。

**范围 A·② Where new behavior goes 归属表**：
- 把本仓库真实 seams 映射成参与阶梯（准确措辞以 explore 对 `DEEP_RESEARCH_HARNESS/`、`openspec/specs/` 实际阅读为准，此处是骨架不是断言）：
  - **L0 组合/配置**：`openspec/config.yaml`、profile/参数、run-bundle 模板。
  - **L1 扩展点**：新增/改 capability 的 spec delta + gate/check/CLI 契约（`openspec/specs/<domain>/<capability>`）。
  - **L2 完整能力 seam**：需「可替换实现 + 稳定接口」时（Agent/Engine 边界、`research-access-adapter` 类）。
  - **L3 core loop**：改 `DEEP_RESEARCH_HARNESS/` 核心 Engine/Agent Flow 驱动，升级条件最严。
- 落点候选：`openspec/guidance/models/` 或 `docs/adr/`；接入 Control Map 一行；由 `check-guidance-pointer-targets.mjs` 兜底。

**check item（机器可验）**：
1. `ls -l CLAUDE.md` → `-> AGENTS.md`（或 checker 证明两文件不再有逐字节重复的 standing orders）。
2. `npm run governance:check` exit 0，无 FAIL；drift checker 已在 `check-all.mjs` 聚合范围内。
3. **负例控制**：故意让入口文件漂移 → checker 红 → 还原 → 绿。
4. `npm test` N/N 0 fail（纯入口/checker/guidance 改动不触 engine，应仍全绿）。
5. 归属表每条「升级条件」明确写清「何时允许 L0→L1→L2→L3」，能拦下「本可配置表达却改到 core」。
6. fresh agent 拿样本新行为（「新增一个 gate 检查」）先查归属表答「改哪里」而非翻代码猜——一次 Agent-flow dry-run（诚实标注含主观成分）。
7. Change 走完整生命周期，`node openspec/governance/finalize-change-archive.mjs --change agent-legibility-static-hardening` clean 归档。

---

## 3. Change B · executable-feedback-negative-control-hardening（触发式）

**对应 borrowing**：04（负例控制）+ 05（Skill ≠ gate、catalog 只给摘要）。解决「不乱发挥·做错被抓住」。

**触发条件（审计满足任一才立项）**：
1. `openspec/governance/` 下 16 个 `check-*.mjs` 里，有 checker **缺负例 fixture**（无法证明它会失败）；
2. `.agents/skills/`(49) vs `.claude/skills/`(44) vs `.codex/skills/`(37) 三目录存在**非 host 特定的重复漂移副本**（而非正当分工）。

**不触发则 no-change 关闭**：审计表 + 快照作为证据归档到 `_done/_closed_plans/`，不产生 change、不造假断言。

**若触发，Change B 的 check item**：
1. 对每个 `missing-negative-control` 补「引入回归→红→还原→绿」fixture，`npm test` 与 `npm run governance:check` 全绿。
2. skill 三目录收敛到单一事实源 + 引用（或证明为 host 特定分工），不默默漂移。
3. 完整生命周期 + finalizer clean 归档。

**Change B 之后（动态层，不立项）**：运行时查询/渐进披露注入层（borrowing 06/10），满足「长任务上下文爆炸有真实观察」或「需要 dump 最终生效配置而当前只能读源码猜」才单独起 change；且明确它是 bash-equivalent trust、不是安全沙箱。

---

## 4. 防反噬边界（borrowing 07 四边界 + 本仓库硬规则）

1. **可读 ≠ 简单**：不写大而全总览，不把复杂系统压成假象。
2. **Skill ≠ enforcement**：skill 是 guidance，可机械规则仍走 checker/finalizer/gate。
3. **清理 ≠ 回滚 / 查询 ≠ 沙箱**：动态层若做，是 trust 不是授权边界。
4. **本仓库硬规则**：apply 前 `DEEP_RESEARCH_HARNESS/` 只读；tests 只在 `tests/`；Node ≥20 纯 ESM、`node:test`、无 Python、无新依赖（仅 `zod`/`yaml`）；`finalize-change-archive.mjs` 唯一归档入口；每个 change tasks 含 `check-project-reqs.mjs` + `check-project-specs.mjs` 两条收尾；evidence honesty（无缺口就写 no-change）。

---

## 5. 全局 Definition of Done 与关闭条件

- **Change A 归档**，`finalize-change-archive.mjs` clean，无残留 pending task。
- **Change B 要么归档、要么 no-change 关闭**（审计无缺口），二者都算闭合。
- `npm run governance:check` exit 0、`npm test` N/N 0 fail 持续成立（含新增负例 fixture）。
- **回到 §1 重打分**：三档都比基线好，且无一条为形式造假断言。
- 关闭动作按 `_backlog/plans/README.md`：`git mv` 到 `_done/_closed_plans/` + 更新三处 README 计数。

---

## 6. 附录：证据来源

**borrowing 侧**（`/Users/bowhead/deepseek-harness/_faq_on_digested/07_borrowing-harness-idea/`）：`answer.md`、`02-legibility-ownership.md`、`03-paved-road-and-ladder.md`、`04-executable-feedback.md`、`05-skills-as-procedural-memory.md`、`06-runtime-inspection.md`、`07-transfer-playbook.md`、`08-step-by-step-guide.md`、`09-agents-entry-chain.md`、`10-progressive-disclosure-pipeline.md`。

**本仓库侧（本次实测）**：`diff CLAUDE.md AGENTS.md`（仅首行/第三行不同）→ Change A·①；`grep -rniE "where new behavior|participation ladder|归属表|参与阶梯|升级条件" openspec/ docs/ DEEP_RESEARCH_HARNESS/` 0 命中 → Change A·②（待语义复核）；`ls openspec/governance/` 16 个 `check-*.mjs` + `finalize-change-archive.mjs` + `check-all.mjs`；`ls .agents/skills .claude/skills .codex/skills` 49/44/37 → Change B；`package.json`（`npm test`/`governance:check`）；`openspec/README.md`、`openspec/specs/README.md`、`openspec/config.yaml`、`openspec/specs/verification/verification-routing/spec.md`。

# Evidence D — 对抗性压力测试（完整 S0–S7 + 判定）

> 来源：Plan agent 对两层设计的对抗性 stress-test（已核实 load-bearing 前提）。
> `03` 是它的可读摘要；本文件是更完整的原始记录。
>
> **后续事实修正**：本 stress-test 对 Tier-A/Tier-B validator 的否决仍成立，但它漏掉了 OpenSpec 1.7
> `operations.apply/archive.guidance` 这个 soft-feedback attach point，也未计入 `.claude` / `.codex` /
> `.agents` 多 adapter 漂移。故本文件的“只 ship 三 checker prompt gate”不再是最终推荐；见 `08`。

## 核实过、且推翻设计前提的三点

1. **`verification-plan.yaml` 不是 archive-gated**：archive skill（`archive.md`，全文核实）只跑 status、
   task 计数、delta-sync 再比对（条件性）。**从不**调 `check-verification-routing.mjs`。它只在
   `config.yaml:105`（注入 tasks.md 的文本 rule）和 archived `tasks.md`/`apply-evidence.md` 的自报 `[x]`
   里出现。Tier-B 地基“扩唯一 Zod-parse + archive-gated 文件”**半真**；Tier-A“泛化 proven pattern”
   在**形式** proven、**enforcement** 未 proven。两者带同一缺口。
2. **“两个源”不是两个，且在 Tier-A 假设的粒度上故意发散**：gate-def wave1 `target`
   `reference/*{topic}*.md`（粗，含 `00-shared`/`00-cross`）vs gate-helper `isWave1TopicReference`
   （`gate-helpers-checks.mjs:220`，negative lookahead 的**故意 narrowing**）。Tier-A check (b)“两源 agree”
   **第一天就在 wave1 上误报**。真实 fan-out **~7 站点**，对账 2/7 = 假信心。
3. **`rule.target` 是 bundle-asset inspection glob，不是 authority 声明**：它说“一个 check 读哪个文件”，
   不说“权威消费边界是什么”。BUG-178 缺陷在分类**逻辑**（regex），gate 没有对应细粒度可比——所以即便
   方向正确的 Tier-A（consumer set ⊇ gate set）也会 **pass 而抓不到** BUG-178。

## Blind-spot 全表（按严重度）

- **S0 — 执行前提为假（地基级）**：Tier-A 模板与 Tier-B 宿主工件今天都未被自动 enforce。
- **S1 — Tier-B 正面撞 GCO-007，且计划中的 GCO-007 编辑本身被宪法抵制**：`spec.md:91` 禁止
  “required field schema … deterministic validator”；Tier-B 字段正是它。`GCO-003` admission test
  （`spec.md:23-31`）说 mechanism-specific remedy “SHALL remain in its owning spec … SHALL NOT be
  elevated to the Charter”。作者用 prose+table 是**合规**，不是待“修复”的疏忽。（精化：见 `03` S1——
  不是字面不可能，而是在错误层打仗。）
- **S2 — “两源 agree”是错不变量且即时误报**：wave1 是 intentional refinement；inspect-wave* 是
  故意 warn 命名错文件的诊断 lint；Tier-A (a) 把它们误判为 over-consumer。`check-reentry.mjs` 同时是
  BUG-178 位点**和**合法宽扫描——目录/命名无法分离（它在 `cli/` 与 inspect lint 同级）。
- **S3 — Tier-A 认错 BUG-178 drift pair**：`check-reentry.mjs` 无自有正则，调共享
  `classifyReferenceAuthority`；真正风险是 shared-classifier-vs-gate-helper-regex + N 个 inline filter。
- **S4 — 唯一现存自动 gate 是条件性的**：`archive.md:99-103,116-126` 只在 sync 路径跑；"Archive without
  syncing" 跳过。镜像它继承洞。真 gate 须无条件 hook `mv`（step 5）。
- **S5 — Tier-B 可 game，检测 game 被禁**：“每 req→卡+consumer+stance”易填空话满足；查空话 = 语义质量
  判断（GCO-007:93 禁）；与 `req-registry.yaml` dual truth。
- **S6 — 价值/维护不匹配**：BUG-146/162 closed、BUG-178 converged；Tier-A 是误报于当前 repo 的
  regression guard；边际价值 < 维护负担。
- **S7 — SessionStart hook 错误挂载面**：无 `.claude/settings.json`、无先例；repo 多 harness
  （`AGENTS.md`↔`CLAUDE.md`）；Claude-only 不在 Codex 触发；误报 banner = alarm fatigue；checker 自身漂移。

## “Tier-B 每 req→卡”规则是否 sound？

**否。** 它不抓 bug 类——该类是**runtime 消费/分类发散与时间边界 provenance**，per-req 文书卡不能
deterministically 防止任一。它造两个 registry（卡 vs `req-registry.yaml`）、撞 GCO-007（S1）、可 game
成纯仪式（S5）。它唯一有价值的部分——prose reconciliation 矩阵——**已被** `config.yaml:183-191` +
GCO-007 要求、**已被**产出为 prose。把它结构化去掉合规 margin 却不增 detection 力。

## 推荐的 change 形状（redirect）

**Drop Tier-B。Tier-A 降为 Phase-2 maybe。Ship 高杠杆缺失件：让已建 governance check 在唯一不可逆
接缝自动发生。**

change（self-applying via OpenSpec），如 `enforce-governance-gates-at-archive`：

- **触碰 capability**：archive lifecycle 归属的 capability（须 `grep` 确认，**勿假设**——`05` TBD；
  强候选 `requirement-traceability` RET-006 本就写“hard gate for archive”）；`verification-routing`
  （加“`--mode assets` before archive `mv` 须 PASS”）；**不碰** `guidance-constitution`/GCO-007。
- **编辑文件**：`.claude/commands/opsx/archive.md`——在 step 5（`mv`）前插无条件 step，跑
  `check-project-reqs.mjs`、`check-project-specs.mjs`、`check-verification-routing.mjs --change <name> --mode assets`，
  非零拒 `mv`。镜像 skill 现有 deterministic-gate 惯用法，但**无条件**（非 `116-126` 的 sync-path-only）。
  + 两条 delta spec（archive-owning capability + verification-routing）。**无新 governance .mjs、无 schema、无手 map、无 controller。**
- **为何干净**：复用项目已建并信任的不变量；便携（node 脚本任意 harness 可调）；自应用（自己的归档是
  首个 gated 的）；修了问题陈述里的 root-cause #1。

## Phase-2（仅当 enforced check 漏掉真实复发）

窄 Tier-A：枚举**全部** ~7 分类站点；用**定向**不变量（consumer/shared-classifier accepted-set **⊇**
gate-helper accepted-set，**非**对称 agree）；按**目录约定**界定范围（`engine/helpers/`=authority、
`openspec/governance/`=checks、`DPT_FRAMEWORK/cli/inspect-*`=out-of-scope diagnostics by location）免手填
allowlist；在 change `design.md` 显式 carve out `check-reentry.mjs` 为已知 hard case，而非静默排除。

## 挂载建议（带权衡）

- **Archive pre-`mv` gate：YES。** 无条件、调三个现有 node checker。不可逆接缝；脚本便携；镜像 skill 内
  proven 模式。**改 archive skill 比 `.claude/settings.json` hook 更稳**——skill 是真实 archive 流（不论
  harness），且跳过需主动绕过而非 merely 忘记。残余：仍是 Markdown prompt 文本，非密码学强制——可接受
  （把门槛从“忘记”抬到“主动绕过”）。
- **`config.yaml` tasks 注入：保留**（现在是 early apply 反馈 + archive enforcement = 一致两层）。
- **SessionStart banner：NO**（S2/S3 当前 repo 误报；Claude-only 不可移植；无先例、易腐烂）。
  若要 ambient drift 可见，走单一 manual/CI governance 脚本，不走 session hook。

## 当时判定：NARROW + REDIRECT（不 go-as-is）

不按原样 ship 两层 validator 的结论不变。最终 redirect 已在 `08` 修正为：OpenSpec operation guidance
触发 targeted Agent review，finding 回到 tasks，`openspec/governance/` finalizer 复用三个 checker 并在
project preconditions 闭合后独占 native OpenSpec archive 调用。
这保留了本 stress-test 的窄化结论，同时补上它没有覆盖的 semantic feedback 和多 adapter 问题。

## 关键文件

- `.claude/commands/opsx/archive.md`（step 5 前插无条件 gate；`116-126` 是 anti-template）
- `openspec/governance/check-verification-routing.mjs`（现有 checker；也是未来 Tier-A 的参考形状）
- `openspec/governance/check-project-reqs.mjs`、`check-project-specs.mjs`（现有 checker）
- `openspec/specs/guidance-constitution/spec.md`（**勿改**；`:91` GCO-007、`:23-31` GCO-003 是 drop Tier-B 的理由）

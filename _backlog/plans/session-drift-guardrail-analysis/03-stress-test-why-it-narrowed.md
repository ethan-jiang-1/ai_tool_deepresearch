# 03 — 为什么两层设计被收窄（S0–S9 blind spots）

> 一个 Plan agent 对 `02` 的两层设计做了对抗性压力测试，并**核实了 load-bearing 前提**。
> 下面每条都带 file:line。结论：**NARROW + REDIRECT**，不要按原样落地两层设计。

## S0 — 执行前提是假的（地基级）

`verification-plan.yaml` **不是 archive-gated 的**。逐行核实 `archive.md`：它只跑 status 检查、
tasks 计数、delta-sync 再比对（且条件性，见 S4），**从不**调用 `check-verification-routing.mjs`。
Tier-B 的地基——“扩展那个唯一 Zod-parse + archive-gated 的 per-change 文件”——**半真**：它确实
Zod-parse，但它的 enforcement 跟我们要修的 manual-task-discipline **是同一个缺口**。Tier-A “泛化
已存在的 proven pattern（`check-verification-routing.mjs`）”——那个 pattern 在**形式**上 proven，
在 **enforcement** 上没 proven。两者都带着原罪。

## S1 — Tier B 直接撞 GCO-007，且“改 GCO-007 来合法化它”是在错误的层打仗（已核实并精化）

- `openspec/specs/guidance-constitution/spec.md:91`：语义精度反思“SHALL be short connected
  reasoning, **not a required field schema, four-part form, deterministic validator**”。
- Tier-B 的 `semantic_objects[]` 字段（`bounded_question`、`reader`、`distinctions_must_survive[]`）
  **正是**被禁止的那个 schema——它是 GCO-007 三要素被 reify 成列。
- 作者把 reconciliation 写成 **prose + markdown 表格**（如 `converge-artifact-contract-evaluators/design.md:47-64`）
  **不是疏忽，是 GCO-007 的合规要求**。
- 把它合法化需要 amend GCO-007。GCO-003 admission test（`spec.md:21-31`）抵制“把 naming-a-specific-
  mechanism 的规则抬到宪法层 solely because it addresses a current incident”（`:27-31` 的 scenario）。
  注：GCO-003 `:25` 明说它 **shall not block** an accepted capability change——所以**不是字面不可能**，
  但它是**在错误的层**打赢一场不该打的仗：语义精度的整套立意就是“不做成机器 verdict”（`:93`：
  “SHALL NOT … require Engine/CLI to judge research relevance, evidence choice, or synthesis quality”）。

**精化后的准确表述**：Tier-B 要么 (a) 住在 guideline 里 → 直接违反 `:91`；要么 (b) 住进某 capability
spec → 仍然违反 `:91` 的意图（它就是被禁的“required field schema for semantic precision”），并撞上
S5（gameable，查填充=被禁的语义判断）+ 与 `req-registry.yaml` dual truth。**两层都错。**

## S2 — “两个源必须 agree”是错的不变量，且第一天就误报

- gate-def wave1 `target`：`reference/*{topic}*.md`（**粗**，含 `00-shared`/`00-cross`）。
- gate-helper 分类器 `isWave1TopicReference`（`gate-helpers-checks.mjs:220`）：
  `/^reference\/(?!00-shared-)(?!00-cross-)[^/]+-[^/]+\.md$/`——一个**故意的 narrowing**（negative lookahead）。
- 所以 Tier-A 的 check (b)“prefix 正则与 declared target 一致”**在现有的 wave1 对上第一天就误报**。
  evaluator 是 intentional refinement，不是 duplicate。
- `inspect-wave0/1/2-output.mjs` 是**诊断 lint**，**故意**对命名错的文件 warn。Tier-A check (a)
  “没有 validator/CLI 扫一个无 rule 声明的 pattern”会把这些 lint **误判为 over-consumer**。

## S3 — Tier A 认错了 BUG-178 的 drift pair

`check-reentry.mjs` **没有自己的 wave-ref 正则**；它调用共享的 `classifyReferenceAuthority`
（`check-reentry.mjs:583` ← `gate-helpers-checks.mjs:602`）。真正的 drift 风险是 **shared-classifier
vs gate-helper-regex**，加上 N 个 inline inspect-CLI filter——**不是“两个正则源”**。真实的 fan-out
是 **~7 个站点**，不是 2 个：gate-def target globs、`isWave1/isWave2` regex、共享
`classifyReferenceAuthority`、`check-reentry.mjs:407` phase map、`inspect-wave0:83-85`、
`inspect-wave2:69-75`、wave1 inline filter。**只对账 2/7 给的是假信心。**

## S4 — 那唯一的自动 gate 是**条件性**的，镜像它会把洞继承下来

`archive.md:99-103,116-126`：spec 再比对**只在 "Sync now / Sync anyway" 路径**跑；"Archive without
syncing / Archive now" 跳过它（`:101`）。一个“镜像 `archive.md:116-126`”的新 gate 会**继承这个
条件性**。真正的 gate 必须**无条件** hook 到 step 5 的 `mv`。

## S5 — Tier B 可被 game，而检测 game 是被禁的

“每个 `> req:` 挂 ≥1 卡；每卡有 ≥1 consumer + stance + boundary”**很容易用空话填充满足**。检测空话
**就是** semantic-quality judgment——GCO-007:93 禁止。同时 req-coverage 机制已存在
（`check-project-reqs.mjs` + `req-registry.yaml`）；往 `verification-plan.yaml` 再塞一个 per-req
registry = **dual truth**。

## S6 — 价值/维护不匹配

BUG-146/162 已 closed（over-consumer 已删）；BUG-178 已 converge（复用共享分类器）。Tier-A 是一个
**regression guard**，且按 S2/S3 **在当前 repo 上误报**。边际价值 < 维护负担。

## S7 — SessionStart hook 是错误的挂载面

- 无 `.claude/settings.json`（只有 `settings.local.json` 权限 allowlist）；全 repo 无 SessionStart 先例。
- repo 同步 `AGENTS.md`↔`CLAUDE.md` → **多 harness**；Claude-only 的 settings hook 在 Codex/其它
  driver 下**不触发**。
- 误报倾向的 banner 每 session 弹 = **alarm fatigue**；而且“drift-checker 自己漂移”正是它声称要防的失败模式。

## S8 — 早期分析漏掉了 OpenSpec 1.7 的 operation-guidance attach point

当前 `openspec --version` 为 `1.7.0`。其 project config 原生支持
`operations.apply.guidance` / `operations.archive.guidance`；对应
`openspec instructions apply|archive --json` 会把它们作为 `operationGuidance` 返回。当前
`.claude/skills` 与 `.codex/skills` 的 1.7 apply/archive flow 已要求读取这些 guidance。

这不推翻 S0–S7 对 **validator** 的否决，但推翻了“软 loop 只能靠 SessionStart/手改 skill”这个隐含前提。
它提供一个更窄、更相关、跨 resumed apply 的 push seam。边界仍需诚实：operation guidance 是 prompt-level
advisory，不是可执行 hard gate。

## S9 — 直接编辑生成 adapter 会新增一条 drift fan-out

repo 同时存在 `.claude/commands`、`.claude/skills`、`.codex/prompts`、`.codex/skills`、
`.agents/skills` 多种 OpenSpec surface，且版本不完全一致；OpenSpec 官方 `openspec update` 会重新生成
agent instructions。把七问或 gate 逻辑分别粘进这些文件，正好重演“同一事实被多个 consumer 略有不同地解释”。

因此 final design 必须以 `openspec/config.yaml` dynamic guidance + repo-owned executable 为单一来源；
root instructions 和 adapter 都只能是薄路由，并对必要镜像做机械一致性检查。

## 判定：NARROW + REDIRECT（不是 go-as-is）

- **Drop Tier-B**（作为机器检查）。它有价值的形式——prose reconciliation 矩阵——**已经被要求、
  已经在被产出**（`config.yaml:183-191` + GCO-007），保持 prose 即可。
- **Tier-A 降为 conditional Phase-2**：只有当强制执行后的检查仍漏掉复发时才做，且必须**窄化**——
  枚举全部 ~7 站点、用**定向**不变量（consumer/shared-classifier accepted-set **⊇** gate-helper
  accepted-set，**非**对称“agree”）、按**目录约定**界定范围（`engine/helpers/`=authority、
  `openspec/governance/`=checks、`cli/inspect-*`=out-of-scope diagnostics）以避免手填 allowlist；
  把 `check-reentry.mjs` 作为已知 hard case 显式 carve out。
- **`04` 只作为必要硬地板，不再作为完整 redirect**：它没有覆盖 semantic feedback loop，也把
  generated adapter 当成了稳定 enforcement owner。最终 redirect 见 `08`：operation guidance 推送、
  findings 回到 tasks、risk-led review、`openspec/governance/` finalizer 闭合 project preconditions 后
  独占 native OpenSpec archive 调用。

# 02 — 探索过的两层自动机制（Tier A + Tier B）

> 这一节记录我们**曾经想做的**设计。它被 `03-stress-test-why-it-narrowed.md` 大幅收窄。
> 保留它是为了记录思考路线，也为了给 Phase-2 留下可复用的素材。
>
> **后续纠偏**：本设计还没有利用 OpenSpec 1.7 原生的
> `operations.apply/archive.guidance`，也没有识别 `.claude` / `.codex` / `.agents` 多份 adapter
> 会让“分别改 skill”本身成为漂移源。最终触发/闭合设计见 `08`；Tier A/Tier B 的否决仍有效。

## 目标

每一个 OpenSpec session 自动跑一个机制，**在漂移进入 main spec 之前**拦住它，且
**不靠人记得跑、不靠人手填一张会自己漂移的表**。

## Tier A — 派生的消费边界检查（零人工输入）

### 想法

把 gate-definition JSON 的 `rule.target` 当作 authority：一个 evaluator/CLI **只能消费**
某条 rule 声明为 target 的 artifact pattern。再拿 evaluator 内部的 filename-prefix 正则
（`DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs:220-225`）当**第二源**，断言二者一致。

### 为什么看起来可行（这是它“险”的地方）

- gate-def JSON 是**完整声明式**的 `{check → target}` 映射：
  - `gate-wave0-complete.definition.json`：`count_floor`/`pattern_match` → `reference/00-shared-*.md`，
    `schema_valid`/`count_floor` → `artifacts/wave0/{topic}/source.yaml`
  - `gate-wave1-complete.definition.json`：`reference_format`/`reference_source_url_parseable`/
    `reference_index_coverage`/`reference_ledger_coverage` → `reference/*{topic}*.md`
  - `gate-wave2-complete.definition.json`：`reference_index_coverage` 等 → `reference/00-cross-*.md`
- dispatch 是机械的：`wave-contract-evaluators.mjs` 的 `for (const rule of definition.rules)`
  → `expandRuleTargets(bundlePath, rule, layouts)`（`:273`）→ 按 `rule.check` 分发。pattern
  来自 JSON，不来自 validator 内部。
- 它**泛化一个已存在的 proven pattern**：`openspec/governance/verification-routing-contract.mjs`
  已经是一个消费边界检查（只是对象是 test asset 而非 research artifact）——`expectedBoundary(testClass,
  path)`（`:42-49`）+ `routesByPath` 的“conflicting route identity”检测（`:100-102`）。

### 预期抓到的 bug 类

BUG-146/162（一个 validator 在**没有任何 rule 声明**的 pattern 上跑——已被 archived fix 删除）、
BUG-178（reentry evaluator 用比主 Gate 更窄的 authority 分类）。

## Tier B — 声明的 per-change 语义对象卡

### 想法

给每个 change 的 `verification-plan.yaml`（唯一 Zod-parse 的 per-change 文件，schema 在
`verification-routing-contract.mjs:72-110`，有 `claims[]` 先例）加一个 `semantic_objects[]` 数组，
每项 = guideline 的三段式（`guidelines/evolution-abstraction-semantic-precision.md:80-84`：
问题/区别/停止点）+ writer/authority/time（current-projection 还是 submitted-snapshot）/
permitted-consumers/legal-mutator。

机器只校验**机械事实**：change 的 delta spec 里每个 `> req:` ID 都要挂到 ≥1 张卡；每张卡
要有 ≥1 consumer + reconciliation 立场 + provenance boundary。自由推理仍留在 `design.md` prose。

### 为什么看起来可行

- 真实作者**已经在手写**这些内容：active change `make-canonical-topic-state-projections-coherent`
  的 `design.md:63-106,144-156`；archived `converge-artifact-contract-evaluators` 的
  `design.md:47-64`（一张现成的 consumer-reconciliation 矩阵）。机制不是凭空加官僚，是固化已有实践。
- 维度 1–8（object identity、有界问题、必须保留的区别、authority 不可互换、停止点…）**早已是
  requirement**（GCO-005/006/007 + guideline）；只是**没 enforce**。

## 挂载点（三层）

1. 把 checker 焊进 archive skill 的 `mv` 之前（镜像 `archive.md:116-126` 的硬停模式）。
2. 加一个 `.claude/settings.json` SessionStart hook（**目前不存在**），每次 session 跑 Tier A
   的 repo-wide drift check，以非阻塞 banner 呈现。
3. 把对象卡要求写进 `config.yaml` rules，让它在 propose 时被注入 `tasks.md`。

## 看起来很完整——直到压力测试

这个两层设计在纸面上覆盖了诊断：Tier A（派生）堵“消费边界漂移”，Tier B（声明）堵“语义对象未被表示”，
三层挂载保证“每 session 自动”。下一节（`03`）逐条说明**为什么它落地即碎**。

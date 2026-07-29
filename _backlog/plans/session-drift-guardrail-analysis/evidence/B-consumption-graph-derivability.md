# Evidence B — artifact→evaluator 消费图的可派生性

> 来源：Explore agent 对 gate 定义/helper/CLI 的只读勘察（已核实）。

## TL;DR（拆分判定）

- **消费侧（artifact-pattern → evaluator）：HIGH 可派生，零人工**。gate-definition JSON 是完整的
  声明式 `{check → target}` 映射，解析 3 个 JSON 即得 Wave0/1/2 全图。
- **归属侧（artifact-pattern → owning-capability）：LOW 可派生**。specs 里**没有** `> owns:`/
  `> consumes:`/`> artifact:` 约定；归属只是 prose + 嵌在 evaluator 代码里的 filename-prefix 正则（**循环**）。
- 对本目标（抓“未声明的过宽扫描”）的实际可派生性 **MEDIUM-HIGH**；对“完整 capability 归属图”**LOW**，
  除非引入一张手填小表（而我们刻意不这么做）。

## 状态注记（诚实）

- **BUG-146/162 已 RESOLVED**：over-consumer `inspectReferenceReturnMaps()` / Wave1 artifact 扫描**已删除**
  （archived `converge-artifact-contract-evaluators`，v0.61）。唯一幸存导出 `inspectSeedTopicReturnMaps`
  （`return-map.mjs:1078`）只读 `seed_topics/*.md`（Seed-only）。
- **BUG-178 结构仍在，但分类器已 converge**：`check-reentry.mjs:583` 复用主 Gate 同一个
  `classifyReferenceAuthority`；但**遍历本身**（`check-reentry.mjs:577-579` 无差别扫所有 `reference/*.md`）仍在。

## 现有 governance 检查模式（可复用）

- `verification-routing-contract.mjs`：**已经是一个消费边界检查**（对象是 test asset）——
  `expectedBoundary(testClass, path)`（`:42-49`）、path 不匹配边界告警（`:93-95`）、`routesByPath` 检测
  “shared asset path has conflicting route identity”（`:100-102`）。`check-verification-routing.mjs:93-99`
  per-class `ownedRoot` + realpath escape 检查。**这是 Tier-A 要泛化的模板。**
- `check-project-reqs.mjs`：`walkInto()` 递归 `.md` walker（`:83-100`，区分 main spec vs active delta）、
  `stripFencedCodeBlocks()`（`:42-74`）、`> req:` header 约定（`:78`）与 declared-vs-referenced 区分（`:92`）。

## Layer 1 — gate-def JSON（声明式消费图，金矿）

`DPT_FRAMEWORK/schema/gate_definitions/`，每条 rule = `{check, target}`：

| Gate | `check`（消费方） | `target`（artifact pattern） | 锚点 |
|---|---|---|---|
| wave0-complete | `count_floor` / `pattern_match` | `reference/00-shared-*.md` | `:37-56` |
| wave0-complete | `schema_valid` / `count_floor` | `artifacts/wave0/{topic}/source.yaml` | `:66-83` |
| wave1-complete | `reference_format` / `reference_source_url_parseable` / `reference_index_coverage` / `reference_ledger_coverage` | `reference/*{topic}*.md` | `:65-92` |
| wave2-complete | `reference_index_coverage` 等 | `reference/00-cross-*.md` | `:118-161` |

注意：这里的 scoping 已经**窄且 prefix-correct**（`reference_format` 绑 `reference/*{topic}*.md`，**不是**
`reference/*.md`）。BUG-146 的缺陷是一个**忽略这点、扫全目录**的 consumer。

## Layer 2 — runtime dispatch（`wave-contract-evaluators.mjs`）

- `evaluateWave0Contract :481` / `Wave1 :617` / `Wave2 :805`，各 `for (const rule of definition.rules)`
  → `expandRuleTargets(bundlePath, rule, layouts)`（`:273`，`{topic}` 替换）→ 按 `rule.check` 分发。
- 文件列表由 rule 的 `target` glob 经 `matchingAlternativeFiles`（`:289-295`）派生——**pattern 来自 JSON，
  不来自 validator 内部**。接缝干净。

## Layer 3 — inspect CLIs（硬编码 consumer→pattern，印证 Layer 1）

- `inspect-wave0-output.mjs:96-105`：`checkReferenceFormatFiles` 只对 `00-shared-*.md`；`:127` Seed-only。
- `inspect-wave1-output.mjs:57-58`：全委托给 gate-def-driven `evaluateWave1Contract` + Seed-only。**无直接 reference 扫描**（post-fix）。
- `inspect-wave2-output.mjs:75-85`：只对 `00-cross-*.md`；`:87` Seed-only。
- `check-reentry.mjs:577-583`：**遍历全部 `reference/*.md`**（见下）。

## Layer 4 — return-map validator（现已正确收敛到 Seed）

`return-map.mjs:820` `evaluateSeedTopicProjectionReadiness` 只读 `seed_topics/${topic.slug}.md`
（`:857-858`），只对 Seed projection body/entry 跑 `validateReturnMapContent`（`:930,:946`）。

## ~7 个分类站点（Tier-A 若做必须全部覆盖）

gate-def `target` globs；`isWave1/isWave2` 正则（`gate-helpers-checks.mjs:220-225`）；共享
`classifyReferenceAuthority`（`gate-helpers-checks.mjs:602`，被 `check-reentry.mjs:583` 调用，**不是自派生正则**）；
`check-reentry.mjs:407` phase map；`inspect-wave0:83-85`、`inspect-wave2:69-75`、wave1 inline filter。

## BUG-178 残留风险（Tier-A 的真正目标）

`check-reentry.mjs:562-603` `auditLedgerCoverage`：`:577-579` 无差别 `readdirSync(refDir).filter(…md…)`
扫所有 reference 文件（wave0 shared / wave1 topic / wave2 cross 不分）；`:583` 对每个调
`classifyReferenceAuthority`。今天 benign（靠 filename-prefix 路由），但**一个 future wave4 前缀或重命名
文件会静默 fall through 到 `delegated_bypass` 失败分支**（`gate-helpers-checks.mjs:758`）。这种隐式
filename-prefix 路由——不是 declared boundary——才是 Tier-A 该盯的潜在风险。

## 归属为何 LOW 可派性

- specs 里**唯一**可解析约定是 `> req:` 和 `> inv:`（`grep '^> [a-z_]+:'` 全 specs 只命中这两个）。
  **没有** `> owns/consumes/artifact`。
- 归属仅以 **prose** 表达（`reference-flat-format/spec.md:11-19` 描述前缀；`research-return-map/spec.md:15-16`
  “Return-map checks SHALL consume only declared Seed projection/backfill slots”是 prose 不变量）。
- 唯一结构化归属谓词是**嵌在 evaluator 代码里的 filename-prefix 正则**（`gate-helpers-checks.mjs:220-225`），
  作为 ownership authority **循环**；且**没有** `isWave0SharedReference` 谓词（wave0 落到 `delegated_bypass` 分支 `:758`）。
- archived fix **刻意拒绝**建 registry（`design.md:61`：“not a new registry … a direct evaluator routing
  rule derived from already-declared producer contracts”）。

## 实用合成

可建一个**完全派生**的 consumer-side 边界检查（gate defs + CLI 源），**足以**抓 BUG-146/162/178 **类**
（未声明/比声明更宽的扫描）；**不能**派生出“每个 artifact pattern 归属哪个命名 capability”而不引入手填表。
务实做法：让 gate-def `target` 当 authority（任何无 declared `target` 支撑的消费即违规），把
`gate-helpers-checks.mjs:220-225` 的正则当**必须 agree 的第二源**——“两源 agree”可派生、避新手填表。
（但“agree”本身有 S2/S3 的问题——见 `03`。）

# Agent Output Linter — Implementation Plan

> 状态：设计阶段 | 创建：2026-07-13 | 更新：2026-07-14

---

## 一句话

**Agent 手写结构化内容，JS 做确定性检查；有错由 Agent 根据报告修复，检查通过后 phase node 才能退出。**

---

## 核心认识

### 1. 没有统一写法，目的达到就行

每个 MD controller 产出 YAML/JSON 的时机、上下文、约束完全不同：

| Controller | 产出时机 | 怎么让 Agent 自检 |
|---|---|---|
| Main Agent 跑 phase node | phase 工作完成后、gate 前 | `AUTONOMOUS_MODE_HEADER` 里加指令 + 传 `--schema` |
| Sub-agent 跑 work unit | 产出文件后、写 `work_done` 前 | `task.md` 的 checklist 里加指令，output_contract 指定 schema |
| phase-rerun 回填 | 写入 seed topic frontmatter 后 | phase 文档里加一步，传 `--schema seed_topic_md` |
| Terminal delivery | 最终交付前 | `TERMINAL_DELIVERY_HEADER` 里加指令 |
| 不确定该用哪个 schema | 任何时候 | 不传 `--schema`，只跑语法检查 |

**不建统一的调度层。** JS 侧只暴露一个幂等工具：`lintFile(filePath)` → `{ passed, issues }`。Agent 在哪个时刻调、读到的指引长什么样，是每个 controller 自己的事。如果你发现自己在设计一个"适用于所有 controller 的 lint 调度机制"——停下来，你走错了。

### 2. "通过"意味着两层：语法 + 当时需要的 schema

- **Tier 1 — 语法层**：YAML/JSON/JSONL 能 parse，frontmatter 的 `---` 闭合，fence block 完整。所有 controller 共用的基线——语法错误在任何阶段都是 error。**不需要传 schema，tool 默认就跑这一层。**
- **Tier 2 — Schema 层**：parse 出来的内容符合指定 schema。**Controller 知道上下文就传 schema，tool 多跑一层语义校验；不传就只跑语法。**
  - `--schema evidence_summary_md` → 检查 body 有没有 `## Key Findings`
  - `--schema reference_md` → 检查 metadata block 的 `source_url` 能不能 parse
  - 不传 `--schema` → 只跑 Tier 1，语法通过就算过

Schema 规则从 gate definition 的 `blocking_basis` 字段投影——不是 linter 自己发明一套。Controller 知道自己当下在哪个阶段、期望什么格式，**它把 schema 名传给 tool，tool 不用猜。**

---

## 为什么需要这个

**Agent 手写结构化内容不可靠。** YAML 缩进、JSON 逗号、frontmatter 闭合——这些不是 Agent 的强项，它经常写错。而 MD controller（phase node、task.md、rerun 流程）是**离产出最近的地方**——Agent 刚写完文件，文件还在手边，controller 还没交出控制权。这个时候跑一遍检查，代价最小、修得最快。

如果不在这个时机检查，格式问题要等到 gate 阶段才发现——距离 Agent 写出文件已经过了很久，Agent 只能靠试错修复，反馈循环太长。

DPT 框架中，Agent 产出大量含结构化数据的 MD/YAML/JSON 文件：

- **YAML frontmatter**（`---` 分隔）：`rb_plan.md`、seed topic `.md`、evidence-summary 等
- **metadata block**（bullet `- key: value`，在第一个 `## ` 之前）：reference MD 文件
- **fence block**（` ```json` / ` ```yaml` / ` ```jsonl`）：task card、source claim、depth review、finding index

这些结构化内容目前**只在 gate 阶段才被检查**——距离 Agent 写出文件已经过了很久。更根本的问题：**Agent 写文件时没有格式 contract 可以参考，写完之后也没有 linter 可以自查。** Engine 有这些静态知识（gate definition 里定义了格式期望），但没有把它们投影到 Agent 写文件的那一刻。

### 为什么 Main Agent 没问题，Sub-agent 有问题

Main Agent 的输出走 `validate-bundle.mjs`，有明确的 Zod schema + 文件→schema 映射表。但 sub-agent 的输出文件（`artifacts/` 下的 MD/YAML）**没有一个对应的文件→schema 映射**。Sub-agent 收到的 `task.md` 告诉它"写 evidence-summary.md"，但没说这个文件的 frontmatter 该怎么写、body 该有哪些 section、字段类型是什么。

### 已知问题（来自 memory/bug 记录）

1. Sub-agent 产出 **YAML frontmatter 格式**的 reference 文件，但 gate 期望 **metadata block 格式**（bullet `- key: value`），两种格式互相不可见
2. `log-event.mjs` 不等于 `runtime-receipt.jsonl`——sub-agent 调了前者但没写后者，submit 被拒
3. Receipt 的 `detail` 字段必须是 JSON object 不能是 string，否则 Zod 校验失败
4. 输出文件写到 `_work_units/<id>/` 而不是 `artifacts/wave0/<topic>/`，gate 找不到

---

## DO——只做这些

1. **只检查 Agent 手写的结构化内容**：YAML frontmatter、metadata block、fence block、纯 `.yaml`/`.json`/`.jsonl` 文件。Markdown 只是容器——不检查散文、标题层级、排版。
2. **JS 只负责确定性检测**：返回 `{ passed, issues: [{ file, line, type, message, fix_hint }] }`，不自动修文件。
3. **Agent 负责修复**：读 lint 报告 → 根据 `fix_hint` 修正 → 重跑 linter。"检查→修复→再检查"是 Agent 行为，不是 JS 控制流。
4. **每个 controller 用自己的方式在退出前复验**：不建统一调度层。JS 只保证 `lintFile()` 是随时可调的幂等工具。
5. **只区分两个阶段**：wave0 允许 L3 placeholder（warning），wave1+ 不允许（error）。语法错误在任何阶段都是 error。
6. **只接到确实有 Agent 手写结构化内容的 node**：`seed-topics`、`wave0`、`wave1`、`wave2`、Sub-agent 各 role。`hitl1`、`hitl2`、`phase-final` 不需要强制 lint。

---

## DON'T——实现时不要这样做

1. **不要让 JS 自动修文件**——不补字段、不改缩进、不替换 placeholder。`fix_hint` 给建议，Agent 做修改。
2. **不要在 JS 里实现修复循环**——不写 `for`/`while`/重试器。JS 只暴露 `lintFile(filePath)` → `{ passed, issues }`。
3. **不要 lint Markdown 样式**——不检查标题层级、空行、措辞。只检查里面包裹的 YAML/JSON 块。
4. **不要做通用 linter 平台**——不设计自动发现、插件机制、扩展层。Format contract registry 只覆盖 DPT 确实有的文件类型。
5. **不要另造一套校验规则**——Zod schema 从 gate definition 的 `blocking_basis` 字段投影。parser、gate validator、linter 不能各有一套定义。
6. **不要把 warning 当 error**——特别是 wave0 合法的 `__BACKFILL_*__` placeholder。
7. **不要绕过已有的 validate 工具**：

| 工具 | 运行时机 | 检查对象 | 谁跑 |
|---|---|---|---|
| `validate-bundle.mjs` | Gate 的一部分 | bundle control files | Gate CLI |
| `validate-phase-templates.mjs` | CI / repo hygiene | phase .md 源文件 | 开发者 / CI |
| **output linter** | **Agent 出口前（pre-gate）** | **bundle 内 Agent 产出的 MD/YAML/JSON** | **Main Agent / Sub-agent** |

---

## 根本不做

- `_generated/` 下的 JSON、图片和生成产物
- `_state/` 下的状态文件（走 `validate-bundle.mjs`）
- `rb_templates/` 中的框架模板、`workflows/` 下的 phase node 声明（走 `validate-phase-templates.mjs`）
- pure evidence produces 或任何没有文件的 produces
- 任意 JSON/YAML/Markdown 文件的通用 `lintFile`、统一验收机制、通用路由系统
- strict/tolerant 通用模式体系、自动修复/重试/PDCA/失败升级流程
- 为此单独扩张 CLI surface、命令体系或协议

这些不是"以后顺便做"的候选项。若将来出现独立需求，必须重新提出并证明必要性，不能顺势扩张。

---

## 设计

### 两层校验模型

```
文件 → [Tier 1: 语法校验] → [Tier 2: 格式 Contract 校验] → { passed, issues }
```

**Tier 1 — 语法校验（便宜，总是执行）：**
- YAML：`yaml.parse()` 尝试解析，捕获 parse error
- JSON：`JSON.parse()`
- JSONL：逐行 `JSON.parse()`
- MD：提取 YAML frontmatter（`/^---\n([\s\S]*?)\n---/`）并 parse；同时解析 metadata block 格式（bullet `- key: value`）
- 语法错误直接报 `file + line + message`

**Tier 2 — 格式 Contract 校验（有 contract 时才执行）：**
- 根据文件路径 pattern 或 `--role` 参数查找对应的 Zod schema
- 对解析后的内容做 `safeParse()`
- 返回缺失字段、类型错误、section 缺失等诊断

### Format Contract Registry

做两件事：Path → Format（判断文件类型），Format → Schema（找到 Zod schema 做校验）。

```
PATH_FORMAT_MAP = [
  { pattern: /artifacts\/wave0\/[^/]+\/source\.yaml$/,  format: 'source_yaml_array' },
  { pattern: /artifacts\/wave1\/[^/]+\/evidence-summary\.md$/, format: 'evidence_summary_md' },
  { pattern: /artifacts\/wave1\/[^/]+\/question-list\.md$/, format: 'question_list_md' },
  { pattern: /artifacts\/wave1\/[^/]+\/depth-review\.yaml$/, format: 'depth_review_yaml' },
  { pattern: /artifacts\/wave2\/finding-index\.yaml$/, format: 'finding_index_yaml' },
  { pattern: /artifacts\/wave2\/synthesis\.md$/,  format: 'synthesis_md' },
  { pattern: /artifacts\/wave2\/cross-topic-ledger\.md$/, format: 'cross_topic_ledger_md' },
  { pattern: /reference\/[^/]+\.md$/,              format: 'reference_md' },
  { pattern: /_cache\/.+\/websearch\.json$/,       format: 'websearch_json' },
  { pattern: /_cache\/.+\/meta\.json$/,            format: 'cache_meta_json' },
  { pattern: /_cache\/.+\/page\.md$/,              format: 'cache_page_md' },
  { pattern: /seed_topics\/[^/]+\.md$/,            format: 'seed_topic_md' },
  { pattern: /result\.json$/,                      format: 'work_unit_result_json' },
  { pattern: /runtime-receipt\.jsonl$/,            format: 'runtime_receipt_jsonl' },
];
```

**格式检测优先级：** 显式 `--schema` 参数（直接用，不猜）→ 文件路径匹配 PATH_FORMAT_MAP → 文件扩展名（只做 Tier 1）→ 自动检测格式。

### CLI 接口

```
node DPT_FRAMEWORK/cli/lint-agent-output.mjs <file> [options]

Options:
  --bundle <path>        bundle 根目录
  --schema <name>        指定 schema（如 evidence_summary_md, reference_md, seed_topic_md）
                         传了就做 Tier 1 + Tier 2，不传只做 Tier 1 语法检查
  --json                 结构化 JSON 输出
  --syntax-only          只做语法校验，跳过 schema 校验（即使用户传了 --schema 也跳过）

Exit codes: 0 = pass, 1 = fail, 2 = config error
```

**结构化输出（`--json`）：**
```json
{
  "check": { "passed": true, "file": "artifacts/wave1/ai-governance/evidence-summary.md", "format": "evidence_summary_md", "tier": "schema" },
  "syntax": { "passed": true, "parser": "yaml_frontmatter", "errors": [] },
  "schema": { "passed": false, "schema": "EvidenceSummaryFormatSchema", "errors": [{"path": "frontmatter.topic_slug", "message": "Required"}] },
  "inspect": ["frontmatter.topic_slug is required but missing"],
  "advice": ["Add topic_slug to the YAML frontmatter between --- fences"]
}
```

### Sub-Agent 集成

三个层面配合：

**层面 1 — Work-Unit Output Contract 扩展**：在 `DEFAULT_KIND_CONTRACTS` 的 `output_contract.output_files` 中，为每个 role 增加可选的 `format_contract`（`schema_ref` + `frontmatter_required` + `body_sections_required`）。

**层面 2 — task.md 模板增强**：在 `taskMarkdown()` 的 "Write-Before-Return Checklist" 中增加 lint 自检步骤：
```markdown
## Before Declaring Done
Run the output linter on every declared output file before writing result.json:
  node DPT_FRAMEWORK/cli/lint-agent-output.mjs <bundle-relative-path> --bundle <bundle_dir> --json
Fix any reported errors. Re-run until all files pass.
```

**层面 3 — dry-submit 集成**：在 `collectDrySubmitPlan()` 中对每个 `output_files[]` 条目增加格式校验步骤。格式错误归类为 `phase: 'output_format'`, `repair_target: 'output_content'` 的 advisory violation——不会让原本能过的 submit 突然失败，但给 Agent 明确的修复导航。

### Agent 自修复循环（预期行为）

```
1. Agent 完成工作，产出文件
2. Agent 读 controller 指引 → "退出前跑 linter"
3. Agent 运行 lint-agent-output.mjs --json
4. exit 0 → 干净，继续
5. exit 1 → 读 issues[] → 定位 file:line → 读 fix_hint → Edit 修复 → 重跑
6. 循环直到 exit 0
```

Agent 不需要理解 YAML spec——`fix_hint` 给出了具体的修复建议。Engine 不需要知道这个循环——Agent 自主完成，不产生新的 state 或 receipt。

---

## Hint-Quality 测试覆盖（保证 lint 工具本身不被写坏）

上面设计的是"Agent 出口前有工具可以自检"。但还需要确保**这个工具本身的输出质量**——如果 linter 的 `issues[]` 格式写坏了，Agent 拿到的是垃圾导航，修都不知道怎么修。

### 共享断言：`tests/helpers/assert-hint-quality.mjs`

一个可复用断言函数，任何 gate/inspect CLI 测试都可以调用：

```js
export function assertHintQuality(jsonOutput, expectations) {
  // 1. 失败时 hints[] 必须存在且为非空数组
  // 2. 每个 hint 必须有 rule_id, missing_fact, write_to, rerun（全部非空字符串）
  // 3. rerun 包含可执行命令（node ...）
  // 4. write_to 指向合法 surface 或 Engine operation
  // 5. 可选 expectations 精确断言具体值
}
```

### 覆盖审计：`DPT_FRAMEWORK/cli/audit-gate-test-coverage.mjs`

确定性静态分析脚本，CI 或 apply 前运行：
1. 扫描 `DPT_FRAMEWORK/cli/gates/` → 活跃 gate CLI 列表
2. 扫描 `tests/` 下所有 `.test.mjs` → grep `assertHintQuality` 调用
3. 交叉比对 → 报告未覆盖的 gate/rule → exit 1

第一阶段只做 gate CLI → 测试文件的存在性映射。第二阶段解析 gate definition JSON 的 blocking rule 列表做逐 rule 覆盖比对。

### OpenSpec 流程约束

当 change 包含新增 gate CLI 或修改 gate definition JSON 的 blocking rule 时，task list 必须包含 "Write hint-quality negative tests" task。`audit-gate-test-coverage.mjs` 不通过则阻塞 apply。

---

## 模块划分

```
DPT_FRAMEWORK/
  schema/contracts/
    output-format.mjs              # 新增：所有输出文件格式的 Zod schema
  engine/
    lint-agent-output.mjs          # 新增：核心 lint 逻辑
  cli/
    lint-agent-output.mjs          # 新增：CLI wrapper
    audit-gate-test-coverage.mjs   # 新增：测试覆盖审计脚本
  engine/
    work-unit-constants.mjs        # 修改：DEFAULT_KIND_CONTRACTS 增加 format_contracts
    work-unit-envelope.mjs         # 修改：task.md 模板增加 lint 自检段落
    work-unit-submit.mjs           # 修改：dry-submit 增加 output format validation
    workflow-chain.mjs             # 修改：AUTONOMOUS_MODE_HEADER 追加 pre-gate lint 指令

tests/
  helpers/
    assert-hint-quality.mjs        # 新增：共享 hint-quality 断言
  unit/
    lint-agent-output.test.mjs     # 新增：格式检测、语法校验、schema 校验
  integration/
    cli/
      lint-agent-output.test.mjs   # 新增：CLI 集成测试
```

### 复用清单

| 资源 | 位置 | 用法 |
|------|------|------|
| `parseYaml` | `yaml` 包 | YAML 语法校验 |
| `parseMdFrontmatter()` | `engine/helpers/gate-helpers-readers.mjs` | 提取 MD frontmatter |
| `ReferenceMetadataSchema` | `schema/contracts/reference.mjs` | source.yaml 校验 |
| `CacheLeafMetaSchema` | `engine/helpers/cache-leaf-contract.mjs` | meta.json 校验 |
| `WorkUnitResultSchema` | `schema/contracts/work-unit.mjs` | result.json 校验 |
| `WorkUnitRuntimeReceiptEventSchema` | `schema/contracts/work-unit.mjs` | receipt JSONL 逐行校验 |
| `isSafeBundleRelative()` | `engine/work-unit-utils.mjs` | 路径安全检查 |
| `DEFAULT_KIND_CONTRACTS` | `engine/work-unit-constants.mjs` | kind→output_contract 映射 |
| `reasonCodeForSubmit()` | `engine/work-unit-submit.mjs` | violation code 分类模式 |
| Check/Inspect/Advice 模式 | gate CLIs, inspect-wave CLIs | 输出结构约定 |
| Exit code 约定 (0/1/2) | `COMMANDS.md` | CLI 退出码 |

---

## 完成标准

1. **Agent 写坏 YAML frontmatter 或 metadata block 时**，JS 能准确报告（file + line + type + fix_hint），Agent 修复后重检通过才进 gate。
2. **wave0 的 `__BACKFILL_*__` placeholder 只产生 warning**；同一 placeholder 到 wave1+ 产生 error 并阻止退出。
3. **Agent 修正内容后重新检查通过**，phase node 可以正常进入 gate。
4. **每个 gate CLI 都有 hint-quality 测试覆盖**——`audit-gate-test-coverage.mjs` 审计不通过则阻塞 apply。

除此之外，没有本计划需要交付的东西。

---

## 激活条件

当前 `repair-rerun-added-topic-bootstrap` change 仍在 propose/explore 阶段，`DPT_FRAMEWORK/` 处于 OpenSpec 写保护。本计划涉及对 `DPT_FRAMEWORK/engine/`、`DPT_FRAMEWORK/cli/` 和 `DPT_FRAMEWORK/schema/` 的修改，必须在 `/opsx:apply` 阶段执行。

**全部满足才启动实现：**
1. `repair-rerun-added-topic-bootstrap` 进入 apply 阶段或已 archive
2. 出现至少一个真实、重复发生的 Agent 结构化输出格式问题（不只是"可能会发生"）
3. 不是因为"本文已经存在"就顺势实施

---

## Scope Exploration Addendum — 2026-07-15

### Summary

本次扫描确认：问题确实集中在 Agent 手写 structured data，主要 surface 是 runtime bundle 里的 `seed_topics/`、`reference/`、`artifacts/wave*/`、`_work_units/*/result.json`、`runtime-receipt.jsonl`、`_cache/*/meta.json` / `websearch.json`。不应扩大成全 repo Markdown linter，也不应新建统一调度层。

真实 bundle 规模显示 scope 不小：当前 top-level `dpt_rb_*` 中可见 `seed_topic` 44 个、`wave0 source.yaml` 44 个、`wave1 evidence-summary/question-list` 各 39 个、`depth-review.yaml` 31 个、`reference/*.md` 403 个、`_work_units/*/task.md` 112 个、`result.json` 107 个、`runtime-receipt.jsonl` 112 个、cache JSON/MD 数百个。另发现一个嵌套 bundle 路径 `dpt_rb_martin-fowler-ai-sdlc-retreats/dpt_rb_martin-fowler-ai-sdlc-retreats`，这是 runtime root 定位类问题，不应由 output linter 修。

### Easy Scope

- Syntax-only Tier 1：JSON、JSONL、YAML、MD frontmatter、fenced `json/yaml/jsonl` block。现有 `yaml`、`parseMdFrontmatter()`、`readYamlArraySafe()`、`JSON.parse()` 足够。
- Existing schema reuse：`ReferenceMetadataArraySchema` for `artifacts/wave0/*/source.yaml`、`WorkUnitResultSchema` for result、`WorkUnitRuntimeReceiptEventSchema` for receipt JSONL、`CacheLeafMetaSchema` for `_cache/*/meta.json`。
- Reference Markdown format precheck：已有 `parseReferenceMetadata()` / `checkReferenceFormatFiles()` 可复用，覆盖 YAML frontmatter forbidden、metadata block required fields、semantic sections。
- Work-unit task integration：只需在 generated `task.md` 的 checklist 增加“写完 result/output/cache 后跑 lint”的 Agent-facing 指令；`task.md` 本身是 Engine 生成模板，不是 lint target。

### Medium Scope

- `seed_topics/{slug}.md`：frontmatter 语法容易，schema 层需决定是否只检查 gate 当前字段 `id/slug/title/topic_uid/...`，还是检查计划里更丰富的 enrichment fields。建议先只检查 accepted/gate-owned fields，enrichment 缺口作为 advice。
- `evidence-summary.md` / `question-list.md`：现有 wave evaluator 已有宽容 section 检查和 URL 检查，可复用为 schema-tier；不要重新写一套 stricter Markdown style rule。
- `depth-review.yaml` 与 `finding-index.yaml`：已有 `wave-depth-contracts.mjs` 做深层 contract 检查，但它绑定 submitted ledger/profile/runtime。linter 可做 parse + direct field shape；完整 provenance 仍交给 inspect/gate。
- `reference/_INDEX.md`：已有 `validateIndexMD()`，可作为 advisory 或 syntax/schema check；不要让 index presentation 替代 reference backing authority。
- Cache leaf：`websearch.json` / `meta.json` 可做 parse/schema；`page.md` 多数是 fetched content，不应按 metadata block 误判，只检查存在性/非空应留给 submit/cache checker。

### Hard / Risky Scope

- “从 gate definition 的 `blocking_basis` 自动投影 schema”目前不是直接可做：大量规则在 imperative evaluator/helper 中，不是 declarative schema registry。若强行做，会复制 gate 逻辑并违反 simple reliable control。
- `cross-topic-ledger.md` 是动态 Markdown ledger，只有 section-level deterministic checks 适合 linter；finding/gap/provenance 的完整一致性必须留给 Wave2 inspect/gate。
- Return-map/backfill 内容是 Agent-readable navigation layer，不是 authority。可以检查 placeholder 是否残留、refs 是否明显是 glob/count summary，但不要把它做成新的 provenance validator。
- 自动发现所有 controller 并统一调度属于明确不建议方向。正确做法是：提供幂等 lint tool，各 phase/work-unit 在自己出口前调用。

### Out Of Scope / Do Not Lint

- `rb_plan.md`、`rb_profile.yaml`、`rb_queue.json`、`rb_status.json`、`rb_output_declarations.jsonl`：这是 Engine/runtime authority，已有 validate/gate/submit owner。
- `DPT_FRAMEWORK/workflows/**/*.md` frontmatter：这是 framework template hygiene，走 `validate-phase-templates.mjs` / workflow package validation。
- OpenSpec specs、archived changes、backlog bug docs、experiment playbook prose examples：不是 runtime Agent output。
- `_cache/agentic-queue/current-task.md`、generated `_work_units/*/task.md`：projection/generated guidance，不是 Agent-authored final output。
- Raw fetched `page.md` content：不是 structured data；不要按 reference metadata block 误判。

### Recommended Implementation Shape

- Build `lint-agent-output` as a thin adapter over existing parsers/evaluators, not a new rule universe.
- Default behavior: Tier 1 syntax only. `--schema` opt-in enables known format contracts.
- Path inference may exist as convenience, but explicit `--schema` wins.
- Failures return helper-oriented hints: `missing_fact`, `write_to`, `rerun`, plus file/line/type where available.
- First implementation should cover: `source.yaml`, `reference/*.md`, work-unit `result.json`, `runtime-receipt.jsonl`, cache `meta.json/websearch.json`, `seed_topics/*.md`, Wave1 pair artifacts, `depth-review.yaml`, Wave2 `finding-index.yaml`.
- Keep `cross-topic-ledger.md`, `synthesis.md`, return-map/backfill checks narrow and advisory unless existing inspect/gate already treats the same direct fact as blocking.

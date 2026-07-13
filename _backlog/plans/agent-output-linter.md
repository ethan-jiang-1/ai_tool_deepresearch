# Agent Output Linter — Implementation Plan

> 状态: 计划阶段 | 创建: 2026-07-13 | 目标: 为 Agent（尤其是 Sub-agent）产出的 MD/YAML/JSON 文件提供写时格式校验

---

## Context

### 问题本质

Agent（LLM）产出的 MD 文件中经常包含 YAML frontmatter 或 JSON 块（"note"），这些内容的格式正确性目前**只在 gate 阶段才被检查**——距离 sub-agent 写出文件已经过了很长时间。更根本的问题是：**sub-agent 写文件时没有格式 contract 可以参考，写完之后也没有 linter 可以自查**。

### 当前状态

**Main Agent 输出（已有较好覆盖）：**
- `validate-bundle.mjs` 对 6 个控制文件做 Zod schema 校验（`rb_status.json`, `rb_queue.json`, `rb_profile.yaml`, `rb_plan.md`, `rb_trace.jsonl`, `rb_output_declarations.jsonl`）
- `rb_profile.yaml` 用 `yaml` 包的 `parse()` 解析后走 `ProfileSchema`
- `rb_plan.md` 用 `parseMdFrontmatter()` 提取 YAML frontmatter 后走 `PlanSchema`

**Sub-Agent 输出（格式校验空白）：**
- `operate-work-unit submit` 的 `validateOutputFiles()` 只检查：文件存在、路径安全、role 合法——**不检查文件内容格式**
- `result.schema.json` 约束了 `result.json` 的 wrapper 结构，但不约束 `output_files[]` 里那些实际内容文件的格式
- Sub-agent 写出 `evidence-summary.md`、`question-list.md`、`source.yaml`、reference MD 文件时，**没有任何写时格式校验**
- 格式问题要等到 gate 阶段才发现，而 gate 的反馈是"全有或全无"的——Agent 只能靠试错修复

**已知的格式不一致问题（来自 memory/bug 记录）：**
1. Sub-agent 产出 **YAML frontmatter 格式**的 reference 文件，但 gate 期望 **metadata block 格式**（bullet `- key: value`），两种格式互相不可见（`rerun-incremental-topic-semantic-gap`）
2. `log-event.mjs` 不等于 `runtime-receipt.jsonl`——sub-agent 调了前者但没写后者，submit 被拒（`dpt-wave0-subagent-execution-gotchas` #2）
3. Receipt 的 `detail` 字段必须是 JSON object 不能是 string，否则 Zod 校验失败（同上 #6）
4. 输出文件写到 `_work_units/<id>/` 而不是 `artifacts/wave0/<topic>/`，gate 找不到（同上 #4）

### 为什么 Main Agent 没问题，Sub-agent 有问题

Main Agent 的输出走 `validate-bundle.mjs`，有明确的 Zod schema + 文件→schema 映射表。但 sub-agent 的输出文件（`artifacts/` 下的 MD/YAML）**没有一个对应的文件→schema 映射**。Sub-agent 收到的 `task.md` 告诉它"写 evidence-summary.md"，但没说这个文件的前言该怎么写、body 该有哪些 section、字段类型是什么。**Engine 有这些静态知识（gate definition 里定义了格式期望），但没有把它们投影到 sub-agent 写文件的那一刻。**

### 目标

1. 定义一个 **format contract registry**——把已知文件类型映射到 Zod schema
2. 构建一个 **linter CLI**（`lint-agent-output.mjs`）——对任意文件做语法+格式校验，产出 Check/Inspect/Advice
3. 让 **sub-agent 可以在写完后自查**——在写文件→声明完成之间插入 lint 步骤
4. Phase Agent 也可以在 submit 前对 sub-agent 的输出文件跑 lint

---

## 设计

### 两层校验模型

```
文件 → [Tier 1: 语法校验] → [Tier 2: 格式 Contract 校验] → Check/Inspect/Advice
```

**Tier 1 — 语法校验（便宜，总是执行）：**
- YAML 文件（`.yaml`, `.yml`）：用 `yaml` 包的 `parse()` 尝试解析，捕获 parse error
- JSON 文件（`.json`）：用 `JSON.parse()` 尝试解析
- JSONL 文件（`.jsonl`）：逐行 `JSON.parse()`
- MD 文件（`.md`）：尝试提取 YAML frontmatter（`/^---\n([\s\S]*?)\n---/`）并 parse；同时尝试解析 metadata block 格式（bullet `- key: value`）
- 语法错误直接报 Check failed + 具体行号/列号

**Tier 2 — 格式 Contract 校验（有 contract 时才执行）：**
- 根据文件路径 pattern 或显式 `--role` 参数，查找对应的 Zod schema
- 对解析后的内容做 `safeParse()`
- 返回缺失字段、类型错误、section 缺失等诊断

### Contract Registry 设计

Contract registry 做两件事：
1. **Path → Format**：根据文件路径判断这是什么类型的文件
2. **Format → Schema**：找到对应的 Zod schema 做校验

```javascript
// 概念结构（实现时用 Map + 函数）
const PATH_FORMAT_MAP = [
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

**Format → Schema 映射（复用已有 + 新增）：**

| Format | Schema | 来源 |
|--------|--------|------|
| `source_yaml_array` | `ReferenceMetadataArraySchema` | 已有 `contracts/reference.mjs` |
| `evidence_summary_md` | `EvidenceSummaryFormatSchema` | **新增** |
| `question_list_md` | `QuestionListFormatSchema` | **新增** |
| `depth_review_yaml` | `DepthReviewContractSchema` | **新增**（从 `wave-depth-contracts.mjs` 提取） |
| `finding_index_yaml` | `FindingIndexContractSchema` | **新增**（从 `wave-depth-contracts.mjs` 提取） |
| `reference_md` | `ReferenceMdFormatSchema` | **新增** |
| `websearch_json` | `WebSearchFormatSchema` | **新增** |
| `cache_meta_json` | `CacheLeafMetaSchema` | 已有 `cache-leaf-contract.mjs` |
| `cache_page_md` | `CachePageFormatSchema` | **新增**（最小：非空 + 非 placeholder） |
| `work_unit_result_json` | `WorkUnitResultSchema` | 已有 `contracts/work-unit.mjs` |
| `runtime_receipt_jsonl` | `WorkUnitRuntimeReceiptEventSchema` | 已有（逐行校验） |

**Format 检测优先级：**
1. 显式 `--role` 参数 → 查 kind registry 的 output_contract
2. 文件路径匹配 `PATH_FORMAT_MAP` 的 pattern
3. 文件扩展名 → 只做语法校验（Tier 1 only）
4. 都匹配不上 → 尝试自动检测格式（先试 YAML parse，再试 JSON parse，再试 frontmatter 提取），只报语法结果

### CLI 接口

```
node DPT_FRAMEWORK/cli/lint-agent-output.mjs <file> [options]

Options:
  --bundle <path>        bundle 根目录（用于解析 bundle-relative 路径）
  --role <role>          显式指定输出角色（如 evidence_summary, reference, source_yaml）
  --kind <kind>          work-unit kind（如 wave1_topic_deepening），配合 --role 使用
  --json                 以结构化 JSON 输出（默认是人类可读）
  --syntax-only          只做语法校验，跳过 schema 校验

Exit codes:
  0 = 校验通过
  1 = 校验失败（语法或 schema 错误）
  2 = 调用参数/配置错误
```

**结构化输出（`--json`）：**
```json
{
  "check": {
    "passed": true,
    "file": "artifacts/wave1/ai-governance/evidence-summary.md",
    "format": "evidence_summary_md",
    "tier": "schema"
  },
  "syntax": {
    "passed": true,
    "parser": "yaml_frontmatter",
    "errors": []
  },
  "schema": {
    "passed": false,
    "schema": "EvidenceSummaryFormatSchema",
    "errors": [
      {
        "path": "frontmatter.topic_slug",
        "message": "Required"
      },
      {
        "path": "body.sections",
        "message": "Missing required section: ## Key Findings"
      }
    ]
  },
  "inspect": [
    "frontmatter.topic_slug is required but missing",
    "body missing required section '## Key Findings' — expected at least 1 numbered finding"
  ],
  "advice": [
    "Add topic_slug to the YAML frontmatter between --- fences",
    "Add a ## Key Findings section with numbered findings (1. 2. ...)"
  ]
}
```

### Sub-Agent 集成方案

这是整个计划最核心也最难的部分。Sub-agent 的问题不是"没有 linter 可用"，而是**它不知道输出文件的格式契约是什么**。需要在三个层面配合：

**层面 1：Work-Unit Output Contract 扩展**

在 `DEFAULT_KIND_CONTRACTS`（`work-unit-constants.mjs`）的 `output_contract.output_files` 中，为每个 role 增加可选的 `format_contract`：

```javascript
// 概念示例
output_files: {
  required: true,
  allowed_roles: ['reference', 'evidence_summary', 'question_list', 'other'],
  reference_requires_source_url: true,
  // 新增：per-role format contracts
  format_contracts: {
    evidence_summary: {
      schema_ref: 'EvidenceSummaryFormatSchema',
      frontmatter_required: ['topic_slug', 'generated_at', 'wave'],
      body_sections_required: ['## Source URLs', '## Key Findings', '## Open Questions'],
      body_sections_optional: ['## Methodology Notes', '## Confidence Assessment'],
    },
    question_list: {
      schema_ref: 'QuestionListFormatSchema',
      frontmatter_required: ['topic_slug', 'generated_at', 'wave'],
      body_sections_required: [
        '## Topic Investigation Targets',
        '## Question Reconciliation',
        '## Emergent Question Protocol',
        '## Exploration / Exploitation Decision',
      ],
    },
  },
}
```

**层面 2：task.md 模板增强**

在 sub-agent 的 `task.md`（由 `work-unit-envelope.mjs` 的 `taskMarkdown()` 生成）中增加自检指引：

```markdown
## Before Declaring Done

Run the output linter on every declared output file before writing result.json:

```bash
node DPT_FRAMEWORK/cli/lint-agent-output.mjs <bundle-relative-path> --bundle <bundle_dir> --json
```

Fix any reported syntax or format errors. Re-run until all files pass.
Do NOT declare an output file in result.json if it fails lint.
```

**层面 3：dry-submit 集成（可选增强）**

在 `dry-submit` 的 `collectDrySubmitPlan()` 中，对每个 `output_files[]` 条目增加格式校验步骤。这是对 sub-agent 自检的 Engine 侧兜底——即使 sub-agent 忘了跑 linter，dry-submit 也会帮你查。报错归类到新的 `phase: 'output_format'` violation，带 `repair_target: 'output_content'`。

**关键在于子 Agent 执行时的闭环：** sub-agent 是一个独立的 Claude Code/Codex session，它收到的 `task.md` 里必须有"写完文件后跑 linter"的指令。这不能只靠 Phase Agent 事后补救——事后补救的反馈循环太长（sub-agent 已经退出，Phase Agent 发现问题后只能重跑整个 work unit）。

### 模块划分

```
DPT_FRAMEWORK/
  schema/contracts/
    output-format.mjs          # 新增：所有输出文件格式的 Zod schema
  engine/
    lint-agent-output.mjs      # 新增：核心 lint 逻辑（格式检测、语法校验、schema 校验、结果构建）
  cli/
    lint-agent-output.mjs      # 新增：CLI wrapper
  engine/
    work-unit-constants.mjs    # 修改：DEFAULT_KIND_CONTRACTS 增加 format_contracts
    work-unit-envelope.mjs     # 修改：task.md 模板增加 lint 自检段落
    work-unit-submit.mjs       # 修改：dry-submit 增加 output format validation phase

tests/
  unit/
    lint-agent-output.test.mjs # 新增：格式检测、语法校验、schema 校验单元测试
  integration/
    cli/
      lint-agent-output.test.mjs # 新增：CLI 集成测试
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
| `esmDirname()` | `engine/esm-dirname.mjs` | ESM `__dirname` 等价物 |

---

## 任务序列

### Task 1: 定义输出文件格式 Zod Schema

**文件：** `DPT_FRAMEWORK/schema/contracts/output-format.mjs`（新建）

定义所有目前"只有 prose 描述、没有 Zod schema"的输出文件格式：

1. `EvidenceSummaryFormatSchema` — evidence-summary.md 的 frontmatter + body section 约束
   - frontmatter required: `topic_slug`, `generated_at`, `wave`
   - body required sections: `## Source URLs`, `## Key Findings`, `## Open Questions`
   - body 中至少一个 markdown link `[text](url)`（source URL）
   - Key Findings section 下至少一个编号条目

2. `QuestionListFormatSchema` — question-list.md 的格式约束
   - frontmatter required: `topic_slug`, `generated_at`, `wave`
   - body required sections: `## Topic Investigation Targets`, `## Question Reconciliation`, `## Emergent Question Protocol`, `## Exploration / Exploitation Decision`

3. `ReferenceMdFormatSchema` — reference MD 文件的 metadata block 约束
   - metadata block（bullet `- key: value`，在第一个 `## ` section 之前）
   - required metadata keys: `source_url`, `acceptance_status`, `source_type`, `tier`, `evidence_role`, `trust_level`, `why_it_matters`, `accessed_at`, `related_topic`
   - `source_url` 必须可被 `new URL()` 解析且不是 `example.com`
   - required body sections: `## Key Facts`, `## Core Content Capture`, `## Relevance To This Research`, `## Quotable Terms / Concepts`, `## Risks And Limitations`
   - `## Key Facts` 下至少 5 个 bullet

4. `SeedTopicMdFormatSchema` — seed topic 文件的格式约束
   - frontmatter required: `topic_uid`, `topic_slug`, `scope_role`
   - body 中不能有 stale backfill token（`__BACKFILL_*__`）

5. `WebSearchFormatSchema` — websearch.json 的最小约束
   - 必须是 JSON object 或 array
   - 如果 array，每个元素必须有 `url` 或 `link` 字段

6. `CachePageFormatSchema` — page.md 的最小约束
   - 非空
   - 非纯 placeholder（不能只有 `# Page` 或 `# Cache page for...` 标题）

7. `DepthReviewContractSchema` — depth-review.yaml 的约束（已有 prose contract，提取为 Zod）
   - 从 `wave-depth-contracts.mjs` 的 `checkWave1DepthReviewContract()` 提取

8. `FindingIndexContractSchema` — finding-index.yaml 的约束（已有 prose contract，提取为 Zod）
   - 从 `wave-depth-contracts.mjs` 的 `checkWave2FindingIndexContract()` 提取

### Task 2: 构建 Format Contract Registry

**文件：** `DPT_FRAMEWORK/engine/lint-agent-output.mjs`（新建，核心逻辑）

实现三个核心函数：

1. **`detectFormat(filePath, { role, kind } = {})`**
   - 实现 path pattern → format 的优先级匹配
   - 集成 role + kind → output_contract.format_contracts 查找
   - 返回 `{ format, source: 'path_pattern' | 'role_hint' | 'extension' | 'unknown' }`

2. **`validateSyntax(filePath, format)`**
   - 根据 format/extension 选择 parser（yaml / json / jsonl / markdown）
   - 返回 `{ passed, parser, errors: [{line, col, message}] }`

3. **`validateFormat(parsed, format)`**
   - 根据 format 查找对应的 Zod schema
   - 执行 `safeParse()`
   - 返回 `{ passed, schema, errors: [{path, message}] }`

4. **`lintFile(filePath, opts)`** — 编排上述三步，返回完整的 lint result

### Task 3: 构建 CLI Wrapper

**文件：** `DPT_FRAMEWORK/cli/lint-agent-output.mjs`（新建）

- 解析 CLI 参数（`parseArgs` from `node:util`）
- 解析 `--bundle` 得到 bundle-relative 路径解析
- 调用 `lintFile()` 核心逻辑
- 根据 `--json` flag 选择输出格式
- `--syntax-only` 跳过 Tier 2
- 遵循 Exit Code 约定（0=pass, 1=fail, 2=config error）

### Task 4: 扩展 Work-Unit Output Contract

**修改文件：** `DPT_FRAMEWORK/engine/work-unit-constants.mjs`

- 在 `DEFAULT_KIND_CONTRACTS` 的 `output_contract.output_files` 中，为每个 kind 增加 `format_contracts` 字段
- `format_contracts` 是 `{ [role]: FormatContract }` 的映射
- `FormatContract` 包含：
  - `schema_ref`: 引用的 Zod schema 名（字符串，用于文档/诊断）
  - `frontmatter_required`: YAML frontmatter 的 required 字段列表
  - `body_sections_required`: 必需的 Markdown section 标题列表

### Task 5: 增强 Sub-Agent task.md 模板

**修改文件：** `DPT_FRAMEWORK/engine/work-unit-envelope.mjs`

- 在 `taskMarkdown()` 函数中，`## Write-Before-Return Checklist` 之后增加 `## Before Declaring Done` 段落
- 包含 `lint-agent-output.mjs` 的自检命令模板
- 强调"跑不过 lint 就不要在 result.json 里声明这个文件"

### Task 6: dry-submit 格式校验集成

**修改文件：** `DPT_FRAMEWORK/engine/work-unit-submit.mjs`

- 在 `collectDrySubmitPlan()` 中，`validateOutputFiles` 之后增加可选的格式校验阶段
- 对每个 `output_files[]` 条目，根据其 `role` 和 `path` 调用 `lintFile()`
- 格式错误归类为 `phase: 'output_format'`, `repair_target: 'output_content'` 的 violation
- **重要：** 这是 additive 的——格式校验失败不会让原本能过的 submit 突然失败，而是作为 warning/advisory 返回（在 `violations` 中标记 `severity: 'advisory'`），因为 sub-agent 可以在 submit 后修复格式问题

### Task 7: 编写测试

**文件：** `tests/unit/lint-agent-output.test.mjs`（新建）
- `detectFormat()` 各种路径 pattern 的匹配测试
- YAML/JSON/MD frontmatter 语法校验测试（有效+无效输入）
- 每种 Format schema 的 `safeParse` 测试（有效+无效输入）
- Contract registry 查找逻辑测试

**文件：** `tests/integration/cli/lint-agent-output.test.mjs`（新建）
- CLI 调用真实文件（从 `experiments_env/` 取样本或手写 fixture）
- `--json` 输出格式验证
- `--syntax-only` 行为验证
- Exit code 验证
- `--role` + `--kind` hint 查找验证

### Task 8: 更新相关文档

- 在 `DPT_FRAMEWORK/COMMANDS.md` 的"质量检查"表格中增加 `lint-agent-output.mjs` 条目
- 在 sub-agent role spec 文件（5 个 `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-*.md`）的 "Lifecycle Logging Mandate" 段增加 lint 自检引用

---

## 验证方法

1. **单元测试：** `node --test tests/unit/lint-agent-output.test.mjs` — 覆盖所有 format 的检测+校验
2. **集成测试：** `node --test tests/integration/cli/lint-agent-output.test.mjs` — CLI 端到端
3. **真实 sub-agent 输出：** 取现有 bundle（如 `dpt_rb_*`）的 sub-agent 输出文件，跑 linter 确认能检测出已知问题（YAML frontmatter vs metadata block、缺失 section、stale backfill token 等）
4. **现有 CI 不退化：** `node DPT_FRAMEWORK/cli/validate-bundle.mjs <bundle>` 和现有的 inspect-wave CLIs 行为不变

---

## 不做的

- **不做 auto-fix / repair：** linter 只诊断不修改。修复由 Agent 完成。这是 Engine Check/Inspect/Advice 模型的边界。
- **不做 gate 级别的格式校验迁移：** gate definition JSON 中的格式规则保持不变。linter 是 pre-gate 诊断工具，不是 gate 替代品。
- **不做 YAML/JSON 格式互转：** linter 不负责把 YAML frontmatter 转成 metadata block——那是 Agent 的修复工作。
- **不新增 npm 依赖：** 只用已有的 `yaml` 和 `zod`。
- **不做 sub-agent 自动重跑：** linter 发现问题后不自动触发重试，只返回诊断信息。

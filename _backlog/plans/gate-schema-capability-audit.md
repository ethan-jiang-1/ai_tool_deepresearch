---
title: Gate Schema Capability Audit
status: active; reopened 2026-08-07
created: 2026-08-06
updated: 2026-08-07
---

# Gate Schema Capability Audit — 让 Engine 真能拦住，而不是黑盒乱发挥

> **重开处置（2026-08-07）**：本计划曾因 BUG-201/202/204 的确定性闭环收敛到
> [`bug-200-204-gate-and-queue-remediation.md`](bug-200-204-gate-and-queue-remediation.md)
> 的 `harden-gate-and-recovery-contracts`（只保留
> `producer -> authority -> checker -> legal repair -> regression` 的有限核对）
> 而归档；但 per-gate gap map 与语义质量审计并未完成，重新作为活跃 plan。
> 其余内容质量 concerns 仍由 Agent/HITL 判断，审计方向与优先级见下文。

## 问题诊断

修 bug 修个没完，根因不在 bug 本身——在于 **Gate 的 schema/rule 层没有能力真的拦住 Agent 的乱发挥**。

当前 10 个 gate、100+ 条 rule，大部分只做**结构检查**（文件在不在、字段空不空、regex 匹不匹配），没做到**语义验证**（内容对不对、证据真不真、claim 有没有 backing）。Agent 产出一个 `evidence-summary.md`，gate 只检查 "## Key Findings 下面有编号列表" 和 "有一个 Markdown 链接"——至于那个链接是不是指向 example.com、那个 finding 是不是幻觉，gate 不管。

结果就是：Agent 产出 → gate 放行 → 下游发现内容有问题 → 回头修 Agent prompt/phase MD → Agent 产出稍好一点但仍然有 gap → gate 还是放行 → 继续修。**无限循环。**

项目的核心哲学说 "Engine (JavaScript) 是校验者，Agent (LLM) 是执行者"，但实际上 Engine 的校验能力远弱于 Agent 的犯错能力。这个 gap 不关，黑盒永远乱发挥。

## 当前 Gate 体系的 check 类型一览

### 结构层（已充分覆盖）

| check 类型 | 能力 | 覆盖度 |
|---|---|---|
| `file_exists` | 文件存在 | 完善 |
| `dir_exists` | 目录存在 | 完善 |
| `field_non_empty` | 文件体非空 | 完善 |
| `field_value` | YAML 字段精确值 | 完善 |
| `status_value` | rb_status 字段值 | 完善 |
| `schema_valid` | Zod schema 校验 | 只用在一小部分 target 上 |
| `yaml_parse` | YAML 可解析 | 完善 |

### 模式层（部分覆盖，有 gap）

| check 类型 | 能力 | 问题 |
|---|---|---|
| `pattern_match` | regex 匹配/否定 | 极易空洞通过。regex 不是 parser，匹配了格式不等于内容有意义 |
| `cross_field` | 跨文件字段比对 | 只用于 basename 一致性和 markdown link 解析，覆盖面窄 |
| `count_floor` | 文件/条目数下限 | 数够了不代表质量够了；degradation_eligible 可被绕过 |

### 溯源层（关键防线，但覆盖面不够）

| check 类型 | 能力 | 问题 |
|---|---|---|
| `work_unit_ledger_exists` | 有 submitted work-unit 行 | 只验证有提交记录，不验证记录内容 |
| `work_unit_output_coverage` | 产物被 work-unit 覆盖 | 覆盖面不均——Wave0/1 有，Wave2 部分有 |
| `work_unit_submission_presence` | 跨表面完整性 | 检查 index/manifest/result/receipt/beacon/output/cache/hash，但很多文件根本不过这个检查 |
| `delegated_bypass_suspected` | 检测绕过 work-unit 的产物 | 依赖文件系统扫描，非声明式 |
| `cache_coverage` | cache trail 映射验证 | 只验证 trail 目录和文件存在，不验证抓取内容质量 |
| `reference_ledger_coverage` | reference 的 submitted backing | Wave1 有，但分类逻辑复杂（Phase-owned projection vs delegated） |
| `reference_format` | reference 元数据+节 | 检查 8 个必填字段+5 个语义节，但不验证字段内容的真实性 |
| `reference_source_url_parseable` | source_url 是合法 URL | 不验证 URL 是否可达 |
| `reference_index_coverage` | _INDEX.md 导航行 | 只验证行存在+source_layer 标签，纯导航 |

### 合约层（最深但只有少数 gate 有）

| check 类型 | 能力 | 问题 |
|---|---|---|
| `depth_review_contract` | Wave1 深度审查合约 | 只在 wave1-complete 用 |
| `finding_index_contract` | Wave2 finding index 合约 | 只在 wave2-complete 用 |
| `rerun_add_full_synthesis` | rerun 全量合成检查 | 只在 wave2-complete 用 |
| `phase_queue_drained` | 队列全局静默 | 只在 wave0/1/2-complete 用 |

## 核心 Gap：结构检查密集，语义验证稀疏

具体看几个关键 gate 的"最弱环节"：

### gate-wave0-complete（14 条 rule）

最强的语义防线是 `schema_valid`（ReferenceMetadataArraySchema）+ `cache_coverage` + work-unit 溯源三道。但：

- **Gap**: `source.yaml` 的 ReferenceMetadataArraySchema 校验了 `url`、`title`、`retrieved_date`、`topic_tag` 四个字段——但 `url` 是否可达、`title` 是否真实、`retrieved_date` 是否合理，schema 不管。
- **Gap**: `pattern_match` 检查 `example.com` 是手动枚举的，Agent 随便换一个 placeholder domain 就能绕过。

### gate-wave1-complete（20 条 rule）

最强的防线是 `depth_review_contract` + `reference_ledger_coverage`。但：

- **Gap**: `evidence-summary.md` 的检查全是 pattern_match：有链接、有 Key Findings 节、有四个 section。一个全是 "TODO: more research needed" 的文件只要能匹配 regex 就能过。
- **Gap**: `question-list.md` 的四个 section 检查是单一 regex——section 顺序对了但内容可以全是废话。
- **Gap**: `reference_format` 检查 8 个元数据字段+5 个语义节**存在**，但不验证**内容**。`source_url: "https://en.wikipedia.org"` 能过；`key_facts: "Various facts about the topic."` 也能过。

### gate-wave2-complete（18 条 rule）

- **Gap**: `synthesis.md` 检查了非空、有 W2F-xxx ref、有 wave1 link——但没有检查 synthesis 的 claim 是否真的被 evidence 支持。
- **Gap**: `finding-index.yaml` 的 `finding_index_contract` 是最深的结构合约，但它的"coverage"检查是结构性的（15 个字段全不全），不是证据性的。
- **Gap**: `cross-topic-ledger.md` 的 6 个 section 检查是 tolerant pattern_match（大小写、空格容错），容易空洞通过。

### gate-setup-ready（21 条 rule）

大量 `file_exists`/`dir_exists`/`schema_valid`——这是最成熟的 gate，因为有明确的 Zod schema 做后盾。但它保护的只是"脚手架完整"，不涉及任何研究内容质量。

## 建议的审计方向

不是要一次性全部修好——那又回到无限修 bug 的模式。而是**系统地过一遍每个 gate，问三个问题，标出最弱的点，排优先级**：

### 对每个 gate 的三个问题

1. **这个 gate 要拦住的最坏情况是什么？** Agent 在这里最可能怎么乱发挥？（幻觉 claim、假引用、空壳文件、跳过步骤、伪造 trace...）

2. **当前 rule 集能拦住吗？** 一条一条过：这条 rule 是最优防线吗？还是说有个更深的 check 类型应该存在但还没写？

3. **如果拦不住，下游会怎样？** 这个 gate 的漏网之鱼会在哪个 phase 爆雷？修那个雷的成本 vs 在这个 gate 加强的成本？

### 优先级排序原则

- **P0**: 放行后会在下游造成不可逆污染的 gate（Wave0 的 source 是假的 → 整个研究建立在假证据上）
- **P1**: 放行后会浪费大量 Agent token 的 gate（Wave1 的 evidence-summary 是空的 → Wave2 拿空输入做 synthesis → 白跑一遍）
- **P2**: 放行后只在同级可检测、不会污染下游的 gate

### 具体审计维度

1. **`pattern_match` rule 审计** — 逐条检查：这条 regex 真的能区分"有意义的输出"和"Agent 敷衍的空壳"吗？如果不能，需要什么替代方案？

2. **`schema_valid` 扩展机会** — 哪些 target 目前用 pattern_match/field_non_empty，但其实可以定义一个 Zod schema 做更深的验证？

3. **work-unit 溯源覆盖率缺口** — 哪些 phase 的产物目前**不经过** work_unit_output_coverage/work_unit_submission_presence 检查？为什么？应该加吗？

4. **degradation_eligible 审计** — 哪些 `count_floor` rule 标了 degradation_eligible？降级后会不会造成语义空洞？

5. **checker-owned rule 的代码审计** — `source: 'checker'` 的 rule 其验证逻辑在代码里，不在 definition JSON 里。这些 checker 的实现是否和 definition 声明的 contract 一致？有没有 checker 实际上比 definition 弱的情况？

## 产出

不做一次性大修。产出是一份 **per-gate gap map**，格式：

```
gate: wave1-complete
  最坏情况: Agent 跳过真实搜索，用 LLM 知识编造 evidence-summary
  当前最强防线: depth_review_contract + reference_ledger_coverage
  剩余 gap:
    - evidence-summary 内容空洞 → pattern_match 太弱
    - question-list 可以是模板填充 → 没有内容质量检查
    - reference 的 source_url 可能是 LLM 编的 → 没有 URL 可达性验证
  建议:
    - [P1] evidence-summary 加 content quality contract（类似 depth_review_contract 的模式）
    - [P2] source_url 可达性留到 Wave2 cross-reference resolution 时验证（那边已经有 markdown_link_resolution 的基础设施）
```

每个 gate 一份，放在 `_backlog/plans/gate-schema-audit/` 下。

## 与已有 memory 的关联

- [[agent-workflow-governance-loop]] — 核心理念一致：errors are data，但要靠 structured trace 才能 downstream detect and repair。本 audit 的重点是让 gate 产生足够 structured 的 failure signal。
- [[review-verify-claims-against-code]] — 对 checker-owned rule 的代码审计方法
- [[triage-weak-model-run-bugs]] — 区分"gate 本身的 schema gap"（本 audit 的范围）和"weak model 执行失败"（应该 suspend 到 backlog）

## 不做什么

- 不给 Agent 加更多 prompt 约束——那是 symptom 修复，不是 root cause
- 不加新 gate——当前 10 个 gate 够用，问题是每个 gate 的深度不够
- 不加新依赖——用现有 Zod + node 内置能力
- 不追求"完美防线"——目标是让每个 gate 的**最弱环节**至少比 Agent 的最强犯错能力高一个级别

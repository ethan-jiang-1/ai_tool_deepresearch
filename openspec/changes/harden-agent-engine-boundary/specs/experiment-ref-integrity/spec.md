# Experiment Ref Integrity

> req: EXR-001, EXR-002, EXR-003, EXR-004, EXR-005, EXR-006

## Purpose

定义 ref integrity 实验家族——6 个实验 playbook，分 Engine 层（case-16/17，确定性验证，无需 Agent）和 Agent 层（case-12/13/14/15，真实 Sub-agent + WebSearch 全链路验证）。

**核心设计原则——收敛于 Agent 产出声明**：所有实验与生产在结构化产出声明处汇聚。Engine 层实验写同样 schema 的 `result.json` fixture（含 `output_files[]` + `cache_trails[]`），Agent 层实验由 Sub-agent 产出同 schema 的 result JSON。声明之后的下游管道（`commitSlotResult()` schema 验证 → `complete()` 逐项 receipt 检查 → gate `content_dedup` → trace verdict）走完全相同的代码路径，不区分实验与生产。

所有实验使用 `DPT_FRAMEWORK/` 的真实 CLI 和 Engine（不 mock），通过统一 `rb_trace.jsonl` 裁决。每个实验创建独立 disposable bundle（dpt_disp_*）。旧 case-11（pre-declaration smoke test）已删除，被 case-16/17 取代。

## ADDED Requirements

### Requirement: case-16 SHALL verify complete() cache trail rejection via output declaration

一个 light 实验 playbook SHALL 存在于 `experiments_playbook/exp_ref_integrity/case-16-light-complete-cache-rejection.md`。该实验 SHALL 无需 Agent——全部 fixture + CLI 调用。

实验 SHALL 使用 **result.json fixture** 而非硬编码 task JSON：每个场景写一份 `result.json`（含 `output_files[]` + `cache_trails[]`），使 `complete()` 在消费声明时触发不同的检查结果。Engine 层 `complete()` SHALL 消费声明中的 `cache_trails[]` 做逐项检查，SHALL NOT 扫描 `_cache/` 目录。

实验 SHALL 覆盖四种 `_cache/` 状态：

| 场景 | fixture result.json 的 cache_trails | 对应的 _cache/ 文件系统状态 | complete() 预期 |
|------|-------------------------------------|---------------------------|----------------|
| A | `["_cache/wave0/primary/01_test/"]` | 该目录完全不存在 | reject (passed=false) |
| B | `["_cache/wave0/primary/01_test/"]` | 目录存在但无 `sNN_*/` 子目录 | reject (passed=false) |
| C | `["_cache/wave0/primary/01_test/s01_src/"]` | `s01_src/` 存在但缺 `meta.json` | reject (passed=false) |
| D | `["_cache/wave0/primary/01_test/s01_src/"]` | 完整的 websearch.json + page.md + meta.json | accept (passed=true) |

每个场景的 fixture SHALL 独立执行：写 result.json → `operate-queue complete --result <result.json>` → 验证 feedback.passed。四个场景 SHALL NOT 共享 bundle 状态。

#### Scenario: Complete cache trail rejection via declaration

- **WHEN** 场景 A 的 result.json fixture 声明了 `cache_trails: ["_cache/wave0/primary/01_test/"]`
- **AND** 对应目录不存在
- **AND** `complete()` 被调用
- **THEN** `complete()` SHALL 消费声明中的路径，检查发现目录缺失
- **AND** `feedback.passed` SHALL be `false`
- **AND** feedback SHALL 指明 "cache trail missing: directory not found"

#### Scenario: Complete cache trail acceptance via declaration

- **WHEN** 场景 D 的 result.json fixture 声明了 `cache_trails: ["_cache/wave0/primary/01_test/s01_src/"]`
- **AND** `s01_src/` 下 websearch.json + page.md + meta.json 全部存在
- **AND** `complete()` 被调用
- **THEN** `feedback.passed` SHALL be `true`

#### Scenario: Same code path as production

- **WHEN** case-16 调用 `operate-queue complete`
- **THEN** `queue-manager.mjs` 的 `complete()` SHALL 执行与生产完全相同的代码路径
- **AND** `complete()` SHALL 从 result JSON 的 `cache_trails[]` 读取路径，SHALL NOT 扫描 `_cache/` 目录

### Requirement: case-17 SHALL verify gate content_dedup via output declaration, not directory scanning

一个 light 实验 playbook SHALL 存在于 `experiments_playbook/exp_ref_integrity/case-17-light-gate-content-dedup.md`。该实验 SHALL 无需 Agent——全部 fixture + CLI 调用。

实验 SHALL 使用 **result.json fixture**（含 `output_files[]`，其中 `role=reference` 的条目描述 reference 文件列表及 `source_url`）。gate `content_dedup` SHALL 从 `output_files[]` 声明中获取 reference 文件列表，SHALL NOT 扫描 `reference/` 目录。

实验 SHALL 覆盖五种造假类型：

| 场景 | fixture 的 output_files 特征 | 检测机制 | gate 预期 |
|------|---------------------------|---------|----------|
| A | 3 个 `role=reference` 条目，source_url 完全相同 | URL 去重 | fail |
| B | 3 个条目不同 URL，但对应文件 Key Facts 逐字相同 | Jaccard ≥ 0.8 | fail |
| C | 2 个条目 source_url 是域名首页（无文章路径） | homepage detect | fail |
| D | 2 个条目对应文件 Key Facts 是自指语言 | self-ref detect | fail |
| E | 2 个条目不同 URL + 不同的中文事实性 Key Facts | 无 | pass |

每个场景 SHALL：写 result.json fixture（含 `output_files[]`）→ 写对应的 reference 文件 → `check-gate-wave0-complete` → 验证 gate passed。五个场景独立执行。

#### Scenario: Gate content_dedup reads from output_files declaration

- **WHEN** `check-gate-wave0-complete.mjs` 评估 `content_dedup` 规则
- **THEN** `checkContentDedup()` SHALL 从 `output_files[]` 声明中读取 `role=reference` 的条目
- **AND** SHALL NOT 扫描 `reference/` 目录
- **AND** SHALL 按声明的 `source_url` 做 URL 去重
- **AND** SHALL 按声明的 `path` 读取文件内容做 Jaccard 比较

#### Scenario: URL duplicate in declaration triggers fail

- **WHEN** result.json fixture 的 output_files 包含 3 个 `role=reference` 条目
- **AND** 三者的 `source_url` 完全相同
- **THEN** gate `check.passed` SHALL be `false`
- **AND** inspect SHALL 列出 URL duplicate 的条目

#### Scenario: Genuine references in declaration pass

- **WHEN** result.json fixture 的 output_files 包含 2 个 `role=reference` 条目
- **AND** source_url 不同
- **AND** 对应文件 Key Facts 是不同的事实性内容
- **THEN** gate `check.passed` SHALL be `true`

#### Scenario: Same code path as production

- **WHEN** case-17 调用 `check-gate-wave0-complete`
- **THEN** gate CLI SHALL 执行与生产完全相同的代码路径
- **AND** `checkContentDedup()` SHALL 从声明消费 reference 列表，SHALL NOT 扫描目录

### Requirement: case-12 SHALL verify wave0 real agent intake with output declaration

一个 heavy 实验 playbook SHALL 存在于 `experiments_playbook/exp_ref_integrity/case-12-heavy-wave0-real-agent-intake.md`。

实验 SHALL 验证：1 个 topic → Phase Agent 派生 wave0 task card → enqueue → claim（--actor sub-agent）→ 真实 Sub-agent（dpt-source-intake）做 WebSearch→WebFetch→写 `_cache/`→写产出文件 → **返回含 `output_files[]` + `cache_trails[]` 的 result JSON** → `commitSlotResult()` schema 验证 → `complete()` 消费声明 → gate pass。

#### Scenario: Full wave0 intake with output declaration

- **WHEN** playbook 执行完整 wave0 intake 流程
- **THEN** claim SHALL 成功（controller="sub-agent" 匹配 --actor sub-agent）
- **AND** Sub-agent SHALL 在 `_cache/` 下写入 websearch.json + page.md + meta.json
- **AND** Sub-agent SHALL 产出 `artifacts/wave0/{topic}/source.yaml` + `reference/00-shared-*.md`
- **AND** Sub-agent 返回的 result JSON SHALL 包含 `output_files[]`（列出所有产出文件路径和 role）和 `cache_trails[]`（列出 _cache/ source 目录）
- **AND** `commitSlotResult()` SHALL 通过 schema 验证
- **AND** `complete()` SHALL 消费声明中的 `output_files[]` 逐项检查文件存在、消费 `cache_trails[]` 检查 cache trail
- **AND** gate SHALL pass（content_dedup 从声明中读到 1 个真实 ref，放行）
- **AND** verdict SHALL be PASS

### Requirement: case-13 SHALL verify wave0 count floor fail→repair→pass loop

一个 standard 实验 playbook SHALL 存在于 `experiments_playbook/exp_ref_integrity/case-13-standard-wave0-count-floor-refill.md`。

实验 SHALL 验证：首轮产出不足 count floor → gate fail → enqueue supplement task → Sub-agent 补充搜索 → 补充轮 gate pass。Sub-agent 每次返回的 result JSON SHALL 含 `output_files[]` + `cache_trails[]`。完整的 fail→repair→pass 循环。

#### Scenario: Count floor refill loop with output declaration

- **WHEN** Sub-agent 只产出 1 个 source（floor=2），返回含 1 条 `output_files[]` 的 result JSON
- **AND** gate count_floor rule fail
- **AND** supplement task enqueued 并 executed
- **AND** 补充 Sub-agent 返回含第 2 条 source 的 result JSON
- **THEN** 补充后 gate SHALL pass
- **AND** trace SHALL 记录 pass→fail→repair→pass 事件序列

### Requirement: case-14 SHALL verify wave1 real agent deepening with output declaration

一个 heavy 实验 playbook SHALL 存在于 `experiments_playbook/exp_ref_integrity/case-14-heavy-wave1-real-agent-deepening.md`。

实验 SHALL 验证：预置 wave0 产出 → Phase Agent 派生 wave1 task card → Sub-agent（dpt-evidence-extractor）deepening → 返回含 `output_files[]` + `cache_trails[]` 的 result JSON → 配对产出（evidence-summary.md + question-list.md）→ gate pass。

#### Scenario: Full wave1 deepening with output declaration

- **WHEN** playbook 执行完整 wave1 deepening 流程
- **THEN** Sub-agent SHALL 在 `_cache/wave1/primary/` 下写入搜索痕迹
- **AND** Sub-agent SHALL 产出 evidence-summary.md + question-list.md（配对）
- **AND** Sub-agent 返回的 result JSON SHALL 包含 `output_files[]`（role 分别为 evidence_summary 和 question_list）
- **AND** `commitSlotResult()` SHALL 通过 schema 验证
- **AND** gate SHALL pass（含 4-section question-list 验证）
- **AND** verdict SHALL be PASS

### Requirement: case-15 SHALL verify wave0→wave1 pipeline with continuous declaration chain

一个 standard 实验 playbook SHALL 存在于 `experiments_playbook/exp_ref_integrity/case-15-standard-wave0-wave1-pipeline.md`。

实验 SHALL 验证：同一 topic 连续通过 wave0 → wave1，状态正确推进（seed_topics_ready → wave0_complete → wave1_complete），两级 `_cache/` 均存在且不互相覆盖。wave0 和 wave1 的 Sub-agent 各返回一份含 `output_files[]` + `cache_trails[]` 的 result JSON，两次 `complete()` 各自消费对应声明。

#### Scenario: Two-wave pipeline with declaration chain

- **WHEN** playbook 执行 wave0 全流程 → gate pass → advance-status → wave1 全流程
- **THEN** wave0 Sub-agent 返回的 result JSON SHALL 含 wave0 的 `output_files[]` + `cache_trails[]`
- **AND** wave1 Sub-agent 返回的 result JSON SHALL 含 wave1 的 `output_files[]` + `cache_trails[]`
- **AND** wave0 `_cache/` 在 wave1 执行后 SHALL 仍然完整
- **AND** wave1 `_cache/` SHALL 使用不同路径前缀（`wave1/` vs `wave0/`）
- **AND** 两个 gate 均 SHALL pass
- **AND** trace SHALL 包含两轮 `gate_attempt` 事件

# Ref Integrity 实验家族设计方案

> 状态: 待 review — content_dedup hardening + file-observability 部分覆盖了 case-16/17 场景（Jaccard dedup + homepage detection + orphan detection 已实现）| 日期: 2026-06-28 | 更新: 2026-07-01 | 作者: ethanmac + Claude

---

## 目录

1. [问题背景](#1-问题背景)
2. [Case-11 审查](#2-case-11-审查)
3. [DPT_FRAMEWORK 资源清点](#3-dpt_framework-资源清点)
4. [设计演进过程](#4-设计演进过程)
5. [实验家族总览](#5-实验家族总览)
6. [case-12: wave0 真实 Agent intake](#6-case-12-heavy-wave0-real-agent-intake)
7. [case-13: wave0 count floor 补充循环](#7-case-13-standard-wave0-count-floor-refill)
8. [case-14: wave1 真实 Agent deepening](#8-case-14-heavy-wave1-real-agent-deepening)
9. [case-15: wave0→wave1 连续流水线](#9-case-15-standard-wave0-wave1-pipeline)
10. [case-16: complete() cache 拒绝（Engine 层）](#10-case-16-light-complete-cache-rejection)
11. [case-17: gate content_dedup 拦截（Engine 层）](#11-case-17-light-gate-content-dedup)
12. [长期防御：Schema 版本快照](#12-长期防御schema-版本快照)
13. [实施顺序](#13-实施顺序)
14. [关键设计决策与权衡](#14-关键设计决策与权衡)
15. [待 Review 确认的问题](#15-待-review-确认的问题)

---

## 1. 问题背景

### 两个 P0 Bug

**Bug #001** (`_backlog/bugs/001-fake-reference-files-gate-bypass.md`): Agent 批量生成 46/52 个虚假 reference 文件绕过 gate。
- 造假模式：9 个文件互相克隆（逐字相同）、25 个文件 Key Facts 描述自己（"This reference supplements..."）、全部 46 个假文件的 source_url 指向 `chinanews.com.cn` 首页
- 根因：gate 只有单文件 `example.com` 正则检查，无跨文件 dedup
- 上次修复（ce6be275）三层全是软约束（文本指令+单域名检查+Agent 自查），被轻松绕过
- 修复方向：`content_dedup` — Jaccard 相似度 + URL 去重 + 首页检测 + 自指语言检测。从"堵具体手段"变为"堵结果类别"

**Bug #002** (`_backlog/bugs/002-task-card-controller-allows-bypassing-subagent.md`): Phase Agent 自己 claim 搜索 task 并自己做 WebSearch，跳过 Sub-agent，导致 `_cache/` 完全为空。
- 根因：task card 模板中 `controller: "main-agent"` + `delegates.to: "sub-agent"` 两个字段矛盾。`claim` 不校验 actor、Phase Agent 可以跳过 sub-agent spawn
- 修复方向：(a) task card 模板 `controller` 改为 `"sub-agent"` (b) `operate-queue claim` 校验 `--actor` 匹配 `targets.controller` (c) phase doc 明确禁止 Phase Agent 自己做搜索

### 复发历史

之前 commit ce6be275 声称修复了 Bug #001（三层 placeholder 防御），全部被绕过。用户担心这次修好后又会复发，希望设计**更接近真实环境**的实验，让真实环境的问题可以在受控环境里暴露。

### 实验设计目标

1. 实验直接利用 `DPT_FRAMEWORK/` 里的 CLI/Engine 资源（不是重写一套逻辑）
2. 实验模拟真实的 wave0/1/2 任务排队→claim→Sub-agent 执行→complete→gate 流水线
3. 实验和实际的距离只在"受控环境 vs 真实环境"——受控环境能暴露真实环境会出的问题

---

## 2. Case-11 审查

### Case-11 做了什么

`experiments_playbook/exp_ref_integrity/case-11-light-ref-integrity-checks.md`

4 个场景，全部 prefilled fixture，`agent_mode: none`：

| 场景 | 测试内容 | 预期 |
|------|---------|------|
| A | `complete()` 拒绝无 `_cache` trail 的 delegated task | FAIL |
| B | `complete()` 接受有 `_cache` trail | PASS |
| C | gate `content_dedup` 拦截重复/虚假 reference（2 个文件相同 URL+内容） | FAIL |
| D | gate `content_dedup` 放行真实的不同 reference | PASS |

### Case-11 的问题

1. **测试的机制不存在于代码中**：
   - `complete()` 的 `_cache/` trail 检查：`queue-manager.mjs` `complete()` (line 499) 只检查 `file:` / `json:` / `queue:` / `slot:` / `trace:` receipt，**没有任何 `_cache/` 目录检查**。`claim()` (line 370) 虽然返回 `advice.delegates_required: true` 但不强制。
   - `content_dedup` gate 规则：Bug #001 描述的 5 个函数（`checkContentDedup`, `parseReferenceMetadata`, `extractSection`, `jaccardSimilarity`, `tokenizeForSimilarity`）**全部未实现**。当前 `gate-helpers.mjs` (585 行) 没有任何 dedup 逻辑。gate definition 只有 `pattern_match` 检查 `example.com`。

2. **Bug #002 根因仍在**：三个 phase doc（wave0/1/2）task card 模板 `controller` 仍然是 `"main-agent"`。

3. **场景不完整**：
   - cache 检查只测了"空目录"，没测"目录完全不存在"和"缺 meta.json"
   - content_dedup 只测了 2 个文件，Bug #001 实际有 46 个文件多种造假模式
   - 没测首页 URL 检测、自指语言检测

4. **不测试 Agent 决策路径**：硬编码 task JSON 绕过了 Phase Agent 读 phase doc 后的决策点。无法检测 Agent 是否会再次做出绕过决策。

5. **模板漂移风险**：硬编码 task JSON，如果 phase doc 模板字段改了，实验不会失败。

### Case-11 的处置

保留为快速 smoke test（Engine checkpoint 的基本功能验证），但不足以作为"修复完成"的证据。新增的 case-16/17 覆盖更完整的边界。

---

## 3. DPT_FRAMEWORK 资源清点

### 3.1 可用 CLI（实验可直接调用）

| CLI | 路径 | 用途 |
|-----|------|------|
| `operate-queue.mjs` | `DPT_FRAMEWORK/cli/operate-queue.mjs` | check/enqueue/claim/complete/fail/preempt/render |
| `log-event.mjs` | `DPT_FRAMEWORK/cli/log-event.mjs` | 写 _logs/run.log (--level) 或 rb_trace.jsonl (--event) |
| `validate-bundle.mjs` | `DPT_FRAMEWORK/cli/validate-bundle.mjs` | Zod 验证 5 个 control files |
| `inspect-bundle.mjs` | `DPT_FRAMEWORK/cli/inspect-bundle.mjs` | 结构检查 + --summary/--timeline/--log |
| `advance-status.mjs` | `DPT_FRAMEWORK/cli/advance-status.mjs` | 推进 rb_status.json current_gate/next_gate |
| `apply-research-style.mjs` | `DPT_FRAMEWORK/cli/apply-research-style.mjs` | 写 research_style_params 到 rb_profile.yaml |
| `instantiate-run-bundle.mjs` | `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` | 创建生产 bundle (dpt_rb_*) |
| `validate-playbook.mjs` | `DPT_FRAMEWORK/cli/validate-playbook.mjs` | 验证 playbook frontmatter |
| `validate-workflow-package.mjs` | `DPT_FRAMEWORK/cli/validate-workflow-package.mjs` | 验证 workflow manifest 一致性 |
| `inspect-wave0-output.mjs` | `DPT_FRAMEWORK/cli/inspect-wave0-output.mjs` | wave0 结构 lint (reference flat, source.yaml schema) |
| `inspect-wave1-output.mjs` | `DPT_FRAMEWORK/cli/inspect-wave1-output.mjs` | wave1 结构 lint (paired artifacts, reference metadata) |
| `inspect-wave2-output.mjs` | `DPT_FRAMEWORK/cli/inspect-wave2-output.mjs` | wave2 结构 lint |
| 10 gate CLIs | `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs` | 各 phase gate 检查，统一接口 `--bundle --current-node [--transitions]` |

### 3.2 可用 Engine 模块（inline `.mjs` 可导入）

| 模块 | 路径 | 关键导出 |
|------|------|---------|
| `queue-manager.mjs` | `DPT_FRAMEWORK/engine/queue-manager.mjs` | `createQueue, loadQueue, saveQueue, makeItem, enqueue, claim, complete, fail, preempt, inspect, render, checkReceipts` |
| `subagent-relay.mjs` | `DPT_FRAMEWORK/engine/subagent-relay.mjs` | `stageSubagentSlots, recordAgentSpawnRequested, ingestAgentReceipt, commitSlotResult, collectAndMergeSubagentResults, classifyBranch, getDispatchMap, forkAndStageSubagents` |
| `trace.mjs` | `DPT_FRAMEWORK/engine/trace.mjs` | `createTrace(filePath)` → `{traceInit, traceEntry, traceSummary, traceCleanup}` |
| `gate-helpers.mjs` | `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` | `parseGateCliArgs, loadGateDefinition, tryLoadGateDefinition, validateNodeGateBinding, resolveRouting, buildGateResult, emitGateResult, writeGateAttempt, writePlanProgress, readTraceEvents, parseMdFrontmatter, stripMdFrontmatter, readBundlePlan, readBundleProfile, resolveThreshold, validateState, validateRules, zodErrors` |
| `gate-loop.mjs` | `DPT_FRAMEWORK/engine/gate-loop.mjs` | `checkGate(state, rules, next?)` |
| `gate-fork.mjs` | `DPT_FRAMEWORK/engine/gate-fork.mjs` | `forkGate(state, rules, branches)` |
| `transition-chain.mjs` | `DPT_FRAMEWORK/engine/transition-chain.mjs` | `loadChain, resolveTransition` |
| `workflow-chain.mjs` | `DPT_FRAMEWORK/engine/workflow-chain.mjs` | `createWorkflowRuntime, assessNode, readMarkdownFile, resolveDependencyClosure` |
| `ask-next.mjs` | `DPT_FRAMEWORK/engine/ask-next.mjs` | `resolveNodeTransitionDetailed` |
| `consistency-validator.mjs` | `DPT_FRAMEWORK/engine/consistency-validator.mjs` | `validateWorkflowPackage` |
| `logger.mjs` | `DPT_FRAMEWORK/engine/logger.mjs` | `createLogger, logToRun, createRunLogger, readBundleName` |

### 3.3 可用 Experiment 工具

| 工具 | 路径 | 用途 |
|------|------|------|
| `new-disposable-bundle.mjs` | `experiments_env/shared/new-disposable-bundle.mjs` | 创建 disposable experiment bundle (dpt_disp_*) |
| `wff-playbook-utils.mjs` | `experiments_env/shared/wff-playbook-utils.mjs` | `recordCheck(tracePath, {gate, passed, expected?, detail?})`, `verdict(tracePath, mode?)`, `cleanup(bundlePath)` |
| `extract-field.mjs` | `experiments_env/shared/extract-field.mjs` | 从 stdin JSON 提取 dot-path 字段（用于解析 gate CLI 输出） |

### 3.4 Research Styles

`DPT_FRAMEWORK/schema/research-styles/`:
- `debug.json` — 最小/profile，count floor = 1。实验专用。
- `quick_factual.json`, `exploratory_map.json`, `claim_verification.json` — 生产用

### 3.5 关键发现：`_subagents/` vs `_cache/` 是两条独立路径

- `subagent-relay.mjs` 管理 `_subagents/wave_NN/slot_MM/`：task.md, result.schema.json, _status.json, runtime-receipt.jsonl, result.json（relay engine 的 slot 管理状态）
- Sub-agent 在执行中写 `_cache/waveN/{batch}/{topic}/sNN_{source}/`：websearch.json, page.md, meta.json（Sub-agent 的工作产出）
- 两者独立。`complete()` 需要检查的是 `_cache/`（证明 Sub-agent 实际执行了搜索），不是 `_subagents/`（只证明 relay engine 创建了 slot）

### 3.6 关键发现：Queue x Relay 集成未实现

`guidelines/agentic-subagent-mechanism.md` lines 38-39 明确标注：task card → relay slot 映射、collect → complete 握手协议、`operate-relay.mjs` CLI wrapper 均未实现。

这意味着集成实验中，Phase Agent（coding agent）需要手动桥接 queue 和 relay：从 queue claim task → 读 task card → 手动 spawn sub-agent（Agent tool）→ Sub-agent 工作完 → 手动 complete。

**这恰好是实验的价值所在**——在集成代码不存在时，用实验模拟真实流程，证明手动桥接能走通，为后续自动化提供参考。

---

## 4. 设计演进过程

### 第一轮：单实验方案

最初只设计了一个 case-12，覆盖 wave0 real agent intake。用户指出：
1. 应该多设计几个实验，不是只有一个
2. 缺乏模拟 wave0/1/2 任务排队的实验
3. 应该直接利用 Node 现成基础设施

### 第二轮：实验家族 + controller 策略选择

设计了 6 个实验（case-12 到 case-17），分为 Engine 层和 Agent 层。用户确认：
- **controller 策略选 A**：task card 模板 `controller` 从 `"main-agent"` 改为 `"sub-agent"`（搜索类 task）
- **长期防御选 C**：规则 ID 快照，最轻量
- **范围 wave0 + wave1**

### 第三轮：CLI 优先审查

用户强调实验要"完全利用 DPT_FRAMEWORK 里面的资源，尤其是 Node"，这样实验和实际的距离只在"受控 vs 真实"。

做了完整的 DPT_FRAMEWORK 资源清点（§3），重新审查每个实验 step：
- 列出 17 个可用 CLI + 3 个 experiment 工具
- 识别只有 2 个 gap 需要 inline `.mjs`（写 topic_registry、调用 verdict）
- 每个实验 inline 代码 < 20 行

### 第四轮（当前）：完整设计文档

将所有上下文、推敲过程、资源审查、详细设计写入本文档，供另一个 Agent review。

---

## 5. 实验家族总览

```
experiments_playbook/exp_ref_integrity/
  case-11-light-ref-integrity-checks.md        ← 已有，保留为快速 smoke test
  case-12-heavy-wave0-real-agent-intake.md     ← 新增
  case-13-standard-wave0-count-floor-refill.md ← 新增
  case-14-heavy-wave1-real-agent-deepening.md  ← 新增
  case-15-standard-wave0-wave1-pipeline.md     ← 新增
  case-16-light-complete-cache-rejection.md    ← 新增（Engine 层，替代 case-11 A/B）
  case-17-light-gate-content-dedup.md          ← 新增（Engine 层，替代 case-11 C/D）
```

### 分类

| 层 | 实验 | weight | 需要 Agent? | 验证什么 |
|----|------|--------|------------|---------|
| Engine | case-16 | light | 否 | `complete()` cache trail 检查的 4 种边界 |
| Engine | case-17 | light | 否 | gate `content_dedup` 拦截 5 种造假 |
| Agent | case-12 | heavy | 是（Sub-agent） | wave0 单 topic 真实 intake 全链路 |
| Agent | case-13 | standard | 是（Sub-agent） | wave0 count floor fail→repair→pass 循环 |
| Agent | case-14 | heavy | 是（Sub-agent） | wave1 真实 deepening 全链路 |
| Agent | case-15 | standard | 是（Sub-agent） | wave0→wave1 连续流水线 |

### 与 case-11 的关系

- case-16 替代 case-11 的 A/B（cache rejection）：边界更完整（4 种 vs 2 种）
- case-17 替代 case-11 的 C/D（content dedup）：造假类型更全（5 种 vs 2 种）
- case-11 保留为快速 smoke test，但不作为修复完成的证据
- case-12/13/14/15 是 case-11 完全没有覆盖的：真实 Agent 执行 + 多 wave 流水线

---

## 6. case-12-heavy-wave0-real-agent-intake

### 证明目标

1 个 topic，真实 Sub-agent 做 WebSearch→WebFetch→写 `_cache/`→写产出文件，`complete()` 接受，gate 放行。

验证三个事实：
- Phase Agent spawn 了 Sub-agent（而不是自己做搜索）
- `_cache/` 里有真实的搜索痕迹（websearch.json + page.md + meta.json）
- gate 接受真实产出（content_dedup 放行不同内容）

### Framework 资源使用

```
Step 1: 创建 bundle + 配置环境
  CLI: experiments_env/shared/new-disposable-bundle.mjs ref_integrity_12
    → 产出 dpt_disp_ref_integrity_12_<hex>/
    → 默认 current_gate=setup_ready, topic_registry=[]
  
  CLI: DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle "$B" --style debug
    → 写 research_style_params 到 rb_profile.yaml（count floor=1）
  
  CLI: DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl1_recorded
  CLI: DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to setup_ready
  CLI: DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to seed_topics_ready
    → current_gate=seed_topics_ready, next_gate=wave0_complete
  
  inline (5行): 写 1-topic registry 到 rb_plan.md
    import { readFileSync, writeFileSync } from 'fs';
    import { parse as parseYaml } from 'yaml';
    import { join } from 'path';
    const B = process.env.B;
    let plan = readFileSync(join(B, 'rb_plan.md'), 'utf-8');
    plan = plan.replace('topic_registry: []',
      'topic_registry:\n  - id: "01"\n    slug: "01_test_topic"\n    title: "Test Topic"');
    writeFileSync(join(B, 'rb_plan.md'), plan);

Step 2: Phase Agent 派生 task card + enqueue
  Agent 动作: coding agent 读取 DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md §3.1
    → 理解 task card 模板结构
    → 将 {topic.slug} 替换为 "01_test_topic"，{topic.title} 替换为 "Test Topic"
    → controller 字段应为 "sub-agent"（修复后）
    → 写 JSON 到 /tmp/exp12_task.json
  
  CLI: operate-queue.mjs enqueue "$B" --task /tmp/exp12_task.json
    → 验证: extract-field.mjs ok → true

Step 3: claim task
  CLI: operate-queue.mjs claim "$B" --actor sub-agent
    → 验证 claim 成功（controller="sub-agent" 匹配 --actor sub-agent）
    → 验证: extract-field.mjs item.work_id → "wave0-source-01_test_topic"
    → 验证: extract-field.mjs advice.delegates_required → true

Step 4: spawn Sub-agent（真实 Agent 工作——这是 heavy 的原因）
  Agent 动作: coding agent 读取 task card 的 action 字段（长文本指令）
    → 理解 Sub-agent 应该做什么（WebSearch → WebFetch → 写 _cache/ → 写产出文件）
    → 使用 Agent tool spawn dpt-source-intake sub-agent
    → Sub-agent prompt 包含 action 文本 + cache 路径公式 + 产出文件规格
  
  Sub-agent 执行:
    1. WebSearch "Test Topic" → 搜索结果
    2. 选 1 个高质量结果 → WebFetch 页面内容
    3. 写 _cache/wave0/primary/01_test_topic/s01_test_source/websearch.json
    4. 写 _cache/wave0/primary/01_test_topic/s01_test_source/page.md
    5. 写 _cache/wave0/primary/01_test_topic/s01_test_source/meta.json
       (11 字段: url, title, source_domain, source_name, fetched_at, fetch_method,
        fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status)
    6. 写 artifacts/wave0/01_test_topic/source.yaml
       (ReferenceMetadataArray: [{url, title, retrieved_date, topic_tag}])
    7. 写 reference/00-shared-test-source.md
       (5 段: Key Facts, Core Content Capture, Relevance, Quotable Terms, Risks)

Step 5: complete task
  Agent 动作: 写 result JSON 到 /tmp/exp12_result.json
    {
      "work_id": "wave0-source-01_test_topic",
      "receipt": "file:artifacts/wave0/01_test_topic/source.yaml",
      "summary": "real sub-agent intake completed",
      "writes": ["artifacts/wave0/01_test_topic/source.yaml",
                 "reference/00-shared-test-source.md"]
    }
  
  CLI: operate-queue.mjs complete "$B" --result /tmp/exp12_result.json
    → 验证: extract-field.mjs feedback.passed → true
    → 内部: complete() 检查 _cache/wave0/primary/01_test_topic/s01_*/ 
      有 websearch.json + page.md + meta.json → 通过

Step 6: gate check
  CLI: check-gate-wave0-complete.mjs --bundle "$B" \
         --current-node phases/phase-wave0.md
    → 验证: extract-field.mjs check.passed → true
    → 内部: content_dedup 检查 → 只有 1 个 ref，无重复 → 通过
    → 其他规则: file_exists, count_floor, schema_valid → 通过

Step 7: 补充验证（用 inspect CLIs）
  CLI: inspect-wave0-output.mjs --bundle "$B"
    → 验证: reference/ 无子目录、文件名格式正确、source.yaml 是有效 YAML 数组
  
  CLI: inspect-bundle.mjs "$B" --summary
    → 验证: gate 事件显示 PASS

Step 8: trace 裁决
  inline: 从 rb_trace.jsonl 读取所有 check 事件 → 计数 passed/expected
  使用 experiments_env/shared/wff-playbook-utils.mjs:
    import { recordCheck, verdict, cleanup } from '...'
    recordCheck(tracePath, { gate: 'wave0-real-intake', passed: true,
      detail: '完整链路: Sub-agent spawn → _cache trail → complete → gate pass' })
    verdict(tracePath, 'all')
    cleanup(bundlePath)  // PASS 才执行
```

### 关键验证点

1. `claim --actor sub-agent` 成功 → controller 校验生效
2. `advice.delegates_required === true` → Engine 正确识别了 delegated task
3. Sub-agent 实际写入了 `_cache/wave0/primary/01_test_topic/s01_*/` 下的 3 个文件
4. `complete()` 检查 cache trail → passed
5. gate `content_dedup` 放行 → 1 个真实 ref 不触发重复检测
6. `inspect-wave0-output.mjs` 结构 lint → 通过

### 可能失败的场景（需要记录为 expected: false）

- 如果 Sub-agent 超时（600s），实验失败但不是机制问题 → 需分析 trace
- 如果 WebSearch 返回空（网络问题），Sub-agent 无法产出 → 需分析 trace
- 如果 Sub-agent 写的 source.yaml schema 不合法 → gate schema_valid 失败 → 需修复 Sub-agent prompt

---

## 7. case-13-standard-wave0-count-floor-refill

### 证明目标

首轮 intake 产出不足 count floor → gate count_floor 失败 → enqueue supplement task（P1 修复优先级）→ Sub-agent 补充搜索 → gate 通过。

验证完整的 fail→repair→pass 循环。

### Framework 资源使用

```
Step 1-3: 同 case-12（创建 bundle、配置、enqueue primary task、claim、Sub-agent 执行）
  区别：Sub-agent 只产出 1 个 source（style=debug 的 floor=1，但我们可以用
  --style exploratory_map 让 floor≥2，或者手动改 rb_profile.yaml）
  
  建议做法：apply-research-style --style debug 然后手动改 floor=2
  inline (3行): 读 rb_profile.yaml，改 wave0_shared_ref_total=2，写回

Step 4: complete primary task
  CLI: operate-queue.mjs complete "$B" --result /tmp/exp13_primary_result.json
    → 验证 passed=true（产出文件存在）

Step 5: gate check（预期 FAIL）
  CLI: check-gate-wave0-complete.mjs --bundle "$B" \
         --current-node phases/phase-wave0.md
    → 验证: extract-field.mjs check.passed → false
    → 验证: inspect[] 包含 count_floor 不足的诊断信息
  
  CLI: log-event.mjs --bundle "$B" --event check \
    --detail '{"gate":"wave0-complete-round1","passed":false,"expected":false,
               "detail":"count floor 不足，预期触发 supplement"}'

Step 6: enqueue supplement task
  Agent 动作: 读 phase-wave0.md §3.3.1 supplement template
    → 填充 task card（priority_class: P1_state_or_gate_repair,
       required_receipts: [], completion_receipt: null）
    → 写 /tmp/exp13_suppl_task.json
  
  CLI: operate-queue.mjs enqueue "$B" --task /tmp/exp13_suppl_task.json

Step 7: claim + Sub-agent 补充搜索
  CLI: operate-queue.mjs claim "$B" --actor sub-agent
  Agent 动作: spawn Sub-agent → 补充搜索 → 产出第 2 个 source
    追加到现有 source.yaml（不是覆盖）

Step 8: complete supplement + gate re-check
  CLI: operate-queue.mjs complete "$B" --result /tmp/exp13_suppl_result.json
  CLI: check-gate-wave0-complete.mjs --bundle "$B" \
         --current-node phases/phase-wave0.md
    → 验证: extract-field.mjs check.passed → true
  
  CLI: log-event.mjs --bundle "$B" --event check \
    --detail '{"gate":"wave0-complete-round2","passed":true,
               "detail":"supplement 后 count floor 满足"}'

Step 9: trace 裁决 + cleanup
  同 case-12
```

### 关键验证点

1. 首轮 gate check.passed = false（count floor 不足）
2. gate inspect[] 包含诊断信息（哪个规则失败、缺多少）
3. supplement task 的 priority_class = P1_state_or_gate_repair
4. 补充轮后 gate check.passed = true
5. trace 记录了完整的 pass→fail→repair→pass 事件序列

---

## 8. case-14-heavy-wave1-real-agent-deepening

### 证明目标

wave1 deepening 阶段，Sub-agent（dpt-evidence-extractor）做 deepening 搜索，产出 evidence-summary.md + question-list.md（配对 artifact）+ per-topic reference，gate 放行。

验证 wave1 的 `_cache/` trail、配对产出、跨文件一致性。

### Framework 资源使用

```
Step 1: 创建 bundle + 配置 wave1-ready 环境
  CLI: new-disposable-bundle.mjs ref_integrity_14
  CLI: apply-research-style.mjs --style debug
  CLI: advance-status.mjs --to hitl1_recorded
  CLI: advance-status.mjs --to setup_ready
  CLI: advance-status.mjs --to seed_topics_ready
  CLI: advance-status.mjs --to wave0_complete
    → current_gate=wave0_complete, next_gate=wave1_complete
  
  inline: 写 1-topic registry
  Agent 动作: 预置 wave0 产出（wave1 依赖这些文件）
    → 写 artifacts/wave0/01_test_topic/source.yaml（至少 1 条 source）
    → 写 reference/00-shared-test-source.md（wave0 shared ref）
    → 写 reference/_INDEX.md（含 wave0 条目）
  
  CLI: validate-bundle.mjs "$B"  // 验证预置文件 schema 正确

Step 2: Phase Agent 派生 wave1 task card + enqueue
  Agent 动作: 读 phase-wave1.md §3.1
    → controller: "sub-agent"
    → role_key: "dpt-evidence-extractor"（不同于 wave0 的 dpt-source-intake）
    → required_receipts: evidence-summary.md + question-list.md（配对）
    → 写 /tmp/exp14_task.json
  
  CLI: operate-queue.mjs enqueue "$B" --task /tmp/exp14_task.json

Step 3: claim + Sub-agent deepening
  CLI: operate-queue.mjs claim "$B" --actor sub-agent
  Agent 动作: spawn dpt-evidence-extractor sub-agent
  Sub-agent 执行:
    1. 读取 artifacts/wave0/{slug}/source.yaml 了解已有 source
    2. WebSearch deepening → WebFetch 新来源
    3. 写 _cache/wave1/primary/01_test_topic/s01_deep_source/websearch.json
    4. 写 _cache/wave1/primary/01_test_topic/s01_deep_source/page.md
    5. 写 _cache/wave1/primary/01_test_topic/s01_deep_source/meta.json
    6. 写 artifacts/wave1/01_test_topic/evidence-summary.md
       (Key Findings + Evidence Map + Counter-Claims + Open Questions)
    7. 写 artifacts/wave1/01_test_topic/question-list.md
       (4 sections: Verified, Uncertain, Contradictory, Unexplored)
    8. 写 reference/01_test_topic-deep-source.md（per-topic ref）

Step 4: complete + gate check
  CLI: operate-queue.mjs complete "$B" --result /tmp/exp14_result.json
  CLI: check-gate-wave1-complete.mjs --bundle "$B" \
         --current-node phases/phase-wave1.md
    → 验证: check.passed = true
    → 验证: content_dedup 检查 wave1 reference
    → 验证: question_list_has_four_sections
    → 验证: key_findings_non_empty

Step 5: 补充验证
  CLI: inspect-wave1-output.mjs --bundle "$B"
    → 验证: evidence-summary.md + question-list.md 配对存在
    → 验证: reference/{topic}-*.md 文件名格式正确
    → 验证: _INDEX.md 有 wave1_topic 条目

Step 6: trace 裁决 + cleanup
  同 case-12
```

### 与 case-12 的关键区别

- 不同的 sub-agent role：dpt-evidence-extractor（不是 dpt-source-intake）
- 配对 artifact：evidence-summary.md + question-list.md（不是 source.yaml）
- 不同的 cache 路径：`_cache/wave1/primary/`（不是 wave0）
- 依赖 wave0 产出：必须先有 wave0 的 source.yaml 和 shared ref
- 不同的 gate：check-gate-wave1-complete（不是 wave0）
- question-list 4-section 结构验证

---

## 9. case-15-standard-wave0-wave1-pipeline

### 证明目标

同一 topic 连续通过 wave0 → wave1，状态正确推进（seed_topics_ready → wave0_complete → wave1_complete），两级 `_cache/` 均存在且不互相覆盖。

这是最接近生产实际的实验——完整的两 wave 流水线。

### Framework 资源使用

```
Step 1: 创建 bundle + 配置
  CLI: new-disposable-bundle.mjs ref_integrity_15
  CLI: apply-research-style.mjs --style debug
  CLI: advance-status.mjs --to hitl1_recorded → setup_ready → seed_topics_ready
  inline: 写 1-topic registry

# ============ Wave0 ============
Step 2: wave0 全流程（同 case-12 Steps 2-5）
  - Phase Agent 派生 wave0 task card
  - enqueue → claim → Sub-agent (dpt-source-intake) → complete

Step 3: wave0 gate check + 状态推进
  CLI: check-gate-wave0-complete.mjs → PASS
  CLI: advance-status.mjs --bundle "$B" --to wave0_complete
    → current_gate=wave0_complete, next_gate=wave1_complete
  CLI: log-event.mjs --event check \
    --detail '{"gate":"status-wave0-complete","passed":true}'

Step 4: 验证 wave0 _cache/ 存在
  inline (3行): 
    const cacheDir = join(B, '_cache/wave0/primary/01_test_topic');
    const hasCache = existsSync(cacheDir) && readdirSync(cacheDir).length > 0;
    // 至少有一个 sNN_*/ 子目录
  CLI: log-event.mjs --event check \
    --detail "{\"gate\":\"cache-wave0-exists\",\"passed\":$hasCache}"

# ============ Wave1 ============
Step 5: wave1 全流程（同 case-14 Steps 2-4）
  - Phase Agent 派生 wave1 task card
  - enqueue → claim → Sub-agent (dpt-evidence-extractor) → complete
  - gate check

Step 6: wave1 gate check + 状态推进
  CLI: check-gate-wave1-complete.mjs → PASS
  CLI: advance-status.mjs --bundle "$B" --to wave1_complete
  CLI: log-event.mjs --event check \
    --detail '{"gate":"status-wave1-complete","passed":true}'

Step 7: 验证两级 cache 不互相覆盖
  inline (5行):
    const wave0Cache = join(B, '_cache/wave0/primary/01_test_topic');
    const wave1Cache = join(B, '_cache/wave1/primary/01_test_topic');
    const wave0Intact = existsSync(wave0Cache) && readdirSync(wave0Cache).length > 0;
    const wave1Exists = existsSync(wave1Cache) && readdirSync(wave1Cache).length > 0;
    const noOverlap = !wave0Cache.startsWith(wave1Cache) && !wave1Cache.startsWith(wave0Cache);
  CLI: log-event.mjs --event check \
    --detail "{\"gate\":\"cache-wave0-intact\",\"passed\":$wave0Intact}"
  CLI: log-event.mjs --event check \
    --detail "{\"gate\":\"cache-wave1-exists\",\"passed\":$wave1Exists}"

Step 8: trace 裁决 + cleanup
  同 case-12
```

### 关键验证点

1. `advance-status.mjs` 正确推进了两次（wave0_complete → wave1_complete）
2. wave0 `_cache/` 在 wave1 执行后仍然完整（不被覆盖）
3. wave1 `_cache/` 使用不同的路径前缀（`wave1/` vs `wave0/`）
4. 两个 gate 都通过
5. trace 中 wave0 和 wave1 的 gate_attempt 事件都有

---

## 10. case-16-light-complete-cache-rejection

### 证明目标

`complete()` 对 delegated task（`targets.delegates.to: "sub-agent"`）强制检查 `_cache/` trail，四种缺失都拒绝。

**无需 Agent**——全部 fixture + CLI。属于 Engine 层确定性 checkpoint 实验。

### 四种边界场景

| 场景 | _cache/ 状态 | complete() 预期 | 边界类型 |
|------|-------------|----------------|---------|
| A | `_cache/wave0/primary/{slug}/` 目录完全不存在 | FAIL (passed=false, expected=false) | 最极端缺失 |
| B | 目录存在但无 `sNN_*/` 子目录（空 topic 目录） | FAIL (passed=false, expected=false) | Sub-agent 被跳过 |
| C | 有 `sNN_*/` 子目录但缺 `meta.json` | FAIL (passed=false, expected=false) | Sub-agent 部分执行 |
| D | 完整的 `websearch.json` + `page.md` + `meta.json` | PASS (passed=true) | 正常路径 |

### Framework 资源使用

```
Step 1: 创建 bundle + 配置
  CLI: new-disposable-bundle.mjs ref_integrity_16
  inline: 写 1-topic registry
  # 不需要 advance-status（只测 complete()，不跑 gate）

Step 2: enqueue + claim
  Agent: 写 task card JSON（delegates.to: "sub-agent"）
  CLI: operate-queue.mjs enqueue "$B" --task /tmp/exp16_task.json
  CLI: operate-queue.mjs claim "$B" --actor sub-agent

Step 3: 场景 A — _cache/ 目录完全不存在
  Agent: 写产出文件（source.yaml + shared ref）到正确位置
  确认 _cache/wave0/primary/01_test_topic/ 不存在
  
  CLI: operate-queue.mjs complete "$B" --result /tmp/exp16_result_a.json
    → 验证: extract-field.mjs feedback.passed → false
  CLI: log-event.mjs --event check \
    --detail '{"gate":"cache-missing-dir","passed":false,"expected":false,
               "detail":"_cache/wave0/primary/{slug}/ 目录完全不存在"}'

Step 4: 场景 B — _cache/ 存在但空目录
  Agent: mkdir -p _cache/wave0/primary/01_test_topic/
  # 不创建 sNN_*/ 子目录
  CLI: operate-queue.mjs complete "$B" --result /tmp/exp16_result_b.json
    → 验证: feedback.passed → false
  CLI: log-event.mjs --event check \
    --detail '{"gate":"cache-empty-topic-dir","passed":false,"expected":false}'

Step 5: 场景 C — 有 sNN_*/ 但缺 meta.json
  Agent: mkdir -p _cache/wave0/primary/01_test_topic/s01_test/
  Agent: 写 websearch.json + page.md（不写 meta.json）
  CLI: operate-queue.mjs complete
    → 验证: feedback.passed → false
  CLI: log-event.mjs --event check \
    --detail '{"gate":"cache-missing-meta","passed":false,"expected":false}'

Step 6: 场景 D — 完整 cache trail
  Agent: 写 meta.json（11 字段完整）
  CLI: operate-queue.mjs complete
    → 验证: feedback.passed → true
  CLI: log-event.mjs --event check \
    --detail '{"gate":"cache-complete","passed":true}'

Step 7: verdict + cleanup
  CLI: wff-playbook-utils.mjs verdict() → 4 checks, 全部 matched
  CLI: wff-playbook-utils.mjs cleanup()
```

### 比 case-11 场景 A/B 的改进

- 4 种边界 → 更接近真实可能出现的缺失状态
- 每种边界独立 trace check → 失败时精确定位哪个边界没拦住
- 不依赖 gate check（只测 complete() 本身）

---

## 11. case-17-light-gate-content-dedup

### 证明目标

gate `content_dedup` 拦截多种造假模式。**无需 Agent**——全部 fixture + CLI。

### 五种造假类型（对应 Bug #001 的实际造假模式）

| 场景 | 造假类型 | 检测机制 | 预期 |
|------|---------|---------|------|
| A | 3 个 ref 的 source_url 完全相同 | URL 去重 | FAIL (expected=false) |
| B | 3 个 ref 不同 URL 但 Key Facts 逐字相同（clone） | Jaccard ≥ 0.8 | FAIL (expected=false) |
| C | 2 个 ref 的 source_url 是域名首页（无具体文章路径） | pattern_match（首页 URL） | FAIL (expected=false) |
| D | 2 个 ref 的 Key Facts 是自指语言 | pattern_match（自指检测） | FAIL (expected=false) |
| E | 2 个真实的不同参考文件 | 无重复 | PASS |

### Framework 资源使用

```
Step 1: 创建 bundle + 配置
  CLI: new-disposable-bundle.mjs ref_integrity_17
  CLI: apply-research-style.mjs --style debug
  inline: 写 1-topic registry
  Agent: 预置 source.yaml（至少 1 条 source，满足 count_floor）
  Agent: 写 reference/README.md
  # current_gate 保持 setup_ready → seed_topics_ready（模拟 hitl1+setup+seed-topics 完成）
  CLI: advance-status.mjs --to hitl1_recorded
  CLI: advance-status.mjs --to setup_ready
  CLI: advance-status.mjs --to seed_topics_ready

Step 2: 场景 A — source_url 重复
  Agent: 写 3 个 reference/00-shared-*.md
    - 00-shared-ref-a.md: source_url = "https://www.chinanews.com.cn/sh/2024/01-01/10138674.shtml"
    - 00-shared-ref-b.md: source_url = "https://www.chinanews.com.cn/sh/2024/01-01/10138674.shtml"  ← 相同
    - 00-shared-ref-c.md: source_url = "https://www.chinanews.com.cn/sh/2024/01-01/10138674.shtml"  ← 相同
    三个文件 Key Facts 不同（模拟"不同文件名但引用同一 URL"）
  
  Agent: 写 reference/_INDEX.md（含 3 个条目）
  CLI: check-gate-wave0-complete.mjs --bundle "$B" \
         --current-node phases/phase-wave0.md
    → 验证: extract-field.mjs check.passed → false
  CLI: log-event.mjs --event check \
    --detail '{"gate":"dedup-url-duplicate","passed":false,"expected":false}'

Step 3: 场景 B — Key Facts 逐字相同（clone）
  Agent: 删除场景 A 的 3 个 ref
  Agent: 写 3 个新 ref，不同 URL 但 Key Facts 段落完全相同
    - 00-shared-ref-a.md: URL A, Key Facts = "1. 年轻人消费平替趋势明显\n2. 国潮品牌..."
    - 00-shared-ref-b.md: URL B, Key Facts = "1. 年轻人消费平替趋势明显\n2. 国潮品牌..." ← 相同
    - 00-shared-ref-c.md: URL C, Key Facts = "1. 年轻人消费平替趋势明显\n2. 国潮品牌..." ← 相同
  
  CLI: check-gate-wave0-complete.mjs → 验证 check.passed = false
  CLI: log-event.mjs --event check \
    --detail '{"gate":"dedup-content-clone","passed":false,"expected":false}'

Step 4: 场景 C — 首页 URL
  Agent: 删除场景 B 的 3 个 ref
  Agent: 写 2 个 ref，source_url 只有域名根
    - source_url: "https://www.chinanews.com.cn/"（无 /sh/2024/... 路径）
    - source_url: "https://www.example.com/"（无路径）
  
  CLI: check-gate-wave0-complete.mjs → 验证 check.passed = false
  CLI: log-event.mjs --event check \
    --detail '{"gate":"dedup-root-url","passed":false,"expected":false}'

Step 5: 场景 D — 自指语言
  Agent: 删除场景 C 的 2 个 ref
  Agent: 写 2 个 ref，Key Facts 描述文件自身
    - Key Facts: "This reference supplements the wave0 intake..."
    - Key Facts: "This document provides cross-topic context..."
  
  CLI: check-gate-wave0-complete.mjs → 验证 check.passed = false
  CLI: log-event.mjs --event check \
    --detail '{"gate":"dedup-self-referential","passed":false,"expected":false}'

Step 6: 场景 E — 真实的不同 reference
  Agent: 删除场景 D 的 2 个 ref
  Agent: 写 2 个真实的不同 ref（不同 URL + 不同中文 Key Facts）
  
  CLI: check-gate-wave0-complete.mjs → 验证 check.passed = true
  CLI: log-event.mjs --event check \
    --detail '{"gate":"dedup-real-content","passed":true}'

Step 7: verdict + cleanup
  CLI: wff-playbook-utils.mjs verdict() → 5 checks, all matched
  CLI: wff-playbook-utils.mjs cleanup()
```

### 比 case-11 场景 C/D 的改进

- 5 种造假类型独立验证（不只是"2 个假 vs 2 个真"）
- 涵盖 Bug #001 的实际造假模式：URL 重复、内容克隆、首页 URL、自指语言
- 每个场景独立 trace check → 失败时精确定位哪个检测机制没拦住

---

## 12. 长期防御：Schema 版本快照

### 目标

如果 gate definition 或 task card 模板的关键字段被修改（删掉 `content_dedup` 规则、把 `controller` 改回 `"main-agent"`），CI 检查直接失败。

### 方案：规则 ID 快照（选 C，最轻量）

在 `DPT_FRAMEWORK/cli/validate-bundle.mjs` 末尾加一个 section（或新建 `DPT_FRAMEWORK/cli/validate-gate-definitions.mjs`）：

```js
// gate definition 必须包含的规则 ID
const REQUIRED_GATE_RULES = {
  'wave0-complete': ['content_dedup'],
  'wave1-complete': ['content_dedup'],
};

function checkRequiredGateRules(gateDefsDir) {
  const missing = [];
  for (const [gateKey, requiredIds] of Object.entries(REQUIRED_GATE_RULES)) {
    const defPath = join(gateDefsDir, `gate-${gateKey}.definition.json`);
    if (!existsSync(defPath)) {
      missing.push(`${gateKey}: 定义文件缺失`);
      continue;
    }
    const def = JSON.parse(readFileSync(defPath, 'utf-8'));
    for (const id of requiredIds) {
      if (!def.rules.some(r => r.id === id)) {
        missing.push(`${gateKey}: 缺少规则 ${id}`);
      }
    }
  }
  return missing;
}
```

### task card 模板字段检查

新建 `DPT_FRAMEWORK/cli/validate-phase-templates.mjs`：

```js
// 解析 phase-wave0/1/2.md 的 §3.1 task card 模板
// 验证关键字段

const REQUIRED_TASK_CARD_FIELDS = {
  'targets.controller': 'sub-agent',       // 搜索类 task
  'targets.delegates.to': 'sub-agent',
  'targets.delegates.role_key': /.+/,      // 非空
};
```

解析逻辑：
1. 读取每个 phase doc 的 Markdown
2. 找到 §3.1（和 §3.3.1/§3.3.2 补充模板）中的 JSON code block
3. JSON.parse 验证字段值
4. 不匹配 → 退出码 1

### CI 集成

两个检查都加到 `validate-bundle.mjs` 的调用链中（或被更高层 runner 串联调用）。任何检查失败 = CI 失败。

---

## 13. 实施顺序

```
Phase 1: 实现修复（case-11 测试的东西必须先存在于代码中）
  ├── content_dedup: 5 函数 in gate-helpers.mjs
  │   (parseReferenceMetadata, extractSection, jaccardSimilarity,
  │    tokenizeForSimilarity, checkContentDedup)
  ├── gate definition JSON 更新: wave0/1-complete 加 content_dedup 规则
  ├── gate CLI 更新: check-gate-wave0/1-complete.mjs 加 content_dedup dispatch
  ├── complete() cache check: queue-manager.mjs complete() 加 _cache/ trail 验证
  ├── Task card 模板: phase-wave0/1/2.md 搜索类 task controller → "sub-agent"
  └── operate-queue claim: --actor sub-agent + controller 匹配校验

Phase 2: 实现长期防御
  ├── validate-bundle.mjs 加 required gate rule ID 检查
  └── 新建 validate-phase-templates.mjs

Phase 3: 执行 Engine 层实验（无需 Agent，快速迭代）
  ├── case-16-light-complete-cache-rejection
  └── case-17-light-gate-content-dedup

Phase 4: 执行 Agent 层实验（需要真实 Agent + 网络）
  ├── case-12-heavy-wave0-real-agent-intake
  ├── case-13-standard-wave0-count-floor-refill
  ├── case-14-heavy-wave1-real-agent-deepening
  └── case-15-standard-wave0-wave1-pipeline
```

---

## 14. 关键设计决策与权衡

### 决策 1: controller = "sub-agent"

**选择**：task card 模板中搜索类 task 的 `controller` 从 `"main-agent"` 改为 `"sub-agent"`。

**理由**：从根源上堵住 Bug #002——Phase Agent 不能 claim 搜索 task（`--actor main-agent` 会被 controller 校验拒绝）。Phase Agent 必须 spawn Sub-agent。

**权衡**：Phase Agent 失去了"自己做搜索"的灵活性。但如果 Phase Agent 需要自己做搜索（比如 debugging），应该用不带 `delegates.to` 的 task card。这是正确的关注点分离。

### 决策 2: 两层实验（Engine + Agent）

**Engine 层（light，无 Agent）**：快速验证 CLI/Engine 的确定性逻辑。case-16（cache 拒绝）+ case-17（content_dedup）。
- 优点：快速、可重复、不受网络影响
- 局限：不测试 Agent 决策路径

**Agent 层（heavy，真实 Sub-agent）**：验证完整链路，包括 Agent 决策、WebSearch/WebFetch、实际文件产出。
- 优点：接近生产实际
- 局限：慢、依赖网络、Sub-agent 质量不可控

### 决策 3: debug research style

所有实验用 `apply-research-style.mjs --style debug`（count floor=1）。

**理由**：降低实验复杂度。实验验证的是"机制是否正确"，不是"count floor 是否合理"。count floor 的合理性是另一个维度的问题（Bug #001 剩余风险 1）。

case-13 是例外——它专门测试 count floor 补充循环，所以需要手动设 floor=2。

### 决策 4: CLI 优先，inline 最小化

每个实验的 inline `.mjs` < 20 行，只做 CLI 没覆盖的事：
- 写 topic_registry（5 行）
- cache 存在性验证（3-5 行）
- 调用 verdict() + cleanup()（3 行）

**理由**：inline 代码越少，实验和生产的距离越小。生产环境 Phase Agent 不写 inline `.mjs`，它调 CLI。

### 决策 5: 独立 trace event 每场景

每个验证点独立 `log-event.mjs --event check`，不合并。

**理由**：
- 失败时精确定位哪个边界/造假类型没拦住
- 裁决清晰可审计
- 符合 `command-experiments.md` §"Runtime artifact checks are verdict checks"

### 决策 6: 不测 wave2（当前范围）

wave2 的跨 topic synthesis 复杂度高于 wave0/1 source intake。当前优先验证 source intake + deepening 的完整性（Bug #001/#002 的核心场景）。wave2 实验后续补充。

---

## 15. 待 Review 确认的问题

1. **task card 模板中哪些 task 改 controller？**
   - 明确：所有带 `delegates.to: "sub-agent"` 的搜索类 task → controller 改为 `"sub-agent"`
   - 保留 `controller: "main-agent"` 的：synthesis task（wave2）、backfill task（wave2）、Queue repair task
   - 是否正确？

2. **`complete()` cache check 的精确逻辑？**
   - 检查 `_cache/{wave}/{batch}/{topic}/` 下至少有一个 `sNN_*/` 子目录
   - 每个 `sNN_*/` 下必须有 `websearch.json` + `page.md` + `meta.json`
   - 还是更宽松（有任一子目录 + 任一文件即可）？
   - `meta.json` 的 11 字段是否需要 schema 校验？

3. **`content_dedup` 的 Jaccard 阈值？**
   - Bug #001 设计用 0.8。中文 bigram + 英文 word tokenization
   - 阈值是否需要针对不同 language 调整？
   - 是否需要针对不同 reference 类型（shared vs per-topic）调整？

4. **case-15 pipeline 的范围？**
   - 当前设计：1 topic，wave0→wave1
   - 是否需要多 topic（2 topics）来验证并行排队？
   - 是否需要也覆盖 wave0 count floor re-fill + wave1？

5. **case-13 count floor refill 的触发方式？**
   - 当前设计：手动设 floor=2，Sub-agent 只产出 1 个
   - 备选：用 `operate-queue.mjs fail` 主动触发失败 → 自动生成 repair item
   - 哪种更接近生产实际？

6. **`validate-phase-templates.mjs` 的实现方式？**
   - 解析 Markdown 中的 JSON code block（需要可靠的正则/解析器）
   - 还是要求 task card 模板用特定 marker（如 `<!-- task-card-template -->`）标注？
   - 解析失败时的容错策略？

---

## 附录 A: 相关文件路径索引

| 文件 | 路径 |
|------|------|
| Bug #001 | `_backlog/bugs/001-fake-reference-files-gate-bypass.md` |
| Bug #002 | `_backlog/bugs/002-task-card-controller-allows-bypassing-subagent.md` |
| Case-11 | `experiments_playbook/exp_ref_integrity/case-11-light-ref-integrity-checks.md` |
| Experiment guideline | `guidelines/command-experiments.md` |
| Project charter | `guidelines/project-charter.md` |
| Agentic subagent mechanism | `guidelines/agentic-subagent-mechanism.md` |
| Queue manager | `DPT_FRAMEWORK/engine/queue-manager.mjs` |
| Subagent relay | `DPT_FRAMEWORK/engine/subagent-relay.mjs` |
| Gate helpers | `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` |
| Operate queue CLI | `DPT_FRAMEWORK/cli/operate-queue.mjs` |
| Gate CLIs | `DPT_FRAMEWORK/cli/gates/check-gate-wave*.mjs` |
| Gate definitions | `DPT_FRAMEWORK/schema/gate_definitions/gate-wave*.definition.json` |
| Phase docs (task card templates) | `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave*.md` |
| Anti-cheating rules | `DPT_FRAMEWORK/workflows/nodes/shared/shared-anti-cheating-rules.md` |
| Subagent protocol | `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md` |
| New disposable bundle | `experiments_env/shared/new-disposable-bundle.mjs` |
| Playbook utils | `experiments_env/shared/wff-playbook-utils.mjs` |
| Extract field | `experiments_env/shared/extract-field.mjs` |
| Research styles | `DPT_FRAMEWORK/schema/research-styles/*.json` |
| Validate bundle | `DPT_FRAMEWORK/cli/validate-bundle.mjs` |
| OpenSpec config | `openspec/config.yaml` |

## 附录 B: 设计过程中的关键对话节点

1. **初始请求**：用户让评估 case-11 是否符合 guideline、能否证明 bug 根源、能否防止复发。用户明确表示怀疑——之前修好又复发。

2. **第一轮探索**：发现 case-11 测试的两个机制在代码中都不存在。`content_dedup` 的 5 个函数未实现，`complete()` 无 cache 检查，task card 模板 controller 仍是 `"main-agent"`。

3. **用户选择 mid-term + long-term**：从评估报告中选择"中期集成实验"和"长期 schema 防御"两个方向深入。

4. **第二轮探索**：完整清点 DPT_FRAMEWORK 资源（CLI、Engine、Schema、Workflows、Templates）。发现 Queue x Relay 集成未实现，`_subagents/` 和 `_cache/` 是独立路径。

5. **用户要求多实验 + 利用框架资源**：设计从单个 case-12 扩展为 6 个实验的家族，分为 Engine 层和 Agent 层。用户确认 controller 策略选 A、防御方案选 C、范围 wave0+wave1。

6. **第三轮审查**：逐实验映射到具体 CLI 调用，识别 CLI 覆盖 gap（只有 2 个），确保 inline 代码最小化。

7. **本文档**：完整设计写入 `_backlog/plan/`，供另一个 Agent review。

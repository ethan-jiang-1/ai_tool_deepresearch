## Why

### 背景：这个系统是怎么做研究的

Deep Research Tool 是一个 agentic 研究框架。它的核心思路是：研究证据（你在网上搜到的每一篇文章、每一个来源）必须**可追溯**——谁搜的、从哪搜的、搜到了什么、为什么选这篇文章、原始页面长什么样，每一步都要有据可查。

为了保证这一点，系统设计了一条"正道"——Sub-agent relay pipeline。大概是这样的：

```
Phase Agent 接到研究任务
  → 把任务写入 queue（"请搜索 topic X 的 foundation evidence"）
  → queue 分配 slot，spawn 一个 sub-agent（dpt-source-intake）
  → sub-agent 独立做 WebSearch + WebFetch，产出 evidence 文件
  → sub-agent 把结果（搜了什么 URL、写了哪些文件、缓存了哪些页面）交还给 relay
  → relay 校验结果，写入 ledger（rb_output_declarations.jsonl）
  → gate 检查：current-wave ledger coverage + successful slot binding + accepted quality rules → pass，进入下一阶段
```

这条路径很长（10+ 步），但它保证了：**每一条放进最终报告的证据，都有完整的 provenance chain**。

### 问题：正道太难走，Agent 走了捷径

Phase Agent（LLM）在执行时，面对着两条路：

| | 正道（relay pipeline） | 捷径（直接搜索） |
|---|---|---|
| 步骤 | 10+ 步 | 3 步 |
| 依赖 | queue-manager, subagent-relay, operate-queue CLI, slot 状态机 | 无 |
| 失败概率 | 中等（任何一个依赖出问题就堵死） | 极低 |
| Gate 能区分吗？ | — | **不能**。两条路产出的文件格式一样 |

**只要捷径存在，Agent 就会走捷径。** 这不是 Agent "不听话"——这是工程设计问题：你把一条 3 步的平坦小路和一条 10 步的崎岖山路放在 LLM 面前，问它"哪条路能更快完成任务"，它当然选小路。

### 实际发生的事：一个完整的事故链

最近一次真实 run（研究主题："中国足球未来发展"）中，四个设计缺陷连成了一条完整的事故链：

**第 1 步：Queue 被污染（BUG-016）**

这个 Agent 会话之前跑过另一个研究（"医疗 AI 临床应用"）。当它为新研究（中国足球）往 queue 里灌任务时，上下文中还残留着上一个研究的 topic slug。结果 5 个 task card 里混入了 2 个医疗 AI 的 topic（`clinical-scenarios`、`challenges-and-tech-trends`）。Queue engine 不做校验——它不知道 `clinical-scenarios` 不属于"中国足球"研究——照单全收。

**第 2 步：Relay 堵死，Agent 绕路（BUG-014）**

被污染的 task card 堵塞了 relay pipeline 的唯一入口。work_id mismatch 导致所有后续操作被拒绝——不能 complete 正确的 task，也不能 claim 错误的 task。Queue 彻底不可用。

此时，Phase Agent 的静默纪律（`shared-silent-execution.md`，强制加载）告诉它："遇到阻塞 → 切换方法 → 自己解决，不要问用户"。Sub-agent 使用规则（`shared-subagent-protocol.md`）告诉它"应该用 sub-agent"——但这条规则是**可选加载**的。强制规则说"自己解决"，可选规则说"用 sub-agent"。当 queue 坏了，"自己解决"的最短路径是：**直接 WebSearch → 读结果 → 写文件**。Agent 走了这条路。

**第 3 步：Gate 拒斥了内容达标但格式不对的产出（BUG-015）**

Agent 绕过 relay 后，产出了 25 个 reference 文件，内容质量很好——有真实的搜索来源、有实质性分析。但 gate 的规则是按 relay 模板设计的：
- `key_facts_min_lines`：要求 Key Facts section 至少 5 条 bullet，但非 relay sub-agent 写的是 prose 格式
- `source_url_article_level`：要求 URL 不是首页，但非 relay sub-agent 用了搜索结果中的 URL
- `content_dedup`、`cache_coverage`、`ledger_coverage`：这些规则**完全依赖 relay 的 side effect**（ledger 文件、_cache 目录），relay 被旁路后自然全部 fail

结果：内容质量达标，但 gate 不过。Agent 被迫花大量精力修格式、手工补 ledger、手工创建 cache 目录——而不是推进到 wave2 做真正的 synthesis。

**第 4 步：诊断系统什么都看不见（BUG-017）**

事后想搞清楚发生了什么？rb_trace.jsonl 有 66 行 event，其中 65 行的 detail 是空的。run.log 有 22 分钟的空白期（Agent spawn sub-agent 做搜索的那段时间，完全没有记录）。_diagnostics/gates/ 有完整的 gate 失败细节，但 trace 里没有指向它们的引用。

**一个没看过 chat transcript 的人，打开这些 log，完全无法重建事故链。** 他不知道 queue 被污染过，不知道 Agent 绕过 relay 的决策，不知道 gate 为什么 fail 了三次才通过。

### 为什么之前两次修复没解决问题

- **BUG-006**（改 task card controller 从 `main-agent` 到 `sub-agent`）：在 queue path 上加了锁——但 Agent 可以不走 queue path。修了门锁，墙是纸糊的。
- **harden-stop-contract**（加强静默纪律）：告诉 Agent"不许停"——但没告诉 Agent"不许走捷径"。Agent 没停，只是换了一条更短的路。

两次修复的共同思路是"约束 Agent 的行为"。但根因不是 Agent 不听话——**根因是系统设计让正道比捷径难走十倍**。修复方向应该是让捷径不存在，而不是让 Agent 更听话。

### 这次要做什么

从 queue 的入口到 gate 的出口，端到端加固 relay pipeline：

1. **入口**：Queue 不再照单全收——enqueue 时校验 task card 是否真的属于当前研究
2. **路径**：让 relay 的使用规则进入强制加载路径，并用 workflow node frontmatter 的 `execution_contract` 明确"谁读这个 Markdown、谁执行搜索、搜索是否必须委托"
3. **出口**：Gate 新增 phase-aware relay provenance 检查，明确区分结构、状态、provenance 和质量诊断。Wave0/Wave1 的 evidence-producing 产出必须有本 wave 的 Engine-written output declaration coverage 和 successful current-wave slot binding；Wave2 的 synthesis/backfill 主路径不强制 spawn sub-agent，但凡新增搜索型 evidence/reference（如 gap-fill 或 `reference/00-cross-*.md`）都必须有 Wave2 relay provenance。既有 accepted specs 中的 ledger-authoritative count、cache 两阶段策略、reference countability 仍保持权威，除非本 change 明确给出对应 delta。
4. **可观测性**：Trace/log 三层打通——不用看 chat transcript 也能从记录中独立诊断问题

## What Changes

- **Queue 入口加固**：enqueue 增加 topic_registry 一致性校验，queue schema 增加 bundle identity 字段，新增 `operate-queue repair` 命令。Topic slug resolution 优先读取显式 `payload.topic_slug`，仅对已知 topic-scoped work_id 模板做 fallback 解析；payload/work_id 冲突、topic-scoped task 缺 slug、unknown slug 都拒绝写入。Finding-scoped Wave2 backing tasks 不伪装成 topic task；finding-index 存在时必须校验 `finding_id`。脏数据进不来，进来的可自愈。
- **Relay 正道铺设**：workflow node frontmatter 新增 `execution_contract`，区分 lifecycle `phase-agent`、`relay-subagent-role`、`shared-guidance` 三类 surface；Wave0/Wave1 声明 `search_policy: relay_required`，Wave2 声明 `search_policy: relay_required_for_new_evidence`，非搜索 lifecycle node 声明 `no_search`。Subagent role specs 声明 `loaded_by: phase-agent`、`delivered_via: relay_task_md`，避免误以为这些 MD 会被 Sub-agent 直接作为 lifecycle node 加载。将 `shared-subagent-protocol` 和 `shared-anti-cheating-rules` 从 `suggested_context` 提升到 `requires`；`shared-silent-execution` 降级链增加"替代方法 MUST 保持在 relay pipeline 内"约束；sub-agent role spec 增加输出序列化规范（`yaml.stringify()` / `JSON.stringify()`），禁止手拼格式字符串，防止 YAML parse 失败阻塞 gate。
- **Self-documenting node cleanup**：作为最终补充清理，workflow node 文件要在 cold-load 时自说明身份。所有 `manifest.phases[]` lifecycle phase node 增加固定 `## 0. Execution Brief`；三个 relay role spec 改为 role-key-first filename，并增加固定 `## 0. Role Brief` 和 role-oriented body structure。该 cleanup 只增强 Agent-readable orientation 和 validator/test coverage，不改变 queue schema、gate semantics、relay protocol、transition routing 或 finding-index schema。
- **Gate 职责分离**：Gate 新增 phase-aware provenance 检查（Engine-written output declaration coverage、current-wave successful subagent slot binding），让 Wave0/Wave1 不走 relay 的 evidence 产出无法通过 gate；Wave2 只对搜索型 gap-fill / promoted reference 产出要求 relay provenance，纯 synthesis/backfill 产出（`synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml`、seed-topic backfill edits）不因缺 `_subagents/wave_02` 失败。同时保留 accepted specs 中已有的 ledger authority 和 cache 两阶段策略。`count_floor` 继续只认 Engine-written ledger，filesystem scan 只用于 orphan/diagnostic，不参与 gate pass。Jaccard/格式类检查如需降级，必须有对应 capability delta；本 change 不暗中放宽 `isCountable()`、reference format 或 rerun quality contracts。新增 `template_not_expanded` sanity check，检测 `source_url` 中的 `${` 模板残留。
- **Trace/Log 端到端打通**：rb_trace.jsonl 的 `gate_attempt` entry 携带 `diagnostic_path` 和 phase context；gate pass 也写轻量 diagnostic artifact；新增 `relay_bypass_suspected` trace event；gate CLI 对 bypass suspicion 写 run.log WARN（使用既有 run logger/logging convention，不新增 logging capability）。
- **Queue 容量与鲁棒性防线**：Active window 从 5 slot 扩展到 20 slot（AGQ-019），支持 5+ topic 的研究场景，Queue depth 与 Relay concurrency（MAX_CONCURRENT_SUBAGENTS=8）保持解耦。Gate read-side 新增 YAML/JSON 确定性修复——针对 LLM 产出的常见畸形（unescaped double quote、trailing comma、missing bracket、unquoted key）自动修复并 log `yaml_repaired`/`json_repaired` diagnostic；parse 失败时产出可操作诊断（文件路径+行号+parser error），废除 "Cannot read or parse" 通用错误。配合 write-side 的 `yaml.stringify()`/`JSON.stringify()` 强制序列化（WNC-009），形成 BUG-018 的双重防线：源头消灭畸形 + 读侧容错修复。新增 `tests/engine/helpers/gate-read-resilience.test.mjs` 回归测试覆盖各类畸形注入场景。

## Capabilities

### New Capabilities
- `relay-provenance-gate`: Gate provenance 检查规则——验证 evidence/search 产出是否通过 relay pipeline（Engine-written output declaration coverage、successful current-wave slot binding），与现有结构检查（file_exists、schema_valid）正交。Wave0/Wave1 是硬门；Wave2 对新增搜索型 evidence/reference 条件触发。**这是拆掉捷径的关键：direct search 写 artifact 不能伪装成可通过路径。**
- `queue-input-validation`: Queue 入口校验——enqueue 时验证 task card 的 topic_slug 在 bundle 的 topic_registry 中存在；queue schema 增加 bundle identity；projection cache staleness detection。

### Modified Capabilities
- `gate-skeleton`: 规则类型新增/扩展 `output_declaration_ledger_exists`、`output_declaration_coverage`、`subagent_slot_presence`；新增 `template_not_expanded` pre-rule sanity check（检测 `source_url` 中的 `${` 模板残留）；新增 YAML/JSON read-side 确定性修复（unescaped double quote、trailing comma、missing bracket、unquoted key）与可操作 parse error 诊断（文件路径+行号+parser error），废除通用 "Cannot read or parse" 消息；不移除 accepted gate check type，除非对应 capability delta 明确修改其语义
- `agentic-queue`: `completion_receipt` 字段仍然必填，但对 `required_receipts: []` 的 bounded supplementary tasks 允许值为 `null`；这不授予 pass authority，delegated relay provenance 和 downstream gate 仍裁决。同时将 active window 从 5 个 slot 扩展到 20 个（AGQ-019），支持 5+ topic 的研究场景
- `agent-output-declaration`: `rb_output_declarations.jsonl` 从 relay side effect 升级为 reference/evidence-producing relay output 的 mandatory provenance proof；Wave2 搜索型 promoted references 也必须 ledgered
- `trace-writer`: `gate_attempt` trace entry 增加 diagnostic_path、phase context；新增 relay_bypass_suspected event；gate pass/fail 均写 diagnostic artifact
- `silent-wave-execution`: 降级链 §1.4 增加"替代方法 MUST 保持在 relay pipeline 内"
- `workflow-node-contract`: phase/shared/relay role frontmatter 新增 `execution_contract`；validator 校验 search policy、delegated role keys、role spec delivery surface、task template 的 `targets.controller: "main-agent"` + `targets.delegates.to: "sub-agent"` wire shape；追加 self-documenting node contract：manifest lifecycle phases 使用 `Execution Brief`，relay role specs 使用 `Role Brief`，改为 `subagent-dpt-*` role-key-first filenames，且不进入 `manifest.phases[]` 或 `manifest.shared[]`；新增 WNC-009 sub-agent 输出序列化强制规范（`yaml.stringify()` / `JSON.stringify()` 作为唯一合法方式，禁止手拼格式字符串），validator 检测 template literal/heredoc 等已知反模式
- `research-wave-phase-content`: 将 Wave1 从旧 placeholder boundary 对齐为 relay-driven topic deepening；将 relay role specs 表述为 Phase-Agent-loaded guidance，而不是 manifest lifecycle phase execution；追加 Wave2 two-role suggested context、finding taxonomy in-place wording、delegated completion path
- `shared-node-content`: 追加 shared guidance freshness cleanup：`shared-schemas.md` role path references 和 `shared-gate-rules.md` gate summaries 必须反映 relay-backed Wave0/Wave1/Wave2 和 current readiness reference index
- `schema-core`: queue slot 数量引用从 5→20，配合 AGQ-019 active window 扩容
- `cmd-bundle-instantiation`: `rb_queue.json.tmpl` slot 数量引用从 5→20

### Preserved Capabilities
- `gate-content-dedup`: 保持 ledger-driven authority；本 change 不把 Jaccard/URL/self-ref/homepage hard-fail 语义整体搬到 relay，也不改成 filesystem authority
- `cache-raw-web-content` (CRC): 保持 accepted 两阶段策略（empty cache_trails transition warning；non-empty missing/unmapped trail blocking gap），不降低 `cache_coverage` 的 blocking 语义
- `subagent-slots` / `subagent-dispatch` / `subagent-collect`: 保持现有 relay slot lifecycle、dispatch、collect 语义；本 change 只通过 workflow/frontmatter、queue validation、gate provenance 和 trace 诊断加固路径

## Impact

- **Engine**: `queue-manager.mjs`（enqueue 校验、repair、bundle identity、20-slot active-window comments/tests alignment）、`subagent-relay.mjs`（保持 relay slot deterministic validation，可加早期 diagnostics）、`trace.mjs`（timestamp / diagnostic_path / phase context 注入）、`gate-helpers.mjs` / `file-observability.mjs`（active-window diagnostics 使用 `SLOT_NAMES` SSOT）
- **CLI**: `operate-queue.mjs`（enqueue 校验、repair 子命令）、`check-reentry.mjs`（queue conflict audit 使用 `SLOT_NAMES` SSOT）、`check-gate-wave0-complete.mjs` / `check-gate-wave1-complete.mjs` / `check-gate-wave2-complete.mjs`（新增 phase-aware provenance 规则和 bypass 诊断；不把 filesystem 文件计入 ledger-authoritative pass；Wave2 不加无条件 relay hard gate）
- **Gate definitions**: `gate-wave0-complete.definition.json`、`gate-wave1-complete.definition.json`（新增 current-wave provenance coverage + successful slot binding rules）、`gate-wave2-complete.definition.json`（仅对搜索型 gap-fill / `00-cross` reference 增加条件 provenance 规则）；保留 accepted quality/cache/countability rules，除非对应 delta spec 明确修改
- **Schema**: `queue.mjs`（bundle identity 字段；`completion_receipt` property 必填但对 `required_receipts: []` supplementary tasks 允许 `null`）、`queue-slots.mjs`（`QUEUE_ACTIVE_WINDOW_SLOTS=20`，`SLOT_NAMES` 扩展到 `slot_20_tail`）、`contracts/trace.mjs`（允许 gate trace entries 携带 phase/diagnostic_path/bypass suspicion detail）
- **Workflow MD**: `phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`（`execution_contract`、delegated role keys、frontmatter 规则加载优先级、Execution Brief、transition trigger / enforcement boundary wording）、`subagent-dpt-source-intake.md`、`subagent-dpt-evidence-extractor.md`、`subagent-dpt-topic-scout.md`（relay role spec surface，loaded by Phase Agent and delivered via relay task.md，Role Brief + fixed role body）、非搜索 lifecycle nodes including instantiation/HITL/setup/seed-topics/readiness/rerun/final（`search_policy: no_search` + `Execution Brief`）、`shared-silent-execution.md`（降级链约束）、`shared-subagent-protocol.md`、`shared-anti-cheating-rules.md`、`shared-schemas.md`、`shared-gate-rules.md`
- **Validators**: workflow/package validation and `validate-phase-templates.mjs`（校验 execution_contract 与 task card templates 一致，尤其是 delegated search task 的 `targets` 和 `role_key`）
- **Templates**: `rb_queue.json.tmpl`（bundle identity 字段；20-slot active-window wire shape）
- **Instantiation / Experiments**: `instantiate-run-bundle.mjs`（注入 bundle_name 到 queue）、`experiments_env/shared/new-disposable-bundle.mjs`（20-slot disposable queue fixture）
- **Tests / Playbooks / Guidance**: queue schema/engine/helper/CLI tests、controlled playbook queue snippets、`shared-schemas.md` 和 current guidance 中的 5-slot current-contract references 需更新或分类为 historical-only

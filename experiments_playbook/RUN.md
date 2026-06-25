# Playbook Runner

你现在是 `experiments_playbook/` 的 runner。这不是文档——这是给你的行动指令。

## 你要做什么

逐个打开下面的 playbook，**逐 step 执行**（包括所有 bash block 和 inline `.mjs`），从 trace JSONL 做裁决，收集 PASS/FAIL，全部跑完后出 summary report。

不要只读不跑。不要跳过 bash block。不要 mock 结果。

## 跑哪些

这是 MD，没有 CLI 参数——runner 根据**用户的意图**决定跑哪些：

- "快点 / 跑轻的 / 快速验证" → 只跑 **Light**
- "全跑 / 都跑" → **Light + Standard + Heavy**
- "跑重的" → 只跑 **Heavy**
- "跑标准的" → 只跑 **Standard**
- "跑没过的 / 重跑失败的" → 只重跑上次 **FAIL** 的

拿不准就问。默认（用户没明说）= 只跑 Light。

三档（见下方三张表）：

- **Light**：纯 JS/CLI/gate/filesystem E2E，跑得快，改完代码就该跑。
- **Standard**：真实 bundle 多步骤执行（repair loop、artifact 检查等），无外部调用。
- **Heavy**：内容含 WebSearch/WebFetch 或 subagent spawn——因为跑得慢单列。

**Human（`exph_`）**：需要人类交互，自动跑会卡住；runner 跳过，由人类手动跑。

### Light（纯 JS/CLI/gate/filesystem，改完代码就该跑）

| Group | Case ID | Playbook | 验证什么 |
|-------|---------|----------|---------|
| G1 gate-fork | case-11 | `exp_gate-fork/case-11-light-four-returns.md` | Gate 单次 checkpoint 四种返回 |
| G2 gate-loop | case-21 | `exp_gate-loop/case-21-light-three-returns.md` | Gate 单次 checkpoint 三种返回 |
| G3 workflow-chain | case-31 | `exp_workflow-chain/case-31-light-lazy-load.md` | Lazy loader 不预读 MD |
| G4 agentic-queue | case-41 | `exp_agentic-queue/case-41-light-minimal-path.md` | enqueue → claim → complete → promote 最小路径 |
| G10 pre-research | case-106 | `exp_wff_topic-rewrite/case-106-light-hitl1-topic-rewrite-vague.md` | 一句话 → topic rewrite → original topic + seed topics（引用 phase-hitl1.md §3a） |
| G10 pre-research | case-107 | `exp_wff_topic-rewrite/case-107-light-hitl1-topic-rewrite-detailed.md` | 详细 brief → 轻量整理，不越界 rewrite（⚠️ 模拟 Agent 输出） |
| G14 hitl2-branch | case-140 | `exp_wff_hitl2-branch/case-140-light-hitl2-decision-capture.md` | HITL2 decision capture：Agent 捕获 user_decision + rationale，chain 路由到正确节点。Trace 证明两个节点都经过 |
| G14 hitl2-branch | case-141 | `exp_wff_hitl2-branch/case-141-light-rerun-full-path.md` | HITL2 rerun 全路径：decision=rerun→chain→phase-rerun→rerun-ready gate pass→seed-topics |
| G14 hitl2-branch | case-142 | `exp_wff_hitl2-branch/case-142-light-readiness-full-path.md` | HITL2 readiness 全路径：decision=proceed_to_readiness→chain→readiness→readiness gate pass |
| G24 wfn-rerun | case-301 | `exp_wfn_rerun/case-301-light-chain-dual-exit.md` | HITL2 chain 编码双出口：passed→readiness AND rerun→phase-rerun。indeterminate→invalid_input |
| G24 wfn-rerun | case-302 | `exp_wfn_rerun/case-302-light-rerun-node-happy-path.md` | 预填充 rerun bundle 通过 rerun-ready gate→chain→seed-topics |
| G24 wfn-rerun | case-303 | `exp_wfn_rerun/case-303-light-normal-path-unchanged.md` | 回归：证明正常路径 proceed_to_readiness→readiness 在 chain dual-exit 后不变 |
| G24 wfn-rerun | case-304 | `exp_wfn_rerun/case-304-light-gate-fail-max-count.md` | 边界：rerun_count=3→gate fail+no_transition |
| G24 wfn-rerun | case-305 | `exp_wfn_rerun/case-305-light-indeterminate-no-transition.md` | 边界：indeterminate outcomes→invalid_input |

### Standard（真实 bundle 多步骤，无外部调用）

| Group | Case ID | Playbook | 验证什么 |
|-------|---------|----------|---------|
| G1 gate-fork | case-12 | `exp_gate-fork/case-12-standard-repair-retry.md` | Fork 多路分发 + Converge 修复 |
| G1 gate-fork | case-13 | `exp_gate-fork/case-13-standard-full-pipeline.md` | 完整 pipeline + C&I 反馈 |
| G2 gate-loop | case-22 | `exp_gate-loop/case-22-standard-repair-loop.md` | MD PDCA 修复回路 |
| G2 gate-loop | case-23 | `exp_gate-loop/case-23-standard-full-pipeline.md` | 完整端到端 |
| G3 workflow-chain | case-32 | `exp_workflow-chain/case-32-standard-dep-cache.md` | 依赖去重 + cache hit |
| G3 workflow-chain | case-33 | `exp_workflow-chain/case-33-standard-error-paths.md` | 错误路径 + 恢复 |
| G4 agentic-queue | case-42 | `exp_agentic-queue/case-42-standard-urgent-preemption.md` | 满 active window + urgent preemption |
| G4 agentic-queue | case-43 | `exp_agentic-queue/case-43-standard-failure-repair.md` | invalid task, missing receipt, failure repair |
| G5 wff-validation | case-51 | `exp_wff_validation/case-51-standard-happy-path.md` | wff walker 9 phase/8 gate 全部 pass + trace↔log 交叉验证 |
| G5 wff-validation | case-52 | `exp_wff_validation/case-52-standard-fail-repair.md` | wff walker gate fail → repair → rerun → pass 闭环 |
| G5 wff-validation | case-53 | `exp_wff_validation/case-53-standard-routing-contract.md` | current-node 绑定 + next / terminal / no_transition / config_error routing contract |
| G20 wfn-seedtopic | case-201 | `exp_wfn_seedtopic/case-201-standard-seedtopics-queue-loop.md` | seed topics queue-driven 物化：enqueue→claim→Phase Agent 执行→complete→gate pass |
| G10 pre-research | case-101 | `exp_wff_pre-research/case-101-standard-pre-research-happy.md` | fixed HITL payload → instantiation/hitl1/setup 三个 gate pass |
| G10 pre-research | case-102 | `exp_wff_pre-research/case-102-standard-instantiation-production.md` | production 路径 `instantiate-run-bundle.mjs` → gate pass |
| G10 pre-research | case-103 | `exp_wff_pre-research/case-103-standard-hitl1-quick-factual.md` | research_profile: quick_factual — gate pass |
| G10 pre-research | case-104 | `exp_wff_pre-research/case-104-standard-hitl1-exploratory-map.md` | research_profile: exploratory_map — gate pass |
| G10 pre-research | case-105 | `exp_wff_pre-research/case-105-standard-hitl1-claim-verification.md` | research_profile: claim_verification — gate pass |
| G11 pre-research-repair | case-111 | `exp_wff_pre-research-repair/case-111-standard-repair-loop.md` | gate fail → inspect/advice → repair → rerun → pass |
| G11 pre-research-repair | case-112 | `exp_wff_pre-research-repair/case-112-standard-fault-tolerance.md` | bad JSON / multi-rule fail / missing bundle — gate 不崩溃 |
| G11 pre-research-repair | case-113 | `exp_wff_pre-research-repair/case-113-standard-review-surface.md` | HITL 问题面 + AI interpretation sample + human review checklist |
| G12 wave-gates | case-121 | `exp_wff_wave-gates/case-121-standard-wave0-happy.md` | wave0-complete gate：ReferenceMetadata schema + count_floor + {topic} placeholder + AND |
| G12 wave-gates | case-122 | `exp_wff_wave-gates/case-122-standard-wave1-boundary.md` | wave1-complete gate：foundation-placeholder marker + false completion claim |
| G12 wave-gates | case-123 | `exp_wff_wave-gates/case-123-standard-wave2-synthesis.md` | wave2-complete gate：Markdown link 解析 + dead target + cross-artifact reference（RWE-009） |
| G12 wave-gates | case-124 | `exp_wff_wave-gates/case-124-standard-seed-topics-boundary.md` | seed-topics-ready gate：空目录/缺失 slug/多余 slug + slug_consistency 双向校验 |
| G12 wave-gates | case-125 | `exp_wff_wave-chain/case-125-standard-waves-full-chain.md` | seed-topics→wave0→wave1→wave2 全链路 4 gate 顺序 pass |
| G12 wave-gates | case-126 | `exp_wff_wave-chain/case-126-standard-wave-repair-loop.md` | wave2 gate fail→repair→pass PDCA 回路 |
| G12 wave-gates | case-127 | `exp_wff_wave-chain/case-127-standard-wave-fault-tolerance.md` | malformed YAML / partial dead links / status drift — gate 容错 |
| G12 wave-gates | case-128 | `exp_wff_wave-chain/case-128-standard-wave-review-surface.md` | 3-topic Wave0→Wave2 review surface + human checklist |
| G13 delivery | case-131 | `exp_wff_delivery/case-131-standard-delivery-full-chain.md` | hitl2→readiness→final 完整 delivery 链 + final terminal semantics |
| G13 delivery | case-132 | `exp_wff_delivery/case-132-standard-hitl2-decision.md` | HITL2 gate：decision brief + user_decision + trace → pass；缺失/空/非法 → fail |
| G13 delivery | case-133 | `exp_wff_delivery/case-133-standard-hitl2-rerun.md` | HITL2 rerun：gate pass 但 chain 不编码 rerun 分支（Agent 层 routing） |
| G13 delivery | case-134 | `exp_wff_delivery/case-134-standard-delivery-repair.md` | HITL2 + readiness PDCA repair 回路：fail→inspect→repair→rerun→pass |
| G13 delivery | case-135 | `exp_wff_delivery/case-135-standard-readiness-precheck.md` | readiness gate：manifest 拓扑推导 prior gate 集合 + artifact/parsability 审计 |
| G24 wfn-rerun | case-306 | `exp_wfn_rerun/case-306-standard-two-round-delta.md` | Agent-driven：两轮 rerun，验证 rerun_count 递增和 direction section 更新（⚠️ verdict 来自文件系统检查，非 gate） |

### Heavy（真实外部调用：WebSearch/WebFetch/subagent spawn，自动化可跑）

| Group | Case ID | Playbook | 验证什么 |
|-------|---------|----------|---------|
| G21 wfn-wave0 | case-211 | `exp_wfn_wave0/case-211-heavy-wave0-happy-path.md` | seed_topics→wave0 queue-loop→sub-agent 真实搜索→backfill→gate pass 全链路 |
| G21 wfn-wave0 | case-212 | `exp_wfn_wave0/case-212-heavy-gate-fail-repair.md` | gate fail（count_floor 检测缺失 source.yaml）→repair→gate pass，trace 含 fail+pass 两条 gate_attempt |
| G22 wfn-wave1 | case-221 | `exp_wfn_wave1/case-221-heavy-batch-subagent.md` | 2-topic wave1 deepening 批量 sub-agent 并行：enqueue→relay spawn→collect-as-return→backfill→gate pass |
| G22 wfn-wave1 | case-222 | `exp_wfn_wave1/case-222-heavy-gate-fail-repair.md` | gate fail（缺失 evidence-summary）→repair→gate pass，trace 含 2 条 gate_attempt |
| G22 wfn-wave1 | case-223 | `exp_wfn_wave1/case-223-heavy-subagent-failure.md` | WebFetch blocked→完整抓取链（curl→node→python3）→partial evidence 不编造→gate 仍 pass |
| G23 wfn-wave2 | case-231 | `exp_wfn_wave2/case-231-heavy-synthesis-happy-path.md` | post-wave1→wave2 queue-driven synthesis→三件套 artifact→backfill→gate pass 全链路 |
| G23 wfn-wave2 | case-232 | `exp_wfn_wave2/case-232-heavy-finding-triage.md` | finding taxonomy 三类区分（legacy/resolution/emergent）+ 六 decision + resolution 不 spawn sub-agent + search 有 receipt + 无 orphan |
| G23 wfn-wave2 | case-233 | `exp_wfn_wave2/case-233-heavy-gate-fail-repair.md` | gate fail（ledger 缺 section + backfill token 残留）→inspect/advice→repair→gate pass，trace 含 fail+pass 两条 gate_attempt |
| G23 wfn-wave2 | case-234 | `exp_wfn_wave2/case-234-heavy-subagent-search.md` | emergent question→explore_search→spawn dpt-topic-scout 真实搜索→ingest receipt→index 更新→re-synthesize→00_shared promote→gate pass |
| G11 pre-research-repair | case-114 | `exp_wff_pre-research-repair/case-114-heavy-hitl1-manual-review.md` | HITL1 payload 枚举（auto mode 6 vectors） |
| G6 subagent | case-61 | `exp_subagent/case-61-heavy-single-intake.md` | 单个 source_intake subagent |
| G6 subagent | case-62 | `exp_subagent/case-62-heavy-dual-parallel.md` | intake + diagnostic 并行两个 |
| G6 subagent | case-63 | `exp_subagent/case-63-heavy-identity.md` | runtime-agent identity 和 trace event |
| G6 subagent | case-64 | `exp_subagent/case-64-heavy-triple-failure.md` | 三个 subagent 并发 + partial failure |
| G15 ai-judge | case-951 | `exph_workflow-foundation/case-951-heavy-topic-rewrite-ai-judge.md` | AI 扮演真人 dual of 901：真 Agent rewrite + AI reviewer verdict（source: ai-judge，非真人）；9NN +50 对偶 |

### Human（需人类交互/判断，不能自动化，必须手动跑）

> ⚠️ **Human playbook 不会自动通过。** 必须由人类阅读 playbook 中的 review checklist、做出判断、手动确认。gate pass 不代表 human pass。
> Human playbooks live in `exph_workflow-foundation/`（`exph_` = exp + human）。
> **9NN 段例外**：runner 对 9NN 段**按编号**决定跳过/自动，不因 `exph_` 目录一刀切——`901–949`（真人）跳过、`950–999`（AI 扮演真人）自动可跑。所以 `exph_workflow-foundation/` 里的 `case-951` 走自动，`case-901` 走人工。见 `README.md` § 编号约定。

| Group | Case ID | Playbook | 验证什么 | 人类做什么 |
|-------|---------|----------|---------|-----------|
| G15 human | case-901 | `exph_workflow-foundation/case-901-heavy-topic-rewrite-agent.md` | Agent 读 phase-hitl1.md §3a → 执行 topic rewrite | 审查 Agent 的 rewrite 质量：original topic 是否合理？seed topics 是否贴切？ |

## 怎么执行

**关键原则：一个一个老老实实跑，不许偷懒，不许自己改写。**

你很容易犯三个错误——前两个是技术性的，第三个是态度性的，也是最危险的：

1. **批量跑**——把几个 playbook 的 JS 写到一个文件里跑。这会产生假 FAIL（API/路径不匹配），不可接受。
2. **读了之后自己改写**——读了 playbook 的 MD 和 JS，理解了意图，然后自己重写一份"等价的"来跑。这会产生假 FAIL，因为你写的跟原 playbook 不完全一样。必须**忠实跑原 MD/代码**。
3. **偷懒**——因为忠实跑一个 playbook 要好几轮（Read → Step 1 → Step 2...→ Verdict → Cleanup），15 个就是几十轮，你觉得太费劲，于是想压缩成"看懂意思→自己写→一口气跑"。**这是最致命的错误。** 省下来的轮次全变成了假 FAIL，最后花更多时间去诊断、重跑、怀疑 framework 有 bug——实际上从头到尾都是你自己乱改造成的。

**不许偷懒。不管多少轮，一个一个忠实跑完。**

**正确的做法：**

对每个 playbook，严格按以下步骤：

1. **Read** — 打开 playbook 文件，通读全部内容
2. **Step 1: 创建 bundle** — 执行第一个 bash block，`$B` 是 `new-disposable-bundle.mjs` 的输出。把 `$B` 的值保存下来（后续 step 要用）
3. **后续 Step** — 执行每个 bash block，**忠实跑原 MD/代码**。inline JS 原样使用，只替换其中的硬编码 `dpt_disp_case-XX_xxx` 路径为实际 bundle 路径（因为随机后缀）。除此之外一行不改
4. **Verdict** — 执行 verdict step，记录 `\x1b[32mPASS\x1b[0m` 或 `\x1b[31mFAIL\x1b[0m`
5. **Cleanup** — 执行清理 step
6. **下一个** — 回到步骤 1，跑清单里的下一个 playbook

**禁止的做法：**
- ❌ 把多个 playbook 的 JS 拼到一个文件里批量跑
- ❌ 读了 playbook 后自己写"等价的" JS 来跑
- ❌ 跳过 bash block 直接猜结果
- ❌ 用 `console.log` 代替 trace JSONL 裁决

如果某个 case FAIL：
- 从 trace JSONL 提取关键 failure indicator（哪个 check event 的 `passed !== true`）
- 记录下来，**继续下一个**，不要停
- 跑完之后再看哪些要修

## Report 格式

跑完后输出：

```
## Playbook Run Report

Light: N/N PASS (X FAIL)
Standard: N/N PASS (X FAIL)
Heavy: N/N PASS (X FAIL)

### FAIL
- exp_xxx/case-XX-...md — <failure reason from trace>
```

用绿色 `\x1b[32m` 标 PASS、红色 `\x1b[31m` 标 FAIL。

## 开始前检查

1. 本文件的清单是否和 `experiments_playbook/exp_*/**/case-*.md` 实际文件一致？不一致就先更新本文件。
2. 是否有残留的 `dpt_disp_*` 目录？有就先 `rm -rf dpt_disp_*` 清理。

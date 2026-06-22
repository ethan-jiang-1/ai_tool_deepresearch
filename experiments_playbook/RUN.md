# Playbook Runner

你现在是 `experiments_playbook/` 的 runner。这不是文档——这是给你的行动指令。

## 你要做什么

逐个打开下面的 playbook，**逐 step 执行**（包括所有 bash block 和 inline `.mjs`），从 trace JSONL 做裁决，收集 PASS/FAIL，全部跑完后出 summary report。

不要只读不跑。不要跳过 bash block。不要 mock 结果。

## 跑哪些

**默认只跑 light。** heavy 需要真实 subagent spawn（跑得慢），只在用户明确要求时跑。**human 不能自动跑**——必须人类介入。**`exph_` 目录不跑**——那些需要人类介入，runner 自动跳过。如果你不确定跑哪些，问。

### Light（纯 JS E2E，改完代码就该跑）

| # | Playbook | 验证什么 |
|---|----------|---------|
| 1 | `exp_gate-fork/test-simple-four-returns.md` | Gate 单次 checkpoint 四种返回 |
| 2 | `exp_gate-fork/test-medium-repair-retry.md` | Fork 多路分发 + Converge 修复 |
| 3 | `exp_gate-fork/test-complex-full-pipeline.md` | 完整 pipeline + C&I 反馈 |
| 4 | `exp_gate-loop/test-simple-three-returns.md` | Gate 单次 checkpoint 三种返回 |
| 5 | `exp_gate-loop/test-medium-repair-loop.md` | MD PDCA 修复回路 |
| 6 | `exp_gate-loop/test-complex-full-pipeline.md` | 完整端到端 |
| 7 | `exp_workflow-chain/test-simple-lazy-load.md` | Lazy loader 不预读 MD |
| 8 | `exp_workflow-chain/test-medium-dep-cache.md` | 依赖去重 + cache hit |
| 9 | `exp_workflow-chain/test-complex-error-paths.md` | 错误路径 + 恢复 |
| 10 | `exp_agentic-queue/test-simple-minimal-path.md` | enqueue → claim → complete → promote 最小路径 |
| 11 | `exp_agentic-queue/test-medium-urgent-preemption.md` | 满 active window + urgent preemption |
| 12 | `exp_agentic-queue/test-complex-failure-repair.md` | invalid task, missing receipt, failure repair |
| 13 | `exp_wff_validation/test-simple-happy-path.md` | wff walker 9 phase/8 gate 全部 pass + trace↔log 交叉验证 |
| 14 | `exp_wff_validation/test-medium-fail-repair.md` | wff walker gate fail → repair → rerun → pass 闭环 |
| 15 | `exp_wff_validation/test-complex-routing-contract.md` | current-node 绑定 + next / terminal / no_transition / config_error routing contract |
| 16 | `exp_workflow-foundation/test-simple-pre-research-happy-path.md` | fixed HITL payload → instantiation/hitl1/setup 三个 gate pass |
| 17 | `exp_workflow-foundation/test-medium-pre-research-repair-loop.md` | gate fail → inspect/advice → repair → rerun → pass |
| 18 | `exp_workflow-foundation/test-medium-pre-research-fault-tolerance.md` | bad JSON / multi-rule fail / missing bundle — gate 不崩溃 |
| 19 | `exp_workflow-foundation/test-complex-pre-research-review-surface.md` | HITL 问题面 + AI interpretation sample + human review checklist |
| 20 | `exp_workflow-foundation/test-light-hitl1-quick-factual.md` | research_profile: quick_factual — gate pass |
| 21 | `exp_workflow-foundation/test-light-hitl1-exploratory-map.md` | research_profile: exploratory_map — gate pass |
| 22 | `exp_workflow-foundation/test-light-hitl1-claim-verification.md` | research_profile: claim_verification — gate pass |
| 23 | `exp_workflow-foundation/test-light-hitl1-topic-rewrite-vague.md` | 一句话 → topic rewrite → original topic + seed topics（引用 phase-hitl1.md §3a） |
| 24 | `exp_workflow-foundation/test-light-hitl1-topic-rewrite-detailed.md` | 详细 brief → 轻量整理，不越界 rewrite（⚠️ 模拟 Agent 输出） |
| 25 | `exp_workflow-foundation/test-light-instantiation-production-path.md` | production 路径 `instantiate-run-bundle.mjs` → gate pass |
| 26 | `exp_workflow-foundation/test-simple-waves-full-chain.md` | seed-topics→wave0→wave1→wave2 全链路 4 gate 顺序 pass |
| 27 | `exp_workflow-foundation/test-medium-wave-repair-loop.md` | wave2 gate fail→repair→pass PDCA 回路 |
| 28 | `exp_workflow-foundation/test-medium-wave-fault-tolerance.md` | malformed YAML / partial dead links / status drift — gate 容错 |
| 29 | `exp_workflow-foundation/test-complex-wave-review-surface.md` | 3-topic Wave0→Wave2 review surface + human checklist |
| 30 | `exp_workflow-foundation/test-simple-hitl2-decision-recorded.md` | HITL2 gate：decision brief + user_decision + trace → pass；缺失/空/非法 → fail |
| 31 | `exp_workflow-foundation/test-medium-readiness-precheck.md` | readiness gate：manifest 拓扑推导 prior gate 集合 + artifact/parsability 审计 |
| 32 | `exp_workflow-foundation/test-simple-delivery-full-chain.md` | hitl2→readiness→final 完整 delivery 链 + final terminal semantics |
| 33 | `exp_workflow-foundation/test-simple-hitl2-rerun-branch.md` | HITL2 rerun：gate pass 但 chain 不编码 rerun 分支（Agent 层 routing） |
| 34 | `exp_workflow-foundation/test-medium-delivery-repair-loop.md` | HITL2 + readiness PDCA repair 回路：fail→inspect→repair→rerun→pass |

### Heavy（真实 subagent spawn，自动化可跑）

| # | Playbook | 验证什么 |
|---|----------|---------|
| 35 | `exp_workflow-foundation/test-heavy-hitl1-manual-review.md` | HITL1 payload 枚举（auto mode 6 vectors） |
| 36 | `exp_subagent/test-heavy-subagent-single-intake.md` | 单个 source_intake subagent |
| 37 | `exp_subagent/test-heavy-subagent-dual-parallel.md` | intake + diagnostic 并行两个 |
| 38 | `exp_subagent/test-heavy-subagent-triple-failure.md` | 三个 subagent 并发 + partial failure |
| 39 | `exp_subagent/test-heavy-subagent-identity.md` | runtime-agent identity 和 trace event |

### Human（需人类交互/判断，不能自动化，必须手动跑）

> ⚠️ **Human playbook 不会自动通过。** 必须由人类阅读 playbook 中的 review checklist、做出判断、手动确认。gate pass 不代表 human pass。
> Human playbooks live in `exph_workflow-foundation/`（`exph_` = exp + human）。

| # | Playbook | 验证什么 | 人类做什么 |
|---|----------|---------|-----------|
| 40 | `exph_workflow-foundation/test-human-hitl1-topic-rewrite-agent.md` | Agent 读 phase-hitl1.md §3a → 执行 topic rewrite | 审查 Agent 的 rewrite 质量：original topic 是否合理？seed topics 是否贴切？ |

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
3. **后续 Step** — 执行每个 bash block，**忠实跑原 MD/代码**。inline JS 原样使用，只替换其中的硬编码 `dpt_disp_xxx` 路径为实际 bundle 路径（因为随机后缀）。除此之外一行不改
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
Heavy: not run (use --heavy to run)

### FAIL
- exp_xxx/test-yyy.md — <failure reason from trace>
```

用绿色 `\x1b[32m` 标 PASS、红色 `\x1b[31m` 标 FAIL。

## 开始前检查

1. 本文件的清单是否和 `experiments_playbook/exp_*/test-*.md` 实际文件一致？不一致就先更新本文件。
2. 是否有残留的 `dpt_disp_*` 目录？有就先 `rm -rf dpt_disp_*` 清理。

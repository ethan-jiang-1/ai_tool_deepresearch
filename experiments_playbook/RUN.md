# Playbook Runner

你现在是 `experiments_playbook/` 的 runner。这不是文档——这是给你的行动指令。

## 你要做什么

逐个打开下面的 playbook，**逐 step 执行**（包括所有 bash block 和 inline `.mjs`），从 trace JSONL 做裁决，收集 PASS/FAIL，全部跑完后出 summary report。

不要只读不跑。不要跳过 bash block。不要 mock 结果。

## 跑哪些

**默认只跑 light。** heavy 只在用户明确要求时跑。如果你不确定，问。

### Light（纯 JS E2E，改完代码就该跑）

| # | Playbook | 验证什么 |
|---|----------|---------|
| 1 | `exp_gate-fork/test-simple-four-returns.md` | Gate 单次 checkpoint 四种返回 |
| 2 | `exp_gate-fork/test-medium-repair-retry.md` | Fork 多路分发 + Converge 修复 |
| 3 | `exp_gate-fork/test-complex-full-pipeline.md` | 完整 pipeline + C&I 反馈 |
| 4 | `exp_gate-loop/test-simple-three-returns.md` | Gate 单次 checkpoint 三种返回 |
| 5 | `exp_gate-loop/test-medium-repair-loop.md` | MD PDCA 修复回路 |
| 6 | `exp_gate-loop/test-complex-full-pipeline.md` | 完整端到端 |
| 7 | `exp_workflow-fsm/test-simple-define-advance.md` | FSM Define→Advance→Verify |
| 8 | `exp_workflow-fsm/test-medium-retry-halt.md` | FSM retry 自环 + halt |
| 9 | `exp_workflow-fsm/test-complex-halt-recovery.md` | FSM halt 恢复 |
| 10 | `exp_workflow-chain/test-simple-lazy-load.md` | Lazy loader 不预读 MD |
| 11 | `exp_workflow-chain/test-medium-dep-cache.md` | 依赖去重 + cache hit |
| 12 | `exp_workflow-chain/test-complex-error-paths.md` | 错误路径 + 恢复 |
| 13 | `exp_agentic-queue/test-simple-minimal-path.md` | enqueue → claim → complete → promote 最小路径 |
| 14 | `exp_agentic-queue/test-medium-urgent-preemption.md` | 满 active window + urgent preemption |
| 15 | `exp_agentic-queue/test-complex-failure-repair.md` | invalid task, missing receipt, failure repair |
| 16 | `exp_wff_validation/test-simple-happy-path.md` | wff walker 9 phase/8 gate 全部 pass + trace↔log 交叉验证 |
| 17 | `exp_wff_validation/test-medium-fail-repair.md` | wff walker gate fail → repair → rerun → pass 闭环 |

### Heavy（真实 subagent spawn，subagent 机制变更时跑）

| # | Playbook | 验证什么 |
|---|----------|---------|
| 18 | `exp_subagent/test-simple-single-intake.md` | 单个 source_intake subagent |
| 19 | `exp_subagent/test-medium-dual-parallel.md` | intake + diagnostic 并行两个 |
| 20 | `exp_subagent/test-complex-triple-failure.md` | 三个 subagent 并发 + partial failure |
| 21 | `exp_subagent/test-identity-agent-identity.md` | runtime-agent identity 和 trace event |

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

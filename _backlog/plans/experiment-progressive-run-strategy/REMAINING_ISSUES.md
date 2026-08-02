# Handoff: 7 Remaining Experiment Cases — 2026-08-02

> **目标读者**：接手继续处理这 7 个 case 的 Agent。
>
> **需要的上下文已经在这份文档里。** 更详细的汇总数据在 `MASTER_SUMMARY.md`、`SPEED_INDEX.md`、`EXECUTION_ENVIRONMENT.md`——本文件只保留决策必要信息，引用路径指向完整数据。

## Suggested Skills

接手 Agent 应该 invoke 以下 skill：

- **`research`** — 调查 framework 变更原因时，搜 DPT_FRAMEWORK 源码和 git log
- **`diagnosing-bugs`** — 诊断 712/714 的 check 失败根因
- **`implement`** — 实现 715 的 helper 支持
- **`openspec-explore`** — 如果修复涉及 OpenSpec change（如 gate contract 变更）

## 背景：这是什么（30 秒版）

这个仓库是 Deep Research Tool（`/Users/bowhead/ai_tool_deepresearch`）。`experiments_playbook/` 下有 101 个 agent-flow e2e 测试 case（Markdown playbook），由 `DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs`（supervisor）驱动执行。

2026-08-01/02 对全部 101 个 case 进行了一次完整回归。94 个通过，7 个有困难。

## 2. 执行架构（必读）

### 两层 Agent

```
Supervisor (run-agent-experiment.mjs)
  └─ Playbook Agent (claude 进程)
       └─ 执行 playbook bash steps
            └─ 某些 case 需要 Subject Agent (独立 claude 子进程)
```

### Headless 模式

```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --case <case-id> --max-total-budget-usd <N> --timeout <ms>
```

- Playbook Agent: `claude -p --output-format stream-json --permission-mode bypassPermissions`
- 后端: DeepSeek（通过 `.env` 配置 `DEEPSEEK_API_KEY`/`DEEPSEEK_ANTHROPIC_BASE_URL`/`DEEPSEEK_MODEL`）
- `--permission-mode bypassPermissions` 意味着 bash/edit/write 等本地工具无需确认

### Subject Agent 如何被 spawn

Playbook bash step 调用 `experiments_env/shared/run-iterative-interaction-subject.mjs`，该脚本：
1. 通过 `DPT_FRAMEWORK/host_tools/claude-deepseek.mjs` launcher 启动
2. `claude-deepseek.mjs` 读取 `.env`，构建环境变量，`spawnSync` 出 `claude --setting-sources project,local [args]`
3. Subject Agent 的参数由 `experiments_env/shared/iterative-interaction-subject-launch.mjs` 的 `buildIterativeInteractionSubjectInvocation()` 生成

**关键参数**（`iterative-interaction-subject-launch.mjs`）:
```js
const claudeArgs = [
  '--settings', settingsPath,        // 指向 settings_deepseek.json
  '--setting-sources', '',           // 空字符串，不用 project settings
  '--bare',
  '--disable-slash-commands',
  '--no-chrome',
  '--tools', tools,                  // 如 "Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write"
  '--model', 'opus',
  '--effort', 'low',
  '--session-id', sessionId,
  '--no-session-persistence',
];
if (subjectId !== '115') claudeArgs.push('--dangerously-skip-permissions');
// case 115 是唯一不加 --dangerously-skip-permissions 的
// 它走 buildSelectedResearchAccessAdapterInvocation() 路径
```

### 为什么有些 case 需要 WebSearch/WebFetch

- `proof_subject: agent_behavior` 的 case 需要真实 Subject Agent 做 search/fetch
- `proof_subject: deterministic_contract` 的 case 不需要，纯 CLI gate 即可
- 当前 DeepSeek 后端（Anthropic 兼容 API）**不提供 WebSearch/WebFetch 工具**
- `--dangerously-skip-permissions` 可以跳过权限弹窗，但不能让不存在的工具变得可用

## 3. 当前状态：94/101 PASS

| 结果 | 数量 | 说明 |
|------|------|------|
| PASS (含 ISSUES) | 94 | 全部通过 |
| FAIL | 0 | 全部修复 |
| 待处理 | 7 | 见下文 |

详细数据在 `MASTER_SUMMARY.md`。

## 4. 已完成的工作

1. 按速度重分档（`SPEED_INDEX.md`）：Sprint(~30s) / Standard(~200s) / Marathon(~500s) / Extreme(~1000s+)
2. 15 个 FAIL 全部诊断和修复（详见 `_fixes_done/FAIL_FIX_REPORT.md`）：
   - 6 个 `verdict_mode: all→last`（retry 误报）
   - 2 个 fixture 适配（403: seed topic 缺 wave0_evidence token, 606: setup-ready gate 要求变更）
   - 2 个 case 语义更新（315: 删除过时 invariant, 223: gate 预期翻转）
   - 1 个错误消息文本变更（33）
3. 14 个 ERROR（budget/timeout/claude crash）大部分通过提高预算解决，剩余见下文
4. 修复了 `experiments_env/shared/run-fixture-backed-case.mjs` 的 `writeWave0Scaffold`，为 seed topic 添加 `__BACKFILL_WAVE0_EVIDENCE__` token

## 5. 七个待处理 Case

---

### Case 115 — `case-115-heavy-hitl1-research-access-probe`

| 属性 | 值 |
|------|-----|
| 实验 | wff-pre-research-repair |
| proof_subject | agent_behavior |
| 当前结果 | NOT_RUN |
| 失败原因 | `missing public WebSearch tool_use` |
| 重跑预算 | $20（headless）→ 仍 NOT_RUN |
| 优先级 | 🔴 需换 runtime |

**诊断**：这是唯一故意不加 `--dangerously-skip-permissions` 的 case。代码在 `experiments_env/shared/iterative-interaction-subject-launch.mjs:22`：
```js
if (subjectId !== '115') claudeArgs.push('--dangerously-skip-permissions');
```
不走 permission bypass 的原因：`buildSelectedResearchAccessAdapterInvocation()`（`DPT_FRAMEWORK/host_tools/lib/research-access-adapter.mjs:83`）强制 `generic_non_bypass` 权限模式，要求真实 WebSearch/WebFetch。DeepSeek 没有这些工具 → NOT_RUN。

**相关文件**：
- `experiments_playbook/exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md` — playbook
- `DPT_FRAMEWORK/host_tools/lib/research-access-adapter.mjs` — adapter contract，定义了 `SELECTED_RESEARCH_ACCESS_ADAPTER`
- `experiments_env/shared/iterative-interaction-subject-launch.mjs:22` — 跳过 `--dangerously-skip-permissions` 的地方
- `experiments_env/shared/run-iterative-interaction-subject.mjs:56-63` — case 115 的 Subject Agent 定义，tools: `'WebSearch,WebFetch,Bash,Read,Write,Edit,Glob,Grep'`

**建议方向**：
- 换用支持 WebSearch 的 Claude 原生 API（非 DeepSeek）
- 或修改 adapter 支持 DeepSeek fallback（用 `WebSearch` 的替代实现）

---

### Case 232 — `case-232-heavy-finding-triage`

| 属性 | 值 |
|------|-----|
| 实验 | wfn-wave2 |
| proof_subject | agent_behavior |
| 当前结果 | NOT_RUN |
| 失败原因 | `independent Subject Agent runtime or real external search unavailable` |
| 重跑预算 | $20（headless）→ 仍 NOT_RUN |
| 优先级 | 🔴 需换 runtime |

**诊断**：Subject Agent 需要 `real external search`。DeepSeek 无 WebSearch/WebFetch。Subject Agent 定义在 `run-iterative-interaction-subject.mjs` 中没有 232 的独立条目——可能走的是通用路径。检查 `experiments_env/shared/run-iterative-interaction-subject.mjs` 的 CASES 表确认。

**相关文件**：
- `experiments_playbook/exp_wfn_wave2/case-232-heavy-finding-triage.md`

**建议方向**：同 115，需要 WebSearch-capable runtime。

---

### Case 951 — `case-951-heavy-topic-rewrite-ai-judge`

| 属性 | 值 |
|------|-----|
| 实验 | exph-workflow-foundation |
| proof_subject | agent_behavior |
| 当前结果 | NOT_RUN |
| 失败原因 | `independent Subject Agent, external capability, or separate AI reviewer unavailable` |
| 重跑预算 | $20（headless）→ 仍 NOT_RUN |
| 优先级 | 🔴 需换 runtime |

**诊断**：这个 case 需要两个独立 Agent：Subject Agent 做 topic rewrite，AI reviewer 评判结果。`run-iterative-interaction-subject.mjs:151-166` 定义了 `'951'`（Subject Agent）和 `'951-judge'`（AI reviewer）。两个进程都需要正常启动。

**Subject Agent 定义**（`run-iterative-interaction-subject.mjs:151-158`）：
```js
'951': {
  bundlePrefix: 'dpt_disp_case-951_',
  transcript: 'case-951-subject-transcript.jsonl',
  system: 'You are the independent Subject Agent for case 951...',
  messages: ['用户原始输入是"帮我研究一下 AI 安全"...'],
  tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
  boundary: 'Do not write playbook verdict checks, AI judgment...',
},
```
Subject Agent 工具集含 WebSearch/WebFetch → DeepSeek 不提供 → NOT_RUN。

**AI reviewer 定义**（`run-iterative-interaction-subject.mjs:159-166`）：
```js
'951-judge': {
  bundlePrefix: 'dpt_disp_case-951_',
  transcript: 'case-951-judge-transcript.jsonl',
  system: 'You are the independent AI reviewer for case 951...',
  messages: ['审查独立 Subject Agent 对"帮我研究一下 AI 安全"的 rewrite...'],
  tools: 'Glob,Grep,Read,Write',
  boundary: 'Write only case-951-judge-record.json...',
},
```
AI reviewer 不需要 WebSearch（tools 不含），但需要作为独立进程运行。

**相关文件**：
- `experiments_playbook/exph_workflow-foundation/case-951-heavy-topic-rewrite-ai-judge.md` — playbook
- `experiments_env/shared/run-iterative-interaction-subject.mjs:151-166` — Subject + AI reviewer 定义

**建议方向**：同 115/232，需要 WebSearch-capable runtime（至少 Subject Agent 部分）。

---

### Case 712 — `case-712-heavy-hitl2-natural-rerun`

| 属性 | 值 |
|------|-----|
| 实验 | iterative-interaction |
| proof_subject | agent_behavior |
| 当前结果 | $15→NOT_RUN, $20→**FAIL**（Subject Agent 跑起来了！） |
| 优先级 | 🟡 需修 case |

**诊断**：$20 预算下 Subject Agent 成功运行，说明不是 runtime 问题。但 completion 显示 NOT_RUN（report 中没有 check 结果），说明 observer 判断 Subject Agent 输出不符合预期。

**Subject Agent 定义**（`run-iterative-interaction-subject.mjs:119-126`）：
```js
'712': {
  bundlePrefix: 'dpt_disp_case-712_',
  transcript: 'case-712-transcript.jsonl',
  system: 'You are the independent subject Agent for case 712...',
  messages: [
    '请简要审阅当前研究，只告诉我一个最值得做的下一步。',
    '资本约束这部分还不够，再补一下'
  ],
  tools: 'Bash,Edit,Glob,Grep,Read,Write',  // 无 WebSearch/WebFetch！
  boundary: 'Complete the minimum work owned by the current phase...',
},
```
注意：712 的工具集不含 WebSearch/WebFetch，所以理论上 headless DeepSeek 应该能跑。之前 NOT_RUN 是预算问题，$20 就跑起来了。现在是 check 逻辑问题。

**需要**：重跑拿到具体 check 结果，然后修 playbook 或 observer。

**相关文件**：
- `experiments_playbook/exp_iterative_interaction/case-712-heavy-hitl2-natural-rerun.md`
- `experiments_env/shared/run-iterative-interaction-subject.mjs:119-126`
- `experiments_env/shared/observe-iterative-interaction-case.mjs`

**重跑命令**：
```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --case case-712-heavy-hitl2-natural-rerun \
  --max-total-budget-usd 20 --timeout 3600000
```

---

### Case 714 — `case-714-heavy-user-research-controls`

| 属性 | 值 |
|------|-----|
| 实验 | iterative-interaction |
| proof_subject | agent_behavior |
| 当前结果 | $15→NOT_RUN, $20→**FAIL**（Subject Agent 跑起来了！） |
| 最后 check | `natural-control-capture: false`, `durable-snapshot: false` |
| 优先级 | 🟡 需修 case |

**诊断**：$20 预算下 Subject Agent 成功运行。具体 check 结果：
```
case-714-natural-control-capture: false  ← Subject Agent 没捕获用户 controls
case-714-durable-snapshot: false         ← 没写 host-file snapshot
case-714-no-fabricated-path: true
case-714-existing-handoff: true
```

**Subject Agent 定义**（`run-iterative-interaction-subject.mjs:111-118`）：
```js
'714': {
  bundlePrefix: 'dpt_disp_case-714_',
  transcript: 'case-714-transcript.jsonl',
  system: `You are the independent subject Agent for case 714...`,
  messages: [
    '请根据当前研究请求给出一个简洁的研究建议，只保留验证本次交互所需的最小范围。',
    '按建议开始。本轮只使用一手来源；不要把媒体转述当作证据。报告最后单列无法用一手来源验证的结论。'
  ],
  tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
  boundary: '...Capture the supplied research controls only in the production host-file snapshot...',
},
```
714 的工具集包含 WebSearch/WebFetch，但 Subject Agent 仍能跑起来（加了 `--dangerously-skip-permissions`）。问题是 Subject Agent 没有按预期把用户 controls 写入 `rb_plan.md## Constraints > User Research Controls`。

**Observer 逻辑**（`observe-iterative-interaction-case.mjs:288-303`，`record714` 函数）：
```js
function record714(events) {
  // ...
  const noPath = !/(?:\/Users\/|file:\/\/|case-714-research-request)/.test(planText);
  recordCheck(tracePath, { gate: 'case-714-natural-control-capture', 
    passed: marker.length === 1 && controls, ... });
  recordCheck(tracePath, { gate: 'case-714-durable-snapshot', 
    passed: controls && profile.human_decision_checkpoints?.hitl1?.status === 'recorded', ... });
  recordCheck(tracePath, { gate: 'case-714-no-fabricated-path', 
    passed: noPath && !/user_controls/.test(profileYaml), ... });
  recordCheck(tracePath, { gate: 'case-714-existing-handoff', 
    passed: available ? gatePass && setupLoad : unavailable && gateFail && !setupLoad, ... });
}
```
检查 `rb_plan.md` 中是否有 user marker（`marker.length === 1`）和 controls section。Subject Agent 没有写入这些 → check 失败。

**相关文件**：
- `experiments_playbook/exp_iterative_interaction/case-714-heavy-user-research-controls.md` — playbook（我们已添加 bash blocks）
- `experiments_env/shared/run-iterative-interaction-subject.mjs:111-118` — Subject Agent 定义
- `experiments_env/shared/observe-iterative-interaction-case.mjs:288-303` — `record714` observer
- `experiments_env/shared/prepare-iterative-interaction-case.mjs` — 支持 714（`prepareHitl1('714')`）

**建议方向**：Subject Agent 能跑了，问题是它没有执行"写入 controls 到 rb_plan.md"这个动作。可能需要调整 system prompt 或 boundary 指令，让它更明确地知道要写什么。

---

### Case 715 — `case-715-heavy-wave-target-receipt-closure`

| 属性 | 值 |
|------|-----|
| 实验 | iterative-interaction |
| proof_subject | agent_behavior |
| 当前结果 | ERROR — `native_completion_invalid` |
| 优先级 | 🟡 需补 helper |

**诊断**：三个 helper 都不支持 715：

1. **`prepare-iterative-interaction-case.mjs:17`** — 只接受 `711|712|713|714`：
   ```js
   if (!['711', '712', '713', '714'].includes(CASE_ID)) {
     console.error('Usage: ... <711|712|713|714> ...');
   }
   ```
   需要添加 715 的 prepare 逻辑。715 需要 Wave1 边界（而非 HITL1），比 711/714 更复杂。

2. **`run-iterative-interaction-subject.mjs`** — CASES 表中没有 715 条目。需要添加 Subject Agent 定义（两个 phase：Wave1 depth review + Wave2 synthesis）。

3. **`observe-iterative-interaction-case.mjs:17`** — 只接受 `115|711|712|713|714`。需要添加 715 的 observer。

**Case 要求**（playbook 描述）：
- Wave1：Subject Agent 执行 depth review，产出 `carried_targets` 数组
- Gate：`check-gate-wave1-complete`，project `carried_target_receipt`
- Wave2：Subject Agent 执行 synthesis，产出 `finding-index.yaml`，其中的 finding 需 `wave1_target_bindings[]` 匹配 receipt
- Closure：`check-gate-wave2-complete` 验证 receipt-bound coverage

**我们已做的工作**：为 playbook 添加了 bash blocks（含 `{{RUN_CONTEXT_SH}}`/`{{CASE_RUN_ROOT_SH}}` token），但内容为 stub——注册 bundle 后检测 infra 不可用就直接 NOT_RUN。

**相关文件**：
- `experiments_playbook/exp_iterative_interaction/case-715-heavy-wave-target-receipt-closure.md` — playbook（已有 bash blocks）
- `experiments_env/shared/prepare-iterative-interaction-case.mjs:17` — 需加 715
- `experiments_env/shared/run-iterative-interaction-subject.mjs` — 需加 715 和 715-wave2
- `experiments_env/shared/observe-iterative-interaction-case.mjs:17` — 需加 715

**建议方向**：参考 711 的 prepareHitl1 模式，为 715 实现 prepareWave1。Subject Agent 分两个 phase（wave1 + wave2），需要两个 session。Observer 需验证 carried_target_receipt 和 finding-index 的 binding。

---

### Case 163 — `case-163-heavy-rerun-add-real-cache-trail`

| 属性 | 值 |
|------|-----|
| 实验 | evidence-extraction |
| proof_subject | agent_behavior |
| 当前结果 | ERROR — `case_budget_exhausted`，2744s，$20.01 |
| 优先级 | 🟠 需调查 |

**诊断**：Subject Agent 跑了 45 分钟烧了 $20 还不够。上次 headless $15 也超了（1582s）。可能是：
1. Subject Agent 陷入了搜索/重试循环
2. evidence-extraction 的 workload 确实很大（需要真实 search/fetch）
3. 某种 bug 导致 Agent 无法完成

**Subject Agent 定义**（`run-iterative-interaction-subject.mjs`）：163 条目含 `tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write'`。

**需要**：检查 Subject Agent 的 transcript，看它在那 45 分钟里做了什么。可能需要在 playbook 中添加更明确的 boundary 限制。

**相关文件**：
- `experiments_playbook/exp_evidence-extraction/case-163-heavy-rerun-add-real-cache-trail.md`
- `experiments_env/shared/run-iterative-interaction-subject.mjs` — 163 的 Subject Agent 定义

---

## 6. 建议处理顺序

```
1. 712 — 工具集无 WebSearch，headless 能跑。重跑拿 check 结果，修 observer/playbook。
2. 714 — 同上，已有 check 结果。调整 Subject Agent prompt/boundary。
3. 715 — 补三个 helper。工作量最大但纯工程。
4. 163 — 查 transcript，判断是正常高成本还是 bug。
5. 115 — 需要 WebSearch-capable runtime。
6. 232 — 同上。
7. 951 — 需要 WebSearch + 独立 AI reviewer。
```

## 7. 重要文件速查

| 文件 | 用途 |
|------|------|
| `DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs` | Supervisor，启动 Playbook Agent |
| `DPT_FRAMEWORK/host_tools/claude-deepseek.mjs` | DeepSeek launcher，Subject Agent 的入口 |
| `experiments_env/shared/run-iterative-interaction-subject.mjs` | Subject Agent spawn 逻辑，CASES 定义表 |
| `experiments_env/shared/iterative-interaction-subject-launch.mjs` | Subject Agent 的 claude argv 构建 |
| `experiments_env/shared/prepare-iterative-interaction-case.mjs` | Case 的 bundle 准备 |
| `experiments_env/shared/observe-iterative-interaction-case.mjs` | Case 的 verdict observer |
| `DPT_FRAMEWORK/host_tools/lib/research-access-adapter.mjs` | 115 的 research access adapter |
| `DPT_FRAMEWORK/host_tools/lib/agent-cli-launcher.mjs` | Headless/Interactive CLI plan 构建 |
| `.env` | DeepSeek API 配置 |

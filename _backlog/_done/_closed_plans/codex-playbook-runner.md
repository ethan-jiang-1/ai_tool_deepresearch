# Codex Playbook Runner：用独立 Agent 进程执行 playbook

## Metadata

| Field | Value |
|---|---|
| **Identifier** | `codex-playbook-runner` |
| **Category** | 实验基础设施 |
| **Severity** | P0 |
| **Status** | Plan |
| **Date** | 2026-07-15 |
| **Depends on** | `tests-e2e-layer`（Layer 3/4 边界概念） |

## 1. 问题

case-318 要求两样东西当前不存在：

1. **coding-Agent runner 与 subject Agent 分离**：playbook 说 "Run a real subject Agent distinct from the coding-Agent playbook runner"。目前没有机制做到这一点——同一个 codex/claude 会话既是 runner 又是 subject，无法区分。
2. **playbook 自动化执行**：playbook 步骤是 Markdown 里写的 bash/JS 块和自然语言指令。目前只能人工逐条执行。没有程序化 runner。

两者是同一个问题的两面：**需要一个 runner 来驱动 playbook，且 runner 能在特定步骤 spawn 一个独立的 subject Agent 进程。**

## 2. 核心洞察

**codex/claude code 本身可以同时充当 runner 和 subject Agent——关键是用不同进程（不同会话）来分离两者。**

```
Runner 进程（codex/claude code #1）
  │
  ├─ 读 playbook Markdown
  ├─ 执行 Step 1, 3, 5（shell/JS）        ← Runner 亲自执行
  ├─ 在 Step 2 spawn codex #2              ← 独立 subject Agent 进程
  │     └─ 返回 transcript → 存为 case-318-subject-direction.jsonl
  ├─ 在 Step 4 spawn codex #3              ← 独立 subject Agent 进程（恢复）
  │     └─ 返回 transcript → 存为 case-318-subject-recovery.jsonl
  └─ Step 6 裁决
```

**这不是 mock**：两个 codex 进程有不同的 PID、不同的上下文窗口、不同的文件系统时间线。Runner 进程不写方向段、不写 profile、不写 gate attempt——只做 setup 和 observation。Subject 进程只看到自己的 prompt 和 bundle——不知道 runner 的验证逻辑。

## 3. 设计

### 3.1 Runner 契约

Runner（codex/claude code 会话）的 system prompt 必须包含：

```
你是 case-318 的 playbook runner。你只能执行 playbook 中标记为 [RUNNER/SHELL] 的步骤。
标记为 [RUNNER->SUBJECT AGENT] 的步骤，你必须通过 spawn 独立 codex 进程来执行。
你不得：
- 写 ## 本轮重跑方向 section
- 修改 rb_profile.yaml 的 rerun_count
- 写 gate_attempt event
- 运行 advance-status、enter-phase（除非 playbook 的 shell 块明确要求）
- 修改 rb_status.json
```

### 3.2 Subject Agent 调用

Subject Agent 通过 `codex exec`（或 `claude` CLI 的等价命令）spawn：

```bash
# Step 2: 产生方向然后停在崩溃窗口
codex exec \
  --cwd "$REPO_ROOT" \
  --save-transcript "$BUNDLE/case-318-subject-direction.jsonl" \
  --max-turns 15 \
  --prompt "你是 case-318 的 subject Agent，独立于 playbook runner。
只在 <BUNDLE> 内工作。阅读 DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md。
执行 Stage 1-3 step 1：读 HITL2 rationale 和当前 rerun_count，计算 target_rerun_count，
对比已有 seed topic，写入或替换 topic 的 ## 本轮重跑方向 section。
方向必须绑定 target 并表达 cost 和 failure-mode 补充，不改变 topic 身份。
然后故意停止以模拟 profile 递增前的中断。不修改 rb_profile.yaml 的 rerun_count。
不运行 rerun-ready gate、enter-phase、advance-status。
不编辑 Engine 拥有的 status/trace/work-unit/declaration 文件。
不搜索或调用外部服务。"

# Step 4: 恢复并完成恢复
codex exec \
  --cwd "$REPO_ROOT" \
  --save-transcript "$BUNDLE/case-318-subject-recovery.jsonl" \
  --max-turns 15 \
  --prompt "恢复 case-318，作为 <BUNDLE> 中的真实 subject Agent。
阅读 phase-rerun.md 和当前 bundle 事实。
将已有的方向/profile 不匹配视为崩溃窗口。不重写已有方向。
通过合法路径完成 phase：递增 profile 到已有 target，
运行真实 rerun-ready gate，消费 check.next 进入 phase，
通过 advance-status --to rerun_ready 同步状态，按指令发送 rerun_ready event。
如 checkpoint 失败读结构化 gate 反馈。不手写 status/trace/gate attempt/work-unit/declaration。
不搜索或调用外部服务。"
```

### 3.3 Transcript 格式

Subject Agent 的 codex 会话 transcript 保存为 JSONL，每条记录包含：

```json
{"role": "system", "content": "<system prompt>"}
{"role": "user", "content": "<prompt>"}
{"role": "assistant", "content": "<response>", "tool_calls": [...]}
```

Runner 验证 transcript 存在且非空即证明 subject 是独立进程。不做内容审查（那是 Layer 4 的职责）。

### 3.4 两次 subject Agent 调用的隔离

- **Step 2 和 Step 4 是两次独立的 `codex exec` 调用。** 不是同一个会话的两段对话。
- Step 2 的 codex 进程退出后，Step 4 启动一个新的 codex 进程。新进程只看到 bundle 文件系统状态——Step 2 写的方向 section、未递增的 profile、已有的 trace。
- 这模拟了真实的崩溃恢复场景：Agent 中断后重新连接，必须从文件系统推断状态。

## 4. 实现步骤

### Step 1: 验证 codex exec 的 transcript 保存能力

```bash
codex exec --help | grep -i transcript
codex exec --help | grep -i save
```

确认 `codex exec` 支持：
- `--save-transcript <path>` 或等价参数
- `--max-turns <N>` 限制步数
- `--prompt` 或 stdin 传入指令

如果 `codex exec` 不直接支持，fallback 方案：
- 用 `script` / `tee` 捕获 stdout
- 或用 Claude Code 的 `--print` / `--output` 参数

### Step 2: 写 Runner Script

创建 `experiments_env/shared/run-playbook-case-318.mjs`——一个 JS 脚本，它：

1. 调用 `prepare-rerun-direction-canary.mjs` → 获得 bundle path
2. 执行 Step 1 的验证 shell 块（内嵌）
3. 调用 `codex exec` 执行 Step 2（subject Agent direction）→ 存 transcript
4. 执行 Step 3 的观察 shell 块（内嵌）
5. 调用 `codex exec` 执行 Step 4（subject Agent recovery）→ 存 transcript
6. 执行 Step 5 的裁决 shell 块（内嵌）
7. 输出 PASS/FAIL/NOT RUN

Runner script 本身是确定性的——它调用 shell 命令和 spawn codex。不确定性的部分在 codex 进程内部，被 transcript 捕获。

### Step 3: 处理 NOT RUN 路径

如果 `codex exec` 不可用（CI 环境、无 API key 等），runner script：
- 记录 `NOT RUN` + 原因
- 写 `case-318-subject-direction.jsonl` 内容为 `{"status": "NOT RUN", "reason": "..."}`
- 不写方向、不写 profile、不模拟 Agent 行为
- 保留 bundle 供诊断

### Step 4: 集成到 case-318 playbook

更新 `case-318-heavy-rerun-direction-recovery.md`：
- Step 2 和 Step 4 不再写自然语言 "Run a real subject Agent..." 然后留给人工
- 改为明确的命令：`node experiments_env/shared/run-playbook-case-318.mjs`
- 或者保留两份指令：自动化路径（runner script）和手动路径（当 codex 不可用时的人工操作指南）

### Step 5: 测试

1. 在有 codex CLI 和有效 API key 的环境下运行 `run-playbook-case-318.mjs`
2. 验证 transcript JSONL 非空且格式正确
3. 验证 trace checks 全部 PASS
4. 验证 subject Agent 输出不是 runner 输出的字节级拷贝（独立性检查）

## 5. 与其他 Plan 的关系

- **`tests-e2e-layer`**：本 plan 聚焦 Layer 4（Agent E2E）的执行自动化。`tests_e2e/`（Layer 3）验证 Engine 跨 phase 行为；本 plan 验证 Agent 行为。
- **`seed-backfill-round-continuity`**：backfill 的 P0 设计缺陷修复后，本 plan 的 playbook runner 可用于回归测试——每次改 rerun 逻辑后跑一次 case-318。
- **`agent-output-linter`**：linter 面向 Agent 产出质量；本 plan 面向 Agent 执行环境。linter 可集成到 subject Agent 的 codex session 中（作为 phase 指令的一部分要求 Agent 先自检）。

## 6. 后续扩展

此 runner 模式不限于 case-318。任何 `experiments_playbook/exp_*/` 目录下的 playbook 都可以：

1. 标记每个步骤为 `[RUNNER/SHELL]` 或 `[RUNNER->SUBJECT AGENT]`
2. 用同一个 runner script 模式执行
3. Subject Agent 步骤自动 spawn 独立 codex 进程
4. Transcript 自动存档

未来可抽象为通用的 `run-playbook.mjs --case <case-id>` CLI。

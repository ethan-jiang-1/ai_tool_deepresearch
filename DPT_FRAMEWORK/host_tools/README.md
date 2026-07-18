# Host Tools

自包含的 pre-trigger 工具。只依赖外部 `claude` 二进制，所有环境由工具自身提供。

## claude-deepseek.mjs

DeepSeek Claude Code Launcher。Pre-trigger host tool。启动连接 DeepSeek Anthropic-compatible endpoint 的 Claude Code。

### Usage

```bash
# Preflight check
node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --check

# Launch — 所有参数透传给 claude
node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs -p "hello"
node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --verbose
```

### Setup

```bash
cp .env.example .env   # from repo root
```

编辑 `.env`，三个必填值：

```
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
DEEPSEEK_MODEL=deepseek-v4-pro
```

## run-experiment.mjs

Experiment auto-runner。以 headless 模式启动 Claude Code 执行 `experiments_playbook/` 中的 playbook。Runner 负责编排和裁决（读 trace JSONL），Agent 负责执行 playbook。

### Usage

```bash
# 单个 case
node DPT_FRAMEWORK/host_tools/run-experiment.mjs --case case-41-light-minimal-path

# 整个实验组
node DPT_FRAMEWORK/host_tools/run-experiment.mjs --group agentic-queue

# 整档（light/standard/heavy）
node DPT_FRAMEWORK/host_tools/run-experiment.mjs --tier light

# Dry-run（仅发现不执行）
node DPT_FRAMEWORK/host_tools/run-experiment.mjs --tier light --dry-run

# PASS+CLEAN 时清理 bundle
node DPT_FRAMEWORK/host_tools/run-experiment.mjs --tier light --cleanup-pass

# JSON-only 输出（机器消费）
node DPT_FRAMEWORK/host_tools/run-experiment.mjs --case case-41-light-minimal-path --json

# 自定义超时（默认 600s）
node DPT_FRAMEWORK/host_tools/run-experiment.mjs --tier light --timeout 1200000
```

无参数默认运行所有 Light case。

### 输出

- **stdout**：ANSI 彩色 summary report + JSON report
- **`_temp/exp_verdicts.jsonl`**：append-only 审计日志
- **`.exp-bundles/dpt_disp_*/`**：disposable bundle（FAIL 时保留，`--cleanup-pass` 时 PASS bundle 被清理）
- **`.exp-bundles/dpt_disp_*/exp_result.json`**：per-bundle 结果摘要
- **`.exp-bundles/dpt_disp_*/_diag_*.log`**：Agent 完整 stdout/stderr 诊断日志

### 与 TUI 模式的关系

两份 runner instruction，playbook 不动：

| 模式 | Instruction | 谁裁决 | bundle 位置 |
|------|------------|--------|-------------|
| TUI（交互） | `RUN_TUI_EXPS.md` | Agent | repo root |
| CLI（自动化） | `RUN_CLI_EXPS.md` | Runner（JS） | `.exp-bundles/` |

Case 清单在 `PLAYBOOK_MANIFEST.md`，两份 instruction 共享。

## Context

`experiments_playbook/` 目前只有一种执行路径：coding agent 交互式读取 `RUN_EXPS.md`，逐 case 执行，Agent 自己对 trace 裁决 verdict，自己 cleanup。

需要第二条路径：通过 `host_tools/run-experiment.mjs` 以 headless 模式自动化执行。关键设计原则：**playbook 不动，runner instruction 分家**。

`host_tools/` 已有 `claude-deepseek.mjs`（DeepSeek→Anthropic API 启动器），其 env 映射逻辑提取为 `lib/env-deepseek.mjs` 供两个工具共享。

## Goals / Non-Goals

**Goals:**
- `experiments_playbook/` 下两份 runner instruction：`RUN_TUI_EXPS.md`（原有，交互模式）和 `RUN_CLI_EXPS.md`（新增，自动化模式）
- Auto runner `run-experiment.mjs` 读 `RUN_CLI_EXPS.md`，发现 playbook，spawn headless Claude Code 执行，从 `rb_trace.jsonl` 自行提取 verdict，运行 health check，输出 JSON report
- Bundle 隔离到 `.exp-bundles/`，symlink 解决 import 路径
- 复用 `claude-deepseek.mjs` 的共享 env 模块
- 不修改 playbook 文件本身

**Non-Goals:**
- 不替换 `run-fixture-backed-case.mjs`
- 不修改现有 TUI 交互模式（仅重命名 `RUN_EXPS.md` → `RUN_TUI_EXPS.md`）
- 不引入新 npm 依赖
- 不修改 Engine、CLI、schema、phase node

## Decisions

### Decision 1: 两份 Runner Instruction，Playbook 不动

**选择**：`RUN_EXPS.md` 重命名为 `RUN_TUI_EXPS.md`（内容不变），新增 `RUN_CLI_EXPS.md`。Playbook 的 `case-*.md` 文件不修改。

**为什么**：playbook 定义"验证什么"（gate 语义、trace 契约、断言逻辑），这是不变的。runner instruction 定义"在不同的执行模式下怎么跑"——TUI 模式下 Agent 自己裁决，CLI 模式下 Runner 裁决。分开后各自独立演进，不互相污染。

`RUN_CLI_EXPS.md` 包含 CLI 模式特有的指令：
- Step 1 加 `--target-dir .exp-bundles`
- Skip verdict step（Runner 会从 trace 自行裁决）
- Skip cleanup step（Runner 处理清理）
- 执行完打印 `BUNDLE=<absolute-path>`

### Decision 2: Runner 是编排+裁决层，Agent 是执行层

**Runner 负责**：读 `RUN_CLI_EXPS.md`、发现 playbook、构造 prompt（instruction + playbook 路径）、spawn Claude Code、找 bundle、读 trace 裁决、health check、cleanup、报告

**Agent 负责**：读 playbook、执行 bash blocks（skip verdict/cleanup）、在 `.exp-bundles/` 下创建 bundle、打印 `BUNDLE=<path>`

**为什么 Agent 不负责裁决**：Agent 是 LLM，可能 hallucinate verdict（输出 PASS 但实际 trace 有 failed check）。Runner 是 JS，确定性读 trace JSONL 做裁决。Engine 做 verdict 是项目核心原则。

### Decision 3: Bundle 隔离到 `.exp-bundles/` + symlink

Runner 在初始化时创建 symlink `.exp-bundles/DPT_FRAMEWORK → ../DPT_FRAMEWORK`。playbook inline `.mjs` 脚本从 bundle 内部 `import '../DPT_FRAMEWORK/...'`，symlink 让路径正确解析。

Runner 初始化时幂等创建目录和 symlink（已存在则跳过）。

### Decision 4: 共享 env 模块

`claude-deepseek.mjs` 的 `.env` 解析和 env mapping 提取为 `lib/env-deepseek.mjs`。两个 host_tool 都 import 它。避免逻辑分叉。

`run-experiment.mjs` spawn `claude` 时加 `--setting-sources project,local` 排除 user settings（`~/.claude/settings.json` 的 `env` block 会覆盖 launcher 的 env vars，破坏自包含原则）。同时加 `--allow-dangerously-skip-permissions`——headless 模式下 Agent 不能交互确认权限，排除 user settings 后 `skipDangerousModePermissionPrompt` 设置也丢失了。

### Decision 5: Runner verdict 来源是 rb_trace.jsonl

Runner 在 Agent 退出后读取 `<bundle>/rb_trace.jsonl`，解析 `check` events，按 `passed === expected` 规则裁决 PASS/FAIL。Runner 还写入 `<bundle>/exp_result.json` 作为 bundle 内可读的结果摘要。

### Decision 6: Human case 处理

case ID 901-949 自动跳过（HUMAN verdict）。AI-judge case 950-999 正常执行。项目方向全面自动化后，Human case 文件可能整体移除。

## Risks / Trade-offs

- [Risk] headless Agent 权限提示卡住 → 通过 `--allow-dangerously-skip-permissions` 解决，已实测确认
- [Risk] Agent 可能不遵守 "skip verdict" 指令，仍执行 verdict/cleanup → Runner 找不到 trace 时标记 FAIL，bundle 保留；诊断日志 `_diag_*.log` 记录完整 Agent 输出供排查
- [Risk] `.exp-bundles/DPT_FRAMEWORK` symlink 被误删 → Runner 每次执行前检查并自动重建
- [Risk] 大 tier 耗时很长 → `--timeout` 可配置；`--case` 可缩小范围

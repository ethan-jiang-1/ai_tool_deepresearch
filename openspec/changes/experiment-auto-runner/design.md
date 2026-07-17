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
- 不修改现有 TUI 交互协议的行为语义（`RUN_EXPS.md` 拆分为 MANIFEST + `RUN_TUI_EXPS.md`，Agent 的"读 instruction → 执行 → 裁决 → 清理"流程不变）
- 不引入新 npm 依赖
- 不修改 Engine、CLI、schema、phase node

## Decisions

### Decision 1: 共享 Case 清单 + 两份 Runner Instruction，Playbook 不动

**选择**：原 `RUN_EXPS.md`（case 清单 + TUI 执行规则混在一起）重构为三个文件：

1. **`PLAYBOOK_MANIFEST.md`**（新增，~130 行）：所有 case 的权威清单。内容来自原 RUN_EXPS.md：
   - 四档表格：Light（~35 条）、Standard（~27 条）、Heavy（~17 条）、Human（~1 条）
   - 选择规则："快点 / 跑轻的"→Light、"跑标准的"→Standard、"跑重的"→Heavy、"跑没过的 / 重跑失败的"→只重跑 FAIL
   - 迁移记录（G14 Migration Map 等）
   - 两份 runner instruction 均引用此文件，消除重复维护

2. **`RUN_TUI_EXPS.md`**（重构）：TUI 交互模式的执行规则——Agent 读 MANIFEST 知道 case 列表，按 TUI 协议逐 case 执行（含 verdict step、cleanup step），可反问用户。精简为纯执行协议（~100 行）。

3. **`RUN_CLI_EXPS.md`**（新增）：CLI 自动化模式的执行规范——明确 Runner（JS）和 Agent 的分工。Agent 读到这个文件就知道自己是 headless 执行者，按 CLI 协议跑（`--target-dir .exp-bundles`、skip verdict、skip cleanup、打印进展标记和 `BUNDLE=<path>`）。Runner 负责发现 playbook、spawn Agent、读 trace 裁决、health check、cleanup。

**为什么**：case 清单是"数据"（什么），执行规则是"协议"（怎么跑）。混在一起导致两份 instruction 各自维护一份 case 列表的拷贝，必然漂移。提取为共享 MANIFEST 后，单一数据源，两份协议各自演进。

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

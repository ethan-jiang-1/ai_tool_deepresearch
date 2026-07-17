## Why

`experiments_playbook/` 目前只有一种执行模式：coding agent 交互式读取 `RUN_EXPS.md`，人工逐 case 执行。用户无法在离开终端后知道实验结果，也无法在 CI 或批处理场景中自动化运行。

需要第二种模式——通过 `host_tools/run-experiment.mjs` 以 headless 方式启动 Claude Code 执行实验，Runner 自行从 trace 裁决 verdict。核心原则：**playbook 不动，runner instruction 分家**。

## What Changes

### 架构：Case 清单共享，两份 Runner Instruction，Playbook 不动

- `experiments_playbook/RUN_EXPS.md` → 重构为三个文件：
  - **`PLAYBOOK_MANIFEST.md`**（新增）：所有 case 的清单（Light/Standard/Heavy/Human 四档表格、选择规则、迁移记录）——这是两份 runner instruction 的共享数据源
  - **`RUN_TUI_EXPS.md`**（重构）：TUI 交互模式的执行规则——Agent 读 MANIFEST 知道跑哪些，按 TUI 协议执行（含 verdict、cleanup），可反问用户
  - **`RUN_CLI_EXPS.md`**（新增）：CLI 自动化模式的执行规范——明确 Runner（JS）和 Agent 的分工：Runner 发现 playbook、spawn Agent、读 trace 裁决、cleanup；Agent 只负责执行 bash blocks（加 `--target-dir .exp-bundles`、skip verdict、skip cleanup、打印进展标记和 `BUNDLE=<path>`）
- 所有 `case-*.md` playbook 文件不变：它们定义"验证什么"，MANIFEST 定义"有哪些"，两份 instruction 定义"怎么跑"

### 新增 host_tool

- `DPT_FRAMEWORK/host_tools/run-experiment.mjs`：auto runner，读 `RUN_CLI_EXPS.md`，发现 playbook，spawn headless Claude Code，从 `rb_trace.jsonl` 自行提取 verdict，运行 health check，输出 JSON report，追加审计日志
- `DPT_FRAMEWORK/host_tools/lib/env-deepseek.mjs`：从 `claude-deepseek.mjs` 提取的共享 env 模块，两个工具共用

### Bundle 隔离

- 所有 Mode 2 的 disposable bundle 放在 `.exp-bundles/`（类似 `tests/.test-bundles`）
- symlink `.exp-bundles/DPT_FRAMEWORK → ../DPT_FRAMEWORK` 解决 inline `.mjs` 的 `../DPT_FRAMEWORK/` import 路径
- `.gitignore` 加 `.exp-bundles/`

### CLI

- `--case <id>` / `--group <name>` / `--tier <tier>` 三种粒度
- `--cleanup-pass` 遵循 PASS+CLEAN 清理策略；FAIL 保留
- `--json` 纯 JSON stdout；`--dry-run` 仅发现不执行
- 自动跳过 Human case（901-949），AI-judge case（950-999）正常执行
- 结果追加到 `_temp/exp_verdicts.jsonl` 审计日志

### 不做什么

- 不新增 npm 依赖
- 不修改 Engine、CLI、schema、phase node
- 不修改 playbook 文件本身
- 不搞 `_last_run.json` 缓存（PASS bundle 删了就删了，审计日志已有记录）

## Capabilities

### New Capabilities
- `experiment-auto-runner`: host_tool 自动化实验执行——两份 runner instruction（TUI + CLI），Runner 做编排和裁决，Agent 做执行

### Modified Capabilities
- `playbook-runner`: `RUN_EXPS.md` 拆分为 `PLAYBOOK_MANIFEST.md`（case 清单）+ `RUN_TUI_EXPS.md`（TUI 执行规则）。Agent 行为不变（读 instruction → 执行 → 裁决 → 清理）。新增 `RUN_CLI_EXPS.md` 作为 CLI 模式执行规范

## Impact

- 新增文件：`DPT_FRAMEWORK/host_tools/lib/env-deepseek.mjs`、`DPT_FRAMEWORK/host_tools/run-experiment.mjs`、`experiments_playbook/PLAYBOOK_MANIFEST.md`、`experiments_playbook/RUN_CLI_EXPS.md`
- 重构：`experiments_playbook/RUN_EXPS.md` → 拆分为 `PLAYBOOK_MANIFEST.md` + `RUN_TUI_EXPS.md`（case 清单提取到 MANIFEST，TUI 指令精简为执行规则）
- 修改文件：`DPT_FRAMEWORK/host_tools/claude-deepseek.mjs`（import 共享模块）、`DPT_FRAMEWORK/host_tools/README.md`、`experiments_playbook/README.md`（更新文件引用）、`DPT_FRAMEWORK/cli/validate-playbook.mjs`（排除新文件名）、`.gitignore`
- Human case 处理：`exph_workflow-foundation/case-901-*` 因项目方向全面自动化，Human case 不再维护，本次 change 中移除

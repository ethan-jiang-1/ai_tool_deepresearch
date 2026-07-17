## Why

`experiments_playbook/` 目前只有一种执行模式：coding agent 交互式读取 `RUN_EXPS.md`，人工逐 case 执行。用户无法在离开终端后知道实验结果，也无法在 CI 或批处理场景中自动化运行。需要第二种模式——通过 `host_tools/` 以 headless 方式启动 Claude Code 执行实验，并将结果写入结构化文件，解决"人不在屏幕前怎么知道跑成没跑成"的可观测性问题。

## What Changes

- 在 `DPT_FRAMEWORK/host_tools/` 新增 `run-experiment.mjs`：一个 Node.js ESM 脚本，复用 `claude-deepseek.mjs` 的环境映射逻辑，以 headless 模式启动 Claude Code 执行指定的 playbook 实验
- 所有 disposable bundle 隔离到 `.exp-bundles/` 目录（类似 `tests/.test-bundles`），通过 symlink `DPT_FRAMEWORK → ../DPT_FRAMEWORK` 解决 inline `.mjs` 脚本的 relative import 路径问题
- Claude Code 将 verdict/health 结果写入 bundle 内部的 `exp_result.json`（而非全局固定路径），天然支持并发——每个 bundle 有唯一随机 hex 后缀，结果文件随 bundle 隔离
- Runner 写入 `.exp-bundles/_last_run.json` 作为 JS 可读的上次运行缓存
- 支持三种粒度：`--case`（单个 case）、`--group`（整个实验组）、`--tier`（light/standard/heavy 整档）
- 支持 `--cleanup-pass` 遵循现有 PASS+CLEAN 清理策略；FAIL 保留 bundle 供诊断
- 自动跳过 Human case（901-949），AI-judge case（950-999）正常执行
- 输出结构化 JSON report，同时追加到 `_temp/exp_verdicts.jsonl` 审计日志
- 不新增 npm 依赖，不修改 `DPT_FRAMEWORK/` 之外的 production 代码

## Capabilities

### New Capabilities
- `experiment-auto-runner`: host_tool 自动化实验执行——通过 headless Claude Code 运行 experiments_playbook/ 中的 playbook，产出结构化 verdict 报告

### Modified Capabilities
<!-- 此次 change 不修改现有 capability 的 requirement。playbook-runner (PLR) 的 RUN_EXPS.md coding-agent 模式保持不变；experiment-auto-runner 是新增的并行执行路径。 -->

## Impact

- 新增文件：`DPT_FRAMEWORK/host_tools/lib/env-deepseek.mjs`（共享 env 模块）、`DPT_FRAMEWORK/host_tools/run-experiment.mjs`（~300-400 行）
- 修改文件：`DPT_FRAMEWORK/host_tools/claude-deepseek.mjs`（import 共享模块替代内联逻辑）、`DPT_FRAMEWORK/host_tools/README.md`（新增工具文档）、`.gitignore`（加 `.exp-bundles/`）
- 依赖现有：`experiments_env/shared/verify-bundle-health.mjs`（health check）、`experiments_env/shared/wff-playbook-utils.mjs`（verdict 审计日志）、`experiments_env/shared/new-disposable-bundle.mjs`（`--target-dir` 支持）
- 不修改 production Engine、CLI、schema、phase nodes
- 不影响现有 coding-agent 交互模式

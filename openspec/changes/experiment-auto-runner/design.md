## Context

`experiments_playbook/` 目前只有一种执行路径：coding agent 读取 `RUN_EXPS.md`，交互式逐 case 执行。用户离开终端后无法获知结果。需要第二条路径：通过 `host_tools/` 以 headless 模式自动化执行。

`host_tools/` 已有 `claude-deepseek.mjs`（DeepSeek→Anthropic API 启动器），其 env 映射逻辑可被复用。新增的 `run-experiment.mjs` 在此之上包装实验发现、Claude Code headless 调用、结果收集和审计日志。

## Goals / Non-Goals

**Goals:**
- 在 `host_tools/` 提供 `run-experiment.mjs`，支持 `--case`/`--group`/`--tier` 三种粒度
- 复用 `claude-deepseek.mjs` 的 `.env` 解析和环境映射逻辑，确保与 DeepSeek endpoint 的集成方式一致
- Claude Code headless 模式下，通过 prompt 指导 Agent 执行 playbook 并将结果写入 bundle 内部的 `exp_result.json`（`<bundle>/exp_result.json`），而非全局固定路径
- 所有 disposable bundle 隔离到 repo-root `.exp-bundles/`，通过 symlink `DPT_FRAMEWORK → ../DPT_FRAMEWORK` 保持 inline `.mjs` import 路径兼容
- Runner 写入 `.exp-bundles/_last_run.json` 作为 JS 可读的上次运行缓存
- Runner 读取 JSON 结果文件，输出结构化 report，追加 `_temp/exp_verdicts.jsonl` 审计日志
- 遵循 PASS+CLEAN 清理、FAIL 保留的现有策略
- 自动跳过 Human case（901-949），AI-judge case（950-999）正常执行

**Non-Goals:**
- 不替换 `run-fixture-backed-case.mjs`（那是针对 fixture-backed case 的专用工具）
- 不修改 `RUN_EXPS.md` 的 coding-agent 交互模式
- 不引入新 npm 依赖
- 不修改 Engine、CLI、schema、phase node
- 不支持并行执行（run-experiment 自身串行，与 RUN_EXPS.md 约束一致）

## Decisions

### Decision 1: Runner 是纯 JS 编排层，Agent 是执行者

Runner 负责：发现 playbook、过滤分类、构造 prompt、启动 Claude Code、收集结果、清理 bundle。
Agent（Claude Code）负责：读 playbook、执行 bash blocks、判断 gate、提取 verdict、写入结果文件。

边界清晰：JS 做编排（文件发现、进程管理、结果聚合），Agent 做执行（读 MD、跑命令、裁决）。Runner 不解析 playbook 内容、不执行 bash blocks、不读 trace JSONL——这些是 Agent 的工作。

**Alternatives considered:**
- Runner 直接提取 bash blocks 并执行 → 拒绝了。用户明确指出"里头一旦有 Agent 的话，bash 是跑不出来"。Agent 判断（gate pass/fail、repair 决策、sub-agent 调用）是实验的核心价值，不能跳过。
- Runner 调用 `run-fixture-backed-case.mjs` → 拒绝了。那只能覆盖 ~12 个 case，且需要 per-case 硬编码。

### Decision 2: 复用而非复制 claude-deepseek.mjs 的 env 逻辑

`run-experiment.mjs` 从 `claude-deepseek.mjs` 提取 `.env` 解析和 env mapping 为共享模块，或直接在 runner 中 import 共享逻辑。两种方案：

**选择**: 将 `claude-deepseek.mjs` 的 `.env` 解析和 env mapping 提取为 `host_tools/lib/env-deepseek.mjs`，两个工具都 import 它。这避免逻辑分叉，且 `claude-deepseek.mjs` 的核心行为不受影响。

**Alternatives considered:**
- Runner 直接 `spawnSync('node', ['claude-deepseek.mjs', ...])` → 拒绝了。`stdio: 'inherit'` 无法捕获输出。Runner 需要 `stdio: 'pipe'` 来收集 Agent 的 stdout。
- 在 `claude-deepseek.mjs` 加 `--capture` flag → 部分可行但增加了 launcher 的复杂度。提取共享模块更干净。

### Decision 3: 结果文件放在 bundle 内部，天然并发安全

**选择**：Agent 将结果写入 `<bundle>/exp_result.json`（而非全局固定路径 `_temp/exp_auto_result.json`）。

**为什么**：每个 disposable bundle 已有唯一随机 hex 后缀（如 `dpt_disp_case-41_agq_simple_f`），bundle 路径天然唯一。结果文件跟 bundle 同生命周期：
- PASS+CLEAN → bundle 删了，审计日志 `_temp/exp_verdicts.jsonl` 已留存
- FAIL → bundle 保留，`exp_result.json` 直接可查
- 并发安全：两个 runner 进程 → 两个不同 bundle → 两个独立 `exp_result.json`，不会互相覆盖

**Alternatives considered:**
- 固定路径 `_temp/exp_auto_result.json` → 拒绝了。并发跑两个 case 就对不上。
- 按 case ID 命名 `_temp/exp_auto_result_<case-id>.json` → 部分可行，但同一 case 跑两次仍然冲突；且结果和 bundle 分离，后续查 FAIL 现场要跨两个位置找。

文件格式不变：
```json
{
  "case": "case-41",
  "verdict": "PASS",
  "health": "CLEAN",
  "checks_total": 4,
  "checks_passed": 4,
  "bundle": ".exp-bundles/dpt_disp_case-41_agq_simple_f",
  "bundle_preserved": false,
  "error": null
}
```

### Decision 6: Bundle 隔离到 `.exp-bundles/` + symlink 解决路径

**选择**：所有 Mode 2 的 disposable bundle 放在 repo-root `.exp-bundles/`，Runner 初始化时创建 symlink `.exp-bundles/DPT_FRAMEWORK → ../DPT_FRAMEWORK`。

**为什么**：playbook 的 inline `.mjs` 脚本从 bundle 内部 `import '../DPT_FRAMEWORK/...'`。如果 bundle 在 `.exp-bundles/dpt_disp_xxx/`，`..` 从 bundle 出发指向 `.exp-bundles/`。symlink 让 `.exp-bundles/DPT_FRAMEWORK` 指向真正的 `<repo>/DPT_FRAMEWORK/`，import 路径自然解析。

**Agent prompt 里的指令**：Runner 告诉 Agent "在 Step 1 的 `new-disposable-bundle.mjs` 命令里加上 `--target-dir .exp-bundles`"。

**Gitignore**：`.exp-bundles/` 加入（已有 `tests/.test-bundles/` 先例）。

**参考**：`tests/.test-bundles/` 已在 integration test 中使用 `--target-dir` 参数实现同样的隔离。

### Decision 7: `_last_run.json` 作为 JS 可查缓存

**选择**：Runner 跑完后在 `.exp-bundles/_last_run.json` 写轻量摘要。

```json
{
  "run_id": "20260717T223000Z",
  "filter": {"tier": "light"},
  "summary": {"total": 3, "pass": 2, "fail": 1},
  "results": {
    "case-41": {"verdict": "PASS", "bundle": ".exp-bundles/dpt_disp_case-41_xxx"},
    "case-42": {"verdict": "FAIL", "bundle": ".exp-bundles/dpt_disp_case-42_xxx"}
  }
}
```

JS 脚本可快速读取——不用扫描 `.exp-bundles/` 下所有 bundle 目录。后续可选提供 `--resume-failed` flag 读取 `_last_run.json` 只重跑上次 FAIL 的 case。

### Decision 4: Runner 是单文件 ESM 脚本

与 `claude-deepseek.mjs` 保持一致的风格：shebang、ESM import、纯 Node.js 内置。不做 CLI framework、不做 plugin 系统。~300-400 行。

### Decision 5: Serial execution with per-case timeout

遵循 `RUN_EXPS.md` 的严格串行约束。每个 case 有独立的 Claude Code 进程（避免 context 污染），总 timeout 可配置（默认 600s/case）。

## Risks / Trade-offs

- [Risk] Claude Code headless API 不可用或超时 → 设置合理 timeout，超时后标记 TIMEOUT 并继续下一个 case
- [Risk] Agent 未按 prompt 写入结果文件 → Runner 检测文件缺失后标记 ERROR，保留现场
- [Risk] `claude-deepseek.mjs` 共享模块提取引入回归 → 提取后运行 launcher 的 `--check` preflight 和基本 smoke test 确认无回归
- [Risk] `.exp-bundles/DPT_FRAMEWORK` symlink 被误删或未创建 → Runner 在每次执行前检查 symlink 是否存在，缺失时自动重建
- [Risk] 大 tier（如 `--tier light` ~35 cases）耗时很长 → 默认行为是跑完所有，用户可通过 `--case` 缩小范围；支持 `--timeout` 自定义 per-case 超时

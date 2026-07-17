# experiment-auto-runner

> req: EXA-001, EXA-002, EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008

## Purpose

通过 `DPT_FRAMEWORK/host_tools/run-experiment.mjs` 提供实验的自动化执行路径（Mode 2），与现有 coding-agent 交互模式（Mode 1，`RUN_EXPS.md`）并行。Runner 负责 playbook 发现、Claude Code headless 调用、结果收集和审计日志；Agent（Claude Code）负责实际的实验执行。核心可观测性通过 Agent 写入结构化 JSON 结果文件实现——用户无需观看终端输出即可获知 PASS/FAIL。

## Requirements

### Requirement: Runner script location and CLI interface

Runner SHALL 是 `DPT_FRAMEWORK/host_tools/run-experiment.mjs` 中的单个可执行 Node.js ESM 文件（`#!/usr/bin/env node`）。它 SHALL 支持以下 CLI flag：

- `--case <id>`：运行单个 case（如 `--case case-41`）
- `--group <name>`：运行整个实验组（如 `--group agentic-queue`）
- `--tier <light|standard|heavy>`：运行整档实验
- `--cleanup-pass`：PASS+CLEAN 时清理 disposable bundle
- `--timeout <ms>`：per-case 超时（默认 600000ms）
- `--json`：仅输出 JSON 到 stdout（机器消费模式）
- `--dry-run`：发现但不执行，打印将要运行的 case 列表

无参数时 SHALL 默认运行所有 Light case。

Exit code: 0 = 所有执行 case PASS；1 = 至少一个 FAIL；2 = runner 自身错误（参数错误、playbook 不存在）。

#### Scenario: Run single case
- **WHEN** 用户执行 `node DPT_FRAMEWORK/host_tools/run-experiment.mjs --case case-41`
- **THEN** runner 发现并执行 case-41，输出结构化结果
- **AND** exit code 反映 PASS/FAIL

#### Scenario: Run entire tier
- **WHEN** 用户执行 `node DPT_FRAMEWORK/host_tools/run-experiment.mjs --tier light`
- **THEN** runner 发现所有 weight=light 的 playbook，串行执行每个，输出汇总 report

#### Scenario: Dry run
- **WHEN** 用户执行 `node DPT_FRAMEWORK/host_tools/run-experiment.mjs --tier light --dry-run`
- **THEN** runner 打印将要执行的 case 列表但不启动 Claude Code

### Requirement: Headless Claude Code invocation

Runner SHALL 复用 `claude-deepseek.mjs` 的环境映射逻辑（`.env` 解析、`ANTHROPIC_*` 变量映射、contamination 清除）来构造子进程环境。Runner SHALL 以 `stdio: 'pipe'` 模式 spawn `claude -p`（headless print mode），通过 prompt 指令 Agent 执行指定 playbook。

Prompt SHALL 包含：
- 要执行的 playbook 文件路径
- 要求 Agent 严格按 playbook step 执行（不跳过、不改写 bash blocks）
- 要求 Agent 在 Step 1 的 `new-disposable-bundle.mjs` 命令中添加 `--target-dir .exp-bundles`
- 要求 Agent 将结果写入 bundle 内的 `<bundle-path>/exp_result.json` 的明确指令和 JSON schema
- PASS+CLEAN 清理、FAIL 保留的策略

Per-case 超时 SHALL 通过 `spawnSync` 的 `timeout` 选项实现；超时后进程被 SIGTERM 终止，标记为 TIMEOUT。

#### Scenario: Successful invocation
- **WHEN** runner spawns `claude -p` 并设置正确的 `ANTHROPIC_*` 环境变量
- **THEN** Claude Code 以 headless 模式执行 playbook
- **AND** Agent 将 verdict 结果写入 `<bundle>/exp_result.json`

#### Scenario: API unavailable
- **WHEN** `claude -p` 无法连接 API
- **THEN** runner 检测到非零 exit code 和缺失的结果文件
- **AND** 标记该 case 为 ERROR，附带连接失败原因

### Requirement: Structured result file contract

Agent 执行完成后 SHALL 将结果写入 bundle 内部的 `<bundle-path>/exp_result.json`。每个 bundle 有唯一名称（含随机 hex 后缀），因此不同 case 或同一 case 的多次运行不会互相覆盖。格式为：

```json
{
  "case": "<case-id>",
  "verdict": "PASS|FAIL|NOT_RUN",
  "health": "CLEAN|ISSUES|null",
  "checks_total": <number>,
  "checks_passed": <number>,
  "bundle": "<bundle-path>",
  "bundle_preserved": <boolean>,
  "error": "<error-message-or-null>"
}
```

Runner SHALL 在 Agent 进程退出后读取 `<bundle-path>/exp_result.json` 确定 verdict。若文件缺失或 malformed，SHALL 标记为 ERROR。

#### Scenario: Result file present and valid
- **WHEN** Agent 写入合法 JSON 到 bundle 内的 `exp_result.json`
- **THEN** runner 解析文件并提取 verdict、health、checks 信息
- **AND** 将结果纳入汇总 report

#### Scenario: Result file missing after agent completes
- **WHEN** Agent 进程退出但 `<bundle>/exp_result.json` 不存在
- **THEN** runner 标记 case 为 ERROR，reason 为 "result_file_missing"

#### Scenario: Concurrent runs do not conflict
- **WHEN** 两个 runner 进程同时执行不同 case
- **THEN** 各自创建不同名称的 bundle
- **AND** 各自的 `exp_result.json` 在不同 bundle 内，不会互相覆盖

### Requirement: Playbook discovery and filtering

Runner SHALL 扫描 `experiments_playbook/` 下所有 `case-*.md` 文件，解析 YAML frontmatter 中的 `weight`、`case`、`experiment` 字段来建立 playbook 清单。Runner SHALL 按以下规则过滤：

- `--case <id>`：仅返回 frontmatter `case` 字段匹配的 playbook
- `--group <name>`：仅返回 frontmatter `experiment` 字段匹配的 playbook
- `--tier <tier>`：仅返回 frontmatter `weight` 字段匹配的 playbook
- 无过滤参数：返回所有 `weight: light` 的 playbook

Runner SHALL NOT 硬编码 per-case dispatch table——发现逻辑完全由文件系统和 frontmatter 驱动。

#### Scenario: Discover all light cases
- **WHEN** runner 无参数执行
- **THEN** 返回所有 frontmatter weight=light 的 playbook，按 case ID 排序

#### Scenario: Missing frontmatter
- **WHEN** playbook 文件缺少 YAML frontmatter 或缺少 `weight` 字段
- **THEN** runner 跳过该文件并记录 warning

### Requirement: Cleanup policy compliance

Runner SHALL 遵循与 `RUN_EXPS.md` 相同的 cleanup 策略：

- PASS + health CLEAN → 清理 bundle（仅在 `--cleanup-pass` 时）
- PASS + health ISSUES → 保留 bundle
- FAIL → 保留 bundle
- NOT_RUN → 无 bundle 需清理
- TIMEOUT/ERROR → 保留 bundle（如有）

清理前 SHALL 将 verdict 追加到 `_temp/exp_verdicts.jsonl`（使用 `wff-playbook-utils.mjs` 的 `recordVerdict` 兼容格式）。

#### Scenario: PASS+CLEAN with cleanup flag
- **WHEN** case PASS、health CLEAN 且传了 `--cleanup-pass`
- **THEN** runner 删除 disposable bundle 目录并追加 verdict 到审计日志

#### Scenario: FAIL preserves bundle
- **WHEN** case FAIL
- **THEN** runner 不删除 bundle，report 中标记 `bundle_preserved: true`

### Requirement: Human case skip

Runner SHALL 按以下规则处理 Human case：

- case ID 在 901–949 范围 → 自动跳过，verdict 为 HUMAN，reason 为 "requires human judgment"
- case ID 在 950–999 范围（AI-judge dual）→ 正常执行（如同 weight 决定自动化可行性）
- `exph_` 目录前缀不作为唯一判断依据——以 case ID 范围为准

#### Scenario: Human case 901
- **WHEN** 发现 case-901
- **THEN** runner 跳过，report 中 verdict=HUMAN

#### Scenario: AI-judge case 951
- **WHEN** 发现 case-951
- **THEN** runner 正常执行（如同其 weight 为 heavy，可能需要 `--real-result`）

### Requirement: Bundle isolation in `.exp-bundles/`

Runner SHALL 将所有 Mode 2 产生的 disposable bundle 隔离到 repo-root `.exp-bundles/` 目录。Runner 在初始化时 SHALL：

- 创建 `.exp-bundles/` 目录（如不存在）
- 创建 symlink `.exp-bundles/DPT_FRAMEWORK → ../DPT_FRAMEWORK`（如不存在），确保 playbook inline `.mjs` 脚本中的 `../DPT_FRAMEWORK/` import 路径正确解析
- 在 prompt 中指示 Agent 传递 `--target-dir .exp-bundles` 给 `new-disposable-bundle.mjs`

Runner 写入 `.exp-bundles/_last_run.json` 缓存最近一次运行的摘要，格式为包含 `run_id`、`filter`、`summary`、`results` 的 JSON 对象。JS 脚本可直接读取此文件而无需扫描 `.exp-bundles/` 下所有 bundle 目录。

`.exp-bundles/` SHALL 添加到 `.gitignore`。

#### Scenario: First run creates directory and symlink
- **WHEN** Runner 首次执行且 `.exp-bundles/` 不存在
- **THEN** Runner 创建目录和 symlink
- **AND** 后续 playbook 执行正常

#### Scenario: Symlink already exists
- **WHEN** `.exp-bundles/DPT_FRAMEWORK` symlink 已存在
- **THEN** Runner 跳过创建，不报错

#### Scenario: Bundle created in isolation directory
- **WHEN** Agent 执行 playbook Step 1 使用 `--target-dir .exp-bundles`
- **THEN** disposable bundle 创建在 `.exp-bundles/dpt_disp_<case>_<name>_<hex>/`
- **AND** repo root 不受 `dpt_disp_*` 目录污染

#### Scenario: Inline script imports resolve correctly
- **WHEN** playbook inline `.mjs` 脚本从 `.exp-bundles/dpt_disp_xxx/` 内部执行 `import '../DPT_FRAMEWORK/engine/trace.mjs'`
- **THEN** Node.js 通过 symlink `.exp-bundles/DPT_FRAMEWORK/` 解析到正确的 framework 文件

### Requirement: Audit log integration

Runner SHALL 在 case 执行完成后（包括 PASS、FAIL、NOT_RUN、HUMAN）将 summary 追加到 `_temp/exp_verdicts.jsonl`。每行 SHALL 是有效 JSON，包含 `ts`、`case`、`bundle`、`verdict`、`checks` 字段，格式与 `wff-playbook-utils.mjs` 的 `recordVerdict` 输出兼容。

Runner SHALL 在 stdout 输出的 JSON report 中同时包含 `summary` 对象（`total`/`pass`/`fail`/`not_run`/`error` 计数）和 `results` 数组（per-case 详情）。

#### Scenario: Multiple cases produce aggregate summary
- **WHEN** runner 执行 3 个 case（2 PASS, 1 FAIL）
- **THEN** report.summary 包含 `{total: 3, pass: 2, fail: 1, not_run: 0, error: 0}`
- **AND** `_temp/exp_verdicts.jsonl` 追加 3 行

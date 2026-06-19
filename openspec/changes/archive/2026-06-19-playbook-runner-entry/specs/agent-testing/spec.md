# Agent Testing
> req: AGT-005, AGT-006, AGT-007, AGT-008

## ADDED Requirements

### Requirement: Playbook frontmatter weight field

每个 command experiment playbook 的 YAML frontmatter SHALL 包含 `weight` 字段，值为 `light` 或 `heavy`。

- `light`: 纯 JS engine 执行——playbook 不启动真实 LLM subagent。适合频繁跑（改完 framework 代码后）。
- `heavy`: 启动真实 Claude Code subagent 或等效 LLM agent actor——playbook 消耗 token 且耗时显著长于 light。适合选择性跑（subagent 机制变更时）。

weight 字段 SHALL 在 frontmatter 中紧接 `case` 字段之后。未显式指定 weight 的 playbook SHALL 被 AI 视为 heavy（保守默认）。

#### Scenario: Light playbook frontmatter

- **WHEN** 打开 `experiments_playbook/exp_gate-fork/test-simple.md`
- **THEN** frontmatter 包含 `weight: light`

#### Scenario: Heavy playbook frontmatter

- **WHEN** 打开 `experiments_playbook/exp_subagent/test-simple.md`
- **THEN** frontmatter 包含 `weight: heavy`

#### Scenario: AI distinguishes light from heavy by frontmatter

- **WHEN** coding agent 读取 playbook frontmatter
- **THEN** agent 从 `weight` 字段判断该 playbook 的执行成本
- **AND** agent 默认运行 light playbook，heavy 只在明确要求时运行

#### Scenario: Missing weight field

- **WHEN** playbook frontmatter 缺少 `weight` 字段
- **THEN** coding agent SHALL 将其视为 heavy（保守默认，避免意外触发昂贵执行）
- **AND** agent SHALL 向用户报告"以下 playbook 缺少 weight 字段，已默认视为 heavy"，列出文件名

#### Scenario: RUN.md manifest weight disagrees with frontmatter weight

- **WHEN** RUN.md 清单中列出的 playbook weight 与 frontmatter 中的 `weight` 字段不一致
- **THEN** coding agent SHALL 以 frontmatter 为准（frontmatter 是 Source of Record）
- **AND** agent SHALL 更新 RUN.md 清单使其与 frontmatter 一致

### Requirement: Disposable bundle names include random suffix

`experiments/shared/new-disposable-bundle.mjs` 在生成 disposable bundle 目录名时 SHALL 在 case 名后追加一位随机 hex 字符（`0-9a-f`）。例如 `dpt_disp_agq_simple` → `dpt_disp_agq_simple_a`。以此防止同 case 在同一 session 内重复跑或并发跑时的目录冲突。

所有 playbook 的 cleanup step SHALL 使用确定性清除方式，不依赖重新调用 `new-disposable-bundle.mjs` 获取目录名：
- 优先使用 `$B` 变量（playbook Step 1 保存的 bundle 路径）
- 或使用 glob 模式 `rm -rf dpt_disp_<short>_*` 清除所有匹配目录

#### Scenario: Bundle name has random hex suffix

- **WHEN** 调用 `new-disposable-bundle.mjs agq_simple --force`
- **THEN** 创建的目录名为 `dpt_disp_agq_simple_x`，其中 `x` 为 `[0-9a-f]` 之一
- **AND** 每次调用生成不同的随机后缀

#### Scenario: Cleanup uses glob to avoid stale bundles

- **WHEN** playbook 的 cleanup step 执行 `rm -rf dpt_disp_agq_simple_*`
- **THEN** 所有之前跑过的 `dpt_disp_agq_simple_*` 目录（无论随机后缀）均被清除
- **AND** 不依赖记住具体的随机后缀

#### Scenario: Race-safe re-run

- **WHEN** 同 case 的 playbook 在同一 session 内被跑两次
- **THEN** 两次创建的 bundle 目录不同（随机后缀不同），不冲突

### Requirement: Unified trace file naming

所有 command experiment playbook SHALL 使用统一的 trace 文件名 `_trace.jsonl`（位于 bundle 目录根），不再使用实验族差异化命名（如 `_trace_agq_cli.jsonl`、`_trace_subagent.jsonl`、`_trace_gf_simple.jsonl`）。

Bundle 目录已提供物理隔离（且本 change 引入随机后缀），trace 文件不需再靠文件名区分实验族来源。

所有 playbook 的以下位置 SHALL 使用统一 `_trace.jsonl`：
- inline `.mjs` 中 `createTrace()` 调用的路径参数
- verdict 步骤中读取 trace JSONL 的路径
- frontmatter `trace:` 字段（从精确路径更新为 `dpt_disp_<short>_<case>_*/_trace.jsonl` 前缀模式）

#### Scenario: All playbooks write to _trace.jsonl

- **WHEN** 任意 playbook 执行 inline `.mjs` 中的 `createTrace(...)`
- **THEN** trace 文件写入路径为 `<bundle>/_trace.jsonl`

#### Scenario: Verdict reads from _trace.jsonl

- **WHEN** playbook 执行 verdict 步骤
- **THEN** 代码从 `<bundle>/_trace.jsonl` 读取 trace events 并裁决

#### Scenario: Frontmatter trace field uses unified name

- **WHEN** 人打开任意 playbook 查看 frontmatter
- **THEN** `trace:` 字段指向 `_trace.jsonl`（含 bundle 目录前缀），不再包含实验族特定命名

### Requirement: Verdict output uses ANSI color

所有 command experiment playbook 的 verdict `console.log` SHALL 使用 ANSI 颜色码区分 PASS/FAIL 结果：
- PASS: `\x1b[32m` (green) 后接 `\x1b[0m` (reset)
- FAIL: `\x1b[31m` (red) 后接 `\x1b[0m` (reset)

此要求适用于每个 playbook 的 verdict 步骤中向终端输出的最终 `console.log`。中间 `check` event 的 trace 条目不受此约束（trace JSONL 是结构化数据，不使用 ANSI 颜色）。

在 bash heredoc `<< 'JS'` 中写入 JS 代码时，escape 写法 SHALL 为 `\x1b`（单反斜杠）——JS 的 hex escape 在运行时产生 ESC 字符。`\\x1b`（双反斜杠）在 JS 中产生字面量 `\x1b` 文本，不会触发颜色。

#### Scenario: Verdict PASS is green

- **WHEN** playbook verdict 步骤输出 PASS
- **THEN** 终端显示绿色 `SIMPLE PASS`（或 `MEDIUM PASS`、`COMPLEX PASS`、`IDENTITY PASS`）

#### Scenario: Verdict FAIL is red

- **WHEN** playbook verdict 步骤输出 FAIL
- **THEN** 终端显示红色 `SIMPLE FAIL`（或 `MEDIUM FAIL`、`COMPLEX FAIL`、`IDENTITY FAIL`）

#### Scenario: Escape syntax is correct in heredoc

- **WHEN** playbook 的 bash heredoc `<< 'JS'` 块内写入 ANSI escape
- **THEN** JS 字符串字面量使用单反斜杠 `'\x1b[32m'`（而非 `'\\x1b[32m'`）
- **AND** Node.js 运行时将 `\x1b` 解释为 ESC 字符并产生正确的终端颜色

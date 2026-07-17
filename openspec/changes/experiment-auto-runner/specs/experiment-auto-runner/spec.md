# experiment-auto-runner

> req: EXA-001, EXA-002, EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008

## Purpose

通过 `DPT_FRAMEWORK/host_tools/run-experiment.mjs`（auto runner）提供实验的自动化执行路径（Mode 2），与现有 coding-agent 交互模式（Mode 1）并行。核心架构：**两份 runner instruction（`RUN_TUI_EXPS.md` + `RUN_CLI_EXPS.md`），playbook 不动**。TUI 模式下 Agent 执行+裁决+清理；CLI 模式下 Runner 编排+裁决+清理，Agent 仅执行 playbook。

## Requirements

### Requirement: Runner script location and CLI interface (EXA-001)

Runner SHALL 是 `DPT_FRAMEWORK/host_tools/run-experiment.mjs` 中的单个可执行 Node.js ESM 文件。SHALL 支持：

- `--case <id>`：运行单个 case，`<id>` 与 playbook frontmatter `case` 字段精确匹配（如 `--case case-41-light-minimal-path-light-minimal-path`）
- `--group <name>`：运行整个实验组
- `--tier <light|standard|heavy>`：运行整档
- `--cleanup-pass`：PASS+CLEAN 时清理 bundle
- `--timeout <ms>`：per-case 超时（默认 600000ms）
- `--json`：仅输出 JSON 到 stdout
- `--dry-run`：仅发现不执行

无参数时默认运行所有 Light case。Exit code: 0 = 全部 PASS；1 = 有 FAIL；2 = runner 自身错误。

#### Scenario: Run single case
- **WHEN** `node run-experiment.mjs --case case-41-light-minimal-path`
- **THEN** runner 发现并执行 case-41，输出结构化结果，exit code 反映 PASS/FAIL

#### Scenario: Dry run
- **WHEN** `node run-experiment.mjs --tier light --dry-run`
- **THEN** 打印将要执行的 case 列表但不启动 Claude Code

### Requirement: Shared manifest + two runner instructions, playbook unchanged (EXA-002)

原 `experiments_playbook/RUN_EXPS.md`（case 清单 + TUI 执行规则混在一起）SHALL 重构为三个文件：

- **`PLAYBOOK_MANIFEST.md`**（新增）：所有 case 的权威清单——Light/Standard/Heavy/Human 四档表格、选择规则、迁移记录。两份 runner instruction 均引用此文件作为"跑哪些"的数据源。
- **`RUN_TUI_EXPS.md`**（重构）：TUI 交互模式执行规则——Agent 读 MANIFEST 获取 case 列表，按 TUI 协议执行（含 verdict step、cleanup step），可反问用户。
- **`RUN_CLI_EXPS.md`**（新增）：CLI 自动化模式执行规范——明确 Runner-Agent 分工。Runner 负责发现 playbook、spawn Agent、读 trace 裁决、health check、cleanup；Agent 负责读 playbook、执行 bash blocks（加 `--target-dir .exp-bundles`、skip verdict、skip cleanup、打印进展标记和 `BUNDLE=<path>`）。

所有 `case-*.md` playbook 文件 SHALL NOT 修改。MANIFEST 定义"有哪些 case"，playbook 定义"验证什么"，instruction 定义"怎么跑"。

#### Scenario: TUI mode references shared manifest
- **WHEN** coding agent 读取 `RUN_TUI_EXPS.md`
- **THEN** 指令引用 `PLAYBOOK_MANIFEST.md` 获取 case 清单
- **AND** Agent 按 TUI 协议执行（verdict + cleanup 由 Agent 负责）

#### Scenario: CLI mode follows CLI instruction
- **WHEN** Agent 收到包含 `RUN_CLI_EXPS.md` 内容的 prompt
- **THEN** Agent 理解自己是 headless 执行者，Runner 是裁决者
- **AND** Agent 按 CLI 规范执行：加 --target-dir、skip verdict/cleanup、打印进展标记和 BUNDLE=<path>

### Requirement: Runner reads instruction and orchestrates Agent (EXA-003)

Runner SHALL 读 `RUN_CLI_EXPS.md`，将其内容作为 prompt 前缀，追加 playbook 路径信息，发送给 headless Claude Code。Agent SHALL 按 CLI instruction 执行 playbook。Runner 在 Agent 退出后自行从 bundle 的 `rb_trace.jsonl` 提取 verdict。

Runner SHALL 写入 `<bundle>/exp_result.json` 作为 bundle 内结果摘要。

#### Scenario: Agent executes, Runner judges
- **WHEN** Agent 完成 playbook 执行并退出
- **THEN** Runner 在 `.exp-bundles/` 下找到 bundle
- **AND** Runner 读取 `rb_trace.jsonl` 的 `check` events 裁决 PASS/FAIL
- **AND** Runner 写入 `exp_result.json`

#### Scenario: Agent fails to produce bundle
- **WHEN** Agent 退出但 bundle 未找到
- **THEN** Runner 标记 case 为 ERROR

### Requirement: Playbook discovery and filtering (EXA-004)

Runner SHALL 扫描 `experiments_playbook/` 下所有 `case-*.md` 文件，解析 YAML frontmatter 的 `weight`、`case`、`experiment` 字段。支持 `--case`/`--group`/`--tier` 过滤。无参数默认 `weight: light`。

所有 tier（light/standard/heavy）均可被 Runner 自动化执行。Runner 不区分 tier 做特殊处理——tier 仅影响默认过滤和 health check profile。Human case（901-949）除外。

#### Scenario: Filter by tier
- **WHEN** `--tier heavy`
- **THEN** 返回所有 weight=heavy 的 playbook 并正常执行（已验证 case-211 PASS）
- **AND** health check 使用 `--profile heavy`

### Requirement: Cleanup policy compliance (EXA-005)

PASS+CLEAN（仅 `--cleanup-pass` 时）→ 删 bundle。FAIL → 保留。NOT_RUN/HUMAN → 无 bundle。清理前追加 `_temp/exp_verdicts.jsonl`。

#### Scenario: PASS+CLEAN with cleanup flag
- **WHEN** case PASS、health CLEAN、传了 `--cleanup-pass`
- **THEN** 删除 `.exp-bundles/` 下的 bundle，追加 verdict 到审计日志

#### Scenario: FAIL preserves bundle
- **WHEN** case FAIL
- **THEN** bundle 保留在 `.exp-bundles/`，report 标记 `bundlePreserved: true`
- **AND** verdict 追加到审计日志

#### Scenario: No cleanup flag preserves all
- **WHEN** 未传 `--cleanup-pass`
- **THEN** 无论 PASS 还是 FAIL，bundle 均保留

### Requirement: Human case skip (EXA-006)

case ID 901–949 → HUMAN（跳过）。950–999（AI-judge dual）→ 正常执行。

#### Scenario: Human case 901
- **WHEN** 发现 case-901
- **THEN** skip，verdict=HUMAN

### Requirement: Audit log and JSON report (EXA-007)

Runner SHALL 输出 JSON report（summary + results 数组），追加每个 case 的 verdict 到 `_temp/exp_verdicts.jsonl`。

#### Scenario: Batch run produces summary
- **WHEN** 3 cases（2 PASS, 1 FAIL）
- **THEN** report.summary = {total:3, pass:2, fail:1}
- **AND** audit log 追加 3 行

### Requirement: Bundle isolation in `.exp-bundles/` (EXA-008)

Runner 初始化时创建 `.exp-bundles/` 目录和 symlink `.exp-bundles/DPT_FRAMEWORK → ../DPT_FRAMEWORK`（幂等）。Agent 在 prompt 指令下使用 `--target-dir .exp-bundles`。`.exp-bundles/` 加入 `.gitignore`。

#### Scenario: First run creates directory and symlink
- **WHEN** 首次执行且 `.exp-bundles/` 不存在
- **THEN** 创建目录和 symlink

#### Scenario: Bundle created in isolation directory
- **WHEN** Agent 执行 playbook Step 1 使用 `--target-dir .exp-bundles`
- **THEN** disposable bundle 创建在 `.exp-bundles/dpt_disp_<case-id>_<name>_<hex>/`
- **AND** repo root 不受 `dpt_disp_*` 目录污染

#### Scenario: Inline script imports resolve via symlink
- **WHEN** playbook inline `.mjs` 从 `.exp-bundles/dpt_disp_xxx/` import `../DPT_FRAMEWORK/...`
- **THEN** Node.js 通过 symlink 正确解析到 framework 文件

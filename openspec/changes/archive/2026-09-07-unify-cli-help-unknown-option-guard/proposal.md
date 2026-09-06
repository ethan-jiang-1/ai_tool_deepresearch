# Change: unify-cli-help-unknown-option-guard

## Why

6 个 parseArgs 类 CLI 对 `--help` 或任何未声明选项会抛**未处理的 Node 内部 `ERR_PARSE_ARGS_UNKNOWN_OPTION`**，打印 `node:internal/...` stack dump 并以 exit 1 退出（2026-09 复测全部复现）。这些 CLI 是 `repair-run-bundle.md` §3 点名的诊断/修复入口，脚本化调用会把 exit 1 误判为"检查失败"，人类用户会误以为安装/环境损坏。

来源：`_backlog/bugs/BUG-256-cli-help-unknown-option-unhandled-crash.md`（P3，含现场测量表）。根因是框架没有共享的参数解析 helper 强制执行 `--help` 约定，各文件支持与否全凭自觉（BUG-059/095/160 的残余面）。

已接受的 `openspec/specs/engine/cli-exit-code-conventions/spec.md`（CLE-001~004）第 112–117 行明确预留："Any future effort to unify all utility CLIs … SHALL be a separate OpenSpec change" —— 本 change 就是那个 separate change，把 help/unknown-option 约定从"selected public operation surfaces"扩展到本批 parseArgs 工具 CLI。

## What Changes

- 新增共享 helper `DEEP_RESEARCH_HARNESS/engine/helpers/cli-args.mjs`：包装 `node:util` `parseArgs`，统一两条守卫——
  - 参数中含独立 `--help`/`-h` → 打印该 CLI 的 Usage 行、exit 0（对齐 `instantiate-run-bundle`/`operate-artifact-persistence` 既有行为）；
  - 其余未声明选项 → 捕获 `ERR_PARSE_ARGS_UNKNOWN_OPTION`，打印 `invocation error: <msg>` + Usage 行、exit 2（对齐 `validate-workflow-package` 既有行为与 CLE-001 三态约定）。
- 6 个受影响 CLI 接入该 helper：`reconcile-plan-progress.mjs`、`audit-phase-status.mjs`、`check-reentry.mjs`、`log-event.mjs`、`validate-work-unit-hygiene.mjs`、`apply-research-style.mjs`。
- `log-event.mjs` 例外条款收窄（**BREAKING** 于该 CLI 的 invocation 路径）：诊断/日志失败仍退 0（不得阻塞 Agent 流不变）；但 `--help`/`-h` 打 Usage 退 0，未知选项/无法解析的 invocation 打错误 + Usage 退 2。已接受 spec 中"always-0"例外条款随之修订为"诊断/日志结果 always-0，invocation 拒绝走 code-2"。
- 修订已接受 spec `engine/cli-exit-code-conventions`（CLE-001/CLE-003/CLE-004 delta）：把本批 6 个 CLI 纳入 help/unknown-option 约定与例外清单，`log-event` 例外表述同步收窄，回归覆盖要求扩展到本批 CLI。
- 更新 `DEEP_RESEARCH_HARNESS/COMMANDS.md` 与 `DEEP_RESEARCH_HARNESS/cli/README.md` 的例外清单，使 inventory 与新行为一致。
- 新增 `node:test` 回归：helper 单元测试 + 每个受影响 CLI 的 `--help`（exit 0、stdout/stderr 含 Usage、无 stack dump、无 bundle 副作用）与未知选项（exit 2、含错误与 Usage）探针。

**非目标（不做）**：

- 不改变各 CLI 既有参数集合与领域行为契约（含 `apply-research-style` 缺参仍退 1、`validate-work-unit-hygiene` 仍为二元 0/1 等"现状即例外"的路径——本 change 只接管 help 与 unknown-option 两个入口）。
- 不新增长帮助文本：仅 Usage 行 + exit code 约定。
- `validate-bundle.mjs`（把 `--help` 当路径的 positional 家族）不做守卫，另开卡。
- gate CLI（`parseGateCliArgs` 已有自己的 invocation 契约）与 `host_tools/` 自定义 parseArgs 面不在本 change。
- 已优雅的对照面（`validate-workflow-package`、`operate-post-final-recovery`、`operate-*`、`instantiate-run-bundle`）不重构到新 helper。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/cli-exit-code-conventions` | `openspec/specs/engine/cli-exit-code-conventions/spec.md` 全文（CLE-001~004）；`openspec/governance/req-registry.yaml` L410–413 | Modify | observable behavior（6 个 CLI 的 help/unknown-option exit code 与例外清单）正由该 spec 拥有；其 112–117 行显式预留本次 unification 为独立 change。复用既有 CLE-001/003/004 requirement，不新增 ID |
| `engine/cli-inspect-output-conventions` | catalog 行 + 关键词（inspect output, diagnostics） | Excluded | 本 change 只定 exit code 与 Usage 行，不改 structured inspect/diagnostic 输出格式 |
| `engine/check-inspect-feedback` | catalog 行 | Excluded | check/inspect/advice 词汇与 verdict 结构不变 |
| `engine/framework-engine` | catalog 行 | Excluded | 无 Engine 边界变化；helper 仍是确定性 invocation 处理 |
| `agent/queue-input-validation` | catalog 行（CLI safety 关键词命中） | Excluded | 它拥有 queue 准入与 bundle identity 校验，不拥有通用 CLI help/exit 约定 |

无 New capability：`cli.exit-code-convention` semantic fact family 已在 `openspec/governance/semantic-fact-families.yaml` catalog 中，行为 owner 是既有 `engine/cli-exit-code-conventions` spec。

## Impact

- 代码：新增 `DEEP_RESEARCH_HARNESS/engine/helpers/cli-args.mjs`；修改 `DEEP_RESEARCH_HARNESS/cli/` 下 6 个文件（仅参数解析入口，不动领域逻辑）。
- 测试：`tests/`（JS-led，`node:test` + `node:assert`，纯 Node built-ins；helper 单测放 `tests/engine/helpers/`，batch 运行时探针/inventory/静态锁扩展既有 `tests/integration/cli/exit-code-convention.test.mjs`）。
- 文档：`DEEP_RESEARCH_HARNESS/COMMANDS.md`、`DEEP_RESEARCH_HARNESS/cli/README.md`、`DEEP_RESEARCH_HARNESS/cli/` 各受影响文件头注释的 exit code 行。
- Spec：`openspec/specs/engine/cli-exit-code-conventions/spec.md` 在 archive/sync 时接收 delta。
- 责任边界：Engine（helper + CLI）拥有确定性 exit code verdict；Agent 依 CLE-001 既有条款读取 structured stdout/Usage 决定下一步；无新 permission、无新 lifecycle state、无 user decision 新增。

## Source of Record / 最短闭环 / Net simplification

- Direct Source of Record：共享 helper `cli-args.mjs` 是 help/unknown-option 行为的唯一裁决点；spec delta 是该约定的行为权威。
- 最短合法闭环：CLI → helper（解析/守卫）→ exit code + Usage；不引入新状态、不写 trace、不新增检查器。
- Net simplification：**删除** 6 处各自为政的裸 `parseArgs` 崩溃路径，**合并** 为一处 helper；对照组里已有的三种手写守卫模式（help 声明、try/catch、guard 扫描）不再向新 CLI 复制——未来 parseArgs 类 CLI 只需一行接入。不新增 fallback/retry/state。

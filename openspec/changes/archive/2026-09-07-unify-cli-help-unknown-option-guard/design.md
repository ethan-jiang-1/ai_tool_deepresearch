# Design — unify-cli-help-unknown-option-guard

## Context

6 个 parseArgs 类 CLI 的 `main()`/模块顶层直接 `parseArgs({ options })`，无 `help` 声明、无 unknown-option 预检、无 catch（见 proposal.md Why，来源 `_backlog/bugs/BUG-256-...md`）。对照组已有三种手写守卫模式：

- help 声明式：`operate-queue.mjs`、`operate-artifact-persistence.mjs`（`help: { type:'boolean', short:'h' }`）、`instantiate-run-bundle.mjs`（standalone-help 扫描 + try/catch failUsage）；
- try/catch 优雅拒绝：`validate-workflow-package.mjs`（`invocation error: <msg>` + Usage，exit 2）；
- 前置 guard 扫描：`operate-work-unit.mjs`（`isHelpToken`/`guardInvocation`）。

已接受的 `openspec/specs/engine/cli-exit-code-conventions/spec.md` 拥有本行为（CLE-001~004），并显式把 utility CLI unification 预留给独立 change。约束：Node.js >=20、纯 ESM、零新依赖、`node:test` + `node:assert`；回归布局跟随既有 `tests/integration/cli/` 先例（见 D5），不引入网络或真实 Agent 执行。

## Goals / Non-Goals

**Goals:**

- 一处 helper 裁决 help / well-formed / unknown-option 三类解析结果与对应 exit class（0 / 域内 / 2）。
- 6 个受影响 CLI 全部接入；`log-event.mjs` 例外条款按用户决策收窄为"诊断/日志结果 always-0，invocation 拒绝 code-2"。
- 回归分层：helper 纯函数单元覆盖（`tests/engine/helpers/`）+ batch 运行时探针/静态锁/文档锁扩展既有 `tests/integration/cli/exit-code-convention.test.mjs`（见 D5）。

**Non-Goals:**

- 不改任何 CLI 的 post-parse 域行为、必选参数处理、结构化 stdout envelope（`apply-research-style` 缺参退 1、`validate-work-unit-hygiene` 二元 0/1 等现状即例外，保持并在 docs 里显式记录）。
- 不做长帮助文本；只有 Usage 行。
- 不迁移 gate CLI（`parseGateCliArgs`）、`host_tools/`、positional-path 家族（`validate-bundle`）或已优雅的对照面。
- 不新增 state、trace event、permission 或 user decision 点。

## Decisions

### D1. 共享 helper 是"结果分类器"，不是第二套 parser

新增 `DEEP_RESEARCH_HARNESS/engine/helpers/cli-args.mjs`，导出纯函数：

```js
parseGuardedArgs({ args, options, usage })
// → { kind: 'help' }                        // 独立 --help/-h token
// → { kind: 'ok', values, positionals }     // 转发 node:util parseArgs（strict, 允许 default/boolean 声明原样使用）
// → { kind: 'invalid', reason }             // ERR_PARSE_ARGS_UNKNOWN_OPTION 等解析异常，reason 取 error.message
```

设计要点与备选：

- **选它**：helper 返回结果、由 CLI 决定输出通道（stdout JSON / stderr）与 `process.exit`。原因：6 个 CLI 的输出通道不同（`log-event` 全静默、`check-reentry` 走 fd 1、`audit-phase-status` 走 stdout JSON），把输出/exit 收进 helper 会造出第二套输出契约，违反 helper-oriented（Engine 只出 verdict，边界由各 CLI 既有出口呈现）。
- **备选（否决）**：像 `operate-artifact-persistence` 那样给每个 CLI 声明 `help` boolean 选项——`--help` 会与 `--bundle` 混用无法判定 standalone 语义，且要逐文件复制；像 `cli-operation-contract.mjs` 的 `parseOperationInvocation`——那是 strict-form 语法（positional forms），与 parseArgs 选项式 CLI 形状不同，强行统一会改动既有 spec 拥有的 selected surfaces。
- standalone help 判定：`args` 去掉首个 `--` 后存在 `--help`/`-h` token 即 `kind:'help'`（`--` 之后视为操作数，不触发）。与 `instantiate-run-bundle.mjs` 的 `hasStandaloneHelp` 语义对齐。

### D2. log-event 例外收窄（用户已拍板）

`log-event.mjs`：invocation 拒绝（未知选项）→ stderr 打 `invocation error` + Usage、exit 2；`--help` → Usage、exit 0；well-formed 之后的一切诊断/日志失败仍 exit 0。spec delta 已同步修订 CLE-001/CLE-003。代价：脚本化调用 log-event 拼错 flag 时 exit 从"崩溃 1"变"2"，对 Agent 是更可读的 caller-error 信号，不阻塞机制不变。

### D3. 各 CLI 的 exit class 映射（不改既有域内码）

| CLI | help | unknown option | 依据 |
|---|---|---|---|
| `reconcile-plan-progress` | 0 + Usage | 2 | 既有 missing-bundle 已是 2 |
| `audit-phase-status` | 0 + Usage | 2 | 头注释 2 = invocation error |
| `check-reentry` | 0 + Usage | 2 | 头注释 2 = config error |
| `log-event` | 0 + Usage | 2（D2） | spec delta 收窄 |
| `validate-work-unit-hygiene` | 0 + Usage | 2 | 新引入 invocation class；域内仍 0/1 |
| `apply-research-style` | 0 + Usage | 2 | 新引入 invocation class；缺参仍 1（现状保留，docs 记为例外） |

help 判定：`--` 分隔符之前存在 `--help`/`-h` token 即 help（含与其它选项混用），不落到 parseArgs，保证永不崩。delta spec 的措辞与 D1 一致（token before `--`，非 operate-work-unit 式 strict standalone）。

### D4. CLI 文件改法：入口一行接入

每个文件把顶层 `const { values } = parseArgs({...})` 替换为：

```js
const parsed = parseGuardedArgs({ args: process.argv.slice(2), options: {...}, usage: USAGE_TEXT });
if (parsed.kind === 'help') { console.log(USAGE_TEXT); process.exit(0); }
if (parsed.kind === 'invalid') { console.error(`invocation error: ${parsed.reason}\n${USAGE_TEXT}`); process.exit(2); }
const { values } = parsed;
```

options 声明逐字保留（含 default），域内代码零改动。输出通道**统一**：help → stdout（含 `Usage:`，与既有 selected-ops 回归断言对齐）；invalid → stderr（`invocation error:` + `Usage:`，与 `validate-workflow-package` 及既有回归断言对齐）——既有 `exit-code-convention.test.mjs` 对 selected ops 已断言这两个可匹配面，统一通道让本批断言同构。

Usage 文本取自各文件头注释现有 Usage 行。**例外**：`validate-work-unit-hygiene.mjs` 头注释无 Usage 行（已核实），为其新写一行 `Usage: node DEEP_RESEARCH_HARNESS/cli/validate-work-unit-hygiene.mjs [--root <path>] [--json]` 并补进头注释——仍是一行 Usage，不构成长帮助文本。

### D5. 回归布局：跟随既有 integration 先例，不发明第三种证据层

**（Polish Pass 1 修正）** 原设计的"纯静态锁、不开子进程"与仓库既有实践冲突：`tests/integration/cli/exit-code-convention.test.mjs`（CLE-004 现行回归，`@impl CLE-001/003/004`）已用 `spawnSync` 对真实 CLI 做代表性运行时探针，6 个 CLI 各自的 `tests/integration/cli/*.test.mjs` 也全部 `execSync` 调真实进程。按 verification-routing 的词汇，`external_calls` 指网络等外部服务，本地子进程属合法 deterministic 执行。修正后的证据布局：

1. **helper 单元测试**（unit）：`tests/engine/helpers/cli-args.test.mjs`（镜像 `engine/helpers/` 布局，与 `canonical-topic-state.test.mjs` 等同区）——import 纯函数，断言 `help`/`ok`/`invalid` 三类结果、`--` 边界、default/boolean 透传、`ERR_PARSE_ARGS_UNKNOWN_OPTION` reason 透出。
2. **batch 运行时探针 + inventory + 文档锁**（integration）：扩展 `tests/integration/cli/exit-code-convention.test.mjs`——
   - 新增 6 CLI 的 `--help`（exit 0、stdout 含 `Usage:`、无 `node:internal`）与未知选项（exit 2、stderr 含 `invocation error` + `Usage:`）探针；
   - 新增 batch 静态锁：6 个源码 import `engine/helpers/cli-args.mjs` 且不再直接调 `node:util` `parseArgs`（CLE-004 "Regression detects a guarded CLI bypassing the shared helper"）；
   - **必须同步更新**其 `CLI_CONVENTION_INVENTORY`：6 个 CLI 的 class 文案改为 guarded batch 描述；`log-event` 的 `/always-0/` 字面检查（要求全部字面 exit===0）必须放宽为"除 invocation 拒绝 `exit(2)` 外全为 0"，否则新增 exit(2) 必炸此测试；保留 `validate-workflow-package.mjs` 相关既有断言与其依赖的 COMMANDS.md 原文行（"` is a reconciled tri-state surface`"、"Known doc/code drift" 不含该项）。
3. **各 CLI 既有 integration 测试**（`log-event.test.mjs` 等）不改动即应继续通过：它们的样本不含未知选项；apply 后跑全量确认。

不新建 `tests/engine/cli-help-doc-inventory.test.mjs`（原计划）——文档断言收进 exit-code-convention.test.mjs 已有结构，避免第二个文件锁同一批文档。

### D6. 文档同步点

已核实的锚点：`COMMANDS.md` L53（canonical interpretation 段）、L70（`log-event.mjs` always-0 例外条目）、L168 邻近的命令表；`cli/README.md` L78（"Many utility validators are binary 0/1..."）、L79（log-event 例外条目）、L85（"Only the following public operations use the canonical topic-state static invocation helper... not a claim that every utility shares that parser" 段）。同步内容：guarded batch 新条目、`log-event` 例外改写为"诊断/日志结果 always-0 + invocation 拒绝 code-2"、"batch 已统一、其余 utility 仍例外"。同时核对 6 个文件头注释的 Usage/Exit codes 行与实现一致（`log-event` 头注释 "Always exits 0" 必须改写；`reconcile-plan-progress`/`validate-work-unit-hygiene`/`apply-research-style` 头注释无 exit code 行则补一行）；发现其它漂移按 spec "drift is recorded, not hidden" 记录进 apply notes。

### 宪法 triad 应用记录

- **Semantic precision**：读者（Agent caller）的有界问题 = "这个 CLI 对 help / 我拼错的 flag 会退几、打印什么"。新增的唯一具名概念是 shared argument-guard helper（Engine 内部模块，非 reader-facing state/view）；正常推理停止点 = exit code + Usage 行，语义修复仍归 Agent。
- **Simple reliable control**：direct Source of Record = `cli-args.mjs`（解析 verdict）+ `cli-exit-code-conventions` spec（行为契约）；最短闭环 = CLI → helper → exit/Usage，无中间状态。
- **Helper-oriented**：user decision 无新增；Agent 依既有 CLE-001 条款读结构化输出；Engine 拥有确定性 exit verdict。

## Risks / Trade-offs

- [standalone help 判定比 `operate-work-unit` 宽（help token 存在即 help）] → 取舍已写入 spec 文字与 D3；未来若需 strict 形态，另开 change，不影响本批（6 个 CLI 均无与 help 冲突的 positional 语义）。
- [`validate-work-unit-hygiene` / `apply-research-style` 引入 exit 2 属新退出类] → 已在 delta CLE-003 inventory 显式记录，含"域内 0/1 不变"边界；`apply-research-style` 缺参退 1 与 invocation 退 2 并存作为 recorded exception。
- [静态锁基于源码文本，重构（如换 import 写法）会误报] → 锁匹配模块引用与 `parseGuardedArgs` 调用面，不锁引号/排版；失败信息指向漂移文件。
- [log-event exit 2 对极端"尽力而为"调用方是行为变化] → BREAKING 已在 proposal 标注；受影响调用面是 Agent 拼错 flag 的场景，修复路径更明确；well-formed 失败仍 always-0。
- [helper 不接管 positional/required 校验] → 有意收窄；required 校验仍是各 CLI 域内逻辑，避免 helper 变成第二套 `cli-operation-contract`。

## Migration Plan

Apply 顺序：helper → helper 单测（red→green）→ 逐 CLI 接入（每接一个跑静态锁）→ 文档同步 → governance 收尾检查。回滚：revert 单个 commit 即可，helper 为纯新增文件，无数据/状态迁移。

## Open Questions

无。scope 与 log-event exit code 均已由用户拍板。

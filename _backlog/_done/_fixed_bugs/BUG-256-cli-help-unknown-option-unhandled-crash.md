# BUG-256 — parseArgs CLI 未处理 `--help`/未知选项，抛 Node 内部 stack dump（reconcile-plan-progress 等 6 个）

> 报障日期：2026-09-07 · 报障人：Deep Research Harness Coding Agent（`dpt_rb_harness-agent-selection-project-execution-pilot` 修理轮实测触发）
> Severity：P3（CLI 可用性/DX；无数据损坏、不影响 gate/Final，但污染官方 repair/诊断路径的机器可读输出并误导用户）
> 涉及文件：`DEEP_RESEARCH_HARNESS/cli/reconcile-plan-progress.mjs`（主），及同根同症状 5 个：
> `audit-phase-status.mjs`、`check-reentry.mjs`、`log-event.mjs`、`validate-work-unit-hygiene.mjs`、`apply-research-style.mjs`

## 一、现象

对上述任一 CLI 传 `--help`（或任何未声明选项），不打印 usage，而是抛 **未处理的 Node 内部 TypeError**，exit 1：

```
node:internal/util/parse_args/parse_args:102
      throw new ERR_PARSE_ARGS_UNKNOWN_OPTION(
TypeError [ERR_PARSE_ARGS_UNKNOWN_OPTION]: Unknown option '--help'
    at checkOptionUsage (node:internal/util/parse_args/parse_args:102:13)
    ...
```

现场测量（2026-09-07，cwd=repo 根，全部 `--help`）：

| CLI | exit | 首个输出 | 行为 |
|---|---|---|---|
| `reconcile-plan-progress.mjs` | 1 | `node:internal/util/parse_args/parse_args:102` | 未处理 stack dump |
| `audit-phase-status.mjs` | 1 | 同上 | 未处理 stack dump |
| `check-reentry.mjs` | 1 | 同上 | 未处理 stack dump |
| `log-event.mjs` | 1 | 同上 | 未处理 stack dump |
| `validate-work-unit-hygiene.mjs` | 1 | 同上 | 未处理 stack dump |
| `apply-research-style.mjs` | 1 | 同上 | 未处理 stack dump |
| `validate-workflow-package.mjs` | 2 | `invocation error: Unknown option '--help'` + Usage | 优雅（对照组） |
| `operate-post-final-recovery.mjs` | 2 | `{`（错误 JSON 对象） | 非崩溃（对照组） |
| `plan-hostfile-sections.mjs` | — | Usage 文本 | 优雅（对照组） |
| `inspect-bundle.mjs` | — | Usage 文本 | 优雅（对照组） |
| `validate-bundle.mjs` | 0 | `✗ rb_status.json: missing ✗ rb_queue.json: missing` | 把 `--help` 当 bundle 路径（只读、无垃圾，但输出误导） |

对照组里已有 **--help 完整支持**：`operate-work-unit.mjs:51`、`operate-queue.mjs:44`、`operate-artifact-persistence.mjs:53`（parseArgs 声明 `help:{type:'boolean',short:'h'}`）、`instantiate-run-bundle.mjs:66`。

## 二、根因

6 个受影响 CLI 的 `main()` 都直接 `parseArgs({ options: {...} })`，无 `help` 选项、无 unknown-option 预检、无 catch。Node `parseArgs` 对未声明选项抛 `ERR_PARSE_ARGS_UNKNOWN_OPTION`，未被捕获 → 抛出 `node:internal/...` 内部栈帧。框架没有共享的参数解析 helper 强制执行 `--help` 约定，支持与否全凭各文件自觉（BUG-095/160 曾修过一部分，残余面未扫完）。

## 三、影响

- `repair-run-bundle.md` §3 命令入口索引点名的诊断/修复工具（audit-phase-status、check-reentry、log-event、reconcile-plan-progress）首次 `--help` 即吞掉一堆 Node 内部栈；脚本化调用把 exit 1 误判为"检查失败"，人类用户误以为安装/环境损坏。
- 同类 CLI 行为四分五裂（支持 / 优雅报错 / 内部 dump / 把选项当路径），找用法得去读源码或猜。
- 无数据损坏、不影响任何 gate 判定或 Final 交付（纯 DX 缺陷）。

## 四、修复方向

- **(a) 推荐——统一 unknown-option 守卫（一处 helper，全员套用）**：`parseArgs` 前先扫参数含 `--help`/`-h` 立即打印该 CLI 的 Usage 行并以 0 退出（对齐 `instantiate-run-bundle`/`operate-artifact-persistence` 既有行为）；其余未知选项 catch `ERR_PARSE_ARGS_UNKNOWN_OPTION` 打印错误 + Usage 并以 2 退出（对齐 `validate-workflow-package`）。新增共享 helper（如 `engine/helpers/cli-args.mjs`）供 parseArgs 类 CLI 统一引用。
- **(b) 最小集**：至少给 `reconcile-plan-progress.mjs` 补守卫——它是 repair playbook 点名的工具，本批其余 5 个列入同一 change 的 regression 清单。
- 非目标：不改变各 CLI 既有参数与行为契约；不新增长帮助文本（仅 Usage 行 + exit code 约定）。

## 五、关联已知项

- BUG-160（`operate-topic-state`/`operate-queue` 无 `--help`，P3）——本卡同家族，是其在剩余 6 个 parseArgs CLI 上的残余面。BUG-059（`--help` 曾创建垃圾目录）、BUG-095（`instantiate-run-bundle` `--help` 零写入）已修复并作为本卡对照组；本次 probe 复测未发现新的垃圾目录创建。
- 触发场景实录：修理 `dpt_rb_harness-agent-selection-project-execution-pilot` 时对 `reconcile-plan-progress.mjs --help` 探测参数，首次命中。
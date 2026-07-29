---
bug_id: BUG-150
title: "inspect-wave0-output treats --help as a bundle path and emits a misleading domain failure"
severity: P2
discovered: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
phase: wave0
node: phases/phase-wave0.md
category: cli-invocation-contract
---

# BUG-150: Wave0 inspect does not handle `--help` as a CLI invocation

## 现象

在探测 `inspect-wave0-output` 的调用界面时执行：

```bash
node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --help
```

命令退出码为 `1`，但没有输出帮助或调用参数错误。CLI 将字面量 `--help`
当作 bundle 路径，随后针对不存在的
`/Users/bowhead/ai_tool_deepresearch/--help` 运行 Wave0 领域检查，并返回：

```text
[wave0_topic_registry_prerequisite] Wave0 cannot expand per-topic contracts because canonical topic_registry is empty.
```

返回 JSON 中的 `hints[].write_to` 和 `hints[].rerun` 也继续传播了这个错误路径：

```text
... operate-topic-state.mjs inspect --bundle /Users/bowhead/ai_tool_deepresearch/--help
... inspect-wave0-output.mjs --bundle /Users/bowhead/ai_tool_deepresearch/--help
```

## 预期行为

1. `--help` 应输出该 CLI 的用法并以 `0` 退出，或至少被识别为受支持的帮助选项。
2. 对未知选项、缺少 `--bundle` 值或 bundle 路径不存在等调用错误，应返回
   structured invocation/configuration finding，并遵循命令索引约定的 exit code `2`，
   而不能进入 Wave0 业务 evaluator。
3. 诊断中的 `checkpointCommand`、`write_to` 和 `rerun` 不应包含未经校验的
   `--help` 或其他非 bundle 参数。

## 影响

自动化 Agent 或 operator 若用常见的 `--help` 探测命令能力，会得到一个看似真实的
Wave0 blocker，并可能沿着错误的 `topic_registry` repair 路径继续操作。该错误把
caller/invocation fault 伪装成业务状态故障，增加误修复和错误审计记录的风险。

## 诊断结论

`inspect-wave0-output.mjs` 当前只检查 `bundlePath` 是否为空；当没有 `--bundle` flag
时直接把 `process.argv[2]` 当作 bundle 路径，未对选项 token、路径存在性或目录身份做
调用层校验。Wave0 evaluator 因而接管了本应在 CLI invocation boundary 结束的输入。

## 建议方向（需走 OpenSpec propose/explore/apply）

- 为该 CLI 及同类 inspect CLI 统一增加帮助/未知参数/缺值处理，并在入口先完成
  bundle 目录存在性与身份校验。
- 保持调用错误与领域检查的 structured schema 和 exit code 分层：调用错误走 `2`，
  合法 bundle 的 Wave0 失败才走 `1`。
- 增加 deterministic regression，断言 `--help` 不会触发 topic-registry evaluator，
  并断言所有返回的 repair command 使用已校验的 bundle 路径。

## Non-goals

- 不修改当前 active bundle 的 status、queue、trace、ledger 或 work-unit authority。
- 不把本次错误调用生成的领域诊断当成 Wave0 的真实 blocker；该 bundle 的真实问题仍
  由正式 `--bundle <path>` inspect 输出决定。

## 接手信息

- Active bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Red surface: `node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --help`
- Observed exit code: `1`
- Owner boundary: `inspect-wave0-output.mjs` argument parsing and invocation validation

## 模型与归因备注（2026-07-29）

- 本次主 Coding Agent：Codex；运行时可见模型族为 GPT-5，精确 deployment/model ID
  未暴露。
- Agent 用常见的 `--help` 探测 CLI 属于正常调用习惯，不能据此判定模型太弱；把选项当
  bundle 路径并进入领域 evaluator 是 deterministic CLI invocation bug。
- 调整方向：指导层可要求先读 `COMMANDS.md` 的确切调用形状，但 CLI 仍必须在入口处理
  `--help`、未知参数、缺值和非法路径，避免把调用错误伪装成业务 blocker。

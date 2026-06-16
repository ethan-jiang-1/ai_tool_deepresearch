# Agent Guide

Deep Research Framework (DPT_FRAMEWORK) 的操作守则。

## 第一条
打开 `COMMANDS.md` 找到你要做的事。不要凭记忆工作。

## 执行模式
- 操作前 reload 所有控制文件
- Queue 为空且无法 refill 时才能停止
- 停止授权: 仅 final_delivery / decision_blocker / empty_queue_after_refill
- 不要修改 `../DPT_FRAMEWORK/` 中的文件

## 质量保障
- `node DPT_FRAMEWORK/cli/check.mjs <bundleDir>` — Zod 校验
- `node DPT_FRAMEWORK/cli/inspect.mjs <bundleDir>` — 结构检查
- `node DPT_FRAMEWORK/cli/check-req-ids.mjs` — Requirement ID 合规

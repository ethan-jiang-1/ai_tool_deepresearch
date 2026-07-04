# Changelog

## v0.2

Sub-agent execution logging 活过来 + provenance 取证诊断。新增 relay driver CLI（`drive-relay-slot stage/commit/merge`）端到端驱动 slot 生命周期，闭合"引擎函数无 runtime 调用者"缺口；beacon 模式（`_beacon.json`）让 sub-agent 在隔离 context 中定位 bundle/logger/nonce；staging+commit trace 事件 nonce-anchored（SUD-007）；role spec/task.md 强制 lifecycle logging。gate 增加 diagnostic-only provenance 取证（RPG-007..013，不改 pass/fail）+ 框架自带判断指南（`provenance-forensics-guide.md`，6-tier 判决矩阵），使下一个 coding agent 能据落地证据判决手糊 vs 真 relay。RPG-008 `runLogCommit` 检测改为匹配 `] INFO relay_commit_done` 结构化 log 行，避免 diagnostic reason 文本误触发导致 forensics 二次运行 silent。SDC-001/002 正式声明 `_subagents/wave_NN/slot_MM/` 为 relay slot artifact 目录；WDC-004 同步 catalog `_subagents/`。审查收口：accepted spec 直调措辞去噪（SSOT 统一为 driver-first，经 `drive-relay-slot` 驱动 + validator 反模式锁）、forensics 解析收紧（RPG-007 reason 细分 / RPG-011 结构化解析 / RPG-012(c) lifecycle nonce 交叉核对）、5 角色 role spec 全覆盖 + lifecycle logging 指令单一模板、E2E verdict 留档（`exp_verdicts.jsonl`）与 BUG-019 受控 E2E 判决回写。

## v0.1

初始版本。DPT_FRAMEWORK 入口 RUN.md 支持 drag-trigger，agent 读到即启动多阶段 gate 驱动的 Deep Research 流程。

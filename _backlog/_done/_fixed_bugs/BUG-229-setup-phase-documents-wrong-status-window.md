# BUG-229: `phase-setup.md` §3 文档写出错误的期望 status window（与 setup gate 实际要求相反）

> 状态: 活跃 | 优先级: P3 | 严重度: P3 | 更新: 2026-08-17 | source: 真实 run 执行（dpt_rb_ai-transformation-organization，Setup phase）

## Why（完整上下文）

Setup phase（`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-setup.md`）§3
「Allowed Actions」要求 Agent 检查 status drift，原文：

> - 检查 `rb_status.json` 仍然是 `current_gate: setup_ready` / `next_gate:
>   seed_topics_ready`（无 status drift）

但这是 **setup gate 通过之后**的状态，不是 gate 之前的状态。gate 前（HITL1
完成后、进入 setup 时）的合法窗口是 `current_gate: hitl1_recorded` /
`next_gate: setup_ready`。setup gate（`check-gate-setup-ready.mjs`）实际要求：

- `status_current_gate`: expected `"setup_ready"`（拿到时是 `hitl1_recorded` → fail）
- `status_next_gate`: expected `"seed_topics_ready"`（拿到时是 `setup_ready` → fail）

gate 的 hints 才给出正确修复：`advance-status --to setup_ready`（bootstrap
compatible `hitl1_to_setup` 窗口）。也就是说：文档让 Agent 检查「已经是 setup_ready
且无 drift」，而实际必须先 `advance-status --to setup_ready` 才能让 gate 通过——
文档描述的 pre-gate 状态与 gate 期望完全相反。

## 复现

1. 完成 HITL1（`advance-status --to hitl1_recorded` 后），
   `enter-phase --node phases/phase-setup.md`。
2. 按 `phase-setup.md` §3 检查 `rb_status.json`：
   ```json
   { "current_gate": "hitl1_recorded", "next_gate": "setup_ready", "current_node": "phases/phase-setup.md" }
   ```
   （与文档声称的 `setup_ready`/`seed_topics_ready` 不符，Agent 可能误判为 drift。）
3. 运行 setup gate：
   ```bash
   node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle <bundle> --current-node phases/phase-setup.md
   ```
4. fail：`status_current_gate` / `status_next_gate`；hints 给出
   `advance-status --to setup_ready`，执行后再 rerun gate 才通过。

## 影响（本 run 实账）

- Setup 一次 gate fail + 一次手动推断（从 hint 读正确命令）。耗时约 5 分钟。
- 对严格按文档自检的 Agent，文档与 gate 相反会导致误判 drift 或困惑。

## 为什么是框架缺陷（不是 Agent 执行错误）

- phase 文档是 Agent 的操作权威；它描述的状态窗口与实际 gate 校验语义相反，
  属于文档-契约不一致。`advance-status` 的 bootstrap-compatible 分支
  （`hitl1_to_setup`）才是合法路径，文档未提及。

## Owner / 最小修复方向

- Owner: `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-setup.md` §3。
- 最小修复：把该条改为「检查 gate 前窗口 `current_gate: hitl1_recorded` /
  `next_gate: setup_ready`；gate pass 后经
  `enter-phase --node phases/phase-seed-topics.md` + `advance-status --to setup_ready`
  才进入 `setup_ready`/`seed_topics_ready`」；并在 §5 或 §6 注明
  `advance-status --to setup_ready` 是 gate 通过的前置（bootstrap 窗口）。

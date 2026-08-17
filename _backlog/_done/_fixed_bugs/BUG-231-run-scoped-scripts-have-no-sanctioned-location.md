# BUG-231: 框架未为 run-scoped helper 脚本规定规范落点 —— Agent 在 run 期间把脚本生产到 repo 根目录（应进 run bundle `_scripts/`）

> 状态: 活跃 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-17 | source: 真实 run 执行（dpt_rb_ai-transformation-organization，全程）

## Why（完整上下文）

Deep Research run 需要 Phase Agent 在 wave 执行中编写一些 run 内部的一次性 helper
脚本：work-unit 执行器（真实搜索+抓取+写 cache/result）、reference/seed 生成器、
恢复脚本（从 ledger 重建 result.json）等。这些脚本**只服务于当前 run bundle**，
不是框架代码，也不该进入仓库版本控制。

但框架（`DEEP_RESEARCH_HARNESS/` 的 phase 文档、shared nodes、README「目录性质」
与 `AGENTS.md` 的 run 边界）**没有为「Agent 自产脚本」定义规范落点**：只定义了
bundle 内的运行时区域 `_cache/`、`_logs/`、`_work_units/` 等，没有 `_scripts/` 或
等价约定，也没有「run-scoped 脚本不得写 repo 根」的指引/守卫。结果 Agent 只能按
自己的习惯，把脚本放在 repo 根目录（本次生产了 11 个 `.wu*.mjs` / `.gen*.mjs`）。

**既有的 gitignore 打补丁证据**：repo 根 `.gitignore` 第 83-84 行已存在
`/.gen-*.mjs` 与 `/.wu*-*.mjs` 忽略模式——说明这个污染模式在更早的 run 里已经
发生过，当时用 gitignore 掩盖（脚本不进 git），但**没有治本**：脚本仍留在工作区
根目录，与 run bundle 分离，无法按 bundle 追溯，且任何不读 gitignore 的流程都会
把它们当脏文件。

## 复现

1. 开始一个 Deep Research run（任意 bundle）。
2. 在 wave0/wave1 执行中，Agent 按需编写 work-unit executor / reference 生成器：
   ```bash
   # 本次实际做法（错误落点）
   cd /Users/bowhead/ai_tool_deepresearch
   cat > .wu1-exec.mjs <<'EOF' ... EOF
   node .wu1-exec.mjs "$B" "$W" /tmp/wu1-cfgs/01.json
   ```
3. 脚本落在 repo 根目录（`/Users/bowhead/ai_tool_deepresearch/.wu1-exec.mjs`），
   而非 current run bundle root。
4. run 结束后脚本滞留根目录（gitignore 挡住提交但工作区仍脏）。

本次实测：`.wu-exec.mjs`、`.wu-restore.mjs`、`.wu1-exec.mjs`、`.wu1sup-exec.mjs`、
`.gen-shared-refs.mjs`、`.gen-wave0-packets.mjs`、`.gen-wave1-closeout.mjs`、
`.gen-wave1-packets.mjs`、`.gen-wave1-refs2.mjs`、`.gen-wave1-sup-closeout.mjs`、
`.gen-wave2.mjs` 共 11 个全部落在 repo 根。

## 影响（本 run 实账）

- 根目录污染：11 个 run 内部脚本留在 repo 根；gitignore 仅挡提交，不挡工作区。
- run 产物与 bundle 分离：脚本本应作为 run 的 durable 资产随 bundle 归档（
  bundle 是唯一 durable state 载体），放根目录后无法按 bundle 追溯「这个 run 用
  了哪些脚本」。
- 其他 Agent/任务可能误读根目录的 `.mjs` 为框架或项目代码。
- 清理成本：run 结束后需要人工识别并迁移（本次已迁入
  `dpt_rb_ai-transformation-organization/_scripts/`）。

## 为什么是框架缺陷（不是 Agent 执行错误）

- 框架定义了 bundle 的运行时目录族（`_cache/`、`_logs/`、`_work_units/` 等），
  并对 Agent 写入这些区域有明确约定；但「Agent 自产 run 脚本」这个必然发生的
  写入类别没有任何落点约定与守卫，Agent 只能自行决定（默认落到 repo 根）。
- 既有的 gitignore 模式证明该污染反复发生，是系统性引导缺失，不是单次执行错误。

## Owner / 最小修复方向

- Owner: `DEEP_RESEARCH_HARNESS/README.md`（「目录性质」/ run 边界）+ 
  `DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs`（scaffold）+
  `AGENTS.md`（run 边界硬规则）。
- 最小修复（建议组合）：
  1. 在 harness README「目录性质」与 AGENTS.md 中规定：**run-scoped 辅助脚本
     必须写入 current run bundle root 的 `_scripts/`（`_` 前缀运行时目录），
     不得写入 repo 根或框架目录**。
  2. `instantiate-run-bundle.mjs` 预建 `_scripts/` scaffold + README（与
     `_logs/`、`_cache/` 同模式），让 Agent 有明确落点。
  3. 可选守卫：validate-bundle / preflight 检测 repo 根新增的
     `.gen-*.mjs` / `.wu*-*.mjs` 类文件给出 hint（或作为 silent_degradation
     提示），引导 Agent 移入 bundle `_scripts/`；同时移除 gitignore 里这两条
     打补丁模式（治本后不再需要）。
- 验收：完整 real-actor run 全程不产生 repo 根脚本文件；run 内脚本均位于
  bundle `_scripts/` 且随 bundle 保留。

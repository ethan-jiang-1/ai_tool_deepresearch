# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Deep Research Tool (Spec Coding Rewrite)

We are rebuilding a deep research system — turning a broad research question into an evidence-backed, multi-wave, gated research report. The original V12 system was "vibe coded" (Markdown-governed, agent-self-enforced) and became unmaintainable. This rewrite uses **spec-driven development** with **pure Node.js/TypeScript**.

**Core principle:** The Engine enforces rules (schemas, state machines, receipts). The LLM Agent produces content (searches, reads, writes evidence, synthesizes). Never again should an agent self-police gate passage, queue integrity, or stop authorization.

## Reference material (`_` directories — DO NOT READ unless explicitly asked)

- `_original_dpt_v12/` — Original V12 template (Markdown-governed deep research). Read only when comparing against old behavior.
- `_original_dpt_requirement/` — Recovered requirements analysis in 9 files (00–08). `08-redesign-recommendations.md` is the target architecture.

These are archives. Do not read them proactively. The source of truth for what we're building is in the OpenSpec changes and specs.

## Tech Stack

- **Runtime:** Node.js ≥20, TypeScript (strict mode)
- **Package manager:** npm (workspaces, comes with Node.js)
- **批准的 npm 依赖（仅 2 个，不可新增）：**
  - `zod` — Schema 定义与运行时校验（替代手写 validate*()）
  - `yaml` — YAML 文件解析与序列化（`profile.yaml`、`deep-research.yaml`）
- **其余全部使用 Node.js 内置模块：**
  - `node:util.parseArgs()` — CLI 参数解析（不用 Commander.js）
  - `node:fs/promises` — 文件读写
  - `node:test` + `node:assert` — 测试（不用 Vitest）
  - `node:path` — 路径处理
- **Markdown frontmatter（plan.md）：** 正则提取 `---` 块 → `JSON.parse()`（不用 gray-matter）
- **终端输出：** `console.log`（不用 chalk）

## OpenSpec workflow

This project uses OpenSpec for spec-driven development:

- `/opsx:propose "idea"` — Create a new change proposal with design, specs, and tasks
- `/opsx:apply` — Implement tasks from the current change
- `/opsx:archive` — Archive a completed change
- `/opsx:explore` — Enter explore mode to think through problems before coding

Changes live in `openspec/changes/<name>/`. Specs live in `openspec/specs/<capability>/`.


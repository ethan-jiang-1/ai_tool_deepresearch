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

- **Runtime:** Node.js ≥20, TypeScript strict mode
- **Package manager:** pnpm (monorepo)
- **Schema/Validation:** Zod (runtime validation + static type inference)
- **State machines:** XState (gate progression, HITL flow, queue lifecycle)
- **CLI:** Commander.js + Ink (React-based terminal UI)
- **Markdown I/O:** unified/remark (AST-level parse/write, V12 format compatible)
- **Testing:** Vitest

## OpenSpec workflow

This project uses OpenSpec for spec-driven development:

- `/opsx:propose "idea"` — Create a new change proposal with design, specs, and tasks
- `/opsx:apply` — Implement tasks from the current change
- `/opsx:archive` — Archive a completed change
- `/opsx:explore` — Enter explore mode to think through problems before coding

Changes live in `openspec/changes/<name>/`. Specs live in `openspec/specs/<capability>/`.


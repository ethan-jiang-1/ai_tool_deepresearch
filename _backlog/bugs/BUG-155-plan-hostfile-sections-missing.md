---
bug_id: BUG-155
title: plan-hostfile-sections.mjs referenced by phase-hitl1 but file missing at expected path
severity: P2
phase: hitl1
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-155: plan-hostfile-sections.mjs missing

## What happened

`phase-hitl1.md` §3b.1 instructs the Agent to use `plan-hostfile-sections.mjs`'s `renderSuppliedControls()` to write user research controls:

> 无额外控制时写入精确 no-controls sentence；有控制时用 `plan-hostfile-sections.mjs` 的 `renderSuppliedControls()` 在 `rb_plan.md## Constraints > ### User Research Controls` 写入精确 label 和 literal snapshot。

Running the command:

```
node DPT_FRAMEWORK/cli/plan-hostfile-sections.mjs renderSuppliedControls ...
```

Produces:

```
Error: Cannot find module '.../DPT_FRAMEWORK/cli/plan-hostfile-sections.mjs'
```

## Investigation

The file does not exist at `DPT_FRAMEWORK/cli/plan-hostfile-sections.mjs`. However, `canonical-topic-state.mjs` imports `locateCanonicalSections` from `./plan-hostfile-sections.mjs`:

```js
import { locateCanonicalSections } from './plan-hostfile-sections.mjs';
```

This means the module exists at `DPT_FRAMEWORK/engine/helpers/plan-hostfile-sections.mjs` (as a library import), but there is no CLI wrapper at `DPT_FRAMEWORK/cli/plan-hostfile-sections.mjs`.

## Impact

The Agent cannot follow the phase instruction as written. In this run, I manually wrote controls into `rb_plan.md` instead. The phase instruction references a non-existent CLI surface — a contract gap between the phase Markdown and the actual Engine surface.

## Expected behavior

Either:
- Create the CLI wrapper at `DPT_FRAMEWORK/cli/plan-hostfile-sections.mjs` that exposes `renderSuppliedControls()`, OR
- Update `phase-hitl1.md` §3b.1 to direct the Agent to write controls directly into `rb_plan.md` (since it's an Agent-writable surface)

**Why:** Phase instructions are the contract between the framework and the Agent. Referencing a non-existent command creates a `missing_contract` situation that the Agent must work around, weakening the structural integrity the gates are designed to enforce.

**How to apply:** Check if `renderSuppliedControls` exists in `engine/helpers/plan-hostfile-sections.mjs`. If yes, wrap it in a thin CLI. If not, update the phase instruction.

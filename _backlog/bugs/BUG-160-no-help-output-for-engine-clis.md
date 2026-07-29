---
bug_id: BUG-160
title: operate-topic-state and operate-queue CLIs have no --help or usage output
severity: P3
phase: hitl1, seed-topics
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-160: No --help output for Engine CLIs

## What happened

Both `operate-topic-state.mjs` and `operate-queue.mjs` reject `--help` as an invalid invocation:

```
$ node DPT_FRAMEWORK/cli/operate-topic-state.mjs --help
{"error": "invalid_invocation", "reason": "operation must be inspect, apply or recover"}

$ node DPT_FRAMEWORK/cli/operate-queue.mjs --help
{"error": "invalid_invocation", "reason": "Unknown option '--help'"}
```

There is no way to discover:
- What operations are supported
- What flags each operation requires
- What the expected input format is
- What the output schema looks like

## Impact

The Agent must:
1. Run the command with wrong/incomplete arguments → get error
2. Read the Engine source code to understand the interface
3. Infer the correct invocation from `parseArgs` options and Zod schemas

For `operate-topic-state.mjs`, this meant reading ~200 lines of `canonical-topic-state.mjs` to understand the `apply` input format. For `operate-queue.mjs`, this meant trial-and-error with `enqueue`, `claim`, and `complete` subcommands.

This is related to BUG-158 (schema discoverability) but distinct: BUG-158 is about the `apply` input schema shape; BUG-160 is about the CLI interface itself — subcommands, flags, and basic usage.

## Expected behavior

Running the CLI without arguments (or with `--help`) should print:
```
Usage: operate-topic-state.mjs <operation> [options]

Operations:
  inspect      Inspect canonical topic state
  apply        Apply topic mutations or enrichment
  recover      Recover from a previous operation

Options:
  --bundle <path>     Path to run bundle
  --input <path>      JSON input file (required for apply)
  --operation-id <id> Operation ID (required for recover)

Run 'operate-topic-state.mjs schema --context <value>' to see expected input schemas.
```

Same for `operate-queue.mjs`:
```
Usage: operate-queue.mjs <operation> <bundle> [options]

Operations:
  check      Check queue health
  enqueue    Enqueue a task card
  claim      Claim next available task
  complete   Complete a claimed task
  ...
```

**Why:** The Agent is the primary user of these CLIs. Every invocation starts with zero knowledge of the interface. Without `--help`, the Agent's only discovery path is reading Engine source — the least efficient and most error-prone method.

**How to apply:** Add a `printUsage()` function to each CLI that fires when no arguments are given or `--help` is passed. The usage should list all operations, required flags per operation, and point to schema discovery for input formats. This is a ~20-line change per CLI with outsized DX impact.

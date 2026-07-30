---
bug_id: BUG-158
title: operate-topic-state apply schema is context-dependent with zero discoverability
severity: P1
phase: hitl1, seed-topics
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-158: operate-topic-state apply schema is context-dependent with zero discoverability

## What happened

The same `operate-topic-state.mjs apply --input <file>` command accepts **completely different JSON schemas** depending on the `context` field:

| `context` value | Schema | Used in phase |
|---|---|---|
| `"hitl1"` | `MutationPlanSchema` (actions: add_topic/update_intent) | hitl1 |
| `"seed_topics"` | `SeedEnrichmentPlanSchema` (enrichment: hypothesis/in_scope/...) | seed-topics |
| `"wave_projection"` | `ProjectionPacketSchema` (updates: slot_id + entries) | wave0/1/2 closeout |

There is NO discoverability mechanism — no `--help`, no schema endpoint, no `inspect` mode that shows the expected schema for the current phase. The Agent must read `canonical-topic-state.mjs` source code to discover:
1. Which schemas exist
2. Which `context` values map to which schemas
3. What fields each schema requires

## Concrete failures

In this run:
- First HITL1 apply attempt: used `scope_role: "baseline"` (invalid), `must_answer: "string"` (should be array), missing `context` field → all received "Invalid input"
- First enrich_seed attempt: missing `context: "seed_topics"` → "Invalid input"

Each failure required grepping the Engine source to discover the correct schema shape.

## Impact

This is the **single biggest source of friction** in the current run. Of the ~6-8 repair cycles encountered so far, ~4 were caused by schema discovery failures in `operate-topic-state apply`. Each cycle costs 2-3 tool calls (run → fail → grep source → fix → rerun).

## Expected behavior

1. `operate-topic-state.mjs` without arguments (or with `--help`) should print usage including the supported `context` values
2. An `operate-topic-state.mjs schema --context <value>` command should print the expected JSON schema for that context
3. Validation errors should include field-level detail (see BUG-153)

**Why:** The Agent is the primary user of this CLI. The current design assumes the Agent already knows the schema shape for each phase context. In practice, the Agent discovers schemas by reading Engine source — a fragile, slow, and error-prone pattern that contradicts the framework's contract-lineage design principle.

**How to apply:** Add a `schema` subcommand that outputs the Zod schema as JSON Schema for a given context. Add `--help` output listing valid contexts. Fix validation errors per BUG-153.

## C3 Disposition (2026-07-30)

C3 adds read-only `operate-topic-state schema --context <context>`. Its narrow structural visitor derives supported context/action forms, field shapes, closed values, and only templates the actual top-level schema parses; unsupported or unverifiable forms fail closed with code `2`. It deliberately does not infer lifecycle authorization or expose a second writer path.

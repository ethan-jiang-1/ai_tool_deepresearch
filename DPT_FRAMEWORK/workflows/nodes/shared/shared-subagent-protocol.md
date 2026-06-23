---
node_type: shared
id: shared-subagent-protocol
shared_scope: protocol
authority: guidance-only
requires:
  - shared/shared-schemas
suggested_context: []
---

# Shared: Sub-Agent Relay Contract & Infrastructure

## Purpose

Define the relay slot communication contract, directory authority boundary, concurrency control, universal forbidden authority, and page-fetching degradation chain for all DPT sub-agent dispatch. This is **infrastructure** — the relay communication mechanism (slot lifecycle, schema validation, receipt checking, concurrency) is enforced by `DPT_FRAMEWORK/engine/subagent-relay.mjs`. Content rules (no fabrication, canonical labels, self-proving) are MD-enforced and verified by gate CLI.

Each phase has its own sub-agent instructions in `phases/phase-{wave}-subagent.md` that define what the sub-agent searches for, produces, and must never do within that phase. This shared file defines the relay mechanism those phase-specific instructions operate within.

## 1. Communication Contract — Relay Slot Files

Main-agent and sub-agent communicate exclusively through relay-managed slot files. There is no direct messaging, no shared mutable state, and no sub-agent access to WorkflowState.

### 1.1 Files the sub-agent RECEIVES (bounded context)

| File | Path | Content |
|------|------|---------|
| Task description | `_subagents/wave_NN/slot_MM/task.md` | Natural-language task from the queue task card's `action` field |
| Result schema | `_subagents/wave_NN/slot_MM/result.schema.json` | JSON Schema the sub-agent MUST satisfy in its returned JSON |

The sub-agent receives **only** these two files. It does NOT receive: WorkflowState, gate internals, other topic results, queue content, or the full phase node.

### 1.2 Files the sub-agent WRITES

| File | Content |
|------|---------|
| `_subagents/wave_NN/slot_MM/runtime-receipt.jsonl` | Two JSONL events: `agent_runtime_started` (on spawn) + `agent_result_ready` (on completion). Each event contains `slotKey`, `roleAgentKey`, `receiptNonce`. |
| `_cache/waveN/slot_MM/` | Intermediate work products: raw search results, fetched pages, extraction drafts. Reconstructable, non-authority. |
| Artifact files (e.g. `reference/{topic.slug}/source.yaml`, `artifacts/wave1/{topic.slug}/evidence-summary.md`) | Phase-specific output files written to the bundle's artifact paths. These are the sub-agent's primary deliverables. |

The sub-agent returns structured JSON matching `result.schema.json` to the parent. The parent (main-agent) writes `result.json` to the slot directory after validation.

**Note:** Artifact files are written outside the slot directory — this is expected. The bounded context protection (§1.4) is about what the sub-agent RECEIVES (only `task.md` + `result.schema.json`), not about restricting which artifact paths it can write to.

### 1.3 Files the main-agent READS (collect pipeline)

| File | When | Purpose |
|------|------|---------|
| `_subagents/wave_NN/slot_MM/runtime-receipt.jsonl` | `ingestAgentReceipt()` | Verify sub-agent actually ran (two JSONL events present) |
| `_subagents/wave_NN/slot_MM/_status.json` | `commitSlotResult()` / `writeSlotStatus()` | Write slot terminal status (done/failed); validates state transition before writing |
| `_subagents/wave_NN/slot_MM/result.json` | After `commitSlotResult()` | Validated result — main-agent reads ONLY this, NOT raw search trail |
| `_cache/waveN/slot_MM/` | **Only for debugging** | Non-authority intermediate products — default is NOT to read |

### 1.4 Context isolation is mechanism-enforced, not convention-enforced

The sub-agent cannot leak noise into main-agent context because:
1. Sub-agent receives only `task.md` + `result.schema.json` — it never sees WorkflowState, gate internals, queue contents, or other topic results. Bounded INPUT is the isolation mechanism; artifact output paths are unrestricted
2. Sub-agent's returned JSON is validated against `result.schema.json` — the schema constrains shape. Large page dumps and search trails don't fit in the schema's allowed fields
3. Main-agent collects via `commitSlotResult()` which validates and writes `result.json` — main-agent reads only this structured output
4. Self-proving files (`runtime-receipt.jsonl`) and intermediate products (`_cache/`) stay within the slot-scoped directories to prevent cross-slot collisions

## 2. Directory Structure — Authority Boundary

```
_subagents/wave_NN/slot_MM/     ← relay-managed (authority)
  task.md                       ← bounded task description
  result.schema.json            ← output shape constraint
  _status.json                  ← slot lifecycle status (pending/running/done/failed)
  _agent.json                   ← runtime identity + timestamps + validation status (written by ingestAgentReceipt/commitSlotResult)
  runtime-receipt.jsonl         ← self-proving "actually ran"
  result.json                   ← parent-validated structured result (SlotResult schema, authority)
  result.md                     ← human-readable summary (written by commitSlotResult)

_cache/waveN/slot_MM/            ← intermediate products (non-authority)
  search-results/               ← raw search output (may be low quality, not promoted)
  fetched-pages/                ← page dumps (noise source, isolated here)
  extraction-notes/             ← drafts during extraction
```

**Naming convention:** `wave_NN` in authority paths uses underscore + 2-digit zero-padded index (e.g. `wave_01`), generated by `subagent-relay.mjs` `waveDirName()`. `waveN` in cache paths uses no underscore, single digit (e.g. `wave1`). Both use `slot_MM` (2-digit zero-padded).

**Authority boundary:** `result.json` + artifact files = authority. `_cache/` = non-authority (reconstructable, deletable, not a receipt target).

**Why `_cache/` exists:** Searched-and-got-nothing still needs a trace for debugging. After the wave completes, `_cache/` can be deleted.

## 3. Concurrency Control

### 3.1 MAX_CONCURRENT_SUBAGENTS

Defined in `DPT_FRAMEWORK/engine/subagent-relay.mjs` as `MAX_CONCURRENT_SUBAGENTS = 4`.

| Value | Semantics |
|-------|-----------|
| Positive (default: 4) | Hard cap — at most this many sub-agents in flight simultaneously |
| `-1` | Unlimited — all pending task cards dispatched in a single batch |
| `0` | Invalid — treated as 1 |

### 3.2 Phase Override (aspirational — not yet implemented in engine)

A phase node MAY override the concurrency cap by declaring `max_concurrent_override` in its frontmatter with a justification comment. **Note:** the current engine (`subagent-relay.mjs`) does not yet read this frontmatter field; the override is aspirational documentation. Until implemented, `MAX_CONCURRENT_SUBAGENTS` (default 4) applies uniformly.

### 3.3 Batching

When the queue has more pending task cards than `MAX_CONCURRENT_SUBAGENTS`: first batch stages at most the cap; remaining task cards wait; as slots free up, replacements are spawned. Repeat until queue empty and all sub-agents terminal.

## 4. Forbidden Authority — Universal Sub-Agent Prohibitions

Every sub-agent role (regardless of `role_key`) MUST NOT:

### 4.1 State mutation prohibitions
- Write to WorkflowState (`rb_status.json`)
- Pass or fail a gate (gate CLI execution is main-agent authority)
- Modify the queue (`rb_queue.json`)
- Authorize stop (sub-agent cannot decide to stop the phase)
- Write to other slots' directories

### 4.2 Content prohibitions
- Fabricate source URLs, titles, or page content
- Return raw search trail to parent (use `result.schema.json` bounded output)
- Make cross-topic claims (sub-agent works on ONE topic)

### 4.3 Self-proving requirement
- `runtime-receipt.jsonl` MUST contain both `agent_runtime_started` and `agent_result_ready` events

## 5. Page Content Fetching Chain

Coding agents differ in what page-fetching capabilities they offer:

| Platform | Built-in fetch tool | Browser |
|----------|--------------------|---------|
| Claude Code | `WebFetch`（fetch URL → markdown） | Computer use（需用户显式开启） |
| Codex | 无内置 fetch 工具 | 无 |

**Tier 1 — built-in or user-enabled（优先使用）：**
- Built-in fetch tool if available (e.g. `WebFetch` in Claude Code)
- Browser-based fetching **if the user explicitly enables it** — may bypass bot detection at higher cost

If Tier 1 is unavailable, blocked, or times out, fall through to system tools.

**Tier 2 — system tools（兜底）：**
1. `curl -L <url>` (with `--max-time 30`)
2. `node -e "fetch(...)"` if curl fails
3. `python3 -c "import urllib.request; ..."` as last resort

If all tiers fail, record the access failure and proceed with remaining sources. NEVER fabricate page content from search snippets.

This is a mechanism requirement, not a convention — the sub-agent MUST exhaust the chain before reporting a source as inaccessible.

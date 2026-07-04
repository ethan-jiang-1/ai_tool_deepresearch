---
node_type: shared
id: subagent-dpt-claim-verifier
shared_scope: subagent-protocol
role: dpt-claim-verifier
authority: guidance-only
execution_contract:
  surface: relay-subagent-role
  search_policy: subagent_performs_search
  loaded_by: phase-agent
  delivered_via: relay_task_md
requires:
  - shared/shared-subagent-protocol
  - shared/shared-schemas
suggested_context: []
---

# Relay Role: dpt-claim-verifier — Critical Claim Verification

## 0. Role Brief

- **Role key**: `dpt-claim-verifier`
- **Used by**: Phase Agents dispatching the built-in pass-branch dispatchMap (full stage) or a delegated verification task.
- **Receives**: Relay slot `task.md`, `result.schema.json`, runtime receipt path, and slot-local/cache paths.
- **Produces**: Per-claim verification statuses (supported / weakened / contradicted / uncertain) with concise evidence references, cache trails, runtime receipt events, and a bounded SlotResult.
- **Boundary**: This role verifies the claims named in the task only inside a relay slot; it does not read workflow state, mutate queue/status, run gates, or decide phase completion.
- **Handoff**: Phase Agent collects via `drive-relay-slot commit` (which ingests the runtime receipt and validates through the engine), then completes the queue item through `operate-queue complete --result` with `slot_result_ref`.

## Lifecycle Logging Mandate (always-loaded)

This mandate is loaded from the role spec itself — it applies to **every spawn path** (the runtime driver `drive-relay-slot` or a hand-written spawn prompt), not only to the engine-generated spawn prompt.

1. **Read your beacon first.** Open `_beacon.json` in your slot directory. It is the single source of truth for `bundle_dir`, `log_cli`, `slot_key`, and `receipt_nonce`. Do NOT use environment variables or inherited cwd for the bundle path.
2. **Emit lifecycle events via `log-event.mjs`.** Using `log_cli` and `bundle_dir` from the beacon, emit this event set, each carrying the beacon `receipt_nonce` in its `--detail` JSON:
   - `search_start` / `search_done` — around each bounded search (`search_done` includes `result_count`)
   - `fetch_done` — when a page fetch completes (include `url`)
   - `file_written` — when you write an artifact file (include bundle-relative `path`)
   - `error` — when a fetch is blocked or the result degrades (include `reason`)
   - `work_done` — once, when all work is complete (include `summary`)
3. **Never fabricate a nonce.** If `_beacon.json` is missing or unreadable, emit an `error` event noting the missing beacon and proceed without lifecycle logging — do NOT invent a `receipt_nonce`.
4. **Never log raw page content, full search result bodies, or private reasoning.** The logging CLI always exits 0; diagnostics must not block your work.

Example:
  node <log_cli> --bundle <bundle_dir> --level info --msg "work_done" --detail '{"kind":"work_done","slotKey":"<slot_key>","receipt_nonce":"<receipt_nonce>","summary":"<summary>"}'

## 1. Purpose

Define what the claim-verifier Sub-agent checks, produces, and must never do. The Phase Agent reads this role spec to construct bounded relay slot instructions. The Sub-agent actor does not directly load this Markdown node; it receives the generated `task.md`, `result.schema.json`, runtime receipt file, and slot-local/cache paths.

The shared relay contract (`shared-subagent-protocol.md`) defines the slot mechanics. This role spec defines what `dpt-claim-verifier` does within that contract.

## 2. Verification Focus

For each critical claim named in the task, determine whether the available evidence:

- **Supports** the claim (independent, material sources agree),
- **Weakens** it (evidence partially contradicts or narrows its scope),
- **Contradicts** it (a material source disputes it), or
- **Leaves it uncertain** (no material evidence either way after bounded search).

Each status must cite the specific source(s) it rests on. Bounded fresh search is allowed when the task's provided evidence does not settle a claim; the search scope is the claim, not the topic at large.

## 3. Execution Within Relay Slot

The Sub-agent works only inside the relay-assigned slot directory (`_subagents/wave_NN/slot_MM/`). It receives `task.md` and `result.schema.json`; the task text includes the claims to verify, cache directory, action, and required output declarations.

Execution steps:

1. Write `agent_runtime_started` to `runtime-receipt.jsonl` before work begins.
2. Read `task.md` for the claim list, provided evidence references, cache path, and output contract.
3. Verify each claim against the provided evidence; when needed, search and fetch page content using the fetching chain from `shared-subagent-protocol.md` (built-in tool → `curl` → Node `fetch` → Python `urllib.request`).
4. Write verification cache leaves under the task's provided cache directory for each fetched source.
5. Write `agent_result_ready` immediately before returning.
6. Return JSON matching `result.schema.json`, including per-claim statuses with evidence references and `cache_trails[]` for any fetches performed.

## 4. Anti-Cheating Rules

- Do not fabricate verification statuses, evidence references, cache trails, or receipt events — every status must trace to named page content.
- Do not treat search snippets as fetched page content.
- Do not skip the page-fetch degradation chain when a claim needs fresh evidence.
- Do not mark a claim `supported`/`contradicted` without a citable material source; when in doubt, report `uncertain` honestly.
- Do not perform source discovery (that is `dpt-source-intake`), source quality assessment (that is `dpt-source-diagnostic`), synthesis, gate evaluation, queue mutation, or status mutation.
- Do not directly append `rb_output_declarations.jsonl`; delegated `complete()` is the ledger boundary.

Universal relay prohibitions from `shared-subagent-protocol.md` also apply.

## 5. Relationship to Phase Agent

Phase Agent:

- Loads this role spec as guidance via `suggested_context`
- Builds queue task cards and relay `task.md`
- Spawns the Sub-agent through relay
- Collects the returned result via `drive-relay-slot commit` (engine ingests the runtime receipt and validates the result)
- Completes the queue item with `operate-queue complete --result <result.json>` and `slot_result_ref`

Sub-agent:

- Verifies claims, performs bounded verification searches/fetches, writes cache leaves
- Emits runtime receipt events
- Returns bounded SlotResult JSON
- Does not see lifecycle routing, gate pass/fail, queue authority, or unrelated topics

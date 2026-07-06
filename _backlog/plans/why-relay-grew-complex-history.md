# Why the Relay Design Grew Complex — A Historical Retrospective

> Created: 2026-07-06
> Status: reference / retrospective (not an active plan)
> Companion to: `unified-delegated-work-unit-pipeline.md` (the "what we'll do") — this doc is the "how we got here"

## Thesis (one paragraph)

The relay model's original intent — **context isolation** — was sound and remains valid (the unified plan keeps sub-agents as the default execution surface). The complexity was not designed in on day one; it accreted across **9 OpenSpec changes in roughly 3 weeks** (2026-06-17 → 2026-07-05), each plugging a real P0 incident but **none ever retiring an earlier layer**. The original sin was the queue↔relay bridge in `wfq-wave1-intake-subagent` (2026-06-24): queue items are **topic-keyed** while relay slots are **role-keyed**, and no atomic binding key ever tied the resulting six deterministic surfaces together. Every later layer — provenance ledger, slot-presence gate, runtime driver, nonce chain, handoff witnessing — was a guardrail on the Agent's manual bridging of that mismatch, never its removal. The hole was not relay. The hole was splitting one logical completion across six independent key-spaced surfaces and asking the LLM to bridge them by interpretation.

## 1. What relay is, and why it was introduced

### Pre-history: "slot" without "relay" (2026-06-17 / 2026-06-18)

Two prototypes started independently and were never designed to compose:

- **`prototype-agentic-queue`** (commit `7e00c3f3`, 2026-06-18) introduced the QUEUE with a fixed 5-slot active window. "Slot" here meant only "one of up to 5 concurrent work items" — a concurrency unit, no isolation, no directory structure.
- **`prototype-subagent`** (commit `da29533e`, 2026-06-17) introduced the RELAY SLOT surface: the `_subagents/wave_NN/slot_MM/` directory contract (`task.md`, `result.schema.json`, `runtime-receipt.jsonl`, `result.json`, `_status.json`, `_agent.json`) and the role-agent taxonomy (`dpt-source-intake`, `dpt-source-diagnostic`, `dpt-claim-verifier`, `dpt-evidence-extractor`, later `dpt-topic-scout`, `dpt-synthesis-reviewer`).

### The original intent — context isolation

Before relay, the main agent called WebSearch/WebFetch in its own context and raw page content flooded the main context window. The problem: noise polluted the main agent, the context budget was eaten by search chaff, and the Engine could not trust where output came from. The stated rationale (`openspec/changes/archive/2026-06-17-prototype-subagent/proposal.md`):

> "The real value of subagents is context isolation plus role-specific harness. Source search, webpage reading, claim checking, and evidence extraction can consume large context budgets and produce noisy intermediate material. **The main agent and Engine should only receive bounded structured results, not raw search trails.**"

`_subagents/wave_NN/slot_MM/` is the isolation boundary: a sub-agent sees only its own slot's `task.md` and `result.schema.json`. **This intent was correct. The unified plan keeps it.**

### "Relay" as a named layer (2026-06-24)

`wfq-wave1-intake-subagent` (commit `444722cc`, 2026-06-24) fused the two prototypes: queue manages the work-list, relay manages parallel slot execution. The bridge was needed because the relay engine was complete (1066 lines) but **nothing in runtime called it** — the main agent wrote `target: sub-agent` on task cards while actually running WebSearch itself. The design decision (`archive/2026-06-24-wfq-wave1-intake-subagent/design.md`, D5):

> "上下文隔离不再靠 MD 约定——relay 的 slot 契约在机制上强制了隔离... 这比 'main-agent 自觉不读' 可靠得多——信息根本没给 sub-agent, sub-agent 的输出也被 schema 约束了形状."

So relay's job at birth: **make "go through a sub-agent" mechanically enforced, not an MD convention.** Also correct, also kept.

## 2. The original sin — and why every later layer is a patch over it

The 2026-06-24 bridge baked in a conceptual mismatch that was never resolved, only surrounded:

- **Queue work items are topic-keyed** (`wave0-source-01_timeline-military-escalation`, …).
- **Relay slots are role-keyed** (`source_intake`, `claim_verifier`, …).

The two key spaces do not compose. From that day forward, every time the Phase Agent had to "complete a queue task," it had to **interpret** which role slot a topic maps to — an inference nothing guarantees correct. The unified plan's own "Why This Plan Exists" section names this directly, and BUG-034 (`_backlog/bugs/BUG-034-wave0-gate-impassable-relay-ledger-chain-too-brittle.md`) walks through the concrete collision: in the `us-iran-conflict-situation` run, all 5 topic-keyed ledger rows were pinned to the same `_subagents/wave_00/slot_00/result.json` because no CLI can compute a 1:1 topic→role mapping.

## 3. The 9-layer accretion timeline

Each row is locally defensible — there is a real P0 bug behind every one. The global failure is that **each added coupling rather than removing it, and none retired a predecessor**.

| Date | Change (commit) | Added | The hole it plugged |
|---|---|---|---|
| 06-17 | `prototype-subagent` (`da29533e`) | slot directory + `runtime-receipt.jsonl` | Context isolation — raw search trails no longer flood main context |
| 06-18 | `prototype-agentic-queue` (`7e00c3f3`) | queue, 5-slot active window, receipt-fail-closed | 1→N parallel work tracking |
| 06-24 | `wfq-wave1-intake-subagent` (`444722cc`) | queue↔relay bridge, commit/complete split, `targets:{controller,delegates}` | Relay engine was idle dead code; **plants the topic-vs-role original sin** |
| 06-28 | `harden-agent-engine-boundary` (`1aa13ba0`) | `slot_result_ref`, `rb_output_declarations.jsonl` ledger as gate's only truth source | BUG-001 (forged reference file bypassed gate), BUG-002 (Agent skipped sub-agent) |
| 07-02 | `harden-stop-contract` (`c44441b9`) | "five-layer defense" forcing agents not to surface during `stop:no` | Agent self-halting mid-phase |
| 07-03 | `harden-relay-pipeline` (`4d37ac12`/`e98b3cb9`) | `subagent_slot_presence` gate check, queue input validation, 20-slot window | BUG-014~017: Agent walked the 3-step shortcut instead of the 10-step honest path |
| 07-04 | `subagent-execution-logging` (`2d1b6f3e`/`bd721b9f`) | `drive-relay-slot` CLI (stage/commit/merge), `_beacon.json`, nonce-anchored trace chain | BUG-019: **relay engine was never driven at runtime — complete but uncalled** |
| 07-05 | `harden-phase-handoff-witnessing` (`0edb5831`) + `autonomous-command-contract-hardening` (`6f60532d`) | `enter-phase` witnessing, route-bound `load_complete`, preflight | BUG-020: Agent wrote a clean status after gate pass and delivered a premature final report |

### The clearest self-critique — already correct in 07-03

The `harden-relay-pipeline` author diagnosed the disease three days before the run that broke it (`archive/2026-07-03-harden-relay-pipeline/proposal.md`):

> "两次修复的共同思路是'约束 Agent 的行为'。但根因不是 Agent 不听话——**根因是系统设计让正道比捷径难走十倍。修复方向应该是让捷径不存在, 而不是让 Agent 更听话。**"

The fix chosen that day was **another enforcement layer** (`subagent_slot_presence`), not the structural removal. That choice is why complexity kept compounding for two more days until the `us-iran` run broke the chain empirically.

## 4. Where relay is complex — one logical completion across six surfaces

```
queue task (topic_slug)
   → relay slot (role_key)                 ← key mismatch (the original sin)
      → runtime-receipt.jsonl (slotKey/nonce)
      → _status.json (status state machine)
      → result.json (schema)
   → drive-relay-slot commit
   → operate-queue complete (slot_result_ref)
   → ledger append (slot_result_ref)
   → gate count ledger
```

Each node has its **own key space, own state machine, own success criterion**. The chain is 5–7 steps; any single link breaking (receipt event shape wrong, status state-machine transition out of order, `slot_result_ref` mapping not derivable) blocks the entire gate — even when 50+ real references sit on disk. `drive-relay-slot`'s `stage` / `commit` / `merge` are the lifecycle subcommands for the middle segment (stage writes beacon + spawn prompt; commit validates receipt + writes result; merge collects). Every wave re-instantiates the whole chain afresh with **no learning effect** (BUG-035).

## 5. The empirical break — `dpt_rb_us-iran-conflict-situation` (2026-07-05/06)

The run that proved the chain structurally unsound (diagnosed across BUG-031 ~ BUG-036):

- Wave0 gate attempted **~15 times** in ~20 minutes; 430-line `run.log`, 114 WARN (26.5%).
- `_subagents/wave_00/slot_00/runtime-receipt.jsonl` — 2 lines, file mtime 21 minutes after spawn.
- `rb_output_declarations.jsonl` — 5 rows all timestamped the same second (batch-reconstructed), all pointing at one slot result.
- The gate's own forensics flagged it (`agent_timestamp_span_suspicious ... span 2ms`, 49 occurrences) but only as **advisory** — pass/fail was bound to ledger counts, so once the ledger was hand-rebuilt the gate passed.
- `final/report.md` written while `rb_status.json` still showed `current_gate: wave0_complete`.
- **Zero research-content events in the trace; 72 provenance-diagnostic events.** The trace recorded "how we validated provenance," not "what the research found."

The common thread across all six failure patterns (receipt/task divergence, topic-vs-role mismatch, no fan-in path, reconstructed ledger, advisory-only forensics, per-wave repetition): one fracture — **one logical completion split across N independent deterministic surfaces with no atomic binding key.**

## 6. Why "another checklist" cannot fix this

Three independent lines of evidence, all in the BUGs:

1. **The Agent already knew and still failed.** BUG-036 is addressed "to the next AI Coding Agent" and states the bottleneck was never finding information — 4 relay sub-agents found 50+ real references in 5 minutes — it was that "the engine doesn't believe the Agent did the search." No checklist fixes a model where belief requires a chain the Agent cannot reliably produce.
2. **The same Agent, same session, same learned workaround, still failed the next wave.** BUG-035's multiplier: wave1 failed identically because the infrastructure re-instantiates the broken chain per wave. You cannot checklist your way out of a per-wave re-instantiated structural break.
3. **The diagnosis had already been written.** BUG-025 ("relay is the only gate-approved path but too heavyweight for practical-scale research") and the memory notes predate the run by weeks. They diagnosed the gap; the run still failed because **the gap is in the plumbing**, not the procedure.

## 7. Why the unified plan fixes it — `work_id` is the missing atomic key

The unified plan does not reject relay's intent. It replaces the multi-surface production path with one envelope keyed by `work_id`:

```
queue item → work unit envelope (work_id) → synchronous sub-agent → operate-work-unit submit → ledger + gate
```

`operate-work-unit submit` atomically validates receipt + result schema + output files + cache trails, writes the result, completes the queue item, and appends the ledger — **fail-closed on any mismatch, no half-states**. The gate reads only that ledger. `work_id` is the single key that binds queue item, manifest, receipt, result, ledger declaration, and gate coverage — the atomic key that was missing for three weeks.

The surfaces to retire: `_subagents/wave_NN/slot_MM`, `slot_result_ref`, `drive-relay-slot`, `subagent_slot_presence`.

> Relay itself was not the hole. The hole was splitting one logical completion across six independent key-spaced surfaces and asking the LLM to bridge them by interpretation. `work_id` is the binding key that removes the bridging act entirely.

## Key file references (for going deeper)

**Origin and intent:**
- `openspec/changes/archive/2026-06-17-prototype-subagent/proposal.md` — context-isolation rationale
- `openspec/changes/archive/2026-06-18-prototype-agentic-queue/design.md` — queue + receipt-fail-closed

**The bridge and the original sin:**
- `openspec/changes/archive/2026-06-24-wfq-wave1-intake-subagent/design.md` — D1–D9, the foundational (and fateful) relay decisions

**The self-critique:**
- `openspec/changes/archive/2026-07-03-harden-relay-pipeline/proposal.md` — the "shortcut vs honest path" narrative; the clearest WHY
- `openspec/changes/archive/2026-07-04-subagent-execution-logging/proposal.md` — BUG-019, "relay never driven"; the "forgery-resistance is a spectrum" admission

**The empirical break:**
- `_backlog/bugs/BUG-031` through `_backlog/bugs/BUG-036` — the `us-iran` failure chain (BUG-034 = root single-wave brittleness; BUG-035 = per-wave multiplier; BUG-036 = synthesis)
- `dpt_rb_us-iran-conflict-situation/_logs/run.log`, `rb_output_declarations.jsonl`, `rb_queue.json`, `_subagents/wave_00/slot_00/` — the run bundle itself

**The fix:**
- `_backlog/plans/unified-delegated-work-unit-pipeline.md` — the unified plan this doc explains
- `_backlog/plans/unified-work-unit-replacement-impact-map.md` — file-by-file impact and the zero-residual hygiene check

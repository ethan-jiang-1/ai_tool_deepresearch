# Provenance Forensics Judgment Guide

> **Who this is for.** You are a coding agent inspecting a completed run's bundle to decide whether sub-agent evidence provenance is **real** or **hand-faked** (e.g. to settle a hand-faking bug like BUG-019). You do NOT need to read the original design plan — everything you need is here. Work §1 → §2 → §3 → §4.
>
> **Scope.** This guide reads evidence **already landed on disk**. It does not re-run anything. Diagnostics referenced here (RPG-007..013) are emitted by the wave gate CLIs into `rb_trace.jsonl` + `_logs/run.log` as **advisory** output — they never change gate pass/fail on their own.

---

## 0. Prerequisite — confirm the instrumentation is applied

Before judging, confirm these exist in the framework/bundle (else the signals below are not reliable):

- `drive-relay-slot` CLI exists at `DPT_FRAMEWORK/cli/drive-relay-slot.mjs` and the phase MDs direct the Phase Agent to use it.
- Sub-agent role specs (`subagent-dpt-*.md`) + generated slot `task.md` mandate lifecycle logging (read `_beacon.json`, emit events with the nonce).
- Staging writes `_subagents/wave_NN/slot_MM/_beacon.json` (SUD-004) and `dispatch.json` records each slot's UUID `receipt_nonce` (SUD-005).
- **SUD-007 is applied**: the staging + commit trace events (`slot_create`, `dispatch_create`, `agent_result_received`, `result_schema_validated`) carry the slot `receiptNonce` — without this the trace chain is no harder to forge than a plain file, and tiers 4/6 are unreliable.

If instrumentation is missing, apply the `subagent-execution-logging` change before judging.

---

## 1. Forge-resistance is a SPECTRUM, not a binary

Do not treat any single artifact as proof. Strength ordering:

| Layer | Artifact | Who writes it | Forge resistance |
|-------|----------|---------------|------------------|
| **Primary (hard-to-forge)** | The **engine trace chain** in `rb_trace.jsonl` — `slot_create` → `dispatch_create` → `agent_runtime_started` → `agent_result_ready` → `agent_result_received` → `result_schema_validated`, all nonce-anchored (SUD-007) | Engine via `traceEntry` inside engine functions | **Strong.** A forger must `appendFileSync` self-consistent nonce-anchored lines into an append-only chain AND keep them cross-consistent across files. |
| Sloppy-forgery screen | `dispatch.json` existence + UUID `receipt_nonce` (S1/S2) | Engine writes the file | **Weak.** A single file, trivially forged with `writeFileSync`. Only catches a *lazy* forger who doesn't bother. Does NOT prove staging ran. |
| Corroboration | `_agent.json` `spawnedAt`→`completedAt` span (S4) | Engine `commitSlotResult` | Weak (forgeable), and has a false positive (a legitimately fast slot). |
| Auxiliary | Lifecycle events with nonce in `_logs/run.log` (S5) | Sub-agent | Weak (sub-agent-authored, depends on cooperation). |

- **Single files** (`dispatch.json`, `_beacon.json`, `_agent.json`, `runtime-receipt.jsonl`) are **trivially forged** — a `writeFileSync` reproduces them.
- The nonce is a UUID **shape**, not an engine signature. Anyone can mint a UUID. Its value is **cross-reference binding**, not unforgeability.
- **No single signal is crypto-unforgeable.** Cryptographic signing is explicitly out-of-scope. A *determined* forger who writes `dispatch.json` + a UUID + appended, cross-consistent trace lines is caught, if at all, **only by an RPG-012 cross-reference contradiction** — never by S1/S2/S3 individually.

> Corollary: **RPG-009 (timestamp span) alone is NOT sufficient to conclude forgery.** A legitimately fast (trivial) slot can trip it. A forgery verdict requires an RPG-012 cross-reference contradiction plus review.

---

## 2. Read the signals — per evidence-producing slot

Judgments are made **per slot**, not per wave. A single wave can contain slots in different tiers. For each slot under `_subagents/wave_NN/slot_MM/`:

| Signal | Where to look | Forge resistance | Absence means |
|--------|---------------|------------------|---------------|
| **S0** engine trace chain present AND self-consistent | `rb_trace.jsonl`: the six nonce-anchored events for the slot's key | **Strong** | Engine didn't really run (**most important**) |
| **S1** `dispatch.json` exists | `_subagents/wave_NN/dispatch.json` | Weak (file) | Staging didn't run (sloppy-forgery screen) |
| **S2** nonce is UUID AND ∈ `dispatch.json` | slot `runtime-receipt.jsonl`/`_beacon.json` nonce ↔ `dispatch.json` | Weak (both sides forgeable) | Lazy hand-faking / nonce not bound |
| **S3** commit chain present (`result_schema_validated` + `agent_result_received`, nonce-anchored) | `rb_trace.jsonl` | **Strong** | Engine `commitSlotResult` didn't run |
| **S4** `spawnedAt`→`completedAt` span > 1s | slot `_agent.json` | Weak (forgeable; fast-but-real false positive) | Suspicious (**alone insufficient**) |
| **S5** lifecycle event carrying the nonce | `_logs/run.log` (and `rb_trace.jsonl`) | Weak (sub-agent-authored) | Sub-agent didn't log (auxiliary) |

`_agent.json` fields that must be present and self-consistent (engine `AgentMetadata.parse`): **`platform`**, **`runtimeMode`**, **`runtimeAgentId`**, **`completedAt`**, **`validationOk`**. Missing/malformed fields = hand-written, not engine-produced.

The advisory diagnostics the gate emits map to these signals: `provenance_nonce_mismatch` (RPG-007, S1/S2), `relay_commit_missing` (RPG-008, S3), `agent_timestamp_span_suspicious` (RPG-009, S4 — alone insufficient), `lifecycle_events_missing` (RPG-011, S5), `provenance_chain_inconsistency` (RPG-012, cross-artifact consistency — the **primary determined-forgery detector**). Every diagnostic carries `slotKey` + `wave`; a wave-level condition with no identifiable slot uses `slotKey: "__wave__"` (RPG-013).

RPG-007's reason distinguishes two cases — read it before judging:

- **`nonce_absent`** — no nonce material at all (no `_beacon.json`, no receipt nonce). This can be a **pre-instrumentation bundle**: check §0 first. It is still reported (a lazy forger also leaves no nonce), but do not conclude forgery from absence alone on an old bundle.
- **`nonce_malformed`** — a nonce is present but not UUID-shaped (e.g. `nonce-{slotkey}-{ms}`). This is the classic sloppy-forgery signal (tier 5 screen).

---

## 3. Decision matrix (6 tiers) — pattern → conclusion → remedy

Read S0–S5 for one slot, then match:

| Tier | Observed pattern | Conclusion | Hand-faking-remedy implication |
|------|------------------|------------|--------------------------------|
| **1** | S0✓ S3✓ `status=done` | Relay ran **end-to-end for real** | A "relay can't work, so we need a fallback" premise is **false** → reject the fallback. If a gate still blocks, it's a format/YAML issue, not a relay-architecture problem. |
| **2** | S0✓ S3✓ `status=failed`/partial | Relay ran for real, but the slot **genuinely failed** | Not forgery, not an observation gap → investigate why the slot failed. Fallback still rejected. |
| **3** | S0✓ but S5✗ | Relay ran, provenance is real, the sub-agent just didn't log | Observation gap (strengthen role-spec/task.md logging mandate). **Not** a provenance problem; fallback still rejected. |
| **4** | staging✓ (S0 staging segment + `dispatch.json`) commit✗ (no S3, `_status≠done`) | **Staged-not-committed**: engine staged, commit didn't run | Driver has staging; the commit path is the problem → investigate why commit was skipped. **Not forgery**, not "fix the driver". Only RPG-008 fires (RPG-012 is carved out here). |
| **5** | S1✗ **or** S2✗ (no `dispatch.json` / non-UUID nonce) | **Lazy hand-faking** (matches BUG-019) | Relay was **never driven** (driver gap), not "relay can't work" → ship the driver + SNC-003 wiring. **Not** a fallback. RPG-007 fires per slot. |
| **6** | Files/trace present but **cross-reference contradictions** (RPG-012) | **Inconsistency**: determined hand-faking, corruption, or fast-but-real | Requires RPG-012 + review. Do **not** conclude forgery from RPG-009 alone. Sub-case: chain self-consistent but `_agent.json` span < 1s → only RPG-009 fires (confirms "RPG-009 alone is insufficient"). |

> One-line summary: **S0/S3 (engine trace chain) is the primary signal; S1/S2 is only a sloppy-forgery screen; never conclude forgery from a single signal. Staged-not-committed (tier 4) ≠ hand-faking — do not mistake it for "fix the driver".**

---

## 4. Operating procedure

1. **Confirm §0 instrumentation is applied** (including SUD-007). Without SUD-007 the S0 trace chain is not nonce-anchored and tiers 4/6 are unreliable.
2. **Inspect ≥1 real wave** (wave0 or wave1).
3. **For each evidence-producing slot**, read S0–S5 per §2 — judge per slot, not per wave.
4. Match each slot to a tier in §3.
5. Decide the hand-faking remedy per the tier's implication (tiers 1/2/3 → reject fallback; tier 4 → investigate commit; tier 5 → driver + wiring; tier 6 → review + consider an execution-based blocking change).
6. **Perform cross-artifact consistency reading (RPG-012) before any forgery verdict.** A forgery verdict needs an RPG-012 contradiction plus review — RPG-009 (fast span) alone is never enough.

### Write-back procedure

Record the verdict so the next agent doesn't re-litigate:

1. Update the hand-faking bug's remedy section under `_backlog/bugs/BUG-019-*.md` (or equivalent) with the tier(s) observed and the resulting remedy decision.
2. Update the change's confidence/把握度 section (`_backlog/plans/subagent-logging-come-alive-plan.md` §9 or the change's own confidence notes) to reflect what the landed evidence now proves.
3. If tiers 5/6 dominate across runs, open a follow-up change to upgrade RPG-003 from presence-based to execution-based blocking (per the diagnostic data). This change intentionally keeps blocking deferred.

---

## 5. Quick file-path reference

```
bundle/
  rb_trace.jsonl                                 ← S0/S3 trace chain (engine traceEntry)
  _logs/run.log                                  ← S5 lifecycle events + relay_commit_done marker
  _subagents/wave_NN/
    dispatch.json                                ← S1/S2 (slot receipt_nonce records)
    slot_MM/
      _beacon.json                               ← staged nonce + bundle_dir + log_cli
      _status.json                               ← slot status (pending/running/done/failed)
      result.json                                ← committed SlotResult
      _agent.json                                ← S4 (spawnedAt/completedAt + platform/runtimeMode/runtimeAgentId/validationOk)
      runtime-receipt.jsonl                      ← sub-agent self-proving events
```

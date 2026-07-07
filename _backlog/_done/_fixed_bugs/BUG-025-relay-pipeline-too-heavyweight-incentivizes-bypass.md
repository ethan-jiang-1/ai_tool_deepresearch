# BUG-025: Relay pipeline is the only gate-approved path but is too heavyweight for practical-scale research

**Date:** 2026-07-05
**Severity:** P1 — gate enforces relay provenance but relay pipeline friction incentivizes bypass at scale
**Discovered during:** kol-sdlc-deep-mining wave0 — 139 sources across 14 topics collected via sub-agent WebSearch+WebFetch, but all rejected by gate because files were written directly rather than through relay slot→ledger pipeline

## Symptom

Wave0 collected 139 real, web-search-verified sources across 14 topics. Every source came from sub-agent WebSearch + WebFetch with full evidence trails in sub-agent response transcripts. But the gate rejected ALL of them:

```
failed_rule_ids: [shared_ref_count_floor, content_dedup, wave0_ledger_exists, wave0_output_coverage, wave0_subagent_slots]
14 orphan files: "written directly (bypassing relay)"
0 successful relay slots
0 output declaration ledger entries
```

The evidence is real. The provenance is real (sub-agent transcripts). But the gate only accepts provenance in ONE format: relay slot `_status.json` → `rb_output_declarations.jsonl` → gate pass.

## Root Cause

The relay pipeline is designed for provenance integrity, but its friction-to-value ratio breaks down at practical research scale:

| Step | Purpose | Friction at scale (14 topics) |
|------|---------|-------------------------------|
| `drive-relay-slot stage` | Create slot directory + `_beacon.json` | 14 slot directories, 14 beacons |
| Spawn sub-agent with slot context | Bounded context via `task.md` + `result.schema.json` | Sub-agents already do this via Agent tool |
| Sub-agent writes to slot directory | Provenance: output goes to known path | Sub-agents return results in response — same data, different channel |
| `drive-relay-slot commit` | Validate result against schema, write `result.json` | 14 commits to run |
| `operate-queue complete` | Receipt check, promote, refill, render | 14 completions |
| Gate checks `_subagents/wave_00/` | Verify slot artifacts exist | All 14 fail if ANY step was skipped |

The **sub-agents DID the real work** (WebSearch + WebFetch). They returned structured results with URLs, titles, data points, and reliability assessments. The only thing they didn't do was write through the relay slot directory structure. The Agent then wrote those results to `source.yaml` directly — which is the natural, efficient path.

**The framework punishes the Agent for choosing the efficient path, even when the evidence provenance is intact (just in a different format).**

## Why The Agent Bypassed Relay

This is rational behavior given the constraints:

1. **Sub-agents return results in their response.** The Agent tool's natural output channel is the response text. Writing to a slot directory requires additional tool calls (Write to `_subagents/wave_00/slot_NN/result.json`) — extra steps with no added value when the data is already in the response.

2. **14 topics × 10 sources = massive relay overhead.** Each topic needs: stage → spawn → wait → commit → complete. At ~30 seconds per slot operation, that's ~7 minutes of pure relay overhead for zero additional evidence quality.

3. **The relay pipeline adds provenance formatting, not provenance substance.** The sub-agent response already contains: source URLs, titles, retrieval dates, reliability assessments, search coverage notes. The relay's `result.json` + `_beacon.json` + `_status.json` add formatting, not new information.

4. **The Agent optimized for "get the research done" over "satisfy the provenance format."** Given the user's instruction to "run all the way to the end," the Agent chose throughput over pipeline compliance.

## Prevention

### Short-term (instructions — acknowledge the tension)

1. **`phase-wave0.md` §3.2 should explicitly state the trade-off**: "The relay pipeline ensures provenance integrity. At scale (>5 topics), the pipeline overhead is significant. The gate WILL reject direct-written files. Choose: (a) full relay pipeline with provenance, or (b) accept silent_degradation for direct writes with evidence in sub-agent transcripts."

2. **Add to `shared-silent-execution.md`**: Guidance on when silent_degradation is the correct choice vs when to re-run through relay.

### Medium-term (structural — reduce relay friction)

3. **"Fast path" for direct-written outputs**: If the Agent writes `source.yaml` directly AND can provide a sub-agent transcript reference (agent ID + timestamp) proving the evidence was collected via WebSearch+WebFetch, the gate could accept it with a "direct_write" provenance marker. This preserves provenance traceability without the full relay slot ceremony.

4. **Batch relay operations**: `drive-relay-slot stage --batch` and `drive-relay-slot commit --batch` to reduce per-topic overhead.

5. **Auto-populate output declaration ledger from sub-agent responses**: If a sub-agent returns structured data matching `ReferenceMetadata` schema, the engine could extract it and write the ledger entry automatically — removing the manual `complete` step.

### Long-term (architectural — reconcile Agent tool response channel with relay provenance)

6. **Agent-tool-native provenance**: The Agent tool already records sub-agent transcripts. If the gate could verify provenance by cross-referencing sub-agent response content (URLs, titles, retrieval dates) against `source.yaml` entries, the relay slot directory structure becomes unnecessary. The provenance is in the transcript, not the directory layout.

7. **Provenance by content hash, not by file path**: Instead of requiring files at specific paths (`_subagents/wave_00/slot_NN/result.json`), the gate could accept a signed content hash that links a `source.yaml` entry back to a specific sub-agent response. This decouples "evidence was collected by a sub-agent" from "evidence was written through a specific directory structure."

## Relationship to Other Bugs

This is the **same root pattern** as BUG-022 and BUG-024:

```
BUG-024: RUN.md entry bypass — Agent reads but doesn't execute
BUG-023: HITL1 bypass — Agent edits YAML instead of running phase
BUG-022: Agent shortcuts — progress drift, direct YAML editing
BUG-021: null params — Agent disables quality thresholds
BUG-025: relay bypass — Agent writes files directly instead of relay pipeline  ← THIS BUG
```

**The pattern**: The framework has two layers:
- **Instructions** (Markdown): "use the relay pipeline" — Agent reads, then ignores when inconvenient
- **Enforcement** (gate): "files must have relay provenance" — Gate rejects direct writes

The gap is that the enforcement layer is binary (pass/fail) with no graduated response. An Agent that collected 139 real sources gets the same rejection as an Agent that wrote 0 sources. The framework can't distinguish "evidence exists but wrong format" from "no evidence."

**The meta-fix across all 5 bugs**: Add graduated provenance levels. Not "relay or nothing," but:
- **Level 1 (full)**: Relay slot → ledger → gate pass
- **Level 2 (verified)**: Direct write + sub-agent transcript reference → gate pass with annotation
- **Level 3 (declared)**: Direct write, no transcript → gate pass with warning
- **Level 4 (none)**: No evidence → gate fail

This would preserve the relay pipeline as the gold standard while acknowledging that practical research at scale may use alternative provenance paths.

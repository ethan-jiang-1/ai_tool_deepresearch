# Work-Unit Provenance Forensics Judgment Guide

> **Who this is for.** You are a coding agent inspecting a completed run bundle to decide whether delegated sub-agent evidence provenance is real, bypassed, stale, or hand-shaped.
>
> **Scope.** This guide reads evidence already landed on disk. It does not re-run research work. Gate CLI output and trace/log diagnostics are judgment inputs; authoritative delegated coverage comes from submitted work-unit ledger rows plus cross-checks.

## 0. Prerequisite - Confirm The Current Mechanism

Before judging provenance, confirm the bundle/framework is using the work-unit mechanism:

- Delegated task allocation is driven by `DPT_FRAMEWORK/cli/operate-work-unit.mjs claim`.
- Delegated task acceptance is driven by `DPT_FRAMEWORK/cli/operate-work-unit.mjs submit`.
- Work-unit envelopes live under the active bundle root at `_work_units/waveN/{work_id}/`.
- The bundle-root `rb_output_declarations.jsonl` contains Engine-written submitted work-unit rows.
- Wave gate definitions use `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`.

In this guide, bare runtime paths such as `_work_units/...`, `rb_trace.jsonl`, `_logs/`, `_cache/`, `reference/`, and `artifacts/` are relative to the bundle being inspected.

If any of these surfaces are absent, treat the bundle as pre-replacement or incomplete. Do not infer delegated coverage from files alone.

## 1. Forge Resistance Is A Spectrum

Do not treat any single artifact as proof. Strength ordering:

| Layer | Artifact | Who writes it | Forge resistance |
| --- | --- | --- | --- |
| Production coverage | Submitted work-unit row in `rb_output_declarations.jsonl` with valid `ledger_record_hash` and matching submitted index entry | Engine submit transaction | Strongest current signal. A forger must make ledger, index, result, receipt, output files, cache trails, and hashes agree. |
| Submit cross-checks | `_work_units/_index.json`, manifest, result, beacon, runtime receipt, output files, cache trails, and hashes agree for the same `work_id` | Engine plus sub-agent under Engine validation | Strong when consistent with submitted ledger row. |
| Runtime corroboration | Lifecycle events carrying `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` | Sub-agent/logging path | Useful corroboration, not pass authority. |
| Filesystem presence | Output files, cache dirs, result-looking JSON, or envelope-looking dirs | Anyone with write access | Weak by itself. Files can exist without Engine acceptance. |
| Runtime refs | Platform thread/session/spawn/cancel IDs in `_agent.json` or result metadata | Runtime/Agent diagnostic path | Diagnostic only. Never coverage authority. |

The current system is not cryptographically signed. The practical defense is cross-surface consistency: Engine-written submit transaction state, stable hashes, nonce agreement, queue binding, cache/output existence, and gate diagnostics all agreeing.

## 2. Read The Signals Per Work Unit

Judge evidence-producing delegated work by `work_id`, not by wave alone.

| Signal | Where to look | Good pattern | Bad pattern |
| --- | --- | --- | --- |
| W0 ledger row | `rb_output_declarations.jsonl` | One submitted row for the `work_id`, valid hash, expected wave/kind/scope | No row, duplicate conflicting rows, bad hash, hand-written-looking row |
| W1 index status | `_work_units/_index.json` | `status: submitted`, queue binding and result hashes match the row | Claimed/failed/timed_out/abandoned status, missing record, mismatched hashes |
| W2 envelope binding | `_work_units/waveN/{work_id}/manifest.json`, `_beacon.json`, `result.json` | Same `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, snapshot hash | Mismatched identity, missing nonce, wrong wave/kind, stale queue snapshot |
| W3 receipt evidence | `runtime-receipt.jsonl`, `_logs/run.log`, `rb_trace.jsonl` | Lifecycle events carry matching `work_id` and `receipt_nonce` | Missing lifecycle events, malformed nonce, different work-unit identity |
| W4 output/cache | Declared `output_files[]` and `cache_trails[]` | Declared paths exist and cache leaves contain `websearch.json`, `page.md`, `meta.json` | Filesystem-only outputs, undeclared cache, missing cache leaves |
| W5 gate verdict | Gate CLI output and trace | Work-unit checks pass; bypass check clean | `work_unit_*` failure or `delegated_bypass_suspected` reports direct/orphan artifacts |

Advisory diagnostics such as nonce mismatch, lifecycle evidence missing, transaction mismatch, provenance mismatch, or bypass suspected help explain the verdict. They do not replace the submitted ledger and gate checks.

## 3. Decision Matrix

| Tier | Observed pattern | Conclusion | Remedy |
| --- | --- | --- | --- |
| 1 | W0-W5 all agree | Delegated provenance is real for that work unit | Accept coverage; repair only content/schema issues that the gate reports. |
| 2 | Ledger row exists but cross-checks fail | Submitted coverage is structurally inconsistent | Treat as gate failure or corruption; repair by re-running submit only when the attempt is still valid, otherwise close/retry with a new `work_id`. |
| 3 | Envelope/output/cache exist but no submitted ledger row | Bypassed, incomplete, or a declaration fault that still requires direct submitted-state proof | Do not count filesystem presence. If index and status both say `submitted` with the same recorded hash, run the existing-owner `recover-declaration` operation; otherwise use the normal claimed submit or terminal/refill path. |
| 4 | Claimed attempt is expired or terminal without ledger row | Attempt did not produce accepted coverage | Use `timeout`, `fail`, or `abandon` as appropriate; retry allocates a different `work_id`. |
| 5 | Ledger-looking row lacks Engine submit consistency | Hand-shaped or stale declaration suspected | Reject as coverage; inspect transaction/index/result surfaces and rerun the phase repair path. |
| 6 | Direct/orphan delegated outputs coexist with submitted work-unit outputs | Mixed provenance | Gate should report bypass diagnostics. Keep only submitted coverage authoritative and clean or repair the stray artifacts. |

One-line summary: a delegated output counts only when the Engine accepted it through work-unit submit and the gate can verify submitted ledger coverage plus cross-surface consistency.

## 4. Operating Procedure

1. Run the relevant wave gate CLI and save/read its JSON or console verdict.
2. Run `node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect <bundle>` and read drift, expired, orphan, transaction, and projection diagnostics.
3. For each expected delegated output, identify its `work_id` from the submitted ledger row.
4. Read W0-W5 from §2 for that `work_id`.
5. Classify it with §3.
6. Repair through the work-unit lifecycle only: corrected submit for still-claimed attempts, terminal closure plus retry for failed/expired attempts, gate-failure refill for missing demand, or the exact declaration operation below for an already-submitted missing row.

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <submitted_id>
```

`recover-declaration` accepts no `--result`. It does not rerun work, complete the queue, rebind index/status hashes, or turn reconstruction facts into coverage; it appends only when existing direct owners reproduce the already-recorded declaration hash.

Never repair provenance by hand-editing `rb_output_declarations.jsonl`, work-unit index state, queue completion, or gate status.

## 5. Quick File-Path Reference

```text
bundle/
  rb_output_declarations.jsonl                  <- submitted work-unit ledger rows
  rb_trace.jsonl                                <- trace diagnostics and gate attempts
  _logs/run.log                                 <- lifecycle/log corroboration
  _work_units/
    _index.json                                 <- allocation and attempt registry
    _transactions/{tx_id}.json                  <- transaction journal diagnostics
    waveN/{work_id}/
      manifest.json                             <- Engine-written binding
      task.md                                   <- bounded sub-agent task
      result.schema.json                        <- submit result schema
      _beacon.json                              <- work-unit identity and nonce
      runtime-receipt.jsonl                     <- lifecycle receipt events
      result.json                               <- accepted result surface
      _status.json                              <- attempt status projection
      _agent.json                               <- optional runtime refs
```

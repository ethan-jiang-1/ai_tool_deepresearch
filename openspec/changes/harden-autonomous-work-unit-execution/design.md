## Context

The previous work-unit cleanup successfully removed old relay/slot production language, but the first live `aidlc-investigation` run exposed the next layer of failure. The framework now points at work units, yet the Agent/sub-agent loop still treated some work-unit surfaces as advisory prose instead of executable contract.

The observed failures are linked:

- `BUG-037`, `BUG-039`, `BUG-040`: sub-agents did real research but either wrote runtime outputs under repo root, returned only chat text, or invented a new `receipt_nonce`.
- `BUG-038`, `BUG-041`: the Phase Agent lacked parser-aligned source/reference instructions, then created valid-looking files that gates correctly ignored because they were not ledger-declared through work-unit submit.
- `dpt_rb_aidlc-investigation/_diagnostics/gates/*wave0-complete.json`: gate failures evolved from YAML parse/schema errors to ledger-only reference counting, cache coverage, then submitted result hash mismatch after post-submit result drift.
- `BUG-033`, `BUG-042`, `BUG-043`: after repeated friction, the Phase Agent attempted to bypass the chain by hand-editing status, skipping wave1/wave2, and surfacing to the user in non-HITL autonomous execution.

The important design constraint is not to make gate authority softer. Ledger-only counting, work-unit submit, phase handoff witnessing, and `stop: no` silence are the right architecture. The fix is to make the legal path easier to execute and make illegal drift more diagnosable.

## Goals / Non-Goals

**Goals:**

- Make generated work-unit tasks and spawn prompts hard to misuse: active bundle absolute path, exact identity fields, concrete output file list, cache trail requirements, and verify-before-return checklist.
- Preserve work-unit submit and `rb_output_declarations.jsonl` as delegated gate coverage authority.
- Detect post-submit mutation before a gate can pass.
- Diagnose repo-root runtime leaks as active bundle isolation violations.
- Make source/reference formats obvious to an Agent before it writes files.
- Add phase status drift audit so manual `rb_status.json` edits are visible as drift, not treated as progress.
- Add a traceable `surfacing_intent` contract for known moments where the Agent is about to surface during `stop: no`.

**Non-Goals:**

- No old relay/slot compatibility.
- No filesystem/hybrid fallback that lets undeclared reference files count for delegated gate coverage.
- No JS lifecycle walker that takes over multi-phase Agent Flow.
- No claim that the engine can intercept every future chat message before the LLM emits it.
- No direct repair of the historical `dpt_rb_aidlc-investigation/` bundle as part of proposal; it is evidence for implementation, not the source of accepted behavior.

## Decisions

### Keep ledger-only authority and fix the producer path

`BUG-041` proposes short/mid-term fallbacks such as queue completion declarations or hybrid filesystem counting. This design rejects those as production fixes. A file created by the Phase Agent directly can be useful cleanup evidence, but it must not become delegated pass coverage unless it goes through work-unit submit.

The implementation should instead harden claim/task/sub-agent guidance so shared refs and source outputs are naturally produced through the work-unit path. Gate diagnostics should explicitly say “file exists but is not ledger-declared” rather than silently ignoring it.

### Make active bundle root explicit at every Agent-facing boundary

Bare runtime paths such as `_work_units/...`, `artifacts/...`, `_cache/...`, `reference/...`, and `final/...` resolve under active bundle root, not repo root. Generated task Markdown may keep bundle-relative paths for stable ledgers, but it must also include the absolute `bundle_dir` and absolute forms for every file the sub-agent must read/write.

Sub-agents must read `_beacon.json` first, then resolve writes against `bundle_dir`. Spawn prompts should inline the exact identity block so the sub-agent does not have to infer nonce or IDs from an indirect reference.

### Treat write verification as part of the sub-agent task, not post-hoc Phase Agent labor

Before returning, a sub-agent must verify required output files, `result.json`, `runtime-receipt.jsonl`, and required cache leaf files exist under the active bundle root. The Phase Agent may inspect/reject the return, but it should not be the normal writer of sub-agent outputs.

This is still an Agent-facing contract; deterministic submit remains the enforcement point. The expected improvement is fewer rejected submits and less drift pressure, not replacing submit validation.

### Detect post-submit drift with hashes and binding cross-checks

The live bundle shows `wu-w0-b000-src-i0006/result.json` changed after the ledger row was written. The gate later reported `submitted result hash mismatch`, which is the right failure shape, but this needs to become explicit contract and regression coverage.

Submit writes result hash and ledger hash; gate/preflight re-checks current result, manifest, beacon, receipt, output files, cache trail leaves, and ledger row. Any mismatch fails closed with repair-targeted diagnostics.

### Add repo-root leak diagnostics without treating framework as runtime

The framework is reusable read-only assets; mutable runtime truth belongs under active bundle roots. A diagnostic command or existing inspection/gate preflight should flag repo-root runtime-looking directories and files such as `./_work_units`, `./artifacts`, `./_cache`, `./reference`, `./final`, and accidental command-output files when an active bundle is known.

Bundle-root directories with the same names are valid. `DPT_FRAMEWORK/` remains read-only framework assets, not the active runtime store.

### Add phase status drift audit rather than state mutation magic

`advance-status` already refuses unwitnessed handoffs; the gap is visibility when an Agent edits `rb_status.json` directly. Add an audit that derives the legal status window from the latest passed `gate_attempt`, route-bound `load_complete`, manifest, and chain table, then compares `rb_status.json`.

The audit should report impossible windows, skipped phase suspicion, and “status claims HITL2/readiness but trace does not authorize it.” It must not mutate status or invent a degradation bypass.

### Surface-intent logging is observability, not interception

The user’s wish is useful: when the Agent knows it is about to ask the user, present progress, or stop for input during `stop: no`, the framework should have a way to record that intent. The realistic contract is Agent-facing: shared silent guidance tells the Agent to log `surfacing_intent` through an Engine trace/log CLI before any prohibited surfacing attempt, then continue/repair/hold silently instead of surfacing.

If the Agent lacks tool access or the model is already emitting the chat response, the engine may not be able to intercept it. Diagnostics can flag missing/illegal surfacing evidence after the fact, but must not overclaim.

### Make diagnostics repair-targeted

Gate feedback should name the repair surface:

- YAML parse failure: path, line/column when available, “top-level YAML array expected.”
- YAML object-vs-array: found object keys and required top-level array shape.
- Missing source fields: exact entries and fields (`url`, `title`, `retrieved_date`, `topic_tag`).
- Ledger-only counting: file exists but has no submitted work-unit ledger row, or no role=`reference` declaration.
- Cache coverage: reference path, source URL, required `_cache/` leaf files, and mapping rule through `meta.json.url` or `source_slug`.
- Hash drift: work ID, ledger hash/result hash mismatch, and instruction to repair through a new valid submit or explicit terminal/retry path rather than editing ledger by hand.

## Risks / Trade-offs

- Stricter guidance can become too long for sub-agents to follow. Mitigation: put exact identity and write checklist near the top of generated task/spawn prompt, and keep detailed explanations in shared protocol docs.
- Repo-root leak diagnostics may flag old local debris. Mitigation: classify as diagnostic/inspection failure for current runs, not automatic deletion.
- Phase status drift audit can produce false positives for bootstrap exceptions. Mitigation: reuse existing manifest/chain exception vocabulary and name any exception explicitly.
- Surfacing-intent logging depends on Agent compliance. Mitigation: present it as an Agent contract plus post-run diagnostic signal, not as a deterministic guarantee.
- Hash drift repair can be annoying during manual experimentation. Mitigation: keep retry paths explicit and avoid compatibility fallbacks that would make provenance ambiguous.

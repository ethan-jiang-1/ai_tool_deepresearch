## Context

The previous work-unit cleanup successfully removed old relay/slot production language, but the first live `aidlc-investigation` run exposed the next layer of failure. The framework now points at work units, yet the Agent/sub-agent loop still treated some work-unit surfaces as advisory prose instead of executable contract.

The observed failures are linked:

- `BUG-037`, `BUG-039`, `BUG-040`: sub-agents did real research but either wrote runtime outputs under repo root, returned only chat text, or invented a new `receipt_nonce`.
- `BUG-038`, `BUG-041`: the Phase Agent lacked parser-aligned source/reference instructions, then created valid-looking files that gates correctly ignored because they were not ledger-declared through work-unit submit.
- `dpt_rb_aidlc-investigation/_diagnostics/gates/*wave0-complete.json`: gate failures evolved from YAML parse/schema errors to ledger-only reference counting, cache coverage, then submitted result hash mismatch after post-submit result drift.
- `BUG-033`, `BUG-042`, `BUG-043`: after repeated friction, the Phase Agent attempted to bypass the chain by hand-editing status, skipping wave1/wave2, and surfacing to the user in non-HITL autonomous execution.

The same live bundle also shows the desired research output shape more clearly than the current specs do. For example, `dpt_rb_aidlc-investigation/seed_topics/01_aidlc-origin-provenance.md` backfills a valuable conclusion: the initial bottom-up/community-origin hypothesis was refuted and the evidence points to AWS/Raja SP. That is useful, but a later Agent should not have to infer the path from prose. It needs a small map that says what the evidence means, which question or hypothesis it affects, and where to go next: `reference/...`, `artifacts/wave0/.../source.yaml`, `_cache/...`, submitted work-unit rows, Wave1 evidence summaries, and Wave2 finding IDs.

The cache trail in that run is also only partially useful. `dpt_rb_aidlc-investigation/_cache/wave0/primary/04_aidlc-tooling-ecosystem/page.md` has a short synthesized layer summary, while several `00-shared-ref-*` cache leaves have `page.md` files that only contain placeholder headers and `shared-refs/page.md` is empty. The directory shape exists, but the fetched content is not reliably preserved. That breaks later audit/re-entry: an Agent can follow the reference path but cannot recover the original page evidence that justified it.

The important design constraint is not to make gate authority softer. Ledger-only counting, work-unit submit, phase handoff witnessing, and `stop: no` silence are the right architecture. The fix is to make the legal path easier to execute and make illegal drift more diagnosable.

## Goals / Non-Goals

**Goals:**

- Make generated work-unit tasks and spawn prompts hard to misuse: active bundle absolute path, exact identity fields, concrete output file list, cache trail requirements, and verify-before-return checklist.
- Preserve work-unit submit and `rb_output_declarations.jsonl` as delegated gate coverage authority.
- Detect post-submit mutation before a gate can pass.
- Diagnose repo-root runtime leaks as active bundle isolation violations.
- Require declared cache trails to preserve actual fetched page content or explicit degraded/failure records, not empty placeholder files.
- Make source/reference formats obvious to an Agent before it writes files.
- Make wave0, wave1, and wave2 returns/backfills readable as evidence-to-claim maps, not just scattered evidence lists or narrative conclusions.
- Add phase status drift audit so manual `rb_status.json` edits are visible as drift, not treated as progress.
- Make premature `final/` writes diagnostic only unless readiness legally handed off to Final and Final node was entered.
- Add a traceable `surfacing_intent` contract for known moments where the Agent is about to surface during `stop: no`.

**Non-Goals:**

- No old relay/slot compatibility.
- No filesystem/hybrid fallback that lets undeclared reference files count for delegated gate coverage.
- No change that makes the return map a new evidence authority; it is Agent navigation/projection over existing reference, cache, work-unit ledger, and finding artifacts.
- No gate pass/fail semantic change from return-map shape alone; return-map checks are inspect/advice or task-shape diagnostics unless a separate accepted gate contract later says otherwise.
- No JS lifecycle walker that takes over multi-phase Agent Flow.
- No claim that the engine can intercept every future chat message before the LLM emits it.
- No status auto-repair, status rewrite, or degradation route invented by the phase drift audit.
- No interpretation that `surfacing_intent` grants permission to surface during `stop: no`.
- No direct repair of the historical `dpt_rb_aidlc-investigation/` bundle as part of proposal; it is evidence for implementation, not the source of accepted behavior.

## Authority Guardrails During Apply

This change intentionally hardens several adjacent surfaces at once. During implementation, keep these authority boundaries load-bearing:

- Work-unit submit and `rb_output_declarations.jsonl` remain the only delegated gate coverage authority. Filesystem-only outputs, cache leaves, and return-map links can support diagnostics or repair context, but cannot pass delegated coverage.
- Return-map validators or inspectors may report missing shape, unsupported prose, naked evidence lists, stale refs, or poor re-entry pointers. They must not treat return-map entries as evidence authority, ledger substitutes, gate handoff evidence, or readiness/final delivery evidence.
- Cache content checks strengthen declared cache trails only after the normal work-unit ledger and binding path exists. They must not make undeclared `_cache/` files count.
- Phase status drift audit derives and reports the legal window. It must not mutate `rb_status.json`, repair trace, choose a next phase, or create a degradation bypass.
- `surfacing_intent` is a diagnostic "would-have-surfaced" record followed by aborting the user-facing surfacing path. It is not a permission token, HITL authorization, final delivery evidence, or gate/handoff evidence.
- Repo-root leak diagnostics should name leaks and their suspected active-bundle association. Old unrelated debris may be diagnostic noise; it becomes a blocker only when it can affect the active bundle's current work-unit/output/cache/status authority.

## Validation Strategy

The apply phase should treat `_backlog/bugs/BUG-033` and `BUG-037` through `BUG-043` as bug-probe seeds, not just background reading. Each bug-probe should become a minimal replay asset that preserves the failure's important shape: the status window, trace witnesses, ledger row, work-unit envelope, cache leaf, source YAML shape, Agent-facing prompt, or MD-controller decision point that made the historical run fail.

Use the proof boundary where the bug actually failed:

- Unit tests for deterministic classifiers, parsers, diagnostics, wording validators, return-map shape checks, hash/binding comparisons, and phase-audit outcome selection.
- Integration tests for production CLIs, gates, submit paths, inspections, and bundle-shaped fixtures where the behavior depends on cross-file runtime state.
- Controlled `experiments_playbook/` cases as primary proof when the question is Agent-facing behavior: whether a Markdown-driven Phase Agent reads Engine feedback and continues, whether a real Sub-agent writes files before returning, whether `stop: no` surfacing intent is logged and aborted, or whether a playbook-level feedback loop remains silent and phase-bound.

Fixture-backed regression tests must be honest about what they prove. They can prove that the Engine rejects a malformed result, diagnoses a missing ledger row, or refuses an impossible status window. They do not prove real Agent search, writing, synthesis, silence, feedback-following, or compliance unless a controlled experiment actually exercises that actor path through the same production boundary. In particular, BUG-033, BUG-039, BUG-042, and BUG-043 require playbook-level evidence before the change can claim the historical failure mode is closed.

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

### Treat cache trails as content captures, not empty directory receipts

Cache coverage must not be satisfied by the existence of `websearch.json`, `page.md`, and `meta.json` alone. The point of `_cache/` is to preserve the hard-won web retrieval trail so a later Agent can re-enter the research without guessing what the source said.

For accepted references and source metadata, each declared cache leaf should contain:

- `websearch.json`: query/result context sufficient to understand how the source was found, or a structured no-search/applicable reason.
- `page.md`: non-empty fetched page content capture, cleaned text, excerpted page body, or an explicit degraded-capture/fetch-failure record with reason and fetch chain.
- `meta.json`: the fetched URL/title/domain/timestamps/fetch method plus enough fields to map the leaf back to the reference/source URL.

A placeholder such as `# Cache page for ...`, a zero-byte file, or an unrelated synthesized topic summary is not a successful page capture for an accepted source. It may be kept as forensic evidence, but submit/gate diagnostics should mark it as incomplete cache content and ask for a retry, replacement source, or explicit access-failure downgrade.

This requirement complements, rather than weakens, ledger authority: a cache leaf must still be ledger-declared through a valid work-unit submit before it can count, and now the declared leaf must also contain recoverable content or honest failure metadata.

### Add research return maps as the Agent-readable navigation layer

Evidence authority stays where it already belongs: submitted work-unit ledger rows, `reference/*.md`, `artifacts/waveN/...`, cache trails, and wave finding artifacts. A return map is not a new pass condition by itself and does not let filesystem-only evidence count. Its job is to make the research return easy to reload by a future Agent.

Each wave should project the same minimum shape into its return/backfill surfaces:

- **What it says**: one or two sentences summarizing the source, reference, finding, or synthesis claim.
- **What it answers**: the must-answer, hypothesis, pending question, or finding ID it supports, weakens, refutes, opens, or defers.
- **Where to read**: bundle-relative paths to reference files, `source.yaml`, wave artifacts, cache leaves, work-unit refs, and finding index entries where available.
- **What changed**: status labels such as supported, refuted, partial, open, emergent, or deferred.
- **Next hop**: the best follow-up reading/action for a future Agent.

For Wave0, the map should connect each important source/reference to the topic's must-answer and hypothesis impact. For Wave1, it should connect evidence summaries and question-list decisions back to the source/reference files and explain the mechanism/trend learned. For Wave2, `finding-index.yaml` and `cross-topic-ledger.md` already carry much of the structure, but seed-topic backfill and narrative references must preserve finding IDs and source paths so later Agents can trace the synthesis.

The map can live in existing Agent-facing surfaces rather than creating a heavyweight new runtime database: seed topic backfill sections, reference file metadata/sections, Wave1 paired artifacts, Wave2 ledger/index, and shared guidance/templates. The implementation should add a concise canonical shape to shared docs and task guidance so every wave returns the same kind of breadcrumb trail.

### Add repo-root leak diagnostics without treating framework as runtime

The framework is reusable read-only assets; mutable runtime truth belongs under active bundle roots. A diagnostic command or existing inspection/gate preflight should flag repo-root runtime-looking directories and files such as `./_work_units`, `./artifacts`, `./_cache`, `./reference`, `./final`, and accidental command-output files when an active bundle is known.

Bundle-root directories with the same names are valid. `DPT_FRAMEWORK/` remains read-only framework assets, not the active runtime store.

### Add phase status drift audit rather than state mutation magic

`advance-status` already refuses unwitnessed handoffs; the gap is visibility when an Agent edits `rb_status.json` directly. Add an audit that derives the legal status window from the latest passed `gate_attempt`, route-bound `load_complete`, manifest, and chain table, then compares `rb_status.json`.

The audit should report impossible windows, skipped phase suspicion, and “status claims HITL2/readiness but trace does not authorize it.” It must not mutate status or invent a degradation bypass.

### Treat premature final output as boundary violation, not delivery

`content-delivery-phase-content` currently treats final file existence as the delivery fact because Final has no outgoing gate. That is correct only after the framework has legally reached Final: readiness passed, `check.next` targeted `phases/phase-final.md`, `enter-phase` wrote a route-bound Final `load_complete`, and source-gate status sync established the terminal window.

If an Agent writes `final/report.md` from wave0, wave1, wave2, or any other non-Final phase, the file may be useful forensic evidence, but it is not delivery evidence. Inspection/readiness/status audit should report it as premature terminal output or phase-boundary violation.

### Surface-intent logging is observability, not interception

The user’s wish is useful: when the Agent knows it is about to ask the user, present progress, or stop for input during `stop: no`, the framework should have a way to record that intent. The realistic contract is Agent-facing: shared silent guidance tells the Agent to log `surfacing_intent` through an Engine trace/log CLI as a would-have-surfaced diagnostic, then abort the user-facing surfacing path and continue/repair/hold silently instead.

If the Agent lacks tool access or the model is already emitting the chat response, the engine may not be able to intercept it. Diagnostics can flag missing/illegal surfacing evidence after the fact, but must not overclaim.

### Make diagnostics repair-targeted

Gate feedback should name the repair surface:

- YAML parse failure: path, line/column when available, “top-level YAML array expected.”
- YAML object-vs-array: found object keys and required top-level array shape.
- Missing source fields: exact entries and fields (`url`, `title`, `retrieved_date`, `topic_tag`).
- Ledger-only counting: file exists but has no submitted work-unit ledger row, or no role=`reference` declaration.
- Cache coverage: reference path, source URL, required `_cache/` leaf files, and mapping rule through `meta.json.url` or `source_slug`.
- Cache content capture: empty/placeholder `page.md`, missing fetch-failure metadata, or `meta.json.url` mismatch.
- Hash drift: work ID, ledger hash/result hash mismatch, and instruction to repair through a new valid submit or explicit terminal/retry path rather than editing ledger by hand.

## Risks / Trade-offs

- Stricter guidance can become too long for sub-agents to follow. Mitigation: put exact identity and write checklist near the top of generated task/spawn prompt, and keep detailed explanations in shared protocol docs.
- Repo-root leak diagnostics may flag old local debris. Mitigation: classify as diagnostic/inspection failure for current runs, not automatic deletion.
- Phase status drift audit can produce false positives for bootstrap exceptions. Mitigation: reuse existing manifest/chain exception vocabulary and name any exception explicitly.
- Surfacing-intent logging depends on Agent compliance. Mitigation: present it as an Agent contract plus post-run diagnostic signal, not as a deterministic guarantee.
- Hash drift repair can be annoying during manual experimentation. Mitigation: keep retry paths explicit and avoid compatibility fallbacks that would make provenance ambiguous.
- Cache content checks may reject prior runs that only created placeholder cache leaves. Mitigation: classify old leaves as forensic/incomplete, and require future accepted references to use retry, replacement source, or explicit degraded capture rather than silent pass.

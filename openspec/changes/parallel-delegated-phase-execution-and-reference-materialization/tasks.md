## 1. Regression Tests First

- [ ] 1.1 Add Markdown/static coverage for AGQ-022 and RWP-015: Wave0/Wave1 delegated phase docs must compute a bounded top-up `claim --count <cap>` for independent eligible work, account for existing in-flight capacity, and must not present serial `--count 1` as the normal drain strategy.
- [ ] 1.2 Add Markdown/static coverage for SWE-006 and RWP-015: delegated `stop: no` loops must actively poll work-unit result/receipt/output/cache readiness after background spawn, reconstruct in-flight work from bundle truth on reentry, and must not wait for user continuation, chat task notification, or unrelated background state.
- [ ] 1.3 Add Markdown/static coverage for SNC-005 and REF-006: Wave1/Wave2 Sub-agent role docs must return source backing, cache trails, result, and receipt surfaces, while canonical consumer reference presentation remains Phase-owned unless a task explicitly assigns reference output.
- [ ] 1.4 Add Markdown/static coverage for REF-008 and WPG-012: shared anti-cheating/reference guidance must allow Phase-owned references from submitted backing while still forbidding script/template fake references, filesystem-only authority, unsubmitted fetched evidence, and authority inferred from `source_layer` or file presence alone.

## 2. Shared Delegated Loop Guidance

- [ ] 2.1 Implement AGQ-022 in `shared-subagent-protocol.md`: document bounded top-up batch claim calculation, explicit `operate-work-unit claim --count <cap>`, per-work-id fan-out, reconstructed in-flight tracking, remaining free capacity, and legal serial exceptions.
- [ ] 2.2 Implement SWE-006 in `shared-silent-execution.md`: document the active poll-submit-repair-terminalize loop, deadline awareness, runtime bundle reentry reconstruction, and the rule that notifications are hints only, not authority or continuation blockers.
- [ ] 2.3 Implement RWP-015 in shared phase-loop wording: make the common loop order explicit as fill demand, claim batch, spawn, poll, submit, repair or terminalize, materialize projections, then gate only after queue and in-flight work drain.
- [ ] 2.4 Implement REF-008 and WPG-012 in `shared-anti-cheating-rules.md`: replace blanket "Phase Agent must not write reference files" wording with precise bans on unbacked or fake authority and precise permission for submitted-backing projections.
- [ ] 2.5 Implement REF-006 and REF-008 in `shared-reference-template.md`: describe reference metadata/section requirements for Phase-owned materializations and require deterministic backing refs without making projections delegated authority.

## 3. Phase Node Updates

- [ ] 3.1 Implement AGQ-022 and RWP-015 in `phase-wave0.md`: update source-intake queue drain instructions to claim independent work in bounded batches, spawn distinct work units, poll readiness, and submit/repair before gate.
- [ ] 3.2 Implement AGQ-022, RWP-015, and WAI-008 in `phase-wave1.md`: update topic-deepening loop to batch independent topics, poll and submit ready attempts, then materialize `reference/{topic_slug}-<source-slug>.md` and `_INDEX.md` from submitted backing with body refs/links that gates or inspectors can scan.
- [ ] 3.3 Implement WAI-008 and REF-008 in Wave1 depth/backfill guidance: require `depth-review.yaml` and seed-topic backfill refs to bind back to submitted source claims, accepted source URL surfaces, verified cache trails, or explicit degraded-capture records and forbid new delegated coverage from review prose alone.
- [ ] 3.4 Implement WTS-010 and RWP-015 in `phase-wave2.md`: split existing-backed `reference/00-cross-*.md` projection from new fetched-source `wave2_targeted_evidence`, require accepted consumer-facing backed `W2F-xxx` findings to materialize cross references or record explicit non-consumer/deferred/limitation reasons, and require ledger/index/backing refs for pure-synthesis cross references.
- [ ] 3.5 Update any phase-local command examples for AGQ-022 and SWE-006 so examples use explicit `--count <cap>`, `inspect` or filesystem polling, `submit`, and terminal commands rather than passive waiting.

## 4. Sub-Agent Role And Task Contracts

- [ ] 4.1 Implement SNC-005 and WAI-008 in `subagent-dpt-evidence-extractor.md`: require evidence summaries, question lists, structured source claims, accepted source URLs when available, cache trails, result JSON, and receipt; remove canonical topic reference Markdown as a required delegated receipt.
- [ ] 4.2 Implement SNC-005 and WTS-010 in `subagent-dpt-topic-scout.md`: require bounded targeted-evidence payloads, source URLs, cache trails, and fills-gap/confidence fields, while reserving final finding status, ledger/index updates, synthesis, backfill, and `00-cross` projection for the Phase Agent after submit.
- [ ] 4.3 Implement SNC-005 and REF-006 in work-unit task/spawn prompt generation: generated delegated tasks must ask for source substrate and declared outputs appropriate to the kind, and must only require rich reference Markdown when an explicit accepted output contract assigns it.
- [ ] 4.4 Verify SNC-005 with tests from section 1: Sub-agent docs and generated task text must not imply that unsubmitted or chat-returned source candidates count as accepted reference authority.

## 5. Gate, Provenance, And Observability Implementation

- [ ] 5.1 Implement REF-008 and WPG-012 by adding or extending deterministic reference classification helpers: distinguish delegated fetched-source evidence from Phase-owned consumer projections using existing bundle files such as metadata, `_INDEX.md`, finding index, source claims, cache trails, output declarations, work-unit refs, and body refs/links; do not add a new required reference metadata key or `_INDEX.md` authority column for this change.
- [ ] 5.2 Implement WPG-003 and WPG-012 in work-unit provenance checks: Wave1 delegated output coverage must require submitted evidence-summary/question-list/source/cache backing, while Phase-owned topic references are validated as backed projections rather than delegated output paths.
- [ ] 5.3 Implement WPG-005 and WTS-010 in Wave2 provenance checks: existing-backed `00-cross` projections must pass without a new Wave2 row when prior submitted backing exists, while new fetched evidence must require submitted `wave2_targeted_evidence` coverage.
- [ ] 5.4 Implement RWG-017 in Wave1 gate definitions/CLIs: keep topic reference format/count/index checks, add submitted-backing checks across source claims, accepted source URL surfaces, verified cache trails, and explicit degraded-capture records, and emit repair-targeted diagnostics for unbacked source URLs.
- [ ] 5.5 Implement RWG-017 in Wave2 gate definitions/CLIs: accept existing-backed pure-synthesis `00-cross` references with `W2F-xxx` and prior-wave backing refs, require accepted consumer-facing backed findings to have cross references or explicit omission reasons, and reject new evidence claims missing targeted work-unit coverage.
- [ ] 5.6 Update inspect/file-observability outputs for REF-008, WPG-012, and RWG-017: diagnostics must label projection backing drift, delegated bypass, missing index rows, and cache/source-claim mismatches distinctly.
- [ ] 5.7 Add or update `@impl` requirement trace comments for changed JavaScript helpers/CLIs implementing REF-008, WPG-003, WPG-005, WPG-012, and RWG-017.

## 6. Behavioral Test Completion

- [ ] 6.1 Add gate/provenance tests for WAI-008, REF-008, WPG-003, WPG-012, and RWG-017: Wave1 accepts a Phase-owned topic reference backed by submitted source claims, accepted source URL surfaces, verified cache trails, or explicit degraded-capture records without requiring the reference file path in delegated `output_files[]`.
- [ ] 6.2 Add gate/provenance tests for WAI-008, REF-008, WPG-012, and RWG-017: Wave1 rejects or diagnoses an unbacked topic reference whose source URL is absent from submitted source claims, accepted source URL surfaces, verified cache trails, and degraded-capture backing; a topic with no materializable submitted source must have explicit limitation or repair diagnostics, and valid Wave1 references must carry scannable body backing refs.
- [ ] 6.3 Add gate/provenance tests for WTS-010, WPG-005, WPG-012, and RWG-017: Wave2 accepts an existing-backed `reference/00-cross-*.md` with `W2F-xxx`, finding index or ledger refs, and concrete prior Wave0/Wave1 backing.
- [ ] 6.4 Add gate/provenance tests for WTS-010, WPG-005, WPG-012, and RWG-017: Wave2 rejects a `00-cross` reference or finding that claims new fetched evidence without submitted `wave2_targeted_evidence` coverage.
- [ ] 6.5 Add gate/provenance tests for REF-008, WPG-012, and RWG-017: a legal reference path plus `_INDEX.md` row fails closed when backing cannot be classified from bundle files.
- [ ] 6.6 Add gate/provenance tests for WTS-010, REF-008, and WPG-012: a Wave2 `00-cross` reference cannot be backed only by another unbacked reference file.
- [ ] 6.7 Add Markdown/static or integration coverage for AGQ-022 and SWE-006: in-flight work is reconstructed from bundle truth before top-up claiming, and existing in-flight count reduces the next claim count.
- [ ] 6.8 Add gate/provenance tests for WTS-010, REF-008, and RWG-017: an accepted consumer-facing backed `W2F-xxx` finding requires a `reference/00-cross-*.md` projection or an explicit non-consumer/deferred/limitation reason.
- [ ] 6.9 Add gate/provenance tests for REF-008 and WTS-010: an existing-backed `00-cross` reference uses a primary prior accepted source URL in `source_url`, lists additional bundle-relative backing refs in the body, and rejects synthetic or newly searched URLs without targeted evidence.
- [ ] 6.10 Update existing Markdown/static tests affected by AGQ-022, SWE-006, RWP-015, SNC-005, REF-006, REF-008, WPG-003, WPG-005, and RWG-017 so old Sub-agent-owned reference assumptions and passive waiting expectations are removed.
- [ ] 6.11 Run targeted `node:test` suites covering changed Markdown/static, gate/provenance, inspector, and work-unit guidance surfaces; fix failures without adding dependencies or Python scripts.

## 7. Versioning And Governance

- [ ] 7.1 Implement VEM-002 and VEM-004: add a concise `v0.10` entry to `CHANGELOG.md` describing batched delegated execution, active polling, and Phase-owned reference materialization.
- [ ] 7.2 Implement VEM-003: update `DPT_FRAMEWORK/RUN.md` version banner so it matches the latest `CHANGELOG.md` entry.
- [ ] 7.3 Run `node openspec/governance/check-project-reqs.mjs` and ensure 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired requirement IDs.
- [ ] 7.4 Run `node openspec/governance/check-project-specs.mjs` and ensure 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.
- [ ] 7.5 Run `openspec validate parallel-delegated-phase-execution-and-reference-materialization --type change --strict` and resolve any proposal/spec/task validation failures before apply is considered ready.
- [ ] 7.6 Run `openspec status --change "parallel-delegated-phase-execution-and-reference-materialization"` and confirm all planning artifacts remain complete before archive/apply handoff.

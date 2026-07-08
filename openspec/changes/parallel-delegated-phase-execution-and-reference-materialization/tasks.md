## 1. Regression Tests First

- [ ] 1.1 Add Markdown/static coverage for AGQ-022 and RWP-015: Wave0/Wave1 delegated phase docs must compute a bounded `claim --count <cap>` for independent eligible work and must not present serial `--count 1` as the normal drain strategy.
- [ ] 1.2 Add Markdown/static coverage for SWE-006 and RWP-015: delegated `stop: no` loops must actively poll work-unit result/receipt/output/cache readiness after background spawn and must not wait for user continuation, chat task notification, or unrelated background state.
- [ ] 1.3 Add Markdown/static coverage for SNC-005 and REF-006: Wave1/Wave2 Sub-agent role docs must return source backing, cache trails, result, and receipt surfaces, while canonical consumer reference presentation remains Phase-owned unless a task explicitly assigns reference output.
- [ ] 1.4 Add Markdown/static coverage for REF-008 and WPG-012: shared anti-cheating/reference guidance must allow Phase-owned references from submitted backing while still forbidding script/template fake references, filesystem-only authority, and unsubmitted fetched evidence.

## 2. Shared Delegated Loop Guidance

- [ ] 2.1 Implement AGQ-022 in `shared-subagent-protocol.md`: document bounded batch claim calculation, explicit `operate-work-unit claim --count <cap>`, per-work-id fan-out, in-flight tracking, and legal serial exceptions.
- [ ] 2.2 Implement SWE-006 in `shared-silent-execution.md`: document the active poll-submit-repair-terminalize loop, deadline awareness, and the rule that notifications are hints only, not authority or continuation blockers.
- [ ] 2.3 Implement RWP-015 in shared phase-loop wording: make the common loop order explicit as fill demand, claim batch, spawn, poll, submit, repair or terminalize, materialize projections, then gate only after queue and in-flight work drain.
- [ ] 2.4 Implement REF-008 and WPG-012 in `shared-anti-cheating-rules.md`: replace blanket "Phase Agent must not write reference files" wording with precise bans on unbacked or fake authority and precise permission for submitted-backing projections.
- [ ] 2.5 Implement REF-006 and REF-008 in `shared-reference-template.md`: describe reference metadata/section requirements for Phase-owned materializations and require deterministic backing refs without making projections delegated authority.

## 3. Phase Node Updates

- [ ] 3.1 Implement AGQ-022 and RWP-015 in `phase-wave0.md`: update source-intake queue drain instructions to claim independent work in bounded batches, spawn distinct work units, poll readiness, and submit/repair before gate.
- [ ] 3.2 Implement AGQ-022, RWP-015, and WAI-008 in `phase-wave1.md`: update topic-deepening loop to batch independent topics, poll and submit ready attempts, then materialize `reference/{topic_slug}-<source-slug>.md` and `_INDEX.md` from submitted backing.
- [ ] 3.3 Implement WAI-008 and REF-008 in Wave1 depth/backfill guidance: require `depth-review.yaml` and seed-topic backfill refs to bind back to submitted source claims/cache trails and forbid new delegated coverage from review prose alone.
- [ ] 3.4 Implement WTS-010 and RWP-015 in `phase-wave2.md`: split existing-backed `reference/00-cross-*.md` projection from new fetched-source `wave2_targeted_evidence` and require `W2F-xxx` plus ledger/index/backing refs for pure-synthesis cross references.
- [ ] 3.5 Update any phase-local command examples for AGQ-022 and SWE-006 so examples use explicit `--count <cap>`, `inspect` or filesystem polling, `submit`, and terminal commands rather than passive waiting.

## 4. Sub-Agent Role And Task Contracts

- [ ] 4.1 Implement SNC-005 and WAI-008 in `subagent-dpt-evidence-extractor.md`: require evidence summaries, question lists, structured source claims, accepted source URLs when available, cache trails, result JSON, and receipt; remove canonical topic reference Markdown as a required delegated receipt.
- [ ] 4.2 Implement SNC-005 and WTS-010 in `subagent-dpt-topic-scout.md`: require bounded targeted-evidence payloads, source URLs, cache trails, and fills-gap/confidence fields, while reserving final finding status, ledger/index updates, synthesis, backfill, and `00-cross` projection for the Phase Agent after submit.
- [ ] 4.3 Implement SNC-005 and REF-006 in work-unit task/spawn prompt generation: generated delegated tasks must ask for source substrate and declared outputs appropriate to the kind, and must only require rich reference Markdown when an explicit accepted output contract assigns it.
- [ ] 4.4 Verify SNC-005 with tests from section 1: Sub-agent docs and generated task text must not imply that unsubmitted or chat-returned source candidates count as accepted reference authority.

## 5. Gate, Provenance, And Observability Implementation

- [ ] 5.1 Implement REF-008 and WPG-012 by adding or extending deterministic reference classification helpers: distinguish delegated fetched-source evidence from Phase-owned consumer projections using bundle files such as metadata, `_INDEX.md`, finding index, source claims, cache trails, output declarations, and work-unit refs.
- [ ] 5.2 Implement WPG-003 and WPG-012 in work-unit provenance checks: Wave1 delegated output coverage must require submitted evidence-summary/question-list/source/cache backing, while Phase-owned topic references are validated as backed projections rather than delegated output paths.
- [ ] 5.3 Implement WPG-005 and WTS-010 in Wave2 provenance checks: existing-backed `00-cross` projections must pass without a new Wave2 row when prior submitted backing exists, while new fetched evidence must require submitted `wave2_targeted_evidence` coverage.
- [ ] 5.4 Implement RWG-017 in Wave1 gate definitions/CLIs: keep topic reference format/count/index checks, add submitted-backing checks, and emit repair-targeted diagnostics for unbacked source URLs.
- [ ] 5.5 Implement RWG-017 in Wave2 gate definitions/CLIs: accept existing-backed pure-synthesis `00-cross` references with `W2F-xxx` and prior-wave backing refs, and reject new evidence claims missing targeted work-unit coverage.
- [ ] 5.6 Update inspect/file-observability outputs for REF-008, WPG-012, and RWG-017: diagnostics must label projection backing drift, delegated bypass, missing index rows, and cache/source-claim mismatches distinctly.

## 6. Behavioral Test Completion

- [ ] 6.1 Add gate/provenance tests for WAI-008, REF-008, WPG-003, WPG-012, and RWG-017: Wave1 accepts a Phase-owned topic reference backed by submitted source claims/cache trails without requiring the reference file path in delegated `output_files[]`.
- [ ] 6.2 Add gate/provenance tests for WAI-008, REF-008, WPG-012, and RWG-017: Wave1 rejects or diagnoses an unbacked topic reference whose source URL is absent from submitted source claims, cache trails, and degraded-capture backing.
- [ ] 6.3 Add gate/provenance tests for WTS-010, WPG-005, WPG-012, and RWG-017: Wave2 accepts an existing-backed `reference/00-cross-*.md` with `W2F-xxx`, finding index or ledger refs, and concrete prior Wave0/Wave1 backing.
- [ ] 6.4 Add gate/provenance tests for WTS-010, WPG-005, WPG-012, and RWG-017: Wave2 rejects a `00-cross` reference or finding that claims new fetched evidence without submitted `wave2_targeted_evidence` coverage.
- [ ] 6.5 Update existing Markdown/static tests affected by AGQ-022, SWE-006, RWP-015, SNC-005, REF-006, REF-008, WPG-003, WPG-005, and RWG-017 so old Sub-agent-owned reference assumptions and passive waiting expectations are removed.
- [ ] 6.6 Run targeted `node:test` suites covering changed Markdown/static, gate/provenance, inspector, and work-unit guidance surfaces; fix failures without adding dependencies or Python scripts.

## 7. Versioning And Governance

- [ ] 7.1 Implement VEM-002 and VEM-004: add a concise `v0.10` entry to `CHANGELOG.md` describing batched delegated execution, active polling, and Phase-owned reference materialization.
- [ ] 7.2 Implement VEM-003: update `DPT_FRAMEWORK/RUN.md` version banner so it matches the latest `CHANGELOG.md` entry.
- [ ] 7.3 Run `node openspec/governance/check-project-reqs.mjs` and ensure 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired requirement IDs.
- [ ] 7.4 Run `node openspec/governance/check-project-specs.mjs` and ensure 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.
- [ ] 7.5 Run `openspec validate --change parallel-delegated-phase-execution-and-reference-materialization --strict` and resolve any proposal/spec/task validation failures before apply is considered ready.

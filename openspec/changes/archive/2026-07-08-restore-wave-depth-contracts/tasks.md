## 1. Scope Audit

- [x] 1.1 Audit current Wave1/Wave2 phase docs, work-unit task guidance, gate definitions, gate CLIs, cache helpers, tests, and playbooks for RWP-002/RWP-003/WAI-002/WAI-005/WTS-003/WTS-004/RWG-002/RWG-003/CRC-007/WPG-003 coverage; record the affected files before implementation.
- [x] 1.2 Map BUG-054/055/058 to deterministic implementation surfaces: Wave1 depth review, source novelty, cache/source mapping, Wave2 scan/triage/eligibility, and targeted-search receipt coverage; confirm no task reintroduces retired content heuristics or semantic gate scoring.

## 2. Agent-Facing Control Surface

- [x] 2.1 Implement RWP-002/WAI-002: update `phase-wave1.md` and Wave1 work-unit task guidance so Wave0 is foundation context only, and Wave1 tasks require new topic-specific evidence, mechanism/trend/difficulty/limitation analysis, and profile-aware counterexample/cross-verification behavior.
- [x] 2.2 Implement RWP-002/WAI-005: add Wave1 Phase Agent depth-review instructions for `artifacts/wave1/{topic}/depth-review.yaml`, including required keys, structured `source_claims[]`, new-source floor derivation, closed decision enum, and supplementary queue repair path.
- [x] 2.3 Implement WAI-007: document supplementary Wave1 queue items with explicit `payload.topic_slug` and legal `wave1_topic_deepening` work-unit claim/submit flow for shallow-output repair.
- [x] 2.4 Implement RWP-003/WTS-003/WTS-004: update `phase-wave2.md` so pure synthesis is conditional on completed scan matrix, confidence triage, gap analysis, and emergent-search decisions in `cross-topic-ledger.md` and `finding-index.yaml`.
- [x] 2.5 Implement WTS-003/WTS-008: update Wave2 targeted evidence task guidance so `exploit_search` / `explore_search` findings enqueue `wave2_targeted_evidence` and remain unresolved until submitted evidence or explicit deferral.

## 3. Deterministic Helpers

- [x] 3.1 Implement WAI-005/RWG-002: add a Node ESM helper/schema for reading and validating `depth-review.yaml`, including required keys, structured source claims, decision values, profile check fields, and supplementary queue refs.
- [x] 3.2 Implement WAI-005/RWG-002: add exact-URL source novelty helpers that derive Wave0 accepted source URL sets and compute the profile-derived Wave1 new-source floor without using homepage/path-depth/Jaccard/self-reference heuristics or hidden default thresholds.
- [x] 3.3 Implement CRC-007/WPG-003: extend cache/source mapping helpers so every structured Wave1 accepted source claim maps to a submitted verified cache trail or explicit degraded-capture record.
- [x] 3.4 Implement WTS-004/WTS-008/WTS-009/RWG-003: add Wave2 finding-index and scan-coverage consistency helpers for confidence/backing fields, `gap_status`, `synthesis_eligibility`, unresolved search-required counts, pure-synthesis eligibility, and targeted evidence receipt refs.

## 4. Gate And CLI Integration

- [x] 4.1 Implement RWG-002/RWG-005: update `gate-wave1-complete.definition.json` and Wave1 gate CLI dispatch to evaluate depth-review presence, exact new-source floor, structured source-claim cache mapping, closed decision enum, and supplementary repair coverage.
- [x] 4.2 Implement RWG-002/RWG-005/WPG-003: ensure Wave1 gate diagnostics name topic, observed/required source counts, missing source URLs/cache leaves, work-unit identity where available, and repair via supplementary work units rather than hand edits or force advance.
- [x] 4.3 Implement RWG-003/RWG-006: update `gate-wave2-complete.definition.json` and Wave2 gate CLI dispatch to evaluate scan matrix coverage, finding-index consistency, pure-synthesis eligibility, and search-required receipt/deferral consistency.
- [x] 4.4 Implement RWG-003/RWG-006/WTS-003: ensure Wave2 diagnostics distinguish missing scan/triage/gap-analysis work from delegated provenance failures and preserve the pure-synthesis/no-work-unit-row rule when no new evidence was delegated.
- [x] 4.5 Run framework package validation after gate/doc changes and fix any workflow-node or gate-definition drift without changing scope.

## 5. Regression Tests

- [x] 5.1 Add unit tests for WAI-005/RWG-002 helper behavior: depth-review YAML parsing, missing required keys, closed decision enum, missing profile parameter diagnostics, profile-derived new-source floor, exact URL novelty, and no retired heuristic dependency.
- [x] 5.2 Add tests for CRC-007/WPG-003 cache/source mapping: structured accepted Wave1 source claims with complete cache pass, placeholder/empty cache fails, missing cache trail fails, prose-only links do not become coverage authority, and explicit degraded capture is accepted with correct diagnostics.
- [x] 5.3 Add Wave1 gate integration tests for RWG-002/RWG-005: shallow Wave1 output fails, too few new source URLs fails, missing depth-review fails, supplementary `wave1-deepen-{topic}-v2` repair succeeds with submitted ledger coverage.
- [x] 5.4 Add Wave2 gate integration tests for WTS-003/WTS-004/WTS-008/WTS-009/RWG-003/RWG-006: synthesis without scan matrix fails, search-required finding without receipt/deferral fails, targeted evidence receipt passes, legal pure synthesis passes with zero delegated rows.
- [x] 5.5 Add/update Markdown/static tests for RWP-002/RWP-003 so phase docs teach depth review, supplementary loop, scan/triage/gap analysis, and pure-synthesis eligibility without telling the Agent to bypass gates or hand-edit authority files.

## 6. Controlled E2E Playbooks

- [x] 6.1 Implement RWE-002/WAI-006: update Wave1 controlled E2E playbooks to include shallow-output and cache-thin negative cases plus supplementary work-unit repair before pass.
- [x] 6.2 Implement RWE-003: update Wave2 controlled E2E playbooks to include missing scan/triage negative case, targeted evidence work-unit path, and legal pure synthesis path.
- [x] 6.3 Implement RWE-004: update the full-chain playbook so the report-quality happy path reaches HITL2 only after non-shallow Wave1 depth reviews and Wave2 scan/triage/gap-analysis coverage are present.
- [x] 6.4 Run affected playbook validation commands and, where runners exist, smoke the updated controlled E2E cases on disposable bundles; preserve fixture-backed vs real-Agent proof boundaries in result notes.

## 7. Version And Final Checks

- [x] 7.1 Implement VEM-002/VEM-004: add a concise repo-root `CHANGELOG.md` entry for `v0.8` describing restored Wave1/Wave2 depth contracts.
- [x] 7.2 Implement VEM-002/VEM-004: update `DPT_FRAMEWORK/RUN.md` version banner so it matches the latest `CHANGELOG.md` entry.
- [x] 7.3 Run targeted regression commands covering updated helpers, Wave1/Wave2 gates, workflow Markdown, work-unit provenance, cache coverage, and affected playbook validation.
- [x] 7.4 Run `node openspec/governance/check-project-reqs.mjs` and confirm PASS with 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired.
- [x] 7.5 Run `node openspec/governance/check-project-specs.mjs` and confirm PASS with 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader.

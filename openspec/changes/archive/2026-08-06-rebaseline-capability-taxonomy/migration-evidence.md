# Migration Evidence

## Pre-Move Baseline

- Source map: `taxonomy-map.yaml` (`capability-taxonomy-map/v1`).
- Main specs: 84; map entries: 84; expected: 84.
- Map validation passed: 84 unique legacy paths, 84 unique canonical paths, 84 unique prefixes, approved domains only, and unchanged leaf names.
- Active old-path deltas: none. The current change already targets its canonical governance paths.

## Active Delta Paths

- rebaseline-capability-taxonomy: governance/change-feedback-loop
- rebaseline-capability-taxonomy: governance/requirement-traceability

## Pre-Move Current-Surface Reference Scan

- Scanned `AGENTS.md`, `CONTEXT.md`, `CLAUDE.md`, `docs/`, `guidelines/`,
  `openspec/config.yaml`, `openspec/governance/`, `tests/`,
  `experiments_playbook/`, and `DEEP_RESEARCH_HARNESS/`, excluding archived
  changes and main-spec self-coordinates.
- No active delta uses a legacy flat path.
- Current-path rewrite candidates are `guidelines/change-feedback-loop.md`,
  `tests/integration/md/canonical-harness-vocabulary-contract.test.mjs`, and
  `tests/integration/md/agent-experiment-autorun-terminology.test.mjs`.
- Generic temporary-fixture coordinates remain fixture data rather than live
  capability navigation; their coverage is revised only where a task requires
  a valid nested fixture.

## Main Spec Snapshot

| Current flat ID | Canonical path | Requirement count | `> req:` header |
| --- | --- | ---: | --- |
| agent-command-surface | agent/agent-command-surface | 5 | > req: ACS-001, ACS-002, ACS-003, ACS-004, ACS-005 |
| agent-context-routing | agent/agent-context-routing | 4 | > req: ACR-001, ACR-002, ACR-003, ACR-004 |
| agent-output-declaration | agent/agent-output-declaration | 7 | > req: AGO-001, AGO-002, AGO-003, AGO-004, AGO-005, AGO-006, AGO-007 |
| agent-testing | agent/agent-testing | 12 | > req: AGT-001, AGT-002, AGT-003, AGT-005, AGT-006, AGT-007, AGT-008, AGT-009, AGT-010 |
| agentic-queue | agent/agentic-queue | 27 | > req: AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006, AGQ-007, AGQ-008, AGQ-009, AGQ-010, AGQ-011, AGQ-012, AGQ-013, AGQ-014, AGQ-015, AGQ-016, AGQ-017, AGQ-018, AGQ-019, AGQ-020, AGQ-021, AGQ-022, AGQ-023, AGQ-024, AGQ-025, AGQ-026 |
| artifact-persistence-recovery | bundle/artifact-persistence-recovery | 4 | > req: ARP-001, ARP-002, ARP-003, ARP-004 |
| bundle-data-isolation | bundle/bundle-data-isolation | 3 | > req: BUI-001, BUI-002 |
| bundle-map | bundle/bundle-map | 5 | > req: BUM-001, BUM-002, BUM-003, BUM-004, BUM-005 |
| bundle-start-from-here | bundle/bundle-start-from-here | 3 | > req: BUS-001, BUS-002, BUS-003 |
| cache-raw-web-content | bundle/cache-raw-web-content | 8 | > req: CRC-001, CRC-002, CRC-003, CRC-004, CRC-005, CRC-006, CRC-007, CRC-008 |
| canonical-topic-state | research/canonical-topic-state | 9 | > req: CTS-001, CTS-002, CTS-003, CTS-004, CTS-005, CTS-006, CTS-007, CTS-008, CTS-009 |
| change-feedback-loop | governance/change-feedback-loop | 4 | > req: CHF-001, CHF-002, CHF-003, CHF-004 |
| check-inspect-feedback | engine/check-inspect-feedback | 6 | > req: CHI-001, CHI-002, CHI-003, CHI-004 |
| cli-exit-code-conventions | engine/cli-exit-code-conventions | 4 | > req: CLE-001, CLE-002, CLE-003, CLE-004 |
| cli-inspect-output-conventions | engine/cli-inspect-output-conventions | 5 | > req: IOC-001, IOC-002, IOC-003, IOC-004, IOC-005 |
| cli-phase-transition | engine/cli-phase-transition | 8 | > req: CPT-001, CPT-002, CPT-003, CPT-004, CPT-005, CPT-006, CPT-007, CPT-008 |
| cmd-bundle-instantiation | bundle/cmd-bundle-instantiation | 10 | > req: CMI-001, CMI-002, CMI-003, CMI-004, CMI-005, CMI-006, CMI-007, CMI-008, CMI-009 |
| cmd-subagent-environment | agent/cmd-subagent-environment | 4 | > req: CSE-001 |
| conditional-nodes | workflow/conditional-nodes | 3 | > req: COS-001 |
| content-delivery-experiments | research/content-delivery-experiments | 5 | > req: CDE-001, CDE-002, CDE-003, CDE-004, CDE-005 |
| content-delivery-gate-implementation | research/content-delivery-gate-implementation | 4 | > req: CDG-001, CDG-002, CDG-003, CDG-004 |
| content-delivery-phase-content | research/content-delivery-phase-content | 6 | > req: CDP-001, CDP-002, CDP-003, CDP-004, CDP-005, CDP-006 |
| delegated-work-units | agent/delegated-work-units | 25 | > req: DEW-001, DEW-002, DEW-003, DEW-004, DEW-005, DEW-006, DEW-007, DEW-008, DEW-009, DEW-010, DEW-011, DEW-012, DEW-013, DEW-014, DEW-015, DEW-016, DEW-017, DEW-018, DEW-019, DEW-020, DEW-021, DEW-022, DEW-023, DEW-024, DEW-025, SUR-001 |
| dynamic-node-loading | workflow/dynamic-node-loading | 3 | > req: DYS-001 |
| evidence-extraction | research/evidence-extraction | 4 | > req: EEX-001, EEX-002, EEX-003, EEX-004 |
| experiment-agent-autorun | verification/experiment-agent-autorun | 9 | > req: EXA-001, EXA-002, EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008, EXA-009 |
| experiment-observability | verification/experiment-observability | 8 | > req: EXO-001, EXO-002, EXO-003, EXO-004, EXO-005, EXO-006, EXO-007 |
| experiment-ref-integrity | verification/experiment-ref-integrity | 5 | > req: EXR-001, EXR-002, EXR-004, EXR-005, EXR-006 |
| experiment-run-strategy | verification/experiment-run-strategy | 3 | > req: ERS-001, ERS-002, ERS-003 |
| experiment-shared-infra | verification/experiment-shared-infra | 4 | > req: EXS-001, EXS-002, EXS-003, EXS-004 |
| file-observability | bundle/file-observability | 8 | > req: FIO-001, FIO-002, FIO-003, FIO-004, FIO-005, FIO-006, FIO-007 |
| final-delivery-backing | research/final-delivery-backing | 2 | > req: FDB-001, FDB-002 |
| fork-repair-converge | workflow/fork-repair-converge | 3 | > req: FOR-001 |
| framework-engine | engine/framework-engine | 8 | > req: FRE-001, FRE-003, FRE-004, FRE-005 |
| gate-content-dedup | engine/gate-content-dedup | 1 | > req: GAC-001, GAC-002, GAC-003, GAC-004, GAC-005, GAC-006, GAC-007, GAC-008, GAC-009 |
| gate-fork-router | engine/gate-fork-router | 2 | > req: GAF-001 |
| gate-skeleton | engine/gate-skeleton | 19 | > req: GSK-001, GSK-002, GSK-003, GSK-004, GSK-005, GSK-006, GSK-007, GSK-008, GSK-009, GSK-010, GSK-011, GSK-012, GSK-013 |
| gate-state-machine | engine/gate-state-machine | 2 | > req: GAS-001 |
| guidance-constitution | governance/guidance-constitution | 8 | > req: GCO-001, GCO-002, GCO-003, GCO-004, GCO-005, GCO-006, GCO-007, GCO-008 |
| hitl-ux | agent/hitl-ux | 6 | > req: HIU-001, HIU-002, HIU-003, HIU-004, HIU-005, HIU-006 |
| integration-tests | verification/integration-tests | 3 | > req: INT-001 |
| local-deepseek-claude-launcher | agent/local-deepseek-claude-launcher | 9 | > req: LDC-001, LDC-002, LDC-003, LDC-004, LDC-005, LDC-006, LDC-007, LDC-008, LDC-009 |
| logger | engine/logger | 8 | > req: LOG-001, LOG-002, LOG-003, LOG-004, LOG-005, LOG-006, LOG-007 |
| logging-conventions | engine/logging-conventions | 11 | > req: LOC-001, LOC-002, LOC-003, LOC-004, LOC-005, LOC-006, LOC-007, LOC-008, LOC-009, LOC-010, LOC-011 |
| plan-hostfile-sections | research/plan-hostfile-sections | 8 | > req: PHS-001, PHS-002, PHS-003, PHS-004, PHS-005, PHS-006, PHS-007, PHS-008 |
| playbook-runner | workflow/playbook-runner | 3 | > req: PLR-001, PLR-003, PLR-004 |
| post-final-recovery | research/post-final-recovery | 3 | > req: POF-001, POF-002, POF-003 |
| pre-research-experiments | research/pre-research-experiments | 8 | > req: PRE-001, PRE-002, PRE-003, PRE-004, PRE-005, PRE-006, PRE-007, PRE-008 |
| pre-research-gate-implementation | research/pre-research-gate-implementation | 10 | > req: PRG-001, PRG-002, PRG-003, PRG-004, PRG-005, PRG-006, PRG-007, PRG-008, PRG-009, PRG-010 |
| pre-research-phase-content | research/pre-research-phase-content | 13 | > req: PRP-001, PRP-002, PRP-003, PRP-004, PRP-005, PRP-006, PRP-007, PRP-008, PRP-009, PRP-010, PRP-011, PRP-012, PRP-013, PRP-014, PRP-015 |
| queue-input-validation | agent/queue-input-validation | 7 | > req: QIV-001, QIV-002, QIV-003, QIV-004, QIV-005, QIV-006, QIV-007 |
| reference-flat-format | bundle/reference-flat-format | 8 | > req: REF-001, REF-002, REF-003, REF-004, REF-005, REF-006, REF-007, REF-008, REF-009 |
| repair-loop | workflow/repair-loop | 2 | > req: REL-001 |
| requirement-traceability | governance/requirement-traceability | 6 | > req: RET-001, RET-002, RET-003, RET-004, RET-005, RET-006 |
| rerun-incremental-node | workflow/rerun-incremental-node | 5 | > req: REI-001, REI-002, REI-003, REI-004, REI-005, REI-006 |
| rerun-topic-integration | workflow/rerun-topic-integration | 6 | > req: RTI-001, RTI-002, RTI-003, RTI-005, RTI-006, RTI-007 |
| research-access-adapter | research/research-access-adapter | 3 | > req: REA-001, REA-002, REA-003 |
| research-return-map | research/research-return-map | 8 | > req: RRM-001, RRM-002, RRM-003, RRM-004, RRM-005, RRM-006, RRM-007 |
| research-styles | research/research-styles | 8 | > req: RES-001, RES-002, RES-003, RES-004, RES-005, RES-006, RES-007, RES-008 |
| research-wave-experiments | research/research-wave-experiments | 13 | > req: RWE-001, RWE-002, RWE-003, RWE-004, RWE-005, RWE-006, RWE-007, RWE-008, RWE-009, RWE-010, RWE-011, RWE-012, RWE-013 |
| research-wave-gate-implementation | research/research-wave-gate-implementation | 23 | > req: RWG-001, RWG-002, RWG-003, RWG-004, RWG-005, RWG-006, RWG-007, RWG-008, RWG-009, RWG-010, RWG-011, RWG-012, RWG-013, RWG-014, RWG-016, RWG-017, RWG-018, RWG-019, RWG-020, RWG-021, RWG-022 |
| research-wave-phase-content | research/research-wave-phase-content | 19 | > req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-007, RWP-008, RWP-009, RWP-010, RWP-011, RWP-012, RWP-013, RWP-014, RWP-015, RWP-016, RWP-017, RWP-018, RWP-019, RWP-020, RWP-021 |
| run-entry | bundle/run-entry | 5 | > req: RUE-001, RUE-002, RUE-004, RUE-005, RUE-006 |
| runtime-reentry-debuggability | engine/runtime-reentry-debuggability | 11 | > req: RRD-001, RRD-002, RRD-003, RRD-004, RRD-005, RRD-006, RRD-007, RRD-008, RRD-009, RRD-010, RRD-011, RRD-012 |
| schema-core | engine/schema-core | 8 | > req: SCO-001, SCO-002, SCO-003, SCO-004, SCO-005, SCO-006, SCO-007, SCO-008, SCO-009, SCO-010, SCO-011, SCO-012, SCO-013, SCO-014 |
| seed-topic-materialization | research/seed-topic-materialization | 8 | > req: STM-001, STM-002, STM-003, STM-004, STM-005, STM-006, STM-007, STM-008 |
| shared-node-content | workflow/shared-node-content | 6 | > req: SHC-001, SHC-002, SHC-003, SHC-004, SHC-005, SHC-006 |
| silent-wave-execution | workflow/silent-wave-execution | 6 | > req: SWE-001, SWE-002, SWE-003, SWE-004, SWE-005, SWE-006 |
| subagent-directory-contract | agent/subagent-directory-contract | 2 | > req: SDC-001, SDC-002, SDC-003 |
| subagent-dispatch | agent/subagent-dispatch | 4 | > req: SUD-001, SUD-002, SUD-003, SUD-004, SUD-005, SUD-006, SUD-007 |
| subagent-node-contract | agent/subagent-node-contract | 9 | > req: SNC-001, SNC-002, SNC-003, SNC-004, SNC-005, SNC-006, SNC-007, SNC-008 |
| subagent-runtime-logging | agent/subagent-runtime-logging | 6 | > req: SRL-001, SRL-002, SRL-003, SRL-004, SRL-006 |
| test-fixtures | verification/test-fixtures | 2 | > req: TEF-001 |
| trace-writer | engine/trace-writer | 9 | > req: TRW-001, TRW-002, TRW-003, TRW-004, TRW-005, TRW-006 |
| transition-table | engine/transition-table | 7 | > req: TRT-001, TRT-002, TRT-003, TRT-005, TRT-006, TRT-011, TRT-012 |
| user-research-controls | research/user-research-controls | 3 | > req: URC-001, URC-002, URC-003 |
| verification-routing | verification/verification-routing | 6 | > req: VER-001, VER-002, VER-003, VER-004, VER-005, VER-006 |
| version-management | governance/version-management | 4 | > req: VEM-001, VEM-002, VEM-003, VEM-004 |
| wave0-artifacts-directory | research/wave0-artifacts-directory | 3 | > req: WAD-001, WAD-002, WAD-003 |
| wave1-intake | research/wave1-intake | 7 | > req: WAI-001, WAI-002, WAI-003, WAI-004, WAI-005, WAI-006, WAI-007, WAI-008 |
| wave2-synthesis | research/wave2-synthesis | 11 | > req: WTS-001, WTS-002, WTS-003, WTS-004, WTS-005, WTS-006, WTS-007, WTS-008, WTS-009, WTS-010, WTS-011 |
| work-unit-provenance-gate | agent/work-unit-provenance-gate | 16 | > req: WPG-001, WPG-002, WPG-003, WPG-004, WPG-005, WPG-006, WPG-007, WPG-008, WPG-009, WPG-010, WPG-011, WPG-012, WPG-013, WPG-014, WPG-015, WPG-016, WPG-017 |
| workflow-directory-contract | workflow/workflow-directory-contract | 10 | > req: WDC-001, WDC-002, WDC-003, WDC-004, WDC-005, WDC-006, WDC-007, WDC-008, WDC-009, WDC-010, WDC-011 |
| workflow-node-contract | workflow/workflow-node-contract | 14 | > req: WNC-001, WNC-002, WNC-003, WNC-004, WNC-005, WNC-006, WNC-007, WNC-008, WNC-009, WNC-010, WNC-011 |

## Completed Moves

| Legacy path | Canonical path | Status |
| --- | --- | --- |
| agent-command-surface | agent/agent-command-surface | complete |
| agent-context-routing | agent/agent-context-routing | complete |
| agent-output-declaration | agent/agent-output-declaration | complete |
| agent-testing | agent/agent-testing | complete |
| agentic-queue | agent/agentic-queue | complete |
| cmd-subagent-environment | agent/cmd-subagent-environment | complete |
| delegated-work-units | agent/delegated-work-units | complete |
| hitl-ux | agent/hitl-ux | complete |
| local-deepseek-claude-launcher | agent/local-deepseek-claude-launcher | complete |
| queue-input-validation | agent/queue-input-validation | complete |
| subagent-directory-contract | agent/subagent-directory-contract | complete |
| subagent-dispatch | agent/subagent-dispatch | complete |
| subagent-node-contract | agent/subagent-node-contract | complete |
| subagent-runtime-logging | agent/subagent-runtime-logging | complete |
| work-unit-provenance-gate | agent/work-unit-provenance-gate | complete |
| check-inspect-feedback | engine/check-inspect-feedback | complete |
| cli-exit-code-conventions | engine/cli-exit-code-conventions | complete |
| cli-inspect-output-conventions | engine/cli-inspect-output-conventions | complete |
| cli-phase-transition | engine/cli-phase-transition | complete |
| framework-engine | engine/framework-engine | complete |
| gate-content-dedup | engine/gate-content-dedup | complete |
| gate-fork-router | engine/gate-fork-router | complete |
| gate-skeleton | engine/gate-skeleton | complete |
| gate-state-machine | engine/gate-state-machine | complete |
| logger | engine/logger | complete |
| logging-conventions | engine/logging-conventions | complete |
| runtime-reentry-debuggability | engine/runtime-reentry-debuggability | complete |
| schema-core | engine/schema-core | complete |
| trace-writer | engine/trace-writer | complete |
| transition-table | engine/transition-table | complete |
| artifact-persistence-recovery | bundle/artifact-persistence-recovery | complete |
| bundle-data-isolation | bundle/bundle-data-isolation | complete |
| bundle-map | bundle/bundle-map | complete |
| bundle-start-from-here | bundle/bundle-start-from-here | complete |
| cache-raw-web-content | bundle/cache-raw-web-content | complete |
| cmd-bundle-instantiation | bundle/cmd-bundle-instantiation | complete |
| file-observability | bundle/file-observability | complete |
| reference-flat-format | bundle/reference-flat-format | complete |
| run-entry | bundle/run-entry | complete |
| canonical-topic-state | research/canonical-topic-state | complete |
| content-delivery-experiments | research/content-delivery-experiments | complete |
| content-delivery-gate-implementation | research/content-delivery-gate-implementation | complete |
| content-delivery-phase-content | research/content-delivery-phase-content | complete |
| evidence-extraction | research/evidence-extraction | complete |
| final-delivery-backing | research/final-delivery-backing | complete |
| plan-hostfile-sections | research/plan-hostfile-sections | complete |
| post-final-recovery | research/post-final-recovery | complete |
| pre-research-experiments | research/pre-research-experiments | complete |
| pre-research-gate-implementation | research/pre-research-gate-implementation | complete |
| pre-research-phase-content | research/pre-research-phase-content | complete |
| research-access-adapter | research/research-access-adapter | complete |
| research-return-map | research/research-return-map | complete |
| research-styles | research/research-styles | complete |
| research-wave-experiments | research/research-wave-experiments | complete |
| research-wave-gate-implementation | research/research-wave-gate-implementation | complete |
| research-wave-phase-content | research/research-wave-phase-content | complete |
| seed-topic-materialization | research/seed-topic-materialization | complete |
| user-research-controls | research/user-research-controls | complete |
| wave0-artifacts-directory | research/wave0-artifacts-directory | complete |
| wave1-intake | research/wave1-intake | complete |
| wave2-synthesis | research/wave2-synthesis | complete |
| experiment-agent-autorun | verification/experiment-agent-autorun | complete |
| experiment-observability | verification/experiment-observability | complete |
| experiment-ref-integrity | verification/experiment-ref-integrity | complete |
| experiment-run-strategy | verification/experiment-run-strategy | complete |
| experiment-shared-infra | verification/experiment-shared-infra | complete |
| integration-tests | verification/integration-tests | complete |
| test-fixtures | verification/test-fixtures | complete |
| verification-routing | verification/verification-routing | complete |
| conditional-nodes | workflow/conditional-nodes | complete |
| dynamic-node-loading | workflow/dynamic-node-loading | complete |
| fork-repair-converge | workflow/fork-repair-converge | complete |
| playbook-runner | workflow/playbook-runner | complete |
| repair-loop | workflow/repair-loop | complete |
| rerun-incremental-node | workflow/rerun-incremental-node | complete |
| rerun-topic-integration | workflow/rerun-topic-integration | complete |
| shared-node-content | workflow/shared-node-content | complete |
| silent-wave-execution | workflow/silent-wave-execution | complete |
| workflow-directory-contract | workflow/workflow-directory-contract | complete |
| workflow-node-contract | workflow/workflow-node-contract | complete |
| change-feedback-loop | governance/change-feedback-loop | complete |
| guidance-constitution | governance/guidance-constitution | complete |
| requirement-traceability | governance/requirement-traceability | complete |
| version-management | governance/version-management | complete |

## Final Native Validation

- `openspec list --specs --json` returned 84 live nested IDs.
- `openspec show agent/agent-command-surface --type spec --json --requirements`
  resolved the canonical path and returned 5 requirements.
- `openspec validate rebaseline-capability-taxonomy --strict` passed.
- `check-project-reqs.mjs` passed: 630 registered IDs, 53 retired, 0 orphan,
  and 738 occurrences across main specs and active deltas.
- `check-project-specs.mjs` passed: 84 main specs and 0 violations.
- `check-capability-taxonomy.mjs` passed: 84 nested main specs.
- `check-capability-discovery.mjs --change rebaseline-capability-taxonomy`
  passed.
- `check-verification-routing.mjs --change rebaseline-capability-taxonomy --mode assets`
  passed with 6 declared claims.

## Selected Integration Evidence

The six `verification-plan.yaml` integration assets passed together in one
`node --test` invocation: 47 assertions passed, 0 failed.

- `tests/integration/governance/check-project.test.mjs`
- `tests/integration/governance/check-capability-taxonomy.test.mjs`
- `tests/integration/governance/check-capability-discovery.test.mjs`
- `tests/integration/governance/change-feedback-finalizer.test.mjs`
- `tests/integration/md/canonical-harness-vocabulary-contract.test.mjs`
- `tests/integration/md/agent-experiment-autorun-terminology.test.mjs`

This is deterministic contract evidence only. It does not claim real-Agent or
runtime behavior proof. The combined run initially exposed a concurrent
temporary-directory `ENOENT` in the static test-source walker; its focused
`ENOENT` handling was added and the same combined invocation then passed.
After the final catalog-discovery example repair, the same six-file invocation
was run again against the final diff: 47 assertions passed and 0 failed.

## Final Inventory Comparison

- Baseline snapshot rows: 84; taxonomy-map entries: 84; current main-spec
  paths: 84; the map and main-spec inventories are identical.
- Current catalog rows: 84; the catalog and main-spec inventories are
  identical, with no duplicate or unexpected capability path.
- All 84 mapped primary registry prefixes resolve to their expected canonical
  path; no prefix mismatch exists. Documented sub-prefix and retired entries
  remain separate exceptions rather than extra live owners.
- All 84 current `> req:` headers and requirement counts equal the pre-move
  snapshot; no requirement ID was allocated or lost.
- All 84 former flat main-spec directories are absent. The only active delta
  paths are `governance/change-feedback-loop` and
  `governance/requirement-traceability` under this change.
- Current-surface direct-path scan found no live flat capability coordinate.
  A separate `validate-work-unit-hygiene` temporary fixture retains a flat
  path as fixture data; it is not a live navigation coordinate and is outside
  this migration's accepted-spec path contract.

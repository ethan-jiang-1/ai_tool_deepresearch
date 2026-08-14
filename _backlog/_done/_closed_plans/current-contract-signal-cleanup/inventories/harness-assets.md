# Harness Asset Inventory

> Scope: 222 non-empty tracked assets under `DEEP_RESEARCH_HARNESS/`, audited
> 2026-08-13. The five tracked empty files are listed at the end.

This is a file-level completeness record. `P` and `R` are deliberate keep
classifications, not an assertion that every sentence is ideal prose; C7/C8
will later decide wording cleanup only after the behavior families settle.

## Root Docs (5 / 222)

| Asset | Primary classification | Owner / tracked fact and next action |
| --- | --- | --- |
| `AGENTS.md` | P | Current Harness routing. C3 owns its legacy bundle-entry success guidance; C8 owns later wording compression. |
| `CLAUDE.md` | P | Mirrored current routing for Claude. C3/C8 must keep it synchronized with `AGENTS.md`. |
| `COMMANDS.md` | P | Current command catalogue and recovery boundary. C3 and C6d only change it after executable behavior changes. |
| `README.md` | P | Current framework orientation. C3/C8 may remove only obsolete entry compatibility prose. |
| `RUN.md` | P | Current new-run entry. C2a is archived; C2c owns banner/version choreography and C3 owns any legacy reentry wording. |

## CLI (34 / 222)

| Asset | Primary classification | Owner / tracked fact and next action |
| --- | --- | --- |
| `cli/README.md` | P | Current CLI guide. C3/C6d only affect documented owned boundaries. |
| `cli/advance-status.mjs` | P | Current status transition command; no cleanup fact found. |
| `cli/apply-research-style.mjs` | P | Current style mutation command; no cleanup fact found. |
| `cli/audit-phase-status.mjs` | P | Current audit command; no cleanup fact found. |
| `cli/check-reentry.mjs` | R | C3: exposes deprecated `START_FROM_HERE.md` diagnostics; do not remove a rejection/advice boundary without choosing its replacement owner. |
| `cli/enter-phase.mjs` | P | Current phase loading and chain handoff. |
| `cli/gates/check-gate-hitl1-recorded.mjs` | P | Current HITL1 Gate adapter; C4a adjacent profile facts remain protected until separately decided. |
| `cli/gates/check-gate-hitl2-recorded.mjs` | P | Current HITL2 Gate adapter. |
| `cli/gates/check-gate-instantiation-complete.mjs` | P | Current instantiation Gate; C3 may alter entry-file requirements only through this owner. |
| `cli/gates/check-gate-readiness-passed.mjs` | P | Current readiness Gate adapter. |
| `cli/gates/check-gate-rerun-ready.mjs` | P | Current rerun Gate adapter; C4b migration/recovery facts are adjacent protected behavior. |
| `cli/gates/check-gate-seed-topics-ready.mjs` | P | Current seed-topic Gate adapter; C4b is adjacent. |
| `cli/gates/check-gate-setup-ready.mjs` | P | Current setup Gate adapter; current profile validation is not version compatibility. |
| `cli/gates/check-gate-wave0-complete.mjs` | P | Current Wave0 Gate adapter; C5 reference-reader facts are adjacent. |
| `cli/gates/check-gate-wave1-complete.mjs` | P | Current Wave1 Gate adapter; C5/C6 facts are adjacent. |
| `cli/gates/check-gate-wave2-complete.mjs` | P | Current Wave2 Gate adapter; C5 facts are adjacent. |
| `cli/inspect-bundle.mjs` | C3 | Positive old-entry inspection path (`RUN_BUNDLE.md`, map-only, `START_FROM_HERE.md`); C3 must choose the one current rejection/inspection owner. |
| `cli/inspect-wave0-output.mjs` | P | Current inspect projection; C5a-2 may change only its historic reference-reader input policy. |
| `cli/inspect-wave1-output.mjs` | P | Current inspect projection; C5a-2 adjacent. |
| `cli/inspect-wave2-output.mjs` | P | Current inspect projection; C5a-2 adjacent. |
| `cli/instantiate-run-bundle.mjs` | P | Current bundle writer. C2b owns its `framework_version` write; C3 owns the current `BUNDLE_ENTRY.md`/map writer contract. |
| `cli/log-event.mjs` | P | Current trace-event command. `v1` field names are current schema discriminators. |
| `cli/operate-artifact-persistence.mjs` | P | Current crash-safe artifact operation. |
| `cli/operate-post-final-recovery.mjs` | P | Current post-final recovery command; not historical compatibility. |
| `cli/operate-queue.mjs` | P | C9a owns first-operation `bundle_name` initialization; C9b owns known-ID topic-slug fallback. Both are current accepted behavior today. |
| `cli/operate-topic-state.mjs` | P | C4b owns legacy-plan migration; current canonical mutation and lineage remain protected. |
| `cli/operate-work-unit.mjs` | P | C6a-C6d own historic read branches; current claim/submit/recovery command remains protected. |
| `cli/plan-hostfile-sections.mjs` | P | Current hostfile projection command. |
| `cli/sync-reference-index.mjs` | P | Current reference index writer; C5a-2 only affects historic metadata readers. |
| `cli/validate-bundle.mjs` | P | Current structural validator; C3 decides legacy-entry handling. |
| `cli/validate-phase-templates.mjs` | P | Current workflow-template validation. |
| `cli/validate-playbook.mjs` | P | Current playbook validation; YAML parsing is a current format contract. |
| `cli/validate-work-unit-hygiene.mjs` | R | Current safety scan. Its historical-token allowances are fixture/rejection logic, not a positive legacy path. |
| `cli/validate-workflow-package.mjs` | P | Current workflow package validator; C1b removes only the unreferenced shared pointer after a fresh reference scan. |

## Command Playbooks (13 / 222)

| Asset | Primary classification | Owner / tracked fact and next action |
| --- | --- | --- |
| `command_playbook/continue-run-bundle.md` | C3 | Current continuation procedure still selects old entry/map forms positively. |
| `command_playbook/instantiate-run-bundle.md` | P | Current creation guide; C2b/C3 synchronize only writer facts. |
| `command_playbook/operate-topic-state.md` | P | C4b migration procedure is current recovery behavior until policy changes. |
| `command_playbook/persist-artifact.md` | P | Current persistence procedure. |
| `command_playbook/plan-hostfile-sections.md` | P | Current hostfile procedure. |
| `command_playbook/post-final-recovery.md` | P | Current recovery procedure. |
| `command_playbook/provenance-forensics-guide.md` | P | C6 evidence inspector; historic rows are a reader-policy question, not disposable prose. |
| `command_playbook/setup-real-subagents.md` | P | Current host setup procedure. |
| `command_playbook/start-research.md` | P | Current new-run downstream entry; C3 only affects bundle reentry, not this new-run path. |
| `command_playbook/subagent_templates/claude-agent.md.tmpl` | P | Current sub-agent template. |
| `command_playbook/subagent_templates/codex-agent.toml.tmpl` | P | Current sub-agent template. |
| `command_playbook/subagent_templates/roles.md` | P | Current role template. |
| `command_playbook/work-unit-actor-decision.md` | P | C6c adjacent actor-provenance guide; current actor decision remains protected. |

## Engine Helpers (48 / 222)

| Asset | Primary classification | Owner / tracked fact and next action |
| --- | --- | --- |
| `engine/helpers/artifact-persistence.mjs` | P | Current crash-safe persistence mechanics. |
| `engine/helpers/bundle-identity.mjs` | P | Current bundle identity mechanics. |
| `engine/helpers/cache-leaf-contract.mjs` | P | Current cache contract; failure fallback is bounded current diagnostics. |
| `engine/helpers/canonical-topic-state.mjs` | P | C4b owns legacy-plan migration; canonical state, safe migration, and projection repair are protected. |
| `engine/helpers/cli-operation-contract.mjs` | P | Current CLI operation contract. |
| `engine/helpers/continuation-cue.mjs` | P | Current continuation projection. |
| `engine/helpers/direct-output-contract.mjs` | P | Current direct-output contract. |
| `engine/helpers/file-observability.mjs` | R | C3/C5/C6 consume it for diagnostics; historical file shapes must remain explicit advisory/rejection facts until their cards decide otherwise. |
| `engine/helpers/final-delivery-backing.mjs` | P | Current final-delivery backing contract. |
| `engine/helpers/framework-version.mjs` | C2b | Writer-only internal version-stamp helper. |
| `engine/helpers/gate-helpers-checks.mjs` | P | C5a-2 historic reference metadata reader is a bounded fact inside a current shared checker. |
| `engine/helpers/gate-helpers-core.mjs` | P | Current Gate mechanics; local parse/attempt fallbacks are current input handling, not cross-version support. |
| `engine/helpers/gate-helpers-provenance.mjs` | P | C5/C6 provenance reader; preserve current Gate truth until exact historic-reader policy is selected. |
| `engine/helpers/gate-helpers-readers.mjs` | P | Current Gate reader utilities and bounded diagnostics. |
| `engine/helpers/gate-helpers-serial.mjs` | P | Current Gate serialization. |
| `engine/helpers/gate-helpers.mjs` | P | Active shared facade with production CLI, test, and playbook consumers; its old compatibility comment is not a deletion signal. |
| `engine/helpers/handoff-helpers.mjs` | P | Current handoff verification. |
| `engine/helpers/markdown-semantic-sections.mjs` | P | Current Markdown semantic parser. |
| `engine/helpers/phase-entry-presentation.mjs` | P | Current phase-entry projection. |
| `engine/helpers/phase-queue-drain.mjs` | P | Current queue-drain contract. |
| `engine/helpers/phase-status-audit.mjs` | P | Current status audit. |
| `engine/helpers/plan-hostfile-sections.mjs` | P | Current plan-hostfile projection. |
| `engine/helpers/post-final-recovery.mjs` | P | Current post-final recovery semantics. |
| `engine/helpers/post-final-reentry-contract.mjs` | P | Current post-final reentry contract. |
| `engine/helpers/projection-entry-contract.mjs` | P | Current projection entry contract. |
| `engine/helpers/queue-demand-admission.mjs` | P | Current delegated-demand admission; assignment v3 is a current discriminator. |
| `engine/helpers/queue-terminal-failure.mjs` | P | Current terminal queue failure semantics. |
| `engine/helpers/recovery-contract.mjs` | P | Current recovery contract. |
| `engine/helpers/ref-count.mjs` | P | Current reference-count utility. |
| `engine/helpers/reference-index-sync.mjs` | P | C5 owns historic reference reader behavior; current index sync remains protected. |
| `engine/helpers/reference-url.mjs` | P | Current reference URL utility. |
| `engine/helpers/rerun-availability.mjs` | P | Current rerun availability. |
| `engine/helpers/rerun-direction.mjs` | P | Current rerun direction and lineage. |
| `engine/helpers/research-style-params.mjs` | P | Current research-style parameter projection. |
| `engine/helpers/research-style-projection.mjs` | P | Current research-style projection. |
| `engine/helpers/return-map.mjs` | P | C4b/C5 distinguish current and legacy projection facts; current current-round blocking/advisory split is protected. |
| `engine/helpers/seed-topic-authoring-evaluator.mjs` | P | C4b adjacent canonical seed evaluation. |
| `engine/helpers/topic-layout.mjs` | P | C4b/C5 use historical layout references; `previous_layouts` is current lineage, not a legacy-format candidate by itself. |
| `engine/helpers/topic-registry-fact.mjs` | P | Current topic-registry fact. |
| `engine/helpers/wave-carried-target-receipts.mjs` | P | Current carried-target receipt contract. |
| `engine/helpers/wave-contract-evaluators.mjs` | P | Current Wave evaluator; historical observations are bounded reader facts. |
| `engine/helpers/wave-contract-findings.mjs` | P | Current finding projection compatibility shape. |
| `engine/helpers/wave-degradation-eligibility.mjs` | P | Current degradation policy, not old-version compatibility. |
| `engine/helpers/wave-depth-contracts.mjs` | P | C5 reader facts are adjacent; current depth contract remains protected. |
| `engine/helpers/wave-gate-verdict.mjs` | P | Current Gate verdict projection. |
| `engine/helpers/wave0-reference-convergence.mjs` | P | C5 historic/reference metadata reader boundary. |
| `engine/helpers/wave1-reference-convergence.mjs` | P | C5 historic/reference metadata reader boundary. |
| `engine/helpers/work-unit-role-guidance.mjs` | P | Current work-unit role guidance resolver. |

## Engine Core and Work Units (34 / 222)

| Asset | Primary classification | Owner / tracked fact and next action |
| --- | --- | --- |
| `engine/ask-next.mjs` | P | Current next-step helper. |
| `engine/consistency-validator.mjs` | P | Current consistency reader; YAML/JSON frontmatter is one current parser contract. |
| `engine/esm-dirname.mjs` | F | ESM path utility; no compatibility behavior. |
| `engine/gate-fork.mjs` | P | Current experiment-supported Gate utility; C1 must not classify it as dead runtime code. |
| `engine/gate-loop.mjs` | P | Current experiment-supported Gate utility; C1 must not classify it as dead runtime code. |
| `engine/logger.mjs` | P | Current structured logger. |
| `engine/queue-manager-core.mjs` | P | Current queue state mechanics. |
| `engine/queue-manager-ledger.mjs` | P | Current queue ledger/history mechanics. |
| `engine/queue-manager-lifecycle.mjs` | P | Current queue lifecycle; its fallback is current error handling. |
| `engine/queue-manager-render.mjs` | P | Current queue rendering. |
| `engine/queue-manager-window.mjs` | P | Current queue-window mechanics. |
| `engine/queue-manager.mjs` | P | Current queue facade. |
| `engine/trace.mjs` | P | Current canonical trace writer. |
| `engine/transition-chain.mjs` | P | Current transition-chain owner. |
| `engine/work-unit-actor.mjs` | P | C6c has historic actor reader facts; current delegated/fallback policy remains protected. |
| `engine/work-unit-assignment-contract.mjs` | P | C6a owns marked v1/v2 interpretation; v3 writer remains current. |
| `engine/work-unit-attempt-disposition.mjs` | P | C6b/C6c/C6d historic readers feed current disposition; do not remove a safety projection piecemeal. |
| `engine/work-unit-candidate-projection.mjs` | P | Current candidate projection; C6c is adjacent only. |
| `engine/work-unit-constants.mjs` | P | Current work-kind and authorized fallback policy. |
| `engine/work-unit-core.mjs` | P | Current work-unit public facade. |
| `engine/work-unit-envelope.mjs` | P | C6a/C6c historical envelope display, plus current v3 writer/actor facts. |
| `engine/work-unit-index.mjs` | P | C6d transaction inspection export; current index authority remains protected. |
| `engine/work-unit-inspect.mjs` | R | C6a-C6d old records are inspected as explicit legacy/suspect facts; this is a current diagnostic/safety boundary. |
| `engine/work-unit-lifecycle.mjs` | P | C6a-C6c reader/writer fanout; current lifecycle and actor facts remain protected. |
| `engine/work-unit-projection.mjs` | P | C6b historic submitted rows are excluded from current-round authority; that distinction is current correctness. |
| `engine/work-unit-submit-integrity.mjs` | R | C6d transaction state blocks or permits a current submit; no silent old-journal omission. |
| `engine/work-unit-submit.mjs` | P | C6a-C6c historic submit normalization; current marked submit is protected. |
| `engine/work-unit-submitted-ledger.mjs` | R | C6b `legacy_non_work_unit_rows` feed a current provenance-bypass safety scan, not harmless data cleanup. |
| `engine/work-unit-supersession.mjs` | P | C6b/C6d historical proof affects supersession; current predecessor safety is protected. |
| `engine/work-unit-timeout-preflight.mjs` | P | C6b/C6d current timeout safety. |
| `engine/work-unit-transaction.mjs` | R | C6d v1 journals remain explicit suspect/evidence facts; v2 mutation/recovery is protected. |
| `engine/work-unit-utils.mjs` | P | Current work-unit utility functions. |
| `engine/work-unit-validation.mjs` | P | C6a-C6c validated historical readers; current v3 validation remains protected. |
| `engine/workflow-chain.mjs` | P + C1e | YAML-or-JSON frontmatter is one current YAML/JSON contract. The unreferenced `parseYAMLSubset()` helper is the separate C1e candidate. |

## Host Tools (13 / 222)

| Asset | Primary classification | Owner / tracked fact and next action |
| --- | --- | --- |
| `host_tools/README.md` | P | Current host-tool orientation; C5b only changes retained-history policy facts. |
| `host_tools/agent-experiment-state.mjs` | P | Current V2 state policy. |
| `host_tools/claude-deepseek.mjs` | P | Current launcher command. |
| `host_tools/finalize-agent-experiment.mjs` | P | Current completion finalizer. |
| `host_tools/lib/agent-cli-launcher.mjs` | P | Current provider-compatible launcher boundary, not a version-compatibility branch. |
| `host_tools/lib/agent-experiment-contract.mjs` | P + C1f | Current experiment schemas remain protected. C1f isolates the archive-ledger-only validator/export pair. |
| `host_tools/lib/agent-experiment-supervisor.mjs` | P | Current Supervisor mechanics. |
| `host_tools/lib/env-deepseek.mjs` | P | Current environment reader. |
| `host_tools/lib/experiment-run-strategy.mjs` | P | C5b retained v1 observations are active selection inputs and require a separate policy decision. |
| `host_tools/lib/research-access-adapter.mjs` | P | C4a legacy research-access envelope reader; current adapter behavior remains protected. |
| `host_tools/research-access-adapter.md` | P | C4a guidance projection of the accepted access reader. |
| `host_tools/run-agent-experiment.mjs` | P | Current Autorun entry. |
| `host_tools/validate-agent-experiment-manifest.mjs` | P | Current manifest validation. |

## Run-Bundle Templates (11 / 222)

| Asset | Primary classification | Owner / tracked fact and next action |
| --- | --- | --- |
| `rb_templates/BUNDLE_ENTRY.md.tmpl` | P | Current C3 entry writer; retain as the unique future entry after C3 policy. |
| `rb_templates/BUNDLE_MAP.md.tmpl` | P | Current passive map writer; C3 must not turn it into an operation entry. |
| `rb_templates/_cache/README.md.tmpl` | P | Current cache navigation; older-name wording is non-authoritative history. |
| `rb_templates/artifacts/README.md.tmpl` | P | Current artifact navigation; legacy mention is explanatory only. |
| `rb_templates/rb_plan.md.tmpl` | C2b | Current plan template except for writer-only `framework_version` stamp. |
| `rb_templates/rb_profile.yaml.tmpl` | P | Current profile template. |
| `rb_templates/rb_queue.json.tmpl` | P + C9a | Fresh writer intentionally emits `bundle_name: null`; first-operation initialization is current accepted behavior. |
| `rb_templates/rb_status.json.tmpl` | P | Current status template. |
| `rb_templates/reference/README.md.tmpl` | P | Current reference navigation. |
| `rb_templates/reference/_INDEX.md.tmpl` | P | Current index template; C5 owns historic reader policy. |
| `rb_templates/_logs/README.md.tmpl` | P | Current log-directory navigation. |

## Schema and Gate Definitions (28 / 222)

| Asset | Primary classification | Owner / tracked fact and next action |
| --- | --- | --- |
| `schema/README.md` | P | Current schema orientation; C8 may sharpen only routing prose. |
| `schema/contracts/gate-definition.mjs` | P | Current Gate-definition schema. |
| `schema/contracts/gate.mjs` | C1c | Stale abstract FSM contract with only stale docs/tests/barrel consumers. |
| `schema/contracts/plan.mjs` | P | C4b legacy-plan schema is current migration/rejection machinery until policy changes. |
| `schema/contracts/playbook.mjs` | P | Current playbook schema. |
| `schema/contracts/profile.mjs` | P | C4a legacy profile envelope reader; current profiles remain protected. |
| `schema/contracts/queue.mjs` | P + C9a | Current `queue.v2`; nullable/missing bundle identity is explicitly accepted initialization/history behavior. |
| `schema/contracts/reference.mjs` | P | C5 reference metadata reader; current writer contract is distinct from historic inputs. |
| `schema/contracts/status.mjs` | P | Current status schema. |
| `schema/contracts/trace.mjs` | F | Current trace schema and discriminators. |
| `schema/contracts/work-unit-transaction.mjs` | R | C6d v1 journal parsing protects a current fail-closed mutation boundary. |
| `schema/contracts/work-unit.mjs` | P | C6a-C6c historic reader union plus current v1/v3 discriminators; no blanket version deletion. |
| `schema/enums.mjs` | P | Current shared enums. |
| `schema/gate_definitions/gate-hitl1-recorded.definition.json` | P | Current Gate definition; C4a profile facts are adjacent. |
| `schema/gate_definitions/gate-hitl2-recorded.definition.json` | P | Current Gate definition. |
| `schema/gate_definitions/gate-instantiation-complete.definition.json` | P | Current bundle-instantiation definition; C3 owns entry policy. |
| `schema/gate_definitions/gate-readiness-passed.definition.json` | P | Current Gate definition. |
| `schema/gate_definitions/gate-rerun-ready.definition.json` | P | Current rerun definition; C4b is adjacent. |
| `schema/gate_definitions/gate-seed-topics-ready.definition.json` | P | Current seed-topic definition; C4b is adjacent. |
| `schema/gate_definitions/gate-setup-ready.definition.json` | P | Current setup definition. |
| `schema/gate_definitions/gate-wave0-complete.definition.json` | P | Current Wave0 definition; C5 facts are adjacent. |
| `schema/gate_definitions/gate-wave1-complete.definition.json` | P | Current Wave1 definition; C5/C6 facts are adjacent. |
| `schema/gate_definitions/gate-wave2-complete.definition.json` | P | Current Wave2 definition; C5 facts are adjacent. |
| `schema/index.mjs` | P + C1c | Current schema barrel; only C1c's stale gate exports are candidate removals. |
| `schema/research-styles/claim_verification.json` | F | Current style definition. |
| `schema/research-styles/debug.json` | F | Current style definition. |
| `schema/research-styles/exploratory_map.json` | F | Current style definition. |
| `schema/research-styles/quick_factual.json` | F | Current style definition. |

## Workflow Docs and Manifest (36 / 222)

| Asset | Primary classification | Owner / tracked fact and next action |
| --- | --- | --- |
| `workflows/README.md` | P | Current workflow orientation. |
| `workflows/manifest.json` | P | Current workflow loading authority; C1b reference absence is evidence, not a manifest change. |
| `workflows/nodes/brief/hitl1.md` | P | Current HITL1 brief. |
| `workflows/nodes/brief/hitl2.md` | P | Current HITL2 brief. |
| `workflows/nodes/phases/phase-final.md` | P | Current terminal delivery phase. |
| `workflows/nodes/phases/phase-hitl1.md` | P | C4a current profile/access semantics; guidance cannot pre-empt its policy decision. |
| `workflows/nodes/phases/phase-hitl2.md` | P | Current HITL2 phase; legacy prose references are current forensic-boundary guidance. |
| `workflows/nodes/phases/phase-instantiation.md` | P | Current instantiation phase; C3 only affects entry facts after executable policy changes. |
| `workflows/nodes/phases/phase-readiness.md` | P | Current readiness phase. |
| `workflows/nodes/phases/phase-rerun.md` | P | C4b explicit `migrate_legacy` path is current controlled recovery. |
| `workflows/nodes/phases/phase-seed-topics.md` | P | C4b canonical seed/migration guidance. |
| `workflows/nodes/phases/phase-setup.md` | P | Current setup phase. |
| `workflows/nodes/phases/phase-wave0.md` | P | C5/C6 current evidence and recovery guidance. |
| `workflows/nodes/phases/phase-wave1.md` | P | C5/C6 current evidence, UID, and work-unit guidance. |
| `workflows/nodes/phases/phase-wave2.md` | P | C5/C6 current evidence, selected subset, and recovery guidance. |
| `workflows/nodes/phases/subagent-dpt-claim-verifier.md` | F | Current receipt-event schema version. |
| `workflows/nodes/phases/subagent-dpt-evidence-extractor.md` | P | Current actor/work-unit guidance; historic terms are bounded forensic context. |
| `workflows/nodes/phases/subagent-dpt-source-diagnostic.md` | F | Current receipt-event schema version. |
| `workflows/nodes/phases/subagent-dpt-source-intake.md` | P | Current role guide. |
| `workflows/nodes/phases/subagent-dpt-topic-scout.md` | P | Current role guide; historic terms are bounded forensic context. |
| `workflows/nodes/shared/shared-agent-ux-guidance.md` | P | Current Agent UX guidance. |
| `workflows/nodes/shared/shared-anti-cheating-rules.md` | P | Current anti-fabrication rule; old/placeholder examples are teaching counterexamples. |
| `workflows/nodes/shared/shared-gate-rules.md` | P | Current Gate guidance projection. |
| `workflows/nodes/shared/shared-hitl1-capability-probe.md` | P | Current bounded probe/no-invented-fallback guidance. |
| `workflows/nodes/shared/shared-hitl1-research-access-envelope.md` | P | C4a current access-envelope guidance. |
| `workflows/nodes/shared/shared-page-fetch-guidance.md` | P | Current page-fetch guidance. |
| `workflows/nodes/shared/shared-profile.md` | P | C4a current versus legacy access-observation distinction. |
| `workflows/nodes/shared/shared-reference-template.md` | P | C5a-2 current writer plus historic metadata reader guidance. |
| `workflows/nodes/shared/shared-repair-guidance.md` | P | Current repair guidance. |
| `workflows/nodes/shared/shared-return-map-authoring.md` | P | Current required return-map owner despite its compatibility-pointer title. |
| `workflows/nodes/shared/shared-schemas.md` | P | C5/C6 current writer and bounded historic-reader guidance. |
| `workflows/nodes/shared/shared-seed-topic-authoring.md` | C1b | Unreferenced pointer; current template/playbook own its actual guidance. |
| `workflows/nodes/shared/shared-silent-execution.md` | P | Current silent-execution policy; "compatibility hint" is a current Gate interaction detail. |
| `workflows/nodes/shared/shared-subagent-protocol.md` | P | C6 current recovery/provenance instruction surface. |
| `workflows/nodes/templates/seed-topic-template.md` | P | Current seed-topic authoring template. |
| `workflows/transitions.chain.json` | P | Current deterministic routing source of record. |

## Empty Tracked Files (5; outside the 222 detailed assets)

| Asset | Classification | Reason |
| --- | --- | --- |
| `cli/gates/.gitkeep` | F | Directory placeholder. |
| `rb_templates/rb_trace.jsonl` | F | Intentionally empty trace template. |
| `schema/gate_definitions/.gitkeep` | F | Directory placeholder. |
| `workflows/nodes/phases/.gitkeep` | F | Directory placeholder. |
| `workflows/nodes/shared/.gitkeep` | F | Directory placeholder. |

## Count Check

| Group | Non-empty assets |
| --- | ---: |
| Root docs | 5 |
| CLI | 34 |
| Command playbooks | 13 |
| Engine helpers | 48 |
| Engine core and work units | 34 |
| Host tools | 13 |
| Run-bundle templates | 11 |
| Schema and Gate definitions | 28 |
| Workflow docs and manifest | 36 |
| **Total** | **222** |

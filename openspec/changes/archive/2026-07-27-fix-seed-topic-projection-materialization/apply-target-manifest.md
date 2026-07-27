# Apply Target Manifest: Seed Topic Projection Materialization

## Admission Record

- Change: `fix-seed-topic-projection-materialization`
- Apply routing check: `node openspec/governance/check-verification-routing.mjs --change fix-seed-topic-projection-materialization --mode plan`
- Result: passed before target-code edits on 2026-07-27.

This manifest records implementation ownership. It is an apply aid, not a new
runtime authority. The accepted capability specs and the listed direct runtime
facts remain authoritative.

## Added Or Consolidated Control Surfaces

| Surface | Target | Direct Source of Record | Responsibility boundary |
| --- | --- | --- | --- |
| Frozen Appendix Slot Map | `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs` | Executable slot descriptors | Canonical/legacy heading bases, bounded suffix policy, cards, tokens, Wave ownership, identity kind and merge rule. Markdown mirrors it but does not drive runtime behavior. |
| Strict projection packet | `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs` and `DPT_FRAMEWORK/cli/operate-topic-state.mjs` | `TopicApplyPlanSchema` plus existing route/lifecycle facts | Accept only `wave_projection/apply_seed_projection`; no raw Markdown, path, heading, line or patch authority. |
| Projection materializer | `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs` | Existing topic-state workspace/recover transaction | Resolves current seed and direct authority, then atomically changes only the selected seed. It never stages `rb_plan.md` or creates evidence/receipt/trace authority. |
| Pure projection-readiness evaluator | `DPT_FRAMEWORK/engine/helpers/return-map.mjs` | Per-invocation registry, submitted-row or finding-index facts, slot map and parsed seed bytes | Read-only evaluation shared by Wave inspect and formal gates. It has no packet target or write-cardinality input. |
| Formal gate projection findings | `DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs`, Wave gate CLIs and `wave-degradation-eligibility.mjs` | Same per-invocation evaluator result | Adds one structured projection verdict to existing advancement ownership; structural failures remain degradation-ineligible. |
| Seed Topic document template | `DPT_FRAMEWORK/workflows/nodes/templates/seed-topic-template.md` | Executable slot map paired with static parity test | Instantiable document skeleton, slot/card/timing and rendered-entry format mirror; it is not evidence or mutation authority. |
| Projection packet protocol | `DPT_FRAMEWORK/command_playbook/operate-topic-state.md` | `TopicApplyPlanSchema` plus existing route/lifecycle facts | The sole complete Agent-readable packet, authorization, apply/recover, repair and rerun-input protocol for the command that consumes it. |
| Packet/inspect closeout guidance | Wave and seed-topic nodes; `shared-schemas.md` | Existing Wave authority, existing topic-state writer and inspect CLI | Directs Agent judgment through authority -> command-playbook packet -> writer -> same inspect -> formal gate. |

## Removed Or Merged Surfaces

| Former surface | Disposition | Replacement / retained compatibility |
| --- | --- | --- |
| `shared-seed-topic-template.md` mixed template/protocol | Retire | Replace with `templates/seed-topic-template.md` for document structure and `command_playbook/operate-topic-state.md` for execution. |
| `shared-seed-topic-authoring.md` complete contract | Retire as a complete template | Short pointer only, if package compatibility requires it; it cannot define document structure or the packet protocol. |
| `shared-return-map-authoring.md` complete contract | Retire as a complete template | Short pointer only, if package compatibility requires it; entry presentation lives in the template and packet execution lives in the command playbook. |
| Phase-local manual `__BACKFILL_*__` replacement instructions | Remove | Retained packet -> `operate-topic-state apply` -> same Wave inspect loop. |
| Wave1/Wave2 definition-level seed token checks | Remove | The shared readiness evaluator is the sole projection token/entry validator consumed by inspect and formal gates. |
| Per-caller projection interpretation | Merge | `evaluateSeedTopicProjectionReadiness()` (implementation name to be finalized) in the return-map helper. |

## Requirement Traceability

| Requirement | Owning modified surfaces | Planned `@impl` ownership |
| --- | --- | --- |
| `CTS-004` | Topic-state schema, lifecycle admission, workspace materializer, CLI integration/e2e tests | `canonical-topic-state.mjs`, `operate-topic-state.mjs`, new projection tests |
| `STM-001` | Slot map, canonical renderer, `templates/` document template/card parity, seed-phase guidance | `canonical-topic-state.mjs`, authoring/template tests |
| `RRM-002` | Packet entry semantics, authority binding, materialization | `canonical-topic-state.mjs`, return-map/projection tests |
| `RRM-003` | Template namespace plus phase/playbook routing | Markdown contract tests, template and command-playbook surfaces |
| `RRM-007` | Shared readiness evaluator, inspect/gate integration, legacy read behavior | `return-map.mjs`, Wave evaluator/gate integration, projection tests |
| `RWP-016` | Wave closeout guidance and inspect-before-gate ordering | Wave phase/package tests |

All six requirement IDs already exist in `openspec/governance/req-registry.yaml`.
No new registry ID is allocated for the slot map, packet schema, writer, or
readiness helper: those are implementation surfaces of the existing contracts.

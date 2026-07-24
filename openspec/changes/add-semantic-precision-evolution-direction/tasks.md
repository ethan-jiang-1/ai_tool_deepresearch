## Traceability Note

GCO-007 owns the semantic-precision direction and its boundary; GCO-008 owns the ordered three-direction route. Guidance and configuration changes implement those review contracts only. They do not prove or alter any runtime capability, Agent behavior, schema, CLI, Gate, receipt, trace, or version surface.

## 1. Apply Preconditions

- [x] 1.1 Validate the GCO-007/GCO-008 delta, registry entries, and `verification-plan.yaml` with `openspec validate add-semantic-precision-evolution-direction --strict` and `node openspec/governance/check-verification-routing.mjs --change add-semantic-precision-evolution-direction --mode plan`; confirm the approved target manifest is separate from the dirty delegated-work change.
- [x] 1.2 Record the active navigation manifest and baseline two-direction governance regression. Done when the listed core, companion, and seven support guidelines are the only migration targets, with archives, closed backlog, `DPT_FRAMEWORK/`, and delegated-work artifacts excluded.

## 2. Semantic-Precision Direction And Core Routes

- [ ] 2.1 @impl GCO-007: Create `guidelines/evolution-semantic-precision.md` with the canonical EWD 340 quotation/link and historical context, charter-companion frontmatter, semantic-level definitions and disciplines, gradual convergence, a four-part Semantic-Level Admission Test, and an explicit non-runtime boundary. Done when it makes the bounded decision, essential distinctions, reader-facing Interface, legal/no-path, and net conceptual reduction reviewable without prescribing an implementation.
- [ ] 2.2 @impl GCO-007, GCO-008: Update `guidelines/project-charter.md` and `guidelines/README.md`. Done when the Charter has only a short entry-point Dijkstra context, both files route the ordered triad in siblings/precedence/reading/review/related guidance, and neither file turns the new direction into runtime authority.
- [ ] 2.3 @impl GCO-008: Update `openspec/config.yaml`, `guidelines/evolution-simple-reliable-control.md`, and `guidelines/evolution-helper-oriented-agent.md`. Done when future proposal/design rules require semantic-precision → simplicity → helper review, and the two existing companions retain their distinct ownership while exposing the third route.

## 3. Active Navigation And Regression

- [ ] 3.1 @impl GCO-008: Update the declared active support guidelines (`agentic-execution-model`, `agentic-queue-mechanism`, `agentic-subagent-mechanism`, `agentic-workflow-mechanism`, `framework-runtime-boundary`, `logging-conventions`, and `command-experiments`) so their `siblings` and related navigation expose the semantic-precision canonical path; normalize command-experiments to the full triad. Done when no migration target retains a two-direction-only navigation route.
- [ ] 3.2 @impl GCO-007, GCO-008: Update `tests/integration/md/evolution-direction-governance.test.mjs`. Done when it asserts three canonical files, the new guide’s source/context/admission-test markers, config’s ordered three obligations, and every declared active navigation surface while continuing to exclude archived and closed records.

## 4. Verification And Archive Readiness

- [ ] 4.1 Run `node --test tests/integration/md/evolution-direction-governance.test.mjs`, `git diff --check`, `openspec validate add-semantic-precision-evolution-direction --strict`, and `node openspec/governance/check-verification-routing.mjs --change add-semantic-precision-evolution-direction --mode assets`. Record that this is guidance-only and requires no version bump.
- [ ] 4.2 Run `node openspec/governance/check-project-reqs.mjs` and confirm `0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired`.
- [ ] 4.3 Before archive, use the OpenSpec sync/archive flow to merge the GCO-007/GCO-008 delta into the accepted `guidance-constitution` spec, then run `node openspec/governance/check-project-specs.mjs` and confirm `0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader`.

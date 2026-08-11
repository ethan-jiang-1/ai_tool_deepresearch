> Apply discipline: after each completed target-edit or verification task,
> update its checkbox and append concise, directly observed command evidence to
> that task line. A planned command is not completion evidence.

## 1. Pre-Edit Governance

- [ ] 1.1 `openspec-feedback:plan-review` - Before the first target edit, review `proposal.md`, the REF-002 delta, `design.md`, `verification-plan.yaml`, and `semantic-closure.yaml` against CTS-010 and REF-002. Record every actionable finding as an ordinary unchecked task with its requirement/reader question, authoritative owner, smallest repair, and independently observable done condition. Done when no untracked planning finding remains; this marker records review only, not test, semantic, or archive success.
- [ ] 1.2 @impl VER-002, VER-003, SEF-002, SEF-004: Before the first target edit, run `node openspec/governance/check-project-reqs.mjs --mode plan`, `node openspec/governance/check-verification-routing.mjs --change harden-agent-authored-contracts --mode plan`, and `node openspec/governance/check-semantic-closure.mjs --change harden-agent-authored-contracts --mode plan`. Done when all pass and the record still uses only existing catalog families; do not edit target code if any command fails.

## 2. Schema Authoring Projection

- [ ] 2.1 @impl CTS-010: Strengthen `tests/integration/topic-state-schema-wave-identity.test.mjs` so it selects the public Wave2 conditional form and verifies its `{ kind: "finding", finding_id }` shape, required field path(s), `entry_id === finding_id`, and complete template pass the existing `TopicApplyPlanSchema`; retain Wave0/Wave1 coverage. Done when the focused integration test fails against the old incomplete projection and has no test-local duplicate validator.
- [ ] 2.2 @impl CTS-010: Extend `describeTopicApplyPlanSchema('wave_projection')` in `DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs` with backward-compatible Zod-derived conditional forms per legal Wave/source-identity branch. Each emitted template must be accepted by the unchanged top-level schema; unsupported discovery must preserve current fail-closed behavior. Done when the focused schema test passes without globally requiring both `work_id` and `finding_id` or adding another validator.
- [ ] 2.3 @impl CTS-010: Extend `tests/integration/cli/operate-topic-state-projection.test.mjs` to obtain the Wave2 form through the public `schema` CLI, use its template in a legal disposable Wave2 apply context, and assert any failure is not `input_invalid` from a hidden identity shape. Done when the public CLI test passes and preserves existing lifecycle/finding-authority checks rather than hand-writing a bypass.

## 3. Reference Format Contract

- [ ] 3.1 @impl REF-002: Add focused helper regressions in `tests/engine/helpers/gate-helpers-checks.test.mjs` for each bounded raw document signature, exact reference/section `reference_format` finding, code-fence exclusion, ordinary non-document presentation, missing-section precedence, and source-byte non-mutation. Done when they fail before the evaluator change and do not claim research-quality or HTML-sanitization behavior.
- [ ] 3.2 @impl REF-002: In `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs`, add one fenced-code-excluded, case-insensitive document-signature predicate inside `checkReferenceFormatFiles`. Reuse the existing section parser and `checkerFinding`; emit one direct format root per contaminated non-empty section and preserve all existing metadata/binding/section checks. Done when the helper regressions pass with no new checker, command, cleanup, or route.
- [ ] 3.3 @impl REF-002: Extend `tests/integration/cli/check-gate-wave1-complete.test.mjs` with a complete temporary reference whose required section has raw document markup. Assert the existing Gate and inspect outputs expose the same blocking `reference_format` repair for its exact section and make no bundle mutation. Done when the integration test passes without adding a Wave-specific format path.
- [ ] 3.4 @impl REF-002: Update `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/subagent-dpt-evidence-extractor.md` so rich-reference authors interpret fetched page content into Markdown facts and do not copy raw document markup into required section bodies. Done when the guidance remains a derived consumer, retains existing metadata/serialization instructions, and claims no format-verdict authority.

## 4. Spec And Release Alignment

- [ ] 4.1 @impl REF-002: Re-read the complete REF-002 delta against the implemented evaluator and selected tests, then run the Agent-owned delta/main spec synchronization for `harden-agent-authored-contracts`. Done when the accepted main requirement contains the full bounded predicate, fenced-code exclusion, feedback/no-mutation boundary, and scenarios without altering CTS-010's existing owner.
- [ ] 4.2 @impl CTS-010, REF-002: Update `CHANGELOG.md` with `v0.88`, describing only the conditional authoring form and bounded raw-markup format rule plus their non-goals. Done when no release text implies source-quality scoring, automatic cleanup, Agent behavior proof, or a new Gate route.
- [ ] 4.3 @impl CTS-010, REF-002: Synchronize `DEEP_RESEARCH_HARNESS/RUN.md` to banner/current-release `v0.88` and the same concise behavior boundary. Done when RUN and CHANGELOG agree and no lifecycle/permission claim is introduced.

## 5. Verification

- [ ] 5.1 @impl CTS-010, VER-001: Run `node --test tests/integration/topic-state-schema-wave-identity.test.mjs` and `node --test tests/integration/cli/operate-topic-state-projection.test.mjs`. Done when both pass and are recorded as deterministic projection/CLI evidence, not proof of Agent authoring behavior.
- [ ] 5.2 @impl REF-002, VER-001: Run `node --test tests/engine/helpers/gate-helpers-checks.test.mjs` and `node --test tests/integration/cli/check-gate-wave1-complete.test.mjs`. Done when both pass and are recorded as deterministic helper/Wave feedback evidence, not research-quality evidence.
- [ ] 5.3 @impl VER-001, VER-002, VER-003: Run `npm test -- --test-concurrency=1`, `git diff --check`, `openspec validate harden-agent-authored-contracts --strict`, `node openspec/governance/check-verification-routing.mjs --change harden-agent-authored-contracts --mode assets`, and `node openspec/governance/check-semantic-closure.mjs --change harden-agent-authored-contracts --mode assets`. Done when every command passes, the two selected routes remain unit/integration only, and no generated runtime artifact is present.

## 6. Archive Preconditions

- [ ] 6.1 `openspec-feedback:closeout-review` - Before archive, review the actual change-scoped diff, synced REF-002 main/delta comparison, v0.88 release surfaces, selected evidence, verification plan, and semantic closure. Record every actionable finding as an ordinary unchecked task with its requirement/reader question, authoritative owner, smallest repair, and independently observable done condition. Complete only when no open scoped finding remains; this marker does not itself authorize archive.
- [ ] 6.2 @impl RET-006: Run `node openspec/governance/check-project-reqs.mjs --mode archive --change harden-agent-authored-contracts`. Done when it exits 0 with 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired requirement IDs for the selected change.
- [ ] 6.3 @impl RET-006: Run `node openspec/governance/check-project-specs.mjs`. Done when it exits 0 with 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.

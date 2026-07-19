## 1. Verification Baseline

- [ ] 1.1 Run `node openspec/governance/check-verification-routing.mjs --change centralize-seed-topic-authoring-contracts --mode plan` before any target edit; done when all four claims resolve to canonical `unit`, `integration`, and `deterministic_e2e` assets and `agent_flow_e2e` remains explicitly not applicable.
- [ ] 1.2 Add failing `STM-001` parity assertions to `tests/engine/helpers/canonical-topic-state.test.mjs`; done when the test extracts ordered canonical appendix H2 headings/tokens from renderer output and the planned shared authoring surface, fails on either-side drift, and does not compare prose bytes, YAML key order, or whitespace.
- [ ] 1.3 Extend `tests/engine/helpers/wave-contract-evaluators-direction.test.mjs` for `RTI-007`; done when matching/stale/future/legacy-unbound/invalid, canonical add/supplement, heading suffix, optional bullet/bold labels, unknown extension, duplicate section/field, invalid action/count, empty required values and semantic non-judgment are explicit failing-before-change fixtures.
- [ ] 1.4 Add `tests/integration/md/seed-topic-authoring-contract.test.mjs` for `STM-001`, `RRM-003`, and `RTI-007`; done when it proves shared-node identity/requires reachability, one complete generic seed/return-map/direction contract, absence of phase-local complete duplicates, production workflow-package validity, and real rerun-ready CLI exact-field/root-first feedback over temporary bundles.
- [ ] 1.5 Extend `tests/e2e/rerun-round-continuity.test.mjs` for `RTI-007`; done when labeled simulated Agent input drives canonical add/supplement direction, incomplete future-direction repair, profile increment, layout-only preservation and downstream current-action classification through production deterministic paths without claiming real Agent judgment.

## 2. Shared Authoring Surface

- [ ] 2.1 Implement `STM-001` by adding `DPT_FRAMEWORK/workflows/nodes/shared/shared-seed-topic-authoring.md` with valid shared-node frontmatter, canonical initialization skeleton, appendix responsibility/headings/tokens, canonical five-field entry, optional rerun-direction fragment, Source-of-Record boundaries and no-rationale/no-direction rule; done when the shared file is self-contained without becoming schema/evidence/runtime authority.
- [ ] 2.2 Implement `STM-001` reachability by adding `shared/shared-seed-topic-authoring` to the real `requires` chain of phase-seed-topics, phase-rerun and phase-wave0/1/2; done when existing workflow/template validators resolve every reference and each phase names the shared contract at the relevant write/backfill decision point.
- [ ] 2.3 Implement `STM-001` renderer parity by keeping `renderNewSeedBody()` a pure deterministic renderer, adding/maintaining owner annotations, and aligning its ordered appendix headings/token set with the shared contract; done when initial and rerun add-topic materialization share the accepted appendix structure without a runtime Markdown template parser or second renderer.
- [ ] 2.4 Implement `RRM-003` net simplification by replacing complete generic seed/return-map/direction examples in phase-seed-topics, phase-rerun, phase-wave0/1/2 and overlapping shared-schemas prose with short shared-contract references while retaining phase-specific authority, commands and repair instructions; done when static coverage finds one complete generic authoring definition and no lost Wave-specific producer constraint.

## 3. Rerun Direction Contract

- [ ] 3.1 Implement `RTI-007` as one focused parse/evaluate path in the existing Wave contract helper ownership: collect all direction sections/fields, normalize presentation, validate the canonical six fields/action/count, retain extensions, preserve five round states and return ordered structural roots; done when no consumer needs its own action/round regex and the parser performs no I/O, persistence, routing or semantic judgment.
- [ ] 3.2 Migrate Wave consumers and `checkRerunAddFullSynthesis()` to the shared `RTI-007` result; done when current matching/future actions use normalized fields, stale/invalid do not activate, accepted legacy-unbound behavior remains, and the old local `action:add` regex is removed rather than retained as fallback.
- [ ] 3.3 Add `RTI-007` `rerun_direction_structure` to the existing rerun-ready Gate definition and CLI dispatch; done when profile/rationale prerequisites mask dependent direction symptoms, only present current/future directions are structurally checked, duplicate roots short-circuit dependent missing fields, and findings include exact seed/field, `agent_action`, authorized seed `write_to`, and the same rerun-ready command without a new CLI/Gate/state.
- [ ] 3.4 Update phase-rerun crash recovery and canonical writer guidance for `RTI-007`; done when `add_topic -> add`, `update_intent -> supplement`, layout-only mutation preserves guidance, one section replaces prior content, a complete future direction resumes increment-and-gate, and an incomplete future direction is repaired before profile increment.

## 4. Verification And Compatibility

- [ ] 4.1 Run `node --test tests/engine/helpers/canonical-topic-state.test.mjs tests/engine/helpers/wave-contract-evaluators-direction.test.mjs`; done when renderer parity and all canonical/legacy/negative direction unit cases pass.
- [ ] 4.2 Run `node --test tests/integration/md/seed-topic-authoring-contract.test.mjs tests/integration/cli/check-gate-rerun-ready.test.mjs tests/integration/cli/rerun-round-continuity.test.mjs`; done when shared reachability, no-duplicate-template, Gate pass/fail/masking/repair and existing direction consumers pass.
- [ ] 4.3 Run `node --test tests/e2e/rerun-round-continuity.test.mjs`; done when canonical add/supplement, crash repair, layout-only behavior and prior RRM-007 continuity all pass through the production deterministic chain.
- [ ] 4.4 Run `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs` and applicable phase-template/Markdown integration regressions; done when the shipped package accepts the new shared node/requires graph and no node section/frontmatter contract regresses.
- [ ] 4.5 Run `npm test`; done when all repository `node:test` suites pass, or every pre-existing unrelated failure is captured with a reproducible focused command and shown not to affect the four verification claims.
- [ ] 4.6 Audit apply scope against the design manifest; done when no header rename, token re-injection, historical bundle migration, semantic direction scoring, affected-topic state, template engine, generic linter, new CLI/Gate/trace/controller, auto repair, second renderer or duplicate return-map verdict was added, and any deviation is returned to proposal review before archive.

## 5. Release And Evidence

- [ ] 5.1 Update `CHANGELOG.md` with concise `v0.36` notes for shared seed authoring and structurally complete rerun direction; done when v0.36 is the newest entry and does not overclaim real Agent semantic compliance.
- [ ] 5.2 Update the `DPT_FRAMEWORK/RUN.md` version banner/current-release summary to `v0.36`; done when it matches the newest CHANGELOG entry.
- [ ] 5.3 Record executed commands/results in change-root `apply-evidence.md`; done when each verification-plan claim points to real test evidence, presentation compatibility and structural blocking are distinguished, and any full-suite residual failures are reproducible.
- [ ] 5.4 Update `_backlog/plans/seed-topic-projection-contract-repair.md` with Change B archive/version/commit evidence only after implementation verification; done when BUG-093/094 closure readiness is factual, while actual bug/plan moves remain deferred until archive succeeds.

## 6. Final Governance

- [ ] 6.1 Run `node openspec/governance/check-verification-routing.mjs --change centralize-seed-topic-authoring-contracts --mode assets`; done when all four claims resolve to implemented canonical proof assets and any new real-Agent claim has first been routed to `agent_flow_e2e` rather than inferred from static Markdown.
- [ ] 6.2 Run `node openspec/governance/check-project-reqs.mjs`; done only with 0 duplicate, 0 orphan, 0 unregistered and 0 reusedRetired requirements, with `STM-001`, `RRM-003`, and `RTI-007` traceability present and no new ID.
- [ ] 6.3 Run `node openspec/governance/check-project-specs.mjs`; done only with 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements and 0 missingReqHeader violations.
- [ ] 6.4 Run `openspec validate centralize-seed-topic-authoring-contracts --strict`; done when the complete change validates with no error.
- [ ] 6.5 Review the final diff and backlog closure boundary; done when apply artifacts prove BUG-093's valid shared-template/canonical-write scope and BUG-094's direction structure/compatibility scope, and the archive handoff explicitly instructs moving BUG-093/094 plus the umbrella plan only after spec sync/archive succeeds.

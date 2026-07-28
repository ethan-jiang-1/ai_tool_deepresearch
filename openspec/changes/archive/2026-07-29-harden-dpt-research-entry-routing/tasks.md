## 1. Planning And Contract Preconditions

- [x] 1.1 @impl RUE-002, RUE-004, RUE-006: Run `node openspec/governance/check-verification-routing.mjs --change harden-dpt-research-entry-routing --mode plan` before target edits; confirm the change selects only the declared document-contract claim and marks `unit`, `deterministic_e2e`, and `agent_flow_e2e` not applicable for their stated boundaries.
- [x] 1.2 @impl RUE-002, RUE-004, RUE-006: Re-read the accepted `run-entry` requirements and this change's `apply-target-manifest.md`; confirm no new requirement ID or registry update is needed because the entry-first behavior modifies existing RUE-002/RUE-004/RUE-006 semantics.

## 2. Entry Guidance

- [x] 2.1 @impl RUE-004, RUE-006: Update root `AGENTS.md` and `CLAUDE.md` with one concise entry-first directive: explicit reachable existing bundle plus continuation/inspection reads `continue-run-bundle.md` first; otherwise selected DPT research reads `DPT_FRAMEWORK/RUN.md` first; neither path may use generic shortcuts or request-specific direct research before that entry is read.
- [x] 2.2 @impl RUE-002, RUE-004, RUE-006: Update `DPT_FRAMEWORK/RUN.md` Section 0, framework `AGENTS.md` / `CLAUDE.md`, and `DPT_FRAMEWORK/README.md` together. Done when all preserve the later HITL1/phase authorization boundary, name `research` and `deep-research` as current examples, and do not claim host-level suppression.
- [x] 2.3 @impl RUE-006: Align the existing new-run and existing-bundle entry pointers in relevant framework guidance (`RUN.md`, `README.md`, `COMMANDS.md`, and the continuation/start playbooks only where their current wording conflicts). Done when `RUN.md` is the selected new-research entry, continuation remains the existing-bundle entry, and no surface presents `start-research` as a pre-entry bypass.

## 3. Deterministic Documentation Proof

- [x] 3.1 @impl RUE-002, RUE-004, RUE-006: Add `tests/integration/md/dpt-research-entry-routing-contract.test.mjs`. It SHALL assert the exact root/framework/RUN ordering, generic shortcut plus atomic-tool pre-entry boundary, later authorized-probe exception, existing-bundle precedence, no host-enforcement claim, and no conflicting `start-research` shortcut.
- [x] 3.2 @impl RUE-002, RUE-004, RUE-006: Run the new document contract and affected existing entry/document tests. Done when they prove document synchronization only and do not claim a model or harness behavior result.

## 4. Release And Closeout

- [x] 4.1 @impl VEM-001, VEM-002, VEM-004: Add concise `v0.58` CHANGELOG entry for entry-first DPT research routing and its bounded host-enforcement claim.
- [x] 4.2 @impl VEM-003, RUE-001: Update the `DPT_FRAMEWORK/RUN.md` banner to `v0.58` and run the version-management regression coverage.
- [x] 4.3 @impl RUE-002, RUE-004, RUE-006: Run `node openspec/governance/check-verification-routing.mjs --change harden-dpt-research-entry-routing --mode assets`; done when the one declared document-contract asset exists at its canonical route and passes route/profile validation.
- [x] 4.4 @impl RUE-002, RUE-004, RUE-006: Run `openspec validate harden-dpt-research-entry-routing --strict`; done with no warning or error.
- [x] 4.5 @impl RUE-002, RUE-004, RUE-006: Run `node openspec/governance/check-project-reqs.mjs`; done only with 0 duplicate, orphan, unregistered, and reused-retired requirements.
- [x] 4.6 @impl RUE-002, RUE-004, RUE-006: Run `node openspec/governance/check-project-specs.mjs`; done only with 0 deltaHeaderInMain, missingPurpose, missingRequirements, and missingReqHeader violations.

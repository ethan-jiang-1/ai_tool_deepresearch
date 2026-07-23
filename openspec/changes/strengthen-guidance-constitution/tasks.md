## 1. Apply Preconditions

- [ ] 1.1 Run `node openspec/governance/check-verification-routing.mjs --change strengthen-guidance-constitution --mode plan`, then re-read only the three target guidance files and confirm the GCO registry entries/delta spec remain valid for GCO-001 through GCO-006.
- [ ] 1.2 Record the baseline section list for `guidelines/project-charter.md`; apply SHALL preserve every existing top-level section and SHALL not edit any file outside the approved three-file surface.

## 2. Additive Constitutional Clarifications

- [ ] 2.1 Implement GCO-003 and GCO-004 in `guidelines/project-charter.md`: add a short review clarification for operational completeness and bounded public reentry without selecting a command, controller, writer, receipt, retry, or mechanism sequence.
- [ ] 2.2 Implement GCO-002, GCO-005, and GCO-006 in `guidelines/project-charter.md`: add the constitutional-admission test; qualify existing silent-autonomy and real-evidence wording; add the corresponding local checklist questions while preserving all existing Charter sections and routes.

## 3. Companion Clarifications

- [ ] 3.1 Implement GCO-003 and GCO-004 in `guidelines/evolution-simple-reliable-control.md`: make repair/rerun guidance conditional on an accepted legal path, and make missing-contract/owner/terminal an explicit honest result without adding a controller or new runtime interface.
- [ ] 3.2 Implement GCO-005 in `guidelines/evolution-helper-oriented-agent.md`: make autonomous mechanical-action responsibility conditional on a live, permitted, legal opportunity and direct facts, without transferring ordinary work to the user or promising host/model liveness.

## 4. Diff Review And Governance

- [ ] 4.1 Review the final target diff for GCO-001 through GCO-006: confirm no removed Charter heading, no relocated routing text, no changes outside the three approved guidance files, and no specific Wave/Gate/CLI/byte-threshold mechanism elevated into constitutional prose.
- [ ] 4.2 Run `git diff --check`, `openspec validate strengthen-guidance-constitution --strict`, and `node openspec/governance/check-verification-routing.mjs --change strengthen-guidance-constitution --mode assets`; record the guidance-only no-version-bump decision.
- [ ] 4.3 Run `node openspec/governance/check-project-reqs.mjs` and confirm `0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired` before archive.
- [ ] 4.4 Run `node openspec/governance/check-project-specs.mjs` and confirm `0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader` before archive.

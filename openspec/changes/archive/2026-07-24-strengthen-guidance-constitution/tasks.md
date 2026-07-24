## 1. Apply Preconditions

- [x] 1.1 After the plan text is frozen, run `openspec validate strengthen-guidance-constitution --strict` and `node openspec/governance/check-verification-routing.mjs --change strengthen-guidance-constitution --mode plan`, then re-read the three clean target guidance files and confirm the GCO registry entries/delta spec remain valid for GCO-001 through GCO-006.
- [x] 1.2 Record the baseline section list for `guidelines/project-charter.md`; apply SHALL preserve every existing top-level section and SHALL not edit any guidance or implementation file outside the approved three-file surface. Change artifacts and task-completion records are excluded from this target-surface guard.
  - Baseline top-level sections: File Position; Charter; Authority Map; Framework Runtime Boundary; Operating Model; Error Boundary; Agent Guardrails; Current Project Surfaces; Development Flow; Hard Rules; Reading Order; Guideline Change Checklist; Related Guidance.
- [x] 1.3 Confirm the approved target surface is still clean before applying the planned three-file diff; no untouched mechanism wording is to be cleaned up in this change.

## 2. Additive Constitutional Clarifications

- [x] 2.1 Implement GCO-003 and GCO-004 in `guidelines/project-charter.md`: add a short review clarification for new or changed blocking obligations and explicitly declared Agent-facing entry/handoff/recovery boundaries without selecting a command, controller, writer, receipt, retry, fresh-session contract, or mechanism sequence.
- [x] 2.2 Implement GCO-002, GCO-005, and GCO-006 in `guidelines/project-charter.md`: add the constitutional-admission test; qualify existing silent-autonomy and real-evidence wording; add one compact constitutional-boundary review item while preserving all existing Charter sections and guidance-companion routes; remove only the two downstream OpenSpec/configuration entries from `Related Guidance`.

## 3. Companion Clarifications

- [x] 3.1 Implement GCO-003 in `guidelines/evolution-simple-reliable-control.md`: make repair/rerun guidance conditional on an accepted legal path, distinguish that path from current-caller permission, and make missing-contract/owner/terminal an explicit honest result without adding a controller or new runtime interface.
- [x] 3.2 Implement GCO-005 in `guidelines/evolution-helper-oriented-agent.md`: make autonomous mechanical-action responsibility conditional on a live, permitted, legal opportunity and direct facts, without transferring ordinary work to the user or promising host/model liveness.

## 4. Diff Review And Governance

- [x] 4.1 Review the final target diff for GCO-001 through GCO-006: confirm no removed Charter heading, no altered guidance-companion route except the approved two downstream `Related Guidance` removals, no target guidance or implementation changes outside the three approved files, and no specific Wave/Gate/CLI/byte-threshold mechanism elevated into constitutional prose.
- [x] 4.2 Run `git diff --check -- guidelines/project-charter.md guidelines/evolution-simple-reliable-control.md guidelines/evolution-helper-oriented-agent.md`, `openspec validate strengthen-guidance-constitution --strict`, and `node openspec/governance/check-verification-routing.mjs --change strengthen-guidance-constitution --mode assets`; record the guidance-only no-version-bump decision.
  - Decision: guidance-only change; no runtime, schema, CLI, bundle, test, or version surface changed, so no version bump is needed.
- [x] 4.3 Run `node openspec/governance/check-project-reqs.mjs` and confirm `0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired` before archive.
- [ ] 4.4 Before archive, use the OpenSpec sync/archive flow to merge the delta spec, then run `node openspec/governance/check-project-specs.mjs` and confirm `0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader`.

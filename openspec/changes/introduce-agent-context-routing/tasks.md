## 1. Governance Preparation

- [ ] 1.1 Register `agent-context-routing` as prefix `ACR` and add
  `ACR-001` through `ACR-004` to `openspec/governance/req-registry.yaml` in
  the required sorted locations.
- [ ] 1.2 Run `node openspec/governance/check-verification-routing.mjs --change introduce-agent-context-routing --mode plan` before target edits and
  resolve any plan validation failure.

## 2. Documentation and Entry Routes

- [ ] 2.1 Implement ACR-001: complete root `CONTEXT.md` as the grouped,
  non-authoritative project glossary; retain the confirmed terminology and add
  direct pointers to its guidance canon.
- [ ] 2.2 Implement ACR-003: create or verify root ADR 0001 explaining the
  Markdown-driven, Engine-gated architecture without redefining current
  behavior.
- [ ] 2.3 Implement ACR-002: update root `AGENTS.md` so every substantive task
  reads `guidelines/project-charter.md` before root `CONTEXT.md`, while
  preserving normal instruction discovery and task-specific authority routes.
- [ ] 2.4 Implement ACR-002: update `DPT_FRAMEWORK/AGENTS.md` to point to the
  root glossary without adding a framework-local context or changing framework
  research/runtime routing.

## 3. Regression Coverage

- [ ] 3.1 Implement ACR-004: add
  `tests/governance/agent-context-routing.test.mjs` with `@impl ACR-001,
  ACR-002, ACR-003, ACR-004` markers; read actual documentation and assert
  only the agreed entry-order, non-authority, root-only, and ADR markers.
- [ ] 3.2 Run `node openspec/governance/check-verification-routing.mjs --change introduce-agent-context-routing --mode assets` after the selected
  unit asset exists.
- [ ] 3.3 Run the focused governance test and `npm test`; record any unrelated
  pre-existing failure separately from this change.

## 4. Change Validation

- [ ] 4.1 Run `openspec validate --change introduce-agent-context-routing --strict` and resolve all change-artifact failures.
- [ ] 4.2 Run `node openspec/governance/check-project-reqs.mjs` and confirm
  zero duplicate, orphan, unregistered, and reused-retired requirement IDs.
- [ ] 4.3 Run `node openspec/governance/check-project-specs.mjs` and confirm
  zero delta-header, missing-purpose, missing-requirements, and missing-req-header findings.

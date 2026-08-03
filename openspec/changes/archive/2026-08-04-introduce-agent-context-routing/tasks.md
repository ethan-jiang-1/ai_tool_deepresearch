## 0. Review Records

- [x] 0.1 `openspec-feedback:plan-review` — Reviewed the proposal, ACR-001
  through ACR-004 delta, design, task ordering, requirement registration, and
  verification plan before accepting the documentation implementation. No
  actionable planning finding remains.

## 1. Governance Preparation

- [x] 1.1 Run `node openspec/governance/check-verification-routing.mjs --change introduce-agent-context-routing --mode plan` before any target edit and
  resolve any plan validation failure.
- [x] 1.2 Confirm the pre-registered `agent-context-routing` prefix `ACR` and
  `ACR-001` through `ACR-004` with `node openspec/governance/check-project-reqs.mjs` before target edits; resolve any traceability failure.

## 2. Documentation and Entry Routes

- [x] 2.1 Implement ACR-001: align the existing root `CONTEXT.md` as the
  grouped, non-authoritative project glossary; retain the confirmed terminology
  and add direct Markdown links to `guidelines/README.md`,
  `guidelines/agentic-execution-model.md`, and
  `guidelines/project-charter.md`. Preserve active-bundle versus framework,
  Gate-verdict versus Chain-route, and Source-of-Record versus
  authority/capability/permission/liveness/evidence distinctions; defer the
  complete delegated-work vocabulary to the execution-model canon; link ADR
  0001 as an optional architecture rationale rather than a new authority.
- [x] 2.2 Implement ACR-003: retain root ADR 0001 and verify or amend it with
  a concise `## Status` section whose value is `Accepted`, plus `## Context`,
  `## Decision`, and `## Consequences` sections, so it explains the
  Markdown-driven, Engine-gated trade-off without redefining current behavior.
- [x] 2.3 Implement ACR-002: update root `AGENTS.md`, `CLAUDE.md`, and
  `README.md` with Charter-then-context routes for every substantive task or
  repository orientation, while preserving normal instruction discovery,
  task-specific authority, and scoped-reading routes. Add `docs/adr/` as an
  on-demand durable architecture-decision surface in the existing root maps;
  add the behavior-file routes inside their existing `Before Anything Else`
  blocks and before, without editing, their existing `Deep Research Routing`
  blocks; keep the shared pre-read subsections textually synchronized.
- [x] 2.4 Implement ACR-002: update `DPT_FRAMEWORK/AGENTS.md`,
  `DPT_FRAMEWORK/CLAUDE.md`, and `DPT_FRAMEWORK/README.md` with framework
  routes that read
  `../guidelines/project-charter.md` before `../CONTEXT.md`, then preserve
  framework README, COMMANDS, selected-playbook, and trigger routes; add the
  behavior-file routes before, without editing, their existing selected-entry
  directive in one identically worded `## 共享项目上下文` pre-read block and add
  the README route before its existing `最快触发` callout and trigger rules.
  State that the pre-read is not a DPT research entry, run selection, or
  request-specific research authorization. Do not add a framework-local context
  or change framework research/runtime routing.

## 3. Regression Coverage

- [x] 3.1 Implement ACR-004: add
  `tests/integration/md/agent-context-routing-contract.test.mjs` with one
  `@impl ACR-001, ACR-002, ACR-003, ACR-004` marker. Read actual documentation
  and assert all six Agent-facing entry documents' Charter-then-context order,
  plus the root route's placement within `Before Anything Else` and before
  existing root/framework routing blocks, including the framework README's
  `最快触发` callout and trigger rules. Assert paired behavior-file
  pre-read synchronization; preserved root/framework operating routes and root
  `docs/adr/` discovery; all three framework entry surfaces' post-pre-read
  non-entry boundary; three glossary canon-source links, non-authority,
  authority-sensitive distinctions, and root-only absence; and ADR
  discovery/accepted-status/headings/decision/split/deferral markers. Resolve
  the repository from `import.meta.url`; do not duplicate the existing
  selected-entry contract test.
- [x] 3.2 Run `node openspec/governance/check-verification-routing.mjs --change introduce-agent-context-routing --mode assets` after the selected
  integration asset exists.
- [x] 3.3 Run the focused integration test, the existing
  `tests/integration/md/dpt-research-entry-routing-contract.test.mjs`
  compatibility regression, and `npm test`; record any unrelated pre-existing
  failure separately from this change.
  - Evidence (2026-08-04): both focused documentation regressions passed.
    `npm test` ran but has unrelated existing E2E failures, including
    `post-final-rerun-lineage-continuity`, `rerun-round-continuity`,
    `seed-topic-projection-materialization`, and
    `wave1-target-receipt-wave2-closure`; they concern Wave/Work Unit runtime
    fixtures and gates outside this change's documentation-only target scope.

## 4. Change Validation

- [x] 4.1 Run `openspec validate introduce-agent-context-routing --type change --strict` and resolve all change-artifact failures.
- [x] 4.2 Run `node openspec/governance/check-project-reqs.mjs` and confirm
  zero duplicate, orphan, unregistered, and reused-retired requirement IDs.
- [x] 4.3 Run `node openspec/governance/check-project-specs.mjs` and confirm
  zero delta-header, missing-purpose, missing-requirements, and missing-req-header findings.
- [x] 4.4 Run `git diff --check`; report any unrelated pre-existing whitespace
  error separately rather than editing outside this change.

## 5. Archive Closeout

- [x] 5.1 `openspec-feedback:closeout-review` — Reviewed the change-scoped
  documentation/test diff, ACR requirement registry, verification plan, focused
  context-routing and selected-entry regressions, strict validation, governance
  checks, and exact delta/main spec merge. No actionable finding remains; the
  pre-existing unrelated `npm test` runtime E2E failures remain recorded under
  task 3.3.

## 1. Apply Readiness

- [ ] 1.1 Reconcile the current main branch, active change status, and the planning tracker; record that `c93189aca` closed the former fixture mismatch and that no target behavior has yet changed. (GCO-008, ACR-004, CHF-002)
- [ ] 1.2 Establish the selected-change worktree boundary, identify unrelated edits, and preserve that inventory for plan review and selected-diff closeout review. (GCO-008)
- [ ] 1.3 Complete the selected-change plan review and persist every finding as an ordinary unchecked repair task before marking `openspec-feedback:plan-review`. (GCO-008, ACR-001, ACR-002, ACR-004, CHF-002)
- [ ] 1.4 Run `node openspec/governance/check-verification-routing.mjs --change centralize-project-guidance-under-openspec --mode plan` and `node openspec/governance/check-semantic-closure.mjs --change centralize-project-guidance-under-openspec --mode plan`; repair the reported coordinate and rerun on failure. (GCO-008, ACR-004, CHF-002)

## 2. Canonical Guidance Topology

- [ ] 2.1 Create the approved `openspec/constitution/`, `openspec/guidance/models/`, and `openspec/operations/` role surfaces plus a control-map role entry, without creating a second authority or compatibility root. (GCO-008)
- [ ] 2.2 Move the Project Charter and three Evolution Directions to their canonical constitution paths; repair constitution-local frontmatter, links, and triad navigation. (GCO-008)
- [ ] 2.3 Move the framework/runtime and four Agentic mechanism documents to `openspec/guidance/models/`; retain their model-only authority boundary. (GCO-008, ACR-001)
- [ ] 2.4 Move feedback, experiments, and logging guidance to `openspec/operations/`; preserve each document's real accepted-spec and executable authority routes. (GCO-008, CHF-002)
- [ ] 2.5 Move the guidance index to `openspec/README.md` and make necessary path/role repairs without performing Change B's glossary pruning or renaming work. (GCO-008, ACR-001)
- [ ] 2.6 Remove the retired root `guidelines/` only after every canonical document, internal link, and known current consumer resolves to the new unique path. (GCO-008, ACR-002, CHF-002)

## 3. Current Consumer Migration

- [ ] 3.1 Update root `AGENTS.md`, `CLAUDE.md`, `README.md`, and `CONTEXT.md` to route Charter -> Context and model links through the canonical OpenSpec topology while preserving their adapter/non-authority limits. (ACR-001, ACR-002)
- [ ] 3.2 Update `DEEP_RESEARCH_HARNESS/AGENTS.md`, `CLAUDE.md`, `README.md`, and `COMMANDS.md` to the parent-relative canonical paths without changing research-entry selection or creating a Harness-local glossary. (ACR-002)
- [ ] 3.3 Update every guidance pointer in `openspec/config.yaml`, including design-review triad, framework boundary, experiment terminology, and feedback-lifecycle operation guidance. (GCO-008, CHF-002)
- [ ] 3.4 Update all eight `SUPPORTED_ENTRY_SURFACES` adapter documents in `.agents/` and `.claude/` to obtain `openspec/operations/change-feedback-loop.md` while retaining their selected-change and governed-finalizer routes. (CHF-002)

## 4. Role-Aware Regression Coverage

- [ ] 4.1 Update the constitution governance regression to scan the canonical constitution role recursively, preserve the triad, distinguish models and operations from constitutional peers, and reject a current duplicate `guidelines/` root. (GCO-008)
- [ ] 4.2 Update the context-routing regression for the new Charter, control-map, and execution-model coordinates while preserving route order and paired-file synchronization; keep selected-entry semantics covered by `tests/integration/md/dpt-research-entry-routing-contract.test.mjs` rather than duplicating that accepted contract. (ACR-001, ACR-002, ACR-004)
- [ ] 4.3 Update feedback finalizer/support-entry conformance to require the canonical feedback operation coordinate and no old-path fallback. (CHF-002)
- [ ] 4.4 Update verification-routing and experiment terminology knowledge-surface regressions for the relocated canonical guidance paths without changing their test-class or proof-authority contracts. (GCO-008, CHF-002)
- [ ] 4.5 Run a bounded post-migration old-path and internal-Markdown-link scan over root `AGENTS.md`, `CLAUDE.md`, `README.md`, and `CONTEXT.md`; `openspec/config.yaml`, `openspec/constitution/`, `openspec/guidance/models/`, `openspec/operations/`, and `openspec/specs/`; `.agents/`, `.claude/`, `DEEP_RESEARCH_HARNESS/`, `tests/`, and `experiments_playbook/`. Exclude `openspec/changes/archive/`, `_backlog/`, run bundles, `.exp-bundles/`, `_old_topics`, and `node_modules/`; repair every in-scope result. (GCO-008, ACR-004, CHF-002)

## 5. Verification And Review

- [ ] 5.1 Run the six verification-plan integration assets and record their exact command results against the selected change. (GCO-008, ACR-004, CHF-002)
- [ ] 5.2 Run strict OpenSpec validation plus selected change governance checks: capability discovery, requirement traceability plan mode, verification-routing assets mode, and semantic-closure assets mode. (GCO-008, ACR-004, CHF-002)
- [ ] 5.3 Reassess `semantic-closure.yaml` against the actual diff; keep `not_applicable` only when no catalogued deterministic fact family changed. (CHF-002)
- [ ] 5.4 Review the selected-change actual diff, delta artifacts, and verification evidence; persist each actionable finding as an ordinary unchecked repair task before marking `openspec-feedback:closeout-review`. (GCO-008, ACR-001, ACR-002, ACR-004, CHF-002)

## 6. Sync And Governed Archive

- [ ] 6.1 Synchronize the three approved delta specs into their main specifications through the supported Agent-owned route, then re-compare the resulting requirements and rerun affected checks. (GCO-008, ACR-001, ACR-002, ACR-004, CHF-002)
- [ ] 6.2 Run `node openspec/governance/check-project-reqs.mjs --mode archive --change centralize-project-guidance-under-openspec` and resolve every reported duplicate, orphan, unregistered, or reused-retired requirement before archive. (GCO-008, ACR-001, ACR-002, ACR-004, CHF-002)
- [ ] 6.3 Run `node openspec/governance/check-project-specs.mjs` and resolve every main-spec structural violation before archive. (GCO-008, ACR-001, ACR-002, ACR-004, CHF-002)
- [ ] 6.4 Invoke `node openspec/governance/finalize-change-archive.mjs --change centralize-project-guidance-under-openspec` as the sole final archive transition and record its resolved archive location. (CHF-002)

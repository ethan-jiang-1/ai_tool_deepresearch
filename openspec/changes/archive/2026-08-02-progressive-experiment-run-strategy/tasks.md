## 1. Apply Preconditions

- [x] 1.1 `openspec-feedback:plan-review` — before any target edit, obtain the current feedback-operation guidance, review the approved proposal/spec/design against ERS-001..003, EXA-004/009, EXO-007, and PLR-004, and record every actionable finding as an ordinary pending task with owner, smallest repair, and observable done condition.
- [x] 1.2 Register `ERS: experiment-run-strategy`, `ERS-001..003`, `EXA-009`, `EXO-007`, and `PLR-004` in `openspec/governance/req-registry.yaml` in the required prefix/group order; verify no ID collision before implementation annotations are introduced.
- [x] 1.3 Run `node openspec/governance/check-verification-routing.mjs --change progressive-experiment-run-strategy --mode plan` successfully before editing `DPT_FRAMEWORK/`, tests, playbooks, or runtime documentation.

## 2. Projection And Report Contracts

- [x] 2.1 Implement ERS-001 and EXO-007 strict Zod contracts for v2 retained report/audit observations, execution-surface inventory/fingerprint, selection observation, and v1/v2 read compatibility; reject unsafe/non-regular helper paths and preserve unknown rather than inventing a comparison fact.
- [x] 2.2 Implement ERS-001 pure manifest/frontmatter/report observation projection with distinct filename cost, policy/proof profile, duration/cost, native/lifecycle/effective outcome, health, source relation, execution-surface relation, and diagnostic fields; it must not write a registry, verdict, or case metadata.
- [x] 2.3 Implement ERS-002/ERS-003 pure conservative prediction and profile selection: explicit duration/budget admission, calibration initial estimates, deterministic report-derived group rotation, diagnostic triggers, assurance explicit-scope validation, and separate due/included/unavailable Agent-behavior coverage reporting.
- [x] 2.4 Implement EXO-007 v2 batch-report/audit emission for every outcome path, including selection reason and execution-surface identity while retaining all existing native outcome, lifecycle, health, cleanup, duration, cost, and evidence fields as separate facts.

## 3. Supervisor And Guidance Integration

- [x] 3.1 Implement EXA-004/EXA-009 CLI parsing and selection integration for `--run-profile`, `--max-predicted-duration-ms`, and optional Agent-behavior freshness override; reject no-selector, invalid profile/bounds, and incompatible selector/profile combinations before credentials or run-root creation while preserving Interactive exact-case behavior.
- [x] 3.2 Implement EXA-004/EXA-009 dry-run and normal-run wiring so profile output is revalidated against current manifest/frontmatter, enters the existing one-Agent-per-case Supervisor lifecycle, never becomes a scheduler/controller, and retains direct `--case`, `--group`, `--tier`, and `--all` compatibility semantics.
- [x] 3.3 Implement PLR-004 updates to `experiments_playbook/README.md`, `DPT_FRAMEWORK/host_tools/README.md`, and any active Autorun usage text; document bounded profile/dry-run examples, filename tier's legacy estimate role, independent health profile, and no physical reclassification requirement.

## 4. Focused Verification

- [x] 4.1 Add ERS-001/ERS-002/ERS-003 unit coverage in `tests/host_tools/experiment-run-strategy.test.mjs` for v1 unknown vs v2 matching/stale relations, source drift, prediction basis/reservation, no persistent classification, round-robin, diagnostic PASS+ISSUES, and due/unavailable Agent-behavior cases.
- [x] 4.2 Extend EXA-004/EXA-009/EXO-007 integration coverage in `tests/integration/host_tools/run-agent-experiment.test.mjs` for fail-closed unselected/profile-invalid invocations, profile dry-run side-effect freedom, legacy tier selection, profile-to-Supervisor handoff, and v2 report/audit orthogonality with the existing deterministic Agent executable fixture.
- [x] 4.3 Extend PLR-004 integration coverage in `tests/integration/md/agent-experiment-autorun-terminology.test.mjs` to assert active guidance names virtual run profiles/bounds, preserves separate cost/health/proof meanings, and omits a no-filter Light normal-launch instruction.
- [x] 4.4 Run the selected unit/integration tests plus representative legacy and profile `--dry-run --json` commands against the real current manifest; record selection output only and do not manufacture an `agent_flow_e2e` result.

## 5. Release And Closeout

- [x] 5.1 Update `CHANGELOG.md` for `v0.66` with the explicit progressive selection/reporting behavior, then synchronize the `DPT_FRAMEWORK/RUN.md` version banner and newest change note.
- [x] 5.2 Run `node openspec/governance/check-verification-routing.mjs --change progressive-experiment-run-strategy --mode assets` successfully after the selected tests and documentation assets exist.
- [x] 5.3 Run `node openspec/governance/check-project-reqs.mjs` with 0 duplicate, orphan, unregistered, and reused-retired IDs.
- [x] 5.4 Run `node openspec/governance/check-project-specs.mjs` with 0 delta-header, purpose, requirement, and req-header failures.
- [x] 5.5 Run `openspec validate progressive-experiment-run-strategy --type change --strict` successfully and retain the focused verification evidence for archive review.
- [x] 5.6 `openspec-feedback:closeout-review` — before archive, obtain current closeout-operation guidance and review the selected change-scoped diff, artifacts, verification evidence, and delta/main sync; record every actionable finding as an ordinary unchecked repair task before using the governed archive finalizer.
- [x] 5.7 EXA-004 — owner: accepted `experiment-agent-autorun` main spec; smallest repair: merge the missing `Tier remains a historical compatibility filter` scenario; done: the delta/main requirement blocks match and project-spec validation passes.

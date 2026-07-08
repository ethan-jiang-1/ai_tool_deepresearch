## 0. Requirement Traceability

- [x] 0.1 Register `bundle-map` in `openspec/governance/req-registry.yaml`: add `BUM: bundle-map`, add BUM-001..BUM-004 matching `specs/bundle-map/spec.md`, add FIO-005 under `file-observability`, and mark BUS-001..BUS-003 `[DEPRECATED]` in place with the `bundle-start-from-here` group/prefix clearly retired or legacy-only; done when registry ordering follows governance rules and no IDs are reused.
- [x] 0.2 Verify every delta spec header has the correct `> req:` IDs for BUM-001..004, RUE-004, CMI-001/003/004, PRP-001, PRG-001, WDC-004, ACS-004, RRD-007, and FIO-005; done when `rg '^> req:' openspec/changes/harden-run-entry-and-bundle-map/specs` shows all active touched IDs and retired BUS-001..003 are not redeclared by active delta headers.

## 1. Repo-Root Research Shortcut Routing

- [x] 1.1 Implement RUE-004: add a concise high-priority Deep Research routing rule to repo-root `CLAUDE.md` that suppresses built-in `deep-research` / equivalent one-shot research shortcuts when this repo's `DPT_FRAMEWORK/` is selected or relevant; done when `rg 'deep-research|research shortcut|DPT_FRAMEWORK/RUN.md' CLAUDE.md` shows the rule.
- [x] 1.2 Implement RUE-004: add the equivalent rule to repo-root `AGENTS.md` for Codex/other agents; done when root `CLAUDE.md` and `AGENTS.md` carry equivalent behavior without diverging from existing hard rules.
- [x] 1.3 Implement RUE-004: confirm `DPT_FRAMEWORK/CLAUDE.md`, `DPT_FRAMEWORK/AGENTS.md`, `DPT_FRAMEWORK/README.md`, and `DPT_FRAMEWORK/RUN.md` remain consistent with the root rule; done when current framework-local files still state that built-in shortcuts are mutually exclusive with the DPT framework entry.
- [x] 1.4 Add or update static regression coverage for RUE-004 so root `CLAUDE.md` and `AGENTS.md` must contain the shortcut suppression markers; done when the test fails if either root file omits `deep-research` / equivalent shortcut suppression.

## 2. Bundle Map Template And Content

- [x] 2.1 Implement BUM-001/BUM-003/CMI-004: rename `DPT_FRAMEWORK/rb_templates/START_FROM_HERE.md.tmpl` to `DPT_FRAMEWORK/rb_templates/BUNDLE_MAP.md.tmpl`; done when the old template path is no longer used by new instantiation.
- [x] 2.2 Implement BUM-001/BUM-002/BUM-003: rewrite `BUNDLE_MAP.md.tmpl` as a passive map with Research Content Map, Runtime Control Map, Diagnostics Map, and Reentry Pointers; done when it avoids detailed lifecycle command duplication and points to authority surfaces instead of becoming a controller.
- [x] 2.3 Implement BUM-004: remove `START_FROM_HERE.md.tmpl` from the production instantiation template mapping; if a legacy fixture is still needed, keep it only as a clearly named non-instantiation legacy fixture outside production mapping; done when new bundle generation cannot accidentally choose the legacy template.
- [x] 2.4 Implement BUM-003 for disposable bundles: update `experiments_env/shared/new-disposable-bundle.mjs` so disposable bundles use `BUNDLE_MAP.md` unless a specific legacy test fixture overrides it; done when controlled experiment setup matches current bundle shape.

## 3. CLI, Gate, Reentry, And Observability

- [x] 3.1 Implement CMI-004/BUM-003: update `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` template mapping and success text to write/report `BUNDLE_MAP.md`; done when a fresh bundle contains `BUNDLE_MAP.md` and no generated `START_FROM_HERE.md`.
- [x] 3.2 Implement CMI-003/BUM-004: update `DPT_FRAMEWORK/cli/inspect-bundle.mjs` required-file logic to require `BUNDLE_MAP.md` for current bundles while allowing legacy `START_FROM_HERE.md` with deprecation advice; done when current, legacy-only, and both-file bundles have deterministic inspect behavior.
- [x] 3.3 Implement PRG-001: update `DPT_FRAMEWORK/schema/gate_definitions/gate-instantiation-complete.definition.json` so the instantiation gate checks `BUNDLE_MAP.md` and emits current-name failure messages; done when missing `BUNDLE_MAP.md` fails even if `START_FROM_HERE.md` exists in a new bundle.
- [x] 3.4 Implement RRD-007: update `DPT_FRAMEWORK/cli/check-reentry.mjs` advice text to point to `BUNDLE_MAP.md`, trace, and diagnostics; done when legacy `START_FROM_HERE.md` is only mentioned as deprecated fallback.
- [x] 3.5 Implement FIO-005: update `DPT_FRAMEWORK/engine/helpers/file-observability.mjs` root control file expectations and legacy classifications for `BUNDLE_MAP.md` / `START_FROM_HERE.md`; done when file-observability treats `BUNDLE_MAP.md` as expected and never grants authority to either map file.

## 4. Agent-Facing Framework Docs

- [x] 4.1 Implement PRP-001: update `DPT_FRAMEWORK/workflows/nodes/phases/phase-instantiation.md` expected artifacts and repair wording to use `BUNDLE_MAP.md`; done when instantiation phase no longer presents `START_FROM_HERE.md` as a current artifact.
- [x] 4.2 Implement ACS-004/RRD-007/BUM-001: update `DPT_FRAMEWORK/RUN.md`, `DPT_FRAMEWORK/README.md`, `DPT_FRAMEWORK/COMMANDS.md`, `DPT_FRAMEWORK/command_playbook/start-research.md`, and `DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md` to use `BUNDLE_MAP.md` for active bundle reload guidance; done when legacy `START_FROM_HERE.md` appears only as legacy/deprecated compatibility where intentionally needed.
- [x] 4.3 Implement WDC-004/BUM-001: update current docs/spec-facing directory maps that list bundle-root surfaces so canonical runtime structure names `BUNDLE_MAP.md`; done when `rg 'START_FROM_HERE.md' DPT_FRAMEWORK openspec/specs tests experiments_env experiments_playbook` leaves only intentional legacy/deprecation or archived references.
- [x] 4.4 Implement BUS removal migration: ensure active guidance no longer teaches `START_FROM_HERE.md` as the first file an Agent reads; done when `bundle-start-from-here` has no current positive behavior outside legacy deprecation.

## 5. Regression Tests

- [x] 5.1 Update `tests/integration/cli/instantiate-run-bundle.test.mjs` for BUM-003/CMI-004: assert fresh bundles contain `BUNDLE_MAP.md`, do not require generated `START_FROM_HERE.md`, and template content includes passive-map markers.
- [x] 5.2 Update `tests/integration/cli/inspect-bundle.test.mjs` for CMI-003/BUM-004: cover current `BUNDLE_MAP.md`, legacy-only `START_FROM_HERE.md` with deprecation advice, both files present, and missing map failure.
- [x] 5.3 Update instantiation gate coverage for PRG-001: ensure missing `BUNDLE_MAP.md` fails and `START_FROM_HERE.md` alone does not satisfy the new instantiation gate.
- [x] 5.4 Add or update check-reentry coverage for RRD-007: assert advice names `BUNDLE_MAP.md` for missing/null `current_node` and names `START_FROM_HERE.md` only as deprecated legacy fallback.
- [x] 5.5 Add or update file-observability coverage for FIO-005: assert `BUNDLE_MAP.md` is expected, legacy-only map is diagnostic compatibility, and both names do not create two authority surfaces.
- [x] 5.6 Update static docs regression for BUM-003/ACS-004/RUE-004: require current docs/tests to prefer `BUNDLE_MAP.md` and root behavior files to suppress built-in research shortcuts.
- [x] 5.7 Update `tests/integration/cli/validate-bundle.test.mjs`, `tests/integration/cli/operate-queue.test.mjs`, and any helper bundle factories that copy root map templates so they use `BUNDLE_MAP.md.tmpl`; done when tests do not create new valid bundles with the old primary map name.

## 6. Version And Changelog

- [x] 6.1 Implement VEM-002: add `## v0.11` to repo-root `CHANGELOG.md` with one to three concise bullets summarizing root shortcut suppression and bundle-map rename.
- [x] 6.2 Implement VEM-003: update `DPT_FRAMEWORK/RUN.md` version banner to `DPT_FRAMEWORK v0.11`; done when `tests/engine/version-management.test.mjs` passes.

## 7. Validation

- [x] 7.1 Run `openspec validate harden-run-entry-and-bundle-map --strict`; done when it passes.
- [x] 7.2 Run targeted regression tests: `node --test tests/integration/cli/instantiate-run-bundle.test.mjs tests/integration/cli/inspect-bundle.test.mjs tests/integration/cli/validate-bundle.test.mjs tests/engine/command-contract-docs.test.mjs tests/engine/version-management.test.mjs`; done when all pass.
- [x] 7.3 Run additional touched-surface tests: `node --test tests/integration/cli/check-gate-instantiation-complete.test.mjs tests/integration/cli/check-reentry.test.mjs tests/engine/helpers/file-observability.test.mjs tests/engine/static-regression.test.mjs`; done when all pass.
- [x] 7.4 Run `rg 'START_FROM_HERE.md' DPT_FRAMEWORK openspec/specs tests experiments_env experiments_playbook` and review every remaining hit; done when each hit is legacy/deprecation, historical archive exclusion, or intentional test coverage.
- [x] 7.5 Run `node openspec/governance/check-project-reqs.mjs`; done when it reports 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired.
- [x] 7.6 Run `node openspec/governance/check-project-specs.mjs`; done when it reports 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader.
- [x] 7.7 Run `npm test` after targeted tests; done when it passes, or when a pre-existing unrelated failure is recorded with the failing test name and why it is outside this change.

> Apply discipline: after each completed target-edit or verification task,
> update its checkbox and append concise, directly observed command evidence to
> that task line. A planned command is not completion evidence.

## 0. Feedback Review

- [x] 0.1 `openspec-feedback:plan-review` - Review `proposal.md`, `design.md`, this task list, `verification-plan.yaml`, and `semantic-closure.yaml` against the retired `engine/gate-content-dedup` main spec, `GAC-*` registry entries, and catalog topology. Done when the review confirms that `not_applicable` remains accurate, one catalog row must remain, no current runtime behavior is in scope, and any actionable finding is recorded as a separate unchecked task. (CHF-001, CHF-002) Completed 2026-08-12: the retained tombstone spec and all nine deprecated registry entries agree that no runtime authority exists; one catalog row remains structurally required; no actionable finding was found.

## 1. Pre-Edit Governance

- [x] 1.1 @impl VER-002, VER-003, RET-003: Before the first target edit, run `node openspec/governance/check-project-reqs.mjs --mode plan`, `node openspec/governance/check-verification-routing.mjs --change correct-retired-content-dedup-catalog --mode plan`, and `node openspec/governance/check-semantic-closure.mjs --change correct-retired-content-dedup-catalog --mode plan`. Done when all pass and no target file has been edited before this evidence. Completed 2026-08-12: requirement plan check passed (644 registered, 53 retired, 0 orphan); verification-routing and semantic-closure plan checks passed.

## 2. Catalog Correction

- [x] 2.1 @impl RET-003: In `openspec/specs/README.md`, replace only the `engine/gate-content-dedup` catalog row's active-capability prose with concise wording that says it is a retired traceability tombstone for historical content-dedup heuristics and not a current Gate or production capability. Preserve the path, seven-column table shape, and existing related-capability links. Done when the main tombstone spec and `GAC-001` through `GAC-009` registry entries are unmodified, no other catalog row changes, and the diff has no Harness/runtime/schema/test behavior edits. Completed 2026-08-12: changed only the catalog row's descriptive cells; path and both relations remain unchanged, and no Harness/runtime/schema/test file was edited.

## 3. Verification

- [x] 3.1 @impl RET-003, VER-001: Run `node openspec/governance/check-capability-taxonomy.mjs` and `node --test tests/integration/md/retired-content-heuristic-hygiene.test.mjs`. Done when both pass, proving the catalog inventory remains valid and no retired heuristic is reintroduced as current implementation or runtime guidance. Completed 2026-08-12: taxonomy passed for 85 nested main specs; the focused integration suite passed 1/1.
- [x] 3.2 @impl VER-001, VER-002, VER-003: Run `openspec validate correct-retired-content-dedup-catalog --strict`, `node openspec/governance/check-capability-discovery.mjs --change correct-retired-content-dedup-catalog`, `node openspec/governance/check-verification-routing.mjs --change correct-retired-content-dedup-catalog --mode assets`, `node openspec/governance/check-semantic-closure.mjs --change correct-retired-content-dedup-catalog --mode assets`, and `git diff --check`. Done when all pass and the selected verification route remains a deterministic integration claim only. Completed 2026-08-12: strict OpenSpec validation, capability discovery, verification-routing assets, semantic-closure assets, and diff check all passed.

## 4. Archive Preconditions

- [x] 4.1 @impl RET-006: Before archive, run `node openspec/governance/check-project-reqs.mjs --mode archive --change correct-retired-content-dedup-catalog`. Done when it exits 0 with 0 duplicate, orphan, unregistered, and reused-retired requirement IDs for the selected change. Completed 2026-08-12: passed with 644 registered IDs, 53 retired IDs, and 0 orphan findings.
- [x] 4.2 @impl RET-006: Before archive, run `node openspec/governance/check-project-specs.mjs`. Done when it exits 0 with 0 delta-header-in-main, missing-purpose, missing-requirements, or missing-requirement-header findings. Completed 2026-08-12: passed with 85 main spec files and 0 violations.
- [x] 4.3 `openspec-feedback:closeout-review` - Review the actual change-scoped diff, the retained tombstone spec and registry entries, and the selected verification evidence. Done when the change still corrects only the non-authoritative catalog projection, `semantic-closure: not_applicable` remains accurate, there is no open finding, and no uncompleted ordinary task remains. (CHF-001, CHF-003) Completed 2026-08-12: the target diff is exactly one added and one removed catalog-row line; the tombstone spec and registry entries are unmodified, both existing related capabilities remain, selected checks passed, and no actionable closeout finding remains.

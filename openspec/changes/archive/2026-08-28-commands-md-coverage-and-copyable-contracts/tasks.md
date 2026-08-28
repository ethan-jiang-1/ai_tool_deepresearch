> Apply discipline: after each completed target-edit or verification task, update
> its checkbox and append concise, directly observed command evidence to that task
> line. A planned command is not completion evidence.

## 1. Pre-Edit Governance

- [x] 1.1 @impl SEF-004, VER-002, VER-003: Before the first target edit, run
  `node openspec/governance/check-project-reqs.mjs --mode plan`,
  `node openspec/governance/check-verification-routing.mjs --change commands-md-coverage-and-copyable-contracts --mode plan`, and
  `node openspec/governance/check-semantic-closure.mjs --change commands-md-coverage-and-copyable-contracts --mode plan`.
  Done when all three pass against the change-local records and no target file has
  been edited before that evidence.
  Completed 2026-08-28: check-project-reqs plan passed (670 registered, 57 retired, 0 orphan);
  verification-routing plan passed (4 claims); semantic-closure plan passed. No target
  file edited before this evidence.

## 2. COMMANDS.md Coverage Edits

- [x] 2.1 @impl ACS-003, AGQ-001: In `DEEP_RESEARCH_HARNESS/COMMANDS.md`, add an
  `operate-queue.mjs` row to the `Subagent 环境` table that names the real
  dispatched verb set (`check`/`enqueue`/`claim`/`complete`/`fail`/`preempt`/`count`/`render`/`project`/`repair`),
  states `complete` consumes a result.json (not an enqueue demand/task card), and
  adds the queue-item-id uniqueness one-liner (`-rN` suffix when the id already
  appears in active_window + terminal_history). Done when `drain` never appears as
  a CLI verb, the row names the `cli/operate-queue.mjs` coordinate, and no engine
  or test file changed.
  Completed 2026-08-28: row added to Subagent 环境 table; verbs are real dispatch
  set; -rN rule included; `drain` never used as verb; no engine/test changes.

- [x] 2.2 @impl ACS-003, AGQ-003: Add a `## Copyable Contract Templates` appendix
  with a queue-result template: minimal `{ queue_item_id, status: "done", receipt?,
  summary, writes }` positive example, a note that extra keys raise
  `unrecognized_keys` (`.strict()`), and the `receipt` prefix semantics
  (`file:`/`json:`/`queue:`/`trace:`/`work_unit:`; `work_unit:` is validated only by
  `operate-work-unit submit`). Source of Record is `engine/queue-manager-core.mjs`
  `QueueResultSchema`. Done when the template is a copyable minimal example, points
  to the engine owner, and adds no prose command string without the full
  `node DEEP_RESEARCH_HARNESS/cli/...` prefix.
  Completed 2026-08-28: queue result template in appendix with receipt prefix
  semantics and Source of Record; no bare prose command strings.

- [x] 2.3 @impl ACS-003: Add the projection-packet template to the appendix and a
  one-liner to the `Canonical Topic State` section: wave0/wave1 evidence-bearing
  entries use `source_identity: { kind: "submitted_work", work_id }`; wave2 uses
  `{ kind: "finding", finding_id }` with `entry_id === finding_id` (regex
  `W2F-\d{3,}`); evidence-bearing entries need a concrete `reference/*.md` ref or a
  defers disposition (`relationship: "defers", refs: ["none"], status: "deferred"`),
  else `projection_entry_concrete_ref_missing`. Source of Record is
  `engine/helpers/canonical-topic-state.mjs`. Done when the template names the
  wave-dependent source-identity forms without hand-authoring a second schema.
  Completed 2026-08-28: projection packet template in appendix + concrete-ref
  one-liner in Canonical Topic State section.

- [x] 2.4 @impl ACS-003, FDB-001, FDB-002: Add the Evidence-Map template to the
  appendix and a one-liner to the `Artifact Persistence` section: exactly one
  `finding id`, one `declared key finding`, and one `submitted backing` column
  (case-insensitive); backing cells are markdown links to submitted `reference/*.md`
  or `artifacts/wave1/*/evidence-summary.md`; `persist-final-report` requires the
  target parent directory to pre-exist (`target_parent_missing`). Source of Record
  is `engine/helpers/final-delivery-backing.mjs`. Done when the three-column header
  and the target-directory gotcha are both present and no engine behavior changes.
  Completed 2026-08-28: Evidence Map template in appendix + target-dir one-liner
  in Artifact Persistence section.

- [x] 2.5 @impl ACS-003, CLE-003, CPT: Add two gotcha one-liners: (a) in the
  Exit-Code Convention section, note large JSON stdout may raise `errno -35`
  (EAGAIN) and should be redirected `> file` and read back; (b) in the
  `Phase Handoff` section, note gate CLIs require `--current-node <file-ref>` and
  name the wave0/1/2-complete, hitl1/hitl2-recorded, readiness-passed gate set
  without hand-authoring a chain table (the chain is owned by
  `workflows/manifest.json`). Done when both one-liners are present and no
  invocation contract is redefined.
  Completed 2026-08-28: EAGAIN note in Exit-Code section; gate --current-node note
  in Phase Handoff section; gate set named without chain-table duplication.

## 3. Verification

- [x] 3.1 @impl VER-001: Run
  `node --test tests/engine/command-contract-docs.test.mjs tests/governance/check-content-drift.test.mjs tests/integration/md/canonical-topic-state-contract.test.mjs tests/integration/md/artifact-persistence-contract.test.mjs`.
  Done when all subtests pass and the result is recorded as deterministic
  Markdown-contract evidence, not a runtime verdict.
  Completed 2026-08-28: 33/33 subtests passed across 5 suites (command-contract-docs,
  check-content-drift, canonical-topic-state-contract, artifact-persistence-contract);
  deterministic Markdown-contract evidence.

- [x] 3.2 @impl VER-001, RET-006: Run
  `node openspec/governance/check-content-drift.mjs`,
  `openspec validate commands-md-coverage-and-copyable-contracts --strict`, and
  `git diff --check`. Done when all pass, the drift guard confirms the newly
  documented verbs are dispatched, and `git diff --check` reports no whitespace
  error.
  Completed 2026-08-28: check-content-drift clean (439 path references, 0 drift);
  openspec validate --strict valid; git diff --check clean.

- [x] 3.3 @impl VER-002, VER-003, SEF-004: Run
  `node openspec/governance/check-verification-routing.mjs --change commands-md-coverage-and-copyable-contracts --mode assets` and
  `node openspec/governance/check-semantic-closure.mjs --change commands-md-coverage-and-copyable-contracts --mode assets`.
  Done when both pass against the selected assets and the not_applicable
  semantic-closure record.
  Completed 2026-08-28: verification-routing assets valid (4 claims);
  semantic-closure assets valid (not_applicable).

## 4. Archive Preconditions

- [x] 4.1 @impl RET-006: Before archive, run
  `node openspec/governance/check-project-reqs.mjs --mode archive --change commands-md-coverage-and-copyable-contracts`.
  Done when it exits 0 with 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired
  requirement IDs.
  Completed 2026-08-28: passed with 670 registered (57 retired, 0 orphan), 0 orphan, 0 duplicate.

- [x] 4.2 @impl RET-006: Before archive, run
  `node openspec/governance/check-project-specs.mjs`.
  Done when it exits 0 with 0 deltaHeaderInMain / 0 missingPurpose /
  0 missingRequirements / 0 missingReqHeader findings.
  Completed 2026-08-28: passed with 82 main spec files, 0 violations.

> Apply discipline: after each completed target-edit or verification task, update
> its checkbox and append concise, directly observed command evidence to that task
> line. A planned command is not completion evidence.

## 1. Pre-Edit Governance

- [x] 1.1 @impl SEF-004, VER-002, VER-003: Before the first target edit, run
  `node openspec/governance/check-project-reqs.mjs --mode plan`,
  `node openspec/governance/check-verification-routing.mjs --change cli-readme-queue-coverage --mode plan`, and
  `node openspec/governance/check-semantic-closure.mjs --change cli-readme-queue-coverage --mode plan`.
  Done when all three pass against the change-local records and no target file has
  been edited before that evidence.
  Completed 2026-08-28: check-project-reqs plan passed (670/57/0);
  verification-routing plan passed (1 claim); semantic-closure plan passed.
  No target file edited before this evidence.

## 2. cli/README.md Edits

- [x] 2.1 @impl ACS-003: In `DEEP_RESEARCH_HARNESS/cli/README.md`, add `operate-queue.mjs`
  to the Structure diagram (after `operate-work-unit.mjs` line), with a one-line
  description naming the lifecycle verbs. Done when the diagram lists the file.
  Completed 2026-08-28: structure diagram now lists `operate-queue.mjs` with
  lifecycle verbs.

- [x] 2.2 @impl ACS-003, CLE-003: In the exit-code current-state inventory, add an
  `operate-queue.mjs` entry describing its lifecycle verbs (`check/enqueue/claim/complete/...`)
  and exit semantics (0=success/healthy, 1=repairable failure/invocation). Note that
  operate-queue is a `non-gate queue utility` (not a C3-helper operation), matching
  the existing exit-code-convention test inventory. Done when the inventory has an
  accurate operate-queue entry and no exit-code contract is redefined.
  Completed 2026-08-28: exit-code entry added with accurate exit 0/1 semantics
  (no false exit-2 claim). Matches the exit-code-convention test's
  `non-gate queue utility` classification.

- [x] 2.3 (not applicable) operate-queue does NOT use the C3 static invocation helper
  (it exits 1 for invocation errors, not 2); adding it to the `Selected Public
  Operation Parsing` table would be inaccurate. The invocation forms are already
  documented in `COMMANDS.md` (first change). No `cli/README.md` edit needed.

## 3. Verification

- [x] 3.1 @impl VER-001: Run
  `node --test tests/integration/cli/exit-code-convention.test.mjs`.
  Done when all subtests pass and the result is recorded as deterministic
  CLI-contract evidence.
  Completed 2026-08-28: 33/33 subtests passed in 4284ms; deterministic CLI-contract
  evidence.

- [x] 3.2 @impl VER-001, RET-006: Run
  `openspec validate cli-readme-queue-coverage --strict` and `git diff --check`.
  Done when both pass.
  Completed 2026-08-28: validate strict passed; git diff --check clean.

## 4. Archive Preconditions

- [x] 4.1 @impl RET-006: Before archive, run
  `node openspec/governance/check-project-reqs.mjs --mode archive --change cli-readme-queue-coverage`.
  Done when it exits 0 with 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired.
  Completed 2026-08-28: passed with 670 registered (57 retired, 0 orphan), 0 orphan, 0 duplicate.

- [x] 4.2 @impl RET-006: Before archive, run
  `node openspec/governance/check-project-specs.mjs`.
  Done when it exits 0 with 0 deltaHeaderInMain / 0 missingPurpose /
  0 missingRequirements / 0 missingReqHeader.
  Completed 2026-08-28: passed with 82 main spec files, 0 violations.
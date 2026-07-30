# Design: Establish OpenSpec Change Feedback Loop

## Context

See [proposal.md](proposal.md) for the motivation and
[`change-feedback-loop` delta](specs/change-feedback-loop/spec.md) for the contract.
The repository already has `rules.tasks`, requirement/spec governance checks, and the
verification-routing checker. Those facts are useful but are currently split between
planning artifacts, Agent memory, and archive adapters. The current `openspec/config.yaml`
does not configure operation guidance. The current project archive instructions independently
perform artifact/task assessment and a raw directory move, so they can drift from one another
and do not make the existing checks a precondition of the final transition.

OpenSpec 1.7 supplies the two native seams this change needs:

- `openspec instructions apply|archive --change <name> --json` returns a non-empty
  `operationGuidance` array when `operations.<operation>.guidance` contains non-empty strings.
- `openspec archive <name> --json --skip-specs` preserves OpenSpec ownership of task checking,
  collision handling, archive naming, and the canonical move. Its successful JSON envelope has
  an `archive` record naming `change`, `archivedAs`, `path`, and `specsUpdated`.

The change adds a repository governance Module, not a runtime-bundle capability. It uses only
Node.js built-ins and the already-approved `zod` dependency. No `DPT_FRAMEWORK/` behavior,
runtime state, provider, persistent lifecycle record, or additional package is involved.

## Goals / Non-Goals

### Goals

- Preserve plan review, closeout review, and any resulting repair work in the selected change's
  `tasks.md`, rather than in a conversation summary.
- Deliver current apply/archive review posture at the relevant OpenSpec operation without making
  that guidance a pass/fail verdict.
- Provide one small, structured finalization interface that answers the bounded question: does
  this active change satisfy the repository's mechanical closeout prerequisites, and, if so, did
  the canonical native archive move complete?
- Make every documented project archive entry converge on that interface after the Agent has
  completed its semantic review and delta/main comparison.

### Non-Goals

- Judge the quality of semantic review, choose a repair, execute tests, or turn a completed task
  marker into proof that any of those things happened.
- Implement delta-to-main merging, re-check semantic equivalence, calculate an archive name, move
  a directory, or add rollback/retry behavior around native OpenSpec archive.
- Support an external OpenSpec store, modify historical archived changes, or replace OpenSpec's
  general-purpose archive command outside this repository's documented entries.
- Create a new Agent service, lifecycle state machine, receipt, CI hook, or `agent_flow_e2e`
  claim.

## Decisions

### 1. Keep durable work, guidance delivery, and deterministic closure separate

The implementation adds `guidelines/change-feedback-loop.md` as the single advisory source for
the scoped coherence and risk-led review posture. It will not define a new runtime contract or
be parsed by a checker.

`openspec/config.yaml` gains three complementary, deliberately different surfaces:

1. `rules.tasks` instructs every newly generated lifecycle task list to put two first-class
   checkbox tasks in its precondition/closeout sections. Their task text carries the exact stable
   tokens `openspec-feedback:plan-review` and `openspec-feedback:closeout-review`.
2. `operations.apply.guidance` tells a supported apply entry to retrieve the current review
   posture, complete the plan-review task before its first target edit, and retain/add ordinary
   pending repair tasks for any finding.
3. `operations.archive.guidance` tells a supported archive entry to perform change-scoped
   closeout review, complete Agent-owned delta/main sync and re-comparison when applicable, then
   invoke the governed finalizer rather than a raw move.

The task generator rule requires the plan marker to be an early precondition task and the
closeout marker to be an archive-precondition task. A marker task uses normal OpenSpec syntax,
for example:

```markdown
- [ ] 0.2 Review the proposed change before target edits (openspec-feedback:plan-review). Done when ...
```

The finalizer scans only checkbox lines in `tasks.md`. It requires exactly one line containing
each token, and both must use the completed `[x]` form. It separately rejects any remaining
unchecked task line. This permits ordinary Markdown formatting around a task while preventing a
prose mention or a duplicate marker from being treated as completion. A review finding is not
encoded in a marker: it becomes an ordinary unchecked task containing the affected requirement
or reader question, authoritative owner, smallest repair, and observable done condition.

The same marker syntax is used in this change's own task list. That makes the new lifecycle
apply to its first adopter without claiming the proposal has already been reviewed.

### 2. Make `finalize-change-archive.mjs` the one deep mechanical Module

`openspec/governance/finalize-change-archive.mjs` is both the repository CLI and the importable
Module for focused tests. Its public command is intentionally small:

```text
node openspec/governance/finalize-change-archive.mjs --change <active-change>
```

It accepts only a safe active change name and uses the current repository as its planning root.
Internally it obtains `changeRoot`, `planningHome`, artifact locations, and the task path from
`openspec status --change <name> --json`; it does not reconstruct those paths from the selected
name. A narrow exported function may accept injected command/file adapters for unit tests, but
the command's production behavior and rerun coordinate remain the command above.

The Module prints one JSON result to stdout and uses a Zod discriminated schema for its own
result. A blocked result is root-first:

```json
{
  "schema_version": "change-feedback-finalizer/v1",
  "change": "example-change",
  "outcome": "blocked",
  "root": {
    "code": "review_marker_unmet",
    "observed": "openspec-feedback:closeout-review is incomplete",
    "owner": "openspec/changes/example-change/tasks.md",
    "repair": { "write_to": "openspec/changes/example-change/tasks.md" },
    "rerun": "node openspec/governance/finalize-change-archive.mjs --change example-change"
  },
  "checks": []
}
```

`repair` appears only when the observed root has an existing legal repair surface. Every blocked
result still names the same rerun coordinate. Successful output has `outcome: "archived"`, the
checks that passed, and the native archive identity/path; it has no synthetic semantic-success
field. Failure codes distinguish status/artifact/task parsing, review marker, pending task,
strict validation, each existing governance checker, native archive invocation, invalid native
JSON, and post-move mismatch. This is a closed enough vocabulary for callers to show a stable
root without hiding the observed fact.

This is a useful semantic level for an Agent or maintainer: it preserves distinctions that
change the answer to the mechanical-closeout question (artifact state, task/marker state,
individual checker result, and native move result), while explicitly returning `blocked` rather
than pretending it knows the quality of review or semantic sync. Readers can normally stop at
the result and repair its named direct fact, or correctly recognize that the result does not
answer a semantic question.

### 3. Use one ordered, direct-fact finalization path

The finalizer executes the following short-circuit order. It captures child-process output for
the structured result but does not forward it as a new authority or write it to repository state.

1. Resolve the active change and all artifact paths through native OpenSpec status.
2. Require every declared artifact to be `done` or `skipped`, and require a readable task file
   from the resolved task artifact path.
3. Parse task checkbox lines; require the two unique completed review markers and no other
   unchecked task.
4. Run `openspec validate <name> --strict` from the resolved planning root.
5. Run, in order, `check-project-reqs.mjs`, `check-project-specs.mjs`, and
   `check-verification-routing.mjs --change <name> --mode assets`.
6. Invoke exactly `openspec archive <name> --json --skip-specs` only after all preceding facts
   pass. The finalizer never supplies `--yes` or `--no-validate`.
7. Parse the native JSON and confirm its `change` matches, `specsUpdated` is `false`, the
   reported path is a real descendant of the resolved archive directory, the moved directory
   exists there, and the resolved active `changeRoot` no longer exists.

Every failed step returns immediately before later checkers or native archive execute. A failed
native command reports the observed exit/result boundary and the post-command active/archive
path facts; it does not infer success, retry, roll back, or move files itself. This preserves the
shortest legal loop: direct fact, earliest deterministic root, one legal repair surface where
one exists, then rerun the same command.

The native archive call deliberately follows Agent-owned delta/main sync and re-comparison. The
finalizer's `--skip-specs` mode means its project checks inspect the final main specs without
creating a second merge algorithm or a post-write recovery branch.

### 4. Treat operation guidance as an entry prerequisite, not as finalizer evidence

The supported apply and archive instruction surfaces will first call the corresponding
`openspec instructions <operation> --change <name> --json` with the same root selection as the
rest of the operation. For a feedback-lifecycle change, a valid guidance lookup has a successful
JSON response with a non-empty `operationGuidance` list containing the configured
`change-feedback-loop/<operation>` entry. If that lookup is unavailable, malformed, or missing
the required entry, the instruction surface stops before target edits or finalization, names the
lookup boundary, and offers only an existing configuration/instruction repair coordinate plus
the same entry command to rerun.

The finalizer does not re-check guidance. Guidance tells the Agent when and how to perform its
semantic work; task and checker facts determine mechanical closure. Keeping them apart avoids a
second derivation chain and prevents a config string from becoming archive permission.

### 5. Declare and test the supported entry set

The finalizer module exports the complete project-supported surface lists so the guidance
contract and its conformance test have one owner:

- apply: `.codex/skills/openspec-apply-change/SKILL.md`,
  `.agents/skills/openspec-apply-change/SKILL.md`,
  `.agents/skills/source-command-opsx-apply/SKILL.md`, and `.codex/prompts/opsx-apply.md`;
- archive: `.codex/skills/openspec-archive-change/SKILL.md`,
  `.agents/skills/openspec-archive-change/SKILL.md`,
  `.agents/skills/source-command-opsx-archive/SKILL.md`, and `.codex/prompts/opsx-archive.md`.

`AGENTS.md` and `CLAUDE.md` receive the same short router: current operation guidance is
required before the relevant transition, actionable findings are pending tasks, and supported
archive completion runs the finalizer. They are bootstrap guidance, not additional archive
adapters.

The conformance test reads only the exported inventory and those source files. It proves that
each entry retrieves its required guidance; each archive entry routes the final mechanical step
to the finalizer; and no declared archive entry retains raw `mv` or an alternate direct
`openspec archive` success route. Adding a supported entry therefore requires adding it to the
single inventory and satisfying the same assertions; an unlisted external tool is not silently
elevated to project lifecycle authority.

### 6. Verify at the smallest truthful boundary

The verification plan selects three deterministic classes:

- Unit tests cover the strict task-marker parser, result schemas, root mapping, and command
  ordering without a real archive move.
- Integration tests cover the finalizer's production CLI boundary on temporary OpenSpec fixture
  roots, its precondition short-circuits, operation-guidance delivery, and static supported-entry
  conformance.
- A deterministic E2E test creates an isolated valid temporary repository change, synchronizes
  its spec deliberately in setup, then invokes the real native archive through the finalizer and
  proves the active/archive path transition and `specsUpdated: false` result.

`agent_flow_e2e` is explicitly not applicable. This change can prove the deterministic closure
contract and documented guidance wiring, but it does not claim that a real Agent's semantic
review is correct or that any host invokes the entry surface.

### 7. Preserve the responsibility boundary and remove duplicate control

The finalizer is not a new workflow controller. The user retains new semantic, scope, risk, and
permission decisions; the Agent performs authorized review, writes ordinary findings, makes
allowed repairs, syncs/re-compares specs, and reruns the same command; the Engine reports only
deterministic facts. No completion marker, user approval, or advice string grants a missing
capability.

This is net simplification rather than a new recovery stack. It replaces four archive adapters'
independent checker order and raw-move instructions with one final call, while retaining native
OpenSpec's established archive behavior. It adds no persistent state, alternate spec writer,
retry tree, rollback protocol, or semantic receipt. The direct finalizer result is the one
reader-facing mechanical checkpoint; all other failures return to it after the named repair.

## Risks / Trade-offs

- [Task Markdown is user-editable and marker syntax can drift] -> Parse only standard checkbox
  lines with the exact marker tokens, reject missing/duplicate/incomplete markers, and cover
  formatting-adjacent invalid cases in unit tests.
- [A native OpenSpec upgrade changes status or archive JSON] -> Validate only documented/current
  result fields, report invalid native JSON or path mismatch honestly, and keep OpenSpec version
  compatibility as an explicit integration/E2E fixture fact rather than guessing a fallback.
- [Static instruction conformance cannot prove an Agent obeys prose] -> State that limit in the
  spec and verification plan; test delivery/routing only, never Agent behavior.
- [A project has unrelated local edits while closeout is reviewed] -> Archive guidance requires a
  change-scoped actual-diff boundary and directs the Agent to stop with a missing-boundary fact
  when it cannot separate selected-change work; the finalizer does not attempt to infer ownership
  from a whole worktree diff.
- [A native archive failure occurs after an unforeseen side effect] -> Report the observed active
  and archive paths and leave recovery to a separately justified change; do not add speculative
  automatic rollback.

## Migration Plan

1. Register `CHF-001` through `CHF-004` and run the existing planning governance checks before
   any target edit.
2. Add the guideline/configuration/task-generation rules and update the supported entry documents
   plus their focused conformance test.
3. Implement the finalizer and its unit/integration/E2E coverage, then create a valid disposable
   change to exercise the real native archive path.
4. Before this change is archived, Agent-review its actual diff, sync and re-compare the delta
   spec into `openspec/specs/change-feedback-loop/`, complete the two review markers and all
   ordinary tasks, run the finalizer, and let it invoke native archive with `--skip-specs`.

Existing archived changes are not migrated. Active changes created before the new `rules.tasks`
configuration are outside the feedback lifecycle unless they are deliberately updated under a
future scoped change.

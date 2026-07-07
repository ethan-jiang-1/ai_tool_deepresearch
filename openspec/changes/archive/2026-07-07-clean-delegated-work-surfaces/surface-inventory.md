# Stale Delegated Surface Inventory

## Purpose

This is the apply-time work ledger for cleaning retired relay/slot wording outside `openspec/changes/archive/`. It is not a historical archive. During apply, refresh the focused audit and close every row before archive.

Close states:

- `migrate`: rewrite to current work-unit path and verify it
- `remove`: delete obsolete current-surface file, runner entry, helper, or wording
- `negative`: keep only as explicit rejection, hygiene, or diagnostic coverage
- `deprecated-registry`: keep only as `[DEPRECATED]` requirement metadata
- `checker-self-reference`: keep only because the hygiene checker or test names the retired token it rejects
- `cleanup-control`: keep only under this active cleanup change when the artifact defines retired-token vocabulary, inventory, tasks, or delta requirements and cannot be read as production guidance
- `current-work-unit-context`: keep only for context-sensitive tokens in current work-unit implementation/spec/test context with no retired relay/slot or old queue slot authority
- `release-history-minimized`: keep only as brief past-tense release history that cannot be read as command guidance
- `past-failure-history`: keep only when a current backlog/bug/planning note clearly frames the old surface as past failure analysis or removed design, not current implementation guidance

Blocked states at archive: `unknown`, `legacy/backlog`, vague `follow-up`, or any current runner/playbook/doc/test wording that still teaches the retired production path.

## Audit Vocabulary

Retired-only tokens should fail on current surfaces unless the occurrence is an allowed negative/deprecated/checker/cleanup-control/minimized-release-history context. Context-sensitive tokens may remain only in `current-work-unit-context` rows:

- commands/modules/helpers: `drive-relay-slot`, `subagent-relay`, `stageSubagentSlots`, `commitSlotResult`, `collectAndMergeSubagentResults`, `recordAgentSpawnRequested`, `ingestAgentReceipt`, `runProvenanceForensics`
- old ledger/check fields: `slot_result_ref`, `subagent_slot_presence`
- old event and identity family: `slotKey`, `roleAgentKey`, relay-context `receiptNonce`, `relay_commit_*`, `relay_spawn_*`
- old path/dispatch family: `_subagents/`, `_subagents/wave`, `dispatch.json`, `relay slot`, `slot task`, `slot result`, `slot artifact`, `bounded slots`
- old queue control family: `slot_1_current`, `slot_2_next`, `slot_*_pending`, `slot_5_tail`, `slot_20_tail`, top-level queue `work_id` demand identity, fixed "five-slot active window" state-model wording, task-card examples that use `work_id` for queue demand identity, and old `test-simple`/`test-medium`/`test-complex` experiment taxonomy when it reads as current runner instruction

Context-sensitive tokens are valid in current work-unit surfaces unless paired with old relay/slot examples:

- `runtime_receipt_ref`
- `receipt_nonce`
- `_beacon.json`
- lifecycle event wording
- camelCase `receiptNonce` when it is only a local variable for current work-unit `receipt_nonce`

Current queue v2 wording is valid when it describes:

- ordered `active_window` / `refill_pool` arrays
- the executable capacity constant, currently `QUEUE_ACTIVE_WINDOW_LIMIT = 20`
- multi-item tests that stage five or more queue items to prove refill, restore, or preemption
- `queue_item_id` as queue demand identity and `work_id` only as an Engine-allocated delegated work-unit attempt

It is stale when the same surface presents fixed five-slot state, named slots (`slot_1_current`, `slot_2_next`, `slot_5_tail`), or queue demand `work_id` as current proof.

## Focused Audit Command

```bash
rg -n --glob '!openspec/changes/archive/**' --glob '!**/_original_*' \
  'drive-relay-slot|subagent-relay|relay-managed|relay slot|relay-slot|Relay slot|slot_result_ref|subagent_slot_presence|_subagents/|_subagents/wave|taskMarkdownForSlot|stageSubagentSlots|commitSlotResult|collectAndMergeSubagentResults|recordAgentSpawnRequested|ingestAgentReceipt|runProvenanceForensics|slotKey|roleAgentKey|receiptNonce|relay_commit|relay_spawn|dispatch\.json|bounded slots|slot task|slot result|slot artifact|slot_1_current|slot_2_next|slot_[0-9]+_pending|slot_5_tail|slot_20_tail|replace-subagent-relay-with-work-units' \
  openspec/specs openspec/changes DPT_FRAMEWORK tests experiments_playbook guidelines openspec/governance experiments_env/shared _backlog/bugs _backlog/plans _backlog/todos README.md AGENTS.md
```

Queue wording semantic pass:

```bash
rg -n --glob '!openspec/changes/archive/**' --glob '!**/_original_*' \
  'five-slot active window|fixed five-slot|5-slot active window|five named slots|test-simple\.md|test-medium\.md|test-complex\.md|simple, medium, and complex experiment playbooks|\| `work_id` \| yes \|' \
  openspec/specs openspec/changes DPT_FRAMEWORK tests experiments_playbook guidelines openspec/governance experiments_env/shared _backlog/bugs _backlog/plans _backlog/todos README.md AGENTS.md
```

Hits under this active cleanup change are expected while the change is in propose/apply. They SHALL be classified as `cleanup-control` only when the wording defines retired-token vocabulary, inventory, tasks, or negative delta requirements and cannot be read as production guidance. After archive, the same artifacts move under `openspec/changes/archive/` and are excluded.

`_original_*` archives are excluded from these commands because repo instructions forbid reading them unless explicitly requested. Current `_backlog/bugs`, `_backlog/plans`, and `_backlog/todos` are not excluded: backlog, bug, TODO, or planning notes can remain only when their old relay/slot wording is explicit past-failure history or removed-design context. `_backlog/_done` is already a closed-history area and is not part of the current planning/bug/todo cleanup surface for this change.

## Final Closure 2026-07-07

Final hygiene result:

```text
node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs --json
passed true, issue_count 0
```

The focused stale-token audit outside `openspec/changes/archive/` and `_original_*` archives has no unclassified current-surface failures. Remaining literal retired-token hits are only allowed close states:

| Surface class | Final close state |
|---------------|-------------------|
| Active cleanup change artifacts under `openspec/changes/clean-delegated-work-surfaces/` | `cleanup-control`: these files define the cleanup vocabulary and will move under the excluded archive path when archived |
| Deprecated governance registry entries | `deprecated-registry`: `[DEPRECATED]` metadata only, no active spec-directory implication |
| Hygiene checker and hygiene tests | `checker-self-reference`: rejection vocabulary and failure fixtures |
| Current work-unit implementation locals such as code-local `receiptNonce` | `current-work-unit-context`: valid work-unit nonce handling |
| File-observability and health-verifier old path fixtures | `negative`: non-authority / bypass diagnostic only |
| Queue old-shape tests | `negative`: schema rejection or absence-of-old-projection coverage only |
| Main specs, framework docs, and current guidance | `migrate`: synced to current work-unit / queue v2 / active-bundle-root wording |
| Current runner docs and playbooks | `migrate` / `remove`: current tables list current proof only; old relay/slot runnable playbooks were deleted or migrated |
| Current backlog bugs/plans/todos | `migrate` / `remove`: old relay incident reports and migration plans were removed from current backlog; still-useful TODOs now point to work-unit, declaration, and active-bundle-root surfaces |

Final current-surface outcomes:

| Area | Closure |
|------|---------|
| `openspec/specs/**` | Purpose and requirement wording now describe work-unit delegated flow, queue v2, submitted ledger authority, and active bundle-root runtime paths |
| `openspec/governance/req-registry.yaml` | Retired relay/slot prefixes remain only as deprecated metadata |
| `DPT_FRAMEWORK/` docs/code | Old production guidance removed or confined to checker/negative diagnostic contexts |
| `tests/` | Old tokens remain only in negative/checker tests that prove rejection or absence |
| `experiments_playbook/` | Focused retired-token audit is clean; current runner no longer has a Legacy/backlog table or relay/slot proof entries |
| `experiments_env/shared/` | Focused retired-token audit is clean |
| `_backlog/bugs`, `_backlog/plans`, `_backlog/todos` | Focused retired-token audit is clean; obsolete old relay reports/plans removed, useful TODOs migrated |

## Archive-Readiness Rule

Before archive, rerun hygiene and the focused audit. Any new hit outside `openspec/changes/archive/` must either match the allowed close states above or be fixed before archive. Current runnable playbooks, runner tables, docs, or specs must not retain old relay/slot production instructions merely because they are historical.

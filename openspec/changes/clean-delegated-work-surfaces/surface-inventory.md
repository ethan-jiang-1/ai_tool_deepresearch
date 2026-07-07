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
  openspec/specs openspec/changes DPT_FRAMEWORK tests experiments_playbook guidelines openspec/governance experiments_env/shared _backlog README.md AGENTS.md
```

Queue wording semantic pass:

```bash
rg -n --glob '!openspec/changes/archive/**' --glob '!**/_original_*' \
  'five-slot active window|fixed five-slot|5-slot active window|five named slots|test-simple\.md|test-medium\.md|test-complex\.md|simple, medium, and complex experiment playbooks|\| `work_id` \| yes \|' \
  openspec/specs openspec/changes DPT_FRAMEWORK tests experiments_playbook guidelines openspec/governance experiments_env/shared _backlog README.md AGENTS.md
```

Hits under this active cleanup change are expected while the change is in propose/apply. They SHALL be classified as `cleanup-control` only when the wording defines retired-token vocabulary, inventory, tasks, or negative delta requirements and cannot be read as production guidance. After archive, the same artifacts move under `openspec/changes/archive/` and are excluded.

`_original_*` archives are excluded from these commands because repo instructions forbid reading them unless explicitly requested. Current `_backlog` is not excluded: backlog, bug, TODO, or planning notes can remain only when their old relay/slot wording is explicit past-failure history or removed-design context.

## Known Current Hits To Close

| Surface | Known stale signal | Apply treatment |
|---------|--------------------|-----------------|
| `openspec/specs/delegated-work-units/spec.md` | Purpose says it came from archived relay replacement change | `migrate`: replace Purpose with durable work-unit capability wording through OpenSpec sync/archive |
| `openspec/changes/clean-delegated-work-surfaces/**` | cleanup artifacts name retired relay/slot and old queue tokens to define the cleanup target | `cleanup-control`: keep only as active change control-plane wording; it must not be copied into current production guidance |
| `openspec/specs/agentic-queue/spec.md` | Purpose says "five-slot active window"; AGQ-006 still names simple/medium/complex `test-*` cases; seed/topic task-card tables use `work_id` as queue demand field | `migrate`: queue v2 Purpose with ordered `active_window`, executable capacity semantics (`QUEUE_ACTIVE_WINDOW_LIMIT = 20`), current case/cost taxonomy, and `queue_item_id` demand examples |
| `openspec/specs/work-unit-provenance-gate/spec.md` | Purpose says it came from archived relay replacement change | `migrate`: replace Purpose with durable work-unit provenance wording through OpenSpec sync/archive |
| `openspec/specs/subagent-directory-contract/spec.md` | `_subagents/wave_NN/slot_MM`, relay-managed slot Purpose | `migrate`: work-unit directory/envelope Purpose and requirements |
| `openspec/specs/subagent-node-contract/spec.md` | `taskMarkdownForSlot`, `drive-relay-slot`, relay driver Purpose | `migrate`: work-unit task/result/receipt/submit actor contract |
| `openspec/specs/subagent-dispatch/spec.md` | bounded slots, slot task/result schema Purpose | `migrate`: work-unit claim and prompt handoff dispatch wording |
| `openspec/specs/agent-output-declaration/spec.md` | relay slot results and delegated queue completion as ledger authority | `migrate`: work-unit submit ledger authority only |
| `openspec/specs/repair-loop/spec.md` | `subagent-relay.mjs` implementation anchor | `migrate`: deterministic checkpoint semantics without retired transport module |
| `openspec/specs/framework-engine/spec.md` | Purpose still says deterministic modules include "subagent relay mechanisms" | `migrate`: queue/gate/loader/work-unit/hygiene Purpose |
| `openspec/specs/agent-testing/spec.md` | Purpose and AGT-001/002/005 still describe older simple/medium/complex `test-*` experiment taxonomy | `migrate`: current case/cost/run-bundle experiment taxonomy and frontmatter cost wording |
| `openspec/specs/file-observability/spec.md` | Purpose still says `TBD`; diagnostic requirements mention non-work-unit delegated dirs without durable Purpose | `migrate`: durable work-unit file observability Purpose through OpenSpec sync/archive |
| `openspec/governance/req-registry.yaml` | deprecated relay/slot prefixes and IDs | `deprecated-registry`: keep only `[DEPRECATED]` metadata with no active spec-directory implication |
| `DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs` | retired token patterns | `checker-self-reference`: keep only as rejection patterns and extend scan roots |
| `tests/integration/cli/validate-work-unit-hygiene.test.mjs` | retired token fixtures | `checker-self-reference`: keep only as hygiene failure fixtures |
| `DPT_FRAMEWORK/engine/work-unit-core.mjs` | local `receiptNonce` variable | `current-work-unit-context`: keep if it only populates current work-unit `receipt_nonce` and is not paired with old relay identity |
| `tests/engine/helpers/file-observability.test.mjs` | `_subagents/wave_01/slot_01` fixture | `negative` or `migrate`: prefer work-unit diagnostic fixture unless old path is required to prove non-authority rejection |
| `DPT_FRAMEWORK/engine/helpers/file-observability.mjs` | recursive scan comment lists `_subagents/` | `negative` or `remove`: keep only if implementation intentionally detects old non-authority artifacts |
| `tests/schema/verify-bundle-health.test.mjs` | negative test writes `_subagents/fake-result.json` | `negative`: ensure wording proves directory scanning cannot pass provenance |
| `tests/schema/contracts/queue.test.mjs` | old top-level queue slot shape fixtures | `negative`: keep only as schema rejection tests |
| `tests/engine/queue-manager-receipts-cli-render.test.mjs` | old `slot_1_current` projection absence assertion | `negative`: keep only as proof current queue projection does not expose old slot shape |
| `DPT_FRAMEWORK/CHANGELOG.md` | old relay command/path release details | `release-history-minimized` or `remove`: do not leave command-like current guidance |
| `_backlog/bugs/BUG-032-relay-slots-uncommitted-provenance-broken.md` | old relay failure analysis names `drive-relay-slot`, `_subagents`, `relay_commit_missing` | `past-failure-history` or `remove`: keep only if unmistakably past failure analysis and not current instructions |
| `_backlog/bugs/BUG-034-wave0-gate-impassable-relay-ledger-chain-too-brittle.md` | old relay pipeline and `slot_result_ref` failure analysis | `past-failure-history` or `remove`: keep only if explicit removed-design/failure context |
| `_backlog/bugs/BUG-035-cross-wave-repeated-relay-failure-pattern.md` | old relay repeat-failure analysis | `past-failure-history` or `remove`: keep only if explicit removed-design/failure context |
| `_backlog/bugs/BUG-036-run-log-trace-reveal-systemic-workflow-failure.md` | old relay log diagnostics | `past-failure-history` or `remove`: keep only if explicit removed-design/failure context |
| `_backlog/bugs/README.md` | current backlog index names relay-slot bug | `past-failure-history` or `remove`: index wording must not look like current production guidance |
| `_backlog/todos/*.md` | multiple TODOs still cite `subagent-relay.mjs` / relay helper internals as implementation anchors | `migrate` or `remove`: update to work-unit/current mechanism if still actionable, otherwise remove obsolete TODO wording |
| `_backlog/plans/unified-delegated-work-unit-pipeline.md` | plan contains old-token impact map and replacement intent | `past-failure-history` or `remove`: keep only if clearly historical/removed-design; do not let it outrank accepted specs |
| `_backlog/plans/unified-work-unit-replacement-impact-map.md` | plan inventories old relay/slot surfaces and replacement mapping | `past-failure-history` or `remove`: keep only if clearly historical/removed-design; do not let it read as active plan after archive |
| `_backlog/plans/why-relay-grew-complex-history.md` | historical explanation of relay complexity | `past-failure-history` or `remove`: keep only as explicit history, never current mechanism guidance |
| `experiments_playbook/README.md` | says the Legacy/backlog table is a permanent skipped surface | `remove` or `migrate`: align overview with no permanent legacy/backlog runner table |
| `experiments_playbook/RUN_EXPS.md` | permanent Legacy/backlog table | `remove` or `migrate`: no permanent legacy/backlog runner table after archive |
| `experiments_playbook/exp_agentic-queue/case-41-light-minimal-path.md` | old top-level queue slot/current projection | `migrate` to queue v2 active_window/refill_pool array semantics with `queue_item_id` assertions, or `remove` if current queue v2 playbooks/tests cover it |
| `experiments_playbook/exp_agentic-queue/case-42-standard-urgent-preemption.md` | old active-window slot shape; valid proof intent may still be refill/preemption across multiple queued items | `migrate` to queue v2 preemption semantics using `active_window[index].queue_item_id` / `refill_pool[index].queue_item_id`, or `remove` if no current proof value remains |
| `experiments_playbook/exp_agentic-queue/case-43-standard-failure-repair.md` | old slot promotion/repair shape; valid proof intent may still be fail-closed receipt and repair/preemption behavior | `migrate` to queue v2 failure/repair semantics using ordered arrays and `queue_item_id`, or `remove` if no current proof value remains |
| `experiments_playbook/exp_system-logging/case-76-light-spawn-prompt-logging.md` | `drive-relay-slot`, `subagent-relay`, `recordAgentSpawnRequested` production path | `migrate` if it still proves work-unit spawn prompt/logging; otherwise `remove` |
| `experiments_playbook/exp_system-logging/case-77-standard-subagent-logging.md` | `drive-relay-slot`, relay slots, `_subagents/wave_01` | `migrate` if it still proves work-unit lifecycle logging; otherwise `remove` |
| `experiments_playbook/exp_system-logging/case-79-standard-provenance-forensics.md` | `_subagents/wave_00`, relay forensics matrix | `migrate` to work-unit provenance-forensics signals if valuable; otherwise `remove` |
| `experiments_playbook/exp_system-logging/case-72-standard-engine-lifecycle.md` | `subagent-relay` helper imports | `remove` unless a work-unit lifecycle logging migration has current value |
| `experiments_playbook/exp_subagent/case-61-heavy-single-intake.md` | `stageSubagentSlots`, `commitSlotResult`, `ingestAgentReceipt`, `recordAgentSpawnRequested`, `slotKey`, `_subagents/wave_01` | `remove` unless migrated to current work-unit real-agent canary |
| `experiments_playbook/exp_subagent/case-62-heavy-drive-relay-provenance-sound.md` | `drive-relay-slot`, `runProvenanceForensics`, `relay_commit_*`, `slotKey`, `dispatch.json`, `_subagents/wave_01` | `remove` unless migrated to current work-unit claim/submit canary |
| `experiments_playbook/exp_subagent/case-66-standard-drive-relay-staged-not-committed.md` | `drive-relay-slot stage`, `runProvenanceForensics`, `relay_commit_missing`, `dispatch.json` | `remove` unless migrated to work-unit terminal/late-submit diagnostics |
| `experiments_playbook/exp_wff_wave-gates/case-121-standard-wave0-happy.md` | hand-written `slot_result_ref` ledger fixture | `migrate` fixture through work-unit submit or `remove` if covered by current wave0 work-unit E2E |
| `experiments_playbook/exp_wff_wave-gates/case-122-standard-wave1-boundary.md` | hand-written `slot_result_ref` ledger fixture | `migrate` fixture through work-unit submit or `remove` if covered by current wave1 work-unit E2E |
| `experiments_playbook/exp_wff_wave-gates/case-125-light-dynamic-threshold.md` | hand-written `slot_result_ref` ledger fixtures | `migrate` threshold fixture through work-unit submit or `remove` |
| `experiments_playbook/exp_wff_wave-gates/case-126-light-style-switch.md` | hand-written `slot_result_ref` ledger fixture | `migrate` style-switch fixture through work-unit submit or `remove` |
| `experiments_playbook/exp_wff_wave-chain/case-154-standard-wave-review-surface.md` | hand-written `slot_result_ref` ledger fixture | `migrate` review-surface fixture through work-unit submit or `remove` |
| `experiments_playbook/exp_file-observability/case-310-light-orphan-reference.md` | old delegated ledger row with slot refs | `migrate` to work-unit file-observability fixture or `remove` if regression/current E2E covers it |
| `experiments_playbook/exp_file-observability/case-311-light-file-explanation.md` | old queue control shape fixture | `migrate` to queue v2/current file-observability fixture or `remove` if current coverage supersedes it |
| `experiments_playbook/exp_file-observability/case-312-light-wave2-action-add.md` | old queue control shape fixture | `migrate` to queue v2/current wave2 action-add fixture or `remove` if current coverage supersedes it |
| `experiments_playbook/exp_reentry-debuggability/case-307-light-clean-reentry.md` | old empty queue slot JSON fixture | `migrate` to queue v2 empty fixture or `remove` if current reentry coverage supersedes it |
| `experiments_playbook/exp_reentry-debuggability/case-308-light-stale-queue-blocker.md` | old `slot_1_current` stale queue fixture and `work_id` blocker identity | `migrate` to queue v2 stale queue fixture using `queue_item_id` |
| `experiments_playbook/exp_reentry-debuggability/case-309-light-drift-detection.md` | old empty queue slot JSON fixture | `migrate` to queue v2 empty fixture or `remove` if current reentry coverage supersedes it |
| `experiments_playbook/exp_handoff-witnessing/case-501-standard-handoff-witnessing.mjs` | JS helper writes old slot artifacts and ledger refs | `remove`: current MD playbook is the runner surface |

## Archive-Readiness Rule

Before archive, rerun the focused audit. Every remaining hit outside `openspec/changes/archive/` must be explainable by an allowed close state. Current runnable playbooks, runner tables, docs, or specs must not retain old relay/slot production instructions merely because they are historical.

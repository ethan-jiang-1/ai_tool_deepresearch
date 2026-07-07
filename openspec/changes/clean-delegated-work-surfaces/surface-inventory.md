# Stale Delegated Surface Inventory

## Purpose

This is the apply-time work ledger for cleaning retired relay/slot wording outside `openspec/changes/archive/`. It is not a historical archive. During apply, refresh the focused audit and close every row before archive.

Close states:

- `migrate`: rewrite to current work-unit path and verify it
- `remove`: delete obsolete current-surface file, runner entry, helper, or wording
- `negative`: keep only as explicit rejection, hygiene, or diagnostic coverage
- `deprecated-registry`: keep only as `[DEPRECATED]` requirement metadata
- `checker-self-reference`: keep only because the hygiene checker or test names the retired token it rejects
- `release-history-minimized`: keep only as brief past-tense release history that cannot be read as command guidance

Blocked states at archive: `unknown`, `legacy/backlog`, vague `follow-up`, or any current runner/playbook/doc/test wording that still teaches the retired production path.

## Audit Vocabulary

Retired-only tokens should fail on current surfaces unless the occurrence is an allowed negative/deprecated/checker/minimized-release-history context:

- commands/modules/helpers: `drive-relay-slot`, `subagent-relay`, `stageSubagentSlots`, `commitSlotResult`, `collectAndMergeSubagentResults`, `recordAgentSpawnRequested`, `ingestAgentReceipt`, `runProvenanceForensics`
- old ledger/check fields: `slot_result_ref`, `subagent_slot_presence`
- old event and identity family: `slotKey`, `roleAgentKey`, `receiptNonce`, `relay_commit_*`, `relay_spawn_*`
- old path/dispatch family: `_subagents/`, `_subagents/wave`, `dispatch.json`, `relay slot`, `slot task`, `slot result`, `slot artifact`, `bounded slots`

Context-sensitive tokens are valid in current work-unit surfaces unless paired with old relay/slot examples:

- `runtime_receipt_ref`
- `receipt_nonce`
- `_beacon.json`
- lifecycle event wording

## Focused Audit Command

```bash
rg -n --glob '!openspec/changes/archive/**' --glob '!**/_original_*' \
  'drive-relay-slot|subagent-relay|relay-managed|relay slot|relay-slot|Relay slot|slot_result_ref|subagent_slot_presence|_subagents/|_subagents/wave|taskMarkdownForSlot|stageSubagentSlots|commitSlotResult|collectAndMergeSubagentResults|recordAgentSpawnRequested|ingestAgentReceipt|runProvenanceForensics|slotKey|roleAgentKey|receiptNonce|relay_commit|relay_spawn|dispatch\.json|bounded slots|slot task|slot result|slot artifact|replace-subagent-relay-with-work-units' \
  openspec/specs DPT_FRAMEWORK tests experiments_playbook guidelines openspec/governance
```

## Known Current Hits To Close

| Surface | Known stale signal | Apply treatment |
|---------|--------------------|-----------------|
| `openspec/specs/delegated-work-units/spec.md` | Purpose says it came from archived relay replacement change | `migrate`: replace Purpose with durable work-unit capability wording through OpenSpec sync/archive |
| `openspec/specs/work-unit-provenance-gate/spec.md` | Purpose says it came from archived relay replacement change | `migrate`: replace Purpose with durable work-unit provenance wording through OpenSpec sync/archive |
| `openspec/specs/subagent-directory-contract/spec.md` | `_subagents/wave_NN/slot_MM`, relay-managed slot Purpose | `migrate`: work-unit directory/envelope Purpose and requirements |
| `openspec/specs/subagent-node-contract/spec.md` | `taskMarkdownForSlot`, `drive-relay-slot`, relay driver Purpose | `migrate`: work-unit task/result/receipt/submit actor contract |
| `openspec/specs/subagent-dispatch/spec.md` | bounded slots, slot task/result schema Purpose | `migrate`: work-unit claim and prompt handoff dispatch wording |
| `openspec/specs/agent-output-declaration/spec.md` | relay slot results and delegated queue completion as ledger authority | `migrate`: work-unit submit ledger authority only |
| `openspec/specs/repair-loop/spec.md` | `subagent-relay.mjs` implementation anchor | `migrate`: deterministic checkpoint semantics without retired transport module |
| `openspec/specs/framework-engine/spec.md` | Purpose still says deterministic modules include "subagent relay mechanisms" | `migrate`: queue/gate/loader/work-unit/hygiene Purpose |
| `openspec/specs/agent-testing/spec.md` | Purpose still describes older simple/medium/complex experiment taxonomy | `migrate`: current case/cost/run-bundle experiment taxonomy where relevant |
| `openspec/governance/req-registry.yaml` | deprecated relay/slot prefixes and IDs | `deprecated-registry`: keep only `[DEPRECATED]` metadata with no active spec-directory implication |
| `DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs` | retired token patterns | `checker-self-reference`: keep only as rejection patterns and extend scan roots |
| `tests/integration/cli/validate-work-unit-hygiene.test.mjs` | retired token fixtures | `checker-self-reference`: keep only as hygiene failure fixtures |
| `tests/engine/helpers/file-observability.test.mjs` | `_subagents/wave_01/slot_01` fixture | `negative` or `migrate`: prefer work-unit diagnostic fixture unless old path is required to prove non-authority rejection |
| `DPT_FRAMEWORK/engine/helpers/file-observability.mjs` | recursive scan comment lists `_subagents/` | `negative` or `remove`: keep only if implementation intentionally detects old non-authority artifacts |
| `tests/schema/verify-bundle-health.test.mjs` | negative test writes `_subagents/fake-result.json` | `negative`: ensure wording proves directory scanning cannot pass provenance |
| `DPT_FRAMEWORK/CHANGELOG.md` | old relay command/path release details | `release-history-minimized` or `remove`: do not leave command-like current guidance |
| `experiments_playbook/RUN_EXPS.md` | permanent Legacy/backlog table | `remove` or `migrate`: no permanent legacy/backlog runner table after archive |
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
| `experiments_playbook/exp_handoff-witnessing/case-501-standard-handoff-witnessing.mjs` | JS helper writes old slot artifacts and ledger refs | `remove`: current MD playbook is the runner surface |

## Archive-Readiness Rule

Before archive, rerun the focused audit. Every remaining hit outside `openspec/changes/archive/` must be explainable by an allowed close state. Current runnable playbooks, runner tables, docs, or specs must not retain old relay/slot production instructions merely because they are historical.

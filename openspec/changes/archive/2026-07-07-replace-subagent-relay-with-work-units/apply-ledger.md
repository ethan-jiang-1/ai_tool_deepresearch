# Apply Ledger: replace-subagent-relay-with-work-units

This ledger records apply evidence for the replacement:

```text
queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate
```

## 1. Orientation

Status:

- Change schema: `spec-driven`
- Apply instructions state: `ready`
- Initial progress: `0/122`
- Context files read: `proposal.md`, `design.md`, `tasks.md`, and all delta spec files under `specs/**/spec.md`

Default apply order:

1. Sections 1-3: orientation, hygiene, inventories, evidence ledgers.
2. Sections 4-7: queue v2 and work-unit claim/envelope/dispatch core.
3. Sections 8-10: submit, terminal attempts, ledger, output/cache validation.
4. Sections 11-12: gate provenance, diagnostics, observability, trace/logs.
5. Sections 13-14: Agent-facing docs/guidelines/playbooks and removed-path validators.
6. Sections 15-16: focused regression tests and controlled E2E playbooks.
7. Section 17: release hygiene, full validation, archive-readiness residual risk note.

Known residual risks at start:

- The old delegated path is spread across framework code, workflow Markdown, guidelines, tests, and playbooks, so single-surface edits are insufficient.
- `openspec/specs/**` still contains old mechanism wording by design until archive/sync applies the delta specs.
- Some checks will initially fail while the target implementation is in transition; tasks are marked complete only after focused evidence exists.

## 2. Baseline Cleanup Ledger

Command:

```bash
rg -l '\brelay\b|_subagents\b|\bslot(?:s|Key)?\b|slot_[0-9]|slot_result_ref|subagent_slot_presence|relay_commit_missing|drive-relay-slot|SlotResult|commitSlotResult|stageSubagentSlots|collectAndMergeSubagentResults|SubagentWorkflowState|subagent_all_failed|MAX_CONCURRENT_SUBAGENTS|shared-subagent-protocol' openspec/specs DPT_FRAMEWORK guidelines tests experiments_playbook --glob '!_original_*'
```

Baseline result:

| Area | Files with hits | Apply treatment |
| --- | ---: | --- |
| `openspec/specs` | 38 | Do not hand-edit during apply; delta specs cover these blocks and archive/sync cleans main specs. |
| `DPT_FRAMEWORK` | 54 | Rewrite/remove production docs, templates, engine, CLI, schemas, gate definitions, and workflow nodes. |
| `guidelines` | 7 | Rewrite stable guidance in section 13 so it teaches work-unit-mediated sub-agent execution. |
| `experiments_playbook` | 42 | Rewrite controlled E2E playbooks in section 16. |
| `tests` | 37 | Replace relay tests with work-unit claim/submit/gate/hygiene tests in section 15. |

Representative high-priority hits:

- `DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl`: legacy top-level queue slot shape.
- `DPT_FRAMEWORK/cli/drive-relay-slot.mjs`: old delegated CLI entrypoint.
- `DPT_FRAMEWORK/engine/subagent-relay*.mjs`: old relay staging/commit/collect helpers.
- `DPT_FRAMEWORK/schema/contracts/queue-slots.mjs`: old queue slot schema surface.
- `DPT_FRAMEWORK/schema/gate_definitions/gate-wave*-complete.definition.json`: old delegated provenance check names.
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`: old role/relay protocol guidance.
- `guidelines/agentic-subagent-mechanism.md`: Tier 3 Relay guidance to rewrite around work units.
- `tests/integration/cli/drive-relay-slot.test.mjs`: old driver integration test suite.
- `experiments_playbook/exp_engine-boundary/case-40*.md`: boundary playbooks to rewrite around work-unit claim/submit.

## 3. Main-Spec Requirement-Block Coverage

Command: custom requirement-block scan over `openspec/specs/**/spec.md`, matching retired delegated-work authority terms and checking exact-title coverage in the active delta specs.

Result:

```json
{
  "mainOldBearingBlocks": 132,
  "covered": 132,
  "missing": 0
}
```

Interpretation: main specs are intentionally not edited during apply. Every old-bearing accepted requirement block is covered by a `MODIFIED`, `REMOVED`, or `RENAMED` delta for archive/sync.

## 4. Governance And Archive Hygiene

Commands:

```bash
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-project-specs.mjs
openspec validate replace-subagent-relay-with-work-units --strict
```

Results:

- Requirement IDs consistent: `433 registered (37 retired, 0 orphan)`.
- Main project specs valid: `72 main spec files`, `0 violations`.
- Change validation: valid.

Additional hygiene scans:

```json
{
  "archiveFacingOldHits": 0,
  "deprecatedHeaders": 0,
  "badDeprecatedImpl": 0,
  "liveOldDescriptionHits": 0
}
```

## 5. Capability Retirement Map

| Capability | Apply/archive target |
| --- | --- |
| `delegated-work-units` | Keep as positive main-spec home for the replacement pipeline. |
| `work-unit-provenance-gate` | Keep as positive main-spec home for delegated provenance gates. |
| `relay-provenance-gate` | Retire as active capability; use only as delta removal carrier. |
| `subagent-collect` | Retire; submit and aggregate coverage live under `delegated-work-units`, `agentic-queue`, and `agent-output-declaration`. |
| `subagent-relay-driver` | Retire; positive CLI semantics live under `framework-engine` and `operate-work-unit`. |
| `subagent-repair` | Retire/absorb; positive retry and repair semantics live under work-unit terminal transitions, `agentic-queue`, and `repair-loop`. |
| `subagent-slots` | Retire; work-unit attempt state replaces slot lifecycle/path authority. |
| `subagent-directory-contract` | Keep only as work-unit envelope/directory view for the surviving sub-agent actor. |
| `subagent-dispatch` | Keep only as Engine work-unit claim producing bounded sub-agent prompts. |
| `subagent-node-contract` | Keep as task/result/receipt contract over work-unit identity. |
| `subagent-runtime-logging` | Keep as actor-runtime logging bound to work-unit nonce and optional runtime refs. |
| `cmd-subagent-environment` | Keep as environment setup; must not produce work-unit results/status/runtime output. |

## 6. Section Evidence Ledger

## 6. Surface Inventory And Cutover Map

### 6.1 Production delegated code paths

| Surface | Current files | Treatment |
| --- | --- | --- |
| Relay stage/commit/merge CLI | `DPT_FRAMEWORK/cli/drive-relay-slot.mjs` | Remove from production demand; replacement CLI is `operate-work-unit.mjs`. |
| Relay engine helpers | `DPT_FRAMEWORK/engine/subagent-relay*.mjs` | Replace with work-unit engine helpers; keep only cleanup/diagnostic references if needed. |
| Queue delegated complete | `DPT_FRAMEWORK/engine/queue-manager-ledger.mjs`, `queue-manager-lifecycle.mjs`, `operate-queue.mjs` | Move delegated successful completion to work-unit submit; keep `operate-queue complete` for non-delegated work. |
| Output declarations | `DPT_FRAMEWORK/engine/queue-manager-ledger.mjs`, gate readers/helpers | Keep bundle-root `rb_output_declarations.jsonl`; change delegated rows to work-unit fields and submit fingerprints. |
| Gate provenance | `DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs`, `check-gate-wave*.mjs`, gate definitions | Replace old check names with work-unit checks and ledger-first cross-checks. |
| File observability | `DPT_FRAMEWORK/engine/helpers/file-observability.mjs`, health checks | Treat `_work_units/waveN/{work_id}/` as production delegated runtime path; old delegated artifacts are diagnostics only. |

### 6.2 Queue schema/template/projection assumptions

| Surface | Current files | Treatment |
| --- | --- | --- |
| Queue schema | `DPT_FRAMEWORK/schema/contracts/queue.mjs`, `queue-slots.mjs` | Replace queue demand `work_id` with `queue_item_id`; queue v2 uses `active_window[]`, `refill_pool[]`, `delegated_in_flight{}`, `terminal_history[]`. |
| Queue template | `DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl` | Replace top-level `slot_1_current` / `slot_NN` template with queue v2. |
| Queue helpers | `queue-manager-core.mjs`, `queue-manager-window.mjs`, `queue-manager-render.mjs`, `queue-manager-lifecycle.mjs` | Rewrite pending count, preemption, repair, inspect, rendering, and reentry assumptions around queue v2. |
| CLI/tests | `operate-queue.mjs`, `tests/engine/queue-*`, `tests/integration/cli/operate-queue*` | Update non-delegated queue operations and reject delegated in-flight completion. |

### 6.3 Ledger and gate helpers

| Surface | Current files | Treatment |
| --- | --- | --- |
| Ledger record schema | `queue-manager-ledger.mjs` | Work-unit ledger rows include `work_id`, `queue_item_id`, `wave`, `kind`, refs, nonce, output files, cache trails, `result_hash`, `ledger_record_hash`. |
| Gate helper checks | `gate-helpers-provenance.mjs`, `gate-helpers-checks.mjs`, `gate-helpers-readers.mjs` | Implement `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, `delegated_bypass_suspected`. |
| Wave gate CLIs | `check-gate-wave0-complete.mjs`, `check-gate-wave1-complete.mjs`, `check-gate-wave2-complete.mjs` | Dispatch work-unit checks through the same rule loop as structural checks. |
| Gate definitions | `DPT_FRAMEWORK/schema/gate_definitions/gate-wave*-complete.definition.json` | Replace old delegated-provenance check names. |

### 6.4 Agent-facing docs and guidance

| Surface | Current files | Treatment |
| --- | --- | --- |
| Wave phase docs | `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`, `phase-wave1.md`, `phase-wave2.md` | Teach claim/dispatch/submit/drain/gate/refill work-unit loop. |
| Sub-agent guidance | `subagent-dpt-*.md`, `shared-subagent-protocol.md` | Rewrite as work-unit task guidance or retire old relay protocol wording. |
| Command playbooks | `DPT_FRAMEWORK/command_playbook/**` | Replace old driver/provenance docs with work-unit CLI and forensics guidance. |
| Guidelines | `guidelines/README.md`, `project-charter.md`, `agentic-*.md`, `logging-conventions.md`, `command-experiments.md` | Align stable guidance with one delegated-work path and surviving sub-agent actor. |

### 6.5 Tests and controlled E2E

| Surface | Current files | Treatment |
| --- | --- | --- |
| Relay unit/integration tests | `tests/engine/subagent-relay-*`, `tests/integration/cli/drive-relay-slot.test.mjs` | Replace with work-unit claim/submit/idempotency/timeout/gate tests. |
| Queue tests | `tests/engine/queue-*`, `tests/schema/contracts/queue.test.mjs` | Update to queue v2 and queue_item_id semantics. |
| Gate tests | `tests/engine/helpers/gate-helpers-provenance*`, `tests/integration/cli/check-gate-wave*.test.mjs` | Prove ledger-first coverage and non-work-unit rejection. |
| E2E playbooks | `experiments_playbook/exp_engine-boundary`, `exp_wfn_wave*`, `exp_wff_wave*`, `exp_system-logging`, `exp_evidence-extraction` | Rewrite around `operate-work-unit`, submitted ledger coverage, and real verdict sources. |

## 7. Section Evidence Ledger

| Section | Changed surfaces | Focused checks | Status |
| --- | --- | --- | --- |
| 4. Queue v2 | `DPT_FRAMEWORK/schema/contracts/queue.mjs`, `DPT_FRAMEWORK/schema/index.mjs`, `DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl`, `DPT_FRAMEWORK/engine/queue-manager*.mjs`, `DPT_FRAMEWORK/cli/operate-queue.mjs`, `experiments_env/shared/new-disposable-bundle.mjs`, focused queue schema/engine/CLI tests | `node --test tests/schema/contracts/queue.test.mjs`; `node --test tests/engine/queue-manager-schema.test.mjs tests/engine/queue-manager-window-lifecycle.test.mjs tests/engine/queue-manager-receipts-cli-render.test.mjs tests/engine/queue-manager-logging.test.mjs`; `node --test tests/integration/cli/operate-queue.test.mjs tests/integration/cli/operate-queue-validation.test.mjs`; `node --test tests/integration/cli/instantiate-run-bundle.test.mjs tests/integration/cli/validate-bundle.test.mjs` | Passed; residual old relay/slot ledger, gate, file-observability, playbook, and docs hits are deferred to sections 5-16 per task order. |
| 5. Work-unit core | `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`, `DPT_FRAMEWORK/schema/index.mjs`, `DPT_FRAMEWORK/engine/work-unit-core.mjs`, `DPT_FRAMEWORK/cli/operate-work-unit.mjs`, focused work-unit engine/CLI tests | `node --test tests/engine/work-unit-core.test.mjs`; `node --test tests/integration/cli/operate-work-unit.test.mjs`; `node -e "import('./DPT_FRAMEWORK/schema/index.mjs').then(m=>console.log(Boolean(m.WorkUnitIndexSchema), Boolean(m.QueueDemandItemSchema)))"`; static scan over new work-unit surfaces for removed relay/slot tokens | Passed; `operate-work-unit inspect` is wired as the first real CLI caller. Claim/submit/terminal commands are still pending sections 6-9. |
| 6. Claim/dispatch | `DPT_FRAMEWORK/engine/work-unit-core.mjs`, `DPT_FRAMEWORK/cli/operate-work-unit.mjs`, `tests/engine/work-unit-claim.test.mjs`, `tests/integration/cli/operate-work-unit.test.mjs` | `node --test tests/engine/work-unit-core.test.mjs tests/engine/work-unit-claim.test.mjs`; `node --test tests/integration/cli/operate-work-unit.test.mjs`; static scan over claim/CLI surfaces for removed relay/slot tokens | Passed; `claim --count N` claims the contiguous delegated queue-front prefix in one work-unit transaction, writes queue in-flight/index/envelope state, returns prompt refs, and zero-claim blocker creates no work-unit index. |
| 7. Task/prompt/receipt | `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`, `DPT_FRAMEWORK/schema/index.mjs`, `DPT_FRAMEWORK/engine/work-unit-core.mjs`, `tests/engine/work-unit-core.test.mjs`, `tests/integration/cli/operate-work-unit.test.mjs` | `node --test tests/engine/work-unit-core.test.mjs tests/engine/work-unit-claim.test.mjs tests/integration/cli/operate-work-unit.test.mjs`; `node -e "import('./DPT_FRAMEWORK/schema/index.mjs').then(m=>console.log(Boolean(m.WorkUnitBeaconSchema), Boolean(m.WorkUnitRuntimeReceiptEventSchema)))"`; static old-token scan over work-unit core/schema/CLI/tests | Passed; generated `task.md`, beacon, and claim spawn prompt are derived from manifest/kind contract, bind work-unit identity plus output/cache contracts, include lifecycle receipt/logging examples, and keep platform runtime IDs under optional diagnostic `runtime_refs`. Submit-time enforcement is still pending sections 8-10. |
| 8. Submit/completion | `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`, `DPT_FRAMEWORK/schema/index.mjs`, `DPT_FRAMEWORK/engine/work-unit-core.mjs`, `DPT_FRAMEWORK/cli/operate-work-unit.mjs`, `tests/engine/work-unit-submit.test.mjs`, `tests/integration/cli/operate-work-unit.test.mjs` | `node --test tests/engine/work-unit-core.test.mjs tests/engine/work-unit-claim.test.mjs tests/engine/work-unit-submit.test.mjs`; `node --test tests/integration/cli/operate-work-unit.test.mjs`; `node -e "import('./DPT_FRAMEWORK/schema/index.mjs').then(m=>console.log(Boolean(m.WorkUnitLedgerRecordSchema), Boolean(m.WorkUnitResultSchema)))"`; static old-token scan over work-unit submit surfaces | Passed; `operate-work-unit submit` validates manifest/beacon/result/runtime receipt/output/cache/queue binding/snapshot/index status before transaction, completes the bound `queue_item_id`, updates index/result/status, appends one work-unit ledger row, supports same-content idempotency, rejects different duplicate content, and lets out-of-order submits complete the correct in-flight binding. Invalid-submit diagnostic persistence is pending section 9. |
| 9. Rejection/terminal/retry | `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`, `DPT_FRAMEWORK/engine/work-unit-core.mjs`, `DPT_FRAMEWORK/cli/operate-work-unit.mjs`, `tests/engine/work-unit-submit.test.mjs`, `tests/engine/work-unit-terminal.test.mjs`, `tests/integration/cli/operate-work-unit.test.mjs` | `node --test tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs`; `node --test tests/integration/cli/operate-work-unit.test.mjs`; full work-unit focused set `node --test tests/engine/work-unit-core.test.mjs tests/engine/work-unit-claim.test.mjs tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs tests/integration/cli/operate-work-unit.test.mjs`; static old-token scan over work-unit lifecycle surfaces | Passed; invalid submit records `last_submit_rejection` and leaves claimed attempts non-terminal across missing receipt, nonce mismatch, invalid result, missing output/cache, stale snapshot, and wrong `work_id`; `fail`/`timeout`/`abandon` close attempts without ledger coverage; timeout retry requeues same demand with a new same-batch `work_id`; explicit refill opens `b001+` with `batch_reason` and lineage; late submit against terminal attempts is rejected and logged. |
| 10. Ledger/cache | `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`, `DPT_FRAMEWORK/engine/work-unit-core.mjs`, `DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs`, `DPT_FRAMEWORK/engine/helpers/ref-count.mjs`, `DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs`, `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs`, `tests/engine/work-unit-test-helpers.mjs`, focused work-unit submit/reader/ref-count/cache tests | `node --test tests/engine/helpers/gate-helpers-readers.test.mjs tests/engine/helpers/ref-count.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/work-unit-submit.test.mjs tests/integration/cli/operate-work-unit.test.mjs`; static old-token scan over section-10 changed surfaces | Passed; bundle-root `rb_output_declarations.jsonl` remains the only production delegated submission ledger, unsupported `_work_units/_ledger.jsonl` is inspect-failing, work-unit ledger rows carry submit fingerprints and are hash/index cross-checked, `readSubmittedWorkUnitDeclarations()` accepts only submitted work-unit rows, `countReferences()` ignores legacy/raw completion fixtures and Agent numeric claims, and `checkCacheCoverage()` derives cache validation from submitted work-unit rows while treating raw reference declarations without submitted rows as failure evidence. Gate provenance definition rewiring remains section 11. |
| 11. Gate provenance | `DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs`, `gate-helpers-checks.mjs`, `gate-helpers-readers.mjs`, `gate-helpers.mjs`, `DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs`, `check-gate-wave1-complete.mjs`, `check-gate-wave2-complete.mjs`, `DPT_FRAMEWORK/schema/gate_definitions/gate-wave*-complete.definition.json`, `tests/engine/work-unit-test-helpers.mjs`, focused provenance/gate CLI tests | `node --test tests/engine/helpers/gate-helpers-readers.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/helpers/gate-helpers-provenance.test.mjs tests/engine/work-unit-submit.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs`; `node --test tests/schema/gate-definition-threshold-source.test.mjs tests/integration/cli/check-gate.test.mjs`; static scan `rg -n "output_declaration_ledger_exists|output_declaration_coverage|subagent_slot_presence|relay_bypass_suspected|shared-subagent-protocol|delegated relay|relay provenance" DPT_FRAMEWORK/cli/gates DPT_FRAMEWORK/schema/gate_definitions` returned zero hits | Passed; active Wave0/Wave1/Wave2 gate definitions use `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`; gate CLIs dispatch those checks through the rule loop and use submitted work-unit rows plus `inspectWorkUnits()` for ledger/index/manifest/result/receipt/beacon/output/cache/hash cross-checks; direct filesystem artifacts, hand-written declarations, and Wave2 targeted cross references without submitted coverage fail; Wave2 pure synthesis remains free of delegated row requirements. Residual risk: legacy relay provenance helpers and old tests remain as compatibility/cleanup-only surfaces until section 14 removes or quarantines the replaced path. |
| 12. Observability/logs | `DPT_FRAMEWORK/engine/helpers/file-observability.mjs`, `DPT_FRAMEWORK/engine/work-unit-core.mjs`, `DPT_FRAMEWORK/cli/operate-work-unit.mjs`, `experiments_env/shared/health-report-schema.mjs`, `experiments_env/shared/verify-bundle-health.mjs`, focused file-observability/health/work-unit/CLI tests | `node --test tests/engine/helpers/file-observability.test.mjs tests/schema/health-report-schema.test.mjs tests/schema/verify-bundle-health.test.mjs tests/engine/work-unit-core.test.mjs tests/engine/work-unit-claim.test.mjs tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs tests/integration/cli/operate-work-unit.test.mjs`; `node --test tests/engine/helpers/gate-helpers-provenance.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs`; `openspec validate replace-subagent-relay-with-work-units --strict`; static scan over Section 12 changed surfaces for old health/relay/slot/check names | Passed; health report now exposes `work_units` lifecycle projection for claimed/submitted/failed/timed_out/abandoned/expired/retry/late-submit states and no longer has the old receipt-slot health section; file observability treats `_work_units/waveN/{work_id}/` as the delegated runtime path and classifies `_subagents/.../slot...` only in negative diagnostic tests; `operate-work-unit inspect` emits trace/log diagnostics for inspect failure, transaction mismatch, and provenance mismatch; submit emits `work_unit_ledger_appended`; health ledger/cache checks read submitted work-unit ledger rows. Residual risk: legacy relay-named helper tests and compatibility surfaces remain cleanup-only until section 14. |
| 13. Agent-facing docs/guidelines | `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`, `phase-wave1.md`, `phase-wave2.md`, `phase-rerun.md`, `subagent-dpt-source-intake.md`, `subagent-dpt-evidence-extractor.md`, `subagent-dpt-topic-scout.md`, `subagent-dpt-claim-verifier.md`, `subagent-dpt-source-diagnostic.md`, `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`, `shared-gate-rules.md`, `shared-schemas.md`, `shared-anti-cheating-rules.md`, `shared-silent-execution.md`, `DPT_FRAMEWORK/command_playbook/provenance-forensics-guide.md`, `setup-real-subagents.md`, `subagent_templates/*`, `guidelines/README.md`, `project-charter.md`, `agentic-execution-model.md`, `agentic-queue-mechanism.md`, `agentic-workflow-mechanism.md`, `agentic-subagent-mechanism.md`, `framework-runtime-boundary.md`, `logging-conventions.md`, `command-experiments.md` | `rg -n 'Relay|relay|slot|slots|slot_1|slot_2|slot_key|slotKey|_subagents|drive-relay-slot|SlotResult|commitSlotResult|operate-queue complete|complete\(|subagent-relay|MAX_CONCURRENT_SUBAGENTS|Chain → Queue → Relay' DPT_FRAMEWORK/workflows DPT_FRAMEWORK/command_playbook guidelines --glob '!_original_*'` returned only `phase-seed-topics.md` non-delegated queue completion and evidence-tier labels; `openspec validate replace-subagent-relay-with-work-units --strict` passed | Passed; Agent-facing phase docs, role specs, shared summaries, command playbooks/templates, and stable guidelines now teach one delegated path: queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate. `sub-agent` remains as actor language; old relay/slot production authority is absent from active guidance. The remaining `operate-queue complete` hit is a seed-topics non-delegated queue example, explicitly outside delegated success. Rolling guard tasks 3.7-3.10 remain open until section 14 exits. |
| 14. Removed-path validators | `DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`, `tests/integration/cli/validate-work-unit-hygiene.test.mjs`, `experiments_env/shared/run-log-lifecycle-utils.mjs`, `tests/experiments_env/shared/run-log-lifecycle-utils.test.mjs`, `DPT_FRAMEWORK/cli/check-reentry.mjs`, `tests/integration/cli/check-reentry.test.mjs`, `DPT_FRAMEWORK/engine/workflow-chain.mjs`, `tests/engine/static-regression.test.mjs`, `tests/engine/workflow-chain.test.mjs`, `tests/README.md`, Wave0/Wave1/Wave2 phase stop behavior sections | `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs --json`; `node --test tests/integration/cli/validate-work-unit-hygiene.test.mjs`; `node --test tests/experiments_env/shared/run-log-lifecycle-utils.test.mjs`; `node --test tests/engine/static-regression.test.mjs tests/engine/workflow-chain.test.mjs`; `node --test tests/integration/cli/check-reentry.test.mjs`; `node --test tests/schema/contracts/queue.test.mjs tests/engine/queue-manager-schema.test.mjs tests/engine/queue-manager-window-lifecycle.test.mjs tests/integration/cli/operate-queue.test.mjs tests/integration/cli/operate-queue-validation.test.mjs tests/integration/cli/check-reentry.test.mjs`; `node --test tests/engine/helpers/gate-helpers-provenance.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs`; `node --test tests/engine/work-unit-core.test.mjs tests/engine/work-unit-claim.test.mjs tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs tests/integration/cli/operate-work-unit.test.mjs`; focused old-authority scans over active framework/guideline/shared/test surfaces returned zero hits outside explicit validator/negative-diagnostic allowlists | Passed; `validate-work-unit-hygiene` blocks removed production authority tokens, old delegated provenance check names, old queue template identity/slot shape, delegated `operate-queue complete` wording, filesystem/index pass-coverage wording, and old relay logging context (`slotKey`, `relay_commit_*`, `relay_spawn_requested`). Production relay CLI/engine/schema files are removed; active command docs and tests route delegated completion through `operate-work-unit`. Queue demand `work_id` fallback was removed from `check-reentry`; queue schema/manager/reentry tests prove `queue_item_id` demand identity, queue v2 shape, and delegated `operate-queue complete` fail-closed behavior. Gate helper wiring is proven through real Wave0/Wave1/Wave2 gate CLIs and active gate definitions; work-unit helper wiring is proven through real `operate-work-unit` CLI claim/submit/timeout/inspect paths. Runtime log verifier utilities now filter work-unit lifecycle evidence by `work_id`/`queue_item_id`, and workflow/test references use work-unit sub-agent task terminology. Residual risk: many controlled E2E playbooks still contain old relay/slot fixtures and are intentionally deferred to section 16; `DPT_FRAMEWORK/CHANGELOG.md` keeps historical v0.3 entries until release hygiene section 17. |
| 15. Focused regression tests | `tests/schema/contracts/queue.test.mjs`, `tests/engine/queue-manager-schema.test.mjs`, `queue-manager-window-lifecycle.test.mjs`, `queue-manager-receipts-cli-render.test.mjs`, `queue-manager-logging.test.mjs`, `tests/integration/cli/operate-queue*.test.mjs`, `check-reentry.test.mjs`, `tests/engine/work-unit-core.test.mjs`, `work-unit-claim.test.mjs`, `work-unit-submit.test.mjs`, `work-unit-terminal.test.mjs`, `tests/integration/cli/operate-work-unit.test.mjs`, `tests/engine/helpers/gate-helpers-*.test.mjs`, `ref-count.test.mjs`, `file-observability.test.mjs`, `tests/schema/health-report-schema.test.mjs`, `verify-bundle-health.test.mjs`, `tests/integration/cli/exit-code-convention.test.mjs`, `validate-workflow-package.test.mjs`, `tests/integration/md/self-documenting-workflow-nodes.test.mjs`, `DPT_FRAMEWORK/engine/consistency-validator.mjs`, `tests/integration/md/self-documenting-workflow-nodes.test.mjs` | `node --test tests/schema/contracts/queue.test.mjs tests/engine/queue-manager-schema.test.mjs tests/engine/queue-manager-window-lifecycle.test.mjs tests/engine/queue-manager-receipts-cli-render.test.mjs tests/engine/queue-manager-logging.test.mjs tests/integration/cli/operate-queue.test.mjs tests/integration/cli/operate-queue-validation.test.mjs tests/integration/cli/check-reentry.test.mjs`; `node --test tests/engine/work-unit-core.test.mjs tests/engine/work-unit-claim.test.mjs tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs tests/integration/cli/operate-work-unit.test.mjs`; `node --test tests/engine/helpers/gate-helpers-readers.test.mjs tests/engine/helpers/ref-count.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/helpers/gate-helpers-provenance.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs`; `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`; `rm -rf tests/engine/.test-consistency-tmp && node --test tests/engine/consistency-validator.test.mjs && node --test tests/integration/md/self-documenting-workflow-nodes.test.mjs tests/integration/cli/validate-workflow-package.test.mjs && node --test tests/engine/helpers/file-observability.test.mjs tests/schema/health-report-schema.test.mjs tests/schema/verify-bundle-health.test.mjs tests/engine/queue-manager-logging.test.mjs tests/integration/cli/exit-code-convention.test.mjs tests/experiments_env/shared/run-log-lifecycle-utils.test.mjs tests/integration/cli/validate-work-unit-hygiene.test.mjs` | Passed; queue v2 regression covers schema shape, `queue_item_id` uniqueness, rejected queue demand `work_id`, snapshot-hash semantics, projection staleness, repair/remove-stale behavior, delegated in-flight separation, delegated `operate-queue complete` fail-closed, and reentry checks. Work-unit regression covers canonical/malformed ID parsing, kind-code registry binding, index/envelope/manifest/path consistency, claim `--count` contiguous prefix semantics, partial and zero-claim blockers, prompt refs, out-of-order submit, atomic queue completion, one ledger append, duplicate idempotency/fail-closed mismatch, invalid-submit non-terminal repairability, terminal fail/timeout/abandon idempotency and mismatch failures, same-batch retry, refill batch lineage, late-submit rejection, expired leases, uncommitted transaction journals, and CLI inspect diagnostics. Gate/ledger tests prove submitted ledger rows are authority and hand-written rows, filesystem-only outputs, index-only state, non-work-unit artifacts, mixed delegated provenance, and drifted hashes fail. Observability/log tests cover work-unit health projection, expired/retry/late-submit states, mixed provenance, transaction/provenance mismatch logging, lifecycle log filtering by work-unit identity, and CLI exit conventions. A validator drift found during this section was fixed by updating workflow package body-section contracts to require the new `## 8. Stop Behavior` work-unit phase control surface; `validate-workflow-package` now passes. Section-exit smoke commands from 3.7 are now represented by focused regression tests or final validation tasks: queue/work-unit/gate/observability/hygiene checks are in `tests/`; controlled E2E playbook execution remains section 16; full-suite/governance/version release checks remain section 17. |
| 16.1 Engine-boundary controlled E2E | `experiments_playbook/exp_engine-boundary/case-401-light-full-boundary.md`, `case-402-light-complete-reject.md`, `case-403-light-gate-content-dedup.md`, `case-404-standard-queue-boundary.md`, `case-405-light-trace-single-sink.md`, `case-406-heavy-real-subagent-boundary.md`, `experiments_env/shared/work-unit-playbook-utils.mjs`, `experiments_env/shared/run-work-unit-playbook-case.mjs`, `tests/experiments_env/shared/work-unit-playbook-utils.test.mjs`, `DPT_FRAMEWORK/cli/operate-work-unit.mjs`, `tests/integration/cli/operate-work-unit.test.mjs` | `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`; `node --test tests/experiments_env/shared/work-unit-playbook-utils.test.mjs tests/integration/cli/operate-work-unit.test.mjs`; `for c in case-401 case-402 case-403 case-404 case-405; do node experiments_env/shared/run-work-unit-playbook-case.mjs --case "$c" --target-dir tests/.test-bundles --cleanup-pass; done`; `node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-406 --target-dir tests/.test-bundles` expected exit `2` and `verdict: "NOT_RUN"` without `--real-result` | Passed; engine-boundary playbooks now call a shared controlled runner that drives real `operate-queue enqueue`, `operate-work-unit claim`, fixture output/receipt/cache writing, `operate-work-unit submit`, ledger inspection, `validate-bundle`, wave0 gate, queue-boundary rejection, and trace single-sink checks. Case 401 proves positive submit -> ledger -> validate -> gate -> inspect; case 402 proves invalid submit failures (`missing_receipt`, `missing_output`, `missing_cache`, `nonce_mismatch`, `wrong_work_id`) leave no ledger rows; case 403 proves missing ledger/orphan fail, clean pass, and URL/Jaccard/homepage dedup failures from submitted work-unit rows; case 404 proves non-delegated `operate-queue complete` remains valid while delegated active/in-flight demand rejects it with work-unit-submit advice; case 405 proves trace API, queue CLI, and work-unit claim/submit all write root `rb_trace.jsonl` with no side-channel trace sink; case 406 records explicit `NOT_RUN` without a real Agent result and can only PASS via `--real-result`. During this section a real CLI output bug was found and fixed: `operate-work-unit emit()` now writes stdout synchronously so large claim responses are not truncated at pipe boundaries; regression coverage was added. |

Follow-up on 2026-07-07: engine-boundary playbooks were reshaped to match `guidelines/command-experiments.md` authoring guidance, while preserving the same production-boundary evidence. Each case now keeps `Execution Contract`, `Reality Distance Ledger`, `Expected Runtime Path`, stable `## Step N` headings, verdict-check mapping, result interpretation, and PASS-only cleanup visible in Markdown; `case-404-standard-queue-boundary.md` maps filename cost `standard` to frontmatter `weight: light`. Verification: `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`; structure scan for `Expected Runtime Path`/`Step N`; `for c in case-401 case-402 case-403 case-404 case-405; do node experiments_env/shared/run-work-unit-playbook-case.mjs --case "$c" --target-dir tests/.test-bundles --cleanup-pass; done`; `node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-406 --target-dir tests/.test-bundles` expected exit `2`; `node --test tests/experiments_env/shared/work-unit-playbook-utils.test.mjs tests/integration/cli/operate-work-unit.test.mjs`.

Second follow-up on 2026-07-07 after user review: the engine-boundary playbooks were corrected again so the one-command runner is no longer the normative playbook execution surface. `case-401-light-full-boundary.md` now exposes and verifies the MD-controller loop step by step: create bundle, enqueue, `operate-work-unit claim`, controller reads claim JSON, fixture writes only claimed output/receipt/cache, `operate-work-unit submit`, controller reads submit JSON, `validate-bundle`, Wave0 gate JSON, work-unit inspect JSON, trace `check` recording, trace-derived verdict, and PASS-only cleanup. Cases 402-405 now describe the same controller-visible checkpoint loop for their boundary scenarios and demote `run-work-unit-playbook-case.mjs` to `Optional Automation Smoke`; case 406 remains a real-Agent checkpoint with explicit NOT_RUN when no real result exists. A real escaped-JSON parsing bug was caught while executing the visible 401 path (`echo "$CLAIM_JSON"` corrupted escaped newlines in `spawn_prompt`); the playbook now uses `printf '%s\n'` before JSON parsing. Verification: visible 401 MD-controller path executed PASS; `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`; optional smoke `case-401` through `case-405` PASS; `case-406` no-result exit `2` with `NOT_RUN`; `node --test tests/experiments_env/shared/work-unit-playbook-utils.test.mjs tests/integration/cli/operate-work-unit.test.mjs`.

Third follow-up on 2026-07-07 after a second user review of the MD/JS feedback-loop shape: cases 402-405 were expanded from checkpoint-loop prose into visible, executable Markdown controller blocks. `case-402` now shows each invalid submit as claim -> fixture defect -> submit -> read `last_submit_rejection.reason_code` -> trace check; `case-403` shows reset -> stage submitted/missing coverage -> capture gate JSON -> read `check.passed`/`inspect[]` -> trace check per scenario; `case-404` shows non-delegated queue completion, delegated active/in-flight queue-complete rejection, and schema feedback as separate checkpoints; `case-405` shows trace API, queue CLI, work-unit claim/submit, filesystem trace-sink scan, and trace verdict as separate checkpoints. The automation runner remains only an optional smoke. While rerunning 403, the smoke exposed two fixture-contract bugs: multi-reference dedup scenarios lacked per-reference cache trail mappings, then lacked submitted `artifacts/wave0/topic-a/source.yaml` coverage. Both were fixed so `content_dedup` is tested only after the fixture satisfies submit/cache/source-yaml provenance boundaries. Verification: `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary` passed; optional smoke `case-401` through `case-405` passed with `--cleanup-pass`; `case-406` without `--real-result` exited `2` and reported `NOT_RUN`.

### 16.2 Wave0 controlled E2E

Changed surfaces: `experiments_playbook/exp_wfn_wave0/case-211-heavy-wave0-happy-path.md`, `case-212-heavy-gate-fail-repair.md`, `case-213-light-happy-and-fail.md`, `experiments_env/shared/run-work-unit-playbook-case.mjs`, and `experiments_env/shared/work-unit-playbook-utils.mjs`.

Focused checks:

```bash
node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_wfn_wave0
rg -n "\brelay\b|_subagents|slot_result_ref|operate-queue\.mjs complete|\bwork_id\":|drive-relay-slot|commitSlotResult|SlotResult" experiments_playbook/exp_wfn_wave0
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-211 --target-dir tests/.test-bundles
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-212 --target-dir tests/.test-bundles --cleanup-pass
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-213 --target-dir tests/.test-bundles --cleanup-pass
node --test tests/experiments_env/shared/work-unit-playbook-utils.test.mjs tests/integration/cli/operate-work-unit.test.mjs
```

Result: passed for fixture-backed Engine coverage and `NOT_RUN` for the real-Agent canary. Wave0 playbooks now use work-unit claim/submit and submitted ledger coverage: case 211 is a heavy real-Agent source-intake canary that cannot PASS without `--real-result`; case 212 proves gate fail -> `open-batch b001` repair/refill -> repair submit -> gate pass; case 213 proves `claim --count 3`, three submitted ledger rows, Wave0 gate pass, missing receipt rejection, invalid result rejection, no ledger rows for rejected attempts, timeout retry with a new same-batch `work_id`, and orphan output rejection in an isolated disposable bundle.

During this section the 213 orphan-output negative case was isolated from the happy-path bundle because a prior Wave0 gate pass writes a deterministic handoff to Wave1; reusing that bundle masked provenance diagnostics with handoff preflight failure.

### 16.3 Wave1 controlled E2E

Changed surfaces: `experiments_playbook/exp_wfn_wave1/case-221-heavy-batch-subagent.md`, `case-222-heavy-gate-fail-repair.md`, `case-223-heavy-subagent-failure.md`, `case-224-light-happy-and-fail.md`, `experiments_env/shared/work-unit-playbook-utils.mjs`, and `experiments_env/shared/run-work-unit-playbook-case.mjs`.

Focused checks:

```bash
node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_wfn_wave1
rg -n "\brelay\b|Relay|_subagents|slot_result_ref|operate-queue\.mjs complete|operate-queue complete|\bwork_id\":|drive-relay-slot|commitSlotResult|SlotResult|subagent_slot_presence|relay_bypass|slotKey|slot_key|slot_" experiments_playbook/exp_wfn_wave1
node --test tests/experiments_env/shared/work-unit-playbook-utils.test.mjs tests/integration/cli/operate-work-unit.test.mjs
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-224 --target-dir tests/.test-bundles --cleanup-pass
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-222 --target-dir tests/.test-bundles --cleanup-pass
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-221 --target-dir tests/.test-bundles
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-223 --target-dir tests/.test-bundles
```

Result: passed for fixture-backed Engine coverage and `NOT_RUN` for real-Agent canaries. Wave1 playbooks now use work-unit claim/submit and submitted ledger coverage: case 224 proves `claim --count 2`, out-of-order submit by `work_id`, submitted ledger rows, successful seed backfill, Wave1 gate pass, missing receipt rejection without ledger append, and rejection of non-work-unit Wave1 artifacts in an isolated disposable bundle. Case 222 proves partial Wave1 coverage fails gate, `open-batch b001` repair/refill records `batch_reason`, repair submit covers the missing topic, and the next Wave1 gate passes with fail-then-pass gate attempts in trace. Cases 221 and 223 are heavy real-Agent canaries and correctly report `NOT_RUN` without `--real-result`, so fixture data cannot masquerade as real `dpt-evidence-extractor` behavior.

During this section a real fixture-quality bug was found by the Wave1 gate: the first two-topic fixture references were near-clones and failed `content_dedup` with a Jaccard diagnostic. The fixture helper was corrected to generate topic-specific Key Facts and core content while preserving the declared reality distance: fixture-backed Engine evidence only, not Agent research quality proof. The Wave1 scaffold also now writes a route-bound witnessed handoff using the actual trace index, because gate preflight rejects hand-written, unbound `load_complete` events.

### 16.4 Wave2 controlled E2E

Changed surfaces: `experiments_playbook/exp_wfn_wave2/case-231-heavy-synthesis-happy-path.md`, `case-232-heavy-finding-triage.md`, `case-233-heavy-gate-fail-repair.md`, `case-234-heavy-subagent-search.md`, `case-235-light-happy-and-fail.md`, `experiments_env/shared/work-unit-playbook-utils.mjs`, and `experiments_env/shared/run-work-unit-playbook-case.mjs`.

Focused checks:

```bash
node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_wfn_wave2
rg -n "\brelay\b|Relay|_subagents|slot_result_ref|drive-relay-slot|commitSlotResult|SlotResult|subagent_slot_presence|relay_bypass|slotKey|slot_key|slot_" experiments_playbook/exp_wfn_wave2
rg -n "\bwork_id\":" experiments_playbook/exp_wfn_wave2
node --test tests/experiments_env/shared/work-unit-playbook-utils.test.mjs tests/integration/cli/operate-work-unit.test.mjs
node --test tests/integration/cli/check-gate-wave2-complete.test.mjs
for c in case-231 case-233 case-235; do node experiments_env/shared/run-work-unit-playbook-case.mjs --case "$c" --target-dir tests/.test-bundles --cleanup-pass; done
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-232 --target-dir tests/.test-bundles # expected exit 2 / NOT_RUN
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-234 --target-dir tests/.test-bundles # expected exit 2 / NOT_RUN
```

Result: passed for fixture-backed Engine coverage and `NOT_RUN` for real-Agent canaries. Wave2 playbooks now make the split explicit: case 231 proves pure synthesis/backfill is non-delegated main-Agent queue work and the Wave2 gate passes with zero submitted Wave2 work-unit rows; case 235 proves pure synthesis passes without delegated rows, direct `reference/00-cross-*.md` targeted evidence fails without submitted coverage, and the same targeted output passes only after `wave2_targeted_evidence` claim/submit by `work_id`; case 233 proves gate failure for uncovered targeted evidence, `open-batch b001` repair/refill with `batch_reason`, submitted repair coverage, and fail-then-pass Wave2 gate attempts. Cases 232 and 234 are heavy real-Agent canaries for semantic finding triage and real `dpt-topic-scout` targeted search; they correctly report `NOT_RUN` without real Agent artifacts/results, so fixture data cannot masquerade as real Wave2 reasoning or search quality.

Scan note: the old-authority scan over Wave2 playbooks has zero relay/slot/path hits and zero queue-demand `"work_id"` hits. It still sees two literal `operate-queue.mjs complete` commands in case 231; these are intentionally non-delegated synthesis/backfill queue completions and are not delegated production authority. The delegated targeted evidence path in Wave2 uses only `operate-work-unit claim/submit`.

### 16.5 Wave-chain full-chain and repair-loop controlled E2E

Changed surfaces: `experiments_playbook/exp_wff_wave-chain/case-151-standard-waves-full-chain.md`, `case-152-standard-wave-repair-loop.md`, and optional smoke support in `experiments_env/shared/run-work-unit-playbook-case.mjs`.

Focused checks:

```bash
node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_wff_wave-chain
rg -n "\brelay\b|Relay|_subagents|slot_result_ref|drive-relay-slot|commitSlotResult|SlotResult|subagent_slot_presence|relay_bypass|slotKey|slot_key|slot_" experiments_playbook/exp_wff_wave-chain/case-151-standard-waves-full-chain.md experiments_playbook/exp_wff_wave-chain/case-152-standard-wave-repair-loop.md
rg -n "operate-queue\.mjs complete|operate-queue complete|slot_result_ref|\"work_id\":" experiments_playbook/exp_wff_wave-chain/case-151-standard-waves-full-chain.md experiments_playbook/exp_wff_wave-chain/case-152-standard-wave-repair-loop.md
node --check experiments_env/shared/run-work-unit-playbook-case.mjs
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-151 --target-dir tests/.test-bundles --cleanup-pass
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-152 --target-dir tests/.test-bundles --cleanup-pass
node --test tests/experiments_env/shared/work-unit-playbook-utils.test.mjs tests/integration/cli/operate-work-unit.test.mjs
```

Result: passed. `case-151` now proves the full chain through real lifecycle handoffs and gate CLIs: setup gate, `enter-phase`/`advance-status` into seed topics, seed gate, Wave0 work-unit claim/submit, Wave0 drain probe (`phase_drained: true`) before gate, Wave1 work-unit claim/submit, Wave1 drain before gate, and Wave2 pure synthesis/backfill with zero Wave2 work-unit rows plus Wave2 drain before gate. The full-chain proof no longer hand-writes delegated ledger rows or uses old relay/slot fields.

`case-152` now proves the repair-loop mechanism through Wave2 targeted evidence: the initial gate fails for a direct `reference/00-cross-*.md` targeted evidence output, `operate-work-unit open-batch --reason gate_failure_refill` records `batch_id: b001` and `batch_reason`, the repair targeted evidence is claimed/submitted through `operate-work-unit`, the phase drains again, and the repaired Wave2 gate passes. The playbook explicitly treats the runner as optional smoke; the Markdown controller still shows each Agent-visible CLI feedback point.

Residual scan note: a directory-wide old-authority scan over `experiments_playbook/exp_wff_wave-chain` still reports legacy hand-written ledger rows in `case-153-standard-wave-fault-tolerance.md` and `case-154-standard-wave-review-surface.md`. Those files are not part of task 16.5; `case-153` is the next fault-tolerance E2E target under 16.6, and `case-154` remains review-surface cleanup/follow-on work.

### 16.6 Wave-chain fault-tolerance controlled E2E

Changed surfaces: `experiments_playbook/exp_wff_wave-chain/case-153-standard-wave-fault-tolerance.md` and optional smoke support in `experiments_env/shared/run-work-unit-playbook-case.mjs`.

Focused checks:

```bash
node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_wff_wave-chain
rg -n "\brelay\b|Relay|_subagents|slot_result_ref|drive-relay-slot|commitSlotResult|SlotResult|subagent_slot_presence|relay_bypass|slotKey|slot_key|slot_" experiments_playbook/exp_wff_wave-chain/case-153-standard-wave-fault-tolerance.md
rg -n "operate-queue\.mjs complete|operate-queue complete|slot_result_ref|\"work_id\":" experiments_playbook/exp_wff_wave-chain/case-153-standard-wave-fault-tolerance.md
node --check experiments_env/shared/run-work-unit-playbook-case.mjs
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-153 --target-dir tests/.test-bundles --cleanup-pass
node --test tests/experiments_env/shared/work-unit-playbook-utils.test.mjs tests/integration/cli/operate-work-unit.test.mjs
node --test tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs tests/integration/cli/operate-work-unit.test.mjs
```

Result: passed. `case-153` now exposes the fault-tolerance proof as Markdown-controlled checkpoints, with the runner kept as optional automation smoke rather than normative orchestration. The playbook creates separate disposable bundles for invalid submit, fail/late submit, timeout retry, abandon, duplicate submit, stale binding, and mixed provenance. Each bundle uses real `operate-work-unit` claim/submit/fail/timeout/abandon transitions or the real Wave1 gate; fixture files only stand in for sub-agent output after a real claim. The final trace verdict re-reads saved CLI/gate JSON evidence for every scenario before recording checks, so timeout/abandon/duplicate/stale results are not treated as implicit success.

Coverage proven: missing receipt and invalid result reject non-terminally with no ledger append; explicit fail closes without queue completion and late submit emits `work_unit_late_submit_rejected`; timeout retry requeues the same demand and allocates a different same-batch `work_id`; abandon is idempotent and mismatched terminal repeat rejects; same-content duplicate submit is idempotent while changed duplicate content rejects with one ledger row preserved; stale manifest/snapshot binding rejects non-terminally with no ledger append; mixed submitted Wave1 output plus direct Wave1 artifact fails the Wave1 gate.

Scan note: the `case-153` old-authority scans now return zero hits. A directory-wide scan over `experiments_playbook/exp_wff_wave-chain` still reports one old hand-written ledger line in `case-154-standard-wave-review-surface.md`; that review-surface cleanup remains outside 16.6 and is tracked as later controlled-E2E hygiene.

### 16.7 Evidence-extraction controlled E2E

Changed surfaces: `experiments_playbook/exp_evidence-extraction/README.md`, `case-161-light-complete-cache-trails.md`, `case-162-standard-gate-reentry-cache-coverage.md`, `case-163-heavy-rerun-add-real-cache-trail.md`, optional smoke support in `experiments_env/shared/run-work-unit-playbook-case.mjs`, and `DPT_FRAMEWORK/cli/check-reentry.mjs`.

Focused checks:

```bash
node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_evidence-extraction
rg -n "\brelay\b|Relay|_subagents|slot_result_ref|drive-relay-slot|commitSlotResult|SlotResult|subagent_slot_presence|relay_bypass|slotKey|slot_key|slot_" experiments_playbook/exp_evidence-extraction
rg -n "operate-queue\.mjs complete|operate-queue complete|slot_result_ref|\"work_id\":" experiments_playbook/exp_evidence-extraction
node --check experiments_env/shared/run-work-unit-playbook-case.mjs
node --check DPT_FRAMEWORK/cli/check-reentry.mjs
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-161 --target-dir tests/.test-bundles --cleanup-pass
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-162 --target-dir tests/.test-bundles --cleanup-pass
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-163 --target-dir tests/.test-bundles # expected exit 2 / NOT_RUN
node --test tests/experiments_env/shared/work-unit-playbook-utils.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/check-reentry.test.mjs
node --test tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/helpers/file-observability.test.mjs tests/engine/helpers/ref-count.test.mjs tests/schema/verify-bundle-health.test.mjs
```

Result: passed for fixture-backed Engine and standard disposable-bundle coverage, with explicit `NOT_RUN` for the heavy real-Agent canary. The evidence-extraction suite now maps three proof roles in its README: case 161 proves work-unit submit cache-trail validation and invalid cache rejection; case 162 proves submitted work-unit rows drive `count_floor`, `cache_coverage`, file-observability `cache_gap`, `check-reentry`, and heavy health drift diagnostics; case 163 proves the real-Agent canary cannot PASS from fixtures and requires a real rerun `action:add` work unit result before submit/gate/reentry/health/metric checks can pass.

`case-161` and `case-162` keep Markdown as the controller: each verdict-affecting checkpoint is visible as a step, while inline JS only stages deterministic fixture/checkpoint actions after real work-unit claim and reads real Engine feedback. The optional runner remains smoke-only. `case-163` was rewritten away from queue-slot completion and now exposes the real path: rerun scaffold -> `operate-work-unit claim` -> Agent executes `_work_units/wave0/{work_id}/task.md` -> no-result `NOT_RUN` checkpoint -> `operate-work-unit submit` by `work_id` -> Wave0 gate -> `check-reentry` -> heavy health -> quality metrics. The quality metric step records cache trail coverage, grounding spot-check, URL precision, countable rate, and gap rate as trace checks derived from submitted rows and cache files.

During this section a real CLI output bug was fixed in `DPT_FRAMEWORK/cli/check-reentry.mjs`: large JSON output now writes synchronously to stdout to avoid truncation. The same file was already converted to queue v2 conflict auditing, so reentry diagnostics report `queue_item_id` and queue v2 locations instead of old slot positions.

Scan note: old-authority and semantic scans over `experiments_playbook/exp_evidence-extraction` return zero hits. Heavy case `case-163` without `--real-result` intentionally preserves a diagnostic bundle and exits `2`; this is residual real-Agent behavior proof still deferred until a genuine Agent/sub-agent result is supplied.

### 17.1-17.2 Release version surfaces

Changed surfaces: `CHANGELOG.md`, `DPT_FRAMEWORK/CHANGELOG.md`, and `DPT_FRAMEWORK/RUN.md`.

Focused checks:

```bash
rg -n "DPT_FRAMEWORK v0\.5|DPT_FRAMEWORK v0\.4|## v0\.4|## v0\.3|v0\.3 -> v0\.4" CHANGELOG.md DPT_FRAMEWORK/CHANGELOG.md DPT_FRAMEWORK/RUN.md openspec/changes/replace-subagent-relay-with-work-units/tasks.md
node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs --json
```

Result: passed. Root `CHANGELOG.md` now has a `v0.4` entry summarizing the delegated mechanism replacement. `DPT_FRAMEWORK/CHANGELOG.md` keeps its existing `v0.4` handoff-witnessing release notes and adds the work-unit pipeline, queue/work identity, provenance/gate, and E2E/regression coverage bullets. `DPT_FRAMEWORK/RUN.md` is aligned to `DPT_FRAMEWORK v0.4` and its entry instructions now state the delegated path as `operate-work-unit claim` -> `_work_units/` sub-agent task -> `operate-work-unit submit` -> submitted ledger row -> gate, with `operate-queue complete` reserved for non-delegated queue work.

Scan note: `DPT_FRAMEWORK/RUN.md` previously advertised `v0.5`; this was inconsistent with the active change target `v0.3 -> v0.4`, so the release banner was corrected to `v0.4`. Historical old-mechanism tokens remain in changelog history and will be classified by the final hygiene task as historical/cleanup context rather than active production guidance.

### 17.3 Final old-token and semantic hygiene

Changed surfaces: `experiments_playbook/RUN_EXPS.md`, `experiments_playbook/README.md`, `experiments_playbook/exp_engine-boundary/case-402-light-complete-reject.md`, `experiments_playbook/exp_engine-boundary/case-404-standard-queue-boundary.md`, and `experiments_playbook/exp_wfn_wave1/case-224-light-happy-and-fail.md`.

Checks:

```bash
node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs --json
node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary
node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_wfn_wave1
node - <<'NODE'
// Split experiments_playbook/RUN_EXPS.md at Legacy/backlog and count removed-authority hits.
NODE
```

Result: passed for active production hygiene. `validate-work-unit-hygiene` reports `issue_count: 0`. The active part of `experiments_playbook/RUN_EXPS.md` has zero removed-authority hits after the runner manifest was corrected to describe the current work-unit cases as claim/submit/ledger/gate evidence. The same file now places old queue-slot, old relay, old hand-written ledger, and legacy JS-helper playbooks in a `Legacy/backlog` section that is skipped by default and explicitly cannot prove the current work-unit production path. This avoids treating known stale playbooks as current E2E failures while preserving them as migration backlog.

Additional playbook cleanup: active current cases no longer describe the new path using old "delegated completion" wording. The remaining current phrases such as "non-delegated complete" refer to the surviving `operate-queue complete` boundary for main-agent queue work, not delegated work-unit success.

Classified remaining old-token hits:

- `openspec/specs/**`: accepted main specs intentionally still contain old relay/slot requirement blocks until archive/sync; the apply coverage scan already proved exact-title delta coverage for old-bearing blocks.
- `openspec/governance/req-registry.yaml`: RPG/SRD/SUC/SUR/SUS entries are deprecated carriers; SUD/SDC/SNC/SRL/CSE remain actor/environment capabilities rewritten around work-unit identity. Per 2.11, apply verified that governance prefix/group metadata must not be moved to `no spec directory` while the corresponding production requirements still exist in active main specs.
- `CHANGELOG.md` and `DPT_FRAMEWORK/CHANGELOG.md`: old terms appear only in historical release notes.
- `tests/**`: old terms appear in negative validator tests, deprecated-row fixtures, or legacy compatibility labels such as `legacy_trace`.
- `experiments_playbook/**`: remaining old hits are classified as `Legacy/backlog` in `RUN_EXPS.md` (`exp_agentic-queue`, old system-logging relay cases, old wave-gate fixtures, old file-observability fixtures, `exp_subagent`, and the legacy handoff JS helper) or as negative/direct-orphan checks that prove current gates reject non-work-unit delegated evidence.

2.11 apply verification note: a scan still finds retired old capability directories in active main specs (`relay-provenance-gate`, `subagent-collect`, `subagent-relay-driver`, `subagent-repair`, `subagent-slots`) because this change deliberately uses delta specs during apply and leaves main-spec mutation to archive/sync. The apply-time conclusion is recorded here: changing governance prefixes/groups to `no spec directory` now would be premature. The actual archive/sync completion gate is tracked separately as task 18.1.

### 17.4 Focused unit/integration regression

Focused checks:

```bash
node --test tests/schema/contracts/queue.test.mjs tests/engine/queue-manager-schema.test.mjs tests/engine/queue-manager-window-lifecycle.test.mjs tests/engine/queue-manager-receipts-cli-render.test.mjs tests/engine/queue-manager-logging.test.mjs tests/integration/cli/operate-queue.test.mjs tests/integration/cli/operate-queue-validation.test.mjs tests/integration/cli/check-reentry.test.mjs
node --test tests/engine/work-unit-core.test.mjs tests/engine/work-unit-claim.test.mjs tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs tests/integration/cli/operate-work-unit.test.mjs
node --test tests/engine/helpers/gate-helpers-readers.test.mjs tests/engine/helpers/ref-count.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/helpers/gate-helpers-provenance.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs
rm -rf tests/engine/.test-consistency-tmp
node --test tests/engine/consistency-validator.test.mjs tests/integration/md/self-documenting-workflow-nodes.test.mjs tests/integration/cli/validate-workflow-package.test.mjs tests/engine/helpers/file-observability.test.mjs tests/schema/health-report-schema.test.mjs tests/schema/verify-bundle-health.test.mjs tests/integration/cli/exit-code-convention.test.mjs tests/experiments_env/shared/run-log-lifecycle-utils.test.mjs tests/integration/cli/validate-work-unit-hygiene.test.mjs tests/experiments_env/shared/work-unit-playbook-utils.test.mjs
```

Result: passed. Counts reported by the four slices were `89`, `34`, `110`, and `127` passing tests respectively, with zero failures. Coverage includes queue v2 identity/location/projection/reentry/repair behavior, work-unit ID/index/envelope/claim/submit/terminal/retry/inspect behavior, submitted-ledger-first gate/cache/ref-count provenance, direct/orphan/mixed delegated-provenance rejection, workflow package self-documenting work-unit guidance validation, file observability, health projections, lifecycle log filtering by work-unit identity, hygiene validation, optional work-unit playbook utilities, and CLI exit-code conventions.

### 17.5 Controlled E2E playbooks

Controlled E2E execution used the updated playbooks through real framework CLIs and disposable bundles. PASS verdicts came from the playbook runner reading trace JSONL, gate JSON, work-unit/queue CLI JSON, and playbook verdict artifacts; fixture-backed cases remain Engine-path evidence, not proof of real Agent search or writing quality.

Commands:

```bash
for c in case-401 case-402 case-403 case-404 case-405 case-212 case-213 case-222 case-224 case-231 case-233 case-235 case-151 case-152 case-153 case-161 case-162; do
  node experiments_env/shared/run-work-unit-playbook-case.mjs --case "$c" --target-dir tests/.test-bundles --cleanup-pass
done

for c in case-211 case-221 case-223 case-232 case-234 case-406 case-163; do
  node experiments_env/shared/run-work-unit-playbook-case.mjs --case "$c" --target-dir tests/.test-bundles
  # expected exit 2 / NOT_RUN without a real Agent result
done
```

Result: passed for the 17 current runnable fixture/standard cases (`401`, `402`, `403`, `404`, `405`, `212`, `213`, `222`, `224`, `231`, `233`, `235`, `151`, `152`, `153`, `161`, `162`) and returned expected `NOT_RUN` / exit `2` for the 7 heavy real-Agent canaries (`211`, `221`, `223`, `232`, `234`, `406`, `163`). The NOT_RUN bundles are retained as diagnostic evidence that these cases cannot PASS from fixtures alone.

Two initial shell-wrapper errors were corrected and are not mechanism failures: the first zsh invocation passed the full PASS case list as one `--case` value, and the first NOT_RUN loop used zsh's read-only `status` variable after one expected NOT_RUN. The corrected loops above ran each case independently and confirmed the intended PASS/NOT_RUN outcomes.

### 17.6 Full regression suite

Command:

```bash
npm test
```

Initial result: failed with `1090/1111` passing tests. The failure was not in the work-unit Engine core; it exposed an Agent-facing Markdown/checker contract drift. Wave0/Wave1/Wave2 phase docs had been rewritten around work-unit claim/submit/drain/gate semantics but had lost the uniform lifecycle section headings expected by the executable workflow validators, while validators/tests still held old Wave-specific headings such as `## 3. Fill Queue`.

Fix applied: restored Wave0/Wave1/Wave2 to the uniform 9-section lifecycle control surface (`Allowed Actions`, `Expected Artifacts`, `Gate Command`, `On Gate Pass`, `On Gate Fail`, `Stop Behavior`, `Anti-Cheating Rules`), preserved the work-unit substructure inside §3/§7, added explicit `enter-phase --node <check.next>` then `advance-status --to <source_gate>` handoff instructions, restored trace-event anchors (`wave0_completion`, `wave1_completion`, `wave2_completion`), and updated `consistency-validator` plus self-documenting workflow tests to validate the new uniform lifecycle shape rather than the retired Wave-specific section titles.

Focused repair checks:

```bash
node --test tests/integration/cli/check-gate.test.mjs tests/integration/cli/transition-integrity.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs tests/integration/md/phase-wave2-md-structure.test.mjs tests/integration/md/phase-wave2-queue-loop.test.mjs
node DPT_FRAMEWORK/cli/validate-workflow-package.mjs
node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs --json
node --test tests/engine/consistency-validator.test.mjs tests/integration/cli/validate-workflow-package.test.mjs tests/integration/md/self-documenting-workflow-nodes.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs tests/integration/md/phase-wave2-md-structure.test.mjs tests/integration/md/phase-wave2-queue-loop.test.mjs
```

Final result: `npm test` passed with `1111` tests, `252` suites, `1111` pass, `0` fail, `0` skipped, and `0` todo. This proves the full regression surface is aligned with the work-unit mechanism and the Markdown-as-Agent-control-plane contract.

### 17.7 Governance and strict validation

Commands:

```bash
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-project-specs.mjs
openspec validate replace-subagent-relay-with-work-units --strict
```

Result: passed. Requirement registry check reported `433 registered (37 retired, 0 orphan), 679 occurrences in main specs/active deltas`; project specs check reported `72 main spec files`, `0 violations`; strict OpenSpec validation reported the change valid.

### 17.8 Main spec `> req:` header drift check

Drift checked: IDs removed from requirement titles by this change must still be declared in the main spec `> req:` header before governance is treated as complete, especially `GSK-008`, `LOG-006`, and `LOG-007`.

Command:

```bash
node - <<'NODE'
// Check main spec headers for GSK-008, LOG-006, LOG-007.
NODE
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-project-specs.mjs
openspec validate replace-subagent-relay-with-work-units --strict
```

Result: one real drift was found and repaired. `openspec/specs/gate-skeleton/spec.md` already declared `GSK-008` in its header. `openspec/specs/logger/spec.md` still carried `LOG-006` and `LOG-007` only in title/prose occurrences, so its header was updated from `LOG-001..LOG-005` to `LOG-001..LOG-007`. After repair, the targeted header check passed and governance/strict validation passed again; requirement registry count rose from `679` to `681` occurrences because `LOG-006` and `LOG-007` are now declared in the main header.

### 17.9 Residual risk note

Mechanism proof: regression tests, gate CLI tests, hygiene validators, workflow package validation, and controlled E2E fixture/standard cases prove the deterministic mechanism: queue demand item -> work unit -> sub-agent task envelope -> submit -> submitted ledger row -> gate. They also prove fail-closed behavior for delegated `operate-queue complete`, invalid submit, missing receipt/output/cache, stale binding, duplicate content mismatch, timeout/fail/abandon, late submit, direct/orphan artifacts, hand-written rows, mixed provenance, and filesystem/index-only coverage.

Real Agent behavior proof: heavy canaries are intentionally not overclaimed. Cases `211`, `221`, `223`, `232`, `234`, `406`, and `163` returned `NOT_RUN` without real Agent results, preserving the boundary that fixture-backed Engine evidence does not prove real WebSearch/WebFetch quality, semantic synthesis, topic triage quality, or native sub-agent reliability. Real Agent behavior remains proven only when a genuine Agent/sub-agent executes the generated work-unit task and submits a real result.

Negative diagnostic coverage: preserved NOT_RUN/FAIL diagnostic bundles and regression negative cases are useful evidence that the system rejects unsupported paths. They do not count as production success evidence, and leftover diagnostic bundles under `tests/.test-bundles` should be treated as failure/diagnostic state, not as current run state.

Deferred risks: accepted main specs still contain old relay/slot requirement blocks until archive/sync applies the delta specs. Legacy/backlog playbooks remain classified as non-current in `experiments_playbook/RUN_EXPS.md`; they cannot prove the current work-unit path and should either be migrated by a follow-on change or stay skipped. The governance prefix move to deprecated `no spec directory` form must wait until archive/sync removes retired capability directories from active main specs; that post-apply boundary is now isolated as task 18.1.

### 17.10 Guidelines semantic scan

Commands:

```bash
rg -n "\brelay\b|Relay|\bslot(?:s|Key)?\b|slot_|_subagents|drive-relay-slot|SlotResult|commitSlotResult|stageSubagentSlots|collectAndMergeSubagentResults|subagent_slot_presence|relay_bypass|relay_commit|MAX_CONCURRENT_SUBAGENTS|Chain → Queue → Relay" guidelines --glob '!_original_*'
rg -n "sub-agent|Sub-agent|subagent|Subagent" guidelines --glob '!_original_*'
node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs --json
```

Result: passed. The removed relay/slot authority scan over active `guidelines/` returned zero hits. The remaining Sub-agent/subagent references are actor references: guideline filenames, work-unit-mediated Sub-agent execution, bounded task execution, native Agent/sub-agent behavior in experiment guidance, or explicit statements that Sub-agents do not mutate queue state, append ledgers, run gates, or authorize completion. `validate-work-unit-hygiene` also passed with `issue_count: 0`.

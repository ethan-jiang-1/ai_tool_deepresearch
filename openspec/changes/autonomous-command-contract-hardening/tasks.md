## 0. Apply Reading Contract And Discovery Protocol

- [ ] 0.1 Read this change before any target edits: `proposal.md`, `design.md`, every delta spec under `specs/*/spec.md`, then this `tasks.md`. Treat `design.md` decisions D0-D7 as apply constraints, not background prose.
- [ ] 0.2 Confirm `harden-phase-handoff-witnessing` has been archived and read the accepted main specs it changed, especially `cli-phase-transition`, `workflow-node-contract`, `gate-skeleton`, `silent-wave-execution`, and `agent-testing`. This is a context-only baseline read: use accepted specs as authority; do not reopen the archived change or copy archived rationale into target docs unless a delta in this change requires it.
- [ ] 0.3 Keep the delta-to-main-spec rule explicit: main specs may be changed only through this change's delta specs. If apply discovers terminology or exit-code drift in an accepted spec not covered by the current bridge deltas, update this change's delta specs and requirement registry first, then update tasks, then continue target edits.
- [ ] 0.4 Use the unknown-unknown routing rule when new gaps appear:
  - accepted spec wording/semantics drift -> add or modify a delta spec in this change;
  - Agent-facing docs/playbooks drift -> update docs and add/adjust static regression coverage;
  - runtime behavior mismatch with accepted docs -> record as known drift/exception unless this change already has a behavior task;
  - desired runtime behavior change outside current public interfaces -> do not implement here; record a future OpenSpec change candidate;
  - validator false positive/false negative -> adjust allowlist/phrase class and document why in the test.
- [ ] 0.5 Do not treat framework docs as the Source of Record. Framework docs are demand-side wiring for the Agent; accepted specs plus executable tests own the contract.
- [ ] 0.6 If task order must change during apply, edit this file with the reason before continuing. Do not silently skip sections because a wording fix looks small.
- [ ] 0.7 Apply may touch target surfaces named below, but pre-apply polishing is limited to this change directory. If a validation check fails solely because registry, main-spec, framework, test, backlog, or guidance surfaces need updates, record that as apply/archive preflight work rather than editing outside `openspec/changes/autonomous-command-contract-hardening/` during polish.

## 1. Delta Spec And Main-Spec Alignment

- [ ] 1.1 Verify this change's delta requirement IDs are registered and validate. New capabilities: `ACS-001..004`, `CLE-001..004`. Bridge deltas: `CPT-005`, `WNC-011`, `GSK-009`, `SWE-004`, `RUE-005`, `WDC-011`, `CMI-005`, `IOC-004`, `LOC-011`, `RRD-006`, `CDP-004`, plus modified `RUE-001`, `WDC-007`, `SWE-001`, `RES-004`, `SHC-006`, and `RWG-010`.
- [ ] 1.2 Treat accepted requirements referenced during apply, such as `VEM-002`, `VEM-003`, and `VEM-004`, as reused authority from accepted specs rather than new delta requirements in this change. Do not add VEM deltas here unless apply discovers a version-management semantic change.
- [ ] 1.3 Review accepted specs for terms that this change intentionally standardizes: `phase transition`, `phase handoff`, `work completion`, `witnessing`, `autonomous continuation`, `stop: no`, `Agent/operator`, `operator/Agent`, `exit code`, `structured stdout`, `advice[]`, `Final`, and `post-final feedback`.
- [ ] 1.4 Ensure the bridge deltas cover every accepted-spec owner touched by this change:
  - `cli-phase-transition`: state transition vs handoff vs work completion vs witnessing;
  - `workflow-node-contract`: lifecycle gate-pass wording and entry-not-completion boundary;
  - `gate-skeleton`: gate CLI exit-code convention and advice channel;
  - `silent-wave-execution`: no implicit human/operator co-runner, HITL1/HITL2 as the only interactive in-run checkpoints, and Final as terminal non-interactive delivery only;
  - `run-entry`: entry trigger plus current version banner rule;
  - `workflow-directory-contract`: command_playbook audience and anti-mixing wording;
  - `cmd-bundle-instantiation`: bundle name as Agent-derived/already-supplied input;
  - `cli-inspect-output-conventions`, `logging-conventions`, `runtime-reentry-debuggability`: non-gate CLI exception classes.
  - `content-delivery-phase-content`: Final terminal non-interactive delivery vs post-final HITL2 feedback routing.
  - `research-styles`, `shared-node-content`, `research-wave-gate-implementation`: edge accepted-spec wording that previously used broad `phase transition` language for degradation, shared-node hidden phase instructions, or wave gate boundary authorization.
- [ ] 1.5 If a new bridge delta is added, also update `proposal.md`, `design.md`, this tasks file, and `openspec/governance/req-registry.yaml`; rerun OpenSpec validation before target edits continue.
- [ ] 1.6 Archive readiness rule: this change is not ready to archive unless both new capabilities and all bridge deltas can sync into main specs without leaving contradictory old wording in the same capability.

## 2. Guidance Terminology Canon

- [ ] 2.1 Update guidance terminology canon in `guidelines/agentic-execution-model.md` and/or `guidelines/README.md` glossary for `phase transition`, `phase handoff`, `work completion`, `witnessing`, and `autonomous continuation` (ACS-004, CPT-005).
- [ ] 2.2 If Tier-1 detail needs a narrower home, update `guidelines/agentic-workflow-mechanism.md` to state that `enter-phase` / `load_complete` proves entry into the target Markdown control surface, not target-phase work completion (CPT-005, WNC-011).
- [ ] 2.3 Preserve guidance authority boundaries: guidance may define terminology and reading routes, but must not invent runtime behavior, override accepted specs, introduce a JS lifecycle walker, or describe future behavior as current fact.
- [ ] 2.4 Keep the wording short enough for Agents to absorb. Detailed rationale belongs in this change's design/proposal or backlog closure notes, not in every runtime-facing document.

## 3. Agent-Facing Command Surface

- [ ] 3.1 Update `DPT_FRAMEWORK/COMMANDS.md` with a top-level audience contract before command tables: commands are Agent-facing; HITL1/HITL2 are the only interactive in-run checkpoints; Final is terminal non-interactive delivery, not a third interaction checkpoint, progress report, confirmation loop, or Final-owned repair loop; post-final feedback re-enters through HITL2 repair/rerun; the pre-pipeline trigger only selects the entry path and transfers control to the Agent (ACS-001, ACS-002, RUE-005, CDP-004).
- [ ] 3.2 Update `DPT_FRAMEWORK/RUN.md` so reading/dragging/pasting it means DPT_FRAMEWORK has been selected. Remove or explicitly label any pre-pipeline routing exception, and do not ask whether to use the framework after this entry surface has been selected (ACS-002, RUE-005).
- [ ] 3.3 Update `DPT_FRAMEWORK/README.md` and directory descriptions so `command_playbook/` is Agent-facing command guidance or diagnostic/maintenance guidance, not `Agent/operator` co-runner instructions (ACS-001, WDC-007, WDC-011).
- [ ] 3.4 Update `DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md` so bundle `<name>` is Agent-derived from the research request or already supplied before execution. Do not require the user to provide a name during autonomous execution (ACS-002, CMI-005).
- [ ] 3.5 Sweep `DPT_FRAMEWORK/command_playbook/*.md` and relevant phase/shared Markdown for mid-pipeline human-presence fiction: unqualified `Agent/operator`, user-provided bundle naming, vague one-line confirmation, progress report framing, or "continue?" fallback outside HITL1/HITL2.
- [ ] 3.6 When adding terminology callouts to command docs, keep them as short operating notes. Do not turn `COMMANDS.md` into the terminology canon; point to guidance/specs for deeper rationale.

## 4. CLI Exit-Code Convention And Exception Inventory

- [ ] 4.1 Update `DPT_FRAMEWORK/COMMANDS.md` with a discoverable exit-code convention: canonical interpretation / target convention for `0/1/2`, structured stdout as primary decision surface, gate/non-gate/log-event categories, known drift, current non-gate utility exceptions, and advice-not-exit-code wording (CLE-001, CLE-002, CLE-003).
- [ ] 4.2 Update `DPT_FRAMEWORK/cli/README.md` to match the top-level convention while preserving gate-specific details such as `routing.kind`, `check.next`, `inspect[]`, and `advice[]` (CLE-001, GSK-009).
- [ ] 4.3 Audit current CLI docs/headers/comments for known classes: gate CLIs, utility CLIs, `log-event.mjs`, `check-reentry.mjs`, inspect-wave tools, and `validate-workflow-package.mjs`. Record doc/code drift honestly; do not normalize behavior in prose unless this change explicitly changes behavior (CLE-003, IOC-004, LOC-011, RRD-006).
- [ ] 4.4 Ensure exit code remains a deterministic control-flow signal only. Morale, progress, reassurance, retry strategy, and autonomous-continuation reminders must live in `advice[]`, structured diagnostics, or Agent-readable Markdown (CLE-002, GSK-009).
- [ ] 4.5 If a CLI's actual behavior contradicts the planned documentation, use the discovery protocol: document the exception or future change unless an existing task/spec in this change authorizes runtime behavior edits. Do not silently make prose describe a target behavior as current behavior.

## 5. Validators And Regression Tests

- [ ] 5.1 Add or update static docs regression coverage for Agent-facing audience, HITL1/HITL2 as the only interactive in-run checkpoints, pre-pipeline trigger framing, Final-as-terminal-non-interactive-delivery distinction, post-final feedback via HITL2 rather than a Final-owned loop, and forbidden mid-pipeline human/operator wording (ACS-003, SWE-004, RUE-005, WDC-011, CDP-004).
- [ ] 5.2 Add terminology regression coverage for phase transition / phase handoff / work completion / witnessing. It must fail if `advance-status` is described as entering/loading/executing the next phase, if `enter-phase` / `load_complete` is described as target work completion, or if silent degradation/shared-node/wave-gate docs use broad `phase transition` wording without distinguishing handoff, status synchronization, and work completion (ACS-004, CPT-005, WNC-011, SWE-001, RES-004, SHC-006, RWG-010).
- [ ] 5.3 Add exit-code documentation regression coverage for `COMMANDS.md` and `cli/README.md`: canonical interpretation / target convention for `0/1/2`, structured stdout guidance, advice-not-exit-code wording, gate/non-gate classes, current non-gate utility exceptions, `log-event.mjs` always-0 exception, inspect/reentry caller-error code 2, and known doc/code drift inventory (CLE-004, IOC-004, LOC-011, RRD-006).
- [ ] 5.4 Add representative runtime/contract tests that can be checked without changing CLI semantics: gate/shared helper tri-state, at least one non-gate binary or documented exception, and `log-event.mjs` always-0 exception inventory (CLE-004).
- [ ] 5.5 Keep all new tests under root `tests/` and use `node:test` + `node:assert`. Do not put tests, fixtures, or experiment playbooks under `DPT_FRAMEWORK/`.
- [ ] 5.6 Validator scan surfaces must be explicit: `DPT_FRAMEWORK/COMMANDS.md`, `DPT_FRAMEWORK/RUN.md`, `DPT_FRAMEWORK/README.md`, `DPT_FRAMEWORK/cli/README.md`, `DPT_FRAMEWORK/command_playbook/*.md`, and lifecycle/shared workflow Markdown touched by this change.
- [ ] 5.7 Validator positive markers must include: Agent-facing audience, HITL1/HITL2-only interactive in-run boundary, terminal non-interactive Final delivery, post-final HITL2 repair/rerun routing, one-time pre-pipeline trigger framing, exit-code convention/table, structured stdout as actionable detail, advice-not-exit-code wording, and phase transition/handoff/work completion/witnessing terminology.
- [ ] 5.8 Validator forbidden phrase classes must include: unqualified `Agent/operator`, mid-pipeline user-provided bundle naming, unqualified user confirmation/ask/continue wording inside `stop: no` lifecycle execution, progress-report framing outside terminal non-interactive Final delivery, `advance-status` entering/loading/executing the next phase, and `enter-phase` / `load_complete` completing target work.
- [ ] 5.9 Validator allowlist entries must be data-shaped and reviewable: file or glob, phrase class, allowed context, and reason. Allow operator wording only for post-run diagnostics, maintenance, or out-of-band review; never for command co-runner audience during autonomous lifecycle execution.
- [ ] 5.10 Validator design should be deterministic and modest: positive markers plus small forbidden phrase classes with explicit allowlists. If a natural-language false positive appears, update the allowlist and explain the diagnostic/post-run meaning.

## 6. Version And Backlog Closure

- [ ] 6.1 Update repo-root `CHANGELOG.md` with a concise v0.5 entry for Agent-facing command audience, exit-code convention, terminology/main-spec bridge deltas, and validator hardening (VEM-002, VEM-004, RUE-001).
- [ ] 6.2 Update `DPT_FRAMEWORK/RUN.md` version banner to v0.5 and ensure it matches repo-root `CHANGELOG.md` (VEM-003, RUE-001).
- [ ] 6.3 Close `_backlog/plans/agent-persistence-and-exit-codes.md`, `autonomous-silent-execution-terminology.md`, `cli-exit-code-contract.md`, and `no-implicit-human-interaction.md` according to `_backlog/plans/README.md`: `git mv` each plan to `_backlog/_done/_closed_plans/`, update `_backlog/plans/README.md`, `_backlog/_done/_closed_plans/README.md`, and `_backlog/_done/README.md`, and preserve the original filenames/provenance in the closed-plan entries.
- [ ] 6.4 In backlog closure notes or index entries, state what this change absorbed: exit code stays honest, encouragement goes through `advice[]`, commands are Agent-facing, HITL1/HITL2 are the only interactive in-run checkpoints, Final is terminal non-interactive delivery with post-final feedback routed through HITL2 repair/rerun, and phase boundary terms distinguish transition/handoff/completion/witnessing.
- [ ] 6.5 Also state what this change did not do: runtime exit-helper unification, code-2 semantic migration, JS lifecycle walker, chat interceptor, environment-variable control, same-turn chat halt prevention, or fake evidence/trace handling.

## 7. Verification And Task Hygiene

- [ ] 7.1 Run focused docs/terminology/exit-code regression tests and record commands/results.
- [ ] 7.2 Run related broader `node --test` suites. If practical, run the full root test suite and record failures with their actual cause rather than hiding them behind focused passes.
- [ ] 7.3 Run `openspec validate autonomous-command-contract-hardening --strict`.
- [ ] 7.4 Run `node openspec/governance/check-project-reqs.mjs`.
- [ ] 7.5 Run `node openspec/governance/check-project-specs.mjs`.
- [ ] 7.6 Before marking tasks complete, cross-check that every modified framework/guidance/test/backlog surface maps back to at least one requirement ID in this change.
- [ ] 7.7 Update this file's checkboxes only after work is genuinely complete and verified. Completion notes must not overclaim prevention of same-turn chat halt or runtime exit-code unification.

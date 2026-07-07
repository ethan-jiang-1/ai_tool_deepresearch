## Context

The work-unit replacement has already landed and archived. The remaining problem is representational: current source-of-truth surfaces still contain old relay/slot production language. This matters because the project is agentic and spec-driven. A coding agent does not only compile code; it reads specs, playbooks, docs, and tests as operating context.

The hard historical boundary is `openspec/changes/archive/`. Archived changes are evidence of past decisions and SHALL NOT be cleaned or treated as current drift.

## Goals / Non-Goals

**Goals:**

- Make current active guidance teach one delegated production path only: queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate.
- Remove stale positive relay/slot production wording from current specs, docs, tests, and playbooks outside `openspec/changes/archive/`.
- Triage old tests, helper code, and experiments into migrate-or-delete outcomes: migrate if they still prove current work-unit behavior, delete or remove from current surfaces if they have lost current value.
- Maintain an apply-time stale-surface inventory so every focused token hit outside `openspec/changes/archive/` has an explicit close reason.
- Extend hygiene validation so stale retired production terms, old relay identity fields, old relay event names, and old relay helper APIs cannot re-enter current surfaces.
- Keep experiment playbooks agentic: Markdown drives the flow, JS performs thin deterministic checkpoints.
- Ensure archive/sync of this change leaves main specs with clean Purpose and Requirements text.

**Non-Goals:**

- No compatibility fallback for `drive-relay-slot`, `_subagents/wave_NN/slot_MM`, `subagent-relay`, `slot_result_ref`, or `subagent_slot_presence`.
- No migration of historical run bundles.
- No edits to `openspec/changes/archive/`.
- No broad rewrite of unrelated notes that do not contain retired delegated production wording. If a current note, backlog, bug report, or planning surface still teaches old relay/slot production semantics, it remains in scope.
- No new dependency or runtime orchestration model.

## Decisions

### Decision 1: Treat this as hygiene over existing capabilities

This change modifies existing capability contracts instead of adding a new "cleanup" capability. The durable behavior already belongs to `delegated-work-units`, `requirement-traceability`, `agent-testing`, `playbook-runner`, and the affected sub-agent/work-unit specs.

Alternative considered: add a new `delegated-surface-hygiene` capability. Rejected because it would make cleanup look like a separate feature rather than a constraint on the current source-of-truth surfaces.

### Decision 2: Exclude only archived OpenSpec history

The hygiene boundary excludes `openspec/changes/archive/` and does not use archived changes as audit failures. Current surfaces remain in scope: active main specs, active deltas, framework docs/code, tests, guidelines, and `experiments_playbook`.

Alternative considered: exclude all historical-looking folders or leave old cases under backlog labels. Rejected because the user's explicit boundary is the archive directory; every other current surface is either migrated, removed, or kept only for a narrow current diagnostic/governance reason. "It was historical" is not enough to keep old production semantics in current surfaces.

### Decision 3: Fail stale positive production wording, allow only closed non-authority contexts

The hygiene gate should reject old relay/slot tokens when they read as current production authority. It should cover three token families:

- retired-only tokens: old commands, modules, helpers, old schema fields, old check names, and old relay event names
- path/identity tokens: `_subagents/`, `dispatch.json`, `slotKey`, `roleAgentKey`, `receiptNonce`, and slot-oriented result/status wording
- context-sensitive current tokens: fields like `runtime_receipt_ref` are valid work-unit fields, but become stale when paired with `_subagents/`, `slot_result_ref`, or relay slot examples

The gate may allow tokens only in negative tests, removed/deprecated registry entries, checker/test self-references, narrow diagnostics that prove the old path is rejected, or minimized release-history wording that cannot be executed as current guidance.

Alternative considered: ban all old tokens everywhere outside archive. Rejected because negative regression tests and deprecated registry text need to name the retired tokens to prevent their return.

Archive-ready allowed contexts are narrower than apply-time review labels:

- negative regression or rejection diagnostics
- deprecated requirement registry entries
- self-reference in the hygiene checker or its tests
- minimized release-history entries that clearly describe past behavior, not current instructions
- removed/migrated playbook references only when they are part of an active cleanup report during apply, not a permanent runner table

`legacy/backlog` is allowed only as a temporary apply-time triage state. It is not an archive-ready reason to keep obsolete relay/slot production examples visible in current runner surfaces, docs, tests, or runnable playbooks.

### Decision 3a: Migrate or delete old experiments; do not park them forever

Old relay/slot experiments, tests, and helper code SHALL be reviewed for current value. If an old case can be converted into a work-unit proof while preserving Markdown Agent Flow and trace-backed verdicts, it should be migrated. If it no longer proves or diagnoses current behavior, it should be removed from current surfaces rather than kept as indefinite legacy/backlog.

Alternative considered: keep every old case under a permanent legacy/backlog table. Rejected because the purpose of this change is to reduce current cognitive load; a growing legacy list keeps old concepts visible and continues to confuse future agents. Archive already preserves history where history matters.

### Decision 4: Do not hide experiment migration inside JS

When an experiment playbook is migrated, the playbook remains the action surface. Inline `.mjs` snippets may create fixtures, run CLIs, or write trace checks, but must not replace multi-stage Agent Flow with a single controller script.

Alternative considered: convert old playbooks into compact JS runners. Rejected because it would destroy the experiment value described by `guidelines/command-experiments.md`.

### Decision 5: Purpose text is an archive/sync acceptance criterion

The previous archive left some requirements updated while stale Purpose text remained. This change treats clean active main spec Purpose text as a required archive/sync outcome. If the stock sync path cannot update Purpose text, apply/archive work must use an OpenSpec-governed sync path that does, rather than hand-editing main specs outside the lifecycle.

Alternative considered: ignore Purpose because requirements are normative. Rejected because coding agents read Purpose first, and stale Purpose is exactly the kind of high-impact noise this change is meant to remove.

### Decision 6: Inventory first, then clean

Apply work SHALL begin by producing or refreshing the stale-surface inventory from the focused token audit outside `openspec/changes/archive/`. The inventory is a work control surface, not a replacement for tests. It prevents the cleanup from being guided only by whichever old token the current implementer remembers.

The inventory SHALL classify every hit with one of these close states:

- `migrate`: rewrite to current work-unit path and verify it
- `remove`: delete the obsolete file, runner entry, helper, or current-surface wording
- `negative`: keep only as an explicit rejection/hygiene/diagnostic test
- `deprecated-registry`: keep only as a deprecated ID or prefix entry
- `checker-self-reference`: keep only because the hygiene checker/test must name the retired token it rejects
- `release-history-minimized`: keep only if a current changelog entry needs past-tense release context and the wording does not name retired commands/paths as usable instructions

Any `unknown`, `legacy/backlog`, or vague `follow-up` row blocks archive until it is converted to one of the close states above or the user explicitly approves a separate OpenSpec change that removes the old production wording from current surfaces.

### Decision 7: Purpose rewrites need explicit targets

Because OpenSpec delta specs primarily describe requirements, this change records Purpose rewrite targets in the change artifacts and tasks. Apply/sync work SHALL not improvise Purpose text from the archived change name. Purpose text should be durable capability intent:

- `delegated-work-units`: the Engine-owned work-unit claim/submit lifecycle and submitted ledger authority for delegated work.
- `work-unit-provenance-gate`: gate checks and diagnostics that prove delegated output coverage through submitted work-unit ledger and cross-surface binding.
- `subagent-directory-contract`: work-unit envelope directory contract under `_work_units/waveN/{work_id}/`.
- `subagent-dispatch`: Engine claim creates work-unit prompts for sub-agent actors.
- `subagent-node-contract`: sub-agent task/result/lifecycle contracts bind to work-unit identity, receipt nonce, and submit.
- `agent-output-declaration`: submitted work-unit ledger rows declare Agent-produced outputs and cache trails.
- `framework-engine`: canonical deterministic framework modules for queue, gate, loader, work-unit, and hygiene behavior.
- `repair-loop`: deterministic repair checkpoint loopback and termination, without delegated transport anchoring.

## Risks / Trade-offs

- Over-broad hygiene may flag legitimate negative tests. Mitigation: use explicit allowlists and require allowed contexts to be negative, deprecated, checker self-reference, or minimized release history.
- Under-broad hygiene may leave misleading current wording. Mitigation: run focused stale-token audits outside `openspec/changes/archive/` and review every remaining hit.
- Migrating all old playbooks may be larger than expected. Mitigation: triage each old case; migrate valuable cases now or remove no-value cases from current surfaces. A follow-on split is acceptable only when the current surface no longer teaches the old production authority.
- Purpose sync may expose OpenSpec CLI limitations. Mitigation: document the limitation during apply and keep main spec changes inside the OpenSpec-governed sync/archive path.

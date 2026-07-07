## Context

The work-unit replacement has already landed and archived. The remaining problem is representational: current source-of-truth surfaces still contain old relay/slot production language. This matters because the project is agentic and spec-driven. A coding agent does not only compile code; it reads specs, playbooks, docs, and tests as operating context.

The hard historical boundary is `openspec/changes/archive/`. Archived changes are evidence of past decisions and SHALL NOT be cleaned or treated as current drift.

## Goals / Non-Goals

**Goals:**

- Make current active guidance teach one delegated production path only: queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate.
- Remove stale positive relay/slot production wording from current specs, docs, tests, and playbooks outside `openspec/changes/archive/`.
- Triage old tests, helper code, and experiments into migrate-or-delete outcomes: migrate if they still prove current work-unit behavior, delete or remove from current surfaces if they have lost current value.
- Extend hygiene validation so stale retired production terms cannot re-enter current surfaces.
- Keep experiment playbooks agentic: Markdown drives the flow, JS performs thin deterministic checkpoints.
- Ensure archive/sync of this change leaves main specs with clean Purpose and Requirements text.

**Non-Goals:**

- No compatibility fallback for `drive-relay-slot`, `_subagents/wave_NN/slot_MM`, `subagent-relay`, `slot_result_ref`, or `subagent_slot_presence`.
- No migration of historical run bundles.
- No edits to `openspec/changes/archive/`.
- No broad rewrite of unrelated backlog, fixed bug reports, or historical planning notes.
- No new dependency or runtime orchestration model.

## Decisions

### Decision 1: Treat this as hygiene over existing capabilities

This change modifies existing capability contracts instead of adding a new "cleanup" capability. The durable behavior already belongs to `delegated-work-units`, `requirement-traceability`, `agent-testing`, `playbook-runner`, and the affected sub-agent/work-unit specs.

Alternative considered: add a new `delegated-surface-hygiene` capability. Rejected because it would make cleanup look like a separate feature rather than a constraint on the current source-of-truth surfaces.

### Decision 2: Exclude only archived OpenSpec history

The hygiene boundary excludes `openspec/changes/archive/` and does not use archived changes as audit failures. Current surfaces remain in scope: active main specs, active deltas, framework docs/code, tests, guidelines, and `experiments_playbook`.

Alternative considered: exclude all historical-looking folders such as `_backlog`. Rejected for this change because the user's explicit boundary is the archive directory; other surfaces can be classified during apply as current, backlog, or out-of-scope with explicit rationale.

### Decision 3: Fail stale positive production wording, allow explicit negative examples

The hygiene gate should reject old relay/slot tokens when they read as current production authority. It may allow tokens in negative tests, removed/deprecated registry entries, explicit legacy/backlog labels, and diagnostics that prove the old path is rejected.

Alternative considered: ban all old tokens everywhere outside archive. Rejected because negative regression tests and deprecated registry text need to name the retired tokens to prevent their return.

### Decision 3a: Migrate or delete old experiments; do not park them forever

Old relay/slot experiments, tests, and helper code SHALL be reviewed for current value. If an old case can be converted into a work-unit proof while preserving Markdown Agent Flow and trace-backed verdicts, it should be migrated. If it no longer proves or diagnoses current behavior, it should be removed from current surfaces rather than kept as indefinite legacy/backlog.

Alternative considered: keep every old case under a permanent legacy/backlog table. Rejected because the purpose of this change is to reduce current cognitive load; a growing legacy list keeps old concepts visible and continues to confuse future agents.

### Decision 4: Do not hide experiment migration inside JS

When an experiment playbook is migrated, the playbook remains the action surface. Inline `.mjs` snippets may create fixtures, run CLIs, or write trace checks, but must not replace multi-stage Agent Flow with a single controller script.

Alternative considered: convert old playbooks into compact JS runners. Rejected because it would destroy the experiment value described by `guidelines/command-experiments.md`.

### Decision 5: Purpose text is an archive/sync acceptance criterion

The previous archive left some requirements updated while stale Purpose text remained. This change treats clean active main spec Purpose text as a required archive/sync outcome. If the stock sync path cannot update Purpose text, apply/archive work must use an OpenSpec-governed sync path that does, rather than hand-editing main specs outside the lifecycle.

Alternative considered: ignore Purpose because requirements are normative. Rejected because coding agents read Purpose first, and stale Purpose is exactly the kind of high-impact noise this change is meant to remove.

## Risks / Trade-offs

- Over-broad hygiene may flag legitimate negative tests. Mitigation: use explicit allowlists and require allowed contexts to be negative, deprecated, legacy/backlog, or historical.
- Under-broad hygiene may leave misleading current wording. Mitigation: run focused stale-token audits outside `openspec/changes/archive/` and review every remaining hit.
- Migrating all legacy playbooks may be larger than expected. Mitigation: triage each old case; migrate valuable cases now or remove no-value cases from current surfaces. A follow-on split is acceptable only for a clearly valuable migration backlog that no longer teaches old production authority.
- Purpose sync may expose OpenSpec CLI limitations. Mitigation: document the limitation during apply and keep main spec changes inside the OpenSpec-governed sync/archive path.

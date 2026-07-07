## Context

The work-unit replacement has already landed and archived. The remaining problem is representational: current source-of-truth surfaces still contain old relay/slot production language. This matters because the project is agentic and spec-driven. A coding agent does not only compile code; it reads specs, playbooks, docs, and tests as operating context.

The hard historical boundary is `openspec/changes/archive/`. Archived changes are evidence of past decisions and SHALL NOT be cleaned or treated as current drift.

## Goals / Non-Goals

**Goals:**

- Make current active guidance teach one delegated production path only: queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate.
- Remove stale positive relay/slot, old delegated ledger, and old queue slot-shape production wording from current specs, docs, tests, playbooks, and current planning/backlog surfaces outside `openspec/changes/archive/`.
- Align current queue guidance with queue v2: ordered `active_window`, `refill_pool`, `delegated_in_flight`, `queue_item_id` for demand identity, and `work_id` only for Engine-allocated delegated work-unit attempts.
- Triage old tests, helper code, and experiments into migrate-or-delete outcomes: migrate if they still prove current work-unit behavior, delete or remove from current surfaces if they have lost current value.
- Maintain an apply-time stale-surface inventory so every focused token hit outside `openspec/changes/archive/` has an explicit close reason.
- Extend hygiene validation so stale retired production terms, old relay identity fields, old relay event names, old relay helper APIs, and old queue slot shapes cannot re-enter current surfaces.
- Keep experiment playbooks agentic: Markdown drives the flow, JS performs thin deterministic checkpoints.
- Ensure archive/sync of this change leaves main specs with clean Purpose and Requirements text.

**Non-Goals:**

- No compatibility fallback for `drive-relay-slot`, `_subagents/wave_NN/slot_MM`, `subagent-relay`, `slot_result_ref`, `subagent_slot_presence`, hand-written delegated ledger rows, or old queue slot shapes.
- No migration of historical run bundles.
- No edits to `openspec/changes/archive/`.
- No broad rewrite of unrelated notes that do not contain retired delegated production wording. If a current note, backlog, bug report, or planning surface still teaches old relay/slot production semantics, it remains in scope. `_original_*` archives remain unread historical material under the repo hard rule and are not audit inputs.
- No new dependency or runtime orchestration model.

## Decisions

### Decision 1: Treat this as hygiene over existing capabilities

This change modifies existing capability contracts instead of adding a new "cleanup" capability. The durable behavior already belongs to `delegated-work-units`, `requirement-traceability`, `agent-testing`, `playbook-runner`, `file-observability`, and the affected sub-agent/work-unit specs.

Alternative considered: add a new `delegated-surface-hygiene` capability. Rejected because it would make cleanup look like a separate feature rather than a constraint on the current source-of-truth surfaces.

### Decision 2: Exclude only archived OpenSpec history

The hygiene boundary excludes `openspec/changes/archive/` and does not use archived changes as audit failures. Current surfaces remain in scope: active main specs, active deltas, framework docs/code, tests, guidelines, governance metadata, top-level docs, shared experiment infrastructure, `experiments_env/shared`, `experiments_playbook`, and current `_backlog` planning/bug/todo notes. `_original_*` archives are also excluded from scanning because repo instructions say not to read them unless explicitly asked.

Alternative considered: exclude all historical-looking folders or leave old cases under backlog labels. Rejected because the user's explicit boundary is the archive directory; every other current surface is either migrated, removed, or kept only for a narrow current diagnostic/governance reason. "It was historical" is not enough to keep old production semantics in current surfaces.

### Decision 3: Fail stale positive production wording, allow only closed non-authority contexts

The hygiene gate should reject old relay/slot tokens when they read as current production authority. It should cover three token families:

- retired-only tokens: old commands, modules, helpers, old schema fields, old check names, and old relay event names
- path/identity tokens: `_subagents/`, `dispatch.json`, `slotKey`, `roleAgentKey`, slot-oriented result/status wording, and old queue slot shapes such as `slot_1_current`
- context-sensitive current tokens: fields like `runtime_receipt_ref`, `receipt_nonce`, `_beacon.json`, lifecycle wording, and the camelCase local variable `receiptNonce` are valid in work-unit contexts, but become stale when paired with `_subagents/`, `slot_result_ref`, relay slot examples, or old relay trace/log identity

The gate may allow tokens only in negative tests, removed/deprecated registry entries, checker/test self-references, active cleanup-control artifacts for this change, narrow diagnostics that prove the old path is rejected, current work-unit contexts for context-sensitive tokens, or minimized release-history wording that cannot be executed as current guidance.

Alternative considered: ban all old tokens everywhere outside archive. Rejected because negative regression tests and deprecated registry text need to name the retired tokens to prevent their return.

Archive-ready allowed contexts are narrower than apply-time review labels:

- negative regression or rejection diagnostics
- deprecated requirement registry entries
- self-reference in the hygiene checker or its tests
- cleanup-control artifacts under the active cleanup change, when they define the retired-token vocabulary, inventory, tasks, or delta requirements and cannot be read as production instructions
- current work-unit context for context-sensitive tokens that are not paired with retired relay/slot or old queue slot authority
- minimized release-history entries that clearly describe past behavior, not current instructions
- removed/migrated playbook references only when they are part of an active cleanup report during apply, not a permanent runner table

`legacy/backlog` is allowed only as a temporary apply-time triage state. It is not an archive-ready reason to keep obsolete relay/slot production examples visible in current runner surfaces, docs, tests, or runnable playbooks.

### Decision 3a: Migrate or delete old experiments; do not park them forever

Old relay/slot experiments, tests, and helper code SHALL be reviewed for current value. If an old case can be converted into a work-unit proof while preserving Markdown Agent Flow and trace-backed verdicts, it should be migrated. If it no longer proves or diagnoses current behavior, it should be removed from current surfaces rather than kept as indefinite legacy/backlog.

Alternative considered: keep every old case under a permanent legacy/backlog table. Rejected because the purpose of this change is to reduce current cognitive load; a growing legacy list keeps old concepts visible and continues to confuse future agents. Archive already preserves history where history matters.

### Decision 3b: Treat agentic-queue as current, but align its stale wording

`agentic-queue` is a current capability. This change does not retire it and does not deprecate `active_window`, `refill_pool`, `delegated_in_flight`, or queue v2. The cleanup target is wording and examples that still imply the older fixed-slot shape, named queue slots, simple/medium/complex experiment taxonomy, or queue demand identity named `work_id`.

Current executable contracts define an ordered `active_window` array with a capacity limit, currently `QUEUE_ACTIVE_WINDOW_LIMIT = 20`. Current queue guidance SHALL point to that schema/constant instead of describing five named slots. If a test or playbook needs at least five queued items to prove refill, preemption, restore behavior, or runner coverage, it may say so as a case condition, but it SHALL NOT make "five-slot active window" the current state model or use `slot_1_current` / `slot_5_tail` style projection as proof. Queue demand identity is `queue_item_id`; `work_id` is reserved for Engine-allocated work-unit attempts.

This distinction matters because the phrase "five-slot active window" may survive even when explicit old field names such as `slot_1_current` are absent. Hygiene should catch the stale concept when it teaches a fixed queue shape, while allowing current queue v2 references to array length, capacity, and multi-item test setup.

Named slots are treated as historical simplification that made the model harder to reason about. The current model may speak about the queue front, the displaced tail, or an insertion index as derived positions in an ordered array; it SHALL NOT give those positions stable field names that look like separate state-machine roles.

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
- `cleanup-control`: keep only under this active cleanup change when the artifact defines retired-token vocabulary, inventory, tasks, or delta requirements and cannot be read as production guidance
- `current-work-unit-context`: keep only for context-sensitive tokens in current work-unit implementation/spec/test context with no retired relay/slot or old queue slot authority
- `past-failure-history`: keep only when current backlog/bug/planning wording is explicit past failure analysis or removed-design context and cannot be followed as implementation guidance
- `release-history-minimized`: keep only if a current changelog entry needs past-tense release context and the wording does not name retired commands/paths as usable instructions

Any `unknown`, `legacy/backlog`, or vague `follow-up` row blocks archive until it is converted to one of the close states above or the user explicitly approves a separate OpenSpec change that removes the old production wording from current surfaces.

### Decision 7: Purpose rewrites need explicit targets

Because OpenSpec delta specs primarily describe requirements, this change records Purpose rewrite targets in the change artifacts and tasks. Apply/sync work SHALL not improvise Purpose text from the archived change name. Purpose text should be durable capability intent:

- `delegated-work-units`: the Engine-owned work-unit claim/submit lifecycle and submitted ledger authority for delegated work.
- `agentic-queue`: queue v2 demand lifecycle with ordered `active_window`, `refill_pool`, delegated in-flight attempt binding, queue demand `queue_item_id`, and work-unit-only `work_id`.
- `work-unit-provenance-gate`: gate checks and diagnostics that prove delegated output coverage through submitted work-unit ledger and cross-surface binding.
- `subagent-directory-contract`: work-unit envelope directory contract under `_work_units/waveN/{work_id}/`.
- `subagent-dispatch`: Engine claim creates work-unit prompts for sub-agent actors.
- `subagent-node-contract`: sub-agent task/result/lifecycle contracts bind to work-unit identity, receipt nonce, and submit.
- `agent-output-declaration`: submitted work-unit ledger rows declare Agent-produced outputs and cache trails.
- `file-observability`: file-audit diagnostics classify unplanned files, work-unit paths, and non-work-unit delegated artifacts without granting authority outside submitted ledger/receipt coverage.
- `framework-engine`: canonical deterministic framework modules for queue, gate, loader, work-unit, and hygiene behavior.
- `repair-loop`: deterministic repair checkpoint loopback and termination, without delegated transport anchoring.

## Risks / Trade-offs

- Over-broad hygiene may flag legitimate negative tests or current work-unit fields. Mitigation: use explicit allowlists and require allowed contexts to be negative, deprecated, checker self-reference, current work-unit context, or minimized release history.
- Under-broad hygiene may leave misleading current wording. Mitigation: run focused stale-token audits outside `openspec/changes/archive/` and review every remaining hit.
- Migrating all old playbooks may be larger than expected. Mitigation: triage each old case; migrate valuable cases now or remove no-value cases from current surfaces. A follow-on split is acceptable only when the current surface no longer teaches the old production authority.
- Purpose sync may expose OpenSpec CLI limitations. Mitigation: document the limitation during apply and keep main spec changes inside the OpenSpec-governed sync/archive path.

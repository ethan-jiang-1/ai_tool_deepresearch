## Context

Change 1 implements the first loop in the accepted Wave/Gate remediation sequence: HITL1/seed producer facts must become actionable before Wave0, not first appear as late Gate symptoms. The diagnostic bundle remains read-only evidence only. New proof uses disposable bundles; real search/fetch behavior remains a live-Agent/external claim, never a fixture claim.

Three facts already have owners, but their current delivery is incomplete:

| Fact | Existing authority | Current delivery defect |
|---|---|---|
| Research access | `rb_profile.yaml#/research_access`, `ProfileSchema`, HITL1 Gate | One search only examines its first eligible result, so a blocked host can create a false unavailable result. |
| Canonical initial topics | existing `advance-status`, `operate-topic-state apply`, `rb_plan.md` and UID-bound seeds | The legal bootstrap status synchronization exists, but HITL1 does not make its required placement explicit before apply. |
| Seed authoring structure | current seed bytes, existing parser, queue receipt and `seed-topics-ready` Gate | Queue completion checks file existence, while the same parser first exposes malformed frontmatter at phase end. |

The implementation paired-reads `evolution-simple-reliable-control.md` and `evolution-helper-oriented-agent.md`. No new lifecycle, mutation authority, search implementation, recovery tree, or user co-runner is authorized.

## Goals / Non-Goals

**Goals:**

- Give HITL1 one direct legal order from recorded semantic decision through canonical topic materialization, style, bounded access observation and the existing Gate.
- Permit a bounded capability observation to distinguish a blocked first host from inability to fetch any of the first three eligible returned candidates.
- Reuse one deterministic seed authoring evaluator at both the per-card completion point and the final Gate.
- Keep `available` tied to real page content, `unavailable` honest, and Setup/Wave entry fail closed.
- Preserve legacy profile readability and current bundle authority boundaries.

**Non-Goals:**

- No search client, browser abstraction, URL chooser, URL/query history, retry ledger, `available_surfaces` state, or automatic re-probe controller.
- No topic-state authorization, status-machine, Gate-routing, receipt, trace, or formal handoff redesign.
- No generic Markdown/YAML linter, disk scan that invents declarations, second seed parser, or queue success path for invalid authoring.
- No claim that deterministic fixtures prove a real Agent, search, fetch, page semantics, host permission, or provider-specific tool behavior.

## Decisions

### D1. One search, at most three eligible candidates, one final observation

HITL1 remains a Markdown/Agent-owned capability probe. It makes one neutral search, takes the first three syntactically eligible actual HTTP(S) results in returned order, and handles candidates serially:

```text
one neutral search
  -> candidate 1: native fetch -> permitted same-URL curl fallback
  -> candidate 2 only after candidate 1 cannot return real content
  -> candidate 3 only after candidate 2 cannot return real content
  -> first real page content: available; otherwise honest unavailable/no advance
```

Eligibility and the already accepted native-first/same-URL curl safety constraints remain unchanged. Each candidate gets at most one native attempt and, only after no real content and independently available host permission, at most one exact existing curl fallback. A native success or permitted curl success ends the entire probe. A permission/no-legal-path boundary stops at the current candidate; it does not silently skip to a later result.

The durable profile observation stays a single direct fact. New current-writer fields are:

- `eligible_candidate_count`: an integer from `0` through `3` for candidates actually considered;
- `final_candidate_ordinal`: an integer from `1` through `eligible_candidate_count` identifying the final considered candidate, whether its branch fetches, succeeds, fails, or stops at a no-legal-path boundary.

They are an optional, internally consistent pair in `ProfileSchema` for legacy compatibility, but the current HITL1 writer records them. `available` metadata must have a positive count and ordinal; only an unavailable no-candidate branch may record count zero without an ordinal. A positive-count current observation retains its one final considered `result_url`, including a no-legal-path branch where no fetch can run. The schema never accepts candidate fields on `unprobed`, an available zero count, a positive ordinal without a positive count, an ordinal beyond the count, a positive count without its final URL, query text, URL list, response body, HTTP matrix, or retry history.

Alternatives rejected:

- One fixed URL: does not prove the search capability boundary and may conceal host-specific blocking.
- Unbounded results or "try another source": turns a probe into research/source selection and creates a retry tree.
- Persisting `attempted_urls[]`: duplicates transient tool history without changing the legal next action.
- Engine-owned fetch: moves external semantic/tool work out of Agent Flow and adds a new capability surface.

### D2. Deliver the existing HITL1 legal order rather than changing authorization

The existing legal bootstrap path is retained:

```text
legal HITL1 entry
  -> user semantic decision recorded
  -> existing advance-status --to hitl1_recorded
  -> existing operate-topic-state apply
  -> existing style application
  -> bounded probe
  -> existing hitl1-recorded Gate
  -> existing Gate handoff to Setup
```

`advance-status --to hitl1_recorded` already owns the bootstrap-compatible status synchronization consumed by the current topic-state authorization and HITL1 Gate rules. The defect is that the Phase control surface leaves this order implicit while directing topic-state apply before the operation Agent needs to execute. The updated Markdown puts the operation in its exact producer position and tells the Agent to consume its output before apply.

No status is hand-written. No topic-state `force` path, new context flag, fallback authority, Gate exception, or second success route is added. If existing synchronization, apply, or recover rejects, the Agent follows its returned legal action and reruns that same operation; it does not use a failed Gate as a discovery mechanism.

### D3. Extract one seed authoring evaluator and invoke it before queue terminalization

The implementation extracts a pure evaluator from the existing seed-topics Gate logic. Its inputs are the already-read declared seed bytes, declared relative path, expected canonical Topic binding, and existing frontmatter parser. A thin queue/Gate adapter owns file reading and current registry enumeration; the pure core performs no I/O or mutation and returns deterministic pass/fail facts.

```text
seed_topic_materialize card
  -> Agent writes its declared seed path
  -> existing operate-queue complete
       -> existing file receipt check
       -> shared seed authoring evaluator for this card
       -> only PASS terminalizes/promotes/refills the queue
  -> final seed-topics Gate reuses evaluator for every current seed
```

The per-card adapter first admits one unambiguous declaration: exactly one card `writes_to` path, exactly one matching `file:` entry in `required_receipts` and `completion_receipt`, and one current canonical Topic resolved from `payload.topic_slug`; the path must be that Topic's expected `seed_topics/<slug>.md`. It neither scans nor guesses a declaration. An invalid declaration is a `missing_contract` queue-producer boundary, not an invitation to edit queue authority or an authoring-file repair. For a valid declaration, the pure core parses frontmatter with the same accepted parser and validates only the current canonical UID/id/slug/title/must-answer/scope/dependency binding plus filename/path consistency. It does not judge body/semantic quality or reinterpret a generic card `done_condition`. On authoring failure, `operate-queue complete` returns the normal structured feedback plus `repair_kind: agent_action`, the direct `missing_fact`, a `write_to` coordinate within that declared file, and a `rerun` for the same completion checkpoint. Both failure branches leave the queue item non-terminal, keep queue authority bytes unchanged (including by deferring legacy `bundle_name` normalization), and do not append `queue_completed`; ordinary attempt/receipt diagnostics are not terminal queue evidence. The Agent repairs the declared file and reruns the same completion command only for the valid-declaration authoring branch. The final Gate retains phase-wide registry set comparison, queue drain, trace event, routing and verdict ownership.

This is a local convergence, not a new validator family: one parser/evaluator replaces the current "queue receipt says exists, Gate later says parse failed" split. It applies only to the named seed producer rule; it does not make every non-delegated queue task subject to seed checks.

### D4. Proof tracks match their claim boundary

| Claim | Proof class | Boundary |
|---|---|---|
| Profile candidate-pair schema and pure seed evaluator | `unit` | deterministic module behavior only |
| HITL1 order, status/apply no-mutation failure, queue completion and final Gate reuse | `integration` | real CLI/bundle boundaries with fixture facts |
| Complete pre-Wave deterministic chain | `deterministic_e2e` | lifecycle/queue/Gate chain, not external search or Agent behavior |
| Agent follows the production HITL1 probe and writes one observation | `agent_flow_e2e` | independent real Subject Agent and real disposable bundle |
| Search/fetch availability and candidate fallback | real external call | claim is `NOT_RUN` when the live runtime cannot exhibit it |

The existing case-115 remains one real Subject surface. It gains the production three-candidate contract and a legal canonical topic setup; its observed provider/tool transcript remains provider-scoped. The fixture-backed seed queue playbook gains a negative malformed-frontmatter completion case and proves deterministic queue/Gate behavior only.

### D5. Constitutional admission and control-surface budget

- **Direct authority / legal path:** profile/schema for access, existing status/apply operation for topic intent, declared current seed bytes plus existing canonical binding/parser for authoring, queue JSON for terminalization, and final Gate/trace for phase verdict.
- **Declared public boundary:** this change adds none. HITL1 remains its existing entry and no recovery/public module is introduced.
- **Shortest legal loop:** D1 removes first-host false negatives without adding a second search; D2 makes an existing operation visible at the producer decision; D3 reuses the final parser at the earlier same-card checkpoint.
- **Human/Agent split:** only semantics and genuinely unavailable host permission stay with the user. Search/fetch within permission, status synchronization, apply/recover, repair and rerun remain Agent work during a live turn.
- **Proof scope:** deterministic tests do not establish external behavior; a real trace/transcript does not establish another host/runtime; case-115's general Agent claim does not prove an unobserved second/third-candidate branch; production diagnostic bundle bytes do not establish post-change closure.

Added persistent control surfaces: none. Added public CLI/state/Gate/controller: none. Extracted pure evaluator: one, solely to replace duplicate parsing. Avoided surfaces: URL history, status workaround, late-only YAML diagnosis, generic lint command, retry controller, manual authority edits and second parser.

## Risks / Trade-offs

- [Risk] Three candidates increase external tool invocations. -> Mitigation: one search, maximum three eligible candidates, two bounded attempts per candidate, early success stop, and no automatic re-probe.
- [Risk] Candidate fields accidentally become a history/retry authority. -> Mitigation: only count/final ordinal are accepted; no query, array, body, status matrix, Gate verdict or retry state is stored.
- [Risk] Status synchronization before the Gate could be mistaken for a hand edit or pass claim. -> Mitigation: only the existing `advance-status` CLI is invoked; the Gate remains the independent pass authority and applies the existing status rule.
- [Risk] Extracted evaluator drifts from the final Gate. -> Mitigation: Gate and queue completion import the same pure evaluator, with parity-focused tests.
- [Risk] A queue-complete failure might mutate queue state. -> Mitigation: evaluate before terminal history/promotion/refill/write, and assert byte-stable queue state on failure.
- [Risk] Real external access does not exercise candidate two/three. -> Mitigation: deterministic contract tests cover the bounded shape; case-115's general Agent claim permits a first-candidate outcome and does not report an unobserved branch as proof. Any branch-specific observation is `NOT_RUN` unless its real transcript provides it.

## Migration Plan

1. Record baseline and validate the change-root verification plan before target edits; add red tests for old first-result behavior, hidden status order, and file-exists-only seed completion.
2. Update the profile schema and HITL1 control surface together; preserve old profiles without candidate fields.
3. Extract the seed evaluator, wire queue completion and final Gate to it, then update focused unit/integration tests and fixture-backed queue playbook.
4. Add the deterministic pre-Wave chain and update case-115 without claiming external behavior from it.
5. Run focused tests, routing/governance/OpenSpec checks, make the v0.45 release projections, and archive only with per-claim PASS/FAIL/NOT_RUN evidence.

Rollback is a compatibility-safe framework revert: legacy profiles need no migration because the candidate pair is optional. No bundle state needs transformation; a failed or unrun external claim remains evidence status, not a runtime rollback condition.

## Apply Target Manifest

| Surface | Action | Control impact |
|---|---|---|
| `DPT_FRAMEWORK/schema/contracts/profile.mjs` | modify | Add optional bounded candidate pair to one existing observation. |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md` and its focused shared profile surface | modify | Make existing status/apply order and three-candidate probe direct; no new Agent authority. |
| seed-topic Gate helper/CLI and queue completion path | modify | Extract/reuse one pure evaluator before existing queue terminalization. |
| root `tests/` | modify/add | Unit, integration and deterministic E2E proof for actual deterministic contracts. |
| `experiments_playbook/` and existing case-115 adapter/observer only as needed | modify | Preserve one Subject evidence boundary and honest `NOT_RUN`. |
| `CHANGELOG.md`, `DPT_FRAMEWORK/RUN.md` | modify | Project v0.45 only after implementation verifies behavior. |

## Open Questions

None blocking. Exact helper file placement follows the existing Gate/queue helper layout during apply; it is an internal implementation detail so long as both consumers use the same exported evaluator and no new public command is created.

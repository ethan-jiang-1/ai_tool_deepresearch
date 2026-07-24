> req: PRP-002, PRP-005

## MODIFIED Requirements

### Requirement: Phase HITL1 body completeness and stop semantics

`phase-hitl1.md` SHALL contain the complete 9-section body, retain `stop: yes`, and declare `execution_contract.search_policy: capability_probe_only`.

Section requirements:

- **Stage Goal**: turn the original question into one Agent-recommended research starting point, accept the user's natural-language acceptance or correction, confirm actual research access, and commit approved canonical topic intent.
- **Required Inputs**: instantiated bundle and `shared-profile.md`.
- **Allowed Actions**:
  - read the original research question/brief and decide whether topic rewrite is needed;
  - write structured original-topic narrative to `rb_plan.md` body without inventing missing user constraints;
  - derive an Agent-facing preview of initial topics, proposed must-answer set, and one recommended research profile/depth/breadth with a reason and expected effort impact;
  - show original topic + topic preview + recommendation-first HITL1 alignment surface to the user and wait for a natural-language acceptance, correction, question, or optional shortcut choice;
  - consume the existing HITL1 entry path and establish `current_node: phases/phase-hitl1.md` before topic mutation; only inside its accepted decision window, map the user's clear acceptance or correction to existing profile/topic fields and never treat ordinary later chat as persisted HITL1 intent or mutation authority;
  - when the user's semantics are clear, treat that answer as confirmation and do not require a blanket second confirmation; ask only the minimum question needed for substantive ambiguity, real cost/permission expansion, or irreversible risk;
  - record the accepted `research_profile`, `root_must_answer_set`, and `human_decision_checkpoints.hitl1.status` / `.recorded_at` in their existing profile owner;
  - after that semantic decision is recorded, invoke the existing `advance-status --to hitl1_recorded`, consume its successful bootstrap-compatible status output, and establish `current_gate: hitl1_recorded` / `next_gate: setup_ready` before any topic-state apply; the Agent SHALL not hand-edit status or use a failed Gate to discover this order;
  - only after that existing status synchronization succeeds, write a retained topic-state input file containing `add_topic` entries with title, descriptive slug stem, must-answer set, scope role and dependencies, then run one existing `operate-topic-state apply` change set so the approved canonical registry and all UID-bound seed skeletons commit together; do not directly write registry frontmatter or defer approved intent to the seed phase;
  - run `apply-research-style.mjs` using committed registry count;
  - execute one neutral capability-only search, consider at most the first three syntactically eligible actual HTTP(S) candidates in returned order, and process them serially through the bounded native-first/same-URL fallback sequence described below. Record one final direct `research_access` observation.
- **Expected Artifacts**: canonical `rb_plan.md` registry, matching UID-bound seeds, and `rb_profile.yaml` containing user choices, style parameters, HITL1 marker and research-access observation.
- **Gate Command**: existing `check-gate-hitl1-recorded.mjs` under the current node.
- **On Gate Pass**: read `check.next`.
- **On Gate Fail**: read inspect/advice, follow an existing legal repair or returned owner/terminal/missing-contract boundary, and rerun the same operation or Gate when that path exists. An unavailable access result has no Setup/Wave advance path; it preserves recorded choices and exposes only the smallest unavailable permission or external-environment boundary.
- **Stop Behavior**: wait for the user's research semantic decision at HITL1; a clear acceptance or correction satisfies that human decision boundary, after which Agent executes ordinary status-sync/apply/style/probe/Gate commands without returning each mechanical step to the user. Only a new host permission, unavailable legal surface, or non-delegable external environment action returns the smallest boundary to the user.
- **Anti-Cheating Rules**: no chat-only answers, fake probe, direct registry or status edit, seed-only identity, mock access, parallel status tree, automatic retry tree, invented user semantics, or treating non-HITL chat as HITL1 mutation authority.

The probe SHALL make one search invocation. A syntactically eligible candidate is an actual HTTP(S) result returned by that search, in returned order, which has no raw single quote, ASCII whitespace/control character, or URL credentials and does not target `localhost`/`.localhost`, loopback, or a literal private/link-local address. The Agent SHALL consider no more than the first three such candidates and SHALL not invent, normalize, substitute, or retain a query/URL history.

For each considered candidate, the Agent SHALL use the available native fetch surface first. Only when the native surface is absent before invocation or its one attempt returns no real page content because it is blocked, unavailable, or failed, and independently configured host shell/network permission permits the exact action and target, the Agent MAY use at most one existing standalone shell fallback:

```bash
curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'
```

The fallback SHALL contain no prefix assignment, pipe, redirection, command substitution, shell chaining, or trailing command. The initial request and at most five redirects SHALL remain HTTP(S)-only, curl URL globbing SHALL be disabled, and host DNS/network policy SHALL remain authoritative for resolved and redirected destinations.

A native success or permitted fallback success with real requested page content SHALL end the entire probe. The Agent SHALL advance to the next eligible candidate only after the current candidate's permitted bounded sequence cannot return real content. If the current candidate reaches a permission, absent-surface, or other no-legal-path boundary, the probe SHALL stop at that candidate; it SHALL not silently skip to a later result. The Agent SHALL not repeat either surface, add another fallback tier, run another search, or persist an automatic retry tree.

The current HITL1 writer SHALL record `eligible_candidate_count` from `0` through `3` for candidates actually considered and, when that count is positive, `final_candidate_ordinal` from `1` through that count for the final attempted or successful candidate. `result_url` remains the successful candidate or, for a failed attempted branch, the final selected candidate. Search unavailable/failed/blocked or no syntactically eligible candidate SHALL record `unavailable` with `fetch_outcome: not_attempted`, candidate count `0`, and no ordinal. A successful native or fallback fetch SHALL record `available`, the searched `result_url`, `fetch_outcome: success`, the actual successful `fetch_surface`, and candidate metadata. If every permitted candidate attempt returns no real page content, the Agent SHALL record `unavailable`, the final `result_url`, a non-success `fetch_outcome`, the final attempted `fetch_surface` when known, bounded candidate metadata, and one bounded direct reason without adding attempt-history fields. Only real fetched page content permits `available`; command exit success, an empty body, a search snippet, or an HTTP error/challenge shell without the requested page content SHALL NOT suffice.

Native fetch policy failure SHALL NOT itself authorize shell/network access or a policy bypass. When independently configured host shell/network permission already permits the exact fallback, that fallback is Agent-owned mechanical execution. The Agent SHALL NOT silently widen project configuration, ask the user to run `curl`, acknowledge a failure as success, or ask for confirmation before an already permitted mechanical action. If a required surface is absent or host permission is unavailable, the Agent SHALL record the honest unavailable observation and expose only that permission or external prerequisite. User approval alone SHALL NOT convert failed or missing page content into a successful observation.

Probe URL/content SHALL NOT become research evidence, cache, submitted output, receipt, or Gate coverage. HITL1 SHALL NOT create offline research artifacts, fake probe receipts, evidence-free report skeletons, automatic retry trees, or another interactive checkpoint. User choices and research access SHALL remain in the accepted profile surface, not a parallel status tree.

HITL1 natural-language mapping SHALL be a prompt-side Agent responsibility within the existing `stop: yes` boundary, not a new Engine authority or generic conversation interceptor. It SHALL NOT persist, queue, or apply a user's voluntary message from a later `stop: no` phase, and SHALL NOT create pause, reentry, permission, or mutation capability.

HITL1 gate SHALL require `CanonicalPlanSchema`, exact UID-bound seed projection, completed topic-state workspace state, and the existing status rule. Legacy-compatible plan/profile readability SHALL not count as HITL1 completion. The Agent SHALL run the existing gate after user input; `stop: yes` does not waive deterministic checks. The topic-state apply context argument is descriptive only; it SHALL NOT authorize mutation when direct lifecycle facts are absent or stale.

#### Scenario: User approves initial topics and Agent materializes them through the existing legal order

- **WHEN** HITL1 has presented a complete recommendation and the user answers "按这个开始" or otherwise clearly approves the proposed topic semantics
- **THEN** the Agent SHALL treat that answer as confirmation, record the existing HITL1 decision facts, run `advance-status --to hitl1_recorded`, write retained apply input, and immediately run topic-state apply
- **AND** it SHALL NOT ask the user to repeat the same choice through a letter menu or second confirmation
- **AND** canonical registry plus UID-bound seeds SHALL commit before style computation and gate pass

#### Scenario: User corrects the recommendation and Agent preserves the rest

- **WHEN** the user clearly corrects one part of the recommendation, such as "范围不变，但重点放资本约束"
- **THEN** the Agent SHALL update the affected proposed topic/must-answer semantics and preserve the uncorrected parts
- **AND** it SHALL NOT invent additional constraints or require another confirmation when the corrected intent is clear
- **AND** it SHALL perform retained status-sync, apply, style, probe, and Gate mechanics itself

#### Scenario: HITL1 keeps user responsibility semantic

- **WHEN** topic intent is clear from the user's acceptance or correction
- **THEN** the Agent SHALL run status synchronization, apply, style, probe, and Gate without asking the user to execute commands
- **AND** it SHALL not ask the user to confirm the same clear semantics again
- **AND** it SHALL ask again only for genuinely unresolved semantics, real cost/permission expansion, or irreversible risk

#### Scenario: Status synchronization precedes canonical topic-state apply

- **WHEN** recorded HITL1 semantics have produced a retained topic-state input
- **THEN** the Agent SHALL invoke the existing `advance-status --to hitl1_recorded` and consume its success before `operate-topic-state apply`
- **AND** a failed synchronization SHALL leave canonical topic state unchanged and direct the Agent to the existing legal operation or no-path boundary
- **AND** the Agent SHALL NOT edit `rb_status.json`, use a force/context bypass, or first run the HITL1 Gate to discover the required order

#### Scenario: Declared HITL1 context is not mutation authority

- **WHEN** an apply request declares HITL1 but `current_node` or the accepted HITL1 status window does not match
- **THEN** apply SHALL reject before workspace creation without changing plan, seed, profile, status, or trace
- **AND** the Agent SHALL restore or re-enter the existing legal lifecycle path rather than request a bypass

#### Scenario: Plan-first crash fails at one prerequisite

- **WHEN** an accepted topic-state workspace remains after plan replacement and before seed completion
- **THEN** HITL1 gate SHALL report the workspace/seed prerequisite and exact recover action
- **AND** SHALL short-circuit derivative profile/count/seed-floor symptoms

#### Scenario: First selected candidate succeeds natively

- **WHEN** actual search returns a syntactically eligible HTTP(S) candidate and its available native fetch returns real page content
- **THEN** HITL1 SHALL record the available observation with `eligible_candidate_count: 1`, `final_candidate_ordinal: 1`, and the native `fetch_surface`
- **AND** it SHALL not invoke `curl`, consider a second candidate, or count probe output as evidence

#### Scenario: Earlier blocked candidates do not hide a later bounded success

- **WHEN** one search returns at least three syntactically eligible HTTP(S) candidates in order, the first two complete their permitted bounded sequences without real page content, and the third returns real page content
- **THEN** HITL1 SHALL record one available observation for the third candidate with `eligible_candidate_count: 3` and `final_candidate_ordinal: 3`
- **AND** it SHALL not persist the first two URLs, response bytes, or an attempt history

#### Scenario: Exhausted bounded candidates remain at HITL1

- **WHEN** actual search yields up to three syntactically eligible candidates and every permitted candidate sequence returns no real page content
- **THEN** HITL1 SHALL record one unavailable observation for the final attempted candidate with bounded direct reason and candidate metadata, preserve user choices, and remain in HITL1
- **AND** it SHALL not run another search, select a fourth result, add a fetch tier, persist retry history, or claim access is available

#### Scenario: Missing permission stops at the current candidate

- **WHEN** native fetch cannot return page content for a selected candidate and invoking the only fallback requires host permission or a legal surface the Agent does not have
- **THEN** the Agent SHALL record an honest unavailable observation for that candidate and expose only that permission or external prerequisite
- **AND** it SHALL not skip to a later candidate, ask the user to execute the pipeline, or treat user approval as fetched page content

#### Scenario: No syntactically eligible candidate remains unattempted

- **WHEN** search is unavailable, fails, is blocked, or returns no syntactically eligible actual HTTP(S) result
- **THEN** HITL1 SHALL record the existing unavailable/not-attempted branch with `eligible_candidate_count: 0` and no ordinal
- **AND** it SHALL not invent or substitute a URL

#### Scenario: Ineligible local target is not sent to shell fallback

- **WHEN** a returned HTTP(S) result targets `localhost`, loopback, or a literal private/link-local address
- **THEN** HITL1 SHALL exclude it from syntactically eligible candidates
- **AND** native rejection or user approval SHALL NOT authorize a `curl` attempt to that target

#### Scenario: Shell-unsafe URL is not interpolated

- **WHEN** a returned HTTP(S) result contains a raw single quote, ASCII whitespace/control character, or URL credentials
- **THEN** HITL1 SHALL exclude it rather than escape, normalize, or substitute it
- **AND** it SHALL not construct a double-quoted, piped, redirected, chained, or command-substituting fallback

#### Scenario: Available access uses real probe only

- **WHEN** an allowed native or fallback fetch for a selected candidate returns real page content
- **THEN** HITL1 SHALL record the accepted available observation and SHALL NOT count probe output as research evidence

#### Scenario: Unavailable access has no Setup/Wave advance

- **WHEN** search or every permitted bounded candidate sequence is absent, blocked, fails, or returns no usable page content
- **THEN** HITL1 SHALL record the unavailable observation, preserve user choices, and remain in HITL1
- **AND** it SHALL not hand off to Setup or Wave through a second route

#### Scenario: HITL1 writes accepted surfaces not status tree

- **WHEN** HITL1 records topic intent, user choices, and capability observation
- **THEN** identity/intent SHALL be in canonical plan+seed, choices/access SHALL be in `rb_profile.yaml`, and lifecycle synchronization SHALL use the existing status operation
- **AND** HITL1 SHALL NOT create `rb_status.json#/phases/hitl1/*` or another research-access/topic status tree

#### Scenario: Ordinary mid-run message cannot reuse HITL1 mapping authority

- **WHEN** a user voluntarily sends a message while a later `stop: no` phase is executing
- **THEN** PRP-002 SHALL NOT authorize writing that message into HITL1 profile/topic owners or running topic-state mutation from the message alone
- **AND** the message SHALL NOT create a new HITL checkpoint, permission source, pause state, or interrupt lifecycle

### Requirement: HITL1 body exposes a concrete payload checklist

`phase-hitl1.md` SHALL expose the minimum write and ordering contract as a visible checklist for the human and Agent.

The checklist SHALL include:

- `research_profile`
- `root_must_answer_set`
- `research_style_params`
- `human_decision_checkpoints.hitl1.status`
- `human_decision_checkpoints.hitl1.recorded_at`
- existing pre-apply order: recorded HITL1 semantic decision -> `advance-status --to hitl1_recorded` -> retained topic-state input -> `operate-topic-state apply`
- `research_access.status`
- `research_access.eligible_candidate_count: 0..3`
- `research_access.final_candidate_ordinal: 1..eligible_candidate_count` when at least one candidate was considered
- available path: `research_access.probed_at`, `research_access.result_url`, `research_access.fetch_outcome: success`
- unavailable path: `research_access.probed_at`, non-success `research_access.fetch_outcome`, `research_access.reason`

Optional `research_access.search_surface` and `research_access.fetch_surface` labels MAY appear in the checklist but SHALL NOT be presented as independently Gate-required facts. The candidate metadata remains legacy-compatible in `ProfileSchema`, but the current HITL1 writer SHALL include its internally consistent shape for a completed probe. The checklist is an alignment/review surface, not a separate schema, status, or Gate authority.

#### Scenario: Human can audit direct readiness before the Gate

- **WHEN** a human reviewer reads `phase-hitl1.md`
- **THEN** the reviewer SHALL see the pre-apply status order, the bounded one-search/three-candidate contract, and exact available/unavailable observation fields
- **AND** review SHALL not require reconstructing the producer route from scattered prose or a failed Gate

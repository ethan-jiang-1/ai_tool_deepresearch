# pre-research-phase-content

> req: PRP-002

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
  - select the `research_profile` enum and write `root_must_answer_set` from the accepted recommendation/correction;
  - write `human_decision_checkpoints.hitl1.status` and `.recorded_at`;
  - after that semantic decision is recorded, invoke the existing `advance-status --to hitl1_recorded`, consume its successful bootstrap-compatible status output, and establish `current_gate: hitl1_recorded` / `next_gate: setup_ready` before any topic-state apply; the Agent SHALL not hand-edit status or use a failed Gate to discover this order;
  - only after that existing status synchronization succeeds, write a retained topic-state input file containing `add_topic` entries with title, descriptive slug stem, must-answer set, scope role and dependencies, then run one existing `operate-topic-state apply` change set so the approved canonical registry and all UID-bound seed skeletons commit together; do not directly write registry frontmatter or defer approved intent to the seed phase;
  - read the committed topic-state result; when it exposes a `style_projection` handoff after a registry-length change, run its exact existing `apply-research-style.mjs` command using the selected profile and committed registry count, then rerun the named HITL1 Gate; a no-length-change result SHALL not create a style operation;
  - render the exact pre-probe template owned by `brief/hitl1.md` and HIU-002, then execute one fixed neutral capability-only search using `site:wikipedia.org "Internet protocol suite"`, consider at most the first three syntactically eligible actual HTTP(S) candidates in returned order, and process them serially through the bounded native-first/same-URL fallback sequence described below. Record one final direct `research_access` observation;
  - immediately after that final `available` or `unavailable` observation, render the corresponding exact result template owned by HIU-002, then run the existing HITL1 Gate. The direct result SHALL NOT claim that the Gate has passed or failed; the existing silent-execution exit remains Gate-pass-only.
- **Expected Artifacts**: canonical `rb_plan.md` registry, matching UID-bound seeds, and `rb_profile.yaml` containing user choices, style parameters, HITL1 marker and research-access observation.
- **Gate Command**: existing `check-gate-hitl1-recorded.mjs` under the current node.
- **On Gate Pass**: read `check.next` and present HIU-002's existing silent-execution exit only after the Gate passes.
- **On Gate Fail**: read inspect/advice, follow an existing legal repair or returned owner/terminal/missing-contract boundary, and rerun the same operation or Gate when that path exists. An unavailable access result has no Setup/Wave advance path; it preserves recorded choices and exposes only the smallest unavailable permission or external-environment boundary.
- **Stop Behavior**: wait for the user's research semantic decision at HITL1; a clear acceptance or correction satisfies that human decision boundary, after which Agent executes ordinary status-sync/apply/style/probe/Gate commands without returning each mechanical step to the user. Only a new host permission, unavailable legal surface, or non-delegable external environment action returns the smallest boundary to the user.
- **Anti-Cheating Rules**: no chat-only answers, fake probe, direct registry edit, seed-only identity, mock access, parallel status tree, automatic retry tree, invented user semantics, or treating non-HITL chat as HITL1 mutation authority.

The probe SHALL make exactly one search invocation using the literal neutral query `site:wikipedia.org "Internet protocol suite"`. A syntactically eligible candidate is an actual HTTP(S) result returned by that search, in returned order, which has no raw single quote, ASCII whitespace/control character, or URL credentials and does not target `localhost`/`.localhost`, loopback, or a literal private/link-local address. The Agent SHALL consider no more than the first three such candidates and SHALL not invent, normalize, substitute, or retain a query/URL history.

For each considered candidate, the Agent SHALL use the available native fetch surface first. Only when the native surface is absent before invocation or its one attempt returns no real page content because it is blocked, unavailable, or failed, and independently configured host shell/network permission permits the exact action and target, the Agent MAY use at most one existing standalone shell `curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'` fallback. It SHALL contain no prefix assignment, pipe, redirection, command substitution, shell chaining, or trailing command. The initial request and at most five redirects SHALL remain HTTP(S)-only, curl URL globbing SHALL be disabled, and host DNS/network policy SHALL remain authoritative for resolved and redirected destinations. A native success or permitted fallback success with real requested page content SHALL end the entire probe. The Agent SHALL advance to the next eligible candidate only after the current candidate's permitted bounded sequence cannot return real content. If the current candidate reaches a permission, absent-surface, or other no-legal-path boundary, the probe SHALL stop at that candidate; it SHALL not silently skip to a later result. The Agent SHALL not repeat either surface, add another fallback tier, run another search, or persist an automatic retry tree.

The current HITL1 writer SHALL record `eligible_candidate_count` from `0` through `3` for candidates actually considered and, when that count is positive, `final_candidate_ordinal` from `1` through that count for the final considered candidate. A positive-count observation SHALL retain that one final considered `result_url`, whether its branch fetches, succeeds, fails, or stops because no legal fetch surface is available. Search unavailable/failed/blocked or no syntactically eligible candidate SHALL record `unavailable` with `fetch_outcome: not_attempted`, candidate count `0`, no ordinal, and no URL. A successful native or fallback fetch SHALL record `available`, the searched `result_url`, `fetch_outcome: success`, the actual successful `fetch_surface`, and candidate metadata. If every permitted candidate attempt returns no real page content, the Agent SHALL record `unavailable`, the final `result_url`, the final actual non-success `fetch_outcome`, the final attempted `fetch_surface` when known, bounded candidate metadata, and one bounded direct reason without adding attempt-history fields. If the selected candidate reaches a no-legal-path boundary before any fetch invocation, the Agent SHALL record `unavailable`, that candidate's `result_url`, `fetch_outcome: not_attempted`, positive candidate metadata, and the direct no-path reason. If native fetch was invoked and returned no real content before an unavailable fallback boundary, the observation SHALL instead retain that actual native `failed` or `blocked` outcome and its `fetch_surface`. Only real fetched page content permits `available`; command exit success, an empty body, a search snippet, or an HTTP error/challenge shell without the requested page content SHALL NOT suffice.

The Phase Agent SHALL use the direct `research_access.status` observation only to select HIU-002's corresponding result template. It SHALL render that template after the observation and before the same HITL1 Gate; it SHALL not make the result a Gate verdict, reopen the recorded HITL1 decision, or announce silent autonomous execution before the Gate passes. The template is framework Markdown only and SHALL NOT claim authority over selected-host-native tool calls, policy failures, transport/security errors, or permitted shell output.

Native fetch policy failure SHALL NOT itself authorize shell/network access or a policy bypass. When independently configured host shell/network permission already permits the exact alternative fetch invocation and target, fallback SHALL be Agent-owned mechanical execution. The Agent SHALL NOT silently widen project configuration, ask the user to run `curl`, acknowledge the failure, or confirm continuation before trying it. If `curl` is absent, blocked by host policy, requires permission the Agent does not have, targets an ineligible URL, or also fails, the Agent SHALL preserve accepted HITL1 semantic choices, record the honest unavailable observation, render HIU-002's unavailable result, and expose only the smallest permission or external-environment prerequisite before rerunning this same probe and Gate. User approval alone SHALL NOT convert failed or missing page content into a successful observation.

Probe URL/content SHALL NOT become research evidence, cache, submitted output, receipt or gate coverage. HITL1 SHALL NOT create offline research artifacts, fake probe receipts, evidence-free report skeletons, automatic retry trees or another interactive checkpoint. User choices and research access SHALL remain in the accepted profile surface, not a parallel status tree.

HITL1 natural-language mapping SHALL be a prompt-side Agent responsibility within the existing `stop: yes` boundary, not a new Engine authority or generic conversation interceptor. It SHALL NOT persist, queue, or apply a user's voluntary message from a later `stop: no` phase, and SHALL NOT create pause, reentry, permission or mutation capability.

HITL1 gate SHALL require `CanonicalPlanSchema`, exact UID-bound seed projection and completed topic-state workspace state. Legacy-compatible plan readability SHALL not count as HITL1 completion. The Agent SHALL run the existing gate after user input; `stop: yes` does not waive deterministic checks.

Initial topic-state apply SHALL run only after `enter-phase` has populated `rb_status.json#/current_node: phases/phase-hitl1.md` and the existing bootstrap-compatible status synchronization has established `current_gate: hitl1_recorded` / `next_gate: setup_ready`. The apply context argument is descriptive only; it SHALL NOT authorize mutation when those direct lifecycle facts are absent or stale.

#### Scenario: HITL1 uses the style handoff after topic materialization

- **WHEN** the accepted HITL1 topic-state operation commits a registry whose length changes
- **THEN** the Phase Agent SHALL consume the returned `style_projection` handoff through the existing style CLI before `check-gate-hitl1-recorded.mjs`
- **AND** it SHALL treat a freshness failure as one mechanical same-Gate repair, not as a new user decision or direct profile edit

#### Scenario: User approves initial topics and Agent materializes them
- **WHEN** HITL1 has presented a complete recommendation and the user answers “按这个开始” or otherwise clearly approves the proposed topic semantics
- **THEN** the Agent SHALL treat that answer as confirmation, write retained apply input and immediately run topic-state apply
- **AND** it SHALL NOT ask the user to repeat the same choice through a letter menu or second confirmation
- **AND** canonical registry plus UID-bound seeds SHALL commit before style computation and gate pass

#### Scenario: User corrects the recommendation and Agent preserves the rest
- **WHEN** the user clearly corrects one part of the recommendation, such as “范围不变，但重点放资本约束”
- **THEN** the Agent SHALL update the affected proposed topic/must-answer semantics and preserve the uncorrected parts
- **AND** it SHALL NOT invent additional constraints or require another confirmation when the corrected intent is clear
- **AND** it SHALL perform retained apply, style, probe and Gate mechanics itself

#### Scenario: HITL1 keeps user responsibility semantic
- **WHEN** topic intent is clear from the user's acceptance or correction
- **THEN** the Agent SHALL run apply/style/probe/fallback/gate without asking the user to execute commands
- **AND** it SHALL not ask the user to confirm the same clear semantics again
- **AND** it SHALL ask again only for genuinely unresolved semantics, real cost/permission expansion or irreversible risk

#### Scenario: Status synchronization precedes canonical topic-state apply

- **WHEN** recorded HITL1 semantics have produced a retained topic-state input
- **THEN** the Agent SHALL invoke the existing `advance-status --to hitl1_recorded` and consume its success before `operate-topic-state apply`
- **AND** a failed synchronization SHALL leave canonical topic state unchanged and direct the Agent to the existing legal operation or no-path boundary
- **AND** the Agent SHALL NOT edit `rb_status.json`, use a force/context bypass, or first run the HITL1 Gate to discover the required order

#### Scenario: Declared HITL1 context is not mutation authority
- **WHEN** an apply request declares HITL1 but `current_node` or the accepted HITL1 status window does not match
- **THEN** apply SHALL reject before workspace creation without changing plan, seed, profile, status or trace
- **AND** the Agent SHALL restore or re-enter the existing legal lifecycle path rather than request a bypass

#### Scenario: Plan-first crash fails at one prerequisite
- **WHEN** an accepted topic-state workspace remains after plan replacement and before seed completion
- **THEN** HITL1 gate SHALL report the workspace/seed prerequisite and exact recover action
- **AND** SHALL short-circuit derivative profile/count/seed-floor symptoms

#### Scenario: Fixed neutral query follows the pre-probe notice
- **WHEN** HITL1 has completed all existing prerequisites before the research-access probe
- **THEN** the Phase Agent SHALL render HIU-002's exact pre-probe notice before its one native search invocation
- **AND** that invocation SHALL use exactly `site:wikipedia.org "Internet protocol suite"`
- **AND** the Phase Agent SHALL derive eligible candidates only from that invocation and preserve the existing bounded probe sequence

#### Scenario: Available observation is explained before the Gate
- **WHEN** the one bounded probe records `research_access.status: available`
- **THEN** the Phase Agent SHALL render HIU-002's exact available result directly after recording that observation and before `check-gate-hitl1-recorded.mjs`
- **AND** it SHALL NOT announce the existing silent autonomous execution until the Gate passes
- **AND** it SHALL preserve the observation and Gate as separate owners

#### Scenario: Unavailable observation keeps its existing authority path
- **WHEN** the one bounded probe records `research_access.status: unavailable`
- **THEN** the Phase Agent SHALL render HIU-002's exact unavailable result directly after recording that observation and preserve the existing observation and HITL1 Gate owners
- **AND** it SHALL preserve recorded choices and the same-probe/Gate repair path
- **AND** it SHALL NOT add a query history, new state, Gate, retry tree, provider fallback, or host-output suppression promise

#### Scenario: First selected candidate succeeds natively
- **WHEN** actual search returns a syntactically eligible HTTP(S) candidate and its available native fetch returns real page content
- **THEN** HITL1 SHALL record the available observation with `eligible_candidate_count: 1`, `final_candidate_ordinal: 1`, and the native `fetch_surface`
- **AND** it SHALL not invoke `curl`, consider a second candidate, or count probe output as evidence

#### Scenario: Native fetch block uses one same-URL fallback
- **WHEN** actual search returns an eligible HTTP(S) URL and native fetch is absent, blocked, unavailable or fails without real page content
- **AND** independently configured host permission permits the exact shell/network action
- **THEN** the Agent SHALL invoke `curl` at most once for that same URL without asking the user to operate the pipeline
- **AND** real page content SHALL produce the existing available observation with `fetch_surface: curl`

#### Scenario: Earlier blocked candidates do not hide a later bounded success
- **WHEN** one search returns at least three syntactically eligible HTTP(S) candidates in order, the first two complete their permitted bounded sequences without real page content, and the third returns real page content
- **THEN** HITL1 SHALL record one available observation for the third candidate with `eligible_candidate_count: 3` and `final_candidate_ordinal: 3`
- **AND** it SHALL not persist the first two URLs, response bytes, or an attempt history

#### Scenario: Exhausted bounded candidates remain at HITL1
- **WHEN** actual search yields up to three syntactically eligible HTTP(S) candidates but every permitted sequence returns no real page content
- **THEN** HITL1 SHALL record one unavailable observation for the final considered URL with bounded candidate metadata and direct reason, preserve user choices, and remain in HITL1
- **AND** it SHALL NOT select a fourth URL, add a fetch tier, persist retry history, or claim access is available

#### Scenario: Missing permission exposes only the smallest boundary
- **WHEN** native fetch cannot return page content and invoking the only fallback requires a host permission the Agent does not have
- **THEN** the Agent SHALL record an honest unavailable observation and ask only for that permission or external action
- **AND** after the boundary is resolved, the Agent SHALL resume the same bounded probe and Gate mechanics itself

#### Scenario: No eligible target is not sent to shell fallback
- **WHEN** no search result is syntactically eligible because the returned HTTP(S) results target `localhost`, loopback, or literal private/link-local addresses
- **THEN** HITL1 SHALL record the no-candidate unavailable/not-attempted observation with count zero
- **AND** native rejection or user approval SHALL NOT authorize a `curl` attempt to that target

#### Scenario: Shell-unsafe URLs are not interpolated
- **WHEN** every returned HTTP(S) result contains a raw single quote, ASCII whitespace/control character, or URL credentials
- **THEN** HITL1 SHALL treat the search as having no eligible result rather than escape, normalize, or substitute a URL
- **AND** it SHALL NOT construct a double-quoted, piped, redirected, chained or command-substituting fallback

#### Scenario: Available access uses real probe only
- **WHEN** actual search returns an eligible HTTP(S) URL and an allowed native or fallback fetch returns real page content
- **THEN** HITL1 SHALL record the accepted available observation and SHALL NOT count probe output as evidence

#### Scenario: Unavailable access remains at HITL1
- **WHEN** search or every permitted bounded fetch is absent, blocked, fails or returns no usable page content
- **THEN** HITL1 SHALL record the unavailable observation, preserve user choices and remain in HITL1

#### Scenario: HITL1 writes accepted surfaces not status tree
- **WHEN** HITL1 records topic intent, user choices and capability observation
- **THEN** identity/intent SHALL be in canonical plan+seed and choices/access SHALL be in `rb_profile.yaml`
- **AND** HITL1 SHALL NOT create `rb_status.json#/phases/hitl1/*` or another research-access/topic status tree

#### Scenario: Ordinary mid-run message cannot reuse HITL1 mapping authority
- **WHEN** a user voluntarily sends a message while a later `stop: no` phase is executing
- **THEN** PRP-002 SHALL NOT authorize writing that message into HITL1 profile/topic owners or running topic-state mutation from the message alone
- **AND** the message SHALL NOT create a new HITL checkpoint, permission source, pause state or interrupt lifecycle

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
  - consume the existing HITL1 entry path and establish `current_node: phases/phase-hitl1.md`, `current_gate: hitl1_recorded`, `next_gate: setup_ready` before topic mutation;
  - only inside that accepted HITL1 decision window, map the user's clear acceptance or correction to the existing profile/topic fields; do not treat ordinary messages outside HITL1 as persisted HITL1 intent or mutation authority;
  - when the user's semantics are clear, treat that answer as confirmation and do not require a blanket second confirmation; ask only the minimum question needed for substantive ambiguity, real cost/permission expansion, or irreversible risk;
  - after the user's decision, write a retained topic-state input file containing `add_topic` entries with title, descriptive slug stem, must-answer set, scope role and dependencies;
  - run one `operate-topic-state apply` change set so the approved canonical registry and all UID-bound seed skeletons commit together; do not directly write registry frontmatter or defer approved intent to the seed phase;
  - select the `research_profile` enum and write `root_must_answer_set` from the accepted recommendation/correction;
  - write `human_decision_checkpoints.hitl1.status` and `.recorded_at`;
  - run `apply-research-style.mjs` using committed registry count;
  - execute at most one neutral capability-only search, inspect only its first actual HTTP(S) result and continue only when that result is eligible, then perform a bounded fetch sequence for only that URL: use the available native fetch surface first, then only when native fetch is absent before invocation or fails to return real page content because it is blocked, unavailable or failed, use at most one shell `curl` fallback already permitted by independently configured host shell/network policy. Record one final direct `research_access` observation.
- **Expected Artifacts**: canonical `rb_plan.md` registry, matching UID-bound seeds, and `rb_profile.yaml` containing user choices, style parameters, HITL1 marker and research-access observation.
- **Gate Command**: existing `check-gate-hitl1-recorded.mjs` under the current node.
- **On Gate Pass**: read `check.next`.
- **On Gate Fail**: read inspect/advice, repair the one direct blocker and rerun the same command/gate; if access remains unavailable after the bounded sequence, preserve choices, repair/switch environment, and rerun the same bounded probe and gate.
- **Stop Behavior**: wait for the user's research semantic decision at HITL1; a clear acceptance or correction satisfies that human decision boundary, after which Agent executes ordinary apply/style/probe/fallback/Gate commands without returning each mechanical step to the user. Only a new host permission, unavailable legal surface or non-delegable external environment action returns the smallest boundary to the user.
- **Anti-Cheating Rules**: no chat-only answers, fake probe, direct registry edit, seed-only identity, mock access, parallel status tree, automatic retry tree, invented user semantics, or treating non-HITL chat as HITL1 mutation authority.

Probe SHALL remain bounded to one search invocation, only the first actual HTTP(S) result when eligible, and no more than two fetch invocations for that same URL. Eligible means the URL came directly from that search rather than user/model invention or substitution and does not target `localhost`, loopback, or a literal private/link-local address. If the first result is ineligible, the Agent SHALL record the no-eligible-result branch rather than select a later result. If a native fetch surface is available, the Agent SHALL try it first. The only v1 alternative SHALL be one shell `curl --fail --silent --show-error --location --max-time 15 --proto '=http,https' --proto-redir '=http,https' -- "<same-url>"` invocation, used only when native fetch is absent before invocation or the native attempt returns no real page content because it is blocked, unavailable or failed. The initial request and redirects SHALL remain HTTP(S)-only, and host network policy SHALL remain authoritative. A successful native attempt SHALL end the sequence; the Agent SHALL NOT try `curl` as a redundant check. The Agent SHALL NOT select a second search result, repeat either surface, add another fallback tier, or persist an automatic retry tree.

Search unavailable/failed/blocked/no eligible result, with no fetch invocation, SHALL record `unavailable` with `fetch_outcome: not_attempted`. A successful native or fallback fetch SHALL record `available`, the searched `result_url`, `fetch_outcome: success`, and the actual successful `fetch_surface`; a successful fallback SHALL record `fetch_surface: curl`. This is a v0.39 HITL1 writer requirement for current successful probes: `fetch_surface` SHALL remain optional for schema compatibility, and the existing Gate SHALL NOT independently enforce the audit label. If every permitted fetch attempt returns no real page content, the Agent SHALL record `unavailable`, the same `result_url`, a non-success `fetch_outcome`, the final attempted `fetch_surface` when known, and one bounded direct reason that names the native and fallback outcomes without adding attempt-history fields. Only real fetched page content permits `available`; command exit success, an empty body, a search snippet, or an HTTP error/challenge shell without the requested page content SHALL NOT suffice.

Native fetch policy failure SHALL NOT itself authorize shell/network access or a policy bypass. When independently configured host shell/network permission already permits the exact alternative fetch invocation and target, fallback SHALL be Agent-owned mechanical execution. The Agent SHALL NOT silently widen project configuration, ask the user to run `curl`, acknowledge the failure, or confirm continuation before trying it. If `curl` is absent, blocked by host policy, requires permission the Agent does not have, targets an ineligible URL, or also fails, the Agent SHALL preserve accepted HITL1 semantic choices, record the honest unavailable observation, and expose only the smallest permission or external-environment prerequisite before rerunning this same probe and Gate. User approval alone SHALL NOT convert failed or missing page content into a successful observation.

Probe URL/content SHALL NOT become research evidence, cache, submitted output, receipt or gate coverage. HITL1 SHALL NOT create offline research artifacts, fake probe receipts, evidence-free report skeletons, automatic retry trees or another interactive checkpoint. User choices and research access SHALL remain in the accepted profile surface, not a parallel status tree.

HITL1 natural-language mapping SHALL be a prompt-side Agent responsibility within the existing `stop: yes` boundary, not a new Engine authority or generic conversation interceptor. It SHALL NOT persist, queue, or apply a user's voluntary message from a later `stop: no` phase, and SHALL NOT create pause, reentry, permission or mutation capability.

HITL1 gate SHALL require `CanonicalPlanSchema`, exact UID-bound seed projection and completed topic-state workspace state. Legacy-compatible plan readability SHALL not count as HITL1 completion. The Agent SHALL run the existing gate after user input; `stop: yes` does not waive deterministic checks.

Initial topic-state apply SHALL run only after `enter-phase` has populated `rb_status.json#/current_node: phases/phase-hitl1.md` and the existing bootstrap-compatible status synchronization has established `current_gate: hitl1_recorded` / `next_gate: setup_ready`. The apply context argument is descriptive only; it SHALL NOT authorize mutation when those direct lifecycle facts are absent or stale.

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

#### Scenario: Declared HITL1 context is not mutation authority
- **WHEN** an apply request declares HITL1 but `current_node` or the accepted HITL1 status window does not match
- **THEN** apply SHALL reject before workspace creation without changing plan, seed, profile, status or trace
- **AND** the Agent SHALL restore or re-enter the existing legal lifecycle path rather than request a bypass

#### Scenario: Plan-first crash fails at one prerequisite
- **WHEN** an accepted topic-state workspace remains after plan replacement and before seed completion
- **THEN** HITL1 gate SHALL report the workspace/seed prerequisite and exact recover action
- **AND** SHALL short-circuit derivative profile/count/seed-floor symptoms

#### Scenario: Native fetch success ends the probe
- **WHEN** actual search returns an eligible HTTP(S) URL and the available native fetch returns real page content
- **THEN** HITL1 SHALL record the available observation with the native `fetch_surface`
- **AND** it SHALL NOT invoke `curl` or count probe output as evidence

#### Scenario: Native fetch block uses one same-URL fallback
- **WHEN** actual search returns an eligible HTTP(S) URL and native fetch is absent, blocked, unavailable or fails without real page content
- **AND** independently configured host permission permits the exact shell/network action
- **THEN** the Agent SHALL invoke `curl` at most once for that same URL without asking the user to operate the pipeline
- **AND** real page content SHALL produce the existing available observation with `fetch_surface: curl`

#### Scenario: Exhausted bounded fetch remains at HITL1
- **WHEN** actual search returns an eligible HTTP(S) URL but every permitted fetch attempt is absent, blocked, unavailable or failed
- **THEN** HITL1 SHALL record one unavailable observation with the same URL and bounded direct reason, preserve user choices and remain in HITL1
- **AND** it SHALL NOT select another URL, add a fetch tier, persist retry history or claim access is available

#### Scenario: Missing permission exposes only the smallest boundary
- **WHEN** native fetch cannot return page content and invoking the only fallback requires a host permission the Agent does not have
- **THEN** the Agent SHALL record an honest unavailable observation and ask only for that permission or external action
- **AND** after the boundary is resolved, the Agent SHALL resume the same bounded probe and Gate mechanics itself

#### Scenario: Ineligible local target is not sent to shell fallback
- **WHEN** the first HTTP(S) search result targets `localhost`, loopback, or a literal private/link-local address
- **THEN** HITL1 SHALL treat it as no eligible result and record the existing unavailable/not-attempted observation
- **AND** native rejection or user approval SHALL NOT authorize a `curl` attempt to that target

#### Scenario: HITL1 writes accepted surfaces not status tree
- **WHEN** HITL1 records topic intent, user choices and capability observation
- **THEN** identity/intent SHALL be in canonical plan+seed and choices/access SHALL be in `rb_profile.yaml`
- **AND** HITL1 SHALL NOT create `rb_status.json#/phases/hitl1/*` or another research-access/topic status tree

#### Scenario: Ordinary mid-run message cannot reuse HITL1 mapping authority
- **WHEN** a user voluntarily sends a message while a later `stop: no` phase is executing
- **THEN** PRP-002 SHALL NOT authorize writing that message into HITL1 profile/topic owners or running topic-state mutation from the message alone
- **AND** the message SHALL NOT create a new HITL checkpoint, permission source, pause state or interrupt lifecycle

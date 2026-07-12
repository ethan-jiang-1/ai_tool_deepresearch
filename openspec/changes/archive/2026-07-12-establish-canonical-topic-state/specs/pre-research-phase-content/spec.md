> req: PRP-011

## MODIFIED Requirements

### Requirement: Phase HITL1 body completeness and stop semantics

`phase-hitl1.md` SHALL contain the complete 9-section body, retain `stop: yes`, and declare `execution_contract.search_policy: capability_probe_only`.

Section requirements:

- **Stage Goal**: collect explicit pre-research input, confirm actual research access, and commit approved canonical topic intent.
- **Required Inputs**: instantiated bundle and `shared-profile.md`.
- **Allowed Actions**:
  - read the original research question/brief and decide whether topic rewrite is needed;
  - write structured original-topic narrative to `rb_plan.md` body without inventing missing user constraints;
  - derive an Agent-facing preview of initial topics and suggested research profile;
  - show original topic + topic preview + structured HITL1 question surface to the user and wait for the answer;
  - consume the existing HITL1 entry path and establish `current_node: phases/phase-hitl1.md`, `current_gate: hitl1_recorded`, `next_gate: setup_ready` before topic mutation;
  - after user approval, write a retained topic-state input file containing `add_topic` entries with title, descriptive slug stem, must-answer set, scope role and dependencies;
  - run one `operate-topic-state apply` change set so the approved canonical registry and all UID-bound seed skeletons commit together; do not directly write registry frontmatter or defer approved intent to the seed phase;
  - select the `research_profile` enum and write `root_must_answer_set`;
  - write `human_decision_checkpoints.hitl1.status` and `.recorded_at`;
  - run `apply-research-style.mjs` using committed registry count;
  - execute at most one neutral capability-only search and at most one fetch of the first usable HTTP(S) result, then record direct `research_access` observation.
- **Expected Artifacts**: canonical `rb_plan.md` registry, matching UID-bound seeds, and `rb_profile.yaml` containing user choices, style parameters, HITL1 marker and research-access observation.
- **Gate Command**: existing `check-gate-hitl1-recorded.mjs` under the current node.
- **On Gate Pass**: read `check.next`.
- **On Gate Fail**: read inspect/advice, repair the one direct blocker and rerun the same command/gate; if access is unavailable, preserve choices, repair/switch environment, and rerun the same bounded probe and gate.
- **Stop Behavior**: wait for user input at HITL1; after the decision, Agent executes ordinary apply/style/probe commands.
- **Anti-Cheating Rules**: no chat-only answers, fake probe, direct registry edit, seed-only identity, mock access, parallel status tree or automatic retry tree.

Probe SHALL remain bounded to one search invocation and one fetch invocation. It SHALL answer only whether the first usable HTTP(S) result from a neutral capability-only search can be fetched as page content. Search unavailable/failed/blocked/no usable result, or a missing fetch surface before invocation, SHALL record `unavailable` with `fetch_outcome: not_attempted`; an attempted blocked/failed fetch SHALL record the corresponding non-success outcome; only real fetched page content permits `available`.

Probe URL/content SHALL NOT become research evidence, cache, submitted output, receipt or gate coverage. HITL1 SHALL NOT create offline research artifacts, fake probe receipts, evidence-free report skeletons, automatic retry trees or another interactive checkpoint. User choices and research access SHALL remain in the accepted profile surface, not a parallel status tree.

HITL1 gate SHALL require `CanonicalPlanSchema`, exact UID-bound seed projection and completed topic-state workspace state. Legacy-compatible plan readability SHALL not count as HITL1 completion. The Agent SHALL run the existing gate after user input; `stop: yes` does not waive deterministic checks.

Initial topic-state apply SHALL run only after `enter-phase` has populated `rb_status.json#/current_node: phases/phase-hitl1.md` and the existing bootstrap-compatible status synchronization has established `current_gate: hitl1_recorded` / `next_gate: setup_ready`. The apply context argument is descriptive only; it SHALL NOT authorize mutation when those direct lifecycle facts are absent or stale.

#### Scenario: User approves initial topics and Agent materializes them
- **WHEN** the user answers HITL1 with approved or revised topic semantics
- **THEN** the Agent SHALL write retained apply input and immediately run topic-state apply
- **AND** canonical registry plus UID-bound seeds SHALL commit before style computation and gate pass

#### Scenario: HITL1 keeps user responsibility semantic
- **WHEN** topic intent is clear from the user's answer
- **THEN** the Agent SHALL run apply/style/probe/gate without asking the user to execute commands
- **AND** it SHALL ask again only for genuinely unresolved semantics, risk or permission

#### Scenario: Declared HITL1 context is not mutation authority
- **WHEN** an apply request declares HITL1 but `current_node` or the accepted HITL1 status window does not match
- **THEN** apply SHALL reject before workspace creation without changing plan, seed, profile, status or trace
- **AND** the Agent SHALL restore or re-enter the existing legal lifecycle path rather than request a bypass

#### Scenario: Plan-first crash fails at one prerequisite
- **WHEN** an accepted topic-state workspace remains after plan replacement and before seed completion
- **THEN** HITL1 gate SHALL report the workspace/seed prerequisite and exact recover action
- **AND** SHALL short-circuit derivative profile/count/seed-floor symptoms

#### Scenario: Available access uses real probe only
- **WHEN** actual search returns a usable HTTP(S) URL and actual fetch returns page content
- **THEN** HITL1 SHALL record the accepted available observation and SHALL NOT count probe output as evidence

#### Scenario: Unavailable access remains at HITL1
- **WHEN** search/fetch is absent, blocked, fails or returns no usable page
- **THEN** HITL1 SHALL record the unavailable observation, preserve user choices and remain in HITL1

#### Scenario: HITL1 writes accepted surfaces not status tree
- **WHEN** HITL1 records topic intent, user choices and capability observation
- **THEN** identity/intent SHALL be in canonical plan+seed and choices/access SHALL be in `rb_profile.yaml`
- **AND** HITL1 SHALL NOT create `rb_status.json#/phases/hitl1/*` or another research-access/topic status tree

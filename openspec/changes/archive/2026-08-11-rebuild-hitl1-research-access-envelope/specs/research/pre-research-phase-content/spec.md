# research/pre-research-phase-content (delta)

## MODIFIED Requirements

### Requirement: Phase HITL1 body completeness and stop semantics

`phase-hitl1.md` SHALL contain the complete 9-section body, retain `stop: yes`,
and declare `execution_contract.search_policy: capability_probe_only`.

Its Stage Goal, Required Inputs, topic recommendation, natural-language HITL1
mapping, status synchronization, canonical topic-state apply, style handoff,
Expected Artifacts, Gate Command, Gate pass/fail handling, Stop Behavior, and
Anti-Cheating Rules SHALL retain the accepted behavior. A clear user decision
still returns ordinary apply/style/probe/Gate mechanics to the Phase Agent;
ordinary later chat SHALL not become HITL1 intent or mutation authority.

After the required style handoff, the Phase Agent SHALL render HIU-002's exact
pre-probe notice, load the general capability-probe guide plus the separate required
`shared-hitl1-research-access-envelope.md` controller, and spawn one bounded probe
agent with those two guidance surfaces. The Phase Agent SHALL NOT directly invoke
search or fetch. The controller SHALL carry the declared source-class ladder in
order, the classification vocabulary, the candidate eligibility and native-first/same-
URL fallback bounds, and one compact return-map contract. The Phase body and general
probe guide SHALL not duplicate that controller content. The controller is a
one-spawn Agent-facing projection only: it SHALL NOT become a run-bundle record,
evidence surface, renderer, runtime verdict, or a second Source of Record.
The probe agent SHALL not read or write a run bundle, profile, status, trace,
receipt, ledger, work-unit output, cache, artifact, reference, or Gate.

The return map SHALL be exactly one existing `research_access` observation
branch. The Phase Agent remains the only writer of `rb_profile.yaml` and SHALL
write a returned valid observation unchanged before rendering the corresponding
HIU-002 result and running the existing `check-gate-hitl1-recorded.mjs`.
Spawn failure, no return, or a return that does not satisfy an existing branch
SHALL produce an honest `unavailable` observation with a direct non-empty
reason carrying the `access_boundary` probe-relay location and its universal extent,
plus one `unreachable` envelope entry for every declared source class, so
that the recorded owner is the Agent rather than an external prerequisite. This
path preserves recorded choices, remains at HITL1, and returns to the same
probe/Gate retry boundary; it SHALL not add a retry tree, second writer, status
tree, Gate, provider path, receipt, ledger, or evidence surface.

When the written observation is `available` and its envelope records one or more
unreachable declared source classes, the Phase Agent SHALL disclose in the existing
HITL1 communication surface which declared source classes are unreachable, and then
continue through the same Gate. That disclosure is information transfer only: it
SHALL NOT create a new HITL decision point, ask the user for instructions, block
advance, or become permission or capability.

All accepted PRP-002 behavior not explicitly replaced below remains normative:
the topic recommendation/clear-decision mapping, status-before-topic-state
apply, atomic canonical registry and UID-bound seed materialization, style
handoff freshness repair, payload fields, selected adapter boundary, on-Gate
pass/failed-hint handling, and HITL1 stop semantics. In particular, the
delegation change neither authorizes a status hand edit nor changes setup
advance, canonical Topic ownership, user-control snapshots, profile fields, or
the Gate's prerequisites.

The controller SHALL direct exactly one search per attempted declared source class,
using that class's neutral query; at most three eligible returned HTTP(S) candidates
in provider order; native-first plus one independently permitted same-URL fallback;
and first-success stop across the declared ladder. It SHALL define the three existing
observation branches, one reachability result per declared class (marking classes
after an available first-success as `not_attempted`), the paired
`access_boundary` location/extent when one owner is established, and explicit honest
unclassified return when it is not. It SHALL prohibit prose-prefix classification,
attempt history, query/URL history, response bodies, retries, evidence persistence,
or a new interaction checkpoint. The selected adapter retains authority for which
host operations are permitted; the controller does not create shell permission or a
bypass.

Only real fetched page content permits `available`; command exit success, an empty
body, search snippets, or HTTP error/challenge shells do not. The Phase Agent SHALL
use only the direct returned observation status to choose HIU-002's result; that
result is rendered after the write and before the same Gate, is not a Gate verdict,
and shall not announce silent execution. Probe URL/content and tool output SHALL not
become production evidence, cache, submitted output, receipt, Gate coverage, or a
new interaction checkpoint.

#### Scenario: Phase delegates the fixed probe after the recorded decision

- **WHEN** HITL1 has completed topic-state and style prerequisites
- **THEN** the Phase Agent SHALL render the pre-probe notice and spawn exactly one
  probe agent using the dedicated guidance and the declared source-class ladder
- **AND** the Phase Agent SHALL not itself invoke native search or fetch

#### Scenario: Phase retains the existing write and Gate owners

- **WHEN** the probe agent returns an existing schema-valid available or unavailable observation
- **THEN** the Phase Agent SHALL write that observation to `rb_profile.yaml`, render
  the matching result, and run the same HITL1 Gate
- **AND** the probe agent SHALL not write bundle state or run the Gate

#### Scenario: Invalid delegation result is honest unavailable

- **WHEN** probe-agent spawn fails, returns nothing, or returns an invalid observation
- **THEN** the Phase Agent SHALL write one honest unavailable branch with a direct
  reason and the probe-relay boundary location
- **AND** it SHALL preserve recorded choices and expose the same probe/Gate path without
  an automatic retry or an invented success

#### Scenario: Fetch-side unavailable branch carries the same classification vocabulary

- **WHEN** search returns eligible candidates for a declared class but no legal fetch
  sequence returns real requested page content
- **THEN** that positive-count unavailable branch SHALL carry the same
  access-boundary location/extent vocabulary required of the search-side branch
- **AND** it SHALL NOT be satisfied by a free-text reason alone

#### Scenario: Returned native success has the accepted shape

- **WHEN** a probe agent fetches real page content from the first eligible returned candidate
- **THEN** it SHALL return `available` with count and ordinal `1`, that candidate URL,
  `fetch_outcome: success`, and its actual native surface
- **AND** it SHALL not invoke curl, consider another candidate, consider a later declared
  class, or retain page content

#### Scenario: Returned fallback and unavailable branches retain existing bounds

- **WHEN** native fetch cannot return real content
- **THEN** the probe agent SHALL use at most one independently permitted same-URL curl
  fallback and otherwise return the truthful unavailable branch
- **AND** it SHALL not change URLs, skip a no-legal-path candidate, add a tier, or ask the
  user to operate the pipeline

#### Scenario: Partial reachability is disclosed without a new decision point

- **WHEN** the written available observation records one or more unreachable declared
  source classes
- **THEN** the Phase Agent SHALL disclose those unreachable classes in the existing HITL1
  communication surface and continue to the same Gate
- **AND** it SHALL NOT add a HITL checkpoint, request user instructions, or block advance

#### Scenario: Direct result remains distinct from Gate verdict

- **WHEN** the Phase Agent has written either returned observation
- **THEN** it SHALL render HIU-002's corresponding result before the existing Gate
- **AND** only a passing Gate SHALL authorize the existing silent-execution exit

### Requirement: HITL1 body exposes a concrete payload checklist

`phase-hitl1.md` SHALL expose the existing minimum write checklist:
`research_profile`, `root_must_answer_set`, `research_style_params`,
`research_access.status`, candidate count/ordinal, the source-class envelope, the
`access_boundary` location/extent pair, available and unavailable
branch fields, and `human_decision_checkpoints.hitl1.status`/`.recorded_at`.
The list remains an alignment/review surface rather than schema authority.

The checklist SHALL identify `rb_profile.yaml#/research_access` as Phase-owned:
the probe agent returns no persisted artifact, and optional `search_surface` /
`fetch_surface` labels remain non-Gate-required audit labels. A no-candidate
unavailable observation alone may have count zero without ordinal or URL; every
positive-count observation retains the final considered URL. The checklist SHALL
show the `access_boundary` pair as present-together-or-absent-together and SHALL show an
absent pair as an explicitly unclassified observation rather than a defaulted one.

#### Scenario: Human can audit the isolated observation handoff

- **WHEN** a human reviewer reads `phase-hitl1.md`
- **THEN** the reviewer SHALL see the complete existing observation fields, the envelope
and `access_boundary` pair, and that
  the Phase Agent, not the probe agent, writes the profile
- **AND** review SHALL not require reconstructing a parallel receipt or status protocol

### Requirement: HITL1 uses the selected semantic research-access adapter

After the user has supplied or confirmed HITL1 research semantics, the HITL1 phase
body SHALL direct the Agent to read the one selected research-access adapter contract
before the existing bounded probe. When that contract supplies an already authorized
operation, the Phase Agent SHALL deliver its operation facts with the separate
controller to the isolated probe agent; the probe performs the bounded search/fetch
mechanics and returns the existing direct profile observation for the Phase to record.
When it supplies no legal operation, the isolated probe SHALL return the honest
unavailable branch; the Phase SHALL retain recorded user semantics, write it, and
expose only the adapter's direct external boundary before rerunning the same probe and
Gate.

The phase body SHALL take selected-host operations from that adapter contract, while
it takes the source-class ladder, classification axes, and return map only from the
separate actor-delivered access-envelope controller. It SHALL load both guidance
surfaces for the isolated probe without restating controller content in phase prose,
so a controller revision does not require a second edit to stay consistent.

This phase content SHALL NOT grant provider permission, ask the user to run the
pipeline, hand-edit `research_access`, add a HITL checkpoint, or write a parallel
adapter/status record. It SHALL keep probe output outside research evidence surfaces.

#### Scenario: Isolated probe executes an already authorized adapter operation

- **WHEN** the selected adapter declares a legal search and same-URL fetch surface
- **THEN** the Phase Agent SHALL actor-deliver that adapter's facts and the controller
  to the isolated probe after the existing HITL1 semantic decision without seeking a
  second user confirmation
- **AND** the probe SHALL execute the bounded operation while the Phase alone records
  the direct result and reruns the existing HITL1 Gate

#### Scenario: Selected adapter is absent

- **WHEN** the selected adapter has no callable search/fetch surface in the current host
- **THEN** the isolated probe SHALL return the absent-surface boundary location and the
  Phase SHALL record it without asking the user to fabricate profile data or execute
  `curl`
- **AND** it SHALL preserve the current HITL1 user decision and remain at HITL1

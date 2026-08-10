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
pre-probe notice, load one dedicated probe-agent guidance surface, and spawn
one bounded probe agent with that generated prompt. The Phase Agent SHALL NOT
directly invoke search or fetch. The prompt SHALL carry the exact neutral query
`site:wikipedia.org "Internet protocol suite"`, the existing candidate and
native-first/same-URL fallback bounds, and one compact return-map contract.
The probe agent SHALL not read or write a run bundle, profile, status, trace,
receipt, ledger, work-unit output, cache, artifact, reference, or Gate.

The return map SHALL be exactly one existing `research_access` observation
branch. The Phase Agent remains the only writer of `rb_profile.yaml` and SHALL
write a returned valid observation unchanged before rendering the corresponding
HIU-002 result and running the existing `check-gate-hitl1-recorded.mjs`.
Spawn failure, no return, or a return that does not satisfy an existing branch
SHALL produce an honest `unavailable` observation with a direct non-empty
reason. This path preserves recorded choices, remains at HITL1, and returns to
the same probe/Gate retry boundary; it SHALL not add a retry tree, second
writer, status tree, Gate, provider path, receipt, ledger, or evidence surface.

All accepted PRP-002 behavior not explicitly replaced below remains normative:
the topic recommendation/clear-decision mapping, status-before-topic-state
apply, atomic canonical registry and UID-bound seed materialization, style
handoff freshness repair, payload fields, selected adapter boundary, on-Gate
pass/failed-hint handling, and HITL1 stop semantics. In particular, the
delegation change neither authorizes a status hand edit nor changes setup
advance, canonical Topic ownership, user-control snapshots, profile fields, or
the Gate's prerequisites.

The probe agent SHALL make exactly one search invocation using the literal
neutral query. A syntactically eligible candidate is an actual returned HTTP(S)
URL in provider order with no raw single quote, ASCII whitespace/control,
credentials, localhost, loopback, literal private, or link-local target. It
SHALL consider only the first three eligible candidates, never invent,
normalize, substitute, or retain query/URL history.

For each considered candidate, the probe agent SHALL invoke the available native
fetch surface first. Only when it is absent before invocation or its one attempt
returns no real page content because it is blocked, unavailable, or failed, and
independently configured host shell/network permission permits the exact action
and target, it MAY invoke at most one standalone same-URL fallback:

```bash
curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'
```

The fallback SHALL contain no prefix assignment, pipe, redirection, command
substitution, shell chaining, or trailing command; requests and redirects stay
HTTP(S)-only and host DNS/network policy remains authoritative. A native or
permitted fallback response with real requested page content ends the probe. A
later candidate is legal only after the current permitted sequence cannot return
real content; a permission, absent-surface, or other no-legal-path boundary
stops the probe at that candidate. The probe agent SHALL not repeat a surface,
add a fallback tier, make another search, or create automatic retry state.

The valid return map SHALL preserve the existing observation branches:

- no callable/failed/blocked search or no eligible candidate: `unavailable`,
  `fetch_outcome: not_attempted`, count `0`, no ordinal or URL, and a direct
  reason (using existing `surface_absent:` / `permission_required:` prefixes
  when applicable);
- real native or fallback content: `available`, ISO `probed_at`, returned
  `result_url`, `fetch_outcome: success`, actual successful `fetch_surface`,
  count `1..3`, and final ordinal;
- a positive-count no-legal-path or exhausted branch: `unavailable`, final
  returned URL, truthful attempted or not-attempted outcome/surface, count and
  ordinal, and one direct reason.

Only real fetched page content permits `available`; command exit success, an
empty body, search snippets, or HTTP error/challenge shells do not. The Phase
Agent SHALL use only the direct observation status to choose HIU-002's result;
that result is rendered after the write and before the same Gate, is not a Gate
verdict, and shall not announce silent execution. Native policy failure does
not create shell permission or a bypass. Probe URL/content and tool output SHALL
not become production evidence, cache, submitted output, receipt, Gate coverage,
or a new interaction checkpoint.

#### Scenario: Phase delegates the fixed probe after the recorded decision

- **WHEN** HITL1 has completed topic-state and style prerequisites
- **THEN** the Phase Agent SHALL render the pre-probe notice and spawn exactly one
  probe agent using the dedicated guidance and fixed query
- **AND** the Phase Agent SHALL not itself invoke native search or fetch

#### Scenario: Phase retains the existing write and Gate owners

- **WHEN** the probe agent returns an existing schema-valid available or unavailable observation
- **THEN** the Phase Agent SHALL write that observation to `rb_profile.yaml`, render
  the matching result, and run the same HITL1 Gate
- **AND** the probe agent SHALL not write bundle state or run the Gate

#### Scenario: Invalid delegation result is honest unavailable

- **WHEN** probe-agent spawn fails, returns nothing, or returns an invalid observation
- **THEN** the Phase Agent SHALL write one honest unavailable branch with a direct reason
- **AND** it SHALL preserve recorded choices and expose the same probe/Gate path without
  an automatic retry or an invented success

#### Scenario: Returned native success has the accepted shape

- **WHEN** a probe agent fetches real page content from the first eligible returned candidate
- **THEN** it SHALL return `available` with count and ordinal `1`, that candidate URL,
  `fetch_outcome: success`, and its actual native surface
- **AND** it SHALL not invoke curl, consider another candidate, or retain page content

#### Scenario: Returned fallback and unavailable branches retain existing bounds

- **WHEN** native fetch cannot return real content
- **THEN** the probe agent SHALL use at most one independently permitted same-URL curl
  fallback and otherwise return the truthful unavailable branch
- **AND** it SHALL not change URLs, skip a no-legal-path candidate, add a tier, or ask the
  user to operate the pipeline

#### Scenario: Direct result remains distinct from Gate verdict

- **WHEN** the Phase Agent has written either returned observation
- **THEN** it SHALL render HIU-002's corresponding result before the existing Gate
- **AND** only a passing Gate SHALL authorize the existing silent-execution exit

### Requirement: HITL1 body exposes a concrete payload checklist

`phase-hitl1.md` SHALL expose the existing minimum write checklist:
`research_profile`, `root_must_answer_set`, `research_style_params`,
`research_access.status`, candidate count/ordinal, available and unavailable
branch fields, and `human_decision_checkpoints.hitl1.status`/`.recorded_at`.
The list remains an alignment/review surface rather than schema authority.

The checklist SHALL identify `rb_profile.yaml#/research_access` as Phase-owned:
the probe agent returns no persisted artifact, and optional `search_surface` /
`fetch_surface` labels remain non-Gate-required audit labels. A no-candidate
unavailable observation alone may have count zero without ordinal or URL; every
positive-count observation retains the final considered URL.

#### Scenario: Human can audit the isolated observation handoff

- **WHEN** a human reviewer reads `phase-hitl1.md`
- **THEN** the reviewer SHALL see the complete existing observation fields and that
  the Phase Agent, not the probe agent, writes the profile
- **AND** review SHALL not require reconstructing a parallel receipt or status protocol

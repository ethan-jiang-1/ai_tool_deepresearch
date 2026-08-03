## Context

See `proposal.md` for the P4.3 observation. The retained real-Actor run proves the
claim -> Subject result -> formal submit -> ledger path, but its Wave0 Gate fails
because this fixture omits two existing parts of the Wave0 flow: the
actor-declared conditional shared reference and the Phase-owned Seed Projection
Packet. Its setup helper also records synthetic predecessor/completion trace
facts, while its raw Gate invocation bypasses the existing monitor. Those facts
make the Heavy timeline unhealthy and make the fixture's asserted full-path
claim inaccurate.

The accepted contracts already divide the work: `dpt-source-intake` writes the
real source output, cache trail, and, when the shared-reference floor applies,
the declared `reference/00-shared-<slug>.md`; the Phase Agent consumes
dry-submit/formal-submit feedback, creates the projection packet, and invokes
the existing writer; the Engine owns submit, state mutation, trace, inspect,
and Gate verdicts. No framework contract is missing.

## Goals / Non-Goals

**Goals:**

- Make case-211 compose the existing legal Wave0 sequence from real actor
  output through monitored Gate evidence.
- Remove only this real-Actor fixture's synthetic predecessor/completion trace
  setup, replacing it with the existing legal fixture-bound predecessor path,
  while preserving the helper's current defaults for fixture-backed callers.
- Lock the Markdown composition and helper opt-out with deterministic tests,
  while reserving real Agent behavior claims for a fresh selected
  `agent_flow_e2e` run.

**Non-Goals:**

- Do not change work-unit assignment required outputs, Gate rules, schemas,
  health policy, selector behavior, Supervisor behavior, or framework version.
- Do not make the Phase Agent author, reconstruct, or declare a Subject-owned
  reference, result, receipt, cache trail, or ledger row.
- Do not start another paid Headless run under the P4.3 authorization that was
  consumed by the retained failure.

## Decisions

### Make the conditional shared reference explicit in the assigned task

Case-211 will pass a concrete `task_brief` and expected declared-reference path
to its existing `wave0_source_intake` queue task. The brief will state that the
real Subject Actor must write and declare
`reference/00-shared-agentic-coding-tools.md`, include a real `source_url`, and
also produce its already-required
`artifacts/wave0/agentic-coding-tools/source.yaml` and cache trail. The
playbook will retain the actor result as the source for the output declaration;
it will not write the reference itself.

Changing `work-unit-assignment-contract.mjs` is rejected: the accepted contract
intentionally keeps only `source.yaml` as the required assignment output and
makes the shared reference conditional actor-declared output. Requiring the
reference globally would change behavior beyond the observed fixture gap.

### Follow the existing submit and Phase closeout path in order

After the real actor returns, the Playbook Agent will invoke
`operate-work-unit dry-submit`, read its disposition, and only formally submit
when the candidate is accepted. It will then read
`operate-work-unit inspect --eligible-rows` and
`operate-topic-state schema --context wave_projection`, retain a
contribution-aware Wave0 Projection Packet, apply it through
`operate-topic-state`, and run the returned/current Wave0 inspect. The packet
will use the submitted work ID's Engine-provided ordinal rather than inventing
an ordinal from source-file length.

Skipping dry-submit or manually patching a seed is rejected because it bypasses
the existing ownership and feedback loop. Hard-coding a packet schema is also
rejected because `operate-topic-state schema` is the accepted current input
contract.

### Establish only real completion/observability facts

`writeWave0Scaffold` will gain a narrowly named option for callers that need a
fresh Wave0 window without fixture-owned handoff or completion trace rows.
Case-211 alone will enable it. At actual phase closeout, the case will call
`log-event --event wave0_completion`, then run the Wave0 Gate through
`run-gate-with-monitor`; it will consume the monitor's captured Gate JSON when
recording its native check. Work-unit inspection remains the existing direct
CLI operation and retains its own JSON output.

Keeping synthetic rows is rejected because they claim an unperformed seed
handoff and phase completion. Adding a new observability writer is rejected
because the monitor already records the required diagnostic artifact without
changing the Gate's verdict authority.

### Establish the existing legal predecessor before Wave0

Disabling `writeWave0Handoff` alone cannot establish the Wave0 window:
handoff preflight and Wave Projection authorization require a passed
`seed-topics-ready` predecessor, a route-bound `load_complete` into Wave0, and
the corresponding `rb_status.json` window. Case-211 will instead start with
fixed deterministic setup input, run the existing `setup-ready` Gate, enter
seed topics, materialize the one seed topic, run the existing
`seed-topics-ready` Gate, enter Wave0, and advance status to
`seed_topics_ready` before its real actor claim. This is fixture-bound setup
that proves neither HITL1 recording nor Seed Agent behavior; its purpose is
only to establish the legal Phase/Engine boundary for the real Wave0 actor.

Hand-writing the predecessor trace/status is rejected because it bypasses the
same legal entry path whose absence caused the helper shortcut. Reusing the
existing deterministic gates and state operations keeps the boundary visible
without adding a new state, writer, or controller.

### Use static composition tests and a conditional real requalification

One focused unit test will exercise the helper opt-out and prove defaults are
unchanged for other cases. A Markdown integration contract test will assert the
case's V2 policy, conditional actor obligation, dry-submit -> submit -> packet
-> apply -> inspect -> completion-event -> monitored-Gate order, and absence of
raw Gate capture/synthetic setup use. Neither test claims actual search,
fetch, Subject execution, or Headless Playbook-Agent behavior.

The verification plan will designate a fresh discovery-selected real
`agent_flow_e2e` run as the only proof for repaired real-Actor behavior. If a
new bounded preflight does not select case-211, that result is a legitimate
stopping point; the task records it rather than forcing `--case`.

### Evolution review

No named state, projection, command, module, or reader-facing view is added or
materially changed. The existing reader boundary becomes accurate: the
submitted declaration shows what the Subject produced, the Engine-written
projection shows what the Phase consumed, and the monitored Gate shows the
deterministic decision. A maintainer can stop at those direct facts instead of
inferring completion from setup trace.

The control loop is a net simplification: real actor output -> dry-submit ->
formal submit -> one existing projection writer -> monitored inspect/Gate. It
replaces a synthetic setup trace plus raw Gate failure and subsequent manual
forensics. The user has supplied the current progressive-run objective; the
Agent performs ordinary authorized fixture repair; the Engine retains all
mutation and verdict authority. A new paid runtime exposure remains a separate
user budget decision.

## Risks / Trade-offs

- **The real actor does not produce the declared shared reference or cache
  evidence** -> dry-submit/formal-submit or Gate feedback identifies the
  precise missing output; preserve the failed boundary rather than create it
  from the Phase.
- **The returned contribution/preflight data does not support a valid packet**
  -> correct only the retained Phase packet using the reported current schema
  and rerun the same writer/inspect.
- **The helper option affects another fixture unintentionally** -> unit-test
  both default synthetic setup and the opt-out before the Markdown test.
- **The legal predecessor flow does not establish the required Wave0 window**
  -> retain the gate/entry/status feedback and repair only the case-owned
  fixture composition; do not restore synthetic trace/status rows.
- **A fresh discovery profile does not select case-211** -> record the selector
  fact and leave real-Actor requalification pending instead of bypassing the
  profile.
- **A selected requalification is native FAIL or Heavy health is ISSUES** ->
  retain the report and bundle, then open only the smallest evidence-backed
  follow-up change if a new root cause is established.

## Migration Plan

1. Complete plan review and validate the verification-routing plan before target
   edits.
2. Add the helper opt-out, repair case-211's Markdown flow, and add focused
   unit/integration contract tests.
3. Run the focused tests and canonical playbook validation; record the P4.3
   failure and P4.4 repair boundary in the progressive-run plan.
4. Run routing and governance checks, then closeout review.
5. Run a new discovery dry-run/preflight and request a new explicit Headless
   budget only if it selects case-211 for real requalification.

Rollback is a source reversion of the playbook, helper option, focused tests,
and backlog record. No persisted runtime migration, framework behavior change,
or version change is involved.

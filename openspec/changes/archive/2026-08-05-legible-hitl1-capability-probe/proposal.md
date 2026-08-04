## Why

`BUG-187` records a valid but opaque HITL1 research-access probe: after the
user has completed their research decision, an arbitrary-looking search and
fetch sequence appears with no explanation. The probe itself is the accepted
precondition for silent research, but the current Agent-facing flow does not
separate its bounded availability observation from research work, a new user
decision, or selected-host tool rendering.

The source incident is
`_backlog/bugs/BUG-187-hitl1-capability-probe-opaque-to-user.md`; its route and
admission boundary are tracked in
`_backlog/plans/bug-187-199-systemic-remediation-plan.md`. Discovery confirms
that phase/brief Markdown controls the explanatory text, while native tool
rows, transport/security errors, and shell output remain selected-host facts.

## What Changes

- Make the existing HITL1 capability probe legible through Markdown/Agent-flow
  text: before the probe, emit a short Chinese notice that it is a neutral
  research-access check, is not research content, and asks for no new decision.
- Require the one existing search to use the fixed neutral query
  `site:wikipedia.org "Internet protocol suite"`. It remains a real search:
  candidates still come only from that invocation in provider return order, and
  the query is not recorded as research evidence or runtime history.
- Define concise Chinese `available` and `unavailable` result messages. The
  Phase renders either message directly after its corresponding
  `research_access` observation and before the existing HITL1 Gate. An
  `available` result says only that the remaining HITL1 check will run; the
  existing silent-execution exit remains Gate-pass-only. An `unavailable`
  result says that recorded HITL1 choices remain valid, identifies no new
  decision, and returns to the existing smallest external boundary plus the
  same probe/Gate path.
- Make the host boundary explicit: framework Markdown may add its notice and
  result, but must neither promise to hide nor reinterpret native host tool
  calls, policy failures, or fallback output.
- Add static Markdown integration coverage for the fixed wording and ordering,
  and release the changed Agent-facing framework behavior as **v0.72**.

### Scope And Non-Goals

This change keeps `rb_profile.yaml#/research_access` as the existing direct
observation owner. It does not add a probe status, diagnostic file, Gate,
checkpoint, retry tree, provider choice, host permission bypass, duration
promise, tool-output suppression mechanism, or new user decision. It does not
claim that static checks prove actual host rendering or current real-Agent
behavior; those remain the separately authorized observation work in E1/E2.

### Semantic Precision, Control, And Responsibility

The reader is a user leaving HITL1. Their bounded question is: "Why is this
unrelated-looking tool action happening, and do I need to decide anything?"
The new reader-facing view preserves the distinctions that change that answer:
the user decision already recorded at HITL1, the direct `research_access`
observation, and selected-host-native output. The user can conclude that the
probe is a non-decision precondition, can distinguish `available` from
`unavailable`, and can honestly treat raw host rows as outside the framework's
presentation authority without reconstructing the full probe contract.

The direct Source of Record remains the existing `research_access` observation
and HITL1 Gate. The shortest legal loop is:

```text
recorded HITL1 decision -> brief notice -> existing bounded probe
  -> existing research_access observation -> direct result message -> existing Gate
  -> Gate pass: existing silent-flow exit
  -> Gate fail: existing smallest legal repair boundary, then same probe/Gate
```

This avoids a new status, controller, renderer, retry service, or host
integration layer. The Agent executes the fixed, already-authorized probe and
the existing legal rerun; the Engine continues to validate the observation and
Gate; the user supplies only a genuinely required external action or new
semantic decision. Human direction does not create host permission or a new
capability.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pre-research-phase-content`: HITL1 shall use one fixed neutral capability
  query and present a bounded pre-probe notice plus truthful available/unavailable
  messages without altering probe, observation, Gate, or host authority.
- `hitl-ux`: HITL1 shall distinguish the recorded research decision from the
  following non-decision research-access check, present silent-flow exit text
  only after the existing HITL1 Gate passes, and leave native host rendering
  outside its promise.

## Impact

- Framework Markdown: `phase-hitl1.md` and `brief/hitl1.md`.
- Accepted contracts: delta specs for `pre-research-phase-content` and
  `hitl-ux`, modifying the existing registered requirements `PRP-002` and
  `HIU-002` without creating a new requirement identity.
- Project terminology: `CONTEXT.md` will record the existing distinction between
  a HITL1 decision, a research-access observation, and selected-host-native
  rendering without creating a new runtime concept.
- Verification: `tests/integration/md/phase-hitl1-research-access.test.mjs`
  will prove the deterministic text contract only. A real retained HITL1
  observation remains outside this change's proof claim.
- Release/governance: `CHANGELOG.md`, `DPT_FRAMEWORK/RUN.md`, requirement/spec
  checks, feedback lifecycle reviews, and the systemic remediation plan will
  be updated through the approved apply/archive path. No dependency is added.

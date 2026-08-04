## Context

See `proposal.md` for motivation. The current manifest has separate Wave0,
Wave1, and Wave2 cases, but no real-Agent case observes the degraded Wave0
handoff through the Wave2 new-evidence decision. Case 232 begins from Wave2
fixture state and its retained outcome is `NOT_RUN`.

## Goals / Non-Goals

**Goals:**

- Create one preserved, bounded case that can answer the specific degraded
  handoff behavior question from its native evidence.
- Make capability absence and terminal outcome honest, inspectable facts.

**Non-Goals:**

- Change production handoff/search behavior or add a new recovery mechanism.
- Observe host chat/tool traffic outside the declared case, infer host liveness,
  or turn static assertions into Agent-behavior proof.

## Decisions

### Add one case-154 Wave-chain real-Agent playbook

The case will live beside `case-151`--`case-153` in
`exp_wff_wave-chain`, register once in the root manifest, and use V2
`agent_behavior` proof metadata with one Supervisor-owned disposable bundle.
A case-specific entry in the existing iterative Subject adapter will carry the
bounded multi-phase objective and preserve Subject events. The manifest owns
active path/order. For a launched case, native completion owns the
`PASS`/`FAIL`/`NOT_RUN` result; before native completion, the retained
Supervisor report/audit owns cancellation, error, and budget facts.

The alternative of composing the existing case-211, case-164, and case-232
results cannot preserve one continuous handoff or identify one Subject/host
observation. A new host watcher or tool interceptor would broaden authority and
add a control layer without answering the bounded question.

### Reload the legal target surface within the same Subject session

The adapter's existing generic path loads a production surface only when a
session starts. Case 154 instead needs two bounded turns in one session. After
the first turn, the adapter reads only the bundle's current-node fact, requires
the legal Wave2 entry, and calls the existing read-only production-surface
loader for that node. It retains the loaded Wave2 text and its digest under the
bundle root, then injects that exact text as the second-turn current control
surface. It neither selects a phase, changes a lifecycle fact, nor synthesizes
instructions. If the Wave1 turn does not establish the expected legal entry,
the playbook records the unavailable boundary and finalizes `NOT_RUN`.

This is an adapter delivery detail, not a second controller: Engine Gate,
`enter-phase`, and status-sync commands remain the only transition authority.
The retained before/after status, Wave0 Gate JSON, Wave2 surface snapshot, and
Subject transcript give closeout review a bounded continuity record.

### Exercise one actual Wave2 new-evidence route

Setup-only input may establish the legal current-head Wave0/Wave1 artifacts
needed by the production Gates, but it must not create the Wave2 decision or
its delegated result. The first Subject turn consumes the loaded Wave1 surface
and its legal handoff. The reloaded Wave2 turn receives one named emergent
finding with `gap_status: needs_search`, records its `explore_search` or
`exploit_search` decision, and must route it through one
`wave2_targeted_evidence` work unit. The delegated child, not the Phase-Agent
Subject, performs the bounded real search/fetch and returns the usual submitted
evidence.

The case check fails when the Subject's retained transcript contains a direct
`WebSearch` or `WebFetch` invocation. It separately verifies the named finding
decision and submitted targeted-evidence binding. This distinguishes a direct
Phase-Agent tool call from legal delegated research without pretending that the
Playbook Agent, a fixture, or a generic transcript pattern can judge all Agent
semantics.

### Classify only declared evidence boundaries

The case will retain the degraded Gate JSON, loaded phase facts, Subject
prompt/transcript/result, and direct bundle trace/status. Its case-owned
deterministic checks will evaluate only mechanically observable facts, such as
the legal Gate/entry continuity and direct Subject `WebSearch`/`WebFetch` tool
events. The complete retained transcript remains the evidence for closeout
review of an unsolicited user choice or phase skip; a lexical check must not be
presented as a complete semantic oracle. Native completion publishes
`PASS`, `FAIL`, or `NOT_RUN`. Cancellation, error, and budget exhaustion remain
Supervisor outcomes, not rewritten as `PASS`, `FAIL`, or framework failure.

This creates a single reader-facing observation boundary: a maintainer can
stop at the preserved completion to determine what happened in this one run,
or honestly see that no behavior was observed. It avoids derived progress
states, retry trees, and a second verdict authority.

### Keep user, Agent, and Engine responsibility unchanged

The user authorizes the one bounded objective and envelope. The Playbook and
Subject Agents execute existing legal Markdown/CLI actions. The Engine owns
Gate facts; the native finalizer owns completion. Neither a user instruction
nor a test grants missing host capability or lets the Playbook Agent author
Subject evidence.

## Risks / Trade-offs

- [Real tools or child runtime are unavailable] -> Finalize `NOT_RUN` with the
  retained reason and preserve the run; do not retry or fabricate evidence.
- [The heavy case costs more than the envelope] -> Use one explicit budget and
  duration envelope; Supervisor budget boundary remains terminal.
- [A single run has limited generality] -> State the exact Subject/host/run
  provenance and use it only to admit or reject a later direct-root repair.

## Migration Plan

1. Register the new case and its adapter path.
2. Add static integration coverage and run the declared bounded real-Agent
   observation during apply with the assurance profile required by the existing
   Supervisor CLI.
3. Preserve the native result or Supervisor terminal record. Create the
   separate C3 repair Change only for an actual retained prohibited action;
   generic `FAIL`, `NOT_RUN`, cancellation, error, or budget exhaustion does
   not admit C3.

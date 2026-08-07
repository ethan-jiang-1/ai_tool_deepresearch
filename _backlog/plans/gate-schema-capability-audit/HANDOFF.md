# Handoff: Gate / Schema / Queue Capability Audit

> This is a compact continuation guide. The linked plan artifacts remain authoritative; update their
> owning sections when new direct evidence changes a conclusion instead of duplicating analysis here.

## Next Session Objective

Continue the systematic observation program without reconstructing the analysis from chat. First
disposition the accepted Gate-audit authority conflict, then build current-head consumer matrices for
the six selected blocking obligations. This remains research/observation work, not authorization for
target-code edits or a third implementation change.

## Read Order

1. [Overall audit](../gate-schema-capability-audit.md): conclusion, current handoff state, scope,
   ownership, and completion criteria.
2. [Evidence base](evidence-base.md): evidence discipline, current-head facts, historical analogues,
   and the deterministic/semantic boundary.
3. [Hypotheses and prompt feedback](hypotheses-and-prompt-feedback.md): H1-H4, falsifiers, and
   prompt/control-surface implications.
4. [Observation protocol](observation-protocol.md): sample set, proof classes, metrics, record
   template, priority, and completion conditions.
5. [BUG-200--204 remediation](../bug-200-204-gate-and-queue-remediation.md): implementation ownership
   of the two existing changes.

## Current State

- Research synthesis, current-head verification, and document decomposition are complete.
- Only the overall audit and files in this detail directory have changed. Harness code and tests were
  not edited.
- No observation record, consumer matrix, new OpenSpec proposal, or real-Agent adherence run has been
  completed.
- The first pending item is the Gate-audit authority meta-contract observation defined in the
  [observation protocol](observation-protocol.md).
- BUG-201 and BUG-204 still require real Engine-path counterexamples before a contract conclusion.
  BUG-203 implementation remains owned by the existing queue-failure change.
- Preserve the current worktree changes; do not discard this untracked audit directory.

## Guardrails

- Follow repository `AGENTS.md`: read `guidelines/project-charter.md` and root `CONTEXT.md` before
  substantive continuation.
- Historical screening was explicitly limited to recent resolved records in
  `_backlog/_done/_fixed_bugs/`. Do not broaden `_backlog/` indiscriminately.
- Keep static contract delivery, deterministic Engine behavior, and real `agent_flow_e2e` behavior as
  separate proof classes. Missing host evidence remains `NOT_RUN` or `UNOBSERVED`.
- Do not turn semantic source/claim quality into an Engine Gate.
- Respect the OpenSpec phase gate. Target code is read-only outside an approved apply phase.

## Verification Baseline

- `node --test tests/schema/gate-rule-audit.test.mjs`: 4/4 passed.
- Repository audit Markdown links and whitespace must be rechecked after any handoff or index edit.

## Suggested Skills

- `mattpocock-skills:research`: bounded evidence work on one selected obligation.
- `mattpocock-skills:diagnosing-bugs`: real Engine-path counterexamples for BUG-201, BUG-203, or
  BUG-204.
- `openspec-explore`: refine existing change artifacts without target-code edits when evidence requires
  it.
- `openspec-propose`: only after the audit's P0/P1 + current-head evidence + uncovered-contract trigger
  is satisfied; it is not the default next action.

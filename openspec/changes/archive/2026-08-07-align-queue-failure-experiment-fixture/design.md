## Context

See `proposal.md` for motivation. The existing Queue playbook invokes the real
`fail()` lifecycle API but interprets its result through a retired
`failure_creates_repair` check. Current AGQ-019 owns a narrower distinction:
a generic failure of a current non-delegated demand terminalizes that demand
with `failure_disposition: terminal_no_successor`; a delegated demand has its
separate work-unit owner. The experiment must observe the former without
inventing either a replacement route or a second evaluator.

The target remains a fixture-backed `agent_flow_e2e` Markdown playbook. Its
native trace can prove deterministic Queue behavior only; it cannot prove a
real Subject Agent's recovery choice.

## Goals / Non-Goals

**Goals:**

- Align the case's frontmatter, prose, step name, and trace check with the
  accepted non-delegated generic-failure boundary.
- Assert the direct terminal row, absence of Queue-owned repair descendants,
  and normal promotion of the pre-existing next demand from the same returned
  Queue state.
- Keep all other case checks and its registered path unchanged.

**Non-Goals:**

- Do not alter Queue schema, Queue lifecycle, work-unit replacement, Queue
  projection, Gate behavior, native completion, or Supervisor behavior.
- Do not add a simulated Agent recovery, a new playbook, a real Subject Agent
  claim, or a budget-free substitute for Phase 3 observation.
- Do not weaken terminal/no-successor semantics just to retain the legacy
  `repair-*` assertion.

## Decisions

### 1. Consume the returned Queue state from the existing lifecycle API

The failure block will continue to build a disposable Queue and call the
production `fail()` function. Its one case-owned trace check will inspect the
returned Queue's direct `terminal_history`, `active_window`, `refill_pool`,
and `delegated_in_flight` facts:

- the failed original is terminalized with `terminal_no_successor`;
- no current Queue location contains a `repair-*` or `repair-repair-*`
  descendant; and
- the already enqueued next demand is promoted normally.

This keeps the shortest evidence path:

```text
existing Queue fail()
  -> returned Queue terminal/history and live locations
  -> one trace check
  -> existing native finalizer
```

**Alternative considered:** introduce a playbook helper that independently
classifies failure dispositions. Rejected because it duplicates the accepted
Queue evaluator and would create a second truth path.

**Alternative considered:** retain the old repair assertion as a historical
diagnostic branch. Rejected because one registered current case cannot claim
both mutually exclusive Queue outcomes.

### 2. Rename the assertion to describe the current outcome

The required check and surrounding prose will name terminal no-successor
instead of repair creation. This preserves the meaningful distinction for a
future reader: generic non-delegated Queue failure has no Queue-owned repair
path, whereas delegated recovery remains outside this playbook's scope.

No new semantic level, state, projection, command, or reader-facing concept is
introduced. The existing case simply answers its current bounded question
accurately.

### 3. Preserve proof and responsibility boundaries

The change does not require a user semantic or permission decision. The Agent
may make the mechanical fixture correction under the accepted contract; the
Engine's Queue result and native completion remain the deterministic verdict
authorities. A future real-Agent run still needs an explicit budget decision
and will be recorded separately from this fixture-backed evidence.

## Risks / Trade-offs

- [Future Queue semantics change] -> the case will fail against the direct
  terminal/no-successor expectation, prompting an explicit accepted-contract
  review rather than silently generating a repair assertion.
- [A terminal row lacks the expected direct fields] -> fail the case; do not
  infer a repair route or reconstruct the row from rendered Queue prose.
- [A reader mistakes playbook execution for Subject behavior] -> retain
  `proof_subject: deterministic_contract`, `subject_execution: none`, and the
  explicit non-goal in the playbook.

## Migration Plan

1. Update only the case's Queue-failure wording, required check identifier,
   and the direct state assertion.
2. Run the change-scoped route-plan validation before target edits.
3. After the update, validate the registered playbook contract and run the
   bounded fixture-backed observation only with an explicit Agent-experiment
   budget; otherwise retain it as `NOT_RUN` rather than fabricating a result.
4. Revert by restoring the prior Markdown only if the accepted Queue contract
   itself is reverted; no runtime data migration or cleanup is involved.

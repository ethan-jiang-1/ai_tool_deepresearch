## Why

`case-43-standard-failure-repair` still asserts that generic Queue failure
creates a `repair-*` demand. The accepted `agent/agentic-queue` contract now
requires a non-delegated generic failure to record
`failure_disposition: terminal_no_successor` and to create no Queue-owned
successor. The playbook therefore cannot currently serve as a truthful Phase 3
deterministic observation of the current Queue boundary.

## What Changes

- Replace the stale generic-repair assertion in
  `experiments_playbook/exp_agentic-queue/case-43-standard-failure-repair.md`
  with checks for the current finite terminal/no-successor outcome.
- Retain the case as a fixture-backed `agent_flow_e2e` playbook that proves
  only deterministic Queue behavior through its native trace completion; it
  will not claim real Agent adherence.
- Add focused planning and verification evidence that the playbook consumes
  the existing Queue operation rather than a copied evaluator or hand-written
  Queue result.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/agentic-queue` | `openspec/specs/agent/agentic-queue/spec.md`, especially AGQ-019 generic-failure scenarios | Verify-only | The accepted behavior already owns the terminal/no-successor outcome; this change makes one experiment observe it correctly. |
| `agent/agent-testing` | `openspec/specs/agent/agent-testing/spec.md` | Verify-only | The existing playbook and trace-backed experiment surface remain the owner; no test-system behavior changes. |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | The case remains an `agent_flow_e2e` Markdown playbook with trace-bound native completion. |
| `verification/experiment-agent-autorun` | `openspec/specs/verification/experiment-agent-autorun/spec.md` | Verify-only | Supervisor selection, runtime containment, and native completion semantics are unchanged. |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change has no spec-level behavior change, so `.openspec.yaml`
declares `skip_specs: true`.

## Design Review

No new state, projection, command, evaluator, or reader-facing concept is
introduced. The existing reader question remains bounded: whether this
playbook's Queue-failure check observes the accepted generic Queue outcome.
The direct source of record is the current Queue lifecycle/AGQ-019 contract;
the playbook only consumes its returned queue state and writes a normal native
check event.

The shortest legal loop is:

```text
current generic Queue fail()
  -> terminal_no_successor row and no successor
  -> existing playbook check
  -> native completion
```

This removes one obsolete repair-success assertion and adds no controller,
fallback, retry branch, or second evaluator. No user semantic decision is
needed for this fixture alignment: the Agent can perform the mechanical
correction under the accepted contract, while the Engine retains the only
deterministic verdict. A future real `agent_flow_e2e` run still requires its
separate explicit budget decision.

## Impact

- Affected target surface: one existing Markdown playbook under
  `experiments_playbook/exp_agentic-queue/`.
- No changes to `DEEP_RESEARCH_HARNESS/`, Queue schemas, Queue lifecycle,
  accepted capability requirements, provider configuration, or runtime bundle
  data.
- Verification will distinguish this fixture-backed deterministic observation
  from the outstanding real-Agent Phase 3 evidence.

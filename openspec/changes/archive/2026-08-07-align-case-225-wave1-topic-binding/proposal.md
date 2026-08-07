## Why

Phase 3 retained execution showed that
`case-225-heavy-returned-work-closeout` cannot reach its real Subject-Agent
boundary from its declared setup: the canonical Topic uses
`tp_22500000-0000-4000-8000-000000000001`, while the queued task silently
receives `queueItemForWorkUnit()`'s unrelated default UID. Queue admission
therefore rejects the task before the Subject Agent can act. The source
observation is the preserved batch
`f0e6d196-e0af-4e77-94af-7de4ca08753f`; the broader coordination intent is
recorded in `_backlog/plans/gate-schema-progressive-gate-schema-queue-remediation.md`.

## What Changes

- Bind case-225's queued Wave1 demand explicitly to the Topic's existing
  canonical `topic_uid`.
- Extend the existing case-225 Markdown contract regression so a custom Topic
  UID and the queued task's UID must agree before any Subject-Agent launch.
- Retain the current real-Agent, setup-only, native-completion, and
  `NOT_RUN` boundaries; this change does not make a real execution pass by
  fixture or alter the declared verdict.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/research-wave-experiments` | Main spec Wave1 playbook requirements and current `case-225` | Verify-only | The accepted Wave1 experiment behavior remains unchanged; this repair lets its existing setup reach the accepted queue admission boundary. |
| `research/research-wave-phase-content` | Main spec RWP-002 Phase-Agent dry-submit/submit/closeout ownership and current case contract | Verify-only | The real Phase-Agent loop is unchanged; no phase guidance or lifecycle rule changes. |
| `agent/queue-input-validation` | Existing `operate-queue` Topic UID/slug admission path and current helper defaults | Verify-only | Queue admission correctly rejects the mismatched task; it is not the component to relax. |
| `agent/agent-testing` | Existing experiment evidence boundary | Verify-only | The existing Markdown experiment and trace-bound native completion remain the evidence surface. |
| `verification/verification-routing` | Current `agent_flow_e2e` asset and proof-profile requirements | Verify-only | The test class, real-Agent requirement, and route validity remain unchanged. |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a fixture/playbook alignment with no accepted behavior change, so
`.openspec.yaml` declares `skip_specs: true`.

## Design Review

No state, projection, command, evaluator, or reader-facing concept is added.
The existing bounded reader question is whether the setup-only canary can
enqueue its one declared Topic demand through the current Queue admission
contract. The direct source of record is the Topic's canonical identity in the
generated plan/registry, consumed by the existing Queue CLI.

The shortest legal loop is:

```text
case-owned canonical Topic UID
  -> queued Wave1 task with the same UID
  -> existing Queue admission
  -> existing Subject-Agent boundary
```

This removes a hidden default-value mismatch and avoids a Playbook Agent
runtime repair, a second Topic resolver, a Queue exception, or a new retry
branch. The user has authorized the ordinary fixture correction and later
experiment run; the Agent performs the mechanical edit, while the existing
Queue/Engine and native completion remain the only verdict authorities.

## Impact

- Affected target assets: one registered Markdown playbook and its existing
  integration-level Markdown contract test.
- No changes to `DEEP_RESEARCH_HARNESS/`, Queue schema/admission behavior,
  work-unit lifecycle, accepted requirements, provider configuration, or
  mutable runtime bundles.
- The follow-up real Agent run remains separately bounded by the user-provided
  experiment budget and can still end PASS, FAIL, NOT_RUN, or host ERROR.

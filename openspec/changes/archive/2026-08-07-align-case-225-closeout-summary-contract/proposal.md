## Why

Native Case 225 batch `e98ab2dc-e863-44a1-b007-cdab47567496` proved a real
delegated child, Engine submit, Phase materialization, and inspect, but its
case-owned observer failed because the Subject wrote natural-language variants
of two case-local JSON indexes (`claimed_work_id` and
`materialized_references`). The runner asks for the concepts but does not name
the JSON keys, while the observer assumes different literal keys.

## What Changes

- Make the Case 225 Subject instruction declare the exact path-only JSON keys
  for child evidence and Phase closeout indexes.
- Make the observer locate the claimed work from the Engine index by its one
  queue demand, then require the child and closeout indexes to bind to that
  Engine-owned work ID.
- Extend the existing Markdown contract test to lock the explicit producer and
  direct Engine-reader boundary; retain the native Case 225 run as the only
  real-Agent verdict.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/research-wave-experiments` | RWE-002 Wave1 work-unit/real-Actor requirements | Verify-only | The case keeps its existing real child, submitted backing, and trace evidence boundary. |
| `research/research-wave-phase-content` | submitted backing and Phase-owned materialization requirements | Verify-only | The Wave1 production closeout is not changed; only the case-local evidence index contract is clarified. |
| `agent/agent-testing` | real Subject/sub-agent evidence requirements | Verify-only | No test class, actor role, or PASS permission changes. |
| `verification/verification-routing` | `integration` / `agent_flow_e2e` proof and native-verdict rules | Verify-only | The selected proof routes stay unchanged. |
| `agent/delegated-work-units` | Engine-owned work ID, submitted state, and actor record | Verify-only | The observer consumes existing index facts and does not modify claim or submit behavior. |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This aligns a registered experiment's Subject instruction and observer
with one another without changing an accepted product requirement, so
`.openspec.yaml` declares `skip_specs: true`.

## Design Review

The reader question is bounded: can the Case 225 observer prove that its
retained child and closeout indexes refer to the one Engine-owned queued work
unit? The direct authority is `_work_units/_index.json` for the work identity
and submission/actor facts; the two Agent-written JSON files remain
case-specific path indexes, not a second lifecycle authority.

The shortest legal loop is:

```text
explicit Subject index keys + Engine queue-item record
  -> same work_id binding in Case 225 observer
  -> existing strict path and ledger checks
  -> existing native finalizer
```

This removes ambiguous natural-language serialization and one indirect
`child.work_id` identity source. It adds no state, projection, command,
fallback alias, retry, Queue exception, or new Engine behavior. The user has
authorized the mechanical repair and bounded rerun; the Agent changes the
Markdown/test boundary, while Engine facts and native completion retain verdict
authority.

## Impact

- Affected assets: `run-iterative-interaction-subject.mjs`, the registered
  Case 225 playbook, and its focused integration test.
- No dependencies, schema, Queue, actor availability policy, Phase materializer,
  health policy, or native-finalizer behavior change.
- No `DEEP_RESEARCH_HARNESS/` behavior changes, so no version bump is needed.

## Supersession And Closeout

The user-directed extreme-slow quarantine moved Case 225 to
`experiments_playbook/exp_extrem_slow/case-225-extreme-slow-returned-work-closeout.md`
and removed it from active selection. The explicit key and Engine-identity
repairs remain in the quarantined historical asset and retain their static
contract, but no post-repair native completion exists. A cancelled run is not
substitute evidence. No Autorun, Interactive, or native rerun is legal before
a separately proposed refactor relocates the case to a supported runnable cost
tier and explicitly re-registers it.

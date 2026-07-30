# C2 Wave0 Contribution Boundary Replay

Date: 2026-07-30

## Scope

This is one fixture-backed, disposable-bundle replay of deterministic Engine
contracts. Controlled candidate/source/receipt/result inputs converge at the
production `claimWorkUnits`, `submitWorkUnit`, and
`collectEligibleWave0CandidateProjection` boundaries. The replay does **not**
claim Agent search, reading, writing, repair, or host-lifecycle behavior.

The harness never writes `rb_trace.jsonl`. The listed trace events were emitted
by the existing disposable-bundle, claim, and submit Engine paths. Its temporary
bundle root is removed after the observed report is produced; this document and
the replay harness retain the reproducible command and exact deterministic
observations.

## Command

```bash
node openspec/changes/make-canonical-topic-state-projections-coherent/evidence/replay-wave0-contribution-boundaries.mjs
```

## Legal Supplement Observation

The first real Engine submit accepted a two-entry current source array. The
second submit accepted the same ordered prefix plus one appended entry at the
same target.

| Submitted work | Target | Validated length | Semantic digest |
| --- | --- | ---: | --- |
| `wu-w0-b000-src-i0001` | `artifacts/wave0/topic-a/source.yaml` | 2 | `e9d34f9ff237a12a7ebeb9b6a982ac657f1470cba0ee4b9c40e8797eb187a446` |
| `wu-w0-b000-src-i0002` | `artifacts/wave0/topic-a/source.yaml` | 3 | `4003b5601d615ec7b42f69a1a47b18f6250d4a9eba52a558dd0ecb055076b585` |

The production reader returned exactly these candidate coordinates:

```text
wu-w0-b000-src-i0001/1
wu-w0-b000-src-i0001/2
wu-w0-b000-src-i0002/3
```

This proves the later submission owns only the appended ordinal; the reader did
not assign ordinal `3` to the first work ID.

## Controlled Prefix Drift Observation

After the two submissions, the controlled fixture changed the title in source
ordinal `1` while retaining a schema-valid three-entry array. The same
production reader returned:

```json
{
  "passed": false,
  "candidate_count": 0,
  "root_findings": [
    {
      "rule_id": "submitted_source_contribution_prefix_drift",
      "repair_kind": "agent_action",
      "work_ids": ["wu-w0-b000-src-i0001", "wu-w0-b000-src-i0002"]
    }
  ]
}
```

The single parent root and zero candidates establish that dependent candidate
omissions are masked below invalid submitted contribution authority.

## Engine Trace Observation

The existing Engine emitted `run_start`, then for each work ID:

```text
work_unit_claimed
work_unit_batch_claimed
work_unit_ledger_appended
work_unit_submitted
```

The trace demonstrates actual bundle/claim/submit execution only. It is not
evidence of a human or Agent research action.

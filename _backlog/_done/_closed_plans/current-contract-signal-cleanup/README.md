# Current-Contract Cleanup Decision Cards

> **Do not use this file to determine current progress.**
> Progress and the next action are owned only by
> [`../current-contract-signal-cleanup.md`](../current-contract-signal-cleanup.md).

## What This Directory Is For

Each card isolates one risk decision: what old shape exists, which current readers consume it,
what breaks if support ends, and what evidence is required before proposal/apply. A card prevents
missed consequences; it does not automatically require its own OpenSpec change.

The [coverage ledger](coverage-ledger.md) answers whether the repository audit is complete. The
[policy and protocol](policy-and-protocol.md) explains when cards may share one execution batch.
The [execution ledger](execution-ledger.md) records completed archives.

## Final Execution State

| Dashboard item | Decision cards | Current status | OpenSpec change |
|---:|---|---|---|
| 18 | [C7 residual main-spec cleanup](changes/C7-rewrite-main-specs-as-current-state.md) | Governed-archived: live GAC spec/catalog entry retired; immutable deprecated registry/archive history retained | `2026-08-15-retire-gate-content-dedup-tombstone` |
| 19 | [C8 context/routing cleanup](changes/C8-sharpen-context-and-routing.md) | Governed-archived: current routing, HITL1, reference-reader, logical-actor, and current-profile fixture guards align with existing current contracts | `2026-08-15-align-current-guidance-contract-guards` |

## Remaining Decision Queue

None. The 19 dashboard items are governed-archived. A future finding must enter as a new bounded card rather than reopening this completed program.

## Family Maps

These files explain family topology; they are not additional execution items:

- [C1 inactive surfaces](changes/C1-retire-inactive-contract-surfaces.md)
- [C5 reference and experiment formats](changes/C5-drop-legacy-reference-and-experiment-formats.md)
- [C6 historic work-unit contracts](changes/C6-drop-legacy-work-unit-contracts.md)

Completed-family cards remain as audit history but current completion evidence belongs in the
[execution ledger](execution-ledger.md).

## Risk Scale

| Level | Meaning | Minimum before Apply |
|---|---|---|
| L1 | Dead documentation, catalog entry, or private no-caller code | Fresh current-surface scan and focused validation |
| L2 | Internal API, single reader, or claimed contract | Current-owner characterization and exact removal boundary |
| L3 | Several readers, CLIs, guidance, or fixtures share a contract | Full producer/reader fanout and current-path regression evidence |
| L4 | State, recovery, provenance, mutation safety, or retained artifacts | Explicit user policy, cross-consumer boundary, and recovery/E2E evidence |

## Reading Rule

1. Start at the dashboard and identify the current top-level item.
2. Read only the cards listed for that item.
3. Read the active OpenSpec artifacts after the card decision is settled.
4. Return to the dashboard; do not infer progress from card checkboxes.

## Maintenance Rule

- Update a card when its evidence, decision, side effects, or execution-batch assignment changes.
- Keep a policy decision as a separate card even when several cards share one proposal/apply/archive.
- A conditional merge that no longer shares policy or rollback safety must split before proposal.
- After archive, update the dashboard and execution ledger first; then mark the card disposition.

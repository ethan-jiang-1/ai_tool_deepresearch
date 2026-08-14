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

## Active Card

| Dashboard item | Decision card | Current status | OpenSpec change |
|---:|---|---|---|
| 09 | [C5a-2 historic reference reader](changes/C5a2-historic-reference-reader-policy.md) | Policy selected; proposal and six deltas present; design/tasks/governance pending | [`decide-historic-reference-reader-policy`](../../../openspec/changes/decide-historic-reference-reader-policy/) |

## Remaining Decision Queue

Cards remain individually reviewable even when they conditionally share one OpenSpec lifecycle.

| Order | Card | Risk | Planned execution batch | Decision still needed |
|---:|---|---:|---|---|
| 10 | [C1b seed-topic pointer](changes/C1b-retire-unreferenced-seed-topic-pointer.md) | L1 | `retire-inactive-contract-surfaces` | Fresh zero-caller proof |
| 10 | [C1c stale Gate FSM](changes/C1c-retire-stale-abstract-gate-fsm.md) | L2 | `retire-inactive-contract-surfaces` | Approve internal API removal |
| 10 | [C1d unimplemented fork repair](changes/C1d-retire-unimplemented-fork-repair-contract.md) | L2 | `retire-inactive-contract-surfaces` | Retire, retain, or implement architecture promise |
| 10 | [C1e unreachable YAML parser](changes/C1e-retire-unreachable-yaml-subset-parser.md) | L1 | `retire-inactive-contract-surfaces` | Fresh zero-caller proof |
| 11 | [C1f archived case ledger](changes/C1f-retire-archived-case-ledger-helper.md) | L2 | `retire-legacy-experiment-history-inputs` if policy aligns | Is exact corpus cardinality current or migration-only? |
| 11 | [C5b retained experiment history](changes/C5b-retained-experiment-history-policy.md) | L4 | `retire-legacy-experiment-history-inputs` if policy aligns | Does v1 history affect current prediction/admission/selection? |
| 12 | [C6a marked assignment](changes/C6a-retire-marked-assignment-history.md) | L4 | `retire-historic-work-unit-record-readers` if policy aligns | Treatment of assignment v1/v2 |
| 12 | [C6b markerless submission](changes/C6b-retire-markerless-submission-history.md) | L4 | `retire-historic-work-unit-record-readers` if policy aligns | Treatment of markerless recovery/provenance |
| 12 | [C6c unrecorded actor](changes/C6c-retire-unrecorded-actor-provenance.md) | L4 | `retire-historic-work-unit-record-readers` if policy aligns | Treatment of unknown actor provenance |
| 13 | [C6d transaction v1](changes/C6d-retire-transaction-v1-history.md) | L4 | standalone | Historical proof versus fail-closed mutation safety |
| 14 | [C7 residual main-spec cleanup](changes/C7-rewrite-main-specs-as-current-state.md) | L2-L3 | `finalize-current-contract-presentation` | Exact residual set after runtime changes |
| 14 | [C8 context/routing cleanup](changes/C8-sharpen-context-and-routing.md) | L1-L2 | `finalize-current-contract-presentation` | Which wording tests protect behavior versus prose |

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

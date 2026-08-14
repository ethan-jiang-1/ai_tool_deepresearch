## REMOVED Requirements

### Requirement: Gate FSM contract superseded by chain.json

**Reason**: The requirement preserves five exports from an abstract FSM that is
not used by any current runtime path and is incomplete relative to the current
chain. Keeping those exports as a backward-compatible current contract creates
a second, contradictory transition owner.

**Migration**: Retire `TRT-011` as `[DEPRECATED]` requirement-registry history.
Consumers needing current routing SHALL use the existing
`workflows/transitions.chain.json` source of record through
`resolveNodeTransitionDetailed()`. The retired module and its barrel exports
have no adapter, alias, migration reader, or version fallback.

## MODIFIED Requirements

### Requirement: Phase MD test helper validates against chain.json truth source

`tests/helpers/md-phase-checks.mjs` SHALL validate gate membership against
`transitions.chain.json` (via `manifest.json` bridge) and SHALL NOT depend on a
separate abstract Gate FSM.

The `checkGateInTransitionTable` function SHALL load `manifest.json` to resolve
gate name → node fileRef, then load `transitions.chain.json` to check if the
node fileRef exists as a key. Gates with `null` gate in manifest (e.g., `final`)
SHALL be excluded from chain membership validation.

#### Scenario: Gate in chain is validated

- **WHEN** `checkGateInTransitionTable` is called with a manifest-listed gate whose corresponding node exists in `transitions.chain.json`
- **THEN** it SHALL return `{ ok: true }`

#### Scenario: Final phase with null gate is excluded

- **WHEN** `checkNextPhaseExists` is called with the `final` phase (gate is `null` in manifest)
- **THEN** it SHALL return `[]` (no issues) without attempting chain lookup

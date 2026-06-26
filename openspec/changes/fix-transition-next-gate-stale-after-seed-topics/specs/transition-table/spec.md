> req: TRT-007, TRT-008

## ADDED Requirements

### Requirement: Gate FSM contract deprecated in favor of chain.json

`schema/contracts/gate.mjs` SHALL be marked as deprecated. The `GATE_MACHINE_STATES`, `GATE_EVENT_TYPES`, `GATE_TRANSITIONS`, `validateTransitions`, and `isValidTransition` exports SHALL be retained for backward compatibility with existing test files, but SHALL carry a deprecation banner stating that `transitions.chain.json` is the canonical transition truth source and that this abstract FSM is not used by any runtime path.

The deprecation SHALL NOT remove or rename any export, so existing imports in `tests/schema/gate.test.mjs` and `tests/schema/contracts/gate.test.mjs` continue to work.

#### Scenario: Deprecation banner present

- **WHEN** a developer opens `schema/contracts/gate.mjs`
- **THEN** the file SHALL begin with a `@deprecated` comment explaining that the abstract FSM is not used by any runtime path and pointing to `transitions.chain.json` as the canonical truth source

#### Scenario: Existing exports preserved

- **WHEN** any existing consumer imports from `schema/contracts/gate.mjs` or the `schema/index.mjs` barrel
- **THEN** all exports SHALL continue to resolve without error

### Requirement: Phase MD test helper validates against chain.json truth source

`tests/helpers/md-phase-checks.mjs` SHALL validate gate membership against `transitions.chain.json` (via `manifest.json` bridge) instead of the deprecated `gate.mjs` FSM.

The `checkGateInTransitionTable` function SHALL:
1. Load `manifest.json` to resolve gate name → node fileRef
2. Load `transitions.chain.json` to check if the node fileRef exists as a key

The `checkNextPhaseExists` function SHALL:
1. Load `manifest.json` to resolve gate name → node fileRef
2. Load `transitions.chain.json` to check if the node fileRef has at least one forward transition

Gates with `null` gate in manifest (e.g., `final`) SHALL be excluded from chain membership validation.

#### Scenario: Gate in chain is validated

- **WHEN** `checkGateInTransitionTable` is called with a manifest-listed gate whose corresponding node exists in `transitions.chain.json`
- **THEN** it SHALL return `{ ok: true }`

#### Scenario: Standalone gate without chain entry skips gracefully

- **WHEN** `checkGateInTransitionTable` is called with a gate whose node does not appear as a key in `transitions.chain.json`
- **THEN** it SHALL return `{ ok: true }` (standalone gates with definition files are valid)

#### Scenario: Final phase with null gate is excluded

- **WHEN** `checkNextPhaseExists` is called with the `final` phase (gate is `null` in manifest)
- **THEN** it SHALL return `[]` (no issues) without attempting chain lookup
